## 7. AUTOMATION

### 7.2 AUTOMATION OTHERS

#### 7.2.1 AUTO Jewel Equipment

- In the Inventory tab → Jewel subcategory, the player can select one Party as the **Jewel Priority Party**.
- Label: **自動結晶装備**
- Selection List:
  - `手動`
  - `PT1`, `PT2`, `PT3`...
- Only unlocked Parties are displayed in the selection list.
- Default: `PT1`

- During Auto Equipment timing, if the target party is the Jewel Priority Party, its members automatically equip jewels according to the following rules.


#### 7.2.2 AUTO progress logic
- Each party has a parameter condition.
  - Initial value: 0
  - Minimum value (floor): -400
  - Maximum value (cell): +400
- `condition` is adjusted based on expedition outcomes:
  - Update timing: applied at the end of `state.explore` to prevent spoilers.

| Outcome | `condition.terrible` | `condition.poor` | `condition.low` | `condition.cautious` | `condition.normal` | `condition.steady` | `condition.good` | `condition.great` | `condition.excellent` |
|--|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| `Clear` | +15 | +12 | +9 | +6  | +4 | +3 | +2  |  +1  |  +1 |
| `Turned_Back` | +6 | +5 | +4 | +3 | +2 | +1  | +1 | 0 | 0 |
| `Draw_Retreat` | +2 | +1 | +1 | 0 | -1 | -3 | -4 | -5 | -6 |
| `Wounded_Retreat` | +1  | 0 | -1 | -2 | -8 | -10 | -12 | -14 | -16 |
| `Defeat` | -4 | -15 | -26 | -38 | -50 | -58 | -64 | -68 | -70 |

| `condition` | key | label |
|--:|--|--|
| -400 ~ -350 | `condition.terrible` | 絶不調 |
| -349 ~ -250 | `condition.poor` | 不調 |
| -249 ~ -150 | `condition.low` | 低調 |
| -149 ~ -50 | `condition.cautious` | 慎重 |
| -49 ~ 50 | `condition.normal` | 平常 |
| 51 ~ 150 | `condition.steady` | 順調 |
| 151 ~ 250 | `condition.good` | 快調 |
| 251 ~ 350 | `condition.great` | 好調 |
| 351 ~ 400 | `condition.excellent` | 絶好調 |


- If party `condition` >= 251 and (`God Battle` is ready) and (has no active sub quest),
- Engage `God Battle` and `condition` -= 200.

- AFK (during `state.reactivate`)
  - Process AFK progression as completed expedition-cycle chunks only.
  - Here, `chunk` means the logical 30-Cycle gameplay Chunk defined in Spec 5.1. Scheduler batches may yield within a Chunk for responsiveness, but a scheduler yield is not a Chunk boundary and must not trigger the rules below.
  - At the end of each logical Chunk:
  - 1. Update `condition`:
    - Recalculate `condition` once at the end of the chunk.
    - Clamp the result within its minimum and maximum limits.
  - 2. Check God Battle trigger:
    - Resolve the `God Battle` engagement check after the condition update.
    - If triggered, engage `God Battle` and apply the corresponding `condition` reduction.
  - When all pending AFK chunks finish, return Online using the simplified AFK → Online transition in Spec 5.1.1.
  - This simplified handling applies only during AFK chunk processing.