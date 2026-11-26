import { defineMoment } from "../types";

export default defineMoment({
  id: "old-rites",
  name: "The old rites",
  tags: ["faith"],
  floors: [1, 5],
  on: { kind: "fight", monsters: ["undead"] },
  chance: 0.25,
  once: false,
  text: "When the dead lie still, {hero} kneels and says the old rites over them, so they stay down.",
  effects: [{ type: "morale", amount: 3, reason: "laid the restless dead to rest" }],
});
