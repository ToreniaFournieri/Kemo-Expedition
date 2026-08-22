#include "generated/battle_protocol.generated.h"

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
  u8 reserved[10];
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
    if (combatant.id == 0 || combatant.kind < 1 || combatant.kind > 2 || combatant.elemental_offense > 3) return -9;
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

}  // extern "C"
