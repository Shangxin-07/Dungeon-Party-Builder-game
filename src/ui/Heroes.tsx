/**
 * Hero personality and progress in town (M5): morale and why it moved,
 * motivation, likes, favourite building, XP, perks, abilities, and the level-up picker.
 * Rules live in src/sim (morale.ts, levels.ts, town/); this only shows them.
 */
import { useState } from "react";
import { STATS, type PassiveEffect, type Stat } from "../content/types";
import { backstoryText } from "../sim/backstory";
import { epithet } from "../sim/moments";
import { tieBetween, tieText } from "../sim/ties";
import { abilitiesAtLevel, abilityCost, knownAbilities, upcomingAbilities } from "../sim/abilities";
import { classDepth, fatigueTier, type Hero } from "../sim/hero";
import { classOptions, levelIn, xpProgress, type ClassOption } from "../sim/levels";
import { lossFactor, mood } from "../sim/morale";
import { built, chooseLevelClass, chooseLevelUp, standing, type TownState } from "../sim/town";
import { ix } from "./game";

type Act = (f: (t: TownState) => TownState) => void;

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Morale as a bar with a mood word, and the recent reasons behind it. */
export function MoraleBar({ hero, log = false }: { hero: Hero; log?: boolean }) {
  const word = mood(ix, hero);
  const low = hero.morale < ix.lib.morale.low;
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
      {log ? <MoraleLog hero={hero} /> : null}
    </div>
  );
}

/** Why morale moved lately, and how much WIL softens each knock (M9.16: its own piece). */
export function MoraleLog({ hero }: { hero: Hero }) {
  if (!hero.moraleLog.length) return null;
  const steady = Math.round((1 - lossFactor(ix, hero)) * 100);
  return (
    <details className="morale-log small">
      <summary>
        Why morale moved{" "}
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

/** A tie's line, and what it does when they go down together. */
export function tieLine(t: NonNullable<ReturnType<typeof tieBetween>>): string {
  const parts = [tieText(t)];
  if (t.tie.passives?.length) parts.push(`Together: ${describePassives(t.tie.passives)} each`);
  if (t.tie.morale)
    parts.push(`${t.tie.morale.amount > 0 ? "+" : ""}${t.tie.morale.amount} morale a trip`);
  return parts.join(". ");
}

/** Motivation, likes and dislikes, and the favourite building. */
export function Personality({ hero, town }: { hero: Hero; town?: TownState }) {
  const m = ix.motivation(hero.motivation);
  const al = ix.alignment(hero.alignment);
  const fav = ix.building(hero.favourite).name;
  const has = town ? standing(town, hero.favourite) : undefined;
  const story = ix.backstory(hero.backstory);
  const named = epithet(ix, hero);
  const ties = town
    ? town.roster
        .filter((h) => h.id !== hero.id)
        .map((h) => tieBetween(ix, hero, h))
        .filter((t) => !!t)
    : [];
  return (
    <p className="personality small">
      <span title={`${story.name}: ${describePassives(story.passives)}`}>
        <strong>
          {hero.name} {hero.surname}
          {named ? `, ${named}` : ""}
        </strong>{" "}
        <span className="muted">
          · {backstoryText(ix, hero)} ({describePassives(story.passives)})
        </span>
      </span>
      <br />
      {hero.moments.length ? (
        <>
          Stories:{" "}
          {hero.moments.map((id) => (
            <span
              key={id}
              className="perk"
              title={ix.moment(id).text.replaceAll("{hero}", hero.name)}
            >
              {ix.moment(id).name}
            </span>
          ))}
          <br />
        </>
      ) : null}
      {ties.length ? (
        <>
          Ties:{" "}
          {ties.map((t) => {
            const other = t.a.id === hero.id ? t.b : t.a;
            return (
              <span key={other.id} className="perk" title={tieLine(t)}>
                {t.tie.name} of {other.name}
              </span>
            );
          })}
          <br />
        </>
      ) : null}
      <span title={m.blurb}>
        <strong>{m.name}</strong> <span className="muted">· {m.blurb}</span>
      </span>
      <br />
      <span title={al.blurb}>
        <strong>{al.name}</strong> <span className="muted">· {al.blurb}</span>
      </span>
      <br />
      {hero.likes ? <>Likes {plural(hero.likes)}. </> : null}
      {hero.dislikes ? <>Hates {plural(hero.dislikes)}. </> : null}
      Favourite building: {fav}
      {has === undefined ? "" : has ? " ✓" : " (we don't have one)"}
    </p>
  );
}

export const plural = (tag: string) =>
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
          Next: {next.ability.name} at {ix.cls(next.classId).name} {next.level}
        </span>
      ) : null}
    </p>
  );
}

const signedNum = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** "+4 attack, +10 max HP", from a list of passives. */
export function describePassives(list: readonly PassiveEffect[]): string {
  const label: Record<string, string> = {
    maxHp: "max HP",
    spellPower: "spell power",
    armor: "armour",
  };
  return list
    .map((p) => {
      if (p.type === "modifyStat") return `${signedNum(p.amount)} ${label[p.stat] ?? p.stat}`;
      if (p.type === "modifySkill") return `${signedNum(p.amount)} ${p.skill}`;
      if (p.type === "bonusVsTag") return `+${p.percent}% vs ${p.tag}`;
      return `${p.percent}% ${p.damageType} resist`;
    })
    .join(", ");
}

/** What one class level from here gives: stat gains, per-level bonuses, abilities, milestone. */
function levelGains(o: ClassOption): string {
  const next = o.level + 1;
  const parts: string[] = [];
  const growth = Object.entries(o.cls.growth)
    .filter(([, v]) => v)
    .map(([s, v]) => `+${v} ${s}`);
  if (growth.length) parts.push(growth.join(" "));
  if (o.level && o.cls.perLevel?.length)
    parts.push(`${describePassives(o.cls.perLevel).replace(/\+([\d.]+)/g, "+$1/level")}`);
  const learns = abilitiesAtLevel(ix, o.cls.id, next).map((a) => a.name);
  if (learns.length) parts.push(`learns ${learns.join(" and ")}`);
  if (o.cls.milestones?.[next]) parts.push("milestone perk");
  return parts.join(" · ");
}

/**
 * A hero's classes (DESIGN.md §9): each with its level, what depth has
 * given so far, and the next milestone. Then the advanced and combo classes
 * they could grow into, with what's still missing.
 */
export function ClassList({ hero, town }: { hero: Hero; town?: TownState }) {
  if (hero.untrained || hero.porter) return null;
  const opts = classOptions(ix, hero, town ? built(town) : undefined);
  const have = opts.filter((o) => o.level).sort((a, b) => b.level - a.level);
  const paths = opts.filter(
    (o) =>
      !o.level &&
      (o.cls.kind ?? "base") !== "base" &&
      Object.keys(o.cls.requires?.classLevels ?? {}).some((id) => levelIn(hero, id)),
  );
  return (
    <div className="small classes">
      {have.map((o) => {
        const bonus = describePassives(classDepth(ix, o.cls.id, o.level));
        const milestone = Object.keys(o.cls.milestones ?? {})
          .map(Number)
          .filter((l) => l > o.level)
          .sort((a, b) => a - b)[0];
        return (
          <p key={o.cls.id} className="quiet" title={o.cls.blurb}>
            <strong>
              {o.cls.name} {o.level}
            </strong>
            {bonus ? <span className="muted"> · depth: {bonus}</span> : null}
            {milestone ? <span className="muted"> · milestone perk at {milestone}</span> : null}
          </p>
        );
      })}
      {paths.length ? (
        <p className="quiet muted">
          Could grow into:{" "}
          {paths
            .map((o) => `${o.cls.name} (${o.ok ? "ready" : `needs ${o.missing.join(", ")}`})`)
            .join("; ")}
        </p>
      ) : null}
    </div>
  );
}

/** Step one of a level-up: which class gets the level. */
function ClassPicker({ hero, town, act }: { hero: Hero; town: TownState; act: Act }) {
  const up = hero.levelUps[0]!;
  const opts = classOptions(ix, hero, built(town));
  const open = opts.filter((o) => o.ok).sort((a, b) => b.level - a.level);
  const shut = opts.filter(
    (o) =>
      !o.ok &&
      ((o.cls.kind ?? "base") === "base" ||
        Object.keys(o.cls.requires?.classLevels ?? {}).some((id) => levelIn(hero, id))),
  );
  const more = hero.levelUps.length - 1;
  return (
    <div className="levelup">
      <h4>
        Level {up.level}!{" "}
        <span className="muted small">
          Which class gets it? Classes are for keeps: a new one starts at level 1, and depth pays
          off later.
          {more ? ` ${more} more level-up${more > 1 ? "s" : ""} after this.` : ""}
        </span>
      </h4>
      <div className="offers" role="group" aria-label="Classes">
        {open.map((o) => (
          <button
            key={o.cls.id}
            type="button"
            className="offer"
            onClick={() => act((t) => chooseLevelClass(ix, t, hero.id, o.cls.id))}
          >
            <strong>
              {o.cls.name} {o.level ? `${o.level} → ${o.level + 1}` : "(new)"}
            </strong>
            <span className="small muted">{levelGains(o) || o.cls.blurb}</span>
          </button>
        ))}
      </div>
      {shut.length ? (
        <p className="small muted">
          Not yet: {shut.map((o) => `${o.cls.name} (needs ${o.missing.join(", ")})`).join("; ")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Spend the oldest level-up: first the class it goes into (when there's a
 * choice), then one perk from those on offer, and the free point if there is one.
 */
export function LevelUpPicker({ hero, town, act }: { hero: Hero; town: TownState; act: Act }) {
  const up = hero.levelUps[0];
  const [perk, setPerk] = useState<string>();
  const [stat, setStat] = useState<Stat>();
  if (!up) return null;
  if (!up.classId) return <ClassPicker hero={hero} town={town} act={act} />;
  const chosen = perk && up.offers.includes(perk) ? perk : undefined;
  const ready = (!up.offers.length || chosen) && (!up.freeStat || stat);
  const more = hero.levelUps.length - 1;
  const cls = ix.cls(up.classId);
  const learned = abilitiesAtLevel(ix, cls.id, levelIn(hero, cls.id));
  const milestone = !!cls.milestones?.[levelIn(hero, cls.id)];
  return (
    <div className="levelup">
      <h4>
        Level {up.level}: {cls.name} {levelIn(hero, cls.id)}!{" "}
        <span className="muted small">
          {cls.name} gains are in
          {learned.length
            ? ` and ${hero.name} learns ${learned.map((a) => a.name).join(" and ")}`
            : ""}
          . Pick {milestone ? "a milestone perk" : "a perk"}
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
              <option key={s} value={s} disabled={hero.stats[s] >= 30}>
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
  const f = hero.fatigue;
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
      {hero.injuries.length ? (
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
