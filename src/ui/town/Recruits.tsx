/**
 * Today's recruits and hiring them.
 */
import { Fold } from "../Fold";
import { useState } from "react";
import { library } from "../../content";
import { heroSheet, trainRecruit, type Hero } from "../../sim/hero";
import { applySpend } from "../../sim/training";
import {
  autoStart,
  hire,
  hirePorter,
  hirePrice,
  porterPrice,
  rosterSize,
  standing,
  type TownState,
} from "../../sim/town";
import { ix } from "../game";
import { StatSheet, usesMana } from "../Watch";
import { Portrait } from "../art/Portrait";
import { Icon, ItemIcon, PEOPLE } from "../art/Icon";
import { describePassives, plural, tieLine } from "../Heroes";
import { STATS } from "../../content/types";
import { backstoryText } from "../../sim/backstory";
import { tieBetween } from "../../sim/ties";
import { mood } from "../../sim/morale";
import { type Act } from "./shared";
import { ClassPicker, PointsGrid, useTraining } from "./Training";

export function Recruits({ town, act }: { town: TownState; act: Act }) {
  const full = town.roster.length >= rosterSize(ix, town);
  const free = town.freeHires > 0;
  const trained = town.recruits.some((h) => !h.untrained);
  return (
    <Fold
      id="recruits"
      title={
        <>
          Looking for work{" "}
          <span className="muted">
            (
            {free
              ? `${town.freeHires} will sign for nothing`
              : `${library.town.hireCost} gold to sign`}
            )
          </span>
        </>
      }
      defaultOpen={free}
      summary={`${town.recruits.length} waiting`}
    >
      {free ? (
        <p className="small">
          Your first heroes. They have stats but no training and no gear: pick each one's class,
          then kit them out from the store room (the <em>Kit out</em> button on their card).{" "}
          <button type="button" className="link" onClick={() => act((t) => autoStart(ix, t))}>
            Pick for me
          </button>
        </p>
      ) : (
        <p className="muted small">
          New faces turn up every day, untrained and empty-handed: you pick their class and buy
          their gear.
          {trained
            ? " Thanks to the Tavern, some arrive trained and kitted, for the price of their kit."
            : ""}
          {full ? " The roster is full: upgrade the Guild Hall or dismiss someone." : ""}
        </p>
      )}
      <ul className="hero-cards">
        {town.recruits.map((h) => (
          <RecruitCard key={h.id} town={town} recruit={h} act={act} full={full} />
        ))}
      </ul>
    </Fold>
  );
}

export function RecruitCard({
  town,
  recruit: h,
  act,
  full,
}: {
  town: TownState;
  recruit: Hero;
  act: Act;
  full: boolean;
}) {
  const tr = useTraining(h.stats);
  /** The deal waiting on "Yes" (M9.09): hiring is for good, so it takes two clicks. */
  const [asking, setAsking] = useState<"hire" | "porter" | null>(null);
  // At the mining camp everyone signs as a miner and picks a class once it's held.
  const training = h.untrained && !town.camp;
  const classId = town.camp ? ix.lib.opening.campClass : h.untrained ? tr.classId : h.classId;
  const cls = ix.cls(classId);
  const hero = !h.untrained
    ? h
    : !training || !tr.wrong
      ? trainRecruit(ix, h, classId, training ? tr.spend : undefined)
      : { ...trainRecruit(ix, h, classId), stats: applySpend(h.stats, tr.spend) };
  const price = hirePrice(ix, town, h);
  const porter = porterPrice(ix, town);
  const canHire = !full && town.gold >= price && !(training && tr.wrong);
  const canPorter = h.untrained && !town.camp && !full && town.gold >= porter;
  const kit = h.untrained ? cls.startingKit : [...Object.values(h.equipment), ...h.pack];
  const gold = (n: number) => (n ? `${n} gold` : "free");
  return (
    <li className="hero-card recruit">
      <div className="recruit-head">
        <Portrait hero={hero} size={44} />
        <span className="hero-heading">
          <h3>
            {h.name} {h.surname}
          </h3>
          <span className="muted small">
            {h.untrained ? (town.camp ? "untrained, signs as a miner" : "untrained") : cls.name}
            {" · "}morale {h.morale} {mood(ix, h)}
          </span>
        </span>
      </div>
      {training ? (
        <ClassPicker
          stats={h.stats}
          training={{
            ...tr,
            pick: (id) => {
              tr.pick(id);
              setAsking(null);
            },
          }}
        />
      ) : null}
      <p className="muted small quiet">{cls.blurb}</p>
      {training ? <PointsGrid stats={h.stats} training={tr} /> : <PlainStats hero={hero} />}
      <MoreNumbers hero={hero} />
      <RecruitPersonality hero={hero} town={town} />
      <p className="small quiet recruit-kit">
        <span className="muted">{h.untrained ? "Comes with nothing. Usual kit" : "Brings"}</span>
        {kit.length
          ? kit.map((id, i) => <ItemIcon key={`${id}-${i}`} id={id} size={20} />)
          : " nothing"}
      </p>
      {asking ? (
        <div className="recruit-confirm">
          <p className="small">
            {asking === "hire" ? (
              <>
                Sign <strong>{h.name}</strong> as a <strong>{cls.name.toLowerCase()}</strong> for{" "}
                {gold(price)}?
                {training ? (
                  <>
                    {" "}
                    Training:{" "}
                    {Object.entries(tr.spend)
                      .map(([k, n]) => `${k} +${n}`)
                      .join(", ") || "none"}
                    . Their class and training are for good.
                  </>
                ) : null}
              </>
            ) : (
              <>
                Sign <strong>{h.name}</strong> as a <strong>porter</strong> for {gold(porter)}? They
                won't fight; they train in a class later.
              </>
            )}
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-on"
              disabled={asking === "hire" ? !canHire : !canPorter}
              onClick={() =>
                act((t) =>
                  asking === "hire"
                    ? hire(
                        ix,
                        t,
                        h.id,
                        h.untrained ? classId : undefined,
                        training ? tr.spend : undefined,
                      )
                    : hirePorter(ix, t, h.id),
                )
              }
            >
              Yes, sign {h.name}
            </button>
            <button type="button" className="btn" onClick={() => setAsking(null)}>
              Not yet
            </button>
          </div>
        </div>
      ) : (
        <div className="recruit-choice">
          <button
            type="button"
            className="btn"
            disabled={!canHire}
            onClick={() => setAsking("hire")}
          >
            <Icon icon={cls.icon} name={cls.name} size={18} /> Hire as {cls.name.toLowerCase()}
            <span className="sub">{gold(price)}</span>
          </button>
          {h.untrained && !town.camp ? (
            <button
              type="button"
              className="btn"
              disabled={!canPorter}
              title={`Porters don't fight. They carry loot, watch the fighting, and run for home if the party falls. ${ix.lib.town.porters.wage} gold a day at home, half a share below. Train them in a class once they've seen enough.`}
              onClick={() => setAsking("porter")}
            >
              <Icon icon={PEOPLE.porter} name="Porter" size={18} /> Sign as porter
              <span className="sub">{gold(porter)} · ½ share</span>
            </button>
          ) : null}
        </div>
      )}
    </li>
  );
}

/** The seven stats, for someone who isn't placing training points. */
function PlainStats({ hero }: { hero: Hero }) {
  const sheet = heroSheet(ix, hero);
  return (
    <dl className="stat-grid">
      {STATS.map((s) => (
        <div key={s}>
          <dt>{s}</dt>
          <dd>{sheet.stats[s]}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The numbers the stats make, on one line that opens to the full sheet. */
function MoreNumbers({ hero }: { hero: Hero }) {
  const sheet = heroSheet(ix, hero);
  return (
    <details className="recruit-more small">
      <summary className="muted">
        HP {sheet.derived.maxHp}
        {usesMana(hero) ? ` · Mana ${sheet.derived.mana}` : ""} · Attack {sheet.derived.attack} ·
        Spell {sheet.derived.spellPower}
      </summary>
      <StatSheet hero={hero} full />
    </details>
  );
}

/** Who they are, on three short lines; the long words sit in tooltips. */
function RecruitPersonality({ hero, town }: { hero: Hero; town: TownState }) {
  const m = ix.motivation(hero.motivation);
  const al = ix.alignment(hero.alignment);
  const story = ix.backstory(hero.backstory);
  const fav = ix.building(hero.favourite).name;
  const has = standing(town, hero.favourite);
  const ties = town.roster.map((o) => tieBetween(ix, hero, o)).filter((t) => !!t);
  return (
    <div className="personality small">
      <p className="quiet">
        <span className="muted">{backstoryText(ix, hero)}</span>{" "}
        <span className="perk" title={`${story.name}: ${describePassives(story.passives)}`}>
          {describePassives(story.passives)}
        </span>
      </p>
      <p className="quiet">
        <strong title={m.blurb}>{m.name}</strong> · <strong title={al.blurb}>{al.name}</strong>
        {hero.likes ? <> · likes {plural(hero.likes)}</> : null}
        {hero.dislikes ? <> · hates {plural(hero.dislikes)}</> : null} ·{" "}
        <span title="Favourite building">
          ♥ {fav}
          {has ? " ✓" : ""}
        </span>
      </p>
      {ties.length ? (
        <p className="quiet">
          {ties.map((t) => {
            const other = t.a.id === hero.id ? t.b : t.a;
            return (
              <span key={other.id} className="perk" title={tieLine(t)}>
                {t.tie.name} of {other.name}
              </span>
            );
          })}
        </p>
      ) : null}
    </div>
  );
}
