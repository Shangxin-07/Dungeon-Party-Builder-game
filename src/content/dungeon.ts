import { defineDungeonRules } from "./types";

/**
 * How the dungeon breeds and spills over (DESIGN.md §4, §8). Tune freely:
 * `npm run days` shows what these numbers do over a few weeks of play.
 */
export default defineDungeonRules({
  // The bottom floor breeds 6 monsters a day at first, three more every 20 days.
  spawnPerDay: 6,
  spawnGrowthPerDay: 0.15,
  // The ones pushed upstairs are the weakest of their floor.
  evictedLevelDrop: 0.5,
  // Each day a floor settles 5% of the way back to its usual level.
  settlePerDay: 0.05,
  // "Clear the floor by N%": a party gives up after 12 extra rooms. How long
  // each takes is in content/time.ts (about 4 a day).
  hunting: { maxRooms: 12 },
  // A sealed stairhead (M7.16) loses 1 a day, plus a quarter for every monster
  // the floor below has over its capacity: they're all pushing on it. Penned
  // in past half as many again as the floor holds, they turn on each other.
  seals: { perMonster: 0.25, wearPerDay: 1, crowding: 1.5 },
  raids: {
    // 1 point of strength that gets past the walls is about one floor-1 monster.
    powerPerStrength: 3,
    goldPerStrength: 5,
    strengthPerDamage: 4,
    defenderMinHpPercent: 50,
    maxDefenders: 6,
  },
});
