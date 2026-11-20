import { defineAbility } from "../types";

export default defineAbility({
  id: "venom-bite",
  name: "Venom Bite",
  verb: "sinks its fangs into {target}",
  target: "enemy",
  tags: ["damage", "poison"],
  effects: [
    { type: "weaponAttack" },
    { type: "applyStatus", status: "poisoned", turns: 3, chance: 0.7 },
  ],
});
