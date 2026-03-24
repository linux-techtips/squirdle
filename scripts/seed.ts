import * as squirdle from "@/squirdle";
import * as util from "@/util";

import { Database } from "bun:sqlite";

async function main() {
  const [pokedex_path = "pokedex.json"] = Bun.argv.slice(2);

  const pokedex = await Bun.file(pokedex_path).json();

  const db = new Database(Bun.env.DATABASE_URL, { strict: true });

  squirdle.migrate(db);
  squirdle.seed(db, pokedex, util.sample_ids(365));
}

if (import.meta.main) main();
