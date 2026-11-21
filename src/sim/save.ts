/**
 * Saves (DESIGN.md §13). A save is the TownState as JSON with a version
 * number. Saves store ids, not copies of content, so they keep working as
 * content changes. When TownState changes shape, bump TOWN_VERSION and add a
 * step to MIGRATIONS that turns the previous version into the new one. Before
 * bumping, add a save from the old version to fixtures/saves/ (see its README).
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
  // M6: parties on file.
  8: (_ix, old) => ({ ...old, version: 9, parties: [] }),
  // M6: freeform classes. Every level so far went into the hero's one class,
  // including level-ups waiting to be spent (their stat gains are already in).
  9: (_ix, old) => {
    const upgrade = (h: Hero): Hero => ({
      ...h,
      classes: h.classes ?? (h.untrained || h.porter ? {} : { [h.classId]: h.level }),
      levelUps: (h.levelUps ?? []).map((l) => ({ ...l, classId: l.classId ?? h.classId })),
    });
    const lastTrip = old.lastTrip as { party: Hero[] } | undefined;
    return {
      ...old,
      version: 10,
      roster: (old.roster as Hero[]).map(upgrade),
      recruits: (old.recruits as Hero[]).map(upgrade),
      sites: (old.sites as { trapped: { hero: Hero }[] }[]).map((s) => ({
        ...s,
        trapped: s.trapped.map((x) => ({ ...x, hero: upgrade(x.hero) })),
      })),
      lastTrip: lastTrip && { ...lastTrip, party: lastTrip.party.map(upgrade) },
      raids: (old.raids as { defenders: Hero[] }[]).map((r) => ({
        ...r,
        defenders: r.defenders.map(upgrade),
      })),
    };
  },
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
  const missing = missingContent(ix, town);
  if (missing.length)
    throw new Error(
      `That save uses things this version of the game doesn't have: ${missing.slice(0, 5).join(", ")}` +
        `${missing.length > 5 ? ` and ${missing.length - 5} more` : ""}.`,
    );
  return town;
}

/**
 * Content a save refers to that the game no longer has ('item "sword"', ...),
 * each listed once. Saves keep ids, not copies (see the top of this file), so
 * renaming or removing a class, item, building and so on breaks old saves
 * unless a migration step renames the id in them too. Checking here turns
 * what would be a crash on every load into a message.
 */
export function missingContent(ix: Index, town: TownState): string[] {
  const out = new Set<string>();
  const check = (kind: string, look: (id: string) => unknown, id: string | undefined) => {
    if (id === undefined) return;
    try {
      look(id);
    } catch {
      out.add(`${kind} "${id}"`);
    }
  };
  const item = (id?: string) => check("item", ix.item, id);
  const cls = (id?: string) => check("class", ix.cls, id);
  const building = (id?: string) => check("building", ix.building, id);
  const monster = (id?: string) => check("monster", ix.monster, id);
  const hero = (h: Hero) => {
    cls(h.classId);
    Object.keys(h.classes ?? {}).forEach(cls);
    for (const l of h.levelUps ?? []) cls(l.classId);
    for (const id of Object.values(h.equipment)) item(id);
    h.pack.forEach(item);
    for (const id of h.perks) check("perk", ix.perk, id);
    for (const l of h.levelUps ?? []) for (const id of l.offers) check("perk", ix.perk, id);
    check("motivation", ix.motivation, h.motivation);
    building(h.favourite);
    for (const i of h.injuries ?? []) check("injury", ix.injury, i.id);
  };
  [...town.roster, ...town.recruits].forEach(hero);
  for (const s of town.sites) {
    for (const x of s.trapped) hero(x.hero);
    for (const it of s.items) item(it.item);
  }
  town.stash.forEach(item);
  for (const g of town.scavenged) item(g.item);
  Object.keys(town.buildings).forEach(building);
  town.damaged.forEach(building);
  for (const c of town.construction) building(c.building);
  for (const m of town.memorial) cls(m.classId);
  for (const d of town.departed) {
    cls(d.classId);
    d.took.forEach(item);
  }
  // History the town screen shows: the last trip and recent raids.
  const trip = town.lastTrip;
  if (trip) {
    trip.party.forEach(hero);
    trip.result.kills.forEach(monster);
    for (const h of [...trip.result.haul, ...(trip.result.porterHaul ?? [])]) item(h.item);
  }
  for (const r of town.raids) {
    r.raiders.forEach(monster);
    r.defenders.forEach(hero);
  }
  return [...out];
}

export function summarise(town: TownState): SaveSummary {
  return {
    day: town.day,
    gold: town.gold,
    heroes: town.roster.length,
    fallen: town.memorial.length,
  };
}
