/**
 * The town screen: recruit, kit out, pick a party and its formation, set
 * standing orders, launch, watch the trip and see what came back (M3). Watch
 * the pit and its raids, build defences, and keep save slots (M4). Morale,
 * level-ups and rescue runs (M5) are in Heroes.tsx and Lost.tsx. All the
 * rules live in src/sim/town/; this folder only shows the state and calls
 * those actions.
 *
 * One file per panel: TownGame.tsx (loading a save and laying out the town),
 * Saves, Trip, Party, Roster, Recruits, Market, Buildings, Memorial;
 * shared.ts holds the little helpers they share.
 */
export { describeItem } from "./shared";
export { TownGame } from "./TownGame";
