import * as tracing from "@/lib/tracing";

import { App, serve } from "@/server";

import index from "@/client/index.html";

async function main() {
  const app = App.production(Bun.env.DATABASE_URL!, Bun.env.TOKIN_SECRET!);

  let filter = tracing.All;
  if (Bun.env.NODE_ENV === "production") {
    filter = (level) => Boolean(level & (tracing.LEVEL.INFO | tracing.LEVEL.ERROR));
  }

  const stderr = tracing.File.stderr(filter);

  tracing.subscribe(app.tracer, stderr.interface());

  // const hostname = Bun.env.HOSTNAME ?? ((Bun.env.NODE_ENV === "production") ? "0.0.0.0" : "localhost");
  const hostname = "0.0.0.0";
  const server = serve(app, hostname, index);

  tracing.info(app.tracer, `starting server on: ${server.url}`);
}

if (import.meta.main) main();
