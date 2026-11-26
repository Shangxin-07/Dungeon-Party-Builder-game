import { defineItem } from "../types";

// Still wet with venom. Tells the Library a good deal about spiders.
export default defineItem({
  id: "spider-fang",
  name: "Spider Fang",
  icon: { sheet: "specimens", cell: 1 },
  slot: "loot",
  value: 3,
  tags: ["specimen"],
  research: {
    points: 8,
    monsters: ["cave-spider", "web-lurker", "spiderling", "spider-matriarch"],
  },
});
