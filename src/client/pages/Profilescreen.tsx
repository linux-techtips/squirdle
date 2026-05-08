import type { Profile as ProfileType } from "@/types";

import { Navbar, Sprite } from "@/client/components";
import { Router, Auth } from "@/client";
import { useMusic } from "@/client/pages/MusicContext";

import * as hooks from "@/client/hooks";
import * as React from "react";

export default function Profile() {
  const router = Router.use();
  const auth = Auth.use();
  const { setMusicOn } = useMusic();

  const [query, setQuery] = React.useState("");
  const debouncedQuery = hooks.useDebounce(250, query);

  const { data } = hooks.useFetch(
    `/api/profiles/search?query=${debouncedQuery}`
  );

  const profiles = (data ?? []) as ProfileType[];

  React.useEffect(() => {
    if (!auth.state) {
      router.navigate("/signin");
    }
  }, [auth.state]);

  if (!auth.state) return null;

  const gamesPlayed = auth.state.wins + auth.state.losses;

  const winRate =
    gamesPlayed === 0
      ? 0
      : Math.round((auth.state.wins / gamesPlayed) * 100);

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
          <h1 className="title">My Profile</h1>

          <Sprite poke_id={auth.state.favorite_pokemon_id} />

          <p>
            <strong>Username:</strong> {auth.state.username}
          </p>

          <p>
            <strong>Games Played:</strong> {gamesPlayed}
          </p>

          <p>
            <strong>Wins:</strong> {auth.state.wins}
          </p>

          <p>
            <strong>Losses:</strong> {auth.state.losses}
          </p>

          <p>
            <strong>Win Rate:</strong> {winRate}%
          </p>
        </section>

        <section className="card">
          <h2>Search Other Players</h2>

          <div className="guess-bar">
            <input
              type="text"
              placeholder="Search username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {query && profiles.length === 0 && (
            <p>No players found.</p>
          )}

          {profiles.map((profile) => {
            const searchedGamesPlayed = profile.wins + profile.losses;

            const searchedWinRate =
              searchedGamesPlayed === 0
                ? 0
                : Math.round((profile.wins / searchedGamesPlayed) * 100);

            return (
              <div className="player-result-card" key={profile.id}>
                <Sprite poke_id={profile.favorite_pokemon_id} />

                <h3>{profile.username}</h3>
                <p>Games Played: {searchedGamesPlayed}</p>
                <p>Wins: {profile.wins}</p>
                <p>Losses: {profile.losses}</p>
                <p>Win Rate: {searchedWinRate}%</p>
              </div>
            );
          })}
        </section>
        <section className="card">
          <h2>Profile Options</h2>
          <p>
            Deleting your account is irreversible.</p>
            <p>All your data will be lost.
          </p>
          <button
              className="primary-btn danger-btn"
              onClick={async () => {
                const confirmDelete = window.confirm(
                  "Are you sure you want to delete your profile? This cannot be undone."
                );

                if (!confirmDelete) return;

                setMusicOn(false);
                await auth.deleteUrself();
                router.navigate("/signin");
              }}
            >
              Delete Profile
            </button>
        </section>
      </main>
    </>
  );
}
