import "./index.css";

import { Sprite } from "./Sprite.tsx";

function SpriteSheet() {
  const ids = Array.from({ length: 649 }, (_, i) => i + 1);

  return (
    <div>
      {ids.map((id) => (
        <Sprite id={id} />
      ))}
    </div>
  );
}

export default function () {
  return (
    <main>
      <h1>Spritesheet Test</h1>
      <SpriteSheet />
    </main>
  );
}
