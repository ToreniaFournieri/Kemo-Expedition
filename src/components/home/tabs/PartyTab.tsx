import { Fragment,useCallback,useEffect,useMemo,useRef,useState,type Dispatch,type MouseEvent,type ReactNode,type SetStateAction } from 'react';
import {
BONUS_ABILITY_GLOSSARY_ENTRY_BY_ABILITY_ID
} from '../../../data/bonusAbilityGlossary';
import { CLASS_SHORT_NAMES,CLASSES } from '../../../data/classes';
import { ENEMIES,getEnemyIndividualAbilities,getEnemyIndividualBonuses,getEnemyTypeAbilities,getEnemyTypeBonuses } from '../../../data/enemies';
import { getSuperRareBonuses } from '../../../data/items';
import { LINEAGES } from '../../../data/lineages';
import { PREDISPOSITIONS } from '../../../data/predispositions';
import { RACES } from '../../../data/races';
import { formatAttackSpeedHelp } from '../../../game/attackProfile';
import { computeCharacterStats,getUnlockedRaceAbilitiesFromBonuses } from '../../../game/characterComputation';
import { DEITY_OPTIONS,getDeityEffectDescription,getDeityKey,getDeityRank,isNoFaithDeity,normalizeDeityName } from '../../../game/deity';
import { replaceCharacterEquipment } from '../../../game/equipment';
import { getItemDisplayName } from '../../../game/gameState';
import { getJewelDisplayName,getJewelOwnedCount,JEWELS_BY_ITEM_CATEGORY } from '../../../game/jewel';
import { resolveMagicProfile,resolveSpecialMagicFromAbilities } from '../../../game/magic';
import { computeCharacterHpContribution,computePartyStats } from '../../../game/partyComputation';
import { getXpToNextLevel } from '../../../game/partyLevel';
import { t } from '../../../i18n';
import { AbilityId,Bonus,BonusType,Character,ElementalOffense,EnemyDef,InventoryRecord,Item,JewelKey,MAX_LEVEL,Party,Race,RaceId,type EnemyAbility } from '../../../types';


import {
ABILITY_NAMES,
AutoEquipmentCombatStyle,
AutoEquipmentMode,
buildInlineBonusEntry,
C_MULTIPLIER_HELP_DESCRIPTION_KEYS,
CATEGORY_NAME_KEYS,
CATEGORY_PRIORITY,
FloatingBubblePortal,
formatBonusAbilityHelpDescription,
formatDecimal,
formatMultiplierValue,
formatNumber,
getAutoEquipmentHelpLines,
getAutoEquipmentModeLabel,
getAvailableCategoryGroups,
getBaseDefenseScale,
getBaseOffenseScale,
getBonusHelpDescription,
getCharacterCategoryMultiplier,
getCharacterCombatBonusLevels,
getCharacterDisplayedMagicalAttackAmplifier,
getCharacterGrowthMultiplier,
getEffectiveAccuracyBonus,
getElementalOffenseHelpLines,
getInventoryOwnerCharacterImageSrc,
getItemNameFontWeightClass,
getItemStats,
getJewelSlotStatusText,
getOffenseMultiplierSum,
getPotentialDefaultNamesByPt,
getRaceBonusesForSelection,
getRarityFilterNote,
getRarityShortLabel,
IOS_GLASS_BUTTON_CLASS,
IOS_GLASS_TAB_CLASS,
LINEAGE_SHORT_NAME_KEYS,
MAGIC_CATEGORIES,
matchesRarityFilter,
MELEE_CATEGORIES,
normalizeAutoEquipmentMode,
PREDISPOSITION_SHORT_NAME_KEYS,
RaceIcon,
RANGED_CATEGORIES,
RARITY_FILTER_LABELS,
RARITY_FILTER_OPTIONS,
RarityFilter,
renderElementalResistanceInline,
renderTextWithRaceIcons,
renderUiIcon,
UiIconKey,
UNIQUE_PARTY_MEMBER_IMAGE_BY_LINEAGE
} from '../homeShared';

export default function PartyTab({
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
  unlockedMimorianEnemyIds,
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
  unlockedMimorianEnemyIds: number[];
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
        changes.push({ message: formatStatChange('home.party.help.meleeAttackMultiplierLabel', `x${formatDecimal(prev.meleeAttackAmp, 2)}`, `x${formatDecimal(combatTotals.meleeAttackAmp, 2)}`), isPositive });
      }
      if (combatTotals.rangedAttackAmp !== prev.rangedAttackAmp) {
        const isPositive = combatTotals.rangedAttackAmp > prev.rangedAttackAmp;
        changes.push({ message: formatStatChange('home.party.help.rangedAttackMultiplierLabel', `x${formatDecimal(prev.rangedAttackAmp, 2)}`, `x${formatDecimal(combatTotals.rangedAttackAmp, 2)}`), isPositive });
      }
      if (combatTotals.magicalAttackAmp !== prev.magicalAttackAmp) {
        const isPositive = combatTotals.magicalAttackAmp > prev.magicalAttackAmp;
        changes.push({ message: formatStatChange('home.party.help.magicalAttackMultiplierLabel', `x${formatDecimal(prev.magicalAttackAmp, 2)}`, `x${formatDecimal(combatTotals.magicalAttackAmp, 2)}`), isPositive });
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
    const assignedMimorianEnemyIds = new Set(
      parties
        .flatMap((currentParty) => currentParty.characters)
        .filter((character) => character.id !== char.id && character.raceId === 'mimorian')
        .map((character) => character.mimorianEnemyId)
        .filter((enemyId): enemyId is number => enemyId != null)
    );
    const defaultMimorianEnemy = raceId === 'mimorian'
      ? ENEMIES.find((enemy) => unlockedMimorianEnemyIds.includes(enemy.id) && !assignedMimorianEnemyIds.has(enemy.id))
      : undefined;
    if (raceId === 'mimorian' && !defaultMimorianEnemy) return;
    setPendingEdits((prev) => ({
      ...prev,
      raceId,
      // SpecRef: 8.2.3 | Character Edit Mode (selected member): | Mimorian characters are an exception: Only `女` may be selected.
      ...(raceId === 'mimorian' ? { gender: 'female' as const } : {}),
      ...(defaultMimorianEnemy
        ? { mimorianEnemyId: defaultMimorianEnemy.id, name: defaultMimorianEnemy.name }
        : { name: getDefaultNameForRace(raceId) }),
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
  const previewMimorianEnemyId = pendingEdits?.mimorianEnemyId ?? char.mimorianEnemyId;
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
    // SpecRef: 8.2.3 | Character Edit Mode (selected member): | Character image (background)
    const nextPartyMemberImageSrc = previewRaceId === 'mimorian' && previewMimorianEnemyId != null
      ? `${import.meta.env.BASE_URL}enemy/E_${previewMimorianEnemyId}.png`
      : uniquePartyMemberImageFileName
      ? `${import.meta.env.BASE_URL}character/${uniquePartyMemberImageFileName}`
      : ptRaceGenderImageFileName
        ? `${import.meta.env.BASE_URL}character/${ptRaceGenderImageFileName}`
        : raceGenderFallbackImageFileName
          ? `${import.meta.env.BASE_URL}character/${raceGenderFallbackImageFileName}`
          : null;
    setPartyMemberImageSrc(nextPartyMemberImageSrc);
  }, [previewRaceId, previewMimorianEnemyId, uniquePartyMemberImageFileName, ptRaceGenderImageFileName, raceGenderFallbackImageFileName]);
  const raceCategoryDefinitions: Array<{ label: string; raceIds: Character['raceId'][] }> = [
    { label: t('home.party.filter.carnivore'), raceIds: ['lupinian', 'vulpinian', 'felidian'] },
    { label: t('home.party.filter.omnivore'), raceIds: ['caninian', 'ursan', 'procyonian', 'mimorian'] },
    { label: t('home.party.filter.herbivore'), raceIds: ['leporian', 'cervin', 'murid'] },
  ];
  // SpecRef: 8.2.3 | Character Edit Mode (selected member): | Mimorian appears only when an Altar form is available.
  const assignedMimorianEnemyIds = new Set(
    parties
      .flatMap((currentParty) => currentParty.characters)
      .filter((character) => character.id !== char.id && character.raceId === 'mimorian')
      .map((character) => character.mimorianEnemyId)
      .filter((enemyId): enemyId is number => enemyId != null)
  );
  const hasAvailableMimorianForm = ENEMIES.some((enemy) =>
    unlockedMimorianEnemyIds.includes(enemy.id) && !assignedMimorianEnemyIds.has(enemy.id)
  );
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
        // SpecRef: 8.2.1 | Displays | Hide a single Party tab while preserving its reserved area.
        <div
          className={`liquid-glass-segmented party-pt-segmented mb-4 flex gap-1 rounded-2xl p-1 ${parties.length <= 1 ? 'invisible pointer-events-none' : ''}`}
          aria-hidden={parties.length <= 1}
        >
          {parties.map((partyEntry, partyIndex) => {
            const isSelected = partyIndex === selectedPartyIndex;
            return (
              <button
                key={partyEntry.id}
                tabIndex={parties.length <= 1 ? -1 : 0}
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
          {t('home.party.reorderDragDropHint')}
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
          const mimorianEnemy = c.raceId === 'mimorian'
            ? ENEMIES.find((enemy) => enemy.id === c.mimorianEnemyId)
            : undefined;
          const mimorianEnemyRank = mimorianEnemy?.type === 'boss' ? 'B' : mimorianEnemy?.type === 'elite' ? 'E' : 'N';
          const mimorianListDescriptor = mimorianEnemy
            ? `${t(`masterData.enemyType.${mimorianEnemy.enemyType}.short`)}/${mimorianEnemyRank}`
            : '-/N';
          const uniquePreviewImageFileName = c.isUnique ? UNIQUE_PARTY_MEMBER_IMAGE_BY_LINEAGE[c.lineageId] : undefined;
          const previewMimorianEnemyImageSrc = c.raceId === 'mimorian' && c.mimorianEnemyId != null
            ? `${import.meta.env.BASE_URL}enemy/E_${c.mimorianEnemyId}.png`
            : undefined;
          const previewPtRaceGenderImageFileName = !uniquePreviewImageFileName && !previewMimorianEnemyImageSrc
            ? `${party.id}_${r.englishName}_${c.gender === 'male' ? 'Male' : 'Female'}.png`
            : undefined;
          const previewImageSrc = previewMimorianEnemyImageSrc
            ?? (uniquePreviewImageFileName
            ? `${import.meta.env.BASE_URL}character/${uniquePreviewImageFileName}`
            : previewPtRaceGenderImageFileName
              ? `${import.meta.env.BASE_URL}character/${previewPtRaceGenderImageFileName}`
              : null);
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
                    className={`pointer-events-none absolute bottom-0 left-1/2 z-0 h-[240%] -translate-x-1/2 bg-contain bg-bottom bg-no-repeat ${
                      previewMimorianEnemyImageSrc ? 'w-[180%]' : 'w-[220%]'
                    }`}
                    style={{ backgroundImage: `url(${previewImageSrc})` }}
                  />
                )}
                <div className="absolute inset-0 z-10 overflow-hidden rounded-xl">
                  {!previewImageSrc && (
                    <div className="flex h-full w-full items-center justify-center"><RaceIcon race={r} className="h-7 w-7" /></div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/35 to-transparent px-1 py-0.5 text-center text-[10px] leading-tight text-white">
                    <div>{mcShort}({isMaster ? t('party.class.masterShort') : scShort})</div>
                    <div>{c.raceId === 'mimorian' ? mimorianListDescriptor : `${lineageShort}/${predispositionShort}`}</div>
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
                        const isBlockedByMimorianGender = selectedRaceId === 'mimorian' && gender === 'male';
                        const isDisabled = char.isUnique || isBlockedByDuplicate || isBlockedByMimorianGender;
                        const shouldShowGenderSymbol = char.isUnique
                          ? (pendingEdits?.gender ?? char.gender) === gender
                          : !isBlockedByDuplicate && !isBlockedByMimorianGender;

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
                    // SpecRef: 8.2.3 | Character Edit Mode (selected member): | Mimorian characters are an exception: Only `女` may be selected.
                    const isBlockedByMimorianGender = race.id === 'mimorian' && selectedGender === 'male';
                    const isDisabled = char.isUnique || isBlockedByDuplicate || isBlockedByMimorianGender;
                    const shouldShowRaceIcon = char.isUnique
                      ? isSelectedRace
                      : !isBlockedByDuplicate && !isBlockedByMimorianGender;

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
                              {category.raceIds
                                .filter((raceId) => raceId !== 'mimorian' || selectedRaceId === 'mimorian' || hasAvailableMimorianForm)
                                .map((raceId) => {
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
                const selectedMainSubBonuses = (selectedMainClass?.mainSubBonuses ?? []) as Bonus[];
                const selectedMainBonusList = [
                  ...selectedMainSubBonuses,
                  ...(selectedMainClassIsMaster
                    ? ((selectedMainClass?.masterBonuses ?? []) as Bonus[])
                    : ((selectedMainClass?.mainBonuses ?? []) as Bonus[])),
                ];
                const selectedMainBonusEntries = selectedMainBonusList
                  .map((bonus, index) => {
                    const entry = buildInlineBonusEntry('main-class-bonus', selectedMainClassId, bonus, index);
                    return entry
                      ? { ...entry, isMasterBonus: selectedMainClassIsMaster && index >= selectedMainSubBonuses.length }
                      : null;
                  })
                  .filter((entry): entry is { key: string; label: string; description: string | null; isMasterBonus: boolean } => entry !== null);

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
                                className={`text-left hover:underline ${entry.isMasterBonus ? 'font-bold' : ''}`}
                              >
                                {entry.label}
                              </button>
                            ) : (
                              <span className={entry.isMasterBonus ? 'font-bold' : undefined}>{entry.label}</span>
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
            {previewRaceId === 'mimorian' ? (() => {
              // SpecRef: 8.4.5 | Altar (祭壇) | Mimorian Character Edit Mode
              // A copied enemy form is exclusive to one Mimorian across every party.
              // Keep this character's current form in the list while excluding forms used by others.
              const unlockedEnemies = ENEMIES.filter((enemy) =>
                unlockedMimorianEnemyIds.includes(enemy.id) && !assignedMimorianEnemyIds.has(enemy.id)
              );
              const enemyTypes = Array.from(new Set(unlockedEnemies.map((enemy) => enemy.enemyType)));
              const selectedEnemy = unlockedEnemies.find((enemy) => enemy.id === previewMimorianEnemyId) ?? unlockedEnemies[0];
              const enemiesForType = unlockedEnemies.filter((enemy) => enemy.enemyType === selectedEnemy?.enemyType);
              const selectedEnemyTypeAbilities = getEnemyTypeAbilities(selectedEnemy?.enemyType ?? '', Number.MAX_SAFE_INTEGER)
                .map((typeAbility) => selectedEnemy?.abilities.find((ability) => ability.id === typeAbility.id))
                .filter((ability): ability is EnemyAbility => ability !== undefined);
              const selectedEnemyTypeBonuses = getEnemyTypeBonuses(selectedEnemy?.enemyType ?? '');
              // SpecRef: 4.2.2 | Enemy | additional abilities or bonus
              const selectedEnemyIndividualAbilities = selectedEnemy
                ? getEnemyIndividualAbilities(selectedEnemy.id)
                : [];
              const selectedEnemyIndividualBonuses = selectedEnemy
                ? getEnemyIndividualBonuses(selectedEnemy.id)
                : [];
              const buildEnemyAbilityEntries = (prefix: string, abilities: typeof selectedEnemyTypeAbilities) => abilities
                .map((ability, index) => buildInlineBonusEntry(prefix, selectedEnemy?.id.toString(), {
                  type: 'ability',
                  value: ability.level,
                  abilityId: ability.id,
                  abilityLevel: ability.level,
                }, index))
                .filter((entry): entry is { key: string; label: string; description: string | null } => entry !== null);
              const buildEnemyBonusEntries = (prefix: string, bonuses: Bonus[]) => bonuses
                .map((bonus, index) => {
                  const mimorianBonus = bonus;
                  const displayBonus = ['fire_offense', 'ice_offense', 'thunder_offense'].includes(mimorianBonus.type) && mimorianBonus.value > 1
                    ? { ...mimorianBonus, value: mimorianBonus.value / 100 }
                    : mimorianBonus;
                  return buildInlineBonusEntry(prefix, selectedEnemy?.id.toString(), displayBonus, index);
                })
                .filter((entry): entry is { key: string; label: string; description: string | null } => entry !== null);
              const typeEntries = [
                ...buildEnemyAbilityEntries('mimorian-enemy-type-ability', selectedEnemyTypeAbilities),
                ...buildEnemyBonusEntries('mimorian-enemy-type-bonus', selectedEnemyTypeBonuses),
              ];
              const individualEntries = [
                ...buildEnemyAbilityEntries('mimorian-individual-enemy-ability', selectedEnemyIndividualAbilities),
                ...buildEnemyBonusEntries('mimorian-individual-enemy-bonus', selectedEnemyIndividualBonuses),
              ];
              const selectEnemy = (enemy: EnemyDef) => setPendingEdits({
                ...pendingEdits,
                mimorianEnemyId: enemy.id,
                name: enemy.name,
              });

              return (
                // SpecRef: 8.2.3 | Character Edit Mode (selected member): | Exception — Mimorian characters
                <div className="rounded border border-gray-200 bg-white/5 backdrop-blur-[1px] p-2 text-xs space-y-2">
                  <label className="block">
                    <span className="mb-1 block font-bold text-gray-600">{t('home.party.enemyType')}</span>
                    <select
                      value={selectedEnemy?.enemyType ?? ''}
                      onChange={(event) => {
                        const enemy = unlockedEnemies.find((candidate) => candidate.enemyType === event.target.value);
                        if (enemy) selectEnemy(enemy);
                      }}
                      className="w-full rounded border border-gray-300 bg-white/80 px-2 py-1"
                      disabled={unlockedEnemies.length === 0}
                    >
                      {enemyTypes.map((enemyType) => (
                        <option key={enemyType} value={enemyType}>{t(`setting.bestiary.enemyType.${enemyType}`)}</option>
                      ))}
                    </select>
                    <span className="mt-1 block text-gray-600">{renderInlineBonusEntries(typeEntries)}</span>
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-bold text-gray-600">{t('home.party.individualEnemy')}</span>
                    <select
                      value={selectedEnemy?.id ?? ''}
                      onChange={(event) => {
                        const enemy = unlockedEnemies.find((candidate) => candidate.id === Number(event.target.value));
                        if (enemy) selectEnemy(enemy);
                      }}
                      className="w-full rounded border border-gray-300 bg-white/80 px-2 py-1"
                      disabled={unlockedEnemies.length === 0}
                    >
                      {enemiesForType.map((enemy) => (
                        <option key={enemy.id} value={enemy.id}>{enemy.name} (ID: {new Intl.NumberFormat('ja-JP').format(enemy.id)})</option>
                      ))}
                    </select>
                    {unlockedEnemies.length === 0 && <span className="mt-1 block text-accent">{t('home.altar.noUnlockedForms')}</span>}
                    <span className="mt-1 block text-gray-600">{renderInlineBonusEntries(individualEntries)}</span>
                  </label>
                </div>
              );
            })() : <>
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
            </>}
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
                <span>{char.raceId === 'mimorian' && char.mimorianEnemyId != null
                  ? (() => {
                    // SpecRef: 8.2.3 | Character Edit Mode (selected member): | Exception — Mimorian characters
                    const copiedEnemy = ENEMIES.find((enemy) => enemy.id === char.mimorianEnemyId);
                    return `${race.name} / ${mainClass.name}(${char.mainClassId === char.subClassId ? t('party.class.master') : subClass.name}) / ${copiedEnemy ? t(`setting.bestiary.enemyType.${copiedEnemy.enemyType}`) : '-'} / ${copiedEnemy?.name ?? '-'}`;
                  })()
                  : `${race.name} / ${mainClass.name}(${char.mainClassId === char.subClassId ? t('party.class.master') : subClass.name}) / ${lineage.name} / ${predisposition.name}`}</span>
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
                        {row.label}: {formatNumber(row.value)} ({row.note} x{formatDecimal(row.ratio, 2)})
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
                    text: `${t('combat.rangedAttack')}:${formatNumber(Math.floor(stats.rangedAttack))} x ${formatNumber(stats.rangedNoA)}${t('combat.times')}(x${formatDecimal(amp, 2)})`,
                    helpTitle: t('combat.rangedAttack'),
                    helpLines: [
                      formatAttackSpeedHelp('ranged', t),
                      t('home.party.help.rangedAttackPower', { value: formatNumber(Math.floor(stats.rangedAttack)) }),
                      t('home.party.help.rangedAttackCount', { value: formatNumber(stats.rangedNoA) }),
                      t('home.party.help.rangedAttackMultiplier', { value: formatDecimal(amp, 2) }),
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
                    text: `${t('combat.magicalAttack')}:${formatNumber(Math.floor(stats.magicalAttack))} x ${formatNumber(stats.magicalNoA)}${t('combat.times')}(x${formatDecimal(amp, 2)})`,
                    helpTitle: t('combat.magicalAttack'),
                    helpLines: [
                      formatAttackSpeedHelp('magical', t),
                      t('home.party.help.magicalAttackPower', { value: formatNumber(Math.floor(stats.magicalAttack)) }),
                      t('home.party.help.magicalAttackCount', { value: formatNumber(stats.magicalNoA) }),
                      t('home.party.help.magicalAttackMultiplier', { value: formatDecimal(amp, 2) }),
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
                    text: `${t('combat.meleeAttack')}:${formatNumber(Math.floor(stats.meleeAttack))} x ${formatNumber(stats.meleeNoA)}${t('combat.times')}(x${formatDecimal(amp, 2)})`,
                    helpTitle: t('combat.meleeAttack'),
                    helpLines: [
                      formatAttackSpeedHelp('melee', t),
                      t('home.party.help.meleeAttackPower', { value: formatNumber(Math.floor(stats.meleeAttack)) }),
                      t('home.party.help.meleeAttackCount', { value: formatNumber(stats.meleeNoA) }),
                      t('home.party.help.meleeAttackMultiplier', { value: formatDecimal(amp, 2) }),
                    ],
                  });
                }

                const baseDecay = 0.90 + getEffectiveAccuracyBonus(stats.accuracyBonus, stats.abilities);
                const decayText = `${formatDecimal(baseDecay * 100, 1)}%`;
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
                  // The status pane shows the ideal, terrain-independent spell selection.
                  // Runtime battle selection repeats this check with terrain-adjusted NoA.
                  const specialMagic = resolveSpecialMagicFromAbilities(stats.abilities, stats.magicalNoA);
                  const magicProfile = resolveMagicProfile({
                    style: specialMagic === 'gravity_well' ? 'percentage_damage' : specialMagic ? 'debuff' : hasArcMagic ? 'arc-magic' : 'multi-hit',
                    specialMagic,
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
                    text: `${t('combat.element')}:${elementIcon ? t('common.yes') : t('common.none')}(x${formatDecimal(stats.elementalOffenseValue, 2)})`,
                    renderedText: (
                      <>
                        {t('combat.element')}:
                        {elementIcon ? renderUiIcon(elementIcon) : t('common.none')}
                        (x{formatDecimal(stats.elementalOffenseValue, 2)})
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
              // SpecRef: 8.2.3 | Character Edit Mode (selected member): | Exception — Mimorian characters
              const copiedMimorianEnemy = char.raceId === 'mimorian'
                ? ENEMIES.find((enemy) => enemy.id === char.mimorianEnemyId)
                : undefined;
              const allBonuses = [
                ...race.bonuses,
                ...mainClass.mainSubBonuses,
                ...(isMasterClass ? mainClass.masterBonuses : [...mainClass.mainBonuses, ...subClass.mainSubBonuses]),
                ...(char.raceId === 'mimorian'
                  ? (copiedMimorianEnemy?.bonuses ?? [])
                  : [...predisposition.bonuses, ...lineage.bonuses]),
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
                    ? formatDecimal(effectiveMultiplier, 2)
                    : formatDecimal(effectiveMultiplier, 1);
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
                      : `${addNames[normalizedKey] ?? normalizedKey}${val >= 0 ? '+' : ''}${val}`;
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
                          {!displayItem.isEquipped && <span className="text-xs text-gray-500 shrink-0">x{formatNumber(displayItem.count)}</span>}
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
