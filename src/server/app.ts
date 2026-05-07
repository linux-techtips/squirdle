import type { Pokemon, Profile, Registration } from "@/types";
import type { BunRequest as Request } from "bun";

import * as tracing from "@/lib/tracing";
import * as tokin from "@/lib/tokin";
import * as time from "@/lib/time";
import * as db from "@/server/db";

import pokedex from "@/pokedex.json";

export type App = {
  hostname: string,
  sqlite: db.SQLiteDatabase,
  tracer: tracing.Tracer,
  hasher: tokin.Hasher,
  clock: time.Clock,
};

export function testing(clock: time.Clock, schedule: number[]): App {
  const sqlite = db.open(":memory:");

  const hasher = tokin.hasher("TESTING_SECRET");
  const tracer = tracing.tracer();

  const app: App = {
    hostname: "localhost",
    sqlite,
    hasher,
    tracer,
    clock,
  };

  db.migrate(app.sqlite);

  db.seed_pokemon(app, pokedex as Pokemon[]);
  db.seed_schedule(app, schedule);

  return app;
}

export function production(hostname: string | undefined = Bun.env.HOSTNAME): App {
  const sqlite = db.open(Bun.env.DATABASE_URL!);
  const hasher = tokin.hasher(Bun.env.TOKIN_SECRET!);
  const tracer = tracing.tracer();

  const clock = time.Now.init().interface();

  return {
    hostname: hostname ?? Bun.env.NODE_ENV === "development" ? "localhost" : "0.0.0.0",
    sqlite,
    hasher,
    tracer,
    clock,
  };
}

export async function signup(app: App, registration: Omit<Registration, "passhash"> & { password: string }): Promise<Profile | null> {
  return db.register(app, { ...registration, passhash: await Bun.password.hash(registration.password) });
}

export async function signin(app: App, credentials: { username: string, password: string }): Promise<Profile | null> {
  const user = db.user(app, credentials.username);

  if (user && await Bun.password.verify(credentials.password, user.passhash)) {
    return db.player_profile(app, user.id);
  };

  return null;
}

export function issueAuthTokens(app: App, req: Request, profile: Profile, hasher: tokin.Hasher): void {
  tracing.trace(app.tracer, `issuing authentication tokens for: ${profile.username}`);
  const iat = app.clock.seconds();
  const primary_exp = 86400;
  const refresh_exp = primary_exp * 7;

  const primary_payload = tokin.payload<Profile>(profile, iat, primary_exp);
  const primary_token = tokin.sign(primary_payload, app.hasher);

  // TODO: (Carter) ideally, we would only store the profile id in this token. there is a solution, but this works for now.
  const refresh_payload = tokin.payload<Profile>(profile, iat, refresh_exp);
  const refresh_token = tokin.sign(refresh_payload, hasher);

  // NOTE: For HTTP cookies, Bun requires expires field to be in ms.
  req.cookies.set("primary-token", primary_token, {
    expires: (iat + primary_exp) * 1000,
    sameSite: "strict",
    httpOnly: false,
  });

  // NOTE: For HTTP cookies, Bun requires expires field to be in ms.
  req.cookies.set("refresh-token", refresh_token, {
    expires: (iat + refresh_exp) * 1000,
    sameSite: "strict",
    httpOnly: true,
  });
}

export function guard(app: App, handler: (req: Request, profile: Profile) => Response | Promise<Response>): (req: Request) => Response | Promise<Response> {
  return (req) => {
    const now = app.clock.seconds();

    const primary_cookie = req.cookies.get("primary-token") as tokin.Token<Profile> | undefined;
    if (primary_cookie) {
      const payload = tokin.verify(primary_cookie, app.hasher);
      if (payload && now <= payload.exp) {
        const { iat, exp, ...profile } = payload;
        return handler(req, profile);
      }
    }

    const refresh_cookie = req.cookies.get("refresh-token") as tokin.Token<Profile> | undefined;
    if (refresh_cookie) {
      const payload = tokin.read(refresh_cookie);
      if (payload && now <= payload.exp) {
        const { iat, exp, ...profile } = payload;

        const row = app.sqlite.query<{ passhash: string }, { id: number }>(`
          SELECT passhash FROM users WHERE id = :id
        `).get({ id: profile.id });

        if (row && tokin.verify(refresh_cookie, tokin.hasher(row.passhash))) {
          issueAuthTokens(app, req, profile, tokin.hasher(row.passhash));
          return handler(req, profile);
        }
      }
    }

    return Response.json({ error: "unable to authenticate user" }, { status: 403 });
  };
}

export function serve(app: App, index: Bun.HTMLBundle): Bun.Server<undefined> {
  return Bun.serve({
    development: Bun.env.NODE_ENV === "development",
    hostname: app.hostname,
    routes: {
      "/api/auth/signup": {
        POST: async (req: Request) => {
          tracing.trace(app.tracer, `${req.url}`);

          let form;
          try {
            form = await req.formData();
          } catch {
            return Response.json({ error: "missing form data" }, { status: 400 });
          }

          const favorite_pokemon_id = form.get("favorite_pokemon_id");
          const username = form.get("username");
          const password = form.get("password");

          if (
            typeof favorite_pokemon_id !== "string" ||
            typeof username !== "string" ||
            typeof password !== "string"
          ) {
            return Response.json({ error: "invalid form data" }, { status: 400 });
          }

          const profile = await signup(app, {
            username,
            password,
            favorite_pokemon_id: parseInt(favorite_pokemon_id),
          });

          if (!profile) {
            return Response.json({ error: "user with username already registered" }, { status: 409 });
          }

          // TODO: This is a bit of a hack re-hashing the password.
          issueAuthTokens(app, req, profile, tokin.hasher(await Bun.password.hash(password)));

          return new Response(null, { status: 201 });
        },
      },
      "/api/auth/signin": {
        POST: async (req) => {
          tracing.trace(app.tracer, `${req.url}`);

          let form;
          try {
            form = await req.formData();
          } catch {
            return Response.json({ error: "missing form data" }, { status: 400 });
          }

          const username = form.get("username");
          const password = form.get("password");

          if (
            typeof username !== "string" ||
            typeof password !== "string"
          ) {
            return Response.json({ error: "invalid form data" }, { status: 400 });
          }

          const profile = await signin(app, { username, password });
          if (!profile) {
            return Response.json({ error: "invalid credentials" }, { status: 401 });
          }

          // TODO: This is a bit of a hack re-hashing the password.
          issueAuthTokens(app, req, profile, tokin.hasher(await Bun.password.hash(password)));

          return new Response(null, { status: 200 });
        },
      },
      "/api/game": {
        POST: guard(app, (req, profile) => {
          tracing.trace(app.tracer, `${req.url}`);

          const state = db.start_or_get_game(app, profile.id);
          if (!state) {
            tracing.debug(app.tracer, `failed to start game for: ${profile.username}`);
            return Response.json({ error: "not able to create game for player" }, { status: 500 });
          }

          return Response.json(state, { status: 201 });
        }),
        GET: guard(app, (req, profile) => {
          tracing.trace(app.tracer, `${req.url}`);

          const state = db.start_or_get_game(app, profile.id);
          if (!state) {
            tracing.debug(app.tracer, `failed to start game for: ${profile.username}`);
            return Response.json({ error: "not able to get game for player" }, { status: 500 });
          }

          return Response.json(state, { status: 200 });
        }),
      },
      "/api/guess/:pokemon_id": {
        POST: guard(app, (req, profile) => {
          tracing.trace(app.tracer, `${req.url}`);

          const result = db.make_guess(app, profile.id, parseInt(req.params.pokemon_id!));
          if (!result) {
            // NOTE: (Carter) a player must start a game first, however the user interface should always guarantee this. so the error will be 500 for now.
            tracing.debug(app.tracer, `failed to make guess for: ${profile.username}`);
            return Response.json({ error: "unable to make guess" }, { status: 500 });
          }

          return Response.json(result, { status: 200 });
        }),
      },
      "/api/profiles/search": {
        GET: async (req) => {
          const url = new URL(req.url);

          tracing.debug(app.tracer, `${url}`);
          const query = url.searchParams.get("query") ?? "";
          const limit = clamp(parseInt(url.searchParams.get("limit") ?? "20", 10), 1, 100);

          const profiles = db.search_profiles(app, query, limit);

          return Response.json(profiles, { status: 200 });
        },
      },
      "/*": index,
    },
  });
}

function clamp(n: number, lo: number, hi: number): number {
  return Number.isFinite(n) ? Math.min(Math.max(n, lo), hi) : lo;
}
