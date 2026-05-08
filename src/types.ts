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

export type User = {
  id: number,
  username: string,
  passhash: string,
  created_at: number,
};

export type Player = {
  id: number,
  favorite_pokemon_id: number,
};

export type Registration = {
  username: string,
  passhash: string,
  favorite_pokemon_id: number;
};

export type Credentials = {
  username: string,
  passhash: string,
};

export type Profile = {
  id: number,
  username: string,
  favorite_pokemon_id: number,
  wins: number,
  losses: number,
};

export type GuessResult = {
  mask: number;
  remaining: number;
};

export type GuessMade = {
  mask: number;
  pokemon_id: number;
};

export type GameState = {
  guesses: GuessMade[],
  remaining: number,
};
