import { defineMoment } from "../types";

export default defineMoment({
  id: "own-tongue",
  name: "In their own tongue",
  tags: ["goblin-raised"],
  floors: [1, 2],
  on: { kind: "fight", monsters: ["goblinoid"] },
  chance: 0.3,
  text: "{hero} curses the goblins in their own tongue as they fall. The words come too easily.",
  effects: [
    { type: "morale", amount: -3, reason: "killed goblins they once ran with" },
    { type: "epithet", name: "the Goblin-Tongued" },
  ],
});
