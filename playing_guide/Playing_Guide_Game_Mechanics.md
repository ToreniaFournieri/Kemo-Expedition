# Game Mechanics

Version: v0.9.6 (20)

Environment: Desktop Orca; `mode.orca`; enemy offset `+5`; Debug Mode OFF.

## Increase Bonus Descriptions (stacking)


| Bonus | Description |
|---|---|
| `Ranged ATK +v` | Adds to ranged attack. Deals damage when it exceeds enemy physical defense. |
| `Melee ATK +v` | Adds to melee attack. Deals damage when it exceeds enemy physical defense. |
| `Magic ATK +v` | Adds to magic attack. Deals damage when it exceeds enemy magical defense. |
| `Ranged Hits +v` | Increases ranged attack count. |
| `Magic Hits +v` | Increases magic attack count. |
| `Melee Hits +v` | Increases melee attack count. |
| Ranged Attack Multiplier | Damage multiplier for ranged attacks. This multiplier is applied to `(ranged attack - enemy physical defense)`. |
| Magic Attack Multiplier | Damage multiplier for magic attacks. This multiplier is applied to `(magic attack - enemy magical defense)`. |
| Melee Attack Multiplier | Damage multiplier for melee attacks. This multiplier is applied to `(melee attack - enemy physical defense)`. |
| `P.DEF +v` | Adds to physical defense. Damage is based on enemy ranged/melee attack minus this value. |
| `M.DEF +v` | Adds to magical defense. Damage is based on enemy magic attack minus this value. |
| Physical Resistance | The lower physical resistance is, the less ranged/melee damage is taken. This multiplier is applied to physical damage. |
| Magical Resistance | The lower magical resistance is, the less magic damage is taken. This multiplier is applied to magic damage. |
| Physical Accuracy | Accuracy of the first attack. Accuracy decreases in rear positions (15% per row). Enemies without formation are always 100%. |
| Magic Accuracy | Normally 100% regardless of formation. The first attack always hits. |
| `Accuracy +v` | Adds to accuracy decay. Higher accuracy increases the number of hits during multi-hit attacks.<br><br>At decay `x0.90`, a 20-hit attack averages 8.8 hits.<br>At decay `x0.92`, a 20-hit attack averages 10.5 hits (`Accuracy +20`). |
| `Evasion +v` | Subtracts from enemy accuracy decay. Higher evasion reduces hits taken from enemy multi-hit attacks.<br><br>At decay `x0.90`, a 20-hit attack averages 8.8 hits.<br>At decay `x0.88`, a 20-hit attack averages 7.5 hits (`Evasion +20`). |
| Accuracy Decay | Strengthens accuracy decay, making later hits in multi-hit attacks more likely to miss. |
| Attack Element | Attack elements consist of fire, ice, thunder, and none. The element with the highest multiplier is used as the attack element, and its multiplier is applied to damage. |
| Elemental Resistance | Resistance against enemy elemental attacks. Lower resistance values reduce damage from that element. |
| `Fire Element +v%` | Attacks become fire 🔥 element and gain `v%` power. |
| `Ice Element +v%` | Attacks become ice ❄️ element and gain `v%` power. |
| `Thunder Element +v%` | Attacks become thunder ⚡ element and gain `v%` power. |


## Physical Targeting

Selects attack targets during ranged/melee phases.

Position 5 can never be targeted by physical attacks 3 or more times when the enemy attacks 32 times.

| Position | Weight |
|---|---:|
| 1 | 16 |
| 2 | 8 |
| 3 | 4 |
| 4 | 2 |
| 5 | 1 |
| 6 | 1 |

## Magic Targeting

The magic phase selects targets regardless of formation.

| Position | Weight |
|---|---:|
| 1 | 2 |
| 2 | 2 |
| 3 | 2 |
| 4 | 2 |
| 5 | 2 |
| 6 | 2 |

## Damage Calculation

Damage is calculated as `attack - defense (after pierce reduction) × modifiers`.

Modifiers include element multipliers, resistance multipliers, Resonance, Rage, Momentum, and party bonuses.

## Accuracy Decay

Later hits in a multi-hit action suffer accuracy decay. It is calculated per action and is not carried across normal attacks, follow-up attacks, or counters.

| Position | Normal | Hunter 1 | Hunter 2 | Hunter 3 |
|---|---:|---:|---:|---:|
| 1 | 1.00 | 1.00 | 1.00 | 1.00 |
| 2 | 0.85 | 0.90 | 0.93 | 0.95 |
| 3 | 0.72 | 0.81 | 0.86 | 0.90 |
| 4 | 0.61 | 0.73 | 0.80 | 0.86 |
| 5 | 0.52 | 0.66 | 0.75 | 0.81 |
| 6 | 0.44 | 0.59 | 0.70 | 0.77 |

## Counter

After being hit in the melee phase, counters immediately. Nullified by Counter Nullification. Ignores Bulwark substitution.

## Counter Counter

Counters a counter. Nullified by Counter Nullification.

## Follow-up Attack

Performs an additional attack after attacking. Follows up against the same target. Ignores Bulwark substitution.

## Magic Counter

Counters magic attacks immediately.

## Covering Fire

Follows up when an ally acts. An ally capable of ranged attacks fires immediately.

## Reward Calculation

Calculates additional item lottery tickets based on battle results. Normally 2 tickets; divine blessing adds +1.

## Donation Amount

At the end of the prayer phase, sale proceeds may be donated to the worshiped god. Faith is strengthened based on the donation amount.

| Rank | Donation Amount |
|---:|---:|
| 1 | 1,000 |
| 2 | 2,800 |
| 3 | 7,560 |
| 4 | 19,656 |
| 5 | 49,140 |
| 6 | 117,936 |
| 7 | 271,253 |
| 8 | 596,757 |
| 9 | 1,253,190 |
| 10 | 2,506,380 |

## Equipment Slot Increase

Equipment slots increase with level-ups.

| Level | Equipment Slots |
|---:|---:|
| 1 | 1 |
| 3 | 2 |
| 6 | 3 |
| 10 | 4 |
| 14 | 5 |
| 19 | 6 |
| 24 | 7 |
| 30 | 8 |
| 36 | 9 |
| 43 | 10 |
| 50 | 11 |
| 57 | 12 |
| 65 | 13 |
| 73 | 14 |
| 81 | 15 |
| 90 | 16 |
| 99 | 17 |

## Common Item Normal Titles

Chance for a normal title to be granted to common items.

| Normal Title | Chance |
|---|---:|
| (None) | 1390 |
| Masterwork | 350 |
| Demonic | 180 |
| Spirit-Bound | 60 |
| Legendary | 15 |
| Dread | 4 |
| Ultimate | 1 |

## Rare Item Normal Titles

Chance for a normal title to be granted to uncommon, elite rare, boss rare, and mythic rare items.

| Normal Title | Chance |
|---|---:|
| (None) | 5490 |
| Masterwork | 350 |
| Demonic | 180 |
| Spirit-Bound | 60 |
| Legendary | 15 |
| Dread | 4 |
| Ultimate | 1 |

## Normal Title Performance Boost

Base performance modifier by normal title tier.

| Normal Title | Multiplier |
|---|---:|
| (None) | x1.00 |
| Masterwork | x1.33 |
| Demonic | x1.58 |
| Spirit-Bound | x2.10 |
| Legendary | x2.75 |
| Dread | x3.50 |
| Ultimate | x5.00 |

## Rarity Performance Boost

Base performance modifier by rarity tier.

| Rarity | Multiplier |
|---|---:|
| Common | x1.0 |
| Uncommon | x1.2 |
| Elite Rare | x1.6 |
| Boss Rare | x2.4 |
| Mythic Rare | x3.6 |

## Super Rare Performance Boost

When a Super Rare title is added, base performance is doubled again and a unique bonus is granted.

## AFK Efficiency

Party members start slacking off as AFK time grows.

| AFK Time | Efficiency |
|---|---:|
| 0–9h | x1 |
| 9–18h | x2/3 |
| 18–30h | x1/2 |
| 30–48h | x1/3 |
| 48–72h | x1/4 |
| 72–108h | x1/6 |
| 108–162h | x1/9 |

## Condition

As their condition improves, party members start taking on greater challenges (advancing to the next dungeon or challenging a Gods Battle). They also enjoy more free time.

When their condition is poor, free time becomes very short.
