/**
 * Room events played out by the party's alignment (DESIGN.md §7). An event
 * room (behaviour "event", src/sim/rooms.ts) picks one of the floor's events
 * from content/events/ and plays the outcome for the party's alignment: a
 * wounded stranger is healed by a Good party, ignored by a Neutral one and
 * robbed by an Evil one.
 *
 * Each effect type in an outcome is run by a handler registered here. To add
 * a new kind (a fight, a stat change...), register it with registerEventEffect
 * and use its type from a content file; the room code never needs to change.
 */
import type { EventDef, EventEffect } from "../content/types";
import type { Index } from "./library";
import type { RoomContext } from "./rooms";
import type { Rng } from "./rng";

export type EventEffectHandler = (ctx: RoomContext, effect: EventEffect) => void;

const registry = new Map<string, EventEffectHandler>();

export function registerEventEffect(type: string, handler: EventEffectHandler): void {
  registry.set(type, handler);
}
export function hasEventEffect(type: string): boolean {
  return registry.has(type);
}

/** Event damage grows with depth, like traps. */
const HURT_PER_FLOOR = 1.3;

/** The events that can happen on this floor. */
export const eventsOn = (ix: Index, depth: number): EventDef[] =>
  ix.lib.events.filter((e) => e.floors[0] <= depth && depth <= e.floors[1]);

/** Pick one of the floor's events, by weight. */
export function pickEvent(ix: Index, depth: number, rng: Rng): EventDef | undefined {
  const options = eventsOn(ix, depth);
  if (!options.length) return undefined;
  let roll = rng.next() * options.reduce((s, e) => s + e.weight, 0);
  return options.find((e) => (roll -= e.weight) < 0) ?? options.at(-1)!;
}

/** Play an event out for the party as it stands. */
export function runEvent(ctx: RoomContext, event: EventDef): void {
  ctx.log("event", event.intro);
  const align = ctx.alignment();
  const outcome = event.outcomes[align];
  if (!outcome) {
    ctx.log("event", "The party can't agree what to do about it, and in the end does nothing.");
    return;
  }
  const lead = ctx.leader();
  ctx.log("event", outcome.text.replaceAll("{hero}", lead?.name ?? "Someone"));
  for (const effect of outcome.effects) {
    if (effect.chance !== undefined && !ctx.rng.chance(effect.chance)) continue;
    const handler = registry.get(effect.type);
    if (!handler) throw new Error(`Unknown event effect "${effect.type}" in "${event.id}"`);
    handler(ctx, effect);
  }
}

// ---------------------------------------------------------------------------
// Built-in effects
// ---------------------------------------------------------------------------

registerEventEffect("loot", (ctx, e) => {
  if (e.type === "loot") ctx.findLoot(e.table, e.from);
});

registerEventEffect("healParty", (ctx, e) => {
  if (e.type !== "healParty") return;
  if (e.text) ctx.log("event", `${e.text}.`);
  for (const h of ctx.alive()) {
    const hp = ctx.heal(h, Math.round((ctx.maxHp(h) * e.percent) / 100));
    if (hp) ctx.log("event", `${h.name}: +${hp} HP.`);
  }
});

registerEventEffect("hurt", (ctx, e) => {
  if (e.type !== "hurt") return;
  const victims = ctx.conscious();
  if (!victims.length) return;
  if (e.text) ctx.log("event", `${e.text}!`);
  const hit = e.hits === "all" ? victims : [ctx.leader() ?? ctx.rng.pick(victims)];
  const scale = HURT_PER_FLOOR ** (ctx.depth - 1);
  for (const h of hit)
    ctx.hurt(h, Math.round(ctx.rng.int(e.damage[0], e.damage[1]) * scale), e.damageType);
});

registerEventEffect("deed", (ctx, e) => {
  if (e.type === "deed") ctx.deed(e.fact);
});

registerEventEffect("gift", (ctx, e) => {
  if (e.type !== "gift") return;
  const gold = ctx.rng.int(e.gold[0], e.gold[1]);
  ctx.gift(gold, e.news.replaceAll("{gold}", String(gold)));
});
