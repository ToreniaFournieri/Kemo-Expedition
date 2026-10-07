## 8. UI

### 8.5 UI_DIARY
- **GUI:**
  - `guiDiary`
- **API Read:**
  - `read/observation/diary`
  - `read/diary/{p}/diarySetting`
  - `read/diary/diaryEntry/{diaryEntryId}`
- **API Commit:**
  - `commit/diary/{p}/diarySetting`
  - `commit/diary/diaryEntry/markAsRead`

- The Diary has subcategory tabs: `Global`, `PT1`, `PT2`, `PT3`, `PT4`, `PT5`, `PT6`. (Default selected tab: `Global`, or the last selected tab if previously selected.)

- A Party tab becomes visible only when the corresponding Party is unlocked.
- The selected tab is highlighted using the sub-theme color.
- Diary unread badges:
  - The main Diary tab displays a red unread badge, showing up to 49 unread entries. (Display `49+` when the count is 49 or greater.)
  - Each Party subcategory tab and global tab also displays its own red unread badge, showing up to unread entries for that Party.
  - When the user leaves a Party subcategory or global tab, all entries in that tab are treated as read and its red badge is removed.
  - The main Diary badge reflects the total number of unread diary entries across global and all Party subcategories.
- Each Party has its own independent Diary.
- Entry:
  - Global Diary keeps a maximum of 99 entries.
    - Existing Global Diary entries remain until a new entry is created. Creating an entry removes only the oldest entries needed to restore the 99-entry maximum; opening, loading, or saving the game must not remove entries.
  - Each Party Diary keeps a maximum of 12 entries.
    - Existing party Diary entries remain until a new entry is created for that Party. Creating an entry removes only the oldest entries needed to restore the 12-entry maximum; opening, loading, or saving the game must not remove entries.
- The **party diary**S is updated when any of the following events occur:
  - The party is defeated.
  - The party obtains a Boss Rare or Mythic Rare item.
  - A Gods Battle occurs.
  - The party obtains a Super Rare item.
- The **global Diary** is updated when any of the following events occur:
  1. **Account creation**
     - Flavor text: `ケモは目覚めた`
  2. **First expedition boss defeat**
     - Triggered when any party defeats an expedition boss for the first time.
     - Format example: `[PT1] ルピニアンの亜寒帯 初踏破`
     - If the victory unlocks a new party, include information about the newly unlocked party in the entry.
  3. **First god defeat**
     - Triggered when any party defeats a god for the first time.
     - Format example: `[PT1] セイラン 再生の女神撃破`
  4. **Achievements**
     - Achievement statistics are tracked internally and are not cleared by the Statistics reset button.
     - **Clear milestones:** `100`, `1,000`, `10,000`, `100,000`, and `1,000,000` total Clear outcomes.
       - Format example: `1,000回 踏破達成`
     - **Super Rare milestones:** `1`, `10`, `100`, `1,000`, and `10,000` Super Rare items held in inventory.
       - Format example: `超レア 100個 入手`
     - **Jewel milestones:** `1`, `10`, `100`, `1,000`, and `10,000` jewels held in inventory.
       - Format example: `結晶 100個 入手`
     - Each achievement milestone is recorded only once.
       - After a milestone has been recorded, it is not triggered again even if the value later falls below the threshold and reaches it again.
  - Global Diary entries contain only a title and do not include detailed battle logs.
- First, it is collapsed and expand to see the detail. (Same as 結果 log in expedition. )
- Top record is latest (default position) and bottom is older logs.
- Use the emulated in-game timestamp rather than the device or system timestamp.

**Setting**

**Setting Global Diary**

- No setting pane.


**Setting Party Diary**

```
日誌記録設定                 ▼

**日誌更新**
* 超レア通知 (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
* エリートレア通知 (pull down list) 全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default:恐ろしい以上)
* ボスレア通知  (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
* 神魔戦通知 (pull down list) あり/なし
* 神魔レア通知  (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
* 一般通知 敗北のみ/敗北と引分/敗北と引分と撤退/全て/なし (Default: 敗北のみ)
* サイドクエスト獲得通知 全て, 2良晶以上, 3雅晶以上, 4煌晶以上, 5碧晶以上, 6紫晶以上, 7金晶以上, 8王晶のみ, なし (Default: 全て)

**ポップアップ通知**
* 日常通知 あり/なし (Default:あり) Cycle event
* アイテム獲得通知 あり/なし (Default:あり) Item Drops
* 自動装備通知 あり/なし (Default:あり)  Auto equipment
* サイドクエスト(受領・失敗・獲得)通知 あり/なし (Default:あり)  Side quest
 (Ref: 8.1.1 Popup Notification Logic & Display @Specification_8.1_UI_FOUNDATIONS.md)
```


**Title of global diary**

line 1: [PT1] ヴァルンの海洋 初踏破
line 2 gray text: PT2解放     2026/02/14 07:04
line 1: [PT1] ルピニアンの亜寒帯 初踏破
line 2 gray text:      2026/02/13 13:04
(Left-Aligned)         (Right-aligned)
line 1: [PT1] ケイナイアン平原 初踏破
line 2 gray text:     2026/02/12 21:28
line 1: ケモは目覚めた
line 2 gray text:     2026/02/11 21:00

**Title of party diary**
```
(Left-Aligned)         (Right-aligned)
line 1: [PT2]ボスレア(秘奥真理の書) 獲得      ▼
line 2 gray text: ケイナイアン平原      2026/02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] 敗北の記録           ▼
line 2 gray text: ヴァルンの樹林帯      2026/02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] サイドクエスト達成(散財1,000G)           
line 2 gray text: ウルサンの霊峰: 剛力の雅晶 を手に入れた     2026/02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] セイラン 再生の女神撃破          ▼
line 2 gray text:      2026/02/12 21:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] ガーヴ 消耗の神撃破          ▼
line 2 gray text:     2026/02/12 21:28

```

- `神魔戦通知`
 - line 1: PTname, Display name of gods, outcome
   - `Display name of gods` : `Display name` Gods (神魔) in 4.1.2 Enemy. Example (`ミオラ 豊穣の女神`   not `ミオラ(神,賢M)`) 
   - outcome: Victory/Defeat/Draw/No Visit -> 勝利/敗北/引分/未到達
 - line 2 gray text: Expedition location　Date
   
```
line 1: [PT1] セイラン 再生の女神 敗北          ▼
line 2 gray text: ケイナイアン平原     2026/02/12 21:28
```


### Compact language-neutral records
- New expedition and Diary records use `compactVersion: 1`. Preserve all facts necessary for the existing UI; generate narration only for expanded rooms using the current language, without combat execution or random draws.
- Legacy records have no compact discriminator. Preserve their original text and retention; do not infer missing semantics from prose.
- Battle storage uses a versioned envelope with historical actor identities, only narration-required ability levels, terrain, a per-battle ability dictionary, and ordered numeric event tuples. Native ABI buffers, bags, seeds beyond existing replay metadata, and numerical combat profiles are not stored in this envelope.
- The storage tuple is `[category, opcode, presenceMask, ...values]`. This sparse event-specific layout avoids unused placeholders. Category codes are terrain=0, effect=1, action=2, reaction=3, end=4. The permanent opcode and field tables are defined in `src/game/compactBattleLog.ts`; changing their meaning requires a new format version.
- Presence bits refer, in order, to phase, actor kind, actor ID, target ID, ability reference, attack type, flags, timing, hits, attempts, reaction/subtype, value0, value1, value2, modifier mask, auxiliary value. Flavor rows inherit omitted fields from their immediately preceding source event; for ordinary rows, omitted phase means COMBAT (2), actor kind follows the referenced actor, and other omitted fields mean zero; ability reference zero and attack type zero mean none. Flavor facts retain the original selected family/variant and its association.
- Stored actor values are one-based references into the room actor list; the decoded IDs reference recorded actors; zero means no individual target, not enemy. Enemy identity and party-wide effects are distinct from character identities. Damage element and attack type remain separate.
- End events retain post-battle facts, rewards with exact enhancement/Super Rare/Jewel variants, and return reasons. Titles, side quests, unlocks and gates retain semantic arguments. User-provided historical names remain unchanged.
- Segmented records retain manifest-last durability. Backups and loading accept mixed formats; unsupported compact versions or malformed records must fail through existing save-load protections, without overwriting the save.
- Language changes must update new titles, metadata and expanded narration immediately after the selected dictionary is loaded. Do not persist rendered strings or retain an unbounded narration cache.

- Persisted expedition envelopes pool historical actors and item variants in `actorTable` and `itemTable`. Rooms carry actor reference arrays and item uses carry `diaryItemRef`; loading restores the shared facts without narration.
