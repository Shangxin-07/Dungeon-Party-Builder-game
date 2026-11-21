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
  // "Clear the floor by N%": each day of hunting searches 4 more rooms for
  // monsters, and a party gives up after 12 rooms (3 extra days).
  hunting: { roomsPerDay: 4, maxRooms: 12 },
  raids: {
    // 1 point of strength that gets past the walls is about one floor-1 monster.
    powerPerStrength: 3,
    goldPerStrength: 5,
    strengthPerDamage: 4,
    defenderMinHpPercent: 50,
    maxDefenders: 6,
  },
});
