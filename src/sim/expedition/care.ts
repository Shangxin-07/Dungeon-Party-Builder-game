/**
 * Looking after the party: hurting and healing, first aid between rooms, and
 * what fits in the packs.
 */
import type { DamageType } from "../../content/types";
import { heroSheet, type Hero } from "../hero";
import { appraise, itemSize, rollLootTable, rollValue, worthPerSlot, type HaulItem } from "../loot";
import { resistance } from "../stats";
import {
  BANDAGE_BELOW,
  DOWNED_LOAD,
  MANA_REGEN_DIVISOR,
  REVIVE_BASE,
  REVIVE_SCALE,
  VALUABLE_PER_SLOT,
} from "./tuning";
import { an, TripBase } from "./trip";

/** Wounds, first aid and packs. Extended by TripFights. */
export class TripCare extends TripBase {
  /** Trap damage and the like. Resistances help; armour doesn't. */
  protected hurt(hero: Hero, raw: number, type: DamageType): void {
    if (hero.condition !== "ok") return;
    const resist = resistance(heroSheet(this.ix, hero).passives, type);
    const amount = resist >= 100 ? 0 : Math.max(1, Math.round(raw * (1 - resist / 100)));
    hero.hp = Math.max(0, hero.hp - amount);
    this.emit("trap", `${hero.name} takes ${amount} ${type} damage.`);
    if (hero.hp === 0) {
      hero.condition = "downed";
      this.emit("trap", `${hero.name} goes down!`);
    }
  }

  protected heal(hero: Hero, amount: number): number {
    if (hero.condition === "dead" || amount <= 0) return 0;
    const before = hero.hp;
    hero.hp = Math.min(this.maxHp(hero), hero.hp + amount);
    if (hero.condition === "downed" && hero.hp > 0) {
      hero.condition = "ok";
      this.carried.delete(hero.id);
      this.emit("medicine", `${hero.name} is back on their feet.`);
    }
    return hero.hp - before;
  }

  protected restoreMana(hero: Hero, amount: number): number {
    if (hero.condition === "dead") return 0;
    const before = hero.mana;
    hero.mana = Math.min(this.maxMana(hero), hero.mana + amount);
    return hero.mana - before;
  }

  // -------------------------------------------------------------------------
  // Between rooms: catch breath, first aid, repack
  // -------------------------------------------------------------------------

  protected betweenRooms(): void {
    for (const h of this.conscious()) {
      const wil = heroSheet(this.ix, h).stats.WIL;
      this.restoreMana(h, Math.ceil(wil / MANA_REGEN_DIVISOR));
    }
    this.firstAid();
    this.repack();
    if (!this.conscious().length) this.wiped = true;
  }

  /**
   * The best Medicine in the party tries to get downed heroes up, then uses
   * bandages on the worst wounds. Good Medicine gets more out of each bandage.
   */
  protected firstAid(): void {
    const medic = this.best("medicine");
    if (!medic) return;
    const skill = medic.value / 100;

    for (const h of this.party.filter((x) => x.condition === "downed")) {
      if (this.rng.chance(REVIVE_BASE + REVIVE_SCALE * skill)) {
        this.emit("medicine", `${medic.hero.name} tends to ${h.name}.`);
        this.heal(h, 1 + Math.floor(medic.value / 10));
      } else if (!this.carried.has(h.id)) {
        this.carried.add(h.id);
        const text = `${medic.hero.name} can't bring ${h.name} round. They'll be carried.`;
        this.emit("medicine", text);
      }
    }

    for (;;) {
      const patient = this.conscious()
        .filter((h) => h.hp < this.maxHp(h) * BANDAGE_BELOW)
        .sort((a, b) => a.hp / this.maxHp(a) - b.hp / this.maxHp(b))[0];
      if (!patient) return;
      const holder = this.alive().find((h) => h.pack.some((id) => this.isFirstAid(id)));
      if (!holder) return;
      const idx = holder.pack.findIndex((id) => this.isFirstAid(id));
      const item = this.ix.item(holder.pack.splice(idx, 1)[0]!);
      const base = (item.use ?? []).reduce((s, e) => s + (e.type === "heal" ? e.amount : 0), 0);
      const gained = this.heal(patient, Math.round(base * (1 + skill)));
      this.emit(
        "medicine",
        `${medic.hero.name} uses ${item.name.toLowerCase()} on ${patient.name} (+${gained} HP).`,
      );
    }
  }

  protected isFirstAid = (id: string) => this.ix.item(id).tags.includes("first-aid");

  // -------------------------------------------------------------------------
  // Loot and carrying
  // -------------------------------------------------------------------------

  /** Free carry slots: everyone standing carries, downed heroes are carried, and so do porters. */
  protected capacity(): number {
    let slots = 0;
    for (const p of this.extras.porters ?? []) slots += heroSheet(this.ix, p).derived.carrySlots;
    for (const h of this.conscious()) {
      slots += heroSheet(this.ix, h).derived.carrySlots - h.pack.length;
    }
    slots -= DOWNED_LOAD * this.party.filter((h) => h.condition === "downed").length;
    return slots;
  }

  protected load = () => this.haul.reduce((s, h) => s + itemSize(this.ix.item(h.item)), 0);

  protected findLoot(tableId: string, from: string, sayIfEmpty: boolean): void {
    const found = rollLootTable(this.ix, tableId, this.rng);
    if (!found.length) {
      if (sayIfEmpty) this.emit("loot", `Nothing worth taking in ${from}.`);
      return;
    }
    const appraiser = this.best("appraisal");
    for (const id of found) {
      const def = this.ix.item(id);
      if (def.slot === "consumable") {
        const taker = [...this.conscious()].sort((a, b) => a.pack.length - b.pack.length)[0];
        if (!taker) return;
        taker.pack.push(id);
        this.emit("loot", `${taker.name} finds ${an(def.name)} ${from}.`);
        continue;
      }
      const value = rollValue(def, this.rng);
      const estimate = appraise(value, appraiser?.value ?? 0, this.rng);
      const item: HaulItem = { item: id, value, estimate };
      if (this.searching) item.hidden = true;
      this.emit("loot", `Found ${an(def.name)} ${from} (worth about ${item.estimate}).`);
      if (this.orders.loot === "valuable" && worthPerSlot(this.ix, item) < VALUABLE_PER_SLOT) {
        const grabber = this.greedy();
        if (grabber) {
          this.disobeyed++;
          this.emit("disobey", `Orders say leave the junk, but ${grabber.name} pockets it anyway.`);
        } else {
          const who = appraiser ? `${appraiser.hero.name} reckons it` : "It";
          this.emit("drop", `${who} isn't worth the space. Left behind.`);
          continue;
        }
      }
      this.haul.push(item);
      this.repack();
    }
  }

  /** A low-morale hero who grabs junk whatever the loot orders say. */
  protected greedy(): Hero | undefined {
    return this.conscious().find(
      (h) =>
        this.ix.motivation(h.motivation).lowMorale?.grabJunk && h.morale < this.ix.lib.morale.low,
    );
  }

  /** If the haul doesn't fit, leave behind whatever looks least valuable per slot. */
  protected repack(): void {
    const room = this.capacity();
    while (this.haul.length && this.load() > room) {
      let worst = 0;
      this.haul.forEach((h, i) => {
        if (worthPerSlot(this.ix, h) <= worthPerSlot(this.ix, this.haul[worst]!)) worst = i;
      });
      const [dropped] = this.haul.splice(worst, 1);
      const name = this.ix.item(dropped!.item).name.toLowerCase();
      const who = this.best("appraisal")?.hero.name ?? "Someone";
      const worth = dropped!.estimate;
      this.emit("drop", `Packs are full. ${who} leaves the ${name} behind (worth about ${worth}).`);
    }
  }
}
