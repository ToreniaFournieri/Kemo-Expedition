#pragma once

namespace bokemo::battle {

using u64 = unsigned long long;

inline constexpr unsigned int kBattleRngVersion = 1;

class BattleRng {
 public:
  BattleRng() = default;
  explicit BattleRng(u64 seed) { seed_state(seed); }

  void seed_state(u64 seed) {
    u64 splitmix_state = seed;
    for (int index = 0; index < 4; ++index) state_[index] = splitmix64(splitmix_state);
  }

  u64 next_u64() {
    const u64 result = rotate_left(state_[1] * 5u, 7) * 9u;
    const u64 temporary = state_[1] << 17;
    state_[2] ^= state_[0];
    state_[3] ^= state_[1];
    state_[1] ^= state_[2];
    state_[0] ^= state_[3];
    state_[2] ^= temporary;
    state_[3] = rotate_left(state_[3], 45);
    return result;
  }

  double next_double() {
    return static_cast<double>(next_u64() >> 11) * (1.0 / 9007199254740992.0);
  }

 private:
  static u64 rotate_left(u64 value, int amount) {
    return (value << amount) | (value >> (64 - amount));
  }

  static u64 splitmix64(u64& state) {
    u64 value = (state += 0x9e3779b97f4a7c15ull);
    value = (value ^ (value >> 30)) * 0xbf58476d1ce4e5b9ull;
    value = (value ^ (value >> 27)) * 0x94d049bb133111ebull;
    return value ^ (value >> 31);
  }

  u64 state_[4]{};
};

}  // namespace bokemo::battle
