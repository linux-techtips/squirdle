import * as App from "@/server/app";
import * as db from "@/server/db";

import type { Pokemon } from "@/types";

import pokedex from "@/pokedex.json";

async function main() {
  const app = App.production();

  db.migrate(app.sqlite);
  db.seed_pokemon(app, pokedex as Pokemon[]);
  db.seed_schedule(app, sample_ids(365));
}

// https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
export function sample_ids(count: number, random: () => number = Math.random): number[] {
  const ids = Array.from({ length: 649 }, (_, i) => i + 1);
  const acc = new Array<number>(count);

  let filled = 0;
  while (filled < count) {
    const take = Math.min(count - filled, ids.length);
    for (let i = 0; i < count; i += 1) {
      const j = i + Math.floor(random() * (ids.length - i));

      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
      acc[filled + i] = ids[i]!;
    }

    filled += take;
  }

  return acc;
}

if (import.meta.main) main();
