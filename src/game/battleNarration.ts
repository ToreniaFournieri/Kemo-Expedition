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

const decomposeDefenseValueFormatter = new Intl.NumberFormat('ja-JP');

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

export function buildFlyingAction(actorName: string): string {
  return pickRandomEntry(FLYING_LOGS).replace(/\{actor\}/g, actorName);
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

export function formatDecomposeNote(targetName: string, previousDefense: number, nextDefense: number): string {
  return `(${targetName} の 防御力 ${decomposeDefenseValueFormatter.format(Math.round(previousDefense))} → ${decomposeDefenseValueFormatter.format(Math.round(nextDefense))})`;
}
