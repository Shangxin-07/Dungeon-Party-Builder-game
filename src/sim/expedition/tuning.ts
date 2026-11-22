/**
 * Tuning numbers for trips. Change freely: `npm run expedition` and
 * `npm run balance` show what they do.
 */

/** Carry slots a downed hero takes up when someone has to carry them. */
export const DOWNED_LOAD = 4;

/** Chance per floor of meeting wandering monsters on the way back up. */
export const WANDER_CHANCE = 0.2;

/** Mana regained per room walked: WIL ÷ this, rounded up. */
export const MANA_REGEN_DIVISOR = 4;

/** Bandages are used on heroes below this share of max HP. */
export const BANDAGE_BELOW = 0.6;

/** Chance to get a downed hero up = BASE + SCALE × Medicine/100. */
export const REVIVE_BASE = 0.3;

export const REVIVE_SCALE = 0.6;

/** With the "valuable" loot rule, finds worth less than this per slot are left. */
export const VALUABLE_PER_SLOT = 8;

/**
 * The "badly hurt" retreat order (M7.06) weighs the whole party: turn back
 * when the party's HP, counting the downed as nothing, is below this percent.
 */
export const PARTY_HURT_BELOW = 50;

/**
 * Bringing the downed round gets harder as the day wears on (M7.06): the
 * revive chance drops by up to this share by the time the party needs to camp.
 */
export const REVIVE_LATE = 0.5;
