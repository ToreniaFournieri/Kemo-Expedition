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
  }
  if (enemy && !state_abilities_suppressed(input, *enemy) && active_ability_level(*enemy, protocol::AbilityId::MagicSeal) > 0 &&
      !emit(protocol::EventOpcode::AbilityActivated, enemy->id, 0, static_cast<u32>(protocol::AbilityId::MagicSeal), 3,
          0, active_ability_level(*enemy, protocol::AbilityId::MagicSeal), 0, 15)) return StartResult::EventCapacity;
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
  if ((input->engine_flags & protocol::kEngineFlagStartCheckpoint) != 0) {
    const StartResult start_result = resolve_start_checkpoint(*input, state);
    if (start_result != StartResult::Ok) {
      const protocol::ProtocolError error = start_result == StartResult::TapeExhausted ? protocol::ProtocolError::TapeExhausted
          : start_result == StartResult::AbilityCapacity ? protocol::ProtocolError::AbilityCapacity
          : start_result == StartResult::ActionCapacity ? protocol::ProtocolError::ActionCapacity
          : protocol::ProtocolError::EventCapacity;
      return initialize_error_output_at_cursor(*input, error, state.random_cursor);
    }
    const u64 output_size = sizeof(OutputHeader) + static_cast<u64>(state.event_count) * sizeof(EventRecord) +
        static_cast<u64>(state.physical_bag_count + state.magical_bag_count) * sizeof(BagRecord);
    if (output_size > protocol::kArenaCapacity) return initialize_error_output(*input, protocol::ProtocolError::OutputCapacity);
    auto* output = reinterpret_cast<OutputHeader*>(output_arena);
    initialize_output(*input, output, state.event_count, state.random_cursor);
    output->total_size = static_cast<u32>(output_size);
    output->outcome = 0;
    output->party_hp = state.party_hp;
    output->enemy_hp = state.enemy_hp;
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
