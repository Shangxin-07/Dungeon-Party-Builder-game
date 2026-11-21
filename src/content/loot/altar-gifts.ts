import { defineLootTable } from "../types";

// What the dark altar gives those who feed it (content/events/).
export default defineLootTable({
  id: "altar-gifts",
  rolls: [1, 1],
  entries: [
    { item: "cursed-blade", weight: 2 },
    { item: "bone-charm", weight: 2 },
    { item: "gem", weight: 1 },
  ],
});
