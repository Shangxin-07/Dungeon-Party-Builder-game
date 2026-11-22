/**
 * Rescue runs and porters: finding where a lost party fell, and porters
 * running for home when the party goes down.
 */
import { heroSheet } from "../hero";
import { itemSize, worthPerSlot, type HaulItem } from "../loot";
import type { ExpeditionResult, SiteVisit } from "./report";
import { list } from "./trip";
import { TripFights } from "./fights";

/** Lost parties and porters. Extended by Expedition. */
export class TripRescue extends TripFights {
  /** The rescue party reaches where the lost party fell (DESIGN.md §10). */
  protected visitSite(site: SiteVisit): void {
    this.siteVisited = site.id;
    // Too late for anyone who couldn't hold out this long (M7.02).
    const late = site.trapped.filter((h) => (site.until?.[h.id] ?? Infinity) < this.hours);
    site = { ...site, trapped: site.trapped.filter((h) => !late.includes(h)) };
    const names = [...site.trapped.map((h) => h.name), ...site.bodies.map((b) => b.hero.name)];
    this.emit(
      "site",
      names.length
        ? `The party finds the place where ${list(names)} fell.`
        : "The party finds the place where the lost party fell.",
    );
    const pct = this.ix.lib.rescue.rescuedHpPercent;
    for (const h of site.trapped) {
      const hero = structuredClone(h);
      hero.hp = Math.max(1, Math.round((this.maxHp(hero) * pct) / 100));
      hero.mana = 0;
      hero.condition = "ok";
      this.followers.push(hero);
      this.emit(
        "site",
        `${h.name} is alive! Weak and starving, but alive. They'll walk out with the party.`,
      );
    }
    for (const h of late)
      this.emit("site", `They're too late for ${h.name}. There's nothing to be done.`);
    // A rescue mission travels light (M7.02): the living only. The dead and
    // their gear wait for a recovery party.
    if (this.onRescue()) {
      if (site.bodies.length || site.items.length)
        this.emit(
          "site",
          "Travelling light, they leave the dead and the gear for a recovery party.",
        );
      this.siteLeft = [...site.items];
      this.siteBodiesLeft = true;
      return;
    }
    for (const b of site.bodies) {
      this.emit(
        "site",
        `There's nothing to be done for ${b.hero.name}. The party wraps the body to bring home.`,
      );
      this.bodies.push(b);
    }
    const items = [...site.items].sort(
      (a, b) =>
        Number(!!b.keep) - Number(!!a.keep) || worthPerSlot(this.ix, b) - worthPerSlot(this.ix, a),
    );
    for (const it of items) {
      const name = this.ix.item(it.item).name;
      this.haul.push(it);
      this.emit(
        "loot",
        it.owner
          ? `Recovered ${it.owner}'s ${name}.`
          : `Picked up the ${name.toLowerCase()} they'd found.`,
      );
    }
    this.repack();
    this.siteLeft = items.filter((it) => !this.haul.includes(it));
  }

  /**
   * The party has fallen: each porter drops what they can't run with and
   * makes for the surface (content/town.ts `porters.escape`). Those who make
   * it bring home the most valuable loot they can carry.
   */
  protected portersRun(out: ExpeditionResult["porters"]): HaulItem[] {
    const esc = this.ix.lib.town.porters.escape;
    const loose = [...this.haul].sort(
      (a, b) => worthPerSlot(this.ix, b) - worthPerSlot(this.ix, a),
    );
    const saved: HaulItem[] = [];
    for (const p of this.extras.porters ?? []) {
      const sheet = heroSheet(this.ix, p);
      const chance = Math.max(
        0.05,
        Math.min(
          0.95,
          esc.base +
            (sheet.stats.DEX + sheet.stats.END - 20) * esc.perStat -
            (this.depth - 1) * esc.perFloor,
        ),
      );
      const home = this.rng.chance(chance);
      out.push({ id: p.id, name: p.name, home });
      if (!home) {
        this.emit("porter", `${p.name} runs for the stairs, but doesn't make it.`);
        continue;
      }
      let room = sheet.derived.carrySlots;
      const took: string[] = [];
      for (const item of [...loose]) {
        if (item.keep) continue;
        const size = itemSize(this.ix.item(item.item));
        if (size > room) continue;
        room -= size;
        saved.push(item);
        loose.splice(loose.indexOf(item), 1);
        took.push(this.ix.item(item.item).name.toLowerCase());
      }
      this.emit(
        "porter",
        `${p.name} runs for it${took.length ? ` with ${list(took)}` : ""} and gets back to town.`,
      );
    }
    return saved;
  }
}
