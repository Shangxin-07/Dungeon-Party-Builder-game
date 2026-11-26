import { defineMoment } from "../types";

export default defineMoment({
  id: "smugglers-nook",
  name: "Smuggler's nook",
  tags: ["smuggler"],
  floors: [1, 5],
  on: { kind: "room", rooms: ["treasure"] },
  chance: 0.25,
  once: false,
  text: "{hero} knows where people hide the good stuff, and taps along the wall until a stone sounds hollow.",
  effects: [{ type: "loot", table: "hidden-cache", from: "behind the loose stone" }],
});
