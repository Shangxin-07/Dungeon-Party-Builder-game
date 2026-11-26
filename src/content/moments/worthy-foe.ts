import { defineMoment } from "../types";

export default defineMoment({
  id: "worthy-foe",
  name: "A worthy foe",
  tags: ["soldier"],
  floors: [1, 5],
  on: { kind: "fight", monsters: ["shard-bearer"] },
  chance: 0.5,
  text: "When the shard-bearer falls, {hero} salutes it, as soldiers do for a foe who fought well.",
  effects: [
    { type: "morale", amount: 5, reason: "beat a foe worth beating" },
    { type: "epithet", name: "the Steady" },
  ],
});
