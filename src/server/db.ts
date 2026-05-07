import { Database as SQLiteDatabase, SQLiteError } from "bun:sqlite";
export type { SQLiteDatabase };

import type { GameState, GuessResult, GuessMade, Pokemon, Profile, User, Registration } from "@/types";

import schema from "@/schema.sql" with { type: "text" };
import type { App } from "@/server/app";

export function open(filename: string): SQLiteDatabase {
  const sqlite = SQLiteDatabase.open(filename, { strict: true });

  sqlite.run(`PRAGMA FOREIGN_KEYS = ON;`);

  return sqlite;
}

export function migrate(sqlite: SQLiteDatabase): void {
  sqlite.transaction(() => sqlite.run(schema))();
}

export function register({ sqlite, clock }: App, registration: Registration): Profile | null {
  const txn = sqlite.transaction(() => {
    sqlite.query<void, Registration & { created_at: number }>(`
      INSERT INTO registrations (username, passhash, created_at, favorite_pokemon_id)
      VALUES (:username, :passhash, :created_at, :favorite_pokemon_id);
    `).get({ ...registration, created_at: clock.seconds() });

    // TODO: This is a hack that will not perform as well as an id lookup. SQLite is kind of stupid.
    const query = sqlite.query<Profile, [string]>(`
      SELECT * FROM profiles WHERE username = :0
    `);

    return query.get(registration.username);
  });

  try {
    return txn();
  } catch (e) {
    if (e instanceof SQLiteError && e.code === "SQLITE_CONSTRAINT_UNIQUE") return null;
    throw e;
  }
}

export function user({ sqlite }: App, username: string): User | null {
  const query = sqlite.query<User, [string]>(`
    SELECT * FROM users WHERE username = :0;
  `);

  return query.get(username);
}

export function delete_user({ sqlite }: App, id: number): boolean {
  const query = sqlite.query<number, [number]>(`
    DELETE FROM users WHERE id = :0 RETURNING id;
  `);

  return query.get(id) !== null;
}

export function player_profile({ sqlite }: App, player_id: number): Profile | null {
  const query = sqlite.query<Profile, [number]>(`
    SELECT * FROM profiles WHERE id = :0;
  `);

  return query.get(player_id);
}

export function start_or_get_game(app: App, player_id: number): GameState | null {
  // TODO: (Carter) Started at will update everytime we get the game. not when it's a new day.
  const query = app.sqlite.query<{}, [number, number, number]>(`
    INSERT INTO games (player_id, pokemon_id, started_at)
    SELECT :0, schedule.pokemon_id, :1 AS scheduled FROM schedule
    WHERE schedule.started_at = :2
    ON CONFLICT (player_id) DO UPDATE SET
      started_at = EXCLUDED.started_at,
      pokemon_id = EXCLUDED.pokemon_id
    RETURNING pokemon_id;
  `);

  // NOTE: No pokemon were scheduled for today.
  if (query.get(player_id, app.clock.seconds(), app.clock.day()) === null) return null;

  return game_state(app, player_id);
}

export function game_state({ sqlite }: App, player_id: number): GameState | null {
  const guesses = sqlite.query<GuessMade, [number]>(`
    SELECT cmp.mask, guesses.pokemon_id
    FROM guesses
    JOIN games AS game ON game.player_id = :0
    JOIN compare_pokemon AS cmp
      ON cmp.src_pokemon_id = guesses.pokemon_id
     AND cmp.tgt_pokemon_id = game.pokemon_id
    WHERE guesses.player_id = :0
    ORDER BY guesses.guessed_at;
  `).all(player_id);

  const reamaining = sqlite.query<{ remaining: number }, [number]>(`
    SELECT
      (SELECT game.max_guess_count - COUNT(*) FROM guesses WHERE player_id = game.player_id) AS remaining
    FROM games AS game WHERE game.player_id = :0
  `).get(player_id);

  return { guesses, ...reamaining! };
}

export function make_guess({ sqlite, clock }: App, player_id: number, pokemon_id: number): GuessResult | null {
  const query = sqlite.query<GuessResult, [number, number, number]>(`
    WITH state AS (
      SELECT
        player_id, pokemon_id AS tgt_pokemon_id,
        (SELECT game.max_guess_count - COUNT(*) FROM guesses WHERE player_id = game.player_id) AS remaining,
        EXISTS (SELECT 1 FROM guesses WHERE player_id = game.player_id AND pokemon_id = game.pokemon_id) AS won
      FROM games AS game WHERE game.player_id = :0
    )
    INSERT INTO guesses (player_id, pokemon_id, guessed_at)
    SELECT state.player_id, :1, :2 FROM state
    WHERE state.remaining > 0 AND NOT state.won
    RETURNING
      (
        SELECT mask FROM compare_pokemon
        WHERE src_pokemon_id = guesses.pokemon_id
          AND tgt_pokemon_id = (SELECT tgt_pokemon_id FROM state)
      ) AS mask,
      (SELECT remaining FROM state) AS remaining;
  `);

  try {
    return query.get(player_id, pokemon_id, clock.seconds());
  } catch (e) {
    // TODO: (Carter) need a concrete error as we can return null if there was no active game.
    if (e instanceof SQLiteError && e.code === "SQLITE_CONSTRAINT_UNIQUE") return null;

    throw e;
  }
}

export function search_profiles({ sqlite }: App, query: string, limit: number = 20): Profile[] {
  const fts_query = build_fts_query(query);
  if (fts_query === null) return [];

  return sqlite.query<Profile, [string, number]>(`
    SELECT profile.*
    FROM users_fts AS fts
    JOIN players AS player ON player.id = fts.rowid
    JOIN profiles AS profile ON profile.id = player.id
    WHERE users_fts MATCH ?
    ORDER BY rank
    LIMIT ?;
  `).all(query, limit);
}

function build_fts_query(input: string): string | null {
  const cleaned = input.trim().replace(/"/g, "");
  if (cleaned.length < 3) return null;
  return `"${cleaned}"*`;
}

export function seed_schedule({ sqlite, clock }: App, pokemon_ids: number[]) {
  const insert = sqlite.query<void, { date: number, id: number }>(`
    INSERT INTO schedule (started_at, pokemon_id) VALUES (:date, :id)
  `);

  const txn = sqlite.transaction((today: number) => {
    for (let i = 0; i < pokemon_ids.length; i += 1) {
      insert.run({ date: today + (i * 86400), id: pokemon_ids[i]! });
    }

    insert.finalize();
  });

  return txn(clock.day());
}

export function seed_pokemon({ sqlite }: App, pokemon: Pokemon[]) {
  const insert = sqlite.query<void, Pokemon>(`
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
