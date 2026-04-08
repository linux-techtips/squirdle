export const MAX_POKEMON_COUNT = 649;

export const POKEMON_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
] as const;

export type PokemonType = typeof POKEMON_TYPES[number];

export type Pokemon = {
  id: number,
  name: string,
  generation: number,
  height: number,
  weight: number,
  type1: PokemonType,
  type2: PokemonType | null,
};

export type Constraint = number;
export type Guess = { guessed: Pokemon, constraint: Constraint };

export type GameStatus = "playing" | "won" | "lost"

export type GuessResult = {
  mask: number,
  status: GameStatus,
};

export type GameSummary = {
  masks: number[],
  status: GameStatus,
};

export function compare(guessed: Pokemon, against: Pokemon): Constraint {
  let constraint: Constraint = 0;

  constraint |= +(against.generation > guessed.generation) << 7;
  constraint |= +(against.generation < guessed.generation) << 6;

  constraint |= +(against.height > guessed.height) << 5;
  constraint |= +(against.height < guessed.height) << 4;

  constraint |= +(against.weight > guessed.weight) << 3;
  constraint |= +(against.weight < guessed.weight) << 2;

  constraint |= +(against.type1 !== guessed.type1) << 1;
  constraint |= +(against.type2 !== guessed.type2) << 0;

  return constraint;
}

export function satisfies(candidate: Pokemon, guessed: Pokemon, constraint: Constraint): boolean {
  // NOTE: AM I JUST GOATED WITH THE SAUCE???
  function ord(lhs: number, rhs: number, msk: number): boolean {
    return msk === ((+(lhs > rhs) << 1) | +(lhs < rhs));
  }

  function cmp(lhs: string | null, rhs: string | null, msk: number): boolean {
    return msk === +(lhs !== rhs);
  }

  return Boolean(
    +ord(candidate.generation, guessed.generation, (constraint >> 6) & 0b11) &
    +ord(candidate.height, guessed.height, (constraint >> 4) & 0b11) &
    +ord(candidate.weight, guessed.weight, (constraint >> 2) & 0b11) &
    +cmp(candidate.type1, guessed.type1, (constraint >> 1) & 0b1) &
    +cmp(candidate.type2, guessed.type2, (constraint >> 0) & 0b1)
  );
}

export function constrain(dataset: Pokemon[], guesses: Guess[]): Pokemon[] {
  return dataset.filter((candidate) =>
    guesses.every(({ guessed, constraint }) =>
      satisfies(candidate, guessed, constraint))
  );
}

export function today(now: () => number = Date.now): number {
  return Math.floor(Math.floor(now() / 1000) / 86400) * 86400;
}

// https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
export function sample_ids(count: number, random: () => number = Math.random): number[] {
  const ids = Array.from({ length: MAX_POKEMON_COUNT }, (_, i) => i + 1);
  const acc = new Array<number>(count);

  let filled = 0;
  while (filled < count) {
    const take = Math.min(count - filled, ids.length);
    for (let i = 0; i < count; i += 1) {
      const j = i + Math.floor(random() * (ids.length - i));

      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
      acc[filled + i] = ids[i]!;
    }

    filled += take;
  }

  return acc;
}

export async function embedCompressed(path: string) {
  const buffer = await Bun.file(path).arrayBuffer();
  const compressed = Bun.gzipSync(buffer);

  return compressed;
}
