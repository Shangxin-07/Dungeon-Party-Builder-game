/**
 * Standing orders (DESIGN.md §2): the player's only say once the party leaves.
 */
export type RetreatRule =
  | { kind: "never" }
  /**
   * Turn back when any hero still standing drops below this share of max HP,
   * or the party as a whole is badly hurt: half of it down or dead, or under
   * half its HP (M7.06). One hero down or dead alone doesn't turn it back.
   */
  | { kind: "hero-hp-below"; percent: number }
  /** Turn back as soon as anyone goes down. */
  | { kind: "hero-downed" }
  /** Turn back when the last potion is gone. */
  | { kind: "out-of-potions" };

/** "everything": carry anything that fits. "valuable": leave cheap junk behind. */
export type LootRule = "everything" | "valuable";

export interface StandingOrders {
  /** Clear down to this floor, then come home. */
  targetFloor: number;
  retreat: RetreatRule;
  loot: LootRule;
  /**
   * A search (DESIGN.md §10, §17.3): the id of a lost party's site to reach,
   * or of a party that's overdue (M7.02), to look for wherever it is.
   */
  rescue?: string;
  /**
   * What the trip is for. Missing: an ordinary delve.
   *
   * With `rescue` set, what a search is for (M7.02). "rescue": the living,
   * travelling light and fast, slipping past fights where the scout can; it
   * leaves bodies and gear. "recover" (the default): the dead and everything
   * they had, at walking pace.
   *
   * "scout" (M7.08, DESIGN.md §17.8): map the floors down to the target
   * floor. The best scout slips the party past fights where they can, it
   * never hunts, and it brings home floor intel. Ignored on a search.
   */
  mission?: "rescue" | "recover" | "scout";
  /**
   * Clear the target floor (M6): after walking it, stay and hunt until this
   * percent of the monsters living there are dead. Retreat orders still apply.
   */
  clearPercent?: number;
}

/** A scout mission (M7.08): not on a search. */
export const isScouting = (orders: StandingOrders): boolean =>
  orders.mission === "scout" && !orders.rescue;

export const DEFAULT_ORDERS: StandingOrders = {
  targetFloor: 1,
  retreat: { kind: "hero-hp-below", percent: 30 },
  loot: "everything",
};

export function describeRetreat(rule: RetreatRule): string {
  switch (rule.kind) {
    case "never":
      return "never turn back";
    case "hero-hp-below":
      return `turn back if anyone standing drops below ${rule.percent}% HP, or the party is badly hurt`;
    case "hero-downed":
      return "turn back if anyone goes down";
    case "out-of-potions":
      return "turn back when the potions run out";
  }
}
