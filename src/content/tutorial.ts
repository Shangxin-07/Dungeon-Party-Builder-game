/**
 * The first-delve tutorial (M9.14): short callouts that walk a new player from
 * the mining camp to their first party's debrief. Edit the words here freely.
 *
 * Each step outlines part of the town screen and says what it's for.
 * - `fold`: the panel to open first (it also switches to that panel's tab).
 * - `target`: a CSS selector for what to outline (the first match that's on
 *   screen); without one, the panel itself, and without either, the callout
 *   sits in the middle of the screen.
 * - `until`: the step moves on by itself once this holds (the player does the
 *   thing). Without it the callout has a Next button.
 * - `only` / `unless`: when the step is reached, it's skipped unless / if this
 *   holds (e.g. the camp steps, for a game that skipped the opening).
 *
 * The checks are named here and worked out in src/ui/tutorial/checks.ts.
 * Progress is kept in this browser (never in the save).
 */

export type TutorialCheck =
  /** The guild is still holding the mining camp. */
  | "camp"
  /** At least three heroes (or everyone at home, if fewer) are on posts. */
  | "posted"
  /** A day has passed since the game began. */
  | "dayPassed"
  /** The camp is held: delving is open. */
  | "campHeld"
  /** Someone on the roster is still a miner, waiting to pick a class. */
  | "minersLeft"
  /** Someone on the roster has a real class (not a miner, not a porter). */
  | "trained"
  /** First heroes sign for nothing (a game that skipped the opening). */
  | "freeHires"
  /** At least three heroes on the roster. */
  | "hasHeroes"
  /** Two or more heroes in the next party. */
  | "partyPicked"
  /** A party has gone down (or come back already). */
  | "sent"
  /** A party has come back and there's a debrief to read. */
  | "back";

export type TutorialStep = {
  id: string;
  title: string;
  text: string;
  fold?: string;
  target?: string;
  until?: TutorialCheck;
  only?: TutorialCheck;
  unless?: TutorialCheck;
  /** What the player still has to do, shown while `until` doesn't hold yet. */
  todo?: string;
};

export const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to the guild",
    text: "You run a guild of dungeon delvers. You hire heroes, kit them out and send them into the pit. Once they're down there, you can only watch. This short tour gets you to your first delve.",
  },
  {
    id: "camp",
    only: "camp",
    fold: "camp",
    title: "The mining camp",
    text: "The miners dug too deep, and monsters climb out every night. Nobody can go down until the camp is held: build the Guild Hall and the Palisade listed here.",
  },
  {
    id: "townbar",
    target: ".townbar",
    title: "The town bar",
    text: "The day, your gold, the pit's defence and the materials in store. Point at anything to learn more.",
  },
  {
    id: "posts",
    only: "camp",
    fold: "posts",
    title: "Man the posts",
    text: "Put your miners to work. The barricade holds back the night's climb, salvage brings timber, and the seam pays gold.",
    until: "posted",
    todo: "Put three people on posts with the drop-downs.",
  },
  {
    id: "next-day",
    only: "camp",
    target: ".next-day",
    title: "Let a day pass",
    text: "Time only moves when you say so. Overnight, monsters climb out and your posts fight them off.",
    until: "dayPassed",
    todo: "Press Next day.",
  },
  {
    id: "news",
    only: "camp",
    target: ".news-strip",
    title: "What happened",
    text: "The news strip shows what happened overnight and anything waiting on you. Red is bad news, green is good. All news has the full story.",
  },
  {
    id: "build",
    only: "camp",
    fold: "buildings",
    title: "Build the camp up",
    text: "Build the Guild Hall once you have 6 timber, then the Palisade. Keep pressing Next day while the posts gather. Short on timber? The miners swap ore for it in the camp panel.",
    until: "campHeld",
    todo: "Build the Guild Hall and the Palisade.",
  },
  {
    id: "camp-held",
    only: "minersLeft",
    fold: "roster",
    target: "#roster-body .train-box",
    title: "Train your miners",
    text: "The camp is held! Each miner now picks a class. Spend their training points on stats: a class opens once its main stat is 14 or more and its second is 12 or more.",
    until: "trained",
    todo: "Train at least one miner.",
  },
  {
    id: "first-hires",
    only: "freeHires",
    fold: "recruits",
    title: "Your first heroes",
    text: "These recruits sign for nothing. Pick each one's class and spend their training points, then hire them.",
    until: "hasHeroes",
    todo: "Hire three heroes.",
  },
  {
    id: "recruits",
    unless: "freeHires",
    fold: "recruits",
    title: "More heroes",
    text: "New recruits turn up here most days. They come untrained, so you pick their class and points when you hire.",
  },
  {
    id: "gear",
    fold: "roster",
    target: "#roster-body .hero-card",
    title: "Gear up",
    text: "Click a hero's name to open their sheet, then press Kit out. It fills in their class's usual kit from the store room first.",
  },
  {
    id: "party",
    fold: "roster",
    target: "#roster-body .hero-card .hero-actions",
    title: "Pick the party",
    text: "Add heroes to the party and set each one's row. Fighters go in front, archers and casters at the back.",
    until: "partyPicked",
    todo: "Add two or more heroes to the party.",
  },
  {
    id: "orders",
    fold: "party",
    target: ".party-orders",
    title: "Give orders",
    text: "Orders are all you can tell them once they're gone: which floor, when to turn back, and what loot to carry. Floor 1 is right for a first trip.",
  },
  {
    id: "send",
    fold: "party",
    target: "[aria-labelledby='party-heading'] .fold-actions",
    title: "Send them down",
    text: "When you're happy, send them. From here it's out of your hands.",
    until: "sent",
    todo: "Press Send them down.",
  },
  {
    id: "away",
    unless: "back",
    fold: "away",
    target: ".next-day",
    title: "Wait for news",
    text: "The party is below. Their trip takes a few days: press Next day until they're back. Down below shows how long they've been gone.",
    until: "back",
    todo: "Press Next day until they're home.",
  },
  {
    id: "debrief",
    fold: "back",
    target: ".debrief",
    title: "The debrief",
    text: "They're back! See who was hurt, what they found, and watch the whole trip play out. That's the loop: gear up, send down, learn, repeat. Good luck!",
  },
];
