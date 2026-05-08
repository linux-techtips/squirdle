import type { Registration } from "@/types";

import * as testing from "bun:test";
import * as time from "@/lib/time";
import * as db from "@/server/db";

import { App } from "@/server";

const TODAY_POKEMON = 1;
const TOMORROW_POKEMON = 2;

function init(clock: time.Clock = time.Now.init().interface()): App {
  return App.testing(clock, [TODAY_POKEMON, TOMORROW_POKEMON]);
}

const REGISTRATION: Registration = {
  favorite_pokemon_id: 25,
  username: "Ash",
  passhash: "123",
};

testing.describe("register", () => {
  testing.it("creates entries in users, players, and player_stats", () => {
    const app = init();

    const profile = db.register(app, REGISTRATION);

    testing.expect(profile).not.toBeNull();
    testing.expect(profile!.username).toBe(REGISTRATION.username);

    const user = app.sqlite.query("SELECT * FROM users WHERE id = ?").get(profile!.id);
    testing.expect(user).not.toBeNull();

    const player = app.sqlite.query("SELECT * FROM players WHERE id = ?").get(profile!.id);
    testing.expect(player).not.toBeNull();

    const stats = app.sqlite
      .query("SELECT * FROM player_stats WHERE player_id = ?")
      .get(profile!.id) as any;

    testing.expect(stats).not.toBeNull();
    testing.expect(stats.wins).toBe(0);
    testing.expect(stats.losses).toBe(0);
    testing.expect(stats.win_streak).toBe(0);
    testing.expect(stats.max_win_streak).toBe(0);
  });

  testing.it("returns null when username already exists", () => {
    const app = init();

    db.register(app, REGISTRATION);
    const duplicate = db.register(app, REGISTRATION);

    testing.expect(duplicate).toBeNull();
  });
});

testing.describe("delete_user", () => {
  testing.it("deletes corresponding entries in users, players, and player_stats", () => {
    const app = init();
    const profile = db.register(app, REGISTRATION)!;

    const deleted = db.delete_user(app, profile.id);
    testing.expect(deleted).toBe(true);

    const user = app.sqlite.query("SELECT * FROM users WHERE id = ?").get(profile.id);
    testing.expect(user).toBeNull();

    // Cascade should remove player and player_stats too.
    const player = app.sqlite.query("SELECT * FROM players WHERE id = ?").get(profile.id);
    testing.expect(player).toBeNull();

    const stats = app.sqlite
      .query("SELECT * FROM player_stats WHERE player_id = ?")
      .get(profile.id);

    testing.expect(stats).toBeNull();
  });

  testing.it("returns false when user does not exist", () => {
    const app = init();

    const result = db.delete_user(app, 99999);
    testing.expect(result).toBe(false);
  });
});

testing.describe("start_or_get_game", () => {
  testing.it("inserts a new game with today's scheduled pokemon", () => {
    const app = init();
    const profile = db.register(app, REGISTRATION)!;

    const state = db.start_or_get_game(app, profile.id);
    testing.expect(state).not.toBeNull();

    const game = app.sqlite
      .query("SELECT * FROM games WHERE player_id = ?")
      .get(profile.id) as any;
    testing.expect(game).not.toBeNull();
    testing.expect(game.pokemon_id).toBe(TODAY_POKEMON);
  });

  testing.it("does not update the game when called again on the same day", () => {
    const app = init();

    const profile = db.register(app, REGISTRATION)!;

    db.start_or_get_game(app, profile.id);

    // Make a guess so we can detect if the game resets.
    db.make_guess(app, profile.id, 4);

    const stateBefore = db.game_state(app, profile.id)!;
    db.start_or_get_game(app, profile.id);
    const stateAfter = db.game_state(app, profile.id)!;

    testing.expect(stateAfter.guesses.length).toBe(stateBefore.guesses.length);
  });

  testing.it("updates pokemon_id and clears guesses when started on a new day", () => {
    const day = time.Day.init();
    const app = init(day.interface());
    const profile = db.register(app, REGISTRATION)!;

    db.start_or_get_game(app, profile.id);
    db.make_guess(app, profile.id, 4);

    // Advance to the next day and start a new game.
    day.advance(1);
    db.start_or_get_game(app, profile.id);

    const game = app.sqlite
      .query("SELECT * FROM games WHERE player_id = ?")
      .get(profile.id) as any;
    testing.expect(game.pokemon_id).toBe(TOMORROW_POKEMON);

    const state = db.game_state(app, profile.id)!;
    testing.expect(state.guesses.length).toBe(0);
  });
});

testing.describe("player_stats updates via trigger", () => {
  testing.it("increments wins and win_streak when a game is won", () => {
    const app = init();
    const profile = db.register(app, REGISTRATION)!;

    db.start_or_get_game(app, profile.id);
    db.make_guess(app, profile.id, TODAY_POKEMON); // Correct guess → win.

    const stats = app.sqlite
      .query("SELECT * FROM player_stats WHERE player_id = ?")
      .get(profile.id) as any;

    testing.expect(stats.wins).toBe(1);
    testing.expect(stats.losses).toBe(0);
    testing.expect(stats.win_streak).toBe(1);
  });

  testing.it("increments losses and resets win_streak when a game is lost", () => {
    const app = init();
    const profile = db.register(app, REGISTRATION)!;

    // Give the game a low max_guess_count so we can exhaust it quickly.
    app.sqlite.run("UPDATE games SET max_guess_count = 1 WHERE player_id = ?", [profile.id]);

    // Sanity: start the game first so the games row exists.
    db.start_or_get_game(app, profile.id);
    app.sqlite.run("UPDATE games SET max_guess_count = 1 WHERE player_id = ?", [profile.id]);

    // Build up a win streak first.
    // (We'll test that it resets even when streak > 0.)
    app.sqlite.run(
      "UPDATE player_stats SET win_streak = 3 WHERE player_id = ?",
      [profile.id]
    );

    // Wrong guess and we've used our only attempt → loss.
    db.make_guess(app, profile.id, 4);

    const stats = app.sqlite
      .query("SELECT * FROM player_stats WHERE player_id = ?")
      .get(profile.id) as any;

    testing.expect(stats.losses).toBe(1);
    testing.expect(stats.wins).toBe(0);
    testing.expect(stats.win_streak).toBe(0);
    testing.expect(stats.max_win_streak).toBe(3);
  });
});

testing.describe("search_profiles", () => {
  testing.it("returns matching profiles by username", () => {
    const app = init();

    db.register(app, { username: "pikachu", passhash: "123", favorite_pokemon_id: 69 });
    db.register(app, { username: "pikablu", passhash: "123", favorite_pokemon_id: 69 });
    db.register(app, { username: "mewtwo", passhash: "123", favorite_pokemon_id: 69 });

    const results = db.search_profiles(app, "pika");
    testing.expect(results.length).toBe(2);

    const usernames = results.map((p) => p.username);
    testing.expect(usernames).toContain("pikachu");
    testing.expect(usernames).toContain("pikablu");
  });

  testing.it("returns an empty array for a short query", () => {
    const app = init();
    db.register(app, REGISTRATION);

    const results = db.search_profiles(app, "as"); // < 3 chars
    testing.expect(results).toEqual([]);
  });

  testing.it("returns an empty array when no profiles match", () => {
    const app = init();
    db.register(app, { username: "brock", passhash: "123", favorite_pokemon_id: 69 });

    const results = db.search_profiles(app, "misty");
    testing.expect(results).toEqual([]);
  });
});
