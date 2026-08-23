import { AttackType, BattleLogEntry } from '../types';
import { t } from '../i18n';

const CONFUSION_SUCCESS_LOGS = [
  'battleFlavor.confusion-success.1',
  'battleFlavor.confusion-success.2',
  'battleFlavor.confusion-success.3',
  'battleFlavor.confusion-success.4',
  'battleFlavor.confusion-success.5',
  'battleFlavor.confusion-success.6',
  'battleFlavor.confusion-success.7',
  'battleFlavor.confusion-success.8',
  'battleFlavor.confusion-success.9',
  'battleFlavor.confusion-success.10',
] as const;

const CONFUSION_FAILURE_LOGS = [
  'battleFlavor.confusion-failure.1',
  'battleFlavor.confusion-failure.2',
  'battleFlavor.confusion-failure.3',
  'battleFlavor.confusion-failure.4',
  'battleFlavor.confusion-failure.5',
  'battleFlavor.confusion-failure.6',
  'battleFlavor.confusion-failure.7',
  'battleFlavor.confusion-failure.8',
  'battleFlavor.confusion-failure.9',
  'battleFlavor.confusion-failure.10',
] as const;

const CONFUSION_NO_TARGET_LOGS = [
  'battleFlavor.confusion-no-target.1',
  'battleFlavor.confusion-no-target.2',
  'battleFlavor.confusion-no-target.3',
  'battleFlavor.confusion-no-target.4',
  'battleFlavor.confusion-no-target.5',
  'battleFlavor.confusion-no-target.6',
  'battleFlavor.confusion-no-target.7',
  'battleFlavor.confusion-no-target.8',
  'battleFlavor.confusion-no-target.9',
  'battleFlavor.confusion-no-target.10',
  'battleFlavor.confusion-no-target.11',
  'battleFlavor.confusion-no-target.12',
  'battleFlavor.confusion-no-target.13',
] as const;

const ANTAGONISM_LOGS = {
  ranged: [
    'battleFlavor.inline.1',
    'battleFlavor.inline.2',
    'battleFlavor.inline.3',
    'battleFlavor.inline.4',
    'battleFlavor.inline.5',
    'battleFlavor.inline.6',
    'battleFlavor.inline.7',
    'battleFlavor.inline.8',
    'battleFlavor.inline.9',
    'battleFlavor.inline.10',
  ],
  magical: [
    'battleFlavor.inline.11',
    'battleFlavor.inline.12',
    'battleFlavor.inline.13',
    'battleFlavor.inline.14',
    'battleFlavor.inline.15',
    'battleFlavor.inline.16',
    'battleFlavor.inline.17',
    'battleFlavor.inline.18',
    'battleFlavor.inline.19',
    'battleFlavor.inline.20',
  ],
  melee: [
    'battleFlavor.inline.21',
    'battleFlavor.inline.22',
    'battleFlavor.inline.23',
    'battleFlavor.inline.24',
    'battleFlavor.inline.25',
    'battleFlavor.inline.26',
    'battleFlavor.inline.27',
    'battleFlavor.inline.28',
    'battleFlavor.inline.29',
    'battleFlavor.inline.30',
  ],
} as const satisfies Record<AttackType, readonly string[]>;

const UNSTABLE_CORE_LOGS = {
  ranged: [
    'battleFlavor.inline.31',
    'battleFlavor.inline.32',
    'battleFlavor.inline.33',
    'battleFlavor.inline.34',
    'battleFlavor.inline.35',
  ],
  magical: [
    'battleFlavor.inline.36',
    'battleFlavor.inline.37',
    'battleFlavor.inline.38',
    'battleFlavor.inline.39',
    'battleFlavor.inline.40',
  ],
} as const satisfies Record<Exclude<AttackType, 'melee'>, readonly string[]>;

const SOUL_REAP_LOGS = [
  'battleFlavor.soul-reap.1',
  'battleFlavor.soul-reap.2',
  'battleFlavor.soul-reap.3',
  'battleFlavor.soul-reap.4',
  'battleFlavor.soul-reap.5',
  'battleFlavor.soul-reap.6',
  'battleFlavor.soul-reap.7',
  'battleFlavor.soul-reap.8',
  'battleFlavor.soul-reap.9',
  'battleFlavor.soul-reap.10',
] as const;

const REGENERATION_LOGS = [
  'battleFlavor.regeneration.1',
  'battleFlavor.regeneration.2',
  'battleFlavor.regeneration.3',
  'battleFlavor.regeneration.4',
  'battleFlavor.regeneration.5',
  'battleFlavor.regeneration.6',
  'battleFlavor.regeneration.7',
  'battleFlavor.regeneration.8',
  'battleFlavor.regeneration.9',
  'battleFlavor.regeneration.10',
] as const;

const SELF_DESTRUCT_LOGS = [
  'battleFlavor.self-destruct.1',
  'battleFlavor.self-destruct.2',
  'battleFlavor.self-destruct.3',
  'battleFlavor.self-destruct.4',
  'battleFlavor.self-destruct.5',
  'battleFlavor.self-destruct.6',
  'battleFlavor.self-destruct.7',
  'battleFlavor.self-destruct.8',
  'battleFlavor.self-destruct.9',
  'battleFlavor.self-destruct.10',
] as const;

const DECOMPOSE_LOGS = [
  'battleFlavor.decompose.1',
  'battleFlavor.decompose.2',
  'battleFlavor.decompose.3',
  'battleFlavor.decompose.4',
  'battleFlavor.decompose.5',
  'battleFlavor.decompose.6',
  'battleFlavor.decompose.7',
  'battleFlavor.decompose.8',
  'battleFlavor.decompose.9',
  'battleFlavor.decompose.10',
] as const;

const FREE_LOGS = [
  'battleFlavor.free.1',
  'battleFlavor.free.2',
  'battleFlavor.free.3',
  'battleFlavor.free.4',
  'battleFlavor.free.5',
  'battleFlavor.free.6',
  'battleFlavor.free.7',
  'battleFlavor.free.8',
  'battleFlavor.free.9',
  'battleFlavor.free.10',
] as const;

// SpecRef: 6.2.1 | Ability flavor text | log.pursuit
const PURSUIT_LOGS = [
  'battleFlavor.pursuit.1',
  'battleFlavor.pursuit.2',
  'battleFlavor.pursuit.3',
  'battleFlavor.pursuit.4',
  'battleFlavor.pursuit.5',
  'battleFlavor.pursuit.6',
  'battleFlavor.pursuit.7',
  'battleFlavor.pursuit.8',
  'battleFlavor.pursuit.9',
  'battleFlavor.pursuit.10',
] as const;

// SpecRef: 6.2.1 | Ability flavor text | log.illusion
const ILLUSION_LOGS = [
  'battleFlavor.illusion.1',
  'battleFlavor.illusion.2',
  'battleFlavor.illusion.3',
  'battleFlavor.illusion.4',
  'battleFlavor.illusion.5',
  'battleFlavor.illusion.6',
  'battleFlavor.illusion.7',
  'battleFlavor.illusion.8',
  'battleFlavor.illusion.9',
  'battleFlavor.illusion.10',
] as const;

// SpecRef: 6.2.1 | Ability flavor text | log.illusion-breaker
const ILLUSION_BREAKER_LOGS = [
  'battleFlavor.illusion-breaker.1',
  'battleFlavor.illusion-breaker.2',
  'battleFlavor.illusion-breaker.3',
  'battleFlavor.illusion-breaker.4',
  'battleFlavor.illusion-breaker.5',
  'battleFlavor.illusion-breaker.6',
  'battleFlavor.illusion-breaker.7',
  'battleFlavor.illusion-breaker.8',
  'battleFlavor.illusion-breaker.9',
  'battleFlavor.illusion-breaker.10',
] as const;

const SHOCK_LOGS = [
  'battleFlavor.shock.1',
  'battleFlavor.shock.2',
  'battleFlavor.shock.3',
  'battleFlavor.shock.4',
  'battleFlavor.shock.5',
  'battleFlavor.shock.6',
  'battleFlavor.shock.7',
  'battleFlavor.shock.8',
  'battleFlavor.shock.9',
  'battleFlavor.shock.10',
] as const;

// SpecRef: 6.2.2 | Terrain flavor text | log.null-shock
const NULL_SHOCK_LOGS = [
  'battleFlavor.null-shock.1',
  'battleFlavor.null-shock.2',
  'battleFlavor.null-shock.3',
  'battleFlavor.null-shock.4',
  'battleFlavor.null-shock.5',
  'battleFlavor.null-shock.6',
  'battleFlavor.null-shock.7',
  'battleFlavor.null-shock.8',
  'battleFlavor.null-shock.9',
  'battleFlavor.null-shock.10',
] as const;

const FLYING_LOGS = [
  'battleFlavor.flying.1',
  'battleFlavor.flying.2',
  'battleFlavor.flying.3',
  'battleFlavor.flying.4',
  'battleFlavor.flying.5',
  'battleFlavor.flying.6',
  'battleFlavor.flying.7',
  'battleFlavor.flying.8',
  'battleFlavor.flying.9',
  'battleFlavor.flying.10',
] as const;

const CORRODE_LOGS = [
  'battleFlavor.corrode.1',
  'battleFlavor.corrode.2',
  'battleFlavor.corrode.3',
  'battleFlavor.corrode.4',
  'battleFlavor.corrode.5',
  'battleFlavor.corrode.6',
  'battleFlavor.corrode.7',
  'battleFlavor.corrode.8',
  'battleFlavor.corrode.9',
  'battleFlavor.corrode.10',
] as const;

const NULL_CORRODE_LOGS = [
  'battleFlavor.null-corrode.1',
  'battleFlavor.null-corrode.2',
  'battleFlavor.null-corrode.3',
  'battleFlavor.null-corrode.4',
  'battleFlavor.null-corrode.5',
  'battleFlavor.null-corrode.6',
  'battleFlavor.null-corrode.7',
  'battleFlavor.null-corrode.8',
  'battleFlavor.null-corrode.9',
  'battleFlavor.null-corrode.10',
] as const;

const LIFE_DRAIN_LOGS = [
  'battleFlavor.life-drain.1',
  'battleFlavor.life-drain.2',
  'battleFlavor.life-drain.3',
  'battleFlavor.life-drain.4',
  'battleFlavor.life-drain.5',
  'battleFlavor.life-drain.6',
  'battleFlavor.life-drain.7',
  'battleFlavor.life-drain.8',
  'battleFlavor.life-drain.9',
  'battleFlavor.life-drain.10',
] as const;

const NULL_LIFE_DRAIN_LOGS = [
  'battleFlavor.null-life-drain.1',
  'battleFlavor.null-life-drain.2',
  'battleFlavor.null-life-drain.3',
  'battleFlavor.null-life-drain.4',
  'battleFlavor.null-life-drain.5',
  'battleFlavor.null-life-drain.6',
  'battleFlavor.null-life-drain.7',
  'battleFlavor.null-life-drain.8',
  'battleFlavor.null-life-drain.9',
  'battleFlavor.null-life-drain.10',
] as const;

const DEATH_TOUCH_LOGS = [
  'battleFlavor.death-touch.1',
  'battleFlavor.death-touch.2',
  'battleFlavor.death-touch.3',
  'battleFlavor.death-touch.4',
  'battleFlavor.death-touch.5',
  'battleFlavor.death-touch.6',
  'battleFlavor.death-touch.7',
  'battleFlavor.death-touch.8',
  'battleFlavor.death-touch.9',
  'battleFlavor.death-touch.10',
] as const;

const NULL_DEATH_TOUCH_LOGS = [
  'battleFlavor.null-death-touch.1',
  'battleFlavor.null-death-touch.2',
  'battleFlavor.null-death-touch.3',
  'battleFlavor.null-death-touch.4',
  'battleFlavor.null-death-touch.5',
  'battleFlavor.null-death-touch.6',
  'battleFlavor.null-death-touch.7',
  'battleFlavor.null-death-touch.8',
  'battleFlavor.null-death-touch.9',
  'battleFlavor.null-death-touch.10',
] as const;

const BURN_LOGS = [
  'battleFlavor.burn.1',
  'battleFlavor.burn.2',
  'battleFlavor.burn.3',
  'battleFlavor.burn.4',
  'battleFlavor.burn.5',
  'battleFlavor.burn.6',
  'battleFlavor.burn.7',
  'battleFlavor.burn.8',
  'battleFlavor.burn.9',
  'battleFlavor.burn.10',
] as const;

const NULL_BURN_LOGS = [
  'battleFlavor.null-burn.1',
  'battleFlavor.null-burn.2',
  'battleFlavor.null-burn.3',
  'battleFlavor.null-burn.4',
  'battleFlavor.null-burn.5',
  'battleFlavor.null-burn.6',
  'battleFlavor.null-burn.7',
  'battleFlavor.null-burn.8',
  'battleFlavor.null-burn.9',
  'battleFlavor.null-burn.10',
] as const;

const BIND_LOGS = [
  'battleFlavor.bind.1',
  'battleFlavor.bind.2',
  'battleFlavor.bind.3',
  'battleFlavor.bind.4',
  'battleFlavor.bind.5',
  'battleFlavor.bind.6',
  'battleFlavor.bind.7',
  'battleFlavor.bind.8',
  'battleFlavor.bind.9',
  'battleFlavor.bind.10',
] as const;

const NULL_BIND_LOGS = [
  'battleFlavor.null-bind.1',
  'battleFlavor.null-bind.2',
  'battleFlavor.null-bind.3',
  'battleFlavor.null-bind.4',
  'battleFlavor.null-bind.5',
  'battleFlavor.null-bind.6',
  'battleFlavor.null-bind.7',
  'battleFlavor.null-bind.8',
  'battleFlavor.null-bind.9',
  'battleFlavor.null-bind.10',
] as const;

const INCAPACITATED_LOGS = [
  'battleFlavor.incapacitated.1',
  'battleFlavor.incapacitated.2',
  'battleFlavor.incapacitated.3',
  'battleFlavor.incapacitated.4',
  'battleFlavor.incapacitated.5',
  'battleFlavor.incapacitated.6',
  'battleFlavor.incapacitated.7',
  'battleFlavor.incapacitated.8',
  'battleFlavor.incapacitated.9',
  'battleFlavor.incapacitated.10',
] as const;

const RESURRECT_LOGS = [
  'battleFlavor.resurrect.1',
  'battleFlavor.resurrect.2',
  'battleFlavor.resurrect.3',
  'battleFlavor.resurrect.4',
  'battleFlavor.resurrect.5',
  'battleFlavor.resurrect.6',
  'battleFlavor.resurrect.7',
  'battleFlavor.resurrect.8',
  'battleFlavor.resurrect.9',
  'battleFlavor.resurrect.10',
] as const;

const REANIMATE_LOGS = [
  'battleFlavor.reanimate.1',
  'battleFlavor.reanimate.2',
  'battleFlavor.reanimate.3',
  'battleFlavor.reanimate.4',
  'battleFlavor.reanimate.5',
  'battleFlavor.reanimate.6',
  'battleFlavor.reanimate.7',
  'battleFlavor.reanimate.8',
  'battleFlavor.reanimate.9',
  'battleFlavor.reanimate.10',
] as const;

const REQUIEM_LOGS = [
  'battleFlavor.requiem.1',
  'battleFlavor.requiem.2',
  'battleFlavor.requiem.3',
  'battleFlavor.requiem.4',
  'battleFlavor.requiem.5',
  'battleFlavor.requiem.6',
  'battleFlavor.requiem.7',
  'battleFlavor.requiem.8',
  'battleFlavor.requiem.9',
  'battleFlavor.requiem.10',
] as const;

const NULL_REQUIEM_LOGS = [
  'battleFlavor.null-requiem.1',
  'battleFlavor.null-requiem.2',
  'battleFlavor.null-requiem.3',
  'battleFlavor.null-requiem.4',
  'battleFlavor.null-requiem.5',
  'battleFlavor.null-requiem.6',
  'battleFlavor.null-requiem.7',
  'battleFlavor.null-requiem.8',
  'battleFlavor.null-requiem.9',
  'battleFlavor.null-requiem.10',
] as const;

const NULL_ANTAGONISM_LOGS = [
  'battleFlavor.null-antagonism.1',
  'battleFlavor.null-antagonism.2',
  'battleFlavor.null-antagonism.3',
  'battleFlavor.null-antagonism.4',
  'battleFlavor.null-antagonism.5',
  'battleFlavor.null-antagonism.6',
  'battleFlavor.null-antagonism.7',
  'battleFlavor.null-antagonism.8',
  'battleFlavor.null-antagonism.9',
  'battleFlavor.null-antagonism.10',
] as const;

const EQUATION_BREAKER_LOGS = [
  'battleFlavor.equation-breaker.1',
  'battleFlavor.equation-breaker.2',
  'battleFlavor.equation-breaker.3',
  'battleFlavor.equation-breaker.4',
  'battleFlavor.equation-breaker.5',
  'battleFlavor.equation-breaker.6',
  'battleFlavor.equation-breaker.7',
  'battleFlavor.equation-breaker.8',
  'battleFlavor.equation-breaker.9',
  'battleFlavor.equation-breaker.10',
] as const;

// SpecRef: 6.2.2 | Terrain flavor text | log.unforgettable
const UNFORGETTABLE_LOGS = [
  'battleFlavor.unforgettable.1',
  'battleFlavor.unforgettable.2',
  'battleFlavor.unforgettable.3',
  'battleFlavor.unforgettable.4',
  'battleFlavor.unforgettable.5',
  'battleFlavor.unforgettable.6',
  'battleFlavor.unforgettable.7',
  'battleFlavor.unforgettable.8',
  'battleFlavor.unforgettable.9',
  'battleFlavor.unforgettable.10',
] as const;

export type BattleFlavorFamily =
  | 'confusion-success' | 'confusion-failure' | 'confusion-no-target'
  | 'antagonism-ranged' | 'antagonism-magical' | 'antagonism-melee'
  | 'unstable-core-ranged' | 'unstable-core-magical'
  | 'soul-reap' | 'regeneration' | 'self-destruct' | 'decompose' | 'free'
  | 'pursuit' | 'illusion' | 'illusion-breaker' | 'shock' | 'null-shock'
  | 'flying' | 'corrode' | 'null-corrode' | 'life-drain' | 'null-life-drain'
  | 'death-touch' | 'null-death-touch' | 'burn' | 'null-burn' | 'bind'
  | 'null-bind' | 'incapacitated' | 'resurrect' | 'reanimate' | 'requiem'
  | 'null-requiem' | 'null-antagonism' | 'equation-breaker' | 'unforgettable';

const INDEXED_BATTLE_FLAVORS: Record<BattleFlavorFamily, readonly string[]> = {
  'confusion-success': CONFUSION_SUCCESS_LOGS,
  'confusion-failure': CONFUSION_FAILURE_LOGS,
  'confusion-no-target': CONFUSION_NO_TARGET_LOGS,
  'antagonism-ranged': ANTAGONISM_LOGS.ranged,
  'antagonism-magical': ANTAGONISM_LOGS.magical,
  'antagonism-melee': ANTAGONISM_LOGS.melee,
  'unstable-core-ranged': UNSTABLE_CORE_LOGS.ranged,
  'unstable-core-magical': UNSTABLE_CORE_LOGS.magical,
  'soul-reap': SOUL_REAP_LOGS,
  'regeneration': REGENERATION_LOGS,
  'self-destruct': SELF_DESTRUCT_LOGS,
  'decompose': DECOMPOSE_LOGS,
  'free': FREE_LOGS,
  pursuit: PURSUIT_LOGS,
  illusion: ILLUSION_LOGS,
  'illusion-breaker': ILLUSION_BREAKER_LOGS,
  shock: SHOCK_LOGS,
  'null-shock': NULL_SHOCK_LOGS,
  flying: FLYING_LOGS,
  corrode: CORRODE_LOGS,
  'null-corrode': NULL_CORRODE_LOGS,
  'life-drain': LIFE_DRAIN_LOGS,
  'null-life-drain': NULL_LIFE_DRAIN_LOGS,
  'death-touch': DEATH_TOUCH_LOGS,
  'null-death-touch': NULL_DEATH_TOUCH_LOGS,
  burn: BURN_LOGS,
  'null-burn': NULL_BURN_LOGS,
  bind: BIND_LOGS,
  'null-bind': NULL_BIND_LOGS,
  incapacitated: INCAPACITATED_LOGS,
  resurrect: RESURRECT_LOGS,
  reanimate: REANIMATE_LOGS,
  requiem: REQUIEM_LOGS,
  'null-requiem': NULL_REQUIEM_LOGS,
  'null-antagonism': NULL_ANTAGONISM_LOGS,
  'equation-breaker': EQUATION_BREAKER_LOGS,
  unforgettable: UNFORGETTABLE_LOGS,
};

/** Deterministic flavor lookup for semantic-event narration. */
export function getBattleFlavorTemplateAtIndex(family: BattleFlavorFamily, index: number): string {
  const entries = INDEXED_BATTLE_FLAVORS[family];
  if (!Number.isInteger(index) || index < 0 || index >= entries.length) {
    throw new RangeError(`Invalid ${family} battle flavor index ${index}; expected 0 through ${entries.length - 1}`);
  }
  return t(entries[index]!);
}

const decomposeDefenseValueFormatter = new Intl.NumberFormat('ja-JP');
const battleNoteValueFormatter = new Intl.NumberFormat('ja-JP');

function pickRandomEntry<T>(entries: readonly T[]): T {
  return entries[Math.floor(Math.random() * entries.length)];
}

function pickRandomTranslatedEntry(entries: readonly string[]): string {
  return t(pickRandomEntry(entries));
}

export function buildConfusionAction(actorName: string, targetName: string, success: boolean): string {
  const template = pickRandomTranslatedEntry(success ? CONFUSION_SUCCESS_LOGS : CONFUSION_FAILURE_LOGS);
  return `${actorName}${template.split('target').join(targetName)}`;
}

export function buildAntagonismAction(
  phase: AttackType,
  actorName: string,
  targetName: string,
  spellName: string | null,
): string {
  const template = pickRandomTranslatedEntry(ANTAGONISM_LOGS[phase]);
  return template
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName)
    .replace(/\{spell\}/g, spellName ?? t('battleFlavor.inline.41'));
}

export function buildUnstableCoreAction(
  phase: Exclude<AttackType, 'melee'>,
  actorName: string,
): string {
  return pickRandomTranslatedEntry(UNSTABLE_CORE_LOGS[phase]).replace(/\{actor\}/g, actorName);
}

export function buildSoulReapAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(SOUL_REAP_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildRegenerationAction(actorName: string): string {
  return pickRandomTranslatedEntry(REGENERATION_LOGS).replace(/\{actor\}/g, actorName);
}

export function buildSelfDestructAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(SELF_DESTRUCT_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildDecomposeAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(DECOMPOSE_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildFreeAction(actorName: string): string {
  return pickRandomTranslatedEntry(FREE_LOGS).replace(/\{actor\}/g, actorName);
}

// SpecRef: 6.2.1 | Ability flavor text | log.pursuit
export function buildPursuitAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(PURSUIT_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

// SpecRef: 6.2.1 | Ability flavor text | log.illusion
export function buildIllusionAction(targetName: string): string {
  return pickRandomTranslatedEntry(ILLUSION_LOGS).replace(/\{target\}/g, targetName);
}

// SpecRef: 6.2.1 | Ability flavor text | log.illusion-breaker
export function buildIllusionBreakerAction(actorName: string): string {
  return pickRandomTranslatedEntry(ILLUSION_BREAKER_LOGS).replace(/\{actor\}/g, actorName);
}

export function buildShockAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(SHOCK_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

// SpecRef: 6.2.2 | Terrain flavor text | log.null-shock
export function buildNullShockAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(NULL_SHOCK_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildFlyingAction(actorName: string): string {
  return pickRandomTranslatedEntry(FLYING_LOGS).replace(/\{actor\}/g, actorName);
}

export function buildCorrodeAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(CORRODE_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildNullCorrodeAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(NULL_CORRODE_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildLifeDrainAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(LIFE_DRAIN_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildNullLifeDrainAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(NULL_LIFE_DRAIN_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildAggregatedLifeDrainAction(
  actorName: string,
  aggregatedTargetName: string,
  isNullified: boolean,
): string {
  const template = t(isNullified ? NULL_LIFE_DRAIN_LOGS[0] : LIFE_DRAIN_LOGS[0]);
  return template
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, aggregatedTargetName);
}

export function buildDeathTouchAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(DEATH_TOUCH_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildNullDeathTouchAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(NULL_DEATH_TOUCH_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildBurnAction(actorName: string): string {
  return pickRandomTranslatedEntry(BURN_LOGS).replace(/\{actor\}/g, actorName);
}

export function buildNullBurnAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(NULL_BURN_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildBindAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(BIND_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildNullBindAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(NULL_BIND_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildIncapacitatedAction(actorName: string): string {
  return pickRandomTranslatedEntry(INCAPACITATED_LOGS).replace(/\{actor\}/g, actorName);
}

export function buildResurrectAction(actorName: string): string {
  return pickRandomTranslatedEntry(RESURRECT_LOGS).replace(/\{actor\}/g, actorName);
}

export function buildReanimateAction(actorName: string): string {
  return pickRandomTranslatedEntry(REANIMATE_LOGS).replace(/\{actor\}/g, actorName);
}

// SpecRef: 6.2.2 | Terrain flavor text | log.requiem
export function buildRequiemAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(REQUIEM_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildNullRequiemAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(NULL_REQUIEM_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

// SpecRef: 6.2.2 | Terrain flavor text | log.null-antagonism
export function buildNullAntagonismAction(actorName: string): string {
  return pickRandomTranslatedEntry(NULL_ANTAGONISM_LOGS).replace(/\{actor\}/g, actorName);
}

// SpecRef: 6.2.2 | Terrain flavor text | log.equation-breaker
export function buildEquationBreakerAction(actorName: string): string {
  return pickRandomTranslatedEntry(EQUATION_BREAKER_LOGS).replace(/\{actor\}/g, actorName);
}

// SpecRef: 6.2.2 | Terrain flavor text | log.unforgettable
export function buildUnforgettableAction(actorName: string, targetName: string): string {
  return pickRandomTranslatedEntry(UNFORGETTABLE_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function getConfusionNoTargetLog(actorName: string): Pick<BattleLogEntry, 'action' | 'note'> {
  const action = pickRandomTranslatedEntry(CONFUSION_NO_TARGET_LOGS);
  return {
    action: `${actorName}${action}`,
    note: t('battleFlavor.inline.42'),
  };
}

export function formatRegenerationNote(healAmount: number): string {
  return `(✚ ${healAmount})`;
}

export function formatDefeatRecoveryNote(label: string, healAmount: number): string {
  return `(${label} ✚${battleNoteValueFormatter.format(healAmount)})`;
}

export function formatDecomposeNote(targetName: string, previousDefense: number, nextDefense: number): string {
  return t('battleLog.note.decomposeDefense', { target: targetName, previous: decomposeDefenseValueFormatter.format(Math.round(previousDefense)), next: decomposeDefenseValueFormatter.format(Math.round(nextDefense)) });
}
