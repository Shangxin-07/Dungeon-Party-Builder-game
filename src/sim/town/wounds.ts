/**
 * Resting, healing and injuries after a trip.
 */
import type { ExpeditionEvent } from "../expedition";
import { heroSheet, type Hero } from "../hero";
import type { Index } from "../library";
import type { TownState } from "./state";
import { roll } from "./internal";

/** One day's rest in town: wounds mend, mana comes back, downed heroes get up. */
export function restHero(ix: Index, h: Hero, days: number): void {
  if (days <= 0 || h.condition === "dead") return;
  const d = heroSheet(ix, h).derived;
  const per = Math.ceil((d.maxHp * ix.lib.town.restPercent) / 100);
  h.hp = Math.min(d.maxHp, Math.max(h.hp, 0) + per * days);
  h.mana = d.mana;
  h.condition = "ok";
  h.fatigue = Math.max(0, (h.fatigue ?? 0) - ix.lib.wear.restPerDay * days);
}

/** Wounds knit a day at a time in town. Returns the names of injuries that healed. */
export function healInjuries(ix: Index, h: Hero): string[] {
  const healed: string[] = [];
  h.injuries = (h.injuries ?? []).filter((inj) => {
    inj.days -= 1;
    if (inj.days > 0) return true;
    healed.push(ix.injury(inj.id).name.toLowerCase());
    return false;
  });
  return healed;
}

/** The lowest share of max HP a hero fell to in this log (1 if never hit). */
export function lowestHp(log: readonly ExpeditionEvent[], heroId: string): number {
  let low = 1;
  for (const e of log) {
    const hp = e.combat?.hp;
    if (hp?.uid === heroId && hp.max > 0) low = Math.min(low, hp.hp / hp.max);
  }
  return low;
}

/** Was this hero knocked down at any point in this log? */
export const wasDowned = (log: readonly ExpeditionEvent[], heroId: string) =>
  log.some((e) => e.combat?.kind === "downed" && e.combat.target === heroId);

/**
 * A hero who was knocked down (or came home badly hurt, with a smaller
 * `base` chance) may pick up an injury (content/wear.ts, content/injuries/).
 * END helps. Returns the injury id, if any.
 */
export function maybeInjure(
  ix: Index,
  t: TownState,
  h: Hero,
  base = ix.lib.wear.injuryChance,
): string | undefined {
  const w = ix.lib.wear;
  const end = heroSheet(ix, h).stats.END;
  const chance = Math.max(0, Math.min(1, base - (end - 10) * w.injuryPerEnd));
  const id = roll(t, (rng) => {
    if (!rng.chance(chance)) return undefined;
    const pool = ix.lib.injuries.filter((i) => !(h.injuries ?? []).some((x) => x.id === i.id));
    if (!pool.length) return undefined;
    let r = rng.next() * pool.reduce((s, i) => s + i.weight, 0);
    for (const i of pool) if ((r -= i.weight) < 0) return i.id;
    return pool.at(-1)!.id;
  });
  if (!id) return undefined;
  h.injuries = [...(h.injuries ?? []), { id, days: ix.injury(id).days }];
  const max = heroSheet(ix, h).derived.maxHp;
  h.hp = Math.min(h.hp, max);
  return id;
}
