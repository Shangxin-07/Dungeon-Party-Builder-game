import { useEffect, useMemo, useRef, useState } from "react";
import { heroNames, library } from "../content";
import { STATS } from "../content/types";
import {
  describeRetreat,
  runExpedition,
  type ExpeditionEvent,
  type ExpeditionResult,
  type LootRule,
  type RetreatRule,
} from "../sim/expedition";
import { createStarterParty, heroSheet, type Hero } from "../sim/hero";
import { indexLibrary } from "../sim/library";
import { createRng } from "../sim/rng";

const ix = indexLibrary(library);

const RETREATS: { id: string; rule: RetreatRule }[] = [
  { id: "hp-30", rule: { kind: "hero-hp-below", percent: 30 } },
  { id: "hp-50", rule: { kind: "hero-hp-below", percent: 50 } },
  { id: "downed", rule: { kind: "hero-downed" } },
  { id: "potions", rule: { kind: "out-of-potions" } },
  { id: "never", rule: { kind: "never" } },
];
const SPEEDS = { slow: 450, normal: 200, fast: 40 } as const;
type Speed = keyof typeof SPEEDS;
const SKILLS = ["scouting", "appraisal", "medicine"];

interface Bar {
  uid: string;
  name: string;
  hp: number;
  max: number;
  mana?: number;
  maxMana?: number;
  state: "up" | "downed" | "dead";
}

interface Trip {
  heroes: Hero[];
  result: ExpeditionResult;
}

function simulate(seed: number, targetFloor: number, retreat: RetreatRule, loot: LootRule): Trip {
  const heroes = createStarterParty(ix, heroNames, createRng(seed));
  return { heroes, result: runExpedition(ix, heroes, { targetFloor, retreat, loot }, seed) };
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

/** Only heroes with spells that cost mana get a mana bar. */
const usesMana = (hero: Hero) =>
  ix.cls(hero.classId).abilities.some((id) => (ix.ability(id).cost ?? 0) > 0);

/** A hero's bars plus their stat sheet. */
function HeroCard({ hero, bar: raw }: { hero: Hero; bar?: Bar }) {
  const sheet = heroSheet(ix, hero);
  const bar = raw && !usesMana(hero) ? { ...raw, mana: undefined, maxMana: undefined } : raw;
  return (
    <li className="hero">
      {bar ? <HpBar bar={bar} /> : null}
      <p className="hero-class">
        {ix.cls(hero.classId).name}, level {hero.level}
        {bar?.maxMana ? (
          <span className="muted">
            {" "}
            · mana {bar.mana}/{bar.maxMana}
          </span>
        ) : null}
      </p>
      <dl className="stat-grid">
        {STATS.map((s) => (
          <div key={s}>
            <dt>{s}</dt>
            <dd>{sheet.stats[s]}</dd>
          </div>
        ))}
      </dl>
      <p className="skills">
        {SKILLS.map((s) => (
          <span key={s}>
            {ix.skill(s).name} <strong>{sheet.skills[s]}</strong>
          </span>
        ))}
      </p>
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

function Results({ trip }: { trip: Trip }) {
  const r = trip.result;
  const real = r.haul.reduce((s, h) => s + h.value, 0);
  const guess = r.haul.reduce((s, h) => s + h.estimate, 0);
  const counts = new Map<string, { n: number; guess: number; real: number }>();
  for (const h of r.haul) {
    const c = counts.get(h.item) ?? { n: 0, guess: 0, real: 0 };
    counts.set(h.item, { n: c.n + 1, guess: c.guess + h.estimate, real: c.real + h.value });
  }
  const dead = r.party.filter((h) => h.condition === "dead").map((h) => h.name);
  return (
    <div className={`results results-${r.outcome}`}>
      <h3>{OUTCOMES[r.outcome]}</h3>
      <p>
        Reached floor {r.deepestFloor} in {r.days} {r.days === 1 ? "day" : "days"},{" "}
        {r.roomsVisited} rooms, {r.kills.length} monsters killed.
        {dead.length ? ` Lost: ${dead.join(", ")}.` : " Nobody died."}
        {r.wipeSite ? ` They lie on floor ${r.wipeSite.floor}, room ${r.wipeSite.room}.` : ""}
      </p>
      {r.haul.length ? (
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
      ) : r.leftBehind.length ? (
        <p>{r.leftBehind.length} items lie with them, waiting for a rescue party.</p>
      ) : (
        <p>They came back empty-handed.</p>
      )}
    </div>
  );
}

export function ExpeditionView() {
  const [seed, setSeed] = useState(1);
  const [target, setTarget] = useState(1);
  const [retreatId, setRetreatId] = useState("hp-30");
  const [loot, setLoot] = useState<LootRule>("everything");
  const [speed, setSpeed] = useState<Speed>("normal");
  const retreat = RETREATS.find((r) => r.id === retreatId)!.rule;
  const trip = useMemo(
    () => simulate(seed, target, retreat, loot),
    [seed, target, retreatId, loot],
  );
  const log = trip.result.log;
  const [shown, setShown] = useState(0);

  useEffect(() => setShown(0), [trip]);
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
    <section aria-labelledby="expedition-heading" className="fight">
      <h2 id="expedition-heading">Watch an expedition</h2>
      <p className="muted">
        A fresh party of three goes down with standing orders, room by room, then climbs back out.
        Once they're in, you can only watch.
      </p>
      <div className="controls">
        <label>
          Go to floor{" "}
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
            {library.floors.map((f) => (
              <option key={f.depth} value={f.depth}>
                {f.depth}: {f.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Orders{" "}
          <select value={retreatId} onChange={(e) => setRetreatId(e.target.value)}>
            {RETREATS.map((r) => (
              <option key={r.id} value={r.id}>
                {describeRetreat(r.rule)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Loot{" "}
          <select value={loot} onChange={(e) => setLoot(e.target.value as LootRule)}>
            <option value="everything">carry everything</option>
            <option value="valuable">leave the junk</option>
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
        <button type="button" onClick={() => setSeed((s) => s + 1)}>
          New party
        </button>
        <button type="button" onClick={() => setShown(done ? 0 : log.length)}>
          {done ? "Replay" : "Skip to end"}
        </button>
      </div>

      <p className="where">{state.where}</p>
      <div className="sides">
        <ul className="bars heroes" aria-label="Party">
          {trip.heroes.map((h) => (
            <HeroCard key={h.id} hero={h} bar={state.party.find((b) => b.uid === h.id)} />
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

      {done ? <Results trip={trip} /> : null}
    </section>
  );
}
