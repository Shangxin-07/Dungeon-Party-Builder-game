/**
 * Turn-based, fully automatic combat between a party and a group of monsters
 * (DESIGN.md §10). Deterministic: same seed + same party + same monsters gives
 * the same fight, move for move.
 *
 * The loop only knows about effect *types* (weaponAttack, dealDamage, heal,
 * applyStatus, summon). Classes, monsters, abilities and statuses are all data.
 *
 * types.ts: fighters, the fight log and results. battle.ts: the fight itself.
 */
export { BASIC_ATTACK, foeSheet } from "./types";
export type {
  Side,
  Fighter,
  CombatEventKind,
  CombatEvent,
  Tone,
  CombatResult,
  CombatOptions,
  FoeSheet,
} from "./types";
export { runCombat } from "./battle";
