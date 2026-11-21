/**
 * Restocking after a trip (M6): the potions and bandages the party used,
 * ready to put back in their packs from the store room or the Market. The
 * player ticks what to buy and okays it.
 */
import { Fold } from "./Fold";
import { useState } from "react";
import { findHero, restock, restockPlan, type RestockLine, type TownState } from "../sim/town";
import { ix } from "./game";

type Act = (f: (t: TownState) => TownState) => void;

const key = (l: RestockLine, i: number) => `${l.heroId}:${l.item}:${i}`;

export function RestockPanel({ town, act }: { town: TownState; act: Act }) {
  const plan = restockPlan(ix, town);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  if (!plan.length) return null;
  const chosen = plan.filter((l, i) => !skipped.has(key(l, i)));
  const cost = chosen.reduce((s, l) => s + l.cost, 0);
  const toggle = (k: string) =>
    setSkipped((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  return (
    <Fold
      id="restock"
      title="Restock"
      defaultOpen
      summary={`${chosen.length} to buy, ${cost} gold`}
    >
      <p className="muted">
        The last trip used these up. Untick anything you'd rather not replace.
      </p>
      <ul className="restock">
        {plan.map((l, i) => {
          const k = key(l, i);
          const h = findHero(town, l.heroId);
          return (
            <li key={k}>
              <label>
                <input type="checkbox" checked={!skipped.has(k)} onChange={() => toggle(k)} />{" "}
                {ix.item(l.item).name} for {h?.name ?? "someone"}{" "}
                <span className="muted">
                  {l.from === "store" ? "from the store room" : `${l.cost} gold at the Market`}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="btn btn-main"
        disabled={!chosen.length || cost > town.gold}
        onClick={() => {
          act((t) => restock(ix, t, chosen));
          setSkipped(new Set());
        }}
      >
        Restock{cost ? ` for ${cost} gold` : ""}
      </button>
      {cost > town.gold ? (
        <span className="warn small"> Not enough gold for all of it.</span>
      ) : null}
    </Fold>
  );
}
