/**
 * HP, mana (for casters) and morale as slim bars with the numbers at the end
 * (M9.02): the party card at a glance. With `more` (the roster card, M9.16),
 * fatigue and XP too.
 */
import { fatigueTier, heroSheet, type Hero } from "../../sim/hero";
import { xpProgress } from "../../sim/levels";
import { isLow, mood } from "../../sim/morale";
import { ix } from "../game";
import { usesMana } from "../Watch";

type SlimBar = {
  kind: string;
  label: string;
  now: number;
  max: number;
  text: string;
  title?: string;
};

export function SlimBars({ hero: h, more = false }: { hero: Hero; more?: boolean }) {
  const d = heroSheet(ix, h).derived;
  const bars: SlimBar[] = [
    { kind: "hp", label: "HP", now: h.hp, max: d.maxHp, text: `${h.hp}/${d.maxHp}` },
  ];
  if (usesMana(h))
    bars.push({
      kind: "mana",
      label: "Mana",
      now: h.mana,
      max: d.mana,
      text: `${h.mana}/${d.mana}`,
    });
  bars.push({
    kind: isLow(ix, h) ? "morale low" : "morale",
    label: "Morale",
    now: h.morale,
    max: 100,
    text: `${h.morale}`,
    title: `Morale ${h.morale}/100, ${mood(ix, h)}`,
  });
  if (more) {
    const tier = fatigueTier(ix, h);
    bars.push({
      kind: tier ? "fatigue tired" : "fatigue",
      label: "Fatigue",
      now: h.fatigue,
      max: 100,
      text: `${h.fatigue}`,
      title: `Fatigue ${h.fatigue}/100, ${tier?.name ?? "rested"}. Each day in town takes ${ix.lib.wear.restPerDay} off.`,
    });
    if (!h.porter && !h.untrained) {
      const p = xpProgress(ix, h);
      bars.push({
        kind: "xp",
        label: "XP",
        now: p.max ? 1 : p.into,
        max: p.max ? 1 : p.needed,
        text: p.max ? "max" : `${p.into}/${p.needed}`,
        title: p.max
          ? `${h.xp} XP, max level`
          : `XP ${p.into}/${p.needed} to level ${h.level + 1} (${h.xp} in total)`,
      });
    }
  }
  return (
    <div className={`slim-bars${more ? " slim-more" : ""}`}>
      {bars.map((b) => (
        <span key={b.kind} className="slim" title={b.title ?? `${b.label} ${b.text}`}>
          {more ? <span className="slim-label">{b.label}</span> : null}
          <span className="slim-track" aria-hidden="true">
            <span
              className={`slim-fill ${b.kind}`}
              style={{
                width: `${Math.max(0, Math.min(100, (b.now / Math.max(1, b.max)) * 100))}%`,
              }}
            />
          </span>
          <span className="slim-num">
            <span className="sr-only">{b.label} </span>
            {b.text}
          </span>
        </span>
      ))}
    </div>
  );
}
