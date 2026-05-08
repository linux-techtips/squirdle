import * as path from "path";
import { $ } from "bun";

export async function generateSpriteSheet(dir: string, name: string) {
  const files = Array.from({ length: 649 }, (_, i) => path.join(dir, `${i + 1}.png`));

  await $`montage ${files} -geometry 96x96+0+0 -background none -quality 100 -tile 26x25 ${name}`;
}

async function main() {
  const spritesDir = process.argv[2] ?? path.join(import.meta.dir, "sprites");
  const sheetName = process.argv[3] ?? path.join(import.meta.dir, "../spritesheet.webp");

  await generateSpriteSheet(spritesDir, sheetName);
}

if (import.meta.main) main();
