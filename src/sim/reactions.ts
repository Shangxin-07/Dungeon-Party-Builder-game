/**
 * Monsters reacting to the party's alignment (DESIGN.md §7). A monster lists
 * reactions in its content file (`reactions: [{ reaction, to, chance }]`);
 * before a fight, the first one that applies to the party's alignment and
 * comes up on its chance gets a say. Each reaction is a handler registered
 * here by id. A handler returns true if the fight is off.
 *
 * To add one (undead that flee a Good party, a troll that takes a bribe...),
 * register it with registerReaction and name it from a monster file.
 */
import type { Hero } from "./hero";
import type { Index } from "./library";
import type { Rng } from "./rng";
import type { ExpeditionEventKind } from "./expedition";

/** What a reaction can see and do. */
export interface ReactionContext {
  readonly ix: Index;
  readonly rng: Rng;
  /** The monsters in the group, by id. */
  readonly monsters: readonly string[];
  /** The monster whose reaction this is. */
  readonly monster: string;
  /** The party's alignment id, or "divided". */
  readonly alignment: string;
  /** Who speaks for the party. */
  readonly leader?: Hero;
  log(kind: ExpeditionEventKind, text: string): void;
  /**
   * Hand over the least valuable loot the party is carrying (never its own
   * gear). Returns its name, or undefined if there's nothing to give.
   */
  payTribute(): string | undefined;
}

/** True: no fight. */
export type ReactionHandler = (ctx: ReactionContext) => boolean;

const registry = new Map<string, ReactionHandler>();

export function registerReaction(id: string, handler: ReactionHandler): void {
  registry.set(id, handler);
}
export function getReaction(id: string): ReactionHandler {
  const handler = registry.get(id);
  if (!handler) throw new Error(`Unknown reaction "${id}"`);
  return handler;
}
export function hasReaction(id: string): boolean {
  return registry.has(id);
}

/**
 * Run the group's reaction to the party, if any comes up. Each kind of
 * monster in the group gets one go, in the order they appear. True: no fight.
 */
export function reactToParty(ctx: Omit<ReactionContext, "monster">): boolean {
  for (const id of new Set(ctx.monsters)) {
    for (const r of ctx.ix.monster(id).reactions ?? []) {
      if (!r.to.includes(ctx.alignment)) continue;
      if (!ctx.rng.chance(r.chance)) continue;
      return getReaction(r.reaction)({ ...ctx, monster: id });
    }
  }
  return false;
}

/** "Goblins", "Cave Spiders". */
const many = (ix: Index, id: string) => {
  const n = ix.monster(id).name;
  return n.endsWith("s") ? n : `${n}s`;
};

// ---------------------------------------------------------------------------
// Built-in reactions
// ---------------------------------------------------------------------------

/** They recognise kindred spirits, swap news, and go their own way. */
registerReaction("parley", (ctx) => {
  const who = ctx.leader?.name ?? "The party";
  ctx.log(
    "parley",
    `The ${many(ctx.ix, ctx.monster)} lower their blades. ${who} trades a few words with them, and they let the party pass.`,
  );
  return true;
});

/** A cut of the loot, or a fight. */
registerReaction("tribute", (ctx) => {
  const mob = `The ${many(ctx.ix, ctx.monster)}`;
  const paid = ctx.payTribute();
  if (paid) {
    ctx.log("parley", `${mob} demand a toll. The party hands over ${paid}, and they step aside.`);
    return true;
  }
  ctx.log("parley", `${mob} demand a toll, but the party has nothing worth giving. Steel, then.`);
  return false;
});
