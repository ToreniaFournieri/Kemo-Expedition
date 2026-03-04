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
        "key": "c.deity_physical_attack_xV",
        "label": "[天物攻xV]",
        "description": "遠距離攻撃・近接攻撃のダメージを V倍する"
      },
      {
        "key": "c.deity_magical_attack_xV",
        "label": "[天魔攻xV]",
        "description": "魔法攻撃のダメージを V倍する"
      },
      {
        "key": "c.deity_physical_defense_x2/3",
        "label": "[天物防2/3]",
        "description": "物理防御倍率が2/3倍(少ないほうが攻撃に強い)"
      },
      {
        "key": "c.deity_pysical_defense_xV",
        "label": "[天物防xV]",
        "description": "物理防御倍率がV倍(少ないほうが攻撃に強い)"
      },
      {
        "key": "c.deity_magical_defense_x2/3",
        "label": "[天魔防2/3]",
        "description": "魔法防御倍率が2/3倍(少ないほうが攻撃に強い)"
      },
      {
        "key": "c.deity_magical_defense_xV",
        "label": "[天魔防xV]",
        "description": "魔法防御倍率がV倍(少ないほうが攻撃に強い)"
      },
      {
        "key": "c.deity_move_first+1",
        "label": "[天速度+1]",
        "description": "行動速度の決定値に+1する(より早くなる)"
      },
      {
        "key": "c.deity_accuracy+v",
        "label": "[天命中+v]",
        "description": "値が多いほどより多くの攻撃が命中するようになる"
      },
      {
        "key": "c.deity_evasion+v",
        "label": "[天回避+v]",
        "description": "値が多いほどより多くの攻撃を回避するようになる"
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
        "key": "c.unlock_caninian_ability",
        "label": "[🐶解放]",
        "description": "🐶ケイナイアンのもう一つのアビリティ(再起)が解放されます"
      },
      {
        "key": "c.unlock_lupinian_ability",
        "label": "[🐺解放]",
        "description": "🐺ルピニアンのもう一つのアビリティ(再反撃)が解放されます"
      },
      {
        "key": "c.unlock_vulpinian_ability",
        "label": "[🦊解放]",
        "description": "🦊ヴァルピニアンのもう一つのアビリティ(狡猾)が解放されます"
      },
      {
        "key": "c.unlock_ursan_ability",
        "label": "[🐻解放]",
        "description": "🐻ウルサンのもう一つのアビリティ(サイボーグ化1)が解放されます"
      },
      {
        "key": "c.unlock_felidian_ability",
        "label": "[😺解放]",
        "description": "😺フェリディアンのもう一つのアビリティ(援護射撃)が解放されます"
      },
      {
        "key": "c.unlock_mustelid_ability",
        "label": "[🦡解放]",
        "description": "🦡マステリドのもう一つのアビリティ(行商)が解放されます"
      },
      {
        "key": "c.unlock_leporian_ability",
        "label": "[🐰解放]",
        "description": "🐰レポリアンのもう一つのアビリティ(魔法反撃)が解放されます"
      },
      {
        "key": "c.unlock_cervin_ability",
        "label": "[🦌解放]",
        "description": "🦌セルヴィンのもう一つのアビリティ(予言1)が解放されます"
      },
      {
        "key": "c.unlock_murid_ability",
        "label": "[🐭解放]",
        "description": "🐭ミュリッドのもう一つのアビリティ(未設定)が解放されます"
      },
      {
        "key": "c.unlock_procyonian_ability",
        "label": "[🦝解放]",
        "description": "🦝プロキオニアンのもう一つのアビリティ(未設定)が解放されます"
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
  },
  {
    "id": "2-1-6",
    "heading": "2.1.6 f. function",
    "subtitle": "f. 機能 ゲームの仕組み",
    "entries": [
      {
        "key": "f.physical_targeting",
        "label": "物理ターゲッティング",
        "description": "遠距離フェーズ/近距離フェーズの攻撃対象選択する。\n隊列5に物理攻撃を3回以上狙われる可能性は、敵が32回攻撃では決して発生しない。\n| 隊列 | 可能性 |\n|---|----|\n| 1 | 16 |\n| 2 | 8 |\n| 3 | 4 |\n| 4 | 2 |\n| 5 | 1 |\n| 6 | 1 |"
      },
      {
        "key": "f.magical_targeting",
        "label": "魔法ターゲッティング",
        "description": "魔法フェーズは隊列に依存せずに対象を選択する。\n| 隊列 | 可能性 |\n|---|----|\n| 1 | 2 |\n| 2 | 2 |\n| 3 | 2 |\n| 4 | 2 |\n| 5 | 2 |\n| 6 | 2 |"
      },
      {
        "key": "f.damage_calculation",
        "label": "ダメージ計算",
        "description": "ダメージは`攻撃力-防御力(貫通減算) × 各種倍率`で計算される。各種倍率とは属性倍率、耐性倍率、共鳴、怒り、勢い、パーティ補正などである。"
      },
      {
        "key": "f.hit_detection",
        "label": "命中減衰",
        "description": "多段の後続ヒットほど命中率が減衰する。行動単位で計算され、通常攻撃・連撃・反撃系で減衰は引き継がれない。\n|隊列| 通常 | 狩人1 | 狩人2 | 狩人3 |\n|---|---|---|---|---|\n|1| 1.00 | 1.00 | 1.00 | 1.00 |\n|2| 0.85 | 0.90 | 0.93 | 0.95 |\n|3| 0.72 | 0.81 | 0.86 | 0.90 |\n|4| 0.61 | 0.73 | 0.80 | 0.86 |\n|5| 0.52 | 0.66 | 0.75 | 0.81 |\n|6| 0.44 | 0.59 | 0.70 | 0.77 |"
      },
      {
        "key": "f.counter",
        "label": "反撃",
        "description": "近距離フェーズで被弾後、即時反撃する。反撃無効化で無効化する。壁アビリティの身代わり効果を無視する。"
      },
      {
        "key": "f.re-counter",
        "label": "再反撃",
        "description": "反撃に対して再反撃する。反撃無効化で無効化する。"
      },
      {
        "key": "f.re-attack",
        "label": "連撃",
        "description": "攻撃後に追加攻撃を行う。同一対象へ追撃する。壁アビリティの身代わり効果を無視する。"
      },
      {
        "key": "f.magical-counter",
        "label": "魔法反撃",
        "description": "魔法攻撃に対して即時反撃する。"
      },
      {
        "key": "f.covering-fire",
        "label": "援護射撃",
        "description": "味方行動に連動して追撃する。遠距離攻撃可能な味方が即時射撃する。"
      },
      {
        "key": "f.reward",
        "label": "報酬計算",
        "description": "戦闘結果に応じてアイテムの追加抽選の有無を算出する。通常1枚。解錠スキルで+1枚、神の加護により+1枚、ゲームモードルナで+1枚。"
      },
      {
        "key": "f.donation",
        "label": "寄付金額",
        "description": "祈りフェーズの終わりに、信仰する神に売却益を寄付をすることがあります。寄付金額に応じて信仰は強化されます。\n| ランク | 寄付金額 |\n|-------|----------|\n| 1 | 1,000 |\n| 2 | 2,800 |\n| 3 | 7,560 |\n| 4 | 19,656 |\n| 5 | 49,140 |\n| 6 | 117,936 |\n| 7 | 271,253 |\n| 8 | 596,757 |\n| 9 | 1,253,190 |\n| 10 | 2,506,380 |"
      },
      {
        "key": "f.common_enhancement",
        "label": "コモンアイテムの通常称号",
        "description": "コモンアイテムで通常称号が付与する可能性。\n| 通常称号 | 可能性 |\n|---------|------|\n| (なし) | 1390 |\n| 名工の | 350 |\n| 魔性の | 180 |\n| 宿った | 60 |\n| 伝説の | 15 |\n| 恐ろしい | 4 |\n| 究極の | 1 |"
      },
      {
        "key": "f.enhancement",
        "label": "希少アイテムの通常称号",
        "description": "アンコモン、エリートレア、ボスレア、神魔レアで通常称号が付与する可能性。\n| 通常称号 | 可能性 |\n|---------|------|\n| (なし) | 5490 |\n| 名工の | 350 |\n| 魔性の | 180 |\n| 宿った | 60 |\n| 伝説の | 15 |\n| 恐ろしい | 4 |\n| 究極の | 1 |"
      },
      {
        "key": "f.enhancement_scaling",
        "label": "通常称号の性能向上",
        "description": "通常称号の段階に応じた基礎性能補正。\n| 通常称号 | 増加倍率 |\n|-----|------|\n| (なし) | x1.00 |\n| 名工の | x1.33 |\n| 魔性の | x1.58 |\n| 宿った | x2.10 |\n| 伝説の | x2.75 |\n| 恐ろしい | x3.50 |\n| 究極の | x5.00 |"
      },
      {
        "key": "f.rarity_scaling",
        "label": "レアリティの性能向上",
        "description": "レアリティの段階に応じた基礎性能補正。\n| レアリティ | 増加倍率 |\n|------|--------|\n| コモン | x1.0 |\n| アンコモン | x1.2 |\n| エリートレア | x1.6 |\n| ボスレア | x2.4 |\n| 神魔レア | x3.6 |"
      },
      {
        "key": "f.super_rare_scaling",
        "label": "超レアの性能向上",
        "description": "超レア称号が付くと、さらにその基礎性能が2倍される。また、それぞれ独自のボーナスが付与される。\n| 超レアID | 可能性 |\n|------|-----|\n| (なし)  | 399,920 |\n| 1 | 1 |\n| 2 | 1 |\n| ... | 1 |\n| 80 | 1 |"
      }
    ]
  },
  {
    "id": "2-1-7",
    "heading": "2.1.7 g. gods, religions",
    "subtitle": "g. 神、信仰",
    "entries": [
      {
        "key": "Goddess of Restoration",
        "label": "再生の女神",
        "description": "効果:4部屋毎に減少HPの20+α%を回復する。睡眠時間1.5倍。氷属性に弱い(1.5倍ダメージ増)\n生とは、繰り返される修正である。"
      },
      {
        "key": "God of Attrition",
        "label": "消耗の神",
        "description": "効果:全員に物理攻撃倍率1.25+α倍。4部屋毎に残りHPの5%を失う。\nカジェルで戦え。カジェルが無くなれば、爪で戦え。爪が無くなれば、牙で戦え。"
      },
      {
        "key": "God of Cunning",
        "label": "狡猾の神",
        "description": "効果:全員に魔法防御倍率2/3倍。貯金額0.50+α倍(着服する)。\n真実は力ではない。信じさせることが力である。"
      },
      {
        "key": "God of Fortification",
        "label": "防備の神",
        "description": "効果:全員に物理防御倍率2/3倍。休息時間1.5-α倍。雷属性に弱い(1.5倍ダメージ増)\n平和を望むならば、戦に備えよ。"
      },
      {
        "key": "Goddess of Fertility",
        "label": "豊穣の女神",
        "description": "効果:全員に天速度+1(行動速度が速くなる)。宴会時間1.5-α倍。火属性に弱い(1.5倍ダメージ増)\n肥沃な土壌は、多くの穀肉を求むる。"
      },
      {
        "key": "God of Resonance",
        "label": "共鳴の神",
        "description": "効果:全員の共鳴を1+α段階強化。共鳴は魔法攻撃だけでなく、遠距離攻撃にも適用。魔法防御倍率1.10倍、HP0.90+α倍。\n語られぬ神は消える。響かぬ名は滅びる。"
      },
      {
        "key": "Goddess of Precision",
        "label": "精密の女神",
        "description": "効果:全員の命中+15+α、回避-5。探索時間1.5倍。\n失敗の先には成功がある。"
      },
      {
        "key": "God of Fate",
        "label": "運命の神",
        "description": "効果:未来改変。祈り時間1.5-α倍。\n未来を知る者はそれを変えてしまう。"
      },
      {
        "key": "God of Dusk",
        "label": "黄昏の神",
        "description": "効果:全員の回避+15+α、魔法防御倍率1.10倍。売却時間1.5倍。\n光と闇の境界で、最も多くの嘘が生まれる。"
      },
      {
        "key": "Goddess of Mirage",
        "label": "幻影の女神",
        "description": "効果:全員に魔法攻撃倍率1.2+α倍、物理防御倍率1.10倍。\n真実と幻想に違いはない。違いは込められた願いのみ。"
      },
      {
        "key": "God of Oblivion",
        "label": "忘却されし神",
        "description": "効果:なし。(ランク10:追加報酬抽選+1回)\n神の存在には、ただ一人の真なる信徒で足りる。"
      },
      {
        "key": "Goddess of Discord",
        "label": "不和の神",
        "description": "効果:戦闘開始時、ランダムな1名を⚠️敵対させる。追加報酬抽選+1回。\n調和は停滞である。混沌こそ昇華の源。"
      }
    ]
  },
  {
    "id": "2-1-8",
    "heading": "2.1.8 m. magic",
    "subtitle": "m. 魔法攻撃 (装備によって唱える魔法の種類が変わる)",
    "entries": [
      {
        "key": "arcane_arrows",
        "label": "アルカナアロー",
        "description": "style: multi-hit / element: e.none\n無属性の基本魔法攻撃"
      },
      {
        "key": "fire_lance",
        "label": "ファイアランス",
        "description": "style: multi-hit / element: e.fire < 1.5\n火属性基本魔法(火属性50%未満)"
      },
      {
        "key": "frost_needles",
        "label": "フロストニードル",
        "description": "style: multi-hit / element: e.ice < 1.5\n氷属性基本魔法(氷属性50%未満)"
      },
      {
        "key": "thunder_bolts",
        "label": "サンダーボルト",
        "description": "style: multi-hit / element: e.thunder < 1.5\n雷属性基本魔法(雷属性50%未満)"
      },
      {
        "key": "hellfire_volley",
        "label": "ヘルファイア",
        "description": "style: multi-hit / element: e.fire >= 1.5\n火属性上位魔法(火属性50%以上)"
      },
      {
        "key": "blizzard",
        "label": "ブリザード",
        "description": "style: multi-hit / element: e.ice >= 1.5\n氷属性上位魔法(氷属性50%以上)"
      },
      {
        "key": "lightning_barrage",
        "label": "ライトニングバラージ",
        "description": "style: multi-hit / element: e.thunder >= 1.5\n雷属性上位魔法(雷属性50%以上)"
      },
      {
        "key": "astral_flare",
        "label": "アストラルフレア",
        "description": "style: area_burst / element: e.none\n無属性範囲魔法攻撃(ヒット数は1固定)"
      },
      {
        "key": "pyroclasm",
        "label": "パイロクラスム",
        "description": "style: area_burst / element: e.fire\n火属性範囲魔法攻撃(ヒット数は1固定)"
      },
      {
        "key": "glacial_burst",
        "label": "グレイシャルバースト",
        "description": "style: area_burst / element: e.ice\n氷属性範囲魔法攻撃(ヒット数は1固定)"
      },
      {
        "key": "tempest_nova",
        "label": "テンペストノヴァ",
        "description": "style: area_burst / element: e.thunder\n雷属性範囲魔法攻撃(ヒット数は1固定)"
      },
      {
        "key": "gravity_well",
        "label": "グラビティウェル",
        "description": "style: percentage_damage / element: e.none\n魔法攻撃回数が20回以上の場合発動。相手の残HPの2/5の固定ダメージ(魔法防御力無視)"
      }
    ]
  }
  ,
  {
    "id": "2-1-9",
    "heading": "2.1.9 q. side quest",
    "subtitle": "q. サイドクエスト (条件達成すると報酬として結晶が手に入る)",
    "entries": [
      {
        "key": "q.none",
        "label": "なし",
        "description": "なし"
      },
      {
        "key": "q.squander",
        "label": "散財",
        "description": "宴会で浪費する(神魔戦で中止) (500 ~ 2,000G)"
      },
      {
        "key": "q.sleeping",
        "label": "安眠",
        "description": "寝る(神魔戦で中止) (20分 ~ 60分)"
      },
      {
        "key": "q.exercise",
        "label": "運動",
        "description": "歩く(神魔戦で中止) (45分 ~ 150分)"
      },
      {
        "key": "q.embezzlement",
        "label": "横領",
        "description": "着服する(神魔戦で中止) (100 ~ 400G)"
      },
      {
        "key": "q.donation",
        "label": "寄付",
        "description": "寄付する(神魔戦で中止) (400 ~ 2,000G)"
      },
      {
        "key": "q.healing",
        "label": "治療",
        "description": "治療を受ける(神魔戦で中止) (60分 ~ 120分)"
      },
      {
        "key": "q.AFK",
        "label": "放置",
        "description": "神から干渉を受けない(神魔戦で中止) (180分 ~ 360分)"
      },
      {
        "key": "q.treasure_super_rare",
        "label": "超レア獲得",
        "description": "超レアを獲得する(神魔戦で中止) (1個 ~ 2個)"
      },
      {
        "key": "q.treasure_boss_rare",
        "label": "ボスレア獲得",
        "description": "ボスレアを獲得する(神魔戦で中止) (5個 ~ 15個)"
      },
      {
        "key": "q.poor_kid",
        "label": "アイテム獲得空振り",
        "description": "アイテム獲得空振り(神魔戦で中止) (100回 ~ 300回)"
      },
      {
        "key": "q.consecutive_wins",
        "label": "連続踏破",
        "description": "連続して踏破する(神魔戦で中止) (15回 ~ 60回)"
      },
      {
        "key": "q.losers",
        "label": "敗北",
        "description": "敗北する(神魔戦で中止) (3回 ~ 6回)"
      },
      {
        "key": "q.savings",
        "label": "貯金",
        "description": "貯金する(神魔戦で中止) (800 ~ 4,000G)"
      }
    ]
  }
];
