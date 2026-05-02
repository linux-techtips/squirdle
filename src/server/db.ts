import { Database as SQLiteDatabase, SQLiteError } from "bun:sqlite";
export { SQLiteDatabase, SQLiteError };

import { POKEMON_TYPES, type Pokemon, type GameState, type GuessResult, type Guess } from "@/types";
import * as lib from "@/lib";

export function migrate(sqlite: SQLiteDatabase) {
  const type_check = POKEMON_TYPES.map(t => `'${t}'`).join(",");

  sqlite.run(`PRAGMA foreign_keys = ON`);

  return sqlite.transaction(() => {
    sqlite.run(`
      CREATE TABLE pokemon (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        generation INTEGER NOT NULL,
        height INTEGER NOT NULL,
        weight INTEGER NOT NULL,
        type1 TEXT NOT NULL CHECK (type1 IN (${type_check})),
        type2 TEXT CHECK (type2 IN (${type_check}))
      ) STRICT;

      CREATE TABLE players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        passhash TEXT NOT NULL
      ) STRICT;

      CREATE TABLE games (
        id INTEGER PRIMARY KEY REFERENCES players(id),
        pokemon_id INTEGER NOT NULL REFERENCES pokemon(id),
        max_guess_count INTEGER NOT NULL DEFAULT 6 CHECK (max_guess_count > 0),
        started_at INTEGER NOT NULL DEFAULT (UNIXEPOCH())
      ) STRICT;

      CREATE TABLE guesses (
        game_id INTEGER NOT NULL REFERENCES games(id),
        pokemon_id INTEGER NOT NULL REFERENCES pokemon(id),
        guessed_at INTEGER NOT NULL DEFAULT (UNIXEPOCH()),
        UNIQUE(game_id, pokemon_id)
      ) STRICT;

      CREATE TABLE schedule (
        scheduled_at INTEGER PRIMARY KEY CHECK(scheduled_at % 86400 = 0),
        pokemon_id INTEGER NOT NULL REFERENCES pokemon(id)
      ) STRICT;

      CREATE VIEW compare_pokemon AS
      SELECT
        src.id AS src_pokemon_id,
        tgt.id AS tgt_pokemon_id,
        (
          CASE
            WHEN src.generation > tgt.generation THEN 128
            WHEN src.generation < tgt.generation THEN 64
            ELSE 0
          END
          |
          CASE
            WHEN src.height > tgt.height THEN 32
            WHEN src.height < tgt.height THEN 16
            ELSE 0
          END
          |
          CASE
            WHEN src.weight > tgt.weight THEN 8
            WHEN src.weight < tgt.weight THEN 4
            ELSE 0
          END
          |
          CASE
            WHEN src.type1 != tgt.type1 THEN 2
            ELSE 0
          END
          |
          CASE
            WHEN src.type2 IS NOT tgt.type2 THEN 1
            ELSE 0
          END
        ) AS mask
      FROM pokemon AS src
      JOIN pokemon AS tgt;

      CREATE VIEW pokemon_scheduled_today AS
      SELECT pokemon_id FROM schedule WHERE scheduled_at = ((UNIXEPOCH() / 86400) * 86400);

      CREATE TRIGGER clear_guesses_on_game_reset
      AFTER UPDATE ON games
      WHEN NEW.started_at != OLD.started_at
      BEGIN
        DELETE FROM guesses WHERE game_id = OLD.id;
      END;

      CREATE TRIGGER guesses_remaining_check BEFORE INSERT ON guesses
      BEGIN
        SELECT RAISE(ABORT, 'no guesses remaining')
        WHERE (
          SELECT game.max_guess_count - COUNT(guess.game_id)
          FROM games AS game
          LEFT JOIN guesses AS guess ON guess.game_id = game.id
          WHERE game.id = NEW.game_id
          GROUP BY game.id
        ) <= 0;
      END;
  `);
  })();
}

export function start_or_get_game(sqlite: SQLiteDatabase, player_id: number): GameState | null {
  sqlite.query(`
    INSERT INTO games (id, pokemon_id)
    SELECT :player_id, pokemon_id FROM pokemon_scheduled_today
    WHERE true
    ON CONFLICT (id) DO UPDATE SET
      pokemon_id = EXCLUDED.pokemon_id,
      max_guess_count = EXCLUDED.max_guess_count,
      started_at = (UNIXEPOCH())
    WHERE games.started_at < (UNIXEPOCH() / 86400) * 86400
  `).run({ player_id });

  return game_state(sqlite, player_id);
}

export function game_state(sqlite: SQLiteDatabase, player_id: number): GameState | null {
  const remaining = sqlite.query<{ remaining_guesses: number }, { player_id: number }>(`
    SELECT (
      game.max_guess_count - (SELECT COUNT(*) FROM guesses WHERE game_id = game.id)
    ) AS remaining_guesses
    FROM games AS game
    WHERE game.id = :player_id
      AND game.started_at >= (UNIXEPOCH() / 86400) * 86400
  `).get({ player_id });

  if (!remaining) return null;

  const guesses = sqlite.query<Guess, { player_id: number }>(`
    SELECT cmp.mask, guesses.pokemon_id
    FROM guesses
    JOIN games AS game ON game.id = guesses.game_id
    JOIN compare_pokemon AS cmp
      ON cmp.src_pokemon_id = guesses.pokemon_id
     AND cmp.tgt_pokemon_id = game.pokemon_id
    WHERE guesses.game_id = :player_id
    ORDER BY guesses.guessed_at
  `).all({ player_id });

  return { guesses, remaining_guesses: remaining.remaining_guesses };
}

export function make_guess(sqlite: SQLiteDatabase, player_id: number, pokemon_id: number): GuessResult | null {
  // Someone needs to stop my freak.
  const inserted = sqlite.query<GuessResult, { player_id: number, pokemon_id: number }>(`
    WITH state AS (
      SELECT
        game.id AS game_id,
        game.max_guess_count,
        game.started_at,
        cmp.mask,
        (SELECT COUNT(*) FROM guesses WHERE game_id = game.id) AS guess_count,
        EXISTS(
          SELECT 1 FROM guesses
          WHERE game_id = game.id AND pokemon_id = game.pokemon_id
        ) AS won
      FROM games AS game
      JOIN compare_pokemon AS cmp
        ON cmp.src_pokemon_id = :pokemon_id
       AND cmp.tgt_pokemon_id = game.pokemon_id
      WHERE game.id = :player_id
    )
    INSERT INTO guesses (game_id, pokemon_id)
    SELECT game_id, :pokemon_id FROM state
    WHERE started_at >= (UNIXEPOCH() / 86400) * 86400
      AND guess_count < max_guess_count
      AND NOT won
    ON CONFLICT DO NOTHING
    RETURNING
      (SELECT mask FROM state) AS mask,
      (SELECT max_guess_count - guess_count - 1 FROM state) AS remaining_guesses,
      :pokemon_id AS pokemon_id
  `).get({ player_id, pokemon_id });

  // TODO: (Carter) Handle the following errors explicitly:
  // 1. The game has not been started.
  // 2. The game is no longer valid (was started yesterday).
  // 3. The player has already won the game.
  // 4. The number of guesses exceeds max guess count.
  // 5. The player made the same guess twice.

  // TODO: (Carter) Aggregate game results when it ends:
  // 1. How many guesses were made and whether the player won or lost.
  // 2. We can do this via trigger or in application code. I need to weigh pros/cons

  return inserted;
}

export function seed_schedule(sqlite: SQLiteDatabase, pokemon_ids: number[]) {
  const insert = sqlite.query<{}, { date: number, id: number }>(`
    INSERT INTO schedule (scheduled_at, pokemon_id) VALUES (:date, :id)
  `);

  const txn = sqlite.transaction((today: number) => {
    for (let i = 0; i < pokemon_ids.length; i += 1) {
      insert.run({ date: today + (i * 86400), id: pokemon_ids[i]! });
    }

    insert.finalize();
  });

  return txn(lib.today());
}

export function seed_pokemon(sqlite: SQLiteDatabase, pokemon: Pokemon[]) {
  const insert = sqlite.query<{}, Pokemon>(`
    INSERT INTO pokemon (id, name, generation, height, weight, type1, type2)
    VALUES (:id, :name, :generation, :height, :weight, :type1, :type2)
  `);

  const txn = sqlite.transaction((pokemon: Pokemon[]) => {
    for (let i = 0; i < pokemon.length; i += 1) {
      insert.run(pokemon[i]!);
    }

    insert.finalize();
  });

  return txn(pokemon);
}
