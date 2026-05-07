export { PokemonInput } from "./PokemonInput";
export { Sprite } from "./Sprite";

import { PokemonInput } from "./PokemonInput";
import { Sprite } from "./Sprite";

import type { Profile, Pokemon } from "@/types";
import pokedex from "@/pokedex.json";

import * as React from "react";

import { Squirdle, useDebounce } from "@/client";

export function ProfileSearch() {
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebounce(1000, query);

  React.useEffect(() => {
    if (debouncedQuery.length <= 3) return;

    const controller = new AbortController();

    fetch(`/api/profiles/search?query=${query}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : [])
      .then(state => setProfiles(state))
      .catch(err => {
        if (controller.signal.aborted) return;
        throw err;
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  return (
    <form>
      <label>Search <input type="text" name="query" value={query} onChange={(e) => setQuery(e.target.value)} required /></label>
      <ul>
        {profiles.map(profile => <li>{profile.username}</li>)}
      </ul>
    </form>
  );
}

export function GuessForm() {
  const squirdle = Squirdle.use();

  async function submit(_error: string, body: FormData) {
    const pokemon_id = Number(body.get("pokemon_id")!);
    await squirdle.guess(pokemon_id);

    return "";
  }

  const [_error, action, pending] = React.useActionState(submit, "");

  return (
    <form action={action}>
      <PokemonInput label="Pokemon" name="pokemon_id" required />
      <button type="submit" disabled={pending || squirdle.status !== "playing"} aria-busy={pending}>Submit</button>
    </form>
  );
}

export function GuessItem({ guess }: { guess: { mask: number, pokemon_id: number } }) {
  const MASK = {
    GENERATION_GT: 1 << 7,
    GENERATION_LT: 1 << 6,
    HEIGHT_GT: 1 << 5,
    HEIGHT_LT: 1 << 4,
    WEIGHT_GT: 1 << 3,
    WEIGHT_LT: 1 << 2,
    TYPE1_NE: 1 << 1,
    TYPE2_NE: 1 << 0,
  } as const;

  const pokemon = (pokedex as Pokemon[])[guess.pokemon_id - 1]!;

  const ord = (mask: number, gt: number, lt: number) => {
    if (mask & gt) return "↓";
    if (mask & lt) return "↑";

    return "✓";
  };

  const cmp = (mask: number, ne: number) => {
    return (mask & ne) ? "✗" : "✓";
  };

  return (
    <div role="group">
      <Sprite poke_id={pokemon.id} title={pokemon.name} />
      <li>
        Generation {pokemon.generation} {ord(guess.mask, MASK.GENERATION_GT, MASK.GENERATION_LT)}
        {", "}
        Height {pokemon.height / 10} {ord(guess.mask, MASK.HEIGHT_GT, MASK.HEIGHT_LT)}
        {", "}
        Weight {pokemon.weight / 10} {ord(guess.mask, MASK.WEIGHT_GT, MASK.WEIGHT_LT)}
        {", "}
        Type1 {pokemon.type1} {cmp(guess.mask, MASK.TYPE1_NE)}
        {", "}
        Type2 {pokemon.type2 ?? "None"} {cmp(guess.mask, MASK.TYPE2_NE)}
      </li>
    </div>
  );
}
