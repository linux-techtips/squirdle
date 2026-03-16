import index from "@/public/index.html";

function serve(hostname: string) {
  return Bun.serve({
    routes: {
      "/*": index,
    },

    development: process.env.NODE_ENV !== "production" && {
      hmr: true,
      console: true,
    },
    hostname,
  });
}

async function main() {
  const [hostname = "localhost"] = Bun.argv.slice(2);
  const server = serve(hostname);

  console.info(`[server] started at: ${server.url}`);
}

if (import.meta.main) main();
