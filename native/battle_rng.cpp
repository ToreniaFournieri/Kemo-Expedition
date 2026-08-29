#include "battle_rng.h"

namespace {
bokemo::battle::BattleRng test_rng(0);
}

extern "C" {

unsigned int battle_rng_version() {
  return bokemo::battle::kBattleRngVersion;
}

void battle_rng_seed(unsigned int seed_low, unsigned int seed_high) {
  const auto seed = (static_cast<bokemo::battle::u64>(seed_high) << 32) |
      static_cast<bokemo::battle::u64>(seed_low);
  test_rng.seed_state(seed);
}

bokemo::battle::u64 battle_rng_next_u64() {
  return test_rng.next_u64();
}

double battle_rng_next_double() {
  return test_rng.next_double();
}

}  // extern "C"
