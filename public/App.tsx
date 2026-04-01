// TODO: (Carter) this will include the pokedex json in the js bundle.
import pokedex from "@/public/static/pokedex.json";

import type { Pokemon } from "@/types";

import "./index.css";

const TOTAL_POKEMON = 649;
const COLS = Math.ceil(Math.sqrt(TOTAL_POKEMON));

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
  const ids = Array.from({ length: 649 }, (_, i) => i);

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
        {ids.map(id => PokedexEntry({ id }))}
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

export default function () {
  return (
    <main>
      <Pokedex />
    </main>
  );
}
