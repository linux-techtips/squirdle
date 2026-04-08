import { Database, seedPokedex, seedSchedule } from "@/server/db";
import * as lib from "@/lib";

async function main() {
  const [pokedex_path = "pokedex.json"] = Bun.argv.slice(2);
  const pokedex = await Bun.file(pokedex_path).json();

  const db = new Database(Bun.env.DATABASE_URL, { strict: true });

  seedPokedex(db, pokedex);
  seedSchedule(db, lib.sample_ids(100));
}

if (import.meta.main) main();
