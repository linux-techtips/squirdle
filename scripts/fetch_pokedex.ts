import * as util from "util";

const GENERAION_MAP: Record<string, number> = {
  "i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8, "ix": 9,
};

type Pokemon = {
  generation: number,
  height: number,
  weight: number,
  type1: string,
  type2: string,
  name: string,
};

function parse_pokemon(attrs: any, specs: any): Pokemon {
  return {
    generation: GENERAION_MAP[specs["generation"]["name"].split("-")[1]]!,
    height: attrs["height"],
    weight: attrs["weight"],
    type1: attrs["types"][0]?.["type"]?.["name"] ?? null,
    type2: attrs["types"][1]?.["type"]?.["name"] ?? null,
    name: attrs["name"],
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
        const [attrs, specs] = await Promise.all([
          fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(resp => resp.json()),
          fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`).then(resp => resp.json()),
        ]);

        return parse_pokemon(attrs, specs);
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
  const { values, positionals } = util.parseArgs({
    args: Bun.argv.slice(2),
    options: {
      sleep_ms: { type: "string" },
      batch_size: { type: "string" },
    },
    strict: true,
    allowPositionals: true,
  });

  const sleep_ms = Number(values.sleep_ms ?? 1000);
  const batch_size = Number(values.batch_size ?? 4);
  const [save_path = "pokedex.json"] = positionals;

  await fetch_pokedex(save_path, batch_size, sleep_ms);
}

if (import.meta.main) main();
