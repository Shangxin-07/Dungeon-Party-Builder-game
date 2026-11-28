/**
 * The tutorial's checks (content/tutorial.ts names them) and which step to
 * show. Pure: reads the town, never changes it.
 */
import { tutorialSteps, type TutorialCheck, type TutorialStep } from "../../content/tutorial";
import type { Index } from "../../sim/library";
import { inCampClass } from "../../sim/hero";
import { awaySet, type TownState } from "../../sim/town";

export const tutorialChecks: Record<TutorialCheck, (ix: Index, t: TownState) => boolean> = {
  camp: (_, t) => !!t.camp,
  posted: (_, t) => {
    const away = awaySet(t);
    const home = t.roster.filter((h) => !away.has(h.id)).length;
    const posted = new Set(Object.values(t.posts).flat()).size;
    return posted >= Math.min(3, home);
  },
  dayPassed: (_, t) => t.day >= 2,
  campHeld: (_, t) => !t.camp,
  minersLeft: (ix, t) => !t.camp && t.roster.some((h) => !h.porter && inCampClass(ix, h)),
  trained: (ix, t) => t.roster.some((h) => !h.porter && !inCampClass(ix, h)),
  freeHires: (_, t) => t.freeHires > 0,
  hasHeroes: (_, t) => t.roster.filter((h) => !h.porter).length >= 3,
  // Two or more heroes, or everyone who can go if fewer can (M9.21, #117):
  // miners still need a class, porters go with a party but don't count.
  partyPicked: (ix, t) => {
    const away = awaySet(t);
    const able = t.roster.filter((h) => !h.porter && !away.has(h.id) && !inCampClass(ix, h));
    return t.party.length >= 1 && t.party.length >= Math.min(2, able.length);
  },
  sent: (_, t) => t.outings.length > 0 || t.trips.length > 0,
  back: (_, t) => t.trips.length > 0,
};

/** Whether `step` still has something to show for this town. */
export function stepWanted(ix: Index, t: TownState, step: TutorialStep): boolean {
  const holds = (c: TutorialCheck) => tutorialChecks[c](ix, t);
  if (step.only && !holds(step.only)) return false;
  if (step.unless && holds(step.unless)) return false;
  if (step.until && holds(step.until)) return false;
  return true;
}

/**
 * The step to show, starting from `from` (an index into the steps): the first
 * one there or after that still applies. Steps.length when the tour is over.
 */
export function currentStep(
  ix: Index,
  t: TownState,
  from: number,
  steps: readonly TutorialStep[] = tutorialSteps,
): number {
  let i = Math.max(0, from);
  while (i < steps.length && !stepWanted(ix, t, steps[i]!)) i++;
  return i;
}
