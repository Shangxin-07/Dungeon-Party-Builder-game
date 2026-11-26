import { defineMoment } from "../types";

export default defineMoment({
  id: "unflinching",
  name: "Unflinching",
  tags: ["orphan"],
  floors: [3, 5],
  on: { kind: "fight", monsters: ["wight", "ghast", "hollow-saint"] },
  chance: 0.35,
  text: "The temple taught {hero} what walks after death. They stand their ground while others flinch, and the party sees it.",
  effects: [
    { type: "morale", amount: 5, reason: "faced the dead without flinching" },
    { type: "epithet", name: "the Unflinching" },
  ],
});
