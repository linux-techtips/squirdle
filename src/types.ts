export type PokemonType =
  | "normal"
  | "fighting"
  | "flying"
  | "poison"
  | "ground"
  | "rock"
  | "bug"
  | "ghost"
  | "steel"
  | "stellar"
  | "fire"
  | "water"
  | "grass"
  | "electric"
  | "psychic"
  | "ice"
  | "dragon"
  | "dark"
  | "fairy"

export type Pokemon = {
  generation: number,
  height: number,
  weight: number,
  type1: PokemonType,
  type2: PokemonType | null,
  name: string,
};
