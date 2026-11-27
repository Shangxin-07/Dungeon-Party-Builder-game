import { defineItem } from "../types";

// The Coal Halls: a stoker's heavy leather apron, scorched black. The heat hardly gets through it.
export default defineItem({
  id: "stokers-apron",
  name: "Stoker's Apron",
  slot: "armor",
  value: 180,
  tags: ["armor", "heavy"],
  salvage: { "iron-bands": 2 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 5 },
    { type: "modifyStat", stat: "evasion", amount: -1 },
    { type: "resist", damageType: "fire", percent: 40 },
  ],
});
