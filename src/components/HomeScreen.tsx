import { Fragment, useState, useEffect, useRef, useCallback, useMemo, type ChangeEvent, type CSSProperties, type Dispatch, type MouseEvent, type SetStateAction, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { GameState, GameBags, Item, Character, InventoryRecord, InventoryVariant, NotificationStyle, NotificationCategory, EnemyDef, Dungeon, Party, DiaryRarityThreshold, DiarySideQuestThreshold, DiaryDefeatNotificationMode, DiarySettings, DiaryLog, ExpeditionLog, ExpeditionLogEntry, ExpeditionDepthLimit, ExpeditionDestinationMode, ItemCategory, Bonus, BonusType, ComputedCharacterStats, ElementalOffense, RaceId, Race, GameNotification, JewelKey, getVariantKey, MAX_LEVEL, AbilityId, TerrainEffectKey, type Ability, type BattleLogEntry } from '../types';
import { computeCharacterHpContribution, computePartyStats } from '../game/partyComputation';
import {
  DUNGEONS,
  getEffectiveEnemyLevel,
  getEffectiveEnemyMultipliers,
  getEffectiveExpeditionTier,
  getLocalizedExpeditionFloorConcept,
} from '../data/dungeons';
import { RACES } from '../data/races';
import { CLASSES, CLASS_SHORT_NAMES, getClassShortName } from '../data/classes';
import { PREDISPOSITIONS } from '../data/predispositions';
import { LINEAGES } from '../data/lineages';
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES, ITEMS, getSuperRareBonuses } from '../data/items';
import { GOD_ENEMY_PROFILES, GOD_MYTHIC_DROPS, getGodProfileForDungeon } from '../data/dropTables';
import { ABILITY_BASE_NAMES } from '../data/abilityNames';
import { getMasterItemCategoriesByRarity } from '../data/masterSpecData';
import {
  LOCALIZED_BONUS_ABILITY_GLOSSARY_ENTRIES,
  BONUS_ABILITY_GLOSSARY_ENTRY_BY_ABILITY_ID,
  type BonusAbilityGlossarySubcategoryId,
} from '../data/bonusAbilityGlossary';
import { GLOSSARY_SECTIONS } from '../data/glossary';
import { getItemCoreConceptValue, getItemDisplayName, getLocalizedEnhancementTitle, getLocalizedItemName, getLocalizedSuperRareTitle } from '../game/gameState';
import { ENEMIES, getEnemyDropCandidates } from '../data/enemies';
import { getEncounterEnemyWithScaling, isEnemyTypeCBonusType } from '../game/enemyScaling';
import { buildGodRuntimeEnemy } from '../game/godEnemy';
import { getDifficultyOffsetItemChanceTickets, getDifficultyOffsetMax, getDifficultyOffsetSuperRareChanceTickets, normalizeDifficultyOffset } from '../game/difficultyOffset';
import { DEITY_OPTIONS, getDeityEffectDescription, getDeityKey, getDeityRank, getNextRankDonationRequirement, getDeityStateDurationMultiplier, isNoFaithDeity, normalizeDeityName } from '../game/deity';
import { getXpToNextLevel } from '../game/partyLevel';
import { createEnvironmentStorageKey, getEnvLabel, getEnvironmentId } from '../game/environment';
import { DIARY_LOG_RETENTION_LIMIT } from '../game/diary';
import { getShopItemPrice, getShopHourKey, getShopLineupSeed, getShopStockKey, getShopRefreshPrice, getNextShopRefreshDate, countElapsedShopRefreshes } from '../game/shop';
import { calculateItemSellPrice } from '../game/pricing';
import { NotificationToast } from './NotificationToast';
import { getBaseMultiplier } from '../game/baseMultiplier';
import { formatEnemyDefName, getEnemyTypeShortName } from '../game/enemyDisplay';
import { computeCharacterStats, getAbilityDescription, getUnlockedRaceAbilitiesFromBonuses } from '../game/characterComputation';
import { hydrateGameState, serializeGameState } from '../game/saveCodec';
import { createCommonRewardBag, createCommonSuperRareBag, createMythicRareRewardBag, createRareSuperRareBag, createSideQuestBag, createSleepinessPartyBag, createUncommonRewardBag, getBagEntryTickets, getBagTicketTotal, normalizeSleepinessPartyBag } from '../game/bags';
import { JEWELS_BY_ITEM_CATEGORY, JEWEL_DEFS, getJewelCBonusValue, getJewelDRankValue, getJewelDisplayName, getJewelNameByRank, getJewelOwnedCount, getJewelShortLabel, planAutoJewelAssignmentsForCharacter } from '../game/jewel';
import { replaceCharacterEquipment } from '../game/equipment';
import { resolveMagicProfile } from '../game/magic';
import { decodePersistedState, encodePersistedState } from '../game/storageCompression';
import { DebugSettings, getDebugSettings, saveDebugSettings, getTimeSpeedScale, isUnlimitedTimeSpeed } from '../game/debugSettings';
import { buildColosseumEnemy, ColosseumEnemySettings, getColosseumEnemySettings, normalizeColosseumEnemySettings, saveColosseumEnemySettings } from '../game/colosseum';
import { buildAggregatedLifeDrainAction } from '../game/battleNarration';
import { Language, SUPPORTED_LANGUAGES, setLanguage, t } from '../i18n';
import { formatInstantExpeditionChargeDisplay, getInstantExpeditionChargeState } from '../game/instantExpedition';
import { DEVELOPER_NEWS_ITEMS, getDeveloperNewsContent } from '../data/developerNews';
import {
  ELITE_GATE_REQUIREMENTS,
  ENTRY_GATE_REQUIRED,
  BOSS_GATE_REQUIRED,
  getGodsBattleRequired,
  getEliteGateKey,
  getBossGateKey,
  getLootCollectionCount,
  hasDefeatedDungeonBoss,
  isDungeonEntryUnlocked,
  isLootGateUnlocked,
} from '../game/lootGate';

function resolvePublicAssetPath(path?: string): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/(public\/)?/, '')}`;
}

const UNIQUE_PARTY_MEMBER_IMAGE_BY_LINEAGE: Readonly<Partial<Record<string, string>>> = {
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

const escapeExportHtml = (value: string): string => (
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
);

// SpecRef: 8.1.2 | Header | Attached File
// SpecRef: 8.6 | UI_SETTING | フィードバック
function buildStatusTableHtmlFile(rows: string[][], fileName: string, title = 'Status table'): File {
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

const CHARACTER_CHIBI_IMAGE_MODULES = import.meta.glob('/public/chibi/*.png', { eager: true });
const CHARACTER_IMAGE_MODULES = import.meta.glob('/public/character/*.png', { eager: true });

// SpecRef: 8.2.4 | Equipment management | Image of inventory pane transaction at equipment management
// SpecRef: 8.4.2 | Inventory(所持品) | Item list
function getInventoryOwnerCharacterImageSrc(character: Character, partyId: number): string | null {
  const uniqueFileName = character.isUnique
    ? UNIQUE_PARTY_MEMBER_IMAGE_BY_LINEAGE[character.lineageId]
    : undefined;
  if (uniqueFileName) {
    const chibiFileName = `C_${uniqueFileName}`;
    if (CHARACTER_CHIBI_IMAGE_MODULES[`/public/chibi/${chibiFileName}`]) {
      return `${import.meta.env.BASE_URL}chibi/${chibiFileName}`;
    }
    if (CHARACTER_IMAGE_MODULES[`/public/character/${uniqueFileName}`]) {
      return `${import.meta.env.BASE_URL}character/${uniqueFileName}`;
    }
    return null;
  }

  const race = RACES.find((entry) => entry.id === character.raceId);
  if (!race) return null;
  const genderLabel = character.gender === 'male' ? 'Male' : 'Female';
  const partyRaceGenderFileName = `${partyId}_${race.englishName}_${genderLabel}.png`;
  if (CHARACTER_CHIBI_IMAGE_MODULES[`/public/chibi/C_${partyRaceGenderFileName}`]) {
    return `${import.meta.env.BASE_URL}chibi/C_${partyRaceGenderFileName}`;
  }
  if (CHARACTER_IMAGE_MODULES[`/public/character/${partyRaceGenderFileName}`]) {
    return `${import.meta.env.BASE_URL}character/${partyRaceGenderFileName}`;
  }
  return null;
}

interface HomeScreenProps {
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
    toggleEquipmentLock: (characterId: number, slotIndex: number) => void;
    attachJewel: (characterId: number, slotIndex: number, jewelKey: JewelKey, rank: number, partyIndex?: number) => void;
    updateCharacter: (characterId: number, updates: Partial<Character>) => void;
    reorderPartyCharacter: (fromIndex: number, toIndex: number) => void;
    sellStack: (variantKey: string) => void;
    sellAllOwned: () => void;
    buyShopItem: (itemId: number, stockItemKey: string) => void;
    buyDebugStoreItem: (itemId: number) => void;
    refreshShopLineup: () => void;
    setVariantStatus: (variantKey: string, status: 'notown') => void;
    markItemsSeen: () => void;
    markDiaryLogSeen: (logId: string) => void;
    markAllDiaryLogsSeen: () => void;
    markDeveloperNewsRead: (itemIds: string[]) => void;
    updateDiarySettings: (partyIndex: number, settings: Partial<DiarySettings>) => void;
    setJewelAutoEquipPriorityParty: (partyId: number | null) => void;
    simulateAfk: (elapsedMs: number, isAutoRepeatEnabled: boolean, gameMode?: GameMode, simulatedEndAt?: number, cycleDurationScale?: number) => void;
    resetGame: () => void;
    importGameState: (state: GameState) => void;
    resetCommonBags: () => void;
    resetUniqueBags: () => void;
    resetCommonSuperRareBag: () => void;
    resetRareSuperRareBag: () => void;
    resetSideQuestBag: () => void;
    setLanguage: (language: Language) => void;
    unlockPartySlot: () => void;
    addNotification: (
      message: string,
      style?: NotificationStyle,
      category?: NotificationCategory,
      isPositive?: boolean,
      options?: { rarity?: ItemRarity; isSuperRareItem?: boolean }
    ) => void;
    addStatNotifications: (changes: Array<{ message: string; isPositive: boolean }>) => void;
  };
}

type Tab = 'party' | 'expedition' | 'base' | 'diary' | 'setting';
type WideModeSecondaryTab = Exclude<Tab, 'expedition'>;
type BaseSubTab = 'inventory' | 'shop' | 'debugStore' | 'workshop' | 'altar';

type UiIconKey = 'fire' | 'ice' | 'thunder' | 'melee' | 'ranged' | 'magic' | 'unlock' | 'lock';

const UI_ICON_PATHS: Record<UiIconKey, string> = {
  fire: `${import.meta.env.BASE_URL}icons/fire.png`,
  ice: `${import.meta.env.BASE_URL}icons/ice.png`,
  thunder: `${import.meta.env.BASE_URL}icons/thunder.png`,
  melee: `${import.meta.env.BASE_URL}icons/melee.png`,
  ranged: `${import.meta.env.BASE_URL}icons/ranged.png`,
  magic: `${import.meta.env.BASE_URL}icons/magic.png`,
  unlock: `${import.meta.env.BASE_URL}icons/unlock.png`,
  lock: `${import.meta.env.BASE_URL}icons/lock.png`,
};

const UI_EMOJI_ICON_MAP: Record<string, UiIconKey> = {
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

function renderUiIcon(iconKey: UiIconKey, className: string = 'sub-theme-emoji-icon'): JSX.Element {
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

function renderTextWithUiIcons(text: string, classNameResolver?: (iconKey: UiIconKey) => string): ReactNode {
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

const ELEMENTAL_RESISTANCE_ORDER: ReadonlyArray<{ key: 'fire' | 'ice' | 'thunder'; icon: UiIconKey }> = [
  { key: 'fire', icon: 'fire' },
  { key: 'ice', icon: 'ice' },
  { key: 'thunder', icon: 'thunder' },
];

const renderElementalResistanceInline = (
  multipliers: Record<'fire' | 'ice' | 'thunder', number>
): JSX.Element => (
  <>
    {t('home.elementalResistance.label')}: {' '}
    {ELEMENTAL_RESISTANCE_ORDER.map(({ key, icon }, index) => (
      <Fragment key={key}>
        {index > 0 ? ',' : ''}
        {renderUiIcon(icon)}
        {Math.round(Math.max(0.01, multipliers[key] ?? 1) * 100)}%
      </Fragment>
    ))}
  </>
);


type PartyCycleState = 'rest' | 'sell' | 'free_action' | 'sound_sleep' | 'pray' | 'idle' | 'move' | 'explore' | 'return' | 'reactivate';

const PARTY_EXPEDITION_SPLIT_MIN_WIDTH = 700;
const TAB_PANEL_WIDTH_PX = 500;
const WIDE_MODE_DEFAULT_SECONDARY_TAB: WideModeSecondaryTab = 'party';
const MAIN_TAB_ORDER: readonly Tab[] = ['expedition', 'party', 'base', 'diary', 'setting'];
// SpecRef: 8.1 | UI_FOUNDATIONS | Style: Compact, simple, iOS-like
const IOS_GLASS_BUTTON_CLASS =
  'ios-glass-button rounded-xl';
// SpecRef: 8.1 | UI_FOUNDATIONS | Style: Compact, simple, iOS-like
const IOS_GLASS_TAB_CLASS =
  'ios-glass-button rounded-xl';
// SpecRef: 8.1 | UI_FOUNDATIONS | Navigation tabs
const IOS_GLASS_TOP_TAB_CLASS =
  'ios-glass-button ios-glass-top-tab rounded-2xl';
// SpecRef: 8.1 | UI_FOUNDATIONS | Style: Compact, simple, iOS-like
const IOS_GLASS_SLIDER_CLASS =
  'ios-glass-slider';

function getSliderProgressStyle(value: number, min: number, max: number): CSSProperties {
  const clampedMax = Math.max(min, max);
  const clampedValue = Math.min(clampedMax, Math.max(min, value));
  const progress = clampedMax === min ? 0 : ((clampedValue - min) / (clampedMax - min)) * 100;
  return { '--slider-progress': `${progress}%` } as CSSProperties;
}

const TERRAIN_EFFECT_GLOSSARY_SECTION = GLOSSARY_SECTIONS.find((section) => section.heading === '1.1.10 t. terrain effects');
const TERRAIN_EFFECT_OPTIONS = [
  { key: 'none', label: 'none', description: t('home.terrainEffect.noneDescription') },
  ...(TERRAIN_EFFECT_GLOSSARY_SECTION?.entries ?? []),
];
const TERRAIN_EFFECT_LABELS = TERRAIN_EFFECT_OPTIONS.reduce<Record<string, string>>((acc, entry) => {
  acc[entry.key] = entry.label;
  return acc;
}, {});

const PARTY_CYCLE_STATE_LABELS: Record<PartyCycleState, string> = {
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

const BONUS_ABILITY_PHASE_DISPLAY_LABELS: Record<'LONG' | 'MID' | 'CLOSE' | 'END', string> = {
  LONG: t('combat.ranged'),
  MID: t('combat.magic'),
  CLOSE: t('combat.melee'),
  END: t('common.end'),
};

function formatBonusAbilityPhaseDisplay(value: string): string {
  return value.replace(/LONG|MID|CLOSE|END/g, (phase) => BONUS_ABILITY_PHASE_DISPLAY_LABELS[phase as 'LONG' | 'MID' | 'CLOSE' | 'END']);
}

function isBonusAbilityTimingToken(token: string): boolean {
  return /^(?:LONG|MID|CLOSE|END)\d(?:\/(?:LONG|MID|CLOSE|END)\d)*$/.test(token);
}

function parseBonusAbilityLevelScale(levelScale: string): { timing: string | null; value: string | null } {
  const scaleContent = levelScale.replace(/^Lv\d+:\s*/, '').trim();
  if (scaleContent.length === 0 || scaleContent === '-') {
    return { timing: null, value: null };
  }

  const separatorIndex = scaleContent.indexOf('・');
  if (separatorIndex < 0) {
    const isTimingOnly = /^(LONG|MID|CLOSE|END)\d/.test(scaleContent);
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

function formatBonusAbilityHelpDescription(abilityId: AbilityId, level: number): string {
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
    const normalizedPercentValue = normalizedValue.endsWith('%') ? normalizedValue.slice(0, -1) : normalizedValue;
    const signedPercentValue = normalizedValue.startsWith('+') || normalizedValue.startsWith('-') ? normalizedValue : `+${normalizedValue}`;
    const negativePercentValue = normalizedValue.startsWith('-') ? normalizedValue : `-${normalizedValue.replace(/^\+/, '')}`;
    description = description
      .replace(/\+N%/g, signedPercentValue)
      .replace(/-N%/g, negativePercentValue)
      .replace(/N%/g, normalizedValue)
      .replace(/xN/g, value.startsWith('x') ? value : `x${value}`)
      .replace(/N/g, normalizedPercentValue);
  }

  return description
    .replace(new RegExp(`${escapeRegExp(t('home.grammar.objectParticle'))}\\s+x`, 'g'), t('home.grammar.objectParticleX'))
    .replace(new RegExp(`${escapeRegExp(t('home.grammar.subjectParticle'))}\\s+x`, 'g'), t('home.grammar.subjectParticleX'))
    .replace(new RegExp(`${escapeRegExp(t('home.grammar.possessiveParticle'))}\\s+x`, 'g'), t('home.grammar.possessiveParticleX'));
}

const LEGACY_PARTY_CYCLE_STATE_MAP: Record<string, PartyCycleState> = {
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

function toPartyCycleState(value: unknown): PartyCycleState {
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

function getPartyCycleStateLabel(state: PartyCycleState): string {
  return t(PARTY_CYCLE_STATE_LABELS[state]);
}

interface PartyCycleRuntime {
  state: PartyCycleState;
  stateStartedAt: number;
  durationMs: number;
  restInitialTotalSteps?: number;
  sortieSourceState?: 'rest' | 'free_action' | 'sleep' | 'return';
  sortieEmbezzlementGold?: number;
  isCurrentExpeditionGodsBattle?: boolean;
  wasLowHpAtRestStart?: boolean;
}


function rollPercentInclusive(min: number, max: number): number {
  return min + Math.random() * (max - min + Number.EPSILON);
}

const PARTY_CYCLE_TICK_MS = 100;
const BASE_STEP_DURATION_MS = 15000;
const EXPLORING_PROGRESS_STEP_MS = BASE_STEP_DURATION_MS;
const EXPLORING_PROGRESS_TOTAL_STEPS = 24;
const REST_HEAL_MIN_HP = 400;
const REST_HEAL_MAX_HP_RATIO = 0.06;
const FREE_ACTION_STEP_COUNT = 30;
const SOUND_SLEEP_STEP_COUNT = 16;
const PRAY_STEP_COUNT = 4;
const STEP_BASED_STATES: ReadonlySet<PartyCycleState> = new Set(['rest', 'sell', 'explore']);
const APPROX_CYCLE_STEP_COUNT = 30;
const CHUNK_CYCLE_COUNT = 12;
const TIME_BASED_SIDE_QUEST_TYPES = new Set(['q.exercise', 'q.healing', 'q.AFK']);
const AFK_RUNTIME_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-afk-runtime');
const AFK_MAX_ELAPSED_MS = 1800 * 60 * 1000;
const REDUCER_CATCHUP_THRESHOLD_MS = 15000;


function getElapsedWholeSeconds(carriedMs: number, elapsedMs: number): { gainedSeconds: number; remainderMs: number } {
  const totalMs = Math.max(0, carriedMs + elapsedMs);
  return {
    gainedSeconds: Math.floor(totalMs / 1000),
    remainderMs: totalMs % 1000,
  };
}

// SpecRef: 5.1 | PROGRESS | state.rest
function getRestInitialTotalSteps(currentHp: number, maxHp: number): number {
  const normalizedMaxHp = Math.max(1, Math.floor(maxHp));
  const normalizedCurrentHp = Math.max(0, Math.floor(currentHp));
  const missingHp = Math.max(0, normalizedMaxHp - normalizedCurrentHp);
  if (missingHp <= 0) return 1;
  const healPerStep = Math.max(REST_HEAL_MIN_HP, Math.ceil(normalizedMaxHp * REST_HEAL_MAX_HP_RATIO));
  return Math.max(1, Math.ceil(missingHp / healPerStep));
}

// SpecRef: 5.1.1 | Party State Machine | state.sell
function getAutoSellStepCount(party: Party): number {
  const autoSellItemCount = party.lastExpeditionLog?.autoSellItems?.length
    || party.lastExpeditionLog?.autoSellCount
    || 1;
  return Math.max(1, autoSellItemCount);
}

const CHROME_CONTENT_PADDING_CLASS = 'pt-[calc(74px+env(safe-area-inset-top))] pb-[calc(40px+env(safe-area-inset-bottom))]';
type GameMode = 'm.kemo' | 'm.luna' | 'm.laika';
type DarkModeSetting = 'off' | 'on' | 'system';
const GAME_MODE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-game-mode');
const AUTO_EQUIPMENT_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-auto-equipment');
const EXPEDITION_STATS_DISPLAY_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-expedition-stats-display');
const DARK_MODE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-dark-mode');
const THEME_SYNC_EVENT = 'kemo-expedition-theme-sync';
const APP_VERSION = `v${__APP_VERSION__}`;


function getExpeditionTierDurationFactor(expTier: number): number {
  return Math.max(0, expTier);
}

function normalizeBattleLogNote(note?: string): string | undefined {
  if (!note) return note;
  return note.replace(t('home.battleLog.legacyPartyAttackPower'), t('home.battleLog.partyPhysicalAttackPower'));
}

// SpecRef: 6.1.1.1 | START phase | floor.terrain.*
function getBattleLogPhaseLabel(log: BattleLogEntry, isPhaseAction: boolean, isTriggeredLog: boolean, isResurrectLog: boolean, isStealthEffectLog: boolean, isCounterNegationEffectLog: boolean): string {
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

function getBattleLogNoteClass(noteTone?: 'default' | 'sub' | 'muted'): string {
  if (noteTone === 'sub') return 'text-sub';
  return 'text-gray-400';
}

function renderBattleLogNote(note: string | undefined, noteTone?: 'default' | 'sub' | 'muted'): JSX.Element | null {
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

const RACE_ICON_SOURCES = RACES
  .map((race) => race.icon)
  .filter((icon): icon is string => Boolean(icon))
  .map((icon) => (
    icon.startsWith('/')
      ? `${import.meta.env.BASE_URL}${icon.replace(/^\//, '')}`
      : icon
  ));

function preloadRaceIcons(): void {
  RACE_ICON_SOURCES.forEach((iconSrc) => {
    const image = new Image();
    image.src = iconSrc;
  });
}

function getExplorationDurationMs(entryCount?: number, durationMultiplier: number = 1, durationScale: number = 1): number {
  const exploredSteps = Math.max(1, Math.min(EXPLORING_PROGRESS_TOTAL_STEPS, entryCount ?? EXPLORING_PROGRESS_TOTAL_STEPS));
  return Math.max(100, Math.ceil(exploredSteps * EXPLORING_PROGRESS_STEP_MS * durationMultiplier * durationScale));
}

function getExplorationVisibleRoomCount(elapsedMs: number, durationMs: number, totalEntries: number): number {
  if (totalEntries <= 0) return 0;
  return Math.min(
    totalEntries,
    Math.max(0, Math.ceil((elapsedMs / Math.max(1, durationMs)) * totalEntries)),
  );
}

function getExpeditionOutcomeLabel(outcome: 'Clear' | 'Escape' | 'Defeat' | 'Retreat' | string): string {
  if (outcome === 'Clear' || outcome === 'victory') return t('expedition.outcome.clear');
  if (outcome === 'Escape' || outcome === 'escape' || outcome === 'return') return t('expedition.outcome.return');
  if (outcome === 'Defeat' || outcome === 'defeat') return t('expedition.outcome.defeat');
  return t('expedition.outcome.retreat');
}

function getReturnedExpeditionOutcome(log: ExpeditionLog | null | undefined): 'Defeat' | 'Wounded_Retreat' | 'Draw_Retreat' | 'Turned_Back' | 'Clear' | undefined {
  if (!log) return undefined;
  if (log.finalOutcome === 'Defeat') return 'Defeat';
  if (log.finalOutcome === 'Escape') return 'Turned_Back';
  if (log.entries.length > 0 && log.entries[log.entries.length - 1].outcome === 'draw') return 'Draw_Retreat';
  if (log.finalOutcome === 'Retreat') return 'Wounded_Retreat';
  return 'Clear';
}

function getEffectiveAccuracyBonus(accuracyBonus: number, abilities: ComputedCharacterStats['abilities']): number {
  const focusLevel = abilities.find(a => a.id === 'focus')?.level ?? 0;
  if (focusLevel <= 0) return accuracyBonus;
  const focusMultiplier = focusLevel >= 2 ? 1.3 : 1.2;
  return Math.ceil((accuracyBonus * focusMultiplier + Number.EPSILON) * 1000) / 1000;
}

function renderEnemyNameWithMutedClass(enemyName: string) {
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

function getBestiaryEnemyFromLogEntry(entry: ExpeditionLogEntry): EnemyDef | null {
  if (entry.enemySnapshot) return entry.enemySnapshot;
  if (typeof entry.enemyId === 'number') {
    return ENEMIES.find((enemy) => enemy.id === entry.enemyId) ?? null;
  }

  const normalizedEnemyName = entry.enemyName.replace(new RegExp(`\\s+\\((ELITE|BOSS|${escapeRegExp(t('home.godsBattle.label'))})\\)\\s*$`, 'u'), '').trim();
  if (!normalizedEnemyName) return null;
  return ENEMIES.find((enemy) => formatEnemyDefName(enemy) === normalizedEnemyName) ?? null;
}

function getEnemyLogBackgroundImagePath(enemy?: EnemyDef): string | null {
  // SpecRef: 6.1.7 | Logs | Enemy image
  if (typeof enemy?.id !== 'number') return null;
  return resolvePublicAssetPath(`/enemy/E_${enemy.id}.png`);
}

function getEnemyLogChibiImagePath(entry: ExpeditionLogEntry): string | null {
  // SpecRef: 6.1.7 | Logs | Background image
  const enemyId = entry.enemySnapshot?.id ?? entry.enemyId;
  if (typeof enemyId !== 'number') return null;
  return resolvePublicAssetPath(`/chibi/C_E_${enemyId}.png`);
}

function renderEnemyLogChibiBackground(entry: ExpeditionLogEntry): JSX.Element | null {
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

function renderCollapsedBestiaryEnemyImage(enemyId: number): JSX.Element {
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

function getEnemyClassSummary(enemy: EnemyDef): string {
  const mainClass = getClassShortName(enemy.enemyClass);
  if (!enemy.enemySubClass || enemy.enemySubClass === 'none') return mainClass;
  if (enemy.enemySubClass === enemy.enemyClass) return `${mainClass}M`;
  const subClass = getClassShortName(enemy.enemySubClass);
  return `${mainClass}/${subClass}`;
}


function FloatingBubblePortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  const portalThemeClass = document.documentElement.classList.contains('app-dark') || document.body.classList.contains('app-dark')
    ? 'theme-dark'
    : '';

  return createPortal(
    <div className={portalThemeClass}>
      {children}
    </div>,
    document.body,
  );
}

function EnemyBestiaryBubble({
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
  const decay = `${((0.90 + enemy.accuracyBonus) * 100).toFixed(1)}%`;
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
  const abilityText = enemy.abilities.map((ability) => `${ABILITY_NAMES[ability.id] ?? ability.id}${ability.level}`).join(', ') || t('common.none');

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
        <div>ID: {enemy.id}</div>
        {bubble.enemyLevel !== null && <div>{t('party.status.level')}: {formatNumber(bubble.enemyLevel)}</div>}
        <div>HP: {formatNumber(enemy.hp)}</div>
        <div>{t('home.enemy.class')}: {classText}</div>
        <div>{t('home.enemy.type')}: {enemyTypeText}</div>
        {hasRangedAttack && <div>{t('home.enemy.attackLine', { label: t('combat.rangedAttack'), attack: formatNumber(enemy.rangedAttack), count: formatNumber(enemy.rangedNoA), amplifier: enemy.rangedAttackAmplifier.toFixed(2) })}</div>}
        {hasMeleeAttack && <div>{t('home.enemy.attackLine', { label: t('combat.meleeAttack'), attack: formatNumber(enemy.meleeAttack), count: formatNumber(enemy.meleeNoA), amplifier: enemy.meleeAttackAmplifier.toFixed(2) })}</div>}
        {hasPhysicalAttack && <div>{t('home.enemy.accuracyLine', { label: t('combat.physicalAccuracy'), decay })}</div>}
        {hasMagicalAttack && <div>{t('home.enemy.attackLine', { label: t('combat.magicalAttack'), attack: formatNumber(enemy.magicalAttack), count: formatNumber(enemy.magicalNoA), amplifier: enemy.magicalAttackAmplifier.toFixed(2) })}</div>}
        {hasMagicCasting && <div>{t('home.enemy.castingSpell')}: {getEnemyBestiarySpellName(enemy)}</div>}
        <div>{t('combat.element')}: {elementalOffenseIcon ? renderUiIcon(elementalOffenseIcon) : t('home.enemy.noElement')} (x{enemy.elementalOffenseValue.toFixed(2)})</div>
        <div>{t('combat.physicalDefense')}: {formatNumber(enemy.physicalDefense)} ({(enemy.physicalDefenseAmplifier * 100).toFixed(0)}%)</div>
        <div>{t('combat.magicalDefense')}: {formatNumber(enemy.magicalDefense)} ({(enemy.magicalDefenseAmplifier * 100).toFixed(0)}%)</div>
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



function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCharacterBattleLogChibiSrc(party: Party, character: Character): string | null {
  if (character.isUnique) {
    const uniqueFileName = UNIQUE_PARTY_MEMBER_IMAGE_BY_LINEAGE[character.lineageId];
    return uniqueFileName ? `${import.meta.env.BASE_URL}chibi/C_${uniqueFileName}` : null;
  }

  const race = RACES.find((candidate) => candidate.id === character.raceId);
  if (!race) return null;
  const gender = character.gender === 'female' ? 'Female' : 'Male';
  return `${import.meta.env.BASE_URL}chibi/C_${party.id}_${race.englishName}_${gender}.png`;
}

function getEnemyBattleLogChibiSrc(entry: ExpeditionLogEntry): string | null {
  const enemyId = entry.enemyId ?? entry.enemySnapshot?.id;
  return typeof enemyId === 'number' ? `${import.meta.env.BASE_URL}chibi/C_E_${enemyId}.png` : null;
}

function getBattleLogEnemyNameCandidates(entry: ExpeditionLogEntry): string[] {
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

function BattleLogInlineChibi({ src, alt }: { src: string; alt: string }) {
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
function renderBattleLogTextWithInlineChibis(action: string, party: Party, entry: ExpeditionLogEntry): ReactNode {
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
    if (match.index > lastIndex) nodes.push(action.slice(lastIndex, match.index));
    const label = match[0];
    const marker = uniqueMarkers.find((candidate) => candidate.label === label);
    if (marker) nodes.push(<BattleLogInlineChibi key={`chibi-${match.index}-${label}`} src={marker.src} alt={marker.alt} />);
    nodes.push(label);
    lastIndex = match.index + label.length;
  }
  if (lastIndex < action.length) nodes.push(action.slice(lastIndex));

  return <>{nodes}</>;
}

function renderActionWithMutedTrailingParenthetical(action: string) {
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

function aggregateBattleLifeDrainLogs(logs: readonly ExpeditionLogEntry['details'][number][]) {
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
      || log.phase !== 'close'
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



function RaceIcon({ race, className = "h-8 w-8" }: { race: Race; className?: string }) {
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

const RACE_ICON_BY_EMOJI: Record<string, string | undefined> = Object.fromEntries(
  RACES.map((race) => [race.emoji, race.icon])
);
const RACE_ICON_BY_TOKEN: Record<string, string | undefined> = Object.fromEntries(
  RACES.map((race) => [`icon.${race.englishName}`, race.icon])
);

function renderTextWithRaceIcons(text: string, iconClassName = 'h-3.5 w-3.5'): ReactNode {
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

type AfkSummaryStats = {
  Clear: number;
  Turned_Back: number;
  Draw_Retreat: number;
  Wounded_Retreat: number;
  Defeat: number;
  donatedGold: number;
  savedGold: number;
};

function isAfkSummaryStats(value: unknown): value is AfkSummaryStats {
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

function normalizeAfkSummaryStats(value: unknown): AfkSummaryStats | null {
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
function buildAfkSummaryNotification(stats: AfkSummaryStats): string | null {
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

type ItemRarity = 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare';
type RarityFilter = 'all' | ItemRarity;

const RARITY_SHORT_CODES: Record<ItemRarity, string> = {
  common: 'C',
  uncommon: 'U',
  eliteRare: 'E',
  bossRare: 'B',
  mythicRare: 'M',
};

const RARITY_FILTER_LABELS: Record<RarityFilter, string> = {
  all: 'ALL',
  common: 'C',
  uncommon: 'U',
  eliteRare: 'E',
  bossRare: 'B',
  mythicRare: 'M',
};

const getRarityFilterNote = (filter: RarityFilter): string => t(`party.rarity.${filter}`);

const RARITY_FILTER_OPTIONS: RarityFilter[] = ['all', 'common', 'uncommon', 'eliteRare', 'bossRare', 'mythicRare'];

const DIARY_THRESHOLD_OPTIONS: Array<{ value: DiaryRarityThreshold; labelKey: string }> = [
  { value: 'all', labelKey: 'party.rarity.all' },
  { value: 1, labelKey: 'home.diaryThreshold.masterworkPlus' },
  { value: 2, labelKey: 'home.diaryThreshold.demonicPlus' },
  { value: 3, labelKey: 'home.diaryThreshold.hauntedPlus' },
  { value: 4, labelKey: 'home.diaryThreshold.legendaryPlus' },
  { value: 5, labelKey: 'home.diaryThreshold.terrifyingPlus' },
  { value: 6, labelKey: 'home.diaryThreshold.ultimate' },
  { value: 'none', labelKey: 'common.none' },
];

const DIARY_SIDE_QUEST_THRESHOLD_OPTIONS: Array<{ value: DiarySideQuestThreshold; labelKey: string }> = [
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


const DIARY_DEFEAT_NOTIFICATION_OPTIONS: Array<{ value: DiaryDefeatNotificationMode; labelKey: string }> = [
  { value: 'defeatOnly', labelKey: 'home.defeatNotification.defeatOnly' },
  { value: 'defeatAndDraw', labelKey: 'home.defeatNotification.defeatAndDraw' },
  { value: 'none', labelKey: 'common.none' },
];

function getExpeditionDepthOptions(dungeonId: number): Array<{ value: ExpeditionDepthLimit; label: string }> {
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

type GenderedNamePool = { male: string[]; female: string[] };
function getPotentialDefaultNamesByPt(): Record<number, Partial<Record<RaceId, GenderedNamePool>>> {
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

function parseDiaryThreshold(value: string): DiaryRarityThreshold {
  if (value === 'all' || value === 'none') return value;
  const numericValue = Number(value);
  if (numericValue >= 1 && numericValue <= 6) return numericValue as 1 | 2 | 3 | 4 | 5 | 6;
  return 'all';
}

function parseDiarySideQuestThreshold(value: string): DiarySideQuestThreshold {
  if (value === 'all' || value === 'none') return value;
  const numericValue = Number(value);
  if (numericValue >= 2 && numericValue <= 8) return numericValue as 2 | 3 | 4 | 5 | 6 | 7 | 8;
  return 'all';
}

const numberFormatter = new Intl.NumberFormat('ja-JP');
const SPEED_OF_TIME_BONUS_DURATION_MS = 24 * 60 * 60 * 1000;
const SPEED_OF_TIME_BONUS_UNTIL_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-speed-of-time-bonus-until-ms');
const DEV_DISCORD_WEBHOOK_URL = import.meta.env.VITE_DEV_DISCORD_WEBHOOK_URL;
const BETA_DISCORD_WEBHOOK_URL = import.meta.env.VITE_BETA_DISCORD_WEBHOOK_URL;
const PROD_DISCORD_WEBHOOK_URL = import.meta.env.VITE_PROD_DISCORD_WEBHOOK_URL;
const FEEDBACK_DISCORD_WEBHOOK_URL = import.meta.env.VITE_FEEDBACK_DISCORD_WEBHOOK_URL;

function formatNumber(value: number): string {
  return numberFormatter.format(Math.trunc(value));
}

function formatAutoSellSummary(autoSellProfit: number, autoSellMultiplier?: number): string {
  if (autoSellMultiplier && autoSellMultiplier > 1) {
    return t('home.autoSell.withMultiplier', { multiplier: autoSellMultiplier.toFixed(1), gold: formatNumber(autoSellProfit) });
  }
  return t('home.autoSell.basic', { gold: formatNumber(autoSellProfit) });
}

function getItemRarityById(itemId: number): ItemRarity {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 500) return 'mythicRare';
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

const MYTHIC_TIER_BY_NAME = new Map(GOD_MYTHIC_DROPS.map((drop) => [drop.name, drop.tier]));

function getDisplayTier(itemId: number, itemName?: string): number {
  const tier = Math.floor(itemId / 1000);
  if (getItemRarityById(itemId) === 'mythicRare' && itemName) {
    return MYTHIC_TIER_BY_NAME.get(itemName) ?? tier;
  }
  return tier;
}

function getRarityShortLabel(itemId: number, itemName?: string): string {
  const tier = getDisplayTier(itemId, itemName);
  const rarityCode = RARITY_SHORT_CODES[getItemRarityById(itemId)];
  return `[${tier}${rarityCode}]`;
}

function matchesRarityFilter(itemId: number, filter: RarityFilter): boolean {
  if (filter === 'all') return true;
  return getItemRarityById(itemId) === filter;
}

function getRarityTextClass(rarity: ItemRarity, isSuperRare: boolean): string {
  if (isSuperRare) return 'text-accent font-bold';
  if (rarity === 'eliteRare') return 'text-sub';
  if (rarity === 'bossRare') return 'text-accent';
  if (rarity === 'mythicRare') return 'text-accent font-bold';
  return 'text-black';
}

function getRewardTextClass(rarity?: ItemRarity, isSuperRare?: boolean): string {
  if (isSuperRare) return 'text-accent';
  if (rarity === 'mythicRare') return 'text-accent';
  if (rarity === 'bossRare') return 'text-accent';
  if (rarity === 'eliteRare') return 'text-sub';
  return 'text-black';
}

function getRewardFontWeightClass(rarity: ItemRarity, isSuperRare: boolean): string {
  if (isSuperRare) return 'font-bold';
  if (rarity === 'mythicRare') return 'font-bold';
  return rarity === 'common' ? 'font-normal' : 'font-medium';
}

function getItemNameFontWeightClass(item: Item): string {
  return item.superRare >= 1 ? 'font-bold' : 'font-normal';
}

function renderEntryReward(entry: ExpeditionLogEntry): JSX.Element | null {
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

function getDungeonEntryGateState(
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

function shouldDelayNextSpecialGoal(party: Party, cycleState?: PartyCycleState): boolean {
  if (cycleState !== 'explore') return false;
  const log = party.lastExpeditionLog;
  if (!log || log.finalOutcome !== 'Clear') return false;
  const lastEntry = log.entries[log.entries.length - 1];
  return lastEntry?.roomType === 'battle_Boss' && lastEntry.enemyName.includes(t('home.godsBattle.parenthetical'));
}

function getGodBattleLabel(dungeon: Dungeon): string {
  // SpecRef: 8.3 | UI_EXPEDITION | Gods Battle (神魔戦)
  const godProfile = getGodProfileForDungeon(dungeon.id, dungeon.name);
  const godShortName = godProfile?.displayName.split(' ')[0]?.trim();
  return godShortName ? t('home.godsBattle.named', { god: godShortName }) : t('party.expedition.godsBattle');
}

function getScaledSideQuestExpiresAt(sideQuest: Party['sideQuest'], cycleDurationScale: number): number {
  if (!sideQuest) return 0;
  const safeScale = Math.max(0.001, cycleDurationScale);
  const deadlineWindowMs = Math.max(0, sideQuest.expiresAt - sideQuest.assignedAt);
  return sideQuest.assignedAt + Math.floor(deadlineWindowMs * safeScale);
}

type ProgressItemDisplay = {
  key: string;
  compactText: string;
  bubbleText: string;
  progressRatio: number | null;
};


function formatSideQuestShortText(type: string, shortText: string, displayTarget: number): string {
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

function resolveSideQuestShortText(sideQuest: NonNullable<Party['sideQuest']>): string {
  if (!sideQuest.shortTextKey) return sideQuest.shortText;
  const displayTarget = TIME_BASED_SIDE_QUEST_TYPES.has(sideQuest.type)
    ? Math.floor(Math.max(1, sideQuest.target) / 60)
    : Math.max(1, sideQuest.target);
  return formatSideQuestShortText(sideQuest.type, t(sideQuest.shortTextKey), displayTarget);
}

function getRemainingClockEmoji(remainingMs: number): string {
  const remainingHours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));
  const clockFaces = ['🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚'];
  return clockFaces[remainingHours % 12] ?? '🕛';
}

function getSideQuestDisplay(party: Party, cycleDurationScale: number, emulatedNowMs: number): ProgressItemDisplay | null {
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

function getCompactProgressItems(party: Party, cycleDurationScale: number, emulatedNowMs: number, cycleState?: PartyCycleState): ProgressItemDisplay[] {
  const currentDungeon = DUNGEONS.find((d) => d.id === party.selectedDungeonId);
  if (!currentDungeon || !currentDungeon.floors || currentDungeon.id === 99) return [];

  // SpecRef: 8.3 | UI_EXPEDITION | Progress Visual Update
  // Rewards affect loot gates only after the party has completed its return. Keep
  // the compact indicator aligned with the gate text in the active expedition log.
  const displayedParty = party.expeditionRewardsPending && party.pendingLootGateSnapshot
    ? {
        ...party,
        lootGateProgress: party.pendingLootGateSnapshot.progress,
        lootGateStatus: party.pendingLootGateSnapshot.status,
        defeatedBossExpeditions: party.pendingLootGateSnapshot.defeatedBossExpeditions,
      }
    : party;
  const tier = currentDungeon.enemyPoolIds[0];
  const items: ProgressItemDisplay[] = [];
  const pushUniqueProgressItem = (item: ProgressItemDisplay) => {
    if (items.some((existingItem) => existingItem.compactText === item.compactText)) return;
    items.push(item);
  };

  for (const floor of currentDungeon.floors) {
    const hasEliteGate = floor.floorNumber < 6;
    if (!hasEliteGate) continue;
    const required = ELITE_GATE_REQUIREMENTS[floor.floorNumber] ?? 3;
    const collected = getLootCollectionCount(displayedParty, tier, 'uncommon');
    const unlocked = isLootGateUnlocked(displayedParty, getEliteGateKey(currentDungeon.id, floor.floorNumber)) || collected >= required;
    if (!unlocked) {
      const safeRequired = Math.max(1, required);
      const normalizedCollected = Math.max(0, Math.min(collected, safeRequired));
      pushUniqueProgressItem({
        key: `elite-gate:${currentDungeon.id}:${floor.floorNumber}`,
        compactText: t('home.progress.eliteCompact', { collected: formatNumber(collected), required: formatNumber(required), floor: floor.floorNumber }),
        bubbleText: t('home.progress.eliteBubble', { collected: formatNumber(collected), required: formatNumber(required), floor: floor.floorNumber }),
        progressRatio: normalizedCollected / safeRequired,
      });
      break;
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
    const bossRareCollected = getLootCollectionCount(displayedParty, currentDungeon.id, 'bossRare');
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

function isGodsBattleAvailable(party: Party, dungeonId: number): boolean {
  // SpecRef: 5.1.3.1 | "Loot-Gate" progression system | Gods battle gate
  return getLootCollectionCount(party, dungeonId, 'bossRare') >= getGodsBattleRequired()
    && hasDefeatedDungeonBoss(party, dungeonId);
}

function getConditionLabel(condition: number, showValue: boolean): string {
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
function shouldAutoTriggerGodsBattle(party: Party): boolean {
  return party.condition >= 251
    && isGodsBattleAvailable(party, party.selectedDungeonId)
    && !party.sideQuest;
}

function getDisplayedExpeditionStats(party: Party, cycleState?: PartyCycleState): Party['expeditionStats'] {
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


function hasActiveNonGodBattleLootGateCondition(party: Party): boolean {
  // SpecRef: 5.1.2 | Side Quest | Trigger Condition
  const currentDungeon = DUNGEONS.find((dungeon) => dungeon.id === party.selectedDungeonId);
  if (!currentDungeon || !currentDungeon.floors || currentDungeon.id === 99) return false;

  const tier = currentDungeon.enemyPoolIds[0];
  for (const floor of currentDungeon.floors) {
    if (floor.floorNumber >= 6) continue;
    const required = ELITE_GATE_REQUIREMENTS[floor.floorNumber] ?? 3;
    const collected = getLootCollectionCount(party, tier, 'uncommon');
    const unlocked = isLootGateUnlocked(party, getEliteGateKey(currentDungeon.id, floor.floorNumber)) || collected >= required;
    if (!unlocked) return true;
  }

  const eliteRareCollected = getLootCollectionCount(party, tier, 'eliteRare');
  const bossUnlocked = isLootGateUnlocked(party, getBossGateKey(currentDungeon.id)) || eliteRareCollected >= BOSS_GATE_REQUIRED;
  if (!bossUnlocked) return true;

  const nextDungeon = DUNGEONS.find((dungeon) => dungeon.id === currentDungeon.id + 1);
  if (!nextDungeon) return false;

  const entryUnlocked = isDungeonEntryUnlocked(party, nextDungeon.id);
  return !entryUnlocked;
}

function getSideQuestAssignMessage(partyName: string, shortText: string): string {
  // SpecRef: 8.1 | UI_FOUNDATIONS | Side quest notifications
  return t('home.notification.sideQuestAssigned', { party: partyName, quest: shortText });
}

function getSideQuestSuccessMessage(partyName: string, sideQuestDetail?: string): string | null {
  // SpecRef: 8.1 | UI_FOUNDATIONS | Side quest notifications
  if (!sideQuestDetail) return null;
  const jewelMatch = sideQuestDetail.match(new RegExp(`:\\s*(.+)\\s*${escapeRegExp(t('home.sideQuest.legacyObtainedSuffix'))}$`));
  if (!jewelMatch?.[1]) return null;
  return t('home.notification.sideQuestCompletedWithJewel', { party: partyName, jewel: jewelMatch[1] });
}

// Helper to format item stats

function getItemDisplayMultiplier(item: Item, categoryMultiplier: number = 1): number {
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

function getItemInventoryDetailText(item: Item): string {
  return `[${t(CATEGORY_NAME_KEYS[item.category] ?? 'party.categoryName.unknown')}] ${getRarityShortLabel(item.id, item.name)} ${getItemStats(item)}`;
}

type RewardItemBubble = {
  key: string;
  text: string;
  top: number;
  left: number;
  maxWidth: number;
};

function getRewardItemBubblePosition(targetElement: HTMLElement): Omit<RewardItemBubble, 'key' | 'text'> {
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

function getItemStats(item: Item, categoryMultiplier: number = 1, hpScaleMultiplier: number = 1): string {
  const multiplier = getItemDisplayMultiplier(item, categoryMultiplier);
  const baseMultiplier = item.baseMultiplier ?? 1;
  const superRareUniqueBonusText = formatBonuses(
    SUPER_RARE_TITLES.find((title) => title.value === item.superRare)?.bonuses ?? [],
    { defenseMultiplierStyle: 'friendly' }
  );
  const itemUniqueBonuses = item.bonuses ?? [];
  const multiplierPercent = Math.round((baseMultiplier - 1) * 100);
  const formatDecimal = (value: number): string => {
    const rounded = Math.round(value * 100) / 100;
    if (Number.isInteger(rounded)) return `${rounded}`;
    return rounded.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  };
  const formatSigned = (value: number, suffix: string = ''): string =>
    `${value >= 0 ? '+' : ''}${formatDecimal(value)}${suffix}`;
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

function getJewelCBonusLabelKey(bonusType: typeof JEWEL_DEFS[JewelKey]['cBonusType']): string {
  return `jewel.status.cBonus.${bonusType}`;
}

function getJewelDStatLabelKey(stat: typeof JEWEL_DEFS[JewelKey]['dBaseBonuses'][number]['stat']): string {
  return `jewel.status.dStat.${stat}`;
}

function formatJewelStatusText(jewelKey: JewelKey, rank: number): string {
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

function getJewelSlotStatusText(jewelKey: JewelKey, rank: number): string {
  return formatJewelStatusText(jewelKey, rank);
}

function getJewelInventoryStatusText(jewelKey: JewelKey, rank: number): string {
  return formatJewelStatusText(jewelKey, rank);
}

function getOffenseMultiplierSum(
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

function hasEnemyArcMagicAbility(enemy: EnemyDef): boolean {
  return enemy.abilities.some((ability) => ability.id === 'arc_magic' && ability.level > 0);
}

function getArcMagicAbilityLevel(abilities: Ability[]): number {
  return abilities
    .filter((ability) => ability.id === 'arc_magic')
    .reduce((maxLevel, ability) => Math.max(maxLevel, ability.level), 0);
}

function getEnemyArcMagicAbilityLevel(enemy: EnemyDef): number {
  return enemy.abilities
    .filter((ability) => ability.id === 'arc_magic')
    .reduce((maxLevel, ability) => Math.max(maxLevel, ability.level), 0);
}

function getArcMagicOffenseAmplifier(level: number): number {
  if (level >= 3) return 4.2;
  if (level >= 2) return 3.6;
  if (level >= 1) return 3.0;
  return 1.0;
}

// SpecRef: 2.1.1.2 | Multiplier and Functions | character.f.offense_amplifier
// a.arc-magic: magical offense amplifier xN (Lv1:3.0, Lv2:3.6, Lv3:4.2).
function getCharacterDisplayedMagicalAttackAmplifier(baseAmplifier: number, abilities: Ability[]): number {
  const heavyStrikeAmplifier = abilities.some((ability) => ability.id === 'heavy_strike' && ability.level > 0) ? 1.4 : 1.0;
  return baseAmplifier * heavyStrikeAmplifier * getArcMagicOffenseAmplifier(getArcMagicAbilityLevel(abilities));
}

// SpecRef: 2.1.1.2 | Multiplier and Functions | character.f.offense_amplifier
// a.arc-magic: magical offense amplifier xN (Lv1:3.0, Lv2:3.6, Lv3:4.2).
function getEnemyDisplayedMagicalAttackAmplifier(enemy: EnemyDef): number {
  const heavyStrikeAmplifier = enemy.abilities.some((ability) => ability.id === 'heavy_strike' && ability.level > 0) ? 1.4 : 1.0;
  return enemy.magicalAttackAmplifier * heavyStrikeAmplifier * getArcMagicOffenseAmplifier(getEnemyArcMagicAbilityLevel(enemy));
}

function getEnemyBestiarySpellName(enemy: EnemyDef): string {
  const magicProfile = resolveMagicProfile({
    style: hasEnemyArcMagicAbility(enemy) ? 'arc-magic' : 'multi-hit',
    elementalOffense: enemy.elementalOffense,
    elementalOffenseValue: 1.0,
    magicalNoA: enemy.magicalNoA,
  });
  return magicProfile.spellName;
}

function getBaseOffenseScale(value: number): number {
  return getBaseMultiplier(value, 'attack');
}

function getBaseDefenseScale(value: number): number {
  return getBaseMultiplier(value, 'defense');
}

function getElementalOffenseHelpLines(character: Character, stats: ComputedCharacterStats): string[] {
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

const MULTIPLIER_LABEL_KEYS: Record<string, string> = {
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
const ABILITY_NAMES: Record<string, string> = ABILITY_BASE_NAMES;

const BONUS_ABILITY_GLOSSARY_SUBCATEGORY_META: Array<{
  id: BonusAbilityGlossarySubcategoryId;
  shortLabelKey: string;
  labelKey: string;
}> = [
  { id: 'passive', shortLabelKey: 'home.bonusAbility.subcategory.passiveShort', labelKey: 'home.bonusAbility.subcategory.passive' },
  { id: 'expedition', shortLabelKey: 'home.bonusAbility.subcategory.expeditionShort', labelKey: 'home.bonusAbility.subcategory.expedition' },
  { id: 'reactive', shortLabelKey: 'home.bonusAbility.subcategory.reactiveShort', labelKey: 'home.bonusAbility.subcategory.reactive' },
  { id: 'timed', shortLabelKey: 'home.bonusAbility.subcategory.timedShort', labelKey: 'home.bonusAbility.subcategory.timed' },
];

const ABILITY_HELP_TEXT_KEYS: Record<string, string> = {
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

const C_MULTIPLIER_HELP_DESCRIPTION_KEYS: Record<string, string> = {
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

const CATEGORY_TO_MULTIPLIER_BONUS: Record<ItemCategory, BonusType | null> = {
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

function formatCBonusValue(value: number): string {
  return (Math.round(value * 1000000) / 1000000).toString();
}

function getCharacterCategoryMultiplier(character: Character, category: ItemCategory): number {
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

function getCharacterGrowthMultiplier(character: Character): number {
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

function formatMultiplierValue(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return `${rounded}`;
  return rounded.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function formatMultiplierAsFraction(value: number): string {
  const fractionCandidates: Array<{ numerator: number; denominator: number }> = [
    { numerator: 2, denominator: 3 },
    { numerator: 3, denominator: 5 },
    { numerator: 4, denominator: 5 },
    { numerator: 1, denominator: 2 },
  ];
  const candidate = fractionCandidates.find(({ numerator, denominator }) => Math.abs(value - (numerator / denominator)) < 0.0001);
  if (candidate) return `${candidate.numerator}/${candidate.denominator}`;
  return formatMultiplierValue(value);
}

const UNLOCK_ABILITY_BONUS_LABEL_KEYS: Partial<Record<BonusType, string>> = {
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


function formatBonuses(bonuses: Bonus[], options?: { defenseMultiplierStyle?: 'raw' | 'friendly' }): string {
  const defenseMultiplierStyle = options?.defenseMultiplierStyle ?? 'raw';
  const parts: string[] = [];
  const percentFormatter = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
  const formatRatePercent = (value: number): string => percentFormatter.format(Math.round(value * 1000) / 10);
  const formatSigned = (value: number): string => `${value >= 0 ? '+' : ''}${value}`;
  for (const b of bonuses) {
    if (b.type.endsWith('_multiplier') && MULTIPLIER_LABEL_KEYS[b.type]) {
      parts.push(`${t(MULTIPLIER_LABEL_KEYS[b.type])}x${b.value}`);
    } else if (b.type === 'equip_slot') {
      parts.push(`${t('party.bonus.equip_slot')}+${b.value}`);
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
      parts.push(t('party.bonusDisplay.fireOffense', { value: Math.round(b.value * 100) }));
    } else if (b.type === 'ice_offense') {
      parts.push(t('party.bonusDisplay.iceOffense', { value: Math.round(b.value * 100) }));
    } else if (b.type === 'thunder_offense') {
      parts.push(t('party.bonusDisplay.thunderOffense', { value: Math.round(b.value * 100) }));
    } else if (b.type === 'deity_physical_attack_xV') {
      parts.push(t('party.bonusDisplay.deityPhysicalAttackMultiplier', { value: formatMultiplierValue(b.value) }));
    } else if (b.type === 'deity_magical_attack_xV') {
      parts.push(t('party.bonusDisplay.deityMagicalAttackMultiplier', { value: formatMultiplierValue(b.value) }));
    } else if (b.type === 'physical_offense_multiplier_xV') {
      parts.push(t('party.bonusDisplay.physicalOffenseMultiplier', { value: b.value.toFixed(2) }));
    } else if (b.type === 'magical_offense_multiplier_xV') {
      parts.push(t('party.bonusDisplay.magicalOffenseMultiplier', { value: b.value.toFixed(2) }));
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
          : t('party.bonusDisplay.physicalDefenseMultiplier', { value: b.value.toFixed(2) })
      );
    } else if (b.type === 'magical_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? t('party.bonusDisplay.magicalDefenseMultiplier', { value: formatMultiplierAsFraction(b.value) })
          : t('party.bonusDisplay.magicalDefenseMultiplier', { value: b.value.toFixed(2) })
      );
    } else if (b.type === 'fire_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? t('party.bonusDisplay.fireDefenseMultiplier', { value: formatMultiplierAsFraction(b.value) })
          : t('party.bonusDisplay.fireDefenseMultiplier', { value: b.value.toFixed(2) })
      );
    } else if (b.type === 'ice_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? t('party.bonusDisplay.iceDefenseMultiplier', { value: formatMultiplierAsFraction(b.value) })
          : t('party.bonusDisplay.iceDefenseMultiplier', { value: b.value.toFixed(2) })
      );
    } else if (b.type === 'thunder_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? t('party.bonusDisplay.thunderDefenseMultiplier', { value: formatMultiplierAsFraction(b.value) })
          : t('party.bonusDisplay.thunderDefenseMultiplier', { value: b.value.toFixed(2) })
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

function getBonusHelpDescription(bonus: Bonus): string | null {
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

function buildInlineBonusEntry(prefix: string, classId: string | undefined, bonus: Bonus, index: number): {
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

function getEnemyTypeCBonusText(enemy: EnemyDef): string {
  const cBonuses = (enemy.bonuses ?? []).filter((bonus) => isEnemyTypeCBonusType(bonus.type));
  return formatBonuses(cBonuses, { defenseMultiplierStyle: 'friendly' });
}

function getRaceBonusesForSelection(race: Race, unlockAbilityActive = false): Bonus[] {
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

const PREDISPOSITION_SHORT_NAME_KEYS: Record<string, string> = {
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

const LINEAGE_SHORT_NAME_KEYS: Record<string, string> = {
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
const CATEGORY_NAME_KEYS: Record<string, string> = {
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
const CATEGORY_GROUPS = [
  { id: 'durability', labelKey: 'party.category.durability', categories: ['armor', 'robe', 'shield'] },
  { id: 'melee', labelKey: 'party.category.melee', categories: ['sword', 'katana', 'gauntlet'] },
  { id: 'ranged', labelKey: 'party.category.ranged', categories: ['arrow', 'bolt', 'archery'] },
  { id: 'magic', labelKey: 'party.category.magic', categories: ['wand', 'grimoire', 'catalyst'] },
];

const INVENTORY_CATEGORY_GROUPS = [
  { id: 'jewel', labelKey: 'party.category.jewel', categories: ['jewel'] },
  ...CATEGORY_GROUPS,
];

type InventoryCategory = ItemCategory | 'jewel';

const MELEE_CATEGORIES = new Set<ItemCategory>(['sword', 'katana', 'gauntlet']);
const RANGED_CATEGORIES = new Set<ItemCategory>(['arrow', 'bolt', 'archery']);
const MAGIC_CATEGORIES = new Set<ItemCategory>(['wand', 'grimoire', 'catalyst']);
const ITEM_CATEGORY_ORDER: ItemCategory[] = ['armor', 'robe', 'shield', 'sword', 'katana', 'gauntlet', 'arrow', 'bolt', 'archery', 'wand', 'grimoire', 'catalyst'];

type CategoryGroup = typeof CATEGORY_GROUPS[number];

function getCharacterCombatBonusLevels(character: Character): { melee: boolean; ranged: boolean; magic: boolean } {
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

function getAvailableCategoryGroups(character: Character): CategoryGroup[] {
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
const CATEGORY_PRIORITY: Record<string, number> = {
  armor: 0, robe: 1, shield: 2, sword: 3, katana: 4,
  gauntlet: 5, arrow: 6, bolt: 7, archery: 8, wand: 9,
  grimoire: 10, catalyst: 11,
};

// Sort items by descending priority: Item ID (higher first), SuperRare (higher first), Enhancement (higher first)
function sortInventoryItems(items: [string, InventoryVariant][]): [string, InventoryVariant][] {
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


function getInitialGameMode(): GameMode {
  if (typeof window === 'undefined') return 'm.kemo';
  if (getEnvironmentId() === 'beta') return 'm.laika';

  try {
    const savedMode = localStorage.getItem(GAME_MODE_STORAGE_KEY);
    if (savedMode === 'm.kemo' || savedMode === 'm.luna' || savedMode === 'm.laika') {
      return savedMode;
    }
  } catch (error) {
    console.error('Failed to load initial game mode:', error);
  }

  return 'm.kemo';
}

function getInitialAutoEquipmentEnabled(): boolean {
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

function getInitialDarkModeSetting(): DarkModeSetting {
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

type AutoEquipmentMode = 0 | 1 | 2;

const getAutoEquipmentModeLabel = (mode: AutoEquipmentMode): string => t(`party.equipment.autoMode.${mode}`);
const getAutoEquipmentHelpLines = (): string[] => [0, 1, 2, 3].map((index) => t(`party.equipment.autoHelp.${index}`));

type AutoEquipmentCombatStyle = 'ranged' | 'magic' | 'melee';
type AutoEquipmentTargetCategory = ItemCategory | 'i.weapon' | 'i.NoA';

function normalizeAutoEquipmentMode(mode: Character['autoEquipmentMode']): AutoEquipmentMode {
  if (mode === 0 || mode === 2) return mode;
  return 1;
}

// SpecRef: 7.1.1.2 | Equipping into empty slots | class.duelist, class.sword-saint
const AUTO_EQUIPMENT_PRIORITY_BY_CLASS: Record<Character['mainClassId'], AutoEquipmentTargetCategory[]> = {
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

function getNextMissingAutoEquipmentCategory(
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

export function HomeScreen({
  state,
  actions,
  notifications,
  onDismissNotification,
  onDismissAllNotifications,
}: HomeScreenProps) {
  const prefersDocumentScroll = false;
  const [activeTab, setActiveTab] = useState<Tab>('expedition');
  const [tabTransitionDirection, setTabTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [activeWideModeSecondaryTab, setActiveWideModeSecondaryTab] = useState<WideModeSecondaryTab>(WIDE_MODE_DEFAULT_SECONDARY_TAB);
  const [activeBaseSubTab, setActiveBaseSubTab] = useState<BaseSubTab>('shop');
  const [selectedCharacter, setSelectedCharacter] = useState<number>(0);
  const [editingCharacter, setEditingCharacter] = useState<number | null>(null);
  const [isAutoRepeatEnabled, setIsAutoRepeatEnabled] = useState(true);
  const [isExpeditionStatsDisplayEnabled, setIsExpeditionStatsDisplayEnabled] = useState(false);
  const [isPartyExpeditionSplitViewEnabled, setIsPartyExpeditionSplitViewEnabled] = useState(
    () => window.innerWidth >= PARTY_EXPEDITION_SPLIT_MIN_WIDTH,
  );
  const [partyCycles, setPartyCycles] = useState<Record<number, PartyCycleRuntime>>({});
  const [expeditionExpandedLogParty, setExpeditionExpandedLogParty] = useState<number | null>(null);
  const [expeditionExpandedRoom, setExpeditionExpandedRoom] = useState<{ partyIndex: number; roomIndex: number; latestRoomToken: string } | null>(null);
  const [diaryExpandedLogs, setDiaryExpandedLogs] = useState<Record<string, boolean>>({});
  const [diaryExpandedRooms, setDiaryExpandedRooms] = useState<Record<string, boolean>>({});
  const [diarySettingsExpanded, setDiarySettingsExpanded] = useState(false);
  const [selectedBestiaryDungeonId, setSelectedBestiaryDungeonId] = useState<number>(1);
  const [expandedBestiaryEnemies, setExpandedBestiaryEnemies] = useState<Record<number, boolean>>({});
  const [bestiaryScrollTop, setBestiaryScrollTop] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>(() => getInitialGameMode());
  const [darkModeSetting, setDarkModeSetting] = useState<DarkModeSetting>(() => getInitialDarkModeSetting());
  const [isSystemDarkMode, setIsSystemDarkMode] = useState(false);
  const [debugSettings, setDebugSettings] = useState<DebugSettings>(() => getDebugSettings());
  const [isAutoEquipmentEnabled] = useState<boolean>(() => getInitialAutoEquipmentEnabled());
  const tabScrollPositionsRef = useRef<Partial<Record<Tab, number>>>({});
  const tabContentRef = useRef<HTMLDivElement | null>(null);
  const primarySplitTabContentRef = useRef<HTMLDivElement | null>(null);
  const secondarySplitTabContentRef = useRef<HTMLDivElement | null>(null);
  const primaryNavPointerStartRef = useRef<{ x: number; y: number; tab: Tab } | null>(null);
  const primaryNavSwipeHandledRef = useRef(false);

  const safeSelectedPartyIndex = useMemo(() => {
    if (state.parties.length === 0) return 0;
    return Math.min(Math.max(state.selectedPartyIndex, 0), state.parties.length - 1);
  }, [state.parties.length, state.selectedPartyIndex]);
  const currentParty = state.parties[safeSelectedPartyIndex] ?? state.parties[0];
  const prevPartyLogsRef = useRef(state.parties.map((party) => party.lastExpeditionLog));
  const prevPartyLevelsRef = useRef(state.parties.map((party) => party.level));
  const prevPartyCountRef = useRef(state.parties.length);
  const prevShopPurchasesRef = useRef(state.global.shopPurchases);
  const prevInventoryRef = useRef(state.global.inventory);
  const notifiedRewardLogRef = useRef<Array<Party['lastExpeditionLog'] | null>>(state.parties.map(() => null));
  const instantSortieRewardNotificationPendingRef = useRef<boolean[]>(state.parties.map(() => false));
  const prevPartyCycleStateRef = useRef<Array<PartyCycleState | null>>(state.parties.map(() => null));
  const prevSideQuestRef = useRef(state.parties.map((party) => party.sideQuest));
  const hasHydratedAfkRef = useRef(false);
  const pendingAfkSimulationRef = useRef(true);
  const lastCheckpointAtRef = useRef(Date.now());
  const latestPartiesRef = useRef(state.parties);
  const autoRepeatEnabledRef = useRef(isAutoRepeatEnabled);
  const autoEquipmentEnabledRef = useRef(isAutoEquipmentEnabled);
  const gameModeRef = useRef(gameMode);
  const [pendingAfkMs, setPendingAfkMs] = useState(0);

  const pendingAfkMsRef = useRef(0);
  const afkSimulationAnchorRef = useRef<number | null>(null);
  const afkRecoveryTotalMsRef = useRef(0);
  const afkRecoveryCompletedMsRef = useRef(0);
  const previousPendingAfkMsRef = useRef(0);
  const justCompletedAfkRecoveryRef = useRef(false);
  const shouldRebuildPartyCyclesAfterAfkRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsSystemDarkMode(event.matches);
    };

    setIsSystemDarkMode(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DARK_MODE_STORAGE_KEY, darkModeSetting);
      window.dispatchEvent(new Event(THEME_SYNC_EVENT));
    } catch (error) {
      console.error('Failed to save dark mode setting:', error);
    }
  }, [darkModeSetting]);

  const isDarkModeEnabled = darkModeSetting === 'on' || (darkModeSetting === 'system' && isSystemDarkMode);

  useEffect(() => {
    document.body.classList.toggle('app-dark', isDarkModeEnabled);
    document.documentElement.classList.toggle('app-dark', isDarkModeEnabled);

    return () => {
      document.body.classList.remove('app-dark');
      document.documentElement.classList.remove('app-dark');
    };
  }, [isDarkModeEnabled]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const lightTint = gameMode === 'm.luna' ? '#f6efe2' : gameMode === 'm.laika' ? '#e6efe7' : '#f3f4f6';
    const darkTint = gameMode === 'm.luna' ? '#2f2620' : gameMode === 'm.laika' ? '#17281f' : '#1f2937';
    const resolvedTint = isDarkModeEnabled ? darkTint : lightTint;

    // iOS Safari sometimes ignores in-place content updates.
    // Replacing the node restores immediate, no-refresh tint switching.
    const existingMeta = document.querySelector('meta[name="theme-color"]');
    const nextMeta = document.createElement('meta');
    nextMeta.setAttribute('name', 'theme-color');
    nextMeta.setAttribute('content', resolvedTint);
    if (existingMeta?.parentNode) {
      existingMeta.parentNode.replaceChild(nextMeta, existingMeta);
    } else {
      document.head.appendChild(nextMeta);
    }
  }, [gameMode, isDarkModeEnabled]);

  useEffect(() => {
    latestPartiesRef.current = state.parties;
  }, [state.parties]);

  useEffect(() => {
    autoRepeatEnabledRef.current = isAutoRepeatEnabled;
  }, [isAutoRepeatEnabled]);

  useEffect(() => {
    const syncPartyExpeditionSplitView = () => {
      setIsPartyExpeditionSplitViewEnabled(window.innerWidth >= PARTY_EXPEDITION_SPLIT_MIN_WIDTH);
    };

    window.addEventListener('resize', syncPartyExpeditionSplitView);
    return () => {
      window.removeEventListener('resize', syncPartyExpeditionSplitView);
    };
  }, []);

  useEffect(() => {
    try {
      const savedExpeditionStatsDisplay = localStorage.getItem(EXPEDITION_STATS_DISPLAY_STORAGE_KEY);
      if (savedExpeditionStatsDisplay === 'on' || savedExpeditionStatsDisplay === 'off') {
        setIsExpeditionStatsDisplayEnabled(savedExpeditionStatsDisplay === 'on');
      }
    } catch (error) {
      console.error('Failed to load expedition stats display setting:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(EXPEDITION_STATS_DISPLAY_STORAGE_KEY, isExpeditionStatsDisplayEnabled ? 'on' : 'off');
    } catch (error) {
      console.error('Failed to persist expedition stats display setting:', error);
    }
  }, [isExpeditionStatsDisplayEnabled]);

  useEffect(() => {
    autoEquipmentEnabledRef.current = isAutoEquipmentEnabled;
  }, [isAutoEquipmentEnabled]);


  const updateDebugSettings = useCallback((updates: Partial<DebugSettings>) => {
    setDebugSettings((prev) => {
      const next = { ...prev, ...updates };
      saveDebugSettings(next);
      return next;
    });
  }, []);
  const [timeSpeedBonusUntilMs, setTimeSpeedBonusUntilMs] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(SPEED_OF_TIME_BONUS_UNTIL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return null;
      return parsed > Date.now() ? parsed : null;
    } catch (error) {
      console.error('Failed to load Speed of Time bonus duration:', error);
      return null;
    }
  });
  const [timeSpeedNowMs, setTimeSpeedNowMs] = useState(() => Date.now());

  useEffect(() => {
    try {
      if (timeSpeedBonusUntilMs === null) {
        localStorage.removeItem(SPEED_OF_TIME_BONUS_UNTIL_STORAGE_KEY);
      } else {
        localStorage.setItem(SPEED_OF_TIME_BONUS_UNTIL_STORAGE_KEY, String(timeSpeedBonusUntilMs));
      }
    } catch (error) {
      console.error('Failed to persist Speed of Time bonus duration:', error);
    }
  }, [timeSpeedBonusUntilMs]);

  useEffect(() => {
    if (timeSpeedBonusUntilMs === null) return;
    const timer = window.setInterval(() => {
      setTimeSpeedNowMs(Date.now());
    }, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [timeSpeedBonusUntilMs]);

  useEffect(() => {
    // SpecRef: 8.1.2 | Header | Speed of Time
    // Keep x1.2 active only while a valid bonus duration exists.
    if (timeSpeedBonusUntilMs === null) {
      setDebugSettings((prev) => {
        if (prev.timeSpeed !== 'x1_2') return prev;
        const next = { ...prev, timeSpeed: 'realtime' as const };
        saveDebugSettings(next);
        return next;
      });
      return;
    }
    if (timeSpeedNowMs < timeSpeedBonusUntilMs) return;
    setTimeSpeedBonusUntilMs(null);
    setDebugSettings((prev) => {
      if (prev.timeSpeed !== 'x1_2') return prev;
      const next = { ...prev, timeSpeed: 'realtime' as const };
      saveDebugSettings(next);
      return next;
    });
  }, [timeSpeedBonusUntilMs, timeSpeedNowMs]);

  const speedOfTimeLabel = useMemo(() => {
    if (debugSettings.timeSpeed === 'unlimited') return '(∞)';
    const isBonusSpeed = debugSettings.timeSpeed === 'x1_2';
    if (!isBonusSpeed) return '';
    const remainingHours = timeSpeedBonusUntilMs === null
      ? 0
      : Math.max(0, Math.ceil((timeSpeedBonusUntilMs - timeSpeedNowMs) / (60 * 60 * 1000)));
    return `(${formatNumber(remainingHours)}h)`;
  }, [debugSettings.timeSpeed, timeSpeedBonusUntilMs, timeSpeedNowMs]);

  const speedOfTimeSymbol = useMemo(() => {
    if (debugSettings.timeSpeed === 'realtime') return '▷';
    return '▶︎';
  }, [debugSettings.timeSpeed]);

  const buildLatestBattleLogHtml = (partyLabel: 'PT1' | 'PT2' | 'PT3' | 'PT4' | 'PT5' | 'PT6'): File | null => {
    const partyIndex = Number(partyLabel.replace('PT', '')) - 1;
    const party = state.parties[partyIndex];
    const latestLog = party?.lastExpeditionLog;
    if (!party || !latestLog) return null;
    const entriesHtml = latestLog.entries.map((entry: ExpeditionLogEntry) => {
      const detailItems = entry.details.map((detail: BattleLogEntry) => {
        const elementalAttributeEmoji: Record<'fire' | 'ice' | 'thunder', string> = { fire: '🔥', ice: '❄', thunder: '⚡' };
        const hitDisplay = typeof detail.totalAttempts === 'number' && detail.totalAttempts > 0 ? `(${t('battleLog.hits', { hits: formatNumber(detail.hits ?? 0), total: formatNumber(detail.totalAttempts) })})` : '';
        const damageDisplay = typeof detail.damage === 'number' && (detail.damage > 0 || detail.showZeroDamage) ? `(${detail.elementalOffense && detail.elementalOffense !== 'none' ? `${elementalAttributeEmoji[detail.elementalOffense]} ` : ''}${formatNumber(detail.damage)})` : '';
        const noteDisplay = detail.note ? `(${detail.note})` : '';
        return `<li>${escapeExportHtml(`${detail.action}${[hitDisplay, damageDisplay, noteDisplay].filter(Boolean).join(' ') ? ` ${[hitDisplay, damageDisplay, noteDisplay].filter(Boolean).join(' ')}` : ''}`)}</li>`;
      }).join('');
      return `<section><h3>Room ${escapeExportHtml(String(entry.floor ?? '-'))}-${escapeExportHtml(String(entry.roomInFloor ?? entry.room))} / ${escapeExportHtml(entry.enemyName)}</h3><p>Outcome: ${escapeExportHtml(entry.outcome)} / Damage dealt: ${escapeExportHtml(String(entry.damageDealt))} / Damage taken: ${escapeExportHtml(String(entry.damageTaken))}</p><ul>${detailItems || '<li>(No detail)</li>'}</ul></section>`;
    }).join('\n');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>KEMO EXPEDITION Latest Battle Log - ${partyLabel}</title></head><body><h1>KEMO EXPEDITION Latest Battle Log (${partyLabel})</h1><p>Dungeon: ${escapeExportHtml(latestLog.dungeonName)} / Outcome: ${escapeExportHtml(latestLog.finalOutcome)}</p><p>Total rooms: ${escapeExportHtml(String(latestLog.totalRooms))} / Completed: ${escapeExportHtml(String(latestLog.completedRooms))}</p>${entriesHtml || '<p>No entries.</p>'}</body></html>`;
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    return new File([html], `latest-battle-log-${partyLabel}-${timestamp}.html`, { type: 'text/html' });
  };

  const reportProgressForSpeedOfTime = useCallback(async () => {
    // SpecRef: 8.6 | UI_SETTING | Speed of time
    // SpecRef: 8.1.2 | Header | Format of progress data
    const environmentId = getEnvironmentId();
    const webhookUrl = environmentId === 'dev'
      ? DEV_DISCORD_WEBHOOK_URL
      : environmentId === 'beta'
        ? BETA_DISCORD_WEBHOOK_URL
        : PROD_DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      const requiredEnvName = environmentId === 'dev'
        ? 'VITE_DEV_DISCORD_WEBHOOK_URL'
        : environmentId === 'beta'
          ? 'VITE_BETA_DISCORD_WEBHOOK_URL'
          : 'VITE_PROD_DISCORD_WEBHOOK_URL';
      console.warn(`Speed of Time progress report skipped: ${requiredEnvName} is not configured.`);
      return false;
    }
    type ProgressReportPartySnapshot = {
      level: number;
      expProgressPercent: number;
      hp: number;
      attacks: [number, number, number];
    };
    const partySnapshotsKey = createEnvironmentStorageKey('speedOfTimeLastReportedPartySnapshots');
    const storedPartySnapshots = (() => {
      const raw = localStorage.getItem(partySnapshotsKey);
      if (!raw) return [];
      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed as ProgressReportPartySnapshot[] : [];
      } catch {
        return [];
      }
    })();
    const formatSigned = (value: number): string => `${value >= 0 ? '+' : ''}${formatNumber(value)}`;
    const partySnapshots: ProgressReportPartySnapshot[] = [];
    const ptRows = state.parties.map((party, index) => {
      const latestLog = party.lastExpeditionLog;
      const xpToNextLevel = getXpToNextLevel(party.level);
      const expProgressPercent = xpToNextLevel > 0
        ? Math.min(100, Math.max(0, Math.round((party.experience / xpToNextLevel) * 100)))
        : 100;
      const hp = Math.max(0, Math.floor(computePartyStats(party).partyStats.hp));
      const attacks = party.characters.reduce<[number, number, number]>((totals, member, memberIndex) => {
        const computed = computeCharacterStats(member, party.level, memberIndex + 1);
        totals[0] += computed.rangedAttack;
        totals[1] += computed.magicalAttack;
        totals[2] += computed.meleeAttack;
        return totals;
      }, [0, 0, 0]).map((value) => Math.max(0, Math.floor(value))) as [number, number, number];
      const snapshot = { level: party.level, expProgressPercent, hp, attacks };
      partySnapshots.push(snapshot);
      const previous = storedPartySnapshots[index] ?? snapshot;
      const expIncrease = ((party.level - previous.level) * 100)
        + expProgressPercent
        - previous.expProgressPercent;
      const attackIncrease = attacks.map((value, attackIndex) => value - (previous.attacks?.[attackIndex] ?? value));
      return [
        `PT${formatNumber(index + 1)}`,
        `${formatNumber(party.level)}, ${formatNumber(expProgressPercent)}% (${formatSigned(expIncrease)}%)`,
        `${formatNumber(hp)} (${formatSigned(hp - previous.hp)})`,
        `${attacks.map(formatNumber).join('/')} (${attackIncrease.map(formatSigned).join('/')})`,
        latestLog?.dungeonId != null ? formatNumber(latestLog.dungeonId) : '-',
        latestLog?.difficultyOffset != null ? `[${formatSigned(latestLog.difficultyOffset)}]` : '-',
        latestLog?.finalOutcome ?? '-',
        latestLog ? formatNumber(latestLog.completedRooms) : '-',
      ];
    });
    // SpecRef: 8.1.2 | Header | Format of progress data
    const statusRows = state.parties.flatMap((party, partyIndex) =>
      party.characters.map((member, rowIndex) => {
        const mainClass = CLASSES.find((entry) => entry.id === member.mainClassId);
        const subClass = CLASSES.find((entry) => entry.id === member.subClassId);
        const computed = computeCharacterStats(member, party.level, rowIndex + 1);
        const formatPercent = (value: number) => `${formatNumber(Math.round(value * 10000) / 100)}%`;
        const formatSignedScaledBy1000 = (value: number) => `${value >= 0 ? '+' : ''}${formatNumber(Math.round(value * 1000))}`;
        const defensePhysical = `${formatNumber(computed.physicalDefense)}. ${formatPercent(computed.physicalDefenseAmplifier)}`;
        const defenseMagical = `${formatNumber(computed.magicalDefense)}. ${formatPercent(computed.magicalDefenseAmplifier)}`;
        const attackParts: string[] = [];
        const combatBonuses = getCharacterCombatBonusLevels(member);
        if (combatBonuses.ranged) {
          attackParts.push(t('home.progressReport.attackSummary.ranged', {
            attack: formatNumber(computed.rangedAttack),
            multiplier: formatPercent(computed.physicalOffenseMultiplier),
            count: formatNumber(computed.rangedNoA),
          }));
        }
        if (combatBonuses.magic) {
          attackParts.push(t('home.progressReport.attackSummary.magic', {
            attack: formatNumber(computed.magicalAttack),
            multiplier: formatPercent(computed.magicalOffenseMultiplier),
            count: formatNumber(computed.magicalNoA),
          }));
        }
        if (combatBonuses.melee) {
          attackParts.push(t('home.progressReport.attackSummary.melee', {
            attack: formatNumber(computed.meleeAttack),
            multiplier: formatPercent(computed.physicalOffenseMultiplier),
            count: formatNumber(computed.meleeNoA),
          }));
        }
        const elementalAttributeEmoji: Record<'fire' | 'ice' | 'thunder', string> = { fire: '🔥', ice: '❄', thunder: '⚡' };
        const elementalOffense = computed.elementalOffense === 'none'
          ? '-'
          : `${elementalAttributeEmoji[computed.elementalOffense]}(+${formatNumber(Math.max(0, Math.round((computed.elementalOffenseValue - 1) * 100)))}%)`;
        const elementalDefense = `${formatPercent(computed.elementalDefenseMultipliers.fire)}, ${formatPercent(computed.elementalDefenseMultipliers.ice)}, ${formatPercent(computed.elementalDefenseMultipliers.thunder)}`;
        const race = RACES.find((entry) => entry.id === member.raceId);
        const build = `${race?.emoji ?? '-'}${member.gender === 'male' ? t('character.gender.maleShort') : t('character.gender.femaleShort')}${mainClass ? (CLASS_SHORT_NAMES[mainClass.id] ?? mainClass.name) : '-'}${subClass ? (CLASS_SHORT_NAMES[subClass.id] ?? subClass.name) : '-'}${LINEAGE_SHORT_NAME_KEYS[member.lineageId] ? t(LINEAGE_SHORT_NAME_KEYS[member.lineageId]) : member.lineageId}${PREDISPOSITION_SHORT_NAME_KEYS[member.predispositionId] ? t(PREDISPOSITION_SHORT_NAME_KEYS[member.predispositionId]) : member.predispositionId}`;
        const abilityText = computed.abilities.map((ability) => `${ABILITY_NAMES[ability.id] ?? ability.id}${formatNumber(ability.level)}`).join(', ') || '-';
        return [
          `**${formatNumber(partyIndex + 1)}-${formatNumber(rowIndex + 1)}**`,
          `**${member.name}, ${build}**`,
          defensePhysical,
          defenseMagical,
          `${formatSignedScaledBy1000(computed.evasionBonus)}, ${formatPercent(computed.penetMultiplier)}`,
          attackParts.length > 0
            ? `${attackParts.join('/')} ${elementalOffense === '-' ? '' : elementalOffense}`.trim()
            : elementalOffense,
          elementalDefense,
          abilityText,
        ];
      })
    );
    const postWebhookWithFiles = async (content: string, files: File[], username: string) => {
      const formData = new FormData();
      formData.append('payload_json', JSON.stringify({ content, username }));
      files.forEach((file, index) => {
        formData.append(`files[${index}]`, file, file.name);
      });
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error(`Webhook request failed: ${response.status}`);
    };

    const reportCreatedAtMs = Date.now();
    const now = new Date(reportCreatedAtMs);
    const timestampFormatter = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    });
    const timestampParts = timestampFormatter.formatToParts(now);
    const year = timestampParts.find((part) => part.type === 'year')?.value ?? '0000';
    const month = timestampParts.find((part) => part.type === 'month')?.value ?? '00';
    const day = timestampParts.find((part) => part.type === 'day')?.value ?? '00';
    const hour = timestampParts.find((part) => part.type === 'hour')?.value ?? '00';
    const minute = timestampParts.find((part) => part.type === 'minute')?.value ?? '00';
    const nav = typeof navigator === 'undefined' ? null : navigator;
    const userAgent = nav?.userAgent ?? 'unknown';
    const navWithUaData = nav as Navigator & { userAgentData?: { brands?: Array<{ brand: string; version: string }> } };
    const browserName = nav
      ? (navWithUaData.userAgentData?.brands?.map((brand: { brand: string }) => brand.brand).join(' / ')
      || (userAgent.match(/(Firefox|Edg|OPR|Chrome|Safari)\/[\d.]+/)?.[0] ?? 'unknown'))
      : 'unknown';
    const browserVersion = nav
      ? (userAgent.match(/(?:Firefox|Edg|OPR|Chrome|Version)\/([\d.]+)/)?.[1] ?? 'unknown')
      : 'unknown';
    const platform = nav?.platform ?? '';
    const detectOsVersion = (ua: string): string => {
      const ios = ua.match(/(?:CPU (?:iPhone )?OS|iPhone OS) ([\d_]+)/i)?.[1];
      if (ios) return `iOS ${ios.replace(/_/g, '.')}`;
      const android = ua.match(/Android ([\d.]+)/i)?.[1];
      if (android) return `Android ${android}`;
      const windows = ua.match(/Windows NT ([\d.]+)/i)?.[1];
      if (windows) return `Windows NT ${windows}`;
      const mac = ua.match(/Mac OS X ([\d_]+)/i)?.[1];
      if (mac) return `macOS ${mac.replace(/_/g, '.')}`;
      return platform || 'unknown';
    };
    const osVersion = detectOsVersion(userAgent);
    const resolution = `${formatNumber(window.innerWidth)} px, ${formatNumber(window.innerHeight)} px`;
    const reportCounterKey = createEnvironmentStorageKey('speedOfTimeReportCount');
    const reportCount = Number.parseInt(localStorage.getItem(reportCounterKey) ?? '0', 10);
    const nextReportCount = Number.isFinite(reportCount) ? reportCount + 1 : 1;
    const progressReportCount = formatNumber(nextReportCount);
    const lastReportAtKey = createEnvironmentStorageKey('speedOfTimeLastReportAt');
    const previousReportAt = Number.parseInt(localStorage.getItem(lastReportAtKey) ?? '', 10);
    const lastReportHours = Number.isFinite(previousReportAt)
      ? Math.max(0, (reportCreatedAtMs - previousReportAt) / (1000 * 60 * 60))
      : null;
    const lastReportTime = lastReportHours == null
      ? '-'
      : `${formatNumber(Math.floor(lastReportHours))} hours ago`;
    const superRareTotal = Object.values(state.global.inventory).reduce((total, variant) => (
      variant.status === 'owned' && variant.item.superRare > 0
        ? total + Math.max(0, variant.count)
        : total
    ), 0);
    const jewelTotal = Object.values(state.global.jewels).reduce(
      (total, count) => total + Math.max(0, count),
      0,
    ) + state.parties.reduce((partyTotal, party) => (
      partyTotal + party.characters.reduce((characterTotal, character) => (
        characterTotal + character.equipment.reduce(
          (equippedTotal, item) => equippedTotal + (item?.jewel ? 1 : 0),
          0,
        )
      ), 0)
    ), 0);
    const superRareTotalKey = createEnvironmentStorageKey('speedOfTimeLastReportedSuperRareTotal');
    const jewelTotalKey = createEnvironmentStorageKey('speedOfTimeLastReportedJewelTotal');
    const previousSuperRareTotal = Number.parseInt(localStorage.getItem(superRareTotalKey) ?? '0', 10);
    const previousJewelTotal = Number.parseInt(localStorage.getItem(jewelTotalKey) ?? '0', 10);
    const superRareIncrease = Math.max(0, superRareTotal - (Number.isFinite(previousSuperRareTotal) ? previousSuperRareTotal : 0));
    const jewelIncrease = Math.max(0, jewelTotal - (Number.isFinite(previousJewelTotal) ? previousJewelTotal : 0));
    // SpecRef: 8.1.2 | Header | Speed of Time Progress Report
    const reporterName = (localStorage.getItem(createEnvironmentStorageKey('settingFeedbackName')) ?? '').trim() || '-';
    const reportHeaderRows = [
      ['Name', `${reporterName} (${state.global.language})`],
      ['Report count', `${progressReportCount} (${lastReportTime})`],
      ['Super rare', `${formatNumber(superRareTotal)} (+${formatNumber(superRareIncrease)})`],
      ['Jewel', `${formatNumber(jewelTotal)} (+${formatNumber(jewelIncrease)})`],
    ];
    const headerLines = reportHeaderRows
      .map(([key, value]) => `**${key}:** ${value}`)
      .join('\n');
    const environmentLines = [
      ['browser, version', `${browserName}, ${browserVersion}`],
      ['User ID', state.global.userId],
      ['OS version', osVersion],
      ['Resolution', resolution],
    ]
      .map(([key, value]) => `**${key}:** ${value}`)
      .join('\n');
    const versionBuildEnvironmentLine = `**Version Build env:** ${APP_VERSION} (${formatNumber(state.buildNumber)}) ${environmentId}`;
    const currentShopRefreshCount = state.global.shopRefreshCounts[getShopHourKey(now)] ?? 0;
    const goldAndPaidRefreshCostLine = `**Gold and Paid Refresh cost:** ${formatNumber(state.global.gold)}G (${formatNumber(getShopRefreshPrice(currentShopRefreshCount))}G)`;
    const reportMessage = `${headerLines}\n\n${ptRows.map((row) => row.join(' ')).join('\n')}\n\n${goldAndPaidRefreshCostLine}\n${versionBuildEnvironmentLine}\n${environmentLines}`;
    const htmlFileName = `status-table-${year}${month}${day}${hour}${minute}.html`;
    const htmlFile = buildStatusTableHtmlFile(statusRows, htmlFileName);
    const reportTargetPartyIndex = state.parties.reduce((selectedIndex, party, partyIndex) => {
      if (selectedIndex < 0) return partyIndex;
      const selectedParty = state.parties[selectedIndex];
      if (party.level !== selectedParty.level) return party.level > selectedParty.level ? partyIndex : selectedIndex;
      if (party.experience !== selectedParty.experience) return party.experience > selectedParty.experience ? partyIndex : selectedIndex;
      return partyIndex < selectedIndex ? partyIndex : selectedIndex;
    }, -1);
    const reportTargetPartyLabel = reportTargetPartyIndex >= 0 ? `PT${reportTargetPartyIndex + 1}` as 'PT1' | 'PT2' | 'PT3' | 'PT4' | 'PT5' | 'PT6' : null;
    const latestBattleLogFile = reportTargetPartyLabel ? buildLatestBattleLogHtml(reportTargetPartyLabel) : null;
    const reportFiles = [htmlFile, ...(latestBattleLogFile ? [latestBattleLogFile] : [])];
    await postWebhookWithFiles(reportMessage, reportFiles, `KEMO EXPEDITION ${environmentId.toUpperCase()}`);
    localStorage.setItem(reportCounterKey, String(nextReportCount));
    localStorage.setItem(lastReportAtKey, String(reportCreatedAtMs));
    localStorage.setItem(superRareTotalKey, String(superRareTotal));
    localStorage.setItem(jewelTotalKey, String(jewelTotal));
    localStorage.setItem(partySnapshotsKey, JSON.stringify(partySnapshots));
    return true;
  }, [state]);

  const runAutoEquipment = useCallback((
    targetPartyIndexes?: number[],
    targetCharacterIds?: Array<number | string>,
    options?: { suppressNotifications?: boolean },
  ) => {
    const targetPartyIndexSet = targetPartyIndexes ? new Set(targetPartyIndexes) : null;
    const targetCharacterIdSet = targetCharacterIds ? new Set(targetCharacterIds) : null;
    const simulatedInventory: InventoryRecord = { ...state.global.inventory };
    const slotNotifications = new Map<string, { message: string; startedFromEmpty: boolean }>();
    const setSlotNotification = (
      partyName: string,
      characterName: string,
      characterId: string | number,
      slotIndex: number,
      partyIndex: number,
      item: Item,
      previousItem: Item | null,
    ) => {
      const notificationKey = `${partyIndex}:${characterId}:${slotIndex}`;
      const existing = slotNotifications.get(notificationKey);
      const startedFromEmpty = existing?.startedFromEmpty ?? previousItem == null;
      const message = startedFromEmpty
        ? t('home.notification.equipment.equipped', { item: getItemDisplayName(item) })
        : t('home.notification.equipment.replaced', { previous: getItemDisplayName(previousItem!), item: getItemDisplayName(item) });
      slotNotifications.set(notificationKey, {
        message: t('home.notification.equipment.characterChanged', { party: partyName, character: characterName, message }),
        startedFromEmpty,
      });
    };

    const queueAutoEquipmentNotification = (
      partyName: string,
      characterName: string,
      characterId: string | number,
      slotIndex: number,
      item: Item,
      previousItem: Item | null,
      partyIndex: number,
    ) => {
      setSlotNotification(
        partyName,
        characterName,
        characterId,
        slotIndex,
        partyIndex,
        item,
        previousItem,
      );
    };

    const areEquipmentEntitiesEqual = (a: Item | null, b: Item | null): boolean => {
      if (a == null && b == null) return true;
      if (a == null || b == null) return false;

      const isSameVariant = getVariantKey(a) === getVariantKey(b);
      if (!isSameVariant) return false;
      if ((a.isLocked === true) !== (b.isLocked === true)) return false;

      const aJewel = a.jewel;
      const bJewel = b.jewel;
      if (!aJewel && !bJewel) return true;
      if (!aJewel || !bJewel) return false;

      return aJewel.key === bJewel.key && aJewel.rank === bJewel.rank;
    };

    const getEquipmentEntityKey = (item: Item): string => {
      const jewelSuffix = item.jewel ? `:${item.jewel.key}:${item.jewel.rank}` : '';
      const lockSuffix = item.isLocked === true ? ':locked' : ':unlocked';
      return `${getVariantKey(item)}${jewelSuffix}${lockSuffix}`;
    };

    const collectEquipmentDiff = (before: Array<Item | null>, after: Array<Item | null>) => {
      const beforeCounts = new Map<string, { count: number; item: Item }>();
      const afterCounts = new Map<string, { count: number; item: Item }>();

      before.forEach((item) => {
        if (!item) return;
        const key = getEquipmentEntityKey(item);
        const existing = beforeCounts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          beforeCounts.set(key, { count: 1, item });
        }
      });

      after.forEach((item) => {
        if (!item) return;
        const key = getEquipmentEntityKey(item);
        const existing = afterCounts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          afterCounts.set(key, { count: 1, item });
        }
      });

      const removedItems: Item[] = [];
      const addedItems: Item[] = [];
      const allKeys = new Set([...beforeCounts.keys(), ...afterCounts.keys()]);

      allKeys.forEach((key) => {
        const beforeEntry = beforeCounts.get(key);
        const afterEntry = afterCounts.get(key);
        const beforeCount = beforeEntry?.count ?? 0;
        const afterCount = afterEntry?.count ?? 0;

        if (beforeCount > afterCount && beforeEntry) {
          for (let i = 0; i < beforeCount - afterCount; i += 1) {
            removedItems.push(beforeEntry.item);
          }
        }

        if (afterCount > beforeCount && afterEntry) {
          for (let i = 0; i < afterCount - beforeCount; i += 1) {
            addedItems.push(afterEntry.item);
          }
        }
      });

      return { removedItems, addedItems };
    };

    const addItemToSimulatedInventory = (item: Item) => {
      const key = getVariantKey(item);
      const existing = simulatedInventory[key];
      if (existing) {
        simulatedInventory[key] = { ...existing, count: existing.count + 1, status: 'owned' };
      } else {
        simulatedInventory[key] = { item, count: 1, status: 'owned' };
      }
    };

    const removeItemFromSimulatedInventory = (key: string) => {
      const existing = simulatedInventory[key];
      if (!existing || existing.count <= 0) return;
      if (existing.count <= 1) {
        delete simulatedInventory[key];
      } else {
        simulatedInventory[key] = { ...existing, count: existing.count - 1 };
      }
    };

    const getItemTier = (item: Item): number => Math.floor(item.id / 1000);

    const formatCBonusValue = (value: number): string => (Math.round(value * 1000000) / 1000000).toString();

    const formatDefenseBonusPercent = (value: number): string => {
      const percent = Math.round(value * 1000) / 10;
      return Number.isInteger(percent) ? `${percent}` : `${percent.toFixed(1)}`;
    };

    const ITEM_DIRECT_C_BONUS_TYPES = new Set([
      'equip_slot', 'equip_melee', 'equip_ranged', 'equip_magic', 'penet', 'accuracy', 'growth_xV', 'upgrade_V',
      'melee_attack', 'ranged_attack', 'magical_attack', 'physical_attack', 'physical_defense',
      'magical_defense', 'physical_offense_multiplier_xV', 'magical_offense_multiplier_xV',
      'physical_defense_multiplier_xV', 'magical_defense_multiplier_xV', 'fire_defense_multiplier_xV',
      'ice_defense_multiplier_xV', 'thunder_defense_multiplier_xV',
    ]);

    const getItemCBonusSignatures = (item: Item): Set<string> => {
      const bonusNames = new Set<string>();

      for (const bonus of item.bonuses ?? []) {
        if (!ITEM_DIRECT_C_BONUS_TYPES.has(bonus.type)) continue;
        bonusNames.add(`c.${bonus.type}+${formatCBonusValue(bonus.value)}`);
      }

      const baseMultiplier = item.baseMultiplier ?? 1;
      if (baseMultiplier !== 1) {
        const offensePercent = Math.round((baseMultiplier - 1) * 1000) / 10;
        if (item.meleeAttack || item.meleeNoA || item.meleeNoABonus) {
          bonusNames.add(`c.melee_attack+${offensePercent}`);
        }
        if (item.rangedAttack || item.rangedNoA || item.rangedNoABonus) {
          bonusNames.add(`c.ranged_attack+${offensePercent}`);
        }
        if (item.magicalAttack || item.magicalNoA || item.magicalNoABonus) {
          bonusNames.add(`c.magical_attack+${offensePercent}`);
        }
        const defensePercent = formatDefenseBonusPercent(baseMultiplier - 1);
        if (item.physicalDefense) {
          bonusNames.add(`c.physical_defense+${defensePercent}`);
        }
        if (item.magicalDefense) {
          bonusNames.add(`c.magical_defense+${defensePercent}`);
        }
      }

      if (item.accuracyBonus) {
        bonusNames.add(`c.accuracy+${formatCBonusValue(item.accuracyBonus)}`);
      }
      if ((item.evasionBonus ?? 0) > 0) {
        bonusNames.add(`c.evasion+${formatCBonusValue(item.evasionBonus ?? 0)}`);
      }
      if (item.penetBonus) {
        bonusNames.add(`c.penet+${formatCBonusValue(item.penetBonus)}`);
      }

      if ((item.meleeNoABonus ?? 0) !== 0) {
        bonusNames.add(`c.melee_NoA+${formatCBonusValue(item.meleeNoABonus ?? 0)}`);
      }
      if ((item.rangedNoABonus ?? 0) !== 0) {
        bonusNames.add(`c.ranged_NoA+${formatCBonusValue(item.rangedNoABonus ?? 0)}`);
      }
      if ((item.magicalNoABonus ?? 0) !== 0) {
        bonusNames.add(`c.magical_NoA+${formatCBonusValue(item.magicalNoABonus ?? 0)}`);
      }

      return bonusNames;
    };

    const compareItemsByTierAndEnhancement = (a: Item, b: Item): number => {
      const tierDiff = getItemTier(a) - getItemTier(b);
      if (tierDiff !== 0) return tierDiff;

      const enhancementDiff = a.enhancement - b.enhancement;
      if (enhancementDiff !== 0) return enhancementDiff;

      return a.id - b.id;
    };


    const getCharacterAutoEquipBonuses = (character: Character): Bonus[] => {
      const race = RACES.find((r) => r.id === character.raceId);
      const mainClass = CLASSES.find((c) => c.id === character.mainClassId);
      const subClass = CLASSES.find((c) => c.id === character.subClassId);
      const predisposition = PREDISPOSITIONS.find((p) => p.id === character.predispositionId);
      const lineage = LINEAGES.find((l) => l.id === character.lineageId);
      if (!race || !mainClass || !subClass || !predisposition || !lineage) return [];

      const isMasterClass = character.mainClassId === character.subClassId;
      const equipmentBonuses = character.equipment.flatMap((item) => item?.bonuses ?? []);
      return [
        ...race.bonuses,
        ...mainClass.mainSubBonuses,
        ...(isMasterClass ? mainClass.masterBonuses : mainClass.mainBonuses),
        ...(isMasterClass ? [] : subClass.mainSubBonuses),
        ...predisposition.bonuses,
        ...lineage.bonuses,
        ...equipmentBonuses,
      ];
    };

    const decideAutoEquipmentCombatStyle = (character: Character): AutoEquipmentCombatStyle | null => {
      // SpecRef: 7.1.1.2 | Equipping into empty slots | Decide the combat style
      const bonuses = getCharacterAutoEquipBonuses(character);
      const enableFlags = { ranged: false, magic: false, melee: false };
      const uniqueMultiplierBonusNames = new Set<string>();
      const scoreByMultiplierType = new Map<string, number>();

      const addMultiplierScore = (multiplierType: string, value: number): void => {
        const existing = scoreByMultiplierType.get(multiplierType) ?? 0;
        scoreByMultiplierType.set(multiplierType, existing + (value - 1));
      };

      for (const bonus of bonuses) {
        if (bonus.type === 'equip_ranged' && bonus.value > 0) enableFlags.ranged = true;
        if (bonus.type === 'equip_magic' && bonus.value > 0) enableFlags.magic = true;
        if (bonus.type === 'equip_melee' && bonus.value > 0) enableFlags.melee = true;
        if (!bonus.type.endsWith('_multiplier')) continue;

        const bonusName = `${bonus.type}:${bonus.value}`;
        if (uniqueMultiplierBonusNames.has(bonusName)) continue;
        uniqueMultiplierBonusNames.add(bonusName);
        addMultiplierScore(bonus.type, bonus.value);
      }

      const scores: Record<AutoEquipmentCombatStyle, number> = {
        ranged: (scoreByMultiplierType.get('arrow_multiplier') ?? 0)
          + (scoreByMultiplierType.get('bolt_multiplier') ?? 0)
          + (scoreByMultiplierType.get('archery_multiplier') ?? 0),
        magic: (scoreByMultiplierType.get('wand_multiplier') ?? 0)
          + (scoreByMultiplierType.get('grimoire_multiplier') ?? 0)
          + (scoreByMultiplierType.get('catalyst_multiplier') ?? 0),
        melee: (scoreByMultiplierType.get('sword_multiplier') ?? 0)
          + (scoreByMultiplierType.get('katana_multiplier') ?? 0)
          + (scoreByMultiplierType.get('gauntlet_multiplier') ?? 0),
      };

      const ranking: AutoEquipmentCombatStyle[] = ['ranged', 'magic', 'melee'];
      if (!enableFlags.ranged && !enableFlags.magic && !enableFlags.melee) {
        return null;
      }
      let bestStyle: AutoEquipmentCombatStyle | null = null;
      let bestScore = Number.NEGATIVE_INFINITY;
      ranking.forEach((style) => {
        if (!enableFlags[style]) return;
        if (scores[style] > bestScore) {
          bestStyle = style;
          bestScore = scores[style];
        }
      });

      return bestStyle;
    };

    const resolveAutoEquipmentTargetCategory = (
      targetCategory: AutoEquipmentTargetCategory,
      combatStyle: AutoEquipmentCombatStyle | null,
    ): ItemCategory[] => {
      if (targetCategory === 'i.weapon') {
        if (combatStyle === 'ranged') return ['arrow', 'bolt'];
        if (combatStyle === 'magic') return ['wand', 'grimoire'];
        if (combatStyle === 'melee') return ['sword', 'katana'];
        return ['shield'];
      }
      if (targetCategory === 'i.NoA') {
        if (combatStyle === 'ranged') return ['archery'];
        if (combatStyle === 'magic') return ['catalyst'];
        if (combatStyle === 'melee') return ['gauntlet'];
        return ['shield'];
      }
      return [targetCategory];
    };

    const getAutoEquipmentSelectionValueForCharacter = (character: Character, item: Item): number => {
      // SpecRef: 7.1.1.2 | Equipping into empty slots | modified core concept
      const categoryMultiplier = getCharacterCategoryMultiplier(character, item.category);
      const modifiedCoreConceptValue = Math.round(getItemCoreConceptValue(item) * categoryMultiplier);
      if (item.category === 'gauntlet') {
        return modifiedCoreConceptValue + (item.meleeNoABonus ?? 0);
      }
      if (item.category === 'archery') {
        return modifiedCoreConceptValue + (item.rangedNoABonus ?? 0);
      }
      if (item.category === 'catalyst') {
        return modifiedCoreConceptValue + (item.magicalNoABonus ?? 0);
      }
      return modifiedCoreConceptValue;
    };

    const getBestVariantKeyInCategory = (
      character: Character,
      targetCategories: ItemCategory[],
      memoryItemIds: Set<number>,
      memoryCBonusNames: Set<string>,
    ): string | null => {
      // SpecRef: 7.1.1.2 | Equipping into empty slots | Search for a candidate item
      const options = Object.entries(simulatedInventory)
        .filter(([, variant]) => {
          if (
            variant.status !== 'owned'
            || variant.count <= 0
            || !targetCategories.includes(variant.item.category)
          ) {
            return false;
          }

          if (memoryItemIds.has(variant.item.id)) return false;
          const hasAntagonismBonus = [
            ...(variant.item.bonuses ?? []),
            ...getSuperRareBonuses(variant.item.superRare),
          ].some((bonus) => bonus.type === 'antagonism');
          if (hasAntagonismBonus) return false;

          const cBonusNames = getItemCBonusSignatures(variant.item);
          for (const bonusName of cBonusNames) {
            if (memoryCBonusNames.has(bonusName)) return false;
          }

          return true;
        })
        .sort(([, a], [, b]) => {
          const selectionValueDiff = getAutoEquipmentSelectionValueForCharacter(character, b.item)
            - getAutoEquipmentSelectionValueForCharacter(character, a.item);
          if (selectionValueDiff !== 0) return selectionValueDiff;

          return compareItemsByTierAndEnhancement(b.item, a.item);
        });

      return options[0]?.[0] ?? null;
    };

    const getBestUpgradeVariantKeyForItem = (equippedItem: Item): string | null => {
      if (equippedItem.superRare > 0) return null;

      const options = Object.entries(simulatedInventory)
        .filter(([, variant]) => {
          if (variant.status !== 'owned' || variant.count <= 0) return false;
          if (variant.item.id !== equippedItem.id) return false;
          if (variant.item.superRare > 0) return false;
          return variant.item.enhancement > equippedItem.enhancement;
        })
        .sort(([, a], [, b]) => {
          const enhancementDiff = b.item.enhancement - a.item.enhancement;
          if (enhancementDiff !== 0) return enhancementDiff;

          const coreConceptDiff = getItemCoreConceptValue(b.item) - getItemCoreConceptValue(a.item);
          if (coreConceptDiff !== 0) return coreConceptDiff;

          const superRareDiff = b.item.superRare - a.item.superRare;
          if (superRareDiff !== 0) return superRareDiff;

          return compareItemsByTierAndEnhancement(b.item, a.item);
        });

      return options[0]?.[0] ?? null;
    };

    const compareMemoryCJewelPriority = (
      a: { key: JewelKey; rank: number },
      b: { key: JewelKey; rank: number },
    ): number => {
      const rankDiff = b.rank - a.rank;
      if (rankDiff !== 0) return rankDiff;
      return a.key.localeCompare(b.key);
    };

    const compareJewelAttachTarget = (a: Item, b: Item): number => {
      const enhancementDiff = b.enhancement - a.enhancement;
      if (enhancementDiff !== 0) return enhancementDiff;

      const superRareDiff = b.superRare - a.superRare;
      if (superRareDiff !== 0) return superRareDiff;

      const coreConceptDiff = getItemCoreConceptValue(b) - getItemCoreConceptValue(a);
      if (coreConceptDiff !== 0) return coreConceptDiff;

      return compareItemsByTierAndEnhancement(b, a);
    };

    state.parties.forEach((party, partyIndex) => {
      if (targetPartyIndexSet && !targetPartyIndexSet.has(partyIndex)) return;

      const isJewelPriorityParty = state.global.jewelAutoEquipPriorityPartyId === party.id;

      party.characters.forEach((character) => {
        if (targetCharacterIdSet && !targetCharacterIdSet.has(character.id)) return;

        const autoEquipmentMode = normalizeAutoEquipmentMode(character.autoEquipmentMode);
        if (autoEquipmentMode === 0) {
          // SpecRef: 7.1.3.1 | Auto Assignment Order | 1-4
          if (isJewelPriorityParty) {
            const assignments = planAutoJewelAssignmentsForCharacter(character, state.global.jewels);
            assignments.forEach((assignment) => {
              actions.attachJewel(character.id, assignment.slotIndex, assignment.key, assignment.rank, partyIndex);
            });
          }
          return;
        }

        // SpecRef: 7.1.1.2 | Equipping into empty slots | Item selection from a specific item category
        const combatStyle = decideAutoEquipmentCombatStyle(character);
        const priorities = AUTO_EQUIPMENT_PRIORITY_BY_CLASS[character.mainClassId] ?? AUTO_EQUIPMENT_PRIORITY_BY_CLASS.guardian;
        const { maxEquipSlots } = computeCharacterStats(character, party.level);
        const simulatedEquipmentSlots = Array.from({ length: maxEquipSlots }, (_, index) => character.equipment[index] ?? null);
        const memoryDEquipmentSlots = autoEquipmentMode === 2
          ? simulatedEquipmentSlots.map((item) => (item ? { ...item } : null))
          : null;
        const memoryCJewelsByCategory: Partial<Record<ItemCategory, Array<{ key: JewelKey; rank: number }>>> = {};

        if (autoEquipmentMode === 2) {
          // SpecRef: 7.1.1.1 | Removes all equipment | Record Memory C
          simulatedEquipmentSlots.forEach((equippedItem) => {
            if (!equippedItem?.jewel) return;
            const currentCategoryJewels = memoryCJewelsByCategory[equippedItem.category] ?? [];
            memoryCJewelsByCategory[equippedItem.category] = [...currentCategoryJewels, equippedItem.jewel];
          });

          // SpecRef: 8.2.4 | Equipment management | Lock and Unlock Item
          // SpecRef: 7.1.1.1 | Removes all equipment | Exception
          simulatedEquipmentSlots.forEach((equippedItem, slotIndex) => {
            if (!equippedItem) return;
            if (equippedItem.isLocked === true) return;
            if (equippedItem.superRare > 0) return;
            addItemToSimulatedInventory(equippedItem);
            actions.equipItem(character.id, slotIndex, null, partyIndex);
            simulatedEquipmentSlots[slotIndex] = null;
          });
        }
        const memoryItemIds = new Set<number>();
        const memoryCBonusNames = new Set<string>();
        const emptySlotIndexes = simulatedEquipmentSlots
          .map((item, slotIndex) => (item ? -1 : slotIndex))
          .filter((index) => index >= 0);
        const equippedCategoryCounts: Partial<Record<ItemCategory, number>> = {};
        const resolvedFallbackTargetCounts: Partial<Record<'i.weapon' | 'i.NoA', number>> = {
          'i.weapon': 0,
          'i.NoA': 0,
        };
        const getResolvedCategoryCount = (targetCategory: AutoEquipmentTargetCategory): number => {
          if (
            combatStyle == null
            && (targetCategory === 'i.weapon' || targetCategory === 'i.NoA')
          ) {
            return resolvedFallbackTargetCounts[targetCategory] ?? 0;
          }
          const resolvedCategories = resolveAutoEquipmentTargetCategory(targetCategory, combatStyle);
          if (resolvedCategories.length === 0) return 0;
          return resolvedCategories.reduce((sum, category) => sum + (equippedCategoryCounts[category] ?? 0), 0);
        };
        simulatedEquipmentSlots.forEach((item) => {
          if (!item) return;
          memoryItemIds.add(item.id);
          getItemCBonusSignatures(item).forEach((bonusName) => memoryCBonusNames.add(bonusName));
          equippedCategoryCounts[item.category] = (equippedCategoryCounts[item.category] ?? 0) + 1;
        });

        if (autoEquipmentMode === 2) {
          emptySlotIndexes.forEach((slotIndex) => {
            const skippedCategories = new Set<AutoEquipmentTargetCategory>();
            let resolvedSelection: { itemKey: string; targetCategory: AutoEquipmentTargetCategory } | null = null;

            while (!resolvedSelection) {
              const targetCategory = getNextMissingAutoEquipmentCategory(
                priorities,
                equippedCategoryCounts,
                getResolvedCategoryCount,
                skippedCategories,
              );
              if (!targetCategory) break;

              const resolvedCategories = resolveAutoEquipmentTargetCategory(targetCategory, combatStyle);
              if (resolvedCategories.length === 0) {
                skippedCategories.add(targetCategory);
                continue;
              }

              const itemKey = getBestVariantKeyInCategory(character, resolvedCategories, memoryItemIds, memoryCBonusNames);
              if (!itemKey) {
                skippedCategories.add(targetCategory);
                continue;
              }

              resolvedSelection = { itemKey, targetCategory };
            }

            if (!resolvedSelection) return;

            const variant = simulatedInventory[resolvedSelection.itemKey];
            if (!variant) return;

            equippedCategoryCounts[variant.item.category] = (equippedCategoryCounts[variant.item.category] ?? 0) + 1;
            if (
              combatStyle == null
              && (resolvedSelection.targetCategory === 'i.weapon' || resolvedSelection.targetCategory === 'i.NoA')
            ) {
              resolvedFallbackTargetCounts[resolvedSelection.targetCategory] = (resolvedFallbackTargetCounts[resolvedSelection.targetCategory] ?? 0) + 1;
            }
            removeItemFromSimulatedInventory(resolvedSelection.itemKey);
            simulatedEquipmentSlots[slotIndex] = variant.item;
            memoryItemIds.add(variant.item.id);
            getItemCBonusSignatures(variant.item).forEach((bonusName) => memoryCBonusNames.add(bonusName));
            actions.equipItem(character.id, slotIndex, resolvedSelection.itemKey, partyIndex);
          });
        }

        simulatedEquipmentSlots.forEach((equippedItem, slotIndex) => {
          if (!equippedItem) return;
          if (equippedItem.isLocked === true) return;
          const itemKey = getBestUpgradeVariantKeyForItem(equippedItem);
          if (!itemKey) return;
          const variant = simulatedInventory[itemKey];
          if (!variant) return;

          removeItemFromSimulatedInventory(itemKey);
          addItemToSimulatedInventory(equippedItem);
          const nextEquippedItem = equippedItem.jewel
            ? { ...variant.item, jewel: equippedItem.jewel }
            : variant.item;
          simulatedEquipmentSlots[slotIndex] = nextEquippedItem;

          actions.equipItem(character.id, slotIndex, itemKey, partyIndex);
          if (equippedItem.jewel) {
            actions.attachJewel(character.id, slotIndex, equippedItem.jewel.key, equippedItem.jewel.rank, partyIndex);
          }
          if (autoEquipmentMode !== 2) {
            queueAutoEquipmentNotification(
              party.name,
              character.name,
              character.id,
              slotIndex,
              nextEquippedItem,
              equippedItem,
              partyIndex,
            );
          }
        });

        Object.entries(memoryCJewelsByCategory).forEach(([category, jewels]) => {
          if (!jewels || jewels.length <= 0) return;

          const sortedJewels = [...jewels].sort(compareMemoryCJewelPriority);
          const attachTargets = simulatedEquipmentSlots
            .map((item, slotIndex) => ({ item, slotIndex }))
            .filter((entry): entry is { item: Item; slotIndex: number } => !!entry.item && entry.item.category === category)
            .sort((a, b) => compareJewelAttachTarget(a.item, b.item));

          const categoryAllowedJewels = new Set(JEWELS_BY_ITEM_CATEGORY[category as ItemCategory] ?? []);

          let jewelIndex = 0;
          attachTargets.forEach(({ slotIndex, item }) => {
            while (jewelIndex < sortedJewels.length && !categoryAllowedJewels.has(sortedJewels[jewelIndex].key)) {
              jewelIndex += 1;
            }
            if (jewelIndex >= sortedJewels.length) return;

            const jewel = sortedJewels[jewelIndex];
            jewelIndex += 1;
            simulatedEquipmentSlots[slotIndex] = { ...item, jewel };
            actions.attachJewel(character.id, slotIndex, jewel.key, jewel.rank, partyIndex);
          });
        });

        // SpecRef: 7.1.3.1 | Auto Assignment Order | 1-4
        if (isJewelPriorityParty) {
          const simulatedCharacterForJewel = {
            ...character,
            equipment: simulatedEquipmentSlots,
          };
          const assignments = planAutoJewelAssignmentsForCharacter(simulatedCharacterForJewel, state.global.jewels);
          assignments.forEach((assignment) => {
            const slotItem = simulatedEquipmentSlots[assignment.slotIndex];
            if (!slotItem) return;
            simulatedEquipmentSlots[assignment.slotIndex] = {
              ...slotItem,
              jewel: { key: assignment.key, rank: assignment.rank },
            };
            actions.attachJewel(character.id, assignment.slotIndex, assignment.key, assignment.rank, partyIndex);
          });
        }

        if (autoEquipmentMode === 2 && memoryDEquipmentSlots) {
          const hasSlotChange = simulatedEquipmentSlots.some((equippedItem, slotIndex) => {
            const previousItem = memoryDEquipmentSlots[slotIndex] ?? null;
            return !areEquipmentEntitiesEqual(previousItem, equippedItem);
          });
          if (!hasSlotChange) return;

          const { removedItems, addedItems } = collectEquipmentDiff(memoryDEquipmentSlots, simulatedEquipmentSlots);

          const replacementCount = Math.min(removedItems.length, addedItems.length);
          for (let index = 0; index < replacementCount; index += 1) {
            queueAutoEquipmentNotification(
              party.name,
              character.name,
              character.id,
              index,
              addedItems[index],
              removedItems[index],
              partyIndex,
            );
          }

          for (let index = replacementCount; index < addedItems.length; index += 1) {
            queueAutoEquipmentNotification(
              party.name,
              character.name,
              character.id,
              replacementCount * 1000 + index,
              addedItems[index],
              null,
              partyIndex,
            );
          }
        }
      });
    });

    const shouldSuppressAutoEquipmentNotifications = options?.suppressNotifications
      || pendingAfkMsRef.current > 0
      || shouldShowAfkSummaryRef.current
      || justCompletedAfkRecoveryRef.current;

    if (shouldSuppressAutoEquipmentNotifications) return;

    slotNotifications.forEach(({ message }) => {
      actions.addNotification(message, 'normal', 'item', true, {
        rarity: 'common',
        isSuperRareItem: false,
      });
    });
  }, [actions, state.global.inventory, state.parties]);

  useEffect(() => {
    const previousPartyCount = prevPartyCountRef.current;
    prevPartyCountRef.current = state.parties.length;

    if (state.parties.length <= previousPartyCount) return;

    const newlyUnlockedPartyIndexes = Array.from(
      { length: state.parties.length - previousPartyCount },
      (_, offset) => previousPartyCount + offset,
    );
    runAutoEquipment(newlyUnlockedPartyIndexes);
  }, [runAutoEquipment, state.parties.length]);

  const setAutoRepeatEnabled = useCallback((nextEnabled: boolean) => {
    autoRepeatEnabledRef.current = nextEnabled;
    setIsAutoRepeatEnabled(nextEnabled);
    if (!nextEnabled) return;

    setPartyCycles((prevCycles) => {
      const nextCycles = { ...prevCycles };
      const now = Date.now();
      state.parties.forEach((party, partyIndex) => {
        const runtime = nextCycles[partyIndex] ?? { state: 'idle' as PartyCycleState, stateStartedAt: now, durationMs: 1000 };
        if (runtime.state === 'idle') {
          nextCycles[partyIndex] = {
            state: 'move',
            stateStartedAt: now,
            durationMs: getPartyTravelDurationMs(party, 'move'),
            sortieSourceState: undefined,
            sortieEmbezzlementGold: undefined,
          };
        }
      });
      return nextCycles;
    });
  }, [state.parties]);

  const handleResetGame = useCallback(() => {
    autoRepeatEnabledRef.current = true;
    setIsAutoRepeatEnabled(true);
    setPartyCycles({});
    pendingAfkSimulationRef.current = false;
    setPendingAfkMs(0);
    afkSimulationAnchorRef.current = null;
    afkRecoveryTotalMsRef.current = 0;
    try {
      localStorage.removeItem(AFK_RUNTIME_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear AFK runtime state:', error);
    }
    actions.resetGame();
  }, [actions]);

  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  useEffect(() => {
    if (state.parties.length === 0) return;
    if (state.selectedPartyIndex !== safeSelectedPartyIndex) {
      actions.selectParty(safeSelectedPartyIndex);
    }
  }, [actions, safeSelectedPartyIndex, state.parties.length, state.selectedPartyIndex]);

  const afkSummaryBaselineRef = useRef<AfkSummaryStats[] | null>(null);
  const shouldShowAfkSummaryRef = useRef(false);
  const { partyStats, characterStats } = computePartyStats(currentParty);

  useEffect(() => {
    preloadRaceIcons();
  }, []);

  useEffect(() => {
    try {
      if (getEnvironmentId() === 'beta') {
        setGameMode('m.laika');
        return;
      }
      const savedMode = localStorage.getItem(GAME_MODE_STORAGE_KEY);
      if (savedMode === 'm.kemo' || savedMode === 'm.luna' || savedMode === 'm.laika') {
        setGameMode(savedMode);
      }
    } catch (error) {
      console.error('Failed to load game mode:', error);
    }
  }, []);

  useEffect(() => {
    try {
      const storedMode = getEnvironmentId() === 'beta' ? 'm.laika' : gameMode;
      if (getEnvironmentId() === 'beta' && gameMode !== 'm.laika') {
        setGameMode('m.laika');
      }
      localStorage.setItem(GAME_MODE_STORAGE_KEY, storedMode);
      window.dispatchEvent(new Event(THEME_SYNC_EVENT));
    } catch (error) {
      console.error('Failed to persist game mode:', error);
    }
  }, [gameMode]);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_EQUIPMENT_STORAGE_KEY, isAutoEquipmentEnabled ? 'on' : 'off');
    } catch (error) {
      console.error('Failed to persist auto equipment setting:', error);
    }
  }, [isAutoEquipmentEnabled]);

  useEffect(() => {
    if (hasHydratedAfkRef.current) return;
    hasHydratedAfkRef.current = true;

    try {
      const savedRuntime = localStorage.getItem(AFK_RUNTIME_STORAGE_KEY);
      if (!savedRuntime) return;

      const parsed = JSON.parse(savedRuntime) as {
        checkpointAt?: number;
        autoRepeatEnabled?: boolean;
        partyCycles?: Record<number, PartyCycleRuntime>;
        pendingAfkMs?: number;
        afkRecoveryTotalMs?: number;
        afkRecoveryCompletedMs?: number;
        afkSimulationAnchor?: number | null;
        afkSummaryBaseline?: unknown;
        shouldShowAfkSummary?: boolean;
      };

      const checkpointAt = typeof parsed.checkpointAt === 'number' ? parsed.checkpointAt : Date.now();
      const elapsedMs = Math.max(0, Math.min(Date.now() - checkpointAt, AFK_MAX_ELAPSED_MS));
      lastCheckpointAtRef.current = Date.now() - elapsedMs;

      setAutoRepeatEnabled(parsed.autoRepeatEnabled !== false);
      const restoredPendingAfkMs = typeof parsed.pendingAfkMs === 'number'
        ? Math.max(0, Math.min(parsed.pendingAfkMs, AFK_MAX_ELAPSED_MS))
        : 0;
      if (restoredPendingAfkMs > 0) {
        setPendingAfkMs(restoredPendingAfkMs);
        // SpecRef: 5.1.1 | Party State Machine | Refresh Handling
        // Reset `state.reactivate` main-progress on refresh and resume counting from 0.
        afkRecoveryTotalMsRef.current = restoredPendingAfkMs;
        afkRecoveryCompletedMsRef.current = 0;
        afkSimulationAnchorRef.current = typeof parsed.afkSimulationAnchor === 'number'
          ? parsed.afkSimulationAnchor
          : Date.now();
        const restoredSummaryBaseline = Array.isArray(parsed.afkSummaryBaseline)
          ? parsed.afkSummaryBaseline.map(normalizeAfkSummaryStats)
          : [];
        afkSummaryBaselineRef.current = restoredSummaryBaseline.some((stats): stats is AfkSummaryStats => stats !== null)
          ? latestPartiesRef.current.map((party, index) => restoredSummaryBaseline[index] ?? { ...party.expeditionStats })
          : latestPartiesRef.current.map((party) => ({ ...party.expeditionStats }));
        shouldShowAfkSummaryRef.current = parsed.shouldShowAfkSummary !== false;
        shouldRebuildPartyCyclesAfterAfkRef.current = true;
      }
      if (parsed.partyCycles && typeof parsed.partyCycles === 'object') {
        const restoredCycles: Record<number, PartyCycleRuntime> = {};
        Object.entries(parsed.partyCycles).forEach(([key, value]) => {
          if (!value || typeof value !== 'object') return;
          const runtime = value as Partial<PartyCycleRuntime> & { elapsedMs?: number };
          const stateStartedAt = typeof runtime.stateStartedAt === 'number'
            ? runtime.stateStartedAt
            : Date.now() - Math.max(0, runtime.elapsedMs ?? 0);
          restoredCycles[Number(key)] = {
            state: toPartyCycleState(runtime.state),
            stateStartedAt,
            durationMs: typeof runtime.durationMs === 'number' ? runtime.durationMs : 1000,
            restInitialTotalSteps:
              typeof runtime.restInitialTotalSteps === 'number'
              ? Math.max(1, Math.floor(runtime.restInitialTotalSteps))
              : undefined,
            sortieSourceState:
              runtime.sortieSourceState === 'rest'
              || runtime.sortieSourceState === 'free_action'
              || runtime.sortieSourceState === 'sleep'
              || runtime.sortieSourceState === 'return'
                ? runtime.sortieSourceState
                : undefined,
            sortieEmbezzlementGold:
              typeof runtime.sortieEmbezzlementGold === 'number'
              ? Math.max(0, Math.floor(runtime.sortieEmbezzlementGold))
              : undefined,
            isCurrentExpeditionGodsBattle: runtime.isCurrentExpeditionGodsBattle === true,
            wasLowHpAtRestStart: runtime.wasLowHpAtRestStart === true,
          };
        });
        setPartyCycles(restoredCycles);
      }
    } catch (error) {
      console.error('Failed to restore AFK runtime state:', error);
    } finally {
      pendingAfkSimulationRef.current = false;
    }
  }, [setAutoRepeatEnabled]);

  useEffect(() => {
    pendingAfkMsRef.current = pendingAfkMs;
    afkRecoveryCompletedMsRef.current = pendingAfkMs > 0
      ? Math.max(0, afkRecoveryTotalMsRef.current - pendingAfkMs)
      : 0;
  }, [pendingAfkMs]);

  useEffect(() => {
    if (pendingAfkMs > 0) return;
    if (!shouldShowAfkSummaryRef.current) return;
    const baselineStats = afkSummaryBaselineRef.current;
    if (!baselineStats) return;

    shouldShowAfkSummaryRef.current = false;
    afkSummaryBaselineRef.current = null;

    state.parties.forEach((party, partyIndex) => {
      const baseline = baselineStats[partyIndex];
      if (!baseline) return;

      const stats = {
        Clear: Math.max(0, party.expeditionStats.Clear - baseline.Clear),
        Turned_Back: Math.max(0, party.expeditionStats.Turned_Back - baseline.Turned_Back),
        Draw_Retreat: Math.max(0, party.expeditionStats.Draw_Retreat - baseline.Draw_Retreat),
        Wounded_Retreat: Math.max(0, party.expeditionStats.Wounded_Retreat - baseline.Wounded_Retreat),
        Defeat: Math.max(0, party.expeditionStats.Defeat - baseline.Defeat),
        donatedGold: Math.max(0, party.expeditionStats.donatedGold - baseline.donatedGold),
        savedGold: Math.max(0, party.expeditionStats.savedGold - baseline.savedGold),
      };

      const body = buildAfkSummaryNotification(stats);
      if (!body) return;

      actions.addNotification(`PT${partyIndex + 1}: ${body}`);
    });
  }, [actions, pendingAfkMs, state.parties]);

  useEffect(() => {
    if (pendingAfkMs <= 0) return;

    const timerId = window.setTimeout(() => {
      const autoRepeatEnabled = autoRepeatEnabledRef.current;
      // SpecRef: 5.1.1 | Party State Machine | Time-Based Progress Handling (Online + AFK)
      // Catch-up is processed in fixed-size chunks (12 cycles), scaled by debug speed.
      const catchupChunkMs = Math.max(
        PARTY_CYCLE_TICK_MS,
        Math.ceil(BASE_STEP_DURATION_MS * APPROX_CYCLE_STEP_COUNT * CHUNK_CYCLE_COUNT * Math.max(0.001, getTimeSpeedScale(debugSettings))),
      );
      const chunkElapsedMs = Math.min(pendingAfkMs, catchupChunkMs);
      const anchor = afkSimulationAnchorRef.current ?? Date.now();
      const simulatedEndAt = anchor - pendingAfkMs + chunkElapsedMs;
      actions.simulateAfk(
        chunkElapsedMs,
        autoRepeatEnabled,
        gameMode,
        simulatedEndAt,
        getTimeSpeedScale(debugSettings),
      );
      setPendingAfkMs((prev) => Math.max(0, prev - chunkElapsedMs));
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [actions, debugSettings, gameMode, pendingAfkMs]);

  useEffect(() => {
    if (pendingAfkMs > 0) return;

    if (shouldRebuildPartyCyclesAfterAfkRef.current) {
      const now = Date.now();
      const autoRepeatEnabled = autoRepeatEnabledRef.current;
      const recoveredAfkMs = Math.max(0, afkRecoveryTotalMsRef.current);
      const partialCycleSideEffects: Array<{ partyIndex: number; shouldFinalizeDiary: boolean; simulatedAt: number }> = [];
      const nextCycles: Record<number, PartyCycleRuntime> = {};

      latestPartiesRef.current.forEach((party, partyIndex) => {
        const { partyStats } = computePartyStats(party);
        const needsRest = party.currentHp < partyStats.hp;
        // SpecRef: 5.1.1 | Party State Machine | AFK → Online Transition Handling
        // Completed AFK expedition cycles are processed by the reducer; only the final
        // incomplete expedition cycle is restored as partial online progress. The state
        // that was active when AFK began is intentionally not preserved.
        if (needsRest) {
          nextCycles[partyIndex] = {
            state: 'rest',
            stateStartedAt: now,
            durationMs: getStateDurationMs(party, 'rest'),
            restInitialTotalSteps: getRestInitialTotalSteps(party.currentHp, partyStats.hp),
            isCurrentExpeditionGodsBattle: false,
            wasLowHpAtRestStart: false,
          };
          return;
        }

        if (!autoRepeatEnabled) {
          nextCycles[partyIndex] = {
            state: 'idle',
            stateStartedAt: now,
            durationMs: 1000,
            isCurrentExpeditionGodsBattle: false,
            wasLowHpAtRestStart: false,
          };
          return;
        }

        const durationScale = getTimeSpeedScale(debugSettings);
        const exploreDurationMultiplier = getPartyStateDurationMultiplier(party, 'explore');
        const approximateCycleDurationMs = Math.max(
          1,
          Math.ceil(BASE_STEP_DURATION_MS * APPROX_CYCLE_STEP_COUNT * durationScale * exploreDurationMultiplier),
        );
        const partialAfkMs = recoveredAfkMs % approximateCycleDurationMs;
        const moveDurationMs = getPartyTravelDurationMs(party, 'move');
        const exploreDurationMs = getExplorationDurationMs(undefined, exploreDurationMultiplier, durationScale);
        const returnDurationMs = getPartyTravelDurationMs(party, 'return');
        const onlineCycleDurationMs = Math.max(1, moveDurationMs + exploreDurationMs + returnDurationMs);
        const partialOnlineMs = Math.min(
          onlineCycleDurationMs - 1,
          Math.max(0, Math.floor((partialAfkMs / approximateCycleDurationMs) * onlineCycleDurationMs)),
        );

        if (partialOnlineMs < moveDurationMs) {
          nextCycles[partyIndex] = {
            state: 'move',
            stateStartedAt: now - partialOnlineMs,
            durationMs: moveDurationMs,
            isCurrentExpeditionGodsBattle: false,
            wasLowHpAtRestStart: false,
          };
          return;
        }

        const exploreElapsedMs = partialOnlineMs - moveDurationMs;
        const shouldTriggerGodsBattle = shouldAutoTriggerGodsBattle(party);
        const expeditionStartedAt = now - exploreElapsedMs;
        partialCycleSideEffects.push({
          partyIndex,
          shouldFinalizeDiary: exploreElapsedMs >= exploreDurationMs,
          simulatedAt: expeditionStartedAt,
        });

        if (exploreElapsedMs < exploreDurationMs) {
          nextCycles[partyIndex] = {
            state: 'explore',
            stateStartedAt: now - exploreElapsedMs,
            durationMs: exploreDurationMs,
            isCurrentExpeditionGodsBattle: shouldTriggerGodsBattle,
            wasLowHpAtRestStart: false,
          };
          return;
        }

        const returnElapsedMs = Math.min(returnDurationMs - 1, exploreElapsedMs - exploreDurationMs);
        nextCycles[partyIndex] = {
          state: 'return',
          stateStartedAt: now - returnElapsedMs,
          durationMs: returnDurationMs,
          isCurrentExpeditionGodsBattle: false,
          wasLowHpAtRestStart: false,
        };
      });

      partialCycleSideEffects.forEach(({ partyIndex, shouldFinalizeDiary, simulatedAt }) => {
        const party = latestPartiesRef.current[partyIndex];
        const triggerGodsBattle = party ? shouldAutoTriggerGodsBattle(party) : false;
        actions.runExpedition(partyIndex, gameModeRef.current, triggerGodsBattle, simulatedAt);
        if (shouldFinalizeDiary) {
          actions.finalizeDiaryLog(partyIndex, simulatedAt);
        }
      });

      setPartyCycles(nextCycles);
      shouldRebuildPartyCyclesAfterAfkRef.current = false;
    }

    afkSimulationAnchorRef.current = null;
    afkRecoveryTotalMsRef.current = 0;
    afkRecoveryCompletedMsRef.current = 0;
  }, [actions, debugSettings, pendingAfkMs]);

  useEffect(() => {
    const previousPendingAfkMs = previousPendingAfkMsRef.current;
    previousPendingAfkMsRef.current = pendingAfkMs;

    if (previousPendingAfkMs > 0 && pendingAfkMs === 0) {
      justCompletedAfkRecoveryRef.current = true;
    } else if (pendingAfkMs > 0) {
      justCompletedAfkRecoveryRef.current = false;
    }

    if (previousPendingAfkMs <= pendingAfkMs) return;

    runAutoEquipment(undefined, undefined, { suppressNotifications: true });
  }, [pendingAfkMs, runAutoEquipment]);

  const suppressNotificationsForAfkEmulation = pendingAfkMs > 0
    || shouldShowAfkSummaryRef.current
    || justCompletedAfkRecoveryRef.current;

  useEffect(() => {
    // SpecRef: 8.1.1 | Notification Logic & Display | notification while AFK mode
    // Only clear notifications while AFK catch-up is actively running; once pending AFK reaches 0,
    // the Spec 5.1 summary notification must be allowed to remain visible.
    if (pendingAfkMs <= 0) return;
    onDismissAllNotifications();
  }, [onDismissAllNotifications, pendingAfkMs]);

  // SpecRef: 5.1.1 | Party State Machine | Refresh Handling
  // On refresh, `state.reactivate` progress is re-based to 0/x using the restored pending AFK backlog.
  const afkRecoveryTotalMs = Math.max(pendingAfkMs, afkRecoveryTotalMsRef.current);
  const afkRecoveryCompletedMs = Math.max(0, afkRecoveryTotalMs - pendingAfkMs);
  const afkRecoveryProgressPercent = pendingAfkMs > 0
    ? Math.max(
        0,
        Math.min(
          100,
          (afkRecoveryCompletedMs / Math.max(1, afkRecoveryTotalMs)) * 100
        )
      )
    : null;

  const pendingGodsBattleByPartyRef = useRef<Record<number, boolean>>({});
  const afkQuestCarryMsRef = useRef<Record<number, number>>({});
  const partyCyclesRef = useRef<Record<number, PartyCycleRuntime>>({});

  useEffect(() => {
    partyCyclesRef.current = partyCycles;
  }, [partyCycles]);

  const persistAfkRuntimeState = useCallback((checkpointAt: number = lastCheckpointAtRef.current) => {
    if (pendingAfkSimulationRef.current) return;

    try {
      localStorage.setItem(
        AFK_RUNTIME_STORAGE_KEY,
        JSON.stringify({
          checkpointAt,
          autoRepeatEnabled: autoRepeatEnabledRef.current,
          partyCycles: partyCyclesRef.current,
          pendingAfkMs: pendingAfkMsRef.current,
          afkRecoveryTotalMs: afkRecoveryTotalMsRef.current,
          afkRecoveryCompletedMs: Math.max(0, afkRecoveryTotalMsRef.current - pendingAfkMsRef.current),
          afkSimulationAnchor: afkSimulationAnchorRef.current,
          afkSummaryBaseline: afkSummaryBaselineRef.current,
          shouldShowAfkSummary: shouldShowAfkSummaryRef.current,
        })
      );
    } catch (error) {
      console.error('Failed to persist AFK runtime state:', error);
    }
  }, []);

  useEffect(() => {
    persistAfkRuntimeState();
  }, [isAutoRepeatEnabled, partyCycles, pendingAfkMs, persistAfkRuntimeState]);
  const getScaledSideQuestSeconds = useCallback((durationMs: number) => {
    // SpecRef: 5.1.2 | Side Quest | Realtime Progress
    // Side-quest time progress follows debug-scaled runtime duration.
    return Math.max(1, Math.floor(durationMs / 1000));
  }, []);

  const processTimeCheckpoint = useCallback((now: number = Date.now()) => {
    const parties = latestPartiesRef.current;
    const autoRepeatEnabled = autoRepeatEnabledRef.current;
    const elapsedMs = Math.max(0, Math.min(now - lastCheckpointAtRef.current, AFK_MAX_ELAPSED_MS));
    if (elapsedMs < PARTY_CYCLE_TICK_MS) return;

    if (debugSettings.displayAfkDuration && elapsedMs > 60_000) {
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      actions.addNotification(t('home.notification.debug.elapsedSincePreviousUpdate', { seconds: formatNumber(elapsedSeconds) }));
    }

    // Long background spans should be simulated inside the reducer so each expedition
    // phase reads the latest pending profit / HP values instead of stale render snapshots.
    if (elapsedMs >= REDUCER_CATCHUP_THRESHOLD_MS) {
      if (pendingAfkMsRef.current <= 0) {
        afkSummaryBaselineRef.current = parties.map((party) => ({ ...party.expeditionStats }));
        shouldShowAfkSummaryRef.current = true;
      }
      afkSimulationAnchorRef.current = now;
      const nextPendingAfkMs = Math.min(AFK_MAX_ELAPSED_MS, pendingAfkMsRef.current + elapsedMs);
      // SpecRef: 5.1.1 | Party State Machine | Refresh Handling
      // Update AFK recovery refs synchronously before persistence so refresh restores the same x/y progress baseline.
      afkRecoveryTotalMsRef.current = Math.max(afkRecoveryTotalMsRef.current, nextPendingAfkMs);
      afkRecoveryCompletedMsRef.current = Math.max(0, afkRecoveryTotalMsRef.current - nextPendingAfkMs);
      pendingAfkMsRef.current = nextPendingAfkMs;
      setPendingAfkMs(nextPendingAfkMs);
      shouldRebuildPartyCyclesAfterAfkRef.current = true;
      lastCheckpointAtRef.current = now;
      persistAfkRuntimeState(now);
      return;
    }

    const unlimitedTimeSpeed = isUnlimitedTimeSpeed(debugSettings);
    const timeSpeedScale = Math.max(0.001, getTimeSpeedScale(debugSettings));

    parties.forEach((party, partyIndex) => {
      if (party.sideQuest?.type !== 'q.AFK') {
        afkQuestCarryMsRef.current[partyIndex] = 0;
        return;
      }

      if (unlimitedTimeSpeed) {
        const remainingSeconds = Math.max(0, party.sideQuest.target - party.sideQuest.progress);
        afkQuestCarryMsRef.current[partyIndex] = 0;
        if (remainingSeconds > 0) {
          const simulatedAt = lastCheckpointAtRef.current + elapsedMs;
          actions.advanceSideQuest(partyIndex, remainingSeconds, simulatedAt);
        }
        return;
      }

      const carriedMs = afkQuestCarryMsRef.current[partyIndex] ?? 0;
      const simulatedElapsedMs = elapsedMs / timeSpeedScale;
      const { gainedSeconds, remainderMs } = getElapsedWholeSeconds(carriedMs, simulatedElapsedMs);
      afkQuestCarryMsRef.current[partyIndex] = remainderMs;

      if (gainedSeconds > 0) {
        const simulatedAt = lastCheckpointAtRef.current + elapsedMs;
        actions.advanceSideQuest(partyIndex, gainedSeconds, simulatedAt);
      }
    });

    const simulationNow = lastCheckpointAtRef.current + elapsedMs;
    const suppressCycleNotificationsForAfk = pendingAfkMsRef.current > 0 || shouldShowAfkSummaryRef.current;

    setPartyCycles((prev) => {
      const next = { ...prev };
      const autoEquipmentPartyIndexes = new Set<number>();

      parties.forEach((party, partyIndex) => {
        const { partyStats: partyRuntimeStats } = computePartyStats(party);
        const needsRestBeforeCycleStart = party.currentHp < partyRuntimeStats.hp;
        const initialCycleState: PartyCycleState = needsRestBeforeCycleStart
          ? 'rest'
          : autoRepeatEnabled
            ? 'move'
            : 'idle';
        const runtime = next[partyIndex] ?? {
          state: initialCycleState,
          stateStartedAt: simulationNow,
          durationMs: initialCycleState === 'rest'
            ? getStateDurationMs(party, 'rest')
            : initialCycleState === 'move'
              ? getPartyTravelDurationMs(party, 'move')
              : 1000,
          restInitialTotalSteps: needsRestBeforeCycleStart
            ? getRestInitialTotalSteps(party.currentHp, partyRuntimeStats.hp)
            : undefined,
        };
        const updated = { ...runtime };
        const hpRatioAtRestStart = partyRuntimeStats.hp > 0 ? party.currentHp / partyRuntimeStats.hp : 1;
        if (updated.state === 'rest' && updated.wasLowHpAtRestStart === undefined) {
          updated.wasLowHpAtRestStart = hpRatioAtRestStart < 0.3;
          updated.restInitialTotalSteps = getRestInitialTotalSteps(party.currentHp, partyRuntimeStats.hp);
        }

        // SpecRef: 5.1.2 | Side Quest | Expiration
        if (party.sideQuest && simulationNow >= getScaledSideQuestExpiresAt(party.sideQuest, timeSpeedScale)) {
          actions.cancelSideQuest(partyIndex);
          if (!suppressCycleNotificationsForAfk) {
            actions.addNotification(t('home.notification.sideQuestFailed', { party: party.name, quest: resolveSideQuestShortText(party.sideQuest) }));
          }
          next[partyIndex] = updated;
          return;
        }

        if (updated.state === 'idle' && autoRepeatEnabled) {
          updated.state = 'move';
          updated.durationMs = getPartyTravelDurationMs(party, 'move');
          updated.stateStartedAt = simulationNow;
          updated.sortieSourceState = undefined;
          updated.sortieEmbezzlementGold = undefined;
        }

        if (updated.state === 'explore') {
          const exploredRooms = party.lastExpeditionLog?.entries.length;
          updated.durationMs = getExplorationDurationMs(
            exploredRooms,
            getPartyStateDurationMultiplier(party, 'explore'),
            getTimeSpeedScale(debugSettings),
          );
        }

        if (updated.state === 'rest') {
          const restTickDurationMs = getStateDurationMs(party, 'rest');
          const elapsedRestMs = Math.max(0, simulationNow - updated.stateStartedAt);
          const restTickCount = Math.floor(elapsedRestMs / Math.max(1, restTickDurationMs));
          // SpecRef: 5.1.1 | Party State Machine | state.rest
          const healPerTick = Math.max(REST_HEAL_MIN_HP, Math.ceil(partyRuntimeStats.hp * REST_HEAL_MAX_HP_RATIO));
          const projectedHp = Math.min(
            partyRuntimeStats.hp,
            party.currentHp + (restTickCount > 0 ? healPerTick * restTickCount : 0),
          );
          if (party.currentHp < partyRuntimeStats.hp && restTickCount > 0) {
            actions.healPartyHp(partyIndex, healPerTick * restTickCount);
            updated.stateStartedAt += restTickCount * restTickDurationMs;
          }
          const hasCompletedRestStep = restTickCount > 0;
          const startedRestAtFullHp = party.currentHp >= partyRuntimeStats.hp;
          if (projectedHp >= partyRuntimeStats.hp && (!startedRestAtFullHp || hasCompletedRestStep)) {
            // SpecRef: 8.3 | UI_EXPEDITION | Auto Destination Change Logic
            if (party.expeditionDestinationMode === 'auto') {
              const nextDungeon = DUNGEONS.find((dungeon) => dungeon.id === party.selectedDungeonId + 1 && dungeon.id <= 8);
              const selectedDifficultyOffset = party.expeditionDifficultyOffsetByDungeon?.[party.selectedDungeonId]
                ?? party.expeditionDifficultyOffset
                ?? 0;
              const hasClearedSelectedExpeditionAtLeastOnce = Boolean(
                party.defeatedBossExpeditions?.[party.selectedDungeonId],
              );
              const nextDungeonEntryUnlocked = nextDungeon
                ? isDungeonEntryUnlocked(party, nextDungeon.id)
                : false;
              const selectedDungeon = DUNGEONS.find((dungeon) => dungeon.id === party.selectedDungeonId);
              const selectedDungeonEnemyLevel = selectedDungeon?.expLevel ?? 0;
              const normalizedCondition = Math.max(-400, Math.min(400, Math.floor(party.condition)));
              const shouldAutoAdvanceDestination = Boolean(
                nextDungeon
                && selectedDungeon
                && hasClearedSelectedExpeditionAtLeastOnce
                && nextDungeonEntryUnlocked
                && (
                  (
                    (selectedDungeonEnemyLevel + selectedDifficultyOffset) <= party.level + 9
                    && normalizedCondition >= 250
                  )
                  || (
                    (selectedDungeonEnemyLevel + selectedDifficultyOffset) <= party.level + 10
                    && normalizedCondition >= 240
                  )
                  || (
                    (selectedDungeonEnemyLevel + selectedDifficultyOffset) <= party.level + 11
                    && normalizedCondition >= 230
                  )
                ),
              );
              if (shouldAutoAdvanceDestination && nextDungeon) {
                actions.autoSelectDungeon(partyIndex, nextDungeon.id);
              }
            }
            if (party.sideQuest?.type === 'q.healing') {
              const restSeconds = getScaledSideQuestSeconds(simulationNow - updated.stateStartedAt);
              actions.advanceSideQuest(partyIndex, restSeconds, simulationNow);
            }
            const hasTrophy = (party.lastExpeditionLog?.rewards.length ?? 0) > 0;
            const hasAutoSellItem = (party.lastExpeditionLog?.autoSellProfit ?? 0) > 0;
            if (hasTrophy || hasAutoSellItem) {
              updated.state = 'sell';
              updated.durationMs = getStateDurationMs(party, 'sell');
            } else {
              // SpecRef: 5.1.1 | Party State Machine | state.free_action
              updated.state = 'free_action';
              updated.durationMs = getStateDurationMs(party, 'free_action');
            }
            updated.restInitialTotalSteps = undefined;
            updated.stateStartedAt = simulationNow;
          }
        }

        let stateElapsedMs = Math.max(0, simulationNow - updated.stateStartedAt);
        let cyclePendingProfit = Math.max(0, party.pendingProfit ?? 0);
        while (updated.state !== 'rest' && stateElapsedMs >= updated.durationMs) {
          updated.stateStartedAt += updated.durationMs;
          stateElapsedMs -= updated.durationMs;

          if (updated.state === 'sell') {
              // SpecRef: 5.1.1 | Party State Machine | state.sell
              updated.state = 'free_action';
              updated.durationMs = getStateDurationMs(party, 'free_action');
            } else if (updated.state === 'free_action') {
              // SpecRef: 5.1.1 | Party State Machine | state.free_action
              const baseSpend = Math.floor((cyclePendingProfit * rollPercentInclusive(20, 40)) / 100);
              const squanderLevel = getPartyAbilityLevel(party, 'squander');
              const squanderMultiplier = squanderLevel >= 2 ? 1.5 : squanderLevel >= 1 ? 1.3 : 1;
              const spend = Math.min(cyclePendingProfit, Math.floor(baseSpend * squanderMultiplier));
              if (spend > 0) {
                if (!suppressCycleNotificationsForAfk) {
                  if (squanderLevel > 0) {
                    const lordName = getPartyAbilityOwnerName(party, 'squander') ?? t('common.unnamed');
                    actions.addNotification(t('home.notification.lordSquanderedGold', { party: party.name, lord: lordName, gold: formatNumber(spend) }));
                  } else {
                    actions.addNotification(t('home.notification.partySpentGold', { party: party.name, gold: formatNumber(spend) }));
                  }
                }
              }
              actions.spendPendingProfit(partyIndex, spend);
              if (party.sideQuest?.type === 'q.squander' && spend > 0) actions.advanceSideQuest(partyIndex, spend, simulationNow);
              cyclePendingProfit = Math.max(0, cyclePendingProfit - spend);
              if (party.currentSleepiness === 2) {
                updated.state = 'sound_sleep';
                updated.durationMs = getStateDurationMs(party, 'sound_sleep');
              } else {
                updated.state = 'pray';
                updated.durationMs = getStateDurationMs(party, 'pray');
              }
            } else if (updated.state === 'sound_sleep') {
              // SpecRef: 5.1.1 | Party State Machine | state.sound_sleep
              if (party.sideQuest?.type === 'q.sleeping' && updated.durationMs > 100) actions.advanceSideQuest(partyIndex, 1, simulationNow);
              autoEquipmentPartyIndexes.add(partyIndex);
              updated.state = 'pray';
              updated.durationMs = getStateDurationMs(party, 'pray');
            } else if (updated.state === 'pray') {
              const isNoFaith = isNoFaithDeity(party.deity.name);
              const donationRate = rollPercentInclusive(10, 33);
              const baseDonation = Math.floor((cyclePendingProfit * donationRate) / 100);
              const titheLevel = getPartyAbilityLevel(party, 'tithe');
              const titheBonusRate = isNoFaith ? 0 : (titheLevel >= 2 ? 0.15 : titheLevel >= 1 ? 0.1 : 0);
              const titheBonus = Math.floor(cyclePendingProfit * titheBonusRate);
              const donation = isNoFaith ? 0 : Math.min(cyclePendingProfit, baseDonation + titheBonus);
              const rawDeposit = Math.max(0, cyclePendingProfit - donation);
              const deposit = Math.floor(rawDeposit * getPrayerDepositMultiplier(party));
              const embezzled = Math.max(0, rawDeposit - deposit);
              actions.processPendingProfit(partyIndex, donation, deposit);
              if (party.sideQuest?.type === 'q.donation' && donation > 0) actions.advanceSideQuest(partyIndex, donation, simulationNow);
              if (party.sideQuest?.type === 'q.savings' && deposit > 0) actions.advanceSideQuest(partyIndex, deposit, simulationNow);
              if (party.sideQuest?.type === 'q.embezzlement' && embezzled > 0) actions.advanceSideQuest(partyIndex, embezzled, simulationNow);
              cyclePendingProfit = 0;
              if (donation > 0 || deposit > 0) {
                const embezzledText = embezzled > 0 ? t('home.notification.embezzledSuffix', { gold: formatNumber(embezzled) }) : '';
                if (!suppressCycleNotificationsForAfk) {
                  if (isNoFaith) {
                    actions.addNotification(t('home.notification.partySavedGold', { party: party.name, gold: formatNumber(deposit), suffix: embezzledText }));
                  } else if (titheLevel > 0) {
                    const pilgrimName = getPartyAbilityOwnerName(party, 'tithe') ?? t('common.unnamed');
                    actions.addNotification(t('home.notification.pilgrimDonatedAndSavedGold', { party: party.name, pilgrim: pilgrimName, donation: formatNumber(donation), deposit: formatNumber(deposit), suffix: embezzledText }));
                  } else {
                    actions.addNotification(t('home.notification.partyDonatedAndSavedGold', { party: party.name, donation: formatNumber(donation), deposit: formatNumber(deposit), suffix: embezzledText }));
                  }
                }
              }
              // SpecRef: 5.1.1 | Party State Machine | state.pray
              const shouldReturnToRest = party.currentHp < partyRuntimeStats.hp;
              if (shouldReturnToRest) {
                updated.state = 'rest';
                updated.durationMs = getStateDurationMs(party, 'rest');
                updated.wasLowHpAtRestStart = false;
                updated.restInitialTotalSteps = getRestInitialTotalSteps(party.currentHp, partyRuntimeStats.hp);
              } else {
                updated.state = autoRepeatEnabled ? 'move' : 'idle';
                updated.durationMs = updated.state === 'move' ? getPartyTravelDurationMs(party, 'move') : 1000;
                if (updated.state === 'move') {
                  updated.sortieSourceState = undefined;
                  updated.sortieEmbezzlementGold = undefined;
                }
              }
            } else if (updated.state === 'idle') {
              updated.durationMs = 1000;
            } else if (updated.state === 'move') {
              const triggerGodsBattle = pendingGodsBattleByPartyRef.current[partyIndex] === true
                || shouldAutoTriggerGodsBattle(party);
              pendingGodsBattleByPartyRef.current[partyIndex] = false;
              if (triggerGodsBattle && party.sideQuest) {
                actions.cancelSideQuest(partyIndex);
                if (!suppressCycleNotificationsForAfk) {
                  actions.addNotification(t('home.notification.sideQuestCancelledByGodBattle', { party: party.name }));
                }
              }
              if (party.sideQuest?.type === 'q.exercise') actions.advanceSideQuest(partyIndex, getScaledSideQuestSeconds(updated.durationMs), simulationNow);
              actions.runExpedition(partyIndex, gameModeRef.current, triggerGodsBattle, simulationNow);
              updated.state = 'explore';
              updated.durationMs = getExplorationDurationMs(
                undefined,
                getPartyStateDurationMultiplier(party, 'explore'),
                getTimeSpeedScale(debugSettings),
              );
              updated.isCurrentExpeditionGodsBattle = triggerGodsBattle;
            } else if (updated.state === 'explore') {
              actions.finalizeDiaryLog(partyIndex);
              updated.state = 'return';
              updated.durationMs = getPartyTravelDurationMs(party, 'return');
              updated.isCurrentExpeditionGodsBattle = false;
            } else if (updated.state === 'return') {
              if (party.sideQuest?.type === 'q.exercise') actions.advanceSideQuest(partyIndex, getScaledSideQuestSeconds(updated.durationMs), simulationNow);
              if (!party.sideQuest && !hasActiveNonGodBattleLootGateCondition(party)) {
                actions.rollSideQuest(partyIndex, party.selectedDungeonId, simulationNow);
              }
              actions.rollPartySleepiness(partyIndex);
              updated.state = 'rest';
              updated.durationMs = getStateDurationMs(party, 'rest');
              updated.restInitialTotalSteps = getRestInitialTotalSteps(party.currentHp, partyRuntimeStats.hp);
              updated.isCurrentExpeditionGodsBattle = false;
              updated.wasLowHpAtRestStart = hpRatioAtRestStart < 0.3;
            }

            if (updated.state === 'rest') {
              updated.stateStartedAt = simulationNow;
              stateElapsedMs = 0;
            }
        }

        next[partyIndex] = updated;
      });

      if (autoEquipmentPartyIndexes.size > 0) {
        runAutoEquipment(
          Array.from(autoEquipmentPartyIndexes),
          undefined,
          { suppressNotifications: suppressCycleNotificationsForAfk },
        );
      }

      return next;
    });

    lastCheckpointAtRef.current = now;
    persistAfkRuntimeState(now);
  }, [actions, persistAfkRuntimeState]);

  useEffect(() => {
    const id = window.setInterval(() => {
      processTimeCheckpoint();
    }, PARTY_CYCLE_TICK_MS);
    return () => window.clearInterval(id);
  }, [processTimeCheckpoint]);

  useEffect(() => {
    const id = window.setInterval(() => {
      persistAfkRuntimeState();
    }, 5000);

    return () => window.clearInterval(id);
  }, [persistAfkRuntimeState]);

  useEffect(() => {
    const handleFocus = () => {
      processTimeCheckpoint();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        processTimeCheckpoint();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [processTimeCheckpoint]);

  useEffect(() => {
    const persistLatestCheckpoint = () => {
      const now = Date.now();
      lastCheckpointAtRef.current = now;
      persistAfkRuntimeState(now);
    };

    const handleVisibilityPersist = () => {
      if (document.visibilityState === 'hidden') {
        persistLatestCheckpoint();
      }
    };

    window.addEventListener('beforeunload', persistLatestCheckpoint);
    window.addEventListener('pagehide', persistLatestCheckpoint);
    document.addEventListener('visibilitychange', handleVisibilityPersist);

    return () => {
      window.removeEventListener('beforeunload', persistLatestCheckpoint);
      window.removeEventListener('pagehide', persistLatestCheckpoint);
      document.removeEventListener('visibilitychange', handleVisibilityPersist);
    };
  }, [persistAfkRuntimeState]);

  // Item gain notifications after selling phase
  useEffect(() => {
    // SpecRef: 8.1.1 | Notification Logic & Display | notification while AFK mode
    state.parties.forEach((party, index) => {
      const previousLog = prevPartyLogsRef.current[index] ?? null;
      const previousLevel = prevPartyLevelsRef.current[index] ?? party.level;
      const currentLog = party.lastExpeditionLog;
      const hasNewLog = !!currentLog && currentLog !== previousLog;
      if (hasNewLog && currentLog && party.sideQuest) {
        const simulatedAt = lastCheckpointAtRef.current;
        if (party.sideQuest.type === 'q.treasure-super-rare') {
          const gained = currentLog.rewards.filter((item) => item.superRare > 0).length;
          if (gained > 0) actions.advanceSideQuest(index, gained, simulatedAt);
        }
        if (party.sideQuest.type === 'q.treasure-boss-rare') {
          const gained = currentLog.rewards.filter((item) => getItemRarityById(item.id) === 'bossRare').length;
          if (gained > 0) actions.advanceSideQuest(index, gained, simulatedAt);
        }
        if (party.sideQuest.type === 'q.poor-kid' && (currentLog.rewards.length ?? 0) === 0) {
          actions.advanceSideQuest(index, 1, simulatedAt);
        }
        if (party.sideQuest.type === 'q.consecutive-wins') {
          if (currentLog.finalOutcome === 'Clear') {
            actions.advanceSideQuest(index, 1, simulatedAt);
          } else {
            actions.setSideQuestProgress(index, 0);
          }
        }
        if (party.sideQuest.type === 'q.losers' && currentLog.finalOutcome === 'Defeat') {
          actions.advanceSideQuest(index, 1, simulatedAt);
        }
      }
      const hasLevelUp = party.level > previousLevel;

      if (hasLevelUp) {
        const representativeCharacter = party.characters[0];
        const equipSlotIncrease = representativeCharacter
          ? Math.max(
              0,
              computeCharacterStats(representativeCharacter, party.level).maxEquipSlots
                - computeCharacterStats(representativeCharacter, previousLevel).maxEquipSlots
            )
          : 0;

        const levelUpMessage = equipSlotIncrease > 0
          ? t('home.notification.partyLevelUpWithEquipmentSlot', { party: party.name, level: party.level, slots: equipSlotIncrease })
          : t('home.notification.partyLevelUp', { party: party.name, level: party.level });
        actions.addNotification(levelUpMessage);
      }

      const cycle = partyCycles[index];
      const cycleState = cycle?.state ?? null;
      const sellingFinished = cycleState !== 'sell';
      // SpecRef: 5.1.1 | Party State Machine | Immediate 出撃 / 神魔戦
      const isInstantSortieRewardNotificationPending = instantSortieRewardNotificationPendingRef.current[index] === true;
      const canAnnounceGains = isInstantSortieRewardNotificationPending
        || (cycleState !== 'explore' && cycleState !== 'return' && cycleState !== 'rest' && cycleState !== 'sell');
      const hasRewardsToNotify = (currentLog?.rewards.length ?? 0) > 0;
      const isAlreadyNotified = notifiedRewardLogRef.current[index] === currentLog;
      const justFinishedSelling = prevPartyCycleStateRef.current[index] === 'sell' && cycleState !== 'sell';

      if (hasRewardsToNotify && sellingFinished && canAnnounceGains && (hasNewLog || justFinishedSelling) && !isAlreadyNotified && currentLog) {
        if (suppressNotificationsForAfkEmulation) {
          notifiedRewardLogRef.current[index] = currentLog;
          return;
        }

        for (const item of currentLog.rewards) {
          const isSuperRare = item.superRare > 0;
          const itemName = getItemDisplayName(item);
          const rarity = getItemRarityById(item.id);
          actions.addNotification(
            t('home.notification.partyObtainedItem', { party: party.name, item: itemName }),
            rarity === 'eliteRare' || rarity === 'bossRare' || isSuperRare ? 'rare' : 'normal',
            'item',
            undefined,
            { rarity, isSuperRareItem: isSuperRare }
          );
        }
        notifiedRewardLogRef.current[index] = currentLog;
        instantSortieRewardNotificationPendingRef.current[index] = false;
      }

      if (hasNewLog && !hasRewardsToNotify) {
        notifiedRewardLogRef.current[index] = currentLog;
        instantSortieRewardNotificationPendingRef.current[index] = false;
      }
    });

    prevPartyLogsRef.current = state.parties.map((party) => party.lastExpeditionLog);
    prevPartyLevelsRef.current = state.parties.map((party) => party.level);
    prevPartyCycleStateRef.current = state.parties.map((_, index) => partyCycles[index]?.state ?? null);
    justCompletedAfkRecoveryRef.current = false;
  }, [state.parties, partyCycles, actions, suppressNotificationsForAfkEmulation]);

  useEffect(() => {
    state.parties.forEach((party, index) => {
      const prevQuest = prevSideQuestRef.current[index] ?? null;
      const nextQuest = party.sideQuest ?? null;
      if (!prevQuest && nextQuest && !suppressNotificationsForAfkEmulation) {
        actions.addNotification(getSideQuestAssignMessage(party.name, resolveSideQuestShortText(nextQuest)));
      }
      if (prevQuest && !nextQuest && !suppressNotificationsForAfkEmulation) {
        const latestDiary = party.diaryLogs?.[0];
        if (latestDiary?.triggers?.includes('sideQuest')) {
          const successMessage = getSideQuestSuccessMessage(party.name, latestDiary.sideQuestDetail);
          if (successMessage) {
            actions.addNotification(successMessage);
          }
        }
      }
    });
    prevSideQuestRef.current = state.parties.map((party) => party.sideQuest);
  }, [actions, state.parties, suppressNotificationsForAfkEmulation]);

  useEffect(() => {
    notifiedRewardLogRef.current = notifiedRewardLogRef.current.slice(0, state.parties.length);
    while (notifiedRewardLogRef.current.length < state.parties.length) {
      notifiedRewardLogRef.current.push(null);
    }
    prevPartyCycleStateRef.current = prevPartyCycleStateRef.current.slice(0, state.parties.length);
    while (prevPartyCycleStateRef.current.length < state.parties.length) {
      prevPartyCycleStateRef.current.push(null);
    }
  }, [state.parties.length]);

  useEffect(() => {
    if (suppressNotificationsForAfkEmulation) {
      prevShopPurchasesRef.current = state.global.shopPurchases;
      prevInventoryRef.current = state.global.inventory;
      return;
    }

    const newlyPurchasedItemIds: number[] = [];

    for (const [stockKey, currentPurchases] of Object.entries(state.global.shopPurchases)) {
      const previousPurchases = new Set(prevShopPurchasesRef.current[stockKey] ?? []);
      for (const stockItemKey of currentPurchases) {
        if (!previousPurchases.has(stockItemKey)) {
          const itemId = Number(stockItemKey.split('-')[0]);
          if (Number.isFinite(itemId)) newlyPurchasedItemIds.push(itemId);
        }
      }
    }

    if (newlyPurchasedItemIds.length > 0) {
      for (const itemId of newlyPurchasedItemIds) {
        const purchasedVariant = Object.values(state.global.inventory).find((variant) => {
          if (variant.item.id !== itemId) return false;
          const previousCount = prevInventoryRef.current[getVariantKey(variant.item)]?.count ?? 0;
          return variant.count > previousCount;
        });

        const autoSoldVariant = Object.values(state.global.inventory).find((variant) => {
          if (variant.item.id !== itemId || variant.status !== 'sold') return false;
          const previousVariant = prevInventoryRef.current[getVariantKey(variant.item)];
          return previousVariant?.status === 'sold' && previousVariant.count === variant.count;
        });

        const wasAutoSold = !purchasedVariant && Boolean(autoSoldVariant);
        const purchasedMasterItem = ITEMS.find((item) => item.id === itemId);

        const purchasedName = purchasedVariant
          ? getItemDisplayName(purchasedVariant.item)
          : autoSoldVariant
            ? getItemDisplayName(autoSoldVariant.item)
            : t('home.notification.shopPurchasedItemFallback', {
              item: purchasedMasterItem ? getLocalizedItemName(purchasedMasterItem) : t('common.unknown'),
            });

        if (wasAutoSold) {
          actions.addNotification(t('home.notification.shopBoughtAndAutoSold', { item: purchasedName }), 'normal', 'item', true);
          continue;
        }

        actions.addNotification(t('home.notification.shopBought', { item: purchasedName }), 'normal', 'item', true);
      }
    }

    prevShopPurchasesRef.current = state.global.shopPurchases;
    prevInventoryRef.current = state.global.inventory;
  }, [state.global.shopPurchases, state.global.inventory, actions, suppressNotificationsForAfkEmulation]);

  useEffect(() => {
    if (isPartyExpeditionSplitViewEnabled) {
      const expeditionScrollTop = tabScrollPositionsRef.current.expedition ?? 0;
      const secondaryScrollTop = tabScrollPositionsRef.current[activeWideModeSecondaryTab] ?? 0;
      primarySplitTabContentRef.current?.scrollTo({ top: expeditionScrollTop, behavior: 'auto' });
      secondarySplitTabContentRef.current?.scrollTo({ top: secondaryScrollTop, behavior: 'auto' });
      return;
    }

    const currentScrollTop = tabScrollPositionsRef.current[activeTab] ?? 0;
    if (prefersDocumentScroll) {
      window.scrollTo({ top: currentScrollTop, behavior: 'auto' });
      return;
    }

    tabContentRef.current?.scrollTo({ top: currentScrollTop, behavior: 'auto' });
  }, [activeTab, activeWideModeSecondaryTab, isPartyExpeditionSplitViewEnabled, prefersDocumentScroll]);

  const switchTab = (nextTab: Tab) => {
    if (isPartyExpeditionSplitViewEnabled) {
      const expeditionScrollTop = primarySplitTabContentRef.current?.scrollTop ?? 0;
      tabScrollPositionsRef.current.expedition = expeditionScrollTop;
      const currentSecondaryScrollTop = secondarySplitTabContentRef.current?.scrollTop ?? 0;
      tabScrollPositionsRef.current[activeWideModeSecondaryTab] = currentSecondaryScrollTop;

      if (nextTab === 'expedition') {
        return;
      }
      setActiveWideModeSecondaryTab(nextTab);
      return;
    }

    const currentScrollTop = prefersDocumentScroll
      ? window.scrollY
      : tabContentRef.current?.scrollTop ?? 0;
    tabScrollPositionsRef.current[activeTab] = currentScrollTop;

    if (nextTab === activeTab) return;
    const currentTabIndex = MAIN_TAB_ORDER.indexOf(activeTab);
    const nextTabIndex = MAIN_TAB_ORDER.indexOf(nextTab);
    setTabTransitionDirection(nextTabIndex > currentTabIndex ? 'forward' : 'backward');
    setActiveTab(nextTab);
  };

  const getPartyAbilityOwnerName = (party: Party, abilityId: string): string | null => {
    const { characterStats } = computePartyStats(party);
    const owner = party.characters.find((character) =>
      characterStats.find((stats) => stats.characterId === character.id)?.abilities.some((ability) => ability.id === abilityId)
    );
    return owner?.name ?? null;
  };

  const getPartyAbilityLevel = (party: Party, abilityId: string): number => {
    const { characterStats } = computePartyStats(party);
    return characterStats.reduce((maxLevel, stats) => {
      const level = stats.abilities
        .filter((ability) => ability.id === abilityId)
        .reduce((abilityMax, ability) => Math.max(abilityMax, ability.level), 0);
      return Math.max(maxLevel, level);
    }, 0);
  };

  const getPrayerDepositMultiplier = (party: Party): number => {
    const deityKey = getDeityKey(party.deity.name);
    const momentumLevel = getPartyAbilityLevel(party, 'momentum');
    const embezzlementRate =
      (deityKey === 'God of Cunning' ? 0.5 : 0)
      + (momentumLevel > 0 ? 0.1 : 0);

    // Embezzlement at pray end: God of Cunning +50%, Momentum (party has at least one) +10%.
    return Math.max(0, 1 - embezzlementRate);
  };

  // SpecRef: 5.1.1 | Party State Machine | Durration modifilier
  const getExploreTerrainDurationMultiplier = (party: Party, entryCount?: number): number => {
    const dungeon = DUNGEONS.find((entry) => entry.id === party.selectedDungeonId);
    if (!dungeon) return 1;

    const getFloorTerrainRoomMultiplier = (terrainEffect?: string): number => {
      if (terrainEffect === 'terrain.chill') return 2;
      if (terrainEffect === 'terrain.looping-path') return 2;
      return 1;
    };

    const floorByNumber = new Map(dungeon.floors.map((floor) => [floor.floorNumber, floor]));
    const roomsToEvaluate = Math.max(1, entryCount ?? (party.lastExpeditionLog?.entries.length ?? 0));
    const loggedRooms = party.lastExpeditionLog?.dungeonId === dungeon.id
      ? party.lastExpeditionLog.entries.slice(0, roomsToEvaluate)
      : [];

    if (loggedRooms.length > 0) {
      const weightedRoomMultiplierTotal = loggedRooms.reduce((total, room) => {
        const floor = typeof room.floor === 'number' ? floorByNumber.get(room.floor) : undefined;
        return total + getFloorTerrainRoomMultiplier(floor?.terrainEffect);
      }, 0);
      return weightedRoomMultiplierTotal / loggedRooms.length;
    }

    const fullDungeonRoomMultiplierTotal = dungeon.floors.reduce((total, floor) => (
      total + (4 * getFloorTerrainRoomMultiplier(floor.terrainEffect))
    ), 0);
    const fullDungeonRoomCount = dungeon.floors.length * 4;
    return fullDungeonRoomCount > 0 ? (fullDungeonRoomMultiplierTotal / fullDungeonRoomCount) : 1;
  };

  // SpecRef: 5.1.1 | Party State Machine | Durration modifilier
  const getPartyStateDurationMultiplier = (party: Party, cycleState: 'rest' | 'sell' | 'free_action' | 'sound_sleep' | 'pray' | 'explore'): number => {
    const deityGold = state.global.deityDonations[normalizeDeityName(party.deity.name)] ?? party.deityGold ?? 0;
    const deityMultiplier = getDeityStateDurationMultiplier(party.deity.name, deityGold, cycleState);
    if (cycleState !== 'explore') return deityMultiplier;
    const exploredRooms = party.lastExpeditionLog?.entries.length;
    return deityMultiplier * getExploreTerrainDurationMultiplier(party, exploredRooms);
  };

  // SpecRef: 5.1 | PROGRESS | Step
  const getStateDurationMs = (party: Party, cycleState: 'rest' | 'sell' | 'free_action' | 'sound_sleep' | 'pray'): number => {
    const durationScale = getTimeSpeedScale(debugSettings);
    const baseStepCount = cycleState === 'rest'
      ? 1
      : cycleState === 'sell'
        ? getAutoSellStepCount(party)
        : cycleState === 'free_action'
          ? FREE_ACTION_STEP_COUNT
          : cycleState === 'sound_sleep'
            ? SOUND_SLEEP_STEP_COUNT
            : PRAY_STEP_COUNT;
    return Math.max(100, Math.ceil(baseStepCount * BASE_STEP_DURATION_MS * durationScale * getPartyStateDurationMultiplier(party, cycleState)));
  };

  // SpecRef: 5.1.1 | Party State Machine | state.move
  // SpecRef: 5.1.1 | Party State Machine | state.return
  const getPartyTravelDurationMs = (party: Party, travelState: 'move' | 'return'): number => {
    // SpecRef: 5.1.1 | Party State Machine | Durration modifilier
    const isColosseum = party.selectedDungeonId === 99;
    const baseStepCount = isColosseum
      ? 1
      : travelState === 'move'
        ? 1 + getExpeditionTierDurationFactor(party.selectedDungeonId)
        : 5 + getExpeditionTierDurationFactor(party.selectedDungeonId);
    const durationScale = getTimeSpeedScale(debugSettings);
    const baseDurationMs = baseStepCount * BASE_STEP_DURATION_MS * durationScale;
    const peddlerLevel = getPartyAbilityLevel(party, 'peddler');
    if (peddlerLevel >= 2) return Math.max(100, Math.ceil((baseDurationMs * 3) / 5));
    if (peddlerLevel >= 1) return Math.max(100, Math.ceil((baseDurationMs * 2) / 3));
    return Math.max(100, Math.ceil(baseDurationMs));
  };

  const notifyExpeditionRewardsIfNeeded = (party: Party, partyIndex: number) => {
    const currentLog = party.lastExpeditionLog;
    if (!currentLog || currentLog.rewards.length <= 0) return;
    if (notifiedRewardLogRef.current[partyIndex] === currentLog) return;

    for (const item of currentLog.rewards) {
      const variantKey = getVariantKey(item);
      const inventoryCount = state.global.inventory[variantKey]?.count ?? 0;
      if (inventoryCount > 20) continue;

      const isSuperRare = item.superRare > 0;
      const itemName = getItemDisplayName(item);
      const rarity = getItemRarityById(item.id);
      actions.addNotification(
        t('home.notification.partyObtainedItem', { party: party.name, item: itemName }),
        rarity === 'eliteRare' || rarity === 'bossRare' || isSuperRare ? 'rare' : 'normal',
        'item',
        undefined,
        { rarity, isSuperRareItem: isSuperRare }
      );
    }

    notifiedRewardLogRef.current[partyIndex] = currentLog;
  };


  const triggerSortie = (partyIndex: number, triggerGodsBattle: boolean = false) => {
    const cycle = partyCycles[partyIndex];
    const party = state.parties[partyIndex];
    if (!party) return;
    const { partyStats } = computePartyStats(party);
    const now = Date.now();
    const instantChargeState = getInstantExpeditionChargeState(party, now);

    const isColosseumSortie = party.selectedDungeonId === 99;

    if (!isColosseumSortie && (party.currentHp <= 0 || partyStats.hp <= 0)) {
      const refusingCharacter = party.characters[Math.floor(Math.random() * party.characters.length)]?.name ?? `PT${partyIndex + 1}`;
      actions.addNotification(t('home.notification.characterRefusedExpedition', { character: refusingCharacter }));
      return;
    }

    // SpecRef: 8.3 | UI_EXPEDITION | "出撃" / "神魔戦" Buttons
    if (triggerGodsBattle && cycle?.state === 'move' && cycle.isCurrentExpeditionGodsBattle === true) {
      actions.addNotification(t('home.notification.partyAlreadyMovingToGodBattle', { party: party.name }));
      return;
    }
    // SpecRef: 8.3 | UI_EXPEDITION | Charge
    if (!isColosseumSortie && instantChargeState.stock <= 0) {
      actions.addNotification(t('home.notification.instantExpeditionChargeInsufficient', { party: party.name }));
      return;
    }

    const stolenProfit = Math.max(0, party.pendingProfit);

    if (stolenProfit > 0) {
      actions.addNotification(t('home.notification.instantExpeditionWithStolenGold', { party: party.name, gold: formatNumber(stolenProfit) }));
    } else {
      actions.addNotification(t('home.notification.instantExpeditionStarted', { party: party.name }));
    }

    notifyExpeditionRewardsIfNeeded(party, partyIndex);

    if (triggerGodsBattle && party.sideQuest) {
      actions.cancelSideQuest(partyIndex);
      actions.addNotification(t('home.notification.sideQuestCancelledByGodBattle', { party: party.name }));
    }

    pendingGodsBattleByPartyRef.current[partyIndex] = false;
    if (!isColosseumSortie) {
      actions.consumeInstantExpeditionStock(partyIndex, now);
    }
    if (cycle?.state === 'explore') {
      actions.finalizeDiaryLog(partyIndex);
    }
    actions.clearPendingProfit(partyIndex);
    actions.healPartyHp(partyIndex, partyStats.hp);
    // SpecRef: 5.1.1 | Party State Machine | Immediate 出撃 / 神魔戦
    instantSortieRewardNotificationPendingRef.current[partyIndex] = true;
    actions.resolveInstantExpedition(partyIndex, gameModeRef.current, triggerGodsBattle, now);
    actions.rollPartySleepiness(partyIndex);
    // SpecRef: 5.1.1 | Party State Machine | Instant full-cycle sortie
    // Manual expeditions and Gods Battles resolve the expedition and its return tail immediately,
    // leaving the runtime at the beginning of rest so normal rest healing still occurs.
    const finalRestDurationMs = getStateDurationMs(party, 'rest');
    setPartyCycles((prev) => ({
      ...prev,
      [partyIndex]: {
        state: 'rest',
        stateStartedAt: now,
        durationMs: finalRestDurationMs,
        restInitialTotalSteps: 1,
        isCurrentExpeditionGodsBattle: false,
      },
    }));
  };

  const isDiaryTabVisible = isPartyExpeditionSplitViewEnabled
    ? activeWideModeSecondaryTab === 'diary'
    : activeTab === 'diary';
  const prevDiaryTabVisibleRef = useRef(isDiaryTabVisible);
  useEffect(() => {
    if (prevDiaryTabVisibleRef.current && !isDiaryTabVisible) {
      actions.markAllDiaryLogsSeen();
    }
    prevDiaryTabVisibleRef.current = isDiaryTabVisible;
  }, [isDiaryTabVisible, actions]);

  const isSettingTabVisible = isPartyExpeditionSplitViewEnabled
    ? activeWideModeSecondaryTab === 'setting'
    : activeTab === 'setting';
  const prevSettingTabVisibleRef = useRef(isSettingTabVisible);
  const isDeveloperNewsPaneExpandedRef = useRef(false);
  const handleDeveloperNewsPaneExpandedChange = useCallback((expanded: boolean) => {
    isDeveloperNewsPaneExpandedRef.current = expanded;
  }, []);
  // SpecRef: 8.6 | UI_SETTING | Developer News Notification (通知)
  useEffect(() => {
    if (prevSettingTabVisibleRef.current && !isSettingTabVisible && isDeveloperNewsPaneExpandedRef.current) {
      actions.markDeveloperNewsRead(DEVELOPER_NEWS_ITEMS.map((item) => item.id));
    }
    prevSettingTabVisibleRef.current = isSettingTabVisible;
  }, [isSettingTabVisible, actions]);

  useEffect(() => {
    if (activeTab !== 'base' || activeBaseSubTab !== 'inventory') return;
    const hasNewInventoryItems = Object.values(state.global.inventory).some((variant) => variant.isNew);
    if (!hasNewInventoryItems) return;
    actions.markItemsSeen();
  }, [activeTab, activeBaseSubTab, state.global.inventory, actions]);

  setLanguage(state.global.language);
  const tabs: { id: Tab; label: string }[] = MAIN_TAB_ORDER.map((id) => ({
    id,
    label: t(`nav.${id}`),
  }));

  // SpecRef: 8.1 | UI_FOUNDATIONS | Navigation: Minimal scene transitions, tab-centered
  const completePrimaryNavSwipe = (clientX: number, clientY: number) => {
    const swipeStart = primaryNavPointerStartRef.current;
    primaryNavPointerStartRef.current = null;
    if (!swipeStart || isPartyExpeditionSplitViewEnabled) return;
    const deltaX = clientX - swipeStart.x;
    const deltaY = clientY - swipeStart.y;
    if (Math.abs(deltaX) < 36 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;
    primaryNavSwipeHandledRef.current = true;
    const currentIndex = MAIN_TAB_ORDER.indexOf(swipeStart.tab);
    if (currentIndex < 0) return;
    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    const nextTab = MAIN_TAB_ORDER[nextIndex];
    if (nextTab) switchTab(nextTab);
  };

  const unreadDiaryCount = state.parties.reduce((count, party) => (
    count + party.diaryLogs.filter((log) => !log.isRead).length
  ), 0);
  const hasUnreadDiary = unreadDiaryCount > 0;
  const unreadDiaryBadgeLabel = unreadDiaryCount >= 11 ? '10+' : `${unreadDiaryCount}`;
  // SpecRef: 8.6 | UI_SETTING | Developer News Notification (通知)
  const hasUnreadDeveloperNews = DEVELOPER_NEWS_ITEMS.some((item) => !(state.global.readDeveloperNewsItemIds ?? []).includes(item.id));
  const envLabel = getEnvLabel();
  const versionLabel = envLabel
    ? `${APP_VERSION}(${state.buildNumber}) ${envLabel}`
    : `${APP_VERSION}(${state.buildNumber})`;
  const gameTitle = t('app.title');

  useEffect(() => {
    document.title = gameTitle;
  }, [gameTitle]);

  const isPartyExpeditionSplitView = isPartyExpeditionSplitViewEnabled;

  const renderTabContent = (tab: Tab) => {
    if (tab === 'party') {
      return (
        <PartyTab
          parties={state.parties}
          selectedPartyIndex={safeSelectedPartyIndex}
          party={currentParty}
          partyStats={partyStats}
          characterStats={characterStats}
          selectedCharacter={selectedCharacter}
          setSelectedCharacter={setSelectedCharacter}
          editingCharacter={editingCharacter}
          setEditingCharacter={setEditingCharacter}
          onUpdateCharacter={actions.updateCharacter}
          onReorderPartyCharacter={actions.reorderPartyCharacter}
          onEquipItem={actions.equipItem}
          onToggleEquipmentLock={actions.toggleEquipmentLock}
          onAttachJewel={actions.attachJewel}
          onAddStatNotifications={actions.addStatNotifications}
          onSelectParty={actions.selectParty}
          onUpdatePartyDeity={actions.updatePartyDeity}
          onRunAutoEquipmentForCharacter={(characterId) => runAutoEquipment([safeSelectedPartyIndex], [characterId])}
          inventory={state.global.inventory}
          jewels={state.global.jewels}
          deityDonations={state.global.deityDonations}
          unlockedDeities={state.global.unlockedDeities}
          isDarkModeEnabled={isDarkModeEnabled}
        />
      );
    }

    if (tab === 'expedition') {
      const emulatedNowMs = afkSimulationAnchorRef.current !== null && pendingAfkMs > 0
        ? Math.max(0, afkSimulationAnchorRef.current - pendingAfkMs)
        : Date.now();
      return (
        <ExpeditionTab
          state={state}
          debugSettings={debugSettings}
          emulatedNowMs={emulatedNowMs}
          onSelectDungeon={actions.selectDungeon}
          onToggleExpeditionDestinationMode={actions.setExpeditionDestinationMode}
          onSetExpeditionDepthLimit={actions.setExpeditionDepthLimit}
          onSetExpeditionDifficultyOffset={actions.setExpeditionDifficultyOffset}
          onResetExpeditionStats={actions.resetExpeditionStats}
          isExpeditionStatsDisplayEnabled={isExpeditionStatsDisplayEnabled}
          partyCycles={partyCycles}
          afkRecoveryProgressPercent={afkRecoveryProgressPercent}
          afkRecoveryCompletedMs={afkRecoveryCompletedMs}
          afkRecoveryTotalMs={afkRecoveryTotalMs}
          onTriggerSortie={triggerSortie}
          expandedLogParty={expeditionExpandedLogParty}
          setExpandedLogParty={setExpeditionExpandedLogParty}
          expandedRoom={expeditionExpandedRoom}
          setExpandedRoom={setExpeditionExpandedRoom}
          isDarkModeEnabled={isDarkModeEnabled}
        />
      );
    }

    if (tab === 'base') {
      return (
        <BaseTab
          inventory={state.global.inventory}
          jewels={state.global.jewels}
          jewelAutoEquipPriorityPartyId={state.global.jewelAutoEquipPriorityPartyId ?? null}
          parties={state.parties}
          gold={state.global.gold}
          shopPurchases={state.global.shopPurchases}
          debugStorePurchases={state.global.jewelShopPurchases}
          shopRefreshCounts={state.global.shopRefreshCounts}
          shopIntimacy={state.global.shopIntimacy}
          shopIntimacyLastDecayAt={state.global.shopIntimacyLastDecayAt}
          onSellStack={actions.sellStack}
          onSetVariantStatus={actions.setVariantStatus}
          onBuyShopItem={actions.buyShopItem}
          onBuyDebugStoreItem={actions.buyDebugStoreItem}
          onRefreshShopLineup={actions.refreshShopLineup}
          onSetJewelAutoEquipPriorityParty={actions.setJewelAutoEquipPriorityParty}
          activeSubTab={activeBaseSubTab}
          onSetActiveSubTab={setActiveBaseSubTab}
          debugSettings={debugSettings}
        />
      );
    }

    if (tab === 'diary') {
      return (
        <DiaryTab
          parties={state.parties}
          onOpenDiaryLog={actions.markDiaryLogSeen}
          onUpdateDiarySettings={actions.updateDiarySettings}
          expandedLogs={diaryExpandedLogs}
          onSetExpandedLogs={setDiaryExpandedLogs}
          expandedRooms={diaryExpandedRooms}
          onSetExpandedRooms={setDiaryExpandedRooms}
          isSettingsExpanded={diarySettingsExpanded}
          onSetIsSettingsExpanded={setDiarySettingsExpanded}
          isDarkModeEnabled={isDarkModeEnabled}
        />
      );
    }

    return (
      <SettingTab
        gameState={state}
        deityDonations={state.global.deityDonations}
        onResetGame={handleResetGame}
        onImportGameState={actions.importGameState}
        onAddNotification={actions.addNotification}
        onResetCommonBags={actions.resetCommonBags}
        onResetUniqueBags={actions.resetUniqueBags}
        onResetSideQuestBag={actions.resetSideQuestBag}
        selectedBestiaryDungeonId={selectedBestiaryDungeonId}
        onSetSelectedBestiaryDungeonId={setSelectedBestiaryDungeonId}
        expandedBestiaryEnemies={expandedBestiaryEnemies}
        onSetExpandedBestiaryEnemies={setExpandedBestiaryEnemies}
        bestiaryScrollTop={bestiaryScrollTop}
        onSetBestiaryScrollTop={setBestiaryScrollTop}
        gameMode={gameMode}
        onSetGameMode={setGameMode}
        darkModeSetting={darkModeSetting}
        onSetDarkModeSetting={setDarkModeSetting}
        isAutoRepeatEnabled={isAutoRepeatEnabled}
        onSetAutoRepeatEnabled={setAutoRepeatEnabled}
        isExpeditionStatsDisplayEnabled={isExpeditionStatsDisplayEnabled}
        onSetExpeditionStatsDisplayEnabled={setIsExpeditionStatsDisplayEnabled}
        debugSettings={debugSettings}
        onUpdateDebugSettings={updateDebugSettings}
        partyCount={state.parties.length}
        onPartyUnlock={actions.unlockPartySlot}
        language={state.global.language}
        onSetLanguage={actions.setLanguage}
        onMarkDeveloperNewsRead={actions.markDeveloperNewsRead}
        onNewsPaneExpandedChange={handleDeveloperNewsPaneExpandedChange}
      />
    );
  };

  return (
    <div className={`flex flex-col ${prefersDocumentScroll ? 'min-h-screen' : 'h-screen'} ${gameMode === 'm.luna' ? 'theme-luna' : gameMode === 'm.laika' ? 'theme-laika' : ''} ${isDarkModeEnabled ? 'theme-dark' : ''}`}>
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="absolute inset-0 bg-white/25 backdrop-blur-[4px]" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-[500px] px-3 py-2.5 bg-white/25 backdrop-blur-[4px]">
          <div className="flex justify-between items-center gap-3 min-h-[44px]">
            <div className="pl-3">
              {/* SpecRef: 8.1.2 | Header | Game title label */}
              <h1 className="flex items-center gap-1 text-lg font-bold">
                <span aria-label={gameTitle}>
                  <span className="inline-block text-[1.35em] leading-none" style={{ transform: 'rotate(-22.5deg) scale(1.0)' }}>{t('home.nav.expeditionIcon')}</span>
                  <span>{t('setting.theme.kemo')}</span>
                </span>
                <span className="text-xs font-normal text-gray-500">{versionLabel}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 pr-3 text-right text-sm font-medium leading-none">
              <button
                type="button"
                onClick={async () => {
                  // SpecRef: 8.6 | UI_SETTING | Debug pane(デバッグ)
                  const confirmed = window.confirm(t('home.debug.reportProgressConfirm'));
                  if (!confirmed) return;
                  try {
                    const isReported = await reportProgressForSpeedOfTime();
                    if (!isReported) {
                      window.alert(t('home.debug.reportProgressUnset'));
                      return;
                    }
                    const bonusUntilMs = Date.now() + SPEED_OF_TIME_BONUS_DURATION_MS;
                    setTimeSpeedBonusUntilMs(bonusUntilMs);
                    updateDebugSettings({ timeSpeed: 'x1_2' });
                    actions.addNotification(t('home.debug.reportProgressSuccess'), 'normal', 'stat', true);
                  } catch (error) {
                    console.error('Failed to report progress for Speed of Time:', error);
                    window.alert(t('home.debug.reportProgressFailure'));
                  }
                }}
                className={`${IOS_GLASS_BUTTON_CLASS} px-2 py-1 text-sub hover:opacity-90`}
              >
                {speedOfTimeLabel ? `${speedOfTimeSymbol} ${speedOfTimeLabel}` : speedOfTimeSymbol}
              </button>
              <span>{formatNumber(state.global.gold)}G</span>
              {!isAutoRepeatEnabled && (
                <button
                  type="button"
                  onClick={() => setAutoRepeatEnabled(true)}
                  className={`${IOS_GLASS_BUTTON_CLASS} px-2 py-1 text-sub hover:opacity-90`}
                >
                  {t('home.header.paused')}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Tabs */}
      <nav
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2"
        aria-label="Main navigation"
        onPointerDown={(event) => { primaryNavSwipeHandledRef.current = false; primaryNavPointerStartRef.current = { x: event.clientX, y: event.clientY, tab: activeTab }; }}
        onPointerUp={(event) => completePrimaryNavSwipe(event.clientX, event.clientY)}
        onPointerCancel={() => { primaryNavPointerStartRef.current = null; }}
      >
        <div className="pointer-events-auto mx-auto flex w-full max-w-[500px] gap-1.5 rounded-[26px] border border-transparent bg-white/10 p-1.5 shadow-[0_8px_20px_rgb(15_23_42/0.10)] backdrop-blur-sm">
          {tabs.map(tab => {
            const isActive = (isPartyExpeditionSplitView && (tab.id === 'expedition' || tab.id === activeWideModeSecondaryTab)) || (!isPartyExpeditionSplitView && activeTab === tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (primaryNavSwipeHandledRef.current) {
                    primaryNavSwipeHandledRef.current = false;
                    return;
                  }
                  switchTab(tab.id);
                }}
                className={`${IOS_GLASS_TOP_TAB_CLASS} min-h-[44px] flex-1 px-1 py-2 text-xs font-semibold relative transition-colors ${
                  isActive
                    ? 'text-sub'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="relative z-10">{tab.label}</span>
                {tab.id === 'diary' && hasUnreadDiary && (
                  <span className="absolute -top-1 right-1 z-50 rounded-full bg-accent px-1.5 py-0.5 text-[10px] leading-none text-white">
                    {unreadDiaryBadgeLabel}
                  </span>
                )}
                {tab.id === 'setting' && hasUnreadDeveloperNews && (
                  <span className="absolute -top-1 right-1 z-50 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" aria-label="Unread developer news" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab Content */}
      <div
        ref={tabContentRef}
        className={prefersDocumentScroll ? `px-4 ${CHROME_CONTENT_PADDING_CLASS}` : `flex-1 px-4 ${CHROME_CONTENT_PADDING_CLASS} ${isPartyExpeditionSplitViewEnabled ? 'overflow-hidden' : 'overflow-y-auto'}`}
        onScroll={() => {
          if (prefersDocumentScroll || isPartyExpeditionSplitViewEnabled) return;
          const currentScrollTop = tabContentRef.current?.scrollTop ?? 0;
          tabScrollPositionsRef.current[activeTab] = currentScrollTop;
        }}
      >
        {isPartyExpeditionSplitView ? (
          <div
            className="grid h-full justify-center gap-4 items-start"
            style={{ gridTemplateColumns: `repeat(2, minmax(0, ${TAB_PANEL_WIDTH_PX}px))` }}
          >
            <div
              ref={primarySplitTabContentRef}
              className="h-full w-full min-w-0 overflow-y-auto"
              onScroll={() => {
                const currentScrollTop = primarySplitTabContentRef.current?.scrollTop ?? 0;
                tabScrollPositionsRef.current.expedition = currentScrollTop;
              }}
            >
              {renderTabContent('expedition')}
            </div>
            <div
              ref={secondarySplitTabContentRef}
              className="h-full w-full min-w-0 overflow-y-auto"
              onScroll={() => {
                const currentScrollTop = secondarySplitTabContentRef.current?.scrollTop ?? 0;
                tabScrollPositionsRef.current[activeWideModeSecondaryTab] = currentScrollTop;
              }}
            >
              {renderTabContent(activeWideModeSecondaryTab)}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[500px] overflow-x-hidden">
            <div key={activeTab} className={`main-tab-transition main-tab-transition-${tabTransitionDirection}`}>
              {renderTabContent(activeTab)}
            </div>
          </div>
        )}
      </div>

      <NotificationToast
        notifications={notifications}
        onDismiss={onDismissNotification}
        onDismissAll={onDismissAllNotifications}
      />
    </div>
  );
}

// SpecRef: 8.2 | UI_PARTY | Party tab
// SpecRef: 8.2.1 | Displays | Displays
// SpecRef: 8.2.2 | Party member details | Party member details
// SpecRef: 8.2.3 | Character Edit Mode (selected member): | Character Edit Mode (selected member):
// SpecRef: 8.2.4 | Equipment management | Equipment management
function PartyTab({
  parties,
  selectedPartyIndex,
  party,
  partyStats,
  characterStats,
  selectedCharacter,
  setSelectedCharacter,
  editingCharacter,
  setEditingCharacter,
  onUpdateCharacter,
  onReorderPartyCharacter,
  onEquipItem,
  onToggleEquipmentLock,
  onAttachJewel,
  onAddStatNotifications,
  onSelectParty,
  onUpdatePartyDeity,
  onRunAutoEquipmentForCharacter,
  inventory,
  jewels,
  deityDonations,
  unlockedDeities,
  isDarkModeEnabled,
}: {
  parties: Party[];
  selectedPartyIndex: number;
  party: Party;
  partyStats: ReturnType<typeof computePartyStats>['partyStats'];
  characterStats: ReturnType<typeof computePartyStats>['characterStats'];
  selectedCharacter: number;
  setSelectedCharacter: Dispatch<SetStateAction<number>>;
  editingCharacter: number | null;
  setEditingCharacter: Dispatch<SetStateAction<number | null>>;
  onUpdateCharacter: (id: number, updates: Partial<Character>) => void;
  onReorderPartyCharacter: (fromIndex: number, toIndex: number) => void;
  onEquipItem: (characterId: number, slotIndex: number, itemKey: string | null) => void;
  onToggleEquipmentLock: (characterId: number, slotIndex: number) => void;
  onAttachJewel: (characterId: number, slotIndex: number, jewelKey: JewelKey, rank: number) => void;
  onAddStatNotifications: (changes: Array<{ message: string; isPositive: boolean }>) => void;
  onSelectParty: (partyIndex: number) => void;
  onUpdatePartyDeity: (partyIndex: number, deityName: string) => void;
  onRunAutoEquipmentForCharacter: (characterId: number) => void;
  inventory: InventoryRecord;
  jewels: Record<string, number>;
  deityDonations: Record<string, number>;
  unlockedDeities: string[];
  isDarkModeEnabled: boolean;
}) {
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);
  const [equipCategory, setEquipCategory] = useState('armor');
  const [activeInlineDetailHelp, setActiveInlineDetailHelp] = useState<{ key: string; title: string; description: string } | null>(null);
  const [inlineDetailHelpPosition, setInlineDetailHelpPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [partyRarityFilter, setPartyRarityFilter] = useState<RarityFilter>('all');
  const [partySuperRareOnly, setPartySuperRareOnly] = useState(false);
  const [draggingCharacterIndex, setDraggingCharacterIndex] = useState<number | null>(null);
  const [isPartyPaneBackgroundAvailable, setIsPartyPaneBackgroundAvailable] = useState(false);
  const selectedChar = party.characters[selectedCharacter];
  const equippedItems = selectedChar.equipment.filter((item): item is Item => item != null);
  const unlockedRaceAbilities = getUnlockedRaceAbilitiesFromBonuses(equippedItems.flatMap((item) => item.bonuses ?? []));

  // Calculate current stats for notification: HP is party-wide, others are per selected character
  const selectedStats = characterStats[selectedCharacter];
  const selectedRace = RACES.find((race) => race.id === selectedChar.raceId);
  const isSelectedRaceUnlockConditionActive = unlockedRaceAbilities.has(selectedChar.raceId);
  const selectedIaigiriLevel = selectedStats.abilities.find(a => a.id === 'iaigiri')?.level ?? 0;
  const selectedIaigiriMultiplier = selectedIaigiriLevel >= 3 ? 3.0 : selectedIaigiriLevel >= 2 ? 2.5 : selectedIaigiriLevel >= 1 ? 2.0 : 1.0;
  const selectedEffectiveAccuracyBonus = getEffectiveAccuracyBonus(selectedStats.accuracyBonus, selectedStats.abilities);
  const selectedAbilityLevels = selectedStats.abilities.reduce<Record<string, number>>((acc, ability) => {
    acc[ability.id] = Math.max(acc[ability.id] ?? 0, ability.level);
    return acc;
  }, {});
  const selectedAbilityLevelSignature = Object.entries(selectedAbilityLevels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, level]) => `${id}:${level}`)
    .join('|');
  const selectedPhysicalDefenseResist = Math.max(0.01, selectedStats.physicalDefenseAmplifier * selectedStats.deityDefenseAmplifierBonus.physical);
  const selectedMagicalDefenseResist = Math.max(0.01, selectedStats.magicalDefenseAmplifier * selectedStats.deityDefenseAmplifierBonus.magical);
  const selectedMeleeAttackAmp = ((selectedIaigiriLevel > 0
    ? selectedIaigiriMultiplier * (1 + selectedStats.meleeAttackCBonus + getOffenseMultiplierSum(equippedItems, 'melee', selectedStats.offenseCBonusNames)) * selectedStats.physicalOffenseMultiplier
    : (1 + selectedStats.meleeAttackCBonus + getOffenseMultiplierSum(equippedItems, 'melee', selectedStats.offenseCBonusNames) + selectedStats.physicalAttackCBonus) * selectedStats.physicalOffenseMultiplier
  ) + selectedStats.deityOffenseAmplifierBonus) * getBaseOffenseScale(selectedStats.baseStats.strength);
  const selectedRangedAttackAmp = ((selectedIaigiriLevel > 0
    ? selectedIaigiriMultiplier * (1 + selectedStats.rangedAttackCBonus + getOffenseMultiplierSum(equippedItems, 'ranged', selectedStats.offenseCBonusNames)) * selectedStats.physicalOffenseMultiplier
    : (1 + selectedStats.rangedAttackCBonus + getOffenseMultiplierSum(equippedItems, 'ranged', selectedStats.offenseCBonusNames) + selectedStats.physicalAttackCBonus) * selectedStats.physicalOffenseMultiplier
  ) + selectedStats.deityOffenseAmplifierBonus) * getBaseOffenseScale(selectedStats.baseStats.strength);
  const selectedMagicalAttackAmp = getCharacterDisplayedMagicalAttackAmplifier(
    (((1 + selectedStats.magicalAttackCBonus + getOffenseMultiplierSum(equippedItems, 'magical', selectedStats.offenseCBonusNames)) * selectedStats.magicalOffenseMultiplier) + selectedStats.deityOffenseAmplifierBonus) * getBaseOffenseScale(selectedStats.baseStats.intelligence),
    selectedStats.abilities,
  );
  const combatTotals = {
    vitality: selectedStats.baseStats.vitality,
    strength: selectedStats.baseStats.strength,
    intelligence: selectedStats.baseStats.intelligence,
    mind: selectedStats.baseStats.mind,
    // Keep offense notifications aligned with the values shown in the status panel.
    meleeAtk: Math.round(selectedStats.meleeAttack),
    rangedAtk: Math.round(selectedStats.rangedAttack),
    magicalAtk: Math.round(selectedStats.magicalAttack),
    meleeNoA: selectedStats.meleeNoA,
    rangedNoA: selectedStats.rangedNoA,
    magicalNoA: selectedStats.magicalNoA,
    // Keep defense notifications aligned with the values shown in the status panel.
    physDef: Math.round(selectedStats.physicalDefense),
    magDef: Math.round(selectedStats.magicalDefense),
    physicalDefenseResistPercent: Math.round(selectedPhysicalDefenseResist * 100),
    magicalDefenseResistPercent: Math.round(selectedMagicalDefenseResist * 100),
    fireDefenseResistPercent: Math.round(Math.max(0.01, selectedStats.elementalDefenseMultipliers.fire) * 100),
    iceDefenseResistPercent: Math.round(Math.max(0.01, selectedStats.elementalDefenseMultipliers.ice) * 100),
    thunderDefenseResistPercent: Math.round(Math.max(0.01, selectedStats.elementalDefenseMultipliers.thunder) * 100),
    meleeAttackAmp: selectedMeleeAttackAmp,
    rangedAttackAmp: selectedRangedAttackAmp,
    magicalAttackAmp: selectedMagicalAttackAmp,
    accuracy: Math.round(selectedEffectiveAccuracyBonus * 1000),
    evasion: Math.round(selectedStats.evasionBonus * 1000),
    penet: Math.round(selectedStats.penetMultiplier * 100),
    hp: Math.floor(partyStats.hp),
    elementalOffense: selectedStats.elementalOffense,
    elementalOffensePercent: Math.round((selectedStats.elementalOffenseValue - 1) * 100),
    unlockRaceName: selectedRace?.name ?? '',
    unlockAbilityName: selectedRace?.unlockAbility?.name ?? '',
    unlockConditionActive: isSelectedRaceUnlockConditionActive,
    abilityLevels: selectedAbilityLevels,
  };

  const prevStatsRef = useRef<typeof combatTotals | null>(null);
  const prevSelectedCharRef = useRef(selectedCharacter);
  const prevSelectedPartyRef = useRef(selectedPartyIndex);
  const touchDraggingCharacterIndexRef = useRef<number | null>(null);
  const touchReorderTargetIndexRef = useRef<number | null>(null);
  const partyPaneBackgroundImageFileName = useMemo(() => {
    const partyNumber = selectedPartyIndex + 1;
    if (partyNumber < 1 || partyNumber > 6) return null;
    // SpecRef: 8.2 | UI_PARTY | Party Pane background image
    return `background/PT${partyNumber}.png`;
  }, [selectedPartyIndex]);

  useEffect(() => {
    if (!partyPaneBackgroundImageFileName) {
      setIsPartyPaneBackgroundAvailable(false);
      return;
    }

    const image = new Image();
    image.onload = () => setIsPartyPaneBackgroundAvailable(true);
    image.onerror = () => setIsPartyPaneBackgroundAvailable(false);
    image.src = `${import.meta.env.BASE_URL}${partyPaneBackgroundImageFileName}`;
  }, [partyPaneBackgroundImageFileName]);

  const getReorderedIndex = useCallback((currentIndex: number, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return currentIndex;
    if (currentIndex === fromIndex) return toIndex;
    if (fromIndex < toIndex && currentIndex > fromIndex && currentIndex <= toIndex) return currentIndex - 1;
    if (fromIndex > toIndex && currentIndex >= toIndex && currentIndex < fromIndex) return currentIndex + 1;
    return currentIndex;
  }, []);

  const reorderCharacter = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    onReorderPartyCharacter(fromIndex, toIndex);
    setSelectedCharacter((currentIndex) => getReorderedIndex(currentIndex, fromIndex, toIndex));
    setEditingCharacter((currentIndex) => {
      if (currentIndex === null) return null;
      return getReorderedIndex(currentIndex, fromIndex, toIndex);
    });
    setSelectingSlot(null);
  }, [getReorderedIndex, onReorderPartyCharacter, setEditingCharacter, setSelectedCharacter]);

  const confirmPartyCharacterReorder = useCallback(() => {
    // SpecRef: 8.2.2 | Party member details | Party member order swap confirmation
    return window.confirm(t('home.party.reorderConfirm'));
  }, []);

  const reorderCharacterWithConfirmation = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return false;
    if (!confirmPartyCharacterReorder()) return false;

    reorderCharacter(fromIndex, toIndex);
    return true;
  }, [confirmPartyCharacterReorder, reorderCharacter]);

  // Watch for stat changes after equipment - send individual notification per stat change
  useEffect(() => {
    // Skip notifications when switching party/characters (stats naturally differ)
    if (prevSelectedPartyRef.current !== selectedPartyIndex) {
      prevSelectedPartyRef.current = selectedPartyIndex;
      prevSelectedCharRef.current = selectedCharacter;
      prevStatsRef.current = combatTotals;
      return;
    }

    if (prevSelectedCharRef.current !== selectedCharacter) {
      prevSelectedCharRef.current = selectedCharacter;
      prevStatsRef.current = combatTotals;
      return;
    }
    if (prevStatsRef.current) {
      const prev = prevStatsRef.current;
      const changes: { message: string; isPositive: boolean }[] = [];
      const formatStatChange = (labelKey: string, previous: string | number, current: string | number): string =>
        t('home.party.statChange', { label: t(labelKey), previous, current });

      if (combatTotals.vitality !== prev.vitality) {
        const isPositive = combatTotals.vitality > prev.vitality;
        changes.push({ message: formatStatChange('common.stat.vitality', formatNumber(prev.vitality), formatNumber(combatTotals.vitality)), isPositive });
      }
      if (combatTotals.strength !== prev.strength) {
        const isPositive = combatTotals.strength > prev.strength;
        changes.push({ message: formatStatChange('common.stat.strength', formatNumber(prev.strength), formatNumber(combatTotals.strength)), isPositive });
      }
      if (combatTotals.intelligence !== prev.intelligence) {
        const isPositive = combatTotals.intelligence > prev.intelligence;
        changes.push({ message: formatStatChange('common.stat.intelligence', formatNumber(prev.intelligence), formatNumber(combatTotals.intelligence)), isPositive });
      }
      if (combatTotals.mind !== prev.mind) {
        const isPositive = combatTotals.mind > prev.mind;
        changes.push({ message: formatStatChange('common.stat.mind', formatNumber(prev.mind), formatNumber(combatTotals.mind)), isPositive });
      }

      // Check all stat changes and collect them
      if (combatTotals.physDef !== prev.physDef) {
        const isPositive = combatTotals.physDef > prev.physDef;
        changes.push({ message: formatStatChange('combat.physicalDefenseShort', formatNumber(prev.physDef), formatNumber(combatTotals.physDef)), isPositive });
      }
      if (combatTotals.magDef !== prev.magDef) {
        const isPositive = combatTotals.magDef > prev.magDef;
        changes.push({ message: formatStatChange('combat.magicalDefenseShort', formatNumber(prev.magDef), formatNumber(combatTotals.magDef)), isPositive });
      }
      if (combatTotals.physicalDefenseResistPercent !== prev.physicalDefenseResistPercent) {
        const isPositive = combatTotals.physicalDefenseResistPercent < prev.physicalDefenseResistPercent;
        changes.push({
          message: formatStatChange('home.party.physicalDefenseResistance', `${formatNumber(prev.physicalDefenseResistPercent)}%`, `${formatNumber(combatTotals.physicalDefenseResistPercent)}%`),
          isPositive,
        });
      }
      if (combatTotals.magicalDefenseResistPercent !== prev.magicalDefenseResistPercent) {
        const isPositive = combatTotals.magicalDefenseResistPercent < prev.magicalDefenseResistPercent;
        changes.push({
          message: formatStatChange('home.party.magicalDefenseResistance', `${formatNumber(prev.magicalDefenseResistPercent)}%`, `${formatNumber(combatTotals.magicalDefenseResistPercent)}%`),
          isPositive,
        });
      }
      if (combatTotals.fireDefenseResistPercent !== prev.fireDefenseResistPercent) {
        const isPositive = combatTotals.fireDefenseResistPercent < prev.fireDefenseResistPercent;
        changes.push({
          message: formatStatChange('home.party.fireDefenseResistance', `${formatNumber(prev.fireDefenseResistPercent)}%`, `${formatNumber(combatTotals.fireDefenseResistPercent)}%`),
          isPositive,
        });
      }
      if (combatTotals.iceDefenseResistPercent !== prev.iceDefenseResistPercent) {
        const isPositive = combatTotals.iceDefenseResistPercent < prev.iceDefenseResistPercent;
        changes.push({
          message: formatStatChange('home.party.iceDefenseResistance', `${formatNumber(prev.iceDefenseResistPercent)}%`, `${formatNumber(combatTotals.iceDefenseResistPercent)}%`),
          isPositive,
        });
      }
      if (combatTotals.thunderDefenseResistPercent !== prev.thunderDefenseResistPercent) {
        const isPositive = combatTotals.thunderDefenseResistPercent < prev.thunderDefenseResistPercent;
        changes.push({
          message: formatStatChange('home.party.thunderDefenseResistance', `${formatNumber(prev.thunderDefenseResistPercent)}%`, `${formatNumber(combatTotals.thunderDefenseResistPercent)}%`),
          isPositive,
        });
      }
      if (combatTotals.hp !== prev.hp) {
        const isPositive = combatTotals.hp > prev.hp;
        changes.push({ message: `HP ${formatNumber(prev.hp)} → ${formatNumber(combatTotals.hp)}`, isPositive });
      }
      if (combatTotals.meleeAtk !== prev.meleeAtk) {
        const isPositive = combatTotals.meleeAtk > prev.meleeAtk;
        changes.push({ message: formatStatChange('combat.meleeAttackShort', formatNumber(prev.meleeAtk), formatNumber(combatTotals.meleeAtk)), isPositive });
      }
      if (combatTotals.meleeNoA !== prev.meleeNoA) {
        const isPositive = combatTotals.meleeNoA > prev.meleeNoA;
        changes.push({ message: formatStatChange('home.party.meleeAttackCountShort', formatNumber(prev.meleeNoA), formatNumber(combatTotals.meleeNoA)), isPositive });
      }
      if (combatTotals.rangedAtk !== prev.rangedAtk) {
        const isPositive = combatTotals.rangedAtk > prev.rangedAtk;
        changes.push({ message: formatStatChange('combat.rangedAttackShort', formatNumber(prev.rangedAtk), formatNumber(combatTotals.rangedAtk)), isPositive });
      }
      if (combatTotals.rangedNoA !== prev.rangedNoA) {
        const isPositive = combatTotals.rangedNoA > prev.rangedNoA;
        changes.push({ message: formatStatChange('home.party.rangedAttackCountShort', formatNumber(prev.rangedNoA), formatNumber(combatTotals.rangedNoA)), isPositive });
      }
      if (combatTotals.magicalAtk !== prev.magicalAtk) {
        const isPositive = combatTotals.magicalAtk > prev.magicalAtk;
        changes.push({ message: formatStatChange('combat.magicalAttackShort', formatNumber(prev.magicalAtk), formatNumber(combatTotals.magicalAtk)), isPositive });
      }
      if (combatTotals.meleeAttackAmp !== prev.meleeAttackAmp) {
        const isPositive = combatTotals.meleeAttackAmp > prev.meleeAttackAmp;
        changes.push({ message: formatStatChange('home.party.help.meleeAttackMultiplierLabel', `x${prev.meleeAttackAmp.toFixed(2)}`, `x${combatTotals.meleeAttackAmp.toFixed(2)}`), isPositive });
      }
      if (combatTotals.rangedAttackAmp !== prev.rangedAttackAmp) {
        const isPositive = combatTotals.rangedAttackAmp > prev.rangedAttackAmp;
        changes.push({ message: formatStatChange('home.party.help.rangedAttackMultiplierLabel', `x${prev.rangedAttackAmp.toFixed(2)}`, `x${combatTotals.rangedAttackAmp.toFixed(2)}`), isPositive });
      }
      if (combatTotals.magicalAttackAmp !== prev.magicalAttackAmp) {
        const isPositive = combatTotals.magicalAttackAmp > prev.magicalAttackAmp;
        changes.push({ message: formatStatChange('home.party.help.magicalAttackMultiplierLabel', `x${prev.magicalAttackAmp.toFixed(2)}`, `x${combatTotals.magicalAttackAmp.toFixed(2)}`), isPositive });
      }
      if (combatTotals.magicalNoA !== prev.magicalNoA) {
        const isPositive = combatTotals.magicalNoA > prev.magicalNoA;
        changes.push({ message: formatStatChange('home.party.magicalAttackCountShort', formatNumber(prev.magicalNoA), formatNumber(combatTotals.magicalNoA)), isPositive });
      }
      if (combatTotals.accuracy !== prev.accuracy) {
        const isPositive = combatTotals.accuracy > prev.accuracy;
        changes.push({ message: `${t('party.bonus.accuracy')} ${prev.accuracy >= 0 ? '+' : ''}${formatNumber(prev.accuracy)} → ${combatTotals.accuracy >= 0 ? '+' : ''}${formatNumber(combatTotals.accuracy)}`, isPositive });
      }
      if (combatTotals.evasion !== prev.evasion) {
        const isPositive = combatTotals.evasion > prev.evasion;
        changes.push({ message: `${t('party.bonus.evasion')} ${prev.evasion >= 0 ? '+' : ''}${formatNumber(prev.evasion)} → ${combatTotals.evasion >= 0 ? '+' : ''}${formatNumber(combatTotals.evasion)}`, isPositive });
      }
      if (combatTotals.penet !== prev.penet) {
        const isPositive = combatTotals.penet > prev.penet;
        changes.push({ message: `${t('party.bonus.penet')} ${formatNumber(prev.penet)} → ${formatNumber(combatTotals.penet)}`, isPositive });
      }
      const elementalLabels: Record<Exclude<ElementalOffense, 'none'>, string> = {
        fire: t('common.element.fire.short'),
        ice: t('common.element.ice.short'),
        thunder: t('common.element.thunder.short'),
      };
      const prevElementPercents: Record<Exclude<ElementalOffense, 'none'>, number> = {
        fire: 0,
        ice: 0,
        thunder: 0,
      };
      const currentElementPercents: Record<Exclude<ElementalOffense, 'none'>, number> = {
        fire: 0,
        ice: 0,
        thunder: 0,
      };

      if (prev.elementalOffense !== 'none') {
        prevElementPercents[prev.elementalOffense] = prev.elementalOffensePercent;
      }
      if (combatTotals.elementalOffense !== 'none') {
        currentElementPercents[combatTotals.elementalOffense] = combatTotals.elementalOffensePercent;
      }

      (['fire', 'ice', 'thunder'] as const).forEach((element) => {
        if (prevElementPercents[element] === currentElementPercents[element]) return;
        const isPositive = currentElementPercents[element] > prevElementPercents[element];
        changes.push({
          message: t('home.party.elementalStatChange', { element: elementalLabels[element], previous: prevElementPercents[element], current: currentElementPercents[element] }),
          isPositive,
        });
      });

      if (
        combatTotals.unlockRaceName &&
        combatTotals.unlockAbilityName &&
        combatTotals.unlockConditionActive !== prev.unlockConditionActive
      ) {
        changes.push({
          message: combatTotals.unlockConditionActive
            ? t('home.party.abilityUnlocked', { race: combatTotals.unlockRaceName, ability: combatTotals.unlockAbilityName })
            : t('home.party.abilityLocked', { race: combatTotals.unlockRaceName, ability: combatTotals.unlockAbilityName }),
          isPositive: combatTotals.unlockConditionActive,
        });
      }

      const changedAbilityIds = new Set([
        ...Object.keys(prev.abilityLevels),
        ...Object.keys(combatTotals.abilityLevels),
      ]);
      changedAbilityIds.forEach((abilityId) => {
        const previousLevel = prev.abilityLevels[abilityId] ?? 0;
        const currentLevel = combatTotals.abilityLevels[abilityId] ?? 0;
        if (previousLevel === currentLevel) return;
        const abilityName = ABILITY_NAMES[abilityId] ?? abilityId;
        changes.push({
          message: t('home.party.abilityLevelChange', { ability: abilityName, previous: previousLevel, current: currentLevel }),
          isPositive: currentLevel > previousLevel,
        });
      });

      // Send all stat notifications at once (clears previous stat notifications)
      if (changes.length > 0) {
        onAddStatNotifications(changes);
      }
    }
    prevStatsRef.current = combatTotals;
  }, [combatTotals.vitality, combatTotals.strength, combatTotals.intelligence, combatTotals.mind,
      combatTotals.physDef, combatTotals.magDef, combatTotals.physicalDefenseResistPercent, combatTotals.magicalDefenseResistPercent,
      combatTotals.fireDefenseResistPercent, combatTotals.iceDefenseResistPercent, combatTotals.thunderDefenseResistPercent, combatTotals.hp,
      combatTotals.meleeAtk, combatTotals.meleeNoA,
      combatTotals.rangedAtk, combatTotals.rangedNoA,
      combatTotals.magicalAtk, combatTotals.magicalNoA,
      combatTotals.meleeAttackAmp, combatTotals.rangedAttackAmp, combatTotals.magicalAttackAmp,
      combatTotals.accuracy, combatTotals.evasion, combatTotals.penet,
      combatTotals.elementalOffense, combatTotals.elementalOffensePercent,
      combatTotals.unlockRaceName, combatTotals.unlockAbilityName, combatTotals.unlockConditionActive,
      selectedAbilityLevelSignature,
      onAddStatNotifications, selectedCharacter, selectedPartyIndex]);
  const [pendingEdits, setPendingEdits] = useState<Partial<Character> | null>(null);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showBaseStatHelp, setShowBaseStatHelp] = useState(false);
  const [baseStatHelpPosition, setBaseStatHelpPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [showAutoEquipmentHelp, setShowAutoEquipmentHelp] = useState(false);
  const [autoEquipmentHelpPosition, setAutoEquipmentHelpPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [activeStatusHelpKey, setActiveStatusHelpKey] = useState<string | null>(null);
  const [activeStatusHelpPosition, setActiveStatusHelpPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [editingDeity, setEditingDeity] = useState(false);
  const [pendingDeityName, setPendingDeityName] = useState(getDeityKey(party.deity.name) ?? party.deity.name);
  const [lastSlotTap, setLastSlotTap] = useState<{ slot: number; time: number } | null>(null);

  // Handle equipment slot tap with double-tap detection for removal
  const handleSlotTap = (slotIndex: number) => {
    const now = Date.now();
    const item = char.equipment[slotIndex];

    // Check for double-tap on same slot with item
    if (item && lastSlotTap && lastSlotTap.slot === slotIndex && now - lastSlotTap.time < 400) {
      // Double-tap: remove item
      onEquipItem(char.id, slotIndex, null);
      setLastSlotTap(null);
      setSelectingSlot(null);
      return;
    }

    setLastSlotTap({ slot: slotIndex, time: now });

    // Single tap: toggle selection
    setSelectingSlot(selectingSlot === slotIndex ? null : slotIndex);
  };

  const getEquipTargetSlotIndex = (): number | null => {
    if (selectingSlot !== null) return selectingSlot;

    const emptySlotIndex = Array.from({ length: stats.maxEquipSlots })
      .findIndex((_, i) => !char.equipment[i]);

    return emptySlotIndex !== -1 ? emptySlotIndex : null;
  };

  // Handle inventory item tap with auto-equip support
  const handleInventoryItemTap = (itemKey: string) => {
    const targetSlotIndex = getEquipTargetSlotIndex();
    if (targetSlotIndex === null) return;

    onEquipItem(char.id, targetSlotIndex, itemKey);
    if (selectingSlot !== null) {
      setSelectingSlot(null);
    }
  };

  // SpecRef: 2.2.1 | Potential default name for player side characters | Trigger: when race is changed.
  const getDefaultNameForRace = (raceId: RaceId): string => {
    const genderedPool = getPotentialDefaultNamesByPt()[party.id]?.[raceId];
    const ptCandidates = genderedPool?.[(pendingEdits?.gender ?? char.gender)] ?? [];
    if (ptCandidates.length === 0) return char.name;

    const usedNames = new Set(
      parties
        .flatMap((currentParty) => currentParty.characters)
        .filter((character) => character.id !== char.id)
        .map((character) => character.name)
    );

    const availableCandidates = ptCandidates.filter((candidate: string) => !usedNames.has(candidate));
    const candidatePool = availableCandidates.length > 0 ? availableCandidates : ptCandidates;
    return candidatePool[Math.floor(Math.random() * candidatePool.length)];
  };

  const handleRaceChange = (raceId: Character['raceId']) => {
    if (char.isUnique) return;
    setPendingEdits((prev) => ({
      ...prev,
      raceId,
      name: getDefaultNameForRace(raceId),
    }));
  };


  useEffect(() => {
    if (!editingDeity) {
      setPendingDeityName(getDeityKey(party.deity.name) ?? party.deity.name);
    }
  }, [party.deity.name, editingDeity]);

  const char = selectedChar;
  const stats = characterStats[selectedCharacter];
  const hpDisplayMultiplier = ((stats.baseStats.vitality + stats.baseStats.mind) / 20) * getCharacterGrowthMultiplier(char);
  const race = RACES.find(r => r.id === char.raceId) ?? RACES[0];
  const mainClass = CLASSES.find(c => c.id === char.mainClassId) ?? CLASSES[0];
  const subClass = CLASSES.find(c => c.id === char.subClassId) ?? CLASSES[0];
  const predisposition = PREDISPOSITIONS.find(p => p.id === char.predispositionId) ?? PREDISPOSITIONS[0];
  const lineage = LINEAGES.find(l => l.id === char.lineageId) ?? LINEAGES[0];
  // SpecRef: 8.2.2 | Party member details | Character image (background)
  const previewGender = pendingEdits?.gender ?? char.gender;
  const previewRaceId = pendingEdits?.raceId ?? char.raceId;
  const raceLabelByRaceId: Partial<Record<RaceId, string>> = {
    lupinian: 'Lupinian',
    vulpinian: 'Vulpinian',
    felidian: 'Felidian',
    caninian: 'Caninian',
    ursan: 'Ursan',
    procyonian: 'Procyonian',
    leporian: 'Leporian',
    cervin: 'Cervin',
    murid: 'Murid',
  };
  const genderLabelByGender: Partial<Record<Character['gender'], string>> = {
    male: 'Male',
    female: 'Female',
  };
  const uniquePartyMemberImageFileName = char.isUnique ? UNIQUE_PARTY_MEMBER_IMAGE_BY_LINEAGE[char.lineageId] : undefined;
  const raceLabel = raceLabelByRaceId[previewRaceId];
  const genderLabel = genderLabelByGender[previewGender];
  const ptRaceGenderImageFileName = party.id >= 1 && party.id <= 6 && raceLabel && genderLabel
    ? `${party.id}_${raceLabel}_${genderLabel}.png`
    : undefined;
  const raceGenderFallbackImageFileName = raceLabel && genderLabel
    ? `${raceLabel}_${genderLabel}.png`
    : undefined;
  const [partyMemberImageSrc, setPartyMemberImageSrc] = useState<string | null>(null);

  useEffect(() => {
    const nextPartyMemberImageSrc = uniquePartyMemberImageFileName
      ? `${import.meta.env.BASE_URL}character/${uniquePartyMemberImageFileName}`
      : ptRaceGenderImageFileName
        ? `${import.meta.env.BASE_URL}character/${ptRaceGenderImageFileName}`
        : raceGenderFallbackImageFileName
          ? `${import.meta.env.BASE_URL}character/${raceGenderFallbackImageFileName}`
          : null;
    setPartyMemberImageSrc(nextPartyMemberImageSrc);
  }, [uniquePartyMemberImageFileName, ptRaceGenderImageFileName, raceGenderFallbackImageFileName]);
  const raceCategoryDefinitions: Array<{ label: string; raceIds: Character['raceId'][] }> = [
    { label: t('home.party.filter.carnivore'), raceIds: ['lupinian', 'vulpinian', 'felidian'] },
    { label: t('home.party.filter.omnivore'), raceIds: ['caninian', 'ursan', 'procyonian'] },
    { label: t('home.party.filter.herbivore'), raceIds: ['leporian', 'cervin', 'murid'] },
  ];
  const classCategoryDefinitions: Array<{ label: string; classIds: Character['mainClassId'][] }> = [
    { label: t('combat.melee'), classIds: ['duelist', 'samurai', 'sword-saint'] },
    { label: t('combat.ranged'), classIds: ['ranger', 'striker', 'ninja'] },
    { label: t('combat.magic'), classIds: ['wizard', 'sage', 'alchemist'] },
    { label: t('home.party.filter.support'), classIds: ['guardian', 'pilgrim', 'lord'] },
  ];
  const classCategorySelectorGridClass = 'grid grid-cols-4 gap-1';
  const predispositionCategoryDefinitions: Array<{ label: string; ids: Character['predispositionId'][] }> = [
    { label: t('home.party.filter.extroverted'), ids: ['aggressive', 'inquisitive', 'amiable'] },
    { label: t('home.party.filter.introverted'), ids: ['stubborn', 'evasive', 'introspective'] },
    { label: t('home.party.filter.adaptation'), ids: ['devoted', 'serene', 'nimble'] },
    { label: t('home.party.filter.wit'), ids: ['perceptive', 'precise', 'resourceful'] },
  ];
  const lineageCategoryDefinitions: Array<{ label: string; ids: Character['lineageId'][] }> = [
    { label: t('home.party.filter.turmoil'), ids: ['sandstorm', 'ashen_capital', 'blaze_peak'] },
    { label: t('home.party.filter.hunting'), ids: ['abyssal_sea', 'firmament', 'frozen_forest'] },
    { label: t('home.party.filter.scholarship'), ids: ['utopia', 'machina', 'adaptation'] },
    { label: t('home.party.filter.survival'), ids: ['fragment', 'windcross', 'oath'] },
  ];
  const classById = new Map(CLASSES.map((classDef) => [classDef.id, classDef]));

  const getChangedEditKeys = (edits: Partial<Character> | null): (keyof Character)[] => {
    if (!edits) return [];

    return (Object.keys(edits) as (keyof Character)[]).filter((key) => {
      const nextValue = edits[key];
      if (nextValue === undefined) return false;
      return nextValue !== char[key];
    });
  };

  const displayedDeityName = normalizeDeityName(editingDeity ? pendingDeityName : party.deity.name);
  const displayedDeityKey = getDeityKey(displayedDeityName);
  const displayedDeityDonation = Object.entries(deityDonations).find(
    ([deityName]) => getDeityKey(deityName) === displayedDeityKey
  )?.[1] ?? 0;
  const unlockedDeityKeys = new Set(
    unlockedDeities
      .map((deityName) => getDeityKey(deityName))
      .filter((deityKey) => deityKey !== null && deityKey !== 'None')
  );
  const hasUnlockedReligions = unlockedDeityKeys.size > 0;
  const equippedItemCount = char.equipment.slice(0, stats.maxEquipSlots).filter((item) => item != null).length;
  const autoEquipmentMode = normalizeAutoEquipmentMode(char.autoEquipmentMode);

  const handleAutoEquipmentModeCycle = () => {
    const nextMode = ((autoEquipmentMode + 1) % 3) as AutoEquipmentMode;
    onUpdateCharacter(char.id, { autoEquipmentMode: nextMode });
  };

  const handleAutoEquipmentButtonClick = () => {
    // SpecRef: 8.2.4 | Equipment management | Auto equipment button(自動装備)
    if (autoEquipmentMode !== 2) return;
    onRunAutoEquipmentForCharacter(char.id);
  };

  const handleAutoEquipmentHelpToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (showAutoEquipmentHelp) {
      setShowAutoEquipmentHelp(false);
      setAutoEquipmentHelpPosition(null);
      return;
    }

    const triggerRect = event.currentTarget.getBoundingClientRect();
    const viewportPadding = 12;
    const tooltipWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - tooltipWidth,
    );

    setAutoEquipmentHelpPosition({
      top: triggerRect.bottom + 8,
      left,
      width: tooltipWidth,
    });
    setShowAutoEquipmentHelp(true);
  };

  const getEquipSlotReductionCount = (edits: Partial<Character> | null): number => {
    const changedKeys = getChangedEditKeys(edits);
    if (changedKeys.length === 0) return 0;

    const nextCharacter = { ...char, ...edits };
    const nextStats = computeCharacterStats(nextCharacter, party.level);
    return Math.max(0, stats.maxEquipSlots - nextStats.maxEquipSlots);
  };

  const hasEquippedItemInReducedSlots = (edits: Partial<Character> | null): boolean => {
    const changedKeys = getChangedEditKeys(edits);
    if (changedKeys.length === 0) return false;

    const nextCharacter = { ...char, ...edits };
    const nextStats = computeCharacterStats(nextCharacter, party.level);
    if (nextStats.maxEquipSlots >= stats.maxEquipSlots) return false;

    return char.equipment
      .slice(nextStats.maxEquipSlots, stats.maxEquipSlots)
      .some((item) => item != null);
  };

  const getCapabilityRemovalWarningState = (edits: Partial<Character> | null): { melee: boolean; ranged: boolean; magic: boolean } => {
    const changedKeys = getChangedEditKeys(edits);
    if (changedKeys.length === 0) {
      return { melee: false, ranged: false, magic: false };
    }

    const nextCharacter = { ...char, ...edits };
    const oldCombatBonuses = getCharacterCombatBonusLevels(char);
    const nextCombatBonuses = getCharacterCombatBonusLevels(nextCharacter);
    const lostMeleeAptitude = oldCombatBonuses.melee && !nextCombatBonuses.melee;
    const lostRangedAptitude = oldCombatBonuses.ranged && !nextCombatBonuses.ranged;
    const lostMagicAptitude = oldCombatBonuses.magic && !nextCombatBonuses.magic;

    if (!lostMeleeAptitude && !lostRangedAptitude && !lostMagicAptitude) {
      return { melee: false, ranged: false, magic: false };
    }

    const hasMeleeEquipment = lostMeleeAptitude && char.equipment.some((item) => item != null && MELEE_CATEGORIES.has(item.category));
    const hasRangedEquipment = lostRangedAptitude && char.equipment.some((item) => item != null && RANGED_CATEGORIES.has(item.category));
    const hasMagicEquipment = lostMagicAptitude && char.equipment.some((item) => item != null && MAGIC_CATEGORIES.has(item.category));

    return { melee: hasMeleeEquipment, ranged: hasRangedEquipment, magic: hasMagicEquipment };
  };

  const getEditConfirmWarnings = (edits: Partial<Character> | null): string[] => {
    const warnings: string[] = [];
    const equipSlotReductionCount = getEquipSlotReductionCount(edits);
    if (equipSlotReductionCount > 0) {
      warnings.push(t('home.party.equipmentSlotReductionWarning', { count: equipSlotReductionCount }));
    }

    const capabilityWarnings = getCapabilityRemovalWarningState(edits);
    if (capabilityWarnings.melee) {
      warnings.push(t('home.party.meleeCapabilityRemovedWarning'));
    }
    if (capabilityWarnings.ranged) {
      warnings.push(t('home.party.rangedCapabilityRemovedWarning'));
    }
    if (capabilityWarnings.magic) {
      warnings.push(t('home.party.magicCapabilityRemovedWarning'));
    }

    return warnings;
  };

  const editConfirmWarnings = getEditConfirmWarnings(pendingEdits);

  const completeCharacterEdit = () => {
    const changedKeys = getChangedEditKeys(pendingEdits);

    if (changedKeys.length === 0) {
      setPendingEdits(null);
      setEditingCharacter(null);
      setShowEditConfirm(false);
      return;
    }

    if (changedKeys.length === 1 && changedKeys[0] === 'name') {
      onUpdateCharacter(char.id, { name: pendingEdits?.name ?? char.name });
      setPendingEdits(null);
      setEditingCharacter(null);
      setShowEditConfirm(false);
      return;
    }

    const equipSlotReductionCount = getEquipSlotReductionCount(pendingEdits);
    const capabilityWarnings = getCapabilityRemovalWarningState(pendingEdits);
    const hasCapabilityRemovals = capabilityWarnings.melee || capabilityWarnings.ranged || capabilityWarnings.magic;
    if (equipSlotReductionCount === 0 && !hasCapabilityRemovals) {
      onUpdateCharacter(char.id, pendingEdits ?? {});
      setPendingEdits(null);
      setEditingCharacter(null);
      setShowEditConfirm(false);
      return;
    }

    if (equipSlotReductionCount > 0 && !hasEquippedItemInReducedSlots(pendingEdits) && !hasCapabilityRemovals) {
      onUpdateCharacter(char.id, pendingEdits ?? {});
      setPendingEdits(null);
      setEditingCharacter(null);
      setShowEditConfirm(false);
      return;
    }

    setShowEditConfirm(true);
  };

  const saveCharacterEditWithEquipmentReset = () => {
    const changedKeys = getChangedEditKeys(pendingEdits);
    if (changedKeys.length > 0 && pendingEdits) {
      onUpdateCharacter(char.id, pendingEdits);
    }

    setPendingEdits(null);
    setEditingCharacter(null);
    setShowEditConfirm(false);
  };

  const baseStatMultiplierRows = [
    { label: t('common.stat.vitality'), value: stats.baseStats.vitality, note: t('home.party.physicalResistance'), ratio: getBaseDefenseScale(stats.baseStats.vitality) },
    { label: t('common.stat.strength'), value: stats.baseStats.strength, note: t('home.party.physicalAttackMultiplier'), ratio: getBaseOffenseScale(stats.baseStats.strength) },
    { label: t('common.stat.intelligence'), value: stats.baseStats.intelligence, note: t('home.party.magicalAttackMultiplier'), ratio: getBaseOffenseScale(stats.baseStats.intelligence) },
    { label: t('common.stat.mind'), value: stats.baseStats.mind, note: t('home.party.magicalResistance'), ratio: getBaseDefenseScale(stats.baseStats.mind) },
  ];

  const hpContribution = computeCharacterHpContribution(char, party.level);
  const hpBaseIncrease = hpContribution.baseHpBonus;
  const hpItemIncrease = hpContribution.itemHpBonus;

  const availableCategoryGroups = getAvailableCategoryGroups(char);
  const availableCategories = availableCategoryGroups.flatMap(group => group.categories);

  useEffect(() => {
    if (!availableCategories.includes(equipCategory)) {
      setEquipCategory(availableCategories[0] ?? 'armor');
    }
  }, [availableCategories, equipCategory]);

  useEffect(() => {
    setShowBaseStatHelp(false);
    setBaseStatHelpPosition(null);
    setActiveStatusHelpKey(null);
    setActiveStatusHelpPosition(null);
    setShowAutoEquipmentHelp(false);
    setAutoEquipmentHelpPosition(null);
    setActiveInlineDetailHelp(null);
    setInlineDetailHelpPosition(null);
  }, [selectedCharacter, editingCharacter]);

  const xpToNextLevel = party.level < MAX_LEVEL ? Math.ceil(getXpToNextLevel(party.level)) : 0;
  const xpProgressPercent = xpToNextLevel > 0
    ? Math.min(100, Math.round((party.experience / xpToNextLevel) * 100))
    : 100;

  const handleBaseStatHelpToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (showBaseStatHelp) {
      setShowBaseStatHelp(false);
      setBaseStatHelpPosition(null);
      return;
    }

    const triggerRect = event.currentTarget.getBoundingClientRect();
    const viewportPadding = 12;
    const tooltipWidth = Math.min(320, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - tooltipWidth,
    );

    setBaseStatHelpPosition({
      top: triggerRect.bottom + 8,
      left,
      width: tooltipWidth,
    });
    setShowBaseStatHelp(true);
  };

  const handleStatusHelpToggle = (key: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const viewportPadding = 12;
    const tooltipWidth = Math.min(320, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - tooltipWidth,
    );

    setActiveStatusHelpKey((current) => {
      if (current === key) {
        setActiveStatusHelpPosition(null);
        return null;
      }

      setActiveStatusHelpPosition({
        top: triggerRect.bottom + 8,
        left,
        width: tooltipWidth,
      });
      return key;
    });
  };

  function handleInlineDetailHelpToggle(
    key: string,
    title: string,
    description: string,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const viewportPadding = 12;
    const tooltipWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - tooltipWidth,
    );

    setActiveInlineDetailHelp((current) => {
      if (current?.key === key) {
        setInlineDetailHelpPosition(null);
        return null;
      }

      setInlineDetailHelpPosition({
        top: triggerRect.bottom + 8,
        left,
        width: tooltipWidth,
      });
      return { key, title, description };
    });
  }

  const renderInlineBonusEntries = (entries: { key: string; label: string; description: string | null }[]) => {
    if (entries.length === 0) {
      return <span>-</span>;
    }

    return entries.map((entry, index) => (
      <Fragment key={entry.key}>
        {index > 0 && ', '}
        {entry.description ? (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              if (!entry.description) return;
              handleInlineDetailHelpToggle(entry.key, entry.label, entry.description, event);
            }}
            className="text-left hover:underline"
          >
            {entry.label}
          </button>
        ) : (
          <span>{entry.label}</span>
        )}
      </Fragment>
    ));
  };






  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onPointerDown={() => {
        if (showBaseStatHelp) {
          setShowBaseStatHelp(false);
          setBaseStatHelpPosition(null);
        }
        if (showAutoEquipmentHelp) {
          setShowAutoEquipmentHelp(false);
          setAutoEquipmentHelpPosition(null);
        }
        if (activeStatusHelpKey) {
          setActiveStatusHelpKey(null);
          setActiveStatusHelpPosition(null);
        }
        if (activeInlineDetailHelp) {
          setActiveInlineDetailHelp(null);
          setInlineDetailHelpPosition(null);
        }
      }}
    >
      {activeInlineDetailHelp && inlineDetailHelpPosition && (
        <FloatingBubblePortal>
          <div
            className="floating-bubble-pane fixed z-50 rounded-lg p-3"
            style={{
              top: inlineDetailHelpPosition.top,
              left: inlineDetailHelpPosition.left,
              width: inlineDetailHelpPosition.width,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="text-xs text-gray-700">
              <span className="font-semibold text-gray-800">{activeInlineDetailHelp.title}</span>
              <span> {activeInlineDetailHelp.description}</span>
            </div>
          </div>
        </FloatingBubblePortal>
      )}
      <div className="relative mb-4 overflow-hidden rounded-2xl p-2">
        {isPartyPaneBackgroundAvailable && partyPaneBackgroundImageFileName && (
          <>
            <div
              // SpecRef: 8.2 | UI_PARTY | Party Pane background image
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                backgroundImage: `linear-gradient(${isDarkModeEnabled ? 'rgb(2 6 23 / 0.34), rgb(2 6 23 / 0.34)' : 'rgb(255 255 255 / 0), rgb(255 255 255 / 0)'}), url(${import.meta.env.BASE_URL}${partyPaneBackgroundImageFileName})`,
                backgroundPosition: 'center bottom',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'auto 120%',
                opacity: isDarkModeEnabled ? 0.68 : 0.9,
              }}
            />
            <div
              // SpecRef: 8.2 | UI_PARTY | Party Pane background image
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                backgroundColor: isDarkModeEnabled ? 'rgba(15, 23, 42, 0.40)' : 'rgba(255, 255, 255, 0.56)',
              }}
            />
          </>
        )}
        <div className="relative z-20">
      {parties.length >= 1 && (
        // SpecRef: 8.2.1 | Displays | Party List
        <div className="liquid-glass-segmented party-pt-segmented mb-4 flex gap-1 rounded-2xl p-1">
          {parties.map((partyEntry, partyIndex) => {
            const isSelected = partyIndex === selectedPartyIndex;
            return (
              <button
                key={partyEntry.id}
                onClick={() => {
                  onSelectParty(partyIndex);
                  setEditingDeity(false);
                  setPendingDeityName(getDeityKey(parties[partyIndex].deity.name) ?? parties[partyIndex].deity.name);
                }}
                className={`${IOS_GLASS_TAB_CLASS} flex-1 px-1 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'liquid-glass-tab-active text-sub'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                PT{partyIndex + 1}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative z-20 mb-3 text-sm flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-gray-600">
            {t('party.status.hp')} {formatNumber(Math.floor(partyStats.hp))}, {t('party.status.level')} {formatNumber(party.level)} ({party.level < MAX_LEVEL ? `${formatNumber(xpProgressPercent)}%, ${formatNumber(party.experience)}` : `100%, ${formatNumber(party.experience)}`})
          </div>
          {hasUnlockedReligions && (
            <>
              <div className="font-medium mt-1">
                {displayedDeityName}
                {!isNoFaithDeity(displayedDeityName) ? ` (${t('party.deity.rank', { rank: getDeityRank(displayedDeityDonation) })})` : ''}
              </div>
              <div className="text-xs text-gray-600 mt-1">{t('party.deity.effect')}:{isNoFaithDeity(displayedDeityName) ? t('common.none') : getDeityEffectDescription(displayedDeityName, displayedDeityDonation)}</div>
            </>
          )}
        </div>
        {hasUnlockedReligions && editingDeity ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onUpdatePartyDeity(selectedPartyIndex, pendingDeityName);
                  setEditingDeity(false);
                }}
                className="text-sm text-white bg-sub/80 px-3 py-1 rounded whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.done')}
              </button>
              <button
                onClick={() => {
                  setPendingDeityName(getDeityKey(party.deity.name) ?? party.deity.name);
                  setEditingDeity(false);
                }}
                className={`text-sm px-3 py-1 rounded whitespace-nowrap ${isDarkModeEnabled ? 'text-slate-300 bg-slate-700/80 border border-slate-500' : 'text-gray-600 bg-gray-200/80'}`}
              >
                {t('common.cancel')}
              </button>
            </div>
            <select
              value={pendingDeityName}
              onChange={(e) => setPendingDeityName(e.target.value)}
              className="text-sm border rounded px-3 py-1.5"
            >
              {DEITY_OPTIONS.filter((deity) => {
                return deity.key === 'None'
                  || unlockedDeityKeys.has(deity.key)
                  || getDeityKey(party.deity.name) === deity.key;
              }).map((deity) => {
                const unlocked = deity.key === 'None'
                  || unlockedDeityKeys.has(deity.key)
                  || getDeityKey(party.deity.name) === deity.key;
                const inUseByOtherParty = deity.key !== 'None' && parties.some((partyCandidate, index) =>
                  index !== selectedPartyIndex && getDeityKey(partyCandidate.deity.name) === deity.key
                );
                return (
                  <option
                    key={deity.key}
                    value={deity.key}
                    disabled={!unlocked || inUseByOtherParty}
                  >
                    {deity.name}
                  </option>
                );
              })}
            </select>
          </div>
        ) : hasUnlockedReligions ? (
          <button
            onClick={() => {
              setPendingDeityName(getDeityKey(party.deity.name) ?? party.deity.name);
              setEditingDeity(true);
            }}
            className="text-sm text-sub flex-shrink-0"
          >
            {t('common.edit')}
          </button>
        ) : null}
      </div>

      {hasUnlockedReligions && editingDeity && (
        <div className="mb-3 text-xs text-gray-500">
          {t('home.party.reorderLongPressHint')}
        </div>
      )}

      {/* Character selector */}
      <div className="liquid-glass-segmented mb-0 grid grid-cols-6 justify-items-center gap-1 rounded-2xl p-1.5">
        {party.characters.map((c, i) => {
          const r = RACES.find(r => r.id === c.raceId)!;
          const mc = CLASSES.find(cl => cl.id === c.mainClassId)!;
          const sc = CLASSES.find(cl => cl.id === c.subClassId)!;
          const isMaster = c.mainClassId === c.subClassId;
          const mcShort = CLASS_SHORT_NAMES[mc.id] ?? mc.name;
          const scShort = CLASS_SHORT_NAMES[sc.id] ?? sc.name;
          const predispositionData = PREDISPOSITIONS.find((p) => p.id === c.predispositionId);
          const lineageData = LINEAGES.find((l) => l.id === c.lineageId);
          const predispositionShort = predispositionData?.shortName ?? PREDISPOSITION_SHORT_NAME_KEYS[c.predispositionId] ? t(PREDISPOSITION_SHORT_NAME_KEYS[c.predispositionId]) : c.predispositionId;
          const lineageShort = lineageData?.shortName ?? LINEAGE_SHORT_NAME_KEYS[c.lineageId] ? t(LINEAGE_SHORT_NAME_KEYS[c.lineageId]) : c.lineageId;
          const uniquePreviewImageFileName = c.isUnique ? UNIQUE_PARTY_MEMBER_IMAGE_BY_LINEAGE[c.lineageId] : undefined;
          const previewPtRaceGenderImageFileName = !uniquePreviewImageFileName
            ? `${party.id}_${r.englishName}_${c.gender === 'male' ? 'Male' : 'Female'}.png`
            : undefined;
          const previewImageSrc = uniquePreviewImageFileName
            ? `${import.meta.env.BASE_URL}character/${uniquePreviewImageFileName}`
            : previewPtRaceGenderImageFileName
              ? `${import.meta.env.BASE_URL}character/${previewPtRaceGenderImageFileName}`
              : null;
          return (
            <button
              key={c.id}
              type="button"
              draggable
              style={{ zIndex: party.characters.length - i }}
              onDragStart={(event) => {
                setDraggingCharacterIndex(i);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', String(i));
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceIndex = Number(event.dataTransfer.getData('text/plain'));
                reorderCharacterWithConfirmation(Number.isNaN(sourceIndex) ? i : sourceIndex, i);
                setDraggingCharacterIndex(null);
              }}
              onDragEnd={() => {
                setDraggingCharacterIndex(null);
              }}
              onTouchStart={() => {
                touchDraggingCharacterIndexRef.current = i;
                touchReorderTargetIndexRef.current = null;
                setDraggingCharacterIndex(i);
              }}
              onTouchMove={(event) => {
                const touch = event.touches[0];
                if (!touch) return;
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                const dropTarget = target?.closest<HTMLButtonElement>('[data-party-character-index]');
                if (!dropTarget) return;
                const toIndex = Number(dropTarget.dataset.partyCharacterIndex);
                const fromIndex = touchDraggingCharacterIndexRef.current;
                if (fromIndex === null || Number.isNaN(toIndex) || fromIndex === toIndex) return;

                touchReorderTargetIndexRef.current = toIndex;
                setDraggingCharacterIndex(toIndex);
              }}
              onTouchEnd={() => {
                const fromIndex = touchDraggingCharacterIndexRef.current;
                const toIndex = touchReorderTargetIndexRef.current;
                touchDraggingCharacterIndexRef.current = null;
                touchReorderTargetIndexRef.current = null;
                setDraggingCharacterIndex(null);

                if (fromIndex === null || toIndex === null || fromIndex === toIndex) return;
                reorderCharacterWithConfirmation(fromIndex, toIndex);
              }}
              onClick={() => { setSelectedCharacter(i); setSelectingSlot(null); }}
              className={`${IOS_GLASS_BUTTON_CLASS} relative w-[50px] overflow-visible min-w-0 p-0 transition-colors ${
                i === selectedCharacter ? 'liquid-glass-tab-active border-sub' : 'border-white/55 hover:bg-white/65'
              } ${draggingCharacterIndex === i ? 'opacity-70 border-sub' : ''}`}
              data-party-character-index={i}
            >
              {/* SpecRef: 8.2 | UI_PARTY | List of party members pane */}
              <div className="party-member-pane-bg relative h-[110px] w-[50px] overflow-visible rounded-xl bg-white/40">
                {previewImageSrc && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-[240%] w-[220%] -translate-x-1/2 bg-contain bg-bottom bg-no-repeat"
                    style={{ backgroundImage: `url(${previewImageSrc})` }}
                  />
                )}
                <div className="absolute inset-0 z-10 overflow-hidden rounded-xl">
                  {!previewImageSrc && (
                    <div className="flex h-full w-full items-center justify-center"><RaceIcon race={r} className="h-7 w-7" /></div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/35 to-transparent px-1 py-0.5 text-center text-[10px] leading-tight text-white">
                    <div>{mcShort}({isMaster ? t('party.class.masterShort') : scShort})</div>
                    <div>{lineageShort}/{predispositionShort}</div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      </div>
      </div>

      {/* Character details */}
      <div className="relative overflow-visible bg-pane rounded-lg border border-gray-200 p-4 mb-4 shadow-md shadow-slate-900/15">
        {partyMemberImageSrc && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg" aria-hidden="true">
            {isDarkModeEnabled && (
              <div
                // SpecRef: 8.2.2 | Party member details | Display character image
                className="absolute inset-0 bg-slate-500/20"
                aria-hidden="true"
              />
            )}
            {/* SpecRef: 8.2.2 | Party member details | Display character image */}
            <img
              src={partyMemberImageSrc}
              alt=""
              aria-hidden="true"
              onError={() => {
                if (!ptRaceGenderImageFileName || !raceGenderFallbackImageFileName) {
                  setPartyMemberImageSrc(null);
                  return;
                }

                const fallbackSrc = `${import.meta.env.BASE_URL}character/${raceGenderFallbackImageFileName}`;
                if (partyMemberImageSrc === fallbackSrc) {
                  setPartyMemberImageSrc(null);
                  return;
                }
                setPartyMemberImageSrc(fallbackSrc);
              }}
              className={`pointer-events-none select-none absolute left-[80%] top-0 h-auto -translate-x-1/2 object-contain object-top ${isDarkModeEnabled ? 'opacity-45' : 'opacity-65'}`}
              style={{
                width: 'clamp(120%, calc(270% - 0.3 * 100vw), 150%)',
                maxWidth: 'none',
              }}
            />
            <div className={`absolute inset-0 ${isDarkModeEnabled ? 'bg-slate-950/25' : 'bg-white/30'}`} />
          </div>
        )}
        <div className="relative z-10">
        <div className="flex justify-between items-start mb-2 gap-2">
          {editingCharacter === selectedCharacter ? (
            <div className="flex-1 min-w-0 space-y-1">
              {/* SpecRef: 8.2.3 | Character Edit Mode (selected member) | Unique Character Flag. */}
              {char.isUnique && (
                <div className="text-[11px] text-gray-500">
                  {t('home.party.uniqueCharacterClassOnly')}
                </div>
              )}

              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={pendingEdits?.name ?? char.name}
                  onChange={(e) => {
                    if (char.isUnique) return;
                    setPendingEdits({ ...pendingEdits, name: e.target.value });
                  }}
                  disabled={char.isUnique}
                  className={`text-lg font-bold border-b focus:outline-none min-w-0 flex-1 ${
                    char.isUnique
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-transparent border-sub'
                  }`}
                />
                {(() => {
                  // SpecRef: 8.2.3 | Character Edit Mode (selected member): | Toggle selection: ♂ / ♀
                  const selectedRaceId = pendingEdits?.raceId ?? char.raceId;
                  const isGenderOptionBlockedByDuplicate = (gender: Character['gender']) =>
                    party.characters.some((member, memberIndex) =>
                      memberIndex !== selectedCharacter
                      && member.raceId === selectedRaceId
                      && member.gender === gender
                      && member.isUnique !== true
                    );

                  return (
                    <div className="flex gap-1">
                      {(['male', 'female'] as const).map((gender) => {
                        const isBlockedByDuplicate = isGenderOptionBlockedByDuplicate(gender);
                        const isDisabled = char.isUnique || isBlockedByDuplicate;
                        const shouldShowGenderSymbol = char.isUnique
                          ? (pendingEdits?.gender ?? char.gender) === gender
                          : !isBlockedByDuplicate;

                        return (
                          <button
                            key={gender}
                            type="button"
                            disabled={isDisabled}
                            title={isBlockedByDuplicate ? t('home.party.duplicateRaceGenderWarning') : undefined}
                            onClick={() => setPendingEdits({ ...pendingEdits, gender })}
                            className={`flex items-center justify-center px-2 py-1 text-xs border rounded ${
                              (pendingEdits?.gender ?? char.gender) === gender
                                ? 'bg-sub text-white border-sub'
                                : isDisabled
                                  ? (isDarkModeEnabled
                                    ? 'bg-slate-700/80 text-slate-500 border-slate-600'
                                    : 'bg-gray-100 text-gray-400 border-gray-200')
                                  : (isDarkModeEnabled
                                    ? 'bg-slate-800/75 text-slate-200 border-slate-500'
                                    : 'bg-white text-gray-600 border-gray-200')
                            }`}
                          >
                            <span className="inline-flex h-full w-3 items-center justify-center leading-none">
                              {shouldShowGenderSymbol ? (gender === 'male' ? t('character.gender.maleShort') : t('character.gender.femaleShort')) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-lg font-bold truncate">{char.name}</span>
            </div>
          )}
          {editingCharacter === selectedCharacter ? (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={showEditConfirm ? saveCharacterEditWithEquipmentReset : completeCharacterEdit}
                className="text-sm text-white bg-sub/80 px-3 py-1 rounded whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showEditConfirm ? t('common.save') : t('common.done')}
              </button>
              <button
                onClick={() => {
                  if (showEditConfirm) {
                    setShowEditConfirm(false);
                    return;
                  }
                  setPendingEdits(null);
                  setEditingCharacter(null);
                }}
                className={`text-sm px-3 py-1 rounded whitespace-nowrap ${isDarkModeEnabled ? 'text-slate-300 bg-slate-700/80 border border-slate-500' : 'text-gray-600 bg-gray-200/80'}`}
              >
                {showEditConfirm ? t('common.back') : t('common.cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setPendingEdits({});
                setEditingCharacter(selectedCharacter);
                setShowEditConfirm(false);
              }}
              className="text-sm text-sub"
            >
              {t('common.edit')}
            </button>
          )}
        </div>

        {/* Edit confirmation dialog */}
        {editingCharacter === selectedCharacter && showEditConfirm && (
          <div className="mb-3 p-3 rounded border border-accent/25 bg-accent/10">
            <ul className="text-sm text-accent space-y-1">
              {editConfirmWarnings.map((warning) => (
                <li key={warning}>⚠️ {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {editingCharacter === selectedCharacter && !showEditConfirm ? (
          <div className="space-y-2 text-sm">
            <div>
              <div className="mt-2 rounded border border-gray-200 bg-white/5 backdrop-blur-[1px] p-2 text-xs">
                {(() => {
                  const selectedRaceId = pendingEdits?.raceId ?? char.raceId;
                  const selectedRace = RACES.find((race) => race.id === selectedRaceId) ?? RACES[0];
                  const selectedRaceBonusEntries = getRaceBonusesForSelection(selectedRace)
                    .map((bonus, index) => buildInlineBonusEntry('race-bonus', selectedRace.id, bonus, index))
                    .filter((entry): entry is { key: string; label: string; description: string | null } => entry !== null);

                  const selectedGender = pendingEdits?.gender ?? char.gender;
                  const isRaceOptionBlockedByDuplicate = (raceId: Race['id']) =>
                    party.characters.some((member, memberIndex) =>
                      memberIndex !== selectedCharacter
                      && member.raceId === raceId
                      && member.gender === selectedGender
                      && member.isUnique !== true
                    );

                  const renderRaceOption = (race: Race, isSelectedRace: boolean) => {
                    const isBlockedByDuplicate = isRaceOptionBlockedByDuplicate(race.id);
                    const isDisabled = char.isUnique || isBlockedByDuplicate;
                    const shouldShowRaceIcon = char.isUnique
                      ? isSelectedRace
                      : !isBlockedByDuplicate;

                    return (
                      <button
                        key={`race-image-${race.id}`}
                        type="button"
                        aria-label={race.name}
                        title={isBlockedByDuplicate ? t('home.party.duplicateRaceGenderWarning') : undefined}
                        disabled={isDisabled}
                        onClick={() => handleRaceChange(race.id)}
                        className={`min-w-0 flex flex-1 items-center justify-center px-0 py-1 text-xs border ${
                          isSelectedRace
                            ? 'bg-sub text-white border-sub'
                            : `border-gray-200 ${isDisabled ? 'bg-transparent text-gray-400' : 'bg-white/20 text-gray-700 hover:bg-white/30'}`
                        } ${race.id === 'lupinian' || race.id === 'caninian' || race.id === 'leporian' ? 'rounded-l' : race.id === 'felidian' || race.id === 'procyonian' || race.id === 'murid' ? 'rounded-r' : ''}`}
                      >
                        <span className="flex h-5 w-5 items-center justify-center">
                          {shouldShowRaceIcon ? <RaceIcon race={race} className="h-5 w-5 shrink-0" /> : null}
                        </span>
                      </button>
                    );
                  };

                  return (
                    <>
                      <div className="mb-1 text-xs text-gray-600 select-none">
                        <span className="font-bold">{t('home.party.race')}</span>: <RaceIcon race={selectedRace} className="inline-block h-4 w-4 mx-1 align-text-bottom" />
                        {selectedRace.name} | {t('common.stat.vitality.short')}{selectedRace.stats.vitality},{t('common.stat.strength.short')}{selectedRace.stats.strength},{t('common.stat.intelligence.short')}{selectedRace.stats.intelligence},{t('common.stat.mind.short')}{selectedRace.stats.mind} | {renderInlineBonusEntries(selectedRaceBonusEntries)}
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {raceCategoryDefinitions.map((category) => (
                          <div key={`race-${category.label}`} className="space-y-1">
                            <div className="text-center text-[11px] text-gray-500 whitespace-nowrap">{category.label}</div>
                            <div className="flex w-full">
                              {category.raceIds.map((raceId) => {
                                const raceData = RACES.find((race) => race.id === raceId);
                                if (!raceData) return null;
                                return renderRaceOption(raceData, selectedRaceId === raceId);
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <div>
              {(() => {
                const selectedMainClassId = pendingEdits?.mainClassId ?? char.mainClassId;
                const selectedSubClassId = pendingEdits?.subClassId ?? char.subClassId;
                const selectedMainClass = classById.get(selectedMainClassId);
                const selectedMainClassIsMaster = selectedMainClassId === selectedSubClassId;
                const selectedMainBonusList = [
                  ...((selectedMainClass?.mainSubBonuses ?? []) as Bonus[]),
                  ...(selectedMainClassIsMaster
                    ? ((selectedMainClass?.masterBonuses ?? []) as Bonus[])
                    : ((selectedMainClass?.mainBonuses ?? []) as Bonus[])),
                ];
                const selectedMainBonusEntries = selectedMainBonusList
                  .map((bonus, index) => buildInlineBonusEntry('main-class-bonus', selectedMainClassId, bonus, index))
                  .filter((entry): entry is { key: string; label: string; description: string | null } => entry !== null);

                return (
                  <>
                    <div className="rounded border border-gray-200 bg-white/5 backdrop-blur-[1px] p-2 text-xs">
                      <div className="mb-1 flex items-center gap-1 overflow-x-auto whitespace-nowrap text-xs text-gray-600 select-none">
                        <span className="font-bold">{t('home.party.mainClass')}</span>: {selectedMainClass?.name ?? '-'}{selectedMainClassIsMaster ? t('party.class.masterFull') : ''} |{' '}
                        {selectedMainBonusEntries.map((entry, index) => (
                          <Fragment key={entry.key}>
                            {index > 0 && ', '}
                            {entry.description ? (
                              <button
                                type="button"
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  if (!entry.description) return;
                                  handleInlineDetailHelpToggle(entry.key, entry.label, entry.description, event);
                                }}
                                className="text-left hover:underline"
                              >
                                {entry.label}
                              </button>
                            ) : (
                              <span>{entry.label}</span>
                            )}
                          </Fragment>
                        ))}
                      </div>
                      {/* SpecRef: 8.2.3 | Character Edit Mode (selected member) | Main Class selection */}
                      <div className={classCategorySelectorGridClass}>
                        {classCategoryDefinitions.map((category) => (
                          <div key={`main-class-${category.label}`} className="space-y-1">
                            <div className="text-center text-[11px] text-gray-500">{category.label}</div>
                            <div className="flex w-full">
                              {category.classIds.map((classId) => {
                                const classData = classById.get(classId);
                                if (!classData) return null;
                                const isSelected = selectedMainClassId === classId;

                                return (
                                  <button
                                    key={`main-class-${category.label}-${classId}`}
                                    type="button"
                                    onClick={() => setPendingEdits({ ...pendingEdits, mainClassId: classId })}
                                    className={`min-w-0 flex-1 px-0 py-1 text-xs border ${
                                      classId === category.classIds[0] ? 'rounded-l' : classId === category.classIds[category.classIds.length - 1] ? 'rounded-r' : ''
                                    } ${
                                      isSelected
                                        ? 'bg-sub text-white border-sub'
                                        : 'bg-white/20 text-gray-700 border-gray-200 hover:bg-white/30'
                                    }`}
                                  >
                                    {CLASS_SHORT_NAMES[classData.id] ?? classData.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div>
              {(() => {
                const selectedSubClassId = pendingEdits?.subClassId ?? char.subClassId;
                const selectedSubClass = classById.get(selectedSubClassId);
                const selectedSubBonusList = [
                  ...((selectedSubClass?.mainSubBonuses ?? []) as Bonus[]),
                ];
                const selectedSubBonusEntries = selectedSubBonusList
                  .map((bonus, index) => buildInlineBonusEntry('sub-class-bonus', selectedSubClassId, bonus, index))
                  .filter((entry): entry is { key: string; label: string; description: string | null } => entry !== null)
                  .filter((entry) => entry.label.trim().length > 0)
                  .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.label === entry.label) === index);

                return (
                  <>
                    <div className="rounded border border-gray-200 bg-white/5 backdrop-blur-[1px] p-2 text-xs">
                      <div className="mb-1 flex items-center gap-1 overflow-x-auto whitespace-nowrap text-xs text-gray-600 select-none">
                        <span className="font-bold">{t('home.party.subClass')}</span>: {selectedSubClass?.name ?? '-'} |{' '}
                        {selectedSubBonusEntries.length === 0
                          ? '-'
                          : selectedSubBonusEntries.map((entry, index) => (
                            <Fragment key={entry.key}>
                              {index > 0 && ', '}
                              {entry.description ? (
                                <button
                                  type="button"
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={(event) => {
                                    if (!entry.description) return;
                                    handleInlineDetailHelpToggle(entry.key, entry.label, entry.description, event);
                                  }}
                                  className="text-left hover:underline"
                                >
                                  {entry.label}
                                </button>
                              ) : (
                                <span>{entry.label}</span>
                              )}
                            </Fragment>
                          ))}
                      </div>
                      {/* SpecRef: 8.2.3 | Character Edit Mode (selected member) | Sub Class selection */}
                      <div className={classCategorySelectorGridClass}>
                        {classCategoryDefinitions.map((category) => (
                          <div key={`sub-class-${category.label}`} className="space-y-1">
                            <div className="text-center text-[11px] text-gray-500">{category.label}</div>
                            <div className="flex w-full">
                              {category.classIds.map((classId) => {
                                const classData = classById.get(classId);
                                if (!classData) return null;
                                const isSelected = selectedSubClassId === classId;

                                return (
                                  <button
                                    key={`sub-class-${category.label}-${classId}`}
                                    type="button"
                                    onClick={() => setPendingEdits({ ...pendingEdits, subClassId: classId })}
                                    className={`min-w-0 flex-1 px-0 py-1 text-xs border ${
                                      classId === category.classIds[0] ? 'rounded-l' : classId === category.classIds[category.classIds.length - 1] ? 'rounded-r' : ''
                                    } ${
                                      isSelected
                                        ? 'bg-sub text-white border-sub'
                                        : 'bg-white/20 text-gray-700 border-gray-200 hover:bg-white/30'
                                    }`}
                                  >
                                    {CLASS_SHORT_NAMES[classData.id] ?? classData.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div>
              <div className="rounded border border-gray-200 bg-white/5 backdrop-blur-[1px] p-2 text-xs">
                {(() => {
                  const selectedLineageId = pendingEdits?.lineageId ?? char.lineageId;
                  const selectedLineage = LINEAGES.find((l) => l.id === selectedLineageId) ?? LINEAGES[0];
                  const selectedLineageBonusEntries = (selectedLineage.bonuses as Bonus[])
                    .map((bonus, index) => buildInlineBonusEntry('lineage-bonus', selectedLineage.id, bonus, index))
                    .filter((entry): entry is { key: string; label: string; description: string | null } => entry !== null);
                  return (
                    <>
                      <div className="mb-1 flex items-center gap-1 overflow-x-auto whitespace-nowrap text-xs text-gray-600 select-none">
                        <span className="font-bold">{t('home.party.lineage')}</span>: {selectedLineage.name} | {renderInlineBonusEntries(selectedLineageBonusEntries)}
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {lineageCategoryDefinitions.map((category) => (
                          <div key={`lin-${category.label}`} className="space-y-1">
                            <div className="text-center text-[11px] text-gray-500 whitespace-nowrap">{category.label}</div>
                            <div className="flex w-full">
                              {category.ids.map((lineageId, index) => {
                                const lineageData = LINEAGES.find((l) => l.id === lineageId);
                                if (!lineageData) return null;
                                const isSelected = selectedLineageId === lineageId;
                                return (
                                  <button
                                    key={`lineage-${category.label}-${lineageId}`}
                                    type="button"
                                    disabled={char.isUnique}
                                    onClick={() => setPendingEdits({ ...pendingEdits, lineageId })}
                                    className={`min-w-0 flex-1 px-0 py-1 text-xs border ${
                                      index === 0 ? 'rounded-l' : index === category.ids.length - 1 ? 'rounded-r' : ''
                                    } ${
                                      isSelected
                                        ? 'bg-sub text-white border-sub'
                                        : `border-gray-200 ${char.isUnique ? 'bg-transparent text-gray-400' : 'bg-white/20 text-gray-700 hover:bg-white/30'}`
                                    }`}
                                  >
                                    {lineageData.shortName ?? LINEAGE_SHORT_NAME_KEYS[lineageId] ? t(LINEAGE_SHORT_NAME_KEYS[lineageId]) : lineageData.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <div>
              <div className="rounded border border-gray-200 bg-white/5 backdrop-blur-[1px] p-2 text-xs">
                {(() => {
                  const selectedPredispositionId = pendingEdits?.predispositionId ?? char.predispositionId;
                  const selectedPredisposition = PREDISPOSITIONS.find((p) => p.id === selectedPredispositionId) ?? PREDISPOSITIONS[0];
                  const selectedPredispositionBonusEntries = (selectedPredisposition.bonuses as Bonus[])
                    .map((bonus, index) => buildInlineBonusEntry('predisposition-bonus', selectedPredisposition.id, bonus, index))
                    .filter((entry): entry is { key: string; label: string; description: string | null } => entry !== null);
                  return (
                    <>
                      <div className="mb-1 flex items-center gap-1 overflow-x-auto whitespace-nowrap text-xs text-gray-600 select-none">
                        <span className="font-bold">{t('home.party.predisposition')}</span>: {selectedPredisposition.name} | {renderInlineBonusEntries(selectedPredispositionBonusEntries)}
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {predispositionCategoryDefinitions.map((category) => (
                          <div key={`pred-${category.label}`} className="space-y-1">
                            <div className="text-center text-[11px] text-gray-500 whitespace-nowrap">{category.label}</div>
                            <div className="flex w-full">
                              {category.ids.map((predispositionId, index) => {
                                const predispositionData = PREDISPOSITIONS.find((p) => p.id === predispositionId);
                                if (!predispositionData) return null;
                                const isSelected = selectedPredispositionId === predispositionId;
                                const isSelectable = predispositionData.selectable ?? true;
                                return (
                                  <button
                                    key={`pred-${category.label}-${predispositionId}`}
                                    type="button"
                                    disabled={char.isUnique || !isSelectable}
                                    onClick={() => setPendingEdits({ ...pendingEdits, predispositionId })}
                                    className={`min-w-0 flex-1 px-0 py-1 text-xs border ${
                                      index === 0 ? 'rounded-l' : index === category.ids.length - 1 ? 'rounded-r' : ''
                                    } ${
                                      isSelected
                                        ? 'bg-sub text-white border-sub'
                                        : `border-gray-200 ${char.isUnique || !isSelectable ? 'bg-transparent text-gray-400' : 'bg-white/20 text-gray-700 hover:bg-white/30'}`
                                    }`}
                                  >
                                    {predispositionData.shortName ?? PREDISPOSITION_SHORT_NAME_KEYS[predispositionId] ? t(PREDISPOSITION_SHORT_NAME_KEYS[predispositionId]) : predispositionData.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-sm">
            <div className="text-gray-500 relative inline-flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={handleBaseStatHelpToggle}
                className="inline-flex items-center gap-1 text-left hover:text-gray-700"
                aria-label={t('home.party.baseStatsHelpAria')}
              >
                <RaceIcon race={race} className="h-4 w-4" />
                <span>{race.name} / {mainClass.name}({char.mainClassId === char.subClassId ? t('party.class.master') : subClass.name}) / {lineage.name} / {predisposition.name}</span>
              </button>
              {showBaseStatHelp && (
                <div
                  className="floating-bubble-pane fixed z-20 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg p-3 text-xs text-gray-700 space-y-2"
                  style={baseStatHelpPosition ?? undefined}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <div className="font-medium text-gray-900">{t('home.party.baseStatsHelpTitle')}:</div>
                  <div className="space-y-1">
                    {baseStatMultiplierRows.map((row) => (
                      <div key={row.label}>
                        {row.label}: {formatNumber(row.value)} ({row.note} x{row.ratio.toFixed(2)})
                      </div>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-gray-100 space-y-1">
                    <div>{t('home.party.hpBaseIncrease')}: +{formatNumber(Math.floor(hpBaseIncrease))}</div>
                    <div>{t('home.party.hpItemIncrease')}: +{formatNumber(Math.floor(hpItemIncrease))}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1 mt-1 text-xs">
              {/* SpecRef: 8.2.2 | Party member details | Status */}
              <div className="base-stat-chip">{t('stat.vitality')}:{stats.baseStats.vitality}</div>
              <div className="base-stat-chip">{t('stat.strength')}:{stats.baseStats.strength}</div>
              <div className="base-stat-chip">{t('stat.intelligence')}:{stats.baseStats.intelligence}</div>
              <div className="base-stat-chip">{t('stat.mind')}:{stats.baseStats.mind}</div>
            </div>
            <div className="border-t border-gray-200 mt-2 pt-2 text-sm">
              {(() => {
                // Calculate offense amplifiers per phase
                const iaigiri = stats.abilities.find(a => a.id === 'iaigiri');
                const heavyStrike = stats.abilities.find(a => a.id === 'heavy_strike');
                const iaigiriMultiplier = iaigiri ? (iaigiri.level >= 3 ? 3.0 : iaigiri.level >= 2 ? 2.5 : 2.0) : 1.0;
                const heavyStrikeMultiplier = heavyStrike ? 1.4 : 1.0;
                const strengthScale = getBaseOffenseScale(stats.baseStats.strength);
                const intelligenceScale = getBaseOffenseScale(stats.baseStats.intelligence);
                const combatBonusLevels = getCharacterCombatBonusLevels(char);
                const hasRanged = combatBonusLevels.ranged;
                const hasMagical = combatBonusLevels.magic;
                const hasMelee = combatBonusLevels.melee;
                const equippedItems = char.equipment.filter((item): item is Item => item != null);
                const baseAppliedOffenseBonusNames = stats.offenseCBonusNames;
                const baseMultMelee = stats.meleeAttackCBonus + getOffenseMultiplierSum(
                  equippedItems,
                  'melee',
                  baseAppliedOffenseBonusNames
                );
                const baseMultRanged = stats.rangedAttackCBonus + getOffenseMultiplierSum(
                  equippedItems,
                  'ranged',
                  baseAppliedOffenseBonusNames
                );
                const baseMultMagical = stats.magicalAttackCBonus + getOffenseMultiplierSum(
                  equippedItems,
                  'magical',
                  baseAppliedOffenseBonusNames
                );

                type StatusLine = {
                  key: string;
                  text: string;
                  renderedText?: ReactNode;
                  helpTitle?: string;
                  helpLines?: string[];
                };

                // Build offense lines
                const offenseLines: StatusLine[] = [];
                if (hasRanged) {
                  const amp = ((iaigiri
                    ? iaigiriMultiplier * (1.0 + baseMultRanged) * stats.physicalOffenseMultiplier
                    : (1.0 + baseMultRanged + stats.physicalAttackCBonus) * stats.physicalOffenseMultiplier
                  ) + stats.deityOffenseAmplifierBonus) * strengthScale * heavyStrikeMultiplier;
                  offenseLines.push({
                    key: 'ranged-attack',
                    text: `${t('combat.rangedAttack')}:${formatNumber(Math.floor(stats.rangedAttack))} x ${formatNumber(stats.rangedNoA)}${t('combat.times')}(x${amp.toFixed(2)})`,
                    helpTitle: t('combat.rangedAttack'),
                    helpLines: [
                      t('home.party.help.rangedAttackPower', { value: formatNumber(Math.floor(stats.rangedAttack)) }),
                      t('home.party.help.rangedAttackCount', { value: formatNumber(stats.rangedNoA) }),
                      t('home.party.help.rangedAttackMultiplier', { value: amp.toFixed(2) }),
                    ],
                  });
                }
                if (hasMagical) {
                  const amp = getCharacterDisplayedMagicalAttackAmplifier(
                    ((1.0 + baseMultMagical) * stats.magicalOffenseMultiplier + stats.deityOffenseAmplifierBonus) * intelligenceScale,
                    stats.abilities,
                  );
                  offenseLines.push({
                    key: 'magical-attack',
                    text: `${t('combat.magicalAttack')}:${formatNumber(Math.floor(stats.magicalAttack))} x ${formatNumber(stats.magicalNoA)}${t('combat.times')}(x${amp.toFixed(2)})`,
                    helpTitle: t('combat.magicalAttack'),
                    helpLines: [
                      t('home.party.help.magicalAttackPower', { value: formatNumber(Math.floor(stats.magicalAttack)) }),
                      t('home.party.help.magicalAttackCount', { value: formatNumber(stats.magicalNoA) }),
                      t('home.party.help.magicalAttackMultiplier', { value: amp.toFixed(2) }),
                    ],
                  });
                }
                if (hasMelee) {
                  const amp = ((iaigiri
                    ? iaigiriMultiplier * (1.0 + baseMultMelee) * stats.physicalOffenseMultiplier
                    : (1.0 + baseMultMelee + stats.physicalAttackCBonus) * stats.physicalOffenseMultiplier
                  ) + stats.deityOffenseAmplifierBonus) * strengthScale * heavyStrikeMultiplier;
                  offenseLines.push({
                    key: 'melee-attack',
                    text: `${t('combat.meleeAttack')}:${formatNumber(Math.floor(stats.meleeAttack))} x ${formatNumber(stats.meleeNoA)}${t('combat.times')}(x${amp.toFixed(2)})`,
                    helpTitle: t('combat.meleeAttack'),
                    helpLines: [
                      t('home.party.help.meleeAttackPower', { value: formatNumber(Math.floor(stats.meleeAttack)) }),
                      t('home.party.help.meleeAttackCount', { value: formatNumber(stats.meleeNoA) }),
                      t('home.party.help.meleeAttackMultiplier', { value: amp.toFixed(2) }),
                    ],
                  });
                }

                const baseDecay = 0.90 + getEffectiveAccuracyBonus(stats.accuracyBonus, stats.abilities);
                const decayText = `${(baseDecay * 100).toFixed(1)}%`;
                const hasPhysicalAttacks = hasRanged || hasMelee;
                if (hasPhysicalAttacks) {
                  offenseLines.push({
                    key: 'physical-accuracy',
                    text: `${t('combat.physicalAccuracy')}: ${Math.round(stats.accuracyPotency * 100)}% (${t('combat.decay')}: ${decayText})`,
                    helpTitle: t('combat.physicalAccuracy'),
                    helpLines: [
                      t('home.party.help.physicalAccuracy', { value: Math.round(stats.accuracyPotency * 100) }),
                      t('home.party.help.accuracyDecay', { value: decayText }),
                    ],
                  });
                }
                const hasCastableMagic = hasMagical;
                if (hasCastableMagic) {
                  offenseLines.push({
                    key: 'magical-accuracy',
                    text: t('home.party.magicalAccuracyWithDecay', { value: decayText }),
                    helpTitle: t('home.party.magicalAccuracy'),
                    helpLines: [
                      t('home.party.help.magicalAccuracy'),
                      t('home.party.help.accuracyDecay', { value: decayText }),
                    ],
                  });
                }
                if (hasCastableMagic) {
                  const hasArcMagic = stats.abilities.some((ability) => ability.id === 'arc_magic' && ability.level > 0);
                  const magicProfile = resolveMagicProfile({
                    style: hasArcMagic ? 'arc-magic' : 'multi-hit',
                    elementalOffense: stats.elementalOffense,
                    elementalOffenseValue: stats.elementalOffenseValue,
                    magicalNoA: stats.magicalNoA,
                  });
                  offenseLines.push({
                    key: 'magic-spell',
                    text: t('home.party.castingSpellValue', { spell: magicProfile.spellName }),
                    helpTitle: t('home.party.castingSpell'),
                    helpLines: [
                      t('home.party.castingSpellValue', { spell: magicProfile.spellName }),
                      t('home.party.magicStyleValue', { style: magicProfile.style }),
                      t('home.party.magicEffectValue', { effect: magicProfile.description }),
                    ],
                  });
                }
                const heavyStrikePenetAbility = stats.abilities.find((ability) => ability.id === 'heavy_strike' && ability.level > 0);
                const heavyStrikePenetPerNoA = heavyStrikePenetAbility
                  ? (heavyStrikePenetAbility.level >= 2 ? 0.015 : 0.01)
                  : 0;
                const heavyStrikePenetBonus = heavyStrikePenetAbility
                  ? (Math.max(stats.rangedNoA, stats.magicalNoA, stats.meleeNoA) * heavyStrikePenetPerNoA)
                  : 0;
                const penetrationPercent = Math.round((stats.penetMultiplier + heavyStrikePenetBonus) * 100);
                if (penetrationPercent !== 0) {
                  offenseLines.push({
                    key: 'penetration',
                    text: `${t('combat.penetration')}:+${formatNumber(penetrationPercent)}%`,
                    helpTitle: t('combat.penetration'),
                    helpLines: [
                      `${t('combat.penetration')}: +${formatNumber(penetrationPercent)}%`,
                      t('combat.penetrationHelp', { percent: penetrationPercent }),
                    ],
                  });
                }

                // Defense lines
                const defenseAmpPhysical = Math.max(0.01, stats.physicalDefenseAmplifier * stats.deityDefenseAmplifierBonus.physical);
                const defenseAmpMagical = Math.max(0.01, stats.magicalDefenseAmplifier * stats.deityDefenseAmplifierBonus.magical);
                const elementIcon: UiIconKey | null = stats.elementalOffense === 'fire' ? 'fire' :
                  stats.elementalOffense === 'thunder' ? 'thunder' :
                  stats.elementalOffense === 'ice' ? 'ice' : null;

                const defenseLines: StatusLine[] = [
                  {
                    key: 'element',
                    text: `${t('combat.element')}:${elementIcon ? t('common.yes') : t('common.none')}(x${stats.elementalOffenseValue.toFixed(2)})`,
                    renderedText: (
                      <>
                        {t('combat.element')}:
                        {elementIcon ? renderUiIcon(elementIcon) : t('common.none')}
                        (x{stats.elementalOffenseValue.toFixed(2)})
                      </>
                    ),
                    helpTitle: t('home.party.elementalAttackHelpTitle'),
                    helpLines: getElementalOffenseHelpLines(char, stats),
                  },
                  {
                    key: 'physical-defense',
                    text: `${t('combat.physicalDefenseShort')}:${formatNumber(stats.physicalDefense)} (${formatNumber(Math.round(defenseAmpPhysical * 100))}%)`,
                    helpTitle: t('combat.physicalDefense'),
                    helpLines: [
                      t('home.party.help.physicalDefensePower', { value: formatNumber(stats.physicalDefense) }),
                      t('home.party.help.physicalResistance', { value: formatNumber(Math.round(defenseAmpPhysical * 100)) }),
                    ],
                  },
                  {
                    key: 'magical-defense',
                    text: `${t('combat.magicalDefenseShort')}:${formatNumber(stats.magicalDefense)} (${formatNumber(Math.round(defenseAmpMagical * 100))}%)`,
                    helpTitle: t('combat.magicalDefense'),
                    helpLines: [
                      t('home.party.help.magicalDefensePower', { value: formatNumber(stats.magicalDefense) }),
                      t('home.party.help.magicalResistance', { value: formatNumber(Math.round(defenseAmpMagical * 100)) }),
                    ],
                  },
                  {
                    key: 'evasion',
                    text: `${t('combat.evasion')}:${stats.evasionBonus >= 0 ? '+' : ''}${formatNumber(Math.round(stats.evasionBonus * 1000))}`,
                    helpTitle: t('combat.evasion'),
                    helpLines: [
                      t('home.party.evasionValue', { value: `${stats.evasionBonus >= 0 ? '+' : ''}${formatNumber(Math.round(stats.evasionBonus * 1000))}` }),
                      t('home.party.help.evasion'),
                    ],
                  },
                ];

                // Pad offense lines to match defense lines count
                while (offenseLines.length < defenseLines.length) {
                  offenseLines.push({ key: `offense-blank-${offenseLines.length}`, text: '', helpTitle: '', helpLines: [] });
                }

                return (
                  <div className="text-xs space-y-1">
                    {offenseLines.map((offense, i) => (
                      <div key={`${offense.key}-${defenseLines[i]?.key ?? i}`} className="flex justify-between gap-2">
                        <div className="relative">
                          {offense.text ? (
                            <button
                              type="button"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => handleStatusHelpToggle(offense.key, event)}
                              className="text-left"
                            >
                              {offense.text}
                            </button>
                          ) : (
                            <span>{offense.text}</span>
                          )}
                          {offense.text && activeStatusHelpKey === offense.key && (
                            <div
                              className="floating-bubble-pane fixed z-20 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg p-3 text-xs text-gray-700 space-y-1"
                              style={activeStatusHelpPosition ?? undefined}
                              onPointerDown={(event) => event.stopPropagation()}
                            >
                              <div className="font-semibold text-gray-800">{offense.helpTitle}</div>
                              {(offense.helpLines ?? []).map((line) => (
                                <div key={`${offense.key}-${line}`}>{line}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="relative text-gray-900">
                          {defenseLines[i]?.helpLines?.length ? (
                            <>
                              <button
                                type="button"
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  const defense = defenseLines[i];
                                  if (!defense) return;
                                  handleStatusHelpToggle(defense.key, event);
                                }}
                                className="text-left"
                              >
                                {defenseLines[i]?.renderedText ?? defenseLines[i]?.text}
                              </button>
                              {defenseLines[i] && activeStatusHelpKey === defenseLines[i].key && (
                                <div
                                  className="floating-bubble-pane fixed z-20 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg p-3 text-xs text-gray-700 space-y-1"
                                  style={activeStatusHelpPosition ?? undefined}
                                  onPointerDown={(event) => event.stopPropagation()}
                                >
                                  <div className="font-semibold text-gray-800">{defenseLines[i].helpTitle}</div>
                                  {(defenseLines[i].helpLines ?? []).map((line) => (
                                    <div key={`${defenseLines[i].key}-${line}`}>{line}</div>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <span>{defenseLines[i]?.renderedText ?? defenseLines[i]?.text}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="text-xs text-gray-900">
              {/* SpecRef: 8.2.2 | Party member details | Status */}
              {renderElementalResistanceInline(stats.elementalDefenseMultipliers)}
            </div>
            {/* Bonuses */}
            {(() => {
              const isMasterClass = char.mainClassId === char.subClassId;
              const equippedItems = char.equipment
                .slice(0, stats.maxEquipSlots)
                .filter((item): item is Item => item != null);
              const allBonuses = [
                ...race.bonuses,
                ...mainClass.mainSubBonuses,
                ...(isMasterClass ? mainClass.masterBonuses : [...mainClass.mainBonuses, ...subClass.mainSubBonuses]),
                ...predisposition.bonuses,
                ...lineage.bonuses,
                ...equippedItems.flatMap((item) => getSuperRareBonuses(item.superRare)),
              ];

              // Aggregate bonuses - deduplicate multipliers by value before multiplying
              const multiplierValues: Record<string, Set<number>> = {};
              const additive: Record<string, number> = {};
              const uniqueCAdditiveBonusNames = new Set<string>();
              const uniqueEvasionBonusNames = new Set<string>();
              const formatCBonusValue = (value: number): string => (Math.round(value * 1000000) / 1000000).toString();

              const addUniqueCBonus = (type: string, value: number) => {
                const bonusName = `c.${type}+${formatCBonusValue(value)}`;
                if (uniqueCAdditiveBonusNames.has(bonusName)) return;
                uniqueCAdditiveBonusNames.add(bonusName);
                additive[type] = (additive[type] ?? 0) + value;
              };

              for (const b of allBonuses) {
                if (b.type.endsWith('_multiplier')) {
                  const key = b.type.replace('_multiplier', '');
                  if (!multiplierValues[key]) multiplierValues[key] = new Set();
                  multiplierValues[key].add(b.value);
                } else if (['physical_offense_multiplier_xV', 'magical_offense_multiplier_xV', 'physical_defense_multiplier_xV', 'magical_defense_multiplier_xV', 'fire_defense_multiplier_xV', 'ice_defense_multiplier_xV', 'thunder_defense_multiplier_xV'].includes(b.type)) {
                  if (!multiplierValues[b.type]) multiplierValues[b.type] = new Set();
                  multiplierValues[b.type].add(b.value);
                } else if (['vitality', 'strength', 'intelligence', 'mind'].includes(b.type)) {
                  additive[b.type] = (additive[b.type] ?? 0) + b.value;
                } else if (b.type === 'growth_xV') {
                  if (!multiplierValues[b.type]) multiplierValues[b.type] = new Set();
                  multiplierValues[b.type].add(b.value);
                } else if (['equip_slot', 'equip_melee', 'equip_ranged', 'equip_magic', 'penet', 'accuracy', 'upgrade_V', 'melee_attack', 'ranged_attack', 'magical_attack', 'physical_attack', 'physical_defense', 'magical_defense', 'antagonism', 'fire_defense', 'ice_defense', 'thunder_defense'].includes(b.type)) {
                  addUniqueCBonus(b.type, b.value);
                } else if (b.type === 'evasion') {
                    if (b.value < 0) {
                      additive[b.type] = (additive[b.type] ?? 0) + b.value;
                    } else {
                      const bonusName = `c.evasion+${formatCBonusValue(b.value)}`;
                      if (!uniqueEvasionBonusNames.has(bonusName)) {
                        uniqueEvasionBonusNames.add(bonusName);
                        additive[b.type] = (additive[b.type] ?? 0) + b.value;
                      }
                    }
                }
              }

              // Calculate multipliers from unique values
              const multipliers: Record<string, number> = {};
              for (const [key, values] of Object.entries(multiplierValues)) {
                multipliers[key] = Array.from(values).reduce((prod, v) => prod * v, 1);
              }

              const seekerBaseLevel = allBonuses
                .filter((b) => b.type === 'ability' && b.abilityId === 'seeker')
                .reduce((max, b) => Math.max(max, b.abilityLevel ?? 1), 0);
              const appliedSeekerUpgradeNames = new Set<string>();
              const seekerUpgradeLevel = allBonuses
                .filter((b) => b.type === 'ability_upgrade' && b.abilityId === 'seeker')
                .reduce((sum, b) => {
                  const bonusName = `c.upgrade_seeker+${formatCBonusValue(b.value)}`;
                  if (appliedSeekerUpgradeNames.has(bonusName)) return sum;
                  appliedSeekerUpgradeNames.add(bonusName);
                  return sum + b.value;
                }, 0);
              const seekerAbilityLevel = seekerBaseLevel > 0
                ? seekerBaseLevel + seekerUpgradeLevel
                : seekerBaseLevel;
              const seekerPerLevelBonus = seekerAbilityLevel >= 2 ? 0.0035 : seekerAbilityLevel >= 1 ? 0.0025 : 0;
              const seekerMultiplier = seekerAbilityLevel > 0 ? 1 + (party.level * seekerPerLevelBonus) : 1;

              // Format display
              type BonusDisplayEntry = { key: string; label: string; description?: string };
              const bonusDisplayEntries: BonusDisplayEntry[] = [];
              const helpRows: Array<{ label: string; description: string }> = [];
              const bonusLabel = (key: string): string => t(`party.bonus.${key}`);
              const mulNames: Record<string, string> = {
                sword: bonusLabel('sword'), katana: bonusLabel('katana'), archery: bonusLabel('archery'), armor: bonusLabel('armor'),
                gauntlet: bonusLabel('gauntlet'), wand: bonusLabel('wand'), robe: bonusLabel('robe'), shield: bonusLabel('shield'),
                bolt: bonusLabel('bolt'), grimoire: bonusLabel('grimoire'), catalyst: bonusLabel('catalyst'), arrow: bonusLabel('arrow'),
                physical_offense_multiplier_xV: bonusLabel('physical_offense_multiplier_xV'), magical_offense_multiplier_xV: bonusLabel('magical_offense_multiplier_xV'),
                physical_defense_multiplier_xV: bonusLabel('physical_defense_multiplier_xV'), magical_defense_multiplier_xV: bonusLabel('magical_defense_multiplier_xV'),
                fire_defense_multiplier_xV: bonusLabel('fire_defense_multiplier_xV'), ice_defense_multiplier_xV: bonusLabel('ice_defense_multiplier_xV'), thunder_defense_multiplier_xV: bonusLabel('thunder_defense_multiplier_xV')
              };
              const addNames: Record<string, string> = {
                vitality: bonusLabel('vitality'), strength: bonusLabel('strength'), intelligence: bonusLabel('intelligence'), mind: bonusLabel('mind'),
                equip_slot: bonusLabel('equip_slot'), equip_melee: bonusLabel('equip_melee'), equip_ranged: bonusLabel('equip_ranged'), equip_magic: bonusLabel('equip_magic'), penet: bonusLabel('penet'),
                accuracy: bonusLabel('accuracy'), evasion: bonusLabel('evasion'), growth_xV: bonusLabel('growth_xV'), upgrade_V: bonusLabel('upgrade_V'), antagonism: bonusLabel('antagonism'),
                melee_attack: bonusLabel('melee_attack'), ranged_attack: bonusLabel('ranged_attack'), magical_attack: bonusLabel('magical_attack'), physical_attack: bonusLabel('physical_attack'),
                physical_defense: bonusLabel('physical_defense'), magical_defense: bonusLabel('magical_defense'),
                fire_defense: bonusLabel('fire_defense'), ice_defense: bonusLabel('ice_defense'), thunder_defense: bonusLabel('thunder_defense'),
              };
              const hiddenBonusDisplayKeys = new Set([
                'evasion',
                'penet',
                'physical_attack',
                'magical_attack',
                'physical_defense',
                'magical_defense',
                'physical_offense_multiplier_xV',
                'magical_offense_multiplier_xV',
                'physical_defense_multiplier_xV',
                'magical_defense_multiplier_xV',
              ]);

              const pushBonusDisplayEntry = (entry: BonusDisplayEntry) => {
                bonusDisplayEntries.push(entry);
                if (entry.description) {
                  helpRows.push({ label: entry.label, description: entry.description });
                }
              };
              const defensePercentFormatter = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1, minimumFractionDigits: 0 });

              for (const [key, val] of Object.entries(multipliers)) {
                if (hiddenBonusDisplayKeys.has(key) || key === 'growth_xV') continue;
                if (val !== 1) {
                  const effectiveMultiplier = key === 'grimoire' ? val * seekerMultiplier : val;
                  const formattedMultiplier = key === 'grimoire'
                    ? effectiveMultiplier.toFixed(2)
                    : effectiveMultiplier.toFixed(1);
                  const label = `${mulNames[key] ?? key}x${formattedMultiplier}`;
                  const templateKey = C_MULTIPLIER_HELP_DESCRIPTION_KEYS[key];
                  pushBonusDisplayEntry({
                    key,
                    label,
                    description: templateKey ? t(templateKey, { value: formattedMultiplier }) : undefined,
                  });
                }
              }
              for (const [key, val] of Object.entries(additive)) {
                if (hiddenBonusDisplayKeys.has(key)) continue;
                if (val !== 0) {
                  if (key === 'melee_attack' || key === 'ranged_attack' || key === 'magical_attack' || key === 'physical_attack') {
                    const label = `${addNames[key]}+${Math.round(val * 100)}%`;
                    const description = getBonusHelpDescription({ type: key as BonusType, value: val });
                    pushBonusDisplayEntry({ key, label, description: description ?? undefined });
                  } else if (key === 'physical_defense' || key === 'magical_defense') {
                    const label = `${addNames[key]}+${defensePercentFormatter.format(Math.round(val * 1000) / 10)}%`;
                    const description = getBonusHelpDescription({ type: key as BonusType, value: val });
                    pushBonusDisplayEntry({ key, label, description: description ?? undefined });
                  } else if (key === 'fire_defense' || key === 'ice_defense' || key === 'thunder_defense') {
                    const label = `${addNames[key]}${Math.round(val)}%`;
                    const description = getBonusHelpDescription({ type: key as BonusType, value: val });
                    pushBonusDisplayEntry({ key, label, description: description ?? undefined });
                  } else if (key === 'penet') {
                    const label = `${addNames[key]}+${Math.round(val * 100)}`;
                    const description = getBonusHelpDescription({ type: key as BonusType, value: val });
                    pushBonusDisplayEntry({ key, label, description: description ?? undefined });
                  } else if (key === 'accuracy') {
                    const label = `${addNames[key]}+${Math.round(val * 1000)}`;
                    const description = getBonusHelpDescription({ type: key as BonusType, value: val });
                    pushBonusDisplayEntry({ key, label, description: description ?? undefined });
                  } else if (key === 'evasion') {
                    const label = `${addNames[key]}+${Math.round(val * 1000)}`;
                    const description = getBonusHelpDescription({ type: key as BonusType, value: val });
                    pushBonusDisplayEntry({ key, label, description: description ?? undefined });
                  } else {
                    const normalizedKey = key.replace(/\?+$/g, '');
                    const label = ['equip_melee', 'equip_ranged', 'equip_magic'].includes(normalizedKey)
                      ? `${addNames[normalizedKey] ?? normalizedKey}`
                      : `${addNames[normalizedKey] ?? normalizedKey}+${val}`;
                    const description = getBonusHelpDescription({ type: normalizedKey as BonusType, value: val });
                    pushBonusDisplayEntry({
                      key: normalizedKey,
                      label,
                      description: description ?? undefined,
                    });
                  }
                }
              }
              const growthMultiplier = multipliers.growth_xV ?? 1;
              if (growthMultiplier !== 1) {
                const label = t('party.bonusDisplay.growthMultiplier', { value: formatMultiplierValue(growthMultiplier) });
                const description = getBonusHelpDescription({ type: 'growth_xV', value: growthMultiplier });
                pushBonusDisplayEntry({ key: 'growth_xV', label, description: description ?? undefined });
              }

              const bHelpRows = ([
                { key: 'vitality', labelKey: 'party.bonusDisplay.vitality' },
                { key: 'strength', labelKey: 'party.bonusDisplay.strength' },
                { key: 'intelligence', labelKey: 'party.bonusDisplay.intelligence' },
                { key: 'mind', labelKey: 'party.bonusDisplay.mind' },
              ] as const)
                .map((row) => {
                  const value = additive[row.key];
                  if (!value) return null;
                  const description = getBonusHelpDescription({ type: row.key, value });
                  if (!description) return null;
                  return { label: t(row.labelKey, { value: `+${formatNumber(value)}` }), description };
                })
                .filter((row): row is { label: string; description: string } => row !== null);

              // SpecRef: 8.2.2 | Party member details | Bonus(ボーナス) Display order
              const combatStyleEnableFlags = {
                melee: additive.equip_melee != null,
                ranged: additive.equip_ranged != null,
                magic: additive.equip_magic != null,
              };
              const combatStyleScores: Record<AutoEquipmentCombatStyle, number> = {
                melee: Math.max(0, (multipliers.sword ?? 1) - 1) + Math.max(0, (multipliers.katana ?? 1) - 1) + Math.max(0, (multipliers.gauntlet ?? 1) - 1),
                ranged: Math.max(0, (multipliers.arrow ?? 1) - 1) + Math.max(0, (multipliers.bolt ?? 1) - 1) + Math.max(0, (multipliers.archery ?? 1) - 1),
                magic: Math.max(0, (multipliers.wand ?? 1) - 1) + Math.max(0, (multipliers.grimoire ?? 1) - 1) + Math.max(0, (multipliers.catalyst ?? 1) - 1),
              };
              let combatStyle: AutoEquipmentCombatStyle | null = null;
              let combatStyleScore = Number.NEGATIVE_INFINITY;
              (['ranged', 'magic', 'melee'] as AutoEquipmentCombatStyle[]).forEach((style) => {
                if (!combatStyleEnableFlags[style]) return;
                if (combatStyleScores[style] > combatStyleScore) {
                  combatStyle = style;
                  combatStyleScore = combatStyleScores[style];
                }
              });
              const combatStylePriorityKeys: Record<AutoEquipmentCombatStyle, string[]> = {
                melee: ['equip_melee', 'sword', 'katana', 'gauntlet'],
                ranged: ['equip_ranged', 'arrow', 'bolt', 'archery'],
                magic: ['equip_magic', 'wand', 'grimoire', 'catalyst'],
              };
              const selectedCombatStyleKeys = combatStyle ? combatStylePriorityKeys[combatStyle] : [];
              const combatPriorityMap = new Map<string, number>(selectedCombatStyleKeys.map((key, index) => [key, index]));
              const nonSelectedCombatStyleKeys = (['melee', 'ranged', 'magic'] as AutoEquipmentCombatStyle[])
                .filter((style) => style !== combatStyle)
                .flatMap((style) => combatStylePriorityKeys[style]);
              const otherBonusPriorityMap = new Map<string, number>(nonSelectedCombatStyleKeys.map((key, index) => [key, index]));
              const defensePriorityMap = new Map<string, number>([['armor', 0], ['robe', 1], ['shield', 2]]);
              const getBonusDisplayOrder = (key: string): number => {
                if (key === 'equip_slot') return 0;
                if (defensePriorityMap.has(key)) return 100 + (defensePriorityMap.get(key) ?? 0);
                if (combatPriorityMap.has(key)) return 200 + (combatPriorityMap.get(key) ?? 0);
                if (key === 'growth_xV') return 400;
                if (otherBonusPriorityMap.has(key)) return 300 + (otherBonusPriorityMap.get(key) ?? 0);
                return 300 + nonSelectedCombatStyleKeys.length + 1;
              };
              const sortedBonusDisplayEntries = [...bonusDisplayEntries].sort((a, b) => {
                const orderDiff = getBonusDisplayOrder(a.key) - getBonusDisplayOrder(b.key);
                if (orderDiff !== 0) return orderDiff;
                return a.label.localeCompare(b.label, 'ja-JP');
              });

              const bonusHelpMap = new Map<string, string>(
                [...helpRows, ...bHelpRows].map((row) => [row.label, row.description]),
              );
              const bonusEntries = sortedBonusDisplayEntries.map((entry, index) => ({
                key: `status-bonus-${index}-${entry.key}-${entry.label}`,
                label: entry.label,
                description: bonusHelpMap.get(entry.label) ?? t('home.bonus.descriptionMissing'),
              }));

              if (bonusEntries.length === 0) return null;
              return (
                <div className="text-xs text-gray-900 mt-1 leading-5">
                  <span className="break-words leading-5">{t('party.status.bonus')}: </span>
                  {bonusEntries.map((entry, index) => (
                    <span key={entry.key}>
                      {index > 0 && <span>, </span>}
                      <button
                        type="button"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => handleInlineDetailHelpToggle(entry.key, entry.label, entry.description, event)}
                        className="text-left hover:underline"
                      >
                        {entry.label}
                      </button>
                    </span>
                  ))}
                </div>
              );
            })()}
            {stats.abilities.length > 0 && (
              <div className="border-t border-gray-200 mt-2 pt-2">
                <div className="text-gray-900 text-xs">{t('party.status.abilities')}:</div>
                <div className="text-xs text-sub leading-5">
                  {stats.abilities.map((ability, index) => {
                    const label = ability.name;
                    const key = `status-ability-${ability.id}-${ability.level}-${index}`;
                    return (
                      <span key={key}>
                        {index > 0 && <span className="text-gray-900">, </span>}
                        <button
                          type="button"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => handleInlineDetailHelpToggle(
                            key,
                            label,
                            BONUS_ABILITY_GLOSSARY_ENTRY_BY_ABILITY_ID.has(ability.id as AbilityId)
                              ? formatBonusAbilityHelpDescription(ability.id as AbilityId, ability.level)
                              : ability.description,
                            event,
                          )}
                          className="text-left hover:underline"
                        >
                          {label}
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Equipment section */}
      <div className="bg-pane rounded-lg border border-gray-200 p-4 shadow-md shadow-slate-900/15">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">{t('party.equipment.title')}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {t('party.equipment.slotCount', { equipped: formatNumber(equippedItemCount), max: formatNumber(stats.maxEquipSlots) })}
            </span>
            {autoEquipmentMode === 2 && (
              <button
                type="button"
                onClick={handleAutoEquipmentButtonClick}
                className="text-xs font-semibold text-sub hover:opacity-80"
              >
                {t('party.equipment.autoEquip')}
              </button>
            )}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleAutoEquipmentModeCycle}
                className="text-xs font-semibold text-sub hover:opacity-80"
              >
                {getAutoEquipmentModeLabel(autoEquipmentMode)}
              </button>
              <button
                type="button"
                onClick={handleAutoEquipmentHelpToggle}
                className="h-5 w-5 rounded-full border border-gray-300 text-[10px] font-bold text-gray-600"
                aria-label={t('party.equipment.autoHelpAria')}
              >
                ?
              </button>
            </div>
          </div>
        </div>
        {showAutoEquipmentHelp && autoEquipmentHelpPosition && (
        <div
          className="floating-bubble-pane fixed z-20 rounded-lg p-3 text-xs text-gray-700 space-y-1"
          style={{
            top: autoEquipmentHelpPosition.top,
            left: autoEquipmentHelpPosition.left,
            width: autoEquipmentHelpPosition.width,
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {getAutoEquipmentHelpLines().map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        )}
      <div className="space-y-1">
        {(() => {
          // Build sorted list of equipment slots
          const slots = Array.from({ length: stats.maxEquipSlots }).map((_, i) => ({
            slotIndex: i,
            item: char.equipment[i],
          }));
            // Sort by category priority, then item ID, super rare, enhancement
            slots.sort((a, b) => {
              if (!a.item && !b.item) return a.slotIndex - b.slotIndex;
              if (!a.item) return 1;
              if (!b.item) return -1;
              const catA = CATEGORY_PRIORITY[a.item.category] ?? 99;
              const catB = CATEGORY_PRIORITY[b.item.category] ?? 99;
              if (catA !== catB) return catA - catB;
              if (a.item.id !== b.item.id) return b.item.id - a.item.id;
              if (a.item.superRare !== b.item.superRare) return b.item.superRare - a.item.superRare;
              return b.item.enhancement - a.item.enhancement;
            });
            return slots.map(({ slotIndex, item }) => {
              const allowedJewels = item ? JEWELS_BY_ITEM_CATEGORY[item.category] : [];
              const hasOwnedAllowedJewel = allowedJewels.some((jewelKey) =>
                Array.from({ length: 8 }).some((_, i) => getJewelOwnedCount(jewels, jewelKey, i + 1) > 0)
              );
              const canExpandJewelPanel = !!item && (hasOwnedAllowedJewel || !!item.jewel);
              const isExpanded = selectingSlot === slotIndex && canExpandJewelPanel;
              const isLockIconVisible = autoEquipmentMode === 2;
              const isLocked = item?.isLocked === true;
              // SpecRef: 8.2.4 | Equipment management | Lock and Unlock Item
              const lockEmojiClassName = isLocked ? 'sub-theme-emoji-icon' : 'unlock-theme-emoji-icon race-icon';
              return (
              <div key={slotIndex} className={`w-full p-2 text-left border rounded text-sm leading-tight bg-white shadow-sm shadow-slate-900/10 ${isExpanded ? 'border-sub' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  {item && isLockIconVisible && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        // SpecRef: 8.2.4 | Equipment management | Lock and Unlock Item
                        onToggleEquipmentLock(char.id, slotIndex);
                      }}
                      className="text-base leading-none"
                      aria-label={isLocked ? t('home.equipment.unlockAria') : t('home.equipment.lockAria')}
                    >
                      {renderUiIcon(isLocked ? 'lock' : 'unlock', lockEmojiClassName)}
                    </button>
                  )}
                  {/* SpecRef: 8.3 | UI_EXPEDITION | Toggle Operation */}
                  <button
                    onClick={() => handleSlotTap(slotIndex)}
                    className="w-full text-left leading-tight"
                  >
                    {item ? (
                      <div className="flex justify-between items-center">
                        <span>
                          <span className={getItemNameFontWeightClass(item)}>{getItemDisplayName(item)}</span>
                          <span className="text-xs leading-tight text-gray-500"> {getRarityShortLabel(item.id, item.name)} {renderTextWithRaceIcons(getItemStats(item, getCharacterCategoryMultiplier(char, item.category), hpDisplayMultiplier))}</span>
                        </span>
                        <span className="text-xs text-gray-400">[{t(CATEGORY_NAME_KEYS[item.category] ?? 'party.categoryName.unknown')}] {canExpandJewelPanel ? (isExpanded ? '▼' : '▲') : ''}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">{t('party.equipment.emptySlot')}</span>
                    )}
                  </button>
                </div>
                {isExpanded && item && (
                  <div className="mt-2 space-y-1 text-xs">
                    {allowedJewels.map((jewelKey) => (
                      <div key={jewelKey} className="flex items-center gap-1">
                        <span className="w-10 text-sm leading-none font-normal">{getJewelDisplayName(jewelKey)}:</span>
                        {Array.from({ length: 8 }).map((_, i) => {
                          const rank = i + 1;
                          const owned = getJewelOwnedCount(jewels, jewelKey, rank);
                          const isCurrent = item.jewel?.key === jewelKey && item.jewel?.rank === rank;
                          const isDisabled = !isCurrent && owned <= 0;
                          return (
                            <button
                              key={rank}
                              onClick={() => onAttachJewel(char.id, slotIndex, jewelKey, rank)}
                              disabled={isDisabled}
                              className={`inline-flex w-6 justify-start px-0.5 text-base leading-none tabular-nums ${owned > 0 ? 'text-black' : 'text-gray-400'} ${isCurrent ? 'font-bold text-sub' : ''}`}
                            >
                              {rank}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                    {item.jewel && (
                      <div className="pt-1 text-gray-600">
                        {getJewelSlotStatusText(item.jewel.key, item.jewel.rank)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );});
          })()}
        </div>
      </div>

      {/* Inventory Pane - Always visible */}
      {(() => {
        const hasEmptySlot = Array.from({ length: stats.maxEquipSlots }).some((_, i) => !char.equipment[i]);

        // Build combined list: inventory items + equipped items on current character
        type DisplayItem = {
          key: string;
          item: Item;
          count: number;
          isEquipped: boolean;
          slotIndex?: number;
        };

        const displayItems: DisplayItem[] = [];

        // Add equipped items for current character
        char.equipment.forEach((item, slotIndex) => {
          if (item && item.category === equipCategory) {
            displayItems.push({
              key: `equipped-${slotIndex}`,
              item,
              count: 1,
              isEquipped: true,
              slotIndex,
            });
          }
        });

        // Add inventory items (subtract equipped count for display)
        Object.entries(inventory)
          .filter(([, v]) => v.status === 'owned' && v.count > 0 && v.item.category === equipCategory)
          .forEach(([key, variant]) => {
            displayItems.push({
              key,
              item: variant.item,
              count: variant.count,
              isEquipped: false,
            });
          });

        // Sort by priority: Item ID (desc), SuperRare (desc), Enhancement (desc), equipped items BELOW normal items
        displayItems.sort((a, b) => {
          if (a.item.id !== b.item.id) return b.item.id - a.item.id;
          if (a.item.superRare !== b.item.superRare) return b.item.superRare - a.item.superRare;
          if (a.item.enhancement !== b.item.enhancement) return b.item.enhancement - a.item.enhancement;
          // Normal inventory items first, equipped items below
          if (a.isEquipped !== b.isEquipped) return a.isEquipped ? 1 : -1;
          return 0;
        });

        const handleItemTap = (displayItem: DisplayItem) => {
          if (displayItem.isEquipped && displayItem.slotIndex !== undefined) {
            // Unequip: single tap on equipped item
            onEquipItem(char.id, displayItem.slotIndex, null);
          } else {
            // Equip: use existing logic
            handleInventoryItemTap(displayItem.key);
          }
        };

        const applyProjectedDefenseToStatsText = (displayItem: DisplayItem, statsText: string): string => {
          const currentPhysicalDefense = Math.round(stats.physicalDefense);
          const currentMagicalDefense = Math.round(stats.magicalDefense);

          let targetSlotIndex: number | null = null;
          let targetItem: Item | null = null;

          if (displayItem.isEquipped && displayItem.slotIndex !== undefined) {
            targetSlotIndex = displayItem.slotIndex;
            targetItem = null;
          } else {
            targetSlotIndex = getEquipTargetSlotIndex();
            targetItem = targetSlotIndex !== null ? displayItem.item : null;
          }

          if (targetSlotIndex === null) return statsText;

          const nextCharacter = replaceCharacterEquipment(char, targetSlotIndex, targetItem);
          const nextStats = computeCharacterStats(nextCharacter, party.level);
          const nextPhysicalDefense = Math.round(nextStats.physicalDefense);
          const nextMagicalDefense = Math.round(nextStats.magicalDefense);
          const physicalDefenseDelta = nextPhysicalDefense - currentPhysicalDefense;
          const magicalDefenseDelta = nextMagicalDefense - currentMagicalDefense;
          const displaySignMultiplier = displayItem.isEquipped ? -1 : 1;
          const displayedPhysicalDefenseDelta = physicalDefenseDelta * displaySignMultiplier;
          const displayedMagicalDefenseDelta = magicalDefenseDelta * displaySignMultiplier;

          if (physicalDefenseDelta === 0 && magicalDefenseDelta === 0) return statsText;

          let nextStatsText = statsText;
          if (displayedPhysicalDefenseDelta !== 0) {
            nextStatsText = nextStatsText.replace(/物防\+[\d,]+/, `物防${displayedPhysicalDefenseDelta >= 0 ? '+' : ''}${formatNumber(displayedPhysicalDefenseDelta)}`);
          }
          if (displayedMagicalDefenseDelta !== 0) {
            nextStatsText = nextStatsText.replace(/魔防\+[\d,]+/, `魔防${displayedMagicalDefenseDelta >= 0 ? '+' : ''}${formatNumber(displayedMagicalDefenseDelta)}`);
          }
          return nextStatsText;
        };

        const filteredDisplayItems = displayItems.filter(displayItem =>
          matchesRarityFilter(displayItem.item.id, partyRarityFilter) &&
          (!partySuperRareOnly || displayItem.item.superRare >= 1)
        );

        return (
          <div className={`mt-4 border rounded-lg p-4 shadow-md shadow-slate-900/15 ${selectingSlot !== null ? 'border-sub bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="mb-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {selectingSlot !== null
                    ? t('party.equipment.slotEquip', { slot: selectingSlot + 1 })
                    : hasEmptySlot
                      ? t('party.equipment.tapEquipUnequip')
                      : t('party.equipment.selectSlot')}
                </span>
                {selectingSlot !== null && (
                  <div className="flex gap-2">
                    {char.equipment[selectingSlot] && (
                      <button
                        onClick={() => { onEquipItem(char.id, selectingSlot, null); setSelectingSlot(null); }}
                        className="text-xs text-accent px-2 py-1 border border-accent/40 rounded bg-white"
                      >
                        {t('party.equipment.remove')}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectingSlot(null)}
                      className="text-xs text-gray-500 px-2 py-1 border border-gray-300 rounded bg-white"
                    >
                      {t('party.equipment.clearSelection')}
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-1 flex justify-end items-center gap-1">
                <span className="text-xs text-gray-500">{getRarityFilterNote(partyRarityFilter)}</span>
                {RARITY_FILTER_OPTIONS.map(filter => (
                  <button
                    key={filter}
                    onClick={() => setPartyRarityFilter(filter)}
                    className={`text-xs px-1.5 py-0.5 border rounded shadow-sm shadow-slate-900/10 ${
                      partyRarityFilter === filter
                        ? 'bg-sub text-white border-sub'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                    }`}
                    title={getRarityFilterNote(filter)}
                  >
                    {RARITY_FILTER_LABELS[filter]}
                  </button>
                ))}
                <span className="text-xs text-gray-500"> {t('party.equipment.superRare')}</span>
                <button
                  onClick={() => setPartySuperRareOnly(prev => !prev)}
                  className={`text-xs px-1.5 py-0.5 border rounded shadow-sm shadow-slate-900/10 ${
                    partySuperRareOnly
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {partySuperRareOnly ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
            {/* Category group tabs */}
          <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
              {availableCategoryGroups.map(group => (
                <div key={group.id} className="flex flex-col">
                  <div className="text-xs text-gray-400 text-center mb-0.5">{t(group.labelKey)}</div>
                  <div className="flex">
                    {group.categories.map((cat, i) => (
                      <button
                        key={cat}
                        onClick={() => setEquipCategory(cat)}
                        className={`px-2 py-1 text-xs shadow-sm shadow-slate-900/10 ${
                          i === 0 ? 'rounded-l' : i === group.categories.length - 1 ? 'rounded-r' : ''
                        } ${
                          equipCategory === cat
                            ? 'bg-sub text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {t(`party.categoryShort.${cat}`)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-0.5 min-h-[320px] max-h-96 overflow-y-auto">
              {filteredDisplayItems.map((displayItem) => (
                <button
                  key={displayItem.key}
                  onClick={() => handleItemTap(displayItem)}
                  disabled={!displayItem.isEquipped && selectingSlot === null && !hasEmptySlot}
                  className={`w-full p-2 text-left text-sm border rounded bg-white shadow-sm shadow-slate-900/10 ${
                    displayItem.isEquipped
                      ? 'border-sub bg-blue-50'
                      : selectingSlot !== null || hasEmptySlot
                        ? 'border-gray-200 hover:bg-gray-50'
                        : 'border-gray-200 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {displayItem.isEquipped && (() => {
                        const equippedOwnerImageSrc = getInventoryOwnerCharacterImageSrc(char, party.id);
                        return equippedOwnerImageSrc
                          ? (
                            <div className="relative shrink-0 h-10 w-10 overflow-visible rounded">
                              <img
                                src={equippedOwnerImageSrc}
                                alt={`${char.name} portrait`}
                                className="pointer-events-none absolute bottom-[-4px] left-1/2 h-16 w-16 max-w-none -translate-x-1/2 rounded object-contain object-bottom"
                              />
                            </div>
                          )
                          : <RaceIcon race={race} className="h-4 w-4 mt-0.5 shrink-0" />;
                      })()}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`truncate ${getItemNameFontWeightClass(displayItem.item)}`}>{getItemDisplayName(displayItem.item)}</span>
                          {!displayItem.isEquipped && <span className="text-xs text-gray-500 shrink-0">x{displayItem.count}</span>}
                        </div>
                        <div className="text-xs leading-tight text-gray-400 truncate">
                          {getRarityShortLabel(displayItem.item.id, displayItem.item.name)} {renderTextWithRaceIcons(applyProjectedDefenseToStatsText(displayItem, getItemStats(displayItem.item, getCharacterCategoryMultiplier(char, displayItem.item.category), hpDisplayMultiplier)))}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {filteredDisplayItems.length === 0 && (
                <div className="text-gray-400 text-sm text-center py-2">{t('party.equipment.noItemsInCategory')}</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// SpecRef: 8.3 | UI_EXPEDITION | Expedition
// SpecRef: 8.3 | UI_EXPEDITION | Gods Battle (神魔戦)
function ExpeditionTab({
  state,
  debugSettings,
  emulatedNowMs,
  onSelectDungeon,
  onToggleExpeditionDestinationMode,
  onSetExpeditionDepthLimit,
  onSetExpeditionDifficultyOffset,
  onResetExpeditionStats,
  isExpeditionStatsDisplayEnabled,
  partyCycles,
  afkRecoveryProgressPercent,
  afkRecoveryCompletedMs,
  afkRecoveryTotalMs,
  onTriggerSortie,
  expandedLogParty,
  setExpandedLogParty,
  expandedRoom,
  setExpandedRoom,
  isDarkModeEnabled,
}: {
  state: GameState;
  debugSettings: DebugSettings;
  emulatedNowMs: number;
  onSelectDungeon: (partyIndex: number, dungeonId: number) => void;
  onToggleExpeditionDestinationMode: (partyIndex: number, nextMode: ExpeditionDestinationMode) => void;
  onSetExpeditionDepthLimit: (partyIndex: number, depthLimit: ExpeditionDepthLimit) => void;
  onSetExpeditionDifficultyOffset: (partyIndex: number, difficultyOffset: number) => void;
  onResetExpeditionStats: (partyIndex: number) => void;
  isExpeditionStatsDisplayEnabled: boolean;
  partyCycles: Record<number, PartyCycleRuntime>;
  afkRecoveryProgressPercent: number | null;
  afkRecoveryCompletedMs: number;
  afkRecoveryTotalMs: number;
  onTriggerSortie: (partyIndex: number, triggerGodsBattle?: boolean) => void;
  expandedLogParty: number | null;
  setExpandedLogParty: Dispatch<SetStateAction<number | null>>;
  expandedRoom: { partyIndex: number; roomIndex: number; latestRoomToken: string } | null;
  setExpandedRoom: Dispatch<SetStateAction<{ partyIndex: number; roomIndex: number; latestRoomToken: string } | null>>;
  isDarkModeEnabled: boolean;
}) {
  const [activeEnemyBestiaryBubble, setActiveEnemyBestiaryBubble] = useState<{
    key: string;
    enemy: EnemyDef;
    enemyLevel: number | null;
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [activeRewardItemBubble, setActiveRewardItemBubble] = useState<RewardItemBubble | null>(null);
  const [activeProgressBubble, setActiveProgressBubble] = useState<{
    key: string;
    text: string;
    top: number;
    left: number;
    maxWidth: number;
  } | null>(null);
  const [disclosedExpeditionLogs, setDisclosedExpeditionLogs] = useState<Array<Party['lastExpeditionLog'] | null>>(() =>
    state.parties.map((party) => party.lastExpeditionLog)
  );

  useEffect(() => {
    // SpecRef: 8.3 | UI_EXPEDITION | Update Timing
    // The engine prepares the latest expedition log while state.explore is still
    // animating. Keep the headline floor/outcome pinned to the last disclosed
    // log until exploration finishes so the first row does not spoil the result.
    setDisclosedExpeditionLogs((previousLogs) => {
      let changed = previousLogs.length !== state.parties.length;
      const nextLogs = state.parties.map((party, index) => {
        const cycleState = partyCycles[index]?.state ?? 'idle';
        if (cycleState === 'explore') return previousLogs[index] ?? null;
        const nextLog = party.lastExpeditionLog ?? null;
        if (previousLogs[index] !== nextLog) changed = true;
        return nextLog;
      });
      return changed ? nextLogs : previousLogs;
    });
  }, [state.parties, partyCycles]);
  const [activeRingStatusBubble, setActiveRingStatusBubble] = useState<{
    key: string;
    text: string;
    top: number;
    left: number;
    maxWidth: number;
  } | null>(null);

  const getEstimatedStartHp = (entry: ExpeditionLogEntry) => {
    if (typeof entry.startPartyHP === 'number') {
      return Math.min(entry.maxPartyHP, Math.max(0, entry.startPartyHP));
    }
    const healAmount = Math.max(0, entry.healAmount ?? 0);
    const attritionAmount = Math.max(0, entry.attritionAmount ?? 0);
    return Math.min(entry.maxPartyHP, Math.max(0, entry.remainingPartyHP + entry.damageTaken + attritionAmount - healAmount));
  };

  const handleEnemyBestiaryBubbleToggle = (
    bubbleKey: string,
    entry: ExpeditionLogEntry,
    enemyLevel: number | null,
    targetElement: HTMLElement,
  ) => {
    const enemy = getBestiaryEnemyFromLogEntry(entry);
    if (!enemy) return;

    if (activeEnemyBestiaryBubble?.key === bubbleKey) {
      setActiveEnemyBestiaryBubble(null);
      return;
    }

    const triggerRect = targetElement.getBoundingClientRect();
    const viewportPadding = 12;
    const bubbleWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - bubbleWidth,
    );

    // SpecRef: 8.3 | UI_EXPEDITION | f.battle_logs
    // Tap enemy’s name part to show floating bubble of its bestiary.
    setActiveEnemyBestiaryBubble({
      key: bubbleKey,
      enemy,
      enemyLevel,
      top: triggerRect.bottom + 8,
      left,
      width: bubbleWidth,
    });
  };

  const handleProgressBubbleToggle = (
    bubbleKey: string,
    bubbleText: string,
    targetElement: HTMLElement,
  ) => {
    if (activeProgressBubble?.key === bubbleKey) {
      setActiveProgressBubble(null);
      return;
    }

    const triggerRect = targetElement.getBoundingClientRect();
    const viewportPadding = 12;
    const bubbleMaxWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - bubbleMaxWidth,
    );

    // SpecRef: 8.3 | UI_EXPEDITION | Progress Visual Update
    setActiveProgressBubble({
      key: bubbleKey,
      text: bubbleText,
      top: triggerRect.bottom + 8,
      left,
      maxWidth: bubbleMaxWidth,
    });
  };

  const handleRingStatusBubbleToggle = (
    bubbleKey: string,
    bubbleText: string,
    targetElement: HTMLElement,
  ) => {
    if (activeRingStatusBubble?.key === bubbleKey) {
      setActiveRingStatusBubble(null);
      return;
    }

    const triggerRect = targetElement.getBoundingClientRect();
    const viewportPadding = 12;
    const bubbleMaxWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - bubbleMaxWidth,
    );

    setActiveRingStatusBubble({
      key: bubbleKey,
      text: bubbleText,
      top: triggerRect.bottom + 8,
      left,
      maxWidth: bubbleMaxWidth,
    });
  };

  const handleRewardItemBubbleToggle = (bubbleKey: string, item: Item, targetElement: HTMLElement) => {
    if (activeRewardItemBubble?.key === bubbleKey) {
      setActiveRewardItemBubble(null);
      return;
    }

    // SpecRef: 8.3 | UI_EXPEDITION | f.battle_logs
    setActiveRewardItemBubble({
      key: bubbleKey,
      text: getItemInventoryDetailText(item),
      ...getRewardItemBubblePosition(targetElement),
    });
  };

  return (
    <div
      className="space-y-1.5"
      onPointerDown={() => {
        if (activeProgressBubble) {
          setActiveProgressBubble(null);
        }
        if (activeEnemyBestiaryBubble) {
          setActiveEnemyBestiaryBubble(null);
        }
        if (activeRingStatusBubble) {
          setActiveRingStatusBubble(null);
        }
        if (activeRewardItemBubble) {
          setActiveRewardItemBubble(null);
        }
      }}
    >
      {activeRewardItemBubble ? (
        <FloatingBubblePortal>
          <div
            className="floating-bubble-pane fixed z-20 rounded-lg p-2 text-xs text-gray-700"
            style={{
              top: activeRewardItemBubble.top,
              left: activeRewardItemBubble.left,
              width: 'max-content',
              maxWidth: activeRewardItemBubble.maxWidth,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {renderTextWithRaceIcons(activeRewardItemBubble.text)}
          </div>
        </FloatingBubblePortal>
      ) : null}
      {activeProgressBubble ? (
        <div
          className="floating-bubble-pane fixed z-20 rounded-lg p-2"
          style={{
            top: activeProgressBubble.top,
            left: activeProgressBubble.left,
            width: 'max-content',
            maxWidth: activeProgressBubble.maxWidth,
          }}
        >
          <div className="text-xs text-gray-700 leading-snug break-words">
            {activeProgressBubble.text}
          </div>
        </div>
      ) : null}
      {activeEnemyBestiaryBubble && <EnemyBestiaryBubble bubble={activeEnemyBestiaryBubble} />}
      {activeRingStatusBubble ? (
        <div
          className="floating-bubble-pane fixed z-20 rounded-lg p-2"
          style={{
            top: activeRingStatusBubble.top,
            left: activeRingStatusBubble.left,
            width: 'max-content',
            maxWidth: activeRingStatusBubble.maxWidth,
          }}
        >
          <div className="whitespace-pre-line text-xs text-gray-700 leading-snug break-words">
            {activeRingStatusBubble.text}
          </div>
        </div>
      ) : null}
      {[0, 1, 2, 3, 4, 5].map((partyIndex) => {
        const party = state.parties[partyIndex];
        if (!party) {
          const lockedPartyUnlockTextByIndex: Partial<Record<number, string>> = {
            1: t('home.party.locked.clearVarunSea'),
            2: t('home.party.locked.clearFelidyDesert'),
            3: t('home.party.locked.clearUrsanBlaze'),
            4: t('home.party.locked.clearProcyonNest'),
            5: t('home.party.locked.clearLeporianMoon'),
          };
          const lockedPartyHintVisibleRequirementByIndex: Partial<Record<number, number>> = {
            1: 2,
            2: 3,
            3: 4,
            4: 5,
            5: 6,
          };
          // SpecRef: 5.1.3.2 | Unlock party | Unlock Party
          const hintVisibleRequiredBossDungeonId = lockedPartyHintVisibleRequirementByIndex[partyIndex];
          const isHintVisible = typeof hintVisibleRequiredBossDungeonId === 'number'
            ? state.parties.some((existingParty) => hasDefeatedDungeonBoss(existingParty, hintVisibleRequiredBossDungeonId))
            : false;
          if (!isHintVisible) return null;
          const lockedPartyText = lockedPartyUnlockTextByIndex[partyIndex] ?? t('home.party.locked.unreleased');
          return <div key={partyIndex} className="bg-pane rounded-lg p-2"><div className="text-xs text-gray-400">PT{partyIndex + 1}: {lockedPartyText}</div></div>;
        }

        const selectedDungeon = DUNGEONS.find(d => d.id === party.selectedDungeonId);
        // SpecRef: 8.3 | UI_EXPEDITION | Difficulty Offset (難易度)
        const isDifficultyOffsetUnlocked = hasDefeatedDungeonBoss(party, party.selectedDungeonId);
        const difficultyOffsetMax = getDifficultyOffsetMax(selectedDungeon?.expLevel ?? 88);
        const selectedDifficultyOffset = isDifficultyOffsetUnlocked
          ? normalizeDifficultyOffset(party.expeditionDifficultyOffsetByDungeon?.[party.selectedDungeonId] ?? party.expeditionDifficultyOffset, difficultyOffsetMax)
          : 0;
        const difficultyItemChanceTickets = getDifficultyOffsetItemChanceTickets(selectedDifficultyOffset);
        const difficultySuperRareChanceTickets = getDifficultyOffsetSuperRareChanceTickets(selectedDifficultyOffset);
        const getDifficultyOffsetBubbleText = (offset: number) => t('home.expedition.difficultyOffsetBubble', { enemyLevel: formatNumber(offset), itemChance: formatNumber(getDifficultyOffsetItemChanceTickets(offset)), superRareChance: formatNumber(getDifficultyOffsetSuperRareChanceTickets(offset)) });
        const selectedDungeonGate = selectedDungeon ? getDungeonEntryGateState(party, selectedDungeon) : null;
        const cycle = partyCycles[partyIndex] ?? { state: 'idle', stateStartedAt: Date.now(), durationMs: 1000 };
        const cycleElapsedMs = Math.max(0, Date.now() - cycle.stateStartedAt);
        const { partyStats } = computePartyStats(party);
        const isLogExpanded = expandedLogParty === partyIndex;
        const currentLog = party.lastExpeditionLog;
        const disclosedLog = cycle.state === 'explore'
          ? disclosedExpeditionLogs[partyIndex] ?? null
          : currentLog;
        const currentLogDungeonExpLevel = DUNGEONS.find((dungeon) => dungeon.id === currentLog?.dungeonId)?.expLevel;
        // SpecRef: 8.3 | UI_EXPEDITION | First row text / Update Timing
        const headlineFloorName = (() => {
          if (!disclosedLog) return selectedDungeon?.name ?? '-';
          const latestEntry = disclosedLog.entries[disclosedLog.entries.length - 1];
          if (!latestEntry?.floor) return disclosedLog.dungeonName;
          return getLocalizedExpeditionFloorConcept(disclosedLog.dungeonId, latestEntry.floor)
            ?? t('expedition.floor', { floor: formatNumber(latestEntry.floor) });
        })();
        const headlineState = disclosedLog
          ? getExpeditionOutcomeLabel(disclosedLog.finalOutcome)
          : getPartyCycleStateLabel(cycle.state);
        const conditionLabel = getConditionLabel(party.condition, true);

        const displayedEntries = (() => {
          if (!currentLog) return [];
          if (cycle.state !== 'explore') return currentLog.entries;
          const visibleCount = getExplorationVisibleRoomCount(cycleElapsedMs, cycle.durationMs, currentLog.entries.length);
          return currentLog.entries.slice(0, visibleCount);
        })();

        const displayedHp = (() => {
          if (cycle.state !== 'explore' || !currentLog || currentLog.entries.length === 0) return party.currentHp;
          if (displayedEntries.length === 0) return getEstimatedStartHp(currentLog.entries[0]);
          return displayedEntries[displayedEntries.length - 1].remainingPartyHP;
        })();
        const hpPercent = Math.min(100, Math.round((displayedHp / Math.max(1, partyStats.hp)) * 100));
        const normalizedCondition = Math.max(-400, Math.min(400, Math.floor(party.condition)));
        const conditionPercent = Math.min(100, Math.round((Math.abs(normalizedCondition) / 400) * 100));
        const isConditionPositive = normalizedCondition >= 0;
        const conditionRingStroke = isConditionPositive
          ? 'rgb(var(--color-sub) / 0.78)'
          : 'rgb(var(--color-accent) / 0.52)';
        const sellProgressState = (() => {
          if (cycle.state !== 'sell') return null;
          const autoSellItems = party.lastExpeditionLog?.autoSellItems ?? [];
          const sellStepCount = getAutoSellStepCount(party);
          const rawSellProgress = Math.min(1, cycleElapsedMs / Math.max(1, cycle.durationMs));
          const completedSteps = Math.min(sellStepCount, Math.floor(rawSellProgress * sellStepCount));
          const activeStep = Math.max(0, Math.min(sellStepCount - 1, completedSteps));
          const activeItem = autoSellItems[Math.min(activeStep, Math.max(0, autoSellItems.length - 1))];
          return {
            percent: (completedSteps / sellStepCount) * 100,
            completedSteps,
            activeStep,
            activeItem,
          };
        })();

        const progressPercent = afkRecoveryProgressPercent ?? (() => {
          // SpecRef: 5.1 | PROGRESS | Step Progress behavior by state
          if (cycle.state === 'idle') return 100;
          if (cycle.state === 'reactivate') return 100;
          if (cycle.state === 'explore') {
            return (Math.min(EXPLORING_PROGRESS_TOTAL_STEPS, displayedEntries.length) / EXPLORING_PROGRESS_TOTAL_STEPS) * 100;
          }
          if (cycle.state === 'rest') {
            const totalSteps = Math.max(1, cycle.restInitialTotalSteps ?? 1);
            const healPerStep = Math.max(REST_HEAL_MIN_HP, Math.ceil(partyStats.hp * REST_HEAL_MAX_HP_RATIO));
            const missingHp = Math.max(0, partyStats.hp - party.currentHp);
            const remainingSteps = missingHp <= 0 ? 0 : Math.ceil(missingHp / healPerStep);
            const completedSteps = Math.max(0, Math.min(totalSteps, totalSteps - remainingSteps));
            return (completedSteps / totalSteps) * 100;
          }
          if (sellProgressState !== null) {
            return sellProgressState.percent;
          }
          return Math.min(100, (cycleElapsedMs / Math.max(1, cycle.durationMs)) * 100);
        })();
        const normalizedProgressPercent = Number.isFinite(progressPercent)
          ? Math.max(0, Math.min(100, progressPercent))
          : 0;
        const visualProgressPercent = afkRecoveryProgressPercent !== null && normalizedProgressPercent <= 0
          ? 1
          : normalizedProgressPercent;
        // SpecRef: 8.3 | UI_EXPEDITION | Sub progress bar
        const subProgressPercent = (() => {
          if (!STEP_BASED_STATES.has(cycle.state)) return null;
          const totalStepCount = cycle.state === 'rest'
            ? Math.max(1, cycle.restInitialTotalSteps ?? 1)
            : cycle.state === 'sell'
            ? getAutoSellStepCount(party)
            : Math.max(1, currentLog?.entries.length ?? 1);
          const stepDurationMs = cycle.state === 'rest'
            ? Math.max(1, cycle.durationMs)
            : Math.max(1, cycle.durationMs / totalStepCount);
          const elapsedWithinStepMs = cycleElapsedMs % stepDurationMs;
          return Math.min(100, (elapsedWithinStepMs / stepDurationMs) * 100);
        })();
        const progressLabel = (() => {
          if (afkRecoveryProgressPercent !== null) {
            // SpecRef: 5.1.1 | Party State Machine | Refresh Handling
            // Show AFK recovery progress as percent + completed/total seconds so refresh resumes with the same visible counts.
            const totalSeconds = Math.max(1, Math.ceil(afkRecoveryTotalMs / 1000));
            const completedSeconds = Math.max(0, Math.min(totalSeconds, Math.floor(afkRecoveryCompletedMs / 1000)));
            const percentText = `${Math.round(normalizedProgressPercent)}%`;
            return `${getPartyCycleStateLabel('reactivate')} ${percentText} (${formatNumber(completedSeconds)}/${formatNumber(totalSeconds)})`;
          }
          // SpecRef: 8.3 | UI_EXPEDITION | Party state progress bar
          return getPartyCycleStateLabel(cycle.state);
        })();
        const hpForSortieCheck = cycle.state === 'explore' ? displayedHp : party.currentHp;
        // SpecRef: 8.3 | UI_EXPEDITION | Charge
        const instantChargeState = getInstantExpeditionChargeState(party, emulatedNowMs);
        const instantChargeDisplay = formatInstantExpeditionChargeDisplay(instantChargeState);
        const instantChargeLabel = instantChargeDisplay.label;
        const isInstantExpeditionStockEmpty = instantChargeState.stock <= 0;
        const isColosseumSelected = selectedDungeon?.id === 99;
        // SpecRef: 8.3 | UI_EXPEDITION | "出撃" / "神魔戦" Buttons
        const isPendingGodsBattleMove = cycle.state === 'move' && cycle.isCurrentExpeditionGodsBattle === true;
        const isPartyHpDepletedForSortie = hpForSortieCheck <= 0 || partyStats.hp <= 0;
        const isSortieDisabled = !isColosseumSelected && (
          !!selectedDungeonGate?.locked
          || (isPartyHpDepletedForSortie && isInstantExpeditionStockEmpty)
          || (cycle.state === 'explore' && isInstantExpeditionStockEmpty)
        );
        const canTriggerGodsBattle = cycle.state === 'explore'
          ? cycle.isCurrentExpeditionGodsBattle === true
          : isGodsBattleAvailable(party, party.selectedDungeonId);
        const isGodsBattleButtonDisabled = isSortieDisabled || isPendingGodsBattleMove;
        const expeditionControlGridClass = canTriggerGodsBattle
          ? 'grid grid-cols-[2.75rem_minmax(0,1fr)_auto_auto_auto] items-center gap-2 text-sm text-gray-700'
          : 'grid grid-cols-[2.75rem_minmax(0,1fr)_auto_auto] items-center gap-2 text-sm text-gray-700';
        // SpecRef: 8.3 | UI_EXPEDITION | Gods Battle (神魔戦)
        // SpecRef: 8.3 | UI_EXPEDITION | Party Pane Visual State
        const isGodsBattleInProgress = (
          cycle.state === 'move'
          || cycle.state === 'explore'
        ) && cycle.isCurrentExpeditionGodsBattle === true;
        // SpecRef: 8.3 | UI_EXPEDITION | Progress Visual Update
        const compactProgressItems = getCompactProgressItems(
          party,
          getTimeSpeedScale(debugSettings),
          emulatedNowMs,
          cycle.state,
        );
        const displayedExpeditionStats = getDisplayedExpeditionStats(party, cycle.state);
        const partyPaneExpeditionId = cycle.state === 'explore'
          ? currentLog?.dungeonId
          : party.selectedDungeonId;
        const expeditionPaneBackgroundImageById: Record<number, string> = {
          1: 'Caninian-Plains.png',
          2: 'Lupinian-Taiga.png',
          3: 'Vulpinian-Ocean.png',
          4: 'Felidian-Desert.png',
          5: 'Ursan-Pyrepeak.png',
          6: 'Procyonian-Burrow.png',
          7: 'Leporian-Moon-Palace.png',
          8: 'Cervin-Vale.png',
        };
        const expeditionPaneBackgroundImage = partyPaneExpeditionId
          ? expeditionPaneBackgroundImageById[partyPaneExpeditionId]
          : undefined;
        // SpecRef: 8.3 | UI_EXPEDITION | Background images for expedition pane
        const expeditionPaneBackgroundStyle = expeditionPaneBackgroundImage
          ? {
            backgroundColor: isDarkModeEnabled ? 'rgb(15 23 42 / 0.40)' : undefined,
            backgroundImage: isDarkModeEnabled
              ? undefined
              : 'linear-gradient(rgb(255 255 255 / 0.72), rgb(255 255 255 / 0.72))',
            backgroundSize: '100% 100%',
            backgroundPosition: 'top left',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'scroll',
          }
          : undefined;
        const expeditionPaneImageLayerStyle = expeditionPaneBackgroundImage
          ? {
            opacity: isDarkModeEnabled ? 0.34 : 0.34,
            maskImage: 'linear-gradient(to bottom, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 1) 72%, rgb(0 0 0 / 0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 1) 72%, rgb(0 0 0 / 0) 100%)',
            transform: 'scale(1.01)',
            transformOrigin: 'top center',
          }
          : undefined;

        return (
          <div
            key={partyIndex}
            className={`bg-pane expedition-party-pane relative rounded-lg px-1 pt-0.5 pb-0 overflow-hidden shadow-md shadow-slate-900/15 border ${
              isGodsBattleInProgress ? 'border-sub/80 shadow-[0_0_0_1px_rgb(var(--color-sub)/0.65)]' : 'border-gray-200/80'
            }`}
            style={expeditionPaneBackgroundStyle}
          >
            {expeditionPaneImageLayerStyle && expeditionPaneBackgroundImage ? (
              <img
                aria-hidden
                alt=""
                src={`${import.meta.env.BASE_URL}background/${expeditionPaneBackgroundImage}`}
                className="pointer-events-none absolute top-0 left-0 w-full h-auto"
                style={expeditionPaneImageLayerStyle}
              />
            ) : null}
            <div className={`relative z-10 rounded-md px-1 py-0.5 text-gray-900 ${isDarkModeEnabled ? '' : 'bg-white/74'}`}>
            {/* SpecRef: 8.3 | UI_EXPEDITION | Outer Ring (`###` area) */}
            {/* SpecRef: 8.3 | UI_EXPEDITION | Inner Ring (`###` area) */}
            <button
              onClick={() => {
                const nextExpanded = isLogExpanded ? null : partyIndex;
                setExpandedLogParty(nextExpanded);
                setExpandedRoom(null);
              }}
              className="w-full mb-0.5"
            >
              <span className="min-w-0 flex items-start gap-2">
                <button
                  type="button"
                  className="relative h-10 w-10 shrink-0 mt-0.5"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleRingStatusBubbleToggle(
                      `${party.id}:ring-status`,
                      `HP ${formatNumber(displayedHp)} / ${formatNumber(partyStats.hp)}\n${conditionLabel}`,
                      event.currentTarget,
                    );
                  }}
                  aria-label={`HP ${hpPercent}%, condition ${conditionPercent}%`}
                  title={`HP ${formatNumber(displayedHp)} / ${formatNumber(partyStats.hp)} ${conditionLabel}`}
                >
                  <svg
                    viewBox="0 0 36 36"
                    className="h-full w-full drop-shadow-[0_1px_1px_rgb(15_23_42/0.2)]"
                    role="img"
                    aria-label={`HP ${hpPercent}%, condition ${conditionPercent}%`}
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="rgb(var(--color-sub) / 0.24)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="rgb(var(--color-sub))"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.max(0, Math.min(100, hpPercent)) * 0.88} 100`}
                      transform="rotate(-90 18 18)"
                      className="transition-[stroke-dasharray] duration-200"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="8.5"
                      fill="none"
                      stroke="rgb(var(--color-sub) / 0.18)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="8.5"
                      fill="none"
                      stroke={conditionRingStroke}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.max(0, Math.min(100, conditionPercent)) * 0.534} 100`}
                      transform="rotate(-90 18 18)"
                      className="transition-[stroke-dasharray,stroke] duration-200"
                    />
                  </svg>
                </button>
                <span className="min-w-0 flex-1 space-y-0 text-left">
                  <span className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-1.5 text-sm">
                    <span className={`min-w-0 truncate ${isDarkModeEnabled ? 'text-gray-50' : 'text-black'}`}>
                      <span className="font-bold shrink-0 mr-1">{party.name}</span>
                      {headlineFloorName}
                    </span>
                    <span
                      className={`justify-self-end text-right font-mono text-[12px] leading-5 whitespace-nowrap ${isDarkModeEnabled ? 'text-gray-50' : 'text-black'}`}
                      title="Instant Expedition Charge"
                      aria-label={`Instant Expedition Charge ${instantChargeLabel}`}
                    >
                      <span>{instantChargeDisplay.cells}</span><i>{instantChargeDisplay.timerText}</i>
                    </span>
                    <span className="shrink-0 flex items-center gap-1.5">
                      <span className="font-medium text-gray-700 shrink-0">{headlineState}</span>
                      <span className={`${isLogExpanded ? 'transform transition-transform rotate-180' : ''}`}>▼</span>
                    </span>
                  </span>
                  <span className="block h-5 min-w-0">
                    {compactProgressItems.length > 0 ? (
                      <span className={`flex h-full items-center gap-1 overflow-hidden ${isDarkModeEnabled ? 'text-gray-200' : 'text-gray-700'}`}>
                        {compactProgressItems.map((item, index) => {
                          const fillPercent = item.progressRatio === null
                            ? 0
                            : Math.max(0, Math.min(100, item.progressRatio * 100));
                          return (
                            <span
                              key={`${party.id}-compact-progress-${index}`}
                              className="relative inline-block h-full min-w-0 max-w-[70%] overflow-hidden rounded px-1 py-0.5 cursor-pointer"
                              title={item.bubbleText}
                              aria-label={item.bubbleText}
                              onPointerDown={(event) => {
                                event.stopPropagation();
                              }}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleProgressBubbleToggle(
                                  `${party.id}:${item.key}`,
                                  item.bubbleText,
                                  event.currentTarget,
                                );
                              }}
                              >
                              <span className={`relative z-10 block truncate text-[11px] leading-tight ${isDarkModeEnabled ? 'text-gray-50' : 'text-black/85'}`}>{item.compactText}</span>
                              <span
                                aria-hidden
                                className={`absolute bottom-0 left-1 right-1 h-0.5 overflow-hidden rounded-full ${isDarkModeEnabled ? 'bg-white/20' : 'bg-black/15'}`}
                              >
                                <span className="block h-full bg-sub/70" style={{ width: `${fillPercent}%` }} />
                              </span>
                            </span>
                          );
                        })}
                      </span>
                    ) : null}
                  </span>
                </span>
              </span>
              <span className={`mt-0.5 block relative h-5 min-w-0 rounded-md overflow-hidden text-[11px] shadow-[0_2px_6px_rgb(15_23_42/0.18),inset_0_1px_0_rgb(255_255_255/0.42)] ${isDarkModeEnabled ? 'bg-slate-900/28' : 'bg-white/45'}`}>
                <span
                  className={`absolute inset-y-0 left-0 bg-sub/20 ${cycle.state === 'explore' ? '' : 'transition-[width] duration-200'}`}
                  style={{ width: `${visualProgressPercent}%` }}
                />
                <span className={`relative z-10 flex h-full items-center justify-center px-1.5 text-center leading-tight ${isDarkModeEnabled ? 'text-gray-50' : 'text-black'}`}>
                  <span className="w-full truncate leading-tight">
                    {progressLabel}
                  </span>
                </span>
              </span>
            </button>

            {subProgressPercent !== null ? (
              <div className="mb-1 h-1 w-full overflow-hidden rounded-full bg-transparent" aria-label="Sub progress bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(subProgressPercent)}>
                <div
                  className="h-full bg-sub/40"
                  style={{ width: `${subProgressPercent}%` }}
                />
              </div>
            ) : (
              <div className="mb-1 h-1 w-full" aria-hidden="true" />
            )}

            {isLogExpanded && (
              <div className="space-y-2 mb-2">
                <div className={expeditionControlGridClass}>
                  <button
                    type="button"
                    onClick={() => onToggleExpeditionDestinationMode(
                      partyIndex,
                      party.expeditionDestinationMode === 'auto' ? 'fixed' : 'auto',
                    )}
                    className="w-11 px-1 py-1 text-xs font-medium whitespace-nowrap text-center"
                  >
                    {party.expeditionDestinationMode === 'auto' ? t('party.expedition.mode.auto') : t('party.expedition.mode.fixed')}
                  </button>
                  <select
                    value={party.selectedDungeonId}
                    onChange={(e) => onSelectDungeon(partyIndex, Number(e.target.value))}
                    className="min-w-0 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {DUNGEONS.filter((dungeon) => debugSettings.colosseumEnabled || dungeon.id !== 99).map(dungeon => {
                      const gateState = getDungeonEntryGateState(party, dungeon);
                      const isSelectable = dungeon.id === 99 ? debugSettings.colosseumEnabled : !gateState.locked;
                      if (!isSelectable) return null;
                      return <option key={dungeon.id} value={dungeon.id}>{dungeon.name}</option>;
                    })}
                  </select>
                  <select
                    value={party.expeditionDepthLimit}
                    onChange={(e) => onSetExpeditionDepthLimit(partyIndex, e.target.value as ExpeditionDepthLimit)}
                    className="w-20 sm:w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {getExpeditionDepthOptions(party.selectedDungeonId).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {canTriggerGodsBattle && (
                    <button
                      onClick={() => onTriggerSortie(partyIndex, true)}
                      disabled={isGodsBattleButtonDisabled}
                      className={`px-3 py-2 font-medium text-sm leading-none whitespace-nowrap liquid-glass-sortie-button ${isGodsBattleButtonDisabled ? '' : 'liquid-glass-sortie-button--accent'}`}
                    >
                      {t('party.expedition.godsBattle')}
                    </button>
                  )}
                  <button
                    onClick={() => onTriggerSortie(partyIndex, false)}
                    disabled={isSortieDisabled}
                    className={`px-3 py-2 font-medium text-sm leading-none whitespace-nowrap liquid-glass-sortie-button ${isSortieDisabled ? '' : 'liquid-glass-sortie-button--sub'}`}
                  >
                    {t('party.expedition.sortie')}
                  </button>
                </div>
                {isDifficultyOffsetUnlocked && (
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">{t('party.expedition.difficulty')}</span>
                      <button
                        type="button"
                        disabled={selectedDifficultyOffset <= 0}
                        aria-label={t('party.expedition.difficultyDecrease')}
                        onClick={() => onSetExpeditionDifficultyOffset(partyIndex, selectedDifficultyOffset - 2)}
                        className={`${IOS_GLASS_BUTTON_CLASS} flex h-7 w-7 shrink-0 items-center justify-center text-base font-semibold leading-none disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        −
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={difficultyOffsetMax}
                        step={2}
                        value={selectedDifficultyOffset}
                        onChange={(e) => {
                          const nextOffset = Number(e.target.value);
                          onSetExpeditionDifficultyOffset(partyIndex, nextOffset);
                        }}
                        className={`min-w-0 flex-1 ${IOS_GLASS_SLIDER_CLASS}`}
                        style={getSliderProgressStyle(selectedDifficultyOffset, 0, difficultyOffsetMax)}
                      />
                      <button
                        type="button"
                        disabled={selectedDifficultyOffset >= difficultyOffsetMax}
                        aria-label={t('party.expedition.difficultyIncrease')}
                        onClick={() => onSetExpeditionDifficultyOffset(partyIndex, selectedDifficultyOffset + 2)}
                        className={`${IOS_GLASS_BUTTON_CLASS} flex h-7 w-7 shrink-0 items-center justify-center text-base font-semibold leading-none disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="shrink-0 rounded px-1 text-left hover:bg-white/20 focus:outline-none focus:ring-1 focus:ring-sub/60"
                        title={getDifficultyOffsetBubbleText(selectedDifficultyOffset)}
                        aria-label={getDifficultyOffsetBubbleText(selectedDifficultyOffset)}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleProgressBubbleToggle(
                            `${party.id}:difficulty-offset`,
                            getDifficultyOffsetBubbleText(selectedDifficultyOffset),
                            event.currentTarget,
                          );
                        }}
                      >
                        +{formatNumber(selectedDifficultyOffset)} (🍀+{formatNumber(difficultyItemChanceTickets)}, ✨+{formatNumber(difficultySuperRareChanceTickets)})
                      </button>
                    </div>
                  </div>
                )}
                {isExpeditionStatsDisplayEnabled && (
                  <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                    <span>
                      {t('party.expedition.stats', { clear: formatNumber(displayedExpeditionStats.Clear), returned: formatNumber(displayedExpeditionStats.Turned_Back), draw: formatNumber(displayedExpeditionStats.Draw_Retreat), retreat: formatNumber(displayedExpeditionStats.Wounded_Retreat), defeat: formatNumber(displayedExpeditionStats.Defeat), total: formatNumber(displayedExpeditionStats.Clear + displayedExpeditionStats.Turned_Back + displayedExpeditionStats.Draw_Retreat + displayedExpeditionStats.Wounded_Retreat + displayedExpeditionStats.Defeat) })}
                    </span>
                    <button
                      type="button"
                      onClick={() => onResetExpeditionStats(partyIndex)}
                      className="shrink-0 underline hover:text-accent"
                    >
                      {t('party.expedition.reset')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentLog && isLogExpanded && (
              <div className="mx-1 border-t border-gray-200 pt-3">
                <div className="space-y-2">
                  {cycle.state !== 'explore' && (currentLog.totalExperience > 0 || currentLog.autoSellProfit > 0) && (
                    <div className="text-sm text-gray-500">
                      EXP: +{formatNumber(currentLog.totalExperience)}
                      {currentLog.autoSellProfit > 0 && <span> | {formatAutoSellSummary(currentLog.autoSellProfit, currentLog.autoSellMultiplier)}</span>}
                    </div>
                  )}

                  {cycle.state !== 'explore' && currentLog.rewards.length > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-500">{t('home.battle.acquiredItemsLabel')} </span>
                      {currentLog.rewards.map((item, i) => {
                        const rarity = getItemRarityById(item.id);
                        const isSuperRare = item.superRare > 0;
                        const rarityClass = getRarityTextClass(rarity, isSuperRare);
                        const fontWeightClass = getRewardFontWeightClass(rarity, isSuperRare);
                        return (
                          <Fragment key={i}>
                            {i > 0 && ', '}
                            <button
                              type="button"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => handleRewardItemBubbleToggle(`expedition-reward-${partyIndex}-${i}-${item.id}-${item.enhancement}-${item.superRare}`, item, event.currentTarget)}
                              className={`${rarityClass} ${fontWeightClass} align-baseline hover:underline`}
                            >
                              {getItemDisplayName(item)}
                            </button>
                          </Fragment>
                        );
                      })}
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-2 space-y-2">
                    {[...displayedEntries].reverse().map((entry, i, arr) => {
                      const originalIndex = arr.length - 1 - i;
                      const latestVisibleRoomIndex = displayedEntries.length - 1;
                      const latestBattleRoomIndex = displayedEntries.reduce((lastBattleIndex, candidateEntry, candidateIndex) => {
                        return candidateEntry.details && candidateEntry.details.length > 0
                          ? candidateIndex
                          : lastBattleIndex;
                      }, -1);
                      const defaultExpandedRoomIndex = latestBattleRoomIndex >= 0 ? latestBattleRoomIndex : latestVisibleRoomIndex;
                      const latestRoomToken = `${currentLog.completedRooms}-${latestVisibleRoomIndex}-${displayedEntries[latestVisibleRoomIndex]?.room ?? -1}`;
                      const roomLabel = entry.floor && entry.roomInFloor
                        ? `${entry.floor}F-${entry.roomInFloor}`
                        : entry.room === currentLog.totalRooms + 1 ? 'BOSS' : entry.room.toString();
                      const healAmount = Math.max(0, entry.healAmount ?? 0);
                      const attritionAmount = Math.max(0, entry.attritionAmount ?? 0);
                      const postBattleHP = typeof entry.postBattlePartyHP === 'number'
                        ? Math.min(entry.maxPartyHP, Math.max(0, entry.postBattlePartyHP))
                        : Math.min(entry.maxPartyHP, Math.max(0, entry.remainingPartyHP + attritionAmount - healAmount));
                      const startPartyHP = typeof entry.startPartyHP === 'number'
                        ? Math.min(entry.maxPartyHP, Math.max(0, entry.startPartyHP))
                        : Math.min(entry.maxPartyHP, Math.max(0, postBattleHP + entry.damageTaken));
                      const netLossAmount = Math.max(0, startPartyHP - entry.remainingPartyHP);
                      const currentHpWithoutHeal = Math.max(0, entry.remainingPartyHP - healAmount);
                      const remainingRatio = entry.maxPartyHP > 0 ? (currentHpWithoutHeal / entry.maxPartyHP) * 100 : 0;
                      const healRatio = entry.maxPartyHP > 0 ? (healAmount / entry.maxPartyHP) * 100 : 0;
                      const takenRatio = entry.maxPartyHP > 0 ? (netLossAmount / entry.maxPartyHP) * 100 : 0;
                      const enemyTakenAmount = Math.min(entry.enemyHP, Math.max(0, entry.damageDealt));
                      const enemyRemainingAmount = Math.max(0, entry.enemyHP - enemyTakenAmount);
                      const enemyRemainingRatio = entry.enemyHP > 0 ? (enemyRemainingAmount / entry.enemyHP) * 100 : 0;
                      const isManualExpandedRoom = expandedRoom?.partyIndex === partyIndex && expandedRoom?.latestRoomToken === latestRoomToken && expandedRoom?.roomIndex === originalIndex;
                      const hasManualSelectionForParty = expandedRoom?.partyIndex === partyIndex && expandedRoom?.latestRoomToken === latestRoomToken;
                      const canExpandRoom = !!entry.details && entry.details.length > 0;
                      const isRoomExpanded = canExpandRoom && (isManualExpandedRoom || (!hasManualSelectionForParty && originalIndex === defaultExpandedRoomIndex));

                      return (
                        <div key={`${partyIndex}-${originalIndex}-${entry.room}`} className="bg-white rounded overflow-visible shadow-[0_6px_16px_rgba(15,23,42,0.14)]">
                        <button
                          onClick={() => {
                            if (!canExpandRoom) return;
                            setExpandedRoom(isManualExpandedRoom
                              ? { partyIndex, roomIndex: -1, latestRoomToken }
                              : { partyIndex, roomIndex: originalIndex, latestRoomToken }
                            );
                          }}
                          className={`relative isolate w-full overflow-hidden rounded text-left p-2 text-xs ${canExpandRoom ? '' : 'cursor-default'}`}
                        >
                            {renderEnemyLogChibiBackground(entry)}
                            <div className="relative z-10 flex justify-between items-center">
                              <span className="font-medium">
                                {roomLabel}:{' '}
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const enemyLevel = typeof currentLogDungeonExpLevel === 'number' && entry.floor && entry.roomType
                                      ? getEffectiveEnemyLevel(
                                          currentLogDungeonExpLevel,
                                          entry.floor,
                                          entry.roomType,
                                          false,
                                          currentLog.difficultyOffset ?? 0,
                                        )
                                      : null;
                                    handleEnemyBestiaryBubbleToggle(`${partyIndex}-${originalIndex}-${entry.room}`, entry, enemyLevel, event.currentTarget);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key !== 'Enter' && event.key !== ' ') return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const enemyLevel = typeof currentLogDungeonExpLevel === 'number' && entry.floor && entry.roomType
                                      ? getEffectiveEnemyLevel(
                                          currentLogDungeonExpLevel,
                                          entry.floor,
                                          entry.roomType,
                                          false,
                                          currentLog.difficultyOffset ?? 0,
                                        )
                                      : null;
                                    handleEnemyBestiaryBubbleToggle(
                                      `${partyIndex}-${originalIndex}-${entry.room}`,
                                      entry,
                                      enemyLevel,
                                      event.currentTarget,
                                    );
                                  }}
                                  className="inline cursor-pointer rounded px-0.5 -mx-0.5 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
                                >
                                  {renderEnemyNameWithMutedClass(entry.enemyName)}
                                </span>
                              </span>
                              <span className="flex items-center gap-2">
                                <span className={entry.gateInfo ? 'text-gray-500 font-medium' : entry.outcome === 'victory' ? 'text-sub font-medium' : entry.outcome === 'defeat' ? 'text-accent font-medium' : 'text-accent font-medium'}>
                                  {entry.gateInfo ? t('expedition.outcome.unreached') : entry.outcome === 'victory' ? t('expedition.outcome.victory') : entry.outcome === 'defeat' ? t('expedition.outcome.defeat') : t('expedition.outcome.draw')}
                                </span>
                                {canExpandRoom && <span className={`transform transition-transform ${isRoomExpanded ? 'rotate-180' : ''}`}>▼</span>}
                              </span>
                            </div>
                            {(entry.gateInfo || entry.reward) && (
                              <div className="relative z-10 text-gray-500 mt-1 flex flex-wrap items-center gap-1">
                                {entry.gateInfo && <span className="text-accent">{entry.gateInfo}</span>}
                                {renderEntryReward(entry)}
                              </div>
                            )}
                            {!entry.gateInfo && (
                              <div className="relative z-10 mt-1 grid grid-cols-2 gap-2 text-gray-600">
                                <div>
                                  <div className="mb-0.5">{t('home.battle.partyHpLabel')} {formatNumber(entry.remainingPartyHP)} / {formatNumber(entry.maxPartyHP)}</div>
                                  <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgb(var(--color-hp-bar-empty) / var(--color-hp-bar-empty-alpha, 1))" }}>
                                    <div className="h-full" style={{ width: `${Math.min(100, remainingRatio)}%`, backgroundColor: 'rgb(var(--color-hp-bar-mild))' }} />
                                    <div className="h-full" style={{ width: `${Math.min(100, healRatio)}%`, backgroundColor: 'rgb(var(--color-heal-bar))' }} />
                                    <div className="h-full" style={{ width: `${Math.min(100, takenRatio)}%`, backgroundColor: 'rgb(var(--color-hp-taken))' }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="mb-0.5">{t('home.battle.enemyHpLabel')} {formatNumber(enemyRemainingAmount)} / {formatNumber(entry.enemyHP)}</div>
                                  <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgb(var(--color-hp-bar-empty) / var(--color-hp-bar-empty-alpha, 1))" }}>
                                    <div className="h-full" style={{ width: `${Math.min(100, enemyRemainingRatio)}%`, backgroundColor: 'rgb(var(--color-hp-bar-mild))' }} />
                                  </div>
                                </div>
                              </div>
                            )}
                          </button>
                          {isRoomExpanded && entry.details && (
                            <div className={`relative isolate overflow-hidden border-t border-gray-100 p-2 text-xs space-y-1 shadow-[0_8px_20px_rgba(15,23,42,0.14)] ${getEnemyLogBackgroundImagePath(entry.enemySnapshot) ? 'bg-gray-50 dark:bg-transparent' : 'bg-gray-50'}`}>
                              {getEnemyLogBackgroundImagePath(entry.enemySnapshot) && (
                                <>
                                  <img
                                    src={getEnemyLogBackgroundImagePath(entry.enemySnapshot) ?? ''}
                                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                    alt=""
                                    aria-hidden="true"
                                    className="pointer-events-none select-none absolute left-1/2 top-0 h-auto -translate-x-1/2 object-contain object-top opacity-20 dark:opacity-25"
                                    style={{
                                      width: 'clamp(120%, calc(270% - 0.3 * 100vw), 150%)',
                                      maxWidth: 'none',
                                    }}
                                  />
                                  {!isDarkModeEnabled && <div className="pointer-events-none absolute inset-0 bg-white/35" aria-hidden="true" />}
                                </>
                              )}
                              <div className="relative z-10">
                              <div className="font-medium text-gray-600 mb-1">{`${typeof entry.floor === 'number' ? (getLocalizedExpeditionFloorConcept(currentLog.dungeonId, entry.floor) ?? t('expedition.floor', { floor: formatNumber(entry.floor) })) : '-'} ${t('battleLog.title')}`}</div>
                              {aggregateBattleLifeDrainLogs(entry.details).map((log, j, battleLogs) => {
                                const isResurrectLog = log.note?.startsWith('(再起') || log.note?.startsWith('(即時蘇生)');
                                const isTriggeredLog = log.actor === 'triggered';
                                const isPhaseAction = log.actor !== 'deity' && log.actor !== 'effect';
                                const previousLog = j > 0 ? battleLogs[j - 1] : undefined;
                                const isStealthEffectLog = log.actor === 'effect' && (log.action.includes('物陰に隠れて攻撃をやり過ごせたのだ！') || log.action.includes('への攻撃はすべて幻だった！'));
                                const isCounterNegationEffectLog = log.actor === 'effect' && log.action.includes('反撃無効化により');
                                const previousWasStealthEffectLog = !!previousLog && previousLog.actor === 'effect' && (previousLog.action.includes('物陰に隠れて攻撃をやり過ごせたのだ！') || previousLog.action.includes('への攻撃はすべて幻だった！'));
                                const previousWasCounterNegationEffectLog = !!previousLog && previousLog.actor === 'effect' && previousLog.action.includes('反撃無効化により');
                                const previousWasInPhaseEffectLog = !!previousLog && previousLog.actor === 'effect' && (previousLog.phase === 'long' || previousLog.phase === 'mid' || previousLog.phase === 'close');
                                const previousWasPhaseAction = !!previousLog && (previousLog.actor !== 'deity' && previousLog.actor !== 'effect');
                                const previousContinuesCurrentPhase = !!previousLog && (previousWasPhaseAction || previousWasStealthEffectLog || previousWasCounterNegationEffectLog || previousWasInPhaseEffectLog);
                                const shouldShowPhaseHeader = isPhaseAction && (!previousLog || !previousContinuesCurrentPhase || previousLog.phase !== log.phase);
                                const shouldShowEndPhaseSpacer = !!previousLog && !isPhaseAction && previousWasPhaseAction;
                                const phaseLabel = getBattleLogPhaseLabel(log, isPhaseAction, isTriggeredLog, !!isResurrectLog, !!isStealthEffectLog, !!isCounterNegationEffectLog);
                                const phaseHeader = log.phase === 'long'
                                  ? t('battleLog.phase.long')
                                  : log.phase === 'mid'
                                    ? t('battleLog.phase.mid')
                                    : log.phase === 'close'
                                      ? t('battleLog.phase.close')
                                      : '';
                                const iconKey: UiIconKey = log.elementalOffense === 'fire'
                                  ? 'fire'
                                  : log.elementalOffense === 'thunder'
                                    ? 'thunder'
                                    : log.elementalOffense === 'ice'
                                      ? 'ice'
                                      : log.phase === 'long'
                                        ? 'ranged'
                                        : log.phase === 'mid'
                                          ? 'magic'
                                          : 'melee';
                                const isEnemy = log.actor === 'enemy';
                                const hits = log.hits ?? 0;
                                const totalAttempts = log.totalAttempts ?? 0;
                                const allMissed = totalAttempts > 0 && hits === 0 && !log.wasNegated;
                                const hitDisplay = totalAttempts > 0 ? `(${t('battleLog.hits', { hits, total: totalAttempts })})` : '';
                                const trailingEffectMatch = /\(([^()]+)\)$/.exec(log.action);
                                const trailingEffects = (trailingEffectMatch?.[1] ?? '')
                                  .split(',')
                                  .map(effect => effect.trim())
                                  .filter(effect => /^(共鳴\+\d+%|残響\+\d+%)$/.test(effect));
                                const rageDisplay = log.rageBonusPercent && log.rageBonusPercent > 0
                                  ? t('battleLog.extra.rage', { percent: log.rageBonusPercent })
                                  : '';
                                const momentumDisplay = typeof log.momentumBonusPercent === 'number'
                                  ? t('battleLog.extra.momentum', { sign: log.momentumBonusPercent >= 0 ? '+' : '', percent: log.momentumBonusPercent })
                                  : '';
                                const ambushDisplay = typeof log.ambushMultiplier === 'number' && log.ambushMultiplier > 1
                                  ? t('battleLog.extra.ambush', { multiplier: log.ambushMultiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') })
                                  : '';
                                const overwatchDisplay = typeof log.overwatchMultiplier === 'number' && log.overwatchMultiplier > 1
                                  ? t('battleLog.extra.overwatch', { multiplier: log.overwatchMultiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') })
                                  : '';
                                const executionDisplay = typeof log.executionMultiplier === 'number' && log.executionMultiplier > 1
                                  ? t('battleLog.extra.execution', { multiplier: log.executionMultiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') })
                                  : '';
                                const swarmActorDisplay = typeof log.swarmActorPenaltyPercent === 'number' && log.swarmActorPenaltyPercent > 0
                                  ? t('battleLog.extra.powerDown', { percent: log.swarmActorPenaltyPercent })
                                  : '';
                                const swarmOpponentDisplay = typeof log.swarmOpponentBonusPercent === 'number' && log.swarmOpponentBonusPercent > 0
                                  ? t('battleLog.extra.opponentDamageUp', { percent: log.swarmOpponentBonusPercent })
                                  : '';

                                let actionText: string;
                                if (log.actor === 'effect' || log.actor === 'triggered') {
                                  actionText = log.action;
                                } else if (isEnemy) {
                                  if (isResurrectLog) {
                                    actionText = t('battleLog.action.enemyResurrect', { action: log.action });
                                  } else if (log.isEnemyTargetHit) {
                                    actionText = allMissed ? t('battleLog.action.targetHitMissed', { action: log.action.replace('命中！', '') }) : log.action;
                                  } else {
                                    actionText = allMissed ? t('battleLog.action.enemyMissed', { action: log.action.replace('！', '') }) : t('battleLog.action.enemyActed', { action: log.action });
                                  }
                                } else {
                                  actionText = allMissed ? t('battleLog.action.partyMissed', { actor: log.action.replace(/ の.*$/, '') }) : log.action;
                                }

                                const extraSegments = [
                                  ...trailingEffects,
                                  rageDisplay,
                                  momentumDisplay,
                                  ambushDisplay,
                                  overwatchDisplay,
                                  executionDisplay,
                                  swarmActorDisplay,
                                  swarmOpponentDisplay,
                                ].filter(Boolean);
                                const mergedExtraSegments = Array.from(new Set(extraSegments));
                                const compactHitDisplay = hitDisplay && mergedExtraSegments.length > 0
                                  ? t('battleLog.hitsWithExtras', { hits, total: totalAttempts, extras: mergedExtraSegments.join(', ') })
                                  : hitDisplay;
                                const actionDisplay = trailingEffects.length > 0 && !allMissed
                                  ? actionText.replace(/\([^()]+\)$/, '')
                                  : actionText;
                                const actionDisplayNode = renderBattleLogTextWithInlineChibis(actionDisplay, party, entry);
                                const shouldRenderResurrectBeforeHeader = isResurrectLog && shouldShowPhaseHeader;
                                const isReflectDamageLog = !!log.reflectedDamage && log.reflectedDamage > 0;
                                const isAbsorbDamageLog = !!log.absorbedDamage && log.absorbedDamage > 0;
                                const reflectArrowClass = log.reflectTarget === 'party' ? 'text-accent' : 'text-sub';
                                const absorbArrowClass = log.absorbTarget === 'enemy' ? 'text-accent' : 'text-sub';
                                const damageColorClass = (log.damageTarget ?? (isEnemy ? 'party' : 'enemy')) === 'party' ? 'text-accent' : 'text-sub';
                                const damageEmojiClass = damageColorClass === 'text-accent' ? 'accent-theme-emoji-icon' : 'sub-theme-emoji-icon';
                                const damageDisplay = ((log.damage !== undefined && (log.damage > 0 || log.showZeroDamage)) || isReflectDamageLog || isAbsorbDamageLog) && (
                                  isReflectDamageLog
                                    ? (
                                      <span className="ml-auto shrink-0 whitespace-nowrap text-right text-gray-500">
                                        ({renderUiIcon(iconKey, damageEmojiClass)}{' '}{formatNumber(log.damage ?? 0)}, <span className={reflectArrowClass}>{t('home.battle.reflectedDamage', { damage: formatNumber(log.reflectedDamage || 0) })}</span>)
                                      </span>
                                    )
                                    : isAbsorbDamageLog
                                      ? (
                                        <span className="ml-auto shrink-0 whitespace-nowrap text-right text-gray-500">
                                          ({renderUiIcon(iconKey, damageEmojiClass)}{' '}<span className={absorbArrowClass}>{t('home.battle.absorbedDamage', { damage: formatNumber(log.absorbedDamage || 0) })}</span>)
                                        </span>
                                      )
                                      : (
                                        <span className={`ml-auto shrink-0 whitespace-nowrap text-right ${damageColorClass}`}>
                                          ({renderUiIcon(iconKey, damageEmojiClass)}{' '}{formatNumber(log.damage ?? 0)})
                                        </span>
                                      )
                                );

                                return (
                                  <div key={j}>
                                    {shouldRenderResurrectBeforeHeader && (
                                      <div className="flex items-start justify-between gap-2 text-gray-600">
                                        <span className="min-w-0">
                                        <span className="text-gray-400">[{phaseLabel}]</span>{' '}
                                          {actionDisplayNode}
                                          {renderBattleLogNote(log.note, log.noteTone)}
                                          {compactHitDisplay && <span className="text-gray-400">{compactHitDisplay}</span>}
                                        </span>
                                        {damageDisplay}
                                      </div>
                                    )}
                                    {shouldShowPhaseHeader && <div className="text-gray-400">({phaseHeader})</div>}
                                    {(!isResurrectLog || !shouldRenderResurrectBeforeHeader) && (
                                    <div className={`flex items-start justify-between gap-2 text-gray-600 ${shouldShowEndPhaseSpacer ? 'mt-1' : ''}`}>
                                      <span className="min-w-0">
                                        <span className="text-gray-400">[{phaseLabel}]</span>{' '}
                                        {actionDisplayNode}
                                        {renderBattleLogNote(log.note, log.noteTone)}
                                        {compactHitDisplay && <span className="text-gray-400">{compactHitDisplay}</span>}
                                      </span>
                                      {damageDisplay}
                                    </div>
                                    )}
                                  </div>
                                );
                              })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {cycle.state === 'explore' && displayedEntries.length === 0 && (
                      <div className="text-xs text-gray-500">{t('expedition.exploringLogUpdate')}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// SpecRef: 8.4 | UI_BASE | Base(拠点)
function BaseTab({
  inventory,
  jewels,
  jewelAutoEquipPriorityPartyId,
  parties,
  gold,
  shopPurchases,
  debugStorePurchases,
  shopRefreshCounts,
  shopIntimacy,
  shopIntimacyLastDecayAt,
  onSellStack,
  onSetVariantStatus,
  onBuyShopItem,
  onBuyDebugStoreItem,
  onRefreshShopLineup,
  onSetJewelAutoEquipPriorityParty,
  activeSubTab,
  onSetActiveSubTab,
  debugSettings,
}: {
  inventory: InventoryRecord;
  jewels: Record<string, number>;
  jewelAutoEquipPriorityPartyId: number | null;
  parties: Party[];
  gold: number;
  shopPurchases: Record<string, string[]>;
  debugStorePurchases: Record<string, number>;
  shopRefreshCounts: Record<string, number>;
  shopIntimacy: number;
  shopIntimacyLastDecayAt: number;
  onSellStack: (variantKey: string) => void;
  onSetVariantStatus: (variantKey: string, status: 'notown') => void;
  onBuyShopItem: (itemId: number, stockItemKey: string) => void;
  onBuyDebugStoreItem: (itemId: number) => void;
  onRefreshShopLineup: () => void;
  onSetJewelAutoEquipPriorityParty: (partyId: number | null) => void;
  activeSubTab: BaseSubTab;
  onSetActiveSubTab: (tab: BaseSubTab) => void;
  debugSettings: DebugSettings;
}) {
  const baseSubTabs = [
    { id: 'shop' as const, label: t('home.base.tab.shop'), isAvailable: true },
    { id: 'inventory' as const, label: t('home.base.tab.inventory'), isAvailable: true },
    { id: 'debugStore' as const, label: t('home.base.tab.debugStore'), isAvailable: debugSettings.jewelShopOpen },
    { id: 'workshop' as const, label: t('home.base.tab.workshop'), isAvailable: false },
    { id: 'altar' as const, label: t('home.base.tab.altar'), isAvailable: false },
  ];

  return (
    <div>
      <div className="liquid-glass-segmented mb-4 flex gap-1 rounded-2xl p-1">
        {baseSubTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (!tab.isAvailable) return;
              onSetActiveSubTab(tab.id);
            }}
            disabled={!tab.isAvailable}
            className={`${IOS_GLASS_TAB_CLASS} flex-1 px-1 py-2 text-sm font-medium transition-colors ${
              activeSubTab === tab.id
                ? 'liquid-glass-tab-active text-sub'
                : tab.isAvailable
                ? 'text-gray-700 hover:text-gray-900'
                : 'text-gray-300 cursor-not-allowed opacity-60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'inventory' ? (
        <InventoryTab
          inventory={inventory}
          jewels={jewels}
          jewelAutoEquipPriorityPartyId={jewelAutoEquipPriorityPartyId}
          parties={parties}
          onSellStack={onSellStack}
          onSetVariantStatus={onSetVariantStatus}
          onSetJewelAutoEquipPriorityParty={onSetJewelAutoEquipPriorityParty}
        />
      ) : activeSubTab === 'shop' ? (
        <ShopTab
          gold={gold}
          parties={parties}
          shopPurchases={shopPurchases}
          shopRefreshCounts={shopRefreshCounts}
          shopIntimacy={shopIntimacy}
          shopIntimacyLastDecayAt={shopIntimacyLastDecayAt}
          onBuyShopItem={onBuyShopItem}
          onRefreshShopLineup={onRefreshShopLineup}
        />
      ) : activeSubTab === 'debugStore' && debugSettings.jewelShopOpen ? (
        <DebugStoreTab
          gold={gold}
          debugStorePurchases={debugStorePurchases}
          onBuyDebugStoreItem={onBuyDebugStoreItem}
        />
      ) : (
        <div className="text-sm text-gray-600">{t('home.base.comingSoon')}</div>
      )}
    </div>
  );
}

// SpecRef: 8.4.1 | Shop (お店) | Lineup
function ShopTab({
  gold,
  parties,
  shopPurchases,
  shopRefreshCounts,
  shopIntimacy,
  shopIntimacyLastDecayAt,
  onBuyShopItem,
  onRefreshShopLineup,
}: {
  gold: number;
  parties: Party[];
  shopPurchases: Record<string, string[]>;
  shopRefreshCounts: Record<string, number>;
  shopIntimacy: number;
  shopIntimacyLastDecayAt: number;
  onBuyShopItem: (itemId: number, stockItemKey: string) => void;
  onRefreshShopLineup: () => void;
}) {
  const mustelidRace = RACES.find((race) => race.id === 'mustelid');
  const now = new Date();
  const elapsedRefreshes = countElapsedShopRefreshes(shopIntimacyLastDecayAt, now);
  const effectiveIntimacy = Math.max(0, Math.floor(shopIntimacy * (0.9 ** elapsedRefreshes)));
  const nextRefreshDate = getNextShopRefreshDate(now);
  const minutesToRefresh = Math.max(1, Math.ceil((nextRefreshDate.getTime() - now.getTime()) / 60000));
  const countdownText = minutesToRefresh >= 60
    ? t('home.shop.countdown.hours', { count: Math.floor(minutesToRefresh / 60) })
    : t('home.shop.countdown.minutes', { count: minutesToRefresh });
  const hourKey = getShopHourKey(now);
  const refreshCount = shopRefreshCounts[hourKey] ?? 0;
  const refreshPrice = getShopRefreshPrice(refreshCount);
  const highestDefeatedBossTier = DUNGEONS.reduce((highestTier, dungeon) => {
    const nextDungeonId = dungeon.id + 1;
    const hasBeatenBoss = parties.some((party) => (
      isDungeonEntryUnlocked(party, nextDungeonId)
    ));
    return hasBeatenBoss ? Math.max(highestTier, dungeon.id) : highestTier;
  }, 1);
  const lineupSeed = getShopLineupSeed(now, refreshCount);
  const stockKey = getShopStockKey(now, refreshCount);
  const shopCategories: ItemCategory[] = ['shield', 'armor', 'sword', 'wand', 'grimoire'];
  const soldOutItemKeys = shopPurchases[stockKey] ?? [];

  if (!mustelidRace) {
    return <div className="text-sm text-gray-600">{t('home.shop.preparing')}</div>;
  }

  const intimacyDialogue = effectiveIntimacy >= 80
    ? t('home.shop.dialogue.intimacy80')
    : effectiveIntimacy >= 40
      ? t('home.shop.dialogue.intimacy40')
      : effectiveIntimacy >= 20
        ? t('home.shop.dialogue.intimacy20')
        : t('home.shop.dialogue.default');

  const rarityPool: number[] = effectiveIntimacy >= 80
    ? [400, 300, 300, 200, 200]
    : effectiveIntimacy >= 40
      ? [300, 200, 200, 100, 100]
      : effectiveIntimacy >= 20
        ? [200, 100, 100, 100, 100]
        : [100, 100, 100, 100, 100];

  const seededTierForIndex = (index: number): number => {
    const x = Math.sin(lineupSeed + (index + 1) * 97) * 10000;
    const normalized = x - Math.floor(x);
    return Math.floor(normalized * highestDefeatedBossTier) + 1;
  };

  const shopItems = rarityPool.map((rarityBase, index) => {
    const tier = seededTierForIndex(index);
    const rotatedCategories = shopCategories.map((_, offset) => shopCategories[(index + offset) % shopCategories.length]);
    const targetRarity = getItemRarityById(tier * 1000 + rarityBase + 1);
    const categoriesByRarity = new Set<ItemCategory>(
      targetRarity === 'mythicRare' ? [] : getMasterItemCategoriesByRarity(tier, targetRarity)
    );
    const selectedCategory = rotatedCategories.find((category) => categoriesByRarity.has(category));
    const selectedCategoryIndex = selectedCategory ? ITEM_CATEGORY_ORDER.indexOf(selectedCategory) : -1;
    const categoryBasedItemId = selectedCategoryIndex >= 0
      ? tier * 1000 + rarityBase + selectedCategoryIndex + 1
      : null;
    const fallbackItem = ITEMS.find((item) => (
      Math.floor(item.id / 1000) === tier &&
      getItemRarityById(item.id) === targetRarity
    ));
    const baseItem = (categoryBasedItemId !== null
      ? ITEMS.find((item) => item.id === categoryBasedItemId)
      : null) ?? fallbackItem;
    if (!baseItem) return null;
    const baseItemId = baseItem.id;

    const item: Item = { ...baseItem, enhancement: 0, superRare: 0 };
    const price = getShopItemPrice(baseItemId);
    const stockItemKey = `${baseItemId}-${index}`;
    const isSoldOut = soldOutItemKeys.includes(stockItemKey);
    const canBuy = !isSoldOut && gold >= price;
    const rarity = getItemRarityById(baseItemId);
    const rarityClass = isSoldOut
      ? 'text-gray-400'
      : rarity === 'bossRare'
        ? 'text-accent'
        : rarity === 'eliteRare'
          ? 'text-sub'
          : rarity === 'uncommon'
            ? 'font-bold text-gray-900'
            : 'text-gray-900 font-normal';

    return {
      key: stockItemKey,
      stockItemKey,
      itemId: baseItemId,
      item,
      price,
      isSoldOut,
      canBuy,
      rarityClass,
    };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return (
    <div className="space-y-4">
      <div className="shop-dialogue-pane relative isolate overflow-hidden rounded p-3">
        <img
          src={`${import.meta.env.BASE_URL}background/Shop.png`}
          alt=""
          aria-hidden="true"
          className="shop-dialogue-pane__background pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover"
        />
        <div className="shop-dialogue-pane__title relative z-10 inline-block rounded px-2 py-0.5 text-sm font-semibold text-sub">{t('home.shop.title')}</div>
        <div className="relative z-10 mt-2 flex items-center justify-between gap-3">
          <div className="grid flex-1 grid-cols-[auto,1fr] items-start gap-3">
            <img
              src={`${import.meta.env.BASE_URL}background/Felis.png`}
              alt={t('home.shopkeeper.felis')}
              className="shop-dialogue-pane__portrait h-12 w-12 self-center rounded-full object-cover shadow-sm"
            />
            <div className="shop-dialogue-pane__bubble space-y-1 rounded px-2 py-1">
              <p className="shop-dialogue-pane__line text-sm">
                {intimacyDialogue}
              </p>
              <p className="shop-dialogue-pane__countdown text-xs">
                {t('home.shop.refreshCountdown', { time: countdownText.replace('後', '') })}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <button
              onClick={onRefreshShopLineup}
              disabled={gold < refreshPrice}
              className={`rounded px-3 py-1 text-xs font-semibold ${
                gold >= refreshPrice
                  ? 'bg-accent text-white hover:bg-accent/90'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'
              }`}
            >
              <span className="block">{t('home.shop.paidRefresh')}</span>
              <span className="block text-[11px]">{formatNumber(refreshPrice)}G</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {shopItems.map((entry) => (
          <div key={entry.key} className="shop-item-card rounded px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className={`flex items-center gap-2 text-sm ${entry.rarityClass}`}>
                  <span className="truncate">{t('common.unknown')} {getLocalizedItemName(entry.item)}</span>
                  <span className={`shrink-0 text-xs ${entry.isSoldOut ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatNumber(entry.price)}G
                  </span>
                </div>
                <div className={`mt-0.5 text-xs leading-tight ${entry.isSoldOut ? 'text-gray-300' : 'text-gray-400'}`}>
                  {getRarityShortLabel(entry.item.id, entry.item.name)} {renderTextWithRaceIcons(getItemStats(entry.item))}
                </div>
              </div>
              <button
                onClick={() => onBuyShopItem(entry.itemId, entry.stockItemKey)}
                disabled={!entry.canBuy}
                className={`shrink-0 min-w-[3.25rem] whitespace-nowrap rounded px-3 py-1 text-xs font-medium ${
                  entry.isSoldOut
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : entry.canBuy
                    ? 'bg-sub text-white hover:bg-sub/90'
                    : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                }`}
              >
                {entry.isSoldOut ? t('home.shop.soldOut') : t('home.shop.buy')}
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

// SpecRef: 8.4.3 | Ashen Route Vault(灰路の蔵) | Item purchase (debug purpose only)
function DebugStoreTab({
  gold,
  debugStorePurchases,
  onBuyDebugStoreItem,
}: {
  gold: number;
  debugStorePurchases: Record<string, number>;
  onBuyDebugStoreItem: (itemId: number) => void;
}) {
  const shopkeeperRace = RACES.find((race) => race.id === 'vulpinian') ?? RACES.find((race) => race.id === 'mustelid');
  if (!shopkeeperRace) {
    return <div className="text-sm text-gray-600">{t('home.debugStore.preparing')}</div>;
  }

  const DEBUG_STORE_PRICE = 1;
  const DEBUG_STORE_STOCK = 99;
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory>('jewel');
  const isJewelCategory = selectedCategory === 'jewel';
  const debugStoreItems = ITEMS
    .slice()
    .sort((a, b) => b.id - a.id)
    .map((item) => {
      const purchaseKey = `item:${item.id}`;
      const purchasedCount = debugStorePurchases[purchaseKey] ?? 0;
      const remainingStock = Math.max(0, DEBUG_STORE_STOCK - purchasedCount);
      const canBuy = remainingStock > 0 && gold >= DEBUG_STORE_PRICE;
      const displayItem: Item = { ...item, enhancement: 0, superRare: 0 };
      return {
        item,
        displayItem,
        purchaseKey,
        remainingStock,
        canBuy,
      };
    });
  const filteredDebugStoreItems = isJewelCategory
    ? []
    : debugStoreItems.filter(({ item }) => item.category === selectedCategory);
  const totalAvailableCount = filteredDebugStoreItems.reduce((sum, { remainingStock }) => sum + remainingStock, 0);

  return (
    <div className="space-y-3">
      <div className="rounded border border-gray-200 bg-white p-3">
        <div className="text-sm font-semibold text-sub">{t('home.debugStore.title')}</div>
        <div className="mt-2 grid grid-cols-[auto,1fr] items-start gap-3">
          <RaceIcon race={shopkeeperRace} className="h-10 w-10 self-center" />
          <p className="text-sm text-gray-700">
            {t('home.debugStore.description')}
          </p>
        </div>
      </div>

      <div className="text-sm text-gray-500">
        {isJewelCategory ? t('home.count.items', { count: 0 }) : t('home.count.items', { count: formatNumber(totalAvailableCount) })}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {INVENTORY_CATEGORY_GROUPS.map((group) => (
          <div key={group.id} className="flex flex-col">
            <div className="mb-0.5 text-center text-xs text-gray-400">{t(group.labelKey)}</div>
            <div className="flex">
              {group.categories.map((cat, i) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as InventoryCategory)}
                  className={`px-2 py-1 text-sm pane-button-shadow ${
                    i === 0 ? 'rounded-l' : i === group.categories.length - 1 ? 'rounded-r' : ''
                  } ${
                    selectedCategory === cat
                      ? 'bg-sub text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {t(cat === 'jewel' ? 'party.categoryShort.jewel' : `party.categoryShort.${cat}`)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isJewelCategory && (
        <div className="rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
          {t('home.debugStore.jewelPreparing')}
        </div>
      )}

      <div className="space-y-2 min-h-[364px] max-h-[26rem] overflow-y-auto">
        {!isJewelCategory && filteredDebugStoreItems.map(({ item, displayItem, purchaseKey, remainingStock, canBuy }) => (
          <div key={purchaseKey} className="rounded border border-gray-200 bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <span className="truncate">{getLocalizedItemName(item)}</span>
                  <span className="shrink-0 text-xs text-gray-500">{formatNumber(DEBUG_STORE_PRICE)}G</span>
                </div>
                <div className="mt-0.5 text-xs leading-tight text-gray-400">
                  {getRarityShortLabel(item.id, item.name)} {renderTextWithRaceIcons(getItemStats(displayItem))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] text-gray-500">{t('home.debugStore.stock', { remaining: formatNumber(remainingStock), total: formatNumber(DEBUG_STORE_STOCK) })}</span>
                <button
                  onClick={() => onBuyDebugStoreItem(item.id)}
                  disabled={!canBuy}
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    canBuy
                      ? 'bg-sub text-white hover:bg-sub/90'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {t('home.shop.buy')}
                </button>
              </div>
            </div>
          </div>
        ))}
        {!isJewelCategory && filteredDebugStoreItems.length === 0 && (
          <div className="rounded border border-gray-200 bg-white px-3 py-4 text-center text-sm text-gray-400">
            {t('home.inventory.emptyCategoryProducts')}
          </div>
        )}
      </div>
    </div>
  );
}
// SpecRef: 8.4.2 | Inventory(所持品) | Inventory(所持品)
function InventoryTab({
  inventory,
  jewels,
  jewelAutoEquipPriorityPartyId,
  parties,
  onSellStack,
  onSetVariantStatus,
  onSetJewelAutoEquipPriorityParty,
}: {
  inventory: InventoryRecord;
  jewels: Record<string, number>;
  jewelAutoEquipPriorityPartyId: number | null;
  parties: Party[];
  onSellStack: (variantKey: string) => void;
  onSetVariantStatus: (variantKey: string, status: 'notown') => void;
  onSetJewelAutoEquipPriorityParty: (partyId: number | null) => void;
}) {
  const [showSold, setShowSold] = useState(false);
  const [activeInventoryOwnerBubble, setActiveInventoryOwnerBubble] = useState<{
    key: string;
    text: string;
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [activeInventoryAbilityBubble, setActiveInventoryAbilityBubble] = useState<{
    key: string;
    text: string;
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const hasOwnedJewels = Object.values(jewels).some((count) => count > 0);
  const hasEquippedJewels = parties.some((party) =>
    party.characters.some((character) => character.equipment.some((item) => !!item?.jewel))
  );
  const hasFirstJewel = hasOwnedJewels || hasEquippedJewels;
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory>(() => (hasFirstJewel ? 'jewel' : 'armor'));
  const [inventoryRarityFilter, setInventoryRarityFilter] = useState<RarityFilter>('all');
  const [inventorySuperRareOnly, setInventorySuperRareOnly] = useState(false);
  const [sellStackConfirmation, setSellStackConfirmation] = useState<{
    variantKey: string;
    itemName: string;
    count: number;
    sellPrice: number;
  } | null>(null);
  const categoryGroups = hasFirstJewel ? INVENTORY_CATEGORY_GROUPS : CATEGORY_GROUPS;
  const isJewelCategory = selectedCategory === 'jewel';

  useEffect(() => {
    if (!hasFirstJewel && selectedCategory === 'jewel') {
      setSelectedCategory('armor');
    }
  }, [hasFirstJewel, selectedCategory]);

  // Separate owned and sold/notown items, filtered by category
  const allOwnedItems = Object.entries(inventory).filter(([, v]) => v.status === 'owned' && v.count > 0);
  const filteredOwnedItems = sortInventoryItems(
    allOwnedItems.filter(([, v]) =>
      !isJewelCategory &&
      v.item.category === selectedCategory &&
      matchesRarityFilter(v.item.id, inventoryRarityFilter) &&
      (!inventorySuperRareOnly || v.item.superRare >= 1)
    )
  );
  const equippedItems = parties.flatMap((party, partyIndex) =>
    party.characters.flatMap((character, rowIndex) =>
      character.equipment.flatMap((item, slotIndex) => {
        if (!item) return [];
        if (
          isJewelCategory ||
          item.category !== selectedCategory ||
          !matchesRarityFilter(item.id, inventoryRarityFilter) ||
          (inventorySuperRareOnly && item.superRare < 1)
        ) {
          return [];
        }

        return [{
          key: `equipped-${party.id}-${character.id}-${rowIndex}-${slotIndex}-${item.id}-${item.enhancement}-${item.superRare}`,
          item,
          partyIndex,
          rowIndex,
          slotIndex,
          characterName: character.name,
          raceId: character.raceId,
          characterImageSrc: getInventoryOwnerCharacterImageSrc(character, party.id),
        }];
      })
    )
  );

  const combinedDisplayItems = [
    ...filteredOwnedItems.map(([key, variant]) => ({
      key,
      type: 'owned' as const,
      variant,
      item: variant.item,
    })),
    ...equippedItems.map((equipped) => ({
      key: equipped.key,
      type: 'equipped' as const,
      equipped,
      item: equipped.item,
    })),
  ].sort((a, b) => {
    if (a.item.id !== b.item.id) return b.item.id - a.item.id;
    if (a.item.superRare !== b.item.superRare) return b.item.superRare - a.item.superRare;
    if (a.item.enhancement !== b.item.enhancement) return b.item.enhancement - a.item.enhancement;

    // Keep owned stacks above equipped copies of the same item variant.
    if (a.type !== b.type) return a.type === 'owned' ? -1 : 1;

    if (a.type === 'equipped' && b.type === 'equipped') {
      if (a.equipped.partyIndex !== b.equipped.partyIndex) return a.equipped.partyIndex - b.equipped.partyIndex;
      if (a.equipped.rowIndex !== b.equipped.rowIndex) return a.equipped.rowIndex - b.equipped.rowIndex;
      return a.equipped.slotIndex - b.equipped.slotIndex;
    }

    return 0;
  });

  const allSoldItems = Object.entries(inventory).filter(([, v]) => v.status === 'sold');
  const filteredSoldItems = sortInventoryItems(
    allSoldItems.filter(([, v]) =>
      !isJewelCategory &&
      v.item.category === selectedCategory &&
      matchesRarityFilter(v.item.id, inventoryRarityFilter) &&
      (!inventorySuperRareOnly || v.item.superRare >= 1)
    )
  );

  const jewelEntries = (Object.keys(JEWEL_DEFS) as JewelKey[])
    .flatMap((jewelKey) => Array.from({ length: 8 }, (_, i) => {
      const rank = i + 1;
      const count = getJewelOwnedCount(jewels, jewelKey, rank);
      return { jewelKey, rank, count };
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => {
      if (a.jewelKey !== b.jewelKey) return a.jewelKey.localeCompare(b.jewelKey);
      return a.rank - b.rank;
    });

  const equippedJewels = parties.flatMap((party, partyIndex) =>
    party.characters.flatMap((character) => {
      const characterStats = computeCharacterStats(character, party.level);

      return character.equipment.slice(0, characterStats.maxEquipSlots).flatMap((item, slotIndex) => {
        if (!item?.jewel) return [];

        return [{
          key: `equipped-jewel-${party.id}-${character.id}-${slotIndex}-${item.id}-${item.enhancement}-${item.superRare}-${item.jewel.key}-${item.jewel.rank}`,
          item,
          partyIndex,
          characterName: character.name,
          raceId: character.raceId,
          jewelKey: item.jewel.key,
          rank: item.jewel.rank,
          characterImageSrc: getInventoryOwnerCharacterImageSrc(character, party.id),
        }];
      });
    })
  );

  const combinedJewelEntries = [
    ...jewelEntries.map((entry) => ({
      key: `owned-jewel-${entry.jewelKey}-${entry.rank}`,
      type: 'owned' as const,
      ...entry,
    })),
    ...equippedJewels.map((entry) => ({
      ...entry,
      type: 'equipped' as const,
    })),
  ].sort((a, b) => {
    if (a.jewelKey !== b.jewelKey) return a.jewelKey.localeCompare(b.jewelKey);
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.type !== b.type) return a.type === 'owned' ? -1 : 1;
    if (a.type === 'equipped' && b.type === 'equipped') {
      return a.partyIndex - b.partyIndex;
    }
    return 0;
  });

  const totalJewelCount = jewelEntries.reduce((sum, entry) => sum + entry.count, 0) + equippedJewels.length;
  const jewelPriorityOptions = useMemo(
    () => [
      { value: 'manual', label: t('home.inventory.jewelAuto.manual') },
      ...parties.map((party) => ({ value: `${party.id}`, label: party.name })),
    ],
    [parties],
  );
  const selectedJewelPriorityValue = jewelAutoEquipPriorityPartyId == null ? 'manual' : `${jewelAutoEquipPriorityPartyId}`;
  const getInventoryBubblePosition = (targetElement: HTMLElement, maxWidth: number = 220) => {
    const triggerRect = targetElement.getBoundingClientRect();
    const viewportPadding = 12;
    const bubbleWidth = Math.min(maxWidth, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - bubbleWidth,
    );
    return { top: triggerRect.bottom + 8, left, width: bubbleWidth };
  };

  const handleInventoryOwnerBubbleToggle = (key: string, text: string, targetElement: HTMLElement) => {
    if (activeInventoryOwnerBubble?.key === key) {
      setActiveInventoryOwnerBubble(null);
      return;
    }
    setActiveInventoryAbilityBubble(null);
    setActiveInventoryOwnerBubble({
      key,
      text,
      ...getInventoryBubblePosition(targetElement),
    });
  };

  const handleInventoryAbilityBubbleToggle = (key: string, text: string, targetElement: HTMLElement) => {
    if (activeInventoryAbilityBubble?.key === key) {
      setActiveInventoryAbilityBubble(null);
      return;
    }
    setActiveInventoryOwnerBubble(null);
    setActiveInventoryAbilityBubble({
      key,
      text,
      ...getInventoryBubblePosition(targetElement, 320),
    });
  };

  const renderInventoryItemStats = (item: Item, bubbleKeyPrefix: string): ReactNode => {
    const statsText = getItemStats(item);
    const abilityBonuses = (item.bonuses ?? [])
      .flatMap((bonus) => {
        if (bonus.type === 'ability' && bonus.abilityId) {
          const level = bonus.abilityLevel || 1;
          const label = `${ABILITY_NAMES[bonus.abilityId] || bonus.abilityId}Lv${level}`;
          const description = getAbilityDescription(bonus.abilityId as AbilityId, level);
          return [{ label, detail: `${label}：${description}` }];
        }
        if (bonus.type === 'ability_upgrade' && bonus.abilityId) {
          const label = t('party.bonusDisplay.abilityUpgrade', { name: ABILITY_NAMES[bonus.abilityId] || bonus.abilityId, value: bonus.value });
          const description = getAbilityDescription(bonus.abilityId as AbilityId, Math.max(1, bonus.value));
          return [{ label, detail: `${label}：${description}` }];
        }
        return [];
      })
      .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.label === entry.label) === index);

    if (abilityBonuses.length === 0) return renderTextWithRaceIcons(statsText);

    const abilityByLabel = new Map(abilityBonuses.map((entry) => [entry.label, entry.detail]));
    const pattern = abilityBonuses
      .map((entry) => entry.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    if (!pattern) return renderTextWithRaceIcons(statsText);

    const parts = statsText.split(new RegExp(`(${pattern})`, 'g'));
    return parts.map((part, index) => {
      const detail = abilityByLabel.get(part);
      if (!detail) return <Fragment key={`${bubbleKeyPrefix}-stat-${index}`}>{renderTextWithRaceIcons(part)}</Fragment>;
      return (
        <button
          key={`${bubbleKeyPrefix}-ability-${index}`}
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            handleInventoryAbilityBubbleToggle(`${bubbleKeyPrefix}-${part}-${index}`, detail, event.currentTarget);
          }}
          className="inline rounded px-0.5 text-sub underline decoration-dotted underline-offset-2 focus:outline-none focus:ring-1 focus:ring-sub"
        >
          {part}
        </button>
      );
    });
  };

  // SpecRef: 8.4.2 | Inventory(所持品) | Sell all button(全売却)
  const confirmSellStack = () => {
    if (!sellStackConfirmation) return;
    onSellStack(sellStackConfirmation.variantKey);
    setSellStackConfirmation(null);
  };

  return (
    <div
      onPointerDown={() => {
        if (activeInventoryOwnerBubble) {
          setActiveInventoryOwnerBubble(null);
        }
        if (activeInventoryAbilityBubble) {
          setActiveInventoryAbilityBubble(null);
        }
      }}
    >
      <div className="flex justify-between items-center mb-2 gap-2">
        <div className="text-sm text-gray-500">
          {isJewelCategory
            ? t('home.count.items', { count: formatNumber(totalJewelCount) })
            : t('home.count.items', { count: formatNumber(filteredOwnedItems.reduce((sum, [, v]) => sum + v.count, 0)) })}
        </div>
        <div className="flex justify-end items-center gap-1">
          {!isJewelCategory && (
            <>
          <span className="text-xs text-gray-500">{getRarityFilterNote(inventoryRarityFilter)}</span>
          {RARITY_FILTER_OPTIONS.map(filter => (
            <button
              key={filter}
              onClick={() => setInventoryRarityFilter(filter)}
              className={`text-xs px-1.5 py-0.5 border rounded shadow-sm shadow-slate-900/10 ${
                inventoryRarityFilter === filter
                  ? 'bg-sub text-white border-sub'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
              title={getRarityFilterNote(filter)}
            >
              {RARITY_FILTER_LABELS[filter]}
            </button>
          ))}
          <span className="text-xs text-gray-500"> {t('party.equipment.superRare')}</span>
          <button
            onClick={() => setInventorySuperRareOnly(prev => !prev)}
            className={`text-xs px-1.5 py-0.5 border rounded shadow-sm shadow-slate-900/10 ${
              inventorySuperRareOnly
                ? 'bg-accent text-white border-accent'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {inventorySuperRareOnly ? 'ON' : 'OFF'}
          </button>
            </>
          )}
        </div>
      </div>

      {/* Category group tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {categoryGroups.map(group => (
          <div key={group.id} className="flex flex-col">
            <div className="text-xs text-gray-400 text-center mb-0.5">{t(group.labelKey)}</div>
            <div className="flex">
              {group.categories.map((cat, i) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as InventoryCategory)}
                  className={`px-2 py-1 text-sm pane-button-shadow ${
                    i === 0 ? 'rounded-l' : i === group.categories.length - 1 ? 'rounded-r' : ''
                  } ${
                    selectedCategory === cat
                      ? 'bg-sub text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {t(cat === 'jewel' ? 'party.categoryShort.jewel' : `party.categoryShort.${cat}`)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Item list */}
      {isJewelCategory && (
        <div className="mb-2 text-xs text-gray-500">
          {t('home.inventory.jewelEquipHint')}
        </div>
      )}
      {isJewelCategory && (
        // SpecRef: 7.1.3 | AUTO Jewel Equipment | 自動結晶装備
        <div className="mb-2 rounded border border-gray-200 bg-white px-2 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">{t('home.inventory.autoJewelEquip')}</span>
            <select
              value={selectedJewelPriorityValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                onSetJewelAutoEquipPriorityParty(nextValue === 'manual' ? null : Number(nextValue));
              }}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
            >
              {jewelPriorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div className="space-y-1 min-h-[364px] max-h-[26rem] overflow-y-auto mb-4">
          {isJewelCategory && combinedJewelEntries.map((entry) => {
            if (entry.type === 'owned') {
              return (
                <div key={entry.key} className="px-2 py-1.5 rounded bg-pane border border-gray-200 shadow-sm shadow-slate-900/10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm truncate">{getJewelNameByRank(entry.jewelKey, entry.rank)}</span>
                      <span className="text-xs text-gray-500 shrink-0">x{formatNumber(entry.count)}</span>
                    </div>
                  </div>
                  <div className="mt-0.5 text-xs leading-tight text-gray-400">
                    {getJewelInventoryStatusText(entry.jewelKey, entry.rank)}
                  </div>
                </div>
              );
            }

            return (
              <div key={entry.key} className="px-2 py-1.5 rounded bg-pane border border-gray-200 shadow-sm shadow-slate-900/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {entry.characterImageSrc && (
                      <button
                        type="button"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          handleInventoryOwnerBubbleToggle(
                            `equipped-jewel-${entry.key}`,
                            `PT${entry.partyIndex + 1}:${entry.characterName}`,
                            event.currentTarget,
                          );
                        }}
                        className="relative shrink-0 h-10 w-10 overflow-visible rounded focus:outline-none"
                      >
                        <img src={entry.characterImageSrc} alt="" className="pointer-events-none absolute bottom-[-4px] left-1/2 h-14 w-14 max-w-none -translate-x-1/2 rounded object-contain object-bottom" />
                      </button>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm truncate">{getJewelNameByRank(entry.jewelKey, entry.rank)} ({t('home.inventory.equippedTo', { item: getItemDisplayName(entry.item) })})</span>
                        <span className="text-xs text-gray-500 shrink-0">x1</span>
                      </div>
                      <div className="mt-0.5 text-xs leading-tight text-gray-400 truncate">
                        {getJewelSlotStatusText(entry.jewelKey, entry.rank)}
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            );
          })}
          {!isJewelCategory && combinedDisplayItems.map((entry) => {
            if (entry.type === 'owned') {
              const { item, count } = entry.variant;
              const sellPrice = calculateItemSellPrice(item) * count;

              return (
                <div
                  key={entry.key}
                  className="px-2 py-1.5 rounded bg-pane border border-gray-200 shadow-sm shadow-slate-900/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${getItemNameFontWeightClass(item)}`}>
                        {getItemDisplayName(item)}
                      </span>
                      <span className="text-xs text-gray-500">x{formatNumber(count)}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (item.superRare >= 1) {
                          window.alert(t('home.inventory.superRareCannotSell'));
                          return;
                        }
                        setSellStackConfirmation({
                          variantKey: entry.key,
                          itemName: getItemDisplayName(item),
                          count,
                          sellPrice,
                        });
                      }}
                      className="text-xs text-accent px-2 py-1 border border-accent rounded flex-shrink-0"
                    >
                      {t('home.inventory.sellAllGold', { gold: formatNumber(sellPrice) })}
                    </button>
                  </div>
                  <div className="mt-0.5 text-xs leading-tight text-gray-400">
                    {getRarityShortLabel(item.id, item.name)} {renderInventoryItemStats(item, entry.key)}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={entry.key}
                className="px-2 py-1.5 rounded bg-pane border border-gray-200 shadow-sm shadow-slate-900/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {entry.equipped.characterImageSrc && (
                      <button
                        type="button"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          handleInventoryOwnerBubbleToggle(
                            `equipped-item-${entry.key}`,
                            `PT${entry.equipped.partyIndex + 1}:${entry.equipped.characterName}`,
                            event.currentTarget,
                          );
                        }}
                        className="relative shrink-0 h-10 w-10 overflow-visible rounded focus:outline-none"
                      >
                        <img src={entry.equipped.characterImageSrc} alt="" className="pointer-events-none absolute bottom-[-4px] left-1/2 h-16 w-16 max-w-none -translate-x-1/2 rounded object-contain object-bottom" />
                      </button>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm truncate ${getItemNameFontWeightClass(entry.equipped.item)}`}>{getItemDisplayName(entry.equipped.item)}</span>
                        <span className="text-xs text-gray-500 shrink-0">x1</span>
                      </div>
                      <div className="mt-0.5 text-xs leading-tight text-gray-400 truncate">
                        {getRarityShortLabel(entry.equipped.item.id, entry.equipped.item.name)} {renderInventoryItemStats(entry.equipped.item, entry.key)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {isJewelCategory && combinedJewelEntries.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-4">{t('home.inventory.noJewels')}</div>
          )}
          {!isJewelCategory && combinedDisplayItems.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-4">{t('home.inventory.emptyCategoryItems')}</div>
          )}
      </div>

      {/* Sold items management */}
      {!isJewelCategory && allSoldItems.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <button
            onClick={() => setShowSold(!showSold)}
            className="text-xs text-gray-500 flex items-center gap-1"
          >
            <span className={`transform transition-transform ${showSold ? 'rotate-180' : ''}`}>▼</span>
            {t('home.inventory.autoSellSettings', { count: filteredSoldItems.length })}
          </button>
          {showSold && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {filteredSoldItems.map(([key, variant]) => (
                <div key={key} className="px-2 py-1.5 rounded bg-gray-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-500">{getItemDisplayName(variant.item)}</span>
                    <button
                      onClick={() => onSetVariantStatus(key, 'notown')}
                      className="text-xs text-sub px-2 py-1 border border-sub rounded"
                    >
                      {t('party.equipment.clearSelection')}
                    </button>
                  </div>
                  <div className="mt-0.5 text-xs leading-tight text-gray-400">
                    {getRarityShortLabel(variant.item.id, variant.item.name)} {renderInventoryItemStats(variant.item, key)}
                  </div>
                </div>
              ))}
              {filteredSoldItems.length === 0 && (
                <div className="text-gray-400 text-xs text-center py-2">{t('home.inventory.noAutoSellInCategory')}</div>
              )}
            </div>
          )}
        </div>
      )}
      {sellStackConfirmation && (
        <FloatingBubblePortal>
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-5 py-8"
            role="presentation"
            onPointerDown={() => setSellStackConfirmation(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sell-stack-confirm-title"
              className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-5 text-gray-900 shadow-2xl"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div id="sell-stack-confirm-title" className="text-base font-medium leading-relaxed">
                {t('home.inventory.sellConfirmTitle', { item: sellStackConfirmation.itemName, count: formatNumber(sellStackConfirmation.count) })}
              </div>
              <div className="mt-2 text-sm leading-relaxed text-gray-600">
                {t('home.inventory.sellConfirmBody', { gold: formatNumber(sellStackConfirmation.sellPrice) })}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSellStackConfirmation(null)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-sub hover:bg-blue-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmSellStack}
                  className="rounded-full bg-sub px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </FloatingBubblePortal>
      )}
      {activeInventoryAbilityBubble && (
        <FloatingBubblePortal>
          <div
            className="floating-bubble-pane fixed z-50 rounded-lg px-2 py-1 text-xs text-gray-700"
            style={{
              top: `${activeInventoryAbilityBubble.top}px`,
              left: `${activeInventoryAbilityBubble.left}px`,
              width: `${activeInventoryAbilityBubble.width}px`,
            }}
          >
            {activeInventoryAbilityBubble.text}
          </div>
        </FloatingBubblePortal>
      )}
      {activeInventoryOwnerBubble && (
        <FloatingBubblePortal>
          <div
            className="floating-bubble-pane fixed z-50 rounded-lg px-2 py-1 text-xs text-gray-700"
            style={{
              top: `${activeInventoryOwnerBubble.top}px`,
              left: `${activeInventoryOwnerBubble.left}px`,
              width: `${activeInventoryOwnerBubble.width}px`,
            }}
          >
            {activeInventoryOwnerBubble.text}
          </div>
        </FloatingBubblePortal>
      )}
    </div>
  );
}

// SpecRef: 8.5 | UI_DIARY | Diary
// SpecRef: 8.5 | UI_DIARY | Setting.
function DiaryTab({
  parties,
  onOpenDiaryLog,
  onUpdateDiarySettings,
  expandedLogs,
  onSetExpandedLogs,
  expandedRooms,
  onSetExpandedRooms,
  isSettingsExpanded,
  onSetIsSettingsExpanded,
  isDarkModeEnabled,
}: {
  parties: Party[];
  onOpenDiaryLog: (logId: string) => void;
  onUpdateDiarySettings: (partyIndex: number, settings: Partial<DiarySettings>) => void;
  expandedLogs: Record<string, boolean>;
  onSetExpandedLogs: Dispatch<SetStateAction<Record<string, boolean>>>;
  expandedRooms: Record<string, boolean>;
  onSetExpandedRooms: Dispatch<SetStateAction<Record<string, boolean>>>;
  isSettingsExpanded: boolean;
  onSetIsSettingsExpanded: Dispatch<SetStateAction<boolean>>;
  isDarkModeEnabled: boolean;
}) {
  const [activeEnemyBestiaryBubble, setActiveEnemyBestiaryBubble] = useState<{
    key: string;
    enemy: EnemyDef;
    enemyLevel: number | null;
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [activeRewardItemBubble, setActiveRewardItemBubble] = useState<RewardItemBubble | null>(null);

  const handleRewardItemBubbleToggle = (bubbleKey: string, item: Item, targetElement: HTMLElement) => {
    if (activeRewardItemBubble?.key === bubbleKey) {
      setActiveRewardItemBubble(null);
      return;
    }

    // SpecRef: 8.5 | UI_DIARY | Diary log
    setActiveRewardItemBubble({
      key: bubbleKey,
      text: getItemInventoryDetailText(item),
      ...getRewardItemBubblePosition(targetElement),
    });
  };

  const handleEnemyBestiaryBubbleToggle = (
    bubbleKey: string,
    entry: ExpeditionLogEntry,
    enemyLevel: number | null,
    targetElement: HTMLElement,
  ) => {
    const enemy = getBestiaryEnemyFromLogEntry(entry);
    if (!enemy) return;

    if (activeEnemyBestiaryBubble?.key === bubbleKey) {
      setActiveEnemyBestiaryBubble(null);
      return;
    }

    const triggerRect = targetElement.getBoundingClientRect();
    const viewportPadding = 12;
    const bubbleWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - bubbleWidth,
    );

    // SpecRef: 8.5 | UI_DIARY | Diary log
    // Tap enemy’s name part to show floating bubble of its bestiary.
    setActiveEnemyBestiaryBubble({
      key: bubbleKey,
      enemy,
      enemyLevel,
      top: triggerRect.bottom + 8,
      left,
      width: bubbleWidth,
    });
  };

  const diaryLogs = parties
    .flatMap((party) =>
      (party.diaryLogs ?? []).map((diaryLog) => ({
        partyName: party.name,
        ...diaryLog,
      }))
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, DIARY_LOG_RETENTION_LIMIT);

  const getDiaryTitle = (triggers: DiaryLog['triggers']) => {
    if (triggers.includes('defeat') && triggers.length === 1) return t('diary.title.defeat');
    if (triggers.includes('draw') && triggers.length === 1) return t('diary.title.draw');
    if (triggers.includes('unlock')) return t('diary.title.unlock');
    if (triggers.includes('sideQuest')) return t('diary.title.sideQuest');
    if (triggers.includes('godsBattle')) return t('diary.title.godsBattle');
    if (triggers.includes('superRare')) return t('diary.title.superRare');
    if (triggers.includes('mythicRare')) return t('diary.title.mythicRare');
    if (triggers.includes('bossRare')) return t('diary.title.bossRare');
    if (triggers.includes('eliteRare')) return t('diary.title.eliteRare');
    return t('diary.title.special');
  };


  const getGodsBattleOutcomeLabel = (expeditionLog: ExpeditionLog) => {
    const hasGodsBattleEntry = expeditionLog.entries.some((entry) => entry.enemyName.includes('(神魔戦)'));
    if (!hasGodsBattleEntry) return t('diary.outcome.notReached');
    if (expeditionLog.finalOutcome === 'Clear') return t('diary.outcome.victory');
    if (expeditionLog.finalOutcome === 'Defeat') return t('diary.outcome.defeat');
    return t('diary.outcome.draw');
  };


  const getGodsBattleDiaryDisplayName = (rawName: string): string => {
    const withoutBattleSuffix = rawName.replace(/\s*\(神魔戦\)\s*$/u, '').trim();
    const withoutLegacySuffix = withoutBattleSuffix.replace(/\([^()]*神[^()]*\)$/u, '').trim();
    const matchedGodProfile = GOD_ENEMY_PROFILES.find((profile) => {
      const profileHead = profile.displayName.split(' ')[0]?.trim() ?? '';
      return profile.displayName === withoutBattleSuffix
        || profileHead === withoutBattleSuffix
        || profileHead === withoutLegacySuffix;
    });
    if (matchedGodProfile) return matchedGodProfile.displayName;
    return withoutLegacySuffix || withoutBattleSuffix;
  };

  const getDiaryHeadline = (
    partyName: string,
    triggers: DiaryLog['triggers'],
    rewards: Item[],
    expeditionLog: ExpeditionLog,
    sideQuestLabel?: string,
    unlockHeadline?: string
  ) => {
    // SpecRef: 8.5 | UI_DIARY | 神魔戦通知
    if (triggers.includes('godsBattle')) {
      const godsBattleEnemyName = expeditionLog.entries
        .find((entry) => entry.enemyName.includes('(神魔戦)'))
        ?.enemyName.replace(/\s*\(神魔戦\)\s*$/u, '')
        .trim();
      const normalizedGodsBattleEnemyName = godsBattleEnemyName
        ? getGodsBattleDiaryDisplayName(godsBattleEnemyName)
        : null;
      const godsBattleOutcome = getGodsBattleOutcomeLabel(expeditionLog);
      if (normalizedGodsBattleEnemyName) {
        return `[${partyName}] ${normalizedGodsBattleEnemyName} ${godsBattleOutcome}`;
      }
      return t('diary.headline.godsBattleGeneric', { party: partyName, outcome: godsBattleOutcome });
    }


    if (triggers.includes('unlock')) {
      return unlockHeadline
        ? t('diary.headline.unlockNamed', { party: partyName, headline: unlockHeadline })
        : t('diary.headline.unlock', { party: partyName });
    }

    if (triggers.includes('sideQuest')) {
      return sideQuestLabel
        ? t('diary.headline.sideQuestNamed', { party: partyName, quest: sideQuestLabel })
        : t('diary.headline.sideQuest', { party: partyName });
    }

    if (triggers.includes('defeat') && triggers.length === 1) {
      return t('diary.headline.defeat', { party: partyName });
    }

    if (triggers.includes('draw') && triggers.length === 1) {
      return t('diary.headline.draw', { party: partyName });
    }

    if (triggers.includes('superRare') || triggers.includes('mythicRare') || triggers.includes('bossRare')) {
      const rewardNames = rewards
        .filter((item) => {
          if (triggers.includes('superRare')) return item.superRare > 0;
          if (triggers.includes('mythicRare')) return getItemRarityById(item.id) === 'mythicRare';
          return getItemRarityById(item.id) === 'bossRare';
        })
        .map((item) => getItemDisplayName(item))
        .join('、');
      const triggerPrefix = triggers.includes('superRare')
        ? t('diary.reward.superRare')
        : triggers.includes('mythicRare')
          ? t('diary.reward.mythicRare')
          : t('diary.reward.bossRare');
      return rewardNames
        ? t('diary.headline.rewardNamed', { party: partyName, rewardType: triggerPrefix, rewards: rewardNames })
        : t('diary.headline.reward', { party: partyName, rewardType: triggerPrefix });
    }

    if (triggers.includes('eliteRare')) {
      const rewardNames = rewards
        .filter((item) => getItemRarityById(item.id) === 'eliteRare')
        .map((item) => getItemDisplayName(item))
        .join('、');
      return rewardNames ? t('diary.headline.rewardNamed', { party: partyName, rewardType: t('diary.reward.eliteRare'), rewards: rewardNames }) : t('diary.headline.reward', { party: partyName, rewardType: t('diary.reward.eliteRare') });
    }

    const fallbackBossNames = rewards
      .filter((item) => getItemRarityById(item.id) === 'bossRare')
      .map((item) => getItemDisplayName(item))
      .join('、');
    if (fallbackBossNames) {
      return t('diary.headline.rewardNamed', { party: partyName, rewardType: t('diary.reward.bossRare'), rewards: fallbackBossNames });
    }

    return t('diary.headline.title', { party: partyName, title: getDiaryTitle(triggers) });
  };

  const formatDiaryTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  const renderDiarySettings = () => (
    <div className="bg-pane rounded-lg p-3 shadow-md shadow-slate-900/10">
      <button
        onClick={() => onSetIsSettingsExpanded((prev) => !prev)}
        className="w-full text-left"
      >
        <span className="flex items-center justify-between text-sm font-medium">
          <span>{t('diary.settings.title')}</span>
          <span className={`transform transition-transform ${isSettingsExpanded ? 'rotate-180' : ''}`}>▼</span>
        </span>
      </button>

      {isSettingsExpanded && (
        <div className="mt-3 space-y-3">
          {parties.map((party, partyIndex) => {
            const settings = party.diarySettings;
            return (
              <div key={party.id} className="rounded border border-gray-200 p-2.5">
                <div className="mb-2 text-xs text-gray-500">{party.name}</div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.superRareNotification')}</span>
                    <select
                      value={settings.superRareThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { superRareThreshold: parseDiaryThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`sr-${option.value}`} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.eliteRareNotification')}</span>
                    <select
                      value={settings.rareThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { rareThreshold: parseDiaryThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`ra-${option.value}`} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.bossRareNotification')}</span>
                    <select
                      value={settings.bossThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { bossThreshold: parseDiaryThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`bo-${option.value}`} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.godsBattleNotification')}</span>
                    <select
                      value={settings.notifyGodsBattle ? 'yes' : 'no'}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { notifyGodsBattle: event.target.value === 'yes' })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      <option value="yes">{t('common.yes')}</option>
                      <option value="no">{t('common.no')}</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.mythicRareNotification')}</span>
                    <select
                      value={settings.mythicThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { mythicThreshold: parseDiaryThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`my-${option.value}`} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.defeatNotification')}</span>
                    <select
                      value={settings.defeatNotificationMode}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { defeatNotificationMode: event.target.value as DiaryDefeatNotificationMode })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_DEFEAT_NOTIFICATION_OPTIONS.map((option) => (
                        <option key={`df-${option.value}`} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </label>
                  {/* SpecRef: 8.5 | UI_DIARY | Setting. */}
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.sideQuestNotification')}</span>
                    <select
                      value={settings.sideQuestThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { sideQuestThreshold: parseDiarySideQuestThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_SIDE_QUEST_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`sq-${option.value}`} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (diaryLogs.length === 0) {
    return (
      <div
        className="space-y-3 diary-tab-surface"
        onPointerDown={() => {
          if (activeEnemyBestiaryBubble) {
            setActiveEnemyBestiaryBubble(null);
          }
          if (activeRewardItemBubble) {
            setActiveRewardItemBubble(null);
          }
        }}
      >
        {activeEnemyBestiaryBubble && <EnemyBestiaryBubble bubble={activeEnemyBestiaryBubble} />}
        {activeRewardItemBubble && (
          <FloatingBubblePortal>
            <div
              className="floating-bubble-pane fixed z-20 rounded-lg p-2 text-xs text-gray-700"
              style={{ top: activeRewardItemBubble.top, left: activeRewardItemBubble.left, width: 'max-content', maxWidth: activeRewardItemBubble.maxWidth }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {renderTextWithRaceIcons(activeRewardItemBubble.text)}
            </div>
          </FloatingBubblePortal>
        )}
        {renderDiarySettings()}
        <div className="bg-pane rounded-lg p-4 text-sm text-gray-500 text-center shadow-md shadow-slate-900/10">{t('diary.empty')}</div>
      </div>
    );
  }

  return (
    <div
      className="space-y-3 diary-tab-surface"
      onPointerDown={() => {
        if (activeEnemyBestiaryBubble) {
          setActiveEnemyBestiaryBubble(null);
        }
        if (activeRewardItemBubble) {
          setActiveRewardItemBubble(null);
        }
      }}
    >
      {activeEnemyBestiaryBubble && <EnemyBestiaryBubble bubble={activeEnemyBestiaryBubble} />}
      {activeRewardItemBubble && (
        <FloatingBubblePortal>
          <div
            className="floating-bubble-pane fixed z-20 rounded-lg p-2 text-xs text-gray-700"
            style={{ top: activeRewardItemBubble.top, left: activeRewardItemBubble.left, width: 'max-content', maxWidth: activeRewardItemBubble.maxWidth }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {renderTextWithRaceIcons(activeRewardItemBubble.text)}
          </div>
        </FloatingBubblePortal>
      )}
      {renderDiarySettings()}
      {diaryLogs.map((diaryLog) => {
        const isSideQuestLog = diaryLog.triggers.includes('sideQuest');
        const isExpanded = isSideQuestLog ? false : !!expandedLogs[diaryLog.id];
        const log = diaryLog.expeditionLog;
        const diaryParty = parties.find((candidate) => candidate.name === diaryLog.partyName) ?? parties[0];
        const specialRewards = log.rewards.filter((item) => {
          const rarity = getItemRarityById(item.id);
          return rarity === 'bossRare' || rarity === 'mythicRare' || item.superRare > 0;
        });
        return (
          <div key={diaryLog.id} className="bg-pane rounded-lg p-3 shadow-md shadow-slate-900/10">
            <button
              onClick={() => {
                if (isSideQuestLog) {
                  if (!diaryLog.isRead) onOpenDiaryLog(diaryLog.id);
                  return;
                }
                const nextExpanded = !isExpanded;
                onSetExpandedLogs((prev) => ({ ...prev, [diaryLog.id]: nextExpanded }));
                if (nextExpanded && !diaryLog.isRead) {
                  onOpenDiaryLog(diaryLog.id);
                }
              }}
              className="w-full text-left text-sm"
            >
              <span className="flex items-start justify-between gap-2">
                <span className={`pr-2 ${diaryLog.isRead ? 'font-normal text-gray-500' : 'font-medium text-gray-900'}`}>
                  {getDiaryHeadline(diaryLog.partyName, diaryLog.triggers, log.rewards, log, diaryLog.sideQuestLabel, diaryLog.unlockHeadline)}
                </span>
                {!isSideQuestLog && <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>}
              </span>

              <span className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-400">
                <span className="truncate">{diaryLog.unlockDetail ?? diaryLog.sideQuestDetail ?? log.dungeonName}</span>
                <span className="whitespace-nowrap text-right">{formatDiaryTimestamp(diaryLog.createdAt)}</span>
              </span>
            </button>

            {specialRewards.length > 0 && diaryLog.triggers.includes('defeat') && (
              <div className="mt-1 text-xs text-gray-500">
                {t('diary.specialRewards')}: {specialRewards.map((item, i) => {
                  const rarity = getItemRarityById(item.id);
                  const isSuperRare = item.superRare > 0;
                  const rarityClass = getRarityTextClass(rarity, isSuperRare);
                  const fontWeightClass = getRewardFontWeightClass(rarity, isSuperRare);
                  return (
                    <span key={`${item.id}-${item.enhancement}-${item.superRare}-${i}`} className={`${rarityClass} ${fontWeightClass}`}>
                      {i > 0 && ', '}
                      {getItemDisplayName(item)}
                    </span>
                  );
                })}
              </div>
            )}

            {isExpanded && (
              <div className="mt-3 space-y-2">
                <div className="text-sm text-gray-500">
                  EXP: +{formatNumber(log.totalExperience)}
                  {log.autoSellProfit > 0 && (
                    <span> | {formatAutoSellSummary(log.autoSellProfit, log.autoSellMultiplier)}</span>
                  )}
                </div>

                {log.rewards.length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-500">{t('home.battle.acquiredItemsLabel')} </span>
                    {log.rewards.map((item, i) => {
                      const rarity = getItemRarityById(item.id);
                      const isSuperRare = item.superRare > 0;
                      const rarityClass = getRarityTextClass(rarity, isSuperRare);
                      const fontWeightClass = getRewardFontWeightClass(rarity, isSuperRare);
                      return (
                        <Fragment key={i}>
                          {i > 0 && ', '}
                          <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => handleRewardItemBubbleToggle(`diary-reward-${diaryLog.id}-${i}-${item.id}-${item.enhancement}-${item.superRare}`, item, event.currentTarget)}
                            className={`${rarityClass} ${fontWeightClass} align-baseline hover:underline`}
                          >
                            {getItemDisplayName(item)}
                          </button>
                        </Fragment>
                      );
                    })}
                  </div>
                )}

                <div className="border-t border-gray-200 pt-2 space-y-2">
                  {[...log.entries].reverse().map((entry, i, arr) => {
                    const originalIndex = arr.length - 1 - i;
                    let roomLabel: string;
                    if (entry.floor && entry.roomInFloor) {
                      roomLabel = `${entry.floor}F-${entry.roomInFloor}`;
                    } else {
                      const isBoss = entry.room === log.totalRooms + 1;
                      roomLabel = isBoss ? 'BOSS' : entry.room.toString();
                    }
                    const healAmount = Math.max(0, entry.healAmount ?? 0);
                    const attritionAmount = Math.max(0, entry.attritionAmount ?? 0);
                    const postBattleHP = typeof entry.postBattlePartyHP === 'number'
                      ? Math.min(entry.maxPartyHP, Math.max(0, entry.postBattlePartyHP))
                      : Math.min(entry.maxPartyHP, Math.max(0, entry.remainingPartyHP + attritionAmount - healAmount));
                    const startPartyHP = typeof entry.startPartyHP === 'number'
                      ? Math.min(entry.maxPartyHP, Math.max(0, entry.startPartyHP))
                      : Math.min(entry.maxPartyHP, Math.max(0, postBattleHP + entry.damageTaken));
                    const netLossAmount = Math.max(0, startPartyHP - entry.remainingPartyHP);
                    const currentHpWithoutHeal = Math.max(0, entry.remainingPartyHP - healAmount);
                    const remainingRatio = entry.maxPartyHP > 0 ? (currentHpWithoutHeal / entry.maxPartyHP) * 100 : 0;
                    const healRatio = entry.maxPartyHP > 0 ? (healAmount / entry.maxPartyHP) * 100 : 0;
                    const takenRatio = entry.maxPartyHP > 0 ? (netLossAmount / entry.maxPartyHP) * 100 : 0;
                    const enemyTakenAmount = Math.min(entry.enemyHP, Math.max(0, entry.damageDealt));
                    const enemyRemainingAmount = Math.max(0, entry.enemyHP - enemyTakenAmount);
                    const enemyRemainingRatio = entry.enemyHP > 0 ? (enemyRemainingAmount / entry.enemyHP) * 100 : 0;
                    const roomKey = `${diaryLog.id}-${originalIndex}`;
                    const isRoomExpanded = !!expandedRooms[roomKey];

                    return (
                      <div key={roomKey} className="bg-white rounded overflow-hidden shadow-[0_6px_16px_rgba(15,23,42,0.14)]">
                        <button
                          onClick={() => onSetExpandedRooms((prev) => ({ ...prev, [roomKey]: !isRoomExpanded }))}
                          className="relative isolate w-full overflow-hidden rounded text-left p-2 text-xs"
                        >
                          {renderEnemyLogChibiBackground(entry)}
                          <div className="relative z-10 flex justify-between items-center">
                            <span>
                              <span className="font-medium">
                                {roomLabel}:{' '}
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const diaryDungeonExpLevel = DUNGEONS.find((dungeon) => dungeon.id === log.dungeonId)?.expLevel;
                                    const enemyLevel = typeof diaryDungeonExpLevel === 'number' && entry.floor && entry.roomType
                                      ? getEffectiveEnemyLevel(
                                          diaryDungeonExpLevel,
                                          entry.floor,
                                          entry.roomType,
                                          false,
                                          log.difficultyOffset ?? 0,
                                        )
                                      : null;
                                    handleEnemyBestiaryBubbleToggle(roomKey, entry, enemyLevel, event.currentTarget);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key !== 'Enter' && event.key !== ' ') return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const diaryDungeonExpLevel = DUNGEONS.find((dungeon) => dungeon.id === log.dungeonId)?.expLevel;
                                    const enemyLevel = typeof diaryDungeonExpLevel === 'number' && entry.floor && entry.roomType
                                      ? getEffectiveEnemyLevel(
                                          diaryDungeonExpLevel,
                                          entry.floor,
                                          entry.roomType,
                                          false,
                                          log.difficultyOffset ?? 0,
                                        )
                                      : null;
                                    handleEnemyBestiaryBubbleToggle(roomKey, entry, enemyLevel, event.currentTarget);
                                  }}
                                  className="inline cursor-pointer rounded px-0.5 -mx-0.5 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
                                >
                                  {renderEnemyNameWithMutedClass(entry.enemyName)}
                                </span>
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span className={
                                entry.gateInfo ? 'text-gray-500 font-medium' :
                                entry.outcome === 'victory' ? 'text-sub font-medium' :
                                entry.outcome === 'defeat' ? 'text-accent font-medium' : 'text-accent font-medium'
                              }>
                                {entry.gateInfo ? t('diary.outcome.notReached') :
                                 entry.outcome === 'victory' ? t('diary.outcome.victory') :
                                 entry.outcome === 'defeat' ? t('diary.outcome.defeat') : t('diary.outcome.draw')}
                              </span>
                              <span className={`transform transition-transform ${isRoomExpanded ? 'rotate-180' : ''}`}>▼</span>
                            </span>
                          </div>
                          {(entry.gateInfo || entry.reward) && (
                            <div className="relative z-10 text-gray-500 mt-1 flex flex-wrap items-center gap-1">
                              {entry.gateInfo && <span className="text-accent">{entry.gateInfo}</span>}
                              {renderEntryReward(entry)}
                            </div>
                          )}
                          {!entry.gateInfo && (
                            <div className="relative z-10 mt-1 grid grid-cols-2 gap-2 text-gray-600">
                              <div>
                                <div className="mb-0.5">{t('home.battle.partyHpLabel')} {formatNumber(entry.remainingPartyHP)} / {formatNumber(entry.maxPartyHP)}</div>
                                <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgb(var(--color-hp-bar-empty) / var(--color-hp-bar-empty-alpha, 1))" }}>
                                  <div className="h-full" style={{ width: `${Math.min(100, remainingRatio)}%`, backgroundColor: 'rgb(var(--color-hp-bar-mild))' }} />
                                  <div className="h-full" style={{ width: `${Math.min(100, healRatio)}%`, backgroundColor: 'rgb(var(--color-heal-bar))' }} />
                                  <div className="h-full" style={{ width: `${Math.min(100, takenRatio)}%`, backgroundColor: 'rgb(var(--color-hp-taken))' }} />
                                </div>
                              </div>
                              <div>
                                <div className="mb-0.5">{t('home.battle.enemyHpLabel')} {formatNumber(enemyRemainingAmount)} / {formatNumber(entry.enemyHP)}</div>
                                <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgb(var(--color-hp-bar-empty) / var(--color-hp-bar-empty-alpha, 1))" }}>
                                  <div className="h-full" style={{ width: `${Math.min(100, enemyRemainingRatio)}%`, backgroundColor: 'rgb(var(--color-hp-bar-mild))' }} />
                                </div>
                              </div>
                            </div>
                          )}
                        </button>
                        {isRoomExpanded && entry.details && (
                          <div className={`relative isolate overflow-hidden border-t border-gray-100 p-2 text-xs space-y-1 shadow-[0_8px_20px_rgba(15,23,42,0.14)] ${getEnemyLogBackgroundImagePath(entry.enemySnapshot) ? 'bg-gray-50 dark:bg-transparent' : 'bg-gray-50'}`}>
                            {getEnemyLogBackgroundImagePath(entry.enemySnapshot) && (
                              <>
                                <img
                                  src={getEnemyLogBackgroundImagePath(entry.enemySnapshot) ?? ''}
                                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                  alt=""
                                  aria-hidden="true"
                                  className="pointer-events-none select-none absolute left-1/2 top-0 h-auto -translate-x-1/2 object-contain object-top opacity-20 dark:opacity-25"
                                  style={{
                                    width: 'clamp(120%, calc(270% - 0.3 * 100vw), 150%)',
                                    maxWidth: 'none',
                                  }}
                                />
                                {!isDarkModeEnabled && <div className="pointer-events-none absolute inset-0 bg-white/35" aria-hidden="true" />}
                              </>
                            )}
                            <div className="relative z-10">
                            <div className="font-medium text-gray-600 mb-1">{`${typeof entry.floor === 'number' ? (getLocalizedExpeditionFloorConcept(log.dungeonId, entry.floor) ?? t('expedition.floor', { floor: formatNumber(entry.floor) })) : '-'} ${t('battleLog.title')}`}</div>
                            {aggregateBattleLifeDrainLogs(entry.details).map((battleLog, j, battleLogs) => {
                              const isResurrectLog = battleLog.note?.startsWith('(再起') || battleLog.note?.startsWith('(即時蘇生)');
                              const isTriggeredLog = battleLog.actor === 'triggered';
                              const isPhaseAction = battleLog.actor !== 'deity' && battleLog.actor !== 'effect';
                              const previousLog = j > 0 ? battleLogs[j - 1] : undefined;
                              const isStealthEffectLog = battleLog.actor === 'effect' && (battleLog.action.includes('物陰に隠れて攻撃をやり過ごせたのだ！') || battleLog.action.includes('への攻撃はすべて幻だった！'));
                              const isCounterNegationEffectLog = battleLog.actor === 'effect' && battleLog.action.includes('反撃無効化により');
                              const previousWasStealthEffectLog = !!previousLog && previousLog.actor === 'effect' && (previousLog.action.includes('物陰に隠れて攻撃をやり過ごせたのだ！') || previousLog.action.includes('への攻撃はすべて幻だった！'));
                              const previousWasCounterNegationEffectLog = !!previousLog && previousLog.actor === 'effect' && previousLog.action.includes('反撃無効化により');
                              const previousWasInPhaseEffectLog = !!previousLog && previousLog.actor === 'effect' && (previousLog.phase === 'long' || previousLog.phase === 'mid' || previousLog.phase === 'close');
                              const previousWasPhaseAction = !!previousLog && (previousLog.actor !== 'deity' && previousLog.actor !== 'effect');
                              const previousContinuesCurrentPhase = !!previousLog && (previousWasPhaseAction || previousWasStealthEffectLog || previousWasCounterNegationEffectLog || previousWasInPhaseEffectLog);
                              const shouldShowPhaseHeader = isPhaseAction && (!previousLog || !previousContinuesCurrentPhase || previousLog.phase !== battleLog.phase);
                              const shouldShowEndPhaseSpacer = !!previousLog && !isPhaseAction && previousWasPhaseAction;
                              const phaseLabel = getBattleLogPhaseLabel(battleLog, isPhaseAction, isTriggeredLog, !!isResurrectLog, !!isStealthEffectLog, !!isCounterNegationEffectLog);
                              const phaseHeader = battleLog.phase === 'long'
                                ? t('battleLog.phase.long')
                                : battleLog.phase === 'mid'
                                  ? t('battleLog.phase.mid')
                                  : battleLog.phase === 'close'
                                    ? t('battleLog.phase.close')
                                    : '';
                              const getPhaseIcon = (): UiIconKey => {
                                if (battleLog.elementalOffense === 'fire') return 'fire';
                                if (battleLog.elementalOffense === 'thunder') return 'thunder';
                                if (battleLog.elementalOffense === 'ice') return 'ice';
                                if (battleLog.phase === 'long') return 'ranged';
                                if (battleLog.phase === 'mid') return 'magic';
                                return 'melee';
                              };
                              const iconKey = getPhaseIcon();
                              const isEnemy = battleLog.actor === 'enemy';
                              const hits = battleLog.hits ?? 0;
                              const totalAttempts = battleLog.totalAttempts ?? 0;
                              const allMissed = totalAttempts > 0 && hits === 0 && !battleLog.wasNegated;
                              const hitDisplay = totalAttempts > 0 ? `(${t('battleLog.hits', { hits, total: totalAttempts })})` : '';
                              const trailingEffectMatch = /\(([^()]+)\)$/.exec(battleLog.action);
                              const trailingEffects = (trailingEffectMatch?.[1] ?? '')
                                .split(',')
                                .map(effect => effect.trim())
                                .filter(effect => /^(共鳴\+\d+%|残響\+\d+%)$/.test(effect));
                              const rageDisplay = battleLog.rageBonusPercent && battleLog.rageBonusPercent > 0
                                ? t('battleLog.extra.rage', { percent: battleLog.rageBonusPercent })
                                : '';
                              const momentumDisplay = typeof battleLog.momentumBonusPercent === 'number'
                                ? t('battleLog.extra.momentum', { sign: battleLog.momentumBonusPercent >= 0 ? '+' : '', percent: battleLog.momentumBonusPercent })
                                : '';
                              const ambushDisplay = typeof battleLog.ambushMultiplier === 'number' && battleLog.ambushMultiplier > 1
                                ? t('battleLog.extra.ambush', { multiplier: battleLog.ambushMultiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') })
                                : '';
                              const overwatchDisplay = typeof battleLog.overwatchMultiplier === 'number' && battleLog.overwatchMultiplier > 1
                                ? t('battleLog.extra.overwatch', { multiplier: battleLog.overwatchMultiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') })
                                : '';
                              const executionDisplay = typeof battleLog.executionMultiplier === 'number' && battleLog.executionMultiplier > 1
                                ? t('battleLog.extra.execution', { multiplier: battleLog.executionMultiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') })
                                : '';
                              const swarmActorDisplay = typeof battleLog.swarmActorPenaltyPercent === 'number' && battleLog.swarmActorPenaltyPercent > 0
                                ? t('battleLog.extra.powerDown', { percent: battleLog.swarmActorPenaltyPercent })
                                : '';
                              const swarmOpponentDisplay = typeof battleLog.swarmOpponentBonusPercent === 'number' && battleLog.swarmOpponentBonusPercent > 0
                                ? t('battleLog.extra.opponentDamageUp', { percent: battleLog.swarmOpponentBonusPercent })
                                : '';

                              let actionText: string;
                              if (battleLog.actor === 'effect' || battleLog.actor === 'triggered') {
                                actionText = battleLog.action;
                              } else if (isEnemy) {
                                if (isResurrectLog) {
                                  actionText = t('battleLog.action.enemyResurrect', { action: battleLog.action });
                                } else if (battleLog.isEnemyTargetHit) {
                                  actionText = allMissed
                                    ? t('battleLog.action.targetHitMissed', { action: battleLog.action.replace('命中！', '') })
                                    : battleLog.action;
                                } else if (allMissed) {
                                  actionText = t('battleLog.action.enemyMissed', { action: battleLog.action.replace('！', '') });
                                } else {
                                  actionText = t('battleLog.action.enemyActed', { action: battleLog.action });
                                }
                              } else {
                                if (allMissed) {
                                  const charName = battleLog.action.replace(/ の.*$/, '');
                                  actionText = t('battleLog.action.partyMissed', { actor: charName });
                                } else {
                                  actionText = battleLog.action;
                                }
                              }

                              const extraSegments = [
                                ...trailingEffects,
                                rageDisplay,
                                momentumDisplay,
                                ambushDisplay,
                                overwatchDisplay,
                                executionDisplay,
                                swarmActorDisplay,
                                swarmOpponentDisplay,
                              ].filter(Boolean);
                              const mergedExtraSegments = Array.from(new Set(extraSegments));
                              const compactHitDisplay = hitDisplay && mergedExtraSegments.length > 0
                                ? t('battleLog.hitsWithExtras', { hits, total: totalAttempts, extras: mergedExtraSegments.join(', ') })
                                : hitDisplay;
                              const actionDisplay = trailingEffects.length > 0 && !allMissed
                                ? actionText.replace(/\([^()]+\)$/, '')
                                : actionText;
                              const actionDisplayNode = renderBattleLogTextWithInlineChibis(actionDisplay, diaryParty, entry);
                              const shouldRenderResurrectBeforeHeader = isResurrectLog && shouldShowPhaseHeader;
                              const isReflectDamageLog = !!battleLog.reflectedDamage && battleLog.reflectedDamage > 0;
                              const isAbsorbDamageLog = !!battleLog.absorbedDamage && battleLog.absorbedDamage > 0;
                              const reflectArrowClass = battleLog.reflectTarget === 'party' ? 'text-accent' : 'text-sub';
                              const absorbArrowClass = battleLog.absorbTarget === 'enemy' ? 'text-accent' : 'text-sub';
                              const damageColorClass = (battleLog.damageTarget ?? (isEnemy ? 'party' : 'enemy')) === 'party' ? 'text-accent' : 'text-sub';
                              const damageEmojiClass = damageColorClass === 'text-accent' ? 'accent-theme-emoji-icon' : 'sub-theme-emoji-icon';
                              const damageDisplay = ((battleLog.damage !== undefined && (battleLog.damage > 0 || battleLog.showZeroDamage)) || isReflectDamageLog || isAbsorbDamageLog) && (
                                isReflectDamageLog
                                  ? (
                                    <span className="ml-auto shrink-0 whitespace-nowrap text-right text-gray-500">
                                      ({renderUiIcon(iconKey, damageEmojiClass)}{' '}{formatNumber(battleLog.damage ?? 0)}, <span className={reflectArrowClass}>{t('battleLog.damage.reflected')} {formatNumber(battleLog.reflectedDamage || 0)}</span>)
                                    </span>
                                  )
                                  : isAbsorbDamageLog
                                    ? (
                                      <span className="ml-auto shrink-0 whitespace-nowrap text-right text-gray-500">
                                        ({renderUiIcon(iconKey, damageEmojiClass)}{' '}<span className={absorbArrowClass}>{t('battleLog.damage.absorbed')} {formatNumber(battleLog.absorbedDamage || 0)}</span>)
                                      </span>
                                    )
                                    : (
                                      <span className={`ml-auto shrink-0 whitespace-nowrap text-right ${damageColorClass}`}>
                                        ({renderUiIcon(iconKey, damageEmojiClass)}{' '}{formatNumber(battleLog.damage ?? 0)})
                                      </span>
                                    )
                              );

                              return (
                                <div key={j}>
                                  {shouldRenderResurrectBeforeHeader && (
                                    <div className="flex items-start justify-between gap-2 text-gray-600">
                                      <span className="min-w-0">
                                        <span className="text-gray-400">[{phaseLabel}]</span>{' '}
                                        {actionDisplayNode}
                                        {renderBattleLogNote(battleLog.note, battleLog.noteTone)}
                                        {compactHitDisplay && <span className="text-gray-400">{compactHitDisplay}</span>}
                                      </span>
                                      {damageDisplay}
                                    </div>
                                  )}
                                  {shouldShowPhaseHeader && <div className="text-gray-400">({phaseHeader})</div>}
                                  {(!isResurrectLog || !shouldRenderResurrectBeforeHeader) && (
                                  <div className={`flex items-start justify-between gap-2 text-gray-600 ${shouldShowEndPhaseSpacer ? 'mt-1' : ''}`}>
                                    <span className="min-w-0">
                                      <span className="text-gray-400">[{phaseLabel}]</span>{' '}
                                      {actionDisplayNode}
                                      {renderBattleLogNote(battleLog.note, battleLog.noteTone)}
                                      {compactHitDisplay && <span className="text-gray-400">{compactHitDisplay}</span>}
                                    </span>
                                    {damageDisplay}
                                  </div>
                                  )}
                                </div>
                              );
                            })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SettingTab({
  gameState,
  deityDonations,
  onResetGame,
  onImportGameState,
  onAddNotification,
  onResetCommonBags,
  onResetUniqueBags,
  onResetSideQuestBag,
  selectedBestiaryDungeonId,
  onSetSelectedBestiaryDungeonId,
  expandedBestiaryEnemies,
  onSetExpandedBestiaryEnemies,
  bestiaryScrollTop,
  onSetBestiaryScrollTop,
  gameMode,
  onSetGameMode,
  darkModeSetting,
  onSetDarkModeSetting,
  isAutoRepeatEnabled,
  onSetAutoRepeatEnabled,
  isExpeditionStatsDisplayEnabled,
  onSetExpeditionStatsDisplayEnabled,
  debugSettings,
  onUpdateDebugSettings,
  partyCount,
  onPartyUnlock,
  language,
  onSetLanguage,
  onMarkDeveloperNewsRead,
  onNewsPaneExpandedChange,
}: {
  gameState: GameState;
  deityDonations: Record<string, number>;
  onResetGame: () => void;
  onImportGameState: (state: GameState) => void;
  onAddNotification: (
    message: string,
    style?: NotificationStyle,
    category?: NotificationCategory,
    isPositive?: boolean
  ) => void;
  onResetCommonBags: (partyIndex?: number) => void;
  onResetUniqueBags: (partyIndex?: number) => void;
  onResetSideQuestBag: (partyIndex?: number) => void;
  selectedBestiaryDungeonId: number;
  onSetSelectedBestiaryDungeonId: Dispatch<SetStateAction<number>>;
  expandedBestiaryEnemies: Record<number, boolean>;
  onSetExpandedBestiaryEnemies: Dispatch<SetStateAction<Record<number, boolean>>>;
  bestiaryScrollTop: number;
  onSetBestiaryScrollTop: Dispatch<SetStateAction<number>>;
  gameMode: GameMode;
  onSetGameMode: Dispatch<SetStateAction<GameMode>>;
  darkModeSetting: DarkModeSetting;
  onSetDarkModeSetting: Dispatch<SetStateAction<DarkModeSetting>>;
  isAutoRepeatEnabled: boolean;
  onSetAutoRepeatEnabled: (enabled: boolean) => void;
  isExpeditionStatsDisplayEnabled: boolean;
  onSetExpeditionStatsDisplayEnabled: (enabled: boolean) => void;
  debugSettings: DebugSettings;
  onUpdateDebugSettings: (updates: Partial<DebugSettings>) => void;
  partyCount: number;
  onPartyUnlock: () => void;
  language: Language;
  onSetLanguage: (language: Language) => void;
  onMarkDeveloperNewsRead: (itemIds: string[]) => void;
  onNewsPaneExpandedChange: (expanded: boolean) => void;
}) {
  type SettingPanelKey = 'news' | 'modeSelect' | 'donation' | 'clairvoyance' | 'glossary' | 'itemCompendium' | 'characterRoster' | 'bestiary' | 'superRare' | 'feedback' | 'gameSetting' | 'debug';
  type GlossaryTabKey = '能' | '基' | '固' | '増' | '属' | '機' | '信' | '魔' | '地' | '求';
  // SpecRef: 9 | Environment | Save Data Isolation
  const SETTING_PANEL_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition.setting.panel-expanded');
  const CLAIRVOYANCE_PARTY_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition.setting.clairvoyance-party-expanded');
  const GLOSSARY_TAB_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition.setting.glossary-tab');
  const GLOSSARY_EXPANDED_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition.setting.glossary-expanded-entries');
  const GLOSSARY_TABS: readonly GlossaryTabKey[] = ['能', '基', '固', '増', '属', '機', '信', '魔', '地', '求'];
  const GLOSSARY_TAB_LABELS: Record<GlossaryTabKey, string> = {
    能: t('setting.glossary.tab.abilities'),
    基: t('setting.glossary.tab.baseStats'),
    固: t('setting.glossary.tab.fixedEffects'),
    増: t('setting.glossary.tab.bonuses'),
    属: t('setting.glossary.tab.elements'),
    機: t('setting.glossary.tab.mechanics'),
    信: t('setting.glossary.tab.faith'),
    魔: t('setting.glossary.tab.magic'),
    地: t('setting.glossary.tab.terrain'),
    求: t('setting.glossary.tab.sideQuests'),
  };
  const defaultSettingPanelState: Record<SettingPanelKey, boolean> = {
    news: false,
    modeSelect: false,
    donation: false,
    clairvoyance: false,
    glossary: false,
    itemCompendium: false,
    characterRoster: false,
    bestiary: false,
    superRare: false,
    feedback: false,
    gameSetting: false,
    debug: true,
  };

  const getStoredSettingPanelState = (): Record<SettingPanelKey, boolean> => {
    try {
      const saved = localStorage.getItem(SETTING_PANEL_STORAGE_KEY);
      if (!saved) return defaultSettingPanelState;
      const parsed = JSON.parse(saved) as Partial<Record<SettingPanelKey, boolean>>;
      return {
        news: parsed.news === true,
        modeSelect: parsed.modeSelect === true,
        donation: parsed.donation === true,
        clairvoyance: parsed.clairvoyance === true,
        glossary: parsed.glossary === true,
        itemCompendium: parsed.itemCompendium === true,
        characterRoster: parsed.characterRoster === true,
        bestiary: parsed.bestiary === true,
        superRare: parsed.superRare === true,
        feedback: parsed.feedback === true,
        gameSetting: parsed.gameSetting === true,
        debug: parsed.debug === true,
      };
    } catch (error) {
      console.error('Failed to load Setting panel state:', error);
      return defaultSettingPanelState;
    }
  };

  const getStoredGlossaryTab = (): GlossaryTabKey => {
    try {
      const savedGlossaryTab = localStorage.getItem(GLOSSARY_TAB_STORAGE_KEY);
      if (savedGlossaryTab && GLOSSARY_TABS.includes(savedGlossaryTab as GlossaryTabKey)) {
        return savedGlossaryTab as GlossaryTabKey;
      }
    } catch (error) {
      console.error('Failed to load glossary tab state:', error);
    }
    return '能';
  };

  const getStoredExpandedGlossaryEntries = (): Record<string, boolean> => {
    try {
      const savedExpandedEntries = localStorage.getItem(GLOSSARY_EXPANDED_STORAGE_KEY);
      if (savedExpandedEntries) {
        return JSON.parse(savedExpandedEntries) as Record<string, boolean>;
      }
    } catch (error) {
      console.error('Failed to load glossary expanded entries:', error);
    }
    return {};
  };


  const FEEDBACK_NAME_STORAGE_KEY = createEnvironmentStorageKey('settingFeedbackName');
  const [feedbackName, setFeedbackName] = useState(() => {
    try {
      return localStorage.getItem(FEEDBACK_NAME_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackFiles, setFeedbackFiles] = useState<File[]>([]);
  const [feedbackLatestBattleLogSelection, setFeedbackLatestBattleLogSelection] = useState<'PT1' | 'PT2' | 'PT3' | 'PT4' | 'PT5' | 'PT6' | 'None'>('PT1');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const feedbackFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(FEEDBACK_NAME_STORAGE_KEY, feedbackName);
    } catch (error) {
      console.error('Failed to persist feedback name:', error);
    }
  }, [feedbackName, FEEDBACK_NAME_STORAGE_KEY]);

  const formatFeedbackTimestamp = (): string => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('ja-JP', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false, timeZoneName:'short' });
    const parts = formatter.formatToParts(now);
    const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
    const month = parts.find((p) => p.type === 'month')?.value ?? '00';
    const day = parts.find((p) => p.type === 'day')?.value ?? '00';
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const timezone = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC';
    return `${year}/${month}/${day} ${hour}:${minute} (${timezone})`;
  };

  const buildLatestBattleLogHtml = (partyLabel: 'PT1' | 'PT2' | 'PT3' | 'PT4' | 'PT5' | 'PT6'): File | null => {
    const partyIndex = Number(partyLabel.replace('PT', '')) - 1;
    const party = gameState.parties[partyIndex];
    const latestLog = party?.lastExpeditionLog;
    if (!party || !latestLog) return null;
    const entriesHtml = latestLog.entries.map((entry: ExpeditionLogEntry) => {
      const detailItems = entry.details.map((detail: BattleLogEntry) => {
        const elementalAttributeEmoji: Record<'fire' | 'ice' | 'thunder', string> = { fire: '🔥', ice: '❄', thunder: '⚡' };
        const hitDisplay = typeof detail.totalAttempts === 'number' && detail.totalAttempts > 0 ? `(${t('battleLog.hits', { hits: formatNumber(detail.hits ?? 0), total: formatNumber(detail.totalAttempts) })})` : '';
        const damageDisplay = typeof detail.damage === 'number' && (detail.damage > 0 || detail.showZeroDamage) ? `(${detail.elementalOffense && detail.elementalOffense !== 'none' ? `${elementalAttributeEmoji[detail.elementalOffense]} ` : ''}${formatNumber(detail.damage)})` : '';
        const noteDisplay = detail.note ? `(${detail.note})` : '';
        return `<li>${escapeExportHtml(`${detail.action}${[hitDisplay, damageDisplay, noteDisplay].filter(Boolean).join(' ') ? ` ${[hitDisplay, damageDisplay, noteDisplay].filter(Boolean).join(' ')}` : ''}`)}</li>`;
      }).join('');
      return `<section><h3>Room ${escapeExportHtml(String(entry.floor ?? '-'))}-${escapeExportHtml(String(entry.roomInFloor ?? entry.room))} / ${escapeExportHtml(entry.enemyName)}</h3><p>Outcome: ${escapeExportHtml(entry.outcome)} / Damage dealt: ${escapeExportHtml(String(entry.damageDealt))} / Damage taken: ${escapeExportHtml(String(entry.damageTaken))}</p><ul>${detailItems || '<li>(No detail)</li>'}</ul></section>`;
    }).join('\n');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>KEMO EXPEDITION Latest Battle Log - ${partyLabel}</title></head><body><h1>KEMO EXPEDITION Latest Battle Log (${partyLabel})</h1><p>Dungeon: ${escapeExportHtml(latestLog.dungeonName)} / Outcome: ${escapeExportHtml(latestLog.finalOutcome)}</p><p>Total rooms: ${escapeExportHtml(String(latestLog.totalRooms))} / Completed: ${escapeExportHtml(String(latestLog.completedRooms))}</p>${entriesHtml || '<p>No entries.</p>'}</body></html>`;
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    return new File([html], `latest-battle-log-${partyLabel}-${timestamp}.html`, { type: 'text/html' });
  };

  // SpecRef: 8.6 | UI_SETTING | フィードバック
  const handleFeedbackFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length > 4) {
      window.alert(t('setting.feedback.maxFilesWarning'));
    }
    setFeedbackFiles(selectedFiles.slice(0, 4));
  };

  const buildBackupFile = (): File => {
    const payload = {
      meta: {
        app: 'Kemo-Expedition',
        version: versionTag,
        env: currentEnv,
        exportedAt: new Date().toISOString(),
        format: 'compressed-v1',
      },
      saveDataCompressed: encodePersistedState(JSON.stringify(serializeGameState(gameState))),
    };
    return new File([JSON.stringify(payload)], getBackupFileName('compressed'), { type: 'application/json' });
  };

  // SpecRef: 8.6 | UI_SETTING | フィードバック
  const handleSendFeedback = async () => {
    if (!FEEDBACK_DISCORD_WEBHOOK_URL) { window.alert(t('setting.feedback.webhookMissing')); return; }
    if (!feedbackText.trim()) { window.alert(t('setting.feedback.bodyRequired')); return; }
    setIsSendingFeedback(true);
    try {
      const nav = typeof navigator === 'undefined' ? null : navigator;
      const userAgent = nav?.userAgent ?? 'unknown';
      const browser = userAgent.match(/(Firefox|Edg|OPR|Chrome|Safari)\/[\d.]+/)?.[0] ?? 'unknown';
      const browserVersion = userAgent.match(/(?:Firefox|Edg|OPR|Chrome|Version)\/([\d.]+)/)?.[1] ?? 'unknown';
      const osVersion = userAgent.match(/Android ([\d.]+)/i)?.[0]
        ?? userAgent.match(/(?:CPU (?:iPhone )?OS|iPhone OS) ([\d_]+)/i)?.[0]?.replace(/_/g, '.')
        ?? userAgent.match(/Windows NT ([\d.]+)/i)?.[0]
        ?? userAgent.match(/Mac OS X ([\d_]+)/i)?.[0]?.replace(/_/g, '.')
        ?? 'unknown';
      const payload = {
        content: [
          '**Feedback**',
          `**Version Build env:** ${APP_VERSION} (${formatNumber(gameState.buildNumber)}) ${getEnvironmentId()}`,
          `**Timestamp:** ${formatFeedbackTimestamp()}`,
          `**User ID:** ${gameState.global.userId}`,
          `**browser, version:** ${browser}, ${browserVersion}`,
          `**OS version:** ${osVersion}`,
          `**Resolution:** ${formatNumber(window.innerWidth)} px, ${formatNumber(window.innerHeight)} px`,
          `**Name:** ${feedbackName.trim() || '-'}`,
          `**Feedback text:** ${feedbackText.trim()}`,
          `**Latest Battle Log selection:** ${feedbackLatestBattleLogSelection}`
        ].join('\n'),
        username: `KEMO EXPEDITION ${currentEnv.toUpperCase()} FEEDBACK`,
      };
      const formData = new FormData();
      formData.append('payload_json', JSON.stringify(payload));
      const generatedFiles: File[] = [buildBackupFile()];
      if (feedbackLatestBattleLogSelection !== 'None') {
        const latestBattleLogFile = buildLatestBattleLogHtml(feedbackLatestBattleLogSelection);
        if (latestBattleLogFile) {
          generatedFiles.push(latestBattleLogFile);
        }
        const partyIndex = Number(feedbackLatestBattleLogSelection.replace('PT', '')) - 1;
        const party = gameState.parties[partyIndex];
        const partyStatusRows = party == null ? [] : party.characters.map((member, rowIndex) => {
          const mainClass = CLASSES.find((entry) => entry.id === member.mainClassId);
          const subClass = CLASSES.find((entry) => entry.id === member.subClassId);
          const computed = computeCharacterStats(member, party.level, rowIndex + 1);
          const formatPercent = (value: number) => `${formatNumber(Math.round(value * 10000) / 100)}%`;
          const formatSignedScaledBy1000 = (value: number) => `${value >= 0 ? '+' : ''}${formatNumber(Math.round(value * 1000))}`;
          const defensePhysical = `${formatNumber(computed.physicalDefense)}. ${formatPercent(computed.physicalDefenseAmplifier)}`;
          const defenseMagical = `${formatNumber(computed.magicalDefense)}. ${formatPercent(computed.magicalDefenseAmplifier)}`;
          const attackParts: string[] = [];
          if (computed.rangedAttack > 0 && computed.physicalOffenseMultiplier > 0) attackParts.push(t('home.progressReport.attackSummary.ranged', { attack: formatNumber(computed.rangedAttack), multiplier: formatPercent(computed.physicalOffenseMultiplier), count: formatNumber(computed.rangedNoA) }));
          if (computed.magicalAttack > 0 && computed.magicalOffenseMultiplier > 0) attackParts.push(t('home.progressReport.attackSummary.magic', { attack: formatNumber(computed.magicalAttack), multiplier: formatPercent(computed.magicalOffenseMultiplier), count: formatNumber(computed.magicalNoA) }));
          if (computed.meleeAttack > 0 && computed.physicalOffenseMultiplier > 0) attackParts.push(t('home.progressReport.attackSummary.melee', { attack: formatNumber(computed.meleeAttack), multiplier: formatPercent(computed.physicalOffenseMultiplier), count: formatNumber(computed.meleeNoA) }));
          const elementalAttributeEmoji: Record<'fire' | 'ice' | 'thunder', string> = { fire: '🔥', ice: '❄', thunder: '⚡' };
          const elementalOffense = computed.elementalOffense === 'none' ? '-' : `${elementalAttributeEmoji[computed.elementalOffense]}(+${formatNumber(Math.max(0, Math.round((computed.elementalOffenseValue - 1) * 100)))}%)`;
          const elementalDefense = `${formatPercent(computed.elementalDefenseMultipliers.fire)}, ${formatPercent(computed.elementalDefenseMultipliers.ice)}, ${formatPercent(computed.elementalDefenseMultipliers.thunder)}`;
          const race = RACES.find((entry) => entry.id === member.raceId);
          const build = `${race?.emoji ?? '-'}${member.gender === 'male' ? t('character.gender.maleShort') : t('character.gender.femaleShort')}${mainClass ? (CLASS_SHORT_NAMES[mainClass.id] ?? mainClass.name) : '-'}${subClass ? (CLASS_SHORT_NAMES[subClass.id] ?? subClass.name) : '-'}${LINEAGE_SHORT_NAME_KEYS[member.lineageId] ? t(LINEAGE_SHORT_NAME_KEYS[member.lineageId]) : member.lineageId}${PREDISPOSITION_SHORT_NAME_KEYS[member.predispositionId] ? t(PREDISPOSITION_SHORT_NAME_KEYS[member.predispositionId]) : member.predispositionId}`;
          const abilityText = computed.abilities.map((ability) => `${ABILITY_NAMES[ability.id] ?? ability.id}${formatNumber(ability.level)}`).join(', ') || '-';
          return [`**${formatNumber(partyIndex + 1)}-${formatNumber(rowIndex + 1)}**`, `**${member.name}, ${build}**`, defensePhysical, defenseMagical, `${formatSignedScaledBy1000(computed.evasionBonus)}, ${formatPercent(computed.penetMultiplier)}`, attackParts.length > 0 ? `${attackParts.join('/')} ${elementalOffense === '-' ? '' : elementalOffense}`.trim() : elementalOffense, elementalDefense, abilityText];
        });
        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const statusTableFile = buildStatusTableHtmlFile(
          partyStatusRows,
          `status-table-${feedbackLatestBattleLogSelection}-${timestamp}.html`,
          `Status table (${feedbackLatestBattleLogSelection})`,
        );
        generatedFiles.push(statusTableFile);
      }
      [...generatedFiles, ...feedbackFiles].forEach((file, index) => {
        formData.append(`files[${index}]`, file, file.name);
      });
      const response = await fetch(FEEDBACK_DISCORD_WEBHOOK_URL, { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Webhook request failed: ${response.status}`);
      onAddNotification(t('setting.feedback.sent'), 'normal', 'item', true);
      setFeedbackText('');
      setFeedbackFiles([]);
      if (feedbackFileInputRef.current) {
        feedbackFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error(error);
      window.alert(t('setting.feedback.sendFailed'));
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [settingPanelExpanded, setSettingPanelExpanded] = useState<Record<SettingPanelKey, boolean>>(() => getStoredSettingPanelState());
  const [clairvoyancePartyExpanded, setClairvoyancePartyExpanded] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(CLAIRVOYANCE_PARTY_STORAGE_KEY);
      if (!saved) return {};
      const parsed = JSON.parse(saved) as Record<string, boolean>;
      return Object.entries(parsed).reduce<Record<number, boolean>>((acc, [key, value]) => {
        const index = Number(key);
        if (Number.isFinite(index)) acc[index] = value === true;
        return acc;
      }, {});
    } catch {
      return {};
    }
  });
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [compendiumCategory, setCompendiumCategory] = useState<string>('armor');
  const [colosseumEnemySettings, setColosseumEnemySettings] = useState<ColosseumEnemySettings>(() => getColosseumEnemySettings());
  const [compendiumRarityFilter, setCompendiumRarityFilter] = useState<RarityFilter>('all');
  const [glossaryTab, setGlossaryTab] = useState<GlossaryTabKey>(() => getStoredGlossaryTab());
  const [bonusAbilityGlossarySubcategory, setBonusAbilityGlossarySubcategory] = useState<BonusAbilityGlossarySubcategoryId>('passive');
  const [expandedGlossaryEntries, setExpandedGlossaryEntries] = useState<Record<string, boolean>>(() => getStoredExpandedGlossaryEntries());
  const [expandedCompendiumItems, setExpandedCompendiumItems] = useState<Record<number, boolean>>({});
  const [isEnemyEditExpanded, setIsEnemyEditExpanded] = useState(true);
  const [activeAbilityHelp, setActiveAbilityHelp] = useState<{ key: string; title: string; description: string } | null>(null);
  const [abilityHelpPosition, setAbilityHelpPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const bestiaryListRef = useRef<HTMLDivElement | null>(null);
  // SpecRef: 8.6 | UI_SETTING | Enemy Edit Pane
  const updateColosseumEnemySettings = useCallback((updates: Partial<ColosseumEnemySettings>) => {
    setColosseumEnemySettings((prev) => {
      const nextSettings = normalizeColosseumEnemySettings({ ...prev, ...updates });
      // Persist immediately so battle execution (which reads storage) uses the latest setting
      // even when the player changes Enemy Edit values and starts a battle right away.
      saveColosseumEnemySettings(nextSettings);
      return nextSettings;
    });
  }, []);

  useEffect(() => {
    saveColosseumEnemySettings(colosseumEnemySettings);
  }, [colosseumEnemySettings]);

  useEffect(() => {
    if (!debugSettings.colosseumEnabled && selectedBestiaryDungeonId === 99) {
      onSetSelectedBestiaryDungeonId(1);
    }
  }, [debugSettings.colosseumEnabled, selectedBestiaryDungeonId, onSetSelectedBestiaryDungeonId]);


  const versionTag = APP_VERSION;

  const getSettingPartyAbilityLevel = (party: Party, abilityId: string): number => {
    const { characterStats } = computePartyStats(party);
    return characterStats.reduce((maxLevel, stats) => {
      const level = stats.abilities
        .filter((ability) => ability.id === abilityId)
        .reduce((abilityMax, ability) => Math.max(abilityMax, ability.level), 0);
      return Math.max(maxLevel, level);
    }, 0);
  };
  const currentEnv = getEnvironmentId();
  const isBetaEnvironment = currentEnv === 'beta';
  const isDevEnvironment = currentEnv === 'dev';
  const modeSelectionLocked = isBetaEnvironment;
  useEffect(() => {
    try {
      localStorage.setItem(SETTING_PANEL_STORAGE_KEY, JSON.stringify(settingPanelExpanded));
    } catch (error) {
      console.error('Failed to persist Setting panel state:', error);
    }
  }, [settingPanelExpanded]);
  useEffect(() => {
    localStorage.setItem(CLAIRVOYANCE_PARTY_STORAGE_KEY, JSON.stringify(clairvoyancePartyExpanded));
  }, [clairvoyancePartyExpanded]);
  useEffect(() => {
    try {
      localStorage.setItem(GLOSSARY_TAB_STORAGE_KEY, glossaryTab);
    } catch (error) {
      console.error('Failed to persist glossary tab state:', error);
    }
  }, [glossaryTab]);

  useEffect(() => {
    try {
      localStorage.setItem(GLOSSARY_EXPANDED_STORAGE_KEY, JSON.stringify(expandedGlossaryEntries));
    } catch (error) {
      console.error('Failed to persist glossary expanded entries:', error);
    }
  }, [expandedGlossaryEntries]);

  const unreadDeveloperNewsItems = DEVELOPER_NEWS_ITEMS.filter((item) => !(gameState.global.readDeveloperNewsItemIds ?? []).includes(item.id));
  const hasUnreadDeveloperNews = unreadDeveloperNewsItems.length > 0;

  // SpecRef: 8.6 | UI_SETTING | Developer News Notification (通知)
  useEffect(() => {
    onNewsPaneExpandedChange(settingPanelExpanded.news);
  }, [settingPanelExpanded.news, onNewsPaneExpandedChange]);

  const toggleSettingPanel = (panelKey: SettingPanelKey) => {
    setSettingPanelExpanded((prev) => ({ ...prev, [panelKey]: !prev[panelKey] }));
  };

  // SpecRef: 8.6 | UI_SETTING | Setting (設定)
  const renderSettingPanelHeader = (panelKey: SettingPanelKey, title: string) => {
    const expanded = settingPanelExpanded[panelKey];
    return (
      <button
        type="button"
        onClick={() => toggleSettingPanel(panelKey)}
        className="w-full flex items-center justify-between text-sm font-medium"
      >
        <span className="inline-flex items-center gap-2">
          <span>{title}</span>
          {panelKey === 'news' && hasUnreadDeveloperNews && (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" aria-label="Unread developer news" />
          )}
        </span>
        <span className={`text-xs text-gray-500 transform transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>
    );
  };

  const getBackupFileName = (format: 'json' | 'compressed' = 'json'): string => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = `${now.getMonth() + 1}`.padStart(2, '0');
    const dd = `${now.getDate()}`.padStart(2, '0');
    const extension = format === 'compressed' ? 'kemoz' : 'json';
    return `Kemo-Expedition_Backup_${versionTag}_${currentEnv}_${yyyy}${mm}${dd}.${extension}`;
  };

  const downloadBackupFile = (content: BlobPart, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // WebKit may not start reading the object URL until after the click handler returns.
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const openBackupFileForManualSave = (file: File) => {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Keep the URL alive while an embedded browser hands the new page to its viewer.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    window.alert(t('setting.backup.manualSaveInstructions'));
  };

  const saveBackupWithFilePicker = async (file: File): Promise<'saved' | 'cancelled' | 'unavailable'> => {
    const filePickerWindow = window as Window & {
      showSaveFilePicker?: (options: {
        suggestedName: string;
        types: Array<{ description: string; accept: Record<string, string[]> }>;
      }) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }>;
    };
    if (!filePickerWindow.showSaveFilePicker) return 'unavailable';

    try {
      const fileHandle = await filePickerWindow.showSaveFilePicker({
        suggestedName: file.name,
        types: [{
          description: 'KEMO EXPEDITION backup',
          accept: { [file.type]: ['.kemoz'] },
        }],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();
      return 'saved';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      console.warn('Native backup file saving failed; falling back to file download.', error);
      return 'unavailable';
    }
  };

  // SpecRef: 8.6 | UI_SETTING | 5.1 Backup (Export)
  const handleExportBackup = async () => {
    const backupFile = buildBackupFile();
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    const isIos = /iPad|iPhone|iPod/.test(nav.userAgent)
      || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);

    if (isIos && nav.share) {
      const shareData: ShareData = { files: [backupFile] };
      let canShareBackup = !nav.canShare;
      try {
        canShareBackup ||= nav.canShare?.(shareData) === true;
      } catch (error) {
        console.warn('The browser rejected the backup share capability check.', error);
      }
      if (canShareBackup) {
        try {
          // iOS uses its native share sheet, where the player can choose Save to Files.
          await nav.share(shareData);
          onAddNotification(t('setting.backup.exported'), 'normal', 'item', true);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          console.warn('Native backup sharing failed; falling back to file download.', error);
        }
      }
    }

    if (isIos) {
      // Embedded iOS browsers (including app webviews) can omit file sharing and
      // ignore the download attribute. Open the backup so their toolbar can save it.
      openBackupFileForManualSave(backupFile);
      return;
    }

    // Chromium can disregard an object-URL anchor's download filename and save the
    // blob URL itself as an unusable link. Its native picker writes the real file.
    const filePickerResult = await saveBackupWithFilePicker(backupFile);
    if (filePickerResult === 'cancelled') return;
    if (filePickerResult === 'saved') {
      onAddNotification(t('setting.backup.exported'), 'normal', 'item', true);
      return;
    }

    downloadBackupFile(
      backupFile,
      backupFile.name,
      backupFile.type,
    );
    onAddNotification(t('setting.backup.exported'), 'normal', 'item', true);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText) as unknown;
      const source = parsed && typeof parsed === 'object' && 'saveDataCompressed' in parsed
        ? JSON.parse(decodePersistedState((parsed as { saveDataCompressed: string }).saveDataCompressed)) as unknown
        : parsed && typeof parsed === 'object' && 'saveData' in parsed
          ? (parsed as { saveData: unknown }).saveData
          : parsed;

      if (!source || typeof source !== 'object') {
        window.alert(t('setting.import.invalidFormat'));
        return;
      }

      const saveData = source as Partial<GameState>;
      const issues = validateImportedSaveData(saveData);

      if (parsed && typeof parsed === 'object' && 'meta' in parsed) {
        const meta = (parsed as { meta?: { version?: string; env?: string; format?: string } }).meta;
        if (meta?.version && meta.version !== versionTag) {
          issues.push(t('setting.import.issue.versionMismatch', { current: versionTag, file: meta.version }));
        }
        if (meta?.env && meta.env !== currentEnv) {
          issues.push(t('setting.import.issue.envMismatch', { current: currentEnv, file: meta.env }));
        }
        if (meta?.format === 'compressed-v1') {
          const canonicalImported = serializeGameState(hydrateGameState(saveData as GameState));
          if (JSON.stringify(canonicalImported) !== JSON.stringify(saveData)) {
            issues.push(t('setting.import.issue.formatMismatch'));
          }
        }
      }

      if (issues.length > 0) {
        const shouldContinue = window.confirm(
          t('setting.import.integrityWarning', { issues: issues.join('\n- ') })
        );
        if (!shouldContinue) return;
      }

      const shouldImport = window.confirm(
        t('setting.import.confirmReplace')
      );
      if (!shouldImport) return;

      onImportGameState(saveData as GameState);
      onAddNotification(t('setting.import.imported'), 'normal', 'item', true);
    } catch (error) {
      console.error(error);
      window.alert(t('setting.import.jsonParseFailed'));
    }
  };

  const validateImportedSaveData = (saveData: Partial<GameState>): string[] => {
    // SpecRef: 9 | Environment | Import/Export format consistency check
    const issues: string[] = [];

    if (!Array.isArray(saveData.parties)) issues.push(t('setting.import.issue.partiesMissing'));
    if (!saveData.global || typeof saveData.global !== 'object') {
      issues.push(t('setting.import.issue.globalMissing'));
    } else {
      if (typeof saveData.global.gold !== 'number') issues.push(t('setting.import.issue.globalGoldMissing'));
      if (!saveData.global.inventory || typeof saveData.global.inventory !== 'object') issues.push(t('setting.import.issue.globalInventoryMissing'));
    }

    if (!saveData.bags || typeof saveData.bags !== 'object') {
      issues.push(t('setting.import.issue.bagsMissing'));
    } else {
      const requiredBags: Array<keyof GameState['bags']> = [
        'commonRewardBag',
        'commonEnhancementBag',
        'uncommonRewardBag',
        'eliteRareRewardBag',
        'bossRareRewardBag',
        'mythicRareRewardBag',
        'enhancementBag',
        'superRareBag',
        'physicalThreatBag',
        'magicalThreatBag',
        'sideQuestBag',
      ];
      const missingBags = requiredBags.filter((bagKey) => !(bagKey in saveData.bags!));
      if (missingBags.length > 0) {
        issues.push(t('setting.import.issue.bagsIncomplete', { bags: missingBags.join(', ') }));
      }
    }

    if (typeof saveData.selectedPartyIndex !== 'number') issues.push(t('setting.import.issue.selectedPartyIndexMissing'));
    if (typeof saveData.buildNumber !== 'number') issues.push(t('setting.import.issue.buildNumberMissing'));

    if (Array.isArray(saveData.parties)) {
      if (saveData.parties.length === 0) {
        issues.push(t('setting.import.issue.partiesEmpty'));
      }

      saveData.parties.forEach((party, index) => {
        if (!party || typeof party !== 'object') {
          issues.push(t('setting.importValidation.invalidParty', { index }));
          return;
        }

        if (!Array.isArray(party.characters)) {
          issues.push(t('setting.importValidation.invalidCharacters', { index }));
          return;
        }

        party.characters.forEach((character, characterIndex) => {
          if (!character || typeof character !== 'object') {
            issues.push(t('setting.importValidation.invalidCharacter', { index, characterIndex }));
          }
        });
      });
    }

    return issues;
  };

  useEffect(() => {
    bestiaryListRef.current?.scrollTo({ top: bestiaryScrollTop, behavior: 'auto' });
  }, [bestiaryScrollTop]);

  const commonRewardTotal = getBagTicketTotal(createCommonRewardBag());
  const commonEnhancementTotal = ENHANCEMENT_TITLES.reduce((sum, t) => sum + t.tickets, 0);
  const uniqueRewardTotal = getBagTicketTotal(createUncommonRewardBag());
  const enhancementTotal = 5490 + (ENHANCEMENT_TITLES.reduce((sum, t) => sum + (t.value === 0 ? 0 : t.tickets), 0));
  const mythicRewardTotal = getBagTicketTotal(createMythicRareRewardBag());

  const confirmReset = (label: string, onConfirm: () => void) => {
    if (!window.confirm(t('setting.clairvoyance.resetConfirmation', { label }))) {
      return;
    }

    onConfirm();
  };

  const commonSuperRareTotal = getBagTicketTotal(createCommonSuperRareBag());
  const rareSuperRareTotal = getBagTicketTotal(createRareSuperRareBag());
  const superRareHitTotal = SUPER_RARE_TITLES.reduce((sum, t) => sum + (t.value > 0 ? t.tickets : 0), 0);
  const enhancementCountTargets = [
    { value: 1 },
    { value: 2 },
    { value: 3 },
    { value: 4 },
    { value: 5 },
    { value: 6 },
  ] as const;
  const sideQuestDefaultBag = createSideQuestBag();
  const sideQuestTotal = getBagTicketTotal(sideQuestDefaultBag);
  const sleepinessDefaultBag = createSleepinessPartyBag();

  const visibleDeityNames = new Set(
    gameState.global.unlockedDeities
      .map((deityName) => normalizeDeityName(deityName))
      .filter((deityName) => !isNoFaithDeity(deityName))
  );

  const donationByDeity = DEITY_OPTIONS.reduce<Record<string, number>>((totals, deity) => {
    const deityName = normalizeDeityName(deity.name);
    if (!visibleDeityNames.has(deityName)) return totals;
    totals[deityName] = deityDonations[deityName] ?? 0;
    return totals;
  }, {});

  Object.entries(deityDonations).forEach(([deityName, donation]) => {
    const normalizedDeityName = normalizeDeityName(deityName);
    if (!visibleDeityNames.has(normalizedDeityName)) return;
    donationByDeity[normalizedDeityName] = Math.max(donationByDeity[normalizedDeityName] ?? 0, donation);
  });

  const donationRows = Object.entries(donationByDeity)
    .filter(([deityName]) => !isNoFaithDeity(deityName))
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0], 'ja'))
    .map(([deityName, donationGold]) => ({
      deityName,
      donationGold,
      rank: getDeityRank(donationGold),
      nextRankDonationRequirement: getNextRankDonationRequirement(donationGold),
    }));

  const compendiumItems = ITEMS
    .filter(item =>
      (debugSettings.displayAllCompendium || (gameState.global.revealedItemCompendiumItemIds ?? []).includes(item.id)) &&
      item.category === compendiumCategory &&
      matchesRarityFilter(item.id, compendiumRarityFilter)
    )
    .slice()
    .sort((a, b) => b.id - a.id);
  const CHARACTER_ROSTER_RACES: Array<{ id: RaceId; raceName: string }> = [
    { id: 'lupinian', raceName: 'Lupinian' },
    { id: 'vulpinian', raceName: 'Vulpinian' },
    { id: 'felidian', raceName: 'Felidian' },
    { id: 'caninian', raceName: 'Caninian' },
    { id: 'ursan', raceName: 'Ursan' },
    { id: 'procyonian', raceName: 'Procyonian' },
    { id: 'leporian', raceName: 'Leporian' },
    { id: 'cervin', raceName: 'Cervin' },
    { id: 'murid', raceName: 'Murid' },
    { id: 'kemoria', raceName: 'Kemoria' },
    { id: 'orcinian', raceName: 'Orcinian' },
    { id: 'avian', raceName: 'Avian' },
  ];
  const [characterRosterRaceId, setCharacterRosterRaceId] = useState<RaceId>('lupinian');
  const [characterRosterPartyId, setCharacterRosterPartyId] = useState<number>(1);
  const [characterRosterGenderFilter, setCharacterRosterGenderFilter] = useState<'male' | 'female' | 'unique'>('male');

  const rosterCharacterImageModules = useMemo(() => import.meta.glob('/public/character/*.png', { eager: true }), []);
  const availableRosterImageFiles = useMemo(() => {
    return new Set(
      Object.keys(rosterCharacterImageModules)
        .map((modulePath) => modulePath.split('/').pop())
        .filter((fileName): fileName is string => typeof fileName === 'string' && fileName.length > 0),
    );
  }, [rosterCharacterImageModules]);
  const getCharacterRosterImageFileName = (character: Character, partyId: number): string | null => {
    const uniquePartyMemberImageByName: Partial<Record<string, string>> = {
      'ケモ': 'Unique_Kemo.png', 'ライカ': 'Unique_Laika.png', 'ルナ': 'Unique_Luna.png', 'ノクス': 'Unique_Nox.png',
      'マーレ': 'Unique_Merle.png', 'プチーツァ': 'Unique_Puchitsa.png', '蒼牙破': 'Unique_Souga-ha.png', 'レナード': 'Unique_Leonard.png',
      '葉隠': 'Unique_Hagakure.png', 'フィン': 'Unique_Finn.png', 'オルカ': 'Unique_Orca.png', 'ミシュカ': 'Unique_Mishka.png',
    };
    if (character.isUnique) return uniquePartyMemberImageByName[character.name] ?? null;
    const raceMeta = CHARACTER_ROSTER_RACES.find((race) => race.id === character.raceId);
    const genderLabel = character.gender === 'male' ? 'Male' : character.gender === 'female' ? 'Female' : null;
    if (!raceMeta || !genderLabel) return null;
    return `${partyId}_${raceMeta.raceName}_${genderLabel}.png`;
  };
  const selectedRosterParty = gameState.parties.find((party) => party.id === characterRosterPartyId) ?? gameState.parties[0];
  const selectedRosterRace = RACES.find((race) => race.id === characterRosterRaceId);
  const activeRosterCharacter = characterRosterGenderFilter === 'unique'
    ? (selectedRosterParty?.characters ?? []).find((character) => character.raceId === characterRosterRaceId && character.isUnique) ?? null
    : {
      raceId: characterRosterRaceId,
      gender: characterRosterGenderFilter,
      isUnique: false,
      name: '',
    } as Character;
  const selectedRosterImageFile = activeRosterCharacter
    ? ((): string | null => {
      const raceMeta = CHARACTER_ROSTER_RACES.find((race) => race.id === characterRosterRaceId);
      if (characterRosterGenderFilter === 'unique') {
        return getCharacterRosterImageFileName(activeRosterCharacter, selectedRosterParty?.id ?? 1);
      }
      if (!raceMeta) return null;
      const genderLabel = characterRosterGenderFilter === 'male' ? 'Male' : 'Female';
      const partySpecificFile = `${selectedRosterParty?.id ?? 1}_${raceMeta.raceName}_${genderLabel}.png`;
      const fallbackFile = `${raceMeta.raceName}_${genderLabel}.png`;
      if (availableRosterImageFiles.has(partySpecificFile)) return partySpecificFile;
      if (availableRosterImageFiles.has(fallbackFile)) return fallbackFile;
      return null;
    })()
    : null;
  const selectedRosterImageSrc = selectedRosterImageFile ? `${import.meta.env.BASE_URL}character/${selectedRosterImageFile}` : null;
  const hasRosterGenderImage = useCallback((partyId: number, raceId: RaceId, gender: 'male' | 'female'): boolean => {
    const raceMeta = CHARACTER_ROSTER_RACES.find((race) => race.id === raceId);
    if (!raceMeta) return false;
    const genderLabel = gender === 'male' ? 'Male' : 'Female';
    const partySpecificFile = `${partyId}_${raceMeta.raceName}_${genderLabel}.png`;
    const fallbackFile = `${raceMeta.raceName}_${genderLabel}.png`;
    return availableRosterImageFiles.has(partySpecificFile) || availableRosterImageFiles.has(fallbackFile);
  }, [CHARACTER_ROSTER_RACES, availableRosterImageFiles]);

  const rosterBonusStatusEntries = (selectedRosterRace?.bonuses ?? [])
    .filter((bonus) => bonus.type !== 'ability')
    .map((bonus, index) => buildInlineBonusEntry('roster-race-bonus', selectedRosterRace?.id ?? 'none', bonus, index))
    .filter((entry): entry is { key: string; label: string; description: string | null } => entry !== null);

  const hasRosterUniqueCharacter = useCallback((partyId: number, raceId: RaceId): boolean => {
    const party = gameState.parties.find((entry) => entry.id === partyId);
    return (party?.characters ?? []).some((character) => character.raceId === raceId && character.isUnique);
  }, [gameState.parties]);
  const visibleRosterRaceIds = useMemo(() => (
    CHARACTER_ROSTER_RACES
      .filter((race) => gameState.parties.some((party) =>
        hasRosterGenderImage(party.id, race.id, 'male')
        || hasRosterGenderImage(party.id, race.id, 'female')
        || hasRosterUniqueCharacter(party.id, race.id),
      ))
      .map((race) => race.id)
  ), [CHARACTER_ROSTER_RACES, gameState.parties, hasRosterGenderImage, hasRosterUniqueCharacter]);
  const visibleRosterGenders = useMemo(() => {
    const partyId = selectedRosterParty?.id ?? 1;
    const genders: Array<'male' | 'female' | 'unique'> = [];
    if (hasRosterGenderImage(partyId, characterRosterRaceId, 'male')) genders.push('male');
    if (hasRosterGenderImage(partyId, characterRosterRaceId, 'female')) genders.push('female');
    if (hasRosterUniqueCharacter(partyId, characterRosterRaceId)) genders.push('unique');
    return genders;
  }, [characterRosterRaceId, hasRosterGenderImage, hasRosterUniqueCharacter, selectedRosterParty?.id]);
  useEffect(() => {
    if (visibleRosterRaceIds.length === 0) return;
    if (!visibleRosterRaceIds.includes(characterRosterRaceId)) {
      setCharacterRosterRaceId(visibleRosterRaceIds[0]);
    }
  }, [characterRosterRaceId, visibleRosterRaceIds]);
  useEffect(() => {
    if (visibleRosterGenders.length === 0) return;
    if (!visibleRosterGenders.includes(characterRosterGenderFilter)) {
      setCharacterRosterGenderFilter(visibleRosterGenders[0]);
    }
  }, [characterRosterGenderFilter, visibleRosterGenders]);
  const [activeRosterStatusBubble, setActiveRosterStatusBubble] = useState<{
    key: string;
    text: string;
    top: number;
    left: number;
    maxWidth: number;
  } | null>(null);

  const handleRosterStatusBubbleToggle = (
    bubbleKey: string,
    bubbleText: string,
    targetElement: HTMLElement,
  ) => {
    if (activeRosterStatusBubble?.key === bubbleKey) {
      setActiveRosterStatusBubble(null);
      return;
    }

    const triggerRect = targetElement.getBoundingClientRect();
    const viewportPadding = 12;
    const bubbleMaxWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - bubbleMaxWidth,
    );

    setActiveRosterStatusBubble({
      key: bubbleKey,
      text: bubbleText,
      top: triggerRect.bottom + 8,
      left,
      maxWidth: bubbleMaxWidth,
    });
  };

  const revealedGlossaryAbilityIds = useMemo(
    () => new Set(gameState.global.revealedGlossaryAbilityIds ?? []),
    [gameState.global.revealedGlossaryAbilityIds],
  );
  const revealedGlossaryTerrainKeys = useMemo(
    () => new Set(gameState.global.revealedGlossaryTerrainKeys ?? []),
    [gameState.global.revealedGlossaryTerrainKeys],
  );

  // SpecRef: 8.6 | UI_SETTING | Glossary (用語集)
  const filteredGlossarySections = GLOSSARY_SECTIONS.filter((section) => {
    // Section subtitles are localized display text, so use stable master-data IDs
    // for selection instead of language-specific subtitle prefixes.
    const glossarySectionIdsByTab: Record<GlossaryTabKey, string> = {
      能: '2-1-1',
      基: '2-1-2',
      固: '2-1-3',
      増: '2-1-4',
      属: '2-1-4',
      機: '2-1-6',
      信: '2-1-7',
      魔: '2-1-8',
      地: '2-1-10',
      求: '2-1-9',
    };

    return section.id === glossarySectionIdsByTab[glossaryTab];
  });


  type GlossaryTable = {
  headers: string[];
  rows: string[][];
  };

  const parseGlossaryTable = (lines: string[]): GlossaryTable | null => {
  if (lines.length < 2) return null;
  const headerLine = lines[0]?.trim();
  const dividerLine = lines[1]?.trim();
  if (!headerLine?.startsWith('|') || !headerLine.endsWith('|')) return null;
  if (!dividerLine?.startsWith('|') || !dividerLine.endsWith('|')) return null;

  const headers = headerLine.split('|').slice(1, -1).map((cell) => cell.trim());
  const dividerCells = dividerLine.split('|').slice(1, -1).map((cell) => cell.trim());
  if (headers.length === 0 || headers.length !== dividerCells.length) return null;
  if (!dividerCells.every((cell) => /^:?-{3,}:?$/.test(cell))) return null;

  const rows = lines
    .slice(2)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length === headers.length);

  if (rows.length === 0) return null;

  return { headers, rows };
  };
  const BESTIARY_TAB_LABELS: Record<number, string> = {
    1: t('setting.bestiary.tab.grassland'),
    2: t('setting.bestiary.tab.frost'),
    3: t('setting.bestiary.tab.sea'),
    4: t('setting.bestiary.tab.desert'),
    5: t('setting.bestiary.tab.flame'),
    6: t('setting.bestiary.tab.nest'),
    7: t('setting.bestiary.tab.moon'),
    8: t('setting.bestiary.tab.valley'),
    9: t('setting.bestiary.tab.gods'),
    99: t('setting.bestiary.tab.colosseum'),
  };

  const BESTIARY_SPECIAL_DUNGEON_ID_GODS = 9;
  const BESTIARY_SPECIAL_DUNGEON_ID_COLOSSEUM = 99;
  const isGodBestiaryTab = selectedBestiaryDungeonId === BESTIARY_SPECIAL_DUNGEON_ID_GODS;
  const isColosseumBestiaryTab = selectedBestiaryDungeonId === BESTIARY_SPECIAL_DUNGEON_ID_COLOSSEUM;

  // SpecRef: 8.6 | UI_SETTING | Bestiary (敵キャラクター図鑑)
  const unlockedBestiaryDungeonIds = new Set(
    DUNGEONS
      .filter((dungeon) => dungeon.id !== 99)
      .filter((dungeon) => debugSettings.displayAllBestiary || gameState.parties.some((party) => (
        isDungeonEntryUnlocked(party, dungeon.id)
      )))
      .map((dungeon) => dungeon.id)
  );

  const normalizeBestiaryGodName = (rawName: string): string => {
    const withoutBattleSuffix = rawName.replace(/\s*\(神魔戦\)\s*$/u, '').trim();
    const withoutRoleSuffix = withoutBattleSuffix.replace(/\([^)]*\)/gu, '').trim();
    const [head] = withoutRoleSuffix.split(/\s+/u);
    return (head ?? withoutRoleSuffix).trim();
  };

  const getGodBestiaryDisplayEnemyId = (god: (typeof GOD_ENEMY_PROFILES)[number]): number => god.enemyId;

  const getGodBestiaryBattleStats = (god: (typeof GOD_ENEMY_PROFILES)[number]): { defeats: number; encounters: number } => {
    const enemyBattleStats = gameState.global.enemyBattleStats ?? {};
    return enemyBattleStats[god.enemyId] ?? { defeats: 0, encounters: 0 };
  };

  // SpecRef: 8.6 | UI_SETTING | Bestiary (敵キャラクター図鑑)
  // Gods tab/rows are revealed only when god encounter count is at least 1 (遭遇数 > 0).
  const revealedGodBestiaryNames = new Set(
    GOD_ENEMY_PROFILES
      .filter((god) => {
        if (debugSettings.displayAllBestiary) return true;
        const runtimeEnemy = buildGodRuntimeEnemy(god);
        if (!runtimeEnemy) return false;
        const battleStats = getGodBestiaryBattleStats(god);
        return battleStats.encounters > 0;
      })
      .flatMap((god) => [god.name, normalizeBestiaryGodName(god.displayName)])
  );

  const bestiaryTabOptions = [
    ...DUNGEONS
      .filter((dungeon) => dungeon.id !== 99 && unlockedBestiaryDungeonIds.has(dungeon.id))
      .map((dungeon) => ({ id: dungeon.id, name: dungeon.name })),
    ...(revealedGodBestiaryNames.size > 0 ? [{ id: BESTIARY_SPECIAL_DUNGEON_ID_GODS, name: t('setting.bestiary.tab.gods') }] : []),
    ...(debugSettings.colosseumEnabled ? [{ id: BESTIARY_SPECIAL_DUNGEON_ID_COLOSSEUM, name: t('setting.bestiary.tab.colosseum') }] : []),
  ];


  useEffect(() => {
    if (selectedBestiaryDungeonId === BESTIARY_SPECIAL_DUNGEON_ID_GODS && revealedGodBestiaryNames.size === 0) {
      const fallbackDungeonId = [...unlockedBestiaryDungeonIds].sort((a, b) => a - b)[0] ?? 1;
      onSetSelectedBestiaryDungeonId(fallbackDungeonId);
      return;
    }
    if (selectedBestiaryDungeonId === BESTIARY_SPECIAL_DUNGEON_ID_GODS || selectedBestiaryDungeonId === BESTIARY_SPECIAL_DUNGEON_ID_COLOSSEUM) return;
    if (!unlockedBestiaryDungeonIds.has(selectedBestiaryDungeonId)) {
      const fallbackDungeonId = [...unlockedBestiaryDungeonIds].sort((a, b) => a - b)[0] ?? BESTIARY_SPECIAL_DUNGEON_ID_GODS;
      onSetSelectedBestiaryDungeonId(fallbackDungeonId);
    }
  }, [revealedGodBestiaryNames.size, unlockedBestiaryDungeonIds, selectedBestiaryDungeonId, onSetSelectedBestiaryDungeonId]);

  const selectedBestiaryDungeon = DUNGEONS.find(d => d.id === selectedBestiaryDungeonId && d.id !== 99) ?? DUNGEONS[0];

  const selectedBestiaryGroups = selectedBestiaryDungeon.floors
    ? selectedBestiaryDungeon.floors
      .slice()
      .sort((a, b) => b.floorNumber - a.floorNumber)
      .flatMap(floor => {
        const normalEnemyIds = floor.rooms
          ?.slice(0, 3)
          .flatMap((room) => room.enemyIds ?? [])
          .filter((enemyId, index, allIds) => allIds.indexOf(enemyId) === index) ?? [];

        const normalEnemies = normalEnemyIds
          .map((enemyId) => ENEMIES.find((enemy) => enemy.id === enemyId))
          .filter((enemy): enemy is EnemyDef => !!enemy && enemy.type === 'normal')
          .sort((a, b) => a.id - b.id);

        const groups: Array<{ key: string; label: string; enemies: EnemyDef[]; floorNumber: number; groupType: 'boss' | 'elite' | 'normal' }> = [];
        const room3EnemyIds = floor.rooms?.[2]?.enemyIds ?? [];
        const room3SpecialElites = room3EnemyIds
          .map((enemyId) => ENEMIES.find((enemy) => enemy.id === enemyId))
          .filter((enemy): enemy is EnemyDef => !!enemy && enemy.type === 'elite')
          .sort((a, b) => a.id - b.id);
        const floorEliteEnemyIds = floor.rooms?.[3]?.enemyIds ?? [];
        const fixedFloorElites = floorEliteEnemyIds
          .map((enemyId) => ENEMIES.find((enemy) => enemy.id === enemyId))
          .filter((enemy): enemy is EnemyDef => !!enemy && enemy.type === 'elite')
          .sort((a, b) => a.id - b.id);

        const floorConcept = getLocalizedExpeditionFloorConcept(selectedBestiaryDungeon.id, floor.floorNumber);
        const baseFloorLabel = floorConcept
          ? `Floor ${floor.floorNumber} ${floorConcept}`
          : `Floor ${floor.floorNumber}`;
        const specialFloorLabel = floorConcept
          ? `Floor ${floor.floorNumber}-3 ${floorConcept} (Special)`
          : `Floor ${floor.floorNumber}-3 (Special)`;
        const eliteFloorLabel = floorConcept
          ? `Floor ${floor.floorNumber}-4 ${floorConcept} Elite`
          : `Floor ${floor.floorNumber}-4 Elite`;

        if (floor.floorNumber === 6) {
          const bossEnemy = ENEMIES.find(enemy => enemy.id === selectedBestiaryDungeon.bossId);
          if (bossEnemy) {
            groups.push({
              key: 'boss',
              label: floorConcept ? `BOSS ${floorConcept}` : 'BOSS',
              enemies: [bossEnemy],
              floorNumber: floor.floorNumber,
              groupType: 'boss',
            });
          }

          if (room3SpecialElites.length > 0) {
            groups.push({
              key: `floor-${floor.floorNumber}-room-3-special`,
              label: specialFloorLabel,
              enemies: room3SpecialElites,
              floorNumber: floor.floorNumber,
              groupType: 'elite',
            });
          }

          groups.push({
            key: 'floor-6',
            label: baseFloorLabel,
            enemies: normalEnemies,
            floorNumber: floor.floorNumber,
            groupType: 'normal',
          });
          return groups;
        }

        if (fixedFloorElites.length > 0) {
          groups.push({
            key: `floor-${floor.floorNumber}-elite`,
            label: eliteFloorLabel,
            enemies: fixedFloorElites,
            floorNumber: floor.floorNumber,
            groupType: 'elite',
          });
        }

        if (room3SpecialElites.length > 0) {
          groups.push({
            key: `floor-${floor.floorNumber}-room-3-special`,
            label: specialFloorLabel,
            enemies: room3SpecialElites,
            floorNumber: floor.floorNumber,
            groupType: 'elite',
          });
        }

        groups.push({
          key: `floor-${floor.floorNumber}`,
          label: baseFloorLabel,
          enemies: normalEnemies,
          floorNumber: floor.floorNumber,
          groupType: 'normal',
        });

        return groups;
      })
    : [];

  const godBestiaryRows = GOD_ENEMY_PROFILES
    .filter((god) => revealedGodBestiaryNames.has(god.name) || revealedGodBestiaryNames.has(normalizeBestiaryGodName(god.displayName)))
    .slice()
    .sort((a, b) => (a.tier - b.tier) || a.name.localeCompare(b.name));

  const formatEnemyAttackLine = (label: string, attack: number, noA: number, amplifier: number) =>
    t('home.enemy.attackLine', { label, attack: formatNumber(attack), count: formatNumber(noA), amplifier: amplifier.toFixed(2) });

  const hasEnemyAttack = (attack: number, noA: number) => attack > 0 && noA > 0;
  const hasEnemyMagicCasting = (enemy: EnemyDef) =>
    hasEnemyAttack(enemy.magicalAttack, enemy.magicalNoA)
    || (enemy.bonuses ?? []).some((bonus) => bonus.type === 'caster' || bonus.type === 'equip_magic');

  const formatEnemyDefenseLine = (label: string, defense: number, percent: number) =>
    t('home.enemy.defenseLine', { label, defense: formatNumber(defense), percent: percent.toFixed(0) });

  const ENEMY_ELEMENT_ICONS: Record<string, UiIconKey> = {
    fire: 'fire',
    thunder: 'thunder',
    ice: 'ice',
  };

  const formatEnemyElementOffenseLine = (elementalOffense: string, elementalOffenseValue: number): ReactNode => {
    const elementIcon = ENEMY_ELEMENT_ICONS[elementalOffense];
    return (
      <>
        {t('home.enemy.element')}: {elementIcon ? renderUiIcon(elementIcon) : t('home.enemy.noElement')} (x{elementalOffenseValue.toFixed(2)})
      </>
    );
  };

  const renderEnemyElementalResistanceLine = (enemy: EnemyDef): JSX.Element => {
    return renderElementalResistanceInline(enemy.elementalResistance);
  };

  const ENEMY_TYPE_LABELS: Record<string, string> = {
    Beast: t('setting.bestiary.enemyType.Beast'),
    Slime_Colony: t('setting.bestiary.enemyType.Slime_Colony'),
    Plant_Fungal: t('setting.bestiary.enemyType.Plant_Fungal'),
    Insect_Swarm: t('setting.bestiary.enemyType.Insect_Swarm'),
    Aerial: t('setting.bestiary.enemyType.Aerial'),
    Frost: t('setting.bestiary.enemyType.Frost'),
    Fruit: t('setting.bestiary.enemyType.Fruit'),
    Dragon: t('setting.bestiary.enemyType.Dragon'),
    Spirit: t('setting.bestiary.enemyType.Spirit'),
    Ghost: t('setting.bestiary.enemyType.Ghost'),
    Undead: t('setting.bestiary.enemyType.Undead'),
    Golem: t('setting.bestiary.enemyType.Golem'),
    Shadowfang: t('setting.bestiary.enemyType.Shadowfang'),
    Mech: t('setting.bestiary.enemyType.Mech'),
    Chiropteran: t('setting.bestiary.enemyType.Chiropteran'),
    Chimera: t('setting.bestiary.enemyType.Chimera'),
    Titan: t('setting.bestiary.enemyType.Titan'),
    Pony: t('setting.bestiary.enemyType.Pony'),
    Origami: t('setting.bestiary.enemyType.Origami'),
    Jinma: t('setting.bestiary.enemyType.Jinma'),
    Orcinian: t('setting.bestiary.enemyType.Orcinian'),
    Caninian: t('setting.bestiary.enemyType.Caninian'),
    Lupinian: t('setting.bestiary.enemyType.Lupinian'),
    Vulpinian: t('setting.bestiary.enemyType.Vulpinian'),
    Ursan: t('setting.bestiary.enemyType.Ursan'),
    Felidian: t('setting.bestiary.enemyType.Felidian'),
    Mustelid: t('setting.bestiary.enemyType.Mustelid'),
    Leporian: t('setting.bestiary.enemyType.Leporian'),
    Cervin: t('setting.bestiary.enemyType.Cervin'),
    Procyonian: t('setting.bestiary.enemyType.Procyonian'),
    Murid: t('setting.bestiary.enemyType.Murid'),
  };

  const ENEMY_CLASS_LABELS: Record<string, string> = {
    guardian: t('setting.bestiary.enemyClass.guardian'),
    duelist: t('setting.bestiary.enemyClass.duelist'),
    samurai: t('setting.bestiary.enemyClass.samurai'),
    'sword-saint': t('setting.bestiary.enemyClass.sword-saint'),
    ranger: t('setting.bestiary.enemyClass.ranger'),
    striker: t('setting.bestiary.enemyClass.striker'),
    ninja: t('setting.bestiary.enemyClass.ninja'),
    wizard: t('setting.bestiary.enemyClass.wizard'),
    sage: t('setting.bestiary.enemyClass.sage'),
    alchemist: t('setting.bestiary.enemyClass.alchemist'),
    pilgrim: t('setting.bestiary.enemyClass.pilgrim'),
    lord: t('setting.bestiary.enemyClass.lord'),
    fighter: t('setting.bestiary.enemyClass.fighter'),
    rogue: t('setting.bestiary.enemyClass.rogue'),
  };

  const getBestiaryEnemyBattleStats = (enemyId: number) => gameState.global.enemyBattleStats?.[enemyId] ?? { defeats: 0, encounters: 0 };

  const getBestiaryClassRows = (
    mainClassId: string,
    subClassId?: string | 'none',
  ): JSX.Element[] => {
    // SpecRef: 8.6 | UI_SETTING | Bestiary (敵キャラクター図鑑)
    const mainClassLabel = ENEMY_CLASS_LABELS[mainClassId] ?? mainClassId;
    const hasSubClass = !!subClassId && subClassId !== 'none';
    if (!hasSubClass) {
      return [<div key="main">{t('setting.bestiary.mainClass', { className: mainClassLabel })}</div>];
    }

    const subClassLabel = ENEMY_CLASS_LABELS[subClassId] ?? subClassId;
    if (mainClassId === subClassId) {
      return [<div key="main">{t('setting.bestiary.masterClass', { className: mainClassLabel })}</div>];
    }

    return [
      <div key="main">{t('setting.bestiary.mainClass', { className: mainClassLabel })}</div>,
      <div key="sub">{t('setting.bestiary.subClass', { className: subClassLabel })}</div>,
    ];
  };

  const ENEMY_EDIT_CLASS_OPTIONS = [
    'duelist', 'samurai', 'sword-saint',
    'ranger', 'striker', 'ninja',
    'wizard', 'sage', 'alchemist',
    'guardian', 'pilgrim', 'lord',
  ] as const;

  const getDisplayEnemy = (
    enemy: EnemyDef,
    dungeon: Dungeon,
    floorNumber: number,
    groupType: 'boss' | 'elite' | 'normal'
  ): EnemyDef => {
    const roomType = groupType === 'boss' ? 'battle_Boss' : groupType === 'elite' ? 'battle_Elite' : 'battle_Normal';
    const effectiveTier = getEffectiveExpeditionTier(dungeon.id, false);
    const effectiveDungeon = {
      ...dungeon,
      tier: effectiveTier,
      enemyMultipliers: getEffectiveEnemyMultipliers(dungeon, false),
    };
    return getEncounterEnemyWithScaling(enemy, effectiveDungeon, floorNumber, roomType, { isLunaMode: false });
  };

  const getGodRuntimeEnemy = (god: (typeof GOD_ENEMY_PROFILES)[number]): EnemyDef | null =>
    buildGodRuntimeEnemy(god);

  const getGodDropCandidates = (godName: string): string => {
    const drops = GOD_MYTHIC_DROPS
      .filter((drop) => drop.dropBy === godName)
      .map((drop) => `${getRarityShortLabel(drop.tier * 1000 + 500)}${drop.name}`);
    return drops.length > 0 ? drops.join(' / ') : t('common.none');
  };

  const getAbilityHelpDescription = (abilityId: string, level: number): string => {
    const bonusAbilityEntry = BONUS_ABILITY_GLOSSARY_ENTRY_BY_ABILITY_ID.get(abilityId as AbilityId);
    if (bonusAbilityEntry) {
      return formatBonusAbilityHelpDescription(abilityId as AbilityId, level);
    }

    const levelDescriptionKey = ABILITY_HELP_TEXT_KEYS[`${abilityId}:${level}`];
    if (levelDescriptionKey) return t(levelDescriptionKey);
    const abilityDescriptionKey = ABILITY_HELP_TEXT_KEYS[abilityId];
    return abilityDescriptionKey ? t(abilityDescriptionKey) : t('home.abilityHelp.unconfigured');
  };

  const getAbilityHelpText = (abilityId: string, level: number, abilityLabel: string): { title: string; description: string } => ({
    title: abilityLabel,
    description: getAbilityHelpDescription(abilityId, level),
  });

  const getBonusAbilityGlossaryDisplayLabel = (abilityId: AbilityId): string => {
    const entry = BONUS_ABILITY_GLOSSARY_ENTRY_BY_ABILITY_ID.get(abilityId);
    if (!entry) return ABILITY_NAMES[abilityId] ?? abilityId;
    return entry.label;
  };

  const parseAbilityTokens = (abilities: Array<{ id: string; level: number }>) => {
    // SpecRef: 4.1.2 | Enemy | x.ability
    if (abilities.length === 0) {
      return [{ key: 'none', label: t('common.none'), abilityId: '', level: 0, isMissing: true }];
    }

    const highestAbilityLevelById = new Map<string, number>();
    abilities.forEach((ability) => {
      highestAbilityLevelById.set(ability.id, Math.max(highestAbilityLevelById.get(ability.id) ?? 0, ability.level));
    });

    return Array.from(highestAbilityLevelById.entries()).map(([abilityId, level], index) => ({
      key: `${abilityId}-${level}-${index}`,
      label: `${ABILITY_NAMES[abilityId] ?? abilityId}${level}`,
      abilityId,
      level,
      isMissing: false,
    }));
  };

  const handleAbilityHelpToggle = (
    abilityId: string,
    level: number,
    abilityLabel: string,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    const key = `${abilityId}:${level}`;
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const viewportPadding = 12;
    const tooltipWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - tooltipWidth,
    );

    setActiveAbilityHelp((current) => {
      if (current?.key === key) {
        setAbilityHelpPosition(null);
        return null;
      }

      setAbilityHelpPosition({
        top: triggerRect.bottom + 8,
        left,
        width: tooltipWidth,
      });

      return { key, ...getAbilityHelpText(abilityId, level, abilityLabel) };
    });
  };

  return (
    <div
      className="setting-tab"
      onPointerDown={() => {
        if (activeAbilityHelp) {
          setActiveAbilityHelp(null);
          setAbilityHelpPosition(null);
        }
        if (activeRosterStatusBubble) {
          setActiveRosterStatusBubble(null);
        }
      }}
    >
      {activeAbilityHelp && abilityHelpPosition && (
        <FloatingBubblePortal>
          <div
            className="floating-bubble-pane fixed z-50 rounded-lg p-3"
            style={{
              top: abilityHelpPosition.top,
              left: abilityHelpPosition.left,
              width: abilityHelpPosition.width,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="text-xs text-gray-700">
              <span className="font-semibold text-gray-800">{activeAbilityHelp.title}</span>
              <span>：{activeAbilityHelp.description}</span>
            </div>
          </div>
        </FloatingBubblePortal>
      )}
      {/* SpecRef: 8.6 | UI_SETTING | Developer News Notification (通知) */}
      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10" onPointerDown={() => setActiveRosterStatusBubble(null)}>
        {renderSettingPanelHeader('news', 'News')}
        {settingPanelExpanded.news && (
          <div className="mt-3 overflow-hidden rounded border border-gray-200 bg-white text-sm pane-button-shadow">
            {DEVELOPER_NEWS_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onMarkDeveloperNewsRead([item.id])}
                className="block w-full space-y-1 border-b border-gray-100 p-3 text-left last:border-b-0"
              >
                <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">{item.version}</span>
                  <span>{item.date}</span>
                </div>
                <p className={`text-gray-700 ${unreadDeveloperNewsItems.some((unreadItem) => unreadItem.id === item.id) ? 'font-bold' : 'font-normal'}`}>
                  {getDeveloperNewsContent(item, gameState.global.language)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10" onPointerDown={() => setActiveRosterStatusBubble(null)}>
        {renderSettingPanelHeader('donation', t('setting.donation.title'))}
        {settingPanelExpanded.donation && <div className="bg-white rounded p-2 text-sm space-y-1 mt-3 pane-button-shadow">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-500 border-b border-gray-100 pb-1 mb-1">
            <span>{t('setting.donation.deity')}</span>
            <span>{t('setting.donation.amount')}</span>
          </div>
          {donationRows.length > 0 ? (
            donationRows.map(({ deityName, donationGold, rank, nextRankDonationRequirement }) => (
              <div key={deityName} className="flex items-center justify-between gap-3">
                <span className="text-gray-700">{t('setting.donation.deityRank', { deity: deityName, rank })}</span>
                <span className="text-sub tabular-nums">{formatNumber(donationGold)}G <span className="text-xs text-gray-500">{t('setting.donation.nextRequirement', { amount: nextRankDonationRequirement !== null ? `${formatNumber(nextRankDonationRequirement)}G` : t('setting.donation.maxRank') })}</span></span>
              </div>
            ))
          ) : (
            <div className="text-gray-500">{t('setting.donation.noRecords')}</div>
          )}
        </div>}
      </div>

      {/* SpecRef: 8.6 | UI_SETTING | Clairvoyance (未来視) */}
      {(debugSettings.clairvoyanceEnabled || gameState.parties.some((party) => getSettingPartyAbilityLevel(party, 'prophecy') >= 1)) && <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('clairvoyance', t('setting.clairvoyance.title'))}
        {settingPanelExpanded.clairvoyance && <div className="mt-3 space-y-3">
          {gameState.parties.map((party, partyIndex) => {
            const prophecyLevel = getSettingPartyAbilityLevel(party, 'prophecy');
            const isPaneVisible = debugSettings.clairvoyanceEnabled || prophecyLevel >= 1;
            if (!isPaneVisible) {
              return null;
            }

            const canResetBags = debugSettings.clairvoyanceEnabled || prophecyLevel >= 2;
            const partyBags = party.bags;
            const isExpanded = clairvoyancePartyExpanded[partyIndex] === true;
            return <div key={`clairvoyance-${party.id}`} className="rounded border border-gray-200 bg-white p-2 pane-button-shadow">
              <button type="button" className="flex w-full items-center justify-between text-left font-semibold" onClick={() => setClairvoyancePartyExpanded((prev) => ({ ...prev, [partyIndex]: !isExpanded }))}>
                <span>PT{partyIndex + 1} {isExpanded ? '▲' : '▼'}</span>
              </button>
              {isExpanded && <div className="mt-2 space-y-3 text-sm">
                <div className="rounded border border-gray-300 bg-gray-100 p-2 space-y-1 pane-button-shadow-soft">
                  <div className="text-xs font-semibold text-gray-700 tracking-wide">{t('setting.clairvoyance.common')}</div>
                  <div className="flex items-start justify-between gap-3">
                    <div>{t('setting.clairvoyance.commonRewards')}: <span className="tabular-nums">{formatNumber(getBagTicketTotal(partyBags.commonRewardBag))} / {formatNumber(commonRewardTotal)}</span></div>
                    <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.hitsRemaining')} <span className="tabular-nums">{formatNumber(getBagEntryTickets(partyBags.commonRewardBag, 1))}</span></div>
                  </div>
                  <div>{t('setting.clairvoyance.commonEnhancement')}: {formatNumber(getBagTicketTotal(partyBags.commonEnhancementBag))} / {formatNumber(commonEnhancementTotal)}</div>
                  <div className="pl-1 text-xs text-gray-500">
                    {enhancementCountTargets.map(({ value }) => {
                      const initialCount = ENHANCEMENT_TITLES.find((title) => title.value === value)?.tickets ?? 0;
                      return (
                        <div key={`common-enhancement-${party.id}-${value}`} className="grid grid-cols-[2.25rem_minmax(0,1fr)_6.5rem] items-center gap-x-4 leading-5">
                          <span className="tabular-nums text-right text-gray-400">{value}</span>
                          <span>{t('setting.enhancementRemaining', { title: getLocalizedEnhancementTitle(value) })}</span>
                          <span className="tabular-nums text-right">{formatNumber(getBagEntryTickets(partyBags.commonEnhancementBag, value))} / {formatNumber(initialCount)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div>{t('setting.clairvoyance.commonSuperRare')}: {formatNumber(getBagTicketTotal(partyBags.commonSuperRareBag))} / {formatNumber(commonSuperRareTotal)}</div>
                  <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.superRareRemaining')} {formatNumber(superRareHitTotal === 0 ? 0 : SUPER_RARE_TITLES.reduce((sum, title) => sum + (title.value > 0 ? getBagEntryTickets(partyBags.commonSuperRareBag, title.value) : 0), 0))} / {formatNumber(superRareHitTotal)}</div>
                  {canResetBags && <button onClick={() => confirmReset(t('setting.clairvoyance.resetCommonRewards'), () => onResetCommonBags(partyIndex))} className="w-full py-1 bg-sub text-white rounded text-xs">{t('setting.clairvoyance.resetCommonRewards')}</button>}
                </div>
                <div className="rounded border border-gray-300 bg-gray-100 p-2 space-y-1 pane-button-shadow-soft">
                  <div className="text-xs font-semibold text-gray-700 tracking-wide">{t('setting.clairvoyance.otherRarities')}</div>
                  <div className="flex items-start justify-between gap-3">
                    <div>{t('setting.clairvoyance.uncommonRewards')}: <span className="tabular-nums">{formatNumber(getBagTicketTotal(partyBags.uncommonRewardBag))} / {formatNumber(uniqueRewardTotal)}</span></div>
                    <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.hitsRemaining')} <span className="tabular-nums">{formatNumber(getBagEntryTickets(partyBags.uncommonRewardBag, 1))}</span></div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>{t('setting.clairvoyance.eliteRareRewards')}: <span className="tabular-nums">{formatNumber(getBagTicketTotal(partyBags.eliteRareRewardBag))} / {formatNumber(uniqueRewardTotal)}</span></div>
                    <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.hitsRemaining')} <span className="tabular-nums">{formatNumber(getBagEntryTickets(partyBags.eliteRareRewardBag, 1))}</span></div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>{t('setting.clairvoyance.bossRareRewards')}: <span className="tabular-nums">{formatNumber(getBagTicketTotal(partyBags.bossRareRewardBag))} / {formatNumber(uniqueRewardTotal)}</span></div>
                    <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.hitsRemaining')} <span className="tabular-nums">{formatNumber(getBagEntryTickets(partyBags.bossRareRewardBag, 1))}</span></div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>{t('setting.clairvoyance.mythicRareRewards')}: <span className="tabular-nums">{formatNumber(getBagTicketTotal(partyBags.mythicRareRewardBag))} / {formatNumber(mythicRewardTotal)}</span></div>
                    <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.hitsRemaining')} <span className="tabular-nums">{formatNumber(getBagEntryTickets(partyBags.mythicRareRewardBag, 1))}</span></div>
                  </div>
                  <div>{t('setting.clairvoyance.enhancement')}: {formatNumber(getBagTicketTotal(partyBags.enhancementBag))} / {formatNumber(enhancementTotal)}</div>
                  <div className="pl-1 text-xs text-gray-500">
                    {enhancementCountTargets.map(({ value }) => {
                      const initialCount = ENHANCEMENT_TITLES.find((title) => title.value === value)?.tickets ?? 0;
                      return (
                        <div key={`enhancement-${party.id}-${value}`} className="grid grid-cols-[2.25rem_minmax(0,1fr)_6.5rem] items-center gap-x-4 leading-5">
                          <span className="tabular-nums text-right text-gray-400">{value}</span>
                          <span>{t('setting.enhancementRemaining', { title: getLocalizedEnhancementTitle(value) })}</span>
                          <span className="tabular-nums text-right">{formatNumber(getBagEntryTickets(partyBags.enhancementBag, value))} / {formatNumber(initialCount)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div>{t('setting.clairvoyance.superRareEnhancement')}: {formatNumber(getBagTicketTotal(partyBags.rareSuperRareBag))} / {formatNumber(rareSuperRareTotal)}</div>
                  <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.superRareRemaining')} {formatNumber(superRareHitTotal === 0 ? 0 : SUPER_RARE_TITLES.reduce((sum, title) => sum + (title.value > 0 ? getBagEntryTickets(partyBags.rareSuperRareBag, title.value) : 0), 0))} / {formatNumber(superRareHitTotal)}</div>
                  {canResetBags && <button onClick={() => confirmReset(t('setting.clairvoyance.resetRewards'), () => onResetUniqueBags(partyIndex))} className="w-full py-1 bg-sub text-white rounded text-xs">{t('setting.clairvoyance.resetRewards')}</button>}
                </div>
                <div className="rounded border border-gray-300 bg-gray-100 p-2 space-y-1 pane-button-shadow-soft">
                  <div className="text-xs font-semibold text-gray-700 tracking-wide">{t('setting.clairvoyance.sideQuest')}</div>
                  {/* SpecRef: 8.6 | UI_SETTING | サイドクエスト */}
                  <div>{t('setting.clairvoyance.sideQuestDraw')}: {formatNumber(getBagTicketTotal(partyBags.sideQuestBag))} / {formatNumber(sideQuestTotal)}</div>
                  <div className="text-xs text-gray-500 text-right">
                    {t('setting.clairvoyance.hitsRemaining')} {formatNumber(sideQuestDefaultBag.entries.reduce((sum, entry) => (
                      entry.id > 0 ? sum + getBagEntryTickets(partyBags.sideQuestBag, entry.id) : sum
                    ), 0))}
                  </div>
                  {canResetBags && <button onClick={() => confirmReset(t('setting.clairvoyance.resetSideQuest'), () => onResetSideQuestBag(partyIndex))} className="w-full py-1 bg-sub text-white rounded text-xs">{t('setting.clairvoyance.resetSideQuest')}</button>}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>{t('setting.clairvoyance.sleepinessDraw')}: {formatNumber(getBagTicketTotal(normalizeSleepinessPartyBag(party.sleepinessOfPartyBag)))} / {formatNumber(getBagTicketTotal(sleepinessDefaultBag))}</div>
                  <div className="text-xs text-gray-500 text-right">
                    {t('setting.clairvoyance.sleepinessOutcomes', { awake: formatNumber(getBagEntryTickets(normalizeSleepinessPartyBag(party.sleepinessOfPartyBag), 0)), nap: formatNumber(getBagEntryTickets(normalizeSleepinessPartyBag(party.sleepinessOfPartyBag), 1)), deepSleep: formatNumber(getBagEntryTickets(normalizeSleepinessPartyBag(party.sleepinessOfPartyBag), 2)) })}
                  </div>
                </div>
              </div>}
            </div>;
          })}
        </div>}
      </div>}

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('glossary', t('setting.glossary.title'))}
        {settingPanelExpanded.glossary && (
          <>
          <div className="mt-3 mb-3 flex max-h-20 flex-wrap items-center justify-start gap-1 overflow-y-auto pr-1">
            {GLOSSARY_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setGlossaryTab(tab)}
                className={`shrink-0 text-xs px-2 py-0.5 border rounded shadow-sm shadow-slate-900/10 ${
                  glossaryTab === tab
                    ? 'bg-sub text-white border-sub'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {GLOSSARY_TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          <div className="space-y-3 pr-1">
            {filteredGlossarySections.map((section) => (
              <div key={section.id} className="bg-white rounded p-2 border border-gray-200 shadow-sm shadow-slate-900/10">
                {(() => {
                  const isBonusAbilityGlossarySection = section.heading === '2.1.1 a. bonus ability';
                  const activeBonusAbilitySubcategory = BONUS_ABILITY_GLOSSARY_SUBCATEGORY_META.find(
                    (subcategory) => subcategory.id === bonusAbilityGlossarySubcategory,
                  );
                  return (
                    <>
                      <div className="text-xs leading-tight mb-2">
                        {(() => {
                          const suffixMatch = section.subtitle.match(/\(([^)]*)\)\s*$/);
                          const titleText = section.subtitle.replace(/\s*\([^)]*\)\s*$/, '');
                          return (
                            <>
                              <span className="font-semibold text-gray-700">{titleText}</span>
                              {suffixMatch && <span className="text-gray-500"> {suffixMatch[0]}</span>}
                            </>
                          );
                        })()}
                      </div>
                      {isBonusAbilityGlossarySection && (
                        <div className="mb-2 flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {BONUS_ABILITY_GLOSSARY_SUBCATEGORY_META.map((subcategory) => {
                              const isActive = subcategory.id === bonusAbilityGlossarySubcategory;
                              return (
                                <button
                                  key={subcategory.id}
                                  type="button"
                                  onClick={() => setBonusAbilityGlossarySubcategory(subcategory.id)}
                                  className={`rounded border px-2 py-0.5 text-[11px] ${
                                    isActive
                                      ? 'border-sub bg-sub text-white'
                                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'
                                  }`}
                                  title={t(subcategory.labelKey)}
                                  aria-pressed={isActive}
                                >
                                  {t(subcategory.shortLabelKey)}
                                </button>
                              );
                            })}
                          </div>
                          <div className="text-[11px] text-gray-500">{activeBonusAbilitySubcategory?.labelKey ? t(activeBonusAbilitySubcategory.labelKey) : null}</div>
                        </div>
                      )}
                      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                        {isBonusAbilityGlossarySection
                          // SpecRef: 1.0.3 | Glossary Reveal Rule | ability visibility
                          ? LOCALIZED_BONUS_ABILITY_GLOSSARY_ENTRIES
                            .filter((entry) => entry.subcategory === bonusAbilityGlossarySubcategory)
                            .filter((entry) => debugSettings.displayAllGlossary || revealedGlossaryAbilityIds.has(entry.abilityId))
                            .map((entry, index) => {
                              const entryKey = `${section.id}-${entry.abilityId}-${index}`;
                              const displayLabel = getBonusAbilityGlossaryDisplayLabel(entry.abilityId);

                              return (
                                <div key={entryKey} className="text-xs border-t border-gray-100 pt-1 first:border-t-0 first:pt-0">
                                  <div className="leading-5">
                                    <span className="font-semibold text-gray-900">{displayLabel}</span>
                                    <span className="text-gray-900"> {entry.description}</span>
                                    {entry.levelScale.length > 0 && (
                                      <span className="text-gray-500"> ({entry.levelScale.map(formatBonusAbilityPhaseDisplay).join(', ')})</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          : section.entries.map((entry, index) => {
                            // SpecRef: 1.0.3 | Glossary Reveal Rule | terrain visibility
                            const isTerrainGlossarySection = section.heading === '1.1.10 t. terrain effects';
                            if (isTerrainGlossarySection && !debugSettings.displayAllGlossary && !revealedGlossaryTerrainKeys.has(entry.key as TerrainEffectKey)) {
                              return null;
                            }
                            const isSideQuestGlossarySection = section.id === '2-1-9';
                            if (isSideQuestGlossarySection && entry.key === 'q.none') {
                              return null;
                            }
                            const entryKey = `${section.id}-${entry.key}-${index}`;
                            const isElementalEntry = entry.key.includes('elemental');
                            if (glossaryTab === '属' && !isElementalEntry) {
                              return null;
                            }
                            if (glossaryTab === '増' && isElementalEntry) {
                              return null;
                            }
                            const isGodGlossarySection = section.id === '2-1-7';
                            const shouldCollapseEntry = glossaryTab === '増' || glossaryTab === '属';
                            const useDefaultGlossaryTextColor = glossaryTab === '増' || glossaryTab === '属';
                            const isEntryExpanded = !shouldCollapseEntry || expandedGlossaryEntries[entryKey] === true;
                            const descriptionLines = entry.description.split('\n');
                            const normalizedDescriptionLines = isSideQuestGlossarySection
                              ? descriptionLines
                                .map((line) => {
                                  const trimmedLine = line.trim();
                                  if (!trimmedLine.startsWith('表示:')) {
                                    return line;
                                  }
                                  return trimmedLine.replace(/^表示:\s*/, '');
                                })
                                .filter((line) => line.trim().length > 0)
                              : descriptionLines;
                            const hasStyleMetadata = normalizedDescriptionLines[0]?.trim().startsWith('style:') ?? false;
                            const visibleDescriptionLines = hasStyleMetadata ? normalizedDescriptionLines.slice(1) : normalizedDescriptionLines;
                            const mainDescription = visibleDescriptionLines[0] ?? '';
                            const loreLines = visibleDescriptionLines.slice(1);
                            const firstTableLineIndex = loreLines.findIndex((line) => line.trim().startsWith('|'));
                            const lorePrefixLines = firstTableLineIndex >= 0 ? loreLines.slice(0, firstTableLineIndex) : loreLines;
                            const tableCandidateLines = firstTableLineIndex >= 0 ? loreLines.slice(firstTableLineIndex) : [];
                            const glossaryTable = parseGlossaryTable(tableCandidateLines);

                            return (
                              <div key={entryKey} className="text-xs border-t border-gray-100 pt-1 first:border-t-0 first:pt-0">
                                {shouldCollapseEntry ? (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedGlossaryEntries((prev) => ({ ...prev, [entryKey]: !isEntryExpanded }))}
                                    className="w-full flex items-center justify-between gap-2 text-left"
                                    aria-label={t(isEntryExpanded ? 'setting.glossary.collapseEntry' : 'setting.glossary.expandEntry', { label: entry.label })}
                                  >
                                    <div className="text-gray-700 font-medium">{renderTextWithRaceIcons(entry.label)}</div>
                                    <span className="text-[11px] text-gray-500 hover:text-gray-700">{isEntryExpanded ? '▼' : '▲'}</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-gray-700 font-medium">{renderTextWithRaceIcons(entry.label)}</div>
                                  </div>
                                )}
                                {isEntryExpanded && (
                                  <>
                                    <div className={`${useDefaultGlossaryTextColor ? 'text-gray-700' : 'text-gray-500'} whitespace-pre-line`}>{renderTextWithRaceIcons(mainDescription)}</div>
                                    {isGodGlossarySection && loreLines.map((line, lineIndex) => (
                                      <div key={`${section.id}-${entry.key}-${index}-lore-${lineIndex}`} className={`${useDefaultGlossaryTextColor ? 'text-gray-700' : 'text-gray-500'} italic whitespace-pre-line`}>
                                        {renderTextWithRaceIcons(line)}
                                      </div>
                                    ))}
                                    {!isGodGlossarySection && lorePrefixLines.length > 0 && (
                                      <div className={`${useDefaultGlossaryTextColor ? 'text-gray-700' : 'text-gray-500'} whitespace-pre-line`}>{renderTextWithRaceIcons(lorePrefixLines.join('\n'))}</div>
                                    )}
                                    {!isGodGlossarySection && glossaryTable && (
                                      <div className="mt-1 rounded border border-gray-200 bg-white px-2 py-1">
                                        <table className="w-full table-fixed text-xs">
                                          <thead>
                                            <tr className={`border-b border-gray-100 ${useDefaultGlossaryTextColor ? 'text-gray-700' : 'text-gray-500'}`}>
                                              {glossaryTable.headers.map((header, headerIndex) => (
                                                <th
                                                  key={`${section.id}-${entry.key}-table-header-${headerIndex}`}
                                                  className={`py-1 font-medium ${
                                                    headerIndex === glossaryTable.headers.length - 1 ? 'text-right' : 'text-left'
                                                  }`}
                                                >
                                                  {renderTextWithRaceIcons(header)}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {glossaryTable.rows.map((row, rowIndex) => (
                                              <tr key={`${section.id}-${entry.key}-table-row-${rowIndex}`} className="text-gray-700">
                                                {row.map((cell, cellIndex) => (
                                                  <td
                                                    key={`${section.id}-${entry.key}-table-row-${rowIndex}-cell-${cellIndex}`}
                                                    className={`py-1 align-top ${
                                                      cellIndex === row.length - 1
                                                        ? `text-right tabular-nums ${useDefaultGlossaryTextColor ? 'text-gray-700' : 'text-sub'}`
                                                        : 'text-left'
                                                    }`}
                                                  >
                                                    {renderTextWithRaceIcons(cell)}
                                                  </td>
                                                ))}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('itemCompendium', t('setting.itemCompendium.title'))}
        {settingPanelExpanded.itemCompendium && <>
        <div className="flex justify-end items-center gap-1 mt-3 mb-3">
          <span className="text-xs text-gray-500">
            {compendiumRarityFilter === 'all' ? t('party.rarity.showAll') : t('party.rarity.only', { rarity: getRarityFilterNote(compendiumRarityFilter) })}
          </span>
          {RARITY_FILTER_OPTIONS.map(filter => (
            <button
              key={filter}
              onClick={() => setCompendiumRarityFilter(filter)}
              className={`text-xs px-1.5 py-0.5 border rounded shadow-sm shadow-slate-900/10 ${
                compendiumRarityFilter === filter
                  ? 'bg-sub text-white border-sub'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
              title={getRarityFilterNote(filter)}
            >
              {RARITY_FILTER_LABELS[filter]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {CATEGORY_GROUPS.map(group => (
            <div key={group.id} className="flex flex-col">
              <div className="text-xs text-gray-400 text-center mb-0.5">{t(group.labelKey)}</div>
              <div className="flex">
                {group.categories.map((cat, i) => (
                  <button
                    key={cat}
                    onClick={() => setCompendiumCategory(cat)}
                    className={`px-2 py-1 text-sm pane-button-shadow ${
                      i === 0 ? 'rounded-l' : i === group.categories.length - 1 ? 'rounded-r' : ''
                    } ${
                      compendiumCategory === cat
                        ? 'bg-sub text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {t(`party.categoryShort.${cat}`)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {compendiumItems.map(item => {
            const baseItem: Item = { ...item, enhancement: 0, superRare: 0 };
            const expanded = !!expandedCompendiumItems[item.id];
            return (
              <div key={item.id} className="bg-white rounded border border-gray-200 shadow-sm shadow-slate-900/10">
                <button
                  onClick={() => setExpandedCompendiumItems(prev => ({ ...prev, [item.id]: !expanded }))}
                  className="w-full text-left px-3 py-2 text-sm flex justify-between items-center"
                >
                  <span>
                    <span className="text-black">{getLocalizedItemName(item)}</span>
                    <span className="text-gray-500"> {getRarityShortLabel(item.id, item.name)} {renderTextWithRaceIcons(getItemStats(baseItem))}</span>
                  </span>
                  <span className="text-xs text-gray-500">{expanded ? '▲' : '▼'}</span>
                </button>
                {expanded && (
                  <div className="px-3 pb-2 text-xs text-gray-700 space-y-1 border-t border-gray-100 pt-2">
                    <div>ID: {item.id}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('characterRoster', t('setting.characterRoster.title'))}
        {settingPanelExpanded.characterRoster && <>
          {activeRosterStatusBubble ? (
            <div
              className="floating-bubble-pane fixed z-20 rounded-lg p-2"
              style={{
                top: activeRosterStatusBubble.top,
                left: activeRosterStatusBubble.left,
                width: 'max-content',
                maxWidth: activeRosterStatusBubble.maxWidth,
              }}
            >
              <div className="text-xs text-gray-700 leading-snug break-words">
                {activeRosterStatusBubble.text}
              </div>
            </div>
          ) : null}
          {/* SpecRef: 8.6 | UI_SETTING | Character Roster (味方キャラクター図鑑) */}
          <div className="mt-3 mb-2 overflow-x-auto pb-1">
            <div className="flex w-max min-w-full flex-nowrap gap-2">
              {CHARACTER_ROSTER_RACES.filter((race) => visibleRosterRaceIds.includes(race.id)).map((race) => (
                <button
                  key={race.id}
                  onClick={() => setCharacterRosterRaceId(race.id)}
                  className={`shrink-0 min-w-0 px-2 py-1 text-xs rounded pane-button-shadow ${characterRosterRaceId === race.id ? 'bg-sub text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                  title={race.raceName}
                >
                  <RaceIcon race={RACES.find((r) => r.id === race.id) ?? RACES[0]} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
            {gameState.parties.map((party) => (
              <button key={party.id} onClick={() => setCharacterRosterPartyId(party.id)} className={`px-2 py-1 text-xs rounded pane-button-shadow ${characterRosterPartyId === party.id ? 'bg-sub text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                PT{party.id}
              </button>
            ))}
          </div>
          <div className="flex gap-1 mb-3">
            {visibleRosterGenders.includes('male') && (
              <button onClick={() => setCharacterRosterGenderFilter('male')} className={`px-2 py-1 text-xs rounded ${characterRosterGenderFilter === 'male' ? 'bg-sub text-white' : 'bg-gray-200 text-gray-700'}`}>{t('common.gender.male')}</button>
            )}
            {visibleRosterGenders.includes('female') && (
              <button onClick={() => setCharacterRosterGenderFilter('female')} className={`px-2 py-1 text-xs rounded ${characterRosterGenderFilter === 'female' ? 'bg-sub text-white' : 'bg-gray-200 text-gray-700'}`}>{t('common.gender.female')}</button>
            )}
            {visibleRosterGenders.includes('unique') && (
              <button onClick={() => setCharacterRosterGenderFilter('unique')} className={`px-2 py-1 text-xs rounded ${characterRosterGenderFilter === 'unique' ? 'bg-sub text-white' : 'bg-gray-200 text-gray-700'}`}>U</button>
            )}
          </div>
          {activeRosterCharacter && (
            <div
              className="relative overflow-visible rounded border border-gray-200 bg-white p-2 flex flex-col"
              style={{ minHeight: '500px' }}
            >
              {selectedRosterImageSrc ? (
                <img
                  src={selectedRosterImageSrc}
                  alt={activeRosterCharacter.name}
                  className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[130%] max-w-[507px] h-auto"
                />
              ) : null}
              <div className="relative z-10 rounded bg-white/25 px-2 py-1 inline-block text-xs text-gray-700">{t('setting.characterRoster.race', { race: selectedRosterRace?.name ?? activeRosterCharacter.raceId })}</div>
              <div className="relative z-10 mt-auto border-t border-gray-100 pt-2 text-xs text-gray-700 bg-white/25 rounded px-2 py-1 space-y-1">
                <div className="font-semibold">{t('setting.characterRoster.raceStats')}</div>
                <button type="button" className="w-full text-left" title={t('setting.characterRoster.raceBaseStatsHelp')} onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleRosterStatusBubbleToggle('roster-base-status', t('setting.characterRoster.baseStats', { vitality: selectedRosterRace ? formatNumber(selectedRosterRace.stats.vitality) : '-', strength: selectedRosterRace ? formatNumber(selectedRosterRace.stats.strength) : '-', intelligence: selectedRosterRace ? formatNumber(selectedRosterRace.stats.intelligence) : '-', mind: selectedRosterRace ? formatNumber(selectedRosterRace.stats.mind) : '-' }), event.currentTarget); }}>
                  <span className="grid grid-cols-4 gap-1">
                    <span className="base-stat-chip">{t('common.stat.vitality')}:{selectedRosterRace ? formatNumber(selectedRosterRace.stats.vitality) : '-'}</span>
                    <span className="base-stat-chip">{t('common.stat.strength')}:{selectedRosterRace ? formatNumber(selectedRosterRace.stats.strength) : '-'}</span>
                    <span className="base-stat-chip">{t('common.stat.intelligence')}:{selectedRosterRace ? formatNumber(selectedRosterRace.stats.intelligence) : '-'}</span>
                    <span className="base-stat-chip">{t('common.stat.mind')}:{selectedRosterRace ? formatNumber(selectedRosterRace.stats.mind) : '-'}</span>
                  </span>
                </button>
                <div className="text-xs text-gray-900 mt-1 leading-5">
                  <span className="break-words leading-5 font-medium">{t('party.status.bonus')}: </span>
                  {rosterBonusStatusEntries.length > 0 ? (
                    rosterBonusStatusEntries.map((entry, index) => (
                      <span key={entry.key}>
                        {index > 0 && <span>, </span>}
                        <button
                          type="button"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleRosterStatusBubbleToggle(entry.key, `${entry.label} ${entry.description ?? t('home.bonus.descriptionMissing')}`, event.currentTarget); }}
                          className="text-left hover:underline"
                          title={t('setting.characterRoster.tapForDetails')}
                        >
                          {entry.label}
                        </button>
                      </span>
                    ))
                  ) : (
                    <span>-</span>
                  )}
                </div>
                <button
                  type="button"
                  className="w-full text-left"
                  title={t('setting.characterRoster.defaultAbilityHelp')}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleRosterStatusBubbleToggle(
                      'roster-default-ability',
                      selectedRosterRace?.defaultAbility ? `${selectedRosterRace.defaultAbility.name} ${getAbilityDescription(selectedRosterRace.defaultAbility.id.replace(/^a\./, '').replace(/-/g, '_') as AbilityId, 1)}` : t('setting.characterRoster.defaultAbility', { ability: '-' }),
                      event.currentTarget,
                    );
                  }}
                >
                  {t('setting.characterRoster.defaultAbility', { ability: selectedRosterRace?.defaultAbility?.name ?? '-' })}
                </button>
                <button
                  type="button"
                  className="w-full text-left"
                  title={t('setting.characterRoster.unlockAbilityHelp')}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleRosterStatusBubbleToggle(
                      'roster-unlock-ability',
                      selectedRosterRace?.unlockAbility ? `${selectedRosterRace.unlockAbility.name} ${getAbilityDescription(selectedRosterRace.unlockAbility.id.replace(/^a\./, '').replace(/-/g, '_') as AbilityId, 1)}` : t('setting.characterRoster.unlockAbility', { ability: '-' }),
                      event.currentTarget,
                    );
                  }}
                >
                  {t('setting.characterRoster.unlockAbility', { ability: selectedRosterRace?.unlockAbility?.name ?? '-' })}
                </button>
              </div>
            </div>
          )}
          {!activeRosterCharacter && <div className="text-xs text-gray-500">{t('setting.characterRoster.noMatches')}</div>}
          {activeRosterCharacter && !selectedRosterImageSrc && <div className="mt-2 text-xs text-gray-500">{t('setting.characterRoster.noImage')}</div>}
        </>}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('bestiary', t('setting.bestiary.title'))}
        {settingPanelExpanded.bestiary && <>
        <div className="flex gap-1 mt-3 mb-3 overflow-x-auto pb-1">
          {bestiaryTabOptions.map(dungeon => (
            <button
              key={dungeon.id}
              onClick={() => onSetSelectedBestiaryDungeonId(dungeon.id)}
              className={`px-2 py-1 text-sm rounded pane-button-shadow ${
                selectedBestiaryDungeonId === dungeon.id
                  ? 'bg-sub text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={dungeon.name}
            >
              {BESTIARY_TAB_LABELS[dungeon.id] ?? dungeon.id}
            </button>
          ))}
        </div>
        <div
          ref={bestiaryListRef}
          className="space-y-2 max-h-96 overflow-y-auto pr-1"
          onScroll={() => {
            const currentScrollTop = bestiaryListRef.current?.scrollTop ?? 0;
            onSetBestiaryScrollTop(currentScrollTop);
          }}
        >
          <div className="text-xs text-gray-500">{isGodBestiaryTab ? t('setting.bestiary.godsTab') : selectedBestiaryDungeon.name}</div>
          {isGodBestiaryTab && godBestiaryRows.map((god, index) => {
            const godBestiaryId = 900000 + index;
            const godExpanded = !!expandedBestiaryEnemies[godBestiaryId];
            const godRuntimeEnemy = getGodRuntimeEnemy(god);
            const godClassShortName = CLASS_SHORT_NAMES[god.enemyClass];
            const godImageSrc = resolvePublicAssetPath(godRuntimeEnemy?.image_path ?? god.image_path);
            return (
              <div key={god.name} className="mt-2 border border-gray-100 rounded bg-white shadow-sm shadow-slate-900/10">
                <button
                  onClick={() => onSetExpandedBestiaryEnemies(prev => ({ ...prev, [godBestiaryId]: !godExpanded }))}
                  className="w-full text-left px-2 py-1 text-sm flex justify-between items-center"
                >
                  <span>{renderEnemyNameWithMutedClass(godClassShortName ? `${god.displayName}(${godClassShortName})` : god.displayName)}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    {!godExpanded && renderCollapsedBestiaryEnemyImage(getGodBestiaryDisplayEnemyId(god))}
                    <span>{godExpanded ? '▲' : '▼'}</span>
                  </span>
                </button>
                {godExpanded && (
                  <div className="relative overflow-hidden px-2 pb-2 text-xs text-gray-700 border-t border-gray-100 pt-2 space-y-1">
                    {godImageSrc && (
                      <>
                        {/* SpecRef: 8.6 | UI_SETTING | Bestiary (敵キャラクター図鑑) */}
                        <img
                          src={godImageSrc}
                          alt=""
                          aria-hidden="true"
                          className="pointer-events-none select-none absolute left-[80%] top-0 h-auto -translate-x-1/2 object-contain object-top opacity-50"
                          style={{
                            width: 'clamp(120%, calc(270% - 0.3 * 100vw), 150%)',
                            maxWidth: 'none',
                          }}
                        />
                      </>
                    )}
                    <div className="relative z-10 space-y-1">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>ID: {getGodBestiaryDisplayEnemyId(god)}</div>
                      <div></div>
                      <div>HP: {formatNumber(godRuntimeEnemy?.hp ?? 0)}</div>
                      <div>{t('setting.bestiary.level', { value: formatNumber(god.level) })}</div>
                      <div>{t('setting.bestiary.class', { value: ENEMY_CLASS_LABELS[god.enemyClass] ?? god.enemyClass })}</div>
                      <div>{t('setting.bestiary.type', { value: ENEMY_TYPE_LABELS[godRuntimeEnemy?.enemyType ?? ''] ?? (godRuntimeEnemy?.enemyType ?? t('common.unknown')) })}</div>
                    </div>
                    {godRuntimeEnemy && (
                      <>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {(() => {
                            const hasRangedAttack = hasEnemyAttack(godRuntimeEnemy.rangedAttack, godRuntimeEnemy.rangedNoA);
                            const hasMeleeAttack = hasEnemyAttack(godRuntimeEnemy.meleeAttack, godRuntimeEnemy.meleeNoA);
                            const hasMagicalAttack = hasEnemyAttack(godRuntimeEnemy.magicalAttack, godRuntimeEnemy.magicalNoA);
                            const hasMagicCasting = hasEnemyMagicCasting(godRuntimeEnemy);
                            const hasPhysicalAttack = hasRangedAttack || hasMeleeAttack;
                            const decay = `${((0.90 + godRuntimeEnemy.accuracyBonus) * 100).toFixed(1)}%`;
                            const physicalDefenseAmplifierPercent = godRuntimeEnemy.physicalDefenseAmplifier * 100;
                            const magicalDefenseAmplifierPercent = godRuntimeEnemy.magicalDefenseAmplifier * 100;

                            const offenseRows: string[] = [];
                            if (hasRangedAttack) {
                              offenseRows.push(formatEnemyAttackLine(t('setting.bestiary.rangedAttack'), godRuntimeEnemy.rangedAttack, godRuntimeEnemy.rangedNoA, godRuntimeEnemy.rangedAttackAmplifier));
                            }
                            if (hasMeleeAttack) {
                              offenseRows.push(formatEnemyAttackLine(t('setting.bestiary.meleeAttack'), godRuntimeEnemy.meleeAttack, godRuntimeEnemy.meleeNoA, godRuntimeEnemy.meleeAttackAmplifier));
                            }
                            if (hasPhysicalAttack) {
                              offenseRows.push(t('setting.bestiary.accuracy', { type: t('setting.bestiary.physical'), decay }));
                            }
                            if (hasMagicalAttack) {
                              offenseRows.push(formatEnemyAttackLine(t('setting.bestiary.magicAttack'), godRuntimeEnemy.magicalAttack, godRuntimeEnemy.magicalNoA, getEnemyDisplayedMagicalAttackAmplifier(godRuntimeEnemy)));
                              offenseRows.push(t('setting.bestiary.accuracy', { type: t('setting.bestiary.magic'), decay }));
                            }
                            if (hasMagicCasting) {
                              offenseRows.push(t('setting.bestiary.castMagic', { spell: getEnemyBestiarySpellName(godRuntimeEnemy) }));
                            }

                            const defenseRows: ReactNode[] = [
                              formatEnemyElementOffenseLine(godRuntimeEnemy.elementalOffense, godRuntimeEnemy.elementalOffenseValue),
                              formatEnemyDefenseLine(t('setting.bestiary.physicalDefense'), godRuntimeEnemy.physicalDefense, physicalDefenseAmplifierPercent),
                              formatEnemyDefenseLine(t('setting.bestiary.magicalDefense'), godRuntimeEnemy.magicalDefense, magicalDefenseAmplifierPercent),
                              t('setting.bestiary.evasion', { value: formatNumber(Math.round(godRuntimeEnemy.evasionBonus * 1000)) }),
                            ];

                            const rowCount = Math.max(offenseRows.length, defenseRows.length);
                            return Array.from({ length: rowCount }).flatMap((_, index) => [
                              <div key={`god-off-${index}`}>{offenseRows[index] ?? ''}</div>,
                              <div key={`god-def-${index}`}>{defenseRows[index] ?? ''}</div>,
                            ]);
                          })()}
                        </div>
                        <div>{renderEnemyElementalResistanceLine(godRuntimeEnemy)}</div>
                        {(() => {
                          const bonusText = getEnemyTypeCBonusText(godRuntimeEnemy);
                          return bonusText ? <div>{t('party.status.bonus')}: {bonusText}</div> : null;
                        })()}
                      </>
                    )}
                    <div className="flex items-start gap-1">
                      <div>{t('setting.bestiary.abilities')}</div>
                      <div className="flex flex-wrap items-center gap-1">
                        {parseAbilityTokens(godRuntimeEnemy?.abilities ?? god.abilities).map((token, tokenIndex) => (
                          <Fragment key={token.key}>
                            {tokenIndex > 0 && <span className="text-gray-400">,</span>}
                            {token.isMissing ? (
                              <span>{token.label}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => handleAbilityHelpToggle(token.abilityId, token.level, token.label, event)}
                                className="rounded px-1 text-left hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-sub"
                                aria-label={t('setting.bestiary.showAbilityDescription', { ability: token.label })}
                              >
                                {token.label}
                              </button>
                            )}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                    <div>{t('setting.bestiary.waitingExpedition', { value: god.expedition })}</div>
                    <div className="pt-1">{t('setting.bestiary.dropCandidates', { value: getGodDropCandidates(god.name) })}</div>
                    {(() => {
                      const battleStats = getGodBestiaryBattleStats(god);
                      return <div>{t('setting.bestiary.battleStats', { defeats: formatNumber(battleStats.defeats), encounters: formatNumber(battleStats.encounters) })}</div>;
                    })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {isColosseumBestiaryTab && (() => {
            // Colosseum enemies are already fully computed from the editor settings.
            // Reapplying expedition encounter scaling here would double-count ability effects like colossal.
            const colosseumEnemy = buildColosseumEnemy(colosseumEnemySettings);
            const enemyExpanded = !!expandedBestiaryEnemies[colosseumEnemy.id];
            const physicalDefenseAmplifierPercent = colosseumEnemy.physicalDefenseAmplifier * 100;
            const magicalDefenseAmplifierPercent = colosseumEnemy.magicalDefenseAmplifier * 100;
            const hasRangedAttack = hasEnemyAttack(colosseumEnemy.rangedAttack, colosseumEnemy.rangedNoA);
            const hasMeleeAttack = hasEnemyAttack(colosseumEnemy.meleeAttack, colosseumEnemy.meleeNoA);
            const hasMagicalAttack = hasEnemyAttack(colosseumEnemy.magicalAttack, colosseumEnemy.magicalNoA);
            const hasMagicCasting = hasEnemyMagicCasting(colosseumEnemy);
            const hasPhysicalAttack = hasRangedAttack || hasMeleeAttack;
            const decay = `${((0.90 + colosseumEnemy.accuracyBonus) * 100).toFixed(1)}%`;
            return (
              <div className="bg-white rounded border border-gray-200 p-2 shadow-sm shadow-slate-900/10">
                <div className="text-xs text-gray-500 font-medium mb-1">Colosseum Opponent</div>
                <div className="mt-2 border border-gray-100 rounded">
                  <button onClick={() => onSetExpandedBestiaryEnemies(prev => ({ ...prev, [colosseumEnemy.id]: !enemyExpanded }))} className="w-full text-left px-2 py-1 text-sm flex justify-between items-center">
                    <span>{renderEnemyNameWithMutedClass(formatEnemyDefName(colosseumEnemy))}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      {!enemyExpanded && renderCollapsedBestiaryEnemyImage(colosseumEnemy.id)}
                      <span>{enemyExpanded ? '▲' : '▼'}</span>
                    </span>
                  </button>
                  {enemyExpanded && <div className="px-2 pb-2 text-xs text-gray-700 border-t border-gray-100 pt-2 space-y-1">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {(() => {
                        const classRows = getBestiaryClassRows(colosseumEnemy.enemyClass, colosseumEnemy.enemySubClass);
                        return (
                          <>
                            <div>ID: {colosseumEnemy.id}</div><div>{t('setting.bestiary.level', { value: formatNumber(colosseumEnemySettings.level) })}</div>
                            <div>HP: {formatNumber(colosseumEnemy.hp)}</div><div>{t('setting.bestiary.type', { value: ENEMY_TYPE_LABELS[colosseumEnemy.enemyType] ?? colosseumEnemy.enemyType })}</div>
                            {classRows.map((row) => row)}
                            {classRows.length === 1 && <div></div>}
                            <div>{t('setting.bestiary.terrain', { value: TERRAIN_EFFECT_LABELS[colosseumEnemySettings.terrainEffect] ?? colosseumEnemySettings.terrainEffect })}</div><div></div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>{hasRangedAttack ? formatEnemyAttackLine(t('setting.bestiary.rangedAttack'), colosseumEnemy.rangedAttack, colosseumEnemy.rangedNoA, colosseumEnemy.rangedAttackAmplifier) : ''}</div><div>{formatEnemyElementOffenseLine(colosseumEnemy.elementalOffense, colosseumEnemy.elementalOffenseValue)}</div>
                      <div>{hasMeleeAttack ? formatEnemyAttackLine(t('setting.bestiary.meleeAttack'), colosseumEnemy.meleeAttack, colosseumEnemy.meleeNoA, colosseumEnemy.meleeAttackAmplifier) : ''}</div><div>{formatEnemyDefenseLine(t('setting.bestiary.physicalDefense'), colosseumEnemy.physicalDefense, physicalDefenseAmplifierPercent)}</div>
                      <div>{hasPhysicalAttack ? t('setting.bestiary.accuracy', { type: t('setting.bestiary.physical'), decay }) : ''}</div><div>{formatEnemyDefenseLine(t('setting.bestiary.magicalDefense'), colosseumEnemy.magicalDefense, magicalDefenseAmplifierPercent)}</div>
                      <div>{hasMagicalAttack ? formatEnemyAttackLine(t('setting.bestiary.magicAttack'), colosseumEnemy.magicalAttack, colosseumEnemy.magicalNoA, getEnemyDisplayedMagicalAttackAmplifier(colosseumEnemy)) : ''}</div><div>{t('setting.bestiary.evasion', { value: formatNumber(Math.round(colosseumEnemy.evasionBonus * 1000)) })}</div>
                      <div>{hasMagicalAttack ? t('setting.bestiary.accuracy', { type: t('setting.bestiary.magic'), decay }) : ''}</div><div>{renderEnemyElementalResistanceLine(colosseumEnemy)}</div>
                      <div>{hasMagicCasting ? t('setting.bestiary.castMagic', { spell: getEnemyBestiarySpellName(colosseumEnemy) }) : ''}</div><div></div>
                    </div>
                    {(() => {
                      const bonusText = getEnemyTypeCBonusText(colosseumEnemy);
                      return bonusText ? <div>{t('party.status.bonus')}: {bonusText}</div> : null;
                    })()}
                    <div className="flex items-start gap-1">
                      <div>{t('setting.bestiary.abilities')}</div>
                      <div className="flex flex-wrap items-center gap-1">
                        {parseAbilityTokens(colosseumEnemy.abilities).map((token, tokenIndex) => (
                          <Fragment key={token.key}>
                            {tokenIndex > 0 && <span className="text-gray-400">,</span>}
                            {token.isMissing ? (
                              <span>{token.label}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => handleAbilityHelpToggle(token.abilityId, token.level, token.label, event)}
                                className="rounded px-1 text-left hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-sub"
                                aria-label={t('setting.bestiary.showAbilityDescription', { ability: token.label })}
                              >
                                {token.label}
                              </button>
                            )}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                    <div>{t('setting.bestiary.dropCandidates', { value: t('common.none') })}</div>
                  </div>}
                </div>
              </div>
            );
          })()}
          {!isGodBestiaryTab && !isColosseumBestiaryTab && selectedBestiaryGroups.map(group => (
            <div key={group.key} className="bg-white rounded border border-gray-200 p-2 shadow-sm shadow-slate-900/10">
              <div className="text-xs text-gray-500 font-medium mb-1">{group.label}</div>
              {group.enemies.map(enemy => {
                const displayEnemy = getDisplayEnemy(enemy, selectedBestiaryDungeon, group.floorNumber, group.groupType);
                const roomType = group.groupType === 'boss'
                  ? 'battle_Boss'
                  : group.groupType === 'elite'
                    ? 'battle_Elite'
                    : 'battle_Normal';
                const enemyLevelFinal = getEffectiveEnemyLevel(selectedBestiaryDungeon.expLevel, group.floorNumber, roomType, false);
                const classRows = getBestiaryClassRows(displayEnemy.enemyClass, displayEnemy.enemySubClass);
                const enemyExpanded = !!expandedBestiaryEnemies[displayEnemy.id];
                const physicalDefenseAmplifierPercent = displayEnemy.physicalDefenseAmplifier * 100;
                const magicalDefenseAmplifierPercent = displayEnemy.magicalDefenseAmplifier * 100;
                const bestiaryEnemyImagePath = resolvePublicAssetPath(`/enemy/E_${displayEnemy.id}.png`);
                return (
                  <div key={displayEnemy.id} className="mt-2 border border-gray-100 rounded">
                    <button
                      onClick={() => onSetExpandedBestiaryEnemies(prev => ({ ...prev, [displayEnemy.id]: !enemyExpanded }))}
                      className="w-full text-left px-2 py-1 text-sm flex justify-between items-center"
                    >
                      <span>{renderEnemyNameWithMutedClass(formatEnemyDefName(displayEnemy))}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        {!enemyExpanded && renderCollapsedBestiaryEnemyImage(displayEnemy.id)}
                        <span>{enemyExpanded ? '▲' : '▼'}</span>
                      </span>
                    </button>
                    {enemyExpanded && (
                      <div className="relative overflow-hidden px-2 pb-2 text-xs text-gray-700 border-t border-gray-100 pt-2 space-y-1">
                        {bestiaryEnemyImagePath && (
                          <img
                            src={bestiaryEnemyImagePath}
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none select-none absolute left-[80%] top-0 h-auto -translate-x-1/2 object-contain object-top opacity-50"
                            style={{
                              width: 'clamp(120%, calc(270% - 0.3 * 100vw), 150%)',
                              maxWidth: 'none',
                            }}
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="relative z-10 grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>ID: {displayEnemy.id}</div>
                          <div></div>
                          <div>HP: {formatNumber(displayEnemy.hp)}</div>
                          <div>{t('setting.bestiary.level', { value: formatNumber(enemyLevelFinal) })}</div>
                          {classRows.map((row) => row)}
                          {classRows.length === 1 && <div></div>}
                          <div>{t('setting.bestiary.type', { value: ENEMY_TYPE_LABELS[displayEnemy.enemyType] ?? displayEnemy.enemyType })}</div>
                          <div></div>
                          {(() => {
                            const hasRangedAttack = hasEnemyAttack(displayEnemy.rangedAttack, displayEnemy.rangedNoA);
                            const hasMeleeAttack = hasEnemyAttack(displayEnemy.meleeAttack, displayEnemy.meleeNoA);
                            const hasMagicalAttack = hasEnemyAttack(displayEnemy.magicalAttack, displayEnemy.magicalNoA);
                            const hasMagicCasting = hasEnemyMagicCasting(displayEnemy);
                            const hasPhysicalAttack = hasRangedAttack || hasMeleeAttack;
                            const decay = `${((0.90 + displayEnemy.accuracyBonus) * 100).toFixed(1)}%`;

                            const offenseRows: string[] = [];
                            if (hasRangedAttack) {
                              offenseRows.push(formatEnemyAttackLine(t('setting.bestiary.rangedAttack'), displayEnemy.rangedAttack, displayEnemy.rangedNoA, displayEnemy.rangedAttackAmplifier));
                            }
                            if (hasMeleeAttack) {
                              offenseRows.push(formatEnemyAttackLine(t('setting.bestiary.meleeAttack'), displayEnemy.meleeAttack, displayEnemy.meleeNoA, displayEnemy.meleeAttackAmplifier));
                            }
                            if (hasPhysicalAttack) {
                              offenseRows.push(t('setting.bestiary.accuracy', { type: t('setting.bestiary.physical'), decay }));
                            }
                            if (hasMagicalAttack) {
                              offenseRows.push(formatEnemyAttackLine(t('setting.bestiary.magicAttack'), displayEnemy.magicalAttack, displayEnemy.magicalNoA, getEnemyDisplayedMagicalAttackAmplifier(displayEnemy)));
                              offenseRows.push(t('setting.bestiary.accuracy', { type: t('setting.bestiary.magic'), decay }));
                            }
                            if (hasMagicCasting) {
                              offenseRows.push(t('setting.bestiary.castMagic', { spell: getEnemyBestiarySpellName(displayEnemy) }));
                            }
                            const basePenetration = (displayEnemy.bonuses ?? []).reduce((sum, bonus) => (
                              bonus.type === 'penet' ? sum + bonus.value : sum
                            ), 0);
                            const enemyHeavyStrike = displayEnemy.abilities.find((ability) => ability.id === 'heavy_strike' && ability.level > 0);
                            const heavyStrikePenetPerNoA = enemyHeavyStrike
                              ? (enemyHeavyStrike.level >= 2 ? 0.015 : 0.01)
                              : 0;
                            const heavyStrikeNoALoss = enemyHeavyStrike
                              ? Math.max(displayEnemy.rangedNoA, displayEnemy.magicalNoA, displayEnemy.meleeNoA)
                              : 0;
                            const penetrationPercent = Math.round((basePenetration + (heavyStrikeNoALoss * heavyStrikePenetPerNoA)) * 100);
                            if (penetrationPercent !== 0) {
                              offenseRows.push(t('setting.bestiary.penetration', { value: formatNumber(penetrationPercent) }));
                            }

                            // Bestiary detail keeps the compact 4-line defense block.
                            const defenseRows: ReactNode[] = [
                              formatEnemyElementOffenseLine(displayEnemy.elementalOffense, displayEnemy.elementalOffenseValue),
                              formatEnemyDefenseLine(t('setting.bestiary.physicalDefense'), displayEnemy.physicalDefense, physicalDefenseAmplifierPercent),
                              formatEnemyDefenseLine(t('setting.bestiary.magicalDefense'), displayEnemy.magicalDefense, magicalDefenseAmplifierPercent),
                              t('setting.bestiary.evasion', { value: formatNumber(Math.round(displayEnemy.evasionBonus * 1000)) }),
                            ];

                            const rowCount = Math.max(offenseRows.length, defenseRows.length);
                            return Array.from({ length: rowCount }).flatMap((_, index) => [
                              <div key={`off-${index}`}>{offenseRows[index] ?? ''}</div>,
                              <div key={`def-${index}`}>{defenseRows[index] ?? ''}</div>,
                            ]);
                          })()}
                        </div>
                        <div>{renderEnemyElementalResistanceLine(displayEnemy)}</div>
                        {(() => {
                          const bonusText = getEnemyTypeCBonusText(displayEnemy);
                          return bonusText ? <div>{t('party.status.bonus')}: {bonusText}</div> : null;
                        })()}
                        <div className="flex items-start gap-1">
                          <div>{t('setting.bestiary.abilities')}</div>
                          <div className="flex flex-wrap items-center gap-1">
                            {parseAbilityTokens(displayEnemy.abilities).map((token, tokenIndex) => (
                              <Fragment key={token.key}>
                                {tokenIndex > 0 && <span className="text-gray-400">,</span>}
                                {token.isMissing ? (
                                  <span>{token.label}</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(event) => handleAbilityHelpToggle(token.abilityId, token.level, token.label, event)}
                                    className="rounded px-1 text-left hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-sub"
                                    aria-label={t('setting.bestiary.showAbilityDescription', { ability: token.label })}
                                  >
                                    {token.label}
                                  </button>
                                )}
                              </Fragment>
                            ))}
                          </div>
                        </div>
                        <div className="pt-1">{t('setting.bestiary.dropCandidates', { value: getEnemyDropCandidates(displayEnemy).map(item => `${getRarityShortLabel(item.id, item.name)}${getLocalizedItemName(item)}`).join(' / ') })}</div>
                        {(() => {
                          const battleStats = getBestiaryEnemyBattleStats(displayEnemy.id);
                          return <div>{t('setting.bestiary.battleStats', { defeats: formatNumber(battleStats.defeats), encounters: formatNumber(battleStats.encounters) })}</div>;
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        </>}
      </div>

      {debugSettings.colosseumEnabled && <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        <button
          type="button"
          onClick={() => setIsEnemyEditExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="text-sm font-semibold">Enemy Edit</div>
          <span className="text-gray-500 text-xs" aria-hidden="true">{isEnemyEditExpanded ? '▲' : '▼'}</span>
        </button>
        {isEnemyEditExpanded && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-3">
          {/* SpecRef: 8.6 | UI_SETTING | Enemy Edit Pane */}
          <label className="space-y-1"><div className="text-xs text-gray-600">Enemy level: {colosseumEnemySettings.level}</div><input className={IOS_GLASS_SLIDER_CLASS} type="range" min={1} max={99} value={colosseumEnemySettings.level} onChange={(e) => updateColosseumEnemySettings({ level: Number(e.target.value) })} style={getSliderProgressStyle(colosseumEnemySettings.level, 1, 99)} /></label>
          <label className="space-y-1"><div className="text-xs text-gray-600">Enemy name</div><input className="w-full rounded border px-2 py-1" value={colosseumEnemySettings.name} onChange={(e) => updateColosseumEnemySettings({ name: e.target.value })} /></label>
          <label className="space-y-1">
            <div className="text-xs text-gray-600">Terrain effect</div>
            <select
              className="w-full rounded border px-2 py-1"
              value={colosseumEnemySettings.terrainEffect}
              onChange={(e) => updateColosseumEnemySettings({ terrainEffect: e.target.value as ColosseumEnemySettings['terrainEffect'] })}
            >
              {TERRAIN_EFFECT_OPTIONS.map((entry) => (
                <option key={entry.key} value={entry.key}>{entry.label}</option>
              ))}
            </select>
            <div className="text-[11px] text-gray-500">
              {(TERRAIN_EFFECT_OPTIONS.find((entry) => entry.key === colosseumEnemySettings.terrainEffect)?.description) ?? t('home.terrainEffect.noneDescription')}
            </div>
          </label>
          <label className="space-y-1"><div className="text-xs text-gray-600">Enemy type</div><select className="w-full rounded border px-2 py-1" value={colosseumEnemySettings.enemyType} onChange={(e) => updateColosseumEnemySettings({ enemyType: e.target.value })}>{Object.keys(ENEMY_TYPE_LABELS).map((key) => <option key={key} value={key}>{ENEMY_TYPE_LABELS[key] ?? key}</option>)}</select></label>
          <label className="space-y-1"><div className="text-xs text-gray-600">Enemy main class</div><select className="w-full rounded border px-2 py-1" value={colosseumEnemySettings.enemyMainClass} onChange={(e) => updateColosseumEnemySettings({ enemyMainClass: e.target.value as ColosseumEnemySettings['enemyMainClass'] })}>{ENEMY_EDIT_CLASS_OPTIONS.map((key) => <option key={key} value={key}>{ENEMY_CLASS_LABELS[key] ?? key}</option>)}</select></label>
          <label className="space-y-1"><div className="text-xs text-gray-600">Enemy sub class</div><select className="w-full rounded border px-2 py-1" value={colosseumEnemySettings.enemySubClass} onChange={(e) => updateColosseumEnemySettings({ enemySubClass: e.target.value as ColosseumEnemySettings['enemySubClass'] })}><option value="none">none</option>{ENEMY_EDIT_CLASS_OPTIONS.map((key) => <option key={key} value={key}>{ENEMY_CLASS_LABELS[key] ?? key}</option>)}</select></label>
          {[0, 1, 2, 3, 4].map((slot) => {
            const slotAbility = colosseumEnemySettings.abilities[slot];
            return (
              <Fragment key={slot}>
                <label className="space-y-1">
                  <div className="text-xs text-gray-600">Enemy added ability {slot + 1}</div>
                  <select
                    className="w-full rounded border px-2 py-1"
                    value={slotAbility?.id ?? 'none'}
                    onChange={(e) => {
                      const next = [...colosseumEnemySettings.abilities];
                      const value = e.target.value as AbilityId | 'none';
                      if (value === 'none') {
                        next.splice(slot, 1);
                      } else {
                        next[slot] = { id: value as AbilityId, level: slotAbility?.level ?? 1 };
                      }
                      updateColosseumEnemySettings({ abilities: next.filter(Boolean) as ColosseumEnemySettings['abilities'] });
                    }}
                  >
                    {[<option key="none" value="none">none</option>, ...Object.entries(ABILITY_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)]}
                  </select>
                </label>
                <label className="space-y-1">
                  <div className="text-xs text-gray-600">Enemy added ability {slot + 1} level</div>
                  <select
                    className="w-full rounded border px-2 py-1"
                    value={slotAbility?.level ?? 1}
                    onChange={(e) => {
                      const next = [...colosseumEnemySettings.abilities];
                      const levelValue = Number(e.target.value);
                      if (slotAbility) {
                        next[slot] = { ...slotAbility, level: levelValue };
                      }
                      updateColosseumEnemySettings({ abilities: next.filter(Boolean) as ColosseumEnemySettings['abilities'] });
                    }}
                    disabled={!slotAbility}
                  >
                    {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </label>
              </Fragment>
            );
          })}
        </div>}
      </div>}

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('superRare', t('setting.superRare'))}
        {settingPanelExpanded.superRare && <>
        <div className="text-xs text-gray-500 mt-3 mb-2">{t('setting.superRareListCaption')}</div>
        <div className="bg-white rounded p-2 text-sm space-y-1 max-h-72 overflow-y-auto pane-button-shadow">
          {SUPER_RARE_TITLES.filter(title => title.value > 0).map(title => {
            const uniqueBonus = formatBonuses(title.bonuses ?? [], { defenseMultiplierStyle: 'friendly' });
            return (
              <div key={title.value} className="grid grid-cols-[auto,1fr] gap-x-2 border-b border-gray-100 last:border-b-0 py-1">
                <div className="text-gray-500">{title.value}.</div>
                <div>
                  <div className="font-medium text-gray-700">{getLocalizedSuperRareTitle(title.value)}</div>
                  <div className="text-xs text-sub">{uniqueBonus || t('common.none')}</div>
                </div>
              </div>
            );
          })}
        </div>
        </>}
      </div>
      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('modeSelect', t('setting.modeSelect'))}
        {settingPanelExpanded.modeSelect && <div className="mt-3 space-y-4">
          {/* SpecRef: 8.6 | UI_SETTING | Mode select (モード切替) */}
          <div>
            <div className="text-sm font-medium mb-1">{t('setting.language.title')}</div>
            <p className="mb-2 text-xs text-gray-500">{t('setting.language.description')}</p>
            <select
              value={language}
              onChange={(event) => onSetLanguage(event.target.value as Language)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{t(`setting.language.${lang}`)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              role="switch"
              aria-checked={isAutoRepeatEnabled}
              onClick={() => onSetAutoRepeatEnabled(!isAutoRepeatEnabled)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pane-button-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{t('setting.autoRepeat')}</span>
                <span className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isAutoRepeatEnabled ? 'text-sub' : 'text-gray-500'}`}>
                    {isAutoRepeatEnabled ? 'ON' : 'OFF'}
                  </span>
                  <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${isAutoRepeatEnabled ? 'bg-sub' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isAutoRepeatEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </span>
                </span>
              </div>
            </button>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              role="switch"
              aria-checked={isExpeditionStatsDisplayEnabled}
              onClick={() => onSetExpeditionStatsDisplayEnabled(!isExpeditionStatsDisplayEnabled)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pane-button-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{t('setting.expeditionStatsDisplay')}</span>
                <span className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isExpeditionStatsDisplayEnabled ? 'text-sub' : 'text-gray-500'}`}>
                    {isExpeditionStatsDisplayEnabled ? 'ON' : 'OFF'}
                  </span>
                  <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${isExpeditionStatsDisplayEnabled ? 'bg-sub' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isExpeditionStatsDisplayEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </span>
                </span>
              </div>
            </button>
          </div>

          <div>
            <div className="text-xs text-gray-600 font-medium mb-2">{t('setting.darkMode')}</div>
            <div className="grid grid-cols-3 gap-2">
              {(['off', 'on', 'system'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onSetDarkModeSetting(mode)}
                  className={`py-2 rounded border text-sm font-medium ${
                    darkModeSetting === mode
                      ? 'bg-sub text-white border-sub pane-button-shadow-soft'
                      : 'bg-white text-gray-700 border-gray-300 pane-button-shadow'
                  }`}
                >
                  {mode === 'off' ? 'OFF' : mode === 'on' ? 'ON' : t('setting.darkMode.system')}
                </button>
              ))}
            </div>
            <div className="mt-2 rounded bg-white p-2 text-xs text-gray-600 pane-button-shadow">
              {darkModeSetting === 'system'
                ? t('setting.darkMode.description.system')
                : darkModeSetting === 'on'
                  ? t('setting.darkMode.description.on')
                  : t('setting.darkMode.description.off')}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-600 font-medium mb-2">{t('setting.themeColor')}</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => !modeSelectionLocked && onSetGameMode('m.kemo')}
                disabled={modeSelectionLocked}
                  className={`py-2 rounded border text-sm font-medium ${
                  gameMode === 'm.kemo'
                    ? 'bg-sub text-white border-sub pane-button-shadow-soft'
                    : 'bg-white text-gray-700 border-gray-300 pane-button-shadow'
                } ${modeSelectionLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {t('setting.theme.kemo')}
              </button>
              <button
                onClick={() => onSetGameMode('m.luna')}
                disabled={modeSelectionLocked}
                  className={`py-2 rounded border text-sm font-medium ${
                  gameMode === 'm.luna'
                    ? 'bg-sub text-white border-sub pane-button-shadow-soft'
                    : 'bg-white text-gray-700 border-gray-300 pane-button-shadow'
                } ${modeSelectionLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {t('setting.theme.luna')}
              </button>
              <button
                onClick={() => !modeSelectionLocked && onSetGameMode('m.laika')}
                disabled={modeSelectionLocked}
                  className={`py-2 rounded border text-sm font-medium ${
                  gameMode === 'm.laika'
                    ? 'bg-sub text-white border-sub pane-button-shadow-soft'
                    : 'bg-white text-gray-700 border-gray-300 pane-button-shadow'
                } ${modeSelectionLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {t('setting.theme.laika')}
              </button>
            </div>
            <div className="mt-2 rounded bg-white p-2 text-xs text-gray-600 pane-button-shadow">
              {gameMode === 'm.kemo'
                ? t('setting.theme.description.kemo')
                : gameMode === 'm.luna'
                  ? t('setting.theme.description.luna')
                  : t('setting.theme.description.laika')}
            </div>
          </div>
        </div>}
      </div>


      {isDevEnvironment && <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('debug', t('setting.debug'))}
        {settingPanelExpanded.debug && <div className="space-y-3 mt-3 text-sm">
          <button type="button" onClick={() => onUpdateDebugSettings({ clairvoyanceEnabled: !debugSettings.clairvoyanceEnabled })} className="w-full rounded border bg-white px-3 py-2 text-left">Clairvoyance: {debugSettings.clairvoyanceEnabled ? 'ON' : 'OFF'}</button>
          <div className="bg-white rounded border p-2">
            <div className="text-xs text-gray-500 mb-1">Speed of time</div>
            <div className="flex gap-2">
              <button onClick={() => onUpdateDebugSettings({ timeSpeed: 'realtime' })} className={`px-2 py-1 rounded border ${debugSettings.timeSpeed === 'realtime' ? 'bg-sub text-white border-sub' : 'border-gray-300'}`}>Real time</button>
              <button onClick={() => onUpdateDebugSettings({ timeSpeed: 'x1_2' })} className={`px-2 py-1 rounded border ${debugSettings.timeSpeed === 'x1_2' ? 'bg-sub text-white border-sub' : 'border-gray-300'}`}>x1.2 bonus</button>
              <button onClick={() => onUpdateDebugSettings({ timeSpeed: 'x5' })} className={`px-2 py-1 rounded border ${debugSettings.timeSpeed === 'x5' ? 'bg-sub text-white border-sub' : 'border-gray-300'}`}>x5 boost</button>
              <button onClick={() => onUpdateDebugSettings({ timeSpeed: 'x20' })} className={`px-2 py-1 rounded border ${debugSettings.timeSpeed === 'x20' ? 'bg-sub text-white border-sub' : 'border-gray-300'}`}>x20 hyper</button>
              <button onClick={() => onUpdateDebugSettings({ timeSpeed: 'x100' })} className={`px-2 py-1 rounded border ${debugSettings.timeSpeed === 'x100' ? 'bg-sub text-white border-sub' : 'border-gray-300'}`}>x100 Ultra</button>
              <button onClick={() => onUpdateDebugSettings({ timeSpeed: 'unlimited' })} className={`px-2 py-1 rounded border ${debugSettings.timeSpeed === 'unlimited' ? 'bg-sub text-white border-sub' : 'border-gray-300'}`}>x∞ Unlimited</button>
            </div>
          </div>
          <button type="button" onClick={() => onUpdateDebugSettings({ godsBattleCondition: debugSettings.godsBattleCondition === 'normal' ? 'simple1' : 'normal' })} className="w-full rounded border bg-white px-3 py-2 text-left">Gods Battle condition: {debugSettings.godsBattleCondition === 'simple1' ? 'Simple(1)' : 'Normal'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ godStrength: debugSettings.godStrength === 'normal' ? 'debug' : 'normal' })} className="w-full rounded border bg-white px-3 py-2 text-left">Gods Strength: {debugSettings.godStrength === 'debug' ? 'Very Weak' : 'Normal'}</button>
          <button type="button" disabled={partyCount >= 6} onClick={onPartyUnlock} className="w-full rounded border bg-white px-3 py-2 text-left disabled:opacity-50">Party unlock +1 PT unlock ({partyCount}/6)</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ jewelShopOpen: !debugSettings.jewelShopOpen })} className="w-full rounded border bg-white px-3 py-2 text-left">Ashen Route Vault open: {debugSettings.jewelShopOpen ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ displayCondition: !debugSettings.displayCondition })} className="w-full rounded border bg-white px-3 py-2 text-left">Display condition: {debugSettings.displayCondition ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ displayAfkDuration: !debugSettings.displayAfkDuration })} className="w-full rounded border bg-white px-3 py-2 text-left">Display AFK duration: {debugSettings.displayAfkDuration ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ colosseumEnabled: !debugSettings.colosseumEnabled })} className="w-full rounded border bg-white px-3 py-2 text-left">Colosseum mode: {debugSettings.colosseumEnabled ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ displayAllBestiary: !debugSettings.displayAllBestiary })} className="w-full rounded border bg-white px-3 py-2 text-left">Display all Bestiary: {debugSettings.displayAllBestiary ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ displayAllCompendium: !debugSettings.displayAllCompendium })} className="w-full rounded border bg-white px-3 py-2 text-left">Display all Compendium: {debugSettings.displayAllCompendium ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ displayAllGlossary: !debugSettings.displayAllGlossary })} className="w-full rounded border bg-white px-3 py-2 text-left">Display all Glossary: {debugSettings.displayAllGlossary ? 'ON' : 'OFF'}</button>
        </div>}
      </div>}


      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('feedback', t('setting.feedback'))}
        {settingPanelExpanded.feedback && <div className="space-y-3 mt-3">
          <div className="text-sm text-gray-600">{t('setting.feedback.description')}</div>
          <input value={feedbackName} onChange={(e) => setFeedbackName(e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2" placeholder={t('setting.feedback.namePlaceholder')} />
          <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} className="w-full min-h-24 rounded border border-gray-300 bg-white px-3 py-2" placeholder={t('setting.feedback.bodyPlaceholder')} />
          <div>
            <label className="text-sm font-medium">{t('setting.feedback.latestBattleLog')}</label>
            <select value={feedbackLatestBattleLogSelection} onChange={(e) => setFeedbackLatestBattleLogSelection(e.target.value as 'PT1' | 'PT2' | 'PT3' | 'PT4' | 'PT5' | 'PT6' | 'None')} className="w-full rounded border border-gray-300 bg-white px-3 py-2 mt-1">
              <option value="PT1">PT1</option>
              <option value="PT2">PT2</option>
              <option value="PT3">PT3</option>
              <option value="PT4">PT4</option>
              <option value="PT5">PT5</option>
              <option value="PT6">PT6</option>
              <option value="None">None</option>
            </select>
          </div>
          <div>
            <input
              ref={feedbackFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFeedbackFileChange}
              className="w-full text-sm"
            />
            <div className="mt-1 text-xs text-gray-500">{t('setting.feedback.attachedImages', { count: formatNumber(feedbackFiles.length) })}</div>
          </div>
          <button onClick={handleSendFeedback} disabled={isSendingFeedback} className="w-full py-2 bg-sub text-white rounded font-medium disabled:opacity-60">{isSendingFeedback ? t('setting.feedback.sending') : t('setting.feedback.send')}</button>
        </div>}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('gameSetting', t('setting.backupReset'))}
        {settingPanelExpanded.gameSetting && <div className="space-y-4 mt-3">
          <div>
            <div className="text-sm font-medium mb-1">{t('setting.backup.title')}</div>
            <button
              onClick={handleExportBackup}
              className="w-full py-2 bg-sub text-white rounded font-medium"
            >
              {t('setting.backup.download')}
            </button>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">{t('setting.import.title')}</div>
            <input
              ref={importInputRef}
              type="file"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => importInputRef.current?.click()}
              className="w-full py-2 bg-sub text-white rounded font-medium"
            >
              {t('setting.import.select')}
            </button>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">{t('setting.reset.title')}</div>
            {!showResetConfirm ? (
              <button onClick={() => setShowResetConfirm(true)} className="w-full py-2 bg-accent text-white rounded font-medium">{t('setting.reset.button')}</button>
            ) : (
              <div>
                <div className="text-sm text-accent mb-2 p-2 bg-accent/10 rounded border border-accent/25">{t('setting.reset.confirm')}</div>
                <div className="flex gap-2">
                  <button onClick={() => { onResetGame(); setShowResetConfirm(false); }} className="flex-1 py-2 bg-accent text-white rounded font-medium">{t('setting.reset.execute')}</button>
                  <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2 bg-gray-300 rounded font-medium">{t('common.cancel')}</button>
                </div>
              </div>
            )}
          </div>
        </div>}
      </div>

    </div>
  );
}
