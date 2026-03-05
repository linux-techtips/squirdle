import index from "@/public/index.html";

const server = Bun.serve({
  routes: {
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.info(`[server] started at: ${server.hostname}:${server.port}`);
