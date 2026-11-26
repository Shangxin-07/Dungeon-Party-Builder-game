/**
 * Backstory moments (M8.31, DESIGN.md §21, content/moments/): something in
 * the dungeon that means more to a hero because of where they came from.
 * The trip checks them on arriving at a floor, after each room and after each
 * won fight; they roll on a stream of their own, so a hero with no moment due
 * changes nothing else about the trip.
 */
import type { MomentDef, RoomDef } from "../content/types";
import type { Hero } from "./hero";
import type { Index } from "./library";
import type { Rng } from "./rng";

/** When moments are checked. */
export type MomentTrigger =
  | { kind: "floor" }
  | { kind: "room"; room: RoomDef }
  | { kind: "fight"; monsters: readonly string[] };

/** Whether a moment fits this hero, here and now (before its chance is rolled). */
export function momentFits(
  ix: Index,
  m: MomentDef,
  hero: Hero,
  depth: number,
  on: MomentTrigger,
  thisTrip: readonly string[],
): boolean {
  if (depth < m.floors[0] || depth > m.floors[1]) return false;
  if (m.on.kind !== on.kind) return false;
  if (thisTrip.includes(m.id)) return false;
  if (m.once !== false && hero.moments.includes(m.id)) return false;
  const tags = ix.backstory(hero.backstory).tags;
  if (!m.tags.some((t) => tags.includes(t))) return false;
  if (m.on.kind === "room" && on.kind === "room") {
    const { id, behaviour } = on.room;
    return m.on.rooms.includes(id) || m.on.rooms.includes(behaviour);
  }
  if (m.on.kind === "fight" && on.kind === "fight") {
    const want = m.on.monsters;
    return on.monsters.some(
      (id) => want.includes(id) || ix.monster(id).tags.some((t) => want.includes(t)),
    );
  }
  return true;
}

/** The moment that happens to a hero now, if any: the first that fits and rolls its chance. */
export function dueMoment(
  ix: Index,
  hero: Hero,
  depth: number,
  on: MomentTrigger,
  thisTrip: readonly string[],
  rng: Rng,
): MomentDef | undefined {
  for (const m of ix.lib.moments)
    if (momentFits(ix, m, hero, depth, on, thisTrip) && rng.chance(m.chance)) return m;
  return undefined;
}

/** The name a hero has earned (their latest), e.g. "the Unflinching". */
export function epithet(ix: Index, hero: Pick<Hero, "moments">): string | undefined {
  for (const id of [...hero.moments].reverse()) {
    const e = ix.moment(id).effects.find((x) => x.type === "epithet");
    if (e?.type === "epithet") return e.name;
  }
  return undefined;
}

/** "Wren the Unflinching", or just "Wren". */
export function knownAs(ix: Index, hero: Pick<Hero, "name" | "moments">): string {
  const e = epithet(ix, hero);
  return e ? `${hero.name} ${e}` : hero.name;
}
