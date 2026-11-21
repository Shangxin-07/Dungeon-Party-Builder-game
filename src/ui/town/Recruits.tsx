/**
 * Today's recruits and hiring them.
 */
import { Fold } from "../Fold";
import { useState } from "react";
import { library } from "../../content";
import { baseClasses, bestClass, trainRecruit, type Hero } from "../../sim/hero";
import {
  autoStart,
  hire,
  hirePorter,
  hirePrice,
  porterPrice,
  rosterSize,
  type TownState,
} from "../../sim/town";
import { ix } from "../game";
import { StatSheet } from "../Watch";
import { MoraleBar, Personality } from "../Heroes";
import { type Act, describeKit, STAT_ORDER } from "./shared";

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
  const fit = h.untrained ? bestClass(ix, h.stats) : h.classId;
  const [picked, setClassId] = useState(fit);
  // At the mining camp everyone signs as a miner and picks a class once it's held.
  const classId = town.camp ? ix.lib.opening.campClass : picked;
  const hero = h.untrained ? trainRecruit(ix, h, classId) : h;
  const price = hirePrice(ix, town, h);
  return (
    <li className="hero-card recruit">
      <div className="hero-head">
        <h3>{h.name}</h3>
        <span className="muted small">{h.untrained ? "untrained" : ix.cls(h.classId).name}</span>
      </div>
      {h.untrained ? (
        <>
          <p className="small quiet">
            Raw: {STAT_ORDER.map((k) => `${k} ${h.stats[k]}`).join(", ")}
          </p>
          <label className="small" hidden={town.camp}>
            Train as{" "}
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {baseClasses(ix).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.id === fit ? " (best fit)" : ""}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      <p className="muted small quiet">{ix.cls(hero.classId).blurb}</p>
      <Personality hero={hero} town={town} />
      <MoraleBar hero={hero} />
      <StatSheet hero={hero} full />
      {h.untrained ? (
        <p className="small quiet">
          Comes with nothing. Their usual kit:{" "}
          {ix
            .cls(classId)
            .startingKit.map((id) => ix.item(id).name)
            .join(", ")}
          .
        </p>
      ) : (
        <p className="small quiet">Brings: {describeKit(h)}</p>
      )}
      <button
        type="button"
        className="btn"
        disabled={full || town.gold < price}
        onClick={() => act((t) => hire(ix, t, h.id, h.untrained ? classId : undefined))}
      >
        {price ? `Hire for ${price} gold` : `Sign up as a ${ix.cls(classId).name.toLowerCase()}`}
      </button>
      {h.untrained ? (
        <button
          type="button"
          className="link small"
          title="Porters don't fight. They carry loot, watch the fighting, and run for home if the party falls. Train them in a class once they've seen enough."
          disabled={full || town.gold < porterPrice(ix, town)}
          onClick={() => act((t) => hirePorter(ix, t, h.id))}
        >
          or sign as a porter (
          {porterPrice(ix, town) ? `${porterPrice(ix, town)} gold, ` : "free, "}
          {ix.lib.town.porters.wage} a day)
        </button>
      ) : null}
    </li>
  );
}
