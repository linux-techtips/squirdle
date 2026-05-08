import type { Pokemon } from "@/types";

import * as tracing from "@/lib/tracing";
import * as tokin from "@/lib/tokin";
import * as time from "@/lib/time";
import * as db from "./db";

import pokedex from "@/pokedex.json";

export class App {
  sqlite: db.SQLiteDatabase
  tracer: tracing.Tracer
  hasher: tokin.Hasher
  clock: time.Clock

  constructor(
    sqlite: db.SQLiteDatabase,
    tracer: tracing.Tracer,
    hasher: tokin.Hasher,
    clock: time.Clock,
  ) {
    this.sqlite = sqlite;
    this.tracer = tracer;
    this.hasher = hasher;
    this.clock = clock;
  }

  static production(database_url: string, tokin_secret: string): App {
    const sqlite = db.open(database_url);
    const tracer = tracing.tracer();
    const hasher = tokin.hasher(tokin_secret);
    const clock = time.Now.init().interface();

    return new App(sqlite, tracer, hasher, clock);
  }

  static testing(clock: time.Clock, schedule: number[]): App {
    const sqlite = db.open(":memory:");
    const tracer = tracing.tracer();
    const hasher = tokin.hasher("secret");

    db.migrate(sqlite);

    const app = new App(sqlite, tracer, hasher, clock);

    db.seed_pokemon(app, pokedex as Pokemon[]);
    db.seed_schedule(app, schedule);

    return app;
  }
}

export { serve } from "./serve";
