/**
 * Where the tutorial is, kept in this browser only (never in the save), like
 * the other dpb-ui-* settings. A brand new game starts it unless it was
 * turned off; the Tutorial button in the masthead starts it again.
 */
const KEY = "dpb-ui-tutorial";
const RESTART = "dpb-tutorial-restart";

export type TutorialProgress = {
  /** Index of the step reached. */
  step: number;
  /** Turned off (or finished): stays hidden until restarted. */
  off: boolean;
  /** The seed of the game it was on: a new game on day 1 starts it over. */
  seed?: number;
};

/** What's stored, or nothing if this browser has never seen the tutorial. */
export function loadProgress(): TutorialProgress | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const p = JSON.parse(raw) as Partial<TutorialProgress>;
    return {
      step: Number(p.step) || 0,
      off: !!p.off,
      ...(typeof p.seed === "number" ? { seed: p.seed } : {}),
    };
  } catch {
    return undefined;
  }
}

export function saveProgress(p: TutorialProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Private windows: the tutorial just starts over next visit.
  }
}

/** Start the tutorial again from the top (the masthead's Tutorial button). */
export function restartTutorial() {
  saveProgress({ step: 0, off: false });
  window.dispatchEvent(new Event(RESTART));
}

export function onRestartTutorial(f: () => void): () => void {
  window.addEventListener(RESTART, f);
  return () => window.removeEventListener(RESTART, f);
}

/**
 * The progress to use for this game: a brand new game (day 1) starts the
 * tour unless it was turned off; an older game only shows it once restarted.
 * Undefined means nothing to show and nothing to save yet.
 */
export function progressFor(
  stored: TutorialProgress | undefined,
  town: { seed: number; day: number },
): TutorialProgress | undefined {
  if (!stored) return town.day === 1 ? { step: 0, off: false, seed: town.seed } : undefined;
  if (stored.off) return stored;
  if (stored.seed !== undefined && stored.seed !== town.seed && town.day === 1)
    return { step: 0, off: false, seed: town.seed };
  return stored.seed === town.seed ? stored : { ...stored, seed: town.seed };
}
