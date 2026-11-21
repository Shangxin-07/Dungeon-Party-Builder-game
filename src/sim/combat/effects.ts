/**
 * What abilities, statuses and triggers do: weapon attacks, damage, healing,
 * statuses and summons. The loop only knows these effect *types*; every
 * ability is data.
 */
import type { ActiveEffect, DamageType } from "../../content/types";
import { bonusVsTags, resistance } from "../stats";
import { type Fighter } from "./types";
import { AMBUSH_BONUS, BattleBase, BLEED_ROUNDS, clamp } from "./base";

/** Effects on fighters. Extended by Battle. */
export class BattleEffects extends BattleBase {
  /** Run effects in order. A missed weapon attack cancels the rest for that target. */
  protected applyEffects(
    actor: Fighter,
    target: Fighter,
    effects: readonly ActiveEffect[],
    basic: boolean,
  ): void {
    for (const e of effects) {
      if (target.state === "dead") return;
      switch (e.type) {
        case "weaponAttack":
          if (!this.weaponAttack(actor, target, e.damagePercent ?? 0, basic)) return;
          break;
        case "dealDamage": {
          let amount = e.amount + (e.scale ?? 0) * this.stat(actor, "spellPower");
          amount *= 1 + bonusVsTags(this.passives(actor), target.tags) / 100;
          this.damage(target, Math.round(amount), e.damageType, false, actor);
          break;
        }
        case "heal":
          this.heal(target, Math.round(e.amount + (e.scale ?? 0) * this.stat(actor, "spellPower")));
          break;
        case "applyStatus":
          this.applyStatus(target, e.status, e.turns, e.chance ?? 1, actor.side === target.side);
          break;
        case "summon":
          this.summon(actor, e.monster, e.count);
          break;
      }
    }
  }

  protected weaponAttack(
    actor: Fighter,
    target: Fighter,
    extraPercent: number,
    basic: boolean,
  ): boolean {
    const hitChance = clamp(
      0.75 + (this.stat(actor, "accuracy") - this.stat(target, "evasion")) * 0.03,
      0.15,
      0.95,
    );
    const withWeapon = basic ? ` with ${actor.weapon.name}` : "";
    if (!this.rng.chance(hitChance)) {
      const text = basic
        ? `${actor.name} swings at ${target.name}${withWeapon} and misses.`
        : `${actor.name} misses.`;
      this.emit({ kind: "miss", actor: actor.uid, target: target.uid, text });
      return false;
    }
    const atk = this.stat(actor, "attack");
    let raw = this.rng.int(Math.ceil(atk / 2), atk);
    let percent = extraPercent + bonusVsTags(this.passives(actor), target.tags);
    if (this.ambushing.has(actor.uid)) percent += AMBUSH_BONUS;
    raw *= 1 + percent / 100;
    if (basic) {
      this.emit({
        kind: "hit",
        actor: actor.uid,
        target: target.uid,
        text: `${actor.name} hits ${target.name}${withWeapon}.`,
      });
    }
    this.damage(target, Math.round(raw), actor.weapon.damageType, true, actor);
    return true;
  }

  protected damage(
    target: Fighter,
    raw: number,
    type: DamageType,
    armored: boolean,
    source?: Fighter,
  ): void {
    const resist = resistance(this.passives(target), type);
    let amount = raw * (1 - resist / 100);
    if (armored) amount -= this.stat(target, "armor");
    amount = resist >= 100 ? 0 : Math.max(1, Math.round(amount));
    let note = "";
    if (resist >= 100) note = " (immune)";
    else if (resist > 0) note = " (resisted)";
    else if (resist < 0) note = " (weak spot!)";
    if (source && this.ambushing.has(source.uid)) note += " (ambush!)";
    if (amount === 0) {
      this.emit({
        kind: "damage",
        target: target.uid,
        amount: 0,
        text: `${target.name} shrugs it off${note}.`,
        hp: this.hp(target),
      });
      return;
    }
    target.hp = Math.max(0, target.hp - amount);
    this.emit({
      kind: "damage",
      target: target.uid,
      amount,
      text: `${target.name} takes ${amount} ${type} damage${note}.`,
      hp: this.hp(target),
    });

    if (target.hp === 0) {
      if (target.side === "party") {
        target.state = "downed";
        target.bleed = BLEED_ROUNDS;
        target.statuses = [];
        this.emit({ kind: "downed", target: target.uid, text: `${target.name} goes down!` });
        this.checkExposed();
      } else {
        target.state = "dead";
        if (target.monsterId) this.kills.push(target.monsterId);
        if (target.risenId) this.risenSlain.push(target.risenId);
        this.emit({
          kind: "killed",
          actor: source?.uid,
          target: target.uid,
          text: `${target.name} is slain.`,
        });
      }
    }
    this.fireTriggers(target, amount);
  }

  /**
   * Warn when nobody in the party's front row is standing but someone in the
   * back row is: monsters' melee attacks can reach the back row now. Warns
   * again if the front row gets back up and falls a second time.
   */
  protected checkExposed(): void {
    const party = this.fighters.filter((f) => f.side === "party" && f.state === "up");
    const open = !party.some((f) => f.row === "front") && party.some((f) => f.row === "back");
    if (open && !this.exposed && this.winner() === "none") {
      const anyFront = this.fighters.some((f) => f.side === "party" && f.row === "front");
      const text = anyFront
        ? "The front row has fallen: the back row is exposed!"
        : "Nobody holds the front row: the back row is exposed!";
      this.emit({ kind: "exposed", text });
    }
    this.exposed = open;
  }

  protected fireTriggers(f: Fighter, amount: number): void {
    f.triggers.forEach((t, i) => {
      if (t.on !== "damaged") return;
      if (t.once && f.firedTriggers.has(i)) return;
      if (t.minDamage !== undefined && amount < t.minDamage) return;
      if (t.ifAlive && f.state !== "up") return;
      f.firedTriggers.add(i);
      if (t.message)
        this.emit({ kind: "action", actor: f.uid, text: t.message.replace("{self}", f.name) });
      this.applyEffects(f, f, t.effects, false);
    });
  }

  protected heal(target: Fighter, amount: number): void {
    const before = target.hp;
    target.hp = Math.min(target.derived.maxHp, target.hp + amount);
    const gained = target.hp - before;
    if (target.state === "downed" && target.hp > 0) {
      target.state = "up";
      target.bleed = BLEED_ROUNDS;
      this.emit({
        kind: "revived",
        target: target.uid,
        amount: gained,
        text: `${target.name} is back on their feet (+${gained} HP).`,
        hp: this.hp(target),
      });
      this.checkExposed();
      return;
    }
    this.emit({
      kind: "heal",
      target: target.uid,
      amount: gained,
      text: `${target.name} recovers ${gained} HP.`,
      hp: this.hp(target),
    });
  }

  protected applyStatus(
    target: Fighter,
    id: string,
    turns: number,
    chance: number,
    friendly = false,
  ): void {
    if (target.state !== "up") return;
    const status = this.ix.status(id);
    // Willpower shrugs off some effects: each point of resist is -1% chance.
    // Nobody resists a friend's war cry.
    const resist = friendly ? 0 : this.stat(target, "resist") / 100;
    if (!this.rng.chance(chance * (1 - resist))) return;
    const existing = target.statuses.find((s) => s.id === id);
    if (existing) existing.turns = Math.max(existing.turns, turns);
    else target.statuses.push({ id, turns });
    // A friendly status (a war cry) helps its target; anything else hurts it.
    const helps = friendly === (target.side === "party");
    this.emit({
      kind: "status",
      target: target.uid,
      tone: helps ? "good" : "bad",
      text: `${target.name} is ${status.name.toLowerCase()}.`,
    });
  }

  protected tickStatuses(f: Fighter): void {
    for (const s of [...f.statuses]) {
      const def = this.ix.status(s.id);
      if (def.perTurn) this.applyEffects(f, f, def.perTurn, false);
      if (f.state !== "up") return;
      s.turns--;
      if (s.turns <= 0) {
        f.statuses = f.statuses.filter((x) => x !== s);
        this.emit({
          kind: "status-end",
          target: f.uid,
          text: `${f.name} is no longer ${def.name.toLowerCase()}.`,
        });
      }
    }
  }

  protected summon(actor: Fighter, monsterId: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const f = this.fromMonster(monsterId, actor.side, true);
      this.fighters.push(f);
      this.emit({
        kind: "summon",
        actor: actor.uid,
        target: f.uid,
        text: `${f.name} joins the fight.`,
        hp: this.hp(f),
        name: f.name,
      });
    }
  }
}
