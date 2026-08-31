import { Fragment,useEffect,useState,type CSSProperties,type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ABILITY_BASE_NAMES } from '../../data/abilityNames';
import {
BONUS_ABILITY_GLOSSARY_ENTRY_BY_ABILITY_ID,
type BonusAbilityGlossarySubcategoryId
} from '../../data/bonusAbilityGlossary';
import { CLASSES,CLASS_SHORT_NAMES,getClassShortName } from '../../data/classes';
import { GOD_MYTHIC_DROPS,getGodProfileForDungeon } from '../../data/dropTables';
import {
DUNGEONS,
getLocalizedExpeditionFloorConcept
} from '../../data/dungeons';
import { ENEMIES,getEnemyDropCandidates } from '../../data/enemies';
import { GLOSSARY_SECTIONS } from '../../data/glossary';
import { ENHANCEMENT_TITLES,SUPER_RARE_TITLES,getSuperRareBonuses } from '../../data/items';
import { LINEAGES } from '../../data/lineages';
import { PREDISPOSITIONS } from '../../data/predispositions';
import { RACES } from '../../data/races';
import { getBaseMultiplier } from '../../game/baseMultiplier';
import { isStandaloneBattleLogName } from '../../game/battleLogNameMatch';
import { buildAggregatedLifeDrainAction } from '../../game/battleNarration';
import { computeCharacterStats,getAbilityDescription } from '../../game/characterComputation';
import {
ENTRY_GATE_REQUIRED,
getBossGateKey,
getClearGateProgress,
getClearGateRequired,
getEliteGateKey,
getGodsBattleProgress,
getGodsBattleRequired,
hasDefeatedDungeonBoss,
isClearGateUnlocked,
isDungeonEntryUnlocked,
} from '../../game/clearGate';
import { formatEnemyDefName,getEnemyTypeShortName } from '../../game/enemyDisplay';
import { isEnemyTypeCBonusType } from '../../game/enemyScaling';
import { createEnvironmentStorageKey,getEnvironmentId } from '../../game/environment';
import type { AfkPartyChunkResult } from '../../game/afkChunkCoordinator';
import type { AutoEquipmentProfileAction } from '../../game/autoEquipmentAttribution';
import {
AFK_MAX_EFFECTIVE_ELAPSED_MS,
AFK_MAX_REAL_ELAPSED_MS,
normalizePersistedAfkChunkCursor,
type AfkSimulationBatchSlice,
type PersistedAfkChunkCursor
} from '../../game/afkScheduler';
import { getItemDisplayName,getLocalizedItemName } from '../../game/gameState';
import { JEWEL_DEFS,getJewelCBonusValue,getJewelDRankValue,getJewelShortLabel } from '../../game/jewel';
import { isSpecialMagicCastable,resolveMagicProfile,resolveSpecialMagicFromAbilities } from '../../game/magic';
import { BASE_STEP_DURATION_MS } from '../../game/progressTiming';
export {
getRestInitialTotalSteps,
REST_HEAL_MAX_HP_RATIO,
REST_HEAL_MIN_HP,
} from '../../game/restHealing';
import { Language,t } from '../../i18n';
import type { AfkPartyTransactionAttribution,AfkPartyTransactionPlanner } from '../../hooks/useGameState';
import { AbilityId,Bonus,BonusType,Character,ComputedCharacterStats,DiaryDefeatNotificationMode,DiaryLog,DiaryRarityThreshold,DiarySettings,DiarySideQuestThreshold,Dungeon,ElementalOffense,EnemyDef,ExpeditionDepthLimit,ExpeditionDestinationMode,ExpeditionLog,ExpeditionLogEntry,ExpeditionSimulationResult,GameBags,GameNotification,GameState,InventoryVariant,Item,ItemCategory,JewelKey,NotificationCategory,NotificationStyle,Party,Race,RaceId,type Ability,type BattleLogEntry } from '../../types';

export function resolvePublicAssetPath(path?: string): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/(public\/)?/, '')}`;
}

export const UNIQUE_PARTY_MEMBER_IMAGE_BY_LINEAGE: Readonly<Partial<Record<string, string>>> = {
  unascertained: 'Unique_Kemo.png',
  pioneer: 'Unique_Laika.png',
  crescent_jade: 'Unique_Luna.png',
  phantom_thief: 'Unique_Nox.png',
  incarnation: 'Unique_Merle.png',
  flamebound_grove: 'Unique_Puchitsa.png',
  almighty: 'Unique_Souga-ha.png',
  meddlesome_fox: 'Unique_Leonard.png',
  hidden_grail: 'Unique_Hagakure.png',
  'unexpected_prince(ss)': 'Unique_Finn.png',
  rowdy_orca_girl: 'Unique_Orca.png',
  apostate: 'Unique_Mishka.png',
};

export const escapeExportHtml = (value: string): string => (
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
);

// SpecRef: 8.1.2 | Header | Attached File
// SpecRef: 8.6 | UI_SETTING | フィードバック
export function buildStatusTableHtmlFile(rows: string[][], fileName: string, title = 'Status table'): File {
  const statusHeaders = [
    t('home.progressReport.statusHeader.partyPosition'),
    t('home.progressReport.statusHeader.nameAndBuild'),
    t('home.progressReport.statusHeader.physicalDefense'),
    t('home.progressReport.statusHeader.magicalDefense'),
    t('home.progressReport.statusHeader.evasionAndPenetration'),
    t('home.progressReport.statusHeader.attack'),
    t('home.progressReport.statusHeader.elementalDefense'),
    t('home.progressReport.statusHeader.abilities'),
  ];
  const htmlRows = rows.map((row) => `<tr>${row.map((cell, cellIndex) => `<td${cellIndex <= 1 ? ' style="font-weight:700;"' : ''}>${escapeExportHtml(cell.replace(/\*\*/g, ''))}</td>`).join('')}</tr>`).join('');
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeExportHtml(title)}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:12px;color:#111}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #d1d5db;padding:6px;vertical-align:top;text-align:left}th{background:#f3f4f6;position:sticky;top:0}@media (max-width:768px){table{font-size:11px}th,td{padding:4px}}</style></head><body><h1>${escapeExportHtml(title)}</h1><table><thead><tr>${statusHeaders.map((header) => `<th>${escapeExportHtml(header)}</th>`).join('')}</tr></thead><tbody>${htmlRows}</tbody></table></body></html>`;
  return new File([html], fileName, { type: 'text/html' });
}


// SpecRef: 8.1.2 | Header | Status table
// SpecRef: 8.6 | UI_SETTING | フィードバック
export function buildStatusTableRows(parties: Party[], partyIndexes = parties.map((_, index) => index)): string[][] {
  return partyIndexes.flatMap((partyIndex) => {
    const party = parties[partyIndex];
    if (!party) return [];
    return party.characters.map((member, rowIndex) => {
      const mainClass = CLASSES.find((entry) => entry.id === member.mainClassId);
      const subClass = CLASSES.find((entry) => entry.id === member.subClassId);
      const computed = computeCharacterStats(member, party.level, rowIndex + 1);
      const formatPercent = (value: number) => `${formatNumber(Math.round(value * 10000) / 100)}%`;
      const formatSignedScaledBy1000 = (value: number) => `${value >= 0 ? '+' : ''}${formatNumber(Math.round(value * 1000))}`;
      const attackParts: string[] = [];
      const combatBonuses = getCharacterCombatBonusLevels(member);
      if (combatBonuses.ranged) attackParts.push(t('home.progressReport.attackSummary.ranged', { attack: formatNumber(computed.rangedAttack), multiplier: formatPercent(computed.physicalOffenseMultiplier), count: formatNumber(computed.rangedNoA) }));
      if (combatBonuses.magic) attackParts.push(t('home.progressReport.attackSummary.magic', { attack: formatNumber(computed.magicalAttack), multiplier: formatPercent(computed.magicalOffenseMultiplier), count: formatNumber(computed.magicalNoA) }));
      if (combatBonuses.melee) attackParts.push(t('home.progressReport.attackSummary.melee', { attack: formatNumber(computed.meleeAttack), multiplier: formatPercent(computed.physicalOffenseMultiplier), count: formatNumber(computed.meleeNoA) }));
      const elementalAttributeEmoji: Record<'fire' | 'ice' | 'thunder', string> = { fire: '🔥', ice: '❄', thunder: '⚡' };
      const elementalOffense = computed.elementalOffense === 'none' ? '-' : `${elementalAttributeEmoji[computed.elementalOffense]}(+${formatNumber(Math.max(0, Math.round((computed.elementalOffenseValue - 1) * 100)))}%)`;
      const race = RACES.find((entry) => entry.id === member.raceId);
      const build = `${race?.emoji ?? '-'}${member.gender === 'male' ? t('character.gender.maleShort') : t('character.gender.femaleShort')}${mainClass ? (CLASS_SHORT_NAMES[mainClass.id] ?? mainClass.name) : '-'}${subClass ? (CLASS_SHORT_NAMES[subClass.id] ?? subClass.name) : '-'}${LINEAGE_SHORT_NAME_KEYS[member.lineageId] ? t(LINEAGE_SHORT_NAME_KEYS[member.lineageId]) : member.lineageId}${PREDISPOSITION_SHORT_NAME_KEYS[member.predispositionId] ? t(PREDISPOSITION_SHORT_NAME_KEYS[member.predispositionId]) : member.predispositionId}`;
      return [
        `**${formatNumber(partyIndex + 1)}-${formatNumber(rowIndex + 1)}**`,
        `**${member.name}, ${build}**`,
        `${formatNumber(computed.physicalDefense)}. ${formatPercent(computed.physicalDefenseAmplifier)}`,
        `${formatNumber(computed.magicalDefense)}. ${formatPercent(computed.magicalDefenseAmplifier)}`,
        `${formatSignedScaledBy1000(computed.evasionBonus)}, ${formatPercent(computed.penetMultiplier)}`,
        attackParts.length ? `${attackParts.join('/')} ${elementalOffense === '-' ? '' : elementalOffense}`.trim() : elementalOffense,
        `${formatPercent(computed.elementalDefenseMultipliers.fire)}, ${formatPercent(computed.elementalDefenseMultipliers.ice)}, ${formatPercent(computed.elementalDefenseMultipliers.thunder)}`,
        computed.abilities.map((ability) => `${ABILITY_NAMES[ability.id] ?? ability.id}${formatNumber(ability.level)}`).join(', ') || '-',
      ];
    });
  });
}

export const CHARACTER_CHIBI_IMAGE_FILES = new Set(__PUBLIC_CHIBI_IMAGE_FILES__);
export const CHARACTER_IMAGE_FILES = new Set(__PUBLIC_CHARACTER_IMAGE_FILES__);

// SpecRef: 8.2.4 | Equipment management | Image of inventory pane transaction at equipment management
// SpecRef: 8.4.2 | Inventory(所持品) | Item list
export function getInventoryOwnerCharacterImageSrc(character: Character, partyId: number): string | null {
  // SpecRef: 8.2.3 | Character Edit Mode (selected member): | Chibi character
  if (character.raceId === 'mimorian' && character.mimorianEnemyId != null) {
    return `${import.meta.env.BASE_URL}chibi/C_E_${character.mimorianEnemyId}.png`;
  }
  const uniqueFileName = character.isUnique
    ? UNIQUE_PARTY_MEMBER_IMAGE_BY_LINEAGE[character.lineageId]
    : undefined;
  if (uniqueFileName) {
    const chibiFileName = `C_${uniqueFileName}`;
    if (CHARACTER_CHIBI_IMAGE_FILES.has(chibiFileName)) {
      return `${import.meta.env.BASE_URL}chibi/${chibiFileName}`;
    }
    if (CHARACTER_IMAGE_FILES.has(uniqueFileName)) {
      return `${import.meta.env.BASE_URL}character/${uniqueFileName}`;
    }
    return null;
  }

  const race = RACES.find((entry) => entry.id === character.raceId);
  if (!race) return null;
  const genderLabel = character.gender === 'male' ? 'Male' : 'Female';
  const partyRaceGenderFileName = `${partyId}_${race.englishName}_${genderLabel}.png`;
  if (CHARACTER_CHIBI_IMAGE_FILES.has(`C_${partyRaceGenderFileName}`)) {
    return `${import.meta.env.BASE_URL}chibi/C_${partyRaceGenderFileName}`;
  }
  if (CHARACTER_IMAGE_FILES.has(partyRaceGenderFileName)) {
    return `${import.meta.env.BASE_URL}character/${partyRaceGenderFileName}`;
  }
  return null;
}

export interface HomeScreenProps {
  state: GameState;
  notifications: GameNotification[];
  onDismissNotification: (id: string) => void;
  onDismissAllNotifications: () => void;
  bags: GameBags;
  actions: {
    selectParty: (partyIndex: number) => void;
    selectDungeon: (partyIndex: number, dungeonId: number) => void;
    autoSelectDungeon: (partyIndex: number, dungeonId: number) => void;
    setExpeditionDestinationMode: (partyIndex: number, mode: ExpeditionDestinationMode) => void;
    setExpeditionDepthLimit: (partyIndex: number, depthLimit: ExpeditionDepthLimit) => void;
    setExpeditionDifficultyOffset: (partyIndex: number, difficultyOffset: number) => void;
    resetExpeditionStats: (partyIndex: number) => void;
    simulateExpedition: (partyIndex: number, gameMode?: GameMode, onProgress?: (completed: number, total: number) => void) => Promise<ExpeditionSimulationResult>;
    runExpedition: (partyIndex: number, gameMode?: GameMode, triggerGodsBattle?: boolean, simulatedAt?: number) => void;
    resolveInstantExpedition: (partyIndex: number, gameMode?: GameMode, triggerGodsBattle?: boolean, simulatedAt?: number) => void;
    consumeInstantExpeditionStock: (partyIndex: number, now?: number) => void;
    finalizeDiaryLog: (partyIndex: number, simulatedAt?: number) => void;
    updatePartyDeity: (partyIndex: number, deityName: string) => void;
    healPartyHp: (partyIndex: number, amount: number) => void;
    clearPendingProfit: (partyIndex: number) => void;
    processPendingProfit: (partyIndex: number, donation: number, deposit: number) => void;
    spendPendingProfit: (partyIndex: number, amount: number) => void;
    rollPartySleepiness: (partyIndex: number) => void;
    rollSideQuest: (partyIndex: number, rolledTier: number, simulatedAt?: number) => void;
    cancelSideQuest: (partyIndex: number) => void;
    advanceSideQuest: (partyIndex: number, amount: number, simulatedAt?: number) => void;
    setSideQuestProgress: (partyIndex: number, progress: number) => void;
    equipItem: (characterId: number, slotIndex: number, itemKey: string | null, partyIndex?: number) => void;
    applyAutoEquipmentActions: (actions: AutoEquipmentProfileAction[]) => void;
    toggleEquipmentLock: (characterId: number, slotIndex: number, partyIndex?: number) => void;
    attachJewel: (characterId: number, slotIndex: number, jewelKey: JewelKey, rank: number, partyIndex?: number) => void;
    updateCharacter: (characterId: number, updates: Partial<Character>, partyIndex?: number) => void;
    reorderPartyCharacter: (fromIndex: number, toIndex: number, partyIndex?: number) => void;
    sellStack: (variantKey: string) => void;
    sellAllOwned: () => void;
    grantFeedbackReward: () => void;
    unlockMimorianEnemy: (enemyId: number) => void;
    buyShopItem: (itemId: number, stockItemKey: string) => void;
    buyDebugStoreItem: (itemId: number) => void;
    refreshShopLineup: () => void;
    setVariantStatus: (variantKey: string, status: 'notown') => void;
    markItemsSeen: () => void;
    markDiaryLogSeen: (logId: string) => void;
    markPartyDiaryLogsSeen: (partyIndex: number) => void;
    markDeveloperNewsRead: (itemIds: string[]) => void;
    updateDiarySettings: (partyIndex: number, settings: Partial<DiarySettings>) => void;
    setJewelAutoEquipPriorityParty: (partyId: number | null) => void;
    simulateAfk: (elapsedMs: number, isAutoRepeatEnabled: boolean, gameMode?: GameMode, simulatedEndAt?: number, cycleDurationScale?: number, batchSlice?: AfkSimulationBatchSlice) => void;
    commitAfkPartyChunk: (result: AfkPartyChunkResult) => void;
    commitAfkPartyTransaction: (
      result: AfkPartyChunkResult,
      autoEquipment: readonly AutoEquipmentProfileAction[] | AfkPartyTransactionPlanner,
      attribution?: AfkPartyTransactionAttribution,
    ) => void;
    commitAfkPartyTransactionAuthoritatively: (
      result: AfkPartyChunkResult,
      autoEquipment: readonly AutoEquipmentProfileAction[] | AfkPartyTransactionPlanner,
      attribution?: AfkPartyTransactionAttribution,
    ) => {
      version: number;
      previousVersion: number;
      changed: boolean;
      state: GameState;
      installedAt: number;
    };
    getAuthoritativeState: () => { version: number; state: GameState; installedAt: number };
    publishAuthoritativeState: () => {
      published: boolean;
      version: number;
      previousPresentedVersion: number;
      delayMs: number;
    };
    runApiSortieBatch: (partyIndex: number, count: number, gameMode?: GameMode, simulatedAt?: number) => {
      state: GameState;
      runs: Array<{ party: Party; log: ExpeditionLog | null; beforeState: GameState; afterState: GameState }>;
    };
    resetGame: () => void;
    importGameState: (state: GameState) => Promise<{ state: GameState | null; errorLog: string | null }>;
    getCompressedSavePayload: () => Promise<string>;
    resetCommonBags: () => void;
    resetUniqueBags: () => void;
    resetCommonSuperRareBag: () => void;
    resetRareSuperRareBag: () => void;
    resetSideQuestBag: () => void;
    setLanguage: (language: Language) => Promise<void>;
    unlockPartySlot: () => void;
    addNotification: (
      message: string,
      style?: NotificationStyle,
      category?: NotificationCategory,
      isPositive?: boolean,
      options?: { rarity?: ItemRarity; isSuperRareItem?: boolean }
    ) => void;
    addStatNotifications: (changes: Array<{ message: string; isPositive: boolean }>) => void;
    flushSave: () => Promise<void>;
  };
}

export type Tab = 'party' | 'expedition' | 'base' | 'diary' | 'setting';
export type WideModeSecondaryTab = Exclude<Tab, 'expedition'>;
export type BaseSubTab = 'inventory' | 'shop' | 'debugStore' | 'workshop' | 'altar';

export type UiIconKey = 'fire' | 'ice' | 'thunder' | 'melee' | 'ranged' | 'magic' | 'unlock' | 'lock';

export const UI_ICON_PATHS: Record<UiIconKey, string> = {
  fire: `${import.meta.env.BASE_URL}icons/fire.png`,
  ice: `${import.meta.env.BASE_URL}icons/ice.png`,
  thunder: `${import.meta.env.BASE_URL}icons/thunder.png`,
  melee: `${import.meta.env.BASE_URL}icons/melee.png`,
  ranged: `${import.meta.env.BASE_URL}icons/ranged.png`,
  magic: `${import.meta.env.BASE_URL}icons/magic.png`,
  unlock: `${import.meta.env.BASE_URL}icons/unlock.png`,
  lock: `${import.meta.env.BASE_URL}icons/lock.png`,
};

export const UI_EMOJI_ICON_MAP: Record<string, UiIconKey> = {
  '🔥': 'fire',
  '❄️': 'ice',
  '⚡': 'thunder',
  '⚔️': 'melee',
  '⚔': 'melee',
  '🏹': 'ranged',
  '🪄': 'magic',
  '🔓': 'unlock',
  '🔒': 'lock',
};

export function renderUiIcon(iconKey: UiIconKey, className: string = 'sub-theme-emoji-icon'): JSX.Element {
  // SpecRef: 8.1 | UI_FOUNDATIONS | Emoji Icon Replacement
  return (
    <img
      src={UI_ICON_PATHS[iconKey]}
      alt=""
      aria-hidden="true"
      className={`ui-inline-icon ${className}`}
    />
  );
}

export function renderTextWithUiIcons(text: string, classNameResolver?: (iconKey: UiIconKey) => string): ReactNode {
  // SpecRef: 8.1 | UI_FOUNDATIONS | Emoji Icon Replacement
  return text.split(/(🔥|❄️|⚡|⚔️|⚔|🏹|🪄|🔓|🔒)/gu).map((segment, index) => {
    const mappedIcon = UI_EMOJI_ICON_MAP[segment];
    if (!mappedIcon) return <Fragment key={`text-${index}`}>{segment}</Fragment>;
    return (
      <Fragment key={`icon-${index}`}>
        {renderUiIcon(mappedIcon, classNameResolver?.(mappedIcon) ?? 'sub-theme-emoji-icon')}
      </Fragment>
    );
  });
}

export const ELEMENTAL_RESISTANCE_ORDER: ReadonlyArray<{ key: 'fire' | 'ice' | 'thunder'; icon: UiIconKey }> = [
  { key: 'fire', icon: 'fire' },
  { key: 'ice', icon: 'ice' },
  { key: 'thunder', icon: 'thunder' },
];

export const renderElementalResistanceInline = (
  multipliers: Record<'fire' | 'ice' | 'thunder', number>
): JSX.Element => (
  <>
    {t('home.elementalResistance.label')}: {' '}
    {ELEMENTAL_RESISTANCE_ORDER.map(({ key, icon }, index) => (
      <Fragment key={key}>
        {index > 0 ? ',' : ''}
        {renderUiIcon(icon)}
        {formatNumber(Math.round(Math.max(0.01, multipliers[key] ?? 1) * 100))}%
      </Fragment>
    ))}
  </>
);


export type PartyCycleState = 'rest' | 'sell' | 'free_action' | 'sound_sleep' | 'pray' | 'idle' | 'move' | 'explore' | 'return' | 'reactivate';

export const PARTY_EXPEDITION_SPLIT_MIN_WIDTH = 700;
export const TAB_PANEL_WIDTH_PX = 500;
export const WIDE_MODE_DEFAULT_SECONDARY_TAB: WideModeSecondaryTab = 'party';
export const MAIN_TAB_ORDER: readonly Tab[] = ['expedition', 'party', 'base', 'diary', 'setting'];
// SpecRef: 8.1 | UI_FOUNDATIONS | Style: Compact, simple, iOS-like
export const IOS_GLASS_BUTTON_CLASS =
  'ios-glass-button rounded-xl';
// SpecRef: 8.1 | UI_FOUNDATIONS | Style: Compact, simple, iOS-like
export const IOS_GLASS_TAB_CLASS =
  'ios-glass-button rounded-xl';
// SpecRef: 8.1 | UI_FOUNDATIONS | Navigation tabs
export const IOS_GLASS_TOP_TAB_CLASS =
  'ios-glass-button ios-glass-top-tab rounded-2xl';
// SpecRef: 8.1 | UI_FOUNDATIONS | Style: Compact, simple, iOS-like
export const IOS_GLASS_SLIDER_CLASS =
  'ios-glass-slider';

export function getSliderProgressStyle(value: number, min: number, max: number): CSSProperties {
  const clampedMax = Math.max(min, max);
  const clampedValue = Math.min(clampedMax, Math.max(min, value));
  const progress = clampedMax === min ? 0 : ((clampedValue - min) / (clampedMax - min)) * 100;
  return { '--slider-progress': `${progress}%` } as CSSProperties;
}

export const TERRAIN_EFFECT_GLOSSARY_SECTION = GLOSSARY_SECTIONS.find((section) => section.heading === '1.1.10 t. terrain effects');
export const TERRAIN_EFFECT_OPTIONS = [
  { key: 'none', label: 'none', description: t('home.terrainEffect.noneDescription') },
  ...(TERRAIN_EFFECT_GLOSSARY_SECTION?.entries ?? []),
];
export const TERRAIN_EFFECT_LABELS = TERRAIN_EFFECT_OPTIONS.reduce<Record<string, string>>((acc, entry) => {
  acc[entry.key] = entry.label;
  return acc;
}, {});

export const PARTY_CYCLE_STATE_LABELS: Record<PartyCycleState, string> = {
  rest: 'expedition.cycle.rest',
  sell: 'expedition.cycle.sell',
  free_action: 'expedition.cycle.freeAction',
  sound_sleep: 'expedition.cycle.soundSleep',
  pray: 'expedition.cycle.pray',
  idle: 'expedition.cycle.idle',
  move: 'expedition.cycle.move',
  explore: 'expedition.cycle.explore',
  return: 'expedition.cycle.return',
  reactivate: 'expedition.cycle.reactivate',
};

export const BONUS_ABILITY_PHASE_DISPLAY_LABELS: Record<'COMBAT' | 'END', string> = {
  COMBAT: t('battleLog.phase.combat'),
  END: t('common.end'),
};

export function formatBonusAbilityPhaseDisplay(value: string): string {
  return value.replace(/COMBAT|END/g, (phase) => BONUS_ABILITY_PHASE_DISPLAY_LABELS[phase as 'COMBAT' | 'END']);
}

export function isBonusAbilityTimingToken(token: string): boolean {
  return /^(?:COMBAT|END)\d(?:\/(?:COMBAT|END)\d)*$/.test(token);
}

export function parseBonusAbilityLevelScale(levelScale: string): { timing: string | null; value: string | null } {
  const scaleContent = levelScale.replace(/^Lv\d+:\s*/, '').trim();
  if (scaleContent.length === 0 || scaleContent === '-') {
    return { timing: null, value: null };
  }

  const separatorIndex = scaleContent.indexOf('・');
  if (separatorIndex < 0) {
    const isTimingOnly = /^(COMBAT|END)\d/.test(scaleContent);
    return {
      timing: isTimingOnly ? formatBonusAbilityPhaseDisplay(scaleContent) : null,
      value: isTimingOnly ? null : scaleContent,
    };
  }

  const timingToken = scaleContent.slice(0, separatorIndex).trim();
  const valueToken = scaleContent.slice(separatorIndex + 1).trim();

  if (!isBonusAbilityTimingToken(timingToken)) {
    return {
      timing: null,
      value: scaleContent,
    };
  }

  return {
    timing: timingToken.length > 0 ? formatBonusAbilityPhaseDisplay(timingToken) : null,
    value: valueToken.length > 0 ? valueToken : null,
  };
}

export function formatBonusAbilityHelpDescription(abilityId: AbilityId, level: number): string {
  const entry = BONUS_ABILITY_GLOSSARY_ENTRY_BY_ABILITY_ID.get(abilityId);
  if (!entry) {
    return getAbilityDescription(abilityId, level);
  }

  const levelScale = entry.levelScale[Math.max(level - 1, 0)] ?? entry.levelScale[entry.levelScale.length - 1] ?? '';
  if (levelScale.length === 0) {
    return entry.description;
  }

  if (abilityId === 'execution') {
    const executionScaleMatch = levelScale.match(/Lv\d+:\s*(\d+%)・x?([\d.]+)/);
    if (executionScaleMatch) {
      const [, threshold, multiplier] = executionScaleMatch;
      return entry.description
        .replace(/xN/g, `x${multiplier}`)
        .replace(/xM/g, `x${multiplier}`)
        .replace(/N/g, threshold)
        .replace(/M/g, multiplier)
        .replace(new RegExp(`${escapeRegExp(t('home.grammar.objectParticle'))}\\s+x`, 'g'), t('home.grammar.objectParticleX'))
        .replace(new RegExp(`${escapeRegExp(t('home.grammar.subjectParticle'))}\\s+x`, 'g'), t('home.grammar.subjectParticleX'))
        .replace(new RegExp(`${escapeRegExp(t('home.grammar.possessiveParticle'))}\\s+x`, 'g'), t('home.grammar.possessiveParticleX'));
    }
  }
  if (abilityId === 'melee_conversion') {
    const meleeConversionScaleMatch = levelScale.match(/Lv\d+:\s*(\d+)%・(\d+)%/);
    if (meleeConversionScaleMatch) {
      const [, rangedRate, magicalRate] = meleeConversionScaleMatch;
      return entry.description
        .replace(/N%/g, `${rangedRate}%`)
        .replace(/M%/g, `${magicalRate}%`);
    }
  }

  const { timing, value } = parseBonusAbilityLevelScale(levelScale);
  let description = entry.description;

  if (abilityId.endsWith('_reflect') && value && value.includes(t('home.abilityScale.reflect')) && value.includes(t('home.abilityScale.damageTaken'))) {
    return entry.description
      .replace(t('home.abilityDescription.reflectTemplate'), t('home.abilityDescription.reflectDistributed', { value }))
      .replace(new RegExp(`${escapeRegExp(t('home.grammar.objectParticle'))}\\s+x`, 'g'), t('home.grammar.objectParticleX'))
      .replace(new RegExp(`${escapeRegExp(t('home.grammar.subjectParticle'))}\\s+x`, 'g'), t('home.grammar.subjectParticleX'))
      .replace(new RegExp(`${escapeRegExp(t('home.grammar.possessiveParticle'))}\\s+x`, 'g'), t('home.grammar.possessiveParticleX'));
  }

  if (timing) {
    description = description
      .replace(t('home.abilityDescription.specifiedEndTiming'), t('home.abilityDescription.resolvedEndTiming', { timing }))
      .replace(t('home.abilityDescription.specifiedTiming'), t('home.abilityDescription.resolvedTiming', { timing }));
  }

  if (value) {
    const normalizedValue = value.startsWith('x') ? value.slice(1) : value;
    const signedPercentValue = normalizedValue.startsWith('+') || normalizedValue.startsWith('-') ? normalizedValue : `+${normalizedValue}`;
    const negativePercentValue = normalizedValue.startsWith('-') ? normalizedValue : `-${normalizedValue.replace(/^\+/, '')}`;
    description = description
      .replace(/\+N%/g, signedPercentValue)
      .replace(/-N%/g, negativePercentValue)
      .replace(/N%/g, normalizedValue)
      .replace(/xN/g, value.startsWith('x') ? value : `x${value}`)
      .replace(/N/g, normalizedValue);
  }

  return description
    .replace(new RegExp(`${escapeRegExp(t('home.grammar.objectParticle'))}\\s+x`, 'g'), t('home.grammar.objectParticleX'))
    .replace(new RegExp(`${escapeRegExp(t('home.grammar.subjectParticle'))}\\s+x`, 'g'), t('home.grammar.subjectParticleX'))
    .replace(new RegExp(`${escapeRegExp(t('home.grammar.possessiveParticle'))}\\s+x`, 'g'), t('home.grammar.possessiveParticleX'));
}

export const LEGACY_PARTY_CYCLE_STATE_MAP: Record<string, PartyCycleState> = {
  rest: 'rest',
  sell: 'sell',
  feast: 'free_action',
  slump: 'free_action',
  free_action: 'free_action',
  sound_sleep: 'sound_sleep',
  nap_sleep: 'move',
  outfit: 'move',
  sleep: 'sound_sleep',
  pray: 'pray',
  idle: 'idle',
  move: 'move',
  explore: 'explore',
  return: 'return',
  reactivate: 'reactivate',
};

export function toPartyCycleState(value: unknown): PartyCycleState {
  if (typeof value !== 'string') return 'idle';
  const legacyJapaneseStateEntries: Array<[string, PartyCycleState]> = [
    [t('home.legacyCycle.rest'), 'rest'],
    [t('home.legacyCycle.sell'), 'sell'],
    [t('home.legacyCycle.feast'), 'free_action'],
    [t('home.legacyCycle.slump'), 'free_action'],
    [t('home.legacyCycle.freeAction'), 'free_action'],
    [t('home.legacyCycle.sleep'), 'sound_sleep'],
    [t('home.legacyCycle.soundSleep'), 'sound_sleep'],
    [t('home.legacyCycle.nap'), 'move'],
    [t('home.legacyCycle.outfit'), 'move'],
    [t('home.legacyCycle.pray'), 'pray'],
    [t('home.legacyCycle.idle'), 'idle'],
    [t('home.legacyCycle.move'), 'move'],
    [t('home.legacyCycle.explore'), 'explore'],
    [t('home.legacyCycle.return'), 'return'],
    [t('home.legacyCycle.reactivate'), 'reactivate'],
  ];
  return LEGACY_PARTY_CYCLE_STATE_MAP[value]
    ?? legacyJapaneseStateEntries.find(([label]) => label === value)?.[1]
    ?? 'idle';
}

export function getPartyCycleStateLabel(state: PartyCycleState): string {
  return t(PARTY_CYCLE_STATE_LABELS[state]);
}

export interface PartyCycleRuntime {
  state: PartyCycleState;
  stateStartedAt: number;
  durationMs: number;
  restInitialTotalSteps?: number;
  sortieSourceState?: 'rest' | 'free_action' | 'sleep' | 'return';
  sortieEmbezzlementGold?: number;
  isCurrentExpeditionGodsBattle?: boolean;
  wasLowHpAtRestStart?: boolean;
}

export interface PersistedRuntimeSnapshot {
  schemaVersion: 1;
  checkpointAt: number;
  autoRepeatEnabled: boolean;
  partyCycles: Record<number, PartyCycleRuntime>;
  pendingAfkMs: number;
  afkRecoveryTotalMs: number;
  afkRecoveryCompletedMs: number;
  afkSimulationAnchor: number | null;
  afkSummaryBaseline: AfkSummaryStats[] | null;
  shouldShowAfkSummary: boolean;
  afkChunkCursor: PersistedAfkChunkCursor | null;
  afkRemainingMsByParty?: Record<number, number>;
}


export function rollPercentInclusive(min: number, max: number): number {
  return min + gameplayRandom() * (max - min + Number.EPSILON);
}

export const PARTY_CYCLE_TICK_MS = 100;

export function getNextPartyCycleCheckpointDelay(
  cycles: Record<number, PartyCycleRuntime>,
  now: number,
  maximumDelayMs = 1_000,
): number {
  let nextDelay = Math.max(PARTY_CYCLE_TICK_MS, maximumDelayMs);
  let hasActiveCycle = false;
  Object.values(cycles).forEach((cycle) => {
    if (cycle.state === 'idle' || cycle.state === 'reactivate') return;
    hasActiveCycle = true;
    const elapsed = Math.max(0, now - cycle.stateStartedAt);
    const remaining = Math.max(PARTY_CYCLE_TICK_MS, cycle.durationMs - elapsed);
    nextDelay = Math.min(nextDelay, remaining);
  });
  if (!hasActiveCycle && Object.keys(cycles).length === 0) return PARTY_CYCLE_TICK_MS;
  return Math.max(PARTY_CYCLE_TICK_MS, Math.min(maximumDelayMs, Math.ceil(nextDelay)));
}
export { BASE_STEP_DURATION_MS };
export const EXPLORING_PROGRESS_STEP_MS = BASE_STEP_DURATION_MS;
export const EXPLORING_PROGRESS_TOTAL_STEPS = 24;
export const SOUND_SLEEP_STEP_COUNT = 16;
export const PRAY_STEP_COUNT = 4;
export const STEP_BASED_STATES: ReadonlySet<PartyCycleState> = new Set(['rest', 'sell', 'explore']);
export const APPROX_CYCLE_STEP_COUNT = 30;
export const CHUNK_CYCLE_COUNT = 30;
export const TIME_BASED_SIDE_QUEST_TYPES = new Set(['q.exercise', 'q.healing', 'q.AFK']);
export const AFK_RUNTIME_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-afk-runtime');
export const AFK_MAX_ELAPSED_MS = AFK_MAX_REAL_ELAPSED_MS;
export const REDUCER_CATCHUP_THRESHOLD_MS = BASE_STEP_DURATION_MS;

export function normalizeRuntimeSnapshot(raw: unknown, partyCount: number, now: number = Date.now()): PersistedRuntimeSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<PersistedRuntimeSnapshot>;
  // Existing local runtime records predate the explicit schema marker.
  if (typeof parsed.schemaVersion !== 'undefined' && parsed.schemaVersion !== 1) return null;

  const normalizedPartyCount = Math.max(0, Math.min(6, Math.floor(partyCount)));
  const partyCycles: Record<number, PartyCycleRuntime> = {};
  if (parsed.partyCycles && typeof parsed.partyCycles === 'object') {
    Object.entries(parsed.partyCycles).forEach(([key, value]) => {
      const partyIndex = Number(key);
      if (!Number.isInteger(partyIndex) || partyIndex < 0 || partyIndex >= normalizedPartyCount || !value || typeof value !== 'object') return;
      const runtime = value as Partial<PartyCycleRuntime> & { elapsedMs?: number };
      const rawStartedAt = Number.isFinite(runtime.stateStartedAt)
        ? Number(runtime.stateStartedAt)
        : now - Math.max(0, Number(runtime.elapsedMs) || 0);
      partyCycles[partyIndex] = {
        state: toPartyCycleState(runtime.state),
        stateStartedAt: Math.max(now - AFK_MAX_ELAPSED_MS, Math.min(now, rawStartedAt)),
        durationMs: Number.isFinite(runtime.durationMs)
          ? Math.max(1, Math.min(AFK_MAX_ELAPSED_MS, Math.floor(Number(runtime.durationMs))))
          : 1000,
        restInitialTotalSteps: Number.isFinite(runtime.restInitialTotalSteps)
          ? Math.max(1, Math.floor(Number(runtime.restInitialTotalSteps)))
          : undefined,
        sortieSourceState: runtime.sortieSourceState === 'rest'
          || runtime.sortieSourceState === 'free_action'
          || runtime.sortieSourceState === 'sleep'
          || runtime.sortieSourceState === 'return'
          ? runtime.sortieSourceState
          : undefined,
        sortieEmbezzlementGold: Number.isFinite(runtime.sortieEmbezzlementGold)
          ? Math.max(0, Math.floor(Number(runtime.sortieEmbezzlementGold)))
          : undefined,
        isCurrentExpeditionGodsBattle: runtime.isCurrentExpeditionGodsBattle === true,
        wasLowHpAtRestStart: runtime.wasLowHpAtRestStart === true,
      };
    });
  }

  const pendingAfkMs = Number.isFinite(parsed.pendingAfkMs)
    ? Math.max(0, Math.min(AFK_MAX_EFFECTIVE_ELAPSED_MS, Math.floor(Number(parsed.pendingAfkMs))))
    : 0;
  const recoveryTotal = Number.isFinite(parsed.afkRecoveryTotalMs)
    ? Math.max(pendingAfkMs, Math.min(AFK_MAX_EFFECTIVE_ELAPSED_MS, Math.floor(Number(parsed.afkRecoveryTotalMs))))
    : pendingAfkMs;
  const baseline = Array.isArray(parsed.afkSummaryBaseline)
    ? parsed.afkSummaryBaseline.map(normalizeAfkSummaryStats).filter((value): value is AfkSummaryStats => value !== null).slice(0, normalizedPartyCount)
    : null;

  return {
    schemaVersion: 1,
    checkpointAt: Number.isFinite(parsed.checkpointAt) ? Math.max(now - AFK_MAX_ELAPSED_MS, Math.min(now, Number(parsed.checkpointAt))) : now,
    autoRepeatEnabled: parsed.autoRepeatEnabled !== false,
    partyCycles,
    pendingAfkMs,
    afkRecoveryTotalMs: recoveryTotal,
    afkRecoveryCompletedMs: Number.isFinite(parsed.afkRecoveryCompletedMs)
      ? Math.max(0, Math.min(recoveryTotal, Math.floor(Number(parsed.afkRecoveryCompletedMs))))
      : Math.max(0, recoveryTotal - pendingAfkMs),
    afkSimulationAnchor: Number.isFinite(parsed.afkSimulationAnchor)
      ? Math.max(now - AFK_MAX_ELAPSED_MS, Math.min(now, Number(parsed.afkSimulationAnchor)))
      : null,
    afkSummaryBaseline: baseline && baseline.length > 0 ? baseline : null,
    shouldShowAfkSummary: parsed.shouldShowAfkSummary !== false,
    afkChunkCursor: normalizePersistedAfkChunkCursor(parsed.afkChunkCursor, normalizedPartyCount),
    afkRemainingMsByParty: parsed.afkRemainingMsByParty && typeof parsed.afkRemainingMsByParty === 'object'
      ? Object.fromEntries(Object.entries(parsed.afkRemainingMsByParty)
          .map(([key, value]) => [Number(key), Math.max(0, Math.min(AFK_MAX_EFFECTIVE_ELAPSED_MS, Math.floor(Number(value))))])
          .filter(([key, value]) => Number.isInteger(key) && key >= 0 && key < normalizedPartyCount && Number.isFinite(value)))
      : undefined,
  };
}


export function getElapsedWholeSeconds(carriedMs: number, elapsedMs: number): { gainedSeconds: number; remainderMs: number } {
  const totalMs = Math.max(0, carriedMs + elapsedMs);
  return {
    gainedSeconds: Math.floor(totalMs / 1000),
    remainderMs: totalMs % 1000,
  };
}

// SpecRef: 5.1.1 | Party State Machine | state.sell
export function getAutoSellStepCount(party: Party): number {
  const autoSellItemCount = party.lastExpeditionLog?.autoSellItems?.length
    || party.lastExpeditionLog?.autoSellCount
    || 1;
  return Math.max(1, autoSellItemCount);
}

// SpecRef: 8.1 | UI_FOUNDATIONS | Navigation: Minimal scene transitions, tab-centered
export const CHROME_CONTENT_PADDING_CLASS = 'pt-[calc(74px+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))]';
export type { DarkModeSetting, GameMode } from '../../theme/theme';
import type { DarkModeSetting, GameMode } from '../../theme/theme';
import { isGameMode } from '../../theme/theme';
export const GAME_MODE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-game-mode');
export const AUTO_EQUIPMENT_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-auto-equipment');
export const EXPEDITION_STATS_DISPLAY_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-expedition-stats-display');
export const DARK_MODE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-dark-mode');
export const THEME_SYNC_EVENT = 'kemo-expedition-theme-sync';
export const APP_VERSION = `v${__APP_VERSION__}`;


export function getExpeditionTierDurationFactor(expTier: number): number {
  return Math.max(0, expTier);
}

export function normalizeBattleLogNote(note?: string): string | undefined {
  if (!note) return note;
  return note.replace(t('home.battleLog.legacyPartyAttackPower'), t('home.battleLog.partyPhysicalAttackPower'));
}

// SpecRef: 6.1.1.1 | START phase | floor.terrain.*
export function getBattleLogPhaseLabel(log: BattleLogEntry, isPhaseAction: boolean, isTriggeredLog: boolean, isResurrectLog: boolean, isStealthEffectLog: boolean, isCounterNegationEffectLog: boolean): string {
  const isTerrainStartLog = log.phase === 'start' && log.effectKind === 'terrain';
  if (isTerrainStartLog) return t('battleLog.phase.terrainShort');
  if (log.phase === 'start') return t('battleLog.phase.effectShort');
  if (log.phase === 'end') return t('battleLog.phase.endShort');
  if (log.effectKind === 'terrain') return '-';
  if (isPhaseAction) {
    if (log.isAggregated) return '-';
    if (isTriggeredLog && log.hideInitiativeLabel) return '-';
    if (isTriggeredLog) return `${log.initiativeRoll ?? '?'}`;
    if (log.isCounter || isResurrectLog || log.isEnemyTargetHit || log.hideInitiativeLabel) return '-';
    return `${log.initiativeRoll ?? '?'}`;
  }
  if (isStealthEffectLog || isCounterNegationEffectLog) return '-';
  return log.actor === 'deity' ? t('battleLog.phase.endShort') : '-';
}

export function getBattleLogNoteClass(noteTone?: 'default' | 'sub' | 'muted'): string {
  if (noteTone === 'sub') return 'text-sub';
  return 'text-gray-400';
}

export function renderBattleLogNote(note: string | undefined, noteTone?: 'default' | 'sub' | 'muted'): JSX.Element | null {
  const normalizedNote = normalizeBattleLogNote(note);
  if (!normalizedNote) return null;

  const noteClass = getBattleLogNoteClass(noteTone);
  const iconClass = noteTone === 'sub' ? 'sub-theme-emoji-icon' : 'text-gray-500';

  return (
    <span className={noteClass}>
      {' '}
      {renderTextWithUiIcons(
        normalizedNote,
        (icon) => (icon === 'thunder' ? 'sub-theme-emoji-icon' : iconClass),
      )}
    </span>
  );
}

export const RACE_ICON_SOURCES = RACES
  .map((race) => race.icon)
  .filter((icon): icon is string => Boolean(icon))
  .map((icon) => (
    icon.startsWith('/')
      ? `${import.meta.env.BASE_URL}${icon.replace(/^\//, '')}`
      : icon
  ));

export function preloadRaceIcons(): void {
  RACE_ICON_SOURCES.forEach((iconSrc) => {
    const image = new Image();
    const release = () => {
      image.onload = null;
      image.onerror = null;
    };
    image.onload = release;
    image.onerror = release;
    image.src = iconSrc;
  });
}

export function getExplorationDurationMs(entryCount?: number, durationMultiplier: number = 1, durationScale: number = 1): number {
  const exploredSteps = Math.max(1, Math.min(EXPLORING_PROGRESS_TOTAL_STEPS, entryCount ?? EXPLORING_PROGRESS_TOTAL_STEPS));
  return Math.max(100, Math.ceil(exploredSteps * EXPLORING_PROGRESS_STEP_MS * durationMultiplier * durationScale));
}

export function getExplorationVisibleRoomCount(elapsedMs: number, durationMs: number, totalEntries: number): number {
  if (totalEntries <= 0) return 0;
  return Math.min(
    totalEntries,
    Math.max(0, Math.ceil((elapsedMs / Math.max(1, durationMs)) * totalEntries)),
  );
}

export function getExpeditionOutcomeLabel(outcome: 'Clear' | 'Escape' | 'Defeat' | 'Retreat' | string): string {
  if (outcome === 'Clear' || outcome === 'victory') return t('expedition.outcome.clear');
  if (outcome === 'Escape' || outcome === 'escape' || outcome === 'return') return t('expedition.outcome.return');
  if (outcome === 'Defeat' || outcome === 'defeat') return t('expedition.outcome.defeat');
  return t('expedition.outcome.retreat');
}

export function getReturnedExpeditionOutcome(log: ExpeditionLog | null | undefined): 'Defeat' | 'Wounded_Retreat' | 'Draw_Retreat' | 'Turned_Back' | 'Clear' | undefined {
  if (!log) return undefined;
  if (log.finalOutcome === 'Defeat') return 'Defeat';
  if (log.finalOutcome === 'Escape') return 'Turned_Back';
  if (log.entries.length > 0 && log.entries[log.entries.length - 1].outcome === 'draw') return 'Draw_Retreat';
  if (log.finalOutcome === 'Retreat') return 'Wounded_Retreat';
  return 'Clear';
}

export function getExperimentalDiaryTitle(party: Party, diaryLog: DiaryLog): string {
  const { triggers } = diaryLog;
  if (triggers.includes('unlock')) {
    return diaryLog.unlockHeadline
      ? t('diary.headline.unlockNamed', { party: party.name, headline: diaryLog.unlockHeadline })
      : t('diary.headline.unlock', { party: party.name });
  }
  if (triggers.includes('sideQuest')) {
    return diaryLog.sideQuestLabel
      ? t('diary.headline.sideQuestNamed', { party: party.name, quest: diaryLog.sideQuestLabel })
      : t('diary.headline.sideQuest', { party: party.name });
  }
  if (triggers.length === 1 && triggers[0] === 'defeat') return t('diary.headline.defeat', { party: party.name });
  if (triggers.length === 1 && triggers[0] === 'draw') return t('diary.headline.draw', { party: party.name });
  const titleKey = triggers.includes('godsBattle') ? 'diary.title.godsBattle'
    : triggers.includes('superRare') ? 'diary.title.superRare'
      : triggers.includes('mythicRare') ? 'diary.title.mythicRare'
        : triggers.includes('bossRare') ? 'diary.title.bossRare'
          : triggers.includes('eliteRare') ? 'diary.title.eliteRare'
            : 'diary.title.special';
  return t('diary.headline.title', { party: party.name, title: t(titleKey) });
}

export function getEffectiveAccuracyBonus(accuracyBonus: number, abilities: ComputedCharacterStats['abilities']): number {
  const focusLevel = abilities.find(a => a.id === 'focus')?.level ?? 0;
  if (focusLevel <= 0) return accuracyBonus;
  const focusMultiplier = focusLevel >= 2 ? 1.3 : 1.2;
  return Math.ceil((accuracyBonus * focusMultiplier + Number.EPSILON) * 1000) / 1000;
}

export function renderEnemyNameWithMutedClass(enemyName: string) {
  const classSuffixMatch = enemyName.match(/^(.*?)(\([^()]+\))(.*)$/);
  if (!classSuffixMatch) return renderTextWithRaceIcons(enemyName, 'h-4 w-4');

  const [, baseName, classSuffix, trailingText] = classSuffixMatch;
  return (
    <>
      {renderTextWithRaceIcons(baseName, 'h-4 w-4')}
      <span className="text-gray-500">{renderTextWithRaceIcons(classSuffix, 'h-4 w-4')}</span>
      {renderTextWithRaceIcons(trailingText, 'h-4 w-4')}
    </>
  );
}

export function getBestiaryEnemyFromLogEntry(entry: ExpeditionLogEntry): EnemyDef | null {
  if (entry.enemySnapshot) return entry.enemySnapshot;
  if (typeof entry.enemyId === 'number') {
    return ENEMIES.find((enemy) => enemy.id === entry.enemyId) ?? null;
  }

  const normalizedEnemyName = entry.enemyName.replace(new RegExp(`\\s+\\((ELITE|BOSS|${escapeRegExp(t('home.godsBattle.label'))})\\)\\s*$`, 'u'), '').trim();
  if (!normalizedEnemyName) return null;
  return ENEMIES.find((enemy) => formatEnemyDefName(enemy) === normalizedEnemyName) ?? null;
}

export function getEnemyLogBackgroundImagePath(enemy?: EnemyDef): string | null {
  // SpecRef: 6.1.7 | Logs | Enemy image
  if (typeof enemy?.id !== 'number') return null;
  return resolvePublicAssetPath(`/enemy/E_${enemy.id}.png`);
}

export function getEnemyLogChibiImagePath(entry: ExpeditionLogEntry): string | null {
  // SpecRef: 6.1.7 | Logs | Background image
  const enemyId = entry.enemySnapshot?.id ?? entry.enemyId;
  if (typeof enemyId !== 'number') return null;
  return resolvePublicAssetPath(`/chibi/C_E_${enemyId}.png`);
}

export function renderEnemyLogChibiBackground(entry: ExpeditionLogEntry): JSX.Element | null {
  const imagePath = getEnemyLogChibiImagePath(entry);
  if (!imagePath) return null;

  return (
    <img
      src={imagePath}
      onError={(event) => { event.currentTarget.style.display = 'none'; }}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-[16.666667%] h-full w-auto max-w-[42%] select-none object-contain object-right opacity-30"
    />
  );
}

export function renderCollapsedBestiaryEnemyImage(enemyId: number): JSX.Element {
  // SpecRef: 8.6 | UI_SETTING | Enemy Image (Collapsed State)
  return (
    <img
      src={resolvePublicAssetPath(`/chibi/C_E_${enemyId}.png`) ?? undefined}
      onError={(event) => { event.currentTarget.style.display = 'none'; }}
      alt=""
      aria-hidden="true"
      className="h-8 w-8 select-none object-contain"
    />
  );
}

export function getEnemyClassSummary(enemy: EnemyDef): string {
  const mainClass = getClassShortName(enemy.enemyClass);
  if (!enemy.enemySubClass || enemy.enemySubClass === 'none') return mainClass;
  if (enemy.enemySubClass === enemy.enemyClass) return `${mainClass}M`;
  const subClass = getClassShortName(enemy.enemySubClass);
  return `${mainClass}/${subClass}`;
}


export function FloatingBubblePortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  const portalThemeClasses = [
    document.documentElement.classList.contains('theme-luna') || document.body.classList.contains('theme-luna') ? 'theme-luna' : '',
    document.documentElement.classList.contains('theme-laika') || document.body.classList.contains('theme-laika') ? 'theme-laika' : '',
    document.documentElement.classList.contains('theme-orca') || document.body.classList.contains('theme-orca') ? 'theme-orca' : '',
    document.documentElement.classList.contains('app-dark') || document.body.classList.contains('app-dark') ? 'theme-dark' : '',
  ].filter(Boolean).join(' ');

  return createPortal(
    <div className={portalThemeClasses}>
      {children}
    </div>,
    document.body,
  );
}

export function EnemyBestiaryBubble({
  bubble,
}: {
  bubble: {
    enemy: EnemyDef;
    enemyLevel: number | null;
    top: number;
    left: number;
    width: number;
  };
}) {
  // SpecRef: 8.6 | UI_SETTING | Bestiary (敵キャラクター図鑑)
  const enemy = bubble.enemy;
  const hasRangedAttack = enemy.rangedAttack > 0 && enemy.rangedNoA > 0;
  const hasMeleeAttack = enemy.meleeAttack > 0 && enemy.meleeNoA > 0;
  const hasMagicalAttack = enemy.magicalAttack > 0 && enemy.magicalNoA > 0;
  const hasPhysicalAttack = hasRangedAttack || hasMeleeAttack;
  const hasMagicCasting = hasMagicalAttack
    || (enemy.bonuses ?? []).some((bonus) => bonus.type === 'caster' || bonus.type === 'equip_magic');
  const decay = `${formatDecimal((0.90 + enemy.accuracyBonus) * 100, 1)}%`;
  const classText = getEnemyClassSummary(enemy).replace('/', ' / ');
  const enemyTypeText = getEnemyTypeShortName(enemy.enemyType);
  const elementalOffenseIcon: UiIconKey | null = enemy.elementalOffense === 'fire'
    ? 'fire'
    : enemy.elementalOffense === 'ice'
      ? 'ice'
      : enemy.elementalOffense === 'thunder'
        ? 'thunder'
        : null;
  const dropText = getEnemyDropCandidates(enemy).map((item) => `${getRarityShortLabel(item.id, item.name)}${getLocalizedItemName(item)}`).join(' / ') || t('common.none');
  const abilityText = enemy.abilities.map((ability) => `${ABILITY_NAMES[ability.id] ?? ability.id}${formatNumber(ability.level)}`).join(', ') || t('common.none');

  return (
    <FloatingBubblePortal>
      <div
        className="floating-bubble-pane fixed z-20 rounded-lg p-3"
        style={{
        top: bubble.top,
        left: bubble.left,
        width: bubble.width,
        }}
      >
        <div className="text-xs space-y-1 text-gray-700">
        <div className="text-sm font-semibold text-gray-800">
          {renderEnemyNameWithMutedClass(formatEnemyDefName(enemy))}
        </div>
        <div>ID: {formatNumber(enemy.id)}</div>
        {bubble.enemyLevel !== null && <div>{t('party.status.level')}: {formatNumber(bubble.enemyLevel)}</div>}
        <div>HP: {formatNumber(enemy.hp)}</div>
        <div>{t('home.enemy.class')}: {classText}</div>
        <div>{t('home.enemy.type')}: {enemyTypeText}</div>
        {hasRangedAttack && <div>{t('home.enemy.attackLine', { label: t('combat.rangedAttack'), attack: formatNumber(enemy.rangedAttack), count: formatNumber(enemy.rangedNoA), amplifier: formatDecimal(enemy.rangedAttackAmplifier, 2) })}</div>}
        {hasMeleeAttack && <div>{t('home.enemy.attackLine', { label: t('combat.meleeAttack'), attack: formatNumber(enemy.meleeAttack), count: formatNumber(enemy.meleeNoA), amplifier: formatDecimal(enemy.meleeAttackAmplifier, 2) })}</div>}
        {hasPhysicalAttack && <div>{t('home.enemy.accuracyLine', { label: t('combat.physicalAccuracy'), decay })}</div>}
        {hasMagicalAttack && <div>{t('home.enemy.attackLine', { label: t('combat.magicalAttack'), attack: formatNumber(enemy.magicalAttack), count: formatNumber(enemy.magicalNoA), amplifier: formatDecimal(enemy.magicalAttackAmplifier, 2) })}</div>}
        {hasMagicCasting && <div>{t('home.enemy.castingSpell')}: {getEnemyBestiarySpellName(enemy)}</div>}
        <div>{t('combat.element')}: {elementalOffenseIcon ? renderUiIcon(elementalOffenseIcon) : t('home.enemy.noElement')} (x{formatDecimal(enemy.elementalOffenseValue, 2)})</div>
        <div>{t('combat.physicalDefense')}: {formatNumber(enemy.physicalDefense)} ({formatDecimal(enemy.physicalDefenseAmplifier * 100, 0)}%)</div>
        <div>{t('combat.magicalDefense')}: {formatNumber(enemy.magicalDefense)} ({formatDecimal(enemy.magicalDefenseAmplifier * 100, 0)}%)</div>
        {hasMagicalAttack && <div>{t('home.enemy.accuracyLine', { label: t('home.enemy.magicalAccuracy'), decay })}</div>}
        <div>{t('combat.evasion')}: {formatNumber(Math.round(enemy.evasionBonus * 1000))}</div>
        <div>{renderElementalResistanceInline(enemy.elementalResistance)}</div>
        {(() => {
          const bonusText = getEnemyTypeCBonusText(enemy);
          return bonusText ? <div>{t('party.status.bonus')}: {bonusText}</div> : null;
        })()}
        <div>{t('party.status.abilities')}: {abilityText}</div>
        <div className="text-gray-600">{t('home.enemy.dropCandidates')}: {dropText}</div>
        </div>
      </div>
    </FloatingBubblePortal>
  );
}



export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getCharacterBattleLogChibiSrc(party: Party, character: Character): string | null {
  if (character.raceId === 'mimorian' && character.mimorianEnemyId != null) {
    return `${import.meta.env.BASE_URL}chibi/C_E_${character.mimorianEnemyId}.png`;
  }
  if (character.isUnique) {
    const uniqueFileName = UNIQUE_PARTY_MEMBER_IMAGE_BY_LINEAGE[character.lineageId];
    return uniqueFileName ? `${import.meta.env.BASE_URL}chibi/C_${uniqueFileName}` : null;
  }

  const race = RACES.find((candidate) => candidate.id === character.raceId);
  if (!race) return null;
  const gender = character.gender === 'female' ? 'Female' : 'Male';
  return `${import.meta.env.BASE_URL}chibi/C_${party.id}_${race.englishName}_${gender}.png`;
}

export function getEnemyBattleLogChibiSrc(entry: ExpeditionLogEntry): string | null {
  const enemyId = entry.enemyId ?? entry.enemySnapshot?.id;
  return typeof enemyId === 'number' ? `${import.meta.env.BASE_URL}chibi/C_E_${enemyId}.png` : null;
}

export function getBattleLogEnemyNameCandidates(entry: ExpeditionLogEntry): string[] {
  const names = [
    entry.enemyName,
    entry.enemySnapshot ? formatEnemyDefName(entry.enemySnapshot) : '',
  ];

  return Array.from(new Set(names.flatMap((name) => {
    const normalizedName = name.replace(new RegExp(escapeRegExp(t('home.godsBattle.parenthetical')), 'g'), '').trim();
    if (!normalizedName) return [];

    const withoutTrailingMetadata = normalizedName.replace(/(?:\s*\([^()]+\))+\s*$/u, '').trim();
    return [normalizedName, withoutTrailingMetadata].filter(Boolean);
  })));
}

// SpecRef: 6.1.7 | Logs | Chibi images for each character name
export function battleLogActionIncludesEnemyName(action: string, entry: ExpeditionLogEntry): boolean {
  return getBattleLogEnemyNameCandidates(entry).some((enemyName) => action.includes(enemyName));
}

export function BattleLogInlineChibi({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="relative mx-0.5 inline-block h-[1em] w-[1.35em] align-[-0.125em]">
      <img
        src={src}
        alt={alt}
        className="absolute left-0 top-1/2 h-[1.35em] w-auto max-w-none -translate-y-1/2"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    </span>
  );
}

// SpecRef: 6.1.7 | Logs | Chibi images for each character name
export function renderBattleLogTextWithInlineChibis(action: string, party: Party, entry: ExpeditionLogEntry): ReactNode {
  const markers: Array<{ label: string; src: string; alt: string; priority: number }> = [];
  const enemySrc = getEnemyBattleLogChibiSrc(entry);
  if (enemySrc) {
    getBattleLogEnemyNameCandidates(entry).forEach((enemyName) => {
      markers.push({ label: enemyName, src: enemySrc, alt: `${enemyName} chibi`, priority: 0 });
    });
    if (new RegExp(`^${escapeRegExp(t('home.battleLog.enemyPrefix'))}`).test(action)) markers.push({ label: t('home.battleLog.enemyPrefix'), src: enemySrc, alt: `${entry.enemyName} chibi`, priority: 2 });
  }

  party.characters.forEach((character: Character) => {
    const src = getCharacterBattleLogChibiSrc(party, character);
    if (src && character.name.trim()) {
      markers.push({ label: character.name, src, alt: `${character.name} chibi`, priority: 1 });
    }
  });

  const uniqueMarkers = markers
    .filter((marker, index, list) => list.findIndex((candidate) => candidate.label === marker.label && candidate.src === marker.src) === index)
    .sort((a, b) => b.label.length - a.label.length || a.priority - b.priority);
  if (uniqueMarkers.length === 0) return renderActionWithMutedTrailingParenthetical(action);

  const pattern = new RegExp(`(${uniqueMarkers.map((marker) => escapeRegExp(marker.label)).join('|')})`, 'g');
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(action)) !== null) {
    const label = match[0];
    if (!isStandaloneBattleLogName(action, match.index, label)) continue;
    if (match.index > lastIndex) nodes.push(action.slice(lastIndex, match.index));
    const marker = uniqueMarkers.find((candidate) => candidate.label === label);
    if (marker) nodes.push(<BattleLogInlineChibi key={`chibi-${match.index}-${label}`} src={marker.src} alt={marker.alt} />);
    nodes.push(label);
    lastIndex = match.index + label.length;
  }
  if (lastIndex < action.length) nodes.push(action.slice(lastIndex));

  return <>{nodes}</>;
}

export function renderActionWithMutedTrailingParenthetical(action: string) {
  if (!action.endsWith(')')) return action;

  let depth = 0;
  let openingIndex = -1;
  for (let i = action.length - 1; i >= 0; i -= 1) {
    const char = action[i];
    if (char === ')') {
      depth += 1;
      continue;
    }
    if (char === '(') {
      depth -= 1;
      if (depth === 0) {
        openingIndex = i;
        break;
      }
    }
  }

  if (openingIndex <= 0 || action[openingIndex - 1] !== ' ') return action;

  const prefix = action.slice(0, openingIndex - 1);
  const suffix = action.slice(openingIndex);
  return (
    <>
      {prefix}{' '}
      <span className="text-gray-400">{suffix}</span>
    </>
  );
}

export function aggregateBattleLifeDrainLogs(logs: readonly ExpeditionLogEntry['details'][number][]) {
  type LifeDrainGroup = {
    lastIndex: number;
    indexes: number[];
    targetNames: string[];
    totalHealAmount: number;
    templateLog: ExpeditionLogEntry['details'][number];
    count: number;
  };

  const normalizeLifeDrainNote = (note: string | undefined) => note?.replace(/✚[\d,]+(?=\))/gu, '✚#TOTAL#') ?? '';
  const groups = new Map<string, LifeDrainGroup>();

  logs.forEach((log, index) => {
    if (
      log.actor !== 'triggered'
      || log.attackType !== 'melee'
      || log.effectKind !== 'life_drain'
      || !log.effectSourceName
      || !log.effectTargetName
    ) {
      return;
    }

    const key = [
      log.phase,
      log.initiativeRoll ?? '',
      log.effectKind,
      log.effectSourceName,
      normalizeLifeDrainNote(log.note),
      log.noteTone ?? '',
    ].join('::');
    const existingGroup = groups.get(key);
    if (existingGroup) {
      existingGroup.lastIndex = index;
      existingGroup.indexes.push(index);
      existingGroup.targetNames.push(log.effectTargetName);
      existingGroup.totalHealAmount += Math.max(0, log.effectHealAmount ?? 0);
      existingGroup.count += 1;
      return;
    }

    groups.set(key, {
      lastIndex: index,
      indexes: [index],
      targetNames: [log.effectTargetName],
      totalHealAmount: Math.max(0, log.effectHealAmount ?? 0),
      templateLog: log,
      count: 1,
    });
  });

  if (![...groups.values()].some((group) => group.count > 1)) return [...logs];

  const groupByLastIndex = new Map<number, LifeDrainGroup>();
  const skippedIndexes = new Set<number>();

  groups.forEach((group) => {
    if (group.count <= 1) return;
    for (const index of group.indexes) {
      skippedIndexes.add(index);
    }
    skippedIndexes.delete(group.lastIndex);
    groupByLastIndex.set(group.lastIndex, group);
  });

  return logs.flatMap((log, index) => {
    const group = groupByLastIndex.get(index);
    if (group) {
      const summarizedNote = group.templateLog.note?.replace(/✚[\d,]+(?=\))/gu, `✚${formatNumber(group.totalHealAmount)}`);
      const summarizedTargets = [...new Set(group.targetNames)];
      const isNullifiedLifeDrain = group.templateLog.note?.includes(t('home.battleLog.lifeDrainNullified')) ?? false;
      const effectSourceName = group.templateLog.effectSourceName ?? '';
      return [{
        ...group.templateLog,
        isAggregated: true,
        action: buildAggregatedLifeDrainAction(
          effectSourceName,
          summarizedTargets.join('、'),
          isNullifiedLifeDrain,
        ),
        note: summarizedNote,
      }];
    }

    if (skippedIndexes.has(index)) return [];
    return [log];
  });
}



export function RaceIcon({ race, className = "h-8 w-8" }: { race: Race; className?: string }) {
  const [hasIconLoadError, setHasIconLoadError] = useState(false);

  useEffect(() => {
    setHasIconLoadError(false);
  }, [race.icon]);

  const iconSrc = race.icon?.startsWith('/')
    ? `${import.meta.env.BASE_URL}${race.icon.replace(/^\//, '')}`
    : race.icon;

  if (iconSrc && !hasIconLoadError) {
    return (
      <img
        src={iconSrc}
        alt={`${race.englishName} icon`}
        className={`${className} race-icon object-contain`}
        onError={() => setHasIconLoadError(true)}
      />
    );
  }

  return <span className={className}>{race.emoji}</span>;
}

export const RACE_ICON_BY_EMOJI: Record<string, string | undefined> = Object.fromEntries(
  RACES.map((race) => [race.emoji, race.icon])
);
export const RACE_ICON_BY_TOKEN: Record<string, string | undefined> = Object.fromEntries(
  RACES.map((race) => [`icon.${race.englishName}`, race.icon])
);

export function renderTextWithRaceIcons(text: string, iconClassName = 'h-3.5 w-3.5'): ReactNode {
  if (!text) return text;

  const iconPattern = [...new Set([...Object.keys(RACE_ICON_BY_EMOJI), ...Object.keys(RACE_ICON_BY_TOKEN)])]
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  if (!iconPattern) return text;

  const regex = new RegExp(`(${iconPattern})`, 'g');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    const iconPath = RACE_ICON_BY_EMOJI[part] ?? RACE_ICON_BY_TOKEN[part];
    if (!iconPath) {
      return part;
    }

    const iconSrc = iconPath.startsWith('/')
      ? `${import.meta.env.BASE_URL}${iconPath.replace(/^\//, '')}`
      : iconPath;

    return (
      <img
        key={`icon-${index}`}
        src={iconSrc}
        alt="race icon"
        className={`${iconClassName} race-icon inline-block align-text-bottom object-contain`}
      />
    );
  });
}

export type AfkSummaryStats = {
  Clear: number;
  Turned_Back: number;
  Draw_Retreat: number;
  Wounded_Retreat: number;
  Defeat: number;
  donatedGold: number;
  savedGold: number;
};

export function isAfkSummaryStats(value: unknown): value is AfkSummaryStats {
  if (!value || typeof value !== 'object') return false;
  const stats = value as Partial<Record<keyof AfkSummaryStats, unknown>>;
  return (
    typeof stats.Clear === 'number'
    && typeof stats.Turned_Back === 'number'
    && typeof stats.Draw_Retreat === 'number'
    && typeof stats.Wounded_Retreat === 'number'
    && typeof stats.Defeat === 'number'
    && typeof stats.donatedGold === 'number'
    && typeof stats.savedGold === 'number'
  );
}

export function normalizeAfkSummaryStats(value: unknown): AfkSummaryStats | null {
  if (!isAfkSummaryStats(value)) return null;
  return {
    Clear: Math.max(0, Math.floor(value.Clear)),
    Turned_Back: Math.max(0, Math.floor(value.Turned_Back)),
    Draw_Retreat: Math.max(0, Math.floor(value.Draw_Retreat)),
    Wounded_Retreat: Math.max(0, Math.floor(value.Wounded_Retreat)),
    Defeat: Math.max(0, Math.floor(value.Defeat)),
    donatedGold: Math.max(0, Math.floor(value.donatedGold)),
    savedGold: Math.max(0, Math.floor(value.savedGold)),
  };
}

// SpecRef: 5.1.1 | Party State Machine | Notification
export function buildAfkSummaryNotification(stats: AfkSummaryStats): string | null {
  const summaryParts: string[] = [];
  if (stats.Clear > 0) summaryParts.push(t('home.afk.clearCount', { count: formatNumber(stats.Clear) }));
  if (stats.Turned_Back > 0) summaryParts.push(t('home.afk.returnCount', { count: formatNumber(stats.Turned_Back) }));
  if (stats.Draw_Retreat > 0) summaryParts.push(t('home.afk.drawCount', { count: formatNumber(stats.Draw_Retreat) }));
  if (stats.Wounded_Retreat > 0) summaryParts.push(t('home.afk.retreatCount', { count: formatNumber(stats.Wounded_Retreat) }));
  if (stats.Defeat > 0) summaryParts.push(t('home.afk.defeatCount', { count: formatNumber(stats.Defeat) }));

  const financeParts: string[] = [];
  if (stats.donatedGold > 0) financeParts.push(t('home.afk.donatedGold', { gold: formatNumber(stats.donatedGold) }));
  if (stats.savedGold > 0) financeParts.push(t('home.afk.savedGold', { gold: formatNumber(stats.savedGold) }));

  if (summaryParts.length === 0 && financeParts.length === 0) return null;
  return [summaryParts.join('/'), financeParts.join(', ')].filter(Boolean).join(' ');
}

export type ItemRarity = 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare';
export type RarityFilter = 'all' | ItemRarity;

export const RARITY_SHORT_CODES: Record<ItemRarity, string> = {
  common: 'C',
  uncommon: 'U',
  eliteRare: 'E',
  bossRare: 'B',
  mythicRare: 'M',
};

export const RARITY_FILTER_LABELS: Record<RarityFilter, string> = {
  all: 'ALL',
  common: 'C',
  uncommon: 'U',
  eliteRare: 'E',
  bossRare: 'B',
  mythicRare: 'M',
};

export const getRarityFilterNote = (filter: RarityFilter): string => t(`party.rarity.${filter}`);

export const RARITY_FILTER_OPTIONS: RarityFilter[] = ['all', 'common', 'uncommon', 'eliteRare', 'bossRare', 'mythicRare'];

export const DIARY_THRESHOLD_OPTIONS: Array<{ value: DiaryRarityThreshold; labelKey: string }> = [
  { value: 'all', labelKey: 'party.rarity.all' },
  { value: 1, labelKey: 'home.diaryThreshold.masterworkPlus' },
  { value: 2, labelKey: 'home.diaryThreshold.demonicPlus' },
  { value: 3, labelKey: 'home.diaryThreshold.hauntedPlus' },
  { value: 4, labelKey: 'home.diaryThreshold.legendaryPlus' },
  { value: 5, labelKey: 'home.diaryThreshold.terrifyingPlus' },
  { value: 6, labelKey: 'home.diaryThreshold.ultimate' },
  { value: 'none', labelKey: 'common.none' },
];

export const DIARY_SIDE_QUEST_THRESHOLD_OPTIONS: Array<{ value: DiarySideQuestThreshold; labelKey: string }> = [
  { value: 'all', labelKey: 'party.rarity.all' },
  { value: 2, labelKey: 'home.sideQuestThreshold.rank2Plus' },
  { value: 3, labelKey: 'home.sideQuestThreshold.rank3Plus' },
  { value: 4, labelKey: 'home.sideQuestThreshold.rank4Plus' },
  { value: 5, labelKey: 'home.sideQuestThreshold.rank5Plus' },
  { value: 6, labelKey: 'home.sideQuestThreshold.rank6Plus' },
  { value: 7, labelKey: 'home.sideQuestThreshold.rank7Plus' },
  { value: 8, labelKey: 'home.sideQuestThreshold.rank8Only' },
  { value: 'none', labelKey: 'common.none' },
];


export const DIARY_DEFEAT_NOTIFICATION_OPTIONS: Array<{ value: DiaryDefeatNotificationMode; labelKey: string }> = [
  { value: 'defeatOnly', labelKey: 'home.defeatNotification.defeatOnly' },
  { value: 'defeatAndDraw', labelKey: 'home.defeatNotification.defeatAndDraw' },
  { value: 'defeatDrawRetreat', labelKey: 'home.defeatNotification.defeatDrawRetreat' },
  { value: 'all', labelKey: 'home.defeatNotification.all' },
  { value: 'none', labelKey: 'common.none' },
];

export function getExpeditionDepthOptions(dungeonId: number): Array<{ value: ExpeditionDepthLimit; label: string }> {
  // SpecRef: 8.3 | UI_EXPEDITION | Expedition Depth Limit (探索深度)
  const beforeBossConcept = getLocalizedExpeditionFloorConcept(dungeonId, 6) ?? t('home.floorConcept.fallback', { floor: 6 });
  const floorConceptByFloor: Record<number, string> = {
    1: getLocalizedExpeditionFloorConcept(dungeonId, 1) ?? t('home.floorConcept.fallback', { floor: 1 }),
    2: getLocalizedExpeditionFloorConcept(dungeonId, 2) ?? t('home.floorConcept.fallback', { floor: 2 }),
    3: getLocalizedExpeditionFloorConcept(dungeonId, 3) ?? t('home.floorConcept.fallback', { floor: 3 }),
    4: getLocalizedExpeditionFloorConcept(dungeonId, 4) ?? t('home.floorConcept.fallback', { floor: 4 }),
    5: getLocalizedExpeditionFloorConcept(dungeonId, 5) ?? t('home.floorConcept.fallback', { floor: 5 }),
  };

  return [
    { value: '1f-3', label: t('home.depth.untilFloor', { marker: '1F-3', concept: floorConceptByFloor[1] }) },
    { value: '1f-4', label: t('home.depth.untilFloor', { marker: '1F-4', concept: floorConceptByFloor[1] }) },
    { value: '2f-3', label: t('home.depth.untilFloor', { marker: '2F-3', concept: floorConceptByFloor[2] }) },
    { value: '2f-4', label: t('home.depth.untilFloor', { marker: '2F-4', concept: floorConceptByFloor[2] }) },
    { value: '3f-3', label: t('home.depth.untilFloor', { marker: '3F-3', concept: floorConceptByFloor[3] }) },
    { value: '3f-4', label: t('home.depth.untilFloor', { marker: '3F-4', concept: floorConceptByFloor[3] }) },
    { value: '4f-3', label: t('home.depth.untilFloor', { marker: '4F-3', concept: floorConceptByFloor[4] }) },
    { value: '4f-4', label: t('home.depth.untilFloor', { marker: '4F-4', concept: floorConceptByFloor[4] }) },
    { value: '5f-3', label: t('home.depth.untilFloor', { marker: '5F-3', concept: floorConceptByFloor[5] }) },
    { value: '5f-4', label: t('home.depth.untilFloor', { marker: '5F-4', concept: floorConceptByFloor[5] }) },
    { value: 'beforeBoss', label: t('home.depth.beforeBoss', { concept: beforeBossConcept }) },
    { value: 'all', label: t('party.rarity.all') },
  ];
}

export type GenderedNamePool = { male: string[]; female: string[] };
export function getPotentialDefaultNamesByPt(): Record<number, Partial<Record<RaceId, GenderedNamePool>>> {
  // Build the pools on demand so their i18n values follow the currently active language.
  const pools: Record<number, Partial<Record<RaceId, GenderedNamePool | string[]>>> = {
  1: {
    caninian: t('home.defaultNames.pt1.caninian').split('|').map((name) => name.trim()).filter(Boolean),
    lupinian: t('home.defaultNames.pt1.lupinian').split('|').map((name) => name.trim()).filter(Boolean),
    vulpinian: t('home.defaultNames.pt1.vulpinian').split('|').map((name) => name.trim()).filter(Boolean),
    ursan: t('home.defaultNames.pt1.ursan').split('|').map((name) => name.trim()).filter(Boolean),
    felidian: t('home.defaultNames.pt1.felidian').split('|').map((name) => name.trim()).filter(Boolean),
    leporian: t('home.defaultNames.pt1.leporian').split('|').map((name) => name.trim()).filter(Boolean),
    cervin: t('home.defaultNames.pt1.cervin').split('|').map((name) => name.trim()).filter(Boolean),
    murid: t('home.defaultNames.pt1.murid').split('|').map((name) => name.trim()).filter(Boolean),
  },
  2: {
    lupinian: t('home.defaultNames.pt2.lupinian').split('|').map((name) => name.trim()).filter(Boolean),
    vulpinian: t('home.defaultNames.pt2.vulpinian').split('|').map((name) => name.trim()).filter(Boolean),
    felidian: t('home.defaultNames.pt2.felidian').split('|').map((name) => name.trim()).filter(Boolean),
    caninian: t('home.defaultNames.pt2.caninian').split('|').map((name) => name.trim()).filter(Boolean),
    ursan: t('home.defaultNames.pt2.ursan').split('|').map((name) => name.trim()).filter(Boolean),
    procyonian: t('home.defaultNames.pt2.procyonian').split('|').map((name) => name.trim()).filter(Boolean),
    leporian: t('home.defaultNames.pt2.leporian').split('|').map((name) => name.trim()).filter(Boolean),
    cervin: t('home.defaultNames.pt2.cervin').split('|').map((name) => name.trim()).filter(Boolean),
    murid: t('home.defaultNames.pt2.murid').split('|').map((name) => name.trim()).filter(Boolean),
  },
  3: {
    lupinian: t('home.defaultNames.pt3.lupinian').split('|').map((name) => name.trim()).filter(Boolean),
    vulpinian: t('home.defaultNames.pt3.vulpinian').split('|').map((name) => name.trim()).filter(Boolean),
    felidian: t('home.defaultNames.pt3.felidian').split('|').map((name) => name.trim()).filter(Boolean),
    caninian: t('home.defaultNames.pt3.caninian').split('|').map((name) => name.trim()).filter(Boolean),
    ursan: t('home.defaultNames.pt3.ursan').split('|').map((name) => name.trim()).filter(Boolean),
    procyonian: t('home.defaultNames.pt3.procyonian').split('|').map((name) => name.trim()).filter(Boolean),
    leporian: t('home.defaultNames.pt3.leporian').split('|').map((name) => name.trim()).filter(Boolean),
    cervin: t('home.defaultNames.pt3.cervin').split('|').map((name) => name.trim()).filter(Boolean),
    murid: t('home.defaultNames.pt3.murid').split('|').map((name) => name.trim()).filter(Boolean),
  },
  4: {
    lupinian: t('home.defaultNames.pt4.lupinian').split('|').map((name) => name.trim()).filter(Boolean),
    vulpinian: t('home.defaultNames.pt4.vulpinian').split('|').map((name) => name.trim()).filter(Boolean),
    felidian: t('home.defaultNames.pt4.felidian').split('|').map((name) => name.trim()).filter(Boolean),
    caninian: t('home.defaultNames.pt4.caninian').split('|').map((name) => name.trim()).filter(Boolean),
    ursan: t('home.defaultNames.pt4.ursan').split('|').map((name) => name.trim()).filter(Boolean),
    procyonian: t('home.defaultNames.pt4.procyonian').split('|').map((name) => name.trim()).filter(Boolean),
    leporian: t('home.defaultNames.pt4.leporian').split('|').map((name) => name.trim()).filter(Boolean),
    cervin: t('home.defaultNames.pt4.cervin').split('|').map((name) => name.trim()).filter(Boolean),
    murid: t('home.defaultNames.pt4.murid').split('|').map((name) => name.trim()).filter(Boolean),
  },
  5: {
    lupinian: t('home.defaultNames.pt5.lupinian').split('|').map((name) => name.trim()).filter(Boolean),
    vulpinian: t('home.defaultNames.pt5.vulpinian').split('|').map((name) => name.trim()).filter(Boolean),
    felidian: t('home.defaultNames.pt5.felidian').split('|').map((name) => name.trim()).filter(Boolean),
    caninian: t('home.defaultNames.pt5.caninian').split('|').map((name) => name.trim()).filter(Boolean),
    ursan: t('home.defaultNames.pt5.ursan').split('|').map((name) => name.trim()).filter(Boolean),
    procyonian: t('home.defaultNames.pt5.procyonian').split('|').map((name) => name.trim()).filter(Boolean),
    leporian: t('home.defaultNames.pt5.leporian').split('|').map((name) => name.trim()).filter(Boolean),
    cervin: t('home.defaultNames.pt5.cervin').split('|').map((name) => name.trim()).filter(Boolean),
    murid: t('home.defaultNames.pt5.murid').split('|').map((name) => name.trim()).filter(Boolean),
  },
  6: {
    lupinian: t('home.defaultNames.pt6.lupinian').split('|').map((name) => name.trim()).filter(Boolean),
    vulpinian: t('home.defaultNames.pt6.vulpinian').split('|').map((name) => name.trim()).filter(Boolean),
    felidian: t('home.defaultNames.pt6.felidian').split('|').map((name) => name.trim()).filter(Boolean),
    caninian: t('home.defaultNames.pt6.caninian').split('|').map((name) => name.trim()).filter(Boolean),
    ursan: t('home.defaultNames.pt6.ursan').split('|').map((name) => name.trim()).filter(Boolean),
    procyonian: t('home.defaultNames.pt6.procyonian').split('|').map((name) => name.trim()).filter(Boolean),
    leporian: t('home.defaultNames.pt6.leporian').split('|').map((name) => name.trim()).filter(Boolean),
    cervin: t('home.defaultNames.pt6.cervin').split('|').map((name) => name.trim()).filter(Boolean),
    murid: t('home.defaultNames.pt6.murid').split('|').map((name) => name.trim()).filter(Boolean),
  },
  };


const getGenderedNamePool = (names: string[]): GenderedNamePool => {
  const pivot = Math.ceil(names.length / 2);
  return { male: names.slice(0, pivot), female: names.slice(pivot) };
};

  Object.values(pools).forEach((races) => {
    Object.keys(races).forEach((raceKey) => {
      const value = (races as Record<string, unknown>)[raceKey];
      if (Array.isArray(value)) {
        (races as Record<string, GenderedNamePool>)[raceKey] = getGenderedNamePool(value as string[]);
      }
    });
  });

  return pools as Record<number, Partial<Record<RaceId, GenderedNamePool>>>;
}

export function parseDiaryThreshold(value: string): DiaryRarityThreshold {
  if (value === 'all' || value === 'none') return value;
  const numericValue = Number(value);
  if (numericValue >= 1 && numericValue <= 6) return numericValue as 1 | 2 | 3 | 4 | 5 | 6;
  return 'all';
}

export function parseDiarySideQuestThreshold(value: string): DiarySideQuestThreshold {
  if (value === 'all' || value === 'none') return value;
  const numericValue = Number(value);
  if (numericValue >= 2 && numericValue <= 8) return numericValue as 2 | 3 | 4 | 5 | 6 | 7 | 8;
  return 'all';
}

export const numberFormatter = new Intl.NumberFormat('ja-JP');
export const SPEED_OF_TIME_BONUS_DURATION_MS = (24 * 60 + 45) * 60 * 1000;
export const SPEED_OF_TIME_BONUS_UNTIL_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-speed-of-time-bonus-until-ms');
export const DEV_DISCORD_WEBHOOK_URL = import.meta.env.VITE_DEV_DISCORD_WEBHOOK_URL;
export const BETA_DISCORD_WEBHOOK_URL = import.meta.env.VITE_BETA_DISCORD_WEBHOOK_URL;
export const PROD_DISCORD_WEBHOOK_URL = import.meta.env.VITE_PROD_DISCORD_WEBHOOK_URL;
export const FEEDBACK_DISCORD_WEBHOOK_URL = import.meta.env.VITE_FEEDBACK_DISCORD_WEBHOOK_URL;

export function formatNumber(value: number): string {
  return numberFormatter.format(Math.trunc(value));
}

export function formatBattleLogHitDisplay(entry: BattleLogEntry): string {
  if (entry.specialAttack === 'armor_break') {
    return t('battleLog.hits.armorBreak');
  }
  if (entry.specialAttack === 'mana_break') {
    return t('battleLog.hits.manaBreak');
  }
  const totalAttempts = entry.totalAttempts ?? 0;
  if (totalAttempts <= 0) return '';
  const values = {
    hits: formatNumber(entry.hits ?? 0),
    total: formatNumber(totalAttempts),
  };
  return entry.specialAttack === 'gravity_well'
    ? t('battleLog.hits.gravityWell', values)
    : `(${t('battleLog.hits', values)})`;
}

export function formatDecimal(value: number, maximumFractionDigits: number, minimumFractionDigits = maximumFractionDigits): string {
  return new Intl.NumberFormat('ja-JP', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

export function formatAutoSellSummary(autoSellProfit: number, autoSellMultiplier?: number): string {
  if (autoSellMultiplier && autoSellMultiplier > 1) {
    return t('home.autoSell.withMultiplier', { multiplier: formatDecimal(autoSellMultiplier, 1), gold: formatNumber(autoSellProfit) });
  }
  return t('home.autoSell.basic', { gold: formatNumber(autoSellProfit) });
}

export function getItemRarityById(itemId: number): ItemRarity {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 500) return 'mythicRare';
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

export const MYTHIC_TIER_BY_NAME = new Map(GOD_MYTHIC_DROPS.map((drop) => [drop.name, drop.tier]));

export function getDisplayTier(itemId: number, itemName?: string): number {
  const tier = Math.floor(itemId / 1000);
  if (getItemRarityById(itemId) === 'mythicRare' && itemName) {
    return MYTHIC_TIER_BY_NAME.get(itemName) ?? tier;
  }
  return tier;
}

export function getRarityShortLabel(itemId: number, itemName?: string): string {
  const tier = getDisplayTier(itemId, itemName);
  const rarityCode = RARITY_SHORT_CODES[getItemRarityById(itemId)];
  return `[${tier}${rarityCode}]`;
}

export function matchesRarityFilter(itemId: number, filter: RarityFilter): boolean {
  if (filter === 'all') return true;
  return getItemRarityById(itemId) === filter;
}

export function getRarityTextClass(rarity: ItemRarity, isSuperRare: boolean): string {
  if (isSuperRare) return 'text-accent font-bold';
  if (rarity === 'eliteRare') return 'text-sub';
  if (rarity === 'bossRare') return 'text-accent';
  if (rarity === 'mythicRare') return 'text-accent font-bold';
  return 'text-black';
}

export function getRewardTextClass(rarity?: ItemRarity, isSuperRare?: boolean): string {
  if (isSuperRare) return 'text-accent';
  if (rarity === 'mythicRare') return 'text-accent';
  if (rarity === 'bossRare') return 'text-accent';
  if (rarity === 'eliteRare') return 'text-sub';
  return 'text-black';
}

export function getRewardFontWeightClass(rarity: ItemRarity, isSuperRare: boolean): string {
  if (isSuperRare) return 'font-bold';
  if (rarity === 'mythicRare') return 'font-bold';
  return rarity === 'common' ? 'font-normal' : 'font-medium';
}

export function getItemNameFontWeightClass(item: Item): string {
  return item.superRare >= 1 ? 'font-bold' : 'font-normal';
}

export function renderEntryReward(entry: ExpeditionLogEntry): JSX.Element | null {
  if (!entry.reward) return null;

  if (entry.rewardItems && entry.rewardItems.length > 0) {
    return (
      <>
        <span className="text-black">{t('home.reward.acquired')}:</span>
        {entry.rewardItems.map((item, index) => {
          const rarity = getItemRarityById(item.id);
          const isSuperRare = item.superRare > 0;
          const rarityClass = getRarityTextClass(rarity, isSuperRare);
          const fontWeightClass = getRewardFontWeightClass(rarity, isSuperRare);
          return (
            <span key={`${item.id}-${item.enhancement}-${item.superRare}-${index}`} className={`${rarityClass} ${fontWeightClass}`}>
              {index > 0 && ' / '}
              {getItemDisplayName(item)}
            </span>
          );
        })}
      </>
    );
  }

  return (
    <span className={`${getRewardTextClass(entry.rewardRarity, entry.rewardIsSuperRare)} ${getRewardFontWeightClass(entry.rewardRarity ?? 'common', entry.rewardIsSuperRare ?? false)}`}>
      {t('home.reward.acquired')}: {entry.reward}
    </span>
  );
}

export function getDungeonEntryGateState(
  party: Party,
  dungeon: Dungeon
): {
  locked: boolean;
  gateText: string;
} {
  if (dungeon.id === 1) {
    return { locked: false, gateText: t('home.gate.firstDungeonNone') };
  }

  const required = ENTRY_GATE_REQUIRED;
  const collected = party.defeatedBossExpeditions?.[dungeon.id - 1] ? 1 : 0;
  const unlocked = isDungeonEntryUnlocked(party, dungeon.id);

  const gateProgressText = required === 1 ? t('home.gate.bossDefeated') : t('home.gate.bossProgress', { collected, required });

  return {
    locked: !unlocked,
    gateText: t('home.gate.unlockDungeon', { progress: gateProgressText, dungeon: dungeon.name }),
  };
}

export function shouldDelayNextSpecialGoal(party: Party, cycleState?: PartyCycleState): boolean {
  if (cycleState !== 'explore') return false;
  const log = party.lastExpeditionLog;
  if (!log || log.finalOutcome !== 'Clear') return false;
  const lastEntry = log.entries[log.entries.length - 1];
  return lastEntry?.roomType === 'battle_Boss' && lastEntry.enemyName.includes(t('home.godsBattle.parenthetical'));
}

export function getGodBattleLabel(dungeon: Dungeon): string {
  // SpecRef: 8.3 | UI_EXPEDITION | Gods Battle (神魔戦)
  const godProfile = getGodProfileForDungeon(dungeon.id, dungeon.name);
  const godShortName = godProfile?.displayName.split(' ')[0]?.trim();
  return godShortName ? t('home.godsBattle.named', { god: godShortName }) : t('party.expedition.godsBattle');
}

export function getScaledSideQuestExpiresAt(sideQuest: Party['sideQuest'], cycleDurationScale: number): number {
  if (!sideQuest) return 0;
  const safeScale = Math.max(0.001, cycleDurationScale);
  const deadlineWindowMs = Math.max(0, sideQuest.expiresAt - sideQuest.assignedAt);
  return sideQuest.assignedAt + Math.floor(deadlineWindowMs * safeScale);
}

export type ProgressItemDisplay = {
  key: string;
  compactText: string;
  bubbleText: string;
  progressRatio: number | null;
};


export function formatSideQuestShortText(type: string, shortText: string, displayTarget: number): string {
  const valueByType: Partial<Record<string, string>> = {
    'q.squander': `${formatNumber(displayTarget)}G`,
    'q.sleeping': t('home.unit.count', { value: formatNumber(displayTarget) }),
    'q.exercise': t('home.unit.minutes', { value: formatNumber(displayTarget) }),
    'q.embezzlement': `${formatNumber(displayTarget)}G`,
    'q.donation': `${formatNumber(displayTarget)}G`,
    'q.healing': t('home.unit.minutes', { value: formatNumber(displayTarget) }),
    'q.AFK': t('home.unit.minutes', { value: formatNumber(displayTarget) }),
    'q.treasure-super-rare': '',
    'q.treasure-boss-rare': t('home.unit.items', { value: formatNumber(displayTarget) }),
    'q.poor-kid': t('home.unit.count', { value: formatNumber(displayTarget) }),
    'q.consecutive-wins': t('home.unit.streak', { value: formatNumber(displayTarget) }),
    'q.losers': '',
    'q.savings': `${formatNumber(displayTarget)}G`,
  };
  const suffix = valueByType[type];
  if (suffix === '') return shortText;
  return `${shortText}(${suffix ?? formatNumber(displayTarget)})`;
}

export function resolveSideQuestShortText(sideQuest: NonNullable<Party['sideQuest']>): string {
  if (!sideQuest.shortTextKey) return sideQuest.shortText;
  const displayTarget = TIME_BASED_SIDE_QUEST_TYPES.has(sideQuest.type)
    ? Math.floor(Math.max(1, sideQuest.target) / 60)
    : Math.max(1, sideQuest.target);
  return formatSideQuestShortText(sideQuest.type, t(sideQuest.shortTextKey), displayTarget);
}

export function getRemainingClockEmoji(remainingMs: number): string {
  const remainingHours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));
  const clockFaces = ['🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚'];
  return clockFaces[remainingHours % 12] ?? '🕛';
}

export function getSideQuestDisplay(party: Party, cycleDurationScale: number, emulatedNowMs: number): ProgressItemDisplay | null {
  if (!party.sideQuest) return null;
  const { type, progress, target } = party.sideQuest;
  const shortText = resolveSideQuestShortText(party.sideQuest);
  const isTimeQuest = TIME_BASED_SIDE_QUEST_TYPES.has(type);
  const safeTarget = Math.max(1, target);
  const clampedProgress = Math.max(0, Math.min(progress, safeTarget));
  const displayTarget = isTimeQuest ? Math.floor(safeTarget / 60) : safeTarget;
  const displayProgress = isTimeQuest ? Math.floor(clampedProgress / 60) : clampedProgress;
  const percent = Math.floor((clampedProgress / safeTarget) * 100);

  const progressByType: Record<string, { text: string; current?: string }> = {
    'q.squander': {
      text: t('home.sideQuest.squander', { gold: formatNumber(displayTarget) }),
      current: `${formatNumber(displayProgress)}G`,
    },
    'q.sleeping': {
      text: t('home.sideQuest.sleeping', { count: formatNumber(displayTarget) }),
      current: t('home.unit.count', { value: formatNumber(displayProgress) }),
    },
    'q.exercise': {
      text: t('home.sideQuest.exercise', { minutes: formatNumber(displayTarget) }),
      current: t('home.unit.minutes', { value: formatNumber(displayProgress) }),
    },
    'q.embezzlement': {
      text: t('home.sideQuest.embezzlement', { gold: formatNumber(displayTarget) }),
      current: `${formatNumber(displayProgress)}G`,
    },
    'q.donation': {
      text: t('home.sideQuest.donation', { gold: formatNumber(displayTarget) }),
      current: `${formatNumber(displayProgress)}G`,
    },
    'q.healing': {
      text: t('home.sideQuest.healing', { minutes: formatNumber(displayTarget) }),
      current: t('home.unit.minutes', { value: formatNumber(displayProgress) }),
    },
    'q.AFK': {
      text: t('home.sideQuest.afk', { minutes: formatNumber(displayTarget) }),
      current: t('home.unit.minutes', { value: formatNumber(displayProgress) }),
    },
    'q.treasure-super-rare': {
      text: t('home.sideQuest.treasureSuperRare'),
    },
    'q.treasure-boss-rare': {
      text: t('home.sideQuest.treasureBossRare', { count: formatNumber(displayTarget) }),
      current: t('home.unit.items', { value: formatNumber(displayProgress) }),
    },
    'q.poor-kid': {
      text: t('home.sideQuest.poorKid', { count: formatNumber(displayTarget) }),
      current: t('home.unit.count', { value: formatNumber(displayProgress) }),
    },
    'q.consecutive-wins': {
      text: t('home.sideQuest.consecutiveWins', { streak: formatNumber(displayTarget) }),
      current: t('home.unit.streak', { value: formatNumber(displayProgress) }),
    },
    'q.losers': {
      text: t('home.sideQuest.losers'),
    },
    'q.savings': {
      text: t('home.sideQuest.savings', { gold: formatNumber(displayTarget) }),
      current: `${formatNumber(displayProgress)}G`,
    },
  };

  const display = progressByType[type] ?? {
    text: shortText,
    current: `${formatNumber(displayProgress)}/${formatNumber(displayTarget)}`,
  };

  const safeScale = Math.max(0.001, cycleDurationScale);
  const simulatedElapsedMs = Math.max(0, emulatedNowMs - party.sideQuest.assignedAt) / safeScale;
  const simulatedNow = party.sideQuest.assignedAt + simulatedElapsedMs;
  const remainingMs = Math.max(0, party.sideQuest.expiresAt - simulatedNow);
  const hasDeadline = party.sideQuest.expiresAt < Number.MAX_SAFE_INTEGER;
  const remainingLabel = !hasDeadline
    ? null
    : remainingMs >= (60 * 60 * 1000)
      ? t('home.remaining.hours', { count: formatNumber(Math.ceil(remainingMs / (60 * 60 * 1000))) })
      : t('home.remaining.minutes', { count: formatNumber(Math.ceil(remainingMs / (60 * 1000))) });
  const progressParts = [`${percent}%`];
  if (display.current) progressParts.push(display.current);
  if (remainingLabel) progressParts.push(remainingLabel);
  const clockEmoji = hasDeadline ? ` ${getRemainingClockEmoji(remainingMs)}` : '';
  return {
    key: `side-quest:${type}:${display.text}`,
    compactText: `📜${display.text}${clockEmoji}`,
    bubbleText: `${display.text}（${progressParts.join(', ')}）`,
    progressRatio: clampedProgress / safeTarget,
  };
}

export function getCompactProgressItems(party: Party, cycleDurationScale: number, emulatedNowMs: number, cycleState?: PartyCycleState): ProgressItemDisplay[] {
  const currentDungeon = DUNGEONS.find((d) => d.id === party.selectedDungeonId);
  if (!currentDungeon || !currentDungeon.floors || currentDungeon.id === 99) return [];

  // SpecRef: 8.3 | UI_EXPEDITION | Progress Visual Update
  // Clear-Gate outcomes become visible only after the party has completed its return. Keep
  // the compact indicator aligned with the gate text in the active expedition log.
  const displayedParty = party.expeditionRewardsPending && party.pendingClearGateSnapshot
    ? {
        ...party,
        clearGateProgress: party.pendingClearGateSnapshot.progress,
        clearGateStatus: party.pendingClearGateSnapshot.status,
        defeatedBossExpeditions: party.pendingClearGateSnapshot.defeatedBossExpeditions,
      }
    : party;
  const items: ProgressItemDisplay[] = [];
  const pushUniqueProgressItem = (item: ProgressItemDisplay) => {
    if (items.some((existingItem) => existingItem.compactText === item.compactText)) return;
    items.push(item);
  };

  for (const floor of currentDungeon.floors) {
    const hasEliteGate = floor.floorNumber < 6;
    if (!hasEliteGate) continue;
    const gateKey = getEliteGateKey(currentDungeon.id, floor.floorNumber);
    const required = getClearGateRequired(gateKey);
    const current = getClearGateProgress(displayedParty, gateKey);
    const unlocked = isClearGateUnlocked(displayedParty, gateKey);
    if (!unlocked) {
      const safeRequired = Math.max(1, required);
      const normalizedCurrent = Math.max(0, Math.min(current, safeRequired));
      pushUniqueProgressItem({
        key: `elite-gate:${currentDungeon.id}:${floor.floorNumber}`,
        compactText: t('home.progress.eliteCompact', { current: formatNumber(current), required: formatNumber(required), floor: floor.floorNumber }),
        bubbleText: t('home.progress.eliteBubble', { current: formatNumber(current), required: formatNumber(required), floor: floor.floorNumber }),
        progressRatio: normalizedCurrent / safeRequired,
      });
      break;
    }
  }

  if (items.length === 0) {
    const bossGateKey = getBossGateKey(currentDungeon.id);
    if (!isClearGateUnlocked(displayedParty, bossGateKey)) {
      const required = getClearGateRequired(bossGateKey);
      const current = getClearGateProgress(displayedParty, bossGateKey);
      const normalizedCurrent = Math.max(0, Math.min(current, required));
      pushUniqueProgressItem({
        key: `boss-gate:${currentDungeon.id}`,
        compactText: t('home.progress.bossClearCompact', { current: formatNumber(current), required: formatNumber(required) }),
        bubbleText: t('home.progress.bossClearBubble', { current: formatNumber(current), required: formatNumber(required) }),
        progressRatio: normalizedCurrent / required,
      });
    }
  }

  if (items.length === 0) {
    const nextDungeon = DUNGEONS.find((d) => d.id === currentDungeon.id + 1);
    if (nextDungeon) {
      const entryUnlocked = isDungeonEntryUnlocked(displayedParty, nextDungeon.id);
      if (!entryUnlocked) {
        pushUniqueProgressItem({
          key: `entry-gate:${nextDungeon.id}`,
          compactText: t('home.progress.defeatBossCompact'),
          bubbleText: t('home.progress.bossUnlockDungeon', { dungeon: nextDungeon.name }),
          progressRatio: null,
        });
      }
    }

    const godsRequired = getGodsBattleRequired();
    const bossRareCollected = getGodsBattleProgress(displayedParty, currentDungeon.id);
    const hasBossDefeat = hasDefeatedDungeonBoss(displayedParty, currentDungeon.id);
    const godsUnlocked = bossRareCollected >= godsRequired && hasBossDefeat;
    if (!godsUnlocked && !shouldDelayNextSpecialGoal(party, cycleState)) {
      if (hasBossDefeat) {
        const safeGodsRequired = Math.max(1, godsRequired);
        const normalizedBossRareCollected = Math.max(0, Math.min(bossRareCollected, safeGodsRequired));
        pushUniqueProgressItem({
          key: `god-gate:${currentDungeon.id}`,
          compactText: t('home.progress.godCompact', { collected: formatNumber(bossRareCollected), required: formatNumber(godsRequired) }),
          bubbleText: t('home.progress.godBubble', { collected: formatNumber(bossRareCollected), required: formatNumber(godsRequired), label: getGodBattleLabel(currentDungeon) }),
          progressRatio: normalizedBossRareCollected / safeGodsRequired,
        });
      } else {
        pushUniqueProgressItem({
          key: `god-entry:${currentDungeon.id}`,
          compactText: t('home.progress.defeatBossCompact'),
          bubbleText: t('home.progress.bossUnlockGod', { label: getGodBattleLabel(currentDungeon) }),
          progressRatio: null,
        });
      }
    }
  }

  const sideQuestItem = getSideQuestDisplay(party, cycleDurationScale, emulatedNowMs);
  if (sideQuestItem) pushUniqueProgressItem(sideQuestItem);

  return items;
}

export function isGodsBattleAvailable(party: Party, dungeonId: number): boolean {
  // SpecRef: 5.1.3.1 | "Clear-Gate" progression system specification | Gods battle gate
  return getGodsBattleProgress(party, dungeonId) >= getGodsBattleRequired()
    && hasDefeatedDungeonBoss(party, dungeonId);
}

export function getConditionLabel(condition: number, showValue: boolean): string {
  let label = t('condition.excellent');
  if (condition <= -350) label = t('condition.awful');
  else if (condition <= -250) label = t('condition.bad');
  else if (condition <= -150) label = t('condition.low');
  else if (condition <= -50) label = t('condition.cautious');
  else if (condition <= 50) label = t('condition.normal');
  else if (condition <= 150) label = t('condition.steady');
  else if (condition <= 250) label = t('condition.brisk');
  else if (condition <= 350) label = t('condition.good');
  // SpecRef: 8.6 | UI_SETTING | Display `condition` OFF/ON
  if (!showValue) return label;
  return `${label}(${condition >= 0 ? '+' : ''}${formatNumber(condition)})`;
}

// SpecRef: 7.1.2 | AUTO progress logic | God Battle engagement condition
export function shouldAutoTriggerGodsBattle(party: Party): boolean {
  return party.condition >= 251
    && isGodsBattleAvailable(party, party.selectedDungeonId)
    && !party.sideQuest;
}

export function getDisplayedExpeditionStats(party: Party, cycleState?: PartyCycleState): Party['expeditionStats'] {
  const latestStats = party.expeditionStats;
  if (cycleState !== 'explore') return latestStats;

  const returnOutcome = getReturnedExpeditionOutcome(party.lastExpeditionLog);
  if (!returnOutcome) return latestStats;

  return {
    ...latestStats,
    Clear: Math.max(0, latestStats.Clear - (returnOutcome === 'Clear' ? 1 : 0)),
    Turned_Back: Math.max(0, latestStats.Turned_Back - (returnOutcome === 'Turned_Back' ? 1 : 0)),
    Draw_Retreat: Math.max(0, latestStats.Draw_Retreat - (returnOutcome === 'Draw_Retreat' ? 1 : 0)),
    Wounded_Retreat: Math.max(0, latestStats.Wounded_Retreat - (returnOutcome === 'Wounded_Retreat' ? 1 : 0)),
    Defeat: Math.max(0, latestStats.Defeat - (returnOutcome === 'Defeat' ? 1 : 0)),
  };
}


export function hasActiveNonGodBattleClearGateCondition(party: Party): boolean {
  // SpecRef: 5.1.2 | Side Quest | Trigger Condition
  const currentDungeon = DUNGEONS.find((dungeon) => dungeon.id === party.selectedDungeonId);
  if (!currentDungeon || !currentDungeon.floors || currentDungeon.id === 99) return false;

  for (const floor of currentDungeon.floors) {
    if (floor.floorNumber >= 6) continue;
    if (!isClearGateUnlocked(party, getEliteGateKey(currentDungeon.id, floor.floorNumber))) return true;
  }

  if (!isClearGateUnlocked(party, getBossGateKey(currentDungeon.id))) return true;

  const nextDungeon = DUNGEONS.find((dungeon) => dungeon.id === currentDungeon.id + 1);
  if (!nextDungeon) return false;

  const entryUnlocked = isDungeonEntryUnlocked(party, nextDungeon.id);
  return !entryUnlocked;
}

export function getSideQuestAssignMessage(partyName: string, shortText: string): string {
  // SpecRef: 8.1 | UI_FOUNDATIONS | Side quest notifications
  return t('home.notification.sideQuestAssigned', { party: partyName, quest: shortText });
}

export function getSideQuestSuccessMessage(partyName: string, sideQuestDetail?: string): string | null {
  // SpecRef: 8.1 | UI_FOUNDATIONS | Side quest notifications
  if (!sideQuestDetail) return null;
  const jewelMatch = sideQuestDetail.match(new RegExp(`:\\s*(.+)\\s*${escapeRegExp(t('home.sideQuest.legacyObtainedSuffix'))}$`));
  if (!jewelMatch?.[1]) return null;
  return t('home.notification.sideQuestCompletedWithJewel', { party: partyName, jewel: jewelMatch[1] });
}

// Helper to format item stats

export function getItemDisplayMultiplier(item: Item, categoryMultiplier: number = 1): number {
  const enhancementMultiplier = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
  const superRareMultiplier = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
  const selfCategoryBonusTypeByItemCategory: Partial<Record<ItemCategory, BonusType>> = {
    sword: 'sword_multiplier',
    katana: 'katana_multiplier',
    archery: 'archery_multiplier',
    armor: 'armor_multiplier',
    gauntlet: 'gauntlet_multiplier',
    wand: 'wand_multiplier',
    robe: 'robe_multiplier',
    shield: 'shield_multiplier',
    bolt: 'bolt_multiplier',
    grimoire: 'grimoire_multiplier',
    catalyst: 'catalyst_multiplier',
    arrow: 'arrow_multiplier',
  };
  const selfCategoryBonusType = selfCategoryBonusTypeByItemCategory[item.category];
  const selfCategoryMultiplier = selfCategoryBonusType
    ? getSuperRareBonuses(item.superRare)
      .filter((bonus) => bonus.type === selfCategoryBonusType)
      .reduce((total, bonus) => total * bonus.value, 1)
    : 1;
  const baseMultiplier = item.baseMultiplier ?? 1;
  return enhancementMultiplier * superRareMultiplier * baseMultiplier * categoryMultiplier * selfCategoryMultiplier;
}

export function getItemInventoryDetailText(item: Item): string {
  return `[${t(CATEGORY_NAME_KEYS[item.category] ?? 'party.categoryName.unknown')}] ${getRarityShortLabel(item.id, item.name)} ${getItemStats(item)}`;
}

export type RewardItemBubble = {
  key: string;
  text: string;
  top: number;
  left: number;
  maxWidth: number;
};

export function getRewardItemBubblePosition(targetElement: HTMLElement): Omit<RewardItemBubble, 'key' | 'text'> {
  const triggerRect = targetElement.getBoundingClientRect();
  const viewportPadding = 12;
  const bubbleMaxWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
  const left = Math.min(
    Math.max(triggerRect.left, viewportPadding),
    window.innerWidth - viewportPadding - bubbleMaxWidth,
  );

  return {
    top: triggerRect.bottom + 8,
    left,
    maxWidth: bubbleMaxWidth,
  };
}

export function getItemStats(item: Item, categoryMultiplier: number = 1, hpScaleMultiplier: number = 1): string {
  const multiplier = getItemDisplayMultiplier(item, categoryMultiplier);
  const baseMultiplier = item.baseMultiplier ?? 1;
  const superRareUniqueBonusText = formatBonuses(
    SUPER_RARE_TITLES.find((title) => title.value === item.superRare)?.bonuses ?? [],
    { defenseMultiplierStyle: 'friendly' }
  );
  const itemUniqueBonuses = item.bonuses ?? [];
  const multiplierPercent = Math.round((baseMultiplier - 1) * 100);
  const formatItemDecimal = (value: number): string => {
    const rounded = Math.round(value * 100) / 100;
    if (Number.isInteger(rounded)) return formatNumber(rounded);
    return formatDecimal(rounded, 2, 0);
  };
  const formatSigned = (value: number, suffix: string = ''): string =>
    `${value >= 0 ? '+' : ''}${formatItemDecimal(value)}${suffix}`;
  const getScaledNoA = (value: number): number => {
    // Positive NoA item bonuses scale with enhancement + super rare multipliers.
    // Penalty style values should remain fixed (same as runtime stat computation).
    return value > 0 ? value * multiplier : value;
  };
  const formatFixedNoA = (label: string, value: number): string =>
    value > 0 ? `${label}${formatSigned(value)}` : `${label}${formatSigned(value)}`;

  const dParts: string[] = [];
  const bParts: string[] = [];
  const cParts: string[] = [];
  const eParts: string[] = [];
  const rParts: string[] = [];
  const otherParts: string[] = [];
  // SpecRef: 3.1.2 | Item Bonuses and rarity power scaling | Display format
  const classifyDisplayBonusBucket = (bonus: Bonus): 'b' | 'c' | 'e' | 'r' | 'other' => {
    if (['vitality', 'strength', 'intelligence', 'mind'].includes(bonus.type)) return 'b';
    if (['fire_offense', 'ice_offense', 'thunder_offense'].includes(bonus.type)) return 'e';
    if (
      [
        'fire_defense_multiplier_xV',
        'ice_defense_multiplier_xV',
        'thunder_defense_multiplier_xV',
        'fire_defense',
        'ice_defense',
        'thunder_defense',
      ].includes(bonus.type)
    ) return 'r';
    if (
      bonus.type === 'ability'
      || bonus.type === 'ability_upgrade'
      || bonus.type === 'unimplemented_bonus'
      || bonus.type in UNLOCK_ABILITY_BONUS_LABEL_KEYS
    ) {
      return 'other';
    }
    return 'c';
  };
  const jewelDBonus = {
    meleeAttack: 0,
    rangedAttack: 0,
    magicalAttack: 0,
    physicalDefense: 0,
    magicalDefense: 0,
    partyHP: 0,
  };
  if (item.jewel) {
    const jewel = JEWEL_DEFS[item.jewel.key];
    const cVal = item.jewel.key === 'might' || item.jewel.key === 'arcana'
      ? Math.round((['might','arcana'].includes(item.jewel.key) ? [22,21,19,18,17,16,15,14][item.jewel.rank - 1] : 0))
      : item.jewel.key === 'fort' || item.jewel.key === 'ward'
        ? Math.round(([13,12,11,9,8,7,6,5][item.jewel.rank - 1]))
        : Math.round(([8,7,6,5,4,3,2,1][item.jewel.rank - 1]));
    for (const d of jewel.dBaseBonuses) {
      const rankValue = ((): number => {
        let v = d.base;
        for (let n = 2; n <= item.jewel!.rank; n++) v = Math.round(v * (1.4 - 0.03 * n));
        return v;
      })();
      jewelDBonus[d.stat] += rankValue;
    }
    if (jewel.cBonusType === 'physical_attack') cParts.push(t('home.itemStat.physicalAttackPercent', { value: cVal }));
    if (jewel.cBonusType === 'magical_attack') cParts.push(t('home.itemStat.magicalAttackPercent', { value: cVal }));
    if (jewel.cBonusType === 'physical_defense') cParts.push(t('home.itemStat.physicalDefensePercent', { value: cVal }));
    if (jewel.cBonusType === 'magical_defense') cParts.push(t('home.itemStat.magicalDefensePercent', { value: cVal }));
    if (jewel.cBonusType === 'accuracy') cParts.push(t('home.itemStat.accuracyFlat', { value: cVal }));
    if (jewel.cBonusType === 'evasion') cParts.push(t('home.itemStat.evasionFlat', { value: cVal }));
  }
  // Match displayed item values with runtime stat computation (rounded, not floored).
  const displayedMeleeAttack = (item.meleeAttack ?? 0) + jewelDBonus.meleeAttack;
  if (displayedMeleeAttack) {
    dParts.push(t('home.itemStat.meleeAttackFlat', { value: Math.round(displayedMeleeAttack * multiplier) }));
    if (item.category === 'sword' && multiplierPercent) cParts.push(t('home.itemStat.meleeAttackPercent', { value: multiplierPercent }));
  }
  const displayedRangedAttack = (item.rangedAttack ?? 0) + jewelDBonus.rangedAttack;
  if (displayedRangedAttack) {
    dParts.push(t('home.itemStat.rangedAttackFlat', { value: Math.round(displayedRangedAttack * multiplier) }));
    if (item.category === 'arrow' && multiplierPercent) cParts.push(t('home.itemStat.rangedAttackPercent', { value: multiplierPercent }));
  }
  const displayedMagicalAttack = (item.magicalAttack ?? 0) + jewelDBonus.magicalAttack;
  if (displayedMagicalAttack) {
    dParts.push(t('home.itemStat.magicalAttackFlat', { value: Math.round(displayedMagicalAttack * multiplier) }));
    if (item.category === 'wand' && multiplierPercent) cParts.push(t('home.itemStat.magicalAttackPercent', { value: multiplierPercent }));
  }
  if (item.meleeNoA || item.meleeNoABonus) {
    const baseNoA = item.meleeNoA ?? 0;
    if (baseNoA !== 0) dParts.push(t('home.itemStat.meleeNoASigned', { value: formatSigned(getScaledNoA(baseNoA)) }));
    if (item.meleeNoABonus) cParts.push(formatFixedNoA(t('home.itemStat.meleeNoA'), item.meleeNoABonus));
  }
  if (item.rangedNoA || item.rangedNoABonus) {
    const baseNoA = item.rangedNoA ?? 0;
    if (baseNoA !== 0) dParts.push(t('home.itemStat.rangedNoASigned', { value: formatSigned(getScaledNoA(baseNoA)) }));
    if (item.rangedNoABonus) cParts.push(formatFixedNoA(t('home.itemStat.rangedNoA'), item.rangedNoABonus));
  }
  if (item.magicalNoA || item.magicalNoABonus) {
    const baseNoA = item.magicalNoA ?? 0;
    if (baseNoA !== 0) dParts.push(t('home.itemStat.magicalNoASigned', { value: formatSigned(getScaledNoA(baseNoA)) }));
    if (item.magicalNoABonus) cParts.push(formatFixedNoA(t('home.itemStat.magicalNoA'), item.magicalNoABonus));
  }
  const displayedPhysicalDefense = (item.physicalDefense ?? 0) + jewelDBonus.physicalDefense;
  if (displayedPhysicalDefense) {
    dParts.push(t('home.itemStat.physicalDefenseFlat', { value: Math.round(displayedPhysicalDefense * multiplier) }));
    if (multiplierPercent) cParts.push(t('home.itemStat.physicalDefensePercent', { value: multiplierPercent }));
  }
  const displayedMagicalDefense = (item.magicalDefense ?? 0) + jewelDBonus.magicalDefense;
  if (displayedMagicalDefense) {
    dParts.push(t('home.itemStat.magicalDefenseFlat', { value: Math.round(displayedMagicalDefense * multiplier) }));
    if (multiplierPercent) cParts.push(t('home.itemStat.magicalDefensePercent', { value: multiplierPercent }));
  }
  const displayedPartyHp = (item.partyHP ? Math.round(item.partyHP * multiplier * hpScaleMultiplier) : 0)
    + (jewelDBonus.partyHP ? Math.round(jewelDBonus.partyHP * multiplier * hpScaleMultiplier) : 0);
  if (displayedPartyHp) {
    // Match computePartyStats HP contribution order:
    // Round base and jewel HP contributions separately, then sum.
    dParts.push(`HP+${displayedPartyHp}`);
  }
  if (item.accuracyBonus) cParts.push(t('home.itemStat.accuracyFlat', { value: Math.round(item.accuracyBonus * 1000) }));
  if (item.evasionBonus) cParts.push(t('home.itemStat.evasionSigned', { value: formatSigned(Math.round(item.evasionBonus * 1000)) }));
  if (item.vitalityBonus) bParts.push(t('home.itemStat.vitalityFlat', { value: item.vitalityBonus }));
  if (item.strengthBonus) bParts.push(t('home.itemStat.strengthFlat', { value: item.strengthBonus }));
  if (item.intelligenceBonus) bParts.push(t('home.itemStat.intelligenceFlat', { value: item.intelligenceBonus }));
  if (item.mindBonus) bParts.push(t('home.itemStat.mindFlat', { value: item.mindBonus }));
  if (item.penetBonus) cParts.push(`${t('party.bonus.penet')}+${Math.round(item.penetBonus * 100)}`);
  if (item.elementalOffense && item.elementalOffense !== 'none') {
    const elem = { fire: t('common.element.fire.short'), ice: t('common.element.ice.short'), thunder: t('common.element.thunder.short') }[item.elementalOffense];
    const elementalPercent = Math.round((item.elementalOffenseBonus ?? 0) * 100);
    eParts.push(t('home.itemStat.elementalOffensePercent', { element: elem, value: elementalPercent }));
  }
  for (const bonus of itemUniqueBonuses) {
    const label = formatBonuses([bonus], { defenseMultiplierStyle: 'friendly' }).trim();
    if (!label) continue;
    const bucket = classifyDisplayBonusBucket(bonus);
    if (bucket === 'b') bParts.push(label);
    else if (bucket === 'c') cParts.push(label);
    else if (bucket === 'e') eParts.push(label);
    else if (bucket === 'r') rParts.push(label);
    else otherParts.push(label);
  }
  if (superRareUniqueBonusText) otherParts.push(t('home.itemStat.superRarePrefix', { text: superRareUniqueBonusText }));

  const eText = eParts.join(' ');
  const mergedBracketBonuses = [...cParts, ...rParts, ...otherParts];
  const mergedBracketBonusesText = mergedBracketBonuses.length > 0 ? `[${mergedBracketBonuses.join(', ')}]` : '';
  return [dParts.join(' '), bParts.join(' '), eText, mergedBracketBonusesText].filter(Boolean).join(' ');
}

export function getJewelCBonusLabelKey(bonusType: typeof JEWEL_DEFS[JewelKey]['cBonusType']): string {
  return `jewel.status.cBonus.${bonusType}`;
}

export function getJewelDStatLabelKey(stat: typeof JEWEL_DEFS[JewelKey]['dBaseBonuses'][number]['stat']): string {
  return `jewel.status.dStat.${stat}`;
}

export function formatJewelStatusText(jewelKey: JewelKey, rank: number): string {
  const jewel = JEWEL_DEFS[jewelKey];
  const cValue = getJewelCBonusValue(jewelKey, rank);
  const cMagnitude = jewel.cBonusType === 'accuracy' || jewel.cBonusType === 'evasion'
    ? Math.round(cValue * 1000)
    : `${Math.round(cValue * 100)}%`;
  const cText = t('jewel.status.bracketedBonus', {
    label: t(getJewelCBonusLabelKey(jewel.cBonusType)),
    value: cMagnitude,
  });
  const dText = jewel.dBaseBonuses.map((bonus) => t('jewel.status.flatBonus', {
    label: t(getJewelDStatLabelKey(bonus.stat)),
    value: getJewelDRankValue(bonus.base, rank),
  })).join(' ');

  return [`[${getJewelShortLabel(jewelKey)}${rank}]`, cText, dText].filter(Boolean).join(' ');
}

export function getJewelSlotStatusText(jewelKey: JewelKey, rank: number): string {
  return formatJewelStatusText(jewelKey, rank);
}

export function getJewelInventoryStatusText(jewelKey: JewelKey, rank: number): string {
  return formatJewelStatusText(jewelKey, rank);
}

export function getOffenseMultiplierSum(
  items: Item[],
  kind: 'melee' | 'ranged' | 'magical',
  initialAppliedBonusNames?: Iterable<string>
): number {
  const appliedBonusNames = new Set<string>(initialAppliedBonusNames ?? []);
  const relevant = items.filter(item => {
    if (kind === 'melee') return item.meleeAttack || item.meleeNoA || item.meleeNoABonus;
    if (kind === 'ranged') return item.rangedAttack || item.rangedNoA || item.rangedNoABonus;
    return item.magicalAttack || item.magicalNoA || item.magicalNoABonus;
  });

  const bonusSum = relevant.reduce((sum, item) => {
    const baseMultiplier = item.baseMultiplier ?? 1;
    if (baseMultiplier === 1) return sum;

    const percent = Math.round((baseMultiplier - 1) * 1000) / 10;
    const bonusName = `c.${kind}_attack+${percent}`;
    if (appliedBonusNames.has(bonusName)) return sum;
    appliedBonusNames.add(bonusName);
    return sum + (baseMultiplier - 1);
  }, 0);

  return bonusSum;
}

export function hasEnemyArcMagicAbility(enemy: EnemyDef): boolean {
  return enemy.abilities.some((ability) => ability.id === 'arc_magic' && ability.level > 0);
}

export function getArcMagicAbilityLevel(abilities: Ability[]): number {
  return abilities
    .filter((ability) => ability.id === 'arc_magic')
    .reduce((maxLevel, ability) => Math.max(maxLevel, ability.level), 0);
}

export function getEnemyArcMagicAbilityLevel(enemy: EnemyDef): number {
  return enemy.abilities
    .filter((ability) => ability.id === 'arc_magic')
    .reduce((maxLevel, ability) => Math.max(maxLevel, ability.level), 0);
}

export function getArcMagicOffenseAmplifier(level: number): number {
  if (level >= 3) return 4.2;
  if (level >= 2) return 3.6;
  if (level >= 1) return 3.0;
  return 1.0;
}

// SpecRef: 2.1.1.2 | Multiplier and Functions | character.f.offense_amplifier
// a.arc-magic: magical offense amplifier xN (Lv1:3.0, Lv2:3.6, Lv3:4.2).
export function getCharacterDisplayedMagicalAttackAmplifier(baseAmplifier: number, abilities: Ability[]): number {
  const heavyStrikeAmplifier = abilities.some((ability) => ability.id === 'heavy_strike' && ability.level > 0) ? 1.4 : 1.0;
  return baseAmplifier * heavyStrikeAmplifier * getArcMagicOffenseAmplifier(getArcMagicAbilityLevel(abilities));
}

// SpecRef: 2.1.1.2 | Multiplier and Functions | character.f.offense_amplifier
// a.arc-magic: magical offense amplifier xN (Lv1:3.0, Lv2:3.6, Lv3:4.2).
export function getEnemyDisplayedMagicalAttackAmplifier(enemy: EnemyDef): number {
  const heavyStrikeAmplifier = enemy.abilities.some((ability) => ability.id === 'heavy_strike' && ability.level > 0) ? 1.4 : 1.0;
  return enemy.magicalAttackAmplifier * heavyStrikeAmplifier * getArcMagicOffenseAmplifier(getEnemyArcMagicAbilityLevel(enemy));
}

export function getEnemyBestiarySpellName(enemy: EnemyDef): string {
  const specialMagic = enemy.magicStyle === 'percentage_damage'
    ? (isSpecialMagicCastable('gravity_well', enemy.magicalNoA) ? 'gravity_well' : null)
    : resolveSpecialMagicFromAbilities(enemy.abilities, enemy.magicalNoA);
  const magicProfile = resolveMagicProfile({
    style: specialMagic === 'gravity_well'
      ? 'percentage_damage'
      : specialMagic
        ? 'debuff'
        : enemy.magicStyle === 'percentage_damage'
          ? 'multi-hit'
          : enemy.magicStyle ?? (hasEnemyArcMagicAbility(enemy) ? 'arc-magic' : 'multi-hit'),
    specialMagic,
    elementalOffense: enemy.elementalOffense,
    elementalOffenseValue: 1.0,
    magicalNoA: enemy.magicalNoA,
  });
  return magicProfile.spellName;
}

export function getBaseOffenseScale(value: number): number {
  return getBaseMultiplier(value, 'attack');
}

export function getBaseDefenseScale(value: number): number {
  return getBaseMultiplier(value, 'defense');
}

export function getElementalOffenseHelpLines(character: Character, stats: ComputedCharacterStats): string[] {
  const elementalSums: Record<ElementalOffense, number> = {
    none: 0,
    fire: 0,
    ice: 0,
    thunder: 0,
  };
  const equippedItems = character.equipment
    .slice(0, stats.maxEquipSlots)
    .filter((item): item is Item => item != null);

  for (const item of equippedItems) {
    if (item.elementalOffense && item.elementalOffense !== 'none') {
      elementalSums[item.elementalOffense] += item.elementalOffenseBonus ?? 0;
    }
  }

  const elementMeta: Record<Exclude<ElementalOffense, 'none'>, { label: string }> = {
    fire: { label: t('element.fire.short') },
    ice: { label: t('element.ice.short') },
    thunder: { label: t('element.thunder.short') },
  };

  const lines: string[] = [];

  if (stats.elementalOffense === 'none') {
    lines.push(t('party.elementalOffense.noneHelp'));
    return lines;
  }

  const selectedMeta = elementMeta[stats.elementalOffense];
  const selectedPercent = Math.round((stats.elementalOffenseValue - 1) * 100);
  lines.push(t('party.elementalOffense.selectedHelp', { element: selectedMeta.label, percent: selectedPercent }));

  (['fire', 'ice', 'thunder'] as const).forEach((element) => {
    if (element === stats.elementalOffense) return;
    const total = elementalSums[element];
    if (total <= 0) return;
    const meta = elementMeta[element];
    lines.push(t('party.elementalOffense.unselectedHelp', { element: meta.label, percent: Math.round(total * 100) }));
  });

  return lines;
}

export const MULTIPLIER_LABEL_KEYS: Record<string, string> = {
  sword_multiplier: 'party.bonus.sword',
  katana_multiplier: 'party.bonus.katana',
  archery_multiplier: 'party.bonus.archery',
  armor_multiplier: 'party.bonus.armor',
  gauntlet_multiplier: 'party.bonus.gauntlet',
  wand_multiplier: 'party.bonus.wand',
  robe_multiplier: 'party.bonus.robe',
  shield_multiplier: 'party.bonus.shield',
  bolt_multiplier: 'party.bonus.bolt',
  grimoire_multiplier: 'party.bonus.grimoire',
  catalyst_multiplier: 'party.bonus.catalyst',
  arrow_multiplier: 'party.bonus.arrow',
};

// Keep the translation-backed proxy intact so item ability labels resolve in the
// currently selected language instead of being snapshotted in Japanese at load time.
// SpecRef: 8.1 | UI_FOUNDATIONS | Localization lookup
export const ABILITY_NAMES: Record<string, string> = ABILITY_BASE_NAMES;

export const BONUS_ABILITY_GLOSSARY_SUBCATEGORY_META: Array<{
  id: BonusAbilityGlossarySubcategoryId;
  shortLabelKey: string;
  labelKey: string;
}> = [
  { id: 'passive', shortLabelKey: 'home.bonusAbility.subcategory.passiveShort', labelKey: 'home.bonusAbility.subcategory.passive' },
  { id: 'expedition', shortLabelKey: 'home.bonusAbility.subcategory.expeditionShort', labelKey: 'home.bonusAbility.subcategory.expedition' },
  { id: 'reactive', shortLabelKey: 'home.bonusAbility.subcategory.reactiveShort', labelKey: 'home.bonusAbility.subcategory.reactive' },
  { id: 'timed', shortLabelKey: 'home.bonusAbility.subcategory.timedShort', labelKey: 'home.bonusAbility.subcategory.timed' },
];

export const ABILITY_HELP_TEXT_KEYS: Record<string, string> = {
  'defender:1': 'home.abilityHelp.defender.1',
  'defender:2': 'home.abilityHelp.defender.2',
  'defender:3': 'home.abilityHelp.defender.3',
  'counter:1': 'home.abilityHelp.counter.1',
  'counter:2': 'home.abilityHelp.counter.2',
  'counter:3': 'home.abilityHelp.counter.3',
  're_attack:1': 'home.abilityHelp.re_attack.1',
  're_attack:2': 'home.abilityHelp.re_attack.2',
  're_attack:3': 'home.abilityHelp.re_attack.3',
  'iaigiri:1': 'home.abilityHelp.iaigiri.1',
  'iaigiri:2': 'home.abilityHelp.iaigiri.2',
  'iaigiri:3': 'home.abilityHelp.iaigiri.3',
  'command:1': 'home.abilityHelp.command.1',
  'command:2': 'home.abilityHelp.command.2',
  'command:3': 'home.abilityHelp.command.3',
  'hunter:1': 'home.abilityHelp.hunter.1',
  'hunter:2': 'home.abilityHelp.hunter.2',
  'hunter:3': 'home.abilityHelp.hunter.3',
  'resonance:1': 'home.abilityHelp.resonance.1',
  'resonance:2': 'home.abilityHelp.resonance.2',
  'resonance:3': 'home.abilityHelp.resonance.3',
  'resonance:4': 'home.abilityHelp.resonance.4',
  'resonance:5': 'home.abilityHelp.resonance.5',
  'm_barrier:1': 'home.abilityHelp.m_barrier.1',
  'm_barrier:2': 'home.abilityHelp.m_barrier.2',
  'm_barrier:3': 'home.abilityHelp.m_barrier.3',
  'deflection:1': 'home.abilityHelp.deflection.1',
  'deflection:2': 'home.abilityHelp.deflection.2',
  first_strike: 'home.abilityHelp.first_strike',
  equation_breaker: 'home.abilityHelp.equation_breaker',
  domain_breaker: 'home.abilityHelp.domain_breaker',
  fire_protect_breaker: 'home.abilityHelp.fire_protect_breaker',
  ice_protect_breaker: 'home.abilityHelp.ice_protect_breaker',
  thunder_protect_breaker: 'home.abilityHelp.thunder_protect_breaker',
  m_barrier_breaker: 'home.abilityHelp.m_barrier_breaker',
  null_counter: 'home.abilityHelp.null_counter',
  resurrect: 'home.abilityHelp.resurrect',
  rage: 'home.abilityHelp.rage',
  re_counter: 'home.abilityHelp.re_counter',
  pursuit: 'home.abilityHelp.pursuit',
  illusion_breaker: 'home.abilityHelp.illusion_breaker',
  bulwark_breaker: 'home.abilityHelp.bulwark_breaker',
  'illusion-breaker': 'home.abilityHelp.illusion-breaker',
  'bulwark-breaker': 'home.abilityHelp.bulwark-breaker',
  momentum: 'home.abilityHelp.momentum',
  bulwark: 'home.abilityHelp.bulwark',
  covering_fire: 'home.abilityHelp.covering_fire',
  magical_counter: 'home.abilityHelp.magical_counter',
  stealth: 'home.abilityHelp.stealth',
  illusion: 'home.abilityHelp.illusion',
  howl: 'home.abilityHelp.howl',
  predator_sense: 'home.abilityHelp.predator_sense',
  slow: 'home.abilityHelp.slow',
  corrode: 'home.abilityHelp.corrode',
  life_drain: 'home.abilityHelp.life_drain',
  no_offense: 'home.abilityHelp.no_offense',
  decompose: 'home.abilityHelp.decompose',
  swarm: 'home.abilityHelp.swarm',
  death_touch: 'home.abilityHelp.death_touch',
  flying: 'home.abilityHelp.flying',
  free: 'home.abilityHelp.free',
  frostbite: 'home.abilityHelp.frostbite',
  ice_reflect: 'home.abilityHelp.ice_reflect',
  ice_absorb: 'home.abilityHelp.ice_absorb',
  ice_null: 'home.abilityHelp.ice_null',
  bind: 'home.abilityHelp.bind',
  regeneration: 'home.abilityHelp.regeneration',
  burn: 'home.abilityHelp.burn',
  fire_reflect: 'home.abilityHelp.fire_reflect',
  fire_absorb: 'home.abilityHelp.fire_absorb',
  fire_null: 'home.abilityHelp.fire_null',
  thunder_reflect: 'home.abilityHelp.thunder_reflect',
  thunder_absorb: 'home.abilityHelp.thunder_absorb',
  thunder_null: 'home.abilityHelp.thunder_null',
  soul_reap: 'home.abilityHelp.soul_reap',
  mutual_magic_amplify: 'home.abilityHelp.mutual_magic_amplify',
  mutual_magic_restraint: 'home.abilityHelp.mutual_magic_restraint',
  mutual_physical_amplify: 'home.abilityHelp.mutual_physical_amplify',
  mutual_physical_restraint: 'home.abilityHelp.mutual_physical_restraint',
  ranged_confusion: 'home.abilityHelp.ranged_confusion',
  magic_confusion: 'home.abilityHelp.magic_confusion',
  melee_confusion: 'home.abilityHelp.melee_confusion',
  self_destruct: 'home.abilityHelp.self_destruct',
  oblivion: 'home.abilityHelp.oblivion',
  fading_memory: 'home.abilityHelp.fading_memory',
  reanimate: 'home.abilityHelp.reanimate',
  auriferous: 'home.abilityHelp.auriferous',
  magic_seal: 'home.abilityHelp.magic_seal',
  ambush: 'home.abilityHelp.ambush',
  mimic: 'home.abilityHelp.mimic',
  unforgettable: 'home.abilityHelp.unforgettable',
  shock: 'home.abilityHelp.shock',
  null_shock: 'home.abilityHelp.null_shock',
  null_corrode: 'home.abilityHelp.null_corrode',
  null_life_drain: 'home.abilityHelp.null_life_drain',
  null_death_touch: 'home.abilityHelp.null_death_touch',
  null_burn: 'home.abilityHelp.null_burn',
  null_bind: 'home.abilityHelp.null_bind',
  null_requiem: 'home.abilityHelp.null_requiem',
  unstable_core: 'home.abilityHelp.unstable_core',
  magical_reflect: 'home.abilityHelp.magical_reflect',
  magical_absorb: 'home.abilityHelp.magical_absorb',
  magical_null: 'home.abilityHelp.magical_null',
  ranged_reflect: 'home.abilityHelp.ranged_reflect',
  ranged_null: 'home.abilityHelp.ranged_null',
  melee_reflect: 'home.abilityHelp.melee_reflect',
  melee_null: 'home.abilityHelp.melee_null',
  colossal: 'home.abilityHelp.colossal',
  upgrade_all_abilities: 'home.abilityHelp.upgrade_all_abilities',
};

export const C_MULTIPLIER_HELP_DESCRIPTION_KEYS: Record<string, string> = {
  sword: 'home.cMultiplierHelp.sword',
  katana: 'home.cMultiplierHelp.katana',
  archery: 'home.cMultiplierHelp.archery',
  armor: 'home.cMultiplierHelp.armor',
  gauntlet: 'home.cMultiplierHelp.gauntlet',
  wand: 'home.cMultiplierHelp.wand',
  robe: 'home.cMultiplierHelp.robe',
  shield: 'home.cMultiplierHelp.shield',
  bolt: 'home.cMultiplierHelp.bolt',
  grimoire: 'home.cMultiplierHelp.grimoire',
  catalyst: 'home.cMultiplierHelp.catalyst',
  arrow: 'home.cMultiplierHelp.arrow',
  physical_offense_multiplier_xV: 'home.cMultiplierHelp.physical_offense_multiplier_xV',
  magical_offense_multiplier_xV: 'home.cMultiplierHelp.magical_offense_multiplier_xV',
  physical_defense_multiplier_xV: 'home.cMultiplierHelp.physical_defense_multiplier_xV',
  magical_defense_multiplier_xV: 'home.cMultiplierHelp.magical_defense_multiplier_xV',
  fire_defense_multiplier_xV: 'home.cMultiplierHelp.fire_defense_multiplier_xV',
  ice_defense_multiplier_xV: 'home.cMultiplierHelp.ice_defense_multiplier_xV',
  thunder_defense_multiplier_xV: 'home.cMultiplierHelp.thunder_defense_multiplier_xV',
  deity_physical_attack_xV: 'home.cMultiplierHelp.deity_physical_attack_xV',
  deity_magical_attack_xV: 'home.cMultiplierHelp.deity_magical_attack_xV',
  "deity_physical_defense_x2/3": 'home.cMultiplierHelp.deity_physical_defense_x2_3',
  deity_physical_defense_xV: 'home.cMultiplierHelp.deity_physical_defense_xV',
  deity_pysical_defense_xV: 'home.cMultiplierHelp.deity_pysical_defense_xV',
  "deity_magical_defense_x2/3": 'home.cMultiplierHelp.deity_magical_defense_x2_3',
  deity_magical_defense_xV: 'home.cMultiplierHelp.deity_magical_defense_xV',
};

export const CATEGORY_TO_MULTIPLIER_BONUS: Record<ItemCategory, BonusType | null> = {
  sword: 'sword_multiplier',
  katana: 'katana_multiplier',
  archery: 'archery_multiplier',
  armor: 'armor_multiplier',
  gauntlet: 'gauntlet_multiplier',
  wand: 'wand_multiplier',
  robe: 'robe_multiplier',
  shield: 'shield_multiplier',
  bolt: 'bolt_multiplier',
  grimoire: 'grimoire_multiplier',
  catalyst: 'catalyst_multiplier',
  arrow: 'arrow_multiplier',
};

export function formatCBonusValue(value: number): string {
  return (Math.round(value * 1000000) / 1000000).toString();
}

export function getCharacterCategoryMultiplier(character: Character, category: ItemCategory): number {
  const multiplierType = CATEGORY_TO_MULTIPLIER_BONUS[category];
  if (!multiplierType) return 1;

  const mainClassData = CLASSES.find((c) => c.id === character.mainClassId);
  const subClassData = CLASSES.find((c) => c.id === character.subClassId);
  const predispositionData = PREDISPOSITIONS.find((p) => p.id === character.predispositionId);
  const lineageData = LINEAGES.find((l) => l.id === character.lineageId);
  const raceData = RACES.find((r) => r.id === character.raceId);

  if (!mainClassData || !subClassData || !predispositionData || !lineageData || !raceData) {
    return 1;
  }

  const isMasterClass = character.mainClassId === character.subClassId;
  const allBonuses = [
    ...raceData.bonuses,
    ...mainClassData.mainSubBonuses,
    ...(isMasterClass ? mainClassData.masterBonuses : [...mainClassData.mainBonuses, ...subClassData.mainSubBonuses]),
    ...predispositionData.bonuses,
    ...lineageData.bonuses,
    ...character.equipment.flatMap((item) => (item ? getSuperRareBonuses(item.superRare) : [])),
  ];

  const appliedBonusNames = new Set<string>();
  const multipliers = allBonuses
    .filter((bonus) => bonus.type === multiplierType)
    .filter((bonus) => {
      const bonusName = `c.${multiplierType}+${formatCBonusValue(bonus.value)}`;
      if (appliedBonusNames.has(bonusName)) return false;
      appliedBonusNames.add(bonusName);
      return true;
    })
    .map((bonus) => bonus.value);

  return multipliers.reduce((total, value) => total * value, 1);
}

export function getCharacterGrowthMultiplier(character: Character): number {
  const mainClassData = CLASSES.find((c) => c.id === character.mainClassId);
  const subClassData = CLASSES.find((c) => c.id === character.subClassId);
  const predispositionData = PREDISPOSITIONS.find((p) => p.id === character.predispositionId);
  const lineageData = LINEAGES.find((l) => l.id === character.lineageId);
  const raceData = RACES.find((r) => r.id === character.raceId);

  if (!mainClassData || !subClassData || !predispositionData || !lineageData || !raceData) {
    return 1;
  }

  const isMasterClass = character.mainClassId === character.subClassId;
  const allBonuses = [
    ...raceData.bonuses,
    ...mainClassData.mainSubBonuses,
    ...(isMasterClass ? mainClassData.masterBonuses : [...mainClassData.mainBonuses, ...subClassData.mainSubBonuses]),
    ...predispositionData.bonuses,
    ...lineageData.bonuses,
    ...character.equipment.flatMap((item) => (item ? getSuperRareBonuses(item.superRare) : [])),
  ];

  const appliedBonusNames = new Set<string>();
  const growthMultipliers = allBonuses
    .filter((bonus) => bonus.type === 'growth_xV')
    .filter((bonus) => {
      const bonusName = `c.growth_x${formatCBonusValue(bonus.value)}`;
      if (appliedBonusNames.has(bonusName)) return false;
      appliedBonusNames.add(bonusName);
      return true;
    })
    .map((bonus) => bonus.value);

  return growthMultipliers.reduce((total, value) => total * value, 1);
}

export function formatMultiplierValue(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return formatNumber(rounded);
  return formatDecimal(rounded, 2, 0);
}

export function formatMultiplierAsFraction(value: number): string {
  const fractionCandidates: Array<{ numerator: number; denominator: number }> = [
    { numerator: 2, denominator: 3 },
    { numerator: 3, denominator: 5 },
    { numerator: 4, denominator: 5 },
    { numerator: 1, denominator: 2 },
  ];
  const candidate = fractionCandidates.find(({ numerator, denominator }) => Math.abs(value - (numerator / denominator)) < 0.0001);
  if (candidate) return `${formatNumber(candidate.numerator)}/${formatNumber(candidate.denominator)}`;
  return formatMultiplierValue(value);
}

export const UNLOCK_ABILITY_BONUS_LABEL_KEYS: Partial<Record<BonusType, string>> = {
  unlock_caninian_ability: 'party.bonus.unlockAbility.caninian',
  unlock_lupinian_ability: 'party.bonus.unlockAbility.lupinian',
  unlock_vulpinian_ability: 'party.bonus.unlockAbility.vulpinian',
  unlock_ursan_ability: 'party.bonus.unlockAbility.ursan',
  unlock_felidian_ability: 'party.bonus.unlockAbility.felidian',
  unlock_mustelid_ability: 'party.bonus.unlockAbility.mustelid',
  unlock_leporian_ability: 'party.bonus.unlockAbility.leporian',
  unlock_cervin_ability: 'party.bonus.unlockAbility.cervin',
  unlock_murid_ability: 'party.bonus.unlockAbility.murid',
  unlock_procyonian_ability: 'party.bonus.unlockAbility.procyonian',
};


export function formatBonuses(bonuses: Bonus[], options?: { defenseMultiplierStyle?: 'raw' | 'friendly' }): string {
  const defenseMultiplierStyle = options?.defenseMultiplierStyle ?? 'raw';
  const parts: string[] = [];
  const percentFormatter = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
  const formatRatePercent = (value: number): string => percentFormatter.format(Math.round(value * 1000) / 10);
  const formatSigned = (value: number): string => `${value >= 0 ? '+' : ''}${value}`;
  for (const b of bonuses) {
    if (b.type.endsWith('_multiplier') && MULTIPLIER_LABEL_KEYS[b.type]) {
      parts.push(`${t(MULTIPLIER_LABEL_KEYS[b.type])}x${b.value}`);
    } else if (b.type === 'equip_slot') {
      parts.push(`${t('party.bonus.equip_slot')}${formatSigned(b.value)}`);
    } else if (b.type === 'vitality') {
      parts.push(t('party.bonusDisplay.vitality', { value: formatSigned(b.value) }));
    } else if (b.type === 'strength') {
      parts.push(t('party.bonusDisplay.strength', { value: formatSigned(b.value) }));
    } else if (b.type === 'intelligence') {
      parts.push(t('party.bonusDisplay.intelligence', { value: formatSigned(b.value) }));
    } else if (b.type === 'mind') {
      parts.push(t('party.bonusDisplay.mind', { value: formatSigned(b.value) }));
    } else if (b.type === 'grit' || b.type === 'equip_melee') {
      parts.push(t('party.bonus.equip_melee'));
    } else if (b.type === 'caster' || b.type === 'equip_magic') {
      parts.push(t('party.bonus.equip_magic'));
    } else if (b.type === 'penet') {
      parts.push(`${t('party.bonus.penet')}+${Math.round(b.value * 100)}`);
    } else if (b.type === 'pursuit' || b.type === 'equip_ranged') {
      parts.push(t('party.bonus.equip_ranged'));
    } else if (b.type === 'antagonism') {
      parts.push(t('party.bonusDisplay.antagonism'));
    } else if (b.type === 'accuracy') {
      const rounded = Math.round(b.value * 1000);
      parts.push(`${t('party.bonus.accuracy')}${rounded >= 0 ? '+' : ''}${rounded}`);
    } else if (b.type === 'evasion') {
      const rounded = Math.round(b.value * 1000);
      parts.push(t('party.bonusDisplay.evasion', { value: `${rounded >= 0 ? '+' : ''}${rounded}` }));
    } else if (b.type === 'deity_accuracy') {
      const rounded = Math.round(b.value * 1000);
      parts.push(t('party.bonusDisplay.deityAccuracy', { value: `${rounded >= 0 ? '+' : ''}${rounded}` }));
    } else if (b.type === 'deity_evasion') {
      const rounded = Math.round(b.value * 1000);
      parts.push(t('party.bonusDisplay.deityEvasion', { value: `${rounded >= 0 ? '+' : ''}${rounded}` }));
    } else if (b.type === 'deity_move_first') {
      parts.push(t('party.bonusDisplay.deityMoveFirst', { value: b.value }));
    } else if (b.type === 'melee_attack') {
      parts.push(t('party.bonusDisplay.meleeAttack', { value: Math.round(b.value * 100) }));
    } else if (b.type === 'ranged_attack') {
      parts.push(t('party.bonusDisplay.rangedAttack', { value: Math.round(b.value * 100) }));
    } else if (b.type === 'magical_attack') {
      parts.push(t('party.bonusDisplay.magicalAttack', { value: Math.round(b.value * 100) }));
    } else if (b.type === 'physical_attack') {
      parts.push(t('party.bonusDisplay.physicalAttack', { value: Math.round(b.value * 100) }));
    } else if (b.type === 'physical_defense') {
      parts.push(t('party.bonusDisplay.physicalDefense', { value: formatRatePercent(b.value) }));
    } else if (b.type === 'magical_defense') {
      parts.push(t('party.bonusDisplay.magicalDefense', { value: formatRatePercent(b.value) }));
    } else if (b.type === 'fire_offense') {
      parts.push(t('party.bonusDisplay.fireOffense', { value: Math.round(b.value > 1 ? b.value : b.value * 100) }));
    } else if (b.type === 'ice_offense') {
      parts.push(t('party.bonusDisplay.iceOffense', { value: Math.round(b.value > 1 ? b.value : b.value * 100) }));
    } else if (b.type === 'thunder_offense') {
      parts.push(t('party.bonusDisplay.thunderOffense', { value: Math.round(b.value > 1 ? b.value : b.value * 100) }));
    } else if (b.type === 'deity_physical_attack_xV') {
      parts.push(t('party.bonusDisplay.deityPhysicalAttackMultiplier', { value: formatMultiplierValue(b.value) }));
    } else if (b.type === 'deity_magical_attack_xV') {
      parts.push(t('party.bonusDisplay.deityMagicalAttackMultiplier', { value: formatMultiplierValue(b.value) }));
    } else if (b.type === 'physical_offense_multiplier_xV') {
      parts.push(t('party.bonusDisplay.physicalOffenseMultiplier', { value: formatDecimal(b.value, 2) }));
    } else if (b.type === 'magical_offense_multiplier_xV') {
      parts.push(t('party.bonusDisplay.magicalOffenseMultiplier', { value: formatDecimal(b.value, 2) }));
    } else if (b.type === 'deity_physical_defense_x2/3') {
      parts.push(t('party.bonusDisplay.deityPhysicalDefenseTwoThirds'));
    } else if (b.type === 'deity_physical_defense_xV' || b.type === 'deity_pysical_defense_xV') {
      parts.push(t('party.bonusDisplay.deityPhysicalDefenseMultiplier', { value: formatMultiplierValue(b.value) }));
    } else if (b.type === 'deity_magical_defense_x2/3') {
      parts.push(t('party.bonusDisplay.deityMagicalDefenseTwoThirds'));
    } else if (b.type === 'deity_magical_defense_xV') {
      parts.push(t('party.bonusDisplay.deityMagicalDefenseMultiplier', { value: formatMultiplierValue(b.value) }));
    } else if (b.type === 'physical_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? t('party.bonusDisplay.physicalDefenseMultiplier', { value: formatMultiplierAsFraction(b.value) })
          : t('party.bonusDisplay.physicalDefenseMultiplier', { value: formatDecimal(b.value, 2) })
      );
    } else if (b.type === 'magical_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? t('party.bonusDisplay.magicalDefenseMultiplier', { value: formatMultiplierAsFraction(b.value) })
          : t('party.bonusDisplay.magicalDefenseMultiplier', { value: formatDecimal(b.value, 2) })
      );
    } else if (b.type === 'fire_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? t('party.bonusDisplay.fireDefenseMultiplier', { value: formatMultiplierAsFraction(b.value) })
          : t('party.bonusDisplay.fireDefenseMultiplier', { value: formatDecimal(b.value, 2) })
      );
    } else if (b.type === 'ice_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? t('party.bonusDisplay.iceDefenseMultiplier', { value: formatMultiplierAsFraction(b.value) })
          : t('party.bonusDisplay.iceDefenseMultiplier', { value: formatDecimal(b.value, 2) })
      );
    } else if (b.type === 'thunder_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? t('party.bonusDisplay.thunderDefenseMultiplier', { value: formatMultiplierAsFraction(b.value) })
          : t('party.bonusDisplay.thunderDefenseMultiplier', { value: formatDecimal(b.value, 2) })
      );
    } else if (b.type === 'fire_defense') {
      parts.push(t('party.bonusDisplay.fireDefense', { value: Math.round(b.value) }));
    } else if (b.type === 'ice_defense') {
      parts.push(t('party.bonusDisplay.iceDefense', { value: Math.round(b.value) }));
    } else if (b.type === 'thunder_defense') {
      parts.push(t('party.bonusDisplay.thunderDefense', { value: Math.round(b.value) }));
    } else if (b.type === 'growth_xV') {
      parts.push(t('party.bonusDisplay.growthMultiplier', { value: formatMultiplierValue(b.value) }));
    } else if (b.type === 'ability' && b.abilityId) {
      const name = ABILITY_NAMES[b.abilityId] || b.abilityId;
      parts.push(`${name}Lv${b.abilityLevel || 1}`);
    } else if (b.type === 'ability_upgrade' && b.abilityId) {
      const name = ABILITY_NAMES[b.abilityId] || b.abilityId;
      parts.push(t('party.bonusDisplay.abilityUpgrade', { name, value: b.value }));
    } else if (b.type === 'unimplemented_bonus') {
      parts.push(t('party.bonusDisplay.parenthetical', { label: b.unimplementedLabel || t('party.bonusDisplay.unimplemented') }));
    } else if (b.type in UNLOCK_ABILITY_BONUS_LABEL_KEYS) {
      parts.push(t(UNLOCK_ABILITY_BONUS_LABEL_KEYS[b.type as BonusType] ?? 'party.bonus.unlockAbility.generic'));
    }
  }
  return parts.join(', ');
}

export function getBonusHelpDescription(bonus: Bonus): string | null {
  const multiplierKey = bonus.type.endsWith('_multiplier')
    ? bonus.type.replace(/_multiplier$/, '')
    : bonus.type;
  const multiplierKeyForTranslation = C_MULTIPLIER_HELP_DESCRIPTION_KEYS[multiplierKey];
  if (multiplierKeyForTranslation) {
    return t(multiplierKeyForTranslation, { value: formatMultiplierValue(bonus.value) });
  }

  if (bonus.type === 'equip_slot') return t('party.bonusHelp.equip_slot', { value: bonus.value });
  if (bonus.type === 'vitality') return t('party.bonusHelp.vitality', { value: bonus.value });
  if (bonus.type === 'strength') return t('party.bonusHelp.strength', { value: bonus.value });
  if (bonus.type === 'intelligence') return t('party.bonusHelp.intelligence', { value: bonus.value });
  if (bonus.type === 'mind') return t('party.bonusHelp.mind', { value: bonus.value });
  if (bonus.type === 'grit' || bonus.type === 'equip_melee') return t('party.bonusHelp.equipMelee');
  if (bonus.type === 'caster' || bonus.type === 'equip_magic') return t('party.bonusHelp.equipMagic');
  if (bonus.type === 'pursuit' || bonus.type === 'equip_ranged') return t('party.bonusHelp.equipRanged');
  if (bonus.type === 'penet') return t('combat.penetrationHelp', { percent: Math.round(bonus.value * 100) });
  if (bonus.type === 'antagonism') return t('party.bonusHelp.antagonism');
  if (bonus.type === 'accuracy' || bonus.type === 'deity_accuracy') return t('party.bonusHelp.accuracy');
  if (bonus.type === 'evasion' || bonus.type === 'deity_evasion') return t('party.bonusHelp.evasion');
  if (bonus.type === 'deity_move_first') return t('party.bonusHelp.deityMoveFirst', { value: bonus.value });
  if (bonus.type === 'melee_attack') return t('party.bonusHelp.meleeAttack');
  if (bonus.type === 'ranged_attack') return t('party.bonusHelp.rangedAttack');
  if (bonus.type === 'magical_attack') return t('party.bonusHelp.magicalAttack');
  if (bonus.type === 'physical_attack') return t('party.bonusHelp.physicalAttack');
  if (bonus.type === 'physical_defense') return t('party.bonusHelp.physicalDefense');
  if (bonus.type === 'magical_defense') return t('party.bonusHelp.magicalDefense');
  if (bonus.type === 'fire_offense') return t('party.bonusHelp.fireOffense');
  if (bonus.type === 'ice_offense') return t('party.bonusHelp.iceOffense');
  if (bonus.type === 'thunder_offense') return t('party.bonusHelp.thunderOffense');
  if (bonus.type === 'growth_xV') return t('party.bonusHelp.growthMultiplier', { value: formatMultiplierValue(bonus.value) });
  if (bonus.type === 'ability_upgrade' && bonus.abilityId) return t('party.bonusHelp.abilityUpgrade', { ability: ABILITY_NAMES[bonus.abilityId] || bonus.abilityId, value: bonus.value });

  if (bonus.type in UNLOCK_ABILITY_BONUS_LABEL_KEYS) {
    return t('party.bonusHelp.unlockRaceAbility');
  }

  return null;
}

export function buildInlineBonusEntry(prefix: string, classId: string | undefined, bonus: Bonus, index: number): {
  key: string;
  label: string;
  description: string | null;
} | null {
  const label = formatBonuses([bonus]);
  if (label.length === 0) return null;
  if (bonus.type === 'ability' && bonus.abilityId) {
    return {
      key: `${prefix}-${classId}-${bonus.abilityId}-${bonus.abilityLevel ?? 1}-${index}`,
      label: `${ABILITY_NAMES[bonus.abilityId] || bonus.abilityId}Lv${bonus.abilityLevel || 1}`,
      description: BONUS_ABILITY_GLOSSARY_ENTRY_BY_ABILITY_ID.has(bonus.abilityId as AbilityId)
        ? formatBonusAbilityHelpDescription(bonus.abilityId as AbilityId, bonus.abilityLevel || 1)
        : getAbilityDescription(bonus.abilityId as AbilityId, bonus.abilityLevel || 1),
    };
  }

  return {
    key: `${prefix}-${classId}-${index}`,
    label,
    description: getBonusHelpDescription(bonus),
  };
}

export function getEnemyTypeCBonusText(enemy: EnemyDef): string {
  const cBonuses = (enemy.bonuses ?? []).filter((bonus) => isEnemyTypeCBonusType(bonus.type));
  return formatBonuses(cBonuses, { defenseMultiplierStyle: 'friendly' });
}

export function getRaceBonusesForSelection(race: Race, unlockAbilityActive = false): Bonus[] {
  if (!race.unlockAbility || unlockAbilityActive) {
    return race.bonuses as Bonus[];
  }

  const normalizedUnlockAbilityId = race.unlockAbility.id
    .replace(/^a\./, '')
    .replace(/-/g, '_');

  return (race.bonuses as Bonus[]).filter(
    (bonus) => bonus.type !== 'ability' || bonus.abilityId !== normalizedUnlockAbilityId,
  );
}

export const PREDISPOSITION_SHORT_NAME_KEYS: Record<string, string> = {
  none: 'party.predispositionShort.none',
  aggressive: 'party.predispositionShort.aggressive',
  inquisitive: 'party.predispositionShort.inquisitive',
  amiable: 'party.predispositionShort.amiable',
  stubborn: 'party.predispositionShort.stubborn',
  evasive: 'party.predispositionShort.evasive',
  introspective: 'party.predispositionShort.introspective',
  devoted: 'party.predispositionShort.devoted',
  serene: 'party.predispositionShort.serene',
  nimble: 'party.predispositionShort.nimble',
  perceptive: 'party.predispositionShort.perceptive',
  precise: 'party.predispositionShort.precise',
  resourceful: 'party.predispositionShort.resourceful',
};

export const LINEAGE_SHORT_NAME_KEYS: Record<string, string> = {
  sandstorm: 'party.lineageShort.sandstorm',
  ashen_capital: 'party.lineageShort.ashenCapital',
  blaze_peak: 'party.lineageShort.blazePeak',
  abyssal_sea: 'party.lineageShort.abyssalSea',
  firmament: 'party.lineageShort.firmament',
  frozen_forest: 'party.lineageShort.frozenForest',
  utopia: 'party.lineageShort.utopia',
  machina: 'party.lineageShort.machina',
  adaptation: 'party.lineageShort.adaptation',
  fragment: 'party.lineageShort.fragment',
  windcross: 'party.lineageShort.windcross',
  oath: 'party.lineageShort.oath',
  unascertained: 'party.lineageShort.unascertained',
  pioneer: 'party.lineageShort.pioneer',
  almighty: 'party.lineageShort.almighty',
  hidden_grail: 'party.lineageShort.hiddenGrail',
  rowdy_orca_girl: 'party.lineageShort.rowdyOrcaGirl',
  meddlesome_fox: 'party.lineageShort.meddlesomeFox',
  crescent_jade: 'party.lineageShort.crescentJade',
  phantom_thief: 'party.lineageShort.phantomThief',
  flamebound_grove: 'party.lineageShort.flameboundGrove',
  apostate: 'party.lineageShort.apostate',
  incarnation: 'party.lineageShort.incarnation',
  'unexpected_prince(ss)': 'party.lineageShort.unexpectedPrince',
};

// Category name mapping
export const CATEGORY_NAME_KEYS: Record<string, string> = {
  sword: 'party.categoryName.sword',
  katana: 'party.categoryName.katana',
  archery: 'party.categoryName.archery',
  armor: 'party.categoryName.armor',
  gauntlet: 'party.categoryName.gauntlet',
  wand: 'party.categoryName.wand',
  robe: 'party.categoryName.robe',
  shield: 'party.categoryName.shield',
  bolt: 'party.categoryName.bolt',
  grimoire: 'party.categoryName.grimoire',
  catalyst: 'party.categoryName.catalyst',
  arrow: 'party.categoryName.arrow',
};

// Category groups for tabs
export const CATEGORY_GROUPS = [
  { id: 'durability', labelKey: 'party.category.durability', categories: ['armor', 'robe', 'shield'] },
  { id: 'melee', labelKey: 'party.category.melee', categories: ['sword', 'katana', 'gauntlet'] },
  { id: 'ranged', labelKey: 'party.category.ranged', categories: ['arrow', 'bolt', 'archery'] },
  { id: 'magic', labelKey: 'party.category.magic', categories: ['wand', 'grimoire', 'catalyst'] },
];

export const INVENTORY_CATEGORY_GROUPS = [
  { id: 'jewel', labelKey: 'party.category.jewel', categories: ['jewel'] },
  ...CATEGORY_GROUPS,
];

export type InventoryCategory = ItemCategory | 'jewel';

export const MELEE_CATEGORIES = new Set<ItemCategory>(['sword', 'katana', 'gauntlet']);
export const RANGED_CATEGORIES = new Set<ItemCategory>(['arrow', 'bolt', 'archery']);
export const MAGIC_CATEGORIES = new Set<ItemCategory>(['wand', 'grimoire', 'catalyst']);
export type CategoryGroup = typeof CATEGORY_GROUPS[number];

export function getCharacterCombatBonusLevels(character: Character): { melee: boolean; ranged: boolean; magic: boolean } {
  const race = RACES.find(r => r.id === character.raceId);
  const mainClass = CLASSES.find(c => c.id === character.mainClassId);
  const subClass = CLASSES.find(c => c.id === character.subClassId);
  const predisposition = PREDISPOSITIONS.find(p => p.id === character.predispositionId);
  const lineage = LINEAGES.find(l => l.id === character.lineageId);

  if (!race || !mainClass || !subClass || !predisposition || !lineage) {
    return { melee: false, ranged: false, magic: false };
  }

  const isMasterClass = character.mainClassId === character.subClassId;
  const bonusSources = [
    race.bonuses,
    mainClass.mainSubBonuses,
    isMasterClass ? mainClass.masterBonuses : mainClass.mainBonuses,
    ...(isMasterClass ? [] : [subClass.mainSubBonuses]),
    predisposition.bonuses,
    lineage.bonuses,
  ];

  let melee = false;
  let ranged = false;
  let magic = false;
  for (const bonuses of bonusSources) {
    for (const bonus of bonuses) {
      if (bonus.type === 'grit' || bonus.type === 'equip_melee') {
        melee = true;
      } else if (bonus.type === 'caster' || bonus.type === 'equip_magic') {
        magic = true;
      } else if (bonus.type === 'pursuit' || bonus.type === 'equip_ranged') {
        ranged = true;
      }
    }
  }

  return { melee, ranged, magic };
}

export function getAvailableCategoryGroups(character: Character): CategoryGroup[] {
  const { melee, ranged, magic } = getCharacterCombatBonusLevels(character);
  return CATEGORY_GROUPS.filter((group) => {
    if (group.id === 'durability') return true;
    if (group.id === 'melee') return melee;
    if (group.id === 'ranged') return ranged;
    if (group.id === 'magic') return magic;
    return false;
  });
}

// Category priority for equipment slot sorting (lower index = higher priority)
export const CATEGORY_PRIORITY: Record<string, number> = {
  armor: 0, robe: 1, shield: 2, sword: 3, katana: 4,
  gauntlet: 5, arrow: 6, bolt: 7, archery: 8, wand: 9,
  grimoire: 10, catalyst: 11,
};

// Sort items by descending priority: Item ID (higher first), SuperRare (higher first), Enhancement (higher first)
export function sortInventoryItems(items: [string, InventoryVariant][]): [string, InventoryVariant][] {
  return [...items].sort((a, b) => {
    const itemA = a[1].item;
    const itemB = b[1].item;
    // 1. Higher-tier base items first (descending by ID)
    if (itemA.id !== itemB.id) return itemB.id - itemA.id;
    // 2. SuperRare titles prioritized within same ID (descending)
    if (itemA.superRare !== itemB.superRare) return itemB.superRare - itemA.superRare;
    // 3. Higher enhancement tiers first (descending)
    return itemB.enhancement - itemA.enhancement;
  });
}


export function getInitialGameMode(): GameMode {
  if (typeof window === 'undefined') return 'm.kemo';
  if (getEnvironmentId() === 'beta') return 'm.laika';

  try {
    const savedMode = localStorage.getItem(GAME_MODE_STORAGE_KEY);
    if (isGameMode(savedMode)) {
      return savedMode;
    }
  } catch (error) {
    console.error('Failed to load initial game mode:', error);
  }

  return 'm.kemo';
}

export function getInitialAutoEquipmentEnabled(): boolean {
  if (typeof window === 'undefined') return true;

  try {
    const saved = localStorage.getItem(AUTO_EQUIPMENT_STORAGE_KEY);
    if (saved === 'on') return true;
    if (saved === 'off') return false;
  } catch (error) {
    console.error('Failed to load initial auto equipment setting:', error);
  }

  return true;
}

export function getInitialDarkModeSetting(): DarkModeSetting {
  if (typeof window === 'undefined') return 'system';

  try {
    const saved = localStorage.getItem(DARK_MODE_STORAGE_KEY);
    if (saved === 'off' || saved === 'on' || saved === 'system') {
      return saved;
    }
  } catch (error) {
    console.error('Failed to load initial dark mode setting:', error);
  }

  return 'system';
}

export type AutoEquipmentMode = 0 | 1 | 2;

export type AutoEquipmentRunSummary = {
  processedCharacterIds: Array<number | string>;
  unequippedCount: number;
  equippedCount: number;
  upgradedCount: number;
  jewelAssignmentCount: number;
};

export type AutoEquipmentRunner = (
  targetPartyIndexes?: number[],
  targetCharacterIds?: Array<number | string>,
  options?: { suppressNotifications?: boolean },
) => AutoEquipmentRunSummary;

export const getAutoEquipmentModeLabel = (mode: AutoEquipmentMode): string => t(`party.equipment.autoMode.${mode}`);
export const getAutoEquipmentHelpLines = (): string[] => [0, 1, 2, 3].map((index) => t(`party.equipment.autoHelp.${index}`));

export type AutoEquipmentCombatStyle = 'ranged' | 'magic' | 'melee';
export type AutoEquipmentTargetCategory = ItemCategory | 'i.weapon' | 'i.NoA';

export function normalizeAutoEquipmentMode(mode: Character['autoEquipmentMode']): AutoEquipmentMode {
  if (mode === 0 || mode === 2) return mode;
  return 1;
}

// SpecRef: 7.1.1.2 | Equipping into empty slots | class.duelist, class.sword-saint
export const AUTO_EQUIPMENT_PRIORITY_BY_CLASS: Record<Character['mainClassId'], AutoEquipmentTargetCategory[]> = {
  guardian: ['armor', 'i.weapon', 'robe', 'i.NoA', 'i.weapon', 'shield', 'armor', 'robe', 'i.weapon', 'shield', 'i.weapon', 'i.NoA', 'i.weapon', 'armor', 'robe'],
  duelist: ['i.weapon', 'i.NoA', 'armor', 'robe', 'i.weapon', 'armor', 'i.NoA', 'i.weapon', 'armor', 'robe', 'i.weapon', 'i.NoA', 'i.weapon', 'armor', 'robe'],
  samurai: ['i.weapon', 'i.NoA', 'armor', 'robe', 'i.weapon', 'i.NoA', 'i.weapon', 'i.weapon', 'armor', 'robe', 'i.NoA', 'i.weapon', 'armor', 'robe', 'i.NoA', 'i.weapon', 'armor', 'robe'],
  'sword-saint': ['i.weapon', 'i.NoA', 'armor', 'robe', 'i.weapon', 'armor', 'i.NoA', 'i.weapon', 'armor', 'robe', 'i.weapon', 'i.NoA', 'i.weapon', 'armor', 'robe'],
  striker: ['i.weapon', 'i.NoA', 'armor', 'robe', 'i.weapon', 'arrow', 'i.NoA', 'i.weapon', 'armor', 'robe', 'i.weapon', 'i.NoA', 'i.weapon', 'armor', 'robe', 'i.NoA'],
  ninja: ['i.weapon', 'i.NoA', 'armor', 'robe', 'i.weapon', 'arrow', 'i.NoA', 'i.weapon', 'armor', 'robe', 'i.weapon', 'i.NoA', 'i.weapon', 'armor', 'robe', 'i.NoA'],
  lord: ['i.weapon', 'armor', 'robe', 'i.weapon', 'i.NoA', 'i.weapon', 'armor', 'robe', 'i.weapon', 'shield', 'i.weapon', 'i.NoA', 'i.weapon', 'armor', 'robe'],
  ranger: ['i.weapon', 'i.NoA', 'armor', 'robe', 'i.weapon', 'arrow', 'i.NoA', 'i.weapon', 'armor', 'robe', 'i.weapon', 'i.NoA', 'i.weapon', 'armor', 'robe', 'i.NoA'],
  wizard: ['i.weapon', 'i.NoA', 'armor', 'robe', 'i.weapon', 'i.weapon', 'i.NoA', 'i.weapon', 'i.weapon', 'robe', 'armor', 'i.NoA', 'i.weapon', 'i.weapon', 'robe'],
  sage: ['i.weapon', 'i.NoA', 'armor', 'robe', 'i.weapon', 'i.weapon', 'i.NoA', 'i.weapon', 'i.weapon', 'robe', 'i.NoA', 'i.weapon', 'armor', 'i.NoA', 'i.weapon'],
  alchemist: ['i.weapon', 'i.NoA', 'armor', 'robe', 'i.weapon', 'i.weapon', 'i.NoA', 'i.weapon', 'i.weapon', 'robe', 'armor', 'i.NoA', 'i.weapon', 'i.weapon', 'robe'],
  pilgrim: ['i.weapon', 'armor', 'robe', 'i.weapon', 'i.NoA', 'i.weapon', 'armor', 'robe', 'i.weapon', 'shield', 'i.weapon', 'i.NoA', 'i.weapon', 'armor', 'robe'],
};

export function getNextMissingAutoEquipmentCategory(
  priorities: AutoEquipmentTargetCategory[],
  equippedCategoryCounts: Partial<Record<ItemCategory, number>>,
  resolveGroupCount: (targetCategory: AutoEquipmentTargetCategory) => number,
  skippedCategories: Set<AutoEquipmentTargetCategory>,
): AutoEquipmentTargetCategory | null {
  const requiredCounts: Partial<Record<AutoEquipmentTargetCategory, number>> = {};

  for (const category of priorities) {
    if (skippedCategories.has(category)) continue;
    requiredCounts[category] = (requiredCounts[category] ?? 0) + 1;
    const equippedCount = category === 'i.weapon' || category === 'i.NoA'
      ? resolveGroupCount(category)
      : (equippedCategoryCounts[category as ItemCategory] ?? 0);
    if (equippedCount < (requiredCounts[category] ?? 0)) {
      return category;
    }
  }

  return null;
}
import { gameplayRandom } from '../../game/gameplayRandom';
