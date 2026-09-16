import type { AbilityId, ElementalOffense, EnemyDef, TerrainEffectKey, RaceId, LineageId } from '../types/index.ts';
import type { BattleProtocolEvent } from './battleProtocol.ts';

// SpecRef: 8.5 | UI_DIARY | Compact language-neutral records
// Permanent storage codes, independent of the native ABI. Never renumber.
export const DIARY_EVENT_CODES = {
  terrain_effect: 4, ability_activated: 5, initiative: 6, target_selected: 7,
  action_skipped: 8, attack: 9, damage: 10, heal: 11, status_applied: 12,
  status_removed: 13, reflected: 14, absorbed: 15, nullified: 16,
  resurrected: 18, reanimated: 19, ability_mutated: 24, random_flavor: 25, diagnostic: 26,
} as const;
const names = Object.fromEntries(Object.entries(DIARY_EVENT_CODES).map(([k, v]) => [v, k])) as Record<number, BattleProtocolEvent['opcode']>;
// [category, opcode, presence mask, ...present values in FIELD order]. Zero is a value.
export type CompactEvent = number[];
export const DIARY_EVENT_FIELDS = ['phase', 'actorKind', 'actorId', 'targetId', 'abilityId', 'attackType', 'flags', 'timing', 'hits', 'attempts', 'aux0', 'value0', 'value1', 'value2', 'aux1', 'aux2'] as const;
const attackTypes = [null, 'ranged', 'magical', 'melee'] as const;
export interface CompactBattleActor {
  id: number;
  kind: 'character' | 'enemy';
  name: string;
  nameKey?: string;
  /** Historical race, gender (0 male / 1 female), unique lineage or copied form. */
  appearance?: [RaceId, 0 | 1, (LineageId | number)?];
  elementalOffense: ElementalOffense;
  elementalOffenseValue: number;
  magicStyle?: EnemyDef['magicStyle'];
  physicalDefense: number;
  abilities: [AbilityId, number][];
}
export interface CompactBattleLog {
  version: 1;
  actorSet?: number[];
  actors: CompactBattleActor[];
  terrain?: TerrainEffectKey | null;
  abilities: AbilityId[];
  events: CompactEvent[];
}
export function getDiaryEventCategory(event: BattleProtocolEvent): 0 | 1 | 2 | 3 | 4 {
  if (event.phase === 3) return 4;
  if (event.opcode === 'terrain_effect'
    || (event.opcode === 'target_selected' && (event.flags & 8) !== 0)
    || (event.opcode === 'ability_mutated' && event.aux0 === 13 && (event.flags & 4) !== 0)) return 0;
  if (event.opcode === 'attack') return event.aux0 >= 3 ? 3 : 2;
  return 1;
}
export function encodeCompactBattleEvents(events: BattleProtocolEvent[], actors: CompactBattleActor[], terrain?: TerrainEffectKey | null): CompactBattleLog {
  const abilities: AbilityId[] = [];
  const rows: CompactEvent[] = [];
  for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
    const event = events[eventIndex];
    const code = DIARY_EVENT_CODES[event.opcode as keyof typeof DIARY_EVENT_CODES];
    if (!code) continue;
    // Only presentation diagnostics and flavored target selections are retained.
    if (event.opcode === 'diagnostic' && !(event.flags & 128)) continue;
    if (event.opcode === 'target_selected' && !(event.flags & 8)) continue;
    // Numerical damage/heal bookkeeping is already represented by attack/effect facts.
    const flavored = events[eventIndex + 1]?.opcode === 'random_flavor';
    const chainDamage = event.opcode === 'damage' && events[eventIndex - 2]?.opcode === 'target_selected' && !!(events[eventIndex - 2].flags & 8);
    if ((event.opcode === 'damage' || event.opcode === 'heal') && !flavored && !chainDamage) continue;
    const category = getDiaryEventCategory(event);
    let mask = 0;
    const values: number[] = [];
    DIARY_EVENT_FIELDS.forEach((field, index) => {
      let value: number;
      if (field === 'abilityId') {
        if (!event.abilityId) return;
        let id = abilities.indexOf(event.abilityId);
        if (id < 0) { id = abilities.length; abilities.push(event.abilityId); }
        value = id + 1;
      } else if (field === 'attackType') value = attackTypes.indexOf(event.attackType);
      else value = event[field];
      if (field === 'actorId' || field === 'targetId') {
        if (value !== 0) { const ref = actors.findIndex(actor => actor.id === value); if (ref < 0) throw new Error('Unknown Diary actor reference'); value = ref + 1; }
      }
      let baseline = field === 'phase' ? 2 : field === 'actorKind' ? (actors.find(actor => actor.id === event.actorId)?.kind === 'character' ? 1 : actors.some(actor => actor.id === event.actorId) ? 2 : 0) : 0;
      if (event.opcode === 'random_flavor') {
        const source = events[eventIndex - 1];
        if (field === 'abilityId') baseline = source.abilityId ? abilities.indexOf(source.abilityId) + 1 : 0;
        else if (field === 'attackType') baseline = attackTypes.indexOf(source.attackType);
        else if (field === 'actorId' || field === 'targetId') baseline = source[field] ? actors.findIndex(actor => actor.id === source[field]) + 1 : 0;
        else baseline = source[field];
      }
      if (value === baseline) return;
      mask |= 1 << index;
      values.push(value);
    });
    rows.push([category, code, mask, ...values]);
  }
  return { version: 1, actors, ...(terrain ? { terrain } : {}), abilities, events: rows };
}
export function decodeCompactBattleEvents(log: CompactBattleLog): BattleProtocolEvent[] {
  validateCompactBattleLog(log);
  const decoded: BattleProtocolEvent[] = [];
  return log.events.map((row) => {
    const flavor = names[row[1]] === 'random_flavor';
    const previous = decoded[decoded.length - 1];
    if (flavor && !previous) throw new Error('Orphaned Diary flavor');
    const event = { opcode: names[row[1]] } as BattleProtocolEvent;
    let cursor = 3;
    DIARY_EVENT_FIELDS.forEach((field, index) => {
      if (flavor && !(row[2] & (1 << index))) {
        Object.assign(event, { [field]: previous[field] }); return;
      }
      const value = row[2] & (1 << index) ? row[cursor++] : field === 'phase' ? 2 : 0;
      if (field === 'abilityId') event.abilityId = value ? log.abilities[value - 1] : null;
      else if (field === 'attackType') event.attackType = attackTypes[value];
      else if (field === 'actorId' || field === 'targetId') {
        if (value && !log.actors[value - 1]) throw new Error('Invalid Diary actor reference');
        event[field] = value ? log.actors[value - 1].id : 0;
      } else event[field] = value;
    });
    if (!flavor && !(row[2] & 2)) {
      const actor = log.actors.find(actor => actor.id === event.actorId);
      event.actorKind = actor?.kind === 'character' ? 1 : actor ? 2 : 0;
    }
    if (flavor && (previous.opcode === 'random_flavor' || event.aux1 !== previous.aux0
      || event.phase !== previous.phase || event.actorId !== previous.actorId || event.abilityId !== previous.abilityId
      || event.attackType !== previous.attackType || event.timing !== previous.timing)) throw new Error('Mismatched Diary flavor');
    decoded.push(event);
    return event;
  });
}
export function validateCompactBattleLog(log: CompactBattleLog): void {
  if (!log || log.version !== 1 || !Array.isArray(log.actors) || !Array.isArray(log.abilities) || !Array.isArray(log.events)) throw new Error('Unsupported compact Diary battle');
  if (log.abilities.some(a => typeof a !== 'string')) throw new Error('Invalid compact Diary abilities');
  const ids = new Set<number>();
  for (const actor of log.actors) {
    if (!Number.isInteger(actor.id) || ids.has(actor.id) || !['character', 'enemy'].includes(actor.kind) || typeof actor.name !== 'string'
      || !Array.isArray(actor.abilities) || !['none', 'fire', 'thunder', 'ice'].includes(actor.elementalOffense)
      || !Number.isFinite(actor.elementalOffenseValue) || !Number.isFinite(actor.physicalDefense)) throw new Error('Invalid compact Diary actor');
    if (actor.appearance && (!Array.isArray(actor.appearance) || actor.appearance.length < 2 || actor.appearance.length > 3 || typeof actor.appearance[0] !== 'string' || ![0, 1].includes(actor.appearance[1]))) throw new Error('Invalid Diary appearance');
    if (actor.nameKey !== undefined && typeof actor.nameKey !== 'string') throw new Error('Invalid Diary name key');
    if (actor.abilities.some(pair => !Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || !Number.isFinite(pair[1]))) throw new Error('Invalid Diary actor ability');
    ids.add(actor.id);
  }
  for (const row of log.events) {
    if (!Array.isArray(row) || row.length < 3 || row.some(v => !Number.isFinite(v)) || !Number.isInteger(row[0]) || row[0] < 0 || row[0] > 4
      || !names[row[1]] || !Number.isInteger(row[2]) || row[2] < 0 || row[2] > 65535) throw new Error('Invalid compact Diary event');
    let count = 0;
    for (let bit = 0; bit < 16; bit++) if (row[2] & (1 << bit)) count++;
    if (row.length !== count + 3) throw new Error('Invalid compact Diary event arity');
    let cursor = 3;
    for (let bit = 0; bit < 16; bit++) {
      const value = row[2] & (1 << bit) ? row[cursor++] : 0;
      if ((bit === 2 || bit === 3) && (!Number.isInteger(value) || value < 0 || value > log.actors.length)) throw new Error('Invalid compact Diary actor reference');
      if ((bit === 8 || bit === 9) && (!Number.isInteger(value) || value < 0)) throw new Error('Invalid compact Diary hit count');
      if (bit === 4 && (!Number.isInteger(value) || value < 0 || value > log.abilities.length)) throw new Error('Invalid compact Diary ability reference');
      if (bit === 5 && (!Number.isInteger(value) || value < 0 || value > 3)) throw new Error('Invalid compact Diary attack type');
    }
  }
}
