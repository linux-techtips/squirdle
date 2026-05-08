import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
} from "react";

import bgMusic from "../assets/music/background.mp3";

type MusicContextType = {
  musicOn: boolean;
  setMusicOn: (value: boolean) => void;
  volume: number;
  setVolume: (value: number) => void;
};

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [musicOn, setMusicOn] = useState(false);
  const [volume, setVolume] = useState(50);

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
    <MusicContext.Provider
      value={{
        musicOn,
        setMusicOn,
        volume,
        setVolume,
      }}
    >
      <audio ref={audioRef} src={bgMusic} loop />
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);

  if (!context) {
    throw new Error("useMusic must be inside MusicProvider");
  }

  return context;
}