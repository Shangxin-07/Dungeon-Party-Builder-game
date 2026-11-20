/**
 * The guild's books (M6): what the gold came from and went on over the last
 * week, and the daily wage bill. Wages are content (content/town.ts).
 */
import type { LedgerKind, TownState } from "../sim/town";
import { wage, wageBill } from "../sim/town";
import { ix } from "./game";

const KINDS: Record<LedgerKind, string> = {
  haul: "Hauls sold",
  sold: "Sold at the Market",
  bought: "Bought at the Market",
  hired: "Hiring",
  wages: "Wages",
  built: "Building",
  repairs: "Repairs",
  stolen: "Stolen by raiders",
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
  const bill = wageBill(ix, town);
  const w = ix.lib.town.wages;
  return (
    <section aria-labelledby="accounts-heading" className="panel">
      <h2 id="accounts-heading">The books</h2>
      <p className="muted">
        Every hero is paid {w.base} gold a day plus {w.perLevel} per level. The roster costs{" "}
        <strong>{bill}</strong> gold a day
        {bill ? (
          <>
            , so {town.gold} gold lasts about <strong>{Math.floor(town.gold / bill)}</strong> days
            without a haul
          </>
        ) : null}
        . Anyone who goes unpaid takes it badly.
      </p>
      {town.roster.length ? (
        <p className="skills">
          {town.roster.map((h) => (
            <span key={h.id}>
              {h.name} <strong>{wage(ix, h)}</strong>
            </span>
          ))}
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
    </section>
  );
}
