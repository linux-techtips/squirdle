import Navbar from "../components/Navbar.tsx";
import { Router } from "@/client";

export default function Homescreen() {
  const router = Router.use();

  return (
    <>
      <Navbar
        onGoHome={() => router.navigate("/")}
        onOpenProfile={() => router.navigate("/profile")}
        onOpenPokedex={() => router.navigate("/pokedex")}
        onOpenSettings={() => router.navigate("/settings")}
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