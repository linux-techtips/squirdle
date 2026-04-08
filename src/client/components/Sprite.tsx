import { MAX_POKEMON_COUNT } from "@/lib";

const COLS = Math.ceil(Math.sqrt(MAX_POKEMON_COUNT));

export default function ({ id, title }: { id: number, title?: string }) {
  // TODO: (Carter) i can probably use mod and div within calc?
  return (
    <img
      className="poke-sprite"
      title={title}
      style={{
        "--x": id % COLS,
        "--y": Math.floor(id / COLS),
      }}
    />
  );
}
