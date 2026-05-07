import Navbar from "../components/Navbar.tsx";
import { Router } from "@/client";

export default function Gamescreen() {
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
        <section className="card">
          <h1 className="title">Who&apos;s That Pokémon?</h1>
          <p className="subtitle">Enter a Pokémon name to make a guess.</p>

          <div className="guess-bar">
            <input type="text" placeholder="Enter Pokémon name" />
            <button className="primary-btn">Submit</button>
          </div>
        </section>

        <section className="card">
          <h2>Guess History</h2>

          <div className="guess-row guess-header">
            <span>Pokémon</span>
            <span>Generation</span>
            <span>Height</span>
            <span>Weight</span>
            <span>Type</span>
          </div>

          <div className="guess-row">
            <span>Pikachu</span>
            <span>Higher</span>
            <span>Lower</span>
            <span>Lower</span>
            <span>Partial</span>
          </div>

          <div className="guess-row">
            <span>Charmander</span>
            <span>Correct</span>
            <span>Higher</span>
            <span>Higher</span>
            <span>Incorrect</span>
          </div>
        </section>
      </main>
    </>
  );
}