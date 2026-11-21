/**
 * Expeditions (DESIGN.md §11). A party walks down through the floors one room
 * at a time, following the standing orders it was given in town, then climbs
 * back out. Fully automatic and deterministic: same seed + same party + same
 * orders = the same trip, room for room.
 *
 * Floors, rooms, loot and traps are content. Room behaviours are registered
 * in rooms.ts. This folder only knows the shape of a trip: down, room by room,
 * look after the party between rooms, check orders, come home.
 *
 * orders.ts: standing orders. report.ts: the trip report. tuning.ts: the
 * numbers. The trip is one class in layers, each extending the one before:
 * trip.ts (state, the party, the log), care.ts (wounds, first aid, packs),
 * fights.ts (rooms, fights, the risen), rescue.ts (lost parties, porters) and
 * run.ts (the trip from start to finish).
 */
export { DEFAULT_ORDERS, describeRetreat } from "./orders";
export type { RetreatRule, LootRule, StandingOrders } from "./orders";
export type {
  ExpeditionEventKind,
  HeroStatus,
  ExpeditionEvent,
  ExpeditionResult,
  SiteVisit,
  CarriedGear,
  ExpeditionExtras,
} from "./report";
export { DOWNED_LOAD } from "./tuning";
export { runExpedition, planFloor } from "./run";
