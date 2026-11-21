import { defineAbility } from "../types";

// The Spider Matriarch. Once a fight, the nest answers.
export default defineAbility({
  id: "call-the-brood",
  name: "Call the Brood",
  description: "Once a fight: two spiderlings join the fight.",
  verb: "shrieks, and the nest answers",
  target: "self",
  perFight: 1,
  tags: ["summon"],
  effects: [{ type: "summon", monster: "spiderling", count: 2 }],
});
