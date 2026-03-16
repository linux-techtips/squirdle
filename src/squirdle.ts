import { Database } from "bun:sqlite";

import type { Pokemon } from "@/types";

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
      id INTEGER PRIMARY KEY,
      game_id INTEGER NOT NULL REFERENCES players_games(id),
      guessed_pokemon_id INTEGER NOT NULL REFERENCES pokemon(id),
      created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS players_games (
      id INTEGER PRIMARY KEY,
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id),
      player_id INTEGER NOT NULL REFERENCES players(id),
      initiated_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at INTEGER
    );
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

export function schedule_pokemon(db: Database, ids: number[], date_offset: number = 0) {
  const today = Math.floor(Math.floor(Date.now() / 1000) / 86400) * 86400;

  const scheduleAll = db.transaction(() => {
    const schedule = db.query(`INSERT INTO pokemon_daily (scheduled_at, pokemon_id) VALUES ($date, $id)`);

    let i = 0;
    for (const id of ids) {
      schedule.run({ date: today + ((i + date_offset) * 86400), id });
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
      const j = i + Math.floor(Math.random() * (650 - i));
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
      result[filled + i] = ids[i]!;
    }

    filled += take;
  }

  return result;
}
