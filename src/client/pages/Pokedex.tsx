import pokedex from "@/pokedex.json";

import { Navbar, Sprite } from "@/client/components";
import { Router } from "@/client";
import { Auth } from "@/client";

import { POKEMON_TYPES, type Pokemon } from "@/types";

import * as React from "react";

import { useMusic } from "@/client/pages/MusicContext";

export default function Pokedex() {
  const router = Router.use();
  const auth = Auth.use();
  const { setMusicOn } = useMusic();

  const pokemonList = pokedex as Pokemon[];

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [maxWeight, setMaxWeight] = React.useState("");

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

     React.useEffect(() => {
    if (!auth.state) {
      router.navigate("/signin");
    }
  }, [auth.state]);

  if (!auth.state) return null;

  return (
    <>
      <Navbar
        onGoHome={() => router.navigate("/home")}
        onOpenProfile={() => router.navigate("/profile")}
        onOpenPokedex={() => router.navigate("/pokedex")}
        onOpenSettings={() => router.navigate("/settings")}
        onLogout={async () => {
          setMusicOn(false);
          await auth.signOut();
          router.navigate("/signin");
        }}
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
            {POKEMON_TYPES.map((poke_type, i) => <option value={poke_type} key={i}>{poke_type}</option>)}
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
            return (
              <div className="pokemon-card" key={pokemon.name}>
                <Sprite poke_id={pokemon.id} />
                <h2>{pokemon.name}</h2>
                <p>Generation {pokemon.generation}</p>
                <p>
                  {pokemon.type1}
                  {pokemon.type2 ? ` / ${pokemon.type2}` : ""}
                </p>
                <p>Height: {pokemon.height / 10}</p>
                <p>Weight: {pokemon.weight / 10}</p>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
