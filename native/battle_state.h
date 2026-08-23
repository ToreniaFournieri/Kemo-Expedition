#pragma once

namespace bokemo::battle_state {

constexpr int kMaxCombatants = 8;
constexpr int kMaxAbilitiesPerCombatant = 64;
constexpr int kMaxRandomTape = 4096;
constexpr int kMaxSemanticEvents = 4096;
constexpr int kMaxThreatBagEntries = 64;
constexpr int kMaxNormalActions = kMaxCombatants * 3;

enum class Side : unsigned char { Party = 0, Enemy = 1 };

struct AttackProfile {
  double ranged = 0.0;
  double magical = 0.0;
  double melee = 0.0;
  double ranged_noa = 0.0;
  double magical_noa = 0.0;
  double melee_noa = 0.0;
  double original_ranged_noa = 0.0;
  double original_magical_noa = 0.0;
  double original_melee_noa = 0.0;
};

struct ImmutableCombatProfile {
  double physical_defense = 0.0;
  double magical_defense = 0.0;
  double accuracy_potency[3]{};
  double accuracy_bonus = 0.0;
  double evasion_bonus = 0.0;
  double penetration[2]{};
  double elemental_resistance[3]{};
  double offense_amplifier[2]{};
  double defense_amplifier[2]{};
  double phase_bonus[3]{};
  double deity_bonus[4]{};
  double enemy_attack_amplifier[3]{};
  double attack_bonus[3]{};
  unsigned char elemental_offense = 0;
  unsigned char magic_style = 0;
  double elemental_offense_value = 0.0;
};

struct MutableAbility {
  unsigned int id = 0;
  int level = 0;
  bool removed = false;
  bool consumed = false;
};

struct TemporaryModifiers {
  double accuracy = 0.0;
  double evasion = 0.0;
  double physical_defense_debuff = 0.0;
  double magical_defense_debuff = 0.0;
};

struct RecoveryState {
  bool resurrect_consumed = false;
  bool reanimate_consumed = false;
};

struct CombatantState {
  unsigned int id = 0;
  Side side = Side::Party;
  unsigned int row = 0;
  unsigned int status_flags = 0;
  double hp = 0.0;
  double max_hp = 0.0;
  AttackProfile attacks{};
  ImmutableCombatProfile profile{};
  MutableAbility abilities[kMaxAbilitiesPerCombatant]{};
  int ability_count = 0;
  double damage_taken = 0.0;
  unsigned int enemy_hits_received = 0;
  bool acted = false;
  bool incapacitated = false;
  bool consumed = false;
  bool one_shot_consumed = false;
  bool illusion_consumed = false;
  bool shock_consumed = false;
  double offense_multiplier = 1.0;
  TemporaryModifiers temporary{};
  unsigned int counters = 0;
  bool sealed = false;
  bool howl_active = false;
  double howl_multiplier = 1.0;
  unsigned int elemental_use[4]{};
  RecoveryState recovery{};
};

struct SchedulerState {
  unsigned int first_actor_id = 0;
  int next_timing = 49;
  int phase = 0;
  unsigned int action_cursor = 0;
};

struct NormalActionEntry {
  unsigned int actor_id = 0;
  unsigned char attack_type = 0;
  int timing = 0;
  bool acted = false;
};

struct ThreatBagEntry { int id = 0; unsigned int tickets = 0; };

struct SemanticEvent {
  unsigned int opcode = 0;
  unsigned int phase = 0;
  unsigned int actor_id = 0;
  unsigned int target_id = 0;
  unsigned int ability_id = 0;
  unsigned int attack_type = 0;
  unsigned int flags = 0;
  int timing = 0;
  unsigned int hits = 0;
  unsigned int attempts = 0;
  double value = 0.0;
  double value1 = 0.0;
  double value2 = 0.0;
  unsigned int aux0 = 0;
  unsigned int aux1 = 0;
  unsigned int aux2 = 0;
};

struct BattleStateCore {
  CombatantState combatants[kMaxCombatants]{};
  int combatant_count = 0;
  SchedulerState scheduler{};
  NormalActionEntry actions[kMaxNormalActions]{};
  unsigned int action_count = 0;
  double party_hp = 0.0;
  double party_max_hp = 0.0;
  // Party HP is intentionally aggregate in the protocol.  Timed regeneration
  // therefore consumes this aggregate ledger rather than an owning row's
  // local damage ledger.
  double party_damage_taken = 0.0;
  double enemy_hp = 0.0;
  double enemy_max_hp = 0.0;
  bool consume_random_flavor = false;
  bool random_flavor_tape_exhausted = false;
  ThreatBagEntry physical_bag[kMaxThreatBagEntries]{};
  ThreatBagEntry magical_bag[kMaxThreatBagEntries]{};
  unsigned int physical_bag_count = 0;
  unsigned int magical_bag_count = 0;
  double random_tape[kMaxRandomTape]{};
  unsigned int random_cursor = 0;
  unsigned int random_count = 0;
  SemanticEvent events[kMaxSemanticEvents]{};
  unsigned int event_count = 0;
  unsigned int magic_seal_owners[kMaxCombatants]{};
  unsigned int magic_seal_count = 0;
  unsigned int magic_seal_cursor = 0;
  unsigned int echo_elemental_use[4]{};
  bool sacred_judgement_consumed = false;
  bool party_illusion_consumed = false;
  bool forced_draw = false;
};

void reset(BattleStateCore& state);
CombatantState* find(BattleStateCore& state, unsigned int id);
const CombatantState* find(const BattleStateCore& state, unsigned int id);
bool add_combatant(BattleStateCore& state, unsigned int id, Side side, unsigned int row, double hp, double max_hp);
double apply_damage(BattleStateCore& state, CombatantState& target, double amount, bool count_enemy_hit);
double apply_healing(CombatantState& target, double amount);
bool is_lethal(const CombatantState& target);
MutableAbility* find_ability(CombatantState& target, unsigned int ability_id);
bool set_ability(CombatantState& target, unsigned int ability_id, int level);
bool remove_ability(CombatantState& target, unsigned int ability_id);
int upgrade_ability(CombatantState& target, unsigned int ability_id, int delta, int cap);
bool consume_one_shot(CombatantState& target, unsigned int flag);
void apply_temporary_modifiers(CombatantState& target, double accuracy, double evasion, double physical, double magical);
void reset_temporary_modifiers(CombatantState& target);
bool recover_on_defeat(CombatantState& target, unsigned int resurrect_id, unsigned int reanimate_id);
bool append_random(BattleStateCore& state, double value);
bool consume_random(BattleStateCore& state, double& value);
bool append_event(BattleStateCore& state, unsigned int opcode, unsigned int actor_id, unsigned int target_id, double value);

}  // namespace bokemo::battle_state
