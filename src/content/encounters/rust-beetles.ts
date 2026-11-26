import { defineEncounter } from "../types";

// The Diggings: beetles feeding on the scrap the miners left.
export default defineEncounter({
  id: "rust-beetles",
  floors: [1, 2],
  weight: 1,
  weightOn: { 1: 2 },
  groups: [{ monster: "rust-beetle", count: [1, 2] }],
});
