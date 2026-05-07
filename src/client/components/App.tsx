
import type { Profile as ProfileType } from "@/types";

import { Squirdle, Router, Auth } from "@/client";
import { PokemonInput } from "./PokemonInput";
import { Sprite } from "./Sprite";

import * as React from "react";

export function App() {
  return (<h1>Hello World</h1>);
}

export function Profile() {
  return (<ProfileSearch />);
}

function useDebounce<T>(delay: number, value: T): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export function ProfileSearch() {
  const [profiles, setProfiles] = React.useState<ProfileType[]>([]);
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

export function Game() {
  const squirdle = Squirdle.use();

  const guesses = squirdle.state?.guesses ?? [];

  return (
    <div>
      <GuessForm />
      {guesses.map((guess, i) => <GuessItem key={i} guess={guess} />)}
    </div>
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

export function SignUp() {
  const router = Router.use();
  const auth = Auth.use();

  const submit = async (_error: string, body: FormData) => {
    const resp = await auth.signUp(body);
    if (resp.ok) {
      router.navigate("/");
      return "";
    }
    if (resp.status === 409) return "user with provided username already exists.";

    return "something went wrong";
  };

  const [error, action, pending] = React.useActionState(submit, "");

  return (
    <>
      <form action={action}>
        <label>Username <input type="text" name="username" required /></label>
        <label>Password <input type="password" name="password" required /></label>
        <PokemonInput label="Favorite Pokemon" name="favorite_pokemon_id" />
        {error ? <small>{error}</small> : null}
        <button type="submit" disabled={pending} aria-busy={pending}>Sign Up</button>
      </form>
      <a href="/signin">Sign In instead</a>
    </>
  );
}

export function SignIn() {
  const router = Router.use();
  const auth = Auth.use();

  const submit = async (_error: string, body: FormData) => {
    const resp = await auth.signIn(body);
    if (resp.ok) {
      router.navigate("/");
      return "";
    }

    if (resp.status === 401) return "unable to sign in";

    return "something went wrong";
  };

  const [error, action, pending] = React.useActionState(submit, "");

  return (
    <>
      <form action={action}>
        <label>Username <input type="text" name="username" required /></label>
        <label>Password <input type="password" name="password" required /></label>
        {error ? <small>{error}</small> : null}
        <button type="submit" disabled={pending} aria-busy={pending}>Sign In</button>
      </form>
      <a href="/signup">Sign Up instead</a>
    </>
  );
}

import pokedex from "@/pokedex.json";
import type { Pokemon } from "@/types";

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
