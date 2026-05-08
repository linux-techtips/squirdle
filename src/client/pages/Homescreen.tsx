import { Navbar } from "@/client/components";
import * as React from "react";
import { Router, Auth, Squirdle } from "@/client";

import { useMusic } from "@/client/pages/MusicContext";
import pokeballImg from "../assets/Pokeball.png";

export default function Homescreen() {
  const router = Router.use();
  const auth = Auth.use();
  const { setMusicOn } = useMusic();
  const squirdle = Squirdle.use();

  const guessesMade = squirdle.state?.guesses.length ?? 0;

  const guessesLeft = squirdle.state?.remaining ?? 8;

  const summaryText =
    squirdle.status === "won"
      ? "You solved today's Squirdle game!"
      : squirdle.status === "lost"
        ? "You did not solve today's Squirdle game."
        : "You have not solved today's Squirdle game yet.";

  React.useEffect(() => {
    if (!auth.state) {
      router.navigate("/signin");
    }
  }, [auth.state]);

  if (!auth.state) return null;

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
        <section className="card hero-card">
          <h1 className="title">Squirdle</h1>
          <p className="subtitle">
            Guess the mystery Pokémon.
          </p>

          <img
            src={pokeballImg}
            alt="Pokeball image"
            className="type-img"
          />

          <div className="button-row">
            <button
              className="primary-btn"
              onClick={() => router.navigate("/game")}
            >
              Start Today&apos;s Game
            </button>
          </div>
        </section>

        <section className="card">
          <h2>Today's Summary</h2>
          <p>{summaryText}</p>
          <p><strong>Status:</strong> {squirdle.status}
          </p>
          <p><strong>Guesses Made:</strong> {guessesMade}
          </p>
          <p><strong>Guesses Left:</strong> {guessesLeft}
          </p>
        </section>
      </main>
    </>
  );
}
