import { defineAbility } from "../types";

// Lost Delvers. The cold of a mine nobody came back up from.
export default defineAbility({
  id: "grave-chill",
  name: "Grave Chill",
  description: "Cold damage that chills the target (slower, easier to hit).",
  verb: "reaches through {target} with a dead hand",
  target: "enemy",
  cost: 6,
  tags: ["spell", "cold", "damage"],
  effects: [
    { type: "dealDamage", amount: 3, scale: 0.5, damageType: "cold" },
    { type: "applyStatus", status: "chilled", turns: 2 },
  ],
});
