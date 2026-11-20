/**
 * Watching a trip: the log player, HP bars, hero stat sheets and the results
 * card. Used by the town's watch screen and by the sandbox expedition demo.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DERIVED, STATS, type Derived } from "../content/types";
import type { ExpeditionEvent, ExpeditionResult } from "../sim/expedition";
import { heroSheet, type Hero } from "../sim/hero";
import { ix } from "./game";

export const SPEEDS = { slow: 450, normal: 200, fast: 40 } as const;
export type Speed = keyof typeof SPEEDS;

export const DERIVED_LABELS: Record<Derived, string> = {
  maxHp: "HP",
  mana: "Mana",
  attack: "Attack",
  accuracy: "Accuracy",
  evasion: "Evasion",
  initiative: "Initiative",
  spellPower: "Spell power",
  resist: "Resist",
  armor: "Armour",
  carrySlots: "Carry",
};

interface Bar {
  uid: string;
  name: string;
  hp: number;
  max: number;
  mana?: number;
  maxMana?: number;
  state: "up" | "downed" | "dead";
}

/** Party and monster bars, and where the party is, after the first `shown` log lines. */
function stateAt(log: readonly ExpeditionEvent[], shown: number) {
  const party = new Map<string, Bar>();
  let monsters: Map<string, Bar> | null = null;
  let where = "In town";
  for (const e of log.slice(0, shown)) {
    if (e.party) {
      for (const p of e.party) {
        party.set(p.uid, {
          uid: p.uid,
          name: p.name,
          hp: p.hp,
          max: p.maxHp,
          mana: p.mana,
          maxMana: p.maxMana,
          state: p.condition === "ok" ? "up" : p.condition,
        });
      }
    }
    if (e.kind === "room" || e.kind === "wander" || e.kind === "home") monsters = null;
    if (e.kind === "room") where = `Floor ${e.floor}, room ${e.room}`;
    if (e.kind === "wander") where = `Climbing back up through floor ${e.floor}`;
    if (e.kind === "home") where = "Back in town";
    if (e.kind === "raid") where = "At the edge of the pit";
    if (e.kind === "fight" && e.monsters) {
      monsters = new Map(e.monsters.map((m) => [m.uid, { ...m, state: "up" as const }]));
    }
    const c = e.combat;
    if (!c) continue;
    if (c.kind === "summon" && c.hp && monsters) {
      monsters.set(c.hp.uid, {
        uid: c.hp.uid,
        name: c.name ?? "Something",
        hp: c.hp.hp,
        max: c.hp.max,
        state: "up",
      });
    }
    const bars = (uid: string) => party.get(uid) ?? monsters?.get(uid);
    if (c.hp) {
      const bar = bars(c.hp.uid);
      if (bar) bar.hp = c.hp.hp;
    }
    const target = c.target ? bars(c.target) : undefined;
    if (target) {
      if (c.kind === "downed") target.state = "downed";
      if (c.kind === "killed" || c.kind === "died") target.state = "dead";
      if (c.kind === "revived") target.state = "up";
    }
  }
  return { party: [...party.values()], monsters: monsters ? [...monsters.values()] : null, where };
}

function HpBar({ bar }: { bar: Bar }) {
  const pct = Math.round((bar.hp / bar.max) * 100);
  const manaPct = bar.maxMana ? Math.round(((bar.mana ?? 0) / bar.maxMana) * 100) : 0;
  return (
    <div className={`hp hp-${bar.state}`}>
      <span className="hp-name">{bar.name}</span>
      <span className="hp-tracks" aria-hidden="true">
        <span className="hp-track">
          <span className="hp-fill" style={{ width: `${pct}%` }} />
        </span>
        {bar.maxMana ? (
          <span className="hp-track mana-track">
            <span className="mana-fill" style={{ width: `${manaPct}%` }} />
          </span>
        ) : null}
      </span>
      <span className="hp-num">
        {bar.state === "dead" ? "dead" : bar.state === "downed" ? "down" : `${bar.hp}/${bar.max}`}
      </span>
    </div>
  );
}

/** A hero's HP and mana as bars, outside of a trip. */
export function HeroBars({ hero }: { hero: Hero }) {
  const d = heroSheet(ix, hero).derived;
  return (
    <HpBar
      bar={{
        uid: hero.id,
        name: hero.name,
        hp: hero.hp,
        max: d.maxHp,
        mana: usesMana(hero) ? hero.mana : undefined,
        maxMana: usesMana(hero) ? d.mana : undefined,
        state: hero.condition === "ok" ? "up" : hero.condition,
      }}
    />
  );
}

/** Only heroes with spells that cost mana get a mana bar. */
export const usesMana = (hero: Hero) =>
  ix.cls(hero.classId).abilities.some((id) => (ix.ability(id).cost ?? 0) > 0);

/** The 7 stats, then the secondary stats and skills if `full`. */
export function StatSheet({ hero, full = false }: { hero: Hero; full?: boolean }) {
  const sheet = heroSheet(ix, hero);
  const base = hero.stats;
  return (
    <>
      <dl className="stat-grid">
        {STATS.map((s) => {
          const diff = sheet.stats[s] - base[s];
          return (
            <div
              key={s}
              title={
                diff
                  ? `${base[s]} base, ${diff > 0 ? "+" : ""}${diff} from gear and perks`
                  : undefined
              }
            >
              <dt>{s}</dt>
              <dd>
                {sheet.stats[s]}
                {diff ? (
                  <sup className={diff > 0 ? "up" : "down"}>{diff > 0 ? "+" : "−"}</sup>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>
      {full ? (
        <dl className="derived-grid">
          {DERIVED.filter((d) => d !== "mana" || usesMana(hero)).map((d) => (
            <div key={d}>
              <dt>{DERIVED_LABELS[d]}</dt>
              <dd>{sheet.derived[d]}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="skills">
        {ix.lib.skills.map((s) => (
          <span key={s.id} title={s.description}>
            {s.name} <strong>{sheet.skills[s.id]}</strong>
          </span>
        ))}
      </p>
    </>
  );
}

/** A hero's bars plus their stat sheet, as seen while watching. */
function WatchCard({ hero, bar: raw }: { hero: Hero; bar?: Bar }) {
  const bar = raw && !usesMana(hero) ? { ...raw, mana: undefined, maxMana: undefined } : raw;
  return (
    <li className="hero">
      {bar ? <HpBar bar={bar} /> : null}
      <p className="hero-class">
        {ix.cls(hero.classId).name}, level {hero.level}, {hero.row} row
        {hero.morale !== undefined ? <span className="muted"> · morale {hero.morale}</span> : null}
        {bar?.maxMana ? (
          <span className="muted">
            {" "}
            · mana {bar.mana}/{bar.maxMana}
          </span>
        ) : null}
      </p>
      <StatSheet hero={hero} />
    </li>
  );
}

function Line({ e }: { e: ExpeditionEvent }) {
  if (e.kind === "floor") return <li className="log-floor">{e.text}</li>;
  if (e.kind === "room")
    return (
      <li className="log-room">
        <span className="log-where">Room {e.room}</span> {e.text}
      </li>
    );
  if (e.kind === "combat") {
    const k = e.combat?.kind ?? "action";
    if (k === "round") return <li className="log-combat log-round-small">{e.text}</li>;
    return <li className={`log-combat log-${k}`}>{e.text}</li>;
  }
  return <li className={`log-x-${e.kind}`}>{e.text}</li>;
}

const OUTCOMES = {
  returned: "Back home, orders carried out",
  retreated: "Turned back early, as ordered",
  wiped: "The party fell",
} as const;

/** The trip summary: where they got to, who fell, and the haul guessed vs real. */
export function Results({ result, children }: { result: ExpeditionResult; children?: ReactNode }) {
  const r = result;
  const sold = r.haul.filter((h) => !h.keep);
  const kept = r.haul.filter((h) => h.keep);
  const real = sold.reduce((s, h) => s + h.value, 0);
  const guess = sold.reduce((s, h) => s + h.estimate, 0);
  const counts = new Map<string, { n: number; guess: number; real: number }>();
  for (const h of sold) {
    const c = counts.get(h.item) ?? { n: 0, guess: 0, real: 0 };
    counts.set(h.item, { n: c.n + 1, guess: c.guess + h.estimate, real: c.real + h.value });
  }
  const dead = r.party.filter((h) => h.condition === "dead").map((h) => h.name);
  return (
    <div className={`results results-${r.outcome}`}>
      <h3>{OUTCOMES[r.outcome]}</h3>
      <p>
        Reached floor {r.deepestFloor} in {r.days} {r.days === 1 ? "day" : "days"}, {r.roomsVisited}{" "}
        rooms, {r.kills.length} monsters killed.
        {dead.length ? ` Lost: ${dead.join(", ")}.` : " Nobody died."}
        {r.wipeSite
          ? ` They lie on floor ${r.wipeSite.floor}, ${r.wipeSite.room ? `room ${r.wipeSite.room}` : "on the way back up"}.`
          : ""}
        {r.disobeyed
          ? ` Orders were ignored ${r.disobeyed} ${r.disobeyed === 1 ? "time" : "times"}.`
          : ""}
      </p>
      {r.rescued?.length && r.outcome !== "wiped" ? (
        <p>Brought out alive: {r.rescued.map((h) => h.name).join(", ")}.</p>
      ) : null}
      {kept.length ? (
        <p>
          Heroes' gear recovered:{" "}
          {kept
            .map((h) => `${h.owner ? `${h.owner}'s ` : ""}${ix.item(h.item).name.toLowerCase()}`)
            .join(", ")}
          .
        </p>
      ) : null}
      {sold.length ? (
        <>
          <p>
            Haul: the party reckons it's worth about <strong>{guess}</strong> coins. It's really
            worth <strong>{real}</strong>.
          </p>
          <table className="haul">
            <thead>
              <tr>
                <th>Item</th>
                <th>Guessed</th>
                <th>Real</th>
              </tr>
            </thead>
            <tbody>
              {[...counts].map(([id, c]) => (
                <tr key={id}>
                  <td>
                    {ix.item(id).name}
                    {c.n > 1 ? ` ×${c.n}` : ""}
                  </td>
                  <td>{c.guess}</td>
                  <td>{c.real}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : kept.length ? null : r.leftBehind.length ? (
        <p>{r.leftBehind.length} items lie with them, waiting for a rescue party.</p>
      ) : (
        <p>They came back empty-handed.</p>
      )}
      {children}
    </div>
  );
}

/**
 * Plays a trip's (or a raid's) log line by line with live HP bars. `results`
 * is shown once the log has played out (or the player skips to the end).
 */
export function TripPlayer({
  heroes,
  log,
  controls,
  results,
}: {
  /** The party as it set off. */
  heroes: readonly Hero[];
  log: readonly ExpeditionEvent[];
  /** Extra controls shown before the speed picker. */
  controls?: ReactNode;
  results: ReactNode;
}) {
  const [speed, setSpeed] = useState<Speed>("normal");
  const [shown, setShown] = useState(0);

  useEffect(() => setShown(0), [log]);
  useEffect(() => {
    if (shown >= log.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), SPEEDS[speed]);
    return () => clearTimeout(t);
  }, [shown, log, speed]);

  const logRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown]);

  const state = stateAt(log, shown);
  const done = shown >= log.length;

  return (
    <>
      <div className="controls">
        {controls}
        <label>
          Speed{" "}
          <select value={speed} onChange={(e) => setSpeed(e.target.value as Speed)}>
            {Object.keys(SPEEDS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setShown(done ? 0 : log.length)}>
          {done ? "Replay" : "Skip to end"}
        </button>
      </div>

      <p className="where">{state.where}</p>
      <div className="sides">
        <ul className="bars heroes" aria-label="Party">
          {heroes.map((h) => (
            <WatchCard key={h.id} hero={h} bar={state.party.find((b) => b.uid === h.id)} />
          ))}
        </ul>
        <div className="bars" aria-label="Monsters">
          {state.monsters?.length ? (
            state.monsters.map((b) => <HpBar key={b.uid} bar={b} />)
          ) : (
            <p className="muted quiet">No monsters in sight.</p>
          )}
        </div>
      </div>

      <ol className="log" aria-live="polite" ref={logRef}>
        {log.slice(0, shown).map((e, i) => (
          <Line key={i} e={e} />
        ))}
      </ol>

      {done ? results : null}
    </>
  );
}
