## 8. UI

### 8.1 UI_FOUNDATIONS

- Platform: Web-based (React + TypeScript + Tailwind)
  - Style: Compact, simple, iOS-like, Liquid Glass style.
  - Navigation: Minimal scene transitions, tab-centered
- Interaction philosophy:
  - Fast feedback
  - No modal spam
  - Most actions resolve immediately
  
- **Color Scheme**

  - `m.kemo` mode:
	- Base colors
	  - Text: Black
	  - Pane / card background: Gray
	  - Page background: White
	- Sub color (~30%)
	  - Blue `#3B82F6` (information, selection, links)
	- Accent color (~5%)
	  - Dark Orange `#EA580C` (important actions, warnings, highlights)

  - `m.luna` mode:
    - Base colors:
      - Text: Black
      - Pane / card background: Gray
      - Page background: White
    - Sub color (~30%):
      - Yellow-Orange `#c28832` (information, selection, links)
    - Accent color (~5%):
      - Blue `#0c3cea`  (important actions, warnings, highlights)
     
  - `m.laika` mode:
    - Base colors:
      - Text: Black
      - Pane / card background: Gray
      - Page background: White
  - Sub color (~30%)
    - Green `#08A645`
      (information, selection, links)
  - Accent color (~5%)
    - Crimson Red `#DC2626`
      (important actions, warnings, highlights)
  - Damage taken color: `#ffebcd`

**Emoji Icon Replacement**
- All emoji used in UI, logs, and text outputs must be replaced with their corresponding icon image assets.
- Icon images must scale to match the surrounding text size (inline alignment).

- Replacement Mapping

| Emoji | Icon Path |
|------|-----------|
| 🔥 | `icons/fire.png` |
| ❄️ | `icons/ice.png` |
| ⚡ | `icons/thunder.png` |
| ⚔️ | `icons/melee.png` |
| 🏹 | `icons/ranged.png` |
| 🪄 | `icons/magic.png` |
| 🔓 | `icons/unlock.png` |
| 🔒 | `icons/lock.png` |

- Rules
  - Replacement is applied consistently across all display contexts (UI, logs, tooltips, etc.).
  - No emoji should remain in the final rendered output once replacement is applied.
  - Icon assets must visually match the semantic meaning of the original emoji.


#### 8.1.1 Notification Logic & Display
**Visual & Overlay (Toast)**
- Position: bottom and left side
- Layout:
  	- Flex-col-reverse (Newest notifications appear at the bottom, pushing older ones up).
  	- Dynamic Width: The box size must shrink or grow to fit the length of the text precisely (with padding).
- Text and color:
    - [C] [U] for Black color, [R] for Blue color, [M] for Dark Orange. White translucent background, no border color.
    - With Super Rare titled item, override to BOLD Dark orenge. White translucent background, no border color.
- Behavior: Auto-dismiss after 5000ms. Manual dismiss **all of notification** on onClick. Status update dismisses previous status changes notification. (display only latest status changes)

**Notification Logic**
- Item Drops
	- When an item drops (exclude auto-sell items), it triggers the notification with Normal style. If the item is Super Rare, The style switchs to Rare style. No notification is displayed when the inventory count of that item is greater than 20.
    - displays party number like. ex: "PT1:名工の銅の籠手を入手"
	- Logic: 伝説のショートソード triggers the rareStyle.
  	- Animation: animate-bounce (once) + animate-pulse (continuous).

- Status Changes
	- When equipping/unequipping, it compares the old value to the new value.
    - Multi-line Trigger: If an equipment change affects multiple stats, each stat change generates its own notification block. Same clculatuon and display logic of status.  
		- Positive Change: 物防 24 → 52 (Normal style, Bold text)
		- Negative Change: 近攻 120 → 84 (Normal style, Normal weight text)
  - unlock ability. if character gains `c.unlock_(race)_ability`, and the race matches woth his race, notification like: "ケイナイアンの再起アビリティが解放されました"
    - lost its unlock conditon: "ケイナイアンの再起アビリティがロックされました"

- Level up
  - Example: "PT1 はレベルが12に上がった(装備枠が+1増えた)" with expanded equipment slot
  - Example: "PT1 はレベルが13に上がった" 

- Side quest
  - Accept: "PT1はサイドクエスト 治療 (2時間) を受けた"
  - Success: "PT1はサイドクエストを達成し、堅牢の良晶[堅2]を手に入れた"
  - Failure: "PT1はサイドクエスト 治療 (2時間) を達成できなかった"

- Auto equipment:
  - Example: "PT1ケモは 名工の木の胸当て を装備した"
  - Example:　"PT3ガルドは 宿った鉄の短剣 を 伝説の鉄の短剣に装備しなおした"

- notification while AFK mode:
  - no notifications shows while AFK mode until at the end of AFK mode. 

#### 8.1.2 Header
- Always fixed at the top.
  - width: ~ 500 width.
- Displays:
  - (Game title) + version + (build number) + (env)
  - Game title label: "冒ケモ🐾", 
		  - The character 「冒」 is emphasized:   
      - Scale: Larger than surrounding text
      - Rotation: −22.5° (counterclockwise)
    - The character 「🐾」is emphasized:   
      - Scale: Larger than surrounding text
						- Rotation: 0° 

	- env label by URL subpath const getEnvLabel = () => {
  const p = window.location.pathname; // e.g. "/Kemo-Expedition/dev/..."
  if (p.includes("/dev/")) return "D";
  if (p.includes("/beta/")) return "β";
  return "";  };
  - Use this specification's version

- Speed of Time: `▷ x1.0(23h)`
  - Displays the current game speed multiplier and the remaining boost duration in hours.
    - x1.0 -> `▷`
    - x1.2 or higher -> `▶`
- When the player presses the Speed of Time button:
  - Show the following confirmation dialog:
    - "現在の進捗を開発へ報告します。（報酬として、ゲーム進行速度が1日の間、1.2倍になります）"
    - Dialog options: YES / NO
  - If the player selects YES: 
    - Generate **format of progress data** and send to:
      - `/dev/`: DEV_DISCORD_WEBHOOK_URL environment variable defined in this repository.
      - `/beta/`: BETA_DISCORD_WEBHOOK_URL environment variable defined in this repository.
    - If the webhook request succeeds:
      - Set Speed of Time to x1.2. and the text is `▶x1.2`
      - The boost effect lasts for 24 hours.
    - If the webhook request fails:
      - Do not apply the boost effect.
      - Keep Speed of Time at its current value.
      - Show an error message to the player.
  - When the remaining duration reaches 0h: Reset Speed of Time to `▷ x1.0`

```
(Left-aligned)             (Right-aligned)
冒ケモ🐾　v0.6.0(23) (β)    ▷ x1.0(23h)  200G
```
- Tab header (primary navigation):
  - Expedition: 探索
  - Party: パーティ
  - Base: 拠点
  - Diary: 日誌
  - Divine Bureau: 神聖局

- If wide mode (two tabs) is on, it displays Expedition (always visible) and other tabs player selects.
  - One tabs width: ~ 500 width.
  - Threshold: 700 width, then two tabs mode.

- Header is always visible; tabs never cause full page reload.

-IF 自動周回 is OFF, display "静止中" in the header (right-aligned: 200G 静止中) with Sub color
 and tap "静止中", then 自動周回 is ON.



**Format of progress data**

- Use a code block with monospace alignment

- PT table ( latest outcome and room )
  - `PT`: PT number ( PT1, PT2 ....)
  - `Level`: level. ( 40 )
  - `HP`: Party.`d.HP` ( 20,543 )
  - `Exp`: Experience remaining: (23%)
  - `ID`: Expedition ID (1,2,.)
  - `Outcome`: The latest outcome ( Clear )
  - `Room`: the deepest room of the latest expedition

- Status table
  - `PT`: PT number (PT1, PT2 ....)
  - `列`: Row. (1,2, ...6)
  - `名前`: Character name (オルカ)
  - `性`: Gender. (♂ -> 男/ ♀ -> 女)
  - `主`: Main Class. Display `short name` of Class ( `class.duelist` -> `剣`)
  - `副`: Sub Class. Display `short name` of Class ( `class.duelist` -> `剣`)
  - `譜`: Lineage. Display `short` of lineage (`sandstorm` -> `砂`)
  - `格`: Predisposition. Display `short` of predisposition (`Aggressive` -> `好`)
  - `物防御`: `d.physical_defense`
  - `物防倍`: `f.defense_amplifier` LONG and CLOSE
  - `魔防御`: `d.magical_defense`
  - `魔防倍`: `f.defense_amplifier` MID
  - `回避`:  `evasion`
  - `遠攻撃`: `d.ranged_attack`
  - `遠攻倍`: `f.offense_amplifier` LONG
  - `遠回数`: `d.ranged_NoA`
  - `魔攻撃`: `d.magical_attack`
  - `魔攻倍`: `f.offense_amplifier` MID
  - `魔回数`: `d.magical_NoA`
  - `近攻撃`: `d.melee_attack`
  - `近攻倍`: `f.offense_amplifier` CLOSE
  - `近回数`: `d.melee_NoA`
　- `属性攻`: `f.elemental_offense_attribute`
  - `属性防`: `f.elemental_resistance_attribute`
  - `貫通`: `f.penet_multiplier`

