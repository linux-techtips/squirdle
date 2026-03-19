import type { BunRequest as Request } from "bun";

import index from "@/public/index.html";

import * as squirdle from "./squirdle";

const api = {
  "/players": {
    POST: async (req: Request) => {
      try {
        const json = await req.json();
        if (typeof json.name !== "string") throw new Error("no name provided");

        return Response.json({ id: squirdle.create_player(json.name) }, { status: 201 });
      } catch (e) {
        return new Response(String(e), { status: 400 });
      }
    },
  },
  "/games": {
    POST: async (req: Request) => {
      try {
        const json = await req.json();
        if (typeof json.player_id !== "string") throw new Error("no player_id provided");

        const id = squirdle.start_game(squirdle.start_game(Number(json.player_id)));
        return Response.json({ id }, { status: 201 });
      } catch (e) {
        return new Response(String(e), { status: 400 });
      }
    },
  },
  "/games/:id": {
    GET: async (req: Request) => {
      const id = Number(req.params.id);
      const state = squirdle.get_game_state(id);

      if (state === null) {
        return new Response(null, { status: 404 });
      }

      return Response.json(squirdle.get_game_state(id), { status: 200 });
    },
    POST: async (req: Request) => {
      const id = Number(req.params.id);

      try {
        const json = await req.json();
        if (typeof json.pokemon_id !== "string") throw new Error("missing pokemon_id");

        const state = squirdle.submit_guess(id, Number(json.pokemon_id));

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
