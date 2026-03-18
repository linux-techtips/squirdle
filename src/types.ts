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

export type Comparison = {
  generation: "gt" | "lt" | "eq",
  height: "gt" | "lt" | "eq",
  weight: "gt" | "lt" | "eq",
  type1: "eq" | "ne",
  type2: "eq" | "ne",
}

export type Guess = {
  correct: boolean,
  guesses: number,
  comparison: Comparison,
};

export type GameState =
  | { status: "playing", guesses: Guess[] }
  | { status: "won", guesses: Guess[] }
  | { status: "lost", guesses: Guess[], answer: string };

export type Status = "won" | "lost" | "playing";
