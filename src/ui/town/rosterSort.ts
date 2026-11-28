/**
 * How the roster is laid out (M9.26): in hiring order, or sorted by name,
 * alignment, party or level. Sorting by party lists each party on file (and
 * the next party) under its own heading, so a hero in two parties shows up
 * twice; heroes in no party come last.
 */
import type { Hero } from "../../sim/hero";
import type { TownState } from "../../sim/town";
import type { Index } from "../../sim/library";

export const ROSTER_SORTS = {
  hired: "Order hired",
  name: "Name",
  alignment: "Alignment",
  group: "Party",
  level: "Level",
} as const;
export type RosterSort = keyof typeof ROSTER_SORTS;

/** A run of cards, with a heading when the sort splits the roster up. */
export interface RosterGroup {
  key: string;
  heading?: string;
  heroes: Hero[];
}

const byName = (a: Hero, b: Hero) => a.name.localeCompare(b.name);

/** The heroes at home (`home`), laid out for the given sort. */
export function sortRoster(
  ix: Index,
  town: TownState,
  home: Hero[],
  sort: RosterSort,
): RosterGroup[] {
  if (sort === "name") return [{ key: "all", heroes: [...home].sort(byName) }];
  if (sort === "level")
    return [{ key: "all", heroes: [...home].sort((a, b) => b.level - a.level || byName(a, b)) }];
  if (sort === "alignment") {
    const out: RosterGroup[] = [];
    const known = new Set<string>();
    for (const al of [...ix.lib.alignments].sort((a, b) => a.position - b.position)) {
      known.add(al.id);
      const heroes = home.filter((h) => h.alignment === al.id).sort(byName);
      if (heroes.length) out.push({ key: `al-${al.id}`, heading: al.name, heroes });
    }
    const rest = home.filter((h) => !known.has(h.alignment)).sort(byName);
    if (rest.length) out.push({ key: "al-other", heading: "Other", heroes: rest });
    return out;
  }
  if (sort === "group") {
    const byId = new Map(home.map((h) => [h.id, h]));
    const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((h): h is Hero => !!h);
    const parties = [
      { key: "next", name: "Next party", ids: [...town.party, ...town.porters] },
      ...town.parties.map((p, i) => ({
        key: `file-${i}`,
        name: p.name,
        ids: [...p.heroes, ...p.porters],
      })),
    ];
    const placed = new Set<string>();
    const out: RosterGroup[] = [];
    for (const p of parties) {
      const heroes = pick(p.ids);
      heroes.forEach((h) => placed.add(h.id));
      if (heroes.length) out.push({ key: p.key, heading: p.name, heroes });
    }
    const rest = home.filter((h) => !placed.has(h.id));
    if (rest.length) out.push({ key: "none", heading: "In no party", heroes: rest });
    return out;
  }
  return [{ key: "all", heroes: home }];
}
