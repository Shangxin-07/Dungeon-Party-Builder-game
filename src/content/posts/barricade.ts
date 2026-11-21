import { definePost } from "../types";

// Carts, ore tubs and planks piled round the pit's edge, and someone behind them.
export default definePost({
  id: "barricade",
  name: "The barricade",
  blurb:
    "Hold the pit's edge behind piled carts and planks. Each hero holds back 2 strength a night.",
  slots: 3,
  effects: [{ type: "defence", amount: 2 }],
});
