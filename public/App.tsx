// TODO: (Carter) this will include the pokedex json in the js bundle.
import pokedex from "@/public/static/pokedex.json";

import * as Router from "@/public/router";
import * as React from "react";

import "./index.css";

import type { Pokemon } from "@/squirdle";
import * as util from "@/util";

import { MAX_POKEMON_COUNT } from "@/util";
const COLS = Math.ceil(Math.sqrt(MAX_POKEMON_COUNT));

export function Sprite({ id }: { id: number }) {
  return (
    <img
      className="poke-sprite"
      style={{
        "--x": id % COLS,
        "--y": Math.floor(id / COLS),
      }}
    />
  );
}

function Pokedex() {
  const ids = Array.from({ length: MAX_POKEMON_COUNT }, (_, i) => i);

  return (
    <table>
      <thead>
        <tr>
          <th>Image</th>
          <th>Generation</th>
          <th>Height</th>
          <th>Weight</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        {ids.map(id => <PokedexEntry key={id} id={id} />)}
      </tbody>
    </table>
  );
}

function PokedexEntry({ id }: { id: number }) {
  const pokemon = pokedex[id]! as Pokemon;
  return (
    <tr>
      <th scope="row" key={id}>
        <Sprite id={id} />
      </th>
      <td>{pokemon.generation}</td>
      <td>{pokemon.height / 10}m</td>
      <td>{pokemon.weight / 10}kg</td>
      <td>{pokemon.type1} {pokemon.type2}</td>
    </tr>
  );
}

export function useDebounce<Args extends any[]>(millis: number, func: (...args: Args) => any) {
  return React.useMemo(() => {
    let id: number | undefined = undefined;

    return (...args: Args) => {
      if (id) clearTimeout(id);
      id = setTimeout(() => func(...args), millis) as unknown as number;
    };
  }, []);
}

function GuessPage({ pokedex }: { pokedex: Pokemon[] }) {
  const [against, setAgainst] = React.useState<Pokemon | null>(pokedex[0]!);
  const [guessed, setGuessed] = React.useState<Pokemon | null>(null);

  const [dataset, setDataset] = React.useState<Pokemon[]>(pokedex);
  const [guesses, setGuesses] = React.useState<util.Guess[]>([]);

  const inputGuess = useDebounce(200, (query: string) => {
    const id = pokedex.findIndex(({ name }) => name === query);
    setGuessed((id < 0) ? null : pokedex[id]!);
  });

  const submitGuess = () => {
    console.log(guessed, against);
    if (!guessed || !against) return;

    const constraint = util.compare(guessed, against);
    const newGuesses = [...guesses, { guessed, constraint }];

    const newDataset = util.constrain(dataset, [{ guessed, constraint }]);

    setGuesses(newGuesses);
    setDataset(newDataset);
  };

  return (
    <>
      <DebugPanel pokedex={pokedex} against={against} setAgainst={setAgainst} />
      <input type="text" onChange={e => inputGuess(e.target.value)} />
      <button onClick={submitGuess}>Submit</button>
      <br />
      <span>Guessed:</span>
      <ul>
        {guesses.map((guess, i) => <li key={i}>{guess.guessed.name}</li>)}
      </ul>
      <span>Possible:</span>
      <ul>
        {dataset.map((pokemon, i) => <li key={i}>{pokemon.name}</li>)}
      </ul>
    </>
  );
}

function DebugPanel({ pokedex, against, setAgainst }: {
  pokedex: Pokemon[],
  against: Pokemon | null,
  setAgainst: (p: Pokemon | null) => void,
}) {
  const select = useDebounce(200, (query: string) => {
    const id = pokedex.findIndex(({ name }) => name === query);
    setAgainst((id < 0) ? null : pokedex[id]!);
  });

  return (
    <details>
      <summary>Debug</summary>
      <label>
        Against: <input type="text" value={against?.name} onChange={e => select(e.target.value)} />
      </label>
      {against && <span>{JSON.stringify(against)}</span>}
    </details>
  );
}

export default function () {
  const { navigate } = Router.useRouter();

  return (
    <>
      <nav>
        <button onClick={() => navigate("/")}>Home</button>
        <button onClick={() => navigate("/guess")}>Guess</button>
      </nav>
      <main>
        <Router.Route path="/">
          <Pokedex />
        </Router.Route>
        <Router.Route path="/guess">
          <GuessPage pokedex={pokedex as Pokemon[]} />
        </Router.Route>
      </main>
    </>
  );
}
