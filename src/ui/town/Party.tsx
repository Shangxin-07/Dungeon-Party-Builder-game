/**
 * Party, formation and orders, and the saved parties A and B.
 */
import { askConfirm } from "../Confirm";
import { Fold, openFold, showFold } from "../Fold";
import type { Row } from "../../content/types";
import { describeParty, partyAlignment } from "../../sim/alignment";
import { tiesAmong, tieText } from "../../sim/ties";
import {
  describeRetreat,
  isScouting,
  isSneaking,
  type LootRule,
  type RetreatRule,
} from "../../sim/expedition";
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
  pickParty,
  renameParty,
  addParty,
  removeParty,
  sameOrders,
  fileDrift,
  saveParty,
  savedParty,
  cancelRescue,
  rescueTarget,
  outingOf,
  setOrders,
  barricadeChoices,
  materialWords,
  sealsNow,
  sealWord,
  setSeal,
  setStone,
  setCore,
  cantReachCore,
  type TownState,
} from "../../sim/town";
import { RETREATS } from "../Expedition";
import { Portrait } from "../art/Portrait";
import { KitStrip } from "./Roster";
import { SlimBars } from "./SlimBars";
import { ix } from "../game";
import type { Hero } from "../../sim/hero";
import { ScoutingReport } from "../Report";
import { stoneOf } from "../../sim/shards";
import { heartOn, heartState } from "../../sim/dungeon";
import type { Act } from "./shared";

/** A party's outline colour (M9.07): its alignment's colour, purple when divided. */
/** A retreat order in a few words, for a party on file's row. */
function retreatShort(r: RetreatRule): string {
  switch (r.kind) {
    case "never":
      return "never turns back";
    case "hero-hp-below":
      return `back below ${r.percent}% HP`;
    case "hero-downed":
      return "back if anyone's down";
    case "out-of-potions":
      return "back when out of potions";
  }
}

/** Open the Roster and that hero's card, and bring it into view. */
function showHeroCard(id: string) {
  openFold("roster");
  // The Roster may have been closed (M9.22: opening it closes the party), so
  // its cards only exist once it has drawn.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => showFold(`hero-${id}`, `hero-card-${id}`)),
  );
}

export function partyOutline(heroes: readonly Hero[]): string | undefined {
  if (!heroes.length) return undefined;
  return partyAlignment(ix, [...heroes]).alignment?.frame ?? "#9a6fd0";
}

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
  // Sealing the stairs below the target floor (M7.16): an ordinary delve only.
  const floor = town.orders.targetFloor;
  const canSeal = !scouting && !sneaking && !target && floor < town.dungeon.floors.length;
  const sealHere = sealsNow(ix, town).find((x) => x.floor === floor);
  // Seal Stones (M8.17): shut for good already, or stones in the store for this floor.
  const shut = town.dungeon.stones[floor];
  const stones = Object.keys(town.materials).filter(
    (id) => (town.materials[id] ?? 0) > 0 && stoneOf(ix, id)?.set.floor === floor,
  );
  if (town.orders.stone && !stones.includes(town.orders.stone)) stones.push(town.orders.stone);
  // A heart (M8.22): on its floor, an ordinary delve only, once the guild knows of it.
  const heart = heartOn(ix, floor);
  const coreHere =
    !scouting &&
    !sneaking &&
    !target &&
    !!heart &&
    !heartState(town.dungeon, heart.id).shut &&
    !!town.story[heart.revealedBy];
  const coreWhy = heart ? cantReachCore(ix, town, heart) : undefined;
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

  // The party's outline (M9.07): its alignment's colour, purple when divided.
  const align = party.length ? partyAlignment(ix, party) : undefined;
  const outline = partyOutline(party);
  const alignTrouble = align && (align.divided || align.mismatched.length || align.friction);
  // Tired heroes in one line instead of one each.
  const TIRED = /^(.+) is tired \(fatigue (\d+)\) and will fight worse\.$/;
  const tired = warnings.flatMap((w) => {
    const m = TIRED.exec(w);
    return m ? [`${m[1]} ${m[2]}`] : [];
  });
  // The alignment line above already says what's wrong with the mix.
  const alignText = align ? describeParty(ix, party) : "";
  const otherWarnings = warnings.filter((w) => !TIRED.test(w) && !alignText.includes(w));

  return (
    <Fold
      id="party"
      defaultOpen
      className={outline ? "party-outlined" : ""}
      style={outline ? { borderColor: outline } : undefined}
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
            ({party.length} {party.length === 1 ? "hero" : "heroes"}
            {align ? (
              <>
                ,{" "}
                <span style={{ color: outline }}>
                  {align.alignment ? align.alignment.name : "divided"}
                </span>
              </>
            ) : null}
            )
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
      {/* M9.06: each row a band, its heroes side by side as small tiles. */}
      <div className="formation formation-bands">
        {(["front", "back"] as const).map((r) => (
          <div key={r} className="formation-row">
            <h3>{r === "front" ? "Front" : "Back"}</h3>
            {row(r).length ? (
              <div className="formation-heroes">
                {row(r).map((h) => (
                  // M9.21 (#123): a tile opens that hero's card in the Roster.
                  <div
                    key={h.id}
                    className="formation-hero hero-tile tile-link"
                    role="button"
                    tabIndex={0}
                    title={`Show ${h.name}'s card in the Roster`}
                    onClick={() => showHeroCard(h.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        showHeroCard(h.id);
                      }
                    }}
                  >
                    <span
                      className="tile-face"
                      title={`${h.name}: ${ix.alignment(h.alignment).name}`}
                    >
                      <Portrait hero={h} size={40} />
                      {cmd.leader?.id === h.id ? <span className="lead-badge">Leader</span> : null}
                    </span>
                    <div className="tile-top">
                      <div className="fh-head">
                        <strong>{h.name}</strong>
                        <span className="muted small">{heroTitle(ix, h, true)}</span>
                      </div>
                      <SlimBars hero={h} />
                    </div>
                    <div className="tile-kit">
                      <KitStrip
                        hero={h}
                        slots={heroSheet(ix, h).derived.carrySlots}
                        size={16}
                        loot={false}
                      />
                      {cmd.leader?.id === h.id ? (
                        <strong
                          className={`small fh-cost cmd-${cmd.used < cmd.command ? "under" : cmd.used === cmd.command ? "full" : "over"}`}
                          title="Leader: command used by the party / this leader's command"
                        >
                          ({fmtCommand(cmd.used)}/{cmd.command})
                        </strong>
                      ) : cmd.leader ? (
                        <span
                          className="muted small fh-cost"
                          title="Command this hero costs the leader (by alignment step)"
                        >
                          {fmtCommand(cmd.costs[h.id] ?? 1)} cmd
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small quiet">Nobody.</p>
            )}
          </div>
        ))}
      </div>
      {party.length ? <LeaderLine town={town} act={act} /> : null}
      {alignTrouble ? (
        <p
          className="small warn"
          title="Two-thirds of the party set its alignment; everyone else should be within one step (Good and Evil are two apart). Clashes cost morale every day down there."
        >
          {alignText.replace(/^Party alignment: [^.]*\.\s*/, "")}
        </p>
      ) : null}
      {tiesAmong(ix, party).length ? (
        <p className="small muted party-ties">
          Ties:{" "}
          {tiesAmong(ix, party).map((t, i) => (
            <span key={`${t.a.id}-${t.b.id}`} title={`${t.tie.name}: ${tieText(t)}`}>
              {i ? ", " : ""}
              {t.a.name} &amp; {t.b.name}
            </span>
          ))}
        </p>
      ) : null}
      {party.length ? null : (
        <p className="muted small">
          Add heroes from the roster below. There's no limit: the leader's command says how many go
          well together.
        </p>
      )}

      <div className="controls party-orders">
        {target ? null : (
          <label title="Scouts slip past fights where their best scout can and bring home what they saw. A sneak party creeps to a lair the scouts found and back, as quiet as its loudest member, to fetch what it can without waking the beast.">
            Mission{" "}
            <select
              className="mission-pick"
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
                sneak{openLairs.length ? "" : " (no lair yet)"}
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
          {scouting ? "Scout to" : "Floor"}{" "}
          <select
            value={town.orders.targetFloor}
            onChange={(e) =>
              act((t) => setOrders(ix, t, { ...t.orders, targetFloor: Number(e.target.value) }))
            }
          >
            {town.dungeon.floors.map((_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}: {ix.floor(i + 1).name}
              </option>
            ))}
          </select>
        </label>
        <label className="wide" title="When the party turns back">
          Retreat{" "}
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
            Hunt{" "}
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
              <option value={0}>just walk it</option>
              {[25, 50, 75, 100].map((p) => (
                <option key={p} value={p}>
                  thin it out {p}%
                </option>
              ))}
            </select>
          </label>
        )}
        {canSeal && !shut ? (
          <label
            className="wide"
            title={`Carry a barricade down and seal the stairs below floor ${floor}: nothing comes up them until the floor below wears it down. Built after the floor is walked, before any hunting. A party that turns back first brings the materials home.`}
          >
            Stairs{" "}
            <select
              value={town.orders.stone ? `stone:${town.orders.stone}` : (town.orders.seal ?? "")}
              onChange={(e) => {
                const v = e.target.value;
                act((t) =>
                  v.startsWith("stone:")
                    ? setStone(ix, t, v.slice("stone:".length))
                    : setSeal(ix, setStone(ix, t, undefined), v || undefined),
                );
              }}
            >
              <option value="">leave them open</option>
              {stones.map((id) => (
                <option
                  key={id}
                  value={`stone:${id}`}
                  title="Shut the stairs for good. The floor below sends everything it can up the stairs to stop it."
                >
                  shut them for good: the {ix.item(id).name}
                </option>
              ))}
              {barricadeChoices(ix, town).map(({ barricade: b, why }) => (
                <option
                  key={b.id}
                  value={b.id}
                  disabled={!!why && town.orders.seal !== b.id}
                  title={b.description}
                >
                  seal them: {b.name.toLowerCase()} (
                  {[materialWords(ix, b.materials), b.gold ? `${b.gold} gold` : ""]
                    .filter(Boolean)
                    .join(", ")}
                  ){why ? `: ${why.toLowerCase().replace(/\.$/, "")}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {coreHere ? (
          <label
            title={
              coreWhy ??
              `Walk the floor, follow ${heart?.guide} down to the heart, fight what guards it, and shut it off for good.`
            }
          >
            The heart{" "}
            <select
              value={town.orders.core ? "shut" : ""}
              onChange={(e) => {
                const on = e.target.value === "shut";
                act((t) => setCore(ix, t, on));
              }}
            >
              <option value="">leave it beating</option>
              <option value="shut" disabled={!!coreWhy && !town.orders.core}>
                shut it off for good{coreWhy ? ": not yet" : ""}
              </option>
            </select>
          </label>
        ) : null}
      </div>
      {coreHere && town.orders.core ? (
        <p className="mission small">
          Going for the heart: after floor {floor} is walked, {heart?.guide} leads the party down to
          the heart of the {heart?.stone}. What guards it rises with the floor's own crew round it,
          and there's no slipping away: send the best the guild has, rested. Win, and they shut it
          off for good; its floor breeds no more.
        </p>
      ) : coreHere && coreWhy ? (
        <p className="small muted">{coreWhy}</p>
      ) : null}
      {canSeal && shut ? (
        <p className="small muted">
          The stairs below floor {floor} are held by the {ix.item(shut.stone).name}, set on day{" "}
          {shut.day}
          {shut.by ? ` by ${shut.by}` : ""}. Its gateway is{" "}
          {shut.damaged
            ? "breached"
            : `set to ${ix.lib.sealing.gateway.settings[shut.setting].name}`}{" "}
          (the Hearthstone panel, on the Pit tab).
        </p>
      ) : null}
      {canSeal && !shut && town.orders.stone ? (
        <p className="mission small">
          Setting the {ix.item(town.orders.stone).name}: after floor {floor} is walked, the party
          sets it on the stairs below. The floor below will send everything it can up the stairs at
          once, and there's no slipping away. Win, and nothing comes up those stairs again; lose or
          run, and the stone stays in the packs.
        </p>
      ) : null}
      {canSeal && !shut && sealHere ? (
        <p className="small muted">
          The stairs below floor {floor} are already sealed ({sealHere.name.toLowerCase()},{" "}
          {sealWord(sealHere.percent)}, {sealHere.percent}% left). A new barricade replaces it if
          it's stronger than what's left.
        </p>
      ) : null}
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
          {town.lairs[town.orders.lair!]?.slain ? " (it's already dead)" : ""}.
        </p>
      ) : null}

      <p
        className="small muted party-porters"
        title="Porters carry loot, don't fight, and run for home if the party falls. Add them from the roster."
      >
        Porters {town.porters.length}/{ix.lib.town.porters.slots}
        {town.porters.length
          ? `: ${town.porters.map((id) => town.roster.find((x) => x.id === id)?.name).join(", ")}, +${town.porters.reduce(
              (s, id) => {
                const p = town.roster.find((x) => x.id === id);
                return s + (p ? heroSheet(ix, p).derived.carrySlots : 0);
              },
              0,
            )} loot slots`
          : ""}
      </p>
      <ScoutingReport town={town} party={party} />
      {tired.length ? (
        <p className="small warn" title={warnings.filter((w) => TIRED.test(w)).join(" ")}>
          Tired, will fight worse: {tired.join(", ")}
        </p>
      ) : null}
      {otherWarnings.length ? (
        <ul className="warnings">
          {otherWarnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      {/* The send button is on the panel's heading (M9.07); here, only why it can't go. */}
      {why ? <p className="muted small">{why}</p> : null}
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
 * Parties on file (M6; any number since M9.03): keep a few crews and swap a
 * rested one in when another comes home hurt. One row each: name, faces,
 * orders, how they are, and Pick / Send / Save / Remove. "Add party" keeps
 * the current party as a new one.
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
  const slots = town.parties.map((_, i) => i);
  // One-click sends, usable with the list folded away.
  const quick = slots.flatMap((slot) => {
    const p = savedParty(town, slot)!;
    if (!partyOnFile(town, slot).heroes.length) return [];
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
  // The party being picked is already on file: adding it again would just copy it.
  const onFileAlready = town.parties.some(
    (p) => sameIds(p.heroes, town.party) && sameOrders(p.orders, town.orders),
  );
  return (
    <Fold
      id="parties-on-file"
      level={3}
      className="parties-on-file"
      title="Parties on file"
      summary={town.parties.length ? `${town.parties.length} kept` : "none kept yet"}
      actions={quick.length ? quick : undefined}
    >
      <ul className="party-rows">
        {slots.map((slot) => {
          const p = savedParty(town, slot)!;
          const { heroes, porters } = partyOnFile(town, slot);
          let why: string | undefined;
          let tired: string[] = [];
          const out = heroes.map((h) => outingOf(town, h.id)).find(Boolean);
          if (out) why = `Away below with ${out.name}.`;
          else if (heroes.length) {
            try {
              const picked = pickParty(ix, town, slot);
              why = cantLaunch(ix, picked);
              tired = launchWarnings(ix, picked).filter((w) => /fatigue|% HP/.test(w));
            } catch (e) {
              why = (e as Error).message;
            }
          }
          const sameCrew =
            heroes.length > 0 &&
            sameIds(
              town.party,
              heroes.map((h) => h.id),
            );
          // Same heroes but other orders, porters or leader (M9.21, #120):
          // launching now would not follow the card.
          const drift = sameCrew ? fileDrift(town, p) : [];
          const drifted = drift.length > 0;
          const current = sameCrew && !drifted;
          const status = why ? (
            <span className="warn">{why}</span>
          ) : tired.length ? (
            <span className="warn" title={tired.join(" ")}>
              {tired.length === 1 ? tired[0] : `${tired.length} of them are worn out`}
            </span>
          ) : heroes.length ? (
            <span className="good">Rested and ready.</span>
          ) : (
            <span className="muted">Nobody from it is left in the guild.</span>
          );
          return (
            <li
              key={slot}
              className={`party-row${current ? " in-party" : ""}${heroes.length ? " party-outlined" : ""}`}
              style={heroes.length ? { borderColor: partyOutline(heroes) } : undefined}
            >
              <div className="party-row-head">
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
                {current ? <span className="muted small">picked</span> : null}
                {drifted ? (
                  <span className="muted small">picked, other {drift.join(", ")}</span>
                ) : null}
                <span className="row-buttons">
                  <button
                    type="button"
                    className="btn small"
                    disabled={!heroes.length || current}
                    onClick={() => act((t) => pickParty(ix, t, slot))}
                  >
                    Pick
                  </button>
                  <button
                    type="button"
                    className="btn btn-main small"
                    disabled={!!why || !heroes.length}
                    title={why}
                    onClick={() => onLaunch((t) => pickParty(ix, t, slot))}
                  >
                    Send
                  </button>
                </span>
              </div>
              <div className="party-row-faces">
                {heroes.map((h) => (
                  <span key={h.id} title={`${h.name}, ${heroTitle(ix, h, true)}`}>
                    <Portrait hero={h} size={30} />
                  </span>
                ))}
                {porters.map((h) => (
                  <span key={h.id} className="porter-face" title={`${h.name}, porter`}>
                    <Portrait hero={h} size={24} />
                  </span>
                ))}
                <span className="small muted party-row-orders">
                  {isScouting(p.orders) ? "Scout to " : isSneaking(p.orders) ? "Sneak to " : ""}
                  floor {p.orders.targetFloor}
                  {p.orders.clearPercent ? `, thin ${p.orders.clearPercent}%` : ""}
                  {`, ${retreatShort(p.orders.retreat)}`}
                  {p.orders.loot === "valuable" ? ", valuables only" : ""}
                </span>
              </div>
              <div className="party-row-foot small" title={`${describeRetreat(p.orders.retreat)}`}>
                {drifted ? (
                  <span className="warn">
                    These heroes are picked with other {drift.join(", ")}. Pick to use what's on
                    file, or save the changes.
                  </span>
                ) : (
                  status
                )}
                <span className="row-links">
                  {current ? (
                    <span
                      className="muted small"
                      title="The party being picked matches this one. Sealing the stairs is a one-off and is never kept on file."
                    >
                      saved
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="link small"
                      disabled={!town.party.length}
                      title="Keep the party being picked, its porters, leader and orders, here instead. Sealing the stairs is a one-off and isn't kept on file."
                      onClick={() => act((t) => saveParty(ix, t, slot))}
                    >
                      {sameCrew ? "save changes" : "replace with current"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="link danger small"
                    onClick={async () => {
                      if (
                        await askConfirm({
                          message: `Take ${p.name} off file? Its heroes stay in the guild.`,
                          ok: "Remove",
                          danger: true,
                        })
                      )
                        act((t) => removeParty(ix, t, slot));
                    }}
                  >
                    remove
                  </button>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="small party-add">
        <button
          type="button"
          className="btn"
          disabled={!town.party.length || onFileAlready}
          title={
            !town.party.length
              ? "Pick some heroes first"
              : onFileAlready
                ? "This party is already on file"
                : "Keep the party being picked, its porters and orders, as a new party on file"
          }
          onClick={() => act((t) => addParty(ix, t))}
        >
          + Add party
        </button>{" "}
        <span className="muted">
          {town.parties.length
            ? "Keep a few crews, so a rested one can go while another heals."
            : "Pick heroes and orders, then keep them here to send again with one click."}
        </span>
      </p>
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
