import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { tutorialSteps } from "../content/tutorial";
import { indexLibrary } from "../sim/library";
import { autoStart, newTown, type TownState } from "../sim/town";
import { FOLD_TAB } from "./town/needs";
import { currentStep } from "./tutorial/checks";
import { progressFor } from "./tutorial/progress";

const ix = indexLibrary(library);
const at = (t: TownState, from = 0) => tutorialSteps[currentStep(ix, t, from)]?.id;
const indexOf = (id: string) => tutorialSteps.findIndex((s) => s.id === id);

describe("the first-delve tutorial", () => {
  it("has unique steps, each panel one the town screen can open", () => {
    const ids = tutorialSteps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of tutorialSteps) {
      if (s.fold && s.fold !== "posts") expect(FOLD_TAB[s.fold], s.id).toBeDefined();
      if (s.until) expect(s.todo, `${s.id} says what to do`).toBeTruthy();
    }
  });

  it("walks the camp, and moves on as the player does each thing", () => {
    let t = newTown(ix, heroNames, 1, { camp: true });
    expect(at(t)).toBe("welcome");
    expect(at(t, indexOf("posts"))).toBe("posts");
    const [a, b, c] = t.roster;
    t = { ...t, posts: { barricade: [a!.id], salvage: [b!.id, c!.id] } };
    expect(at(t, indexOf("posts"))).toBe("next-day");
    t = { ...t, day: 2 };
    expect(at(t, indexOf("next-day"))).toBe("news");
    expect(at(t, indexOf("build"))).toBe("build");
  });

  it("skips the camp steps for a game that skipped the opening", () => {
    const t = newTown(ix, heroNames, 1);
    expect(at(t, 1)).toBe("townbar");
    expect(at(t, indexOf("townbar") + 1)).toBe("first-hires");
    const hired = autoStart(ix, t);
    expect(at(hired, indexOf("townbar") + 1)).toBe("recruits");
    const sent = { ...hired, trips: [{} as TownState["trips"][number]] };
    expect(at(sent, indexOf("send"))).toBe("debrief");
    expect(currentStep(ix, sent, tutorialSteps.length)).toBe(tutorialSteps.length);
  });

  it("finishes Pick the party once everyone who can go is in (#117)", () => {
    const t = autoStart(ix, newTown(ix, heroNames, 1));
    const [a, b] = t.roster.filter((h) => !h.porter);
    const step = indexOf("party");
    expect(at({ ...t, party: [] }, step)).toBe("party");
    expect(at({ ...t, party: [a!.id] }, step)).toBe("party");
    expect(at({ ...t, party: [a!.id, b!.id] }, step)).toBe("orders");
    // Only one hero left who can go: one is enough.
    const alone = {
      ...t,
      roster: t.roster.filter((h) => h.id === a!.id || h.porter),
      party: [a!.id],
    };
    expect(at(alone, step)).toBe("orders");
  });

  it("starts on a new game, not an old one, and never once turned off", () => {
    expect(progressFor(undefined, { seed: 5, day: 1 })).toEqual({ step: 0, off: false, seed: 5 });
    expect(progressFor(undefined, { seed: 5, day: 30 })).toBeUndefined();
    const mid = { step: 6, off: false, seed: 5 };
    expect(progressFor(mid, { seed: 5, day: 4 })).toBe(mid);
    expect(progressFor(mid, { seed: 9, day: 1 })).toEqual({ step: 0, off: false, seed: 9 });
    const off = { step: 0, off: true, seed: 5 };
    expect(progressFor(off, { seed: 9, day: 1 })).toBe(off);
    // Restarted from the masthead on an old game: picks it up there.
    expect(progressFor({ step: 0, off: false }, { seed: 5, day: 30 })).toEqual({
      step: 0,
      off: false,
      seed: 5,
    });
  });
});
