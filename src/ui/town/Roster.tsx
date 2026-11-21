/**
 * The roster: each hero's card, gear, pack and porter training.
 */
import { useState } from "react";
import {
  baseClasses,
  bestClass,
  EQUIP_SLOTS,
  heroSheet,
  heroTitle,
  type Hero,
} from "../../sim/hero";
import {
  answerRaise,
  dismiss,
  equip,
  fightsToTrain,
  kitOut,
  packItem,
  setRow,
  toggleParty,
  trainPorter,
  unequip,
  unpackItem,
  wage,
  type TownState,
} from "../../sim/town";
import { ix } from "../game";
import { HeroBars, StatSheet } from "../Watch";
import {
  AbilityList,
  ClassList,
  LevelUpPicker,
  MoraleBar,
  PerkList,
  Personality,
  WearBar,
  XpBar,
} from "../Heroes";
import { SLOT_NAMES, describeItem, tally, type Act } from "./shared";

export function Roster({ town, act }: { town: TownState; act: Act }) {
  return (
    <section aria-labelledby="roster-heading" className="panel">
      <h2 id="roster-heading">Roster</h2>
      {town.roster.length ? (
        <ul className="hero-cards">
          {town.roster.map((h) => (
            <HeroCard key={h.id} town={town} hero={h} act={act} />
          ))}
        </ul>
      ) : (
        <p className="muted">Nobody is left in the guild. Hire someone below.</p>
      )}
    </section>
  );
}

/** A porter's progress towards training, and the class picker once they're ready. */
export function PorterTraining({ hero: h, act }: { hero: Hero; act: Act }) {
  const left = fightsToTrain(ix, h);
  const fit = bestClass(ix, h.stats);
  const [classId, setClassId] = useState(fit);
  const need = ix.lib.town.porters.trainAfterFights;
  return (
    <div className="small">
      <p className="quiet">
        Watched {h.porter!.watched} {h.porter!.watched === 1 ? "fight" : "fights"}
        {left ? ` (${left} more before they can train)` : ""}; {h.porter!.xp} XP banked for when
        they do.
      </p>
      {left ? (
        <progress max={need} value={need - left} aria-label="Watched fights" />
      ) : (
        <p>
          <label>
            Train as{" "}
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {baseClasses(ix).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.id === fit ? " (best fit)" : ""}
                </option>
              ))}
            </select>
          </label>{" "}
          <button
            type="button"
            className="btn"
            onClick={() => act((t) => trainPorter(ix, t, h.id, classId))}
          >
            Train
          </button>
        </p>
      )}
    </div>
  );
}

export function HeroCard({ town, hero: h, act }: { town: TownState; hero: Hero; act: Act }) {
  const inParty = town.party.includes(h.id) || (town.porters ?? []).includes(h.id);
  const rec = town.records[h.id];
  const sheet = heroSheet(ix, h);
  const supplies = tally(town.stash.filter((id) => ix.item(id).slot === "consumable"));
  const packFull = h.pack.length >= sheet.derived.carrySlots;

  return (
    <li className={`hero-card${inParty ? " in-party" : ""}`}>
      <div className="hero-head">
        <h3>{h.name}</h3>
        <span className="muted small">
          {h.porter ? "Porter" : heroTitle(ix, h)}, paid {wage(ix, h)} gold a day
        </span>
        {h.levelUps.length ? <span className="badge">Level up!</span> : null}
      </div>
      <HeroBars hero={h} />
      <MoraleBar hero={h} log />
      <WearBar hero={h} />
      {h.porter ? <PorterTraining hero={h} act={act} /> : <XpBar hero={h} />}
      <Personality hero={h} town={town} />
      <LevelUpPicker key={h.levelUps[0]?.level ?? 0} hero={h} town={town} act={act} />
      {h.raiseAsk ? (
        <div className="raise">
          <p>
            <strong>{h.name} wants a raise</strong> of {h.raiseAsk.amount} gold a day (now paid{" "}
            {wage(ix, h)}). They'll take silence as a no after {ix.lib.town.raises.patienceDays}{" "}
            days.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => act((t) => answerRaise(ix, t, h.id, true))}
          >
            Agree
          </button>{" "}
          <button
            type="button"
            className="btn"
            onClick={() => act((t) => answerRaise(ix, t, h.id, false))}
          >
            Refuse
          </button>
        </div>
      ) : null}
      <div className="hero-actions">
        <button
          type="button"
          className={`btn${inParty ? " btn-on" : ""}`}
          aria-pressed={inParty}
          onClick={() => act((t) => toggleParty(ix, t, h.id))}
        >
          {h.porter
            ? inParty
              ? "Carrying for the party"
              : "Take along"
            : inParty
              ? "In the party"
              : "Add to party"}
        </button>
        <div className="seg" role="group" aria-label="Row" hidden={!!h.porter}>
          {(["front", "back"] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={h.row === r ? "on" : ""}
              aria-pressed={h.row === r}
              onClick={() => act((t) => setRow(ix, t, h.id, r))}
            >
              {r === "front" ? "Front" : "Back"}
            </button>
          ))}
        </div>
      </div>
      <StatSheet hero={h} full />
      <ClassList hero={h} town={town} />
      <PerkList hero={h} />
      <AbilityList hero={h} />

      <h4>
        Gear{" "}
        <button
          type="button"
          className="link small"
          title={`Fill in the ${ix.cls(h.classId).name.toLowerCase()}'s usual kit (${ix
            .cls(h.classId)
            .startingKit.map((id) => ix.item(id).name)
            .join(", ")}): from the store room first, then the Market.`}
          onClick={() => act((t) => kitOut(ix, t, h.id))}
        >
          Kit out
        </button>
      </h4>
      <ul className="gear">
        {EQUIP_SLOTS.map((slot) => {
          const id = h.equipment[slot];
          const spare = tally(town.stash.filter((x) => ix.item(x).slot === slot));
          return (
            <li key={slot}>
              <span className="muted">{SLOT_NAMES[slot]}</span>
              <span>
                {id ? (
                  <>
                    {ix.item(id).name}{" "}
                    <span className="muted small">{describeItem(ix.item(id))}</span>
                  </>
                ) : (
                  <span className="muted">none</span>
                )}
              </span>
              <span className="gear-actions">
                {spare.length ? (
                  <select
                    value=""
                    aria-label={`Swap ${SLOT_NAMES[slot].toLowerCase()}`}
                    onChange={(e) => act((t) => equip(ix, t, h.id, e.target.value))}
                  >
                    <option value="">{id ? "Swap…" : "Equip…"}</option>
                    {spare.map(([x, n]) => (
                      <option key={x} value={x}>
                        {ix.item(x).name}
                        {n > 1 ? ` (${n})` : ""}
                      </option>
                    ))}
                  </select>
                ) : null}
                {id ? (
                  <button
                    type="button"
                    className="link"
                    onClick={() => act((t) => unequip(ix, t, h.id, slot))}
                  >
                    Take off
                  </button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      <h4>
        Pack{" "}
        <span className="muted small">
          ({h.pack.length}/{sheet.derived.carrySlots} slots; the rest carries loot)
        </span>
      </h4>
      <div className="pack">
        {h.pack.map((id, i) => (
          <button
            key={i}
            type="button"
            className="chip"
            title={`${describeItem(ix.item(id))}. Click to put back in the store room.`}
            onClick={() => act((t) => unpackItem(ix, t, h.id, i))}
          >
            {ix.item(id).name} ×
          </button>
        ))}
        {supplies.length && !packFull ? (
          <select
            value=""
            aria-label="Pack supplies"
            onChange={(e) => act((t) => packItem(ix, t, h.id, e.target.value))}
          >
            <option value="">Pack…</option>
            {supplies.map(([x, n]) => (
              <option key={x} value={x}>
                {ix.item(x).name} ({n})
              </option>
            ))}
          </select>
        ) : null}
        {!h.pack.length && !supplies.length ? <span className="muted small">Empty.</span> : null}
      </div>

      <p className="record muted small">
        {rec
          ? `${rec.trips} ${rec.trips === 1 ? "trip" : "trips"}, ${rec.kills} kills, joined day ${rec.joined}.`
          : null}{" "}
        <button
          type="button"
          className="link danger"
          onClick={() => {
            if (confirm(`Dismiss ${h.name}? Their gear stays with the guild.`))
              act((t) => dismiss(ix, t, h.id));
          }}
        >
          Dismiss
        </button>
      </p>
    </li>
  );
}
