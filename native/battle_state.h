#pragma once

namespace bokemo::battle_state {

constexpr int kMaxCombatants = 8;
constexpr int kMaxAbilitiesPerCombatant = 64;
constexpr int kMaxRandomTape = 4096;
constexpr int kMaxSemanticEvents = 512;

enum class Side : unsigned char { Party = 0, Enemy = 1 };

struct AttackProfile {
  double ranged = 0.0;
  double magical = 0.0;
  double melee = 0.0;
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
  double physical_defense_debuff = 1.0;
  double magical_defense_debuff = 1.0;
};

struct RecoveryState {
  bool resurrect_consumed = false;
  bool reanimate_consumed = false;
};

struct CombatantState {
  unsigned int id = 0;
  Side side = Side::Party;
  unsigned int row = 0;
  double hp = 0.0;
  double max_hp = 0.0;
  AttackProfile attacks{};
  MutableAbility abilities[kMaxAbilitiesPerCombatant]{};
  int ability_count = 0;
  double damage_taken = 0.0;
  unsigned int enemy_hits_received = 0;
  bool acted = false;
  bool incapacitated = false;
  bool consumed = false;
  bool one_shot_consumed = false;
  TemporaryModifiers temporary{};
  unsigned int counters = 0;
  bool sealed = false;
  bool howl_active = false;
  unsigned int elemental_use[4]{};
  RecoveryState recovery{};
};

struct SchedulerState {
  unsigned int first_actor_id = 0;
  int next_timing = 49;
  int phase = 0;
  unsigned int action_cursor = 0;
};

struct SemanticEvent {
  unsigned int opcode = 0;
  unsigned int actor_id = 0;
  unsigned int target_id = 0;
  double value = 0.0;
};

struct BattleStateCore {
  CombatantState combatants[kMaxCombatants]{};
  int combatant_count = 0;
  SchedulerState scheduler{};
  double random_tape[kMaxRandomTape]{};
  unsigned int random_cursor = 0;
  unsigned int random_count = 0;
  SemanticEvent events[kMaxSemanticEvents]{};
  unsigned int event_count = 0;
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
