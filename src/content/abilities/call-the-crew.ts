import { defineAbility } from "../types";

// The Foreman's Shade. Once a fight, the old shift answers the bell.
export default defineAbility({
  id: "call-the-crew",
  name: "Call the Crew",
  description: "Once a fight: a Lost Delver joins the fight.",
  verb: "rings the shift bell, and someone answers",
  target: "self",
  perFight: 1,
  tags: ["summon"],
  effects: [{ type: "summon", monster: "lost-delver", count: 1 }],
});
