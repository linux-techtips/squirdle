import * as path from "path";

const GENERAION_MAP: Record<string, number> = {
  "i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5,
}

type Pokemon = {
  generation: number,
  height: number,
  weight: number,
  type1: string,
  type2: string,
  name: string,
};

function parse_pokemon(json: any): Pokemon {
  // TODO: (Carter) this is stupid.
  const generation = Math.min(
    ...Object.keys(json["sprites"]["versions"])
      .map((k) => GENERAION_MAP[k.split("-")[1]!] ?? 100)
  )

  return {
    generation,
    "height": json["height"],
    "weight": json["weight"],
    "type1": json["types"][0]?.["type"]?.["name"] ?? null,
    "type2": json["types"][1]?.["type"]?.["name"] ?? null,
    "name": json["name"],
  };
}

export async function fetch_pokedex(save_path: string, batch_size: number, sleep_ms: number) {
  const pokedex: Pokemon[] = [];

  for (let i = 1; i <= 649; i += batch_size) {
    const batch = Array.from(
      { length: Math.min(batch_size, 650 - i) },
      (_, j) => i + j,
    );

    const pokemon = await Promise.all(
      batch.map(async (id) => {
        const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const json = await resp.json();

        return parse_pokemon(json);
      })
    );

    pokedex.push(...pokemon);
    console.log(`Fetched ${pokedex.length - 1}/649`);

    if (i + batch_size <= 649) {
      await Bun.sleep(sleep_ms);
    }
  }

  await Bun.write(save_path, JSON.stringify(pokedex, null, 2));
}

async function main() {
  // TODO: (Carter) command line args.
  const save_path = path.join(import.meta.dir, "pokedex.json");
  await fetch_pokedex(save_path, 5, 100);
}

if (import.meta.main) main();
