import * as tracing from "@/lib/tracing";

import { App, serve } from "@/server";

import index from "@/client/index.html";

async function main() {
  const app = App.production(Bun.env.DATABASE_URL!, Bun.env.TOKIN_SECRET!);

  const stderr = tracing.File.stderr();

  tracing.subscribe(app.tracer, stderr.interface());

  const hostname = Bun.env.HOSTNAME ?? ((Bun.env.NODE_ENV === "production") ? "0.0.0.0" : "localhost");
  const server = serve(app, hostname, index);

  tracing.info(app.tracer, `starting server on: ${server.url}`);
}

if (import.meta.main) main();
