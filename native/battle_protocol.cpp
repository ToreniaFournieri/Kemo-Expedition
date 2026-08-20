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
  u32 reserved0;
  double party_hp;
  double enemy_hp;
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
  event->opcode = static_cast<u16>(protocol::EventOpcode::ProtocolReady);
  for (u32 index = 0; index < input->physical_bag_count; ++index) output_physical_bag[index] = input_physical_bag[index];
  for (u32 index = 0; index < input->magical_bag_count; ++index) output_magical_bag[index] = input_magical_bag[index];
  return static_cast<int>(output->total_size);
}

}  // extern "C"
