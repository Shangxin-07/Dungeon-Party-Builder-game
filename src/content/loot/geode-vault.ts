import { defineLootTable } from "../types";

// Things at the bottom of a geode vault (the Glimmering).
export default defineLootTable({
  id: "geode-vault",
  rolls: [1, 2],
  entries: [
    { item: "glimmer-crystal", weight: 3 },
    { item: "gem", weight: 2 },
    { item: "ember-stone", weight: 2 },
    { item: "prism-lens", weight: 1 },
    { item: "greater-healing-potion", weight: 2 },
  ],
});
