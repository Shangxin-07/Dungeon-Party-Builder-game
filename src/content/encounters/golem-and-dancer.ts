import { defineEncounter } from "../types";

// The Kiln: a clinker golem with a flame dancing over it.
export default defineEncounter({
  id: "golem-and-dancer",
  floors: [10, 10],
  weight: 2,
  groups: [
    { monster: "clinker-golem", count: [1, 1] },
    { monster: "flame-dancer", count: [1, 1] },
  ],
});
