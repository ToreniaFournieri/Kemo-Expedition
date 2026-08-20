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
  return 5;
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

  // Mode 4: defensive reaction priority. Ability levels occupy slots 43-58;
  // output[5] is absorb/nullify/reflect (1/2/3), output[6] identifies the
  // selected ability, and output[8] is its amplifier.
  if (mode == 4) {
    const int flags = static_cast<int>(normal_action_input[1]);
    const int attack_type = static_cast<int>(normal_action_input[2]);
    const int elemental = static_cast<int>(normal_action_input[38]);
    const auto level = [](double value) { return static_cast<int>(value); };
    int reaction = 0;
    int ability = 0;
    int ability_level = 0;
    const bool elemental_allowed =
        (elemental == 1 && (flags & 2) == 0) ||
        (elemental == 2 && (flags & 4) == 0) ||
        (elemental == 3 && (flags & 1) == 0);

    // Absorption has first priority.
    if (elemental_allowed && elemental == 3 && level(normal_action_input[43]) > 0) { reaction = 1; ability = 1; ability_level = level(normal_action_input[43]); }
    else if (elemental_allowed && elemental == 1 && level(normal_action_input[44]) > 0) { reaction = 1; ability = 2; ability_level = level(normal_action_input[44]); }
    else if (elemental_allowed && elemental == 2 && level(normal_action_input[45]) > 0) { reaction = 1; ability = 3; ability_level = level(normal_action_input[45]); }
    else if (attack_type == 1 && (flags & 8) == 0 && level(normal_action_input[46]) > 0) { reaction = 1; ability = 4; ability_level = level(normal_action_input[46]); }

    // Nullification has second priority and is not disabled by protect breakers.
    if (reaction == 0) {
      if (elemental == 3 && level(normal_action_input[47]) > 0) { reaction = 2; ability = 5; }
      else if (elemental == 1 && level(normal_action_input[48]) > 0) { reaction = 2; ability = 6; }
      else if (elemental == 2 && level(normal_action_input[49]) > 0) { reaction = 2; ability = 7; }
      else if (attack_type == 0 && level(normal_action_input[50]) > 0) { reaction = 2; ability = 8; }
      else if (attack_type == 1 && level(normal_action_input[51]) > 0) { reaction = 2; ability = 9; }
      else if (attack_type == 2 && level(normal_action_input[52]) > 0) { reaction = 2; ability = 10; }
    }

    // Reflection has last priority.
    if (reaction == 0) {
      if (elemental_allowed && elemental == 3 && level(normal_action_input[53]) > 0) { reaction = 3; ability = 11; ability_level = level(normal_action_input[53]); }
      else if (elemental_allowed && elemental == 1 && level(normal_action_input[54]) > 0) { reaction = 3; ability = 12; ability_level = level(normal_action_input[54]); }
      else if (elemental_allowed && elemental == 2 && level(normal_action_input[55]) > 0) { reaction = 3; ability = 13; ability_level = level(normal_action_input[55]); }
      else if (attack_type == 0 && level(normal_action_input[56]) > 0) { reaction = 3; ability = 14; ability_level = level(normal_action_input[56]); }
      else if (attack_type == 1 && (flags & 8) == 0 && level(normal_action_input[57]) > 0) { reaction = 3; ability = 15; ability_level = level(normal_action_input[57]); }
      else if (attack_type == 2 && level(normal_action_input[58]) > 0) { reaction = 3; ability = 16; ability_level = level(normal_action_input[58]); }
    }

    double amplifier = 0.0;
    if (reaction == 1) {
      amplifier = ability_level >= 5 ? 1.0 : ability_level == 4 ? 0.7 : ability_level == 3 ? 0.5 : ability_level == 2 ? 0.3 : 0.1;
    } else if (reaction == 3) {
      amplifier = ability_level >= 5 ? 0.5 : ability_level == 4 ? 0.35 : ability_level == 3 ? 0.2 : ability_level == 2 ? 0.1 : 0.05;
    }
    normal_action_output[5] = reaction;
    normal_action_output[6] = ability;
    normal_action_output[8] = amplifier;
    return 0;
  }

  // Mode 5: apply a selected defensive reaction to one damage unit.
  if (mode == 5) {
    const int reaction = static_cast<int>(normal_action_input[1]);
    const double source = normal_action_input[5];
    const double amplifier = normal_action_input[8];
    if (reaction == 1) {
      normal_action_output[3] = source > 0.0 ? __builtin_floor(source * amplifier) : 0.0;
      if (source > 0.0 && normal_action_output[3] < 1.0) normal_action_output[3] = 1.0;
    } else if (reaction == 2) {
      normal_action_output[1] = 0.0;
    } else if (reaction == 3) {
      double reflected = __builtin_floor(source * amplifier * normal_action_input[11] * normal_action_input[12]);
      if (source > 0.0 && reflected < 1.0) reflected = 1.0;
      normal_action_output[1] = __builtin_floor(source * (1.0 - amplifier));
      if (normal_action_output[1] < 0.0) normal_action_output[1] = 0.0;
      normal_action_output[2] = reflected;
    } else {
      normal_action_output[1] = source;
    }
    return 0;
  }

  // Mode 6: close-range reactive effects (life drain, burn, bind).
  if (mode == 6) {
    const int flags = static_cast<int>(normal_action_input[1]);
    const int hits = static_cast<int>(normal_action_input[3]);
    const double damage = normal_action_input[5];
    const int life_level = static_cast<int>(normal_action_input[43]);
    const int burn_level = static_cast<int>(normal_action_input[44]);
    const int bind_level = static_cast<int>(normal_action_input[45]);
    constexpr double life[7] = {0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1.0};
    constexpr double burn[5] = {0.5, 0.9, 1.2, 1.4, 1.5};
    constexpr int bind[5] = {2, 3, 4, 5, 6};
    if (life_level > 0 && (flags & 16) == 0 && damage > 0.0) {
      const int index = life_level > 7 ? 6 : life_level - 1;
      normal_action_output[1] = __builtin_floor(damage * life[index]);
      normal_action_output[8] = life[index];
    }
    if (burn_level > 0 && (flags & 32) == 0 && hits > 0) {
      const int index = burn_level > 5 ? 4 : burn_level - 1;
      normal_action_output[2] = __builtin_floor(normal_action_input[20] * hits * (burn[index] / 100.0) * normal_action_input[39]);
    }
    if (bind_level > 0 && (flags & 64) == 0 && hits > 0) {
      const int index = bind_level > 5 ? 4 : bind_level - 1;
      double chance = static_cast<double>(hits * bind[index]) / 64.0;
      if (chance > 1.0) chance = 1.0;
      normal_action_output[7] = chance;
      normal_action_output[4] = 1;
      normal_action_output[5] = hit_random_rolls[0] < chance ? 1.0 : 0.0;
    }
    return 0;
  }

  // Mode 7: Shock interruption and once-per-battle consumption signal.
  if (mode == 7) {
    const bool available = (static_cast<int>(normal_action_input[1]) & 1) != 0;
    const bool nullified = (static_cast<int>(normal_action_input[1]) & 2) != 0;
    const int hits = static_cast<int>(normal_action_input[3]);
    const double damage = normal_action_input[5];
    normal_action_output[1] = available && !nullified && hits > 1 && damage > 0.0
        ? __builtin_floor(damage / hits) : damage;
    normal_action_output[2] = available && !nullified && hits > 1 ? 1 : hits;
    normal_action_output[5] = available ? 1 : 0;
    return 0;
  }

  // Mode 8: counter, re-counter, covering-fire, and re-attack profiles.
  if (mode == 8) {
    const int kind = static_cast<int>(normal_action_input[44]);
    const int level = static_cast<int>(normal_action_input[43]);
    double multiplier = 0.0;
    int count = 0;
    if (kind == 1 && level > 0) multiplier = level >= 3 ? 2.0 : level == 2 ? 1.0 : 0.5;
    else if (kind == 2 && level > 0) multiplier = level >= 2 ? 1.0 : 0.5;
    else if (kind == 3 && level > 0) { multiplier = level >= 3 ? 1.0 : level == 2 ? 0.7 : 0.5; count = 1; }
    normal_action_output[3] = count;
    normal_action_output[8] = multiplier;
    return 0;
  }

  // Mode 9: defeat recovery priority and healing delta.
  if (mode == 9) {
    const int flags = static_cast<int>(normal_action_input[1]);
    const int resurrect_level = static_cast<int>(normal_action_input[43]);
    const int reanimate_level = static_cast<int>(normal_action_input[44]);
    const double max_hp = normal_action_input[20];
    if (resurrect_level > 0 && (flags & 1) == 0) {
      normal_action_output[5] = 1;
      normal_action_output[1] = resurrect_level >= 2 ? __builtin_ceil(max_hp * 0.01) : 1.0;
    } else if (reanimate_level > 0 && (flags & 2) == 0) {
      constexpr int percents[5] = {20, 26, 31, 35, 38};
      const int index = reanimate_level > 5 ? 4 : reanimate_level - 1;
      normal_action_output[5] = 2;
      normal_action_output[1] = __builtin_ceil(max_hp * percents[index] / 100.0);
    }
    if (normal_action_output[5] != 0 && normal_action_output[1] < 1.0) normal_action_output[1] = 1.0;
    return 0;
  }

  return -4;
}

}  // extern "C"
