import { Database } from "bun:sqlite";

import type { Guess, Pokemon } from "@/types";

export const db = Database.open(Bun.env.DATABASE_URL!, { strict: true, create: true });

export function create_schema(db: Database) {
  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS pokemon (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      generation INTEGER NOT NULL,
      height INTEGER NOT NULL,
      weight INTEGER NOT NULL,
      type1 TEXT NOT NULL,
      type2 TEXT
    );

    CREATE TABLE IF NOT EXISTS pokemon_daily (
      scheduled_at INTEGER PRIMARY KEY CHECK(scheduled_at % 86400 = 0),
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id)
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS players_games_guesses (
      game_id INTEGER NOT NULL REFERENCES players_games(id),
      guessed_pokemon_id INTEGER NOT NULL REFERENCES pokemon(id),
      created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS players_games (
      player_id INTEGER PRIMARY KEY REFERENCES players(id),
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id),
      initiated_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at INTEGER
    );

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
    for (const [i, poke] of pokedex.entries()) insert.run({ id: i + 1, ...poke });
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

function submit_guess(player_id: number, guessed_pokemon_id: number): Guess {
  const query = db.query(`
    INSERT INTO players_games_guesses (game_id, guessed_pokemon_id)
    VALUES ($player_id, $guessed_pokemon_id)
    RETURNING
      (SELECT pokemon_id = guessed_pokemon_id FROM players_games WHERE player_id = game_id) as correct,
      (SELECT COUNT(*) FROM players_games_guesses WHERE game_id = game_id) as guesses,
      (SELECT json_object(
        'generation', generation,
        'height', height,
        'weight', weight,
        'type1', type1,
        'type2', type2
      ) FROM pokemon_comparison WHERE
        pokemon_src_id = guessed_pokemon_id AND
        pokemon_tgt_id = (SELECT pokemon_id FROM players_games WHERE player_id = game_id)
      ) as comparison
  `);

  const { correct, guesses, comparison } = query.get({ player_id, guessed_pokemon_id }) as { correct: number, guesses: number, comparison: string };

  return { correct: correct > 0, guesses, comparison: JSON.parse(comparison) };
}

if (import.meta.main) {
  console.log(submit_guess(1, 1));
}
