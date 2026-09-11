// SpecRef: 1.1.1 | a. bonus ability | Passive ability(常時効果アビリティ)
const scales = {
  seeker: [0, 0.005, 0.0075, 0.01, 0.012, 0.013],
  melee_conversion: [0, 0.3, 0.4, 0.45, 0.5, 0.55],
  hunter: [0.85, 0.9, 0.93, 0.95, 0.96, 0.97],
  composure: [0, 0.1, 0.13, 0.15, 0.16, 0.17],
  cyborg_accuracy: [0, 0.03, 0.04, 0.05, 0.055, 0.06],
  cyborg_evasion: [0, -0.02, -0.015, -0.012, -0.01, -0.008],
  focus: [1, 1.2, 1.3, 1.4, 1.45, 1.5],
  arc_magic: [1, 3, 3.6, 4.2, 4.7, 5.1],
} as const;

export function abilityLevelValue(id: keyof typeof scales, level: number): number {
  const values = scales[id];
  return values[Math.max(0, Math.min(values.length - 1, Math.floor(level)))];
}
