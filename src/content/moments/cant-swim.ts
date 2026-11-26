import { defineMoment } from "../types";

export default defineMoment({
  id: "cant-swim",
  name: "Can't swim",
  tags: ["farm"],
  floors: [4, 4],
  on: { kind: "room", rooms: ["sump", "flooded-gallery"] },
  chance: 0.35,
  text: "{hero} grew up on dry land, slips in the black water and goes under. The others haul them out coughing.",
  effects: [
    { type: "hurt", damage: [4, 7], damageType: "cold" },
    { type: "morale", amount: -3, reason: "nearly drowned in the Flooded Shafts" },
    { type: "epithet", name: "the Damp" },
  ],
});
