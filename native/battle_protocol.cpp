#include "generated/battle_protocol.generated.h"
#include "battle_state.h"

namespace protocol = bokemo::battle_protocol;
using u8 = unsigned char;
using u16 = unsigned short;
using u32 = unsigned int;
using u64 = unsigned long long;
using i32 = int;

namespace {
alignas(8) unsigned char input_arena[protocol::kArenaCapacity];
alignas(8) unsigned char output_arena[protocol::kArenaCapacity];

#pragma pack(push, 1)
struct InputHeader {
  u32 magic;
  u16 version;
  u16 header_size;
  u32 total_size;
  u32 flags;
  u16 terrain_id;
  u16 combatant_count;
  u32 ability_count;
  u32 random_count;
  u32 combatants_offset;
  u32 abilities_offset;
  u32 random_offset;
  u32 physical_bag_count;
  u32 physical_bag_offset;
  u32 magical_bag_count;
  u32 magical_bag_offset;
  double party_hp;
  double enemy_hp;
  u32 seed_low;
  u32 seed_high;
  u16 deity_id;
  u16 rng_version;
  u32 engine_flags;
  u32 reserved0;
  u32 reserved1;
  double party_max_hp;
  double enemy_max_hp;
};

struct CombatantRecord {
  u32 id;
  u8 kind;
  u8 row;
  u8 elemental_offense;
  u8 flags;
  double hp;
  double max_hp;
  double ranged_attack;
  double magical_attack;
  double melee_attack;
  double ranged_noa;
  double magical_noa;
  double melee_noa;
  double physical_defense;
  double magical_defense;
  double accuracy_bonus;
  double evasion_bonus;
  double elemental_offense_value;
  u32 ability_start;
  u16 ability_count;
  u8 magic_style;
  u8 reserved0;
  double original_ranged_noa;
  double original_magical_noa;
  double original_melee_noa;
  double ranged_accuracy_potency;
  double magical_accuracy_potency;
  double melee_accuracy_potency;
  double physical_penetration;
  double magical_penetration;
  double fire_resistance;
  double thunder_resistance;
  double ice_resistance;
  double physical_offense_amplifier;
  double magical_offense_amplifier;
  double physical_defense_amplifier;
  double magical_defense_amplifier;
  double start_phase_bonus;
  double combat_phase_bonus;
  double end_phase_bonus;
  double deity_offense_bonus;
  double deity_physical_defense_bonus;
  double deity_magical_defense_bonus;
  double deity_accuracy_bonus;
  double enemy_ranged_amplifier;
  double enemy_magical_amplifier;
  double enemy_melee_amplifier;
  double ranged_attack_bonus;
  double magical_attack_bonus;
  double melee_attack_bonus;
  u8 reserved[8];
};

struct AbilityRecord {
  u16 id;
  u8 level;
  u8 flags;
  u32 owner_id;
};

struct BagRecord {
  i32 id;
  u32 tickets;
};

struct OutputHeader {
  u32 magic;
  u16 version;
  u16 header_size;
  u32 total_size;
  u32 flags;
  u8 outcome;
  u8 reserved[3];
  u32 event_count;
  u32 events_offset;
  u32 physical_bag_count;
  u32 physical_bag_offset;
  u32 magical_bag_count;
  u32 magical_bag_offset;
  u32 random_consumed;
  u32 enemy_hits_received;
  u32 rng_version;
  double party_hp;
  double enemy_hp;
  u32 seed_low;
  u32 seed_high;
  u32 diagnostic_draw_count;
  u32 protocol_error;
  u32 reserved0;
  u32 reserved1;
};

struct EventRecord {
  u16 opcode;
  u8 phase;
  u8 actor_kind;
  u32 actor_id;
  u32 target_id;
  u16 ability_id;
  u8 attack_type;
  u8 flags;
  i32 timing;
  u32 hits;
  u32 attempts;
  u32 aux0;
  double value0;
  double value1;
  double value2;
  u32 aux1;
  u32 aux2;
};
#pragma pack(pop)

static_assert(sizeof(InputHeader) == protocol::kInputHeaderSize);
static_assert(sizeof(CombatantRecord) == protocol::kCombatantRecordSize);
static_assert(sizeof(AbilityRecord) == protocol::kAbilityRecordSize);
static_assert(sizeof(BagRecord) == protocol::kBagRecordSize);
static_assert(sizeof(OutputHeader) == protocol::kOutputHeaderSize);
static_assert(sizeof(EventRecord) == protocol::kEventRecordSize);

bool span_is_valid(u32 offset, u32 count, u32 record_size, u32 total_size) {
  const u64 end = static_cast<u64>(offset) + static_cast<u64>(count) * record_size;
  return offset >= protocol::kInputHeaderSize && end <= total_size;
}

bool finite(double value) { return __builtin_isfinite(value); }

bool combatant_numbers_are_valid(const CombatantRecord& value) {
  const double numbers[] = {
    value.hp, value.max_hp, value.ranged_attack, value.magical_attack, value.melee_attack,
    value.ranged_noa, value.magical_noa, value.melee_noa, value.physical_defense,
    value.magical_defense, value.accuracy_bonus, value.evasion_bonus, value.elemental_offense_value,
    value.original_ranged_noa, value.original_magical_noa, value.original_melee_noa,
    value.ranged_accuracy_potency, value.magical_accuracy_potency, value.melee_accuracy_potency,
    value.physical_penetration, value.magical_penetration, value.fire_resistance,
    value.thunder_resistance, value.ice_resistance, value.physical_offense_amplifier,
    value.magical_offense_amplifier, value.physical_defense_amplifier,
    value.magical_defense_amplifier, value.start_phase_bonus, value.combat_phase_bonus,
    value.end_phase_bonus, value.deity_offense_bonus, value.deity_physical_defense_bonus,
    value.deity_magical_defense_bonus, value.deity_accuracy_bonus, value.enemy_ranged_amplifier,
    value.enemy_magical_amplifier, value.enemy_melee_amplifier, value.ranged_attack_bonus,
    value.magical_attack_bonus, value.melee_attack_bonus,
  };
  for (double number : numbers) if (!finite(number)) return false;
  return value.hp >= 0.0 && value.max_hp >= 0.0 && value.hp <= value.max_hp;
}

constexpr u32 kInputFlagFertilityInitiative = 1u << 0;
constexpr u32 kInputFlagAbilitiesPrepared = 1u << 1;

enum class AbilityOwnership : u8 { Unclassified, StartSetup, NormalAction, TimedTrigger, ReactiveChain, DefeatRecovery, InertMetadata };

AbilityOwnership ability_ownership(protocol::AbilityId id) {
  switch (id) {
    case protocol::AbilityId::FirstStrike: case protocol::AbilityId::Oblivion:
    case protocol::AbilityId::FadingMemory: case protocol::AbilityId::Mimic:
    case protocol::AbilityId::Frostbite: case protocol::AbilityId::Slow:
    case protocol::AbilityId::Boost: case protocol::AbilityId::EquationBreaker:
    case protocol::AbilityId::DomainBreaker: case protocol::AbilityId::WindRider:
    case protocol::AbilityId::Coldproof: case protocol::AbilityId::Defiance:
    case protocol::AbilityId::Unforgettable:
      return AbilityOwnership::StartSetup;
    case protocol::AbilityId::Defender: case protocol::AbilityId::Iaigiri:
    case protocol::AbilityId::HeavyStrike: case protocol::AbilityId::Command:
    case protocol::AbilityId::Resonance: case protocol::AbilityId::MBarrier:
    case protocol::AbilityId::Deflection: case protocol::AbilityId::TrueSight:
    case protocol::AbilityId::OutputStabilizer: case protocol::AbilityId::Rage:
    case protocol::AbilityId::Momentum: case protocol::AbilityId::Bulwark:
    case protocol::AbilityId::ArcaneStability: case protocol::AbilityId::ArcMagic:
    case protocol::AbilityId::GravityWell: case protocol::AbilityId::ArmorBreak:
    case protocol::AbilityId::ManaBreak: case protocol::AbilityId::Focus:
    case protocol::AbilityId::Stealth: case protocol::AbilityId::Illusion:
    case protocol::AbilityId::IceAbsorb: case protocol::AbilityId::FireAbsorb:
    case protocol::AbilityId::ThunderAbsorb: case protocol::AbilityId::MagicalAbsorb:
    case protocol::AbilityId::IceNull: case protocol::AbilityId::FireNull:
    case protocol::AbilityId::ThunderNull: case protocol::AbilityId::MagicalNull:
    case protocol::AbilityId::RangedNull: case protocol::AbilityId::MeleeNull:
    case protocol::AbilityId::IceReflect: case protocol::AbilityId::FireReflect:
    case protocol::AbilityId::ThunderReflect: case protocol::AbilityId::MagicalReflect:
    case protocol::AbilityId::RangedReflect: case protocol::AbilityId::MeleeReflect:
    case protocol::AbilityId::MutualMagicAmplify: case protocol::AbilityId::MutualMagicRestraint:
    case protocol::AbilityId::MutualPhysicalAmplify: case protocol::AbilityId::MutualPhysicalRestraint:
    case protocol::AbilityId::MagicSeal: case protocol::AbilityId::NoOffense:
    case protocol::AbilityId::Swarm: case protocol::AbilityId::Ambush:
    case protocol::AbilityId::Overwatch: case protocol::AbilityId::Execution:
    case protocol::AbilityId::AntiAmbush: case protocol::AbilityId::AntiOverwatch:
    case protocol::AbilityId::RageBreaker: case protocol::AbilityId::MomentumBreaker:
    case protocol::AbilityId::ExecutionNull: case protocol::AbilityId::NullAntagonism:
    case protocol::AbilityId::Siege: case protocol::AbilityId::Dryproof:
    case protocol::AbilityId::VineCutter: case protocol::AbilityId::ManaWard:
    case protocol::AbilityId::FireProtectBreaker: case protocol::AbilityId::IceProtectBreaker:
    case protocol::AbilityId::ThunderProtectBreaker: case protocol::AbilityId::MBarrierBreaker:
    case protocol::AbilityId::IllusionBreaker: case protocol::AbilityId::BulwarkBreaker:
      return AbilityOwnership::NormalAction;
    case protocol::AbilityId::Howl: case protocol::AbilityId::RangedConfusion:
    case protocol::AbilityId::MagicConfusion: case protocol::AbilityId::MeleeConfusion:
    case protocol::AbilityId::UnstableCore: case protocol::AbilityId::SoulReap:
    case protocol::AbilityId::Regeneration: case protocol::AbilityId::PredatorSense:
    case protocol::AbilityId::Decompose: case protocol::AbilityId::SelfDestruct:
    case protocol::AbilityId::Free: case protocol::AbilityId::FirstAid:
    case protocol::AbilityId::Flying: case protocol::AbilityId::Pursuit:
      return AbilityOwnership::TimedTrigger;
    case protocol::AbilityId::Counter: case protocol::AbilityId::ReAttack:
    case protocol::AbilityId::NullCounter: case protocol::AbilityId::ReCounter:
    case protocol::AbilityId::CoveringFire: case protocol::AbilityId::MagicalCounter:
    case protocol::AbilityId::Requiem: case protocol::AbilityId::NullRequiem:
    case protocol::AbilityId::Shock: case protocol::AbilityId::NullShock:
    case protocol::AbilityId::Corrode: case protocol::AbilityId::NullCorrode:
    case protocol::AbilityId::LifeDrain: case protocol::AbilityId::NullLifeDrain:
    case protocol::AbilityId::DeathTouch: case protocol::AbilityId::NullDeathTouch:
    case protocol::AbilityId::Burn: case protocol::AbilityId::NullBurn:
    case protocol::AbilityId::Bind: case protocol::AbilityId::NullBind:
      return AbilityOwnership::ReactiveChain;
    case protocol::AbilityId::Resurrect: case protocol::AbilityId::Reanimate:
      return AbilityOwnership::DefeatRecovery;
    case protocol::AbilityId::Squander: case protocol::AbilityId::Hunter:
    case protocol::AbilityId::Tithe: case protocol::AbilityId::Seeker:
    case protocol::AbilityId::Cunning: case protocol::AbilityId::Cyborgization:
    case protocol::AbilityId::Peddler: case protocol::AbilityId::Composure:
    case protocol::AbilityId::MeleeConversion: case protocol::AbilityId::Prophecy:
    case protocol::AbilityId::BaseStatusCapAt15: case protocol::AbilityId::Auriferous:
    case protocol::AbilityId::Colossal: case protocol::AbilityId::UpgradeAllAbilities:
    case protocol::AbilityId::Unlock:
      return AbilityOwnership::InertMetadata;
    default: return AbilityOwnership::Unclassified;
  }
}

bool is_terrain_timed_or_reactive(protocol::AbilityId id) {
  switch (id) {
    case protocol::AbilityId::Resonance:
    case protocol::AbilityId::Ambush:
    case protocol::AbilityId::Overwatch:
    case protocol::AbilityId::Execution:
    case protocol::AbilityId::AntiAmbush:
    case protocol::AbilityId::AntiOverwatch:
    case protocol::AbilityId::RageBreaker:
    case protocol::AbilityId::MomentumBreaker:
    case protocol::AbilityId::ExecutionNull:
    case protocol::AbilityId::Rage:
    case protocol::AbilityId::Momentum:
    case protocol::AbilityId::NoOffense:
    case protocol::AbilityId::Swarm:
    case protocol::AbilityId::Stealth:
    case protocol::AbilityId::Illusion:
    case protocol::AbilityId::Bulwark:
    case protocol::AbilityId::Shock:
    case protocol::AbilityId::ReAttack:
    case protocol::AbilityId::Corrode:
    case protocol::AbilityId::LifeDrain:
    case protocol::AbilityId::DeathTouch:
    case protocol::AbilityId::Burn:
    case protocol::AbilityId::Bind:
    case protocol::AbilityId::Counter:
    case protocol::AbilityId::MagicalCounter:
    case protocol::AbilityId::Resurrect:
    case protocol::AbilityId::Reanimate:
    case protocol::AbilityId::Requiem:
    case protocol::AbilityId::ReCounter:
    case protocol::AbilityId::NullCounter:
    case protocol::AbilityId::CoveringFire:
    case protocol::AbilityId::Oblivion:
    case protocol::AbilityId::FadingMemory:
    case protocol::AbilityId::Mimic:
    case protocol::AbilityId::Defender:
    case protocol::AbilityId::Command:
    case protocol::AbilityId::MBarrier:
    case protocol::AbilityId::IceAbsorb:
    case protocol::AbilityId::FireAbsorb:
    case protocol::AbilityId::ThunderAbsorb:
    case protocol::AbilityId::MagicalAbsorb:
    case protocol::AbilityId::IceNull:
    case protocol::AbilityId::FireNull:
    case protocol::AbilityId::ThunderNull:
    case protocol::AbilityId::MagicalNull:
    case protocol::AbilityId::RangedNull:
    case protocol::AbilityId::MeleeNull:
    case protocol::AbilityId::IceReflect:
    case protocol::AbilityId::FireReflect:
    case protocol::AbilityId::ThunderReflect:
    case protocol::AbilityId::MagicalReflect:
    case protocol::AbilityId::RangedReflect:
    case protocol::AbilityId::MeleeReflect:
    case protocol::AbilityId::Deflection:
    case protocol::AbilityId::MagicSeal:
    case protocol::AbilityId::FirstStrike:
    case protocol::AbilityId::Slow:
    case protocol::AbilityId::Boost:
    case protocol::AbilityId::Frostbite:
    case protocol::AbilityId::Howl:
    case protocol::AbilityId::RangedConfusion:
    case protocol::AbilityId::MagicConfusion:
    case protocol::AbilityId::MeleeConfusion:
    case protocol::AbilityId::UnstableCore:
    case protocol::AbilityId::SoulReap:
    case protocol::AbilityId::Regeneration:
    case protocol::AbilityId::Flying:
    case protocol::AbilityId::PredatorSense:
    case protocol::AbilityId::Decompose:
    case protocol::AbilityId::SelfDestruct:
    case protocol::AbilityId::Free:
    case protocol::AbilityId::Auriferous:
    case protocol::AbilityId::FirstAid:
      return true;
    default:
      return false;
  }
}

u8 raw_ability_level(
    const CombatantRecord& combatant,
    const AbilityRecord* abilities,
    protocol::AbilityId id) {
  for (u32 index = combatant.ability_start; index < combatant.ability_start + combatant.ability_count; ++index) {
    if (abilities[index].id == static_cast<u16>(id)) return abilities[index].level;
  }
  return 0;
}

u8 prepared_ability_level(
    const InputHeader& input,
    const CombatantRecord& combatant,
    const AbilityRecord* abilities,
    protocol::AbilityId id) {
  const u8 level = raw_ability_level(combatant, abilities, id);
  if ((input.flags & kInputFlagAbilitiesPrepared) != 0 || level == 0 || !is_terrain_timed_or_reactive(id)) return level;
  if (input.terrain_id == static_cast<u16>(protocol::TerrainId::Transcendence)) {
    return level >= 5 ? 5 : level + 1;
  }
  if (input.terrain_id == static_cast<u16>(protocol::TerrainId::Suppression) &&
      raw_ability_level(combatant, abilities, protocol::AbilityId::Defiance) == 0) {
    return level <= 1 ? 1 : level - 1;
  }
  return level;
}

bool abilities_suppressed(
    const InputHeader& input,
    const CombatantRecord& combatant,
    const AbilityRecord* abilities) {
  return input.terrain_id == static_cast<u16>(protocol::TerrainId::SilenceField) &&
      prepared_ability_level(input, combatant, abilities, protocol::AbilityId::EquationBreaker) == 0 &&
      prepared_ability_level(input, combatant, abilities, protocol::AbilityId::DomainBreaker) == 0;
}

double combatant_attack(const CombatantRecord& combatant, u8 attack_type) {
  return attack_type == 1 ? combatant.ranged_attack
      : attack_type == 2 ? combatant.magical_attack : combatant.melee_attack;
}

double combatant_noa(const CombatantRecord& combatant, u8 attack_type) {
  return attack_type == 1 ? combatant.ranged_noa
      : attack_type == 2 ? combatant.magical_noa : combatant.melee_noa;
}

u32 initiative_dice_count(
    const InputHeader& input,
    const CombatantRecord& combatant,
    const AbilityRecord* abilities,
    u8 attack_type) {
  const bool machine_logic = input.terrain_id == static_cast<u16>(protocol::TerrainId::MachineLogic);
  const bool first_strike_enabled =
      (!machine_logic || prepared_ability_level(input, combatant, abilities, protocol::AbilityId::EquationBreaker) > 0) &&
      (input.terrain_id != static_cast<u16>(protocol::TerrainId::AshHaze) ||
       prepared_ability_level(input, combatant, abilities, protocol::AbilityId::TrueSight) > 0);
  const u8 first_strike = first_strike_enabled
      ? prepared_ability_level(input, combatant, abilities, protocol::AbilityId::FirstStrike)
      : 0;
  const u32 base_dice = attack_type == 1 ? 4 : attack_type == 2 ? 3 : 1;
  const u32 extra_dice = first_strike >= 3 ? 3 : first_strike;
  u32 terrain_dice = 0;
  if (!machine_logic && input.terrain_id == static_cast<u16>(protocol::TerrainId::Tailwind) && combatant.kind == 1) {
    terrain_dice = prepared_ability_level(input, combatant, abilities, protocol::AbilityId::WindRider) > 0 ? 2 : 1;
  }
  if (!machine_logic && input.terrain_id == static_cast<u16>(protocol::TerrainId::EnemyHighGround) && combatant.kind == 2) {
    terrain_dice = 1;
  }
  return base_dice + extra_dice + terrain_dice;
}

u32 count_initiative_randoms(
    const InputHeader& input,
    const CombatantRecord* combatants,
    const AbilityRecord* abilities) {
  u32 count = 0;
  for (u8 attack_type = 1; attack_type <= 3; ++attack_type) {
    for (u32 index = 0; index < input.combatant_count; ++index) {
      if (combatant_attack(combatants[index], attack_type) > 0 && combatant_noa(combatants[index], attack_type) > 0) {
        count += initiative_dice_count(input, combatants[index], abilities, attack_type);
      }
    }
  }
  return count;
}

void initialize_output(const InputHeader& input, OutputHeader* output, u32 event_count, u32 random_consumed) {
  *output = {};
  output->magic = protocol::kOutputMagic;
  output->version = protocol::kVersion;
  output->header_size = sizeof(OutputHeader);
  output->total_size = sizeof(OutputHeader) + event_count * sizeof(EventRecord);
  output->event_count = event_count;
  output->events_offset = sizeof(OutputHeader);
  output->random_consumed = random_consumed;
  output->party_hp = input.party_hp;
  output->enemy_hp = input.enemy_hp;
  output->rng_version = input.rng_version;
  output->seed_low = input.seed_low;
  output->seed_high = input.seed_high;
  output->diagnostic_draw_count = random_consumed;
}

int initialize_error_output(const InputHeader& input, protocol::ProtocolError error) {
  auto* output = reinterpret_cast<OutputHeader*>(output_arena);
  initialize_output(input, output, 0, 0);
  output->protocol_error = static_cast<u32>(error);
  return static_cast<int>(output->total_size);
}

int initialize_error_output_at_cursor(const InputHeader& input, protocol::ProtocolError error, u32 random_cursor) {
  auto* output = reinterpret_cast<OutputHeader*>(output_arena);
  initialize_output(input, output, 0, random_cursor);
  output->protocol_error = static_cast<u32>(error);
  return static_cast<int>(output->total_size);
}

bool initiative_event_precedes(const EventRecord& left, const EventRecord& right) {
  if (left.timing != right.timing) return left.timing > right.timing;
  if (left.attack_type != right.attack_type) return left.attack_type < right.attack_type;
  if (left.actor_kind != right.actor_kind) return left.actor_kind == 2;
  if (left.actor_kind == 2) return left.aux1 < right.aux1;
  const bool left_front = left.aux2 <= 3;
  const bool right_front = right.aux2 <= 3;
  if (left_front != right_front) return left_front;
  if (left.aux2 != right.aux2) return left.aux2 < right.aux2;
  return left.aux1 < right.aux1;
}

using bokemo::battle_state::BattleStateCore;
using bokemo::battle_state::CombatantState;
using bokemo::battle_state::MutableAbility;
using bokemo::battle_state::NormalActionEntry;
using bokemo::battle_state::Side;

extern "C" double battle_calculate_per_hit_damage(
    double, double, double, double, double, double, double, double,
    double, double, double, double, double, double, double);
extern "C" double battle_hit_chance(double, double, double, int, int, int, int, int, int);
extern "C" double battle_apply_domain_damage_override(double, int, double, int);

int active_ability_level(const CombatantState& combatant, protocol::AbilityId id) {
  for (int index = 0; index < combatant.ability_count; ++index) {
    const auto& ability = combatant.abilities[index];
    if (ability.id == static_cast<u32>(id) && !ability.removed && ability.level > 0) return ability.level;
  }
  return 0;
}

bool state_abilities_suppressed(const InputHeader& input, const CombatantState& combatant) {
  return input.terrain_id == static_cast<u16>(protocol::TerrainId::SilenceField) &&
      active_ability_level(combatant, protocol::AbilityId::EquationBreaker) == 0 &&
      active_ability_level(combatant, protocol::AbilityId::DomainBreaker) == 0;
}

bool emit_state_event(
    BattleStateCore& state, protocol::EventOpcode opcode, u32 phase, u32 actor, u32 target,
    u32 ability, u32 attack_type, int timing, u32 flags = 0, double value0 = 0.0,
    double value1 = 0.0, double value2 = 0.0, u32 aux0 = 0, u32 aux1 = 0, u32 aux2 = 0) {
  if (!bokemo::battle_state::append_event(state, static_cast<u32>(opcode), actor, target, value0)) return false;
  auto& event = state.events[state.event_count - 1];
  event.phase = phase;
  event.ability_id = ability;
  event.attack_type = attack_type;
  event.flags = flags;
  event.timing = timing;
  event.value1 = value1;
  event.value2 = value2;
  event.aux0 = aux0;
  event.aux1 = aux1;
  event.aux2 = aux2;
  return true;
}

bool draw_index(BattleStateCore& state, u32 count, u32& selected) {
  double random = 0.0;
  if (!bokemo::battle_state::consume_random(state, random)) return false;
  selected = count == 0 ? 0 : static_cast<u32>(random * count);
  if (count > 0 && selected >= count) selected = count - 1;
  return true;
}

MutableAbility* active_ability_at(CombatantState& combatant, u32 active_index, const protocol::AbilityId* excluded = nullptr, u32 excluded_count = 0) {
  u32 cursor = 0;
  for (int index = 0; index < combatant.ability_count; ++index) {
    auto& ability = combatant.abilities[index];
    if (ability.removed || ability.level <= 0) continue;
    bool skip = false;
    for (u32 excluded_index = 0; excluded_index < excluded_count; ++excluded_index) {
      if (ability.id == static_cast<u32>(excluded[excluded_index])) { skip = true; break; }
    }
    if (skip) continue;
    if (cursor++ == active_index) return &ability;
  }
  return nullptr;
}

u32 active_ability_count(const CombatantState& combatant, const protocol::AbilityId* excluded = nullptr, u32 excluded_count = 0) {
  u32 count = 0;
  for (int index = 0; index < combatant.ability_count; ++index) {
    const auto& ability = combatant.abilities[index];
    if (ability.removed || ability.level <= 0) continue;
    bool skip = false;
    for (u32 excluded_index = 0; excluded_index < excluded_count; ++excluded_index) {
      if (ability.id == static_cast<u32>(excluded[excluded_index])) { skip = true; break; }
    }
    if (!skip) ++count;
  }
  return count;
}

bool grant_ability(CombatantState& target, u32 ability_id, int level, int& previous, int& next) {
  for (int index = 0; index < target.ability_count; ++index) {
    auto& ability = target.abilities[index];
    if (ability.id != ability_id || ability.removed) continue;
    previous = ability.level;
    if (level > ability.level) ability.level = level;
    next = ability.level;
    return true;
  }
  if (target.ability_count >= bokemo::battle_state::kMaxAbilitiesPerCombatant) return false;
  previous = 0;
  auto& ability = target.abilities[target.ability_count++];
  ability = {};
  ability.id = ability_id;
  ability.level = level;
  next = level;
  return true;
}

u32 state_initiative_dice_count(const InputHeader& input, const CombatantState& combatant, u8 attack_type) {
  const bool machine_logic = input.terrain_id == static_cast<u16>(protocol::TerrainId::MachineLogic);
  const bool first_strike_enabled =
      (!machine_logic || active_ability_level(combatant, protocol::AbilityId::EquationBreaker) > 0) &&
      (input.terrain_id != static_cast<u16>(protocol::TerrainId::AshHaze) ||
       active_ability_level(combatant, protocol::AbilityId::TrueSight) > 0);
  const int first_strike = first_strike_enabled ? active_ability_level(combatant, protocol::AbilityId::FirstStrike) : 0;
  const u32 base_dice = attack_type == 1 ? 4 : attack_type == 2 ? 3 : 1;
  const u32 extra_dice = first_strike >= 3 ? 3 : static_cast<u32>(first_strike);
  u32 terrain_dice = 0;
  if (!machine_logic && input.terrain_id == static_cast<u16>(protocol::TerrainId::Tailwind) && combatant.side == Side::Party) {
    // Frozen setup behavior: Wind Rider consumes two terrain dice; otherwise one.
    terrain_dice = active_ability_level(combatant, protocol::AbilityId::WindRider) > 0 ? 2 : 1;
  }
  if (!machine_logic && input.terrain_id == static_cast<u16>(protocol::TerrainId::EnemyHighGround) && combatant.side == Side::Enemy) terrain_dice = 1;
  return base_dice + extra_dice + terrain_dice;
}

bool action_precedes(const BattleStateCore& state, const NormalActionEntry& left, const NormalActionEntry& right) {
  if (left.timing != right.timing) return left.timing > right.timing;
  if (left.attack_type != right.attack_type) return left.attack_type < right.attack_type;
  const auto* left_actor = bokemo::battle_state::find(state, left.actor_id);
  const auto* right_actor = bokemo::battle_state::find(state, right.actor_id);
  if (!left_actor || !right_actor) return false;
  if (left_actor->side != right_actor->side) return left_actor->side == Side::Enemy;
  if (left_actor->side == Side::Enemy) return false;
  const bool left_front = left_actor->row <= 3;
  const bool right_front = right_actor->row <= 3;
  if (left_front != right_front) return left_front;
  return left_actor->row < right_actor->row;
}

bool prepare_state_initiative(const InputHeader& input, BattleStateCore& state) {
  bool party_has_frostbite = false;
  bool enemy_has_frostbite = false;
  for (int index = 0; index < state.combatant_count; ++index) {
    const auto& combatant = state.combatants[index];
    if (state_abilities_suppressed(input, combatant) || active_ability_level(combatant, protocol::AbilityId::Frostbite) == 0) continue;
    if (combatant.side == Side::Party) party_has_frostbite = true;
    else enemy_has_frostbite = true;
  }
  for (u8 attack_type = 1; attack_type <= 3; ++attack_type) {
    for (int index = 0; index < state.combatant_count; ++index) {
      auto& combatant = state.combatants[index];
      const double attack = attack_type == 1 ? combatant.attacks.ranged : attack_type == 2 ? combatant.attacks.magical : combatant.attacks.melee;
      const double noa = attack_type == 1 ? combatant.attacks.ranged_noa : attack_type == 2 ? combatant.attacks.magical_noa : combatant.attacks.melee_noa;
      if (attack <= 0.0 || noa <= 0.0) continue;
      if (state.action_count >= bokemo::battle_state::kMaxNormalActions) return false;
      const bool machine_logic = input.terrain_id == static_cast<u16>(protocol::TerrainId::MachineLogic);
      const u32 dice_count = state_initiative_dice_count(input, combatant, attack_type);
      const u32 terrain_dice = !machine_logic && input.terrain_id == static_cast<u16>(protocol::TerrainId::Tailwind) && combatant.side == Side::Party
          ? (active_ability_level(combatant, protocol::AbilityId::WindRider) > 0 ? 2 : 1)
          : !machine_logic && input.terrain_id == static_cast<u16>(protocol::TerrainId::EnemyHighGround) && combatant.side == Side::Enemy ? 1 : 0;
      int timing = 0;
      for (u32 die = 0; die < dice_count - terrain_dice; ++die) {
        double random = 0.0;
        if (!bokemo::battle_state::consume_random(state, random)) return false;
        timing += static_cast<int>(random * 3.0) + 1;
      }
      if (timing > 49) timing = 49;
      if (!machine_logic && combatant.side == Side::Party && (input.flags & kInputFlagFertilityInitiative) != 0 &&
          input.terrain_id != static_cast<u16>(protocol::TerrainId::Gehenna)) timing = timing + 1 > 49 ? 49 : timing + 1;
      const int slow = active_ability_level(combatant, protocol::AbilityId::Slow);
      const int boost = active_ability_level(combatant, protocol::AbilityId::Boost);
      if (!machine_logic && slow > 0) timing = timing - slow < 1 ? 1 : timing - slow;
      if (!machine_logic && boost > 0) timing = timing + boost > 49 ? 49 : timing + boost;
      const bool frostbite = combatant.side == Side::Party ? enemy_has_frostbite : party_has_frostbite;
      if (!machine_logic && frostbite && active_ability_level(combatant, protocol::AbilityId::Coldproof) == 0) timing = timing - 1 < 1 ? 1 : timing - 1;
      for (u32 die = 0; die < terrain_dice; ++die) {
        double random = 0.0;
        if (!bokemo::battle_state::consume_random(state, random)) return false;
        timing += static_cast<int>(random * 3.0) + 1;
        if (timing > 49) timing = 49;
      }
      state.actions[state.action_count++] = {combatant.id, attack_type, timing, false};
    }
  }
  for (u32 index = 1; index < state.action_count; ++index) {
    const auto current = state.actions[index];
    u32 cursor = index;
    while (cursor > 0 && action_precedes(state, current, state.actions[cursor - 1])) {
      state.actions[cursor] = state.actions[cursor - 1];
      --cursor;
    }
    state.actions[cursor] = current;
  }
  for (u32 index = 0; index < state.action_count; ++index) {
    const auto& action = state.actions[index];
    if (!emit_state_event(state, protocol::EventOpcode::Initiative, 2, action.actor_id, 0, 0,
        action.attack_type, action.timing, 0, 0.0, 0.0, 0.0, index)) return false;
  }
  return true;
}

enum class StartResult { Ok, TapeExhausted, EventCapacity, AbilityCapacity, ActionCapacity };

StartResult emit_forget(
    BattleStateCore& state, CombatantState& owner, CombatantState& target,
    protocol::AbilityId source_ability, int timing, bool terrain_source, bool consume_empty_selection) {
  const u32 source_id = static_cast<u32>(source_ability);
  if (active_ability_level(target, protocol::AbilityId::Unforgettable) > 0) {
    return emit_state_event(state, protocol::EventOpcode::AbilityActivated, 1, owner.id, target.id,
        static_cast<u32>(protocol::AbilityId::Unforgettable), 0, timing, 1, 0.0, 0.0, 0.0,
        terrain_source ? 13u : 15u) ? StartResult::Ok : StartResult::EventCapacity;
  }
  const u32 count = active_ability_count(target);
  if (count == 0 && !consume_empty_selection) return StartResult::Ok;
  u32 selected = 0;
  if (!draw_index(state, count, selected)) return StartResult::TapeExhausted;
  if (count == 0) return StartResult::Ok;
  MutableAbility* ability = active_ability_at(target, selected);
  if (!ability) return StartResult::AbilityCapacity;
  const int previous = ability->level;
  ability->level = 0;
  ability->removed = true;
  if (!emit_state_event(state, protocol::EventOpcode::AbilityMutated, 1, owner.id, target.id,
      ability->id, 0, timing, 4 | (terrain_source ? 8 : 0), previous, 0.0, 0.0,
      terrain_source ? 13u : 15u)) return StartResult::EventCapacity;
  if (terrain_source) {
    u32 flavor = 0;
    if (!draw_index(state, 10, flavor)) return StartResult::TapeExhausted;
    if (!emit_state_event(state, protocol::EventOpcode::RandomFlavor, 1, owner.id, target.id,
        ability->id, 0, timing, 8, flavor, 0.0, 0.0, flavor, 13u)) return StartResult::EventCapacity;
  }
  (void)source_id;
  return StartResult::Ok;
}

StartResult resolve_start_checkpoint(const InputHeader& input, BattleStateCore& state) {
  constexpr u32 kPrevented = 1;
  constexpr u32 kGranted = 2;
  constexpr u32 kRemoved = 4;
  constexpr u32 kTerrain = 8;
  constexpr u32 kDeity = 16;
  constexpr u32 kMutual = 32;
  constexpr u32 kBroken = 64;
  const auto terrain = static_cast<protocol::TerrainId>(input.terrain_id);
  auto emit = [&](protocol::EventOpcode opcode, u32 actor, u32 target, u32 ability, int timing,
                  u32 flags = 0, double value0 = 0.0, double value1 = 0.0, u32 aux0 = 0) {
    return emit_state_event(state, opcode, 1, actor, target, ability, 0, timing, flags,
        value0, value1, 0.0, aux0);
  };
  if (!emit_state_event(state, protocol::EventOpcode::BattleStarted, 1, 0, 0, 0, 0, 0) ||
      !emit_state_event(state, protocol::EventOpcode::PhaseStarted, 1, 0, 0, 0, 0, 9)) return StartResult::EventCapacity;
  if (terrain != protocol::TerrainId::None && !emit(protocol::EventOpcode::TerrainEffect, 0, 0, 0, 9, kTerrain, input.terrain_id)) {
    return StartResult::EventCapacity;
  }

  const bool domain = terrain == protocol::TerrainId::FloorDomain || terrain == protocol::TerrainId::CapDomain ||
      terrain == protocol::TerrainId::EchoDomain || terrain == protocol::TerrainId::SilenceField ||
      terrain == protocol::TerrainId::DuelistDomain || terrain == protocol::TerrainId::SniperDomain;
  if (domain) {
    for (int index = 0; index < state.combatant_count; ++index) {
      auto& owner = state.combatants[index];
      if (active_ability_level(owner, protocol::AbilityId::DomainBreaker) > 0 &&
          !emit(protocol::EventOpcode::AbilityActivated, owner.id, 0,
              static_cast<u32>(protocol::AbilityId::DomainBreaker), 9, kPrevented | kTerrain,
              active_ability_level(owner, protocol::AbilityId::DomainBreaker))) return StartResult::EventCapacity;
    }
  }

  if (terrain == protocol::TerrainId::Deletion) {
    u32 target_index = 0;
    if (!draw_index(state, static_cast<u32>(state.combatant_count), target_index)) return StartResult::TapeExhausted;
    auto& target = state.combatants[target_index];
    CombatantState terrain_actor{};
    const auto result = emit_forget(state, terrain_actor, target, protocol::AbilityId::None, 9, true, true);
    if (result != StartResult::Ok) return result;
  } else if (terrain == protocol::TerrainId::Transcendence || terrain == protocol::TerrainId::Suppression) {
    for (int combatant_index = 0; combatant_index < state.combatant_count; ++combatant_index) {
      auto& combatant = state.combatants[combatant_index];
      const bool defiant = active_ability_level(combatant, protocol::AbilityId::Defiance) > 0;
      for (int ability_index = 0; ability_index < combatant.ability_count; ++ability_index) {
        auto& ability = combatant.abilities[ability_index];
        if (ability.removed || ability.level <= 0 || !is_terrain_timed_or_reactive(static_cast<protocol::AbilityId>(ability.id))) continue;
        const int previous = ability.level;
        if (terrain == protocol::TerrainId::Transcendence) ability.level = ability.level >= 5 ? 5 : ability.level + 1;
        else if (!defiant) ability.level = ability.level <= 1 ? 1 : ability.level - 1;
        if (ability.level != previous && !emit(protocol::EventOpcode::AbilityMutated, combatant.id, combatant.id,
            ability.id, 9, kTerrain, previous, ability.level, 13)) return StartResult::EventCapacity;
      }
    }
  } else if (terrain == protocol::TerrainId::SilenceField) {
    for (int index = 0; index < state.combatant_count; ++index) {
      auto& owner = state.combatants[index];
      const int level = active_ability_level(owner, protocol::AbilityId::EquationBreaker);
      if (level > 0 && !emit(protocol::EventOpcode::AbilityActivated, owner.id, 0,
          static_cast<u32>(protocol::AbilityId::EquationBreaker), 9, kPrevented | kTerrain, level)) return StartResult::EventCapacity;
    }
  }

  if (input.deity_id == static_cast<u16>(protocol::DeityId::GoddessOfDiscord) && terrain != protocol::TerrainId::Gehenna) {
    u32 party_count = 0;
    for (int index = 0; index < state.combatant_count; ++index) if (state.combatants[index].side == Side::Party) ++party_count;
    if (party_count > 0) {
      u32 selected = 0;
      if (!draw_index(state, party_count, selected)) return StartResult::TapeExhausted;
      CombatantState* target = nullptr;
      for (int index = 0; index < state.combatant_count; ++index) {
        if (state.combatants[index].side == Side::Party && selected-- == 0) { target = &state.combatants[index]; break; }
      }
      if (target) {
        if (active_ability_level(*target, protocol::AbilityId::NullAntagonism) > 0) {
          if (!emit(protocol::EventOpcode::AbilityActivated, target->id, target->id,
              static_cast<u32>(protocol::AbilityId::NullAntagonism), 9, kPrevented | kDeity, 1, 0, 14)) return StartResult::EventCapacity;
        } else {
          target->status_flags |= 1;
          if (!emit(protocol::EventOpcode::StatusApplied, 0, target->id, 0, 9, kDeity, 1, 0, 14)) return StartResult::EventCapacity;
        }
      }
    }
  }
  if (input.deity_id == static_cast<u16>(protocol::DeityId::GodOfOblivion) && terrain != protocol::TerrainId::Gehenna) {
    u32 party_count = 0;
    for (int index = 0; index < state.combatant_count; ++index) if (state.combatants[index].side == Side::Party) ++party_count;
    if (party_count > 0) {
      u32 selected = 0;
      if (!draw_index(state, party_count, selected)) return StartResult::TapeExhausted;
      for (int index = 0; index < state.combatant_count; ++index) {
        auto& target = state.combatants[index];
        if (target.side != Side::Party || selected-- != 0) continue;
        int previous = 0, next = 0;
        if (!grant_ability(target, static_cast<u32>(protocol::AbilityId::FadingMemory), 1, previous, next)) return StartResult::AbilityCapacity;
        if (!emit(protocol::EventOpcode::AbilityMutated, 0, target.id,
            static_cast<u32>(protocol::AbilityId::FadingMemory), 9, kGranted | kDeity, previous, next, 14)) return StartResult::EventCapacity;
        break;
      }
    }
  }

  if (!prepare_state_initiative(input, state)) {
    return state.random_cursor >= state.random_count ? StartResult::TapeExhausted : StartResult::ActionCapacity;
  }

  CombatantState* enemy = nullptr;
  CombatantState* parties[bokemo::battle_state::kMaxCombatants]{};
  u32 party_count = 0;
  for (int index = 0; index < state.combatant_count; ++index) {
    if (state.combatants[index].side == Side::Enemy && !enemy) enemy = &state.combatants[index];
    if (state.combatants[index].side == Side::Party) parties[party_count++] = &state.combatants[index];
  }

  // START timing 9: enemy first, then party owners from front to back.
  if (enemy && !state_abilities_suppressed(input, *enemy) && active_ability_level(*enemy, protocol::AbilityId::Oblivion) > 0 && party_count > 0) {
    u32 selected = 0;
    if (!draw_index(state, party_count, selected)) return StartResult::TapeExhausted;
    const auto result = emit_forget(state, *enemy, *parties[selected], protocol::AbilityId::Oblivion, 9, false, false);
    if (result != StartResult::Ok) return result;
  }
  u32 oblivion_owners[bokemo::battle_state::kMaxCombatants]{};
  u32 oblivion_count = 0;
  for (u32 index = 0; index < party_count; ++index) {
    if (!state_abilities_suppressed(input, *parties[index]) && active_ability_level(*parties[index], protocol::AbilityId::Oblivion) > 0) oblivion_owners[oblivion_count++] = index;
  }
  for (u32 index = 0; index < oblivion_count; ++index) {
    if (!enemy) break;
    const auto result = emit_forget(state, *parties[oblivion_owners[index]], *enemy, protocol::AbilityId::Oblivion, 9, false, false);
    if (result != StartResult::Ok) return result;
  }

  auto resolve_fading = [&](CombatantState& owner) -> StartResult {
    u32 selected = 0;
    if (!draw_index(state, static_cast<u32>(state.combatant_count), selected)) return StartResult::TapeExhausted;
    return emit_forget(state, owner, state.combatants[selected], protocol::AbilityId::FadingMemory, 8, false, false);
  };
  if (enemy && !state_abilities_suppressed(input, *enemy) && active_ability_level(*enemy, protocol::AbilityId::FadingMemory) > 0) {
    const auto result = resolve_fading(*enemy);
    if (result != StartResult::Ok) return result;
  }
  u32 fading_owners[bokemo::battle_state::kMaxCombatants]{};
  u32 fading_count = 0;
  for (u32 index = 0; index < party_count; ++index) {
    if (!state_abilities_suppressed(input, *parties[index]) && active_ability_level(*parties[index], protocol::AbilityId::FadingMemory) > 0) fading_owners[fading_count++] = index;
  }
  for (u32 index = 0; index < fading_count; ++index) {
    const auto result = resolve_fading(*parties[fading_owners[index]]);
    if (result != StartResult::Ok) return result;
  }

  const protocol::AbilityId mimic_excluded[] = {protocol::AbilityId::Mimic, protocol::AbilityId::Oblivion, protocol::AbilityId::FadingMemory};
  auto mimic = [&](CombatantState& owner, CombatantState& target) -> StartResult {
    const u32 count = active_ability_count(target, mimic_excluded, 3);
    if (count == 0) return StartResult::Ok;
    u32 selected = 0;
    if (!draw_index(state, count, selected)) return StartResult::TapeExhausted;
    MutableAbility* copied = active_ability_at(target, selected, mimic_excluded, 3);
    if (!copied) return StartResult::AbilityCapacity;
    int previous = 0, next = 0;
    if (!grant_ability(owner, copied->id, copied->level, previous, next)) return StartResult::AbilityCapacity;
    return emit(protocol::EventOpcode::AbilityMutated, owner.id, target.id, copied->id, 8,
        kGranted, previous, next, 15) ? StartResult::Ok : StartResult::EventCapacity;
  };
  if (enemy && !state_abilities_suppressed(input, *enemy) && active_ability_level(*enemy, protocol::AbilityId::Mimic) > 0 && party_count > 0) {
    u32 selected = 0;
    if (!draw_index(state, party_count, selected)) return StartResult::TapeExhausted;
    const auto result = mimic(*enemy, *parties[selected]);
    if (result != StartResult::Ok) return result;
  }
  u32 mimic_owners[bokemo::battle_state::kMaxCombatants]{};
  u32 mimic_count = 0;
  for (u32 index = 0; index < party_count; ++index) {
    if (!state_abilities_suppressed(input, *parties[index]) && active_ability_level(*parties[index], protocol::AbilityId::Mimic) > 0) mimic_owners[mimic_count++] = index;
  }
  for (u32 index = 0; index < mimic_count; ++index) {
    if (!enemy) break;
    const auto result = mimic(*parties[mimic_owners[index]], *enemy);
    if (result != StartResult::Ok) return result;
  }

  // START timing 7: one best front-most party owner for each shared party fact.
  const protocol::AbilityId party_facts[] = {protocol::AbilityId::Defender, protocol::AbilityId::Command,
      protocol::AbilityId::MBarrier, protocol::AbilityId::Deflection};
  for (auto ability_id : party_facts) {
    CombatantState* best = nullptr;
    int best_level = 0;
    for (u32 index = 0; index < party_count; ++index) {
      auto& candidate = *parties[index];
      if (state_abilities_suppressed(input, candidate)) continue;
      const int level = active_ability_level(candidate, ability_id);
      if (level > best_level) { best = &candidate; best_level = level; }
    }
    if (!best) continue;
    const bool broken = ability_id == protocol::AbilityId::MBarrier && enemy && active_ability_level(*enemy, protocol::AbilityId::MBarrierBreaker) > 0;
    if (!emit(protocol::EventOpcode::AbilityActivated, best->id, broken ? enemy->id : 0,
        static_cast<u32>(ability_id), 7, broken ? kBroken : 0, best_level, 0, 15)) return StartResult::EventCapacity;
  }

  // START timing 3: Magic Seal, Frostbite, then mutual physical/magical facts.
  for (u32 index = 0; index < party_count; ++index) {
    auto& owner = *parties[index];
    if (!state_abilities_suppressed(input, owner) && active_ability_level(owner, protocol::AbilityId::MagicSeal) > 0 &&
        !emit(protocol::EventOpcode::AbilityActivated, owner.id, 0, static_cast<u32>(protocol::AbilityId::MagicSeal), 3,
            0, active_ability_level(owner, protocol::AbilityId::MagicSeal), 0, 15)) return StartResult::EventCapacity;
    if (!state_abilities_suppressed(input, owner) && active_ability_level(owner, protocol::AbilityId::MagicSeal) > 0) {
      if (state.magic_seal_count >= bokemo::battle_state::kMaxCombatants) return StartResult::AbilityCapacity;
      state.magic_seal_owners[state.magic_seal_count++] = owner.id;
    }
  }
  if (enemy && !state_abilities_suppressed(input, *enemy) && active_ability_level(*enemy, protocol::AbilityId::MagicSeal) > 0 &&
      !emit(protocol::EventOpcode::AbilityActivated, enemy->id, 0, static_cast<u32>(protocol::AbilityId::MagicSeal), 3,
          0, active_ability_level(*enemy, protocol::AbilityId::MagicSeal), 0, 15)) return StartResult::EventCapacity;
  if (enemy && !state_abilities_suppressed(input, *enemy) && active_ability_level(*enemy, protocol::AbilityId::MagicSeal) > 0) {
    if (state.magic_seal_count >= bokemo::battle_state::kMaxCombatants) return StartResult::AbilityCapacity;
    state.magic_seal_owners[state.magic_seal_count++] = enemy->id;
  }
  for (u32 index = 0; index < party_count; ++index) {
    auto& owner = *parties[index];
    if (!state_abilities_suppressed(input, owner) && active_ability_level(owner, protocol::AbilityId::Frostbite) > 0) {
      if (!emit(protocol::EventOpcode::AbilityActivated, owner.id, 0, static_cast<u32>(protocol::AbilityId::Frostbite), 3,
          0, active_ability_level(owner, protocol::AbilityId::Frostbite), 0, 15)) return StartResult::EventCapacity;
      break;
    }
  }
  if (enemy && !state_abilities_suppressed(input, *enemy) && active_ability_level(*enemy, protocol::AbilityId::Frostbite) > 0 &&
      !emit(protocol::EventOpcode::AbilityActivated, enemy->id, 0, static_cast<u32>(protocol::AbilityId::Frostbite), 3,
          0, active_ability_level(*enemy, protocol::AbilityId::Frostbite), 0, 15)) return StartResult::EventCapacity;
  const protocol::AbilityId mutual[] = {protocol::AbilityId::MutualPhysicalAmplify,
      protocol::AbilityId::MutualPhysicalRestraint, protocol::AbilityId::MutualMagicAmplify,
      protocol::AbilityId::MutualMagicRestraint};
  for (auto ability_id : mutual) {
    for (u32 index = 0; index < party_count + (enemy ? 1u : 0u); ++index) {
      auto& owner = index < party_count ? *parties[index] : *enemy;
      const int level = active_ability_level(owner, ability_id);
      if (level <= 0 || state_abilities_suppressed(input, owner)) continue;
      if (!emit(protocol::EventOpcode::AbilityActivated, owner.id, 0, static_cast<u32>(ability_id), 3,
          kMutual, level, 0, 15)) return StartResult::EventCapacity;
    }
  }
  if (!emit_state_event(state, protocol::EventOpcode::PhaseEnded, 1, 0, 0, 0, 0, 0)) return StartResult::EventCapacity;
  return StartResult::Ok;
}

bool base_combat_domain_is_supported(
    const InputHeader& input, const CombatantRecord* combatants,
    const BagRecord* physical_bag, const BagRecord* magical_bag) {
  if ((input.engine_flags & ~(protocol::kEngineFlagStartCheckpoint | protocol::kEngineFlagCombatBaseCheckpoint)) != 0 ||
      (input.engine_flags & protocol::kEngineFlagStartCheckpoint) != 0 || input.flags != 0 ||
      input.terrain_id != 0 || input.deity_id != 0 || input.ability_count != 0) return false;
  u32 enemy_count = 0;
  u32 party_count = 0;
  bool party_rows[bokemo::battle_state::kMaxCombatants]{};
  for (u32 index = 0; index < input.combatant_count; ++index) {
    const auto& combatant = combatants[index];
    if (combatant.flags != 0) return false;
    if (combatant.kind == 2) {
      ++enemy_count;
      if (combatant.magic_style != 0) return false;
    } else {
      ++party_count;
      if (combatant.row == 0 || combatant.row >= bokemo::battle_state::kMaxCombatants || party_rows[combatant.row]) return false;
      party_rows[combatant.row] = true;
    }
    const double noas[] = {combatant.ranged_noa, combatant.magical_noa, combatant.melee_noa};
    const double attacks[] = {combatant.ranged_attack, combatant.magical_attack, combatant.melee_attack};
    for (int attack = 0; attack < 3; ++attack) {
      if (noas[attack] < 0.0 || attacks[attack] < 0.0) return false;
    }
  }
  if (enemy_count != 1 || party_count == 0 || party_count > 7) return false;
  auto bag_is_valid = [&](const BagRecord* bag, u32 count) {
    if (count == 0) return false;
    u64 total = 0;
    for (u32 index = 0; index < count; ++index) {
      if (bag[index].id <= 0 || bag[index].id >= bokemo::battle_state::kMaxCombatants ||
          !party_rows[bag[index].id] || bag[index].tickets == 0) return false;
      for (u32 previous = 0; previous < index; ++previous) if (bag[previous].id == bag[index].id) return false;
      total += bag[index].tickets;
    }
    return total > 0 && total <= 0xffff'ffffull;
  };
  return bag_is_valid(physical_bag, input.physical_bag_count) &&
      bag_is_valid(magical_bag, input.magical_bag_count);
}

bool normal_combat_domain_is_supported(
    const InputHeader& input, const CombatantRecord* combatants, const AbilityRecord* abilities,
    const BagRecord* physical_bag, const BagRecord* magical_bag) {
  const u32 known_flags = protocol::kEngineFlagStartCheckpoint |
      protocol::kEngineFlagCombatBaseCheckpoint | protocol::kEngineFlagCombatNormalCheckpoint;
  if ((input.engine_flags & ~known_flags) != 0 ||
      (input.engine_flags & protocol::kEngineFlagCombatNormalCheckpoint) == 0 ||
      (input.engine_flags & (protocol::kEngineFlagStartCheckpoint | protocol::kEngineFlagCombatBaseCheckpoint)) != 0 ||
      (input.flags & ~(kInputFlagFertilityInitiative | kInputFlagAbilitiesPrepared)) != 0) return false;
  u32 enemy_count = 0;
  u32 party_count = 0;
  bool party_rows[bokemo::battle_state::kMaxCombatants]{};
  for (u32 index = 0; index < input.combatant_count; ++index) {
    const auto& combatant = combatants[index];
    if ((combatant.flags & ~1u) != 0) return false;
    if (combatant.kind == 2) ++enemy_count;
    else {
      ++party_count;
      if (combatant.row == 0 || combatant.row >= bokemo::battle_state::kMaxCombatants || party_rows[combatant.row]) return false;
      party_rows[combatant.row] = true;
    }
    const double noas[] = {combatant.ranged_noa, combatant.magical_noa, combatant.melee_noa,
        combatant.original_ranged_noa, combatant.original_magical_noa, combatant.original_melee_noa};
    const double attacks[] = {combatant.ranged_attack, combatant.magical_attack, combatant.melee_attack};
    for (double noa : noas) if (noa < 0.0) return false;
    for (double attack : attacks) if (attack < 0.0) return false;
  }
  if (enemy_count != 1 || party_count == 0 || party_count > 7) return false;
  for (u32 index = 0; index < input.ability_count; ++index) {
    const auto ownership = ability_ownership(static_cast<protocol::AbilityId>(abilities[index].id));
    if (ownership == AbilityOwnership::Unclassified || ownership == AbilityOwnership::TimedTrigger ||
        ownership == AbilityOwnership::ReactiveChain || ownership == AbilityOwnership::DefeatRecovery) return false;
  }
  auto bag_is_valid = [&](const BagRecord* bag, u32 count) {
    if (count == 0) return false;
    u64 total = 0;
    for (u32 index = 0; index < count; ++index) {
      if (bag[index].id <= 0 || bag[index].id >= bokemo::battle_state::kMaxCombatants ||
          !party_rows[bag[index].id] || bag[index].tickets == 0) return false;
      for (u32 previous = 0; previous < index; ++previous) if (bag[previous].id == bag[index].id) return false;
      total += bag[index].tickets;
    }
    return total > 0 && total <= 0xffff'ffffull;
  };
  return bag_is_valid(physical_bag, input.physical_bag_count) && bag_is_valid(magical_bag, input.magical_bag_count);
}

bool reactive_combat_domain_is_supported(
    const InputHeader& input, const CombatantRecord* combatants, const AbilityRecord* abilities,
    const BagRecord* physical_bag, const BagRecord* magical_bag) {
  const u32 known_flags = protocol::kEngineFlagStartCheckpoint |
      protocol::kEngineFlagCombatBaseCheckpoint | protocol::kEngineFlagCombatNormalCheckpoint |
      protocol::kEngineFlagCombatReactiveCheckpoint;
  if ((input.engine_flags & ~known_flags) != 0 ||
      (input.engine_flags & protocol::kEngineFlagCombatReactiveCheckpoint) == 0 ||
      (input.engine_flags & (protocol::kEngineFlagStartCheckpoint |
          protocol::kEngineFlagCombatBaseCheckpoint | protocol::kEngineFlagCombatNormalCheckpoint)) != 0 ||
      (input.flags & ~(kInputFlagFertilityInitiative | kInputFlagAbilitiesPrepared)) != 0) return false;
  u32 enemy_count = 0;
  u32 party_count = 0;
  bool party_rows[bokemo::battle_state::kMaxCombatants]{};
  for (u32 index = 0; index < input.combatant_count; ++index) {
    const auto& combatant = combatants[index];
    if ((combatant.flags & ~1u) != 0) return false;
    if (combatant.kind == 2) ++enemy_count;
    else {
      ++party_count;
      if (combatant.row == 0 || combatant.row >= bokemo::battle_state::kMaxCombatants || party_rows[combatant.row]) return false;
      party_rows[combatant.row] = true;
    }
    const double noas[] = {combatant.ranged_noa, combatant.magical_noa, combatant.melee_noa,
        combatant.original_ranged_noa, combatant.original_magical_noa, combatant.original_melee_noa};
    const double attacks[] = {combatant.ranged_attack, combatant.magical_attack, combatant.melee_attack};
    for (double noa : noas) if (noa < 0.0) return false;
    for (double attack : attacks) if (attack < 0.0) return false;
  }
  if (enemy_count != 1 || party_count == 0 || party_count > 7) return false;
  // Raw preflight is deliberately stricter than post-START inspection: Mimic
  // cannot legally select a timed trigger because such an input never starts.
  for (u32 index = 0; index < input.ability_count; ++index) {
    const auto ownership = ability_ownership(static_cast<protocol::AbilityId>(abilities[index].id));
    if (ownership == AbilityOwnership::Unclassified || ownership == AbilityOwnership::TimedTrigger) return false;
  }
  auto bag_is_valid = [&](const BagRecord* bag, u32 count) {
    if (count == 0) return false;
    u64 total = 0;
    for (u32 index = 0; index < count; ++index) {
      if (bag[index].id <= 0 || bag[index].id >= bokemo::battle_state::kMaxCombatants ||
          !party_rows[bag[index].id] || bag[index].tickets == 0) return false;
      for (u32 previous = 0; previous < index; ++previous) if (bag[previous].id == bag[index].id) return false;
      total += bag[index].tickets;
    }
    return total > 0 && total <= 0xffff'ffffull;
  };
  return bag_is_valid(physical_bag, input.physical_bag_count) && bag_is_valid(magical_bag, input.magical_bag_count);
}

enum class CombatResult { Ok, TapeExhausted, EventCapacity };

double attack_value(const CombatantState& actor, u32 profile_index) {
  return profile_index == 0 ? actor.attacks.ranged : profile_index == 1 ? actor.attacks.magical : actor.attacks.melee;
}

double action_noa(const CombatantState& actor, u32 profile_index) {
  return profile_index == 0 ? actor.attacks.ranged_noa : profile_index == 1 ? actor.attacks.magical_noa : actor.attacks.melee_noa;
}

double elemental_resistance(const CombatantState& target, u8 elemental_offense) {
  return elemental_offense == 0 ? 1.0 : target.profile.elemental_resistance[elemental_offense - 1];
}

double base_per_hit_damage(const CombatantState& actor, const CombatantState& target, u32 profile_index) {
  const bool magical = profile_index == 1;
  const u32 family = magical ? 1 : 0;
  const double defense = magical ? target.profile.magical_defense : target.profile.physical_defense;
  const double effective_defense = actor.side == Side::Party
      ? defense * (1.0 - actor.profile.penetration[family])
      : defense;
  const double offense = actor.side == Side::Party
      ? ((1.0 + actor.profile.attack_bonus[profile_index] + actor.profile.phase_bonus[1]) *
          actor.profile.offense_amplifier[family] + actor.profile.deity_bonus[0])
      : actor.profile.enemy_attack_amplifier[profile_index];
  double defense_amplifier = target.profile.defense_amplifier[family];
  if (target.side == Side::Party) defense_amplifier *= target.profile.deity_bonus[magical ? 2 : 1];
  if (defense_amplifier < 0.01) defense_amplifier = 0.01;
  return battle_calculate_per_hit_damage(
      attack_value(actor, profile_index), effective_defense, offense, 1.0,
      actor.profile.elemental_offense_value, elemental_resistance(target, actor.profile.elemental_offense),
      defense_amplifier, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0);
}

CombatantState* draw_threat_target(BattleStateCore& state, bool magical) {
  auto* bag = magical ? state.magical_bag : state.physical_bag;
  const u32 count = magical ? state.magical_bag_count : state.physical_bag_count;
  u64 total = 0;
  for (u32 index = 0; index < count; ++index) total += bag[index].tickets;
  if (total == 0) return nullptr;
  double random = 0.0;
  if (!bokemo::battle_state::consume_random(state, random)) return nullptr;
  const u64 roll = static_cast<u64>(random * static_cast<double>(total)) + 1;
  u64 cumulative = 0;
  i32 previous_id = -0x7fff'ffff;
  for (u32 sorted = 0; sorted < count; ++sorted) {
    u32 selected = count;
    i32 selected_id = 0x7fff'ffff;
    for (u32 index = 0; index < count; ++index) {
      if (bag[index].id > previous_id && bag[index].id < selected_id) { selected = index; selected_id = bag[index].id; }
    }
    if (selected == count) break;
    previous_id = selected_id;
    cumulative += bag[selected].tickets;
    if (bag[selected].tickets > 0 && roll <= cumulative) {
      --bag[selected].tickets;
      for (int index = 0; index < state.combatant_count; ++index) {
        auto& candidate = state.combatants[index];
        if (candidate.side == Side::Party && candidate.row == static_cast<u32>(selected_id)) return &candidate;
      }
      return nullptr;
    }
  }
  return nullptr;
}

CombatResult resolve_base_combat(BattleStateCore& state) {
  constexpr u32 kCombatPhase = 2;
  constexpr u32 kNormalAction = 1;
  if (!emit_state_event(state, protocol::EventOpcode::PhaseStarted, kCombatPhase, 0, 0, 0, 0, 49)) return CombatResult::EventCapacity;
  CombatantState* enemy = nullptr;
  for (int index = 0; index < state.combatant_count; ++index) if (state.combatants[index].side == Side::Enemy) enemy = &state.combatants[index];
  if (!enemy) return CombatResult::TapeExhausted;

  for (int timing = 49; timing >= 0 && state.party_hp > 0.0 && state.enemy_hp > 0.0; --timing) {
    state.scheduler.next_timing = timing;
    for (u32 action_index = 0; action_index < state.action_count && state.party_hp > 0.0 && state.enemy_hp > 0.0; ++action_index) {
      auto& action = state.actions[action_index];
      if (action.acted || action.timing != timing) continue;
      action.acted = true;
      CombatantState* actor = bokemo::battle_state::find(state, action.actor_id);
      if (!actor) return CombatResult::TapeExhausted;
      actor->acted = true;
      const u32 profile_index = action.attack_type - 1;
      const double raw_attempts = __builtin_ceil(action_noa(*actor, profile_index));
      if (raw_attempts <= 0.0) continue;
      const u64 attempts64 = static_cast<u64>(raw_attempts);
      if (attempts64 > 0xffff'ffffull) return CombatResult::TapeExhausted;
      const u32 attempts = static_cast<u32>(attempts64);

      if (actor->side == Side::Enemy) {
        struct Group { CombatantState* target; u32 attempts; u32 hits; double damage; };
        Group groups[7]{};
        u32 group_count = 0;
        for (u32 attempt = 0; attempt < attempts; ++attempt) {
          CombatantState* target = draw_threat_target(state, profile_index == 1);
          if (!target) return CombatResult::TapeExhausted;
          if (!emit_state_event(state, protocol::EventOpcode::TargetSelected, kCombatPhase,
              actor->id, target->id, 0, action.attack_type, timing, 0, 0.0, 0.0, 0.0, kNormalAction)) return CombatResult::EventCapacity;
          state.events[state.event_count - 1].attempts = 1;
          double hit_random = 0.0;
          if (!bokemo::battle_state::consume_random(state, hit_random)) return CombatResult::TapeExhausted;
          u32 group = 0;
          while (group < group_count && groups[group].target != target) ++group;
          if (group == group_count) groups[group_count++] = {target, 0, 0, 0.0};
          ++groups[group].attempts;
          const double chance = battle_hit_chance(
              actor->profile.accuracy_potency[profile_index],
              actor->profile.accuracy_bonus + actor->profile.deity_bonus[3], target->profile.evasion_bonus,
              static_cast<int>(attempt + 1), static_cast<int>(profile_index), 0, 0, 0, 0);
          if (hit_random <= chance) {
            ++groups[group].hits;
            groups[group].damage += base_per_hit_damage(*actor, *target, profile_index);
          }
        }
        for (u32 group = 0; group < group_count; ++group) {
          auto& result = groups[group];
          const double applied = result.damage > state.party_hp ? state.party_hp : result.damage;
          state.party_hp -= applied;
          if (!emit_state_event(state, protocol::EventOpcode::Attack, kCombatPhase, actor->id, result.target->id,
              0, action.attack_type, timing, 0, applied, result.damage, 0.0, kNormalAction)) return CombatResult::EventCapacity;
          state.events[state.event_count - 1].attempts = result.attempts;
          state.events[state.event_count - 1].hits = result.hits;
          if (!emit_state_event(state, protocol::EventOpcode::Damage, kCombatPhase, actor->id, result.target->id,
              0, action.attack_type, timing, 0, applied, result.damage, 0.0, kNormalAction)) return CombatResult::EventCapacity;
          state.events[state.event_count - 1].attempts = result.attempts;
          state.events[state.event_count - 1].hits = result.hits;
        }
      } else {
        if (!emit_state_event(state, protocol::EventOpcode::TargetSelected, kCombatPhase,
            actor->id, enemy->id, 0, action.attack_type, timing, 0, 0.0, 0.0, 0.0, kNormalAction)) return CombatResult::EventCapacity;
        state.events[state.event_count - 1].attempts = attempts;
        const double per_hit = base_per_hit_damage(*actor, *enemy, profile_index);
        u32 hits = 0;
        u32 applied_hits = 0;
        double total_damage = 0.0;
        double applied_damage = 0.0;
        for (u32 attempt = 0; attempt < attempts; ++attempt) {
          double hit_random = 0.0;
          if (!bokemo::battle_state::consume_random(state, hit_random)) return CombatResult::TapeExhausted;
          const double potency = profile_index == 1 ? 1.0 : actor->profile.accuracy_potency[profile_index];
          const double chance = battle_hit_chance(
              potency, actor->profile.accuracy_bonus + actor->profile.deity_bonus[3], enemy->profile.evasion_bonus,
              static_cast<int>(attempt + 1), static_cast<int>(profile_index), 0, 0, 0, 0);
          if (hit_random > chance) continue;
          ++hits;
          total_damage += per_hit;
          if (state.enemy_hp > 0.0) {
            const double applied = per_hit > state.enemy_hp ? state.enemy_hp : per_hit;
            state.enemy_hp -= applied;
            applied_damage += applied;
            if (applied > 0.0) ++applied_hits;
          }
        }
        enemy->hp = state.enemy_hp;
        enemy->enemy_hits_received += applied_hits;
        if (!emit_state_event(state, protocol::EventOpcode::Attack, kCombatPhase, actor->id, enemy->id,
            0, action.attack_type, timing, 0, applied_damage, total_damage, 0.0, kNormalAction)) return CombatResult::EventCapacity;
        state.events[state.event_count - 1].attempts = attempts;
        state.events[state.event_count - 1].hits = hits;
        if (!emit_state_event(state, protocol::EventOpcode::Damage, kCombatPhase, actor->id, enemy->id,
            0, action.attack_type, timing, 0, applied_damage, total_damage, 0.0, kNormalAction)) return CombatResult::EventCapacity;
        state.events[state.event_count - 1].attempts = attempts;
        state.events[state.event_count - 1].hits = applied_hits;
      }
    }
  }
  if (!emit_state_event(state, protocol::EventOpcode::PhaseEnded, kCombatPhase, 0, 0, 0, 0, 0)) return CombatResult::EventCapacity;
  return CombatResult::Ok;
}

double level_multiplier(int level, const double (&values)[5]) {
  return level <= 0 ? 1.0 : values[level >= 5 ? 4 : level - 1];
}

double terrain_noa_multiplier(const InputHeader& input, const CombatantState& actor, u32 profile_index) {
  if (active_ability_level(actor, protocol::AbilityId::OutputStabilizer) > 0) return 1.0;
  const auto terrain = static_cast<protocol::TerrainId>(input.terrain_id);
  if (profile_index == 2 && terrain == protocol::TerrainId::RoughWaves) return 0.75;
  if (profile_index == 0 && terrain == protocol::TerrainId::HeavyWind) {
    return active_ability_level(actor, protocol::AbilityId::WindRider) > 0 ? 0.5 : 0.75;
  }
  if (profile_index == 0 && terrain == protocol::TerrainId::Burrow) return 0.5;
  if (terrain == protocol::TerrainId::LowGravity) return 1.3;
  if (terrain == protocol::TerrainId::Gravity) return 0.7;
  if ((profile_index == 1 || profile_index == 2) && terrain == protocol::TerrainId::LimestoneCave) return 1.5;
  return 1.0;
}

bool domain_guarantees_hit(const InputHeader& input, const CombatantState& actor,
                           const CombatantState& target, u32 profile_index) {
  if (active_ability_level(actor, protocol::AbilityId::DomainBreaker) > 0 ||
      active_ability_level(target, protocol::AbilityId::DomainBreaker) > 0) return false;
  const auto terrain = static_cast<protocol::TerrainId>(input.terrain_id);
  return (profile_index == 0 && terrain == protocol::TerrainId::SniperDomain) ||
      (profile_index == 1 && terrain == protocol::TerrainId::SpellDomain) ||
      (profile_index == 2 && terrain == protocol::TerrainId::DuelistDomain);
}

double mutual_multiplier(const CombatantState& actor, const CombatantState& target, bool magical) {
  constexpr double amplify[5] = {1.3, 1.5, 1.6, 1.65, 1.68};
  constexpr double restrain[5] = {0.77, 0.67, 0.63, 0.61, 0.59};
  const auto amp_id = magical ? protocol::AbilityId::MutualMagicAmplify : protocol::AbilityId::MutualPhysicalAmplify;
  const auto restraint_id = magical ? protocol::AbilityId::MutualMagicRestraint : protocol::AbilityId::MutualPhysicalRestraint;
  const int amp = active_ability_level(actor, amp_id) > active_ability_level(target, amp_id)
      ? active_ability_level(actor, amp_id) : active_ability_level(target, amp_id);
  if (amp > 0) return level_multiplier(amp, amplify);
  const int restraint = active_ability_level(actor, restraint_id) > active_ability_level(target, restraint_id)
      ? active_ability_level(actor, restraint_id) : active_ability_level(target, restraint_id);
  return restraint > 0 ? level_multiplier(restraint, restrain) : 1.0;
}

double hp_ratio(double hp, double max_hp) {
  if (max_hp <= 0.0) return 1.0;
  const double ratio = hp / max_hp;
  return ratio < 0.0 ? 0.0 : ratio > 1.0 ? 1.0 : ratio;
}

double party_row_multiplier(const BattleStateCore& state, const CombatantState& target,
                            protocol::AbilityId ability_id) {
  int best = 0;
  for (int index = 0; index < state.combatant_count; ++index) {
    const auto& candidate = state.combatants[index];
    if (candidate.side != Side::Party || candidate.row >= target.row) continue;
    const int level = active_ability_level(candidate, ability_id);
    if (level > best) best = level;
  }
  if (ability_id == protocol::AbilityId::Command) return best >= 3 ? 1.6 : best == 2 ? 1.5 : best == 1 ? 1.4 : 1.0;
  return best >= 3 ? 0.5 : best == 2 ? 0.6 : best == 1 ? 2.0 / 3.0 : 1.0;
}

double advanced_per_hit_damage(const InputHeader& input, BattleStateCore& state,
                               const CombatantState& actor, const CombatantState& target,
                               u32 profile_index, bool friendly_fire) {
  const bool magical = profile_index == 1;
  const u32 family = magical ? 1 : 0;
  double defense = magical ? target.profile.magical_defense : target.profile.physical_defense;
  const double debuff = magical ? target.temporary.magical_defense_debuff : target.temporary.physical_defense_debuff;
  double penetration = actor.side == Side::Party ? actor.profile.penetration[family] : 0.0;
  const int heavy = active_ability_level(actor, protocol::AbilityId::HeavyStrike);
  if (heavy > 0) {
    const double original = profile_index == 0 ? actor.attacks.original_ranged_noa
        : profile_index == 1 ? actor.attacks.original_magical_noa : actor.attacks.original_melee_noa;
    const double current = action_noa(actor, profile_index);
    penetration += (original > current ? original - current : 0.0) * (heavy >= 2 ? 0.015 : 0.01);
  }
  const double effective_defense = actor.side == Side::Party ? defense * (1.0 - penetration) : defense;
  double offense = actor.side == Side::Party
      ? ((1.0 + actor.profile.attack_bonus[profile_index] + actor.profile.phase_bonus[1]) *
          actor.profile.offense_amplifier[family] + actor.profile.deity_bonus[0])
      : actor.profile.enemy_attack_amplifier[profile_index];
  offense *= actor.offense_multiplier;
  const int iaigiri = active_ability_level(actor, protocol::AbilityId::Iaigiri);
  if (!magical && iaigiri > 0) offense *= iaigiri >= 3 ? 2.0 : iaigiri == 2 ? 1.8 : 1.6;
  if (heavy > 0) offense *= 1.4;
  if (magical) {
    const int arc = active_ability_level(actor, protocol::AbilityId::ArcMagic);
    if (arc > 0) offense *= arc >= 3 ? 4.2 : arc == 2 ? 3.6 : 3.0;
  }
  double defense_amp = target.profile.defense_amplifier[family];
  if (target.side == Side::Party) defense_amp *= target.profile.deity_bonus[magical ? 2 : 1];
  if (defense_amp < 0.01) defense_amp = 0.01;
  double party_ability = 1.0;
  if (actor.side == Side::Party && !friendly_fire && !magical) party_ability = party_row_multiplier(state, actor, protocol::AbilityId::Command);
  if (target.side == Side::Party) {
    if (magical && active_ability_level(actor, protocol::AbilityId::MBarrierBreaker) == 0)
      party_ability *= party_row_multiplier(state, target, protocol::AbilityId::MBarrier);
    else if (!magical) party_ability *= party_row_multiplier(state, target, protocol::AbilityId::Defender);
  }
  const double actor_hp = actor.side == Side::Party ? state.party_hp : state.enemy_hp;
  const double actor_max = actor.side == Side::Party ? state.party_max_hp : state.enemy_max_hp;
  const double target_hp = target.side == Side::Party ? state.party_hp : state.enemy_hp;
  const double target_max = target.side == Side::Party ? state.party_max_hp : state.enemy_max_hp;
  double rage = 1.0;
  const int rage_level = active_ability_level(actor, protocol::AbilityId::Rage);
  if (rage_level > 0 && active_ability_level(target, protocol::AbilityId::RageBreaker) == 0)
    rage = 1.0 + (rage_level >= 2 ? 0.6 : 0.5) * (1.0 - hp_ratio(actor_hp, actor_max));
  double momentum = 1.0;
  const int momentum_level = active_ability_level(actor, protocol::AbilityId::Momentum);
  if (momentum_level > 0 && active_ability_level(target, protocol::AbilityId::MomentumBreaker) == 0)
    momentum = 1.25 - (1.0 - hp_ratio(actor_hp, actor_max)) * (momentum_level >= 2 ? 0.4 : 0.5);
  double swarm = 1.0;
  if (active_ability_level(actor, protocol::AbilityId::Swarm) > 0) swarm *= 1.0 - (1.0 - hp_ratio(actor_hp, actor_max)) * 0.5;
  if (active_ability_level(target, protocol::AbilityId::Swarm) > 0) swarm *= 1.0 + (1.0 - hp_ratio(target_hp, target_max)) * 0.5;
  double terrain = 1.0;
  const auto terrain_id = static_cast<protocol::TerrainId>(input.terrain_id);
  if (!magical && (terrain_id == protocol::TerrainId::Exposure)) terrain = 1.3;
  if (!magical && terrain_id == protocol::TerrainId::DarkField) terrain = 1.45;
  if (terrain_id == protocol::TerrainId::Frenzy) terrain = 1.25;
  if (magical && terrain_id == protocol::TerrainId::LightField) terrain = 1.45;
  if (magical && terrain_id == protocol::TerrainId::Sanctuary) terrain = 0.67;
  if (target.side == Side::Enemy && terrain_id == protocol::TerrainId::Fortified && active_ability_level(actor, protocol::AbilityId::Siege) == 0) terrain = 0.75;
  double elemental_attribute = 1.0;
  if (terrain_id == protocol::TerrainId::Thunderstorm && actor.profile.elemental_offense == 2) elemental_attribute = 1.5;
  else if (terrain_id == protocol::TerrainId::Dry && actor.profile.elemental_offense == 3 && active_ability_level(actor, protocol::AbilityId::Dryproof) == 0) elemental_attribute = 0.5;
  else if (terrain_id == protocol::TerrainId::EchoDomain && actor.profile.elemental_offense != 0 && active_ability_level(actor, protocol::AbilityId::DomainBreaker) == 0) {
    const u32 count = state.echo_elemental_use[actor.profile.elemental_offense];
    elemental_attribute = 1.0 + 0.1 * (count > 1 ? count - 1 : 0);
  }
  double runtime = 1.0;
  constexpr double action_amplify[5] = {1.3, 1.5, 1.6, 1.65, 1.68};
  const bool opponent_acted = target.acted;
  const int ambush = active_ability_level(actor, protocol::AbilityId::Ambush);
  if (!opponent_acted && ambush > 0 && active_ability_level(target, protocol::AbilityId::AntiAmbush) == 0) runtime *= level_multiplier(ambush, action_amplify);
  bool ally_acted = false;
  for (int index = 0; index < state.combatant_count; ++index) {
    const auto& ally = state.combatants[index];
    if (ally.side == actor.side && ally.id != actor.id && ally.acted) ally_acted = true;
  }
  const int overwatch = active_ability_level(actor, protocol::AbilityId::Overwatch);
  if (!opponent_acted && !ally_acted && overwatch > 0 && active_ability_level(target, protocol::AbilityId::AntiOverwatch) == 0) runtime *= level_multiplier(overwatch, action_amplify);
  const int execution = active_ability_level(actor, protocol::AbilityId::Execution);
  if (execution > 0 && active_ability_level(target, protocol::AbilityId::ExecutionNull) == 0 && target_max > 0.0 &&
      target_hp <= target_max * (execution >= 2 ? 0.5 : 0.4)) runtime *= execution >= 2 ? 1.8 : 1.5;
  double per_hit = battle_calculate_per_hit_damage(
      attack_value(actor, profile_index), effective_defense, offense, runtime,
      actor.profile.elemental_offense_value, elemental_resistance(target, actor.profile.elemental_offense),
      defense_amp, party_ability, rage, momentum, mutual_multiplier(actor, target, magical), terrain,
      elemental_attribute, swarm, debuff);
  const bool domain_broken = active_ability_level(actor, protocol::AbilityId::DomainBreaker) > 0 ||
      active_ability_level(target, protocol::AbilityId::DomainBreaker) > 0;
  const int domain_mode = terrain_id == protocol::TerrainId::FloorDomain ? 1 : terrain_id == protocol::TerrainId::CapDomain ? 2 : 0;
  return battle_apply_domain_damage_override(per_hit, domain_mode, target_max, domain_broken ? 1 : 0);
}

CombatantState* row_target(BattleStateCore& state, u32 row, u32 profile_index,
                           const CombatantState& actor, bool antagonism, bool& fallback_draw) {
  CombatantState* candidates[7]{};
  u32 count = 0;
  for (int index = 0; index < state.combatant_count; ++index) {
    auto& candidate = state.combatants[index];
    if (candidate.side != Side::Party || (antagonism && candidate.id == actor.id)) continue;
    candidates[count++] = &candidate;
  }
  CombatantState* selected = nullptr;
  for (u32 index = 0; index < count; ++index) if (candidates[index]->row == row) { selected = candidates[index]; break; }
  if (!selected && antagonism && count > 0) {
    u32 index = 0;
    if (!draw_index(state, count, index)) return nullptr;
    fallback_draw = true;
    selected = candidates[index];
  }
  if (!selected || profile_index == 1 || active_ability_level(actor, protocol::AbilityId::BulwarkBreaker) > 0) return selected;
  const u32 front = selected->row - 1;
  for (u32 index = 0; index < count; ++index) {
    if (candidates[index]->row != front) continue;
    const int bulwark = active_ability_level(*candidates[index], protocol::AbilityId::Bulwark);
    if (bulwark > 0 && (profile_index == 0 || bulwark >= 2)) return candidates[index];
  }
  return selected;
}

struct Reaction { int kind = 0; protocol::AbilityId ability = protocol::AbilityId::None; double amplifier = 0.0; };

Reaction defensive_reaction(const CombatantState& actor, const CombatantState& target, u32 profile_index) {
  const u8 element = actor.profile.elemental_offense;
  const bool elemental_broken = (element == 1 && active_ability_level(actor, protocol::AbilityId::FireProtectBreaker) > 0) ||
      (element == 2 && active_ability_level(actor, protocol::AbilityId::ThunderProtectBreaker) > 0) ||
      (element == 3 && active_ability_level(actor, protocol::AbilityId::IceProtectBreaker) > 0);
  const bool magic_broken = profile_index == 1 && active_ability_level(actor, protocol::AbilityId::MBarrierBreaker) > 0;
  auto amp = [](int level, bool reflect) { return reflect
      ? (level >= 5 ? 0.5 : level == 4 ? 0.35 : level == 3 ? 0.2 : level == 2 ? 0.1 : 0.05)
      : (level >= 5 ? 1.0 : level == 4 ? 0.7 : level == 3 ? 0.5 : level == 2 ? 0.3 : 0.1); };
  protocol::AbilityId absorb = element == 3 ? protocol::AbilityId::IceAbsorb : element == 1 ? protocol::AbilityId::FireAbsorb : element == 2 ? protocol::AbilityId::ThunderAbsorb : protocol::AbilityId::None;
  int level = absorb == protocol::AbilityId::None ? 0 : active_ability_level(target, absorb);
  if (!elemental_broken && level > 0) return {1, absorb, amp(level, false)};
  level = profile_index == 1 && !magic_broken ? active_ability_level(target, protocol::AbilityId::MagicalAbsorb) : 0;
  if (level > 0) return {1, protocol::AbilityId::MagicalAbsorb, amp(level, false)};
  protocol::AbilityId null_id = element == 3 ? protocol::AbilityId::IceNull : element == 1 ? protocol::AbilityId::FireNull : element == 2 ? protocol::AbilityId::ThunderNull
      : profile_index == 0 ? protocol::AbilityId::RangedNull : profile_index == 1 ? protocol::AbilityId::MagicalNull : protocol::AbilityId::MeleeNull;
  if (active_ability_level(target, null_id) > 0) return {2, null_id, 0.0};
  protocol::AbilityId reflect = element == 3 ? protocol::AbilityId::IceReflect : element == 1 ? protocol::AbilityId::FireReflect : element == 2 ? protocol::AbilityId::ThunderReflect : protocol::AbilityId::None;
  level = reflect == protocol::AbilityId::None ? 0 : active_ability_level(target, reflect);
  if (!elemental_broken && level > 0) return {3, reflect, amp(level, true)};
  reflect = profile_index == 0 ? protocol::AbilityId::RangedReflect : profile_index == 1 ? protocol::AbilityId::MagicalReflect : protocol::AbilityId::MeleeReflect;
  level = active_ability_level(target, reflect);
  if ((!magic_broken || profile_index != 1) && level > 0) return {3, reflect, amp(level, true)};
  return {};
}

CombatResult emit_immediate_terrain(const InputHeader& input, BattleStateCore& state,
                                    CombatantState& actor, u32 profile_index, int timing,
                                    double calculated_damage, CombatantState* original_target,
                                    CombatantState** lethal_target_out = nullptr) {
  const auto terrain = static_cast<protocol::TerrainId>(input.terrain_id);
  double current = actor.side == Side::Party ? state.party_hp : state.enemy_hp;
  const double maximum = actor.side == Side::Party ? state.party_max_hp : state.enemy_max_hp;
  double damage = 0.0;
  bool triggered = false;
  if (terrain == protocol::TerrainId::VineSnare && active_ability_level(actor, protocol::AbilityId::VineCutter) == 0) { damage = __builtin_floor(current * 0.01); triggered = true; }
  else if (terrain == protocol::TerrainId::CrystalZone && profile_index == 1 && active_ability_level(actor, protocol::AbilityId::ManaWard) == 0) { damage = __builtin_floor(calculated_damage * 0.05); triggered = true; }
  else if (terrain == protocol::TerrainId::Conduction && actor.profile.elemental_offense == 2) { damage = __builtin_floor(calculated_damage * 0.05); triggered = true; }
  else if (terrain == protocol::TerrainId::ManaBurn && profile_index == 1 && active_ability_level(actor, protocol::AbilityId::ManaWard) == 0) { damage = __builtin_floor(maximum * 0.02); triggered = true; }
  else if (terrain == protocol::TerrainId::SacredJudgement && state.scheduler.first_actor_id == actor.id && !state.sacred_judgement_consumed) { damage = __builtin_floor(current * 0.05); triggered = true; state.sacred_judgement_consumed = true; }
  if (triggered && damage > 0.0) {
    const double applied = damage > current ? current : damage;
    if (actor.side == Side::Party) state.party_hp -= applied; else state.enemy_hp -= applied;
    actor.hp = actor.side == Side::Party ? state.party_hp : state.enemy_hp;
    actor.damage_taken += applied;
    if (lethal_target_out && actor.hp <= 0.0) *lethal_target_out = &actor;
    u32 flavor = 0;
    if (!draw_index(state, 10, flavor)) return CombatResult::TapeExhausted;
    if (!emit_state_event(state, protocol::EventOpcode::TerrainEffect, 2, actor.id, actor.id, 0, profile_index + 1, timing,
        8, applied, damage, 0.0, static_cast<u32>(input.terrain_id))) return CombatResult::EventCapacity;
    if (!emit_state_event(state, protocol::EventOpcode::RandomFlavor, 2, actor.id, actor.id, 0, profile_index + 1, timing,
        8, flavor, 0.0, 0.0, flavor, static_cast<u32>(input.terrain_id))) return CombatResult::EventCapacity;
    if (!emit_state_event(state, protocol::EventOpcode::Damage, 2, actor.id, actor.id, 0, profile_index + 1, timing,
        8, applied, damage, 0.0, static_cast<u32>(input.terrain_id))) return CombatResult::EventCapacity;
  }
  if (terrain == protocol::TerrainId::ChainLightning && actor.profile.elemental_offense == 2 && calculated_damage > 0.0) {
    CombatantState* target = original_target;
    if (actor.side == Side::Enemy) {
      CombatantState* candidates[7]{}; u32 count = 0;
      for (int index = 0; index < state.combatant_count; ++index) {
        auto& candidate = state.combatants[index];
        if (candidate.side == Side::Party && (!original_target || candidate.id != original_target->id)) candidates[count++] = &candidate;
      }
      if (count == 0) for (int index = 0; index < state.combatant_count; ++index) if (state.combatants[index].side == Side::Party) candidates[count++] = &state.combatants[index];
      u32 selected = 0;
      if (!draw_index(state, count, selected)) return CombatResult::TapeExhausted;
      target = count > 0 ? candidates[selected] : nullptr;
    } else {
      for (int index = 0; index < state.combatant_count; ++index) if (state.combatants[index].side == Side::Enemy) target = &state.combatants[index];
    }
    if (target) {
      if (!emit_state_event(state, protocol::EventOpcode::TargetSelected, 2, actor.id, target->id, 0, profile_index + 1, timing,
          8, 0.0, 0.0, 0.0, static_cast<u32>(input.terrain_id))) return CombatResult::EventCapacity;
      const double chain = __builtin_floor(calculated_damage * 0.30);
      double& hp = target->side == Side::Party ? state.party_hp : state.enemy_hp;
      const double applied = chain > hp ? hp : chain;
      hp -= applied; target->hp = hp;
      target->damage_taken += applied;
      if (lethal_target_out && target->hp <= 0.0) *lethal_target_out = target;
      u32 flavor = 0;
      if (!draw_index(state, 10, flavor)) return CombatResult::TapeExhausted;
      if (!emit_state_event(state, protocol::EventOpcode::RandomFlavor, 2, actor.id, target->id, 0, profile_index + 1, timing,
          8, flavor, 0.0, 0.0, flavor, static_cast<u32>(input.terrain_id)) ||
          !emit_state_event(state, protocol::EventOpcode::Damage, 2, actor.id, target->id, 0, profile_index + 1, timing,
          8, applied, chain, 0.0, static_cast<u32>(input.terrain_id))) return CombatResult::EventCapacity;
    }
  }
  return CombatResult::Ok;
}

CombatResult resolve_normal_combat(const InputHeader& input, BattleStateCore& state) {
  constexpr u32 kCombatPhase = 2;
  constexpr u32 kNormalAction = 1;
  constexpr u32 kPrevented = 1;
  constexpr u32 kBroken = 64;
  if (!emit_state_event(state, protocol::EventOpcode::PhaseStarted, kCombatPhase, 0, 0, 0, 0, 49)) return CombatResult::EventCapacity;
  CombatantState* enemy = nullptr;
  for (int index = 0; index < state.combatant_count; ++index) if (state.combatants[index].side == Side::Enemy) enemy = &state.combatants[index];
  if (!enemy) return CombatResult::TapeExhausted;
  for (int timing = 49; timing >= 0 && state.party_hp > 0.0 && state.enemy_hp > 0.0; --timing) {
    state.scheduler.next_timing = timing;
    for (u32 action_index = 0; action_index < state.action_count && state.party_hp > 0.0 && state.enemy_hp > 0.0; ++action_index) {
      auto& action = state.actions[action_index];
      if (action.acted || action.timing != timing) continue;
      action.acted = true;
      CombatantState* actor = bokemo::battle_state::find(state, action.actor_id);
      if (!actor) return CombatResult::TapeExhausted;
      if (state.scheduler.first_actor_id == 0) state.scheduler.first_actor_id = actor->id;
      const u32 profile_index = action.attack_type - 1;
      if (active_ability_level(*actor, protocol::AbilityId::NoOffense) > 0) {
        actor->acted = true;
        if (!emit_state_event(state, protocol::EventOpcode::ActionSkipped, kCombatPhase, actor->id, 0,
            static_cast<u32>(protocol::AbilityId::NoOffense), action.attack_type, timing, kPrevented, 0, 0, 0, kNormalAction)) return CombatResult::EventCapacity;
        continue;
      }
      const double raw_attempts = __builtin_ceil(action_noa(*actor, profile_index) * terrain_noa_multiplier(input, *actor, profile_index));
      if (raw_attempts <= 0.0) { actor->acted = true; continue; }
      if (raw_attempts > 0xffff'ffffull) return CombatResult::TapeExhausted;
      const u32 attempts = static_cast<u32>(raw_attempts);
      const bool antagonism = actor->side == Side::Party && (actor->status_flags & 1u) != 0 &&
          active_ability_level(*actor, protocol::AbilityId::NullAntagonism) == 0;
      if (actor->side == Side::Party && (actor->status_flags & 1u) != 0 && !antagonism) {
        actor->status_flags &= ~1u;
        if (!emit_state_event(state, protocol::EventOpcode::StatusRemoved, kCombatPhase, actor->id, actor->id,
            static_cast<u32>(protocol::AbilityId::NullAntagonism), action.attack_type, timing, kPrevented, 0, 0, 0, kNormalAction)) return CombatResult::EventCapacity;
      }
      actor->acted = true;
      if (input.terrain_id == static_cast<u16>(protocol::TerrainId::EchoDomain) && actor->profile.elemental_offense != 0 &&
          active_ability_level(*actor, protocol::AbilityId::DomainBreaker) == 0) ++state.echo_elemental_use[actor->profile.elemental_offense];

      if (profile_index == 1 && state.magic_seal_cursor < state.magic_seal_count) {
        const u32 seal_owner = state.magic_seal_owners[state.magic_seal_cursor++];
        if (!emit_state_event(state, protocol::EventOpcode::Nullified, kCombatPhase, seal_owner, actor->id,
            static_cast<u32>(protocol::AbilityId::MagicSeal), action.attack_type, timing, kPrevented,
            0.0, 0.0, 0.0, kNormalAction) ||
            !emit_state_event(state, protocol::EventOpcode::Attack, kCombatPhase, actor->id, 0,
            static_cast<u32>(protocol::AbilityId::MagicSeal), action.attack_type, timing, kPrevented,
            0.0, 0.0, 0.0, kNormalAction)) return CombatResult::EventCapacity;
        state.events[state.event_count - 1].attempts = attempts;
        const auto terrain_result = emit_immediate_terrain(input, state, *actor, profile_index, timing, 0.0, nullptr);
        if (terrain_result != CombatResult::Ok) return terrain_result;
        continue;
      }

      protocol::AbilityId special = protocol::AbilityId::None;
      if (profile_index == 1) {
        if (active_ability_level(*actor, protocol::AbilityId::GravityWell) > 0 && attempts >= 20) special = protocol::AbilityId::GravityWell;
        else if (active_ability_level(*actor, protocol::AbilityId::ArmorBreak) > 0 && attempts >= 12) special = protocol::AbilityId::ArmorBreak;
        else if (active_ability_level(*actor, protocol::AbilityId::ManaBreak) > 0 && attempts >= 10) special = protocol::AbilityId::ManaBreak;
      }
      CombatantState* target = antagonism ? nullptr : enemy;
      if (actor->side == Side::Enemy) target = nullptr;
      if (special != protocol::AbilityId::None) {
        target = antagonism ? actor : (actor->side == Side::Party ? enemy : nullptr);
        if (actor->side == Side::Enemy) {
          for (int index = 0; index < state.combatant_count; ++index) if (state.combatants[index].side == Side::Party) { target = &state.combatants[index]; break; }
        }
        double calculated = 0.0, applied = 0.0;
        if (special == protocol::AbilityId::GravityWell) {
          double& hp = target && target->side == Side::Enemy ? state.enemy_hp : state.party_hp;
          calculated = __builtin_floor(hp * 0.4); applied = calculated > hp ? hp : calculated; hp -= applied;
          if (target) target->hp = hp;
        } else if (target) {
          for (int index = 0; index < state.combatant_count; ++index) {
            auto& affected = state.combatants[index];
            if (affected.side != target->side) continue;
            if (special == protocol::AbilityId::ArmorBreak) affected.temporary.physical_defense_debuff *= 4.0 / 3.0;
            else affected.temporary.magical_defense_debuff *= 4.0 / 3.0;
          }
        }
        if (!emit_state_event(state, protocol::EventOpcode::AbilityActivated, kCombatPhase, actor->id, target ? target->id : 0,
            static_cast<u32>(special), action.attack_type, timing, 0, calculated, applied, 0.0, kNormalAction) ||
            !emit_state_event(state, protocol::EventOpcode::Attack, kCombatPhase, actor->id, target ? target->id : 0,
            static_cast<u32>(special), action.attack_type, timing, 0, applied, calculated, 0.0, kNormalAction)) return CombatResult::EventCapacity;
        state.events[state.event_count - 1].attempts = special == protocol::AbilityId::GravityWell ? 1 : attempts;
        state.events[state.event_count - 1].hits = special == protocol::AbilityId::GravityWell ? 1 : 0;
        if (applied > 0.0 && !emit_state_event(state, protocol::EventOpcode::Damage, kCombatPhase, actor->id, target ? target->id : 0,
            static_cast<u32>(special), action.attack_type, timing, 0, applied, calculated, 0.0, kNormalAction)) return CombatResult::EventCapacity;
        const auto terrain_result = emit_immediate_terrain(input, state, *actor, profile_index, timing, calculated, target);
        if (terrain_result != CombatResult::Ok) return terrain_result;
        continue;
      }

      struct Group { CombatantState* target = nullptr; u32 attempts = 0; u32 hits = 0; double calculated = 0.0; };
      Group groups[7]{}; u32 group_count = 0;
      u32 action_successful_hits = 0;
      const u32 loop_count = actor->side == Side::Enemy ? attempts : 1;
      for (u32 target_attempt = 0; target_attempt < loop_count; ++target_attempt) {
        if (actor->side == Side::Enemy || antagonism) {
          auto* bag = profile_index == 1 ? state.magical_bag : state.physical_bag;
          const u32 bag_count = profile_index == 1 ? state.magical_bag_count : state.physical_bag_count;
          u64 total = 0; for (u32 index = 0; index < bag_count; ++index) total += bag[index].tickets;
          double random = 0.0; if (!bokemo::battle_state::consume_random(state, random)) return CombatResult::TapeExhausted;
          const u64 roll = static_cast<u64>(random * total) + 1; u64 cumulative = 0; u32 row = 0;
          for (u32 index = 0; index < bag_count; ++index) { cumulative += bag[index].tickets; if (bag[index].tickets > 0 && roll <= cumulative) { row = bag[index].id; --bag[index].tickets; break; } }
          bool fallback = false; target = row_target(state, row, profile_index, *actor, antagonism, fallback);
          if (!target) return CombatResult::TapeExhausted;
        }
        if (!target) continue;
        if (!emit_state_event(state, protocol::EventOpcode::TargetSelected, kCombatPhase, actor->id, target->id,
            antagonism ? static_cast<u32>(protocol::AbilityId::NullAntagonism) : 0, action.attack_type, timing,
            antagonism ? 32u : 0u, 0.0, 0.0, 0.0, kNormalAction)) return CombatResult::EventCapacity;
        state.events[state.event_count - 1].attempts = actor->side == Side::Enemy ? 1 : attempts;
        u32 group = 0; while (group < group_count && groups[group].target != target) ++group;
        if (group == group_count) groups[group_count++].target = target;
        Group& result = groups[group];
        const u32 hit_attempts = actor->side == Side::Enemy ? 1 : attempts;
        bool illusion_negated = false;
        bool party_illusion_active = false;
        if (profile_index == 0 && actor->side == Side::Enemy && !state.party_illusion_consumed) {
          for (int index = 0; index < state.combatant_count; ++index) {
            const auto& candidate = state.combatants[index];
            if (candidate.side == Side::Party && active_ability_level(candidate, protocol::AbilityId::Illusion) >= 2) party_illusion_active = true;
          }
        }
        const bool personal_illusion_active = profile_index == 0 && active_ability_level(*target, protocol::AbilityId::Illusion) > 0 && !target->illusion_consumed;
        if (party_illusion_active || personal_illusion_active) {
          if (active_ability_level(*actor, protocol::AbilityId::IllusionBreaker) > 0) {
            if (party_illusion_active) state.party_illusion_consumed = true;
            if (personal_illusion_active) target->illusion_consumed = true;
            if (!emit_state_event(state, protocol::EventOpcode::AbilityActivated, kCombatPhase, actor->id, target->id,
                static_cast<u32>(protocol::AbilityId::IllusionBreaker), action.attack_type, timing, kBroken, 0, 0, 0, kNormalAction)) return CombatResult::EventCapacity;
          } else {
            if (party_illusion_active) state.party_illusion_consumed = true;
            else target->illusion_consumed = true;
            illusion_negated = true;
            if (!emit_state_event(state, protocol::EventOpcode::Nullified, kCombatPhase, target->id, actor->id,
                static_cast<u32>(protocol::AbilityId::Illusion), action.attack_type, timing, kPrevented, 0, 0, 0, kNormalAction)) return CombatResult::EventCapacity;
          }
        }
        const int stealth = active_ability_level(*target, protocol::AbilityId::Stealth);
        const double target_hp = target->side == Side::Party ? state.party_hp : state.enemy_hp;
        const double target_max = target->side == Side::Party ? state.party_max_hp : state.enemy_max_hp;
        const bool stealth_negated = !illusion_negated && stealth > 0 && target_max > 0.0 && target_hp / target_max <= (stealth >= 2 ? 0.18 : 0.12);
        result.attempts += hit_attempts;
        if (illusion_negated || stealth_negated) {
          if (stealth_negated && !emit_state_event(state, protocol::EventOpcode::Nullified, kCombatPhase, target->id, actor->id,
              static_cast<u32>(protocol::AbilityId::Stealth), action.attack_type, timing, kPrevented, 0, 0, 0, kNormalAction)) return CombatResult::EventCapacity;
          continue;
        }
        const double per_hit = advanced_per_hit_damage(input, state, *actor, *target, profile_index, antagonism);
        const bool guaranteed = domain_guarantees_hit(input, *actor, *target, profile_index);
        const int deflection = active_ability_level(*target, protocol::AbilityId::Deflection);
        const int focus = active_ability_level(*actor, protocol::AbilityId::Focus);
        const int stability = active_ability_level(*actor, protocol::AbilityId::ArcaneStability);
        int terrain_modifier = 0;
        if (profile_index == 0 && input.terrain_id == static_cast<u16>(protocol::TerrainId::Fog) && active_ability_level(*actor, protocol::AbilityId::TrueSight) == 0) terrain_modifier = -25;
        if (profile_index == 0 && input.terrain_id == static_cast<u16>(protocol::TerrainId::SunnyBeach)) terrain_modifier = 20;
        u32 local_hits = 0;
        for (u32 hit = 0; hit < hit_attempts; ++hit) {
          bool did_hit = guaranteed;
          if (!guaranteed) {
            double random = 0.0; if (!bokemo::battle_state::consume_random(state, random)) return CombatResult::TapeExhausted;
            const double potency = actor->side == Side::Party && profile_index == 1 ? 1.0 : actor->profile.accuracy_potency[profile_index];
            const u32 nth_hit = actor->side == Side::Enemy ? target_attempt + 1 : hit + 1;
            const double chance = battle_hit_chance(potency, actor->profile.accuracy_bonus + actor->profile.deity_bonus[3],
                target->profile.evasion_bonus, static_cast<int>(nth_hit), static_cast<int>(profile_index), deflection, focus, stability, terrain_modifier);
            did_hit = random <= chance;
          }
          if (!did_hit) continue;
          ++local_hits; ++result.hits; ++action_successful_hits;
          double resonance = 1.0;
          const int resonance_level = active_ability_level(*actor, protocol::AbilityId::Resonance);
          if (resonance_level > 0 && (profile_index == 1 || (profile_index == 0 && input.deity_id == static_cast<u16>(protocol::DeityId::GodOfResonance) && input.terrain_id != static_cast<u16>(protocol::TerrainId::Gehenna)))) {
            constexpr int bonus[5] = {4, 7, 9, 11, 12};
            resonance += 0.01 * bonus[resonance_level >= 5 ? 4 : resonance_level - 1] * (action_successful_hits - 1);
          }
          const double hit_damage = __builtin_floor(per_hit * resonance);
          result.calculated += hit_damage < 1.0 ? 1.0 : hit_damage;
        }
      }

      double action_effect_damage = 0.0;
      CombatantState* terrain_target = nullptr;
      for (u32 group = 0; group < group_count; ++group) {
        auto& result = groups[group]; if (!result.target) continue;
        terrain_target = result.target;
        const Reaction reaction = defensive_reaction(*actor, *result.target, profile_index);
        double remaining = result.calculated, absorbed = 0.0, reflected_source = 0.0, reflected = 0.0;
        if (reaction.kind == 1) { absorbed = result.calculated > 0.0 ? __builtin_floor(result.calculated * reaction.amplifier) : 0.0; if (result.calculated > 0.0 && absorbed < 1.0) absorbed = 1.0; remaining = 0.0; }
        else if (reaction.kind == 2) remaining = 0.0;
        else if (reaction.kind == 3) {
          reflected_source = result.calculated;
          remaining = __builtin_floor(result.calculated * (1.0 - reaction.amplifier));
          const u32 family = profile_index == 1 ? 1 : 0;
          double reflection_defense = actor->profile.defense_amplifier[family]; if (reflection_defense < 0.01) reflection_defense = 0.01;
          reflected = __builtin_floor(result.calculated * reaction.amplifier * reflection_defense * elemental_resistance(*actor, actor->profile.elemental_offense));
          if (result.calculated > 0.0 && reflected < 1.0) reflected = 1.0;
        }
        action_effect_damage += remaining;
        double& target_hp = result.target->side == Side::Party ? state.party_hp : state.enemy_hp;
        const double applied = remaining > target_hp ? target_hp : remaining; target_hp -= applied; result.target->hp = target_hp;
        if (result.target->side == Side::Enemy && applied > 0.0) enemy->enemy_hits_received += result.hits;
        if (absorbed > 0.0) {
          const double maximum = result.target->side == Side::Party ? state.party_max_hp : state.enemy_max_hp;
          const double heal = absorbed > maximum - target_hp ? maximum - target_hp : absorbed; target_hp += heal; result.target->hp = target_hp;
          if (!emit_state_event(state, protocol::EventOpcode::Absorbed, kCombatPhase, result.target->id, actor->id,
              static_cast<u32>(reaction.ability), action.attack_type, timing, 0, absorbed, result.calculated, heal, kNormalAction) ||
              !emit_state_event(state, protocol::EventOpcode::Heal, kCombatPhase, result.target->id, result.target->id,
              static_cast<u32>(reaction.ability), action.attack_type, timing, 0, heal, absorbed, 0, kNormalAction)) return CombatResult::EventCapacity;
        } else if (reaction.kind == 2) {
          if (!emit_state_event(state, protocol::EventOpcode::Nullified, kCombatPhase, result.target->id, actor->id,
              static_cast<u32>(reaction.ability), action.attack_type, timing, kPrevented, 0.0, result.calculated, 0.0, kNormalAction)) return CombatResult::EventCapacity;
        } else if (reaction.kind == 3) {
          double& actor_hp = actor->side == Side::Party ? state.party_hp : state.enemy_hp;
          const double reflected_applied = reflected > actor_hp ? actor_hp : reflected; actor_hp -= reflected_applied; actor->hp = actor_hp;
          if (!emit_state_event(state, protocol::EventOpcode::Reflected, kCombatPhase, result.target->id, actor->id,
              static_cast<u32>(reaction.ability), action.attack_type, timing, 0, reflected_applied, reflected_source, remaining, kNormalAction) ||
              !emit_state_event(state, protocol::EventOpcode::Damage, kCombatPhase, result.target->id, actor->id,
              static_cast<u32>(reaction.ability), action.attack_type, timing, 0, reflected_applied, reflected, 0.0, kNormalAction)) return CombatResult::EventCapacity;
        }
        if (!emit_state_event(state, protocol::EventOpcode::Attack, kCombatPhase, actor->id, result.target->id,
            0, action.attack_type, timing, reaction.kind ? kPrevented : 0, applied, result.calculated, absorbed, kNormalAction) ||
            !emit_state_event(state, protocol::EventOpcode::Damage, kCombatPhase, actor->id, result.target->id,
            0, action.attack_type, timing, reaction.kind ? kPrevented : 0, applied, result.calculated, 0.0, kNormalAction)) return CombatResult::EventCapacity;
        state.events[state.event_count - 2].attempts = result.attempts; state.events[state.event_count - 2].hits = result.hits;
        state.events[state.event_count - 1].attempts = result.attempts; state.events[state.event_count - 1].hits = result.hits;
        if (state.party_hp <= 0.0 || state.enemy_hp <= 0.0) break;
      }
      const auto terrain_result = emit_immediate_terrain(input, state, *actor, profile_index, timing, action_effect_damage, terrain_target);
      if (terrain_result != CombatResult::Ok) return terrain_result;
    }
  }
  if (!emit_state_event(state, protocol::EventOpcode::PhaseEnded, kCombatPhase, 0, 0, 0, 0, 0)) return CombatResult::EventCapacity;
  return CombatResult::Ok;
}

struct ReactiveStrikeResult {
  u32 attempts = 0;
  u32 hits = 0;
  double calculated = 0.0;
  double applied = 0.0;
};

double reactive_profile_multiplier(int level, int kind) {
  if (level <= 0) return 0.0;
  if (kind == 1) return level >= 3 ? 1.0 : level == 2 ? 0.7 : 0.5; // re-attack
  if (kind == 2) return level >= 3 ? 2.0 : level == 2 ? 1.0 : 0.5; // counter
  return level >= 2 ? 1.0 : 0.5; // re-counter / magical counter / covering fire
}

double apply_checkpoint_damage(BattleStateCore& state, CombatantState& target, double amount) {
  double& hp = target.side == Side::Party ? state.party_hp : state.enemy_hp;
  const double applied = amount > hp ? hp : amount > 0.0 ? amount : 0.0;
  hp -= applied;
  target.hp = hp;
  target.damage_taken += applied;
  return applied;
}

double apply_checkpoint_heal(BattleStateCore& state, CombatantState& target, double amount) {
  double& hp = target.side == Side::Party ? state.party_hp : state.enemy_hp;
  const double maximum = target.side == Side::Party ? state.party_max_hp : state.enemy_max_hp;
  const double applied = amount > maximum - hp ? maximum - hp : amount > 0.0 ? amount : 0.0;
  hp += applied;
  target.hp = hp;
  target.damage_taken = target.damage_taken > applied ? target.damage_taken - applied : 0.0;
  return applied;
}

CombatResult recover_checkpoint_target(BattleStateCore& state, CombatantState& target,
                                       u32 attack_type, int timing, u32 action_id) {
  double& hp = target.side == Side::Party ? state.party_hp : state.enemy_hp;
  if (hp > 0.0) return CombatResult::Ok;
  if (!emit_state_event(state, protocol::EventOpcode::Death, 2, 0, target.id, 0,
      attack_type, timing, 0, 0.0, 0.0, 0.0, action_id)) return CombatResult::EventCapacity;
  const int resurrect = active_ability_level(target, protocol::AbilityId::Resurrect);
  const int reanimate = active_ability_level(target, protocol::AbilityId::Reanimate);
  protocol::EventOpcode opcode = protocol::EventOpcode::None;
  protocol::AbilityId ability = protocol::AbilityId::None;
  double amount = 0.0;
  if (resurrect > 0 && !target.recovery.resurrect_consumed) {
    target.recovery.resurrect_consumed = true;
    opcode = protocol::EventOpcode::Resurrected;
    ability = protocol::AbilityId::Resurrect;
    const double maximum = target.side == Side::Party ? state.party_max_hp : state.enemy_max_hp;
    amount = resurrect >= 2 ? __builtin_ceil(maximum * 0.01) : 1.0;
  } else if (reanimate > 0 && !target.recovery.reanimate_consumed) {
    target.recovery.reanimate_consumed = true;
    opcode = protocol::EventOpcode::Reanimated;
    ability = protocol::AbilityId::Reanimate;
    constexpr int percent[5] = {20, 26, 31, 35, 38};
    const double maximum = target.side == Side::Party ? state.party_max_hp : state.enemy_max_hp;
    amount = __builtin_ceil(maximum * percent[reanimate >= 5 ? 4 : reanimate - 1] / 100.0);
  }
  if (opcode == protocol::EventOpcode::None) return CombatResult::Ok;
  if (amount < 1.0) amount = 1.0;
  const double healed = apply_checkpoint_heal(state, target, amount);
  if (!emit_state_event(state, opcode, 2, target.id, target.id, static_cast<u32>(ability),
      attack_type, timing, 0, healed, 0.0, 0.0, action_id) ||
      !emit_state_event(state, protocol::EventOpcode::Heal, 2, target.id, target.id,
      static_cast<u32>(ability), attack_type, timing, 0, healed, amount, 0.0, action_id)) {
    return CombatResult::EventCapacity;
  }
  return CombatResult::Ok;
}

CombatantState* available_party_null_counter(BattleStateCore& state) {
  CombatantState* selected = nullptr;
  for (int index = 0; index < state.combatant_count; ++index) {
    auto& candidate = state.combatants[index];
    if (candidate.side != Side::Party || candidate.counters == 0) continue;
    if (!selected || candidate.row < selected->row) selected = &candidate;
  }
  return selected;
}

CombatResult emit_counter_nullification(BattleStateCore& state, CombatantState& owner,
                                        CombatantState& target, protocol::AbilityId ability,
                                        u32 attack_type, int timing, u32 action_id) {
  if (owner.side == Side::Party && owner.counters > 0) --owner.counters;
  return emit_state_event(state, protocol::EventOpcode::Nullified, 2, owner.id, target.id,
      static_cast<u32>(ability), attack_type, timing, 1, 0.0, 0.0, 0.0, action_id)
      ? CombatResult::Ok : CombatResult::EventCapacity;
}

ReactiveStrikeResult roll_reactive_strike(const InputHeader& input, BattleStateCore& state,
                                          CombatantState& actor, CombatantState& target,
                                          u32 profile_index, double multiplier) {
  ReactiveStrikeResult result{};
  const double raw = __builtin_ceil(action_noa(actor, profile_index) * multiplier *
      terrain_noa_multiplier(input, actor, profile_index));
  if (raw <= 0.0 || raw > 0xffff'ffffull) return result;
  result.attempts = static_cast<u32>(raw);
  const double per_hit = advanced_per_hit_damage(input, state, actor, target, profile_index, false);
  const bool guaranteed = domain_guarantees_hit(input, actor, target, profile_index);
  const int deflection = active_ability_level(target, protocol::AbilityId::Deflection);
  const int focus = active_ability_level(actor, protocol::AbilityId::Focus);
  const int stability = active_ability_level(actor, protocol::AbilityId::ArcaneStability);
  int terrain_modifier = 0;
  if (profile_index == 0 && input.terrain_id == static_cast<u16>(protocol::TerrainId::Fog) &&
      active_ability_level(actor, protocol::AbilityId::TrueSight) == 0) terrain_modifier = -25;
  if (profile_index == 0 && input.terrain_id == static_cast<u16>(protocol::TerrainId::SunnyBeach)) terrain_modifier = 20;
  for (u32 attempt = 0; attempt < result.attempts; ++attempt) {
    bool hit = guaranteed;
    if (!guaranteed) {
      double random = 0.0;
      if (!bokemo::battle_state::consume_random(state, random)) { result.attempts = 0xffff'ffffu; return result; }
      const double potency = actor.side == Side::Party && profile_index == 1 ? 1.0 : actor.profile.accuracy_potency[profile_index];
      const double chance = battle_hit_chance(potency, actor.profile.accuracy_bonus + actor.profile.deity_bonus[3],
          target.profile.evasion_bonus + target.temporary.evasion, static_cast<int>(attempt + 1),
          static_cast<int>(profile_index), deflection, focus, stability, terrain_modifier);
      hit = random <= chance;
    }
    if (!hit) continue;
    ++result.hits;
    double resonance = 1.0;
    const int level = active_ability_level(actor, protocol::AbilityId::Resonance);
    if (level > 0 && (profile_index == 1 || (profile_index == 0 &&
        input.deity_id == static_cast<u16>(protocol::DeityId::GodOfResonance) &&
        input.terrain_id != static_cast<u16>(protocol::TerrainId::Gehenna)))) {
      constexpr int bonus[5] = {4, 7, 9, 11, 12};
      resonance += 0.01 * bonus[level >= 5 ? 4 : level - 1] * (result.hits - 1);
    }
    const double damage = __builtin_floor(per_hit * resonance);
    result.calculated += damage < 1.0 ? 1.0 : damage;
  }
  return result;
}

CombatResult emit_reactive_strike(BattleStateCore& state, CombatantState& actor,
                                  CombatantState& target, u32 attack_type, int timing,
                                  u32 action_id, protocol::AbilityId ability,
                                  ReactiveStrikeResult& result) {
  if (result.attempts == 0xffff'ffffu) return CombatResult::TapeExhausted;
  result.applied = apply_checkpoint_damage(state, target, result.calculated);
  if (target.side == Side::Enemy && result.applied > 0.0) target.enemy_hits_received += result.hits;
  if (!emit_state_event(state, protocol::EventOpcode::AbilityActivated, 2, actor.id, target.id,
      static_cast<u32>(ability), attack_type, timing, 0, result.attempts, result.hits, 0.0, action_id) ||
      !emit_state_event(state, protocol::EventOpcode::Attack, 2, actor.id, target.id,
      static_cast<u32>(ability), attack_type, timing, 0, result.applied, result.calculated, 0.0, action_id) ||
      !emit_state_event(state, protocol::EventOpcode::Damage, 2, actor.id, target.id,
      static_cast<u32>(ability), attack_type, timing, 0, result.applied, result.calculated, 0.0, action_id)) {
    return CombatResult::EventCapacity;
  }
  state.events[state.event_count - 2].attempts = result.attempts;
  state.events[state.event_count - 2].hits = result.hits;
  state.events[state.event_count - 1].attempts = result.attempts;
  state.events[state.event_count - 1].hits = result.hits;
  return recover_checkpoint_target(state, target, attack_type, timing, action_id);
}

CombatResult apply_close_checkpoint(const InputHeader&, BattleStateCore& state,
                                    CombatantState& actor, CombatantState& target,
                                    ReactiveStrikeResult& result, u32 attack_type, int timing,
                                    u32 action_id) {
  if (result.hits == 0) return CombatResult::Ok;
  constexpr double corrode[5] = {6.0/7.0, 5.0/7.0, 4.0/7.0, 3.0/7.0, 2.0/7.0};
  constexpr double drain[7] = {0.001, 0.003, 0.01, 0.03, 0.10, 0.30, 1.0};
  constexpr int death_numerator[5] = {2, 3, 4, 5, 6};
  constexpr double burn[5] = {0.5, 0.9, 1.2, 1.4, 1.5};
  constexpr int bind_numerator[5] = {2, 3, 4, 5, 6};
  const int corrode_level = active_ability_level(actor, protocol::AbilityId::Corrode);
  if (corrode_level > 0 && result.hits >= 3) {
    const bool blocked = active_ability_level(target, protocol::AbilityId::NullCorrode) > 0;
    if (!emit_state_event(state, blocked ? protocol::EventOpcode::Nullified : protocol::EventOpcode::StatusApplied,
        2, actor.id, target.id, static_cast<u32>(blocked ? protocol::AbilityId::NullCorrode : protocol::AbilityId::Corrode),
        attack_type, timing, blocked ? 1u : 0u, blocked ? 0.0 : corrode[corrode_level >= 5 ? 4 : corrode_level - 1],
        0.0, 0.0, action_id)) return CombatResult::EventCapacity;
    if (!blocked) target.offense_multiplier *= corrode[corrode_level >= 5 ? 4 : corrode_level - 1];
  }
  const int drain_level = active_ability_level(actor, protocol::AbilityId::LifeDrain);
  if (drain_level > 0 && result.applied > 0.0) {
    const bool blocked = active_ability_level(target, protocol::AbilityId::NullLifeDrain) > 0;
    if (blocked) {
      if (!emit_state_event(state, protocol::EventOpcode::Nullified, 2, actor.id, target.id,
          static_cast<u32>(protocol::AbilityId::NullLifeDrain), attack_type, timing, 1, 0, 0, 0, action_id)) return CombatResult::EventCapacity;
    } else {
      const double healed = apply_checkpoint_heal(state, actor, __builtin_floor(result.applied * drain[drain_level >= 7 ? 6 : drain_level - 1]));
      if (!emit_state_event(state, protocol::EventOpcode::Heal, 2, actor.id, actor.id,
          static_cast<u32>(protocol::AbilityId::LifeDrain), attack_type, timing, 0, healed, result.applied, 0, action_id)) return CombatResult::EventCapacity;
    }
  }
  const int death_level = active_ability_level(actor, protocol::AbilityId::DeathTouch);
  double& target_hp = target.side == Side::Party ? state.party_hp : state.enemy_hp;
  if (death_level > 0 && target_hp > 0.0) {
    if (active_ability_level(target, protocol::AbilityId::NullDeathTouch) > 0) {
      if (!emit_state_event(state, protocol::EventOpcode::Nullified, 2, actor.id, target.id,
          static_cast<u32>(protocol::AbilityId::NullDeathTouch), attack_type, timing, 1, 0, 0, 0, action_id)) return CombatResult::EventCapacity;
    } else {
      double random = 0.0; if (!bokemo::battle_state::consume_random(state, random)) return CombatResult::TapeExhausted;
      const double chance = result.hits * death_numerator[death_level >= 5 ? 4 : death_level - 1] / 256.0;
      if (random < (chance > 1.0 ? 1.0 : chance)) {
        const double lethal = target_hp; apply_checkpoint_damage(state, target, lethal);
        if (!emit_state_event(state, protocol::EventOpcode::Damage, 2, actor.id, target.id,
            static_cast<u32>(protocol::AbilityId::DeathTouch), attack_type, timing, 0, lethal, lethal, 0, action_id)) return CombatResult::EventCapacity;
        const auto recovered = recover_checkpoint_target(state, target, attack_type, timing, action_id);
        if (recovered != CombatResult::Ok) return recovered;
      }
    }
  }
  const int burn_level = active_ability_level(target, protocol::AbilityId::Burn);
  double& actor_hp = actor.side == Side::Party ? state.party_hp : state.enemy_hp;
  if (burn_level > 0 && actor_hp > 0.0) {
    if (active_ability_level(actor, protocol::AbilityId::NullBurn) > 0) {
      if (!emit_state_event(state, protocol::EventOpcode::Nullified, 2, target.id, actor.id,
          static_cast<u32>(protocol::AbilityId::NullBurn), attack_type, timing, 1, 0, 0, 0, action_id)) return CombatResult::EventCapacity;
    } else {
      const double maximum = actor.side == Side::Party ? state.party_max_hp : state.enemy_max_hp;
      const double fire_resistance = actor.profile.elemental_resistance[0];
      const double calculated = __builtin_floor(maximum * result.hits * burn[burn_level >= 5 ? 4 : burn_level - 1] / 100.0 * fire_resistance);
      const double applied = apply_checkpoint_damage(state, actor, calculated);
      if (calculated > 0.0 && !emit_state_event(state, protocol::EventOpcode::Damage, 2, target.id, actor.id,
          static_cast<u32>(protocol::AbilityId::Burn), attack_type, timing, 0, applied, calculated, 0, action_id)) return CombatResult::EventCapacity;
      const auto recovered = recover_checkpoint_target(state, actor, attack_type, timing, action_id);
      if (recovered != CombatResult::Ok) return recovered;
    }
  }
  const int bind_level = active_ability_level(actor, protocol::AbilityId::Bind);
  if (bind_level > 0 && target_hp > 0.0) {
    if (active_ability_level(target, protocol::AbilityId::NullBind) > 0) {
      if (!emit_state_event(state, protocol::EventOpcode::Nullified, 2, actor.id, target.id,
          static_cast<u32>(protocol::AbilityId::NullBind), attack_type, timing, 1, 0, 0, 0, action_id)) return CombatResult::EventCapacity;
    } else {
      double random = 0.0; if (!bokemo::battle_state::consume_random(state, random)) return CombatResult::TapeExhausted;
      const double chance = result.hits * bind_numerator[bind_level >= 5 ? 4 : bind_level - 1] / 64.0;
      if (random < (chance > 1.0 ? 1.0 : chance)) {
        target.incapacitated = true;
        if (!emit_state_event(state, protocol::EventOpcode::StatusApplied, 2, actor.id, target.id,
            static_cast<u32>(protocol::AbilityId::Bind), attack_type, timing, 0, 1, 0, 0, action_id)) return CombatResult::EventCapacity;
      }
    }
  }
  return CombatResult::Ok;
}

CombatResult resolve_counter_checkpoint(const InputHeader& input, BattleStateCore& state,
                                        CombatantState& attacker, CombatantState& target,
                                        u32 profile_index, double applied_damage, int timing) {
  if (applied_damage <= 0.0 || (profile_index != 0 && profile_index != 2)) return CombatResult::Ok;
  const int counter_level = active_ability_level(target, protocol::AbilityId::Counter);
  if (counter_level <= 0) return CombatResult::Ok;
  if (target.side == Side::Enemy) {
    if (auto* nullifier = available_party_null_counter(state)) {
      return emit_counter_nullification(state, *nullifier, target, protocol::AbilityId::NullCounter,
          profile_index + 1, timing, static_cast<u32>(protocol::ActionId::Counter));
    }
  } else if (active_ability_level(attacker, protocol::AbilityId::NullCounter) > 0) {
    return emit_counter_nullification(state, attacker, target, protocol::AbilityId::NullCounter,
        profile_index + 1, timing, static_cast<u32>(protocol::ActionId::Counter));
  }
  auto counter = roll_reactive_strike(input, state, target, attacker, profile_index,
      reactive_profile_multiplier(counter_level, 2));
  auto status = emit_reactive_strike(state, target, attacker, profile_index + 1, timing,
      static_cast<u32>(protocol::ActionId::Counter), protocol::AbilityId::Counter, counter);
  if (status != CombatResult::Ok || (attacker.side == Side::Party ? state.party_hp : state.enemy_hp) <= 0.0) return status;
  const int re_counter_level = active_ability_level(attacker, protocol::AbilityId::ReCounter);
  if (re_counter_level <= 0) return CombatResult::Ok;
  if (attacker.side == Side::Enemy) {
    if (auto* nullifier = available_party_null_counter(state)) {
      return emit_counter_nullification(state, *nullifier, attacker, protocol::AbilityId::NullCounter,
          profile_index + 1, timing, static_cast<u32>(protocol::ActionId::ReCounter));
    }
  } else if (active_ability_level(target, protocol::AbilityId::NullCounter) > 0) {
    return emit_counter_nullification(state, target, attacker, protocol::AbilityId::NullCounter,
        profile_index + 1, timing, static_cast<u32>(protocol::ActionId::ReCounter));
  }
  auto re_counter = roll_reactive_strike(input, state, attacker, target, profile_index,
      reactive_profile_multiplier(re_counter_level, 3));
  return emit_reactive_strike(state, attacker, target, profile_index + 1, timing,
      static_cast<u32>(protocol::ActionId::ReCounter), protocol::AbilityId::ReCounter, re_counter);
}

// SpecRef: 6.1.3.2 | Chain move trigger | Re-attack, Counter, Re-counter,
// Magical counter, and Covering fire
// SpecRef: 6.1.2 | Function of battle | close-range reactive resolution
// SpecRef: 6.1.3.1 | Actor action | Resurrect and Reanimate recovery
CombatResult resolve_reactive_combat(const InputHeader& input, BattleStateCore& state) {
  constexpr u32 kCombatPhase = 2;
  constexpr u32 kPrevented = 1;
  if (!emit_state_event(state, protocol::EventOpcode::PhaseStarted, kCombatPhase, 0, 0, 0, 0, 49)) return CombatResult::EventCapacity;
  CombatantState* enemy = nullptr;
  CombatantState* parties[7]{}; u32 party_count = 0;
  for (int index = 0; index < state.combatant_count; ++index) {
    auto& combatant = state.combatants[index];
    if (combatant.side == Side::Enemy) enemy = &combatant;
    else parties[party_count++] = &combatant;
    const int null_counter = active_ability_level(combatant, protocol::AbilityId::NullCounter);
    combatant.counters = combatant.side == Side::Party && null_counter > 0
        ? static_cast<u32>(null_counter > 3 ? 3 : null_counter) : 0;
  }
  for (u32 index = 1; index < party_count; ++index) {
    auto* current = parties[index]; u32 cursor = index;
    while (cursor > 0 && current->row < parties[cursor - 1]->row) { parties[cursor] = parties[cursor - 1]; --cursor; }
    parties[cursor] = current;
  }
  if (!enemy) return CombatResult::TapeExhausted;

  auto apply_main_result = [&](CombatantState& actor, CombatantState& target, u32 profile_index,
                               int timing, u32 action_id, bool re_attack,
                               ReactiveStrikeResult& result) -> CombatResult {
    if (result.attempts == 0xffff'ffffu) return CombatResult::TapeExhausted;
    if (!emit_state_event(state, protocol::EventOpcode::TargetSelected, kCombatPhase, actor.id, target.id,
        0, profile_index + 1, timing, 0, 0, 0, 0, action_id)) return CombatResult::EventCapacity;
    state.events[state.event_count - 1].attempts = result.attempts;
    if (profile_index == 2 && !re_attack &&
        active_ability_level(target, protocol::AbilityId::Shock) > 0 && !target.shock_consumed) {
      target.shock_consumed = true;
      const bool blocked = active_ability_level(actor, protocol::AbilityId::NullShock) > 0;
      if (!blocked && result.hits > 1) { result.calculated = __builtin_floor(result.calculated / result.hits); result.hits = 1; }
      if (!emit_state_event(state, blocked ? protocol::EventOpcode::Nullified : protocol::EventOpcode::StatusApplied,
          kCombatPhase, target.id, actor.id, static_cast<u32>(blocked ? protocol::AbilityId::NullShock : protocol::AbilityId::Shock),
          profile_index + 1, timing, blocked ? 1u : 0u, result.hits, result.calculated, 0, action_id)) return CombatResult::EventCapacity;
    }
    const Reaction reaction = defensive_reaction(actor, target, profile_index);
    double remaining = result.calculated, absorbed = 0.0, reflected = 0.0;
    if (reaction.kind == 1) { absorbed = result.calculated > 0.0 ? __builtin_floor(result.calculated * reaction.amplifier) : 0.0; if (result.calculated > 0.0 && absorbed < 1.0) absorbed = 1.0; remaining = 0.0; }
    else if (reaction.kind == 2) remaining = 0.0;
    else if (reaction.kind == 3) {
      remaining = __builtin_floor(result.calculated * (1.0 - reaction.amplifier));
      const u32 family = profile_index == 1 ? 1 : 0;
      double defense = actor.profile.defense_amplifier[family]; if (defense < 0.01) defense = 0.01;
      reflected = __builtin_floor(result.calculated * reaction.amplifier * defense * elemental_resistance(actor, actor.profile.elemental_offense));
      if (result.calculated > 0.0 && reflected < 1.0) reflected = 1.0;
    }
    result.applied = apply_checkpoint_damage(state, target, remaining);
    if (target.side == Side::Enemy && result.applied > 0.0) target.enemy_hits_received += result.hits;
    if (absorbed > 0.0) {
      const double healed = apply_checkpoint_heal(state, target, absorbed);
      if (!emit_state_event(state, protocol::EventOpcode::Absorbed, kCombatPhase, target.id, actor.id,
          static_cast<u32>(reaction.ability), profile_index + 1, timing, 0, absorbed, result.calculated, healed, action_id) ||
          !emit_state_event(state, protocol::EventOpcode::Heal, kCombatPhase, target.id, target.id,
          static_cast<u32>(reaction.ability), profile_index + 1, timing, 0, healed, absorbed, 0, action_id)) return CombatResult::EventCapacity;
    } else if (reaction.kind == 2) {
      if (!emit_state_event(state, protocol::EventOpcode::Nullified, kCombatPhase, target.id, actor.id,
          static_cast<u32>(reaction.ability), profile_index + 1, timing, kPrevented, 0, result.calculated, 0, action_id)) return CombatResult::EventCapacity;
    } else if (reaction.kind == 3) {
      const double reflected_applied = apply_checkpoint_damage(state, actor, reflected);
      if (!emit_state_event(state, protocol::EventOpcode::Reflected, kCombatPhase, target.id, actor.id,
          static_cast<u32>(reaction.ability), profile_index + 1, timing, 0, reflected_applied, result.calculated, remaining, action_id) ||
          !emit_state_event(state, protocol::EventOpcode::Damage, kCombatPhase, target.id, actor.id,
          static_cast<u32>(reaction.ability), profile_index + 1, timing, 0, reflected_applied, reflected, 0, action_id)) return CombatResult::EventCapacity;
      const auto recovered = recover_checkpoint_target(state, actor, profile_index + 1, timing, action_id);
      if (recovered != CombatResult::Ok) return recovered;
    }
    if (!emit_state_event(state, protocol::EventOpcode::Attack, kCombatPhase, actor.id, target.id, 0,
        profile_index + 1, timing, reaction.kind ? kPrevented : 0, result.applied, result.calculated, absorbed, action_id) ||
        !emit_state_event(state, protocol::EventOpcode::Damage, kCombatPhase, actor.id, target.id, 0,
        profile_index + 1, timing, reaction.kind ? kPrevented : 0, result.applied, result.calculated, 0, action_id)) return CombatResult::EventCapacity;
    state.events[state.event_count - 2].attempts = result.attempts; state.events[state.event_count - 2].hits = result.hits;
    state.events[state.event_count - 1].attempts = result.attempts; state.events[state.event_count - 1].hits = result.hits;
    auto recovered = recover_checkpoint_target(state, target, profile_index + 1, timing, action_id);
    if (recovered != CombatResult::Ok) return recovered;
    if (result.hits > 0 && target.recovery.reanimate_consumed &&
        active_ability_level(actor, protocol::AbilityId::Requiem) > 0 &&
        (target.side == Side::Party ? state.party_hp : state.enemy_hp) > 0.0) {
      const bool blocked = active_ability_level(target, protocol::AbilityId::NullRequiem) > 0;
      if (!emit_state_event(state, blocked ? protocol::EventOpcode::Nullified : protocol::EventOpcode::AbilityActivated,
          kCombatPhase, actor.id, target.id, static_cast<u32>(blocked ? protocol::AbilityId::NullRequiem : protocol::AbilityId::Requiem),
          profile_index + 1, timing, blocked ? 1u : 0u, 0, 0, 0, action_id)) return CombatResult::EventCapacity;
      if (!blocked) {
        const double lethal = target.side == Side::Party ? state.party_hp : state.enemy_hp;
        apply_checkpoint_damage(state, target, lethal);
        if (!emit_state_event(state, protocol::EventOpcode::Damage, kCombatPhase, actor.id, target.id,
            static_cast<u32>(protocol::AbilityId::Requiem), profile_index + 1, timing, 0, lethal, lethal, 0, action_id)) return CombatResult::EventCapacity;
      }
    }
    if (profile_index == 2) {
      recovered = apply_close_checkpoint(input, state, actor, target, result, profile_index + 1, timing, action_id);
      if (recovered != CombatResult::Ok) return recovered;
    }
    return resolve_counter_checkpoint(input, state, actor, target, profile_index, result.applied, timing);
  };

  for (int timing = 49; timing >= 0 && state.party_hp > 0.0 && state.enemy_hp > 0.0; --timing) {
    state.scheduler.next_timing = timing;
    for (u32 action_index = 0; action_index < state.action_count && state.party_hp > 0.0 && state.enemy_hp > 0.0; ++action_index) {
      auto& action = state.actions[action_index];
      if (action.acted || action.timing != timing) continue;
      action.acted = true;
      auto* actor = bokemo::battle_state::find(state, action.actor_id);
      if (!actor) return CombatResult::TapeExhausted;
      if (state.scheduler.first_actor_id == 0) state.scheduler.first_actor_id = actor->id;
      if (actor->incapacitated) {
        actor->incapacitated = false; actor->acted = true;
        if (!emit_state_event(state, protocol::EventOpcode::ActionSkipped, kCombatPhase, actor->id, actor->id,
            static_cast<u32>(protocol::AbilityId::Bind), action.attack_type, timing, kPrevented, 0, 0, 0,
            static_cast<u32>(protocol::ActionId::NormalAttack))) return CombatResult::EventCapacity;
        continue;
      }
      if (active_ability_level(*actor, protocol::AbilityId::NoOffense) > 0) { actor->acted = true; continue; }
      actor->acted = true;
      const u32 profile_index = action.attack_type - 1;
      if (input.terrain_id == static_cast<u16>(protocol::TerrainId::EchoDomain) && actor->profile.elemental_offense != 0 &&
          active_ability_level(*actor, protocol::AbilityId::DomainBreaker) == 0) ++state.echo_elemental_use[actor->profile.elemental_offense];
      const int re_level = active_ability_level(*actor, protocol::AbilityId::ReAttack);
      const u32 repeats = re_level > 0 ? 2 : 1;
      CombatantState* magical_counter_targets[7]{}; u32 magical_counter_count = 0;
      for (u32 repeat = 0; repeat < repeats && state.party_hp > 0.0 && state.enemy_hp > 0.0; ++repeat) {
        const bool re_attack = repeat > 0;
        const double multiplier = re_attack ? reactive_profile_multiplier(re_level, 1) : 1.0;
        const u32 action_id = re_attack ? static_cast<u32>(protocol::ActionId::ReAttack)
            : static_cast<u32>(protocol::ActionId::NormalAttack);
        if (profile_index == 1 && state.magic_seal_cursor < state.magic_seal_count) {
          const u32 owner = state.magic_seal_owners[state.magic_seal_cursor++];
          if (!emit_state_event(state, protocol::EventOpcode::Nullified, kCombatPhase, owner, actor->id,
              static_cast<u32>(protocol::AbilityId::MagicSeal), action.attack_type, timing, kPrevented, 0, 0, 0, action_id)) return CombatResult::EventCapacity;
          continue;
        }
        if (actor->side == Side::Party) {
          auto result = roll_reactive_strike(input, state, *actor, *enemy, profile_index, multiplier);
          auto status = apply_main_result(*actor, *enemy, profile_index, timing, action_id, re_attack, result);
          if (status != CombatResult::Ok) return status;
          CombatantState* lethal_terrain_target = nullptr;
          status = emit_immediate_terrain(input, state, *actor, profile_index, timing,
              result.applied, enemy, &lethal_terrain_target);
          if (status != CombatResult::Ok) return status;
          if (lethal_terrain_target) {
            status = recover_checkpoint_target(state, *lethal_terrain_target, profile_index + 1,
                timing, static_cast<u32>(protocol::ActionId::TerrainDamage));
            if (status != CombatResult::Ok) return status;
          }
          if (profile_index == 2 && result.hits == 1 && state.party_hp > 0.0 && state.enemy_hp > 0.0) {
            for (u32 owner_index = 0; owner_index < party_count && state.enemy_hp > 0.0; ++owner_index) {
              auto* owner = parties[owner_index];
              if (owner->id == actor->id) continue;
              const int level = active_ability_level(*owner, protocol::AbilityId::CoveringFire);
              if (level <= 0) continue;
              auto covering = roll_reactive_strike(input, state, *owner, *enemy, 0, reactive_profile_multiplier(level, 3));
              status = emit_reactive_strike(state, *owner, *enemy, 1, timing,
                  static_cast<u32>(protocol::ActionId::CoveringFire), protocol::AbilityId::CoveringFire, covering);
              if (status != CombatResult::Ok) return status;
            }
          }
        } else {
          const double raw = __builtin_ceil(action_noa(*actor, profile_index) * multiplier * terrain_noa_multiplier(input, *actor, profile_index));
          if (raw <= 0.0) continue;
          if (raw > 0xffff'ffffull) return CombatResult::TapeExhausted;
          struct Group { CombatantState* target = nullptr; ReactiveStrikeResult result{}; } groups[7]{};
          u32 group_count = 0;
          for (u32 attempt = 0; attempt < static_cast<u32>(raw); ++attempt) {
            auto* bag = profile_index == 1 ? state.magical_bag : state.physical_bag;
            const u32 count = profile_index == 1 ? state.magical_bag_count : state.physical_bag_count;
            u64 total = 0; for (u32 index = 0; index < count; ++index) total += bag[index].tickets;
            double random = 0.0; if (!bokemo::battle_state::consume_random(state, random)) return CombatResult::TapeExhausted;
            const u64 roll = static_cast<u64>(random * total) + 1; u64 cumulative = 0; u32 row = 0;
            for (u32 index = 0; index < count; ++index) { cumulative += bag[index].tickets; if (bag[index].tickets > 0 && roll <= cumulative) { row = bag[index].id; --bag[index].tickets; break; } }
            bool fallback = false; auto* target = row_target(state, row, profile_index, *actor, false, fallback);
            if (!target) return CombatResult::TapeExhausted;
            if (!emit_state_event(state, protocol::EventOpcode::TargetSelected, kCombatPhase, actor->id, target->id,
                0, profile_index + 1, timing, 0, 0, 0, 0, action_id)) return CombatResult::EventCapacity;
            state.events[state.event_count - 1].attempts = 1;
            u32 group = 0; while (group < group_count && groups[group].target != target) ++group;
            if (group == group_count) groups[group_count++].target = target;
            auto one = roll_reactive_strike(input, state, *actor, *target, profile_index,
                1.0 / (action_noa(*actor, profile_index) * terrain_noa_multiplier(input, *actor, profile_index)));
            if (one.attempts == 0xffff'ffffu) return CombatResult::TapeExhausted;
            groups[group].result.attempts += 1;
            groups[group].result.hits += one.hits;
            groups[group].result.calculated += one.calculated;
          }
          double repeat_damage = 0.0;
          CombatantState* first_target = group_count > 0 ? groups[0].target : nullptr;
          for (u32 group = 0; group < group_count && state.party_hp > 0.0 && state.enemy_hp > 0.0; ++group) {
            auto status = apply_main_result(*actor, *groups[group].target, profile_index, timing, action_id, re_attack, groups[group].result);
            if (status != CombatResult::Ok) return status;
            repeat_damage += groups[group].result.applied;
            if (profile_index == 1 && groups[group].result.applied > 0.0 &&
                active_ability_level(*groups[group].target, protocol::AbilityId::MagicalCounter) > 0) {
              bool present = false; for (u32 index = 0; index < magical_counter_count; ++index) if (magical_counter_targets[index] == groups[group].target) present = true;
              if (!present) magical_counter_targets[magical_counter_count++] = groups[group].target;
            }
          }
          CombatantState* lethal_terrain_target = nullptr;
          auto terrain_status = emit_immediate_terrain(input, state, *actor, profile_index, timing,
              repeat_damage, first_target, &lethal_terrain_target);
          if (terrain_status != CombatResult::Ok) return terrain_status;
          if (lethal_terrain_target) {
            terrain_status = recover_checkpoint_target(state, *lethal_terrain_target, profile_index + 1,
                timing, static_cast<u32>(protocol::ActionId::TerrainDamage));
            if (terrain_status != CombatResult::Ok) return terrain_status;
          }
        }
      }
      if (actor->side == Side::Enemy && profile_index == 1 && active_ability_level(*enemy, protocol::AbilityId::NullCounter) == 0) {
        for (u32 owner_index = 0; owner_index < party_count && state.enemy_hp > 0.0 && state.party_hp > 0.0; ++owner_index) {
          auto* owner = parties[owner_index];
          bool eligible = false; for (u32 index = 0; index < magical_counter_count; ++index) if (magical_counter_targets[index] == owner) eligible = true;
          if (!eligible) continue;
          const int level = active_ability_level(*owner, protocol::AbilityId::MagicalCounter);
          auto counter = roll_reactive_strike(input, state, *owner, *enemy, 1, reactive_profile_multiplier(level, 3));
          const auto status = emit_reactive_strike(state, *owner, *enemy, 2, timing,
              static_cast<u32>(protocol::ActionId::MagicalCounter), protocol::AbilityId::MagicalCounter, counter);
          if (status != CombatResult::Ok) return status;
        }
      }
    }
  }
  if (!emit_state_event(state, protocol::EventOpcode::PhaseEnded, kCombatPhase, 0, 0, 0, 0, 0)) return CombatResult::EventCapacity;
  return CombatResult::Ok;
}
}  // namespace

extern "C" {

unsigned char* battle_protocol_input_arena() { return input_arena; }
unsigned char* battle_protocol_output_arena() { return output_arena; }
u32 battle_protocol_arena_capacity() { return protocol::kArenaCapacity; }
u16 battle_protocol_version() { return protocol::kVersion; }

int battle_protocol_validate_input(u32 byte_length) {
  if (byte_length < sizeof(InputHeader) || byte_length > protocol::kArenaCapacity) return -1;
  const auto* header = reinterpret_cast<const InputHeader*>(input_arena);
  if (header->magic != protocol::kInputMagic) return -2;
  if (header->version != protocol::kVersion || header->header_size != sizeof(InputHeader)) return -3;
  if (header->total_size != byte_length) return -4;
  if (header->terrain_id > protocol::kTerrainCount) return -5;
  if (header->deity_id > protocol::kDeityCount) return -17;
  if (header->combatant_count == 0 || header->combatant_count > bokemo::battle_state::kMaxCombatants) return -18;
  if (header->random_count > bokemo::battle_state::kMaxRandomTape) return -19;
  if (header->physical_bag_count > bokemo::battle_state::kMaxThreatBagEntries ||
      header->magical_bag_count > bokemo::battle_state::kMaxThreatBagEntries) return -20;
  if (!finite(header->party_hp) || !finite(header->party_max_hp) || !finite(header->enemy_hp) || !finite(header->enemy_max_hp) ||
      header->party_hp < 0.0 || header->enemy_hp < 0.0 || header->party_max_hp < header->party_hp ||
      header->enemy_max_hp < header->enemy_hp) return -21;
  const u64 expected_combatants_offset = sizeof(InputHeader);
  const u64 expected_abilities_offset = expected_combatants_offset + static_cast<u64>(header->combatant_count) * sizeof(CombatantRecord);
  const u64 expected_random_offset = expected_abilities_offset + static_cast<u64>(header->ability_count) * sizeof(AbilityRecord);
  const u64 expected_physical_bag_offset = expected_random_offset + static_cast<u64>(header->random_count) * sizeof(double);
  const u64 expected_magical_bag_offset = expected_physical_bag_offset + static_cast<u64>(header->physical_bag_count) * sizeof(BagRecord);
  const u64 expected_total_size = expected_magical_bag_offset + static_cast<u64>(header->magical_bag_count) * sizeof(BagRecord);
  if (header->combatants_offset != expected_combatants_offset ||
      header->abilities_offset != expected_abilities_offset ||
      header->random_offset != expected_random_offset ||
      header->physical_bag_offset != expected_physical_bag_offset ||
      header->magical_bag_offset != expected_magical_bag_offset ||
      header->total_size != expected_total_size) return -15;
  if (!span_is_valid(header->combatants_offset, header->combatant_count, sizeof(CombatantRecord), byte_length)) return -6;
  if (!span_is_valid(header->abilities_offset, header->ability_count, sizeof(AbilityRecord), byte_length)) return -7;
  if (!span_is_valid(header->random_offset, header->random_count, sizeof(double), byte_length)) return -8;
  if (!span_is_valid(header->physical_bag_offset, header->physical_bag_count, sizeof(BagRecord), byte_length)) return -12;
  if (!span_is_valid(header->magical_bag_offset, header->magical_bag_count, sizeof(BagRecord), byte_length)) return -13;

  const auto* combatants = reinterpret_cast<const CombatantRecord*>(input_arena + header->combatants_offset);
  const auto* abilities = reinterpret_cast<const AbilityRecord*>(input_arena + header->abilities_offset);
  u32 expected_ability_start = 0;
  for (u32 index = 0; index < header->combatant_count; ++index) {
    const auto& combatant = combatants[index];
    if (combatant.id == 0 || combatant.kind < 1 || combatant.kind > 2 || combatant.elemental_offense > 3 ||
        combatant.magic_style > 4 || !combatant_numbers_are_valid(combatant)) return -9;
    if (combatant.ability_start != expected_ability_start || static_cast<u64>(combatant.ability_start) + combatant.ability_count > header->ability_count) return -10;
    for (u32 ability_index = combatant.ability_start; ability_index < combatant.ability_start + combatant.ability_count; ++ability_index) {
      if (abilities[ability_index].owner_id != combatant.id) return -10;
    }
    expected_ability_start += combatant.ability_count;
  }
  if (expected_ability_start != header->ability_count) return -10;
  for (u32 index = 0; index < header->ability_count; ++index) {
    if (abilities[index].id == 0 || abilities[index].id > protocol::kAbilityCount) return -11;
  }
  const auto* random_values = reinterpret_cast<const double*>(input_arena + header->random_offset);
  for (u32 index = 0; index < header->random_count; ++index) {
    if (!finite(random_values[index]) || random_values[index] < 0.0 || random_values[index] >= 1.0) return -22;
  }
  return 0;
}

int battle_protocol_probe(u32 byte_length) {
  const int validation = battle_protocol_validate_input(byte_length);
  if (validation != 0) return validation;
  const auto* input = reinterpret_cast<const InputHeader*>(input_arena);
  auto* output = reinterpret_cast<OutputHeader*>(output_arena);
  auto* event = reinterpret_cast<EventRecord*>(output_arena + sizeof(OutputHeader));
  const auto* input_physical_bag = reinterpret_cast<const BagRecord*>(input_arena + input->physical_bag_offset);
  const auto* input_magical_bag = reinterpret_cast<const BagRecord*>(input_arena + input->magical_bag_offset);
  auto* output_physical_bag = reinterpret_cast<BagRecord*>(output_arena + sizeof(OutputHeader) + sizeof(EventRecord));
  auto* output_magical_bag = output_physical_bag + input->physical_bag_count;
  *output = {};
  *event = {};
  output->magic = protocol::kOutputMagic;
  output->version = protocol::kVersion;
  output->header_size = sizeof(OutputHeader);
  output->total_size = sizeof(OutputHeader) + sizeof(EventRecord) +
      (input->physical_bag_count + input->magical_bag_count) * sizeof(BagRecord);
  if (output->total_size > protocol::kArenaCapacity) return -14;
  output->event_count = 1;
  output->events_offset = sizeof(OutputHeader);
  output->physical_bag_count = input->physical_bag_count;
  output->physical_bag_offset = sizeof(OutputHeader) + sizeof(EventRecord);
  output->magical_bag_count = input->magical_bag_count;
  output->magical_bag_offset = output->physical_bag_offset + input->physical_bag_count * sizeof(BagRecord);
  output->random_consumed = 0;
  output->party_hp = input->party_hp;
  output->enemy_hp = input->enemy_hp;
  output->rng_version = input->rng_version;
  output->seed_low = input->seed_low;
  output->seed_high = input->seed_high;
  event->opcode = static_cast<u16>(protocol::EventOpcode::ProtocolReady);
  for (u32 index = 0; index < input->physical_bag_count; ++index) output_physical_bag[index] = input_physical_bag[index];
  for (u32 index = 0; index < input->magical_bag_count; ++index) output_magical_bag[index] = input_magical_bag[index];
  return static_cast<int>(output->total_size);
}

int battle_protocol_transform_abilities(u32 byte_length) {
  const int validation = battle_protocol_validate_input(byte_length);
  if (validation != 0) return validation;
  const auto* input = reinterpret_cast<const InputHeader*>(input_arena);
  const auto* combatants = reinterpret_cast<const CombatantRecord*>(input_arena + input->combatants_offset);
  const auto* abilities = reinterpret_cast<const AbilityRecord*>(input_arena + input->abilities_offset);
  auto* output = reinterpret_cast<OutputHeader*>(output_arena);
  auto* events = reinterpret_cast<EventRecord*>(output_arena + sizeof(OutputHeader));
  u32 event_count = 0;
  for (u32 combatant_index = 0; combatant_index < input->combatant_count; ++combatant_index) {
    const auto& combatant = combatants[combatant_index];
    for (u32 ability_index = combatant.ability_start; ability_index < combatant.ability_start + combatant.ability_count; ++ability_index) {
      const auto& ability = abilities[ability_index];
      const auto id = static_cast<protocol::AbilityId>(ability.id);
      const u8 prepared_level = prepared_ability_level(*input, combatant, abilities, id);
      if (prepared_level == ability.level) continue;
      if (sizeof(OutputHeader) + (event_count + 1) * sizeof(EventRecord) > protocol::kArenaCapacity) return -14;
      auto& event = events[event_count++];
      event = {};
      event.opcode = static_cast<u16>(protocol::EventOpcode::AbilityActivated);
      event.phase = 1;
      event.actor_kind = combatant.kind;
      event.actor_id = combatant.id;
      event.ability_id = ability.id;
      event.flags = 1;
      event.value0 = ability.level;
      event.value1 = prepared_level;
    }
  }
  initialize_output(*input, output, event_count, 0);
  return static_cast<int>(output->total_size);
}

int battle_protocol_initiative_random_count(u32 byte_length) {
  const int validation = battle_protocol_validate_input(byte_length);
  if (validation != 0) return validation;
  const auto* input = reinterpret_cast<const InputHeader*>(input_arena);
  const auto* combatants = reinterpret_cast<const CombatantRecord*>(input_arena + input->combatants_offset);
  const auto* abilities = reinterpret_cast<const AbilityRecord*>(input_arena + input->abilities_offset);
  return static_cast<int>(count_initiative_randoms(*input, combatants, abilities));
}

int battle_protocol_prepare_initiative(u32 byte_length) {
  const int validation = battle_protocol_validate_input(byte_length);
  if (validation != 0) return validation;
  const auto* input = reinterpret_cast<const InputHeader*>(input_arena);
  const auto* combatants = reinterpret_cast<const CombatantRecord*>(input_arena + input->combatants_offset);
  const auto* abilities = reinterpret_cast<const AbilityRecord*>(input_arena + input->abilities_offset);
  const auto* random_values = reinterpret_cast<const double*>(input_arena + input->random_offset);
  const u32 required_randoms = count_initiative_randoms(*input, combatants, abilities);
  if (input->random_count != required_randoms) return -16;

  u32 action_count = 0;
  for (u8 attack_type = 1; attack_type <= 3; ++attack_type) {
    for (u32 index = 0; index < input->combatant_count; ++index) {
      if (combatant_attack(combatants[index], attack_type) > 0 && combatant_noa(combatants[index], attack_type) > 0) ++action_count;
    }
  }
  if (sizeof(OutputHeader) + action_count * sizeof(EventRecord) > protocol::kArenaCapacity) return -14;
  auto* output = reinterpret_cast<OutputHeader*>(output_arena);
  auto* events = reinterpret_cast<EventRecord*>(output_arena + sizeof(OutputHeader));
  u32 random_cursor = 0;
  u32 event_cursor = 0;

  bool party_has_frostbite = false;
  bool enemy_has_frostbite = false;
  for (u32 index = 0; index < input->combatant_count; ++index) {
    if (abilities_suppressed(*input, combatants[index], abilities)) continue;
    if (prepared_ability_level(*input, combatants[index], abilities, protocol::AbilityId::Frostbite) == 0) continue;
    if (combatants[index].kind == 1) party_has_frostbite = true;
    if (combatants[index].kind == 2) enemy_has_frostbite = true;
  }

  for (u8 attack_type = 1; attack_type <= 3; ++attack_type) {
    for (u32 index = 0; index < input->combatant_count; ++index) {
      const auto& combatant = combatants[index];
      if (combatant_attack(combatant, attack_type) <= 0 || combatant_noa(combatant, attack_type) <= 0) continue;
      const bool machine_logic = input->terrain_id == static_cast<u16>(protocol::TerrainId::MachineLogic);
      const u32 dice_count = initiative_dice_count(*input, combatant, abilities, attack_type);
      const u32 terrain_dice = !machine_logic && input->terrain_id == static_cast<u16>(protocol::TerrainId::Tailwind) && combatant.kind == 1
          ? (prepared_ability_level(*input, combatant, abilities, protocol::AbilityId::WindRider) > 0 ? 2 : 1)
          : !machine_logic && input->terrain_id == static_cast<u16>(protocol::TerrainId::EnemyHighGround) && combatant.kind == 2 ? 1 : 0;
      int result = 0;
      for (u32 die = 0; die < dice_count - terrain_dice; ++die) {
        result += static_cast<int>(random_values[random_cursor++] * 3.0) + 1;
      }
      if (result > 49) result = 49;
      if (!machine_logic && combatant.kind == 1 && (input->flags & kInputFlagFertilityInitiative) != 0 &&
          input->terrain_id != static_cast<u16>(protocol::TerrainId::Gehenna)) result = result + 1 > 49 ? 49 : result + 1;
      const int slow = prepared_ability_level(*input, combatant, abilities, protocol::AbilityId::Slow);
      const int boost = prepared_ability_level(*input, combatant, abilities, protocol::AbilityId::Boost);
      if (!machine_logic && slow > 0) result = result - slow < 1 ? 1 : result - slow;
      if (!machine_logic && boost > 0) result = result + boost > 49 ? 49 : result + boost;
      const bool coldproof = prepared_ability_level(*input, combatant, abilities, protocol::AbilityId::Coldproof) > 0;
      const bool frostbite_penalty = combatant.kind == 1 ? enemy_has_frostbite : party_has_frostbite;
      if (!machine_logic && frostbite_penalty && !coldproof) result = result - 1 < 1 ? 1 : result - 1;
      for (u32 die = 0; die < terrain_dice; ++die) {
        result += static_cast<int>(random_values[random_cursor++] * 3.0) + 1;
        if (result > 49) result = 49;
      }

      auto& event = events[event_cursor++];
      event = {};
      event.opcode = static_cast<u16>(protocol::EventOpcode::Initiative);
      event.phase = 2;
      event.actor_kind = combatant.kind;
      event.actor_id = combatant.id;
      event.attack_type = attack_type;
      event.timing = result;
      event.aux1 = index;
      event.aux2 = combatant.row;
    }
  }

  for (u32 index = 1; index < action_count; ++index) {
    const EventRecord current = events[index];
    u32 cursor = index;
    while (cursor > 0 && initiative_event_precedes(current, events[cursor - 1])) {
      events[cursor] = events[cursor - 1];
      --cursor;
    }
    events[cursor] = current;
  }
  for (u32 index = 0; index < action_count; ++index) events[index].aux0 = index;
  initialize_output(*input, output, action_count, random_cursor);
  return static_cast<int>(output->total_size);
}

// SpecRef: 6.1.8 | Universal C++ battle kernel | protocol v3 full-battle execution
int battle_protocol_execute(u32 byte_length) {
  using namespace bokemo::battle_state;
  const int validation = battle_protocol_validate_input(byte_length);
  if (validation != 0) return validation;
  const auto* input = reinterpret_cast<const InputHeader*>(input_arena);
  const auto* records = reinterpret_cast<const CombatantRecord*>(input_arena + input->combatants_offset);
  const auto* abilities = reinterpret_cast<const AbilityRecord*>(input_arena + input->abilities_offset);
  const auto* random_values = reinterpret_cast<const double*>(input_arena + input->random_offset);
  const auto* physical_bag = reinterpret_cast<const BagRecord*>(input_arena + input->physical_bag_offset);
  const auto* magical_bag = reinterpret_cast<const BagRecord*>(input_arena + input->magical_bag_offset);
  const bool start_checkpoint = (input->engine_flags & protocol::kEngineFlagStartCheckpoint) != 0;
  const bool combat_checkpoint = (input->engine_flags & protocol::kEngineFlagCombatBaseCheckpoint) != 0;
  const bool normal_checkpoint = (input->engine_flags & protocol::kEngineFlagCombatNormalCheckpoint) != 0;
  const bool reactive_checkpoint = (input->engine_flags & protocol::kEngineFlagCombatReactiveCheckpoint) != 0;
  if ((start_checkpoint ? 1 : 0) + (combat_checkpoint ? 1 : 0) + (normal_checkpoint ? 1 : 0) +
      (reactive_checkpoint ? 1 : 0) > 1) {
    return initialize_error_output(*input, protocol::ProtocolError::UnsupportedCombatFeature);
  }
  if (combat_checkpoint && !base_combat_domain_is_supported(*input, records, physical_bag, magical_bag)) {
    return initialize_error_output(*input, protocol::ProtocolError::UnsupportedCombatFeature);
  }
  if (normal_checkpoint && !normal_combat_domain_is_supported(*input, records, abilities, physical_bag, magical_bag)) {
    return initialize_error_output(*input, protocol::ProtocolError::UnsupportedCombatFeature);
  }
  if (reactive_checkpoint && !reactive_combat_domain_is_supported(*input, records, abilities, physical_bag, magical_bag)) {
    return initialize_error_output(*input, protocol::ProtocolError::UnsupportedCombatFeature);
  }
  alignas(BattleStateCore) static unsigned char state_storage[sizeof(BattleStateCore)];
  BattleStateCore& state = *reinterpret_cast<BattleStateCore*>(state_storage);
  reset(state);
  state.party_hp = input->party_hp;
  state.party_max_hp = input->party_max_hp;
  state.enemy_hp = input->enemy_hp;
  state.enemy_max_hp = input->enemy_max_hp;
  state.physical_bag_count = input->physical_bag_count;
  state.magical_bag_count = input->magical_bag_count;
  for (u32 index = 0; index < input->physical_bag_count; ++index) state.physical_bag[index] = {physical_bag[index].id, physical_bag[index].tickets};
  for (u32 index = 0; index < input->magical_bag_count; ++index) state.magical_bag[index] = {magical_bag[index].id, magical_bag[index].tickets};
  if (combat_checkpoint || normal_checkpoint || reactive_checkpoint) {
    auto sort_bag = [](ThreatBagEntry* bag, u32 count) {
      for (u32 index = 1; index < count; ++index) {
        const ThreatBagEntry current = bag[index];
        u32 cursor = index;
        while (cursor > 0 && current.id < bag[cursor - 1].id) { bag[cursor] = bag[cursor - 1]; --cursor; }
        bag[cursor] = current;
      }
    };
    sort_bag(state.physical_bag, state.physical_bag_count);
    sort_bag(state.magical_bag, state.magical_bag_count);
  }
  for (u32 index = 0; index < input->random_count; ++index) if (!append_random(state, random_values[index])) return initialize_error_output(*input, protocol::ProtocolError::RandomCapacity);

  for (u32 index = 0; index < input->combatant_count; ++index) {
    const auto& source = records[index];
    if (!add_combatant(state, source.id, source.kind == 1 ? Side::Party : Side::Enemy, source.row, source.hp, source.max_hp)) return -25;
    CombatantState& target = state.combatants[state.combatant_count - 1];
    target.status_flags = source.flags;
    target.attacks = {source.ranged_attack, source.magical_attack, source.melee_attack,
      source.ranged_noa, source.magical_noa, source.melee_noa,
      source.original_ranged_noa, source.original_magical_noa, source.original_melee_noa};
    target.profile.physical_defense = source.physical_defense;
    target.profile.magical_defense = source.magical_defense;
    target.profile.accuracy_potency[0] = source.ranged_accuracy_potency;
    target.profile.accuracy_potency[1] = source.magical_accuracy_potency;
    target.profile.accuracy_potency[2] = source.melee_accuracy_potency;
    target.profile.accuracy_bonus = source.accuracy_bonus;
    target.profile.evasion_bonus = source.evasion_bonus;
    target.profile.penetration[0] = source.physical_penetration;
    target.profile.penetration[1] = source.magical_penetration;
    target.profile.elemental_resistance[0] = source.fire_resistance;
    target.profile.elemental_resistance[1] = source.thunder_resistance;
    target.profile.elemental_resistance[2] = source.ice_resistance;
    target.profile.offense_amplifier[0] = source.physical_offense_amplifier;
    target.profile.offense_amplifier[1] = source.magical_offense_amplifier;
    target.profile.defense_amplifier[0] = source.physical_defense_amplifier;
    target.profile.defense_amplifier[1] = source.magical_defense_amplifier;
    target.profile.phase_bonus[0] = source.start_phase_bonus;
    target.profile.phase_bonus[1] = source.combat_phase_bonus;
    target.profile.phase_bonus[2] = source.end_phase_bonus;
    target.profile.deity_bonus[0] = source.deity_offense_bonus;
    target.profile.deity_bonus[1] = source.deity_physical_defense_bonus;
    target.profile.deity_bonus[2] = source.deity_magical_defense_bonus;
    target.profile.deity_bonus[3] = source.deity_accuracy_bonus;
    target.profile.enemy_attack_amplifier[0] = source.enemy_ranged_amplifier;
    target.profile.enemy_attack_amplifier[1] = source.enemy_magical_amplifier;
    target.profile.enemy_attack_amplifier[2] = source.enemy_melee_amplifier;
    target.profile.attack_bonus[0] = source.ranged_attack_bonus;
    target.profile.attack_bonus[1] = source.magical_attack_bonus;
    target.profile.attack_bonus[2] = source.melee_attack_bonus;
    target.profile.elemental_offense = source.elemental_offense;
    target.profile.magic_style = source.magic_style;
    target.profile.elemental_offense_value = source.elemental_offense_value;
    for (u32 ability_index = source.ability_start; ability_index < source.ability_start + source.ability_count; ++ability_index) {
      if (!set_ability(target, abilities[ability_index].id, abilities[ability_index].level)) return initialize_error_output(*input, protocol::ProtocolError::AbilityCapacity);
    }
  }

  auto emit = [&](protocol::EventOpcode opcode, u32 phase, u32 actor, u32 target, u32 ability, u32 attack_type,
                  int timing, u32 hits, u32 attempts, double value0, double value1 = 0.0, double value2 = 0.0) -> bool {
    if (!append_event(state, static_cast<u32>(opcode), actor, target, value0)) return false;
    SemanticEvent& event = state.events[state.event_count - 1];
    event.phase = phase; event.ability_id = ability; event.attack_type = attack_type; event.timing = timing;
    event.hits = hits; event.attempts = attempts; event.value1 = value1; event.value2 = value2;
    return true;
  };
  if (start_checkpoint || combat_checkpoint || normal_checkpoint || reactive_checkpoint) {
    const StartResult start_result = resolve_start_checkpoint(*input, state);
    if (start_result != StartResult::Ok) {
      const protocol::ProtocolError error = start_result == StartResult::TapeExhausted ? protocol::ProtocolError::TapeExhausted
          : start_result == StartResult::AbilityCapacity ? protocol::ProtocolError::AbilityCapacity
          : start_result == StartResult::ActionCapacity ? protocol::ProtocolError::ActionCapacity
          : protocol::ProtocolError::EventCapacity;
      return initialize_error_output_at_cursor(*input, error, state.random_cursor);
    }
    if (combat_checkpoint) {
      const CombatResult combat_result = resolve_base_combat(state);
      if (combat_result != CombatResult::Ok) {
        const protocol::ProtocolError error = combat_result == CombatResult::TapeExhausted
            ? protocol::ProtocolError::TapeExhausted : protocol::ProtocolError::EventCapacity;
        return initialize_error_output_at_cursor(*input, error, state.random_cursor);
      }
    }
    if (normal_checkpoint) {
      const CombatResult combat_result = resolve_normal_combat(*input, state);
      if (combat_result != CombatResult::Ok) {
        const protocol::ProtocolError error = combat_result == CombatResult::TapeExhausted
            ? protocol::ProtocolError::TapeExhausted : protocol::ProtocolError::EventCapacity;
        return initialize_error_output_at_cursor(*input, error, state.random_cursor);
      }
    }
    if (reactive_checkpoint) {
      const CombatResult combat_result = resolve_reactive_combat(*input, state);
      if (combat_result != CombatResult::Ok) {
        const protocol::ProtocolError error = combat_result == CombatResult::TapeExhausted
            ? protocol::ProtocolError::TapeExhausted : protocol::ProtocolError::EventCapacity;
        return initialize_error_output_at_cursor(*input, error, state.random_cursor);
      }
    }
    const u64 output_size = sizeof(OutputHeader) + static_cast<u64>(state.event_count) * sizeof(EventRecord) +
        static_cast<u64>(state.physical_bag_count + state.magical_bag_count) * sizeof(BagRecord);
    if (output_size > protocol::kArenaCapacity) return initialize_error_output(*input, protocol::ProtocolError::OutputCapacity);
    auto* output = reinterpret_cast<OutputHeader*>(output_arena);
    initialize_output(*input, output, state.event_count, state.random_cursor);
    output->total_size = static_cast<u32>(output_size);
    output->outcome = state.enemy_hp <= 0.0 ? 1 : state.party_hp <= 0.0 ? 2 : 0;
    output->party_hp = state.party_hp;
    output->enemy_hp = state.enemy_hp;
    const CombatantState* resolved_enemy = nullptr;
    for (int index = 0; index < state.combatant_count; ++index) {
      if (state.combatants[index].side == Side::Enemy) { resolved_enemy = &state.combatants[index]; break; }
    }
    output->enemy_hits_received = resolved_enemy ? resolved_enemy->enemy_hits_received : 0;
    auto* output_events = reinterpret_cast<EventRecord*>(output_arena + sizeof(OutputHeader));
    for (u32 index = 0; index < state.event_count; ++index) {
      const SemanticEvent& source = state.events[index];
      EventRecord& event = output_events[index]; event = {};
      event.opcode = static_cast<u16>(source.opcode); event.phase = static_cast<u8>(source.phase);
      const CombatantState* actor = find(state, source.actor_id); event.actor_kind = actor ? (actor->side == Side::Party ? 1 : 2) : 0;
      event.actor_id = source.actor_id; event.target_id = source.target_id; event.ability_id = static_cast<u16>(source.ability_id);
      event.attack_type = static_cast<u8>(source.attack_type); event.flags = static_cast<u8>(source.flags);
      event.timing = source.timing; event.hits = source.hits; event.attempts = source.attempts;
      event.aux0 = source.aux0; event.value0 = source.value; event.value1 = source.value1; event.value2 = source.value2;
      event.aux1 = source.aux1; event.aux2 = source.aux2;
    }
    output->physical_bag_count = state.physical_bag_count;
    output->physical_bag_offset = sizeof(OutputHeader) + state.event_count * sizeof(EventRecord);
    output->magical_bag_count = state.magical_bag_count;
    output->magical_bag_offset = output->physical_bag_offset + state.physical_bag_count * sizeof(BagRecord);
    auto* output_physical = reinterpret_cast<BagRecord*>(output_arena + output->physical_bag_offset);
    auto* output_magical = reinterpret_cast<BagRecord*>(output_arena + output->magical_bag_offset);
    for (u32 index = 0; index < state.physical_bag_count; ++index) output_physical[index] = {state.physical_bag[index].id, state.physical_bag[index].tickets};
    for (u32 index = 0; index < state.magical_bag_count; ++index) output_magical[index] = {state.magical_bag[index].id, state.magical_bag[index].tickets};
    return static_cast<int>(output->total_size);
  }
  if (!emit(protocol::EventOpcode::BattleStarted, 1, 0, 0, 0, 0, 0, 0, 0, 0.0) ||
      !emit(protocol::EventOpcode::PhaseStarted, 1, 0, 0, 0, 0, 9, 0, 0, 0.0) ||
      !emit(protocol::EventOpcode::PhaseEnded, 1, 0, 0, 0, 0, 0, 0, 0, 0.0) ||
      !emit(protocol::EventOpcode::PhaseStarted, 2, 0, 0, 0, 0, 49, 0, 0, 0.0)) return initialize_error_output(*input, protocol::ProtocolError::EventCapacity);

  // Build all normal-action entries once, then resolve the shared 49 -> 0 scheduler.
  for (u32 index = 0; index < static_cast<u32>(state.combatant_count); ++index) {
    CombatantState& actor = state.combatants[index];
    const double attacks[3] = {actor.attacks.ranged, actor.attacks.magical, actor.attacks.melee};
    const double noas[3] = {actor.attacks.ranged_noa, actor.attacks.magical_noa, actor.attacks.melee_noa};
    for (u32 attack = 0; attack < 3; ++attack) {
      if (attacks[attack] <= 0.0 || noas[attack] <= 0.0) continue;
      if (state.action_count >= kMaxNormalActions) return initialize_error_output(*input, protocol::ProtocolError::ActionCapacity);
      double roll = 0.0;
      if (!consume_random(state, roll)) roll = 0.5;
      const int base_max = attack == 0 ? 12 : attack == 1 ? 9 : 3;
      int timing = 1 + static_cast<int>(roll * base_max);
      if (timing > 49) timing = 49;
      state.actions[state.action_count++] = {actor.id, static_cast<u8>(attack + 1), timing, false};
      if (!emit(protocol::EventOpcode::Initiative, 2, actor.id, 0, 0, attack + 1, timing, 0, 0, roll)) return initialize_error_output(*input, protocol::ProtocolError::EventCapacity);
    }
  }

  for (int timing = 49; timing >= 0; --timing) {
    state.scheduler.next_timing = timing;
    for (u32 action_index = 0; action_index < state.action_count; ++action_index) {
      NormalActionEntry& action = state.actions[action_index];
      if (action.acted || action.timing != timing) continue;
      CombatantState* actor = find(state, action.actor_id);
      if (!actor) return -30;
      CombatantState* target = nullptr;
      for (int candidate = 0; candidate < state.combatant_count; ++candidate) {
        if (state.combatants[candidate].side != actor->side && state.combatants[candidate].hp > 0.0) { target = &state.combatants[candidate]; break; }
      }
      action.acted = true; actor->acted = true;
      if (!target) continue;
      const int profile_index = action.attack_type - 1;
      const bool magical = action.attack_type == 2;
      const double attack_value = (profile_index == 0 ? actor->attacks.ranged : profile_index == 1 ? actor->attacks.magical : actor->attacks.melee) + actor->profile.attack_bonus[profile_index];
      const double no_a = profile_index == 0 ? actor->attacks.ranged_noa : profile_index == 1 ? actor->attacks.magical_noa : actor->attacks.melee_noa;
      const u32 attempts = no_a > 4096.0 ? 4096u : static_cast<u32>(no_a);
      u32 hits = 0;
      double damage = 0.0;
      for (u32 hit = 0; hit < attempts; ++hit) {
        double random = 0.0;
        if (!consume_random(state, random)) random = 0.5;
        double chance = actor->profile.accuracy_potency[profile_index] + actor->profile.accuracy_bonus + actor->profile.deity_bonus[3] - target->profile.evasion_bonus;
        if (chance < 0.0) chance = 0.0; if (chance > 1.0) chance = 1.0;
        if (random > chance) continue;
        ++hits;
        const double defense = magical ? target->profile.magical_defense : target->profile.physical_defense;
        const double penetration = actor->profile.penetration[magical ? 1 : 0];
        double per_hit = (attack_value - defense * penetration) * actor->profile.offense_amplifier[magical ? 1 : 0];
        per_hit *= actor->side == Side::Enemy ? actor->profile.enemy_attack_amplifier[profile_index] : 1.0;
        per_hit *= target->profile.defense_amplifier[magical ? 1 : 0];
        if (per_hit < 1.0) per_hit = 1.0;
        damage += __builtin_floor(per_hit);
      }
      if (actor->side == Side::Party) { state.enemy_hp = state.enemy_hp > damage ? state.enemy_hp - damage : 0.0; target->hp = state.enemy_hp; }
      else { state.party_hp = state.party_hp > damage ? state.party_hp - damage : 0.0; }
      if (!emit(protocol::EventOpcode::Attack, 2, actor->id, target->id, 0, action.attack_type, timing, hits, attempts, damage)) return initialize_error_output(*input, protocol::ProtocolError::EventCapacity);
    }
  }
  if (!emit(protocol::EventOpcode::PhaseEnded, 2, 0, 0, 0, 0, 0, 0, 0, 0.0) ||
      !emit(protocol::EventOpcode::PhaseStarted, 3, 0, 0, 0, 0, 9, 0, 0, 0.0)) return initialize_error_output(*input, protocol::ProtocolError::EventCapacity);
  if (input->terrain_id != static_cast<u16>(protocol::TerrainId::Gehenna) && input->deity_id == static_cast<u16>(protocol::DeityId::GoddessOfRestoration)) {
    const double heal = __builtin_floor((state.party_max_hp - state.party_hp) * 0.2);
    state.party_hp = state.party_hp + heal > state.party_max_hp ? state.party_max_hp : state.party_hp + heal;
    if (!emit(protocol::EventOpcode::Heal, 3, 0, 0, 0, 0, 9, 0, 0, heal)) return initialize_error_output(*input, protocol::ProtocolError::EventCapacity);
  } else if (input->terrain_id != static_cast<u16>(protocol::TerrainId::Gehenna) && input->deity_id == static_cast<u16>(protocol::DeityId::GodOfAttrition)) {
    const double loss = __builtin_floor(state.party_hp * 0.05);
    state.party_hp = state.party_hp - loss < 1.0 ? 1.0 : state.party_hp - loss;
    if (!emit(protocol::EventOpcode::Damage, 3, 0, 0, 0, 0, 9, 0, 0, loss)) return initialize_error_output(*input, protocol::ProtocolError::EventCapacity);
  }
  const u8 outcome = state.party_hp <= 0.0 ? 2 : state.enemy_hp <= 0.0 ? 1 : 3;
  if (!emit(protocol::EventOpcode::PhaseEnded, 3, 0, 0, 0, 0, 0, 0, 0, 0.0) ||
      !emit(protocol::EventOpcode::Outcome, 3, 0, 0, 0, 0, 0, 0, 0, outcome) ||
      !emit(protocol::EventOpcode::BattleFinished, 3, 0, 0, 0, 0, 0, 0, 0, outcome)) return initialize_error_output(*input, protocol::ProtocolError::EventCapacity);
  while (state.random_cursor < state.random_count) { double ignored = 0.0; consume_random(state, ignored); }

  const u64 output_size = sizeof(OutputHeader) + static_cast<u64>(state.event_count) * sizeof(EventRecord) +
      static_cast<u64>(state.physical_bag_count + state.magical_bag_count) * sizeof(BagRecord);
  if (output_size > protocol::kArenaCapacity) return initialize_error_output(*input, protocol::ProtocolError::OutputCapacity);
  auto* output = reinterpret_cast<OutputHeader*>(output_arena);
  initialize_output(*input, output, state.event_count, state.random_cursor);
  output->total_size = static_cast<u32>(output_size);
  output->outcome = outcome;
  output->party_hp = state.party_hp;
  output->enemy_hp = state.enemy_hp;
  output->enemy_hits_received = 0;
  auto* output_events = reinterpret_cast<EventRecord*>(output_arena + sizeof(OutputHeader));
  for (u32 index = 0; index < state.event_count; ++index) {
    const SemanticEvent& source = state.events[index];
    EventRecord& event = output_events[index]; event = {};
    event.opcode = static_cast<u16>(source.opcode); event.phase = static_cast<u8>(source.phase);
    const CombatantState* actor = find(state, source.actor_id); event.actor_kind = actor ? (actor->side == Side::Party ? 1 : 2) : 0;
    event.actor_id = source.actor_id; event.target_id = source.target_id; event.ability_id = static_cast<u16>(source.ability_id);
    event.attack_type = static_cast<u8>(source.attack_type); event.flags = static_cast<u8>(source.flags);
    event.timing = source.timing; event.hits = source.hits;
    event.attempts = source.attempts; event.aux0 = source.aux0; event.value0 = source.value; event.value1 = source.value1; event.value2 = source.value2;
    event.aux1 = source.aux1; event.aux2 = source.aux2;
  }
  output->physical_bag_count = state.physical_bag_count;
  output->physical_bag_offset = sizeof(OutputHeader) + state.event_count * sizeof(EventRecord);
  output->magical_bag_count = state.magical_bag_count;
  output->magical_bag_offset = output->physical_bag_offset + state.physical_bag_count * sizeof(BagRecord);
  auto* output_physical = reinterpret_cast<BagRecord*>(output_arena + output->physical_bag_offset);
  auto* output_magical = reinterpret_cast<BagRecord*>(output_arena + output->magical_bag_offset);
  for (u32 index = 0; index < state.physical_bag_count; ++index) output_physical[index] = {state.physical_bag[index].id, state.physical_bag[index].tickets};
  for (u32 index = 0; index < state.magical_bag_count; ++index) output_magical[index] = {state.magical_bag[index].id, state.magical_bag[index].tickets};
  return static_cast<int>(output->total_size);
}

}  // extern "C"
