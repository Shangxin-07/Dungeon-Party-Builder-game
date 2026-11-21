/**
 * Saves (DESIGN.md §13). A save is the TownState as JSON with a version
 * number. Saves store ids, not copies of content, so they keep working as
 * content changes. When TownState changes shape, bump TOWN_VERSION and add a
 * step to MIGRATIONS that turns the previous version into the new one.
 *
 * Where saves are kept (browser storage, a file) is the UI's business; this
 * file only reads, upgrades and writes them.
 */
import { newDungeon } from "./dungeon";
import { rollPersonality, type Hero } from "./hero";
import type { Index } from "./library";
import { TOWN_VERSION, type TownState } from "./town";

/** What goes in an exported save file. */
export interface SaveFile {
  game: "dungeon-party-builder";
  version: number;
  /** ISO time it was written. */
  savedAt: string;
  town: TownState;
}

/** A short description of a save, for the save slots list. */
export interface SaveSummary {
  day: number;
  gold: number;
  heroes: number;
  fallen: number;
}

type Raw = Record<string, unknown> & { version: number };

/** Each step upgrades a save from version `from` to `from + 1`. */
const MIGRATIONS: Record<number, (ix: Index, old: Raw) => Raw> = {
  // M3 → M4: the dungeon starts keeping its population, and raids exist.
  1: (ix, old) => {
    const lastTrip = old.lastTrip as Record<string, unknown> | undefined;
    if (lastTrip) {
      lastTrip.raids = [];
      const result = lastTrip.result as Record<string, unknown>;
      result.floorKills ??= {};
    }
    return {
      ...old,
      version: 2,
      dungeon: newDungeon(ix),
      damaged: [],
      pit: [],
      raids: [],
    };
  },
  // Buildings start taking days to put up.
  2: (_ix, old) => ({ ...old, version: 3, construction: [] }),
  // M5: heroes get personalities, morale and XP; lost parties can be rescued.
  // Personalities are worked out from each hero's id, name and stats, so a
  // hero gets the same one every time the save is loaded.
  3: (ix, old) => {
    const upgrade = (h: Hero): Hero => ({
      ...rollPersonality(ix, h.id, h.name, h.stats, h.classId),
      ...h,
      xp: h.xp ?? 0,
      levelUps: h.levelUps ?? [],
      moraleLog: h.moraleLog ?? [],
    });
    const records = old.records as Record<string, Record<string, unknown>>;
    for (const r of Object.values(records)) {
      r.deepest ??= 0;
      r.seen ??= [];
    }
    return {
      ...old,
      version: 4,
      roster: (old.roster as Hero[]).map(upgrade),
      recruits: (old.recruits as Hero[]).map(upgrade),
      sites: [],
      scavenged: [],
      departed: [],
      nextThingId: 1,
      news: [],
    };
  },
  // M6: the guild keeps accounts (wages are worked out from content, not saved).
  4: (_ix, old) => ({ ...old, version: 5, ledger: [] }),
  // M6: heroes get tired and hurt, and veterans ask for raises. Everyone
  // starts rested and whole, and nobody asks until they've gained more levels.
  5: (_ix, old) => {
    const fresh = (h: Hero): Hero => ({
      ...h,
      fatigue: h.fatigue ?? 0,
      injuries: h.injuries ?? [],
      pay: h.pay ?? 0,
      payLevel: h.payLevel ?? h.level,
    });
    const sites = (old.sites as { trapped: { hero: Hero }[] }[]).map((s) => ({
      ...s,
      trapped: s.trapped.map((x) => ({ ...x, hero: fresh(x.hero) })),
    }));
    return {
      ...old,
      version: 6,
      roster: (old.roster as Hero[]).map(fresh),
      recruits: (old.recruits as Hero[]).map(fresh),
      sites,
    };
  },
  // M6: recruits can arrive untrained; old games have no free hires left.
  6: (_ix, old) => ({
    ...old,
    version: 7,
    freeHires: 0,
    secrets: { found: 0, missed: 0, gold: 0 },
  }),
  7: (_ix, old) => ({ ...old, version: 8, porters: [] }),
};

/**
 * Read a town from parsed JSON, upgrading old versions. Returns undefined if
 * it isn't a town, or is from a newer version of the game than this one.
 */
export function migrateTown(ix: Index, raw: unknown): TownState | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  let town = raw as Raw;
  if (typeof town.version !== "number" || !Array.isArray(town.roster)) return undefined;
  while (town.version < TOWN_VERSION) {
    const step = MIGRATIONS[town.version];
    if (!step) return undefined;
    town = step(ix, structuredClone(town));
  }
  return town.version === TOWN_VERSION ? (town as unknown as TownState) : undefined;
}

export function exportSave(town: TownState, now: Date): string {
  const file: SaveFile = {
    game: "dungeon-party-builder",
    version: town.version,
    savedAt: now.toISOString(),
    town,
  };
  return JSON.stringify(file);
}

/** Read an exported save file. Throws an Error with a message for the player if it can't. */
export function importSave(ix: Index, text: string): TownState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a save: it isn't valid JSON.");
  }
  const file = parsed as Partial<SaveFile>;
  if (file?.game !== "dungeon-party-builder" || !file.town)
    throw new Error("That file isn't a Dungeon Party Builder save.");
  const town = migrateTown(ix, file.town);
  if (!town) throw new Error("That save is from a newer version of the game.");
  return town;
}

export function summarise(town: TownState): SaveSummary {
  return {
    day: town.day,
    gold: town.gold,
    heroes: town.roster.length,
    fallen: town.memorial.length,
  };
}
