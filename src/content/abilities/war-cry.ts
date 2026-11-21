import { defineAbility } from "../types";

// Leaders (Goblin Boss, Skeleton Captain). Once a fight, the whole band hits harder.
export default defineAbility({
  id: "war-cry",
  name: "War Cry",
  description: "Once a fight: every ally gets +3 attack and +2 accuracy for 3 turns.",
  verb: "bellows a War Cry",
  target: "all-allies",
  perFight: 1,
  tags: ["rally"],
  effects: [{ type: "applyStatus", status: "emboldened", turns: 3 }],
});
