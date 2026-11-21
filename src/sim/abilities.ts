/**
 * Which abilities a hero knows, and where each one comes from. Three sources,
 * all data:
 *
 * - each of their classes' lists, by class level (content/classes: `abilities: { id: level }`)
 * - the weapon and offhand they're holding (content/items: `abilities`)
 * - perks they've picked (content/perks: `abilities`)
 *
 * Nothing is stored on the hero: it's worked out from class levels, gear and
 * perks, so changing gear changes what a hero can do on the next fight.
 */
import type { AbilityDef } from "../content/types";
import { EQUIP_SLOTS, type Hero } from "./hero";
import type { Index } from "./library";

export type AbilitySource = "class" | "gear" | "perk";

export interface KnownAbility {
  ability: AbilityDef;
  source: AbilitySource;
  /** The class, item or perk name that gives it. */
  from: string;
}

/** A hero's classes, deepest first, with their levels. */
const classesOf = (hero: Hero): [string, number][] => {
  const list = Object.entries(hero.classes ?? {});
  // Untrained recruits shown as their best-fit class, for previews.
  if (!list.length) list.push([hero.classId, 1]);
  return list.sort((a, b) => b[1] - a[1]);
};

/** Every ability the hero can use right now, class list first. No duplicates. */
export function knownAbilities(ix: Index, hero: Hero): KnownAbility[] {
  const out: KnownAbility[] = [];
  const seen = new Set<string>();
  const add = (id: string, source: AbilitySource, from: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ ability: ix.ability(id), source, from });
  };
  for (const [classId, have] of classesOf(hero)) {
    const cls = ix.cls(classId);
    for (const [id, level] of Object.entries(cls.abilities))
      if (level <= have) add(id, "class", cls.name);
  }
  for (const slot of EQUIP_SLOTS) {
    const id = hero.equipment[slot];
    if (!id) continue;
    const item = ix.item(id);
    for (const a of item.abilities ?? []) add(a, "gear", item.name);
  }
  for (const p of hero.perks) {
    const perk = ix.perk(p);
    for (const a of perk.abilities ?? []) add(a, "perk", perk.name);
  }
  return out;
}

export const knownAbilityIds = (ix: Index, hero: Hero): string[] =>
  knownAbilities(ix, hero).map((k) => k.ability.id);

/**
 * Class abilities the hero hasn't reached yet in the classes they have,
 * fewest levels away first. `level` is the class level it comes at.
 */
export function upcomingAbilities(
  ix: Index,
  hero: Hero,
): { ability: AbilityDef; level: number; classId: string }[] {
  const known = new Set(knownAbilityIds(ix, hero));
  return classesOf(hero)
    .flatMap(([classId, have]) =>
      Object.entries(ix.cls(classId).abilities)
        .filter(([id, level]) => level > have && !known.has(id))
        .map(([id, level]) => ({ ability: ix.ability(id), level, classId, away: level - have })),
    )
    .sort((a, b) => a.away - b.away)
    .map(({ away: _, ...rest }) => rest);
}

/** Class abilities learned on reaching exactly this level. */
export const abilitiesAtLevel = (ix: Index, classId: string, level: number): AbilityDef[] =>
  Object.entries(ix.cls(classId).abilities)
    .filter(([, l]) => l === level)
    .map(([id]) => ix.ability(id));

/** "costs 5 mana", "every 3 turns", "once a fight"... for the hero sheet. */
export function abilityCost(a: AbilityDef): string {
  const parts: string[] = [];
  if (a.cost) parts.push(`${a.cost} mana`);
  if (a.cooldown) parts.push(`every ${a.cooldown} turns`);
  if (a.perFight) parts.push(a.perFight === 1 ? "once a fight" : `${a.perFight} times a fight`);
  return parts.join(", ");
}
