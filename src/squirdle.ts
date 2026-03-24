import type { Database } from "bun:sqlite";

import * as util from "./util";

export const POKEMON_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
] as const;

export type PokemonType = typeof POKEMON_TYPES[number];

export type Pokemon = {
  name: string,
  generation: number,
  height: number,
  weight: number,
  type1: PokemonType,
  type2: PokemonType | null;
};

export type GameStatus = "playing" | "won" | "lost";

export type GameSummary = {
  status: GameStatus,
  masks: Uint8Array,
  answer_id: number | null,
};

export type GuessResult = {
  mask: number,
  status: GameStatus,
  answer_id: number | null,
};

export function migrate(db: Database) {
  const poke_type_check = POKEMON_TYPES.map(t => `'${t}'`).join(',');

  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE pokemon (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      height INTEGER NOT NULL,
      weight INTEGER NOT NULL,
      generation INTEGER NOT NULL,
      type1 TEXT NOT NULL CHECK (type1 IN (${poke_type_check})),
      type2 TEXT CHECK (type2 IN (${poke_type_check}))
    ) STRICT;

    CREATE TABLE games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id),
      max_guess_count INTEGER NOT NULL DEFAULT 6 CHECK (max_guess_count > 0)
    ) STRICT;

    CREATE TABLE guesses (
      game_id INTEGER NOT NULL REFERENCES games(id),
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id),
      guessed_at INTEGER NOT NULL DEFAULT (UNIXEPOCH()),
      UNIQUE(game_id, pokemon_id)
    ) STRICT;

    CREATE TABLE pokemon_schedule (
      scheduled_at INTEGER PRIMARY KEY CHECK(scheduled_at % 86400 = 0),
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id)
    ) STRICT;

    CREATE VIEW pokemon_today AS
    SELECT pokemon_id FROM pokemon_schedule WHERE scheduled_at = ((UNIXEPOCH() / 86400) * 86400);

    CREATE VIEW pokemon_comparison AS
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

    CREATE VIEW game_state AS
    SELECT
      ga.id AS game_id,
      ga.pokemon_id,
      ga.max_guess_count,
      COUNT(gu.pokemon_id) AS guess_count,
      CASE
        WHEN MAX(CASE WHEN gu.pokemon_id = ga.pokemon_id THEN 1 ELSE 0 END) = 1 THEN "won"
        WHEN COUNT(gu.pokemon_id) >= ga.max_guess_count THEN "lost"
        ELSE "playing"
      END as status
    FROM games AS ga
    LEFT JOIN guesses AS gu ON gu.game_id = ga.id
    GROUP BY ga.id;

    CREATE VIEW guess_result AS
    SELECT
      gu.game_id,
      gu.pokemon_id,
      gu.guessed_at,
      pc.mask,
      gs.status,
      CASE WHEN gs.status != "playing" THEN gs.pokemon_id ELSE NULL END AS answer_id
    FROM guesses AS gu
    JOIN game_state AS gs ON gs.game_id = gu.game_id
    JOIN pokemon_comparison AS pc ON
      pc.src_pokemon_id = gu.pokemon_id AND
      pc.tgt_pokemon_id = gs.pokemon_id;

    CREATE VIEW game_summary AS
    SELECT
      gs.game_id,
      gs.status,
      gs.guess_count,
      gs.max_guess_count,
      CASE WHEN gs.status != 'playing' THEN gs.pokemon_Id ELSE NULL END AS answer_id,
      GROUP_CONCAT(printf('%02x', pc.mask), '') AS masks
    FROM game_state AS gs
    JOIN guesses AS gu ON gu.game_id = gs.game_id
    JOIN pokemon_comparison AS pc ON
      pc.src_pokemon_id = gu.pokemon_id AND
      pc.tgt_pokemon_id = gs.pokemon_id
    GROUP BY gs.game_id
    ORDER BY gu.guessed_at;
  `);
}

export function seed(
  db: Database,
  pokedex: Pokemon[],
  ids: number[],
  date_offset: number = 0,
) {
  const seed = db.transaction(() => {
    const insert = db.query<{}, Pokemon & { id: number }>(`
      INSERT INTO pokemon (id, name, generation, height, weight, type1, type2)
      VALUES (:id, :name, :generation, :height, :weight, :type1, :type2)
    `);

    const schedule = db.query<{}, { date: number, id: number }>(`
      INSERT INTO pokemon_schedule (scheduled_at, pokemon_id)
      VALUES ($date, $id)
    `);

    for (let i = 0; i < pokedex.length; i += 1) {
      insert.run({ id: i + 1, ...pokedex[i]! });
    }

    const today = util.today();

    let i = 0;
    for (const id of ids) {
      schedule.run({ date: today + ((i + date_offset) * 86400), id });
      i += 1;
    }

    schedule.finalize();
    insert.finalize();
  });

  return seed();
}

export function start_game(db: Database): number {
  const start = db.query<{ id: number }, {}>(`
    INSERT INTO games (pokemon_id)
    SELECT pokemon_id FROM pokemon_today
    RETURNING id
  `);

  return start.get({})!.id;
}

export function guess(db: Database, game_id: number, pokemon_id: number): GuessResult | null {
  const row = db.query<{ rowid: number }, { game_id: number, pokemon_id: number }>(`
    INSERT INTO guesses (game_id, pokemon_id)
    VALUES (:game_id, :pokemon_id)
    RETURNING rowid
  `).get({ game_id, pokemon_id });

  if (!row) throw new Error("failed to make guess");

  const result = db.query<GuessResult, { rowid: number }>(`
    SELECT gr.* FROM guess_result AS gr
    JOIN guesses gu ON gu.game_id = gr.game_id AND gu.pokemon_id = gr.pokemon_id
    WHERE gu.rowid = :rowid
  `).get({ rowid: row.rowid });

  return result;
}

export function game_summary(db: Database, game_id: number): GameSummary | null {
  const result = db.query<Omit<GameSummary, "masks"> & { masks: string }, { game_id: number }>(`
    SELECT * FROM game_summary WHERE game_id = :game_id
  `).get({ game_id });

  if (result === null) return null;

  return { ...result, masks: Uint8Array.fromHex(result.masks) };
}

export type Cmp = "gt" | "lt" | "eq";
export type Eq = "eq" | "ne";

export function decode_mask(mask: number) {
  const decode_2bit = (bits: number): Cmp =>
    bits === 0b10 ? "gt" : bits == 0b01 ? "lt" : "eq";

  const decode_1bit = (bits: number): Eq =>
    bits === 1 ? "ne" : "eq";

  return {
    gen: decode_2bit((mask >> 6) & 0b11),
    height: decode_2bit((mask >> 4) & 0b11),
    weight: decode_2bit((mask >> 2) & 0b11),
    type1: decode_1bit((mask >> 1) & 0b1),
    type2: decode_1bit((mask >> 0) & 0b1)
  };
}
