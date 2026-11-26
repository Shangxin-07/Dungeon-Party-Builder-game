import { defineLootTable } from "../types";

// What the town buried with its dead (the Bone Halls).
export default defineLootTable({
  id: "grave-goods",
  rolls: [1, 2],
  entries: [
    { item: "coins", weight: 4 },
    { item: "silver-ring", weight: 2 },
    { item: "bone-charm", weight: 2 },
    { item: "bone-dust", weight: 2 },
    { item: "trinket", weight: 2 },
    { item: "bone-mail", weight: 1 },
    { item: "silvered-mace", weight: 1 },
  ],
});
