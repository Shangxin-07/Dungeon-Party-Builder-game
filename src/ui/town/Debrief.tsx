/**
 * The debrief (M7.03, DESIGN.md §17.4): when a party is back, what the trip
 * amounted to (the tally, each line opening to the detail), and the haul
 * waiting for the player to sell, salvage or keep. Earlier trips stay listed,
 * each with its own debrief and a replay.
 */
import { useState } from "react";
import { Fold } from "../Fold";
import { timeBelow } from "../../sim/expedition";
import {
  HAUL_RULES,
  haulPlan,
  haulSale,
  materialWords,
  salvageOf,
  salvageYield,
  setHaulRule,
  settleHaul,
  tripTally,
  type HaulChoice,
  type HaulRule,
  type HeldItem,
  type TownState,
  type TripReport,
} from "../../sim/town";
import { ix } from "../game";
import type { Act } from "./shared";
import { TripTown } from "./Trip";

const WHAT = {
  returned: "came home with orders carried out",
  retreated: "turned back early",
  wiped: "fell in the dungeon",
  holed: "holed up below",
} as const;

const RULE_WORDS: Record<HaulRule, string> = {
  sell: "Sell everything",
  salvage: "Salvage what breaks down, sell the rest",
  keep: "Keep everything",
};

const hoursWord = (h: number) => {
  const day = Math.floor((ix.lib.time.startHour + h) / 24) + 1;
  const hour = Math.floor((ix.lib.time.startHour + h) % 24);
  return `day ${day}, ${String(hour).padStart(2, "0")}:00`;
};

/**
 * Parties back from below: the newest trip's debrief (or one picked from the
 * list), and the haul waiting in town. While haul waits, the panel stays open.
 */
export function DebriefPanel({
  town,
  act,
  onWatch,
}: {
  town: TownState;
  act: Act;
  onWatch: (trip: TripReport) => void;
}) {
  const trips = [...(town.trips ?? [])].reverse();
  const [pick, setPick] = useState<number>();
  const waiting = town.haul ?? [];
  if (!trips.length && !waiting.length) return null;
  const trip = trips.find((t) => t.seed === pick) ?? trips[0];
  const others = trips.filter((t) => t !== trip);
  const body = (
    <>
      {trip ? <Debrief town={town} trip={trip} onWatch={onWatch} /> : null}
      {waiting.length ? <HaulChoices town={town} act={act} /> : null}
      {others.length ? (
        <>
          <h3>Earlier trips</h3>
          <ul className="small">
            {others.map((t) => (
              <li key={t.seed}>
                {summary(t)}{" "}
                <button type="button" className="link" onClick={() => setPick(t.seed)}>
                  Debrief
                </button>{" "}
                <button type="button" className="link" onClick={() => onWatch(t)}>
                  Watch it
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
  const watch = trip ? (
    <button type="button" className="btn" onClick={() => onWatch(trip)}>
      Watch the trip
    </button>
  ) : null;
  if (waiting.length)
    return (
      <section className="panel debrief" aria-labelledby="debrief-heading">
        <div className="fold-head">
          <h2 id="debrief-heading">Debrief{trip?.name ? `: ${trip.name}` : ""}</h2>
          <span className="fold-summary">
            {waiting.length} {waiting.length === 1 ? "piece" : "pieces"} of haul waiting
          </span>
          <span className="fold-actions">{watch}</span>
        </div>
        {body}
      </section>
    );
  return (
    <Fold
      id="back"
      title="Back from below"
      defaultOpen={trip!.back === town.day}
      summary={summary(trip!)}
      actions={watch}
    >
      {body}
    </Fold>
  );
}

/** One trip's tally: each line opens to the detail. */
function Debrief({
  town,
  trip,
  onWatch,
}: {
  town: TownState;
  trip: TripReport;
  onWatch: (trip: TripReport) => void;
}) {
  const r = trip.result;
  const t = tripTally(ix, trip);
  const dead = r.party.filter((h) => h.condition === "dead");
  const todo = waitingOn(town, trip);
  return (
    <div className="tally">
      <p className="small">
        {summary(trip)}{" "}
        <button type="button" className="link" onClick={() => onWatch(trip)}>
          Watch it
        </button>
      </p>
      <details>
        <summary>
          <strong>Time below:</strong>{" "}
          {t.hours !== undefined ? timeBelow(t.hours) : `${t.days} days`}; deepest floor {t.deepest}
          {t.camps ? `; camped ${t.camps === 1 ? "once" : `${t.camps} times`} in the tunnels` : ""}
        </summary>
        <ul className="small">
          {t.floors.map((f) => (
            <li key={f.floor}>
              <strong>Floor {f.floor}</strong>
              {f.from !== undefined
                ? ` (${hoursWord(f.from)} to ${hoursWord(f.to ?? f.from)})`
                : ""}
              : {f.rooms.length} {f.rooms.length === 1 ? "room" : "rooms"}, {f.fights}{" "}
              {f.fights === 1 ? "fight" : "fights"}
              {f.rests ? `, rested ${f.rests === 1 ? "once" : `${f.rests} times`}` : ""}
              {f.camps ? `, camped ${f.camps === 1 ? "once" : `${f.camps} times`}` : ""}.
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary>
          <strong>Rooms visited:</strong> {t.rooms}
          {t.caches ? ` (${t.caches} hidden ${t.caches === 1 ? "cache" : "caches"} found)` : ""}
        </summary>
        <ul className="small">
          {t.floors.map((f) => (
            <li key={f.floor}>
              <strong>Floor {f.floor}:</strong>{" "}
              {f.rooms
                .map((room) =>
                  room.what.length ? `${room.name} (${room.what.join(", ")})` : room.name,
                )
                .join(", ")}
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary>
          <strong>Monsters slain:</strong> {t.slainTotal}
          {t.biggest ? `; the biggest, ${t.biggest.name}, by ${t.biggest.by}` : ""}
        </summary>
        {t.slain.length ? (
          <table className="haul">
            <thead>
              <tr>
                <th>Monster</th>
                <th>Slain</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {t.slain.map((l) => (
                <tr key={l.id}>
                  <td>{l.name}</td>
                  <td>{l.count}</td>
                  <td>
                    {Object.entries(l.by)
                      .sort((a, b) => b[1] - a[1])
                      .map(([who, n]) => `${who || "no one in particular"}${n > 1 ? ` ×${n}` : ""}`)
                      .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="small muted">Nothing died at their hands.</p>
        )}
      </details>
      <details>
        <summary>
          <strong>Haul:</strong> {t.pieces} {t.pieces === 1 ? "piece" : "pieces"}
          {t.coins ? `, ${t.coins} gold in coin` : ""}
          {trip.materials && Object.keys(trip.materials).length
            ? `, ${materialWords(ix, trip.materials)}`
            : ""}
        </summary>
        <p className="small">
          {trip.coins !== undefined
            ? `The coins went straight into the purse and the materials into the store. ` +
              (trip.held
                ? `The rest was worth about ${trip.goldEarned - (trip.coins ?? 0)} gold at the Market the day it came home${
                    (town.haul ?? []).some((h) => h.day === trip.back && h.from === trip.name)
                      ? ": what's still waiting is below."
                      : ", and it's been dealt with."
                  }`
                : "")
            : `The Market paid ${trip.goldEarned} gold for it on the way in.`}
        </p>
      </details>
      <details>
        <summary>
          <strong>The party:</strong> {r.party.length - dead.length} of {r.party.length} home
          {dead.length ? `; the fallen: ${dead.map((h) => h.name).join(", ")}` : ""}
        </summary>
        <TripTown town={town} trip={trip} brief />
      </details>
      {todo.length ? (
        <p className="small warn">
          <strong>Waiting on you:</strong> {todo.join("; ")}.
        </p>
      ) : null}
    </div>
  );
}

/** Choices a return brings: level-ups to spend, the hurt, raises asked for. */
function waitingOn(town: TownState, trip: TripReport): string[] {
  const back = trip.party
    .map((h) => town.roster.find((x) => x.id === h.id))
    .filter((h) => !!h)
    .filter((h) => !(town.outings ?? []).some((o) => o.heroes.includes(h.id)));
  const ups = back.filter((h) => h.levelUps.length).map((h) => h.name);
  const hurt = back.filter((h) => h.injuries?.length).map((h) => h.name);
  const raise = back.filter((h) => h.raiseAsk).map((h) => h.name);
  const out: string[] = [];
  if (ups.length) out.push(`level-ups for ${ups.join(", ")} (Roster)`);
  if (hurt.length) out.push(`${hurt.join(", ")} hurt and benched until healed`);
  if (raise.length) out.push(`${raise.join(", ")} asking for a raise`);
  return out;
}

/** The haul waiting in town: each piece sold, salvaged or kept. */
function HaulChoices({ town, act }: { town: TownState; act: Act }) {
  const held = town.haul ?? [];
  const [picked, setPicked] = useState<Record<string, HaulChoice>>({});
  const plan = haulPlan(ix, town);
  const choice = (h: HeldItem) => picked[h.id] ?? plan[h.id] ?? "sell";
  const smith = salvageYield(ix, town);
  const all = (c: HaulChoice) =>
    setPicked(
      Object.fromEntries(
        held.map((h) => [h.id, c === "salvage" && !salvageOf(ix, town, h.item) ? "sell" : c]),
      ),
    );
  const choices = Object.fromEntries(held.map((h) => [h.id, choice(h)]));
  const gold = held
    .filter((h) => choice(h) === "sell")
    .reduce((s, h) => s + haulSale(ix, town, h), 0);
  const got: Record<string, number> = {};
  for (const h of held)
    if (choice(h) === "salvage")
      for (const [m, n] of Object.entries(salvageOf(ix, town, h.item) ?? {}))
        got[m] = (got[m] ?? 0) + n;
  const kept = held.filter((h) => choice(h) === "keep").length;
  const outcome = [
    gold ? `${gold} gold` : "",
    Object.keys(got).length ? materialWords(ix, got) : "",
    kept ? `${kept} kept` : "",
  ].filter(Boolean);
  return (
    <div className="haul-choices">
      <h3>The haul</h3>
      <p className="small muted">
        Sell at the Market (coins already went in the purse), salvage at the Blacksmith into
        materials for building
        {smith ? ` (${smith}% yield)` : ", once there is one"}, or keep it in the store room.
      </p>
      <div className="row-buttons">
        <button type="button" className="btn" onClick={() => all("sell")}>
          Sell all
        </button>
        <button
          type="button"
          className="btn"
          disabled={!smith}
          title={smith ? undefined : "Salvage needs a working Blacksmith"}
          onClick={() => all("salvage")}
        >
          Salvage all
        </button>
        <button type="button" className="btn" onClick={() => all("keep")}>
          Keep all
        </button>
      </div>
      <table className="haul">
        <thead>
          <tr>
            <th>Item</th>
            <th>From</th>
            <th>Sell</th>
            <th>Salvage</th>
            <th>Keep</th>
          </tr>
        </thead>
        <tbody>
          {held.map((h) => {
            const salvage = salvageOf(ix, town, h.item);
            const radio = (c: HaulChoice, label: string, disabled = false) => (
              <label className={disabled ? "muted" : undefined}>
                <input
                  type="radio"
                  name={`haul-${h.id}`}
                  checked={choice(h) === c}
                  disabled={disabled}
                  onChange={() => setPicked((p) => ({ ...p, [h.id]: c }))}
                />{" "}
                {label}
              </label>
            );
            return (
              <tr key={h.id}>
                <td>
                  {ix.item(h.item).name}
                  {h.hidden ? <span className="muted small"> (hidden cache)</span> : null}
                </td>
                <td className="small muted">
                  {h.from}, day {h.day}
                </td>
                <td>{radio("sell", `${haulSale(ix, town, h)} gold`)}</td>
                <td>
                  {radio(
                    "salvage",
                    salvage ? materialWords(ix, salvage) : smith ? "nothing in it" : "no smith",
                    !salvage,
                  )}
                </td>
                <td>{radio("keep", "store room")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="row-buttons">
        <button
          type="button"
          className="btn btn-main"
          onClick={() => {
            act((t) => settleHaul(ix, t, choices));
            setPicked({});
          }}
        >
          Done{outcome.length ? `: ${outcome.join(", ")}` : ""}
        </button>
        <label className="small">
          New hauls start as{" "}
          <select
            value={town.haulRule ?? "sell"}
            onChange={(e) => {
              act((t) => setHaulRule(ix, t, e.target.value as HaulRule));
              setPicked({});
            }}
          >
            {HAUL_RULES.map((r) => (
              <option key={r} value={r}>
                {RULE_WORDS[r]}
              </option>
            ))}
          </select>
        </label>
      </p>
    </div>
  );
}

function summary(trip: TripReport): string {
  const r = trip.result;
  const name = trip.name ?? "The party";
  const when = trip.back ? `day ${trip.day} to ${trip.back}` : `day ${trip.day}`;
  const time = r.hours !== undefined ? `, ${timeBelow(r.hours)} below` : "";
  const coin = trip.coins ?? trip.goldEarned;
  return (
    `${name} (${when}${time}) reached floor ${r.deepestFloor} and ${WHAT[r.outcome]}.` +
    `${coin ? ` +${coin} gold${trip.coins !== undefined ? " in coin" : ""}.` : ""}` +
    `${trip.held ? ` ${trip.held} ${trip.held === 1 ? "piece" : "pieces"} of haul.` : ""}` +
    `${trip.materials && Object.keys(trip.materials).length ? ` +${materialWords(ix, trip.materials)}.` : ""}`
  );
}
