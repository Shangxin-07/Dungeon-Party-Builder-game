/**
 * Party, formation and orders, and the saved parties A and B.
 */
import { Fold } from "../Fold";
import { library } from "../../content";
import type { Row } from "../../content/types";
import { describeParty, partyAlignment } from "../../sim/alignment";
import { describeRetreat, type LootRule } from "../../sim/expedition";
import { heroSheet, heroTitle } from "../../sim/hero";
import {
  cantLaunch,
  launchWarnings,
  partyOnFile,
  partySlots,
  pickParty,
  renameParty,
  saveParty,
  savedParty,
  cancelRescue,
  rescueSite,
  setOrders,
  type TownState,
} from "../../sim/town";
import { RETREATS } from "../Expedition";
import { ix } from "../game";
import { HeroBars } from "../Watch";
import { ScoutingReport } from "../Report";
import { type Act, describeKit } from "./shared";

export function PartyPanel({
  town,
  act,
  onLaunch,
}: {
  town: TownState;
  act: Act;
  /** Send the party, after `prep` (e.g. picking a party on file) if given. */
  onLaunch: (prep?: (t: TownState) => TownState) => void;
}) {
  const party = town.party.map((id) => town.roster.find((h) => h.id === id)!).filter(Boolean);
  const slots = partySlots(ix, town);
  const why = cantLaunch(ix, town);
  const warnings = launchWarnings(ix, town);
  const retreatId =
    RETREATS.find((r) => JSON.stringify(r.rule) === JSON.stringify(town.orders.retreat))?.id ??
    "hp-30";
  const row = (r: Row) => party.filter((h) => h.row === r);
  const site = rescueSite(town);

  return (
    <Fold
      id="party"
      defaultOpen
      actions={
        <button
          type="button"
          className="btn btn-main"
          disabled={!!why}
          title={why}
          onClick={() => onLaunch()}
        >
          Send them down
        </button>
      }
      title={
        <>
          The party{" "}
          <span className="muted">
            ({party.length}/{slots})
          </span>
        </>
      }
    >
      {site ? (
        <p className="mission">
          Rescue run: down to floor {site.floor} to find{" "}
          {site.trapped.length
            ? site.trapped.map((x) => x.hero.name).join(" and ")
            : `what's left of ${site.bodies.map((b) => b.hero.name).join(" and ") || "the lost party"}`}
          .{" "}
          <button type="button" className="link" onClick={() => act((t) => cancelRescue(ix, t))}>
            Make it an ordinary trip
          </button>
        </p>
      ) : null}
      <PartiesOnFile town={town} act={act} onLaunch={onLaunch} />
      <div className="formation">
        {(["front", "back"] as const).map((r) => (
          <div key={r} className="formation-row">
            <h3>{r === "front" ? "Front row" : "Back row"}</h3>
            {row(r).length ? (
              row(r).map((h) => (
                <div key={h.id} className="formation-hero">
                  <HeroBars hero={h} />
                  <span className="muted small">
                    {heroTitle(ix, h, true)} · {ix.alignment(h.alignment).name} · morale {h.morale}{" "}
                    · {describeKit(h)}
                  </span>
                </div>
              ))
            ) : (
              <p className="muted small quiet">Nobody.</p>
            )}
          </div>
        ))}
      </div>
      {party.length ? (
        <p
          className={`small${partyAlignment(ix, party).divided || partyAlignment(ix, party).mismatched.length ? " warn" : " muted"}`}
          title="Two-thirds of the party set its alignment; everyone else should be within one step (Good and Evil are two apart). Clashes cost morale every day down there."
        >
          {describeParty(ix, party)}
        </p>
      ) : null}
      {slots > party.length ? (
        <p className="muted small">
          {slots - party.length} empty {slots - party.length === 1 ? "slot" : "slots"}. Add heroes
          from the roster below.
        </p>
      ) : null}

      <div className="controls">
        <label>
          Go to floor{" "}
          <select
            value={town.orders.targetFloor}
            onChange={(e) =>
              act((t) => setOrders(ix, t, { ...t.orders, targetFloor: Number(e.target.value) }))
            }
          >
            {library.floors.map((f) => (
              <option key={f.depth} value={f.depth}>
                {f.depth}: {f.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Orders{" "}
          <select
            value={retreatId}
            onChange={(e) => {
              const rule = RETREATS.find((r) => r.id === e.target.value)!.rule;
              act((t) => setOrders(ix, t, { ...t.orders, retreat: rule }));
            }}
          >
            {RETREATS.map((r) => (
              <option key={r.id} value={r.id}>
                {describeRetreat(r.rule)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Loot{" "}
          <select
            value={town.orders.loot}
            onChange={(e) =>
              act((t) => setOrders(ix, t, { ...t.orders, loot: e.target.value as LootRule }))
            }
          >
            <option value="everything">carry everything</option>
            <option value="valuable">leave the junk</option>
          </select>
        </label>
        <label
          title={`After walking floor ${town.orders.targetFloor}, stay and hunt until this share of its monsters are dead. Each extra room takes about ${ix.lib.time.hunt} hours plus any fight; retreat orders still apply.`}
        >
          Hunting{" "}
          <select
            value={town.orders.clearPercent ?? 0}
            onChange={(e) =>
              act((t) =>
                setOrders(ix, t, {
                  ...t.orders,
                  clearPercent: Number(e.target.value) || undefined,
                }),
              )
            }
          >
            <option value={0}>just walk the floor</option>
            {[25, 50, 75, 100].map((p) => (
              <option key={p} value={p}>
                thin floor {town.orders.targetFloor} out by {p}%
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="small">
        Porters{" "}
        <span className="muted">
          ({(town.porters ?? []).length}/{ix.lib.town.porters.slots})
        </span>
        :{" "}
        {(town.porters ?? []).length ? (
          (town.porters ?? []).map((id) => town.roster.find((x) => x.id === id)?.name).join(", ") +
          ` ${(town.porters ?? []).length === 1 ? "carries" : "carry"} ${(
            town.porters ?? []
          ).reduce((s, id) => {
            const p = town.roster.find((x) => x.id === id);
            return s + (p ? heroSheet(ix, p).derived.carrySlots : 0);
          }, 0)} more slots of loot.`
        ) : (
          <span className="muted">
            none. Porters carry loot, don't fight, and run for home if the party falls.
          </span>
        )}
      </p>
      <ScoutingReport town={town} party={party} />
      {warnings.length ? (
        <ul className="warnings">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="btn btn-main" disabled={!!why} onClick={() => onLaunch()}>
        Send them down
      </button>
      {why ? <span className="muted small"> {why}</span> : null}
    </Fold>
  );
}

/** Same heroes, any order. */
export const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

/**
 * Parties on file (M6): keep two parties and alternate them, so one rests
 * while the other is down there. Pick one to make it the party, or pick and
 * send it in one go.
 */
export function PartiesOnFile({
  town,
  act,
  onLaunch,
}: {
  town: TownState;
  act: Act;
  onLaunch: (prep?: (t: TownState) => TownState) => void;
}) {
  const slots = Array.from({ length: ix.lib.town.savedParties }, (_, i) => i);
  // One-click sends, usable with the list folded away.
  const quick = slots.flatMap((slot) => {
    const p = savedParty(town, slot);
    if (!p || !partyOnFile(town, slot).heroes.length) return [];
    let why: string | undefined;
    try {
      why = cantLaunch(ix, pickParty(ix, town, slot));
    } catch (e) {
      why = (e as Error).message;
    }
    return [
      <button
        key={slot}
        type="button"
        className="btn"
        disabled={!!why}
        title={why}
        onClick={() => onLaunch((t) => pickParty(ix, t, slot))}
      >
        Send {p.name}
      </button>,
    ];
  });
  return (
    <Fold
      id="parties-on-file"
      level={3}
      className="parties-on-file"
      title="Parties on file"
      summary={quick.length ? undefined : "none kept yet"}
      actions={quick.length ? quick : undefined}
    >
      <ul className="cards">
        {slots.map((slot) => {
          const p = savedParty(town, slot);
          const { heroes, porters } = partyOnFile(town, slot);
          let why: string | undefined;
          let tired: string[] = [];
          if (p && heroes.length) {
            try {
              const picked = pickParty(ix, town, slot);
              why = cantLaunch(ix, picked);
              tired = launchWarnings(ix, picked).filter((w) => /fatigue|% HP/.test(w));
            } catch (e) {
              why = (e as Error).message;
            }
          }
          const current =
            !!p &&
            heroes.length > 0 &&
            sameIds(
              town.party,
              heroes.map((h) => h.id),
            );
          return (
            <li key={slot} className={`card party-card${current ? " in-party" : ""}`}>
              {p ? (
                <>
                  <h4>
                    <input
                      key={p.name}
                      className="party-name"
                      aria-label={`Name of party ${slot + 1}`}
                      defaultValue={p.name}
                      maxLength={24}
                      onBlur={(e) => {
                        if (e.target.value.trim() !== p.name)
                          act((t) => renameParty(ix, t, slot, e.target.value));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                    />
                    {current ? <span className="muted small"> (picked)</span> : null}
                  </h4>
                  <p className="small">
                    {heroes.length
                      ? heroes.map((h) => `${h.name} (${heroTitle(ix, h, true)})`).join(", ")
                      : "Nobody from it is left in the guild."}
                    {porters.length
                      ? `, carried for by ${porters.map((h) => h.name).join(", ")}`
                      : ""}
                  </p>
                  <p className="small muted">
                    Floor {p.orders.targetFloor}, {describeRetreat(p.orders.retreat)}
                    {p.orders.clearPercent ? `, thinning it out by ${p.orders.clearPercent}%` : ""}.
                  </p>
                  {why ? (
                    <p className="small warn">{why}</p>
                  ) : tired.length ? (
                    <p className="small warn">{tired.join(" ")}</p>
                  ) : heroes.length ? (
                    <p className="small good">Rested and ready.</p>
                  ) : null}
                  <div className="row-buttons">
                    <button
                      type="button"
                      className="btn"
                      disabled={!heroes.length || current}
                      onClick={() => act((t) => pickParty(ix, t, slot))}
                    >
                      Pick
                    </button>
                    <button
                      type="button"
                      className="btn btn-main"
                      disabled={!!why || !heroes.length}
                      onClick={() => onLaunch((t) => pickParty(ix, t, slot))}
                    >
                      Send {p.name}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={!town.party.length}
                      title="Keep the party below, its porters and orders, in this slot"
                      onClick={() => act((t) => saveParty(ix, t, slot))}
                    >
                      {current ? "Save changes" : "Replace with current"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h4>{`Party ${String.fromCharCode(65 + slot)}`}</h4>
                  <p className="small muted">
                    Empty. Pick heroes and orders below, then keep them here.
                  </p>
                  <button
                    type="button"
                    className="btn"
                    disabled={!town.party.length}
                    onClick={() => act((t) => saveParty(ix, t, slot))}
                  >
                    Keep the current party here
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </Fold>
  );
}
