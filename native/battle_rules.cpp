#include "ability_level_scales.h"
#include "generated/battle_protocol.generated.h"

extern "C" {

double battle_calculate_per_hit_damage(
    double, double, double, double, double, double, double, double,
    double, double, double, double, double, double, double);
double battle_hit_chance(double, double, double, int, int, int, int, int, int);
double battle_apply_domain_damage_override(double, int, double, int);
double* battle_hit_random_buffer();

constexpr int kNormalActionValueCapacity = 64;
constexpr int kNormalActionTargetCapacity = 16;
constexpr int kHitBufferCapacity = 4096;
double normal_action_input[kNormalActionValueCapacity];
double normal_action_output[kNormalActionValueCapacity];
unsigned int normal_action_target_ids[kNormalActionTargetCapacity];
unsigned int normal_action_target_rows[kNormalActionTargetCapacity];
unsigned int normal_action_target_bulwark[kNormalActionTargetCapacity];
unsigned int normal_action_bag_ids[kNormalActionTargetCapacity];
unsigned int normal_action_bag_tickets[kNormalActionTargetCapacity];

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
      const bool did_hit = guaranteed_hit || battle_hit_random_buffer()[index] <= battle_hit_chance(
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
      const unsigned int roll = static_cast<unsigned int>(battle_hit_random_buffer()[consumed++] * total_tickets) + 1;
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
      selected = static_cast<int>(battle_hit_random_buffer()[consumed++] * target_count);
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
      normal_action_output[5] = battle_hit_random_buffer()[0] < chance ? 1.0 : 0.0;
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
    if (kind == 1 && level > 0) multiplier = ability_scales::value(level, ability_scales::counter);
    else if (kind == 2 && level > 0) multiplier = ability_scales::value(level, ability_scales::re_counter);
    else if (kind == 3 && level > 0) { multiplier = ability_scales::value(level, ability_scales::re_attack); count = 1; }
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
      normal_action_output[1] = resurrect_level >= 2 ? __builtin_ceil(max_hp * ability_scales::value(resurrect_level, ability_scales::resurrect)) : 1.0;
    } else if (reanimate_level > 0 && (flags & 2) == 0) {
      constexpr int percents[5] = {20, 26, 31, 35, 38};
      const int index = reanimate_level > 5 ? 4 : reanimate_level - 1;
      normal_action_output[5] = 2;
      normal_action_output[1] = __builtin_ceil(max_hp * percents[index] / 100.0);
    }
    if (normal_action_output[5] != 0 && normal_action_output[1] < 1.0) normal_action_output[1] = 1.0;
    return 0;
  }

  // Mode 10: deterministic uniform selection for START/END/timed effects.
  if (mode == 10) {
    const int count = static_cast<int>(normal_action_input[33]);
    if (count < 0) return -8;
    if (count == 0) return 0;
    int selected = static_cast<int>(battle_hit_random_buffer()[0] * count);
    if (selected >= count) selected = count - 1;
    normal_action_output[4] = 1;
    normal_action_output[6] = selected + 1;
    return 0;
  }

  // Mode 11: confusion timing, target selection, and probability roll.
  if (mode == 11) {
    const int flags = static_cast<int>(normal_action_input[1]);
    const int attack_type = static_cast<int>(normal_action_input[2]);
    const int level = static_cast<int>(normal_action_input[43]);
    const int target_count = static_cast<int>(normal_action_input[33]);
    if (level <= 0) return 0;
    const int timing = attack_type == 0 ? (level <= 2 ? 7 : 8)
        : attack_type == 1 ? (level <= 2 ? 4 : 5)
        : (level <= 2 ? 1 : 2);
    const int numerator = level >= 5 ? 7 : level == 4 ? 5 : level >= 2 ? 3 : 1;
    normal_action_output[7] = static_cast<double>(numerator) / 32.0;
    normal_action_output[9] = timing;
    if (target_count <= 0) return 0;
    if ((flags & 1) != 0) {
      normal_action_output[6] = 1;
      normal_action_output[5] = battle_hit_random_buffer()[0] < normal_action_output[7] ? 1 : 0;
      normal_action_output[4] = 1;
      return 0;
    }
    int selected = static_cast<int>(battle_hit_random_buffer()[0] * target_count);
    if (selected >= target_count) selected = target_count - 1;
    normal_action_output[6] = selected + 1;
    normal_action_output[5] = battle_hit_random_buffer()[1] < normal_action_output[7] ? 1 : 0;
    normal_action_output[4] = 2;
    return 0;
  }

  // Mode 12: level-based timed ability formulas and state deltas.
  if (mode == 12) {
    const int kind = static_cast<int>(normal_action_input[44]);
    const int level = static_cast<int>(normal_action_input[43]);
    const double current_hp = normal_action_input[31];
    const double max_hp = normal_action_input[20];
    double value = 0.0;
    if (kind == 1) value = level >= 5 ? 50 : level == 4 ? 48 : level == 3 ? 44 : level == 2 ? 38 : level == 1 ? 30 : 0;
    else if (kind == 2) {
      value = level >= 5 ? 24 : level == 4 ? 22 : level == 3 ? 19 : level == 2 ? 15 : level == 1 ? 10 : 0;
      double heal = __builtin_floor(normal_action_input[5] * value / 100.0);
      const double missing = max_hp - current_hp;
      normal_action_output[1] = heal < missing ? heal : missing;
      if (normal_action_output[1] < 0.0) normal_action_output[1] = 0.0;
    } else if (kind == 3) value = level >= 3 ? 0.50 : level == 2 ? 0.45 : level == 1 ? 0.40 : 0;
    else if (kind == 4) value = level >= 5 ? 2.0 / 7.0 : level == 4 ? 3.0 / 7.0 : level == 3 ? 4.0 / 7.0 : level == 2 ? 5.0 / 7.0 : level == 1 ? 6.0 / 7.0 : 1.0;
    else if (kind == 5) {
      value = level >= 5 ? 12 : level == 4 ? 15 : level == 3 ? 19 : level == 2 ? 24 : level == 1 ? 30 : 0;
      normal_action_output[1] = __builtin_ceil(current_hp * value / 100.0);
      if (normal_action_output[1] > current_hp) normal_action_output[1] = current_hp;
    } else if (kind == 6) {
      value = level >= 5 ? 20 : level == 4 ? 19 : level == 3 ? 17 : level == 2 ? 14 : level == 1 ? 10 : 0;
      normal_action_output[5] = value > 0.0 && current_hp < max_hp * value / 100.0 ? 1 : 0;
    } else if (kind == 7) value = level <= 0 ? 1.0 : level >= 5 ? 1.0 / 7.0 : level == 4 ? 2.0 / 7.0 : level == 3 ? 3.0 / 7.0 : level == 2 ? 4.0 / 7.0 : 5.0 / 7.0;
    else if (kind == 8) value = level > 0 ? (level > 5 ? 5 : level) : -1;
    else if (kind == 9) {
      const double ratio = level >= 5 ? 1.0 : level == 4 ? 0.7 : level == 3 ? 0.5 : level == 2 ? 0.3 : level == 1 ? 0.1 : 0.0;
      const double base = current_hp - normal_action_input[6];
      normal_action_output[1] = base > 0.0 ? __builtin_floor(ratio * base * (normal_action_input[11] < 0.01 ? 0.01 : normal_action_input[11])) : 0.0;
    }
    normal_action_output[8] = value;
    return 0;
  }

  // Mode 13: authoritative phase/timing slots for timed abilities.
  if (mode == 13) {
    const int event = static_cast<int>(normal_action_input[43]);
    const int phase = static_cast<int>(normal_action_input[2]); // 0/1/2 combat, 3 START, 4 END
    const int timing = static_cast<int>(normal_action_input[3]);
    bool active = false;
    if (event == 1) active = phase == 3 && timing == 9; // Oblivion
    else if (event == 2) active = phase == 3 && timing == 8; // Fading Memory / Mimic
    else if (event == 3) active = phase == 3 && timing == 7; // party effects
    else if (event == 4) active = phase == 3 && timing == 3; // seals/frostbite/mutual
    else if (event == 5) active = phase == 0 && timing == 8; // Howl
    else if (event == 6) active = phase == 2 && timing == 4; // Predator Sense
    else if (event == 7) active = phase == 2 && timing == 3; // Regeneration
    else if (event == 8) active = phase == 2 && timing == 3; // Flying
    else if (event == 9) active = phase == 2 && timing == 2; // Decompose
    else if (event == 10) active = phase == 2 && timing == 2; // Self Destruct
    else if (event == 11) active = (phase == 0 && timing == 4) || (phase == 1 && timing == 0); // Unstable Core
    else if (event == 12) active = phase == 0 && timing == 2; // Soul Reap
    normal_action_output[5] = active ? 1 : 0;
    return 0;
  }

  // Mode 14: action-timed terrain HP effects.
  if (mode == 14) {
    const int flags = static_cast<int>(normal_action_input[1]);
    const int attack_type = static_cast<int>(normal_action_input[2]);
    const int elemental = static_cast<int>(normal_action_input[38]);
    const int terrain = static_cast<int>(normal_action_input[41]);
    const double current_hp = normal_action_input[31];
    const double max_hp = normal_action_input[20];
    const double total_damage = normal_action_input[5];
    int effect = 0;
    double damage = 0.0;
    if (terrain == static_cast<int>(bokemo::battle_protocol::TerrainId::VineSnare) && (flags & 1) == 0) { effect = 1; damage = __builtin_floor(current_hp * 0.01); }
    else if (terrain == static_cast<int>(bokemo::battle_protocol::TerrainId::CrystalZone) && attack_type == 1 && (flags & 2) == 0) { effect = 2; damage = __builtin_floor(total_damage * 0.05); }
    else if (terrain == static_cast<int>(bokemo::battle_protocol::TerrainId::Conduction) && elemental == 2) { effect = 3; damage = __builtin_floor(total_damage * 0.05); }
    else if (terrain == static_cast<int>(bokemo::battle_protocol::TerrainId::ManaBurn) && attack_type == 1 && (flags & 2) == 0) { effect = 4; damage = __builtin_floor(max_hp * 0.02); }
    else if (terrain == static_cast<int>(bokemo::battle_protocol::TerrainId::SacredJudgement) && (flags & 4) != 0 && (flags & 8) == 0) { effect = 5; damage = __builtin_floor(current_hp * 0.05); }
    normal_action_output[1] = damage;
    normal_action_output[5] = effect;
    if (terrain == static_cast<int>(bokemo::battle_protocol::TerrainId::ChainLightning) && elemental == 2) {
      normal_action_output[2] = __builtin_floor(total_damage * 0.30);
    }
    return 0;
  }

  // Mode 15: END-phase periodic deity HP effects.
  if (mode == 15) {
    const int flags = static_cast<int>(normal_action_input[1]);
    const int deity = static_cast<int>(normal_action_input[43]); // 1 restoration, 2 attrition
    const double current_hp = normal_action_input[31];
    const double max_hp = normal_action_input[20];
    normal_action_output[9] = current_hp;
    if ((flags & 1) == 0 || (flags & 2) != 0) return 0; // not Elite-fourth or Gehenna
    if (deity == 1 && (flags & 4) == 0) {
      const double heal = __builtin_floor((max_hp - current_hp) * (0.2 + 0.001 * normal_action_input[44]));
      normal_action_output[1] = heal > 0.0 ? heal : 0.0;
      normal_action_output[9] = current_hp + normal_action_output[1] > max_hp ? max_hp : current_hp + normal_action_output[1];
    } else if (deity == 2) {
      double next = __builtin_floor(current_hp * 0.95);
      if (next < 1.0) next = 1.0;
      normal_action_output[2] = current_hp > next ? current_hp - next : 0.0;
      normal_action_output[9] = next;
    }
    return 0;
  }

  return -4;
}

}  // extern "C"
