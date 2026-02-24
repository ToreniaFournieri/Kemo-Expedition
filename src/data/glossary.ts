export type GlossaryEntry = {
  key: string;
  label: string;
  description: string;
};

export type GlossarySection = {
  id: string;
  heading: string;
  subtitle: string;
  entries: GlossaryEntry[];
};

export const GLOSSARY_SECTIONS: GlossarySection[] = [
  {
    "id": "2-1-1",
    "heading": "2.1.1 a. bonus ability",
    "subtitle": "a. アビリティボーナス (重複なし、強化可能)",
    "entries": [
      {
        "key": "a.defender1",
        "label": "守護者1",
        "description": "味方全体が受ける物理ダメージを 2/3倍 にする"
      },
      {
        "key": "a.defender2",
        "label": "守護者2",
        "description": "味方全体が受ける物理ダメージを 3/5倍 にする"
      },
      {
        "key": "a.defender3",
        "label": "守護者3",
        "description": "味方全体が受ける物理ダメージを 1/2倍 にする"
      },
      {
        "key": "a.counter1",
        "label": "反撃1",
        "description": "敵の近距離攻撃を受けたとき反撃する(攻撃回数は半減)"
      },
      {
        "key": "a.counter2",
        "label": "反撃2",
        "description": "敵の近距離攻撃を受けたとき反撃する(攻撃回数は半減しない)"
      },
      {
        "key": "a.counter3",
        "label": "反撃3",
        "description": "敵の近距離攻撃を受けたとき反撃する(攻撃回数は2倍)"
      },
      {
        "key": "a.re-attack1",
        "label": "連撃1",
        "description": "攻撃時に 追加攻撃を行う(攻撃回数は半減)"
      },
      {
        "key": "a.re-attack2",
        "label": "連撃2",
        "description": "攻撃時に 追加攻撃を行う(攻撃回数は0.7倍)"
      },
      {
        "key": "a.re-attack3",
        "label": "連撃3",
        "description": "攻撃時に 追加攻撃を行う(攻撃回数は半減しない)"
      },
      {
        "key": "a.iaigiri1",
        "label": "居合斬り1",
        "description": "物理ダメージをx2.0倍する(攻撃回数が半減する)"
      },
      {
        "key": "a.iaigiri2",
        "label": "居合斬り2",
        "description": "物理ダメージをx2.5倍する(攻撃回数を半減する)"
      },
      {
        "key": "a.iaigiri3",
        "label": "居合斬り3",
        "description": "物理ダメージをx3.0倍する(攻撃回数は半減する)"
      },
      {
        "key": "a.command1",
        "label": "指揮1",
        "description": "与える物理ダメージを 1.3倍 にする"
      },
      {
        "key": "a.command2",
        "label": "指揮2",
        "description": "与える物理ダメージを 1.6倍 にする"
      },
      {
        "key": "a.command3",
        "label": "指揮3",
        "description": "与える物理ダメージを 2.0倍 にする"
      },
      {
        "key": "a.squander1",
        "label": "浪費1",
        "description": "宴会で消費するゴールドが1.5倍になる"
      },
      {
        "key": "a.squander2",
        "label": "浪費2",
        "description": "宴会で消費するゴールドが2倍になる"
      },
      {
        "key": "a.hunter1",
        "label": "狩人1",
        "description": "列による命中率減衰を 1列ごと15%→10% に軽減する"
      },
      {
        "key": "a.hunter2",
        "label": "狩人2",
        "description": "列による命中率減衰を 1列ごと15%→7% に軽減する"
      },
      {
        "key": "a.hunter3",
        "label": "狩人3",
        "description": "列による命中率減衰を 1列ごと15%→5% に軽減する"
      },
      {
        "key": "a.resonance1",
        "label": "共鳴1",
        "description": "魔法攻撃 1回毎に、全ヒットのダメージが +5% 増加する"
      },
      {
        "key": "a.resonance2",
        "label": "共鳴2",
        "description": "魔法攻撃 1回毎に、全ヒットのダメージが +8% 増加する"
      },
      {
        "key": "a.resonance3",
        "label": "共鳴3",
        "description": "魔法攻撃 1回毎に、全ヒットのダメージが +11% 増加する"
      },
      {
        "key": "a.resonance4",
        "label": "共鳴4",
        "description": "魔法攻撃 1回毎に、全ヒットのダメージが +13% 増加する"
      },
      {
        "key": "a.resonance5",
        "label": "共鳴5",
        "description": "魔法攻撃 1回毎に、全ヒットのダメージが +15% 増加する"
      },
      {
        "key": "a.m-barrier1",
        "label": "魔法障壁1",
        "description": "味方全体が受ける魔法ダメージを 2/3倍 にする"
      },
      {
        "key": "a.m-barrier2",
        "label": "魔法障壁2",
        "description": "味方全体が受ける魔法ダメージを 3/5倍 にする"
      },
      {
        "key": "a.m-barrier3",
        "label": "魔法障壁2",
        "description": "味方全体が受ける魔法ダメージを 1/2倍 にする"
      },
      {
        "key": "a.deflection1",
        "label": "矢払い1",
        "description": "敵の遠距離攻撃の命中率を 10%低下 させる"
      },
      {
        "key": "a.deflection2",
        "label": "矢払い2",
        "description": "敵の遠距離攻撃の命中率を 15%低下 させる"
      },
      {
        "key": "a.first-strike1",
        "label": "先制攻撃1",
        "description": "行動が速くなる"
      },
      {
        "key": "a.first-strike2",
        "label": "先制攻撃2",
        "description": "行動がとても速くなる"
      },
      {
        "key": "a.first-strike3",
        "label": "先制攻撃3",
        "description": "行動が極めて速くなる"
      },
      {
        "key": "a.tithe1",
        "label": "十分の一税1",
        "description": "遠征利益の +10% を寄付額に上乗せする"
      },
      {
        "key": "a.tithe2",
        "label": "十分の一税2",
        "description": "遠征利益の +15% を寄付額に上乗せする"
      },
      {
        "key": "a.null-counter1",
        "label": "反撃無効化1",
        "description": "反撃を無効化する(1回のみ)"
      },
      {
        "key": "a.null-counter2",
        "label": "反撃無効化2",
        "description": "反撃を無効化する(2回まで)"
      },
      {
        "key": "a.null-counter3",
        "label": "反撃無効化3",
        "description": "反撃を無効化する(3回まで)"
      },
      {
        "key": "a.seeker1",
        "label": "探究者1",
        "description": "魔導書の効果増加(レベル毎に0.25%)"
      },
      {
        "key": "a.seeker2",
        "label": "探究者2",
        "description": "魔導書の効果増加(レベル毎に0.35%)"
      },
      {
        "key": "a.resurrect1",
        "label": "再起1",
        "description": "自分が受けた致命ダメージをHP 1残して耐える(1回のみ)"
      },
      {
        "key": "a.resurrect2",
        "label": "再起2",
        "description": "自分が受けた致命ダメージをHP 1%残して耐える(1回のみ)"
      },
      {
        "key": "a.rage1",
        "label": "闘志1",
        "description": "物理/魔法攻撃倍率増大(受けたダメージ1%につき1%増)"
      },
      {
        "key": "a.rage2",
        "label": "闘志2",
        "description": "物理/魔法攻撃倍率増大(受けたダメージ1%につき1.2%増)"
      },
      {
        "key": "a.re-counter1",
        "label": "再反撃1",
        "description": "敵から反撃に対して、反撃する(攻撃回数半減)"
      },
      {
        "key": "a.re-counter2",
        "label": "再反撃2",
        "description": "敵から反撃に対して、反撃する(攻撃回数半減しない)"
      },
      {
        "key": "a.momentum1",
        "label": "気勢1",
        "description": "物理/魔法攻撃倍率1.5倍(受けたダメージ1%につき1%減)"
      },
      {
        "key": "a.momentum2",
        "label": "気勢2",
        "description": "物理/魔法攻撃倍率1.5倍(受けたダメージ1%につき0.75%減)"
      },
      {
        "key": "a.cunning1",
        "label": "狡猾1",
        "description": "自動売却額が1.2倍"
      },
      {
        "key": "a.cunning2",
        "label": "狡猾2",
        "description": "自動売却額が1.3倍"
      },
      {
        "key": "a.bulwark1",
        "label": "壁1",
        "description": "真後ろの味方への遠距離攻撃を肩代わりする"
      },
      {
        "key": "a.bulwark2",
        "label": "壁2",
        "description": "真後ろの味方への遠距離/近距離攻撃を肩代わりする"
      },
      {
        "key": "a.cyborgization1",
        "label": "サイボーグ化1",
        "description": "命中+30、回避-20"
      },
      {
        "key": "a.cyborgization2",
        "label": "サイボーグ化2",
        "description": "命中+40、回避-15"
      },
      {
        "key": "a.covering-fire1",
        "label": "援護射撃1",
        "description": "味方近接攻撃の命中が1回のみなら遠距離射撃(攻撃回数半減)"
      },
      {
        "key": "a.covering-fire2",
        "label": "援護射撃2",
        "description": "味方近接攻撃の命中が1回のみなら遠距離射撃(攻撃回数半減しない)"
      },
      {
        "key": "a.peddler1",
        "label": "行商1",
        "description": "移動時間が2/3になる"
      },
      {
        "key": "a.peddler2",
        "label": "行商2",
        "description": "移動時間が3/5になる"
      },
      {
        "key": "a.composure1",
        "label": "平静1",
        "description": "命中率+10%加算"
      },
      {
        "key": "a.composure2",
        "label": "平静2",
        "description": "命中率+13%加算"
      },
      {
        "key": "a.magical-counter1",
        "label": "魔法反撃1",
        "description": "魔法には魔法で反撃する(攻撃回数半減)"
      },
      {
        "key": "a.magical-counter2",
        "label": "魔法反撃2",
        "description": "魔法には魔法で反撃する(攻撃回数半減しない)"
      },
      {
        "key": "a.focus1",
        "label": "集中1",
        "description": "命中ボーナスの効果が1.2倍になる"
      },
      {
        "key": "a.focus2",
        "label": "集中2",
        "description": "命中ボーナスの効果が1.3倍になる"
      },
      {
        "key": "a.prophecy1",
        "label": "予言1",
        "description": "報酬抽選内容が見えるようになる"
      },
      {
        "key": "a.prophecy2",
        "label": "予言2",
        "description": "報酬抽選内容が見える、リセット出来るようになる"
      },
      {
        "key": "a.stealth1",
        "label": "隠れ蓑1",
        "description": "HP24%未満の時、自身へのダメージをすべて回避する"
      },
      {
        "key": "a.stealth2",
        "label": "隠れ蓑2",
        "description": "HP29%未満の時、自身へのダメージをすべて回避する"
      },
      {
        "key": "a.illusion1",
        "label": "幻化1",
        "description": "自分が受ける最初の遠距離攻撃を無効化する"
      },
      {
        "key": "a.illusion2",
        "label": "幻化2",
        "description": "パーティーが受ける最初の遠距離攻撃を無効化する"
      }
    ]
  },
  {
    "id": "2-1-2",
    "heading": "2.1.2 b. bonus",
    "subtitle": "b. 基礎値ボーナス (重複有効)",
    "entries": [
      {
        "key": "b.vitality+v",
        "label": "体+v",
        "description": "基礎体力に v を加算（HP/物防に影響）"
      },
      {
        "key": "b.strength+v",
        "label": "力+v",
        "description": "基礎筋力に v を加算（近接火力に影響）"
      },
      {
        "key": "b.intelligence+v",
        "label": "知+v",
        "description": "基礎知性に v を加算（魔法火力に影響）"
      },
      {
        "key": "b.mind+v",
        "label": "精+v",
        "description": "基礎精神に v を加算（HP/魔防に影響）"
      }
    ]
  },
  {
    "id": "2-1-3",
    "heading": "2.1.3 c. bonus",
    "subtitle": "c. 固定ボーナス (同一名ボーナスは重複無効)",
    "entries": [
      {
        "key": "c.melee_attack+v",
        "label": "[近攻+v%]",
        "description": "近接攻撃の最終ダメージを v% 乗算強化する"
      },
      {
        "key": "c.ranged_attack+v",
        "label": "[遠攻+v%]",
        "description": "遠距離攻撃の最終ダメージを v% 乗算強化する"
      },
      {
        "key": "c.magical_attack+v",
        "label": "[魔攻+v%]",
        "description": "魔法攻撃の最終ダメージを v% 乗算強化する"
      },
      {
        "key": "c.physical_defense+v",
        "label": "[物防+v%]",
        "description": "物理防御の最終値を v% 乗算強化する"
      },
      {
        "key": "c.magical_defense+v",
        "label": "[魔防+v%]",
        "description": "魔法防御の最終値を v% 乗算強化する"
      },
      {
        "key": "c.melee_NoA+v",
        "label": "[近回数+v]",
        "description": "近接攻撃回数が v 回増える"
      },
      {
        "key": "c.ranged_NoA+v",
        "label": "[遠回数+v]",
        "description": "遠距離攻撃回数が v 回増える"
      },
      {
        "key": "c.magical_NoA+v",
        "label": "[魔回数+v]",
        "description": "魔法攻撃回数が v 回増える"
      },
      {
        "key": "c.accuracy+v",
        "label": "[命中+v]",
        "description": "値が多いほどより多くの攻撃が命中するようになる"
      },
      {
        "key": "c.evasion+v",
        "label": "[回避+v]",
        "description": "値が多いほどより多くの攻撃を回避するようになる"
      },
      {
        "key": "c.equip_slot+v",
        "label": "[装備+v]",
        "description": "装備スロット数が v 増える"
      },
      {
        "key": "c.grit+v",
        "label": "[根性+v]",
        "description": "近接攻撃の装備が出来るようになる。近接攻撃回数が　v 回増える"
      },
      {
        "key": "c.pursuit+v",
        "label": "[追撃+v]",
        "description": "遠距離攻撃の装備が出来るようになる。遠距離攻撃回数が　v 回増える"
      },
      {
        "key": "c.caster+v",
        "label": "[術者+v]",
        "description": "魔法攻撃の装備が出来るようになる。魔法攻撃回数が　v 回増える"
      },
      {
        "key": "c.penet+v",
        "label": "[貫通+v]",
        "description": "敵の防御力を v% 分無視する"
      },
      {
        "key": "c.growth_xV",
        "label": "[成長V倍]",
        "description": "キャラクター個人のHP基礎値及びアイテムHP増加値V倍"
      },
      {
        "key": "c.physical_attack+v",
        "label": "[物攻+v%]",
        "description": "遠距離攻撃・近距離攻撃の最終ダメージを v% 乗算強化する"
      },
      {
        "key": "c.physical_offense_multiplier_xV",
        "label": "[物攻撃V倍]",
        "description": "遠距離攻撃・近接攻撃がV倍"
      },
      {
        "key": "c.magical_offense_multiplier_xV",
        "label": "[魔攻撃V倍]",
        "description": "魔法攻撃がV倍"
      },
      {
        "key": "c.physical_defense_multiplier_xV",
        "label": "[物防xV]",
        "description": "物理防御力がV倍(少ないほうが攻撃に強い)"
      },
      {
        "key": "c.magical_defense_multiplier_xV",
        "label": "[魔防xV]",
        "description": "魔法防御力がV倍(少ないほうが攻撃に強い)"
      },
      {
        "key": "c.fire_defense_multiplier_xV",
        "label": "[炎防xV]",
        "description": "炎属性耐性がV倍(少ないほうが攻撃に強い)"
      },
      {
        "key": "c.ice_defense_multiplier_xV",
        "label": "[氷防xV]",
        "description": "氷属性耐性がV倍(少ないほうが攻撃に強い)"
      },
      {
        "key": "c.thunder_defense_multiplier_xV",
        "label": "[雷防xV]",
        "description": "雷属性耐性がV倍(少ないほうが攻撃に強い)"
      },
      {
        "key": "c.upgrade_V",
        "label": "[V強化+1]",
        "description": "アビリティ:V を1段階強化する"
      },
      {
        "key": "c.antagonism",
        "label": "[⚠️敵対]",
        "description": "味方を攻撃するようになる"
      },
      {
        "key": "c.armor_x1.x",
        "label": "[鎧x1.x]",
        "description": "鎧カテゴリ装備の効果が 1.x 倍"
      },
      {
        "key": "c.robe_x1.x",
        "label": "[衣x1.x]",
        "description": "法衣カテゴリ装備の効果が 1.x 倍"
      },
      {
        "key": "c.shield_x1.x",
        "label": "[盾x1.x]",
        "description": "盾カテゴリ装備の効果が 1.x 倍"
      },
      {
        "key": "c.sword_x1.x",
        "label": "[剣x1.x]",
        "description": "剣カテゴリ装備の効果が 1.x 倍"
      },
      {
        "key": "c.katana_x1.x",
        "label": "[刀x1.x]",
        "description": "刀カテゴリ装備の効果が 1.x 倍"
      },
      {
        "key": "c.gauntlet_x1.x",
        "label": "[手x1.x]",
        "description": "籠手カテゴリ装備の効果が 1.x 倍"
      },
      {
        "key": "c.arrow_x1.x",
        "label": "[矢x1.x]",
        "description": "矢カテゴリ装備の効果が 1.x 倍"
      },
      {
        "key": "c.bolt_x1.x",
        "label": "[ボx1.x]",
        "description": "ボルトカテゴリ装備の効果が 1.x 倍"
      },
      {
        "key": "c.archery_x1.x",
        "label": "[弓x1.x]",
        "description": "弓カテゴリ装備の効果が 1.x 倍"
      },
      {
        "key": "c.wand_x1.x",
        "label": "[杖x1.x]",
        "description": "杖カテゴリ装備の効果が 1.x 倍"
      },
      {
        "key": "c.grimoire_x1.x",
        "label": "[書x1.x]",
        "description": "魔導書カテゴリ装備の効果が 1.x 倍"
      },
      {
        "key": "c.catalyst_x1.x",
        "label": "[媒x1.x]",
        "description": "触媒カテゴリ装備の効果が 1.x 倍"
      }
    ]
  },
  {
    "id": "2-1-4",
    "heading": "2.1.4 d. bonus",
    "subtitle": "d. 増加ボーナス説明 (重複有効)",
    "entries": [
      {
        "key": "d.ranged_attack",
        "label": "遠攻+v",
        "description": "遠距離攻撃力に加算。敵の物理防御力を超えるとダメージを与えられる"
      },
      {
        "key": "d.melee_attack",
        "label": "近攻+v",
        "description": "近接攻撃力に加算。敵の物理防御力を超えるとダメージを与えられる"
      },
      {
        "key": "d.magical_attack",
        "label": "魔攻+v",
        "description": "魔法攻撃力加算。敵の魔法防御力を超えるとダメージが与えられる"
      },
      {
        "key": "d.ranged_NoA+v",
        "label": "遠回数+v",
        "description": "遠距離攻撃の攻撃回数が増加する"
      },
      {
        "key": "d.magical_NoA+v",
        "label": "魔回数+v",
        "description": "魔法攻撃の攻撃回数が増加する"
      },
      {
        "key": "d.melee_NoA+v",
        "label": "近回数+v",
        "description": "近接攻撃の攻撃回数が増加する"
      },
      {
        "key": "d.ranged_offense_amplifier",
        "label": "遠距離攻撃倍率",
        "description": "遠距離攻撃で与えるダメージの倍率。(遠距離攻撃力- 敵の物理防御力)にこの倍数が掛かる"
      },
      {
        "key": "d.magical_offense_amplifier",
        "label": "魔法攻撃倍率",
        "description": "魔法攻撃で与えるダメージの倍率。(魔法攻撃力- 敵の魔法防御力)にこの倍数が掛かる"
      },
      {
        "key": "d.melee_offense_amplifier",
        "label": "近接攻撃倍率",
        "description": "近接攻撃で与えるダメージの倍率。(近接攻撃力- 敵の物理防御力)にこの倍数が掛かる"
      },
      {
        "key": "d.physical_defense",
        "label": "物防+v",
        "description": "物理防御力に加算。敵の遠距離攻撃力/近接攻撃力からこの値分引いた値がダメージの基準"
      },
      {
        "key": "d.magical_defense",
        "label": "魔防+v",
        "description": "魔法防御力に加算。敵の魔法攻撃力からこの値分引いた値がダメージの基準"
      },
      {
        "key": "d.physical_defense_amplifier",
        "label": "物理耐性",
        "description": "物理耐性値が低かれば低いほど遠距離攻撃/近接攻撃のダメージを受けなくなる。(近接攻撃力- 敵の物理防御力)にこの倍数が掛かる"
      },
      {
        "key": "d.magical_defense_amplifier",
        "label": "魔法耐性",
        "description": "魔法耐性値が低かれば低いほど魔法攻撃のダメージを受けなくなる。(魔法攻撃力- 敵の魔法防御力)にこの倍数が掛かる"
      },
      {
        "key": "d.physical_accuracy",
        "label": "物理命中率",
        "description": "初回の攻撃の命中率。隊列が後方になると命中率が下がる(1列ごとに15%ずつ減少)。隊列を組まない敵は常に100%となる。"
      },
      {
        "key": "d.magical_accuracy",
        "label": "魔法命中率",
        "description": "基本、隊列に影響なく100%となる。初回の攻撃は必ず命中する"
      },
      {
        "key": "d.accuracy-v",
        "label": "命中+v",
        "description": "命中の減衰率に加算。 命中の値が高いほど、複数の攻撃回数の際の命中回数が上振れする\n減衰x0.90で20回攻撃では命中回数平均8.8回\n減衰x0.92で20回攻撃では命中回数平均10.5回(命中+20時)"
      },
      {
        "key": "d.evasion-v",
        "label": "回避+v",
        "description": "敵の命中の減衰率を減算。回避の値が高いほど、敵の複数攻撃回数の際の被弾回数が減少する\n減衰x0.90で20回攻撃では命中回数平均8.8回\n減衰x0.88で20回攻撃では命中回数平均7.5回(回避+20時)"
      },
      {
        "key": "d.accuracy_potency",
        "label": "命中減衰",
        "description": "命中率の減衰率を強化し、多段命中時の後続ヒットが外れやすくなる"
      },
      {
        "key": "d.elemental_offense_attribute",
        "label": "攻撃属性",
        "description": "攻撃属性は、炎属性、氷属性、雷属性、無属性から成り立つ。最も属性の倍率が高い属性1つが攻撃属性として採用される。その属性倍率が与えるダメージに掛かる"
      },
      {
        "key": "d.elemental_offense_attribute",
        "label": "攻撃属性",
        "description": "攻撃属性は、炎属性、氷属性、雷属性、無属性から成り立つ。最も属性の倍率が高い属性1つが攻撃属性として採用される。その属性倍率が与えるダメージに掛かる"
      },
      {
        "key": "d.elemental_defense_attribute",
        "label": "属性耐性",
        "description": "敵の属性攻撃に対しての耐性。この耐性値が低ければ低いほどその属性攻撃に対して受けるダメージが減る"
      }
    ]
  }
];
