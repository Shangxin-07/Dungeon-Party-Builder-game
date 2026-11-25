/**
 * Real saves made by earlier versions of the game (src/sim/fixtures/saves/vN.json,
 * one per TOWN_VERSION, each from the last commit on main before the next bump).
 * Every one must still load, upgrade and play on. When you bump TOWN_VERSION,
 * add the current version's save here first: see fixtures/saves/README.md.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "./library";
import { importSave, missingContent } from "./save";
import { cantLaunch, launchAndWait, rest, TOWN_VERSION } from "./town";

const ix = indexLibrary(library);
const dir = join(import.meta.dirname, "fixtures", "saves");
const files = readdirSync(dir).filter((f) => /^v\d+\.json$/.test(f));
const versions = files.map((f) => Number(f.slice(1, -5))).sort((a, b) => a - b);

describe("saves from earlier versions", () => {
  it("has one for every version before this one", () => {
    expect(versions).toEqual(Array.from({ length: TOWN_VERSION - 1 }, (_, i) => i + 1));
  });

  it.each(versions)("version %i loads, upgrades and plays on", (v) => {
    const text = readFileSync(join(dir, `v${v}.json`), "utf8");
    const old = JSON.parse(text).town;
    expect(old.version).toBe(v);
    const t = importSave(ix, text);
    expect(t.version).toBe(TOWN_VERSION);
    expect(missingContent(ix, t)).toEqual([]);
    expect(t.roster.map((h) => h.id)).toEqual(old.roster.map((h: { id: string }) => h.id));
    expect(t.day).toBe(old.day);
    expect(t.gold).toBe(old.gold);
    // Floors added since (M6.21: floors 4 and 5) are there, as a new game starts them.
    expect(t.dungeon.floors).toHaveLength(library.floors.length);
    // Every hero has the fields today's game expects.
    for (const h of t.roster) {
      expect(Array.isArray(h.injuries)).toBe(true);
      expect(typeof h.fatigue).toBe("number");
      expect(typeof h.morale).toBe("number");
      expect(Array.isArray(h.levelUps)).toBe(true);
      // Freeform classes: class levels add up to the hero's level, less
      // level-ups not yet put into a class (only possible from version 10).
      if (!h.untrained && !h.porter) {
        const placed = Object.values(h.classes).reduce((a, b) => a + b, 0);
        expect(placed + h.levelUps.filter((u) => !u.classId).length).toBe(h.level);
        if (v < 10) for (const up of h.levelUps) expect(up.classId).toBe(h.classId);
      }
      expect(ix.alignment(h.alignment)).toBeTruthy();
    }
    // Filled in once on load (M7.19), so the game never checks for them missing.
    for (const k of [
      "intel",
      "sightings",
      "workshops",
      "folk",
      "offers",
      "lairs",
      "shards",
    ] as const)
      expect(t[k]).toBeDefined();
    const elsewhere = [...t.trips.flatMap((x) => x.party), ...t.raids.flatMap((r) => r.defenders)];
    for (const h of elsewhere) {
      expect(Array.isArray(h.injuries)).toBe(true);
      expect(typeof h.fatigue).toBe("number");
      expect(typeof h.classes).toBe("object");
    }
    // And it plays on: a few days' rest, then a trip.
    let next = t;
    for (let d = 0; d < 3; d++) next = rest(ix, next, heroNames);
    expect(next.day).toBe(t.day + 3);
    if (!cantLaunch(ix, next)) {
      const after = launchAndWait(ix, next, heroNames);
      expect(after.day).toBeGreaterThan(next.day);
    }
  });
});

describe("saves that refer to content the game no longer has", () => {
  const text = readFileSync(join(dir, `v${versions.at(-1)}.json`), "utf8");

  it("are refused with a message naming what's missing, instead of crashing later", () => {
    const file = JSON.parse(text);
    file.town.stash.push("vorpal-sword");
    file.town.roster[0].classId = "bard";
    expect(() => importSave(ix, JSON.stringify(file))).toThrow(/doesn't have: .*class "bard"/);
    expect(() => importSave(ix, JSON.stringify(file))).toThrow(/item "vorpal-sword"/);
  });

  it("list each missing thing once", () => {
    const t = importSave(ix, text);
    t.stash.push("vorpal-sword", "vorpal-sword");
    t.roster[0]!.pack.push("vorpal-sword");
    expect(missingContent(ix, t)).toEqual(['item "vorpal-sword"']);
  });
});
