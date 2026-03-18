import { Database } from "bun:sqlite";

import type { Comparison, Guess, Pokemon, Status } from "@/types";

export const db = Database.open(Bun.env.DATABASE_URL!, { strict: true, create: true });

export function create_schema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS pokemon (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      generation INTEGER NOT NULL,
      height INTEGER NOT NULL,
      weight INTEGER NOT NULL,
      type1 TEXT NOT NULL,
      type2 TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS pokemon_daily (
      scheduled_at INTEGER PRIMARY KEY CHECK(scheduled_at % 86400 = 0),
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS players_games_guesses (
      game_id INTEGER NOT NULL REFERENCES players_games(id),
      guessed_pokemon_id INTEGER NOT NULL REFERENCES pokemon(id),
      created_at INTEGER NOT NULL DEFAULT (UNIXEPOCH())
    ) STRICT;

    CREATE TABLE IF NOT EXISTS players_games (
      player_id INTEGER PRIMARY KEY REFERENCES players(id),
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id),
      max_guesses INTEGER NOT NULL,
      initiated_at INTEGER NOT NULL DEFAULT (UNIXEPOCH())
    ) STRICT;

    CREATE VIEW IF NOT EXISTS pokemon_today AS
    SELECT pokemon_id FROM pokemon_daily WHERE scheduled_at = ((UNIXEPOCH() / 86400) * 86400);

    CREATE VIEW IF NOT EXISTS pokemon_comparison AS
    SELECT
      src.id as pokemon_src_id,
      tgt.id as pokemon_tgt_id,
      CASE
        WHEN src.generation < tgt.generation THEN 'lt'
        WHEN src.generation > tgt.generation THEN 'gt'
        ELSE 'eq'
      END as generation,
      CASE
        WHEN src.height < tgt.height THEN 'lt'
        WHEN src.height > tgt.height THEN 'gt'
        ELSE 'eq'
      END as height,
      CASE
        WHEN src.weight < tgt.weight THEN 'lt'
        WHEN src.weight > tgt.weight THEN 'gt'
        ELSE 'eq'
      END as weight,
      CASE WHEN src.type1 = tgt.type1 THEN 'eq' ELSE 'ne' END as type1,
      CASE WHEN src.type2 = tgt.type2 THEN 'eq' ELSE 'ne' END as type2
    FROM pokemon src
    JOIN pokemon tgt;
  `);
}

export function seed_pokedex(db: Database, pokedex: Pokemon[]) {
  const insert = db.query(`
    INSERT INTO pokemon (id, name, type1, type2, height, weight, generation)
    VALUES ($id, $name, $type1, $type2, $height, $weight, $generation)
  `);

  const bulkInsert = db.transaction(() => {
    for (const [i, poke] of pokedex.entries()) {
      insert.run({ id: i + 1, ...poke });
    }
  });

  return bulkInsert();
}

function today() {
  // NOTE: we should probably pass Date.now as an argument.
  return Math.floor(Math.floor(Date.now() / 1000) / 86400) * 86400;
}

export function schedule_pokemon(db: Database, ids: number[], date_offset: number = 0) {
  const date = today();

  const scheduleAll = db.transaction(() => {
    const schedule = db.query(`INSERT INTO pokemon_daily (scheduled_at, pokemon_id) VALUES ($date, $id)`);

    let i = 0;
    for (const id of ids) {
      schedule.run({ date: date + ((i + date_offset) * 86400), id });
      i += 1;
    }
  });

  return scheduleAll();
}

// https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
export function sample_ids(count: number): number[] {
  const POOL_SIZE = 650;

  const ids = Array.from({ length: POOL_SIZE }, (_, i) => i);
  const result = new Array<number>(count);

  let filled = 0;
  while (filled < count) {
    const take = Math.min(count - filled, POOL_SIZE);
    for (let i = 0; i < count; i += 1) {
      // NOTE: we probably should pass rng as an argument
      const j = i + Math.floor(Math.random() * (POOL_SIZE - i));
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
      result[filled + i] = ids[i]!;
    }

    filled += take;
  }

  return result;
}

export function create_player(name: string): number | null {
  return db.query<{ id: number }, { name: string }>(`INSERT INTO players (name) VALUES ($name) RETURNING id`).get({ name })?.id ?? null;
}

export function start_game(player_id: number, pokemon_id: number | null = null, max_guesses: number = 8): number {
  db.transaction(() => {
    const { changes } = db.query(`
      INSERT INTO players_games (player_id, pokemon_id, max_guesses, initiated_at)
        SELECT $player_id, COALESCE($pokemon_id, pokemon_id), $max_guesses, UNIXEPOCH() FROM pokemon_today
        UNION ALL
        SELECT $player_id, $pokemon_id, $max_guesses, UNIXEPOCH() WHERE $pokemon_id IS NOT NULL LIMIT 1
      ON CONFLICT (player_id) DO UPDATE SET
        pokemon_id = EXCLUDED.pokemon_id,
        max_guesses = EXCLUDED.max_guesses,
        initiated_at = EXCLUDED.initiated_at
      `).run({ player_id, pokemon_id, max_guesses });

    // TODO: (Carter) proper error handling.
    if (!changes) throw new Error("no pokemon scheduled for today");

    db.query(`DELETE FROM players_games_guesses WHERE game_id = $player_id`).run({ player_id });
  })();

  return player_id;
}

export function submit_guess(player_id: number, guessed_pokemon_id: number): { answer: string | null, status: Status, comparison: Comparison } {
  const query = db.query<{ correct: number, guesses: number, comparison: string, answer: string | null }, { player_id: number, guessed_pokemon_id: number }>(`
    INSERT INTO players_games_guesses (game_id, guessed_pokemon_id)
    VALUES ($player_id, $guessed_pokemon_id)
    RETURNING
      (SELECT pokemon_id = guessed_pokemon_id FROM players_games WHERE player_id = $player_id) as correct,
      (SELECT COUNT(*) FROM players_games_guesses WHERE game_id = $player_id) as guesses,
      (
        SELECT CASE
          WHEN COUNT(*) >= (SELECT max_guesses FROM players_games WHERE player_id = $player_id)
          THEN (SELECT name FROM pokemon WHERE id = (SELECT pokemon_id FROM players_games WHERE player_id = $player_id))
          ELSE NULL
        END FROM players_games_guesses WHERE game_id = $player_id
      ) as answer,
      (SELECT json_object(
        'generation', generation,
        'height', height,
        'weight', weight,
        'type1', type1,
        'type2', type2
      ) FROM pokemon_comparison WHERE
        pokemon_src_id = $guessed_pokemon_id AND
        pokemon_tgt_id = (SELECT pokemon_id FROM players_games WHERE player_id = $player_id)
      ) as comparison
`);

  const row = query.get({ player_id, guessed_pokemon_id })!;

  let status: Status = "playing";

  if (row.correct > 0) status = "won";
  if (row.answer !== null) status = "lost";

  return { answer: row.answer, status, comparison: JSON.parse(row.comparison) };
}

export function get_game_state(player_id: number) {
  const game = db.query<{ max_guesses: number, pokemon_id: number, player_id: number }, { player_id: number }>(`
    SELECT player_id, max_guesses, pokemon_id FROM players_games WHERE player_id = $player_id
  `).get({ player_id });

  if (!game) return null;

  const guesses = db.query<{ guessed_pokemon_id: number, name: string, comparison: string }, { player_id: number, pokemon_id: number, max_guesses: number }>(`
    SELECT
      g.guessed_pokemon_id,
      p.name,
      (
        SELECT json_object(
          'generation', generation,
          'height', height,
          'weight', weight,
          'type1', type1,
          'type2', type2
        ) FROM pokemon_comparison WHERE
          pokemon_src_id = g.guessed_pokemon_id AND
          pokemon_tgt_id = $pokemon_id
      ) as comparison
    FROM players_games_guesses AS g
    JOIN pokemon AS p ON p.id = g.guessed_pokemon_id
    WHERE g.game_id = $player_id
    ORDER BY g.created_at ASC
    LIMIT $max_guesses
  `).all({ ...game });

  let status: Status = "playing";

  if (guesses.at(-1)?.guessed_pokemon_id === game.pokemon_id) status = "won";
  if (guesses.length >= game.max_guesses) status = "lost";

  return { status, guesses: guesses.map(g => ({ ...g, comparison: JSON.parse(g.comparison) })) };
}

if (import.meta.main) {
  console.log(submit_guess(3, 618));
}
