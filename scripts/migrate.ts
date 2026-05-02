import * as db from "@/server/db";

async function main() {
  const sqlite = db.SQLiteDatabase.open(Bun.env.DATABASE_URL!, { strict: true });
  db.migrate(sqlite);
}

if (import.meta.main) main();
