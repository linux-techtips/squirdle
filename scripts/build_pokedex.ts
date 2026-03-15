import { Database } from "bun:sqlite";

import * as util from "util";

async function build_pokedex(db_path: string, pokedex_path: string) {
  const db = new Database(db_path, { strict: true });
  db.run(`
    CREATE TABLE IF NOT EXISTS pokemon (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type1 TEXT NOT NULL,
      type2 TEXT,
      height INTEGER NOT NULL,
      weight INTEGER NOT NULL,
      generation INTEGER NOT NULL
    );
  `);

  const insert = db.prepare(`
    INSERT INTO pokemon (id, name, type1, type2, height, weight, generation)
    VALUES ($id, $name, $type1, $type2, $height, $weight, $generation)
  `);

  const bulkInsert = db.transaction((pokemon: any[]) => {
    for (const [i, poke] of pokemon.entries()) {
      if (!poke) continue;
      insert.run({ id: i + 1, ...poke });
    }
  });

  const file = Bun.file(pokedex_path);
  const pokemon = await file.json();
  bulkInsert(pokemon);
}

async function main() {
  const { values, positionals } = util.parseArgs({
    args: Bun.argv.slice(2),
    options: {
      db: { type: "string" },
    },
    strict: true,
    allowPositionals: true,
  });

  const db_path = values.db ?? process.env.DATABASE_URL ?? "pokedex.db";
  const [pokedex_path = "pokedex.json"] = positionals;

  await build_pokedex(db_path, pokedex_path);
}

if (import.meta.main) main();
