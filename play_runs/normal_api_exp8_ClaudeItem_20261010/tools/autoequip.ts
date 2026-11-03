import { CLASSES } from '../../../src/data/classes';
import { getSuperRareBonuses } from '../../../src/data/items';
import { LINEAGES } from '../../../src/data/lineages';
import { PREDISPOSITIONS } from '../../../src/data/predispositions';
import { RACES } from '../../../src/data/races';
import { computeCharacterStats } from '../../../src/game/characterComputation';
import { selectBestAutoEquipmentFillCandidate, selectBestAutoEquipmentUpgradeCandidate, type EquipmentRankingCandidate } from '../../../src/game/battleKernel';
import { type AutoEquipmentAttributionCollector, type AutoEquipmentProfileAction } from '../../../src/game/autoEquipmentAttribution';
import { AutoEquipmentInventoryIndex } from '../../../src/game/autoEquipmentInventoryIndex';
import { getItemCoreConceptValue, getItemDisplayName } from '../../../src/game/gameState';
import { addJewelToInventory, isJewelAllowedForCategory, planAutoJewelAssignmentsForCharacter, removeJewelFromInventory } from '../../../src/game/jewel';
import { t } from '../../../src/i18n';
import { Bonus, Character, GameState, getVariantKey, InventoryRecord, Item, ItemCategory, JewelInventory, JewelKey } from '../../../src/types';
import { AUTO_EQUIPMENT_PRIORITY_BY_CLASS, AutoEquipmentCombatStyle, AutoEquipmentRunSummary, AutoEquipmentTargetCategory, formatDecimal, getCharacterCategoryMultiplier, getNextMissingAutoEquipmentCategory, normalizeAutoEquipmentMode } from '../../../src/components/home/homeShared';
import type { GameState } from '../../../src/types';
import { gameReducer as __gr } from '../../../src/hooks/useGameState';
export const planAutoEquipment = (
    sourceState: GameState,
    targetPartyIndexes?: number[],
    targetCharacterIds?: Array<number | string>,
    options?: {
      forceFull?: boolean;
      profile?: {
        collector: AutoEquipmentAttributionCollector;
        actions: AutoEquipmentProfileAction[];
        candidateStrategy?:
          | 'legacy'
          | 'indexed'
          | 'indexed_multiplier_cache'
          | 'indexed_item_facts'
          | 'indexed_prepared';
      };
    },
  ): {
    summary: AutoEquipmentRunSummary;
    actions: AutoEquipmentProfileAction[];
    notifications: Array<{ message: string; partyIndex: number; startedFromEmpty: boolean }>;
  } => {
    const plannedActions: AutoEquipmentProfileAction[] = [];
    const summary: AutoEquipmentRunSummary = {
      processedCharacterIds: [],
      unequippedCount: 0,
      equippedCount: 0,
      upgradedCount: 0,
      jewelAssignmentCount: 0,
    };
    const profile = options?.profile;
    const candidateStrategy = profile?.candidateStrategy ?? 'indexed_prepared';
    const usesInventoryIndex = candidateStrategy !== 'legacy';
    const usesItemFactCache = candidateStrategy === 'indexed_item_facts' || candidateStrategy === 'indexed_prepared';
    const usesCharacterCategoryMultiplierCache = candidateStrategy === 'indexed_multiplier_cache'
      || candidateStrategy === 'indexed_prepared';
    const measure = <T,>(phase: Parameters<AutoEquipmentAttributionCollector['measure']>[0], operation: () => T): T => (
      profile ? profile.collector.measure(phase, operation) : operation()
    );
    const queueAutoEquipmentAction = (action: AutoEquipmentProfileAction): void => {
      plannedActions.push(action);
      if (!profile) return;
      profile.collector.addDispatchedAction();
      profile.actions.push(action);
    };
    const dispatchEquipItem = (
      characterId: number,
      slotIndex: number,
      inventoryKey: string | null,
      partyIndex: number,
    ) => measure('actionDispatch', () => {
      queueAutoEquipmentAction({ type: 'EQUIP_ITEM', characterId, slotIndex, itemKey: inventoryKey, partyIndex });
    });
    const dispatchAttachJewel = (
      characterId: number,
      slotIndex: number,
      key: JewelKey,
      rank: number,
      partyIndex: number,
    ) => measure('actionDispatch', () => {
      queueAutoEquipmentAction({ type: 'ATTACH_JEWEL', characterId, slotIndex, jewelKey: key, rank, partyIndex });
    });
    const targetPartyIndexSet = targetPartyIndexes ? new Set(targetPartyIndexes) : null;
    const targetCharacterIdSet = targetCharacterIds ? new Set(targetCharacterIds) : null;
    const forceFull = options?.forceFull === true;
    // SpecRef: 7.1.2.2 | Simulation: the equipment change | Initialize the simulation memory.
    // Reads can share the immutable source; allocate scratch inventory only
    // when a selected equipment change actually mutates the decision view.
    let simulatedInventory: InventoryRecord = sourceState.global.inventory;
    const prepareInventoryMutation = () => {
      if (simulatedInventory === sourceState.global.inventory) {
        simulatedInventory = measure('inventoryClone', () => ({ ...simulatedInventory }));
      }
    };
    // SpecRef: 7.1.2.2 | Evaluate jewel allocation | 8-2
    // Planned equipment changes return displaced jewels to Inventory, so the
    // jewel candidate pool follows the planned actions instead of the source.
    let simulatedJewels: JewelInventory = sourceState.global.jewels;
    const reconcileSimulatedJewels = (beforeSlots: readonly (Item | null)[], afterSlots: readonly (Item | null)[]) => {
      const deltaByJewel = new Map<string, { key: JewelKey; rank: number; delta: number }>();
      const count = (slots: readonly (Item | null)[], sign: number) => slots.forEach((item) => {
        if (!item?.jewel) return;
        const id = `${item.jewel.key}:${item.jewel.rank}`;
        const entry = deltaByJewel.get(id) ?? { key: item.jewel.key, rank: item.jewel.rank, delta: 0 };
        entry.delta += sign;
        deltaByJewel.set(id, entry);
      });
      count(beforeSlots, 1);
      count(afterSlots, -1);
      deltaByJewel.forEach(({ key, rank, delta }) => {
        if (delta === 0) return;
        if (simulatedJewels === sourceState.global.jewels) simulatedJewels = { ...simulatedJewels };
        for (let i = 0; i < Math.abs(delta); i += 1) {
          simulatedJewels = delta > 0
            ? addJewelToInventory(simulatedJewels, key, rank, 1, true)
            : removeJewelFromInventory(simulatedJewels, key, rank, true);
        }
      });
    };
    let inventoryIndex: AutoEquipmentInventoryIndex | null = null;
    const getInventoryIndex = (): AutoEquipmentInventoryIndex | null => {
      if (!usesInventoryIndex) return null;
      if (!inventoryIndex) {
        inventoryIndex = measure('inventoryIndexBuild', () => new AutoEquipmentInventoryIndex(simulatedInventory));
        profile?.collector.addInventoryIndexEntries(Object.keys(simulatedInventory).length);
      }
      return inventoryIndex;
    };
    const slotNotifications = new Map<string, {
      message: string;
      partyIndex: number;
      startedFromEmpty: boolean;
      partyName: string;
      characterName: string;
      previousItem: Item | null;
    }>();
    const getAutoEquipmentNotificationMessage = (
      partyName: string,
      characterName: string,
      item: Item,
      previousItem: Item | null,
      startedFromEmpty: boolean,
    ) => {
      const message = startedFromEmpty
        ? t('home.notification.equipment.equipped', { item: getItemDisplayName(item) })
        : t('home.notification.equipment.replaced', { previous: getItemDisplayName(previousItem!), item: getItemDisplayName(item) });
      return t('home.notification.equipment.characterChanged', { party: partyName, character: characterName, message });
    };
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
      slotNotifications.set(notificationKey, {
        message: getAutoEquipmentNotificationMessage(partyName, characterName, item, previousItem, startedFromEmpty),
        partyIndex,
        startedFromEmpty,
        partyName,
        characterName,
        previousItem,
      });
    };
    const updateSlotNotificationItem = (
      characterId: string | number,
      slotIndex: number,
      partyIndex: number,
      item: Item,
    ) => {
      const notificationKey = `${partyIndex}:${characterId}:${slotIndex}`;
      const existing = slotNotifications.get(notificationKey);
      if (!existing) return;
      slotNotifications.set(notificationKey, {
        ...existing,
        message: getAutoEquipmentNotificationMessage(
          existing.partyName,
          existing.characterName,
          item,
          existing.previousItem,
          existing.startedFromEmpty,
        ),
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
      measure('notificationPlanning', () => setSlotNotification(
        partyName, characterName, characterId, slotIndex, partyIndex, item, previousItem,
      ));
    };

    const addItemToSimulatedInventory = (item: Item) => {
      const key = getVariantKey(item);
      prepareInventoryMutation();
      const existing = simulatedInventory[key];
      if (existing) {
        simulatedInventory[key] = { ...existing, count: existing.count + 1, status: 'owned' };
      } else {
        const variant = { item, count: 1, status: 'owned' as const };
        simulatedInventory[key] = variant;
        inventoryIndex?.addIfAbsent(key, variant);
      }
    };

    const removeItemFromSimulatedInventory = (key: string) => {
      const existing = simulatedInventory[key];
      if (!existing || existing.count <= 0) return;
      prepareInventoryMutation();
      if (existing.count <= 1) {
        delete simulatedInventory[key];
        inventoryIndex?.remove(key, existing);
      } else {
        simulatedInventory[key] = { ...existing, count: existing.count - 1 };
      }
    };

    const getItemTier = (item: Item): number => Math.floor(item.id / 1000);

    const formatCBonusValue = (value: number): string => (Math.round(value * 1000000) / 1000000).toString();

    const formatDefenseBonusPercent = (value: number): string => {
      const percent = Math.round(value * 1000) / 10;
      return formatDecimal(percent, 1, Number.isInteger(percent) ? 0 : 1);
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

    type AutoEquipmentItemFacts = {
      tier: number;
      coreConcept: number;
      hasAntagonism: boolean;
      cBonusSignatures: readonly string[];
      noABonus: number;
    };
    let itemFactCache: WeakMap<Item, AutoEquipmentItemFacts> | null = null;
    const computeItemFacts = (item: Item): AutoEquipmentItemFacts => {
      profile?.collector.addItemFactComputation();
      const noABonus = item.category === 'gauntlet'
        ? item.meleeNoABonus ?? 0
        : item.category === 'archery'
          ? item.rangedNoABonus ?? 0
          : item.category === 'catalyst'
            ? item.magicalNoABonus ?? 0
            : 0;
      return {
        tier: getItemTier(item),
        coreConcept: getItemCoreConceptValue(item),
        hasAntagonism: [
          ...(item.bonuses ?? []),
          ...getSuperRareBonuses(item.superRare),
        ].some((bonus) => bonus.type === 'antagonism'),
        cBonusSignatures: [...getItemCBonusSignatures(item)],
        noABonus,
      };
    };
    const getItemFacts = (item: Item): AutoEquipmentItemFacts => {
      if (!usesItemFactCache) return computeItemFacts(item);
      const cache = itemFactCache ??= new WeakMap<Item, AutoEquipmentItemFacts>();
      const cached = cache.get(item);
      if (cached) {
        profile?.collector.addItemFactCacheHit();
        return cached;
      }
      const facts = computeItemFacts(item);
      cache.set(item, facts);
      return facts;
    };
    const addItemCBonusSignaturesToMemory = (item: Item, memory: Set<string>): void => {
      const cachedFacts = usesItemFactCache ? itemFactCache?.get(item) : undefined;
      if (cachedFacts) profile?.collector.addItemFactCacheHit();
      const signatures = cachedFacts?.cBonusSignatures ?? getItemCBonusSignatures(item);
      signatures.forEach((bonusName) => memory.add(bonusName));
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

    let characterCategoryMultiplierCache: WeakMap<Character, Map<ItemCategory, number>> | null = null;
    const getAutoEquipmentCategoryMultiplier = (character: Character, category: ItemCategory): number => {
      if (!usesCharacterCategoryMultiplierCache) {
        profile?.collector.addCharacterCategoryMultiplierComputation();
        return getCharacterCategoryMultiplier(character, category);
      }
      const cache = characterCategoryMultiplierCache ??= new WeakMap<Character, Map<ItemCategory, number>>();
      let characterCache = cache.get(character);
      if (!characterCache) {
        characterCache = new Map<ItemCategory, number>();
        cache.set(character, characterCache);
      }
      const cached = characterCache.get(category);
      if (cached !== undefined) {
        profile?.collector.addCharacterCategoryMultiplierCacheHit();
        return cached;
      }
      profile?.collector.addCharacterCategoryMultiplierComputation();
      const multiplier = getCharacterCategoryMultiplier(character, category);
      characterCache.set(category, multiplier);
      return multiplier;
    };

    const getAutoEquipmentSelectionValueForCharacter = (
      character: Character,
      item: Item,
      coreConcept: number = getItemCoreConceptValue(item),
      noABonus: number = item.category === 'gauntlet'
        ? item.meleeNoABonus ?? 0
        : item.category === 'archery'
          ? item.rangedNoABonus ?? 0
          : item.category === 'catalyst'
            ? item.magicalNoABonus ?? 0
            : 0,
    ): number => {
      // SpecRef: 7.1.1.2 | Equipping into empty slots | modified core concept
      const categoryMultiplier = getAutoEquipmentCategoryMultiplier(character, item.category);
      return Math.round(coreConcept * categoryMultiplier) + noABonus;
    };

    const getBestVariantKeyInCategory = (
      character: Character,
      targetCategories: ItemCategory[],
      memoryItemIds: Set<number>,
      memoryCBonusNames: Set<string>,
    ): string | null => {
      // SpecRef: 7.1.1.2 | Equipping into empty slots | Search for a candidate item
      const optionKeys: string[] = [];
      const candidates: EquipmentRankingCandidate[] = [];
      const candidateIndex = getInventoryIndex();
      const inventoryKeys = candidateIndex
        ? candidateIndex.keysForCategories(targetCategories)
        : Object.keys(simulatedInventory);
      profile?.collector.addInventoryEntries(inventoryKeys.length);
      measure('inventoryScan', () => inventoryKeys.forEach((key) => {
          const variant = simulatedInventory[key];
          if (!variant) return;
          if (
            variant.status !== 'owned'
            || variant.count <= 0
            || !targetCategories.includes(variant.item.category)
          ) {
            return;
          }

          if (memoryItemIds.has(variant.item.id)) return;
          const itemFacts = usesItemFactCache ? getItemFacts(variant.item) : null;
          const hasAntagonismBonus = itemFacts?.hasAntagonism ?? [
              ...(variant.item.bonuses ?? []),
              ...getSuperRareBonuses(variant.item.superRare),
            ].some((bonus) => bonus.type === 'antagonism');
          if (hasAntagonismBonus) return;

          const cBonusNames = itemFacts?.cBonusSignatures ?? getItemCBonusSignatures(variant.item);
          for (const bonusName of cBonusNames) {
            if (memoryCBonusNames.has(bonusName)) return;
          }

          optionKeys.push(key);
          candidates.push({
            index: optionKeys.length - 1,
            tier: itemFacts?.tier ?? getItemTier(variant.item),
            enhancement: variant.item.enhancement,
            coreConcept: itemFacts?.coreConcept ?? getItemCoreConceptValue(variant.item),
            superRare: variant.item.superRare,
            itemId: variant.item.id,
            selectionValue: itemFacts
              ? getAutoEquipmentSelectionValueForCharacter(
                character,
                variant.item,
                itemFacts.coreConcept,
                itemFacts.noABonus,
              )
              : getAutoEquipmentSelectionValueForCharacter(character, variant.item),
          });
        }));

      profile?.collector.addRankingCandidates(candidates.length);
      const selectedIndex = measure('nativeRanking', () => selectBestAutoEquipmentFillCandidate(candidates));
      return selectedIndex == null ? null : optionKeys[selectedIndex] ?? null;
    };

    const getBestUpgradeVariantKeyForItem = (equippedItem: Item): string | null => {
      if (equippedItem.superRare > 0) return null;

      const optionKeys: string[] = [];
      const candidates: EquipmentRankingCandidate[] = [];
      const candidateIndex = getInventoryIndex();
      const inventoryKeys = candidateIndex
        ? candidateIndex.keysForItemId(equippedItem.id)
        : Object.keys(simulatedInventory);
      profile?.collector.addInventoryEntries(inventoryKeys.length);
      measure('inventoryScan', () => inventoryKeys.forEach((key) => {
          const variant = simulatedInventory[key];
          if (!variant) return;
          if (variant.status !== 'owned' || variant.count <= 0) return;
          if (variant.item.id !== equippedItem.id) return;
          if (variant.item.superRare > 0) return;
          if (variant.item.enhancement <= equippedItem.enhancement) return;
          optionKeys.push(key);
          candidates.push({
            index: optionKeys.length - 1,
            tier: getItemTier(variant.item),
            enhancement: variant.item.enhancement,
            coreConcept: getItemCoreConceptValue(variant.item),
            superRare: variant.item.superRare,
          itemId: variant.item.id,
        });
      }));

      profile?.collector.addRankingCandidates(candidates.length);
      const selectedIndex = measure('nativeRanking', () => selectBestAutoEquipmentUpgradeCandidate(candidates));
      return selectedIndex == null ? null : optionKeys[selectedIndex] ?? null;
    };

    sourceState.parties.forEach((party, partyIndex) => {
      if (targetPartyIndexSet && !targetPartyIndexSet.has(partyIndex)) return;

      const isJewelPriorityParty = sourceState.global.jewelAutoEquipPriorityPartyId === party.id;
      const maxSlotsByCharacter = new Map<Character, number>();
      const getMaxSlots = (character: Character): number => {
        const cached = maxSlotsByCharacter.get(character);
        if (cached !== undefined) return cached;
        const slots = measure('statComputation', () => computeCharacterStats(character, party.level).maxEquipSlots);
        maxSlotsByCharacter.set(character, slots);
        return slots;
      };
      const fullRevisionIsDirty = party.lastFullEquipmentRevision !== (sourceState.global.equipmentInventoryRevision ?? 0)
        || (isJewelPriorityParty && party.lastFullJewelRevision !== (sourceState.global.jewelInventoryRevision ?? 0));
      const shouldRunFull = forceFull || fullRevisionIsDirty || party.characters.some((character) => {
        const maxSlots = getMaxSlots(character);
        for (let slotIndex = 0; slotIndex < maxSlots; slotIndex += 1) {
          if (character.equipment[slotIndex] == null) return true;
        }
        return false;
      });

      party.characters.forEach((character) => {
        if (targetCharacterIdSet && !targetCharacterIdSet.has(character.id)) return;
        summary.processedCharacterIds.push(character.id);

        const autoEquipmentMode = normalizeAutoEquipmentMode(character.autoEquipmentMode);
        if (autoEquipmentMode === 0) return;
        if (autoEquipmentMode === 2 && !shouldRunFull) return;

        // SpecRef: 7.1.1.2 | Equipping into empty slots | Item selection from a specific item category
        const combatStyle = decideAutoEquipmentCombatStyle(character);
        const priorities = AUTO_EQUIPMENT_PRIORITY_BY_CLASS[character.mainClassId] ?? AUTO_EQUIPMENT_PRIORITY_BY_CLASS.guardian;
        const maxEquipSlots = getMaxSlots(character);
        const simulatedEquipmentSlots = Array.from({ length: maxEquipSlots }, (_, index) => character.equipment[index] ?? null);
        let jewelBaselineSlots: (Item | null)[] = [...simulatedEquipmentSlots];
        const memoryItemIds = new Set<number>();
        const memoryCBonusNames = new Set<string>();
        const replaceableSlotIndexes = simulatedEquipmentSlots
          .map((item, slotIndex) => (!item || (item.isLocked !== true && item.superRare <= 0)) ? slotIndex : -1)
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
        // SpecRef: 7.1.2.2 | Initialize the simulation memory | Memory A/B hold only locked and Super Rare items.
        // Every other equipped item is reevaluated (step 2), so it must not block its own replacement candidates.
        simulatedEquipmentSlots.forEach((item) => {
          if (!item || (item.isLocked !== true && item.superRare <= 0)) return;
          memoryItemIds.add(item.id);
          addItemCBonusSignaturesToMemory(item, memoryCBonusNames);
          equippedCategoryCounts[item.category] = (equippedCategoryCounts[item.category] ?? 0) + 1;
        });

        if (autoEquipmentMode === 2) {
          // The replaceable items rejoin the candidate pool beside Inventory, so the simulated set is built as if
          // every replaceable slot were empty and an equipped item survives only by winning its category again.
          const currentKeyBySlot = new Map<number, string>();
          replaceableSlotIndexes.forEach((slotIndex) => {
            const item = simulatedEquipmentSlots[slotIndex];
            if (!item) return;
            currentKeyBySlot.set(slotIndex, getVariantKey(item));
            addItemToSimulatedInventory(item.jewel ? { ...item, jewel: null } : item);
          });

          const plannedKeys: string[] = [];
          for (let planned = 0; planned < replaceableSlotIndexes.length; planned += 1) {
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

            if (!resolvedSelection) break;
            const variant = simulatedInventory[resolvedSelection.itemKey];
            if (!variant) break;

            equippedCategoryCounts[variant.item.category] = (equippedCategoryCounts[variant.item.category] ?? 0) + 1;
            if (
              combatStyle == null
              && (resolvedSelection.targetCategory === 'i.weapon' || resolvedSelection.targetCategory === 'i.NoA')
            ) {
              resolvedFallbackTargetCounts[resolvedSelection.targetCategory] = (resolvedFallbackTargetCounts[resolvedSelection.targetCategory] ?? 0) + 1;
            }
            removeItemFromSimulatedInventory(resolvedSelection.itemKey);
            memoryItemIds.add(variant.item.id);
            addItemCBonusSignaturesToMemory(variant.item, memoryCBonusNames);
            plannedKeys.push(resolvedSelection.itemKey);
          }

          // SpecRef: 7.1.2.4 | Commit: Equipment change | apply only the differences.
          // A planned item that is already equipped stays in its slot (with its jewel); only the rest move.
          const openSlots = new Set(replaceableSlotIndexes);
          const incomingKeys: string[] = [];
          plannedKeys.forEach((itemKey) => {
            const keptSlot = replaceableSlotIndexes.find((slotIndex) => openSlots.has(slotIndex) && currentKeyBySlot.get(slotIndex) === itemKey);
            if (keptSlot === undefined) {
              incomingKeys.push(itemKey);
              return;
            }
            openSlots.delete(keptSlot);
          });

          incomingKeys.forEach((itemKey) => {
            const variant = sourceState.global.inventory[itemKey] ?? simulatedInventory[itemKey];
            if (!variant) return;
            // Prefer the slot whose outgoing item shares the category (its jewel can carry over), then an empty slot.
            const open = replaceableSlotIndexes.filter((slotIndex) => openSlots.has(slotIndex));
            const slotIndex = open.find((index) => simulatedEquipmentSlots[index]?.category === variant.item.category)
              ?? open.find((index) => simulatedEquipmentSlots[index] == null)
              ?? open[0];
            if (slotIndex === undefined) return;
            openSlots.delete(slotIndex);

            const previousItem = simulatedEquipmentSlots[slotIndex];
            dispatchEquipItem(character.id, slotIndex, itemKey, partyIndex);
            summary.equippedCount += 1;
            let nextItem: Item = variant.item.jewel ? { ...variant.item, jewel: null } : variant.item;
            // The outgoing item's jewel returns to Inventory with it; keep it on the character when it still fits.
            if (previousItem?.jewel && isJewelAllowedForCategory(nextItem.category, previousItem.jewel.key)) {
              dispatchAttachJewel(character.id, slotIndex, previousItem.jewel.key, previousItem.jewel.rank, partyIndex);
              nextItem = { ...nextItem, jewel: previousItem.jewel };
            }
            simulatedEquipmentSlots[slotIndex] = nextItem;
            queueAutoEquipmentNotification(
              party.name,
              character.name,
              character.id,
              slotIndex,
              nextItem,
              previousItem,
              partyIndex,
            );
          });

          // A replaceable item the plan did not reach (no missing category left for it) stays equipped unless it
          // would duplicate an item ID or `c.*` bonus of the simulated set.
          replaceableSlotIndexes.forEach((slotIndex) => {
            if (!openSlots.has(slotIndex)) return;
            const item = simulatedEquipmentSlots[slotIndex];
            if (!item) return;
            const itemFacts = usesItemFactCache ? getItemFacts(item) : null;
            const cBonusNames = itemFacts?.cBonusSignatures ?? getItemCBonusSignatures(item);
            const duplicates = memoryItemIds.has(item.id) || [...cBonusNames].some((bonusName) => memoryCBonusNames.has(bonusName));
            if (!duplicates) {
              memoryItemIds.add(item.id);
              addItemCBonusSignaturesToMemory(item, memoryCBonusNames);
              return;
            }
            dispatchEquipItem(character.id, slotIndex, null, partyIndex);
            simulatedEquipmentSlots[slotIndex] = null;
            summary.unequippedCount += 1;
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

          dispatchEquipItem(character.id, slotIndex, itemKey, partyIndex);
          summary.upgradedCount += 1;
          if (equippedItem.jewel) {
            dispatchAttachJewel(character.id, slotIndex, equippedItem.jewel.key, equippedItem.jewel.rank, partyIndex);
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

        reconcileSimulatedJewels(jewelBaselineSlots, simulatedEquipmentSlots);
        jewelBaselineSlots = [...simulatedEquipmentSlots];

        if (autoEquipmentMode === 2 && isJewelPriorityParty) {
          const simulatedCharacterForJewel = {
            ...character,
            equipment: simulatedEquipmentSlots,
          };
          const assignments = measure('jewelPlanning', () => (
            planAutoJewelAssignmentsForCharacter(simulatedCharacterForJewel, simulatedJewels)
          ));
          // A planned jewel can originate from another equipped slot. Detach
          // every replaced jewel first so ATTACH_JEWEL can draw that combined
          // character-and-inventory candidate pool from Inventory.
          assignments.forEach((assignment) => {
            const slotItem = simulatedEquipmentSlots[assignment.slotIndex];
            if (!slotItem?.jewel) return;
            dispatchAttachJewel(
              character.id,
              assignment.slotIndex,
              slotItem.jewel.key,
              slotItem.jewel.rank,
              partyIndex,
            );
          });
          assignments.forEach((assignment) => {
            const slotItem = simulatedEquipmentSlots[assignment.slotIndex];
            if (!slotItem) return;
            simulatedEquipmentSlots[assignment.slotIndex] = {
              ...slotItem,
              jewel: { key: assignment.key, rank: assignment.rank },
            };
            updateSlotNotificationItem(
              character.id,
              assignment.slotIndex,
              partyIndex,
              simulatedEquipmentSlots[assignment.slotIndex]!,
            );
            dispatchAttachJewel(character.id, assignment.slotIndex, assignment.key, assignment.rank, partyIndex);
            summary.jewelAssignmentCount += 1;
          });
          reconcileSimulatedJewels(jewelBaselineSlots, simulatedEquipmentSlots);
        }

      });
      if (shouldRunFull && !targetCharacterIdSet) {
        queueAutoEquipmentAction({
          type: 'STAMP_FULL_AUTO_EQUIPMENT',
          partyIndex,
          equipmentRevision: sourceState.global.equipmentInventoryRevision ?? 0,
          jewelRevision: sourceState.global.jewelInventoryRevision ?? 0,
        });
      }
    });

    return {
      summary,
      actions: plannedActions,
      notifications: [...slotNotifications.values()],
    };
};

export function applyAutoEquipment(sourceState: GameState, partyIndex: number, characterId?: number, forceFull = false): GameState {
  const plan = planAutoEquipment(sourceState, [partyIndex], characterId === undefined ? undefined : [characterId], { forceFull });
  return __gr(sourceState, { type: 'APPLY_AUTO_EQUIPMENT_ACTIONS', actions: plan.actions } as any);
}
