import { defineAbility } from "../types";

// The ash moth. It beats its wings in someone's face, and the ash gets everywhere.
export default defineAbility({
  id: "choking-ash",
  name: "Choking Ash",
  description: "A cloud of hot ash in one hero's face: a little fire, and they may be dazed.",
  verb: "beats a cloud of hot ash into {target}'s face",
  target: "enemy",
  cooldown: 2,
  tags: ["damage", "fire"],
  effects: [
    { type: "dealDamage", amount: 3, scale: 0, damageType: "fire" },
    { type: "applyStatus", status: "dazed", turns: 1, chance: 0.5 },
  ],
});
