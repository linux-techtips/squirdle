import { Database } from "bun:sqlite";
import * as path from "path";

async function main() {
  const db = new Database("pokedex.db", { strict: true });

  db.run(`
    CREATE TABLE pokemon (
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

  const bulkInsert = db.transaction((pokemon) => {
    for (const [i, poke] of pokemon.entries()) {
      if (!poke) continue;
      insert.run({ id: i + 1, ...poke });
    }
  });

  const { default: pokedex } = await import("./pokedex.json");
  bulkInsert(pokedex);
}

if (import.meta.main) main();
