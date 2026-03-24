import type { BunRequest as Request } from "bun";
import { Database } from "bun:sqlite";

import index from "@/public/index.html";

import * as squirdle from "./squirdle";

const db = new Database(Bun.env.DATABASE_URL!, { strict: true });

const api = {
  "/games": {
    POST: async (req: Request) => {
      try {
        const json = await req.json();
        if (typeof json.player_id !== "string") throw new Error("no player_id provided");

        const id = squirdle.start_game(db);

        return Response.json({ id }, { status: 201 });
      } catch (e) {
        return new Response(String(e), { status: 400 });
      }
    },
  },
  "/games/:id": {
    GET: async (req: Request) => {
      const id = Number(req.params.id);
      const state = squirdle.game_summary(db, id);

      if (state === null) {
        return new Response(null, { status: 404 });
      }

      return Response.json(state, { status: 200 });
    },
    POST: async (req: Request) => {
      const id = Number(req.params.id);

      try {
        const json = await req.json();
        if (typeof json.pokemon_id !== "string") throw new Error("missing pokemon_id");

        const state = squirdle.guess(db, id, Number(json.pokemon_id));

        if (state === null) {
          return new Response(null, { status: 400 });
        }

        return Response.json(state, { status: 200 });

      } catch (e) {
        return new Response(String(e), { status: 400 });
      }
    },
  },
};

function serve(hostname: string) {
  return Bun.serve({
    routes: {
      "/": index,
      ...api,
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
