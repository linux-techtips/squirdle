import { Router, Auth, Squirdle } from "@/client/index.bak";
import * as React from "react";

import type { PlayerProfile, Pokemon } from "@/lib";
import pokedex from "@/pokedex.json";

import { Sprite } from "./Sprite";

const pokemon = pokedex as Pokemon[];
const pokemon_by_id = new Map(pokemon.map(p => [p.id, p]));
const pokemon_by_name = new Map(pokemon.map(p => [p.name.toLowerCase(), p]));

export function GuessForm() {
  const squirdle = Squirdle.use();

  const submit = async (_state: string, body: FormData) => {
    const pokemon_name = body.get("pokemon_name")!.toString();
    const pokemon = pokemon_by_name.get(pokemon_name);
    if (!pokemon) return "invalid pokemon";

    const form = new FormData();
    form.set("pokemon_id", pokemon.id.toString());

    await squirdle.guess(form);

    return "";
  }

  const [_state, action, pending] = React.useActionState(submit, "");

  return (
    <form action={action}>
      <label>Pokemon <input type="text" name="pokemon_name" required /></label>
      <button type="submit" disabled={pending} aria-busy={pending}>Make Guess</button>
    </form>
  );
}

export function GuessList() {
  const squirdle = Squirdle.use();

  if (!squirdle.state) {
    return <p aria-busy="true">Loading...</p>
  }

  const guesses = squirdle.state.guesses;
  return guesses.map((guess, i) => <GuessItem key={i} guess={guess} />);
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

  const pokemon = pokemon_by_id.get(guess.pokemon_id)!;

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

export function ProfileSearch() {
  const controllerRef = React.useRef<AbortController | null>(null);

  const [selected, setSelected] = React.useState<PlayerProfile | null>(null);
  const [profiles, setProfiles] = React.useState<PlayerProfile[]>([]);
  const [query, setQuery] = React.useState("");

  function search(q: string) {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    fetch(`/api/profiles/${encodeURIComponent(q)}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : []))
      .then(data => setProfiles(data))
      .catch(err => {
        if (err.name === "AbortError") return;
      });
  };

  React.useEffect(() => () => controllerRef.current?.abort(), []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setQuery(next);
    search(next);
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const match = profiles.find(p => p.username === query);
    if (match) setSelected(match);
  }

  if (selected) {
    // return ProfileView
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        list="profile-suggestions"
        value={query}
        onChange={handleChange}
        placeholder="Search Profiles..." />

      <datalist id="profile-suggestions">
        {profiles.map((p, i) =>
          <option key={i} value={p.username} />
        )}
      </datalist>

      <button type="submit">Search</button>
    </form>
  )
}

export function Profile() {
  return <h1>Todo</h1>;
}

export function ProfileView({ profile }: { profile: PlayerProfile }) {
  return (
    <article>
      <header>
        <h2>{profile.username}</h2>
      </header>
      <dl>
        <dt>Wins</dt>
        <dd>{profile.wins}</dd>
        <dt>Losses</dt>
        <dd>{profile.losses}</dd>
      </dl>
    </article>
  );
}

export function Game() {
  return (
    <>
      <h1>Game Screen</h1>
      <GuessForm />
      <GuessList />
    </>
  );
}

export function App() {
  const auth = Auth.use();

  return ProfileSearch();

  if (auth.isSignedIn()) {
    return (
      <>
        <h1>Hello {auth.state!.username}</h1>
        <StartGameButton />
        <button onClick={() => auth.signOut()}>Sign Out</button>
      </>
    );
  } else {
    return (
      <div role="group">
        <a href="/signin">Sign In</a>
        <a href="/signup">Sign Up</a>
      </div>
    );
  }
}

export function StartGameButton() {
  const squirdle = Squirdle.use();
  const router = Router.use();

  const loading = squirdle.status === "loading";
  const playing = squirdle.status === "playing";

  const buttonText = (() => {
    if (loading || playing) return "Start Game";
    else return "View Game Results";
  })();

  return (
    <button onClick={() => router.navigate("/game")} disabled={loading} aria-busy={loading}>{buttonText}</button>
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
