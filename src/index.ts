import * as tracing from "@/lib/tracing";
import * as App from "@/server/app";

import index from "@/client/index.html";

async function main() {
  const app = App.production();

  const stderr = tracing.File.stderr();

  tracing.subscribe(app.tracer, stderr.interface());

  const server = App.serve(index, app);

  tracing.info(app.tracer, `starting server on: ${server.url}`);
}

if (import.meta.main) main();
