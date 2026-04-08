import { Squirdle } from "@/server/squirdle";
import { Database } from "@/server/db";

import index from "@/client/index.html";

async function serve(hostname: string) {
  const database = Database.open("squirdle.db", { strict: true });
  const squirdle = Squirdle(database);

  return Bun.serve({
    development: Bun.env.NODE_ENV !== "production" ? { hmr: true } : {},
    hostname,
    routes: { "/*": index },
  });
}

async function main() {
  const [hostname = "localhost"] = Bun.argv.slice(2);
  const server = await serve(hostname);

  console.log(`[server] started on ${server.url}`);
}

if (import.meta.main) main();
