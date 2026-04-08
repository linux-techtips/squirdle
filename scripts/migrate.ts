import { Database, migrate } from "@/server/db";
import * as lib from "@/lib";

async function main() {
  using db = new Database(Bun.env.DATABASE_URL, { strict: true });
  migrate(db);
}

if (import.meta.main) main();
