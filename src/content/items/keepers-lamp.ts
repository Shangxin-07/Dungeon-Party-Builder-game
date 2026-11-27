import { defineItem } from "../types";

// The Keepers' Stair: a little lamp of pale metal, made by careful hands. Nobody knows the metal.
export default defineItem({
  id: "keepers-lamp",
  name: "Keeper's Lamp",
  slot: "loot",
  value: 60,
  valueRange: [40, 90],
  tags: ["valuable"],
});
