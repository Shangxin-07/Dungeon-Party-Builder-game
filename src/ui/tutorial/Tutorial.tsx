/**
 * The first-delve tutorial (M9.14): a glowing outline round part of the town
 * screen and a callout beside it, one step at a time (content/tutorial.ts).
 * It never blocks the screen: everything stays clickable, and the callout can
 * be tucked away to a small tab while a long step (like building) plays out.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { tutorialSteps, type TutorialStep } from "../../content/tutorial";
import type { TownState } from "../../sim/town";
import { openFold } from "../Fold";
import { ix } from "../game";
import { currentStep, tutorialChecks } from "./checks";
import {
  loadProgress,
  onRestartTutorial,
  progressFor,
  saveProgress,
  type TutorialProgress,
} from "./progress";

type Box = { top: number; left: number; width: number; height: number };

const PAD = 6;
const GAP = 12;
const WIDTH = 340;
/** Narrower than this, the callout docks to the bottom of the screen. */
const PHONE = 700;

/** The element a step outlines: the first match that's actually on screen. */
function findTarget(step: TutorialStep): HTMLElement | undefined {
  const sel = step.target ?? (step.fold ? `[aria-labelledby='${step.fold}-heading']` : undefined);
  if (!sel) return undefined;
  for (const el of document.querySelectorAll<HTMLElement>(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return undefined;
}

/**
 * The part of `el` that can be seen: cut to any scrolling pane it sits in and
 * to the window, so a tall panel's outline doesn't spill over its neighbours.
 */
function visibleBox(el: HTMLElement): Box | undefined {
  const r = el.getBoundingClientRect();
  let top = Math.max(r.top, 0);
  let left = Math.max(r.left, 0);
  let bottom = Math.min(r.bottom, window.innerHeight);
  let right = Math.min(r.right, window.innerWidth);
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if (o !== "auto" && o !== "scroll" && o !== "hidden") continue;
    const c = p.getBoundingClientRect();
    top = Math.max(top, c.top);
    left = Math.max(left, c.left);
    bottom = Math.min(bottom, c.bottom);
    right = Math.min(right, c.right);
  }
  if (bottom - top < 4 || right - left < 4) return undefined;
  return { top, left, width: right - left, height: bottom - top };
}

const sameBox = (a?: Box, b?: Box) =>
  a === b ||
  (!!a &&
    !!b &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height);

/**
 * Where the callout goes: beside a target in a side pane, else below it if it
 * fits, else above, else pinned to the bottom of the screen.
 */
function placeCallout(box: Box | undefined, height: number): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < PHONE) return { left: 8, right: 8, bottom: 8 };
  if (!box) return { left: Math.max(8, (vw - WIDTH) / 2), top: Math.max(8, vh / 2 - height / 2) };
  const top = Math.min(Math.max(8, box.top), vh - height - 8);
  if (box.width < vw / 2) {
    if (box.left + box.width + PAD + GAP + WIDTH < vw - 8)
      return { left: box.left + box.width + PAD + GAP, top };
    if (box.left - PAD - GAP - WIDTH > 8) return { left: box.left - PAD - GAP - WIDTH, top };
  }
  const left = Math.min(Math.max(8, box.left), vw - WIDTH - 8);
  const below = box.top + box.height + PAD + GAP;
  if (below + height < vh - 8) return { left, top: below };
  const above = box.top - PAD - GAP - height;
  if (above > 8) return { left, top: above };
  return { left, bottom: 8 };
}

export function Tutorial({ town }: { town: TownState }) {
  const [stored, setStored] = useState(loadProgress);
  useEffect(() => onRestartTutorial(() => setStored(loadProgress())), []);
  const progress = progressFor(stored, town);
  const index = progress && !progress.off ? currentStep(ix, town, progress.step) : undefined;
  const step = index === undefined ? undefined : tutorialSteps[index];

  const save = (p: TutorialProgress) => {
    saveProgress(p);
    setStored(p);
  };
  // Keep what's stored in step with what's shown (new game, steps done, the end).
  useEffect(() => {
    if (!progress) return;
    const want: TutorialProgress =
      index === undefined
        ? progress
        : index >= tutorialSteps.length
          ? { ...progress, step: 0, off: true }
          : { ...progress, step: index };
    if (
      !stored ||
      want.step !== stored.step ||
      want.off !== stored.off ||
      want.seed !== stored.seed
    )
      save(want);
  });

  const [tucked, setTucked] = useState(false);
  // Each new step: open its panel (switching tab) and bring its target into view.
  useEffect(() => {
    if (!step) return;
    setTucked(false);
    if (step.fold) openFold(step.fold);
    let tries = 0;
    let frame = requestAnimationFrame(function look() {
      const el = findTarget(step);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      else if (tries++ < 20) frame = requestAnimationFrame(look);
    });
    return () => cancelAnimationFrame(frame);
  }, [step?.id]);

  // Follow the target as the page scrolls, resizes and redraws.
  const [box, setBox] = useState<Box>();
  const boxRef = useRef<Box>(undefined);
  useEffect(() => {
    if (!step) return;
    let frame = 0;
    const tick = () => {
      const el = findTarget(step);
      const next = el ? visibleBox(el) : undefined;
      if (!sameBox(next, boxRef.current)) {
        boxRef.current = next;
        setBox(next);
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [step?.id]);

  const calloutRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(180);
  useLayoutEffect(() => {
    const h = calloutRef.current?.offsetHeight;
    if (h && h !== height) setHeight(h);
  });

  if (!progress || !step || index === undefined) return null;
  const waiting = step.until && !tutorialChecks[step.until](ix, town);
  const last = index === tutorialSteps.length - 1;
  const next = () => save({ ...progress, step: index + 1 });
  const off = () => save({ ...progress, off: true });

  if (tucked)
    return (
      <button
        type="button"
        className="tut-tab"
        title="Show the tutorial"
        onClick={() => setTucked(false)}
      >
        Tutorial: <strong>{step.title}</strong>
        {waiting && step.todo ? <span className="muted"> · {step.todo}</span> : null}
      </button>
    );

  return (
    <>
      {box ? (
        <div
          className="tut-ring"
          aria-hidden="true"
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
          }}
        />
      ) : null}
      <div
        ref={calloutRef}
        className="tut-callout"
        role="dialog"
        aria-label={`Tutorial: ${step.title}`}
        style={placeCallout(box, height)}
      >
        <div className="tut-head">
          <strong>{step.title}</strong>
          <button
            type="button"
            className="link small"
            title="Tuck the tutorial away for now"
            onClick={() => setTucked(true)}
          >
            Hide
          </button>
        </div>
        <p>{step.text}</p>
        {waiting && step.todo ? <p className="tut-todo">{step.todo}</p> : null}
        <div className="tut-buttons">
          {waiting ? (
            <button type="button" className="btn" onClick={next}>
              Skip step
            </button>
          ) : (
            <button type="button" className="btn btn-main" onClick={next}>
              {last ? "Finish" : "Next"}
            </button>
          )}
          <button type="button" className="link small" onClick={off}>
            Turn off tutorial
          </button>
        </div>
      </div>
    </>
  );
}
