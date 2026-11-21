/**
 * Hero personality and progress in town (M5): morale and why it moved,
 * motivation, likes, favourite building, XP, perks, abilities, and the level-up picker.
 * Rules live in src/sim (morale.ts, levels.ts, town.ts); this only shows them.
 */
import { useState } from "react";
import { STATS, type Stat } from "../content/types";
import { abilitiesAtLevel, abilityCost, knownAbilities, upcomingAbilities } from "../sim/abilities";
import { fatigueTier, type Hero } from "../sim/hero";
import { xpProgress } from "../sim/levels";
import { lossFactor, mood } from "../sim/morale";
import { chooseLevelUp, standing, type TownState } from "../sim/town";
import { ix } from "./game";

type Act = (f: (t: TownState) => TownState) => void;

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Morale as a bar with a mood word, and the recent reasons behind it. */
export function MoraleBar({ hero, log = false }: { hero: Hero; log?: boolean }) {
  const word = mood(ix, hero);
  const low = hero.morale < ix.lib.morale.low;
  const steady = Math.round((1 - lossFactor(ix, hero)) * 100);
  return (
    <div className="morale">
      <div className="meter" title={`Morale ${hero.morale}/100`}>
        <span className="meter-label">Morale</span>
        <span className="pop-track meter-track" aria-hidden="true">
          <span
            className={`pop-fill morale-fill${low ? " low" : hero.morale >= 75 ? " high" : ""}`}
            style={{ width: `${hero.morale}%` }}
          />
        </span>
        <span className={`meter-num${low ? " warn" : ""}`}>
          {hero.morale} <span className="muted">{word}</span>
        </span>
      </div>
      {log && hero.moraleLog.length ? (
        <details className="morale-log small">
          <summary>
            Why?{" "}
            <span className="muted">
              (WIL {steady >= 0 ? `takes ${steady}% off` : `adds ${-steady}% to`} every knock)
            </span>
          </summary>
          <ul>
            {[...hero.moraleLog].reverse().map((n, i) => (
              <li key={i}>
                <span className={n.amount > 0 ? "up" : "down"}>{signed(n.amount)}</span> {n.reason}{" "}
                <span className="muted">
                  day {n.since && n.since !== n.day ? `${n.since}–${n.day}` : n.day}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

/** XP towards the next level. */
export function XpBar({ hero }: { hero: Hero }) {
  const p = xpProgress(ix, hero);
  return (
    <div className="meter" title={`${hero.xp} XP in total`}>
      <span className="meter-label">XP</span>
      <span className="pop-track meter-track" aria-hidden="true">
        <span
          className="pop-fill xp-fill"
          style={{ width: p.max ? "100%" : `${Math.min(100, (p.into / p.needed) * 100)}%` }}
        />
      </span>
      <span className="meter-num">
        {p.max ? "max level" : `${p.into}/${p.needed}`}{" "}
        <span className="muted">to level {hero.level + 1}</span>
      </span>
    </div>
  );
}

/** Motivation, likes and dislikes, and the favourite building. */
export function Personality({ hero, town }: { hero: Hero; town?: TownState }) {
  const m = ix.motivation(hero.motivation);
  const fav = ix.building(hero.favourite).name;
  const has = town ? standing(town, hero.favourite) : undefined;
  return (
    <p className="personality small">
      <span title={m.blurb}>
        <strong>{m.name}</strong> <span className="muted">· {m.blurb}</span>
      </span>
      <br />
      {hero.likes ? <>Likes {plural(hero.likes)}. </> : null}
      {hero.dislikes ? <>Hates {plural(hero.dislikes)}. </> : null}
      Favourite building: {fav}
      {has === undefined ? "" : has ? " ✓" : " (we don't have one)"}
    </p>
  );
}

const plural = (tag: string) =>
  ({ fire: "fire magic", staff: "staves", heavy: "heavy gear", axe: "axes" })[tag] ?? `${tag}s`;

export function PerkList({ hero }: { hero: Hero }) {
  if (!hero.perks.length) return null;
  return (
    <p className="perks small">
      Perks:{" "}
      {hero.perks.map((id) => (
        <span key={id} className="perk" title={ix.perk(id).description}>
          {ix.perk(id).name}
        </span>
      ))}
    </p>
  );
}

/**
 * What the hero can do in a fight, and where each move comes from: their
 * class, the gear in their hands, or a perk. Plus the next class ability.
 */
export function AbilityList({ hero }: { hero: Hero }) {
  const known = knownAbilities(ix, hero);
  const next = upcomingAbilities(ix, hero)[0];
  return (
    <p className="perks small">
      Abilities: {known.length ? null : <span className="muted">just a basic attack</span>}
      {known.map(({ ability: a, source, from }) => {
        const cost = abilityCost(a);
        const tip = [a.description, cost, `From ${source === "class" ? "class" : from}`]
          .filter(Boolean)
          .join(" · ");
        return (
          <span key={a.id} className={`perk ability-${source}`} title={tip}>
            {a.name}
            {source === "class" ? null : <span className="muted"> ({from})</span>}
          </span>
        );
      })}
      {next ? (
        <span className="muted" title={next.ability.description}>
          Next: {next.ability.name} at level {next.level}
        </span>
      ) : null}
    </p>
  );
}

/** Spend the oldest level-up: one perk from those on offer, and the free point if there is one. */
export function LevelUpPicker({ hero, act }: { hero: Hero; act: Act }) {
  const up = hero.levelUps[0];
  const [perk, setPerk] = useState<string>();
  const [stat, setStat] = useState<Stat>();
  if (!up) return null;
  const chosen = perk && up.offers.includes(perk) ? perk : undefined;
  const ready = (!up.offers.length || chosen) && (!up.freeStat || stat);
  const more = hero.levelUps.length - 1;
  const learned = abilitiesAtLevel(ix, hero.classId, up.level);
  return (
    <div className="levelup">
      <h4>
        Level {up.level}!{" "}
        <span className="muted small">
          {ix.cls(hero.classId).name} gains are in
          {learned.length
            ? ` and ${hero.name} learns ${learned.map((a) => a.name).join(" and ")}`
            : ""}
          . Pick a perk
          {up.freeStat ? " and a stat for the free point" : ""}.
          {more ? ` ${more} more level-up${more > 1 ? "s" : ""} after this.` : ""}
        </span>
      </h4>
      <div className="offers" role="radiogroup" aria-label="Perks on offer">
        {up.offers.map((id) => {
          const p = ix.perk(id);
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={chosen === id}
              className={`offer${chosen === id ? " on" : ""}`}
              onClick={() => setPerk(id)}
            >
              <strong>{p.name}</strong>
              {up.wants === id ? <span className="wish"> {hero.name} wants this</span> : null}
              <span className="small muted">{p.description}</span>
            </button>
          );
        })}
        {!up.offers.length ? <p className="small muted">No perks left to learn.</p> : null}
      </div>
      {up.freeStat ? (
        <label className="small">
          Free point:{" "}
          <select
            value={stat ?? ""}
            onChange={(e) => setStat((e.target.value || undefined) as Stat)}
          >
            <option value="">pick a stat…</option>
            {STATS.map((s) => (
              <option key={s} value={s}>
                {s} ({hero.stats[s]})
              </option>
            ))}
          </select>
        </label>
      ) : null}{" "}
      <button
        type="button"
        className="btn btn-main"
        disabled={!ready}
        onClick={() => {
          act((t) => chooseLevelUp(ix, t, hero.id, chosen, up.freeStat ? stat : undefined));
          setPerk(undefined);
          setStat(undefined);
        }}
      >
        Learn it
      </button>
    </div>
  );
}

/** Fatigue as a bar (M6), and any injuries with the days left to heal. */
export function WearBar({ hero }: { hero: Hero }) {
  const f = hero.fatigue ?? 0;
  const tier = fatigueTier(ix, hero);
  const next = ix.lib.wear.tiers.find((t) => t.at > f);
  return (
    <div className="morale">
      <div
        className="meter"
        title={`Fatigue ${f}/100. Each day in town takes ${ix.lib.wear.restPerDay} off.${next ? ` ${next.name[0]!.toUpperCase()}${next.name.slice(1)} at ${next.at}.` : ""}`}
      >
        <span className="meter-label">Fatigue</span>
        <span className="pop-track meter-track" aria-hidden="true">
          <span
            className={`pop-fill fatigue-fill${tier ? " low" : ""}`}
            style={{ width: `${f}%` }}
          />
        </span>
        <span className={`meter-num${tier ? " warn" : ""}`}>
          {f} <span className="muted">{tier?.name ?? "rested"}</span>
        </span>
      </div>
      {hero.injuries?.length ? (
        <ul className="injuries small">
          {hero.injuries.map((inj) => {
            const def = ix.injury(inj.id);
            return (
              <li key={inj.id} className="warn">
                {def.name} <span className="muted">({def.description})</span>, {inj.days}{" "}
                {inj.days === 1 ? "day" : "days"} to heal
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
