import { describe, it, expect } from "vitest";
import {
  SNAPSHOT_VERSION,
  SNAPSHOT_TTL_MS,
  serializeSnapshot,
  deserializeSnapshot,
  isSnapshotFresh,
} from "@/src/domain/library";
import type { Game } from "@/lib/types";

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    appId: 100,
    name: "Test Game",
    hours: 50,
    completion: 75,
    achievements: { earned: 30, total: 40 },
    comparison: { text: "You're ahead of", percent: 45, isPositive: true },
    image: "https://example.com/img.jpg",
    owned: true,
    tracked: true,
    unlocktimes: [],
    ...overrides,
  };
}

const validSnapshot = {
  version: SNAPSHOT_VERSION,
  fetchedAtMs: 1_700_000_000_000,
  games: [makeGame()],
  earnedEntries: [
    {
      appId: 100,
      gameName: "Test Game",
      apiname: "ACH_1",
      unlocktime: 1_700_000_000,
      globalPercent: 12.5,
    },
  ],
  user: { personaName: "gabe", avatar: "https://example.com/a.jpg" },
};

// --- serializeSnapshot / deserializeSnapshot ---

describe("serializeSnapshot / deserializeSnapshot", () => {
  it("round-trips a snapshot preserving all data", () => {
    const raw = serializeSnapshot(validSnapshot);
    const parsed = deserializeSnapshot(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.version).toBe(SNAPSHOT_VERSION);
    expect(parsed!.fetchedAtMs).toBe(validSnapshot.fetchedAtMs);
    expect(parsed!.games).toEqual(validSnapshot.games);
    expect(parsed!.earnedEntries).toEqual(validSnapshot.earnedEntries);
    expect(parsed!.user).toEqual(validSnapshot.user);
  });

  it("returns null on corrupt JSON", () => {
    expect(deserializeSnapshot("{not json")).toBeNull();
  });

  it("returns null when payload is not an object", () => {
    expect(deserializeSnapshot(JSON.stringify([1, 2, 3]))).toBeNull();
    expect(deserializeSnapshot(JSON.stringify("hello"))).toBeNull();
  });

  it("returns null on version mismatch", () => {
    const raw = serializeSnapshot({ ...validSnapshot, version: 999 });
    expect(deserializeSnapshot(raw)).toBeNull();
  });

  it("returns null when games or earnedEntries are missing", () => {
    const noGames = JSON.stringify({ ...validSnapshot, games: undefined });
    expect(deserializeSnapshot(noGames)).toBeNull();

    const noEntries = JSON.stringify({
      ...validSnapshot,
      earnedEntries: undefined,
    });

    expect(deserializeSnapshot(noEntries)).toBeNull();
  });

  it("returns null when fetchedAtMs is missing", () => {
    const raw = JSON.stringify({ ...validSnapshot, fetchedAtMs: undefined });
    expect(deserializeSnapshot(raw)).toBeNull();
  });

  it("accepts a snapshot without a user", () => {
    const raw = serializeSnapshot({ ...validSnapshot, user: undefined });
    const parsed = deserializeSnapshot(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.user).toBeUndefined();
  });
});

// --- isSnapshotFresh ---

describe("isSnapshotFresh", () => {
  it("is fresh within the TTL", () => {
    expect(isSnapshotFresh(1_000_000, 1_000_000 + SNAPSHOT_TTL_MS - 1)).toBe(
      true,
    );
  });

  it("is stale at exactly the TTL boundary", () => {
    expect(isSnapshotFresh(1_000_000, 1_000_000 + SNAPSHOT_TTL_MS)).toBe(false);
  });

  it("is stale beyond the TTL", () => {
    expect(isSnapshotFresh(1_000_000, 1_000_000 + SNAPSHOT_TTL_MS * 10)).toBe(
      false,
    );
  });

  it("honors a custom TTL", () => {
    expect(isSnapshotFresh(1_000_000, 1_000_500, 250)).toBe(false);
    expect(isSnapshotFresh(1_000_000, 1_000_200, 250)).toBe(true);
  });
});
