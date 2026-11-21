import { defineLootTable } from "../types";

// A gift from the shrine to those who pray at it.
export default defineLootTable({
  id: "shrine-relic",
  rolls: [1, 1],
  entries: [
    { item: "holy-symbol", weight: 3 },
    { item: "blessed-blade", weight: 1 },
  ],
});
