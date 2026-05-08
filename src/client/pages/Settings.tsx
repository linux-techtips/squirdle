import { Navbar } from "@/client/components";
import { Router } from "@/client";
import { useEffect, useRef, useState } from "react";
import bgMusic from "../assets/music/background.mp3";
import { Auth } from "@/client";


import * as React from "react";

export default function Settings() {
  const router = Router.use();
  const auth = Auth.use();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [musicOn, setMusicOn] = React.useState(false);
  const [volume, setVolume] = React.useState(50);

  const [darkMode, setDarkMode] = React.useState(() => {
    return localStorage.getItem("theme") !== "light";
  });

   React.useEffect(() => {
    if (!auth.state) {
      router.navigate("/signin");
    }
  }, [auth.state]);

  if (!auth.state) return null;

  React.useEffect(() => {
    if (darkMode) {
      document.body.classList.remove("light-mode");
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      document.body.classList.add("light-mode");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

    useEffect(() => {
    if (!audioRef.current) return;

    if (musicOn) {
      audioRef.current.volume = volume / 100;
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }, [musicOn]);

  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.volume = volume / 100;
  }, [volume]);

  return (
    <>
      <Navbar
        onGoHome={() => router.navigate("/home")}
        onOpenProfile={() => router.navigate("/profile")}
        onOpenPokedex={() => router.navigate("/pokedex")}
        onOpenSettings={() => router.navigate("/settings")}
        onLogout={async () => {
          await auth.signOut();
          router.navigate("/signin");
        }}
      />

      <main className="page">
        <audio ref={audioRef} src={bgMusic} loop />
        <section className="card settings-card">
          <h1 className="title">Settings</h1>

          <div className="setting-row">
            <div>
              <h3>Background Music</h3>
              <p>Turn game music on or off.</p>
            </div>

            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={musicOn}
                onChange={() => setMusicOn(!musicOn)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {musicOn && (
            <div className="setting-row">
              <div>
                <h3>Volume</h3>
                <p>{volume}%</p>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </div>
          )}

          <div className="setting-row">
            <div>
              <h3>Dark Mode</h3>
            </div>

            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={() => setDarkMode(!darkMode)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>
      </main>
    </>
  );
}
