import { defineAbility } from "../types";

// The Cinder Mother. Once a fight, her litter comes out of the coals.
export default defineAbility({
  id: "call-the-litter",
  name: "Call the Litter",
  description: "Once a fight: two cinder hounds join the fight.",
  verb: "howls, and the coals answer",
  target: "self",
  perFight: 1,
  tags: ["summon"],
  effects: [{ type: "summon", monster: "cinder-hound", count: 2 }],
});
