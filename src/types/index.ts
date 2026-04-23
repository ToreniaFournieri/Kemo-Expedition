// Elemental Types
export type ElementalOffense = 'none' | 'fire' | 'thunder' | 'ice';
export type ElementalResistance = 'fire' | 'thunder' | 'ice';

// Race Types
export type RaceId =
  | 'caninian' | 'lupinian' | 'vulpinian' | 'ursan'
  | 'felidian' | 'mustelid' | 'leporian' | 'cervin' | 'murid' | 'procyonian'
  | 'kemoria' | 'orcinian' | 'avian';

export interface Race {
  id: RaceId;
  name: string;
  englishName: string;
  emoji: string;
  icon?: string;
  stats: BaseStats;
  bonuses: Bonus[];
  defaultAbility: RaceAbilityDefinition;
  unlockAbility?: RaceAbilityDefinition;
  unlockCondition?: string;
  memo?: string;
  selectable?: boolean;
}

export interface RaceAbilityDefinition {
  id: string;
  name: string;
  description: string;
}

// Class Types
export type ClassId =
  | 'guardian' | 'duelist' | 'samurai' | 'sword-saint'
  | 'ranger' | 'striker' | 'ninja'
  | 'wizard' | 'sage' | 'alchemist'
  | 'pilgrim' | 'lord';

export interface ClassDef {
  id: ClassId;
  name: string;
  mainSubBonuses: Bonus[];
  mainBonuses: Bonus[];
  masterBonuses: Bonus[];
}

// Predisposition Types
export type PredispositionId =
  | 'none'
  | 'aggressive' | 'inquisitive' | 'amiable'
  | 'stubborn' | 'evasive' | 'introspective'
  | 'devoted' | 'serene' | 'nimble'
  | 'perceptive' | 'precise' | 'resourceful'
  // legacy ids for save compatibility
  | 'sturdy' | 'agile' | 'brilliant' | 'dexterous' | 'chivalric'
  | 'shikon' | 'pursuing' | 'canny' | 'persistent';

export interface Predisposition {
  id: PredispositionId;
  name: string;
  shortName?: string;
  category?: string;
  selectable?: boolean;
  bonuses: Bonus[];
}

// Lineage Types
export type LineageId =
  | 'sandstorm' | 'ashen_capital' | 'blaze_peak'
  | 'abyssal_sea' | 'firmament' | 'frozen_forest'
  | 'utopia' | 'machina' | 'adaptation'
  | 'fragment' | 'windcross' | 'oath'
  | 'unascertained' | 'pioneer' | 'almighty' | 'hidden_grail'
  | 'rowdy_orca_girl' | 'meddlesome_fox' | 'crescent_jade'
  | 'phantom_thief' | 'flamebound_grove' | 'apostate' | 'incarnation'
  | 'unexpected_prince(ss)'
  // legacy ids for save compatibility
  | 'steel_oath' | 'war_spirit' | 'far_sight' | 'unmoving'
  | 'breaking_hand' | 'guiding_thought' | 'hidden_principles' | 'inherited_oaths'
  | 'usurper' | 'apex_predator' | 'true_heir';

export interface Lineage {
  id: LineageId;
  name: string;
  shortName?: string;
  category?: string;
  selectable?: boolean;
  bonuses: Bonus[];
}

// Bonus Types
export type BonusType =
  // Equipment multipliers
  | 'sword_multiplier' | 'katana_multiplier' | 'archery_multiplier'
  | 'armor_multiplier' | 'gauntlet_multiplier' | 'wand_multiplier'
  | 'robe_multiplier'
  | 'shield_multiplier' | 'bolt_multiplier' | 'grimoire_multiplier'
  | 'catalyst_multiplier' | 'arrow_multiplier'
  // Slot bonuses
  | 'equip_slot'
  // Stat bonuses
  | 'vitality' | 'strength' | 'intelligence' | 'mind'
  // Combat bonuses
  | 'grit' | 'caster' | 'penet' | 'pursuit'
  | 'equip_melee' | 'equip_ranged' | 'equip_magic'
  | 'antagonism'
  | 'melee_attack' | 'ranged_attack' | 'magical_attack' | 'physical_attack'
  | 'physical_defense' | 'magical_defense'
  | 'physical_offense_multiplier_xV' | 'magical_offense_multiplier_xV'
  | 'physical_defense_multiplier_xV' | 'magical_defense_multiplier_xV'
  | 'fire_defense_multiplier_xV' | 'ice_defense_multiplier_xV' | 'thunder_defense_multiplier_xV'
  | 'fire_defense' | 'ice_defense' | 'thunder_defense'
  // Deity c.* bonuses (future runtime hooks)
  | 'deity_physical_attack_xV' | 'deity_magical_attack_xV'
  | 'deity_physical_defense_x2/3' | 'deity_physical_defense_xV' | 'deity_pysical_defense_xV'
  | 'deity_magical_defense_x2/3' | 'deity_magical_defense_xV'
  | 'deity_move_first' | 'deity_accuracy' | 'deity_evasion'
  | 'fire_offense' | 'ice_offense' | 'thunder_offense'
  // Accuracy/Evasion bonuses
  | 'accuracy' | 'evasion'
  // Growth bonuses
  | 'growth_xV'
  | 'upgrade_V'
  | 'ability_upgrade'
  | 'unlock_caninian_ability'
  | 'unlock_lupinian_ability'
  | 'unlock_vulpinian_ability'
  | 'unlock_ursan_ability'
  | 'unlock_felidian_ability'
  | 'unlock_mustelid_ability'
  | 'unlock_leporian_ability'
  | 'unlock_cervin_ability'
  | 'unlock_murid_ability'
  | 'unlock_procyonian_ability'
  | 'unimplemented_bonus'
  // Abilities
  | 'ability';

export interface Bonus {
  type: BonusType;
  value: number;
  abilityId?: AbilityId;
  abilityLevel?: number;
  unimplementedLabel?: string;
}

// Ability Types
export type AbilityId =
  | 'first_strike' | 'hunter' | 'defender' | 'counter' | 're_attack'
  | 'iaigiri' | 'heavy_strike' | 'resonance' | 'command' | 'm_barrier' | 'deflection' | 'null_counter' | 'unlock'
  | 'squander' | 'tithe' | 'seeker' | 'resurrect' | 'rage' | 're_counter' | 'momentum' | 'cunning'
  | 'bulwark' | 'cyborgization' | 'covering_fire' | 'peddler' | 'composure' | 'magical_counter'
  | 'arcane_stability' | 'arc_magic'
  | 'melee_conversion'
  | 'true_sight' | 'output_stabilizer'
  | 'focus' | 'prophecy' | 'stealth' | 'illusion'
  // Enemy-only abilities prepared from Enemy Master Specification
  | 'howl' | 'predator_sense' | 'slow' | 'boost' | 'corrode' | 'life_drain' | 'no_offense'
  | 'decompose' | 'swarm' | 'death_touch' | 'flying' | 'free' | 'frostbite'
  | 'ice_reflect' | 'ice_absorb' | 'ice_null' | 'bind' | 'regeneration' | 'burn' | 'fire_reflect' | 'fire_absorb' | 'fire_null' | 'thunder_reflect' | 'thunder_absorb' | 'thunder_null' | 'soul_reap'
  | 'mutual_magic_amplify' | 'mutual_magic_restraint' | 'ranged_confusion' | 'magic_confusion' | 'melee_confusion' | 'self_destruct' | 'oblivion' | 'reanimate'
  | 'auriferous' | 'magic_seal' | 'ambush' | 'mimic' | 'shock' | 'null_shock' | 'mutual_physical_amplify' | 'mutual_physical_restraint'
  | 'unstable_core' | 'magical_reflect' | 'magical_absorb' | 'magical_null' | 'ranged_reflect' | 'ranged_null' | 'melee_reflect' | 'melee_null' | 'colossal' | 'upgrade_all_abilities'
  | 'requiem' | 'overwatch' | 'execution' | 'anti_ambush' | 'anti_overwatch' | 'rage_breaker' | 'momentum_breaker' | 'execution_null'
  | 'null_antagonism' | 'first_aid' | 'equation_breaker' | 'unforgettable'
  | 'null_corrode' | 'null_life_drain' | 'null_death_touch' | 'null_burn' | 'null_bind' | 'null_requiem'
  | 'domain_breaker' | 'wind_rider' | 'siege' | 'coldproof'
  | 'dryproof' | 'vine_cutter' | 'mana_ward' | 'defiance'
  | 'fire_protect_breaker' | 'ice_protect_breaker' | 'thunder_protect_breaker' | 'm_barrier_breaker'
  | 'pursuit' | 'illusion_breaker' | 'bulwark_breaker';

export interface Ability {
  id: AbilityId;
  name: string;
  level: number;
  description: string;
}

export interface EnemyAbility {
  id: AbilityId;
  level: number;
}

// Base Stats
export interface BaseStats {
  vitality: number;
  strength: number;
  intelligence: number;
  mind: number;
}

// Item Types
export type ItemCategory =
  | 'sword' | 'katana' | 'archery' | 'armor'
  | 'gauntlet' | 'wand' | 'robe'
  | 'shield' | 'bolt' | 'grimoire' | 'catalyst' | 'arrow';

export interface ItemDef {
  id: number;
  category: ItemCategory;
  name: string;
  bonuses?: Bonus[];
  baseMultiplier?: number;
  meleeAttack?: number;
  meleeNoA?: number;
  meleeNoABonus?: number;
  rangedAttack?: number;
  rangedNoA?: number;
  rangedNoABonus?: number;
  magicalAttack?: number;
  magicalNoA?: number;
  magicalNoABonus?: number;
  partyHP?: number;
  physicalDefense?: number;
  magicalDefense?: number;
  elementalOffense?: ElementalOffense;
  elementalOffenseBonus?: number;
  accuracyBonus?: number;
  evasionBonus?: number;
  vitalityBonus?: number;
  strengthBonus?: number;
  intelligenceBonus?: number;
  mindBonus?: number;
  penetBonus?: number;
}

export type JewelKey = 'might' | 'arcana' | 'fort' | 'ward' | 'shade' | 'focus';

export interface JewelAttachment {
  key: JewelKey;
  rank: number; // 1-8
}

export type JewelInventory = Record<string, number>;

export interface Item extends ItemDef {
  enhancement: number; // 0-6
  superRare: number; // 0-80
  isLocked?: boolean;
  jewel?: JewelAttachment | null;
  isNew?: boolean; // For highlighting newly acquired items
}

// Item Stacking System
export type ItemVariantStatus = 'owned' | 'sold' | 'notown';

export interface InventoryVariant {
  item: Item;
  count: number;
  status: ItemVariantStatus;
  isNew?: boolean;
}

// Helper to create variant key
export function getVariantKey(item: { id: number; enhancement: number; superRare: number }): string {
  return `${item.id}-${item.enhancement}-${item.superRare}`;
}

// Inventory as a record of variants
export type InventoryRecord = Record<string, InventoryVariant>;

// Character Types
export interface Character {
  id: number;
  name: string;
  isUnique?: boolean;
  autoEquipmentMode?: 0 | 1 | 2;
  raceId: RaceId;
  mainClassId: ClassId;
  subClassId: ClassId;
  predispositionId: PredispositionId;
  lineageId: LineageId;
  equipment: (Item | null)[];
}

// Computed character stats for battle
export interface ComputedCharacterStats {
  characterId: number;
  row: number; // 1-6, position in party (for targeting)
  baseStats: BaseStats;
  rangedAttack: number;
  magicalAttack: number;
  meleeAttack: number;
  rangedNoA: number;
  magicalNoA: number;
  meleeNoA: number;
  physicalDefense: number; // Individual defense for targeting
  magicalDefense: number; // Individual defense for targeting
  physicalDefenseAmplifier: number;
  magicalDefenseAmplifier: number;
  maxEquipSlots: number;
  abilities: Ability[];
  penetMultiplier: number;
  originalRangedNoA: number;
  originalMagicalNoA: number;
  originalMeleeNoA: number;
  elementalOffense: ElementalOffense;
  elementalOffenseValue: number;
  accuracyPotency: number; // Row-based accuracy potency (d.accuracy_potency)
  accuracyBonus: number; // c.accuracy+v sum
  evasionBonus: number; // c.evasion+v sum
  meleeAttackCBonus: number; // c.melee_attack+v sum
  rangedAttackCBonus: number; // c.ranged_attack+v sum
  magicalAttackCBonus: number; // c.magical_attack+v sum
  physicalAttackCBonus: number; // c.physical_attack+v sum
  physicalOffenseMultiplier: number; // c.physical_offense_multiplier_xV product
  magicalOffenseMultiplier: number; // c.magical_offense_multiplier_xV product
  physicalDefenseMultiplier: number; // c.physical_defense_multiplier_xV product
  magicalDefenseMultiplier: number; // c.magical_defense_multiplier_xV product
  elementalDefenseMultipliers: Record<ElementalResistance, number>; // c.<element>_defense_multiplier_xV products
  offenseCBonusNames: string[]; // applied c.* offense bonus names (for de-duplication with equipment)
  deityOffenseAmplifierBonus: number; // additive bonus for character.f.offense_amplifier
  deityDefenseAmplifierBonus: {
    physical: number;
    magical: number;
  }; // additive bonus applied to character.f.defense_amplifier
  hasAntagonism: boolean;
}

// Party Types
export interface Party {
  id: number;
  name: string;
  level: number;
  experience: number;
  defeatedBossExpeditions: Record<number, boolean>;
  lootGateProgress: Record<string, number>;
  lootGateStatus: Record<number, boolean>;
  deity: Deity;
  characters: Character[];
  selectedDungeonId: number;
  expeditionDepthLimit: ExpeditionDepthLimit;
  expeditionDifficultyOffset: number;
  expeditionDifficultyOffsetByDungeon: Record<number, number>;
  currentHp: number;
  pendingProfit: number;
  expeditionRewardsPending: boolean;
  pendingUnlockState?: {
    deityNames: string[];
    partySlotCount: number;
  } | null;
  deityGold: number;
  lastExpeditionLog: ExpeditionLog | null;
  pendingDiaryLog: DiaryLog | null;
  diaryLogs: DiaryLog[];
  hasUnreadDiary: boolean;
  diarySettings: DiarySettings;
  expeditionStats: {
    Clear: number;
    Turned_Back: number;
    Draw_Retreat: number;
    Wounded_Retreat: number;
    Defeat: number;
    donatedGold: number;
    savedGold: number;
  };
  bags: GameBags;
  sleepinessOfPartyBag: RandomBag;
  currentSleepiness: SleepinessState;
  condition: number;
  sideQuest: SideQuestState | null;
}

export type SleepinessState = 0 | 1 | 2;

export interface SideQuestState {
  id: number;
  type: string;
  shortText: string;
  target: number;
  progress: number;
  rolledTier: number;
  assignedAt: number;
  expiresAt: number;
}

export type ExpeditionDepthLimit =
  | '1f-3'
  | '1f-4'
  | '2f-3'
  | '2f-4'
  | '3f-3'
  | '3f-4'
  | '4f-3'
  | '4f-4'
  | '5f-3'
  | '5f-4'
  | 'beforeBoss'
  | 'all';

export interface DiaryLog {
  id: string;
  expeditionLog: ExpeditionLog;
  triggers: Array<'defeat' | 'eliteRare' | 'bossRare' | 'mythicRare' | 'superRare' | 'sideQuest' | 'unlock'>;
  sideQuestDetail?: string;
  sideQuestLabel?: string;
  unlockHeadline?: string;
  unlockDetail?: string;
  createdAt: number;
  isRead: boolean;
}

export type DiaryRarityThreshold = 'all' | 1 | 2 | 3 | 4 | 5 | 6 | 'none';
export type DiarySideQuestThreshold = 'all' | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'none';

export interface DiarySettings {
  superRareThreshold: DiaryRarityThreshold;
  bossThreshold: DiaryRarityThreshold;
  mythicThreshold: DiaryRarityThreshold;
  rareThreshold: DiaryRarityThreshold;
  sideQuestThreshold: DiarySideQuestThreshold;
  notifyDefeat: boolean;
}

export interface Deity {
  name: string;
  uniqueAbilities: string[];
}

export interface GlobalState {
  gold: number;
  inventory: InventoryRecord;
  deityDonations: Record<string, number>;
  unlockedDeities: string[];
  shopPurchases: Record<string, number[]>;
  jewelShopPurchases: Record<string, number>;
  shopRefreshCounts: Record<string, number>;
  shopIntimacy: number;
  shopIntimacyLastDecayAt: number;
  jewels: JewelInventory;
}

// Computed party stats for battle
export interface ComputedPartyStats {
  hp: number;
  currentHp: number;
  elementalResistance: Record<ElementalResistance, number>;
  abilities: Ability[];
  offenseAmplifier: number;
  defenseAmplifiers: {
    physical: number;
    magical: number;
  };
}

// Enemy Types
export type EnemyType = 'normal' | 'elite' | 'boss';
export type EnemyClassId =
  | 'guardian' | 'duelist' | 'samurai' | 'sword-saint'
  | 'ranger' | 'striker' | 'ninja'
  | 'wizard' | 'sage' | 'alchemist'
  | 'pilgrim' | 'lord'
  // legacy ids for compatibility
  | 'fighter' | 'rogue';

export interface EnemyDef {
  id: number;
  type: EnemyType;
  enemyType: string;
  spawnTier: number;
  spawnPool: number;
  poolId: number;
  name: string;
  enemyClass: EnemyClassId;
  enemySubClass?: EnemyClassId | 'none';
  abilities: EnemyAbility[];
  bonuses?: Bonus[];
  accuracyBonus: number;
  evasionBonus: number;
  hp: number;
  rangedAttack: number;
  rangedNoA: number;
  magicalAttack: number;
  magicalNoA: number;
  meleeAttack: number;
  meleeNoA: number;
  rangedAttackAmplifier: number;
  magicalAttackAmplifier: number;
  meleeAttackAmplifier: number;
  physicalDefense: number;
  magicalDefense: number;
  elementalOffense: ElementalOffense;
  elementalOffenseValue: number;
  elementalResistance: Record<ElementalResistance, number>;
  physicalDefenseAmplifier: number;
  magicalDefenseAmplifier: number;
  experience: number;
  dropItemId: number | null;
  masterDropTokens?: string[];
  isGodEnemy?: boolean;
  godDropItemCategories?: [ItemCategory, ItemCategory];
}

// Room Types
export type RoomType = 'battle_Normal' | 'battle_Elite' | 'battle_Boss';
export type TerrainEffectKey = `terrain.${string}`;

export interface RoomDef {
  type: RoomType;
  poolId?: number; // For Normal/Elite rooms
  bossId?: number; // For Boss rooms
  enemyIds?: number[]; // Explicit enemy candidates for this room (master spec format)
}

export interface FloorDef {
  floorNumber: number;
  multiplier: number; // Legacy room display multiplier; runtime enemy scaling is level-based.
  terrainEffect?: TerrainEffectKey;
  rooms: RoomDef[];
}

export interface ExpeditionEnemyMultipliers {
  hp: number;
  attack: number;
  noa: number;
  attackAmplifier: number;
  defense: number;
  physicalDefenseAmplifier: number;
  magicalDefenseAmplifier: number;
  experience: number;
}

// Dungeon Types
export interface Dungeon {
  id: number;
  tier: number;
  expLevel: number;
  name: string;
  enemyPoolIds: number[];
  bossId: number;
  enemyMultipliers: ExpeditionEnemyMultipliers;
  floors: FloorDef[];
}

// Battle Types
export type BattleActionPhase = 'long' | 'mid' | 'close';
export type BattlePhase = 'start' | BattleActionPhase | 'end';
export type BattleOutcome = 'victory' | 'defeat' | 'draw';

export interface BattleState {
  phase: BattleActionPhase;
  partyHp: number;
  enemyHp: number;
  log: BattleLogEntry[];
  outcome?: BattleOutcome;
}

export interface BattleLogEntry {
  phase: BattlePhase;
  initiativeRoll?: number;
  actor: 'party' | 'enemy' | 'character' | 'effect' | 'triggered' | 'deity';
  characterId?: number;
  effectKind?: 'life_drain' | 'terrain';
  effectSourceName?: string;
  effectTargetName?: string;
  effectHealAmount?: number;
  isAggregated?: boolean;
  action: string;
  note?: string;
  noteTone?: 'default' | 'sub' | 'muted';
  damage?: number;
  damageTarget?: 'party' | 'enemy';
  reflectedDamage?: number;
  reflectedSourceDamage?: number;
  reflectTarget?: 'party' | 'enemy';
  absorbedDamage?: number;
  absorbTarget?: 'party' | 'enemy';
  showZeroDamage?: boolean;
  hits?: number; // Number of successful hits
  totalAttempts?: number; // Total number of attack attempts
  rageBonusPercent?: number; // 闘志 bonus shown in battle log
  momentumBonusPercent?: number; // 気勢 bonus shown in battle log
  ambushMultiplier?: number; // 待ち伏せ bonus shown in battle log
  overwatchMultiplier?: number; // 監視 bonus shown in battle log
  executionMultiplier?: number; // エクセキューション bonus shown in battle log
  swarmActorPenaltyPercent?: number; // 群れで自身の威力が低下した割合
  swarmOpponentBonusPercent?: number; // 群れで相手の被ダメージが増えた割合
  isFirstStrike?: boolean;
  isCounter?: boolean;
  isReAttack?: boolean;
  isEnemyTargetHit?: boolean;
  hideInitiativeLabel?: boolean;
  wasNegated?: boolean; // True when an attack dealt 0 hits because an avoidance effect activated
  elementalOffense?: ElementalOffense;
}

// Expedition Types
export interface ExpeditionState {
  dungeonId: number;
  currentRoom: number;
  partyHp: number;
  rewards: Item[];
  experienceGained: number;
}

// Bag Randomization Types
export interface WeightedBagEntry {
  id: number;
  tickets: number;
}

export interface RandomBag {
  entries: WeightedBagEntry[];
}

export interface GameBags {
  commonRewardBag: RandomBag;      // For normal rooms (90 no item, 10 win)
  commonEnhancementBag: RandomBag; // For normal rooms enhancement
  uncommonRewardBag: RandomBag;    // For uncommon rewards (99 no item, 1 win)
  eliteRareRewardBag: RandomBag;        // For elite rare rewards (99 no item, 1 win)
  bossRareRewardBag: RandomBag;      // For boss rare rewards (99 no item, 1 win)
  mythicRareRewardBag: RandomBag;    // For mythic rare rewards (49 no item, 1 win)
  enhancementBag: RandomBag;       // For unique rewards enhancement
  superRareBag: RandomBag; // For non-reward systems that still consume shared super rare titles (e.g., shop)
  commonSuperRareBag: RandomBag; // For common reward super rare rolls
  rareSuperRareBag: RandomBag; // For uncommon or higher reward super rare rolls
  physicalThreatBag: RandomBag;
  magicalThreatBag: RandomBag;
  sideQuestBag: RandomBag;
}

// Enhancement/SuperRare Title
export interface EnhancementTitle {
  value: number;
  title: string;
  tickets: number;
  multiplier: number;
}

export interface SuperRareTitle {
  value: number;
  title: string;
  tickets: number;
  multiplier: number;
  bonuses?: Bonus[];
}

// Expedition Log Types
export interface ExpeditionLogEntry {
  room: number;
  floor?: number; // Floor number (1-6)
  roomInFloor?: number; // Room within floor (1-4)
  roomType?: RoomType; // Type of room
  startPartyHP?: number;
  postBattlePartyHP?: number;
  floorMultiplier?: number; // Displayed room attack multiplier derived from effective enemy level
  enemyId?: number;
  enemySnapshot?: EnemyDef;
  enemyName: string;
  enemyHP: number;
  enemyAttackValues: string; // format: "LONG/MID/CLOSE" e.g. "300/0/340"
  outcome: BattleOutcome;
  damageDealt: number;
  damageTaken: number;
  remainingPartyHP: number;
  maxPartyHP: number;
  reward?: string;
  rewardItems?: Item[];
  rewardRarity?: ItemRarity;
  rewardIsSuperRare?: boolean;
  healAmount?: number;
  attritionAmount?: number;
  gateInfo?: string;
  details: BattleLogEntry[];
}

export interface ExpeditionLog {
  dungeonId: number;
  dungeonName: string;
  difficultyOffset: number;
  totalExperience: number;
  totalRooms: number;
  completedRooms: number;
  finalOutcome: 'Clear' | 'Escape' | 'Retreat' | 'Defeat';
  entries: ExpeditionLogEntry[];
  rewards: Item[];
  autoSellProfit: number;
  autoSellCount: number;
  autoSellItems: { itemName: string; autoSellProfit: number }[];
  autoSellMultiplier?: number;
  remainingPartyHP: number;
  maxPartyHP: number;
}

// Game State
export type GameScene = 'home';

export interface GameState {
  scene: GameScene;
  global: GlobalState;
  parties: Party[];
  selectedPartyIndex: number;
  bags: GameBags;
  buildNumber: number;
}

// Level-based equipment slots
export const LEVEL_EQUIP_SLOTS: Record<number, number> = {
  1: 1,
  3: 2,
  6: 3,
  10: 4,
  14: 5,
  19: 6,
  24: 7,
  30: 8,
  36: 9,
  43: 10,
  50: 11,
  57: 12,
  65: 13,
  73: 14,
  81: 15,
  90: 16,
  99: 17,
};

export const MAX_LEVEL = 69;

// Notification Types
export type NotificationStyle = 'normal' | 'rare';
export type NotificationCategory = 'item' | 'stat';
export type ItemRarity = 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare';

export interface GameNotification {
  id: string;
  message: string;
  style: NotificationStyle;
  category: NotificationCategory;
  isPositive?: boolean; // For stat notifications: true = positive change (bold), false = negative (normal)
  rarity?: ItemRarity;
  isSuperRareItem?: boolean;
  createdAt: number;
}
