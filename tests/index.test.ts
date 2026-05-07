import { describe, it, expect } from "bun:test";
import * as db from "@/server/db";
import * as App from "@/server/app";
import { Day } from "@/lib/time";

const SCHEDULE = [1, 2, 3];
const TODAY_POKEMON = 1;
const TOMORROW_POKEMON = 2;

function makeApp(clock: Day) {
  return App.testing(clock.interface(), SCHEDULE);
}

function makeRegistration(username = "ash") {
  return {
    username,
    passhash: "hashed_password",
    favorite_pokemon_id: 25,
  };
}

describe("register", () => {
  it("creates entries in users, players, and player_stats", () => {
    const clock = Day.init();
    const app = makeApp(clock);
    const reg = makeRegistration();

    const profile = db.register(app, reg);

    expect(profile).not.toBeNull();
    expect(profile!.username).toBe(reg.username);

    const user = app.sqlite.query("SELECT * FROM users WHERE id = ?").get(profile!.id);
    expect(user).not.toBeNull();

    const player = app.sqlite.query("SELECT * FROM players WHERE id = ?").get(profile!.id);
    expect(player).not.toBeNull();

    const stats = app.sqlite
      .query("SELECT * FROM player_stats WHERE player_id = ?")
      .get(profile!.id) as any;
    expect(stats).not.toBeNull();
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.win_streak).toBe(0);
  });

  it("returns null when username already exists", () => {
    const clock = Day.init();
    const app = makeApp(clock);
    const reg = makeRegistration();

    db.register(app, reg);
    const duplicate = db.register(app, reg);

    expect(duplicate).toBeNull();
  });
});

describe("delete_user", () => {
  it("deletes corresponding entries in users, players, and player_stats", () => {
    const clock = Day.init();
    const app = makeApp(clock);
    const profile = db.register(app, makeRegistration())!;

    const deleted = db.delete_user(app, profile.id);
    expect(deleted).toBe(true);

    const user = app.sqlite.query("SELECT * FROM users WHERE id = ?").get(profile.id);
    expect(user).toBeNull();

    // Cascade should remove player and player_stats too.
    const player = app.sqlite.query("SELECT * FROM players WHERE id = ?").get(profile.id);
    expect(player).toBeNull();

    const stats = app.sqlite
      .query("SELECT * FROM player_stats WHERE player_id = ?")
      .get(profile.id);
    expect(stats).toBeNull();
  });

  it("returns false when user does not exist", () => {
    const clock = Day.init();
    const app = makeApp(clock);

    const result = db.delete_user(app, 99999);
    expect(result).toBe(false);
  });
});

describe("start_or_get_game", () => {
  it("inserts a new game with today's scheduled pokemon", () => {
    const clock = Day.init();
    const app = makeApp(clock);
    const profile = db.register(app, makeRegistration())!;

    const state = db.start_or_get_game(app, profile.id);
    expect(state).not.toBeNull();

    const game = app.sqlite
      .query("SELECT * FROM games WHERE player_id = ?")
      .get(profile.id) as any;
    expect(game).not.toBeNull();
    expect(game.pokemon_id).toBe(TODAY_POKEMON);
  });

  it("does not update the game when called again on the same day", () => {
    const clock = Day.init();
    const app = makeApp(clock);
    const profile = db.register(app, makeRegistration())!;

    db.start_or_get_game(app, profile.id);

    // Make a guess so we can detect if the game resets.
    db.make_guess(app, profile.id, 4);

    const stateBefore = db.game_state(app, profile.id)!;
    db.start_or_get_game(app, profile.id);
    const stateAfter = db.game_state(app, profile.id)!;

    expect(stateAfter.guesses.length).toBe(stateBefore.guesses.length);
  });

  it("updates pokemon_id and clears guesses when started on a new day", () => {
    const clock = Day.init();
    const app = makeApp(clock);
    const profile = db.register(app, makeRegistration())!;

    db.start_or_get_game(app, profile.id);
    db.make_guess(app, profile.id, 4);

    // Advance to the next day and start a new game.
    clock.advance(1);
    db.start_or_get_game(app, profile.id);

    const game = app.sqlite
      .query("SELECT * FROM games WHERE player_id = ?")
      .get(profile.id) as any;
    expect(game.pokemon_id).toBe(TOMORROW_POKEMON);

    const state = db.game_state(app, profile.id)!;
    expect(state.guesses.length).toBe(0);
  });
});

describe("player_stats updates via trigger", () => {
  it("increments wins and win_streak when a game is won", () => {
    const clock = Day.init();
    const app = makeApp(clock);
    const profile = db.register(app, makeRegistration())!;

    db.start_or_get_game(app, profile.id);
    db.make_guess(app, profile.id, TODAY_POKEMON); // Correct guess → win.

    const stats = app.sqlite
      .query("SELECT * FROM player_stats WHERE player_id = ?")
      .get(profile.id) as any;

    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(0);
    expect(stats.win_streak).toBe(1);
  });

  it("increments losses and resets win_streak when a game is lost", () => {
    const clock = Day.init();
    const app = makeApp(clock);
    const profile = db.register(app, makeRegistration())!;

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

    expect(stats.losses).toBe(1);
    expect(stats.wins).toBe(0);
    expect(stats.win_streak).toBe(0);
  });
});

describe("search_profiles", () => {
  it("returns matching profiles by username", () => {
    const clock = Day.init();
    const app = makeApp(clock);

    db.register(app, makeRegistration("pikachu"));
    db.register(app, makeRegistration("pikablu"));
    db.register(app, makeRegistration("mewtwo"));

    const results = db.search_profiles(app, "pika");

    expect(results.length).toBe(2);
    const usernames = results.map((p) => p.username);
    expect(usernames).toContain("pikachu");
    expect(usernames).toContain("pikablu");
  });

  it("returns an empty array for a short query", () => {
    const clock = Day.init();
    const app = makeApp(clock);
    db.register(app, makeRegistration("ash"));

    const results = db.search_profiles(app, "as"); // < 3 chars
    expect(results).toEqual([]);
  });

  it("returns an empty array when no profiles match", () => {
    const clock = Day.init();
    const app = makeApp(clock);
    db.register(app, makeRegistration("brock"));

    const results = db.search_profiles(app, "misty");
    expect(results).toEqual([]);
  });
});
