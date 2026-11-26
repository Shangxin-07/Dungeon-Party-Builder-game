import { defineMoment } from "../types";

export default defineMoment({
  id: "burial-marks",
  name: "Burial marks",
  tags: ["graves"],
  floors: [3, 3],
  on: { kind: "room", rooms: ["ossuary-niche", "bone-stacks"] },
  chance: 0.4,
  text: "{hero} reads the burial marks like a ledger, and knows which niche the family kept its coin in.",
  effects: [
    { type: "loot", table: "grave-goods", from: "behind a marked stone" },
    { type: "morale", amount: 3, reason: "read the dead's own marks" },
  ],
});
