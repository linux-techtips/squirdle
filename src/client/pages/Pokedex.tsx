import { useState } from "react";
import Navbar from "../components/Navbar.tsx";

import pokedex from "../../pokedex.json";
import spritesheet from "../assets/spritesheet.webp";

import { Router } from "@/client";

type Pokemon = {
  generation: number;
  height: number;
  weight: number;
  type1: string;
  type2: string | null;
  name: string;
};

const SPRITE_SIZE = 96;
const COLUMNS = 26;

export default function Pokedex() {
  const router = Router.use();

  const pokemonList = pokedex as Pokemon[];

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [maxWeight, setMaxWeight] = useState("");

  const filteredPokemon = pokemonList.filter((pokemon) => {
    const matchesName = pokemon.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesType =
      typeFilter === "" ||
      pokemon.type1 === typeFilter ||
      pokemon.type2 === typeFilter;

    const matchesWeight =
      maxWeight === "" || pokemon.weight <= Number(maxWeight);

    return matchesName && matchesType && matchesWeight;
  });

  return (
    <>
      <Navbar
        onGoHome={() => router.navigate("/")}
        onOpenProfile={() => router.navigate("/profile")}
        onOpenPokedex={() => router.navigate("/pokedex")}
        onOpenSettings={() => router.navigate("/settings")}
      />

      <main className="page">
        <h1>Pokédex</h1>

        <div className="pokedex-filters">
          <input
            type="text"
            placeholder="Search name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            <option value="normal">Normal</option>
            <option value="fire">Fire</option>
            <option value="water">Water</option>
            <option value="grass">Grass</option>
            <option value="electric">Electric</option>
            <option value="ice">Ice</option>
            <option value="fighting">Fighting</option>
            <option value="poison">Poison</option>
            <option value="ground">Ground</option>
            <option value="flying">Flying</option>
            <option value="psychic">Psychic</option>
            <option value="bug">Bug</option>
            <option value="rock">Rock</option>
            <option value="ghost">Ghost</option>
            <option value="dragon">Dragon</option>
            <option value="dark">Dark</option>
            <option value="steel">Steel</option>
            <option value="fairy">Fairy</option>
          </select>

          <input
            type="number"
            placeholder="Max weight..."
            value={maxWeight}
            onChange={(e) => setMaxWeight(e.target.value)}
          />
        </div>

        <div className="pokemon-grid">
          {filteredPokemon.map((pokemon) => {
            const originalIndex = pokemonList.indexOf(pokemon);
            const x = (originalIndex % COLUMNS) * SPRITE_SIZE;
            const y = Math.floor(originalIndex / COLUMNS) * SPRITE_SIZE;

            return (
              <div className="pokemon-card" key={pokemon.name}>
                <div
                  className="pokemon-sprite"
                  style={{
                    backgroundImage: `url(${spritesheet})`,
                    backgroundPosition: `-${x}px -${y}px`,
                    backgroundSize: `${COLUMNS * SPRITE_SIZE}px auto`,
                  }}
                />

                <h2>{pokemon.name}</h2>
                <p>Generation {pokemon.generation}</p>
                <p>
                  {pokemon.type1}
                  {pokemon.type2 ? ` / ${pokemon.type2}` : ""}
                </p>
                <p>Height: {pokemon.height}</p>
                <p>Weight: {pokemon.weight}</p>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
