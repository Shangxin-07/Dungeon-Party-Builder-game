import { defineAbility } from "../types";

// The Ember Moth. Once a fight, the halls' moths come to her light.
export default defineAbility({
  id: "call-the-swarm",
  name: "Call the Swarm",
  description: "Once a fight: two ash moths join the fight.",
  verb: "flares up, and moths come pouring out of the dark",
  target: "self",
  perFight: 1,
  tags: ["summon"],
  effects: [{ type: "summon", monster: "ash-moth", count: 2 }],
});
