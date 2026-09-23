import { Fragment,useEffect,useMemo,useState,type MouseEvent,type ReactNode } from 'react';
import { ENEMIES,getEnemyIndividualBonuses,getEnemyTypeBonuses,getMimorianEnemyAbilities } from '../../../data/enemies';
import { ITEMS } from '../../../data/items';
import { RACES } from '../../../data/races';
import { getAbilityDescription } from '../../../game/characterComputation';
import { DebugSettings } from '../../../game/debugSettings';
import { formatEnemyFormName,getEnemyTypeShortName } from '../../../game/enemyDisplay';
import { getItemDisplayName,getLocalizedItemName } from '../../../game/gameState';
import { getJewelNameByRank } from '../../../game/jewel';
import { t } from '../../../i18n';
import type { InventoryView } from '../../../api/v1/inventoryView';
import type { AltarProjection, EnemyFormProjection, ShopProjection } from '../../../api/v1/baseView';
import { AbilityId,InventoryRecord,Item } from '../../../types';


import {
ABILITY_NAMES,
BaseSubTab,
buildInlineBonusEntry,
CATEGORY_GROUPS,
FloatingBubblePortal,
formatBonuses,
formatNumber,
getInventoryOwnerCharacterImageSrc,
getItemNameFontWeightClass,
getItemStats,
getJewelInventoryStatusText,
getJewelSlotStatusText,
getRarityFilterNote,
getRarityShortLabel,
INVENTORY_CATEGORY_GROUPS,
InventoryCategory,
IOS_GLASS_TAB_CLASS,
matchesRarityFilter,
RaceIcon,
RARITY_FILTER_LABELS,
RARITY_FILTER_OPTIONS,
RarityFilter,
renderTextWithRaceIcons,
sortInventoryItems
} from '../homeShared';

export default function BaseTab({
  inventory,
  jewelPriorityPartyNumbers,
  gold,
  altar,
  enemyForms,
  debugStorePurchases,
  shop,
  onSellStack,
  onUnlockSold,
  onBuyShopItem,
  onBuyDebugStoreItem,
  onRefreshShopLineup,
  onUnlockMimorianEnemy,
  onSetJewelAutoEquipPriorityParty,
  activeSubTab,
  onSetActiveSubTab,
  debugSettings,
}: {
  inventory: InventoryView | null;
  jewelPriorityPartyNumbers: number[];
  gold: number;
  altar: AltarProjection | null;
  enemyForms: EnemyFormProjection[] | null;
  debugStorePurchases: Record<string, number>;
  shop: ShopProjection | null;
  onSellStack: (itemFormat: string) => void;
  onUnlockSold: (itemFormat: string) => void;
  onBuyShopItem: (shopItemId: number) => void;
  onBuyDebugStoreItem: (itemId: number) => void;
  onRefreshShopLineup: () => void;
  onUnlockMimorianEnemy: (enemyId: number) => void;
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
    { id: 'altar' as const, label: t('home.base.tab.altar'), isAvailable: true },
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
          view={inventory}
          jewelPriorityPartyNumbers={jewelPriorityPartyNumbers}
          onSellStack={onSellStack}
          onUnlockSold={onUnlockSold}
          onSetJewelAutoEquipPriorityParty={onSetJewelAutoEquipPriorityParty}
        />
      ) : activeSubTab === 'altar' ? (
        <AltarTab
          altar={altar}
          forms={enemyForms}
          onUnlockEnemy={onUnlockMimorianEnemy}
        />
      ) : activeSubTab === 'shop' ? (
        <ShopTab
          shop={shop}
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

// SpecRef: 8.4.5 | Altar (祭壇) | Enemy Form List
function AltarTab({
  altar,
  forms,
  onUnlockEnemy,
}: {
  altar: AltarProjection | null;
  forms: EnemyFormProjection[] | null;
  onUnlockEnemy: (enemyId: number) => void;
}) {
  // SpecRef: 8.4.5 | Altar (祭壇)
  // The Prana balance, each category's Alter level and victories, and every form's cost, unlock condition, and whether it can
  // be unlocked are the API's facts. A form's name, abilities, and bonuses are master data for the projected enemy ID.
  const enemyTypes = altar?.categories.map((category) => category.enemyType) ?? [];
  const [selectedEnemyType, setSelectedEnemyType] = useState('');
  const activeEnemyType = selectedEnemyType || enemyTypes[0] || '';
  const [activeHelp, setActiveHelp] = useState<{ key: string; title: string; description: string } | null>(null);
  const [activeHelpPosition, setActiveHelpPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const enemiesById = useMemo(() => new Map(ENEMIES.map((enemy) => [enemy.id, enemy])), []);
  const category = altar?.categories.find((entry) => entry.enemyType === activeEnemyType);
  const visibleForms = (forms ?? []).filter((form) => form.enemyType === activeEnemyType);
  const altarLevel = category?.altarLevel ?? 0;
  const altarVictories = category?.victories ?? 0;
  const nextLevelVictories = category?.nextLevelVictories ?? 0;
  const prana = altar?.prana ?? 0;

  const handleHelpToggle = (key: string, title: string, description: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (activeHelp?.key === key) {
      setActiveHelp(null);
      setActiveHelpPosition(null);
      return;
    }

    const triggerRect = event.currentTarget.getBoundingClientRect();
    const viewportPadding = 12;
    const width = Math.min(360, window.innerWidth - viewportPadding * 2);
    setActiveHelpPosition({
      top: triggerRect.bottom + 8,
      left: Math.min(Math.max(triggerRect.left, viewportPadding), window.innerWidth - viewportPadding - width),
      width,
    });
    setActiveHelp({ key, title, description });
  };

  const renderHelpEntries = (entries: Array<{ key: string; label: string; description: string | null }>) => entries.map((entry, index) => (
    <span key={entry.key}>
      {index > 0 && ', '}
      {entry.description ? (
        <button
          type="button"
          className="text-left underline decoration-dotted underline-offset-2"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => handleHelpToggle(entry.key, entry.label, entry.description!, event)}
        >
          {entry.label}
        </button>
      ) : entry.label}
    </span>
  ));

  return (
    <div
      className="space-y-3 pb-[calc(4rem+env(safe-area-inset-bottom))]"
      onPointerDown={() => {
        if (!activeHelp) return;
        setActiveHelp(null);
        setActiveHelpPosition(null);
      }}
    >
      <div className="rounded-lg border border-sub/30 bg-pane p-3 text-sm font-semibold">
        {t('home.altar.pranaBalance', { prana: formatNumber(prana) })}
      </div>
      <div className="flex flex-nowrap gap-1 overflow-x-auto pb-1" role="tablist">
        {enemyTypes.map((enemyType) => {
          const enemyRace = RACES.find((race) => race.englishName === enemyType);
          const enemyTypeLabel = getEnemyTypeShortName(enemyType);
          return (
            <button
              key={enemyType}
              type="button"
              role="tab"
              aria-label={enemyTypeLabel}
              title={enemyTypeLabel}
              aria-selected={activeEnemyType === enemyType}
              onClick={() => setSelectedEnemyType(enemyType)}
              className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded px-2 py-1 text-sm pane-button-shadow transition-colors ${
                activeEnemyType === enemyType
                  ? 'bg-sub text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {enemyRace?.icon
                ? <RaceIcon race={enemyRace} className="h-5 w-5" />
                : enemyTypeLabel}
            </button>
          );
        })}
      </div>
      <div className="text-sm font-medium text-gray-700">
        {t('home.altar.levelProgress', {
          level: formatNumber(altarLevel),
          victories: formatNumber(altarVictories),
          required: formatNumber(nextLevelVictories),
        })}
      </div>
      <div className="max-h-[34rem] space-y-2 overflow-y-auto">
        {visibleForms.flatMap((form) => {
          const enemy = enemiesById.get(form.enemyId);
          if (!enemy) return [];
          const cost = form.unlockCost;
          const unlocked = form.unlocked;
          const enemyFormName = formatEnemyFormName(enemy);
          const requiredAltarLevel = form.unlockCondition.requiredAltarLevel;
          const meetsLevelRequirement = form.unlockCondition.met;
          const canUnlock = form.unlockable.available;
          const formAbilities = getMimorianEnemyAbilities(enemy);
          const formBonuses = [
            ...getEnemyTypeBonuses(enemy.enemyType),
            ...getEnemyIndividualBonuses(enemy.id),
          ];
          const abilityText = formAbilities.length > 0
            ? formAbilities.map((ability) => `${ABILITY_NAMES[ability.id] ?? ability.id}Lv${formatNumber(ability.level)}`).join(', ')
            : t('common.none');
          const bonusText = formatBonuses(formBonuses) || t('common.none');
          const abilityEntries = formAbilities.map((ability, index) => buildInlineBonusEntry('altar-ability', enemy.id.toString(), {
            type: 'ability',
            value: ability.level,
            abilityId: ability.id,
            abilityLevel: ability.level,
          }, index)).filter((entry): entry is NonNullable<typeof entry> => entry !== null);
          const bonusEntries = formBonuses
            .map((bonus, index) => buildInlineBonusEntry('altar-bonus', enemy.id.toString(), bonus, index))
            .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
          return [(
            <div key={enemy.id} className={`flex items-center gap-3 rounded-lg border bg-pane p-2 shadow-sm ${unlocked ? 'border-sub/40' : 'border-gray-200'}`}>
              <img
                src={`${import.meta.env.BASE_URL}chibi/C_E_${enemy.id}.png`}
                alt={enemyFormName}
                className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24"
              />
              <div className="min-w-0 flex-1 space-y-1 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0 text-sm font-semibold">
                    {renderTextWithRaceIcons(enemyFormName, 'h-4 w-4')} <span className="whitespace-nowrap font-normal text-gray-600">{t(`home.altar.category.${enemy.type}`)}</span>
                  </div>
                  <button
                    type="button"
                    disabled={!canUnlock}
                    onClick={() => {
                      if (!window.confirm(t('home.altar.unlockConfirm', { enemy: enemyFormName, prana: formatNumber(cost) }))) return;
                      onUnlockEnemy(enemy.id);
                    }}
                    className={`shrink-0 rounded border px-2 py-1 text-xs ${canUnlock ? 'border-sub text-sub' : 'cursor-not-allowed border-gray-300 text-gray-400'}`}
                  >
                    {unlocked ? t('home.altar.unlocked') : t('home.altar.unlockCost', { prana: formatNumber(cost) })}
                  </button>
                </div>
                <div className="text-gray-700">
                  {abilityEntries.length > 0
                    ? <>{t('home.altar.ability', { abilities: '' })}{renderHelpEntries(abilityEntries)}</>
                    : t('home.altar.ability', { abilities: abilityText })}
                </div>
                {!unlocked && !meetsLevelRequirement && (
                  <div className="font-medium text-accent">
                    {t('home.altar.requiredLevel', { level: formatNumber(requiredAltarLevel) })}
                  </div>
                )}
                <div className="text-gray-700">
                  {bonusEntries.length > 0
                    ? <>{t('home.altar.bonus', { bonuses: '' })}{renderHelpEntries(bonusEntries)}</>
                    : t('home.altar.bonus', { bonuses: bonusText })}
                </div>
              </div>
            </div>
          )];
        })}
      </div>
      {activeHelp && activeHelpPosition && (
        <div
          className="floating-bubble-pane fixed z-50 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg p-3 text-xs text-gray-700 space-y-1"
          style={activeHelpPosition}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="font-semibold text-gray-800">{activeHelp.title}</div>
          <div className="whitespace-pre-line">{activeHelp.description}</div>
        </div>
      )}
    </div>
  );
}

// SpecRef: 8.4.1 | Shop (お店) | Lineup
function ShopTab({
  shop,
  onBuyShopItem,
  onRefreshShopLineup,
}: {
  shop: ShopProjection | null;
  onBuyShopItem: (shopItemId: number) => void;
  onRefreshShopLineup: () => void;
}) {
  // SpecRef: 8.4.1 | Shop (お店)
  // The pane draws the shop from the Base projection: the dialogue tier, the countdown, the refresh price, and each slot's
  // price and availability are the API's facts. The item's name and stats are master data for the projected item ID.
  const mustelidRace = RACES.find((race) => race.id === 'mustelid');
  if (!mustelidRace || !shop) {
    return <div className="text-sm text-gray-600">{t('home.shop.preparing')}</div>;
  }
  const minutesToRefresh = Math.max(1, Math.ceil((Date.parse(shop.refreshesAt) - Date.now()) / 60000));
  const countdownText = minutesToRefresh >= 60
    ? t('home.shop.countdown.hours', { count: Math.floor(minutesToRefresh / 60) })
    : t('home.shop.countdown.minutes', { count: minutesToRefresh });

  const shopItems = shop.entries.flatMap((entry) => {
    const item = ITEMS.find((candidate) => candidate.id === entry.itemId);
    if (!item) return [];
    const rarityClass = entry.soldOut
      ? 'text-gray-400'
      : entry.rarity === 'bossRare'
        ? 'text-accent'
        : entry.rarity === 'eliteRare'
          ? 'text-sub'
          : entry.rarity === 'uncommon'
            ? 'font-bold text-gray-900'
            : 'text-gray-900 font-normal';
    return [{ key: `${entry.shopItemId}-${entry.itemId}`, shopItemId: entry.shopItemId, item: { ...item, enhancement: 0, superRare: 0 }, price: entry.price, isSoldOut: entry.soldOut, canBuy: entry.available, rarityClass }];
  });

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
                {t(shop.dialogue.key)}
              </p>
              <p className="shop-dialogue-pane__countdown text-xs">
                {t('home.shop.refreshCountdown', { time: countdownText.replace('後', '') })}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <button
              onClick={onRefreshShopLineup}
              disabled={!shop.paidRefresh.available}
              className={`rounded px-3 py-1 text-xs font-semibold ${
                shop.paidRefresh.available
                  ? 'bg-accent text-white hover:bg-accent/90'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'
              }`}
            >
              <span className="block">{t('home.shop.paidRefresh')}</span>
              <span className="block text-[11px]">{formatNumber(shop.paidRefreshPrice)}G</span>
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
                onClick={() => onBuyShopItem(entry.shopItemId)}
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
  view,
  jewelPriorityPartyNumbers,
  onSellStack,
  onUnlockSold,
  onSetJewelAutoEquipPriorityParty,
}: {
  view: InventoryView | null;
  jewelPriorityPartyNumbers: number[];
  onSellStack: (itemFormat: string) => void;
  onUnlockSold: (itemFormat: string) => void;
  onSetJewelAutoEquipPriorityParty: (partyId: number | null) => void;
}) {
  // SpecRef: 8.4.2 | Inventory(所持品)
  // The variants, the Jewels held, the worn items with their owners, what a sale pays, and the Jewel priority are the Base
  // projection's facts; the pane keeps only its filters and sort. Items are rebuilt from their Item Format and master data.
  const inventory = useMemo<InventoryRecord>(() => Object.fromEntries([
    ...(view?.owned ?? []).map((variant) => [variant.variantKey, { item: variant.item, count: variant.count, status: 'owned' as const, isNew: variant.isNew }] as const),
    ...(view?.sold ?? []).map((variant) => [variant.variantKey, { item: variant.item, count: 0, status: 'sold' as const, isNew: variant.isNew }] as const),
  ]), [view]);
  const variantByKey = useMemo(() => new Map([...(view?.owned ?? []), ...(view?.sold ?? [])].map((variant) => [variant.variantKey, variant])), [view]);
  const jewels = view?.jewels ?? [];
  const jewelAutoEquipPriorityPartyId = view?.jewelPriorityParty ?? null;
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
  const hasOwnedJewels = jewels.length > 0;
  const hasEquippedJewels = (view?.worn ?? []).some((entry) => entry.jewel !== null);
  const hasFirstJewel = hasOwnedJewels || hasEquippedJewels;
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory>(() => (hasFirstJewel ? 'jewel' : 'armor'));
  const [inventoryRarityFilter, setInventoryRarityFilter] = useState<RarityFilter>('all');
  const [inventorySuperRareOnly, setInventorySuperRareOnly] = useState(false);
  const [sellStackConfirmation, setSellStackConfirmation] = useState<{
    itemFormat: string;
    itemName: string;
    count: number;
    sellPrice: number;
    prana: number;
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
  const equippedItems = (view?.worn ?? []).flatMap((worn) => {
    const item = worn.item;
    if (
      isJewelCategory ||
      item.category !== selectedCategory ||
      !matchesRarityFilter(item.id, inventoryRarityFilter) ||
      (inventorySuperRareOnly && item.superRare < 1)
    ) {
      return [];
    }

    return [{
      key: `equipped-${worn.partyNumber}-${worn.owner.name}-${worn.member}-${worn.slotIndex}-${item.id}-${item.enhancement}-${item.superRare}`,
      item,
      partyIndex: worn.partyNumber - 1,
      rowIndex: worn.member - 1,
      slotIndex: worn.slotIndex,
      characterName: worn.owner.name,
      raceId: worn.owner.raceId,
      characterImageSrc: getInventoryOwnerCharacterImageSrc(worn.owner, worn.partyNumber),
    }];
  });

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

  const jewelEntries = [...jewels].sort((a, b) => {
    if (a.jewelKey !== b.jewelKey) return a.jewelKey.localeCompare(b.jewelKey);
    return a.rank - b.rank;
  });

  const equippedJewels = (view?.worn ?? []).flatMap((worn) => {
    if (!worn.jewel || !worn.active) return [];
    return [{
      key: `equipped-jewel-${worn.partyNumber}-${worn.owner.name}-${worn.slotIndex}-${worn.item.id}-${worn.item.enhancement}-${worn.item.superRare}-${worn.jewel.key}-${worn.jewel.rank}`,
      item: worn.item,
      partyIndex: worn.partyNumber - 1,
      characterName: worn.owner.name,
      raceId: worn.owner.raceId,
      jewelKey: worn.jewel.key,
      rank: worn.jewel.rank,
      characterImageSrc: getInventoryOwnerCharacterImageSrc(worn.owner, worn.partyNumber),
    }];
  });

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
      ...jewelPriorityPartyNumbers.map((partyNumber) => ({ value: `${partyNumber}`, label: `PT${partyNumber}` })),
    ],
    [jewelPriorityPartyNumbers],
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
    onSellStack(sellStackConfirmation.itemFormat);
    window.alert(sellStackConfirmation.prana > 0
      ? t('home.inventory.sellResultPrana', { prana: formatNumber(sellStackConfirmation.prana) })
      : t('home.inventory.sellResultGold', { gold: formatNumber(sellStackConfirmation.sellPrice) }));
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
          <span className="text-xs text-gray-500"> {t('diary.reward.superRare')}</span>
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
              // What selling pays is the API's fact (a Super Rare item pays Prana only, never Gold).
              const sale = variantByKey.get(entry.key)?.sale ?? { gold: 0, prana: 0 };
              const sellPrice = sale.gold;
              const pranaGranted = sale.prana;

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
                        setSellStackConfirmation({
                          itemFormat: variantByKey.get(entry.key)?.format ?? '',
                          itemName: getItemDisplayName(item),
                          count,
                          sellPrice,
                          prana: pranaGranted,
                        });
                      }}
                      className="text-xs text-accent px-2 py-1 border border-accent rounded flex-shrink-0"
                    >
                      {pranaGranted > 0
                        ? t('home.inventory.sellAllPrana', { prana: formatNumber(pranaGranted) })
                        : t('home.inventory.sellAllGold', { gold: formatNumber(sellPrice) })}
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
                      onClick={() => onUnlockSold(variantByKey.get(key)?.format ?? '')}
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
                {sellStackConfirmation.prana > 0
                  ? t('home.inventory.sellConfirmPrana', { prana: formatNumber(sellStackConfirmation.prana) })
                  : t('home.inventory.sellConfirmBody', { gold: formatNumber(sellStackConfirmation.sellPrice) })}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSellStackConfirmation(null)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-link hover:bg-selection/[0.12]"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmSellStack}
                  className="rounded-full bg-selection px-4 py-2 text-sm font-semibold text-content-inverse shadow-sm hover:bg-selection/90"
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
