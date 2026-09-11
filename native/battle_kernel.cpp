#include "ability_level_scales.h"
#include "battle_state.h"

// Legacy primitive exports below remain ABI-8 diagnostic seams. Production
// battles use the protocol-v3 END coordinator and its battle-local seeded RNG.

extern "C" {

constexpr int kHitBufferCapacity = 4096;
double hit_random_rolls[kHitBufferCapacity];
unsigned char hit_results[kHitBufferCapacity];

// This grouped entry point is intentionally test-only. It exercises the
// internal mutable-state core without adding production WebAssembly crossings.
constexpr int kBattleStateTestOperationCapacity = 4097;
constexpr int kBattleStateTestOperationStride = 8;
double battle_state_test_input[kBattleStateTestOperationCapacity * kBattleStateTestOperationStride];
double battle_state_test_output[kBattleStateTestOperationCapacity * 5];
alignas(bokemo::battle_state::BattleStateCore)
unsigned char battle_state_test_core_storage[sizeof(bokemo::battle_state::BattleStateCore)];

double* battle_state_test_input_buffer() { return battle_state_test_input; }
double* battle_state_test_output_buffer() { return battle_state_test_output; }
int battle_state_test_operation_capacity() { return kBattleStateTestOperationCapacity; }

int battle_run_state_test_operations(int operation_count) {
  using namespace bokemo::battle_state;
  if (operation_count < 0 || operation_count > kBattleStateTestOperationCapacity) return -1;
  BattleStateCore& state = *reinterpret_cast<BattleStateCore*>(battle_state_test_core_storage);
  reset(state);
  for (int index = 0; index < operation_count * 5; ++index) battle_state_test_output[index] = 0.0;
  for (int index = 0; index < operation_count; ++index) {
    const double* input = &battle_state_test_input[index * kBattleStateTestOperationStride];
    double* output = &battle_state_test_output[index * 5];
    const int operation = static_cast<int>(input[0]);
    CombatantState* target = find(state, static_cast<unsigned int>(input[1]));
    if (operation == 1) reset(state);
    else if (operation == 2) output[0] = add_combatant(state, static_cast<unsigned int>(input[1]), input[2] == 0.0 ? Side::Party : Side::Enemy, static_cast<unsigned int>(input[3]), input[4], input[5]) ? 1.0 : 0.0;
    else if (operation == 3 && target) output[0] = apply_damage(state, *target, input[2], input[3] != 0.0);
    else if (operation == 4 && target) output[0] = apply_healing(*target, input[2]);
    else if (operation == 5 && target) output[0] = set_ability(*target, static_cast<unsigned int>(input[2]), static_cast<int>(input[3])) ? 1.0 : 0.0;
    else if (operation == 6 && target) output[0] = remove_ability(*target, static_cast<unsigned int>(input[2])) ? 1.0 : 0.0;
    else if (operation == 7 && target) output[0] = upgrade_ability(*target, static_cast<unsigned int>(input[2]), static_cast<int>(input[3]), static_cast<int>(input[4]));
    else if (operation == 8 && target) output[0] = consume_one_shot(*target, static_cast<unsigned int>(input[2])) ? 1.0 : 0.0;
    else if (operation == 9 && target) apply_temporary_modifiers(*target, input[2], input[3], input[4], input[5]);
    else if (operation == 10 && target) reset_temporary_modifiers(*target);
    else if (operation == 11 && target) output[0] = recover_on_defeat(*target, static_cast<unsigned int>(input[2]), static_cast<unsigned int>(input[3])) ? 1.0 : 0.0;
    else if (operation == 12 && target) target->acted = input[2] != 0.0;
    else if (operation == 13) { state.scheduler.first_actor_id = static_cast<unsigned int>(input[1]); state.scheduler.next_timing = static_cast<int>(input[2]); state.scheduler.phase = static_cast<int>(input[3]); state.scheduler.action_cursor = static_cast<unsigned int>(input[4]); }
    else if (operation == 14) output[0] = append_random(state, input[2]) ? 1.0 : 0.0;
    else if (operation == 15) { double value = 0.0; output[0] = consume_random(state, value) ? value : -1.0; }
    else if (operation == 16) output[0] = append_event(state, static_cast<unsigned int>(input[1]), static_cast<unsigned int>(input[2]), static_cast<unsigned int>(input[3]), input[4]) ? 1.0 : 0.0;
    else if (operation == 17 && target) {
      const int selector = static_cast<int>(input[2]);
      if (selector == 1) output[0] = target->temporary.accuracy;
      else if (selector == 2) output[0] = target->temporary.evasion;
      else if (selector == 3) output[0] = target->temporary.physical_defense_debuff;
      else if (selector == 4) output[0] = target->temporary.magical_defense_debuff;
      else if (selector == 5) { const MutableAbility* ability = find_ability(*target, static_cast<unsigned int>(input[3])); output[0] = ability ? ability->level : 0.0; }
      else if (selector == 6) output[0] = target->acted ? 1.0 : 0.0;
    }
    else if (operation == 18) {
      const int selector = static_cast<int>(input[1]);
      if (selector == 1) output[0] = static_cast<double>(state.random_cursor);
      else if (selector == 2) output[0] = static_cast<double>(state.random_count);
      else if (selector == 3) output[0] = static_cast<double>(state.event_count);
      else if (selector == 4) output[0] = static_cast<double>(state.scheduler.first_actor_id);
      else if (selector == 5) output[0] = static_cast<double>(state.scheduler.next_timing);
      else if (selector == 6) output[0] = static_cast<double>(state.scheduler.action_cursor);
      else if (selector == 7 && state.event_count > 0) output[0] = static_cast<double>(state.events[0].opcode);
      else if (selector == 8 && state.event_count > 1) output[0] = static_cast<double>(state.events[1].opcode);
    }
    else if (operation != 1) return -2;
    if (target) {
      output[1] = target->hp;
      output[2] = target->damage_taken;
      output[3] = static_cast<double>(target->enemy_hits_received);
      output[4] = is_lethal(*target) ? 1.0 : 0.0;
    }
  }
  return 0;
}

// Auto-equipment candidate ranking shares the battle WebAssembly module so the
// browser, Electron renderer, AFK workers, and API runtime all use one native
// implementation. JavaScript supplies already-eligible candidates; C++ performs
// the repeated hot-path ranking without allocating or sorting temporary arrays.
constexpr int kEquipmentCandidateCapacity = 16384;
constexpr int kEquipmentCandidateStride = 6;
int equipment_candidate_values[kEquipmentCandidateCapacity * kEquipmentCandidateStride];
double equipment_candidate_scores[kEquipmentCandidateCapacity];

int battle_kernel_abi_version() {
  return 8;
}

int* equipment_candidate_int_buffer() {
  return equipment_candidate_values;
}

double* equipment_candidate_score_buffer() {
  return equipment_candidate_scores;
}

int equipment_candidate_capacity() {
  return kEquipmentCandidateCapacity;
}

// Candidate integer record: caller index, tier, enhancement, core concept,
// Super Rare id, item id. This intentionally preserves the former stable JS
// sort order by retaining the first candidate when every key ties.
int equipment_select_best_fill_candidate(int candidate_count) {
  if (candidate_count < 0 || candidate_count > kEquipmentCandidateCapacity) return -2;
  if (candidate_count == 0) return -1;

  int best = 0;
  for (int index = 1; index < candidate_count; ++index) {
    const int current_offset = index * kEquipmentCandidateStride;
    const int best_offset = best * kEquipmentCandidateStride;
    const double current_score = equipment_candidate_scores[index];
    const double best_score = equipment_candidate_scores[best];
    bool is_better = current_score > best_score;
    if (current_score == best_score) {
      const int current_tier = equipment_candidate_values[current_offset + 1];
      const int best_tier = equipment_candidate_values[best_offset + 1];
      is_better = current_tier < best_tier;
      if (current_tier == best_tier) {
        const int current_enhancement = equipment_candidate_values[current_offset + 2];
        const int best_enhancement = equipment_candidate_values[best_offset + 2];
        is_better = current_enhancement < best_enhancement;
        if (current_enhancement == best_enhancement) {
          is_better = equipment_candidate_values[current_offset + 5]
              < equipment_candidate_values[best_offset + 5];
        }
      }
    }
    if (is_better) best = index;
  }
  return equipment_candidate_values[best * kEquipmentCandidateStride];
}

int equipment_select_best_upgrade_candidate(int candidate_count) {
  if (candidate_count < 0 || candidate_count > kEquipmentCandidateCapacity) return -2;
  if (candidate_count == 0) return -1;

  int best = 0;
  for (int index = 1; index < candidate_count; ++index) {
    const int current_offset = index * kEquipmentCandidateStride;
    const int best_offset = best * kEquipmentCandidateStride;
    const int current_enhancement = equipment_candidate_values[current_offset + 2];
    const int best_enhancement = equipment_candidate_values[best_offset + 2];
    bool is_better = current_enhancement > best_enhancement;
    if (current_enhancement == best_enhancement) {
      const int current_core = equipment_candidate_values[current_offset + 3];
      const int best_core = equipment_candidate_values[best_offset + 3];
      is_better = current_core > best_core;
      if (current_core == best_core) {
        const int current_super_rare = equipment_candidate_values[current_offset + 4];
        const int best_super_rare = equipment_candidate_values[best_offset + 4];
        is_better = current_super_rare > best_super_rare;
        if (current_super_rare == best_super_rare) {
          const int current_tier = equipment_candidate_values[current_offset + 1];
          const int best_tier = equipment_candidate_values[best_offset + 1];
          is_better = current_tier < best_tier;
          if (current_tier == best_tier) {
            is_better = current_enhancement < best_enhancement;
            if (current_enhancement == best_enhancement) {
              is_better = equipment_candidate_values[current_offset + 5]
                  < equipment_candidate_values[best_offset + 5];
            }
          }
        }
      }
    }
    if (is_better) best = index;
  }
  return equipment_candidate_values[best * kEquipmentCandidateStride];
}

double battle_calculate_per_hit_damage(
    double attack,
    double effective_defense,
    double offense_amplifier,
    double runtime_offense_multiplier,
    double elemental_offense_value,
    double elemental_multiplier,
    double defense_amplifier,
    double party_ability_amplifier,
    double rage_amplifier,
    double momentum_amplifier,
    double mutual_amplifier,
    double terrain_amplifier,
    double elemental_attribute_amplifier,
    double swarm_amplifier,
    double defense_debuff_amplifier) {
  const double raw_damage =
      (attack - effective_defense) * offense_amplifier *
      runtime_offense_multiplier * elemental_offense_value *
      elemental_multiplier * defense_amplifier * party_ability_amplifier *
      rage_amplifier * momentum_amplifier * mutual_amplifier *
      terrain_amplifier * elemental_attribute_amplifier * swarm_amplifier *
      defense_debuff_amplifier;
  const double clamped_damage = raw_damage < 1.0 ? 1.0 : raw_damage;
  return __builtin_floor(clamped_damage);
}

double battle_hit_chance(
    double actor_accuracy_potency,
    double actor_accuracy_bonus,
    double opponent_evasion_bonus,
    int nth_hit,
    int attack_type,
    int opponent_deflection_level,
    int actor_focus_level,
    int actor_arcane_stability_level,
    int terrain_modifier) {
  const double focus_multiplier = actor_focus_level > 0 ? ability_scales::value(actor_focus_level, ability_scales::focus) : 1.0;
  double effective_accuracy_bonus = actor_accuracy_bonus;
  if (actor_focus_level > 0) {
    effective_accuracy_bonus =
        __builtin_ceil((actor_accuracy_bonus * focus_multiplier +
                   2.2204460492503131e-16) * 1000.0) /
        1000.0;
  }

  // attack_type: 0 ranged, 1 magical, 2 melee.
  // terrain_modifier: -25 fog, +20 sunny beach, 0 otherwise.
  if (attack_type == 0) effective_accuracy_bonus += terrain_modifier;

  const double raw_decay = 0.90 + effective_accuracy_bonus - opponent_evasion_bonus;
  const double decay = raw_decay < 0.70 ? 0.70 : raw_decay > 0.98 ? 0.98 : raw_decay;
  double base_chance = actor_accuracy_potency;
  if (attack_type == 0) {
    if (opponent_deflection_level >= 2) base_chance -= 0.15;
    else if (opponent_deflection_level >= 1) base_chance -= 0.10;
  }
  const double clamped_base_chance = base_chance < 0.0
      ? 0.0
      : base_chance > 1.0 ? 1.0 : base_chance;
  double decay_multiplier = 1.0;
  for (int hit = 1; hit < nth_hit; ++hit) decay_multiplier *= decay;
  const double chance = clamped_base_chance * decay_multiplier;
  const double stability_floor = actor_arcane_stability_level > 0 ? ability_scales::value(actor_arcane_stability_level, ability_scales::stability) : 0.0;
  return chance > stability_floor ? chance : stability_floor;
}

double* battle_hit_random_buffer() {
  return hit_random_rolls;
}

unsigned char* battle_hit_result_buffer() {
  return hit_results;
}

int battle_resolve_hit_sequence(
    double actor_accuracy_potency,
    double actor_accuracy_bonus,
    double opponent_evasion_bonus,
    int first_hit,
    int hit_count,
    int attack_type,
    int opponent_deflection_level,
    int actor_focus_level,
    int actor_arcane_stability_level,
    int terrain_modifier) {
  if (hit_count < 0 || hit_count > kHitBufferCapacity || first_hit < 1) return -1;

  const double focus_multiplier = actor_focus_level > 0 ? ability_scales::value(actor_focus_level, ability_scales::focus) : 1.0;
  double effective_accuracy_bonus = actor_accuracy_bonus;
  if (actor_focus_level > 0) {
    effective_accuracy_bonus =
        __builtin_ceil((actor_accuracy_bonus * focus_multiplier +
                        2.2204460492503131e-16) * 1000.0) /
        1000.0;
  }
  if (attack_type == 0) effective_accuracy_bonus += terrain_modifier;

  const double raw_decay = 0.90 + effective_accuracy_bonus - opponent_evasion_bonus;
  const double decay = raw_decay < 0.70 ? 0.70 : raw_decay > 0.98 ? 0.98 : raw_decay;
  double base_chance = actor_accuracy_potency;
  if (attack_type == 0) {
    if (opponent_deflection_level >= 2) base_chance -= 0.15;
    else if (opponent_deflection_level >= 1) base_chance -= 0.10;
  }
  base_chance = base_chance < 0.0 ? 0.0 : base_chance > 1.0 ? 1.0 : base_chance;
  const double stability_floor = actor_arcane_stability_level > 0 ? ability_scales::value(actor_arcane_stability_level, ability_scales::stability) : 0.0;

  double decay_multiplier = 1.0;
  for (int hit = 1; hit < first_hit; ++hit) decay_multiplier *= decay;
  int resolved_hits = 0;
  for (int index = 0; index < hit_count; ++index) {
    const double raw_chance = base_chance * decay_multiplier;
    const double chance = raw_chance > stability_floor ? raw_chance : stability_floor;
    const bool did_hit = hit_random_rolls[index] <= chance;
    hit_results[index] = did_hit ? 1 : 0;
    if (did_hit) ++resolved_hits;
    decay_multiplier *= decay;
  }
  return resolved_hits;
}

double battle_apply_domain_damage_override(
    double per_hit_damage,
    int terrain_mode,
    double opponent_max_hp,
    int domain_is_ignored) {
  if (domain_is_ignored != 0) return per_hit_damage;
  // terrain_mode: 1 floor-domain, 2 cap-domain, 0 otherwise.
  if (terrain_mode == 1) {
    const double floor_damage = __builtin_floor(opponent_max_hp * 0.01);
    return floor_damage > per_hit_damage ? floor_damage : per_hit_damage;
  }
  if (terrain_mode == 2) {
    const double cap_damage = __builtin_floor(opponent_max_hp * 0.05);
    return cap_damage < per_hit_damage ? cap_damage : per_hit_damage;
  }
  return per_hit_damage;
}

}  // extern "C"
