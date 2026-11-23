/**
 * The guild's books (M6): what the gold came from and went on over the last
 * week, and what the guild pays (M7.12: retainers at home, shares of the haul;
 * content/town.ts).
 */
import { Fold } from "./Fold";
import type { LedgerKind, TownState } from "../sim/town";
import { awaySet, owedTotal, retainer, retainerBill, shareUnits } from "../sim/town";
import { ix } from "./game";

const KINDS: Record<LedgerKind, string> = {
  haul: "Hauls sold",
  sold: "Sold at the Market",
  bought: "Bought at the Market",
  hired: "Hiring",
  wages: "Retainers",
  shares: "Shares of the haul",
  crafting: "Workshop jobs",
  taxes: "Townsfolk's taxes",
  trade: "Caravans",
  contracts: "Contracts",
  petitions: "Petitions granted",
  built: "Building",
  repairs: "Repairs",
  stolen: "Stolen by raiders",
  temple: "The Temple",
  burials: "Burials",
  gathered: "Work on the posts",
  spoils: "Spoils from raiders",
  gifts: "Thanks for good deeds",
};

/** Days of accounts shown. */
const WEEK = 7;

export function Accounts({ town }: { town: TownState }) {
  const from = town.day - WEEK;
  const lines = town.ledger.filter((l) => l.day > from);
  const byKind = new Map<LedgerKind, number>();
  for (const l of lines) byKind.set(l.kind, (byKind.get(l.kind) ?? 0) + l.amount);
  const rows = (Object.keys(KINDS) as LedgerKind[]).filter((k) => byKind.get(k));
  const net = lines.reduce((s, l) => s + l.amount, 0);
  const bill = retainerBill(ix, town);
  const away = awaySet(town);
  const owed = owedTotal(town);
  const r = ix.lib.town.retainer;
  const sh = ix.lib.town.shares;
  return (
    <Fold id="accounts" title="The books" summary={`Last 7 days ${net >= 0 ? "+" : ""}${net} gold`}>
      {town.camp ? (
        <p className="muted">
          Nobody is paid at the mining camp: the miners work for their keep. Pay starts once the
          camp is held.
        </p>
      ) : (
        <>
          <p className="muted">
            Heroes are paid like adventurers. At home each draws a retainer of {r.base} gold a day
            plus 1 for every {r.levelsPerGold} levels; the heroes at home cost{" "}
            <strong>{bill}</strong> gold a day
            {bill ? (
              <>
                , so {town.gold} gold lasts about <strong>{Math.floor(town.gold / bill)}</strong>{" "}
                days without a haul
              </>
            ) : null}
            . A party takes {sh.percent}% of what its haul is worth when it comes home, split
            between the heroes who went (porters take {sh.porter === 0.5 ? "half" : sh.porter} a
            share), and draws no retainer while it's away. Anyone who goes unpaid takes it badly.
          </p>
          {owed ? (
            <p className="warn">
              The guild owes <strong>{owed}</strong> gold in shares it couldn't pay yet. It comes
              out of the purse first thing each day.
            </p>
          ) : null}
        </>
      )}
      {town.roster.length && !town.camp ? (
        <p className="skills">
          {town.roster.map((h) => (
            <span key={h.id}>
              {h.name}{" "}
              {away.has(h.id) ? (
                <span className="muted">below</span>
              ) : (
                <strong>{retainer(ix, h)}</strong>
              )}
              {shareUnits(ix, h) !== 1 ? (
                <span className="muted"> ({shareUnits(ix, h)} shares)</span>
              ) : null}
            </span>
          ))}
        </p>
      ) : null}
      {town.secrets.found || town.secrets.missed ? (
        <p className="small">
          Hidden caches: the guild has found <strong>{town.secrets.found}</strong>, worth{" "}
          <strong>{town.secrets.gold}</strong> gold, and walked past about{" "}
          <strong>{town.secrets.missed}</strong> more without noticing. A sharp scout (Scouting)
          finds more.
        </p>
      ) : null}
      {rows.length ? (
        <table className="haul">
          <caption className="muted small">The last {WEEK} days</caption>
          <thead>
            <tr>
              <th>What</th>
              <th>Gold</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k}>
                <td>{KINDS[k]}</td>
                <td className={byKind.get(k)! > 0 ? "good" : undefined}>
                  {byKind.get(k)! > 0 ? "+" : ""}
                  {byKind.get(k)}
                </td>
              </tr>
            ))}
            <tr>
              <th>Overall</th>
              <th>
                {net > 0 ? "+" : ""}
                {net}
              </th>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="muted">Nothing in the books this week.</p>
      )}
    </Fold>
  );
}
