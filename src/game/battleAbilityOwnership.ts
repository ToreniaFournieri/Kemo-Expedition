import type { AbilityId } from '../types/index.ts';

export type BattleAbilityOwnership =
  | 'start_setup'
  | 'normal_action'
  | 'timed_trigger'
  | 'reactive_chain'
  | 'defeat_recovery'
  | 'inert_metadata';

const classified = <T extends readonly AbilityId[]>(...ids: T): T => ids;

export const BATTLE_ABILITY_OWNERSHIP_IDS = {
  start_setup: classified(
    'first_strike', 'oblivion', 'fading_memory', 'mimic', 'frostbite', 'slow', 'boost',
    'equation_breaker', 'domain_breaker', 'wind_rider', 'coldproof', 'defiance', 'unforgettable',
  ),
  normal_action: classified(
    'defender', 'iaigiri', 'heavy_strike', 'command', 'resonance', 'm_barrier', 'deflection',
    'true_sight', 'output_stabilizer', 'rage', 'momentum', 'bulwark', 'arcane_stability',
    'arc_magic', 'gravity_well', 'armor_break', 'mana_break', 'focus', 'stealth', 'illusion',
    'ice_absorb', 'fire_absorb', 'thunder_absorb', 'magical_absorb',
    'ice_null', 'fire_null', 'thunder_null', 'magical_null', 'ranged_null', 'melee_null',
    'ice_reflect', 'fire_reflect', 'thunder_reflect', 'magical_reflect', 'ranged_reflect', 'melee_reflect',
    'mutual_magic_amplify', 'mutual_magic_restraint', 'mutual_physical_amplify', 'mutual_physical_restraint',
    'magic_seal', 'no_offense', 'swarm', 'ambush', 'overwatch', 'execution', 'anti_ambush',
    'anti_overwatch', 'rage_breaker', 'momentum_breaker', 'execution_null', 'null_antagonism',
    'siege', 'dryproof', 'vine_cutter', 'mana_ward', 'fire_protect_breaker', 'ice_protect_breaker',
    'thunder_protect_breaker', 'm_barrier_breaker', 'illusion_breaker', 'bulwark_breaker',
  ),
  timed_trigger: classified(
    'howl', 'ranged_confusion', 'magic_confusion', 'melee_confusion', 'unstable_core', 'soul_reap',
    'regeneration', 'predator_sense', 'decompose', 'self_destruct', 'free', 'first_aid', 'flying',
    'pursuit',
  ),
  reactive_chain: classified(
    'counter', 're_attack', 'null_counter', 're_counter', 'covering_fire', 'magical_counter',
    'requiem', 'null_requiem', 'shock', 'null_shock', 'corrode', 'null_corrode',
    'life_drain', 'null_life_drain', 'death_touch', 'null_death_touch', 'burn', 'null_burn',
    'bind', 'null_bind',
  ),
  defeat_recovery: classified('resurrect', 'reanimate'),
  inert_metadata: classified(
    'squander', 'hunter', 'tithe', 'seeker', 'cunning', 'cyborgization', 'peddler', 'composure',
    'melee_conversion', 'prophecy', 'base_status_cap_at_15', 'auriferous',
    'colossal', 'upgrade_all_abilities', 'unlock',
  ),
} as const satisfies Record<BattleAbilityOwnership, readonly AbilityId[]>;

export const BATTLE_ABILITY_OWNERSHIP = Object.fromEntries(
  Object.entries(BATTLE_ABILITY_OWNERSHIP_IDS).flatMap(([ownership, ids]) =>
    ids.map((id) => [id, ownership as BattleAbilityOwnership]),
  ),
) as Record<AbilityId, BattleAbilityOwnership>;
