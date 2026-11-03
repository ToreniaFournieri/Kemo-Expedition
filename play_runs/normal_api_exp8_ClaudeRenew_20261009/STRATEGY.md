# ClaudeRenew: v0.10.1 (30) Normal API strategy -- "Renewal Bosses"
Written before signup, 2026-10-09. Goals: (1) D8 boss, (2) min in-game time, (3) min API calls, 8 h real time.
Record to beat: ClaudeCharge 19.89 d / 818 calls (build 27, old bosses). Fable 28.09 d / 449 calls.

## What changed (build 29 -> 30, commits 63b9dad2 / a83e0585): every boss renewed
| Boss | Change | Expected effect for our party |
|---|---|---|
| D1 135 Velg | magic DEF x2/3 | easier for the caster (Selfin alchemist/wizard) |
| D2 171 Rosalia | growth 2.0->1.5, phys DEF x1/2, magic DEF x3/2, melee amp x2 | much easier for physical attackers, hits the front harder |
| D3 207 Goldtail | growth 1.5->1.7, phys DEF x2/3 | bigger HP/attack, physical still OK |
| D4 243 Maura | ranged NoA x1.5 | more incoming damage -> HP/defense for supports |
| D5 279 Kelvina | physical offense x1.5 | same; tank HP plan |
| D6 315 Reaper | accuracy +0.03 | small |
| D7 351 Walter | penet +0.20 | more damage through armour |
| D8 387 Selva-Rem | magical offense x1.5 | magic damage + shock/seal -> magical defense/HP matters |
Twin check with ClaudeCharge's final save (Lv32, D8 gear) on build 30: D8 boss-only 97.5% kills (was 97% on build 27),
D7 100%, D6 86%. So the D8 boss is still a gear/tier problem, and route survival stays the last wall.

## Plan (Charge-Clock baseline + its own "opportunities")
- Same proven party/opening (9 calls): Laika guardian/guardian front, Kemo lord/lord, 3 Ursan/Leporian ninja/ranger
  abyssal_sea precise, Selfin alchemist/wizard utopia introspective; order [6,1,4,2,3,5], Mirage.
- Charge-clock loops: D1 3 h + sortie 3, D2 1 h + 4, D3 2 h + 5, then 186 min + 5 grinds (k=6/378 min when the party is
  clearly too weak, to save calls); k=3 loops once the boss is open with >=10% odds.
- No depthLimit calls for gates; beforeBoss only when the boss is open but hopeless.
- **Rate the boss at gate-open** (Charge lost ~0.3 d at D1).
- **Fixed 12 h re-plan cadence at walls**: export -> pipe.sh (proxyopt + hpopt, deity lever) -> GA seeded from the best
  -> apply only if > +10 points. Count inventory by tier; re-plan as soon as a new tier piles up.
- Renewal-aware weights: D1 caster first; D2 physical attackers; D4/D5/D8 add hpopt (defense) for supports;
  D8 check magical defense via bossfight before buying.
- Observe with read/observation/expedition (compact only if needed). Kill time from Global Diary bossFirstClear.
