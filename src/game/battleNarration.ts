import { BattleActionPhase, BattleLogEntry } from '../types';

const CONFUSION_SUCCESS_LOGS = [
  'は target に何かを囁き、仲間を疑い始めた！',
  'の甘い策略に target は引き込まれた！',
  'の影響で target は錯乱した！',
  'が睨みつけ、target の精神は錯乱した！',
  'の精神干渉により target は正常な判断ができなくなった！',
  'は target に幻術をかけ、仲間を敵と誤認した！',
  'の幻惑により target の視界は歪んだ！',
  'の術で target は敵味方の区別を失った！',
  'が植え付けた疑念によって target は見境なく牙を剥いた！',
  'が囁いた禁断の言葉により、target は狂気に囚われた！',
] as const;

const CONFUSION_FAILURE_LOGS = [
  'の策略を target は打ち破った！',
  'の効果は target に通じなかった！',
  'の悪だくみは target によって防がれた！',
  'の混乱は target に効かなかった！',
  'の精神干渉を target は振り払った！',
  'の囁きに対し target は理性を保った！',
  'の幻術を target は見破った！',
  'の術は target に打ち消された！',
  'の見せた幻は target に通用しない！',
  'が語り掛けた誘惑を target は聞きそびれた！',
] as const;

const CONFUSION_NO_TARGET_LOGS = [
  'は策略を巡らせたが、声は風に流され誰にも届かなかった',
  'は幻惑を仕掛けたが、誰も影響を受けなかった',
  'は不和をもたらそうとしたが、誰も近くにいなかった',
  'は策略を巡らせたが、声は誰にも届かなかった',
  'は何かを囁いたが、誰の心にも届かなかった',
  'は混乱を誘おうとしたが、場は静まり返ったままだった',
  'は幻を見せたが、誰もそれを認識しなかった',
  'の幻術は空を切り、誰にも届かなかった',
  'は視界を歪めようとしたが、影響を受ける者はいなかった',
  'の干渉は誰の意識にも届かなかった',
  'は心を乱そうとしたが、影響を与える相手がいなかった',
  'の試みは空振りに終わった',
  'は狂気を広めようとしたが、誰も囚われなかった',
] as const;

const ANTAGONISM_LOGS = {
  long: [
    '{actor} は {target} を敵と誤認し、遠距離攻撃を放った！',
    '{actor} は錯乱し、{target} に矢を放ってしまった！',
    '{actor} は疑念に囚われ、{target} を狙い撃った！',
    '{actor} は味方を敵と見なし、遠距離攻撃を仕掛けた！',
    '{actor} の視界は歪み、{target} を撃ち抜いた！',
    '{actor} は混乱し、{target} に向けて攻撃を放った！',
    '{actor} は仲間を敵と誤認し、遠距離攻撃を行った！',
    '{actor} は理性を失い、{target} を射抜いた！',
    '{actor} は錯乱し、{target} に攻撃を加えた！',
    '{actor} は敵味方の区別を失い、{target} を狙った！',
  ],
  mid: [
    '{actor} は混乱し、{target} に {spell} を放ってしまった！',
    '{actor} は {target} を敵と誤認し、{spell}を発動した！',
    '{actor} の魔力は暴走し、{target} に向けて放たれた！',
    '{actor} は錯乱し、{target} に{spell}を叩き込んだ！',
    '{actor} は理性を失い、{target} に{spell}を放った！',
    '{actor} は仲間を敵と誤認し、魔法攻撃を行った！',
    '{actor} の幻惑は深まり、{target} に魔法を向けた！',
    '{actor} は敵味方の区別を失い、{target} に{spell}を放った！',
    '{actor} は混乱し、{target} に{spell}を発動した！',
    '{actor} の制御を失った魔力が {target} を襲った！',
  ],
  close: [
    '{actor} は敵対状態！ {target} へ攻撃！',
    '{actor} は錯乱している！ {target} へ攻撃してしまった！',
    '{actor} は混乱し、{target} に斬りかかった！',
    '{actor} は {target} を敵と誤認し、攻撃を仕掛けた！',
    '{actor} は理性を失い、{target} に襲いかかった！',
    '{actor} は仲間を敵と見なし、{target} に攻撃した！',
    '{actor} は見境なく、{target} に牙を剥いた！',
    '{actor} は敵味方の区別を失い、{target} に攻撃した！',
    '{actor} は錯乱し、{target} に一撃を加えた！',
    '{actor} は暴走し、{target} に襲いかかった！',
  ],
} as const satisfies Record<BattleActionPhase, readonly string[]>;

const UNSTABLE_CORE_LOGS = {
  long: [
    '{actor} は暴れだし、自らを傷つけた！',
    '{actor} は制御を失い、自身を引き裂いた！',
    '{actor} は錯乱し、自らに攻撃を加えた！',
    '{actor} は苦しみもがき、自傷した！',
    '{actor} は狂乱し、己の身を傷つけた！',
  ],
  mid: [
    '{actor} は錯乱し、自らを傷つけた！',
    '{actor} は暴走し、自身を切り裂いた！',
    '{actor} は理性を失い、自らに攻撃を加えた！',
    '{actor} はもがき苦しみ、自傷した！',
    '{actor} は狂気に呑まれ、自身を傷つけた！',
  ],
} as const satisfies Record<Exclude<BattleActionPhase, 'close'>, readonly string[]>;

const SOUL_REAP_LOGS = [
  '{actor} は {target} に終止符を打った！',
  '{actor} は {target} の魂を刈り取った！',
  '{actor} は {target} の命を摘み取った！',
  '{actor} は {target} に死の刻印を刻んだ！',
  '{actor} は {target} の存在を断ち切った！',
  '{actor} は {target} を無慈悲に葬り去った！',
  '{actor} は {target} の魂を引き剥がした！',
  '{actor} は {target} に逃れられぬ終焉を与えた！',
  '{actor} は {target} をこの世から消し去った！',
  '{actor} は {target} の命脈を断ち切った！',
] as const;

const REGENERATION_LOGS = [
  '{actor} の傷がふさがり始めた！',
  '{actor} の肉体が再生した！',
  '{actor} の傷がみるみる癒えていく！',
  '{actor} は失った力を取り戻した！',
  '{actor} の体が再び動き出した！',
  '{actor} の損傷が回復した！',
  '{actor} の肉が再び繋がった！',
  '{actor} の傷跡が消えていく！',
  '{actor} は再生し、持ち直した！',
  '{actor} の生命力が傷を癒した！',
] as const;

const SELF_DESTRUCT_LOGS = [
  '{actor} は自爆し、{target} を巻き込んだ！',
  '{actor} は体を爆発させ、{target} にダメージを与えた！',
  '{actor} は捨て身の爆発を起こし、{target} を吹き飛ばした！',
  '{actor} は己を犠牲に爆ぜ、{target} を巻き込んだ！',
  '{actor} は最期の力を解き放ち、{target} を巻き込んで爆発した！',
  '{actor} は崩壊し、{target} を巻き込んだ！',
  '{actor} は全てを投げ打ち、{target} を巻き込んで爆発した！',
  '{actor} は暴発し、{target} を吹き飛ばした！',
  '{actor} は断末魔と共に爆ぜ、{target} を巻き込んだ！',
  '{actor} は破裂し、{target} を巻き込んだ！',
] as const;

const DECOMPOSE_LOGS = [
  '{actor} は {target} の防御を崩した！',
  '{actor} は {target} の装備を劣化させた！',
  '{actor} は {target} の体を蝕んだ！',
  '{actor} は {target} の防御を侵食した！',
  '{actor} は {target} の体を弱体化させた！',
  '{actor} は {target} の守りを削り取った！',
  '{actor} は {target} の体制を崩した！',
  '{actor} は {target} の耐久を低下させた！',
  '{actor} は {target} の防御を溶かした！',
  '{actor} は {target} の身体を分解した！',
] as const;

const FREE_LOGS = [
  '{actor} は戦場から離脱した！',
  '{actor} は素早く逃走した！',
  '{actor} は隙を突いて逃げ出した！',
  '{actor} は姿をくらまし、戦闘を離れた！',
  '{actor} は戦いを放棄し、撤退した！',
  '{actor} は煙のように消え去った！',
  '{actor} は機を見て撤退した！',
  '{actor} は一瞬の隙に逃げ去った！',
  '{actor} は戦場から姿を消した！',
  '{actor} は追撃を振り切り、離脱した！',
] as const;

const SHOCK_LOGS = [
  '{target} は感電し、{actor} の攻撃は中断された！',
  '{target} に電撃が走り、{actor} の攻撃は止められた！',
  '{target} の感電が発動し、{actor} の攻撃は途中で途切れた！',
  '{target} は電撃で硬直し、{actor} の連撃は遮られた！',
  '{target} の放つ電流が {actor} を阻み、攻撃は中断された！',
  '{target} は帯電し、{actor} の攻撃は強制的に止まった！',
  '{target} に触れた瞬間、{actor} は感電し攻撃を止めた！',
  '{target} の電撃反応により、{actor} の攻撃は断ち切られた！',
  '{target} は電撃を放ち、{actor} の攻撃を遮断した！',
  '{target} の感電により、{actor} の攻撃はそこで終わった！',
] as const;

// SpecRef: 6.2.2 | Terrain flavor text | log.null-shock
const NULL_SHOCK_LOGS = [
  '{target}は帯電していたが、{actor}は意に介さず攻撃を続けた',
  '{actor}は{target}の電撃を受け流し、動きを止めない',
  '{actor}は痺れを無視して{target}に踏み込んだ',
  '{actor}は{target}の感電をものともせず攻撃を継続した',
  '{actor}の動きは{target}の電撃でも鈍らない',
  '{actor}は{target}の衝撃を受けてもなお攻め続けた',
  '{actor}は{target}の電流を耐え抜いた',
  '{target}の雷撃に{actor}は一瞬の硬直すら見せない',
  '{actor}は{target}の帯電状態を無効化した',
  '{target}は電気を放ったが{actor}は動きを止められなかった',
] as const;

const FLYING_LOGS = [
  '{actor} は飛行している！',
  '{actor} は空へ舞い上がっている！',
  '{actor} は宙に浮かんでいる！',
  '{actor} は飛翔した！',
  '{actor} は上空へ移動した！',
  '{actor} は空中に身を躍らせた！',
  '{actor} はふわりと浮かび上がった！',
  '{actor} は高く跳び上がった！',
  '{actor} は空中へ退いた！',
  '{actor} は空へと身を逃がした！',
] as const;

const CORRODE_LOGS = [
  '{actor} の攻撃が {target} を腐食させた！',
  '{actor} は {target} の武器を蝕んだ！',
  '{actor} の腐食が {target} に広がった！',
  '{target} は腐食し、力を削がれた！',
  '{actor} の一撃が {target} を劣化させた！',
  '{target} の攻撃力が腐食により低下した！',
  '{actor} は {target} を腐らせた！',
  '腐食が {target} を侵食した！',
  '{target} は蝕まれ、力を失った！',
  '{actor} の腐食効果が {target} に作用した！',
] as const;

const LIFE_DRAIN_LOGS = [
  '{actor} は {target} から生命を吸い取った！',
  '{actor} は {target} の力を奪い取った！',
  '{actor} の吸血が {target} を蝕む！',
  '{actor} は {target} の生命を糧とした！',
  '{target} の生命力が吸収された！',
  '{actor} は力を吸収し回復した！',
  '{actor} の吸血が成功した！',
  '{actor} は {target} の生命を奪った！',
  '{actor} は血を啜り、傷を癒した！',
  '{actor} は生命力を取り込み回復した！',
] as const;

const DEATH_TOUCH_LOGS = [
  '{actor} の接死が {target} を捉えた！',
  '{target} は触れられた瞬間、命を絶たれた！',
  '{actor} の一撃が致命に至った！',
  '{target} は即座に倒れた！',
  '死の気配が {target} を包んだ！',
  '{actor} の接死が発動した！',
  '{target} は抗えず倒れた！',
  '{actor} の攻撃が命を断ち切った！',
  '{target} は一瞬で崩れ落ちた！',
  '死が {target} に訪れた！',
] as const;

const BURN_LOGS = [
  '{actor} は炎に焼かれた！',
  '{actor} は火傷の痛みに苦しむ！',
  '火傷が {actor} を蝕む！',
  '{actor} の身体が焼けただれた！',
  '{actor} は炎に包まれた！',
  '絡みつく炎が {actor} を襲う！',
  '{actor} は燃え上がる痛みに悶えた！',
  '火傷がじわじわと {actor} を削る！',
  '{actor} の体が焦げつく！',
  '{actor} は焼けつく痛みに耐える！',
] as const;

const BIND_LOGS = [
  '{actor} は {target} を拘束した！',
  '{target} は動きを封じられた！',
  '{actor} の拘束が {target} を縛る！',
  '{target} は身動きが取れない！',
  '{actor} は {target} を絡め取った！',
  '拘束により {target} は行動不能！',
  '{target} は捕らえられた！',
  '{actor} の力で {target} は封じられた！',
  '{target} は逃れられない！',
  '{actor} は {target} の動きを止めた！',
] as const;

const INCAPACITATED_LOGS = [
  '{actor} は行動不能！',
  '{actor} は動けない！',
  '{actor} は身動きが取れない！',
  '{actor} は拘束されている！',
  '{actor} は縛られている！',
  '{actor} は動きを封じられた！',
  '{actor} は足止めされている！',
  '{actor} は自由に動けない！',
  '{actor} は行動を阻まれた！',
  '{actor} は手足もまともに動かせられない！',
] as const;

const RESURRECT_LOGS = [
  '{actor} は致命傷を耐えた！',
  '{actor} は倒れず踏みとどまった！',
  '{actor} は最後の力で生き残った！',
  '{actor} は崩れ落ちる寸前で持ちこたえた！',
  '{actor} は瀕死ながらも立ち続けている！',
  '{actor} は辛うじて命を繋いだ！',
  '{actor} は倒れることを拒んだ！',
  '{actor} は限界を超えて耐えた！',
  '{actor} はまだ倒れない！',
  '{actor} は執念で立ち続けた！',
] as const;

const REANIMATE_LOGS = [
  '{actor} は蘇った！',
  '{actor} は再び立ち上がった！',
  '{actor} は戦線に復帰した！',
  '{actor} は息を吹き返した！',
  '{actor} は再生し、立ち上がる！',
  '{actor} は倒れてなお蘇生した！',
  '{actor} は再び動き出した！',
  '{actor} は蘇生して戦いに戻った！',
  '{actor} は死を乗り越えた！',
  '{actor} は再び戦う力を得た！',
] as const;

const REQUIEM_LOGS = [
  '{actor}は刃に鎮魂歌を乗せ、{target}を安らかな眠りへと導いた',
  '{actor}の斬撃とともに鎮魂歌が響き、{target}の魂は解き放たれた',
  '{actor}は静かな一太刀で{target}を終焉へと送り出した',
  '{actor}の近接の一撃に鎮魂が宿り、{target}は天へと還った',
  '{actor}の刃が触れた瞬間、{target}の再生は断ち切られた',
  '{actor}は迷いなき一撃で{target}の輪廻を断ち切った',
  '{actor}の鋭い一閃が鎮魂歌となり、{target}を永遠の眠りへ沈めた',
  '{actor}の刃は慈悲深く、しかし確実に{target}の終わりを刻んだ',
  '{actor}の一太刀が鎮魂歌となり、{target}を静寂へと還した',
  '{actor}の一薙ぎにより {target}は跡形もなく消滅した',
] as const;

const NULL_ANTAGONISM_LOGS = [
  '{actor}は不穏な気配を払いのけた',
  '{actor}は敵意の誘いに応じなかった',
  '{actor}は心を乱されなかった',
  '{actor}は敵対の呪いを退けた',
  '{actor}は冷静さを保った',
  '{actor}は争いの流れから外れている',
  '{actor}には敵意が届かなかった',
  '{actor}は不和の囁きを拒んだ',
  '{actor}は理性を失わなかった',
  '{actor}は敵対の影響を受けない',
] as const;

const EQUATION_BREAKER_LOGS = [
  '{actor}は戦場の法則を読み解いた',
  '{actor}は既存の理論を否定した',
  '{actor}は演算を上書きした',
  '{actor}は式の前提を崩した',
  '{actor}は論理の外側に立っている',
  '{actor}は干渉を無効化した',
  '{actor}は計算結果を覆した',
  '{actor}は戦場の定義を書き換えた',
  '{actor}は沈黙の制約を突破した',
  '{actor}は理を越えて行動した',
] as const;

// SpecRef: 6.2.2 | Terrain flavor text | log.unforgettable
const UNFORGETTABLE_LOGS = [
  '{actor}が記憶を消し去ろうとしたが{target}は抗った',
  '{actor}の忘却は{target}に届かなかった',
  '{actor}が呪詛を唱えた。{target}は記憶を手放さなかった',
  '{target}は忘却の力を拒んだ。{actor}の顔はゆがんだ',
  '{target}の意識は揺らがない。{actor}は困惑した',
  '{actor}の干渉は{target}に阻まれた',
  '{actor}の呪縛に対して{target}は自我を保っている',
  '{target}の記憶は消えない。{actor}は息を切らした',
  '{target}は忘却に屈しなかった。{actor}は記憶の操作を諦めた',
  '{actor}の囁きにも{target}は屈することなく自分を保ち続けた',
] as const;

const decomposeDefenseValueFormatter = new Intl.NumberFormat('ja-JP');
const battleNoteValueFormatter = new Intl.NumberFormat('ja-JP');

function pickRandomEntry<T>(entries: readonly T[]): T {
  return entries[Math.floor(Math.random() * entries.length)];
}

export function buildConfusionAction(actorName: string, targetName: string, success: boolean): string {
  const template = pickRandomEntry(success ? CONFUSION_SUCCESS_LOGS : CONFUSION_FAILURE_LOGS);
  return `${actorName}${template.split('target').join(targetName)}`;
}

export function buildAntagonismAction(
  phase: BattleActionPhase,
  actorName: string,
  targetName: string,
  spellName: string | null,
): string {
  const template = pickRandomEntry(ANTAGONISM_LOGS[phase]);
  return template
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName)
    .replace(/\{spell\}/g, spellName ?? '魔法');
}

export function buildUnstableCoreAction(
  phase: Exclude<BattleActionPhase, 'close'>,
  actorName: string,
): string {
  return pickRandomEntry(UNSTABLE_CORE_LOGS[phase]).replace(/\{actor\}/g, actorName);
}

export function buildSoulReapAction(actorName: string, targetName: string): string {
  return pickRandomEntry(SOUL_REAP_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildRegenerationAction(actorName: string): string {
  return pickRandomEntry(REGENERATION_LOGS).replace(/\{actor\}/g, actorName);
}

export function buildSelfDestructAction(actorName: string, targetName: string): string {
  return pickRandomEntry(SELF_DESTRUCT_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildDecomposeAction(actorName: string, targetName: string): string {
  return pickRandomEntry(DECOMPOSE_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildFreeAction(actorName: string): string {
  return pickRandomEntry(FREE_LOGS).replace(/\{actor\}/g, actorName);
}

export function buildShockAction(actorName: string, targetName: string): string {
  return pickRandomEntry(SHOCK_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

// SpecRef: 6.2.2 | Terrain flavor text | log.null-shock
export function buildNullShockAction(actorName: string, targetName: string): string {
  return pickRandomEntry(NULL_SHOCK_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildFlyingAction(actorName: string): string {
  return pickRandomEntry(FLYING_LOGS).replace(/\{actor\}/g, actorName);
}

export function buildCorrodeAction(actorName: string, targetName: string): string {
  return pickRandomEntry(CORRODE_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildLifeDrainAction(actorName: string, targetName: string): string {
  return pickRandomEntry(LIFE_DRAIN_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildDeathTouchAction(actorName: string, targetName: string): string {
  return pickRandomEntry(DEATH_TOUCH_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildBurnAction(actorName: string): string {
  return pickRandomEntry(BURN_LOGS).replace(/\{actor\}/g, actorName);
}

export function buildBindAction(actorName: string, targetName: string): string {
  return pickRandomEntry(BIND_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function buildIncapacitatedAction(actorName: string): string {
  return pickRandomEntry(INCAPACITATED_LOGS).replace(/\{actor\}/g, actorName);
}

export function buildResurrectAction(actorName: string): string {
  return pickRandomEntry(RESURRECT_LOGS).replace(/\{actor\}/g, actorName);
}

export function buildReanimateAction(actorName: string): string {
  return pickRandomEntry(REANIMATE_LOGS).replace(/\{actor\}/g, actorName);
}

// SpecRef: 6.2.2 | Terrain flavor text | log.requiem
export function buildRequiemAction(actorName: string, targetName: string): string {
  return pickRandomEntry(REQUIEM_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

// SpecRef: 6.2.2 | Terrain flavor text | log.null-antagonism
export function buildNullAntagonismAction(actorName: string): string {
  return pickRandomEntry(NULL_ANTAGONISM_LOGS).replace(/\{actor\}/g, actorName);
}

// SpecRef: 6.2.2 | Terrain flavor text | log.equation-breaker
export function buildEquationBreakerAction(actorName: string): string {
  return pickRandomEntry(EQUATION_BREAKER_LOGS).replace(/\{actor\}/g, actorName);
}

// SpecRef: 6.2.2 | Terrain flavor text | log.unforgettable
export function buildUnforgettableAction(actorName: string, targetName: string): string {
  return pickRandomEntry(UNFORGETTABLE_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

export function getConfusionNoTargetLog(actorName: string): Pick<BattleLogEntry, 'action' | 'note'> {
  const action = pickRandomEntry(CONFUSION_NO_TARGET_LOGS);
  return {
    action: `${actorName}${action}`,
    note: '(混乱-対象なし)',
  };
}

export function formatRegenerationNote(healAmount: number): string {
  return `(✚ ${healAmount})`;
}

export function formatDefeatRecoveryNote(label: string, healAmount: number): string {
  return `(${label} ✚${battleNoteValueFormatter.format(healAmount)})`;
}

export function formatDecomposeNote(targetName: string, previousDefense: number, nextDefense: number): string {
  return `(${targetName} の 防御力 ${decomposeDefenseValueFormatter.format(Math.round(previousDefense))} → ${decomposeDefenseValueFormatter.format(Math.round(nextDefense))})`;
}
