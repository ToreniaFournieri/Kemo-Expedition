## 8. UI

### 8.5 UI_DIARY
- The Diary has six subcategory tabs: 1, 2, 3, 4, 5, 6. (Default selected tab: `1`, or the last selected tab if previously selected.)
- Each tab corresponds to a Party:
  - 1 = PT1
  - 2 = PT2
  - 3 = PT3
  - 4 = PT4
  - 5 = PT5
  - 6 = PT6
- A Party tab becomes visible only when the corresponding Party is unlocked.
- The selected tab is highlighted using the sub-theme color.
- If only one Party is unlocked, the subcategory tabs are hidden.
- Each Party has its own independent Diary.
- Each Party Diary keeps a maximum of 24 entries.
- The diary is updated when any of the following events occur:
  - The party is defeated.
  - The party obtains a Boss Rare or Mythic Rare item.
  - A Gods Battle occurs.
  - The party obtains a Super Rare item.
  - The party defeats an expedition boss for the first time and unlock a new party
- First, it is collapsed and expand to see the detail. (Same as 結果 log in expedition. )
- Top record is latest (default position) and bottom is older logs.
- Use the emulated in-game timestamp rather than the device or system timestamp.

- Setting. 
```
日誌記録設定                 ▼

超レア通知 (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
エリートレア通知 (pull down list) 全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default:恐ろしい以上)
ボスレア通知  (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
神魔戦通知 (pull down list) あり/なし
神魔レア通知  (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
敗北通知 敗北のみ/敗北と引分/全て/なし (Default: 敗北のみ)
サイドクエスト獲得通知 全て, 2良晶以上, 3雅晶以上, 4煌晶以上, 5碧晶以上, 6紫晶以上, 7金晶以上, 8王晶のみ, なし (Default: 全て)
```

- Title of dirary 
```
(Left-Aligned)         (Right-aligned)
line 1: [PT2]ボスレア(秘奥真理の書) 獲得      ▼
line 2 gray text: ケイナイアン平原      02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] 敗北の記録           ▼
line 2 gray text: ヴァルンの樹林帯      02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] サイドクエスト達成(散財1,000G)           
line 2 gray text: ウルサンの霊峰: 剛力の雅晶 を手に入れた     02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] セイラン 再生の女神撃破          ▼
line 2 gray text:      02/12 21:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] ガーヴ 消耗の神撃破          ▼
line 2 gray text:     02/12 21:28

```

- `神魔戦通知`
 - line 1: PTname, Display name of gods, outcome
   - `Display name of gods` : `Display name` Gods (神魔) in 4.1.2 Enemy. Example (`ミオラ 豊穣の女神`   not `ミオラ(神,賢M)`) 
   - outcome: Victory/Defeat/Draw/No Visit -> 勝利/敗北/引分/未到達
 - line 2 gray text: Expedition location　Date
   
```
line 1: [PT1] セイラン 再生の女神 敗北          ▼
line 2 gray text: ケイナイアン平原     02/12 21:28
```
