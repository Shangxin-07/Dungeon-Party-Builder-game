import { defineMoment } from "../types";

export default defineMoment({
  id: "fathers-tally",
  name: "Father's tally",
  tags: ["miner-kin"],
  floors: [5, 5],
  on: { kind: "floor" },
  chance: 0.3,
  text: "In the Old Delve, {hero} finds a foreman's tally board with a family mark cut into it, and goes very quiet. It's their father's.",
  effects: [
    { type: "morale", amount: 10, reason: "found their father's tally in the Old Delve" },
    { type: "epithet", name: "the Tallykeeper" },
  ],
});
