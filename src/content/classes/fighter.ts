import { defineClass } from "../types";

export default defineClass({
  id: "fighter",
  name: "Fighter",
  blurb: "Front row. Soaks up hits so the others don't have to.",
  mainStats: ["STR", "END"],
  likes: ["sword", "axe", "shield"],
});
