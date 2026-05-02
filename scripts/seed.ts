import * as db from "@/server/db";
import * as lib from "@/lib";

async function main() {
  const [pokedex_path = "pokedex.json"] = Bun.argv.slice(2);
  const pokedex = await Bun.file(pokedex_path).json();

  const sqlite = db.SQLiteDatabase.open(Bun.env.DATABASE_URL!, { strict: true });

  db.seed_pokemon(sqlite, pokedex);
  db.seed_schedule(sqlite, lib.sample_ids(100));
}

if (import.meta.main) main();
