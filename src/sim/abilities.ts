/**
 * Which abilities a hero knows, and where each one comes from. Three sources,
 * all data:
 *
 * - their class's list, by level (content/classes: `abilities: { id: level }`)
 * - the weapon and offhand they're holding (content/items: `abilities`)
 * - perks they've picked (content/perks: `abilities`)
 *
 * Nothing is stored on the hero: it's worked out from class, level, gear and
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

/** The level a hero counts as for their class list (hero level until §9's class levels). */
export const classLevel = (hero: Hero): number => hero.level;

/** Every ability the hero can use right now, class list first. No duplicates. */
export function knownAbilities(ix: Index, hero: Hero): KnownAbility[] {
  const out: KnownAbility[] = [];
  const seen = new Set<string>();
  const add = (id: string, source: AbilitySource, from: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ ability: ix.ability(id), source, from });
  };
  const cls = ix.cls(hero.classId);
  for (const [id, level] of Object.entries(cls.abilities))
    if (level <= classLevel(hero)) add(id, "class", cls.name);
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

/** Class abilities the hero hasn't reached yet, soonest first. */
export function upcomingAbilities(ix: Index, hero: Hero): { ability: AbilityDef; level: number }[] {
  return Object.entries(ix.cls(hero.classId).abilities)
    .filter(([, level]) => level > classLevel(hero))
    .sort((a, b) => a[1] - b[1])
    .map(([id, level]) => ({ ability: ix.ability(id), level }));
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
