import { useEffect, useMemo, useRef, useState } from "react";
import { heroNames, library } from "../content";
import {
  foeSheet,
  runCombat,
  type CombatEvent,
  type CombatResult,
  type FoeSheet,
  type Side,
} from "../sim/combat";
import { rollEncounter } from "../sim/encounter";
import { createStarterParty } from "../sim/hero";
import { indexLibrary } from "../sim/library";
import { createRng } from "../sim/rng";
import { FoeCard } from "./Watch";

const ix = indexLibrary(library);
const STEP_MS = 280;

interface Bar {
  uid: string;
  name: string;
  side: Side;
  hp: number;
  max: number;
  state: "up" | "downed" | "dead";
  sheet?: FoeSheet;
}

function simulate(floor: number, seed: number): CombatResult & { start: Map<string, number> } {
  const rng = createRng(seed);
  const party = createStarterParty(ix, heroNames, rng);
  const monsters = rollEncounter(ix, floor, rng);
  const result = runCombat(ix, party, monsters, { seed });
  return { ...result, start: new Map(party.map((h) => [h.id, h.hp])) };
}

/** HP bars as they stood after the first `shown` log lines. */
function barsAt(result: ReturnType<typeof simulate>, shown: number): Bar[] {
  const summoned = new Set(result.log.filter((e) => e.kind === "summon").map((e) => e.target));
  const bars = new Map<string, Bar>();
  for (const f of result.fighters) {
    if (summoned.has(f.uid)) continue;
    const hp = result.start.get(f.uid) ?? f.derived.maxHp;
    bars.set(f.uid, {
      uid: f.uid,
      name: f.name,
      side: f.side,
      hp,
      max: f.derived.maxHp,
      state: "up",
      sheet: f.side === "monsters" ? foeSheet(f) : undefined,
    });
  }
  for (const e of result.log.slice(0, shown)) {
    if (e.kind === "summon" && e.target) {
      const f = result.fighters.find((x) => x.uid === e.target)!;
      bars.set(f.uid, {
        uid: f.uid,
        name: f.name,
        side: f.side,
        hp: f.derived.maxHp,
        max: f.derived.maxHp,
        state: "up",
        sheet: foeSheet(f),
      });
    }
    const bar = e.hp && bars.get(e.hp.uid);
    if (bar && e.hp) bar.hp = e.hp.hp;
    const target = e.target ? bars.get(e.target) : undefined;
    if (target) {
      if (e.kind === "downed") target.state = "downed";
      if (e.kind === "killed" || e.kind === "died") target.state = "dead";
      if (e.kind === "revived") target.state = "up";
    }
  }
  return [...bars.values()];
}

function HpBar({ bar }: { bar: Bar }) {
  const pct = Math.round((bar.hp / bar.max) * 100);
  return (
    <li className={`hp hp-${bar.state}`}>
      <span className="hp-name">{bar.name}</span>
      <span className="hp-track" aria-hidden="true">
        <span className="hp-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="hp-num">
        {bar.state === "dead" ? "dead" : bar.state === "downed" ? "down" : `${bar.hp}/${bar.max}`}
      </span>
    </li>
  );
}

function Line({ e }: { e: CombatEvent }) {
  if (e.kind === "round") return <li className="log-round">{e.text}</li>;
  return <li className={`log-${e.kind}`}>{e.text}</li>;
}

export function TestFight() {
  const [floor, setFloor] = useState(1);
  const [seed, setSeed] = useState(1);
  const result = useMemo(() => simulate(floor, seed), [floor, seed]);
  const [shown, setShown] = useState(0);

  useEffect(() => setShown(0), [result]);
  useEffect(() => {
    if (shown >= result.log.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [shown, result]);

  // Keep the newest line in view while the fight plays.
  const logRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown]);

  const bars = barsAt(result, shown);
  const done = shown >= result.log.length;

  return (
    <section aria-labelledby="fight-heading" className="fight">
      <h2 id="fight-heading">Watch a test fight</h2>
      <p className="muted">
        A fresh party of three meets one random group of monsters. Every fight comes from a seed, so
        the same seed always plays out the same way.
      </p>
      <div className="controls">
        <label>
          Floor{" "}
          <select value={floor} onChange={(e) => setFloor(Number(e.target.value))}>
            {[1, 2, 3].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seed{" "}
          <input
            type="number"
            min={0}
            value={seed}
            onChange={(e) => setSeed(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <button type="button" onClick={() => setSeed((s) => s + 1)}>
          New fight
        </button>
        <button type="button" onClick={() => setShown(done ? 0 : result.log.length)}>
          {done ? "Replay" : "Skip to end"}
        </button>
      </div>

      <div className="sides">
        {(["party", "monsters"] as const).map((side) => (
          <ul
            key={side}
            className={side === "party" ? "bars" : "bars heroes foes"}
            aria-label={side === "party" ? "Party" : "Monsters"}
          >
            {bars
              .filter((b) => b.side === side)
              .map((b) =>
                side === "party" ? <HpBar key={b.uid} bar={b} /> : <FoeCard key={b.uid} bar={b} />,
              )}
          </ul>
        ))}
      </div>

      <ol className="log" aria-live="polite" ref={logRef}>
        {result.log.slice(0, shown).map((e, i) => (
          <Line key={i} e={e} />
        ))}
      </ol>
    </section>
  );
}
