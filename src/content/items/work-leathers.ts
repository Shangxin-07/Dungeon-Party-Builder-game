import { defineItem } from "../types";

// A miner's apron and gloves. Better than nothing.
export default defineItem({
  id: "work-leathers",
  name: "Work Leathers",
  slot: "armor",
  value: 8,
  tags: ["armor", "light", "makeshift"],
  passives: [{ type: "modifyStat", stat: "armor", amount: 1 }],
});
