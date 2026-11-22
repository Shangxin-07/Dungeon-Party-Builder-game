/**
 * Holding the stairs (M7.16, DESIGN.md §18.3b). A party can carry a
 * barricade down (content/barricades/) and seal the stairs below the floor
 * it was sent to. The dungeon side, how the floor below wears a seal down,
 * is in src/sim/dungeon.ts.
 *
 * - The materials and gold go when the party sets off. A party that comes
 *   home without building it brings the materials back; a party that's lost
 *   loses them.
 * - The seal goes up on the day the party built it, whenever the town hears.
 * - A second seal on the same stairs replaces a weaker one.
 */
import { sealDays, type Seal } from "../dungeon";
import { sealOf, type StandingOrders } from "../expedition";
import type { Index } from "../library";
import type { Outing, TownState } from "./state";
import { addMaterials, book, edit, news, useMaterials } from "./internal";
import { materialWords } from "./read";

/** "a plank barricade", "an iron-bound gate". */
const aBarricade = (name: string) => `${/^[aeiou]/i.test(name) ? "an" : "a"} ${name.toLowerCase()}`;

/** Pick a barricade for the next party to seal the stairs with, or none. */
export function setSeal(ix: Index, town: TownState, barricade: string | undefined): TownState {
  if (barricade) ix.barricade(barricade);
  const t = edit(town);
  if (barricade) t.orders = { ...t.orders, seal: barricade };
  else delete t.orders.seal;
  return t;
}

/** The party sets off with its barricade: pay for it (changes `t`). */
export function carrySeal(ix: Index, t: TownState, orders: StandingOrders): void {
  const id = sealOf(orders);
  if (!id || orders.targetFloor >= ix.lib.floors.length) return;
  const b = ix.barricade(id);
  useMaterials(t, b.materials);
  if (b.gold) book(t, "built", -b.gold);
}

/**
 * The seal goes up in the dungeon once the town's days have reached the day
 * the party built it (changes `t`). `all`: the trip is over, put it up now.
 */
export function placeSeal(ix: Index, t: TownState, o: Outing, all = false): void {
  const s = o.result.sealed;
  if (!s || o.sealPlaced) return;
  if (!all && t.day - o.left < s.day) return;
  o.sealPlaced = true;
  const b = ix.barricade(s.barricade);
  const old = t.dungeon.seals?.[s.floor];
  if (old && old.strength >= b.strength) return;
  const seal: Seal = {
    barricade: b.id,
    strength: b.strength,
    max: b.strength,
    day: o.left + s.day,
    by: o.name,
  };
  t.dungeon = { ...t.dungeon, seals: { ...(t.dungeon.seals ?? {}), [s.floor]: seal } };
}

/**
 * A party is home (changes `t`): news of the seal, or the materials back if
 * it never got built.
 */
export function sealHome(ix: Index, t: TownState, o: Outing): void {
  const s = o.result.sealed;
  if (s) {
    placeSeal(ix, t, o, true);
    const b = ix.barricade(s.barricade);
    news(
      t,
      `${o.name} sealed the stairs below floor ${s.floor} with ${aBarricade(b.name)}.`,
      "good",
    );
    return;
  }
  const id = sealOf(o.result.orders);
  if (!id || o.result.orders.targetFloor >= ix.lib.floors.length) return;
  const b = ix.barricade(id);
  addMaterials(t, b.materials);
  news(
    t,
    `${o.name} never got to seal the stairs, and brought the ${materialWords(ix, b.materials)} home.`,
  );
}

/** Seals that gave way tonight (changes `t`). */
export function sealsBroke(t: TownState, floors: readonly number[] | undefined): void {
  for (const f of floors ?? [])
    news(
      t,
      `The barricade on the stairs below floor ${f} has given way. Everything held behind it is coming up.`,
      "bad",
    );
}

/** The seals standing, for the pit panel: how strong, and roughly how long they'll last. */
export function sealsNow(
  ix: Index,
  town: TownState,
): { floor: number; name: string; percent: number; days: number; by?: string; day: number }[] {
  return Object.entries(town.dungeon.seals ?? {})
    .map(([f, s]) => ({
      floor: Number(f),
      name: ix.barricade(s.barricade).name,
      percent: Math.max(1, Math.round((s.strength / s.max) * 100)),
      days: sealDays(ix, town.dungeon, Number(f)),
      ...(s.by ? { by: s.by } : {}),
      day: s.day,
    }))
    .sort((a, b) => a.floor - b.floor);
}

/** How a seal looks to the town: "sound", "worn" or "failing". */
export const sealWord = (percent: number) =>
  percent >= 67 ? "sound" : percent >= 34 ? "worn" : "failing";

/** Every barricade, and why the next party can't take it, if it can't. */
export function barricadeChoices(ix: Index, town: TownState) {
  return (ix.lib.barricades ?? []).map((b) => {
    const short = Object.entries(b.materials).filter(([id, n]) => (town.materials[id] ?? 0) < n);
    const why = short.length
      ? "Not enough in the store."
      : town.gold < (b.gold ?? 0)
        ? "Not enough gold."
        : undefined;
    return { barricade: b, why };
  });
}
