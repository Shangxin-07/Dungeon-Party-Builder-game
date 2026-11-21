/**
 * Turn-based, fully automatic combat between a party and a group of monsters
 * (DESIGN.md §10). Deterministic: same seed + same party + same monsters gives
 * the same fight, move for move.
 *
 * The loop only knows about effect *types* (weaponAttack, dealDamage, heal,
 * applyStatus, summon). Classes, monsters, abilities and statuses are all data.
 *
 * types.ts: fighters, the fight log and results. The fight is one class in
 * layers, each extending the one before: base.ts (fighters, stats, the log),
 * effects.ts (what abilities and statuses do), battle.ts (turns, start to finish).
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
