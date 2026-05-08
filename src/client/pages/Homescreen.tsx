import { Navbar } from "@/client/components";
import { Router } from "@/client";
import { Auth } from "@/client";
import * as React from "react";

import { useMusic } from "@/client/pages/MusicContext";

export default function Homescreen() {
  const router = Router.use();
  const auth = Auth.use();
  const { setMusicOn } = useMusic();

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
        <section className="card hero-card">
          <h1 className="title">Squirdle</h1>
          <p className="subtitle">
            Guess the mystery Pokémon in up to 8 tries.
          </p>

          <img
            src="/static/dragon-type.png"
            alt="Dragon Type"
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
          <h2>Today&apos;s Summary</h2>
          <p>You have not solved today&apos;s Squirdle game yet.</p>
          <p>Current streak: 4</p>
          <p>Best streak: 9</p>
        </section>
      </main>
    </>
  );
}
