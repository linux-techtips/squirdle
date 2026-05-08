import type { Profile, GuessMade, Pokemon } from "@/types";
import { PokemonInput, Sprite } from "@/client/components";
import { Squirdle, Auth } from "@/client";

import * as hooks from "@/client/hooks";
import * as React from "react";

import pokedex from "@/pokedex.json";

export default function Dev() {
  const auth = Auth.use();

  if (!auth.state) return (
    <h1>Unauthenticated</h1>
  );

  return (
    <div>
      <ProfileInfo profile={auth.state} />
      <ProfileSearch />
      <GuessForm />
      <GuessList />
    </div>
  );

}

function ProfileSearch() {
  const [query, setQuery] = React.useState("");
  const debouncedQuery = hooks.useDebounce(250, query);
  const { data } = hooks.useFetch(`/api/profiles/search?query=${debouncedQuery}`);

  const profiles = data ?? [];

  return (
    <form>
      <label>Search <input type="text" name="query" value={query} onChange={(e) => setQuery(e.target.value)} required /></label>
      <ul>
        {(profiles as Profile[]).map(profile => <li key={profile.id}>{profile.username}</li>)}
      </ul>
    </form>
  );

}

function GuessForm() {
  const squirdle = Squirdle.use();

  async function submit(_error: string, body: FormData) {
    const pokemon_id = Number(body.get("pokemon_id"));
    await squirdle.guess(pokemon_id);

    return "";
  }

  const [_error, action, pending] = React.useActionState(submit, "");

  return (
    <form action={action}>
      <PokemonInput label="Guess Pokemon" name="pokemon_id" required />
      <button type="submit" disabled={pending || squirdle.status !== "playing"} aria-busy={pending}>Submit</button>
    </form>
  );
}

function GuessList() {
  const squirdle = Squirdle.use();
  const guesses = squirdle.state?.guesses ?? [];

  if (squirdle.status === "loading") return (
    <p aria-busy="true">Loading Previous Guesses...</p>
  );

  return guesses.map((guess, i) => <GuessItem key={i} guess={guess} />);
}

function GuessItem({ guess }: { guess: GuessMade }) {
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

function ProfileInfo({ profile }: { profile: Profile }) {
  return (
    <article>
      <Sprite poke_id={profile.favorite_pokemon_id} />
      <h2>{profile.username}</h2>
    </article>
  );
}
