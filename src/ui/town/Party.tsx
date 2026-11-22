/**
 * Party, formation and orders, and the saved parties A and B.
 */
import { Fold } from "../Fold";
import { library } from "../../content";
import type { Row } from "../../content/types";
import { describeParty, partyAlignment } from "../../sim/alignment";
import { describeRetreat, isScouting, isSneaking, type LootRule } from "../../sim/expedition";
import { knownLairs, lairSlain, partyStealth, sneakChance } from "../../sim/stealth";
import { heroSheet, heroTitle } from "../../sim/hero";
import { commandOf, leadershipOf, traitsOf } from "../../sim/leadership";
import {
  cantLaunch,
  fmtCommand,
  nextCommand,
  setLeader,
  launchWarnings,
  partyOnFile,
  partySlots,
  pickParty,
  renameParty,
  sameOrders,
  saveParty,
  savedParty,
  cancelRescue,
  rescueTarget,
  outingOf,
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
  const target = rescueTarget(town);
  const cmd = nextCommand(ix, town);
  const scouting = isScouting(town.orders);
  const sneaking = isSneaking(town.orders);
  const lairChoices = knownLairs(ix, town).filter((l) => !sneaking || !lairSlain(town, l.id));
  const openLairs = knownLairs(ix, town).filter((l) => !lairSlain(town, l.id));
  const lairDef = town.orders.lair && !target ? ix.lair(town.orders.lair) : undefined;
  const lairName = lairDef?.name.replace(/^The /, "the ");
  const lairBeast = lairDef ? ix.monster(lairDef.monster) : undefined;
  const quiet = partyStealth(ix, party);
  const bestScout = party
    .map((h) => ({ name: h.name, value: heroSheet(ix, h).skills.scouting ?? 0 }))
    .sort((a, b) => b.value - a.value)[0];
  const sr = ix.lib.scouting;
  const slipChance = Math.min(
    sr.slipMax,
    Math.max(0, ((bestScout?.value ?? 0) + sr.slipBase) / 100),
  );

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
      {target ? (
        <p className="mission">
          {town.orders.mission === "rescue" ? "Rescue party" : "Recovery party"}: down to floor{" "}
          {town.orders.targetFloor} to {missionGoal(town)}.{" "}
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
                    {cmd.leader?.id === h.id ? (
                      <strong className="leader-mark">Leader · </strong>
                    ) : null}
                    {heroTitle(ix, h, true)} · {ix.alignment(h.alignment).name} · morale {h.morale}{" "}
                    · {describeKit(h)}
                    {cmd.leader && cmd.leader.id !== h.id
                      ? ` · costs ${fmtCommand(cmd.costs[h.id] ?? 1)} command`
                      : ""}
                  </span>
                </div>
              ))
            ) : (
              <p className="muted small quiet">Nobody.</p>
            )}
          </div>
        ))}
      </div>
      {party.length ? <LeaderLine town={town} act={act} /> : null}
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
        {target ? null : (
          <label title="Scouts slip past fights where their best scout can and bring home what they saw. A sneak party creeps to a lair the scouts found and back, as quiet as its loudest member, to fetch what it can without waking the beast.">
            Mission{" "}
            <select
              value={sneaking ? "sneak" : scouting ? "scout" : "delve"}
              onChange={(e) =>
                act((t) => {
                  const { mission: _, lair: __, ...rest } = t.orders;
                  const m = e.target.value;
                  if (m === "scout") return setOrders(ix, t, { ...rest, mission: "scout" });
                  if (m === "sneak") {
                    const l = openLairs[0]!;
                    return setOrders(ix, t, {
                      ...rest,
                      mission: "sneak",
                      lair: l.id,
                      targetFloor: l.floor,
                    });
                  }
                  return setOrders(ix, t, rest);
                })
              }
            >
              <option value="delve">delve</option>
              <option value="scout">scout</option>
              <option value="sneak" disabled={!openLairs.length}>
                sneak{openLairs.length ? "" : " (scouts haven't found a lair yet)"}
              </option>
            </select>
          </label>
        )}
        {target || scouting || !lairChoices.length ? null : (
          <label title="A huge beast's lair the scouts found, off the main tunnels. Ordinary trips never go in.">
            Lair{" "}
            <select
              value={town.orders.lair ?? ""}
              onChange={(e) =>
                act((t) => {
                  const { lair: _, ...rest } = t.orders;
                  const l = lairChoices.find((x) => x.id === e.target.value);
                  return setOrders(ix, t, l ? { ...rest, lair: l.id, targetFloor: l.floor } : rest);
                })
              }
            >
              {sneaking ? null : <option value="">stay out of lairs</option>}
              {lairChoices.map((l) => (
                <option key={l.id} value={l.id}>
                  {sneaking ? "sneak into" : "kill what lives in"} {l.name.replace(/^The /, "the ")}{" "}
                  (floor {l.floor})
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {scouting ? "Scout down to floor" : "Go to floor"}{" "}
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
        {scouting || sneaking ? null : (
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
        )}
      </div>
      {scouting ? (
        <p className="mission small">
          Scout party: down to floor {town.orders.targetFloor}, slipping past fights where{" "}
          {bestScout ? `${bestScout.name} (Scouting ${bestScout.value})` : "the best scout"} can
          (about {Math.round(slipChance * 100)}% of them), and back with what they saw. It won't
          hunt, and it won't bring home much loot.
        </p>
      ) : null}
      {sneaking ? (
        <p className="mission small">
          Sneak party: down to floor {town.orders.targetFloor} and{" "}
          {lairName ? `into ${lairName}` : "back"}, as quiet as its loudest member
          {quiet.hero ? ` (${quiet.hero.name}, Stealth ${quiet.value + quiet.crowd}` : " ("}
          {quiet.crowd ? `, less ${quiet.crowd} for a party of ${party.length}` : ""}). Unheard
          about {Math.round(sneakChance(ix, quiet.value, ["goblin"]) * 100)}% of the time by a
          goblin band
          {lairBeast
            ? `, ${Math.round(sneakChance(ix, quiet.value, [lairBeast.id]) * 100)}% by the ${lairBeast.name}`
            : ""}
          . Heard means a fight. Heavy armour and some weapons are noisy; small parties sneak best.
        </p>
      ) : null}
      {!sneaking && lairBeast && !target ? (
        <p className="mission small warn">
          This party will go into {lairName} to kill the {lairBeast.name}
          {town.lairs?.[town.orders.lair!]?.slain ? " (it's already dead)" : ""}.
        </p>
      ) : null}

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

/** What a search is for, in words, without giving away what the town doesn't know. */
function missionGoal(town: TownState): string {
  const target = rescueTarget(town);
  if (!target) return "";
  if (target.outing || target.site?.outing)
    return `look for ${target.outing?.name ?? "the missing party"}`;
  const site = target.site!;
  if (site.unknown) return `look for ${site.party ?? "the lost party"}`;
  if (site.trapped.length) return `find ${site.trapped.map((x) => x.hero.name).join(" and ")}`;
  return `bring home what's left of ${site.bodies.map((b) => b.hero.name).join(" and ") || "the lost party"}`;
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
          const out = heroes.map((h) => outingOf(town, h.id)).find(Boolean);
          if (out) why = `Away below with ${out.name}.`;
          else if (p && heroes.length) {
            try {
              const picked = pickParty(ix, town, slot);
              why = cantLaunch(ix, picked);
              tired = launchWarnings(ix, picked).filter((w) => /fatigue|% HP/.test(w));
            } catch (e) {
              why = (e as Error).message;
            }
          }
          const sameCrew =
            !!p &&
            heroes.length > 0 &&
            sameIds(
              town.party,
              heroes.map((h) => h.id),
            );
          // Same heroes but other orders: launching now would not follow the card.
          const drifted = sameCrew && !sameOrders(p.orders, town.orders);
          const current = sameCrew && !drifted;
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
                    {drifted ? (
                      <span className="muted small"> (picked, with other orders)</span>
                    ) : null}
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
                    {isScouting(p.orders)
                      ? "Scouting down to floor"
                      : isSneaking(p.orders)
                        ? "Sneaking down to floor"
                        : "Floor"}{" "}
                    {p.orders.targetFloor}, {describeRetreat(p.orders.retreat)}
                    {p.orders.clearPercent ? `, thinning it out by ${p.orders.clearPercent}%` : ""}.
                  </p>
                  {drifted ? (
                    <p className="small warn">
                      The party below has these heroes but not these orders: floor{" "}
                      {town.orders.targetFloor}
                      {town.orders.clearPercent
                        ? `, thinning it out by ${town.orders.clearPercent}%`
                        : ", no hunting"}
                      . Pick to use the orders on file, or save the changes.
                    </p>
                  ) : null}
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
                      {sameCrew ? "Save changes" : "Replace with current"}
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

/**
 * Who leads the party, and how far their command stretches (M7.05, DESIGN.md
 * §17.5). Over command, the party is unruly.
 */
function LeaderLine({ town, act }: { town: TownState; act: Act }) {
  const cmd = nextCommand(ix, town);
  const party = town.party.map((id) => town.roster.find((h) => h.id === id)!).filter(Boolean);
  if (!cmd.leader) return null;
  const traits = traitsOf(ix, cmd.leader);
  const over = cmd.used - cmd.command;
  return (
    <div className={`command small${cmd.over > 0 ? " warn" : ""}`}>
      <label title="The leader's Leadership (CHA + WIL, and better with every trip they lead) sets how many heroes they can lead well. Cunning monsters go for the leader first.">
        Led by{" "}
        <select
          value={cmd.leader.id}
          onChange={(e) => act((t) => setLeader(ix, t, e.target.value))}
        >
          {party.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} (Leadership {leadershipOf(ix, h)}, command {commandOf(ix, h)})
            </option>
          ))}
        </select>
      </label>{" "}
      <span
        className="command-meter"
        title="Each hero costs command by alignment step from the leader: same 1, one step 1.5, two steps 2. Porters are free."
      >
        Command used{" "}
        <strong>
          {fmtCommand(cmd.used)} / {cmd.command}
        </strong>
      </span>
      {traits.length ? (
        <span className="muted"> · {traits.map((t) => t.name).join(", ")}</span>
      ) : null}
      {cmd.over > 0 ? (
        <span>
          {" "}
          ·{" "}
          {over > 0
            ? `${fmtCommand(over)} over: the party is unruly, and may ignore orders or desert.`
            : "Doubted: the party is unruly even within command."}
        </span>
      ) : (
        <span className="muted"> · within command.</span>
      )}
    </div>
  );
}
