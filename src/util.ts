export const MAX_POKEMON_COUNT = 649 as const;

export function today(now: () => number = Date.now): number {
  return Math.floor(Math.floor(now() / 1000) / 86400) * 86400;
}

// https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
export function sample_ids(
  count: number,
  pool_size: number = MAX_POKEMON_COUNT,
  random: () => number = Math.random,
): number[] {
  const ids = Array.from({ length: pool_size }, (_, i) => i + 1);
  const result = new Array<number>(count);

  let filled = 0;
  while (filled < count) {
    const take = Math.min(count - filled, pool_size);
    for (let i = 0; i < count; i += 1) {
      // NOTE: we probably should pass rng as an argument
      const j = i + Math.floor(random() * (pool_size - i));
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
      result[filled + i] = ids[i]!;
    }

    filled += take;
  }

  return result;
}
