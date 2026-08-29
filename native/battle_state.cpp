#include "battle_state.h"

namespace bokemo::battle_state {

namespace {
double clamp_hp(double hp, double max_hp) {
  if (hp < 0.0) return 0.0;
  if (hp > max_hp) return max_hp;
  return hp;
}
}  // namespace

void reset(BattleStateCore& state) {
  __builtin_memset(&state, 0, sizeof(BattleStateCore));
}

CombatantState* find(BattleStateCore& state, unsigned int id) {
  for (int index = 0; index < state.combatant_count; ++index) {
    if (state.combatants[index].id == id) return &state.combatants[index];
  }
  return nullptr;
}

const CombatantState* find(const BattleStateCore& state, unsigned int id) {
  for (int index = 0; index < state.combatant_count; ++index) {
    if (state.combatants[index].id == id) return &state.combatants[index];
  }
  return nullptr;
}

bool add_combatant(BattleStateCore& state, unsigned int id, Side side, unsigned int row, double hp, double max_hp) {
  if (id == 0 || max_hp < 0.0 || find(state, id) || state.combatant_count >= kMaxCombatants) return false;
  CombatantState& target = state.combatants[state.combatant_count++];
  target = CombatantState{};
  target.temporary.physical_defense_debuff = 1.0;
  target.temporary.magical_defense_debuff = 1.0;
  for (int index = 0; index < 3; ++index) {
    target.profile.accuracy_potency[index] = 1.0;
    target.profile.elemental_resistance[index] = 1.0;
    target.profile.enemy_attack_amplifier[index] = 1.0;
  }
  for (int index = 0; index < 2; ++index) {
    target.profile.penetration[index] = 1.0;
    target.profile.offense_amplifier[index] = 1.0;
    target.profile.defense_amplifier[index] = 1.0;
  }
  target.profile.deity_bonus[1] = 1.0;
  target.profile.deity_bonus[2] = 1.0;
  target.profile.elemental_offense_value = 1.0;
  target.id = id;
  target.side = side;
  target.row = row;
  target.max_hp = max_hp;
  target.hp = clamp_hp(hp, max_hp);
  return true;
}

double apply_damage(BattleStateCore& state, CombatantState& target, double amount, bool count_enemy_hit) {
  const double applied = amount > 0.0 ? (amount > target.hp ? target.hp : amount) : 0.0;
  target.hp = clamp_hp(target.hp - applied, target.max_hp);
  target.damage_taken += applied;
  if (count_enemy_hit && target.side == Side::Enemy && applied > 0.0) ++target.enemy_hits_received;
  append_event(state, 1, 0, target.id, applied);
  return applied;
}

double apply_healing(CombatantState& target, double amount) {
  const double applied = amount > 0.0 ? ((target.hp + amount > target.max_hp) ? target.max_hp - target.hp : amount) : 0.0;
  target.hp = clamp_hp(target.hp + applied, target.max_hp);
  return applied;
}

bool is_lethal(const CombatantState& target) { return target.hp <= 0.0; }

MutableAbility* find_ability(CombatantState& target, unsigned int ability_id) {
  for (int index = 0; index < target.ability_count; ++index) {
    if (target.abilities[index].id == ability_id) return &target.abilities[index];
  }
  return nullptr;
}

bool set_ability(CombatantState& target, unsigned int ability_id, int level) {
  if (ability_id == 0) return false;
  MutableAbility* ability = find_ability(target, ability_id);
  if (!ability) {
    if (target.ability_count >= kMaxAbilitiesPerCombatant) return false;
    ability = &target.abilities[target.ability_count++];
    ability->id = ability_id;
  }
  ability->level = level < 0 ? 0 : level;
  ability->removed = ability->level == 0;
  return true;
}

bool remove_ability(CombatantState& target, unsigned int ability_id) {
  MutableAbility* ability = find_ability(target, ability_id);
  if (!ability || ability->removed) return false;
  ability->removed = true;
  ability->level = 0;
  return true;
}

int upgrade_ability(CombatantState& target, unsigned int ability_id, int delta, int cap) {
  MutableAbility* ability = find_ability(target, ability_id);
  if (!ability || ability->removed || delta <= 0) return ability ? ability->level : 0;
  const int upper = cap < 0 ? 0 : cap;
  ability->level = ability->level + delta > upper ? upper : ability->level + delta;
  return ability->level;
}

bool consume_one_shot(CombatantState& target, unsigned int flag) {
  if (flag == 1) {
    if (target.recovery.resurrect_consumed) return false;
    target.recovery.resurrect_consumed = true;
  } else if (flag == 2) {
    if (target.recovery.reanimate_consumed) return false;
    target.recovery.reanimate_consumed = true;
  } else {
    if (target.one_shot_consumed) return false;
    target.one_shot_consumed = true;
  }
  target.consumed = true;
  return true;
}

void apply_temporary_modifiers(CombatantState& target, double accuracy, double evasion, double physical, double magical) {
  target.temporary.accuracy += accuracy;
  target.temporary.evasion += evasion;
  target.temporary.physical_defense_debuff *= physical;
  target.temporary.magical_defense_debuff *= magical;
}

void reset_temporary_modifiers(CombatantState& target) {
  target.temporary = {};
  target.temporary.physical_defense_debuff = 1.0;
  target.temporary.magical_defense_debuff = 1.0;
}

bool recover_on_defeat(CombatantState& target, unsigned int resurrect_id, unsigned int reanimate_id) {
  if (!is_lethal(target)) return false;
  MutableAbility* resurrect = find_ability(target, resurrect_id);
  if (resurrect && !resurrect->removed && resurrect->level > 0 && consume_one_shot(target, 1)) {
    const double amount = resurrect->level >= 2 ? __builtin_ceil(target.max_hp * 0.01) : 1.0;
    target.hp = clamp_hp(amount < 1.0 ? 1.0 : amount, target.max_hp);
    return true;
  }
  MutableAbility* reanimate = find_ability(target, reanimate_id);
  if (reanimate && !reanimate->removed && reanimate->level > 0 && consume_one_shot(target, 2)) {
    constexpr int kPercentByLevel[5] = {20, 26, 31, 35, 38};
    const int index = reanimate->level >= 5 ? 4 : reanimate->level - 1;
    target.hp = clamp_hp(__builtin_ceil(target.max_hp * kPercentByLevel[index] / 100.0), target.max_hp);
    return true;
  }
  return false;
}

bool append_random(BattleStateCore& state, double value) {
  if (state.random_count >= kMaxRandomTape) return false;
  state.random_tape[state.random_count++] = value;
  return true;
}

void initialize_seeded_random(BattleStateCore& state, bokemo::battle::u64 seed) {
  state.seeded_rng.seed_state(seed);
  state.seeded_random = true;
}

bool consume_random(BattleStateCore& state, double& value) {
  if (state.seeded_random) {
    value = state.seeded_rng.next_double();
    ++state.random_cursor;
    return true;
  }
  if (state.random_cursor >= state.random_count) return false;
  value = state.random_tape[state.random_cursor++];
  return true;
}

bool append_event(BattleStateCore& state, unsigned int opcode, unsigned int actor_id, unsigned int target_id, double value) {
  if (state.event_count >= kMaxSemanticEvents) return false;
  SemanticEvent& event = state.events[state.event_count++];
  event = {};
  event.opcode = opcode;
  event.actor_id = actor_id;
  event.target_id = target_id;
  event.value = value;
  return true;
}

}  // namespace bokemo::battle_state
