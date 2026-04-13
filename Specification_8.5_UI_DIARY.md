## 8. UI

### 8.5 UI_DIARY

- When a party was defeated, got boss rare or mythic rare item, and acquiring super rare item, the diary updates. 
- It keeps 24 entries. First, it is collapsed and expand to see the detail. (Same as 結果 log in expedition. )
- Top record is latest (default position) and bottom is older logs. 

- Setting. 
```
日誌記録設定                 ▼

超レア通知 (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
エリートレア通知 (pull down list) 全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default:恐ろしい以上)
ボスレア通知  (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
神魔レア通知  (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
敗北通知 あり/なし (Default: あり)
サイドクエスト獲得通知 あり/ (Default: あり)
```

- Title of dirary 
```
(Left-Aligned)         (Right-aligned)
line1: [PT2]ボスレア(秘奥真理の書) 獲得      ▼
line2 gray text: ケイナイアン平原      02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] 敗北の記録           ▼
line  gray text2: ヴァルンの樹林帯      02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] サイドクエスト達成(散財1,000G)           
line  gray text2: ウルサンの霊峰: 剛力の雅晶 を手に入れた     02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] セイラン 再生の女神撃破          ▼
line  gray text2: 信仰:再生の女神 解禁     02/12 21:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] ガーヴ 消耗の神撃破          ▼
line  gray text2: 信仰:消耗の神 解禁、PT2解放     02/12 21:28


```
