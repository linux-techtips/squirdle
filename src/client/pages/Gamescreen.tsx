import * as React from "react";

import type { GuessMade, Pokemon } from "@/types";
import { PokemonInput, Sprite } from "@/client/components";
import { Router, Squirdle } from "@/client";
import { Auth } from "@/client";

import Navbar from "../components/Navbar.tsx";
import pokedex from "@/pokedex.json";

import checkBall from "../assets/checkmarkball.png";
import xBall from "../assets/Xball.png";
import upBall from "../assets/upball.png";
import downBall from "../assets/downball.png";

import { useMusic } from "@/client/pages/MusicContext";

import Pokedex from "./Pokedex";

type ResultIcon = "check" | "x" | "up" | "down";

export default function Gamescreen() {
  const router = Router.use();
  const squirdle = Squirdle.use();
  const auth = Auth.use();
  const { setMusicOn } = useMusic();
  const [showPokedex, setShowPokedex] = React.useState(false);

  const guesses = squirdle.state?.guesses ?? [];

  async function submit(_error: string, body: FormData) {
    const pokemon_id = Number(body.get("pokemon_id"));

    console.log("Submitted pokemon_id:", pokemon_id);
    console.log("Squirdle status:", squirdle.status);
    console.log("Squirdle state:", squirdle.state);

    if (!pokemon_id || Number.isNaN(pokemon_id)) {
      console.error("Invalid pokemon_id from PokemonInput");
      return "Invalid Pokémon";
    }

    return await squirdle.guess(pokemon_id);
  }

  const [error, action, pending] = React.useActionState(submit, "");

  return (
    <>
      <Navbar
        onGoHome={() => router.navigate("/")}
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
        <section className="card">
          <h1 className="title">Who&apos;s That Pokémon?</h1>

          <p className="subtitle">
            You have {squirdle.state?.remaining} guesses left.
          </p>

          <p className="subtitle">
            Game status: {squirdle.status}
          </p>

          <form action={action} className="guess-bar">
            <PokemonInput label="Guess Pokémon" name="pokemon_id" required />
            {/* {error ? <small aria-invalid="true">{error}</small> : null} */}
            <button
              type="submit"
              className="primary-btn"
              disabled={pending}
              aria-busy={pending}
            >
              Submit
            </button>
          </form>
          <div className="guess-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={() => setShowPokedex(true)}
            >
              Open Pokédex
            </button>
          </div>
        </section>

        <section className="card">
          <h2>Guess History</h2>

          {squirdle.status === "loading" ? (
            <p aria-busy="true">Loading Previous Guesses...</p>
          ) : (
            <>
              <div className="guess-row guess-header">
                <span>Pokémon</span>
                <span>Gen</span>
                <span>Type 1</span>
                <span>Type 2</span>
                <span>Height</span>
                <span>Weight</span>
              </div>

              {guesses.length === 0 ? (
                <p className="subtitle">No guesses yet.</p>
              ) : (
                guesses.map((guess, index) => (
                  <GuessRow key={index} guess={guess} />
                ))
              )}
            </>
          )}
        </section>
      </main>
      {showPokedex && (
        <div
          className="pokedex-modal-overlay"
          onClick={() => setShowPokedex(false)}
        >

          <button
            type="button"
            className="modal-close-btn"
            onClick={() => setShowPokedex(false)}
          >
            ×
          </button>

          <div
            className="pokedex-modal"
            onClick={(e) => e.stopPropagation()}
          >


            <Pokedex hideNavbar />
          </div>
        </div>
      )}
    </>
  );
}

function GuessRow({ guess }: { guess: GuessMade }) {
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

  const pokemon = (pokedex as Pokemon[])[guess.pokemon_id - 1];

  if (!pokemon) {
    return <p>Unknown Pokémon ID: {guess.pokemon_id}</p>;
  }

  function getOrderedResult(
    mask: number,
    gt: number,
    lt: number
  ): ResultIcon {
    if (mask & gt) return "down";
    if (mask & lt) return "up";

    return "check";
  }

  function getCompareResult(mask: number, ne: number): ResultIcon {
    return mask & ne ? "x" : "check";
  }

  return (
    <div className="guess-row">
      <span className="pokemon-guess-name">
        <Sprite poke_id={pokemon.id} title={pokemon.name} />
        {pokemon.name}
      </span>

      <PokeballIcon
        result={getOrderedResult(
          guess.mask,
          MASK.GENERATION_GT,
          MASK.GENERATION_LT
        )}
      />

      <PokeballIcon
        result={getCompareResult(guess.mask, MASK.TYPE1_NE)}
      />

      <PokeballIcon
        result={getCompareResult(guess.mask, MASK.TYPE2_NE)}
      />

      <PokeballIcon
        result={getOrderedResult(
          guess.mask,
          MASK.HEIGHT_GT,
          MASK.HEIGHT_LT
        )}
      />

      <PokeballIcon
        result={getOrderedResult(
          guess.mask,
          MASK.WEIGHT_GT,
          MASK.WEIGHT_LT
        )}
      />
    </div>
  );
}

function PokeballIcon({ result }: { result: ResultIcon }) {
  const image =
    result === "check"
      ? checkBall
      : result === "x"
        ? xBall
        : result === "up"
          ? upBall
          : downBall;

  return (
    <img
      className="pokeball-result"
      src={image}
      alt={result}
      title={result}
    />
  );
}
