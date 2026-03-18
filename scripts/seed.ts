import * as squirdle from "@/squirdle";

async function main() {
  const [pokedex_path = "pokedex.json"] = Bun.argv.slice(2);

  const pokedex = await Bun.file(pokedex_path).json();

  squirdle.create_schema(squirdle.db);
  squirdle.seed_pokedex(squirdle.db, pokedex);
  squirdle.schedule_pokemon(squirdle.db, squirdle.sample_ids(365));

  squirdle.db.run(`
    INSERT INTO players (id, name) VALUES (1, 'crapper');
    INSERT INTO players_games (player_id, pokemon_id, max_guesses) VALUES (1, 1, 8);
  `);
}

if (import.meta.main) main();
