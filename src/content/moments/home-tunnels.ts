import { defineMoment } from "../types";

export default defineMoment({
  id: "home-tunnels",
  name: "Home tunnels",
  tags: ["camp-born"],
  floors: [1, 1],
  on: { kind: "floor" },
  chance: 0.25,
  once: false,
  text: "{hero} grew up playing in these tunnels, and leads the way like it's the walk home.",
  effects: [{ type: "morale", amount: 2, reason: "walked the tunnels they grew up in" }],
});
