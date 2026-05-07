CREATE TABLE IF NOT EXISTS pokemon (
  id INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  generation INTEGER NOT NULL CHECK (generation BETWEEN 0 AND 9),
  height INTEGER NOT NULL CHECK (height >= 0),
  weight INTEGER NOT NULL CHECK (weight >= 0),
  type1 TEXT NOT NULL CHECK (type1 IN ('normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'ground', 'poison', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy')),
  type2 TEXT CHECK (type2 IN ('normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'ground', 'poison', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'))
) STRICT;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  passhash TEXT NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  favorite_pokemon_id INTEGER NOT NULL REFERENCES pokemon(id)
) STRICT;

CREATE TABLE IF NOT EXISTS player_stats (
  player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses INTEGER NOT NULL DEFAULT 0 CHECK (losses >= 0),
  win_streak INTEGER NOT NULL DEFAULT 0 CHECK (win_streak >= 0)
) STRICT;

CREATE TABLE IF NOT EXISTS games (
  player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  pokemon_id INTEGER NOT NULL REFERENCES pokemon(id),
  max_guess_count INTEGER NOT NULL DEFAULT 6 CHECK (max_guess_count > 0),
  started_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS guesses (
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  pokemon_id INTEGER NOT NULL REFERENCES pokemon(id),
  guessed_at INTEGER NOT NULL,
  UNIQUE (player_id, pokemon_id)
) STRICT;

CREATE TABLE IF NOT EXISTS schedule (
  pokemon_id INTEGER NOT NULL REFERENCES pokemon(id) ON DELETE RESTRICT,
  started_at INTEGER PRIMARY KEY CHECK(started_at % 86400 = 0),
  UNIQUE (pokemon_id, started_at)
) STRICT;

CREATE VIEW IF NOT EXISTS profiles AS
SELECT
  player.id AS id,
  user.username AS username,
  player.favorite_pokemon_id,
  stats.wins AS wins,
  stats.losses AS losses,
  stats.win_streak as win_streak
FROM users AS user
JOIN players AS player ON player.id = user.id
JOIN player_stats AS stats ON stats.player_id = player.id;

CREATE VIEW IF NOT EXISTS compare_pokemon AS
SELECT
  src.id AS src_pokemon_id,
  tgt.id AS tgt_pokemon_id,
  (
    CASE
      WHEN src.generation > tgt.generation THEN 128
      WHEN src.generation < tgt.generation THEN 64
      ELSE 0
    END
    |
    CASE
      WHEN src.height > tgt.height THEN 32
      WHEN src.height < tgt.height THEN 16
      ELSE 0
    END
    |
    CASE
      WHEN src.weight > tgt.weight THEN 8
      WHEN src.weight < tgt.weight THEN 4
      ELSE 0
    END
    |
    CASE
      WHEN src.type1 != tgt.type1 THEN 2
      ELSE 0
    END
    |
    CASE
      WHEN src.type2 IS NOT tgt.type2 THEN 1
      ELSE 0
    END
  ) AS mask
FROM pokemon AS src
JOIN pokemon AS tgt;

CREATE VIEW IF NOT EXISTS registrations AS
SELECT
  user.username,
  user.passhash,
  user.created_at,
  player.favorite_pokemon_id
FROM users AS user
JOIN players AS player ON player.id = user.id;

CREATE VIRTUAL TABLE users_fts USING fts5(
  username,
  content='users',
  content_rowid='id',
  tokenize='trigram case_sensitive 0 remove_diacritics 1'
);

CREATE TRIGGER IF NOT EXISTS users_fts_ai
AFTER INSERT ON users
BEGIN
  INSERT INTO users_fts(rowid, username) VALUES (NEW.id, NEW.username);
END;

CREATE TRIGGER IF NOT EXISTS users_fts_ad
AFTER DELETE ON users
BEGIN
  INSERT INTO users_fts(users_fts, rowid, username) VALUES ('delete', OLD.id, OLD.username);
END;

CREATE TRIGGER IF NOT EXISTS users_fts_au
AFTER UPDATE OF username ON users
BEGIN
  INSERT INTO users_fts(users_fts, rowid, username) VALUES ('delete', OLD.id, OLD.username);
  INSERT INTO users_fts(rowid, username) VALUES (NEW.id, NEW.username);
END;

CREATE TRIGGER IF NOT EXISTS create_player_registration
INSTEAD OF INSERT ON registrations
BEGIN
  INSERT INTO users (username, passhash, created_at) VALUES (NEW.username, NEW.passhash, NEW.created_at);
  INSERT INTO players (id, favorite_pokemon_id) VALUES (LAST_INSERT_ROWID(), NEW.favorite_pokemon_id);
  INSERT INTO player_stats (player_id) VALUES (LAST_INSERT_ROWID());
END;

CREATE TRIGGER IF NOT EXISTS upsert_game_on_new_day_clears_guesses
AFTER UPDATE OF pokemon_id ON games
WHEN OLD.pokemon_id != NEW.pokemon_id
BEGIN
  DELETE FROM guesses WHERE player_id = NEW.player_id;
END;

CREATE TRIGGER IF NOT EXISTS prevent_updates_on_guesses
BEFORE UPDATE ON guesses
BEGIN
  SELECT RAISE(ABORT, 'cannot update a guess, they are purely transactional');
END;

CREATE TRIGGER IF NOT EXISTS update_player_stats_on_guess
AFTER INSERT ON guesses
BEGIN
  UPDATE player_stats SET
    wins = wins + state.won,
    losses = losses + state.lost,
    win_streak = win_streak + state.won - (win_streak * state.lost)
  FROM (
    SELECT
      CAST(NEW.pokemon_id = game.pokemon_id AS INTEGER) AS won,
      CAST(
        NEW.pokemon_id != game.pokemon_id AND
        (SELECT COUNT(*) FROM guesses WHERE player_id = NEW.player_id) >= game.max_guess_count AS INTEGER
      ) AS lost
    FROM players AS player
    JOIN games AS game ON game.player_id = player.id
    WHERE player.id = NEW.player_id
  ) AS state
  WHERE player_stats.player_id = NEW.player_id;
END;

CREATE UNIQUE INDEX IF NOT EXISTS users_by_username ON users(username);
CREATE INDEX IF NOT EXISTS guesses_by_guessed_at ON guesses(player_id, guessed_at);
