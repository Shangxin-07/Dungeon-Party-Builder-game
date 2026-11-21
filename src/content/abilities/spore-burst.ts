import { defineAbility } from "../types";

// Sporecallers. A choking cloud over the whole party.
export default defineAbility({
  id: "spore-burst",
  name: "Spore Burst",
  description: "Poison damage to every hero, and may poison them.",
  verb: "bursts, filling the air with spores",
  target: "all-enemies",
  cost: 8,
  tags: ["spell", "poison", "damage", "aoe"],
  effects: [
    { type: "dealDamage", amount: 2, scale: 0.3, damageType: "poison" },
    { type: "applyStatus", status: "poisoned", turns: 2, chance: 0.4 },
  ],
});
