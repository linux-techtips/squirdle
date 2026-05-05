import Navbar from "../components/Navbar.tsx";
import { Router } from "@/client";

export default function Profile() {
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
          <h1 className="title">My Profile</h1>
          <p>
            <strong>Username:</strong> AshKetchum
          </p>
          <p>
            <strong>Games Played:</strong> 24
          </p>
          <p>
            <strong>Win Rate:</strong> 83%
          </p>
          <p>
            <strong>Current Streak:</strong> 6
          </p>
          <p>
            <strong>Best Streak:</strong> 12
          </p>
        </section>

        <section className="card">
          <h2>Search Other Players</h2>

          <div className="guess-bar">
            <input type="text" placeholder="Search username..." />
            <button className="primary-btn">Search</button>
          </div>
        </section>
      </main>
    </>
  );
}