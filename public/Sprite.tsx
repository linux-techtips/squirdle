const COLS = 26;

export function Sprite({ id }: { id: number }) {
  return (
    <img
      className="poke-sprite"
      style={{
        "--x": id % COLS,
        "--y": Math.floor(id / COLS),
      } as React.CSSProperties}
    />
  );
}
