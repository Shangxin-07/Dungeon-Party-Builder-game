import { defineLootTable } from "../types";

// The old pit pony's harness (event pit-pony).
export default defineLootTable({
  id: "pony-tack",
  rolls: [1, 1],
  entries: [{ item: "brass-fittings", weight: 1 }],
});
