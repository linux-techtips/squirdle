import * as React from "react";

const SPRITE_SIZE = 96 as const;
const SPRITE_COLS = 26 as const;
const SPRITE_ROWS = 25 as const;

type Props = { poke_id: number, title?: string };

export function Sprite({ poke_id, title }: Props) {
  const idx = poke_id - 1;
  const x = idx % SPRITE_COLS;
  const y = Math.floor(idx / SPRITE_COLS);

  return <div
    role="img"
    className="poke-sprite"
    title={title}
    aria-label={title ?? `Pokemon #${poke_id}`}
    style={{
      "--size": SPRITE_SIZE,
      "--cols": SPRITE_COLS,
      "--rows": SPRITE_ROWS,
      "--x": x,
      "--y": y,
    } as React.CSSProperties}
  />;
}
