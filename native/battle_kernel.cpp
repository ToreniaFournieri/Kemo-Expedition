#include "generated/battle_protocol.generated.h"

// The battle coordinator deliberately supplies random rolls from JavaScript.
// This keeps the canonical Math.random() draw order unchanged across browser,
// Electron, AFK workers, and Experimental API sorties.

extern "C" {

constexpr int kHitBufferCapacity = 4096;
double hit_random_rolls[kHitBufferCapacity];
unsigned char hit_results[kHitBufferCapacity];
constexpr int kNormalActionValueCapacity = 64;
constexpr int kNormalActionTargetCapacity = 16;
double normal_action_input[kNormalActionValueCapacity];
double normal_action_output[kNormalActionValueCapacity];
unsigned int normal_action_target_ids[kNormalActionTargetCapacity];
unsigned int normal_action_target_rows[kNormalActionTargetCapacity];
unsigned int normal_action_target_bulwark[kNormalActionTargetCapacity];
unsigned int normal_action_bag_ids[kNormalActionTargetCapacity];
unsigned int normal_action_bag_tickets[kNormalActionTargetCapacity];

int battle_kernel_abi_version() {
  return 4;
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
  const double focus_multiplier = actor_focus_level >= 2
      ? 1.3
      : actor_focus_level >= 1 ? 1.2 : 1.0;
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
  const double stability_floor = actor_arcane_stability_level >= 2
      ? 0.60
      : actor_arcane_stability_level >= 1 ? 0.55 : 0.0;
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

  const double focus_multiplier = actor_focus_level >= 2
      ? 1.3
      : actor_focus_level >= 1 ? 1.2 : 1.0;
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
  const double stability_floor = actor_arcane_stability_level >= 2
      ? 0.60
      : actor_arcane_stability_level >= 1 ? 0.55 : 0.0;

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

double* battle_normal_action_input_buffer() { return normal_action_input; }
double* battle_normal_action_output_buffer() { return normal_action_output; }
unsigned int* battle_normal_action_target_id_buffer() { return normal_action_target_ids; }
unsigned int* battle_normal_action_target_row_buffer() { return normal_action_target_rows; }
unsigned int* battle_normal_action_target_bulwark_buffer() { return normal_action_target_bulwark; }
unsigned int* battle_normal_action_bag_id_buffer() { return normal_action_bag_ids; }
unsigned int* battle_normal_action_bag_ticket_buffer() { return normal_action_bag_tickets; }
int battle_normal_action_value_capacity() { return kNormalActionValueCapacity; }
int battle_normal_action_target_capacity() { return kNormalActionTargetCapacity; }

// One stateful execution entry point for normal-action targeting, special magic,
// hit sequences, and damage. JavaScript supplies the canonical random tape.
int battle_resolve_normal_action() {
  for (int index = 0; index < kNormalActionValueCapacity; ++index) normal_action_output[index] = 0.0;
  const int mode = static_cast<int>(normal_action_input[0]);

  // Mode 1: calculate a complete hit sequence and its damage.
  if (mode == 1) {
    const int flags = static_cast<int>(normal_action_input[1]);
    const int attack_type = static_cast<int>(normal_action_input[2]);
    const int attempts = static_cast<int>(normal_action_input[3]);
    const int first_hit = static_cast<int>(normal_action_input[4]);
    const int random_count = static_cast<int>(normal_action_input[35]);
    if (attempts < 0 || first_hit < 1 || random_count < 0 || random_count > kHitBufferCapacity) return -1;
    const bool guaranteed_hit = (flags & 1) != 0;
    if ((!guaranteed_hit && random_count != attempts) || (guaranteed_hit && random_count != 0)) return -2;

    const int elemental_offense = static_cast<int>(normal_action_input[38]);
    const int terrain_id = static_cast<int>(normal_action_input[41]);
    double elemental_attribute = 1.0;
    if (terrain_id == static_cast<int>(bokemo::battle_protocol::TerrainId::Thunderstorm) && elemental_offense == 2) {
      elemental_attribute = 1.5;
    } else if (terrain_id == static_cast<int>(bokemo::battle_protocol::TerrainId::Dry) && elemental_offense == 3 && (flags & 16) == 0) {
      elemental_attribute = 0.5;
    } else if (terrain_id == static_cast<int>(bokemo::battle_protocol::TerrainId::EchoDomain) && elemental_offense != 0 && (flags & 32) == 0) {
      const double echo_count = normal_action_input[42];
      elemental_attribute = 1.0 + 0.1 * (echo_count > 1.0 ? echo_count - 1.0 : 0.0);
    }
    const double elemental_offense_value = normal_action_input[40];
    const double elemental_resistance = elemental_offense == 0 ? 1.0 : normal_action_input[39];
    const double per_hit = battle_apply_domain_damage_override(
        battle_calculate_per_hit_damage(
            normal_action_input[5], normal_action_input[6],
            normal_action_input[7], normal_action_input[8], elemental_offense_value,
            elemental_resistance, normal_action_input[11], normal_action_input[12],
            normal_action_input[13], normal_action_input[14], normal_action_input[15],
            normal_action_input[16], elemental_attribute, normal_action_input[18],
            normal_action_input[19]),
        static_cast<int>(normal_action_input[21]),
        normal_action_input[20],
        static_cast<int>(normal_action_input[22]));
    int hits = 0;
    double damage = 0.0;
    const int resonance_level = static_cast<int>(normal_action_input[29]);
    constexpr int resonance_bonus[5] = {4, 7, 9, 11, 12};
    for (int index = 0; index < attempts; ++index) {
      const bool did_hit = guaranteed_hit || hit_random_rolls[index] <= battle_hit_chance(
          normal_action_input[23], normal_action_input[24], normal_action_input[25],
          first_hit + index, attack_type, static_cast<int>(normal_action_input[26]),
          static_cast<int>(normal_action_input[27]), static_cast<int>(normal_action_input[28]),
          static_cast<int>(normal_action_input[36]));
      if (!did_hit) continue;
      ++hits;
      double resonance = 1.0;
      if (resonance_level > 0 && hits > 1) {
        const int level_index = resonance_level > 5 ? 4 : resonance_level - 1;
        resonance += 0.01 * resonance_bonus[level_index] * (hits - 1);
      }
      const double resolved = __builtin_floor(per_hit * resonance);
      damage += resolved < 1.0 ? 1.0 : resolved;
    }
    normal_action_output[1] = damage;
    normal_action_output[2] = hits;
    normal_action_output[3] = attempts;
    normal_action_output[4] = random_count;
    normal_action_output[7] = per_hit;
    return 0;
  }

  // Mode 2: choose a row target, including Bulwark redirection and optional
  // antagonism fallback to a uniformly selected ally.
  if (mode == 2) {
    const int flags = static_cast<int>(normal_action_input[1]);
    const int attack_type = static_cast<int>(normal_action_input[2]);
    unsigned int target_row = static_cast<unsigned int>(normal_action_input[32]);
    const int target_count = static_cast<int>(normal_action_input[33]);
    const int bag_count = static_cast<int>(normal_action_input[37]);
    if (target_count < 0 || target_count > kNormalActionTargetCapacity) return -3;
    if (bag_count < 0 || bag_count > kNormalActionTargetCapacity) return -5;
    int consumed = 0;
    if ((flags & 8) != 0) {
      unsigned int total_tickets = 0;
      for (int index = 0; index < bag_count; ++index) total_tickets += normal_action_bag_tickets[index];
      if (total_tickets == 0) return -6;
      const unsigned int roll = static_cast<unsigned int>(hit_random_rolls[consumed++] * total_tickets) + 1;
      unsigned int cumulative = 0;
      bool drawn = false;
      for (int index = 0; index < bag_count; ++index) {
        cumulative += normal_action_bag_tickets[index];
        if (normal_action_bag_tickets[index] == 0 || roll > cumulative) continue;
        target_row = normal_action_bag_ids[index];
        --normal_action_bag_tickets[index];
        drawn = true;
        break;
      }
      if (!drawn) return -7;
    }
    int selected = -1;
    for (int index = 0; index < target_count; ++index) {
      if (normal_action_target_rows[index] == target_row) {
        selected = index;
        break;
      }
    }
    if (selected < 0 && (flags & 2) != 0 && target_count > 0) {
      selected = static_cast<int>(hit_random_rolls[consumed++] * target_count);
      if (selected >= target_count) selected = target_count - 1;
      consumed = 1;
    }
    if (selected < 0) {
      normal_action_output[4] = consumed;
      normal_action_output[9] = target_row;
      return 0;
    }
    const bool physical = attack_type == 0 || attack_type == 2;
    const bool bulwark_breaker = (flags & 4) != 0;
    if (physical && !bulwark_breaker) {
      const unsigned int front_row = normal_action_target_rows[selected] - 1;
      for (int index = 0; index < target_count; ++index) {
        if (normal_action_target_rows[index] != front_row) continue;
        const unsigned int bulwark = normal_action_target_bulwark[index];
        if (bulwark > 0 && (attack_type == 0 || bulwark >= 2)) selected = index;
        break;
      }
    }
    normal_action_output[4] = consumed;
    normal_action_output[6] = normal_action_target_ids[selected];
    normal_action_output[9] = target_row;
    return 0;
  }

  // Mode 3: resolve special-magic priority and its state delta.
  if (mode == 3) {
    const int special_mask = static_cast<int>(normal_action_input[30]);
    const int magical_noa = static_cast<int>(normal_action_input[3]);
    int special = 0;
    if ((special_mask & 1) != 0 && magical_noa >= 20) special = 1;
    else if ((special_mask & 2) != 0 && magical_noa >= 12) special = 2;
    else if ((special_mask & 4) != 0 && magical_noa >= 10) special = 3;
    normal_action_output[5] = special;
    if (special == 1) normal_action_output[1] = __builtin_floor(normal_action_input[31] * 2.0 / 5.0);
    if (special == 2 || special == 3) normal_action_output[8] = 4.0 / 3.0;
    return 0;
  }

  return -4;
}

}  // extern "C"
