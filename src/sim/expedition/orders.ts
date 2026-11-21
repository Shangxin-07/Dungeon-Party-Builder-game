/**
 * Standing orders (DESIGN.md §2): the player's only say once the party leaves.
 */
export type RetreatRule =
  | { kind: "never" }
  /** Turn back when any hero drops below this share of max HP, or goes down. */
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
  /** A rescue run: the id of the lost party's site to reach (DESIGN.md §10). */
  rescue?: string;
  /**
   * Clear the target floor (M6): after walking it, stay and hunt until this
   * percent of the monsters living there are dead. Retreat orders still apply.
   */
  clearPercent?: number;
}

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
      return `turn back if anyone drops below ${rule.percent}% HP`;
    case "hero-downed":
      return "turn back if anyone goes down";
    case "out-of-potions":
      return "turn back when the potions run out";
  }
}
