/**
 * The fight from start to finish: turn order, ambushes, each fighter's turn
 * (its AI picks an action), and bleeding out.
 */
import type { AbilityDef } from "../../content/types";
import { getAi, type Action, type BattleView } from "../ai";
import { type Hero } from "../hero";
import { hearingOf } from "../stealth";
import type { Index } from "../library";
import { createRng } from "../rng";
import {
  type Side,
  type Fighter,
  type CombatResult,
  type CombatOptions,
  BASIC_ATTACK,
} from "./types";
import { an, MAX_ROUNDS } from "./base";
import { BattleEffects } from "./effects";

export function runCombat(
  ix: Index,
  party: readonly Hero[],
  monsterIds: readonly string[],
  opts: CombatOptions,
): CombatResult {
  return new Battle(
    ix,
    party,
    monsterIds,
    createRng(opts.seed),
    !!opts.surprise,
    !!opts.noBleeding,
    opts.carrying,
    opts.level ?? 1,
    opts.risen ?? [],
    opts.leader,
  )
    .useResearch(opts.research)
    .onGround(opts.ground)
    .withBonds(opts.bonds)
    .run(opts.maxRounds ?? MAX_ROUNDS);
}

/** One fight. Built on BattleEffects (what abilities do) and BattleBase (the fighters). */
export class Battle extends BattleEffects {
  // -------------------------------------------------------------------------
  // Main loop
  // -------------------------------------------------------------------------

  run(maxRounds: number): CombatResult {
    const names = (side: Side) =>
      this.fighters
        .filter((f) => f.side === side)
        .map((f) => f.name)
        .join(", ");
    this.emit({ kind: "start", text: `${names("party")} face ${names("monsters")}.` });
    if (this.ground) this.emit({ kind: "ground", text: this.ground.text });
    this.checkExposed();
    this.lurk();

    if (this.surprise) this.partySurprise();
    else this.ambushCheck();

    let winner: Side | "none" = this.winner();
    while (winner === "none" && this.round < maxRounds) {
      this.round++;
      this.emit({ kind: "round", text: `Round ${this.round}` });
      for (const f of this.turnOrder()) {
        if (f.state !== "up") continue;
        this.takeTurn(f);
        if ((winner = this.winner()) !== "none") break;
      }
      if (winner === "none" && !this.noBleeding) this.bleedOut();
      winner = this.winner();
      if (winner === "none" && this.cantHurtAny()) {
        this.flee();
        winner = this.winner();
        break;
      }
    }

    const text =
      winner === "party"
        ? "The party is victorious."
        : winner === "monsters"
          ? "The party has fallen."
          : this.fledFrom
            ? "The party gets away."
            : "Neither side can finish the other. The fight breaks off.";
    this.emit({
      kind: "end",
      text,
      tone: winner === "party" ? "good" : winner === "monsters" ? "bad" : undefined,
    });

    return {
      winner,
      rounds: this.round,
      log: this.log,
      party: this.party.map((h) => this.heroAfter(h)),
      kills: this.kills,
      fighters: this.fighters,
      risenSlain: this.risenSlain,
      ...(this.fledFrom ? { fled: this.fledFrom } : {}),
    };
  }

  /** Everything still standing against the party is warded (M7.07): there's no winning this. */
  protected cantHurtAny(): boolean {
    const foes = this.fighters.filter((f) => f.side === "monsters" && f.state === "up");
    const up = this.fighters.some((f) => f.side === "party" && f.state === "up");
    return up && foes.length > 0 && foes.every((f) => this.wardOf(f));
  }

  /**
   * The party runs from what it can't hurt (M7.07). Each warded foe gets a
   * parting blow; then everyone still on their feet carries one of the
   * downed, and anyone left over is left behind.
   */
  protected flee(): void {
    const foes = this.fighters.filter((f) => f.side === "monsters" && f.state === "up");
    const what = foes[0]!;
    this.fledFrom = what.monsterId;
    this.emit({
      kind: "action",
      tone: "bad",
      text: `Nothing the party has can touch ${what.name}. They run for it!`,
    });
    for (const f of foes) if (f.state === "up" && this.winner() === "none") this.takeTurn(f, true);
    const party = this.fighters.filter((f) => f.side === "party");
    const up = party.filter((f) => f.state === "up").length;
    const downed = party.filter((f) => f.state === "downed");
    for (const f of downed.slice(up)) {
      f.state = "dead";
      this.emit({
        kind: "died",
        target: f.uid,
        text: `There's nobody to carry ${f.name}. They're left behind.`,
      });
    }
  }

  protected turnOrder(): Fighter[] {
    return this.fighters
      .filter((f) => f.state === "up")
      .map((f) => ({ f, roll: this.stat(f, "initiative") + this.rng.int(0, 9) + this.rng.next() }))
      .sort((a, b) => b.roll - a.roll)
      .map((x) => x.f);
  }

  /**
   * Monsters tagged "ambusher" try to strike first. The party's best Scouting
   * gives the chance to spot them; if nobody does, the ambushers get a free
   * round with bonus damage.
   */
  protected ambushCheck(): void {
    const ambushers = this.fighters.filter(
      (f) => f.side === "monsters" && f.tags.includes("ambusher"),
    );
    if (!ambushers.length) return;
    const party = this.fighters.filter((f) => f.side === "party" && f.state === "up");
    const best = party.reduce<Fighter | undefined>(
      (b, f) => (!b || (f.skills.scouting ?? 0) > (b.skills.scouting ?? 0) ? f : b),
      undefined,
    );
    const chance = (best?.skills.scouting ?? 0) / 100;
    if (best && this.rng.chance(chance)) {
      this.emit({
        kind: "ambush",
        actor: best.uid,
        tone: "good",
        text: `${best.name} spots ${ambushers[0]!.name} lying in wait.`,
      });
      return;
    }
    this.emit({ kind: "ambush", tone: "bad", text: "Ambush! Something drops from the dark." });
    for (const f of ambushers) this.ambushing.add(f.uid);
    for (const f of ambushers) {
      if (f.state === "up" && this.winner() === "none") this.takeTurn(f, true);
    }
    this.ambushing.clear();
  }

  /** A scouted fight: every hero gets one free action, with the ambush bonus. */
  protected partySurprise(): void {
    this.emit({
      kind: "ambush",
      tone: "good",
      text: "The party catches them unawares and strikes first!",
    });
    const party = this.fighters.filter((f) => f.side === "party" && f.state === "up");
    for (const f of party) this.ambushing.add(f.uid);
    for (const f of party) {
      if (f.state === "up" && this.winner() === "none") this.takeTurn(f, true);
    }
    this.ambushing.clear();
  }

  protected takeTurn(f: Fighter, skipStatuses = false): void {
    if (!skipStatuses) {
      this.tickStatuses(f);
      if (f.state !== "up") return;
    }
    for (const id in f.cooldowns) if (f.cooldowns[id]! > 0) f.cooldowns[id]!--;
    const action = getAi(f.ai)(this.view(f));
    this.perform(f, action);
  }

  protected bleedOut(): void {
    for (const f of this.fighters) {
      if (f.side !== "party" || f.state !== "downed") continue;
      f.bleed--;
      if (f.bleed <= 0) {
        f.state = "dead";
        this.emit({ kind: "died", target: f.uid, text: `${f.name} has bled out.` });
      } else {
        this.emit({
          kind: "bleeding",
          target: f.uid,
          text: `${f.name} is bleeding out (${f.bleed} ${f.bleed === 1 ? "round" : "rounds"} left).`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // AI view
  // -------------------------------------------------------------------------

  protected view(self: Fighter): BattleView {
    return {
      self,
      allies: this.fighters.filter((f) => f.side === self.side && f.state !== "dead"),
      enemies: this.fighters.filter((f) => f.side !== self.side && f.state === "up"),
      ix: this.ix,
      rng: this.rng,
      abilities: () => [BASIC_ATTACK, ...self.abilities.map((id) => this.ix.ability(id))],
      canAfford: (a) => this.ready(self, a),
      targets: (a) => this.targetsFor(self, a),
      weakTo: (foe) => {
        if (self.side !== "party" || this.tierOf(foe) < 2) return [];
        return foe.passives.flatMap((p) =>
          p.type === "resist" && p.percent < 0 ? [p.damageType] : [],
        );
      },
    };
  }

  /** Enough mana, off cooldown, and not used up for this fight. */
  protected ready(self: Fighter, a: AbilityDef): boolean {
    if (self.mana < (a.cost ?? 0)) return false;
    if ((self.cooldowns[a.id] ?? 0) > 0) return false;
    return a.perFight === undefined || (self.used[a.id] ?? 0) < a.perFight;
  }

  protected targetsFor(self: Fighter, ability: AbilityDef): Fighter[] {
    switch (ability.target) {
      case "self":
        return [self];
      case "ally":
      case "all-allies":
        return this.fighters.filter((f) => f.side === self.side && f.state !== "dead");
      case "all-enemies":
      case "enemy": {
        let enemies = this.fighters.filter((f) => f.side !== self.side && f.state === "up");
        // Lurkers (M9.04): nobody can single out a hero hidden in the shadows.
        if (ability.target === "enemy") enemies = enemies.filter((f) => !f.hidden);
        // Melee weapon attacks can only reach the front row while it stands
        // (a sweeping blow like Cleave hits the whole front row).
        const melee = ability.effects.some((e) => e.type === "weaponAttack") && !self.weapon.ranged;
        const front = enemies.filter((f) => f.row === "front");
        let reach = melee && front.length ? front : enemies;
        // Nobody wastes blows on a ward (M7.07) while there's something they can hurt.
        if (self.side === "party") {
          const hurtable = reach.filter((f) => !this.wardOf(f));
          if (hurtable.length) reach = hurtable;
        }
        return ability.target === "enemy" ? this.hunted(self, reach) : reach;
      }
    }
  }

  /**
   * Monsters that hunt by tag (MonsterDef.hunts, DESIGN.md §7: the undead go
   * for Good heroes) pick from those first, if any are in reach. Cunning
   * monsters (M7.05) go for the party's leader before anything else.
   */
  protected hunted(self: Fighter, targets: Fighter[]): Fighter[] {
    const def = self.monsterId ? this.ix.monster(self.monsterId) : undefined;
    if (def?.tags.includes("cunning")) {
      const leader = targets.filter((f) => f.tags.includes("leader"));
      if (leader.length) return leader;
    }
    const hunts = def?.hunts;
    if (!hunts?.length) return targets;
    const prey = targets.filter((f) => f.tags.some((t) => hunts.includes(t)));
    return prey.length ? prey : targets;
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  protected perform(actor: Fighter, action: Action): void {
    if (action.kind === "wait") {
      this.emit({ kind: "action", actor: actor.uid, text: `${actor.name} hesitates.` });
      return;
    }
    const target = this.fighters.find((f) => f.uid === action.target);
    if (!target) return;

    if (action.kind === "item") {
      const idx = actor.pack.indexOf(action.item);
      if (idx < 0) return;
      actor.pack.splice(idx, 1);
      const item = this.ix.item(action.item);
      const who = target === actor ? "" : ` on ${target.name}`;
      this.emit({
        kind: "action",
        actor: actor.uid,
        target: target.uid,
        text: `${actor.name} uses ${an(item.name)}${who}.`,
      });
      this.applyEffects(actor, target, item.use ?? [], false);
      return;
    }

    const ability = action.ability === "attack" ? BASIC_ATTACK : this.ix.ability(action.ability);
    actor.mana -= ability.cost ?? 0;
    if (ability.cooldown) actor.cooldowns[ability.id] = ability.cooldown;
    actor.used[ability.id] = (actor.used[ability.id] ?? 0) + 1;
    const group = ability.target === "all-enemies" || ability.target === "all-allies";
    const targets = group ? this.targetsFor(actor, ability) : [target];
    const isBasic = ability === BASIC_ATTACK;
    if (!isBasic) {
      const aimed = ability.target === "enemy" || (ability.target === "ally" && target !== actor);
      const verb = ability.verb ?? `uses ${ability.name}`;
      const text = verb.includes("{target}")
        ? verb.replace("{target}", target.name)
        : `${verb}${aimed ? ` on ${target.name}` : ""}`;
      this.emit({
        kind: "action",
        actor: actor.uid,
        target: target.uid,
        text: `${actor.name} ${text}.`,
      });
    }
    for (const t of targets) this.applyEffects(actor, t, ability.effects, isBasic);
    // Dual-wielding (M9.04): the off hand follows up any blow with the main
    // weapon at one foe (a plain attack, Backstab, Flurry...), once.
    const struck =
      ability.target === "enemy" && ability.effects.some((e) => e.type === "weaponAttack");
    if (struck && actor.offhand && target.state === "up" && actor.state === "up")
      this.weaponAttack(actor, target, 0, false, true);
    if (struck && actor.hidden) this.spotCheck(actor, target);
  }

  // -------------------------------------------------------------------------
  // Lurking (M9.04, DESIGN.md "Lurking")
  // -------------------------------------------------------------------------

  /** How well a fighter hears: PER × earPerPer, plus a monster's own `hearing`. */
  protected earOf(f: Fighter): number {
    if (f.monsterId) return hearingOf(this.ix, f.monsterId);
    return f.stats.PER * this.ix.lib.stealth.earPerPer;
  }

  /** The sneak formula (§17.8): base + (a − b) / 100, kept within min-max. */
  protected stealthOdds(a: number, b: number): number {
    const r = this.ix.lib.stealth;
    return Math.max(r.min, Math.min(r.max, r.base + (a - b) / 100));
  }

  /** At the start of a fight, back-row heroes with a melee weapon try to slip into the shadows. */
  protected lurk(): void {
    const foes = this.fighters.filter((f) => f.side === "monsters" && f.state === "up");
    if (!foes.length) return;
    const ear = Math.max(...foes.map((f) => this.earOf(f)));
    for (const f of this.fighters) {
      if (f.side !== "party" || f.state !== "up" || f.row !== "back") continue;
      if (f.weapon.ranged || f.weapon.reach) continue;
      const stealth = f.skills.stealth ?? 0;
      if (this.rng.chance(this.stealthOdds(stealth, ear))) {
        f.hidden = true;
        f.strikesHidden = 0;
        this.emit({
          kind: "status",
          target: f.uid,
          tone: "good",
          text: `${f.name} slips into the shadows.`,
        });
      } else {
        this.emit({
          kind: "status",
          target: f.uid,
          text: `${f.name} looks for a shadow to slip into, but they're being watched.`,
        });
      }
    }
  }

  /**
   * After a strike from hiding, the foe struck (or, if it fell, the sharpest
   * ear still standing) may spot the lurker. Each strike makes the next
   * easier to see. Found, they stand in the front row for the rest of the fight.
   */
  protected spotCheck(actor: Fighter, struck: Fighter): void {
    const foes = this.fighters.filter((f) => f.side !== actor.side && f.state === "up");
    const sharpest = () => foes.sort((a, b) => this.earOf(b) - this.earOf(a))[0];
    const watcher = struck.state === "up" ? struck : sharpest();
    const before = actor.strikesHidden ?? 0;
    actor.strikesHidden = before + 1;
    if (!watcher) return;
    const odds = Math.min(
      this.ix.lib.stealth.max,
      this.stealthOdds(this.earOf(watcher), actor.skills.stealth ?? 0) +
        before * this.ix.lib.stealth.lurk.spotPerStrike,
    );
    if (!this.rng.chance(odds)) return;
    actor.hidden = false;
    actor.row = "front";
    this.emit({
      kind: "status",
      actor: watcher.uid,
      target: actor.uid,
      tone: "bad",
      text: `${watcher.name} spots ${actor.name}! Out of the shadows, they're in the thick of it.`,
    });
  }
}
