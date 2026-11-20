/** Sandbox: watch a fresh starter party make a trip, with any orders and seed. */
import { useMemo, useState } from "react";
import { heroNames, library } from "../content";
import { describeRetreat, runExpedition, type LootRule, type RetreatRule } from "../sim/expedition";
import { createStarterParty } from "../sim/hero";
import { createRng } from "../sim/rng";
import { ix } from "./game";
import { Results, TripPlayer } from "./Watch";

export const RETREATS: { id: string; rule: RetreatRule }[] = [
  { id: "hp-30", rule: { kind: "hero-hp-below", percent: 30 } },
  { id: "hp-50", rule: { kind: "hero-hp-below", percent: 50 } },
  { id: "downed", rule: { kind: "hero-downed" } },
  { id: "potions", rule: { kind: "out-of-potions" } },
  { id: "never", rule: { kind: "never" } },
];

function simulate(seed: number, targetFloor: number, retreat: RetreatRule, loot: LootRule) {
  const heroes = createStarterParty(ix, heroNames, createRng(seed));
  return { heroes, result: runExpedition(ix, heroes, { targetFloor, retreat, loot }, seed) };
}

export function ExpeditionView() {
  const [seed, setSeed] = useState(1);
  const [target, setTarget] = useState(1);
  const [retreatId, setRetreatId] = useState("hp-30");
  const [loot, setLoot] = useState<LootRule>("everything");
  const retreat = RETREATS.find((r) => r.id === retreatId)!.rule;
  const trip = useMemo(
    () => simulate(seed, target, retreat, loot),
    [seed, target, retreatId, loot],
  );

  return (
    <section aria-labelledby="expedition-heading" className="fight">
      <h2 id="expedition-heading">Watch an expedition</h2>
      <p className="muted">
        A fresh party of three goes down with standing orders, room by room, then climbs back out.
        Nothing here touches your town.
      </p>
      <TripPlayer
        heroes={trip.heroes}
        log={trip.result.log}
        results={<Results result={trip.result} />}
        controls={
          <>
            <label>
              Go to floor{" "}
              <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
                {library.floors.map((f) => (
                  <option key={f.depth} value={f.depth}>
                    {f.depth}: {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Orders{" "}
              <select value={retreatId} onChange={(e) => setRetreatId(e.target.value)}>
                {RETREATS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {describeRetreat(r.rule)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Loot{" "}
              <select value={loot} onChange={(e) => setLoot(e.target.value as LootRule)}>
                <option value="everything">carry everything</option>
                <option value="valuable">leave the junk</option>
              </select>
            </label>
            <label>
              Seed{" "}
              <input
                type="number"
                min={0}
                value={seed}
                onChange={(e) => setSeed(Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
            <button type="button" onClick={() => setSeed((s) => s + 1)}>
              New party
            </button>
          </>
        }
      />
    </section>
  );
}
