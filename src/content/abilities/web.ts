import { defineAbility } from "../types";

// Spiders. Pins a hero down for the others to bite.
export default defineAbility({
  id: "web",
  name: "Web",
  description: "Pins a hero: -4 evasion and -6 initiative for 3 turns.",
  verb: "spins a web over {target}",
  target: "enemy",
  cooldown: 4,
  tags: ["debuff"],
  effects: [{ type: "applyStatus", status: "webbed", turns: 3 }],
});
