import { defineEncounter } from "../types";

// The Kiln: a kiln drake basking, flames dancing round it.
export default defineEncounter({
  id: "drake-and-dancers",
  floors: [10, 10],
  weight: 2,
  groups: [
    { monster: "kiln-drake", count: [1, 1] },
    { monster: "flame-dancer", count: [1, 2] },
  ],
});
