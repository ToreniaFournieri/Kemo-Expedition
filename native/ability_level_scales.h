#pragma once

// SpecRef: 1.1.1 | a. bonus ability | Passive ability(常時効果アビリティ)
namespace ability_scales {
inline constexpr double iaigiri[5] = {1.6, 1.8, 2, 2.2, 2.4};
inline constexpr double heavy[5] = {0.01, 0.015, 0.018, 0.02, 0.021};
inline constexpr double arc[5] = {3, 3.6, 4.2, 4.7, 5.1};
inline constexpr double focus[5] = {1.2, 1.3, 1.4, 1.45, 1.5};
inline constexpr double stability[5] = {0.55, 0.6, 0.64, 0.67, 0.69};
inline constexpr double rage[5] = {0.5, 0.6, 0.7, 0.75, 0.8};
inline constexpr double momentum[5] = {0.5, 0.4, 0.35, 0.3, 0.25};
inline constexpr double execution_threshold[5] = {0.4, 0.5, 0.5, 0.55, 0.58};
inline constexpr double execution[5] = {1.5, 1.8, 2, 2.1, 2.2};
inline constexpr double stealth[5] = {0.12, 0.18, 0.22, 0.22, 0.22};
inline constexpr double resurrect[5] = {0, 0.01, 0.02, 0.05, 0.1};
inline constexpr double re_attack[5] = {0.5, 0.7, 1, 1.2, 1.3};
inline constexpr double counter[5] = {0.5, 1, 2, 2.5, 3};
inline constexpr double re_counter[5] = {0.5, 1, 1.4, 1.8, 2.2};
inline constexpr double covering[5] = {0.5, 1, 1.4, 1.7, 2};
inline double value(int level, const double (&values)[5]) {
  return values[level < 1 ? 0 : level > 5 ? 4 : level - 1];
}
}
