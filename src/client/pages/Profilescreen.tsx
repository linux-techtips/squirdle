import { Navbar } from "@/client/components";
import { Router } from "@/client";
import { Auth } from "@/client";
import * as React from "react";
import { useMusic } from "@/client/pages/MusicContext";

export default function Profile() {
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
