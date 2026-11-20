/**
 * Room behaviours (DESIGN.md §11). Each room definition names a behaviour by
 * id; the expedition calls it when the party walks in. To add a new kind of
 * room (a shrine, a wounded stranger...), register a handler here or from
 * anywhere with registerRoom, and reference its id from a content file.
 * The expedition loop never needs to change.
 */
import type { DamageType, RoomDef } from "../content/types";
import type { Side } from "./combat";
import type { ExpeditionEventKind } from "./expedition";
import type { Hero } from "./hero";
import type { Index } from "./library";
import type { Rng } from "./rng";

/** What a room handler can see and do. */
export interface RoomContext {
  readonly ix: Index;
  readonly rng: Rng;
  readonly depth: number;
  readonly room: RoomDef;
  /** Heroes who can act (not downed or dead). */
  conscious(): Hero[];
  /** Heroes still alive, including downed ones being carried. */
  alive(): Hero[];
  /** The best value of a skill among conscious heroes. */
  best(skill: string): { hero: Hero; value: number } | undefined;
  maxHp(hero: Hero): number;
  maxMana(hero: Hero): number;
  log(kind: ExpeditionEventKind, text: string): void;
  /** Roll a group of this floor's monsters, sized for how the floor is today. Empty if none are left. */
  rollMonsters(): string[];
  /** Fight, then roll loot from the kills. Logs everything and updates the party. */
  fight(monsters: readonly string[], opts?: { surprise?: boolean }): Side | "none";
  /** Hurt a hero outside combat. Resistances apply, armour doesn't. */
  hurt(hero: Hero, amount: number, type: DamageType): void;
  /** Heal a hero (gets a downed hero back up). Returns HP gained. */
  heal(hero: Hero, amount: number): number;
  restoreMana(hero: Hero, amount: number): number;
  /** Roll a loot table and try to carry what's found. `from` reads like "in the chest". */
  findLoot(tableId: string, from: string): void;
}

export type RoomHandler = (ctx: RoomContext) => void;

const registry = new Map<string, RoomHandler>();

export function registerRoom(id: string, handler: RoomHandler): void {
  registry.set(id, handler);
}
export function getRoom(id: string): RoomHandler {
  const handler = registry.get(id);
  if (!handler) throw new Error(`Unknown room behaviour "${id}"`);
  return handler;
}
export function hasRoom(id: string): boolean {
  return registry.has(id);
}

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------

/** Scouting below this never gets the jump on a group of monsters. */
const SURPRISE_FLOOR = 30;
/** Best case chance of striking first. */
const SURPRISE_MAX = 0.6;
/** Trap spot chance = (best Scouting − trap.hidden + this)%. */
const TRAP_SPOT_BASE = 50;
/** Traps hit harder on deeper floors, ×this per floor (like monster power). */
const TRAP_PER_FLOOR = 1.3;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function describeGroup(ix: Index, monsters: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const id of monsters) counts.set(id, (counts.get(id) ?? 0) + 1);
  const parts = [...counts].map(([id, n]) => {
    const name = ix.monster(id).name;
    return n === 1 ? `a ${name}` : `${n} ${name}s`;
  });
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0]!;
}

// ---------------------------------------------------------------------------
// Built-in room behaviours
// ---------------------------------------------------------------------------

/** Nothing here but atmosphere. */
registerRoom("quiet", () => {});

/** Monsters from this floor's encounter tables. A good scout may get the first strike. */
registerRoom("fight", (ctx) => {
  const monsters = ctx.rollMonsters();
  if (!monsters.length) {
    ctx.log("quiet", "Nothing stirs. This floor has been cleared out.");
    return;
  }
  const scout = ctx.best("scouting");
  const chance = clamp(((scout?.value ?? 0) - SURPRISE_FLOOR) / 100, 0, SURPRISE_MAX);
  const surprise = !!scout && ctx.rng.chance(chance);
  if (surprise) {
    ctx.log(
      "scout",
      `${scout.hero.name} creeps ahead and counts ${describeGroup(ctx.ix, monsters)}.`,
    );
  }
  ctx.fight(monsters, { surprise });
});

/** A hidden trap. Spotting it means walking around it. */
registerRoom("trap", (ctx) => {
  const trap = ctx.room.trap;
  if (!trap) throw new Error(`Room "${ctx.room.id}" has the trap behaviour but no trap`);
  const scout = ctx.best("scouting");
  const chance = clamp(((scout?.value ?? 0) - trap.hidden + TRAP_SPOT_BASE) / 100, 0.05, 0.95);
  if (scout && ctx.rng.chance(chance)) {
    ctx.log("scout", `${scout.hero.name} spots ${trap.spotted}. The party steps around it.`);
    return;
  }
  const victims = ctx.conscious();
  if (!victims.length) return;
  const hit = trap.hits === "all" ? victims : [ctx.rng.pick(victims)];
  const scale = TRAP_PER_FLOOR ** (ctx.depth - 1);
  const who = trap.hits === "all" ? "on the party" : `on ${hit[0]!.name}`;
  ctx.log("trap", `${trap.springs} ${who}!`);
  for (const h of hit) {
    const raw = Math.round(ctx.rng.int(trap.damage[0], trap.damage[1]) * scale);
    ctx.hurt(h, raw, trap.damageType);
  }
});

/** A chest or a hoard. */
registerRoom("treasure", (ctx) => {
  if (!ctx.room.loot) throw new Error(`Room "${ctx.room.id}" has no loot table`);
  ctx.findLoot(ctx.room.loot, "in the chest");
});

/**
 * A safe place to rest. Everyone gets HP and mana back. The best Medicine in
 * the party decides how much the rest helps, and gets downed heroes back up.
 */
registerRoom("rest", (ctx) => {
  const rest = ctx.room.rest;
  if (!rest) throw new Error(`Room "${ctx.room.id}" has the rest behaviour but no rest settings`);
  const medic = ctx.best("medicine");
  const care = 0.5 + 0.5 * ((medic?.value ?? 0) / 100);
  const who = medic ? `, ${medic.hero.name} tending the wounds` : "";
  ctx.log("rest", `The party rests${who}.`);
  for (const h of ctx.alive()) {
    const hp = ctx.heal(h, Math.round((ctx.maxHp(h) * rest.hpPercent * care) / 100));
    const mana = ctx.restoreMana(h, Math.round((ctx.maxMana(h) * rest.manaPercent) / 100));
    const parts = [hp ? `+${hp} HP` : "", mana ? `+${mana} mana` : ""].filter(Boolean);
    if (parts.length) ctx.log("rest", `${h.name}: ${parts.join(", ")}.`);
  }
});
