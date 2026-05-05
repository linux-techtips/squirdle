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

export type Guess = { pokemon_id: number, mask: number };
export type GuessResult = { mask: number, remaining_guesses: number, pokemon_id: number };

export type GameState = { guesses: Guess[], remaining_guesses: number };

export type GameStatus = "playing" | "won" | "lost"

export type DBUser = {
  id: number,
  username: string,
  passhash: string,
};

export type User = Omit<DBUser, "passhash">;

