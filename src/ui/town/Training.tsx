/**
 * Picking a first class and placing training points (M9.10, DESIGN.md §11
 * "M9.10"): shared by recruit cards, porters ready to train and miners once
 * the camp is held. Rules live in src/sim/training.ts.
 */
import { useState } from "react";
import { STATS, type Stat, type StatBlock } from "../../content/types";
import {
  autoSpend,
  baseClasses,
  checkSpend,
  gatesWaived,
  openClasses,
  spent,
  type Spend,
} from "../../sim/training";
import { bestClass } from "../../sim/hero";
import { Icon } from "../art/Icon";
import { ix } from "../game";

/** The class picked and where the points go; the points reset when the class changes. */
export function useTraining(stats: StatBlock) {
  const fit = bestClass(ix, stats);
  const [classId, setClass] = useState(fit);
  const [spend, setSpend] = useState<Spend>(() => autoSpend(ix, stats, fit));
  const pick = (id: string) => {
    setClass(id);
    setSpend(autoSpend(ix, stats, id));
  };
  const reset = () => setSpend(autoSpend(ix, stats, classId));
  const wrong = checkSpend(ix, stats, classId, spend);
  return { fit, classId, pick, spend, setSpend, reset, wrong };
}

export type Training = ReturnType<typeof useTraining>;

const gateWords = (classId: string) =>
  Object.entries(ix.cls(classId).gates ?? {})
    .map(([s, n]) => `${s} ${n}`)
    .join(" + ");

/** The four base classes as buttons; ones whose gates are out of reach are shut. */
export function ClassPicker({ stats, training: tr }: { stats: StatBlock; training: Training }) {
  const open = openClasses(ix, stats);
  return (
    <div className="recruit-classes" role="group" aria-label="Train as">
      <span className="small muted">Train as</span>
      {baseClasses(ix).map((c) => {
        const ok = open.includes(c.id);
        const waived = ok && gatesWaived(ix, stats, c.id);
        return (
          <button
            key={c.id}
            type="button"
            className={`btn small${c.id === tr.classId ? " btn-on" : ""}`}
            aria-pressed={c.id === tr.classId}
            disabled={!ok}
            title={`${c.blurb} Needs ${gateWords(c.id)} after training.${
              !ok ? " Out of reach with their stats." : ""
            }${waived ? " Out of reach, but nothing else is either, so they can try." : ""}${
              c.id === tr.fit ? " Their best fit." : ""
            }`}
            onClick={() => tr.pick(c.id)}
          >
            <Icon icon={c.icon} name={c.name} size={18} /> {c.name}
            {c.id === tr.fit ? " ★" : ""}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The seven stats with − / + to place training points, the class's gates
 * marked, and how many points are left.
 */
export function PointsGrid({
  stats,
  training: tr,
  shown,
}: {
  stats: StatBlock;
  training: Training;
  /** What each stat reads after training, with gear (defaults to own + points). */
  shown?: StatBlock;
}) {
  const { points, maxPerStat } = ix.lib.town.training;
  const left = points - spent(tr.spend);
  const gates = ix.cls(tr.classId).gates ?? {};
  const waived = gatesWaived(ix, stats, tr.classId);
  const bump = (s: Stat, d: number) => {
    const n = (tr.spend[s] ?? 0) + d;
    const next = { ...tr.spend };
    if (n) next[s] = n;
    else delete next[s];
    tr.setSpend(next);
  };
  return (
    <div className="training">
      <p className="small quiet training-head">
        <span>
          Training points: <strong>{left}</strong> of {points} left
          <span className="muted"> · up to +{maxPerStat} a stat</span>
        </span>
        <button type="button" className="link small" onClick={tr.reset}>
          Reset
        </button>
      </p>
      <dl className="stat-grid training-grid">
        {STATS.map((s) => {
          const add = tr.spend[s] ?? 0;
          const now = stats[s] + add;
          const gate = gates[s];
          const met = gate === undefined || now >= gate || waived;
          return (
            <div
              key={s}
              className={gate === undefined ? "" : met ? "gate met" : "gate short"}
              title={[
                `${stats[s]} their own`,
                add ? `+${add} from training` : "",
                gate !== undefined
                  ? `the ${ix.cls(tr.classId).name} needs ${gate}${waived ? " (waived)" : ""}`
                  : "",
              ]
                .filter(Boolean)
                .join(", ")}
            >
              <dt>
                {s}
                {gate !== undefined ? <span className="gate-mark"> ≥{gate}</span> : null}
              </dt>
              <dd>
                {shown ? shown[s] : now}
                {add ? <sup className="up">+{add}</sup> : null}
              </dd>
              <dd className="steppers">
                <button
                  type="button"
                  aria-label={`Take a point off ${s}`}
                  disabled={!add}
                  onClick={() => bump(s, -1)}
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label={`Put a point on ${s}`}
                  disabled={!left || add >= maxPerStat || now >= 20}
                  onClick={() => bump(s, 1)}
                >
                  +
                </button>
              </dd>
            </div>
          );
        })}
      </dl>
      {tr.wrong ? <p className="small warn quiet">{tr.wrong}</p> : null}
    </div>
  );
}
