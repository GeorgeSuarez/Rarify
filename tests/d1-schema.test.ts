import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("migrations/0000_initial_schema.sql", "utf8");

const freshDatabase = () => {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec(migration);

  return database;
};

describe("D1 baseline migration", () => {
  it("creates every application table", () => {
    const database = freshDatabase();

    const rows = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all();

    const names = rows.map((row) => row.name);

    expect(names).toContain("users");
    expect(names).toContain("tracked_games");
    expect(names).toContain("snapshots");
    expect(names).toContain("library_snapshots");
    expect(names).toContain("user_preferences");
    database.close();
  });

  it("keeps one snapshot per account per day", () => {
    const database = freshDatabase();

    const insert = database.prepare(
      `INSERT INTO snapshots
        (steam_id, date, achievements_earned, avg_completion, games_owned)
       VALUES (?, ?, ?, ?, ?)`,
    );

    insert.run("76561198000000001", "2023-11-14", 100, 500, 10);
    expect(() => insert.run("76561198000000001", "2023-11-14", 101, 510, 11)).toThrow();
    // A different day or account is still allowed.
    insert.run("76561198000000001", "2023-11-15", 101, 510, 11);
    insert.run("76561198000000002", "2023-11-14", 20, 100, 2);
    database.close();
  });

  it("enforces the preference filter domain and tracked-game primary key", () => {
    const database = freshDatabase();
    database
      .prepare(
        `INSERT INTO users (steam_id, persona_name, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run("76561198000000001", "Dreadnought", 0, 0);

    expect(() =>
      database
        .prepare(
          `INSERT INTO user_preferences (steam_id, default_filter, updated_at)
           VALUES (?, ?, ?)`,
        )
        .run("76561198000000001", "bogus", 0),
    ).toThrow();

    database
      .prepare(
        `INSERT INTO user_preferences (steam_id, default_filter, updated_at)
         VALUES (?, ?, ?)`,
      )
      .run("76561198000000001", "tracked", 0);

    const tracked = database.prepare(
      `INSERT INTO tracked_games (steam_id, app_id, tracked_at) VALUES (?, ?, ?)`,
    );

    tracked.run("76561198000000001", 1245620, 0);
    expect(() => tracked.run("76561198000000001", 1245620, 1)).toThrow();
    database.close();
  });

  it("rejects foreign-key references to unknown users", () => {
    const database = freshDatabase();
    expect(() =>
      database
        .prepare(
          `INSERT INTO user_preferences (steam_id, default_filter, updated_at)
           VALUES (?, ?, ?)`,
        )
        .run("76561198999999999", "all", 0),
    ).toThrow();
    database.close();
  });
});

describe("D1 schema-cache migration", () => {
  const migratedDatabase = () => {
    const database = new DatabaseSync(":memory:");
    database.exec("PRAGMA foreign_keys = ON");
    database.exec(readFileSync("migrations/0000_initial_schema.sql", "utf8"));
    database.exec(readFileSync("migrations/0001_game_achievement_cache.sql", "utf8"));
    database.exec(readFileSync("migrations/0002_game_schema_cache.sql", "utf8"));

    return database;
  };

  it("creates one global schema row per game", () => {
    const database = migratedDatabase();

    const upsert = database.prepare(
      `INSERT INTO game_schemas (app_id, payload, fetched_at)
       VALUES (?, ?, ?)
       ON CONFLICT (app_id) DO UPDATE SET
         payload = excluded.payload,
         fetched_at = excluded.fetched_at`,
    );

    upsert.run(1245620, '{"ELD_1":{"displayName":"Elden Lord"}}', 100);
    // A second fetch for the same game replaces the row instead of adding one.
    upsert.run(1245620, "{}", 200);
    upsert.run(292030, "{}", 200);

    const rows = database
      .prepare("SELECT app_id AS appId, payload FROM game_schemas ORDER BY appId")
      .all();

    expect(rows).toEqual([
      { appId: 292030, payload: "{}" },
      { appId: 1245620, payload: "{}" },
    ]);
    database.close();
  });
});
