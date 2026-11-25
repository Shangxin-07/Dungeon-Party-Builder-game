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
   *
   * "sneak" (M7.08): creep down to `lair` and back, getting past every fight
   * unheard if the party's worst Stealth allows, and fetch what can be taken
   * from the lair without waking its beast. Needs `lair`.
   */
  mission?: "rescue" | "recover" | "scout" | "sneak";
  /**
   * A huge beast's lair to go for (M7.08, content/lairs/), on its floor: a
   * sneak mission fetches from it, a delve fights the beast. Ignored on a search.
   */
  lair?: string;
  /**
   * Clear the target floor (M6): after walking it, stay and hunt until this
   * percent of the monsters living there are dead. Retreat orders still apply.
   */
  clearPercent?: number;
  /**
   * Seal the stairs below the target floor (M7.16, DESIGN.md §18.3b) with
   * this barricade (content/barricades/): once the floor is walked, before
   * any hunting. Only on an ordinary delve.
   */
  seal?: string;
  /**
   * Set this Seal Stone (M8.17, DESIGN.md §20; an item id) on the stairs below
   * the target floor, which must be the floor it seals: once the floor is
   * walked, before any hunting. The floor below sends a surge up the stairs.
   * Only on an ordinary delve.
   */
  stone?: string;
  /**
   * Go down to the Hearthstone's heart and shut it off (M8.22, DESIGN.md
   * §20): the target floor is the core's floor. Once the floor is walked, the
   * party fights the heart's guardian, cornered, and shuts it off if it wins.
   * Only on an ordinary delve.
   */
  core?: boolean;
}

/** A scout mission (M7.08): not on a search. */
export const isScouting = (orders: StandingOrders): boolean =>
  orders.mission === "scout" && !orders.rescue;

/** A sneak mission (M7.08): not on a search. */
export const isSneaking = (orders: StandingOrders): boolean =>
  orders.mission === "sneak" && !orders.rescue;

/** The lair this trip goes for (M7.08), if any. */
export const lairOf = (orders: StandingOrders): string | undefined =>
  orders.rescue ? undefined : orders.lair;

/** The barricade this trip carries down to seal the stairs with (M7.16), if any. */
export const sealOf = (orders: StandingOrders): string | undefined =>
  orders.rescue || orders.mission === "scout" || orders.mission === "sneak"
    ? undefined
    : orders.seal;

/** The Seal Stone this trip carries down to set (M8.17), if any. */
export const stoneOrder = (orders: StandingOrders): string | undefined =>
  orders.rescue || orders.mission === "scout" || orders.mission === "sneak"
    ? undefined
    : orders.stone;

/** Is this trip going for the Hearthstone's heart (M8.22)? */
export const coreOrder = (orders: StandingOrders): boolean =>
  !!orders.core && !orders.rescue && orders.mission !== "scout" && orders.mission !== "sneak";

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
