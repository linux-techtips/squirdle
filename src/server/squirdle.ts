import type { GuessResult, GameSummary } from "@/lib";
import type { Database } from "@/server/db";

export const Squirdle = (db: Database) => ({
  create_player(args: { name: string }): { id: number } | null {
    const create = db.query<{ id: number }, typeof args>(`
      INSERT INTO players (name) VALUES (:name) RETURNING id
    `);

    return create.get(args);
  },
  start_game(args: { id: number }): { id: number } | null {
    const start = db.query<{ id: number }, typeof args>(`
      INSERT INTO games (id, pokemon_id)
      SELECT :id pokemon_id FROM pokemon_today WHERE true
      ON CONFLICT (id) DO UPDATE SET
        pokemon_id = EXCLUDED.pokemon_id,
        max_guess_count = EXCLUDED.max_guess_count,
        started_at = UNIXEPOCH()
      RETURNING id
    `);

    // NOTE: (Carter) player id and game id will be the same. I will make this explicit later.
    start.get(args);

    db.query(`DELETE FROM guesses WHERE game_id = :id`).run(args);

    return args;
  },
  guess(args: { game_id: number, pokemon_id: number }): GuessResult | null {
    const row = db.query<{ rowid: number }, typeof args>(`
      INSERT INTO guesses (game_id, pokemon_id)
      VALUES (:game_id, :pokemon_id)
      RETURNING rowid
    `).get(args);

    // TODO: (Carter) i'll refactor the errors in a smack.
    if (!row) throw new Error("failed to make guess");

    return db.query<GuessResult, { rowid: number }>(`
      SELECT gr.* FROM guess_result AS gr
      JOIN guesses AS gu ON gu.game_id = gr.game_id AND gu.pokemon_id = gr.pokemon_id
      WHERE gu.rowid = :rowid
    `).get(row);
  },
  game_summary(args: { game_id: number }): GameSummary | null {
    const result = db.query<Omit<GameSummary, "masks"> & { masks: string }, typeof args>(`
      SELECT * FROM game_summary WHERE game_id = :game_id
    `).get(args);

    // TODO: (Carter) i'll refactor the errors in a smack.
    if (result === null) return null;

    return { ...result, masks: [...Uint8Array.fromHex(result.masks)] };
  }
});

// NOTE: (Carter) I've been told this is cancer, but who's gonna stop me.
export type Squirdle = ReturnType<typeof Squirdle>;
