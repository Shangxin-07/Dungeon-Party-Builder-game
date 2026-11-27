import { defineItem } from "../types";

// The Ember Deeps: iron that ran out of the slag and set, black and shining. Smiths pay well for it.
export default defineItem({
  id: "slag-iron",
  name: "Slag Iron",
  icon: { sheet: "ember-deeps", cell: 6 },
  slot: "loot",
  value: 130,
  tags: ["valuable"],
});
