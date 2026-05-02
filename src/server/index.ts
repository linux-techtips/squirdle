import { SQLiteDatabase, SQLiteError } from "@/server/db";
import * as db from "@/server/db";
import type { BunRequest as Request } from "bun";

import type { DBUser, User } from "@/types";

import index from "@/client/index.html";
import * as tokin from "@/tokin";
import * as lib from "@/lib";

export type App = {
  sqlite: SQLiteDatabase,
  hasher: tokin.Hasher,
};

export async function signup({ sqlite }: App, username: string, password: string): Promise<DBUser | null> {
  const query = sqlite.query<DBUser, Omit<DBUser, "id">>(`
    INSERT INTO players (username, passhash) VALUES (:username, :passhash) RETURNING *
  `);

  try {
    return query.get({ username, passhash: await Bun.password.hash(password) });
  } catch (e) {
    // NOTE: (Carter) I hate JS error handling with a passion.
    if (e instanceof SQLiteError && e?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return null;
    }

    throw e;
  }
}

export async function signin({ sqlite }: App, username: string, password: string): Promise<DBUser | null> {
  const query = sqlite.query<DBUser, { username: string }>(`
    SELECT * FROM players WHERE username = :username
  `);

  const user = query.get({ username });

  return (user && await Bun.password.verify(password, user.passhash))
    ? user
    : null;
}

export function authenticate(app: App, handler: typeof signin | typeof signup, error_status: number): (req: Request) => Promise<Response> {
  return async (req) => {
    let formData;

    try {
      formData = await req.formData();
    } catch {
      return Response.json({ error: "invalid form data" }, { status: 400 });
    }

    const username = formData.get("username");
    const password = formData.get("password");

    if (typeof username !== "string" || typeof password !== "string") {
      return Response.json({ error: "invalid form data" }, { status: 400 });
    }

    const user = await handler(app, username, password);
    if (user === null) {
      return new Response(null, { status: error_status });
    }

    issueAuthTokens(req, app.hasher, user);

    return new Response(null, { status: 201 });
  }
}

export function guard(app: App, handler: (req: Request, user: User) => Response | Promise<Response>): (req: Request) => Response | Promise<Response> {
  return (req) => {
    const now = lib.now_in_seconds();

    const primary_cookie = req.cookies.get("primary-token") as tokin.Token<User> | undefined;
    if (primary_cookie) {
      const payload = tokin.verify(primary_cookie, app.hasher);
      if (payload && now <= payload.exp) {
        const { iat, exp, ...user } = payload;
        return handler(req, user);
      }
    }

    const refresh_cookie = req.cookies.get("refresh-token") as tokin.Token<User> | undefined;
    if (refresh_cookie) {
      const payload = tokin.read(refresh_cookie);
      if (payload && now <= payload.exp) {
        const { iat, exp, ...user } = payload;

        const row = app.sqlite.query<{ passhash: string }, { id: number }>(`
          SELECT passhash FROM players WHERE id = :id
        `).get({ id: user.id });

        if (row && tokin.verify(refresh_cookie, tokin.hasher(row.passhash))) {
          // TODO: (Carter) issueAuthTokens will create a new tokin.hasher based on the passhash.
          issueAuthTokens(req, app.hasher, { passhash: row.passhash, ...user });
          return handler(req, user);
        }
      }
    }

    return Response.json("unable to authenticate credentials", { status: 401 });
  };
}

export function issueAuthTokens(req: Request, hasher: tokin.Hasher, { passhash, ...user }: DBUser) {
  // NOTE: For tokens, we deal with seconds since epoch.
  const iat = lib.now_in_seconds();
  const primary_exp = 86400;
  const refresh_exp = primary_exp * 7;

  const primary_payload = tokin.payload<User>(user, iat, primary_exp);
  const primary_token = tokin.sign(primary_payload, hasher);

  const refresh_payload = tokin.payload<User>(user, iat, refresh_exp);
  const refresh_token = tokin.sign(refresh_payload, tokin.hasher(passhash));

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

function serve(app: App): Bun.Server<undefined> {
  return Bun.serve({
    development: true,
    routes: {
      "/api/auth/signup": {
        POST: authenticate(app, signup, 409),
      },
      "/api/auth/signin": {
        POST: authenticate(app, signin, 401),
      },
      "/api/game": {
        POST: guard(app, (_req, user) => {
          const state = db.start_or_get_game(app.sqlite, user.id);
          if (!state) {
            return Response.json({ error: "no pokemon scheduled for today" }, { status: 500 });
          }

          return Response.json(state, { status: 200 });
        }),
        GET: guard(app, (_req, user) => {
          const state = db.game_state(app.sqlite, user.id);
          return Response.json(state, { status: 200 });
        }),
      },
      "/api/guess": {
        POST: guard(app, async (req: Request, user) => {
          let formData;

          try {
            formData = await req.formData();
          } catch {
            return Response.json({ error: "invalid form data" }, { status: 400 });
          }

          const pokemon_id = formData.get("pokemon_id");

          if (typeof pokemon_id !== "string") {
            return Response.json({ error: "invalid form data" }, { status: 400 });
          }

          const result = db.make_guess(app.sqlite, user.id, parseInt(pokemon_id));
          if (!result) {
            return Response.json({ error: "invalid guess" }, { status: 400 });
          }

          console.log(result);

          return Response.json(result, { status: 201 });
        }),
      },
      "/*": index,
    },
  })
}

async function main() {
  const sqlite = SQLiteDatabase.open(Bun.env.DATABASE_URL!, { strict: true });
  const hasher = tokin.hasher("SUPER_DUPER_SECRET");

  const app: App = { sqlite, hasher };
  const server = serve(app);

  console.info(`[server] starting on: ${server.url}`);
}

if (import.meta.main) main();
