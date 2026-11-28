/**
 * The roster: each hero's card, gear, pack and porter training.
 */
import { askConfirm } from "../Confirm";
import { ItemIcon } from "../art/Icon";
import { Portrait } from "../art/Portrait";
import { Fold } from "../Fold";
import { useState, type ReactNode } from "react";
import type { Spend } from "../../sim/training";
import { ClassPicker, PointsGrid, useTraining } from "./Training";
import {
  EQUIP_SLOTS,
  fatigueTier,
  heroSheet,
  heroTitle,
  inCampClass,
  offhandWeapon,
  weaponAttackBonus,
  type Hero,
} from "../../sim/hero";
import {
  answerRaise,
  dismiss,
  equip,
  fightsToTrain,
  kitOut,
  nextCommand,
  offhandChoices,
  packItem,
  setLeader,
  setRow,
  toggleParty,
  trainMiner,
  trainMiners,
  trainPorter,
  outingOf,
  unequip,
  unpackItem,
  retainer,
  raiseWords,
  shareUnits,
  type TownState,
} from "../../sim/town";
import { ix } from "../game";
import { StatSheet } from "../Watch";
import { SlimBars } from "./SlimBars";
import { useFold } from "../Fold";
import { commandOf, leadershipOf } from "../../sim/leadership";
import { AbilityList, ClassList, LevelUpPicker, MoraleLog, PerkList, Personality } from "../Heroes";
import { SLOT_NAMES, describeItem, tally, type Act } from "./shared";
import { rosterSortSetting, setRosterSortSetting } from "../settings";
import { ROSTER_SORTS, sortRoster, type RosterSort } from "./rosterSort";

/** The roster's sort, remembered in this browser (M9.26). */
function useRosterSort(): [RosterSort, (s: RosterSort) => void] {
  const [sort, setSort] = useState<RosterSort>(() => {
    const s = rosterSortSetting();
    return s in ROSTER_SORTS ? (s as RosterSort) : "hired";
  });
  const pick = (s: RosterSort) => {
    setSort(s);
    setRosterSortSetting(s);
  };
  return [sort, pick];
}

export function Roster({
  town,
  act,
  party,
  send,
}: {
  town: TownState;
  act: Act;
  /** The next party, built at the top of the roster (M9.27). */
  party?: ReactNode;
  /** Its send button, on the heading while the roster is closed. */
  send?: ReactNode;
}) {
  const home = town.roster.filter((h) => !outingOf(town, h.id));
  const away = town.roster.length - home.length;
  const [sort, setSort] = useRosterSort();
  const groups = sortRoster(ix, town, home, sort);
  // A hero listed twice (in two parties) keeps the page id on their first card only.
  const seen = new Set<string>();
  return (
    <Fold
      id="roster"
      title="Roster"
      defaultOpen
      closedActions={send}
      actions={
        <label className="roster-sort small">
          Sort{" "}
          <select value={sort} onChange={(e) => setSort(e.target.value as RosterSort)}>
            {Object.entries(ROSTER_SORTS).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      }
      summary={`${town.roster.length} in the guild${away ? `, ${away} away below` : ""}`}
    >
      {party}
      {!town.camp && town.roster.some((h) => !h.porter && inCampClass(ix, h)) ? (
        <p className="small">
          The camp is held, and the miners can train for the dungeon. Pick each one's class on their
          card, or{" "}
          <button type="button" className="link" onClick={() => act((t) => trainMiners(ix, t))}>
            pick for me
          </button>
          .
        </p>
      ) : null}
      {home.length ? (
        <ul className="hero-cards">
          {groups.map((g) => [
            g.heading ? (
              <li key={`${g.key}-head`} className="roster-group-head">
                <h3>{g.heading}</h3>
                <span className="muted small">{g.heroes.length}</span>
              </li>
            ) : null,
            ...g.heroes.map((h) => {
              const first = !seen.has(h.id);
              seen.add(h.id);
              return (
                <HeroCard key={`${g.key}-${h.id}`} town={town} hero={h} act={act} pageId={first} />
              );
            }),
          ])}
        </ul>
      ) : away ? (
        <p className="muted">Everyone is down below.</p>
      ) : (
        <p className="muted">Nobody is left in the guild. Hire someone below.</p>
      )}
      {town.outings.map((o) => (
        <p key={o.id} className="small muted">
          Away with <strong>{o.name}</strong>:{" "}
          {[...o.party, ...o.porterParty]
            .map((h) => `${h.name} (${h.porter ? "porter" : heroTitle(ix, h, true)})`)
            .join(", ")}
          . Nothing can be changed for them until they're back.
        </p>
      ))}
    </Fold>
  );
}

/** A porter's progress towards training, and the class picker once they're ready. */
export function PorterTraining({ hero: h, act }: { hero: Hero; act: Act }) {
  const left = fightsToTrain(ix, h);
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
        <TrainBox
          hero={h}
          onTrain={(classId, spend) => act((t) => trainPorter(ix, t, h.id, classId, spend))}
        />
      )}
    </div>
  );
}

/** A miner's class picker, once the camp is held (DESIGN.md §8). */
export function MinerTraining({ town, hero: h, act }: { town: TownState; hero: Hero; act: Act }) {
  if (town.camp)
    return (
      <p className="small quiet">
        A miner until the camp is held. Then they put down the pick and train in a proper class.
      </p>
    );
  return (
    <div className="small">
      <p className="quiet muted">The camp is held: pick the class they'll delve as.</p>
      <TrainBox
        hero={h}
        onTrain={(classId, spend) => act((t) => trainMiner(ix, t, h.id, classId, spend))}
      />
    </div>
  );
}

/** Class buttons, training points and a Train button with one "are you sure" (M9.10). */
function TrainBox({
  hero: h,
  onTrain,
}: {
  hero: Hero;
  onTrain: (classId: string, spend: Spend) => void;
}) {
  const tr = useTraining(h.stats);
  const [asking, setAsking] = useState(false);
  const name = ix.cls(tr.classId).name;
  return (
    <div className="train-box">
      <ClassPicker stats={h.stats} training={tr} />
      <PointsGrid stats={h.stats} training={tr} />
      {asking ? (
        <div className="recruit-confirm">
          <p className="small">
            Train <strong>{h.name}</strong> as a <strong>{name.toLowerCase()}</strong>? It's for
            good.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-on"
              onClick={() => onTrain(tr.classId, tr.spend)}
            >
              Yes, train {h.name}
            </button>
            <button type="button" className="btn" onClick={() => setAsking(false)}>
              Not yet
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn" disabled={!!tr.wrong} onClick={() => setAsking(true)}>
          Train as {name.toLowerCase()}
        </button>
      )}
    </div>
  );
}

/** The open card's subscreens (M9.16). */
const HERO_TABS = [
  { id: "stats", name: "Stats" },
  { id: "gear", name: "Gear" },
  { id: "story", name: "Backstory" },
  { id: "growth", name: "Growth" },
] as const;
type HeroTab = (typeof HERO_TABS)[number]["id"];
const HERO_TAB_KEY = "dpb-ui-hero-tab";

/** The subscreen last picked on any hero card, remembered in this browser. */
function useHeroTab(): [HeroTab, (t: HeroTab) => void] {
  const [tab, setTab] = useState<HeroTab>(() => {
    try {
      const t = localStorage.getItem(HERO_TAB_KEY);
      if (HERO_TABS.some((x) => x.id === t)) return t as HeroTab;
    } catch {
      // Blocked storage: start on the stats.
    }
    return "stats";
  });
  const pick = (t: HeroTab) => {
    setTab(t);
    try {
      localStorage.setItem(HERO_TAB_KEY, t);
    } catch {
      // Private windows: the tab just isn't remembered.
    }
  };
  return [tab, pick];
}

/**
 * A hero on the roster: a compact card (name, bars, anything that needs an
 * answer, party and row buttons) that opens into the full sheet on click.
 */
export function HeroCard({
  town,
  hero: h,
  act,
  pageId = true,
}: {
  town: TownState;
  hero: Hero;
  act: Act;
  /** False on a hero's second card (sorted by party), so the page id stays unique. */
  pageId?: boolean;
}) {
  const inParty = town.party.includes(h.id) || town.porters.includes(h.id);
  const rec = town.records[h.id];
  const sheet = heroSheet(ix, h);
  const supplies = tally(town.stash.filter((id) => ix.item(id).slot === "consumable"));
  const packFull = h.pack.length >= sheet.derived.carrySlots;
  const miner = inCampClass(ix, h);
  const [open, toggle] = useFold(`hero-${h.id}`, false);
  const tier = fatigueTier(ix, h);
  const low = h.morale < ix.lib.morale.low;
  const trainReady = h.porter && !fightsToTrain(ix, h);
  const cmd = nextCommand(ix, town);
  const leads = !h.porter && cmd.leader?.id === h.id;
  const [picked, pickTab] = useHeroTab();
  // Porters have no Growth screen.
  const tab = picked === "growth" && h.porter ? "stats" : picked;

  return (
    <li
      id={pageId ? `hero-card-${h.id}` : undefined}
      className={`hero-card compact${inParty ? " in-party" : ""}${open ? " open" : ""}`}
    >
      <button
        type="button"
        className="hero-toggle"
        aria-expanded={open}
        title={open ? "Hide the full sheet" : "Show the full sheet"}
        onClick={toggle}
      >
        <Portrait hero={h} size={44} />
        <span className="hero-heading">
          <h3>{h.name}</h3>
          <span className="muted small">
            {h.porter ? "Porter" : heroTitle(ix, h)}
            {town.camp ? "" : `, ${retainer(ix, h)}g/day at home`}
            {h.owed ? `, owed ${h.owed}g` : ""}
          </span>
          {h.levelUps.length ? <span className="badge">Level up!</span> : null}
          {h.raiseAsk ? <span className="badge">Wants a raise</span> : null}
          {leads ? <span className="badge">Leader</span> : null}
        </span>
      </button>
      <SlimBars hero={h} more />
      {low || tier || h.injuries.length ? (
        <p className="small quiet warn">
          {[
            ...(low ? ["low morale"] : []),
            ...(tier ? [tier.name] : []),
            ...h.injuries.map(
              (i) =>
                `${ix.injury(i.id).name.toLowerCase()} (${i.days} ${i.days === 1 ? "day" : "days"})`,
            ),
          ].join(" · ")}
        </p>
      ) : null}
      {open ? null : <KitStrip hero={h} slots={sheet.derived.carrySlots} />}
      {miner && !town.camp ? <MinerTraining town={town} hero={h} act={act} /> : null}
      {trainReady ? <PorterTraining hero={h} act={act} /> : null}
      <LevelUpPicker key={h.levelUps[0]?.level ?? 0} hero={h} town={town} act={act} />
      {h.raiseAsk ? (
        <div className="raise">
          <p>
            <strong>
              {h.name} wants {raiseWords(h.raiseAsk)}
            </strong>{" "}
            (now{" "}
            {h.raiseAsk.kind === "share"
              ? `${shareUnits(ix, h)} ${shareUnits(ix, h) === 1 ? "share" : "shares"}`
              : `${retainer(ix, h)} gold a day at home`}
            ). They'll take silence as a no after{" "}
            {Math.max(1, ix.lib.town.raises.patienceDays - (h.raiseAsk.waited ?? 0))} more days in
            town.
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
          hidden={!!town.camp || miner}
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
        {inParty && !h.porter && !leads ? (
          <button
            type="button"
            className="link small"
            title={`Leadership ${leadershipOf(ix, h)}: command ${commandOf(ix, h)}`}
            onClick={() => act((t) => setLeader(ix, t, h.id))}
          >
            Make leader
          </button>
        ) : null}
        <button type="button" className="link small" aria-expanded={open} onClick={toggle}>
          {open ? "Less" : "More"}
        </button>
      </div>

      {open ? (
        <div className="hero-body-tabs">
          <nav className="seg hero-tabs" aria-label={`${h.name}'s sheet`}>
            {HERO_TABS.filter((t) => t.id !== "growth" || !h.porter).map((t) => (
              <button
                key={t.id}
                type="button"
                className={tab === t.id ? "on" : ""}
                aria-pressed={tab === t.id}
                onClick={() => pickTab(t.id)}
              >
                {t.name}
              </button>
            ))}
          </nav>
          {tab === "stats" ? (
            <div className="hero-tab">
              <StatSheet hero={h} full />
              <MoraleLog hero={h} />
              {h.injuries.length ? (
                <ul className="injuries small">
                  {h.injuries.map((inj) => {
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
              {h.porter && !trainReady ? <PorterTraining hero={h} act={act} /> : null}
              {miner && town.camp ? <MinerTraining town={town} hero={h} act={act} /> : null}
            </div>
          ) : null}
          {tab === "gear" ? (
            <div className="hero-tab">
              <HeroGear town={town} hero={h} act={act} supplies={supplies} packFull={packFull} />
            </div>
          ) : null}
          {tab === "story" ? (
            <div className="hero-tab">
              <Personality hero={h} town={town} />
            </div>
          ) : null}
          {tab === "growth" ? (
            <div className="hero-tab">
              <ClassList hero={h} town={town} />
              <PerkList hero={h} />
              <AbilityList hero={h} />
              <LeaderRecordList hero={h} town={town} />
            </div>
          ) : null}
          <p className="record muted small">
            {rec
              ? `${rec.trips} ${rec.trips === 1 ? "trip" : "trips"}, ${rec.kills} kills, joined day ${rec.joined}.`
              : null}{" "}
            <button
              type="button"
              className="link danger"
              onClick={async () => {
                if (
                  await askConfirm({
                    message: `Dismiss ${h.name}? Their gear stays with the guild.`,
                    ok: "Dismiss",
                    danger: true,
                  })
                )
                  act((t) => dismiss(ix, t, h.id));
              }}
            >
              Dismiss
            </button>
          </p>
        </div>
      ) : null}
    </li>
  );
}

/**
 * A blade in the off hand (M9.04): what its second blow does, in numbers, or
 * why it isn't striking.
 */
function offhandLine(h: Hero, attack: number): string {
  const off = offhandWeapon(ix, h);
  const main = h.equipment.weapon ? ix.item(h.equipment.weapon) : undefined;
  if (!off)
    return main?.ranged
      ? `idle: the ${main.name.toLowerCase()} takes both hands`
      : "idle: their classes can't fight with it";
  const atk = Math.max(1, attack + weaponAttackBonus(off.item) - weaponAttackBonus(main));
  const scale = 1 + off.damagePercent / 100;
  const lo = Math.round(Math.ceil(atk / 2) * scale);
  const hi = Math.round(atk * scale);
  return `strikes again after each blow at one foe: ${100 + off.damagePercent}% damage, ${lo}-${hi} before armour`;
}

/** Equipment slots with swap/take off, and the pack. */
function HeroGear({
  town,
  hero: h,
  act,
  supplies,
  packFull,
}: {
  town: TownState;
  hero: Hero;
  act: Act;
  supplies: [string, number][];
  packFull: boolean;
}) {
  const sheet = heroSheet(ix, h);
  return (
    <>
      <h4>
        Gear{" "}
        <button
          type="button"
          className="link small"
          title={`Fill in the ${ix.cls(h.classId).name.toLowerCase()}'s usual kit (${ix
            .cls(h.classId)
            .startingKit.map((id) => ix.item(id).name)
            .join(
              ", ",
            )}): from the store room first${town.camp ? " (nothing is for sale at the camp)" : ", then the Market"}.`}
          onClick={() => act((t) => kitOut(ix, t, h.id))}
        >
          Kit out
        </button>
      </h4>
      <ul className="gear-slots gear-rows">
        {EQUIP_SLOTS.map((slot) => {
          const id = h.equipment[slot];
          // The off hand also takes a second blade, for classes that dual-wield (M9.04).
          const spare = tally([
            ...town.stash.filter((x) => ix.item(x).slot === slot),
            ...(slot === "offhand" ? offhandChoices(ix, town, h) : []),
          ]);
          const blade = slot === "offhand" && id && ix.item(id).slot === "weapon";
          const about = id
            ? `${ix.item(id).name}: ${blade ? offhandLine(h, sheet.derived.attack) : describeItem(ix.item(id))}`
            : `${SLOT_NAMES[slot]}: none`;
          return (
            <li key={slot} title={about}>
              <ItemSlot id={id} size={28} empty={about} />
              <span className="gear-name">
                <span className="muted small">{SLOT_NAMES[slot]}</span>
                <span>{id ? ix.item(id).name : <span className="muted">none</span>}</span>
              </span>
              <span className="gear-actions">
                {spare.length ? (
                  <select
                    value=""
                    aria-label={`Swap ${SLOT_NAMES[slot].toLowerCase()}`}
                    onChange={(e) => {
                      const x = e.target.value;
                      act((t) =>
                        equip(ix, t, h.id, x, ix.item(x).slot === slot ? undefined : slot),
                      );
                    }}
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
                    className="link small"
                    title={`Take off the ${ix.item(id).name.toLowerCase()}`}
                    onClick={() => act((t) => unequip(ix, t, h.id, slot))}
                  >
                    ✕
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
          ({h.pack.length}/{sheet.derived.carrySlots}; free slots carry loot home)
        </span>
      </h4>
      <ul className="pack-slots pack-compact">
        {Array.from({ length: Math.max(sheet.derived.carrySlots, h.pack.length) }, (_, i) => {
          const id = h.pack[i];
          if (!id)
            return (
              <li key={i} className="pack-slot free" title="Free: carries loot home">
                <ItemSlot size={22} empty="Free" />
              </li>
            );
          return (
            <li key={i} className="pack-slot">
              <button
                type="button"
                title={`${ix.item(id).name}: ${describeItem(ix.item(id))}. Click to put back in the store room.`}
                onClick={() => act((t) => unpackItem(ix, t, h.id, i))}
              >
                <ItemSlot id={id} size={22} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="pack">
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
        {h.pack.length ? (
          <span className="muted small">Click a packed item to put it back.</span>
        ) : !supplies.length ? (
          <span className="muted small">Nothing packed, and no supplies in the store room.</span>
        ) : null}
      </div>
    </>
  );
}

/** Their time leading (M7.05): Leadership and command, traits, and grudges they hold. */
function LeaderRecordList({ hero: h, town }: { hero: Hero; town: TownState }) {
  if (h.porter) return null;
  const traits = h.lead?.traits ?? [];
  const grudges = (h.grudges ?? [])
    .map((id) => town.roster.find((x) => x.id === id)?.name)
    .filter((n): n is string => !!n);
  return (
    <div className="leader-record small">
      <p>
        Leading:{" "}
        <span title={`Leadership ${leadershipOf(ix, h)}`}>
          can lead <strong>{commandOf(ix, h)}</strong> well
        </span>
        <span className="muted">
          {" "}
          ·{" "}
          {h.lead?.trips
            ? `led ${h.lead.trips} ${h.lead.trips === 1 ? "trip" : "trips"}`
            : "never led a party"}
        </span>
      </p>
      {traits.length ? (
        <ul>
          {traits.map((t) => {
            const def = ix.lib.traits.find((d) => d.id === t.id);
            if (!def) return null;
            return (
              <li key={t.id} className={def.tone === "bad" ? "warn" : "good"}>
                <strong>{def.name}</strong> ({t.party}, day {t.day}
                {t.left ? `; fades in ${t.left} ${t.left === 1 ? "trip" : "trips"}` : ""}):{" "}
                {def.description}
              </li>
            );
          })}
        </ul>
      ) : null}
      {grudges.length ? (
        <p className="warn">Won't forgive {grudges.join(" or ")} for deserting.</p>
      ) : null}
    </div>
  );
}

/** An inventory slot: a square with the item's icon, or an empty outline. */
function ItemSlot({ id, size, empty }: { id?: string; size: number; empty?: string }) {
  return (
    <span
      className={`item-slot${id ? "" : " empty"}`}
      style={{ width: size + 6, height: size + 6 }}
      title={id ? ix.item(id).name : empty}
    >
      {id ? <ItemIcon id={id} size={size} /> : null}
    </span>
  );
}

/**
 * The compact card's kit at a glance: the three gear slots, then what's
 * packed (repeats counted), then how many slots are left for loot.
 */
export function KitStrip({
  hero: h,
  slots,
  size = 24,
  loot = true,
}: {
  hero: Hero;
  slots: number;
  size?: number;
  /** Say how many slots are left for loot. */
  loot?: boolean;
}) {
  const packed = tally(h.pack);
  const free = Math.max(0, slots - h.pack.length);
  return (
    <div className="kit-strip" aria-label="Gear and pack">
      {EQUIP_SLOTS.map((slot) => {
        const id = h.equipment[slot];
        return (
          <span
            key={slot}
            className="kit-cell"
            title={`${SLOT_NAMES[slot]}: ${id ? ix.item(id).name : "none"}`}
          >
            <ItemSlot id={id} size={size} empty={`${SLOT_NAMES[slot]}: none`} />
          </span>
        );
      })}
      <span className="kit-gap" aria-hidden="true" />
      {packed.map(([id, n]) => (
        <span key={id} className="kit-cell" title={`${ix.item(id).name}${n > 1 ? ` ×${n}` : ""}`}>
          <ItemSlot id={id} size={size} />
          {n > 1 ? <span className="kit-count">{n}</span> : null}
        </span>
      ))}
      {loot ? (
        <span className="muted small kit-free">
          {free} {free === 1 ? "slot" : "slots"} for loot
        </span>
      ) : null}
    </div>
  );
}
