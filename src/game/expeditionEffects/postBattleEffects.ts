import type { RoomType, TerrainEffectKey } from '../../types/index.ts';
import { createOrderedExpeditionPipeline } from '../events/orderedExpeditionPipeline.ts';

const FIRST_AID_LOG_COUNT = 10;
const TERRAIN_LOG_COUNT = 10;

export interface PostBattleEffectCharacter {
  readonly name: string;
  readonly firstAidLevel: number;
  readonly firstAidHpContribution: number;
  readonly thunderResistance: number;
}

export type PostBattleEffectNarrationFact =
  | { readonly type: 'deity-restoration'; readonly amount: number }
  | { readonly type: 'deity-attrition'; readonly amount: number }
  | { readonly type: 'first-aid'; readonly actorName: string; readonly amount: number; readonly flavorIndex: number }
  | { readonly type: 'terrain-rejuvenation'; readonly actorName: string; readonly amount: number; readonly flavorIndex: number }
  | { readonly type: 'terrain-abundant'; readonly amount: number; readonly flavorIndex: number }
  | { readonly type: 'terrain-rotwood'; readonly flavorIndex: number }
  | { readonly type: 'terrain-leakage'; readonly targetName: string; readonly amount: number; readonly flavorIndex: number }
  | { readonly type: 'terrain-heatwave'; readonly actorName: string; readonly amount: number; readonly flavorIndex: number }
  | { readonly type: 'terrain-decay'; readonly amount: number; readonly flavorIndex: number };

export interface ResolvePostBattleEffectsInput {
  readonly currentHp: number;
  readonly maxHp: number;
  readonly floorNumber: number;
  readonly roomInFloor: number;
  readonly roomType: RoomType;
  readonly terrainEffect?: TerrainEffectKey;
  readonly deityKey: string | null;
  readonly deityRank: number;
  readonly partyName: string;
  readonly characters: readonly PostBattleEffectCharacter[];
  readonly isFinalBossRoom: boolean;
  readonly random: () => number;
}

export interface PostBattleEffectsResult {
  readonly preContinuationHp: number;
  readonly finalHp: number;
  readonly shouldRetreat: boolean;
  readonly deityHealAmount?: number;
  readonly deityAttritionAmount?: number;
  readonly preContinuationFacts: readonly PostBattleEffectNarrationFact[];
  readonly continuationFacts: readonly PostBattleEffectNarrationFact[];
}

type PostBattleEvent = 'post-battle:effects' | 'post-battle:continuation';

interface PostBattlePipelineState {
  readonly hp: number;
  readonly deityHealAmount?: number;
  readonly deityAttritionAmount?: number;
  readonly facts: readonly PostBattleEffectNarrationFact[];
}

function isNormalOrElite(roomType: RoomType): boolean {
  return roomType === 'battle_Normal' || roomType === 'battle_Elite';
}

function isQualifyingElite(input: ResolvePostBattleEffectsInput): boolean {
  return input.floorNumber >= 1
    && input.floorNumber <= 5
    && input.roomInFloor === 4
    && input.roomType === 'battle_Elite';
}

function drawFlavorIndex(random: () => number, count: number): number {
  return Math.floor(random() * count) + 1;
}

function drawCharacter(
  random: () => number,
  characters: readonly PostBattleEffectCharacter[],
  fallbackName: string,
): PostBattleEffectCharacter | { name: string; thunderResistance: number } {
  const selected = characters[Math.floor(random() * characters.length)];
  return selected ?? { name: fallbackName, thunderResistance: 1 };
}

function appendFact(
  state: Readonly<PostBattlePipelineState>,
  fact: PostBattleEffectNarrationFact,
): readonly PostBattleEffectNarrationFact[] {
  return [...state.facts, fact];
}

const postBattlePipeline = createOrderedExpeditionPipeline<
  PostBattleEvent,
  PostBattlePipelineState,
  ResolvePostBattleEffectsInput
>([
  {
    id: 'core:post-battle-deity',
    event: 'post-battle:effects',
    priority: 10,
    sourceOrder: 0,
    apply(state, input) {
      if (!isQualifyingElite(input) || input.terrainEffect === 'terrain.gehenna') return state;
      if (input.deityKey === 'Goddess of Restoration' && input.terrainEffect !== 'terrain.rotwood') {
        const healAmount = Math.floor((input.maxHp - state.hp) * (0.2 + 0.001 * input.deityRank));
        const hp = Math.min(input.maxHp, state.hp + healAmount);
        if (healAmount <= 0) return { ...state, hp };
        return {
          ...state,
          hp,
          deityHealAmount: healAmount,
          facts: appendFact(state, { type: 'deity-restoration', amount: healAmount }),
        };
      }
      if (input.deityKey !== 'God of Attrition') return state;
      const hp = Math.max(1, Math.floor(state.hp * 0.95));
      const attritionAmount = Math.max(0, state.hp - hp);
      if (attritionAmount <= 0) return { ...state, hp };
      return {
        ...state,
        hp,
        deityAttritionAmount: attritionAmount,
        facts: appendFact(state, { type: 'deity-attrition', amount: attritionAmount }),
      };
    },
  },
  {
    id: 'core:first_aid',
    event: 'post-battle:effects',
    priority: 20,
    sourceOrder: 0,
    apply(state, input) {
      if (!isQualifyingElite(input)) return state;
      let hp = state.hp;
      let facts = state.facts;
      for (const character of input.characters) {
        if (character.firstAidLevel <= 0) continue;
        const healRate = character.firstAidLevel >= 5 ? 0.06
          : character.firstAidLevel === 4 ? 0.05
            : character.firstAidLevel === 3 ? 0.04
              : character.firstAidLevel === 2 ? 0.03
                : 0.02;
        const healAmount = Math.floor(character.firstAidHpContribution * healRate);
        if (healAmount <= 0) continue;
        facts = [...facts, {
          type: 'first-aid',
          actorName: character.name,
          amount: healAmount,
          flavorIndex: drawFlavorIndex(input.random, FIRST_AID_LOG_COUNT),
        }];
        hp = Math.min(input.maxHp, hp + healAmount);
      }
      return { ...state, hp, facts };
    },
  },
  {
    id: 'core:terrain.rejuvenation',
    event: 'post-battle:effects',
    priority: 30,
    sourceOrder: 0,
    apply(state, input) {
      const actor = drawCharacter(input.random, input.characters, input.partyName);
      if (input.terrainEffect !== 'terrain.rejuvenation' || !isNormalOrElite(input.roomType)) return state;
      const missingHp = Math.max(0, input.maxHp - state.hp);
      const healAmount = missingHp > 0 ? Math.max(1, Math.floor(missingHp * 0.02)) : 0;
      if (healAmount <= 0) return state;
      return {
        ...state,
        hp: Math.min(input.maxHp, state.hp + healAmount),
        facts: appendFact(state, {
          type: 'terrain-rejuvenation',
          actorName: actor.name,
          amount: healAmount,
          flavorIndex: drawFlavorIndex(input.random, TERRAIN_LOG_COUNT),
        }),
      };
    },
  },
  {
    id: 'core:terrain.abundant',
    event: 'post-battle:effects',
    priority: 40,
    sourceOrder: 0,
    apply(state, input) {
      if (input.terrainEffect !== 'terrain.abundant' || !isNormalOrElite(input.roomType)) return state;
      const healAmount = Math.floor(input.maxHp * 0.02);
      if (healAmount <= 0) return state;
      return {
        ...state,
        hp: Math.min(input.maxHp, state.hp + healAmount),
        facts: appendFact(state, {
          type: 'terrain-abundant',
          amount: healAmount,
          flavorIndex: drawFlavorIndex(input.random, TERRAIN_LOG_COUNT),
        }),
      };
    },
  },
  {
    id: 'core:terrain.rotwood',
    event: 'post-battle:effects',
    priority: 50,
    sourceOrder: 0,
    apply(state, input) {
      if (input.floorNumber < 1
        || input.floorNumber > 5
        || input.roomInFloor !== 4
        || !isNormalOrElite(input.roomType)
        || input.terrainEffect !== 'terrain.rotwood'
        || input.deityKey !== 'Goddess of Restoration') return state;
      return {
        ...state,
        facts: appendFact(state, {
          type: 'terrain-rotwood',
          flavorIndex: drawFlavorIndex(input.random, TERRAIN_LOG_COUNT),
        }),
      };
    },
  },
  {
    id: 'core:terrain.leakage',
    event: 'post-battle:effects',
    priority: 60,
    sourceOrder: 0,
    apply(state, input) {
      const target = drawCharacter(input.random, input.characters, input.partyName);
      if (input.terrainEffect !== 'terrain.leakage' || !isNormalOrElite(input.roomType)) return state;
      const damageAmount = Math.floor(Math.max(0, state.hp) * 0.03 * target.thunderResistance);
      if (damageAmount <= 0) return state;
      return {
        ...state,
        hp: Math.max(1, state.hp - damageAmount),
        facts: appendFact(state, {
          type: 'terrain-leakage',
          targetName: target.name,
          amount: damageAmount,
          flavorIndex: drawFlavorIndex(input.random, TERRAIN_LOG_COUNT),
        }),
      };
    },
  },
  {
    id: 'core:terrain.heatwave',
    event: 'post-battle:effects',
    priority: 70,
    sourceOrder: 0,
    apply(state, input) {
      const actor = drawCharacter(input.random, input.characters, input.partyName);
      if (input.terrainEffect !== 'terrain.heatwave'
        || (!isNormalOrElite(input.roomType) && input.roomType !== 'battle_Boss')) return state;
      const damageAmount = Math.floor(Math.max(0, state.hp) * 0.05);
      if (damageAmount <= 0) return state;
      return {
        ...state,
        hp: Math.max(1, state.hp - damageAmount),
        facts: appendFact(state, {
          type: 'terrain-heatwave',
          actorName: actor.name,
          amount: damageAmount,
          flavorIndex: drawFlavorIndex(input.random, TERRAIN_LOG_COUNT),
        }),
      };
    },
  },
  {
    id: 'core:terrain.decay',
    event: 'post-battle:continuation',
    priority: 10,
    sourceOrder: 0,
    apply(state, input) {
      if (input.terrainEffect !== 'terrain.decay' || !isNormalOrElite(input.roomType)) return state;
      const damageAmount = Math.floor(input.maxHp * 0.02);
      if (damageAmount <= 0) return state;
      return {
        ...state,
        hp: Math.max(1, state.hp - damageAmount),
        facts: appendFact(state, {
          type: 'terrain-decay',
          amount: damageAmount,
          flavorIndex: drawFlavorIndex(input.random, TERRAIN_LOG_COUNT),
        }),
      };
    },
  },
]);

export const POST_BATTLE_EFFECT_HANDLER_ORDER = Object.freeze({
  effects: postBattlePipeline.handlerIdsFor('post-battle:effects'),
  continuation: postBattlePipeline.handlerIdsFor('post-battle:continuation'),
});

export function resolvePostBattleEffects(input: ResolvePostBattleEffectsInput): PostBattleEffectsResult {
  const preContinuation = postBattlePipeline.run('post-battle:effects', {
    hp: input.currentHp,
    facts: [],
  }, input);
  const preContinuationHp = preContinuation.hp;
  const shouldRetreat = !input.isFinalBossRoom && preContinuationHp <= input.maxHp * 0.3;
  const continuation = shouldRetreat
    ? { hp: preContinuationHp, facts: [] }
    : postBattlePipeline.run('post-battle:continuation', {
      hp: preContinuationHp,
      facts: [],
    }, input);

  return Object.freeze({
    preContinuationHp,
    finalHp: continuation.hp,
    shouldRetreat,
    ...(preContinuation.deityHealAmount ? { deityHealAmount: preContinuation.deityHealAmount } : {}),
    ...(preContinuation.deityAttritionAmount ? { deityAttritionAmount: preContinuation.deityAttritionAmount } : {}),
    preContinuationFacts: Object.freeze(preContinuation.facts),
    continuationFacts: Object.freeze(continuation.facts),
  });
}
