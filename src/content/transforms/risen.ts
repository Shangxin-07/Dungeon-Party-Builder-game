import { defineTransform } from "../types";

/**
 * A hero whose body the dungeon kept (DESIGN.md §10): "Bram, Risen". Same
 * class, fighting style and gear, but tougher, slower and thick-headed, with
 * the weaknesses of the undead.
 */
export default defineTransform({
  id: "risen",
  suffix: ", Risen",
  tags: ["undead"],
  stats: { STR: 2, END: 2, DEX: -2, INT: -4, CHA: -10 },
  passives: [
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "piercing", percent: 25 },
    { type: "resist", damageType: "crushing", percent: -25 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
  hpPercent: 150,
});
