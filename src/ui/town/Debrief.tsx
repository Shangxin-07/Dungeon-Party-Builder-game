/**
 * The debrief (M7.03, DESIGN.md §17.4): when a party is back, what the trip
 * amounted to (the tally, each line opening to the detail), and the haul
 * waiting for the player to sell, salvage or keep. Earlier trips stay listed,
 * each with its own debrief and a replay.
 */
import { useState } from "react";
import { timeBelow } from "../../sim/expedition";
import {
  HAUL_RULES,
  haulPlan,
  haulSale,
  materialWords,
  salvageOf,
  researchDesks,
  researchPlan,
  researchable,
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
import { ItemIcon, MonsterIcon } from "../art/Icon";
import { Portrait } from "../art/Portrait";
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

/** How a lair went (M7.08), in words. */
function lairLine(id: string, outcome: string): string {
  const lair = ix.lair(id);
  const beast = ix.monster(lair.monster).name;
  const where = lair.name.replace(/^The /, "the ");
  return (
    {
      fetched: `They crept into ${where} and out again without waking the ${beast}.`,
      slain: `They killed the ${beast} and emptied ${where}.`,
      fled: `They ran from the ${beast}: nothing they had could hurt it. The Library needs to study it first.`,
      fought: `They fought the ${beast} and couldn't finish it.`,
      empty: `${where[0]!.toUpperCase()}${where.slice(1)} was empty: the ${beast} is dead.`,
    }[outcome as "fetched"] ?? ""
  );
}

/** A deserter's account (M7.05) shares its trip's seed: tell them apart. */
const tripKey = (t: TripReport) => `${t.seed}:${t.account?.by ?? ""}`;

const hoursWord = (h: number) => {
  const day = Math.floor((ix.lib.time.startHour + h) / 24) + 1;
  const hour = Math.floor((ix.lib.time.startHour + h) % 24);
  return `day ${day}, ${String(hour).padStart(2, "0")}:00`;
};

/**
 * Parties back from below: the newest trip's debrief (or one picked from the
 * list), and the haul waiting in town.
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
  const trips = [...town.trips].reverse();
  const [pick, setPick] = useState<string>();
  const waiting = town.haul;
  if (!trips.length && !waiting.length) return null;
  const trip = trips.find((t) => tripKey(t) === pick) ?? trips[0];
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
              <li key={tripKey(t)}>
                {summary(t)}{" "}
                <button type="button" className="link" onClick={() => setPick(tripKey(t))}>
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
  // The debrief has the centre pane's tab to itself (M8.42), so it is never folded away.
  return (
    <section className="panel debrief" aria-labelledby="debrief-heading">
      <div className="fold-head">
        <h2 id="debrief-heading">
          {waiting.length ? "Debrief" : "Back from below"}
          {trip?.name ? `: ${trip.name}` : ""}
        </h2>
        <span className="fold-summary">
          {waiting.length
            ? `${waiting.length} ${waiting.length === 1 ? "piece" : "pieces"} of haul waiting`
            : summary(trip!)}
        </span>
        <span className="fold-actions">{watch}</span>
      </div>
      {body}
    </section>
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
      <ul className="debrief-faces" aria-label="Who went">
        {r.party.map((h) => (
          <li key={h.id} className={h.condition === "dead" ? "fallen" : ""}>
            <Portrait hero={h} size={44} />
            <span className="small">
              {h.name}
              {h.condition === "dead" ? " ✕" : h.injuries.length ? " (hurt)" : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="small">
        {summary(trip)}{" "}
        <button type="button" className="link" onClick={() => onWatch(trip)}>
          Watch it
        </button>
      </p>
      {trip.account ? (
        <p className="small warn account">
          This is {trip.account.by}'s account, and only theirs: they slipped away on floor{" "}
          {trip.account.floor} and came home alone. It stops where they ran, and nothing after is
          known until the party is heard of. {trip.account.blame} The replay is the real thing, up
          to that point.
        </p>
      ) : null}
      {trip.leader || trip.deserters?.length ? (
        <p className="small">
          {trip.leader ? `Led by ${trip.leader}.` : ""}
          {trip.traits?.length
            ? ` ${trip.leader} came back ${trip.traits.join(" and ").toLowerCase()}.`
            : ""}
          {trip.deserters?.length && !trip.account
            ? ` Deserted: ${trip.deserters
                .map((d) => `${d.name} on floor ${d.floor}${d.home ? "" : " (never made it home)"}`)
                .join(", ")}.`
            : ""}
        </p>
      ) : null}
      {r.intel?.length &&
      (r.outcome === "returned" || r.outcome === "retreated") &&
      !trip.account ? (
        <p className="small good">
          Scouted floor{r.intel.length === 1 ? "" : "s"}{" "}
          {r.intel
            .map((i) => i.floor)
            .join(", ")
            .replace(/, (\d+)$/, " and $1")}
          {r.slipped
            ? `, slipping past ${r.slipped} ${r.slipped === 1 ? "group" : "groups"} of monsters`
            : ""}
          . What they saw is in the scouting report.
        </p>
      ) : null}
      {r.lair && !trip.account ? (
        <p
          className={`small ${r.lair.outcome === "fetched" || r.lair.outcome === "slain" ? "good" : "warn"}`}
        >
          {lairLine(r.lair.id, r.lair.outcome)}
          {r.sneaked
            ? ` On the way they got past ${r.sneaked.past} ${r.sneaked.past === 1 ? "group" : "groups"} unheard and were heard by ${r.sneaked.heard}.`
            : ""}
        </p>
      ) : null}
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
          {t.slain.length ? (
            <span className="icon-strip" aria-hidden="true">
              {t.slain.map((l) => (
                <span key={l.id} className="icon-count" title={`${l.name} ×${l.count}`}>
                  <MonsterIcon id={l.id} name={l.name} size={28} />
                  {l.count > 1 ? <span className="kit-count">{l.count}</span> : null}
                </span>
              ))}
            </span>
          ) : null}
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
                  <td>
                    <MonsterIcon id={l.id} name={l.name} size={20} />
                    {l.name}
                  </td>
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
          <HaulIcons trip={trip} />
        </summary>
        <p className="small">
          {trip.coins !== undefined
            ? `The coins went straight into the purse and the materials into the store. ` +
              (trip.held
                ? `The rest was worth about ${trip.goldEarned - (trip.coins ?? 0)} gold at the Market the day it came home${
                    town.haul.some((h) => h.day === trip.back && h.from === trip.name)
                      ? ": what's still waiting is below."
                      : ", and it's been dealt with."
                  }`
                : "")
            : `The Market paid ${trip.goldEarned} gold for it on the way in.`}
        </p>
        <SharesLine town={town} trip={trip} />
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
    .filter((h) => !town.outings.some((o) => o.heroes.includes(h.id)));
  const ups = back.filter((h) => h.levelUps.length).map((h) => h.name);
  const hurt = back.filter((h) => h.injuries.length).map((h) => h.name);
  const raise = back.filter((h) => h.raiseAsk).map((h) => h.name);
  const out: string[] = [];
  if (ups.length) out.push(`level-ups for ${ups.join(", ")} (Roster)`);
  if (hurt.length) out.push(`${hurt.join(", ")} hurt and benched until healed`);
  if (raise.length) out.push(`${raise.join(", ")} asking for a raise`);
  return out;
}

/** The haul waiting in town: each piece sold, salvaged or kept. */
function HaulChoices({ town, act }: { town: TownState; act: Act }) {
  const held = town.haul;
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
  const studied = held.filter((h) => choice(h) === "research").length;
  const library = researchDesks(ix, town) > 0;
  const canStudy = held.some((h) => researchable(ix, town, h.item));
  const outcome = [
    gold ? `${gold} gold` : "",
    Object.keys(got).length ? materialWords(ix, got) : "",
    kept ? `${kept} kept` : "",
    studied ? `${studied} to the Library` : "",
  ].filter(Boolean);
  return (
    <div className="haul-choices">
      <h3>The haul</h3>
      <p className="small muted">
        Sell at the Market (coins already went in the purse), salvage at the Blacksmith into
        materials for building
        {smith ? ` (${smith}% yield)` : ", once there is one"}, keep it in the store room, or send
        it to the Library to be researched{library ? "" : ", once there is one"}: specimens teach
        the guild about the monsters they came from, and strange finds turn out to be something.
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
        <button
          type="button"
          className="btn"
          disabled={!canStudy}
          title={
            canStudy
              ? "Everything the Library can learn from goes there; the rest as the haul rule says"
              : library
                ? "Nothing here for the Library"
                : "Research needs a Library"
          }
          onClick={() => setPicked(researchPlan(ix, town))}
        >
          Research what's new
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
            <th>Research</th>
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
                  <ItemIcon id={h.item} size={20} />
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
                <td>
                  {ix.item(h.item).research
                    ? radio("research", library ? researchWords(h.item) : "no Library", !library)
                    : null}
                </td>
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

/** What sending a piece to the Library does, in a few words. */
function researchWords(itemId: string): string {
  const r = ix.item(itemId).research!;
  if (r.monsters?.length)
    return `+${r.points} on ${r.monsters.map((m) => ix.monster(m).name).join(", ")}`;
  return `identify (${r.points} pts)`;
}

function summary(trip: TripReport): string {
  const r = trip.result;
  const name = trip.name ?? "The party";
  const when = trip.back ? `day ${trip.day} to ${trip.back}` : `day ${trip.day}`;
  // A deserter's account (M7.05): all anyone knows is where they left the party.
  if (trip.account)
    return `${name} (${when}): ${trip.account.by} came home alone and says they left the party on floor ${trip.account.floor}.`;
  const time = r.hours !== undefined ? `, ${timeBelow(r.hours)} below` : "";
  const coin = trip.coins ?? trip.goldEarned;
  return (
    `${name} (${when}${time}) reached floor ${r.deepestFloor} and ${WHAT[r.outcome]}.` +
    `${coin ? ` +${coin} gold${trip.coins !== undefined ? " in coin" : ""}.` : ""}` +
    `${trip.held ? ` ${trip.held} ${trip.held === 1 ? "piece" : "pieces"} of haul.` : ""}` +
    `${trip.materials && Object.keys(trip.materials).length ? ` +${materialWords(ix, trip.materials)}.` : ""}`
  );
}

/** Who took what share of the haul (M7.12). */
function SharesLine({ town, trip }: { town: TownState; trip: TripReport }) {
  const shares = Object.entries(trip.shares ?? {});
  if (!shares.length) return null;
  const total = shares.reduce((s, [, n]) => s + n, 0);
  const name = (id: string) =>
    trip.party.find((h) => h.id === id)?.name ?? town.roster.find((h) => h.id === id)?.name ?? "?";
  return (
    <p className="small">
      {total ? (
        <>
          The party took its {ix.lib.town.shares.percent}% share, <strong>{total}</strong> gold:{" "}
          {shares.map(([id, n]) => `${name(id)} ${n}`).join(", ")}.
        </>
      ) : (
        <>Nothing to share out, so the trip cost the guild no pay.</>
      )}
    </p>
  );
}

/** Everything the party carried home, as icons with counts: coins, materials, then the rest. */
function HaulIcons({ trip }: { trip: TripReport }) {
  const counts = new Map<string, number>();
  for (const h of trip.result.haul) if (!h.keep) counts.set(h.item, (counts.get(h.item) ?? 0) + 1);
  if (!counts.size) return null;
  const rank = (id: string) => {
    const item = ix.item(id);
    return item.tags.includes("coins") ? 0 : item.slot === "material" ? 1 : 2;
  };
  const lines = [...counts].sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1]);
  return (
    <span className="icon-strip" aria-hidden="true">
      {lines.map(([id, n]) => (
        <span key={id} className="icon-count" title={`${ix.item(id).name}${n > 1 ? ` ×${n}` : ""}`}>
          <ItemIcon id={id} size={28} />
          {n > 1 ? <span className="kit-count">{n}</span> : null}
        </span>
      ))}
    </span>
  );
}
