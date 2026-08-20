// The battle coordinator deliberately supplies random rolls from JavaScript.
// This keeps the canonical Math.random() draw order unchanged across browser,
// Electron, AFK workers, and Experimental API sorties.

extern "C" {

constexpr int kHitBufferCapacity = 4096;
double hit_random_rolls[kHitBufferCapacity];
unsigned char hit_results[kHitBufferCapacity];

int battle_kernel_abi_version() {
  return 1;
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

}  // extern "C"
