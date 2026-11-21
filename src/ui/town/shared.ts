/**
 * Small helpers the town screen's panels share.
 */
import type { ItemDef } from "../../content/types";
import { EQUIP_SLOTS, type EquipSlot, type Hero } from "../../sim/hero";
import type { TownState } from "../../sim/town";
import { ix } from "../game";
import { DERIVED_LABELS } from "../Watch";

export const SLOT_NAMES: Record<EquipSlot, string> = {
  weapon: "Weapon",
  offhand: "Off hand",
  armor: "Armour",
};

/** "+4 attack, +2 accuracy", "heals 20", "slashing, ranged". */
export function describeItem(item: ItemDef): string {
  const bits: string[] = [];
  if (item.damageType) bits.push(item.damageType + (item.ranged ? ", ranged" : ""));
  for (const p of item.passives ?? []) {
    if (p.type === "modifyStat") {
      const label =
        p.stat in DERIVED_LABELS ? DERIVED_LABELS[p.stat as keyof typeof DERIVED_LABELS] : p.stat;
      bits.push(`${p.amount > 0 ? "+" : ""}${p.amount} ${label.toLowerCase()}`);
    } else if (p.type === "modifySkill")
      bits.push(`${p.amount > 0 ? "+" : ""}${p.amount} ${p.skill}`);
    else if (p.type === "resist") bits.push(`${p.percent}% ${p.damageType} resist`);
    else if (p.type === "bonusVsTag") bits.push(`+${p.percent}% vs ${p.tag}`);
  }
  for (const e of item.use ?? []) {
    if (e.type === "heal") bits.push(`heals ${e.amount}`);
    else if (e.type === "dealDamage") bits.push(`${e.amount} ${e.damageType} damage`);
  }
  return bits.join(", ");
}

/** Count item ids: [["sword", 2], ...] in first-seen order. */
export function tally(ids: readonly string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return [...m];
}

export type Act = (f: (t: TownState) => TownState) => void;

export function describeKit(h: Hero): string {
  const gear = EQUIP_SLOTS.map((s) => h.equipment[s])
    .filter((id): id is string => !!id)
    .map((id) => ix.item(id).name);
  const pack = tally(h.pack).map(([id, n]) => `${ix.item(id).name}${n > 1 ? ` ×${n}` : ""}`);
  return [...gear, ...pack].join(", ") || "empty-handed";
}

export const STAT_ORDER = ["STR", "DEX", "END", "PER", "INT", "WIL", "CHA"] as const;
