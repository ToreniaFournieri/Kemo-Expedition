// Elemental Types
export type ElementalOffense = 'none' | 'fire' | 'thunder' | 'ice';
export type ElementalResistance = 'fire' | 'thunder' | 'ice';

// Race Types
export type RaceId =
  | 'caninian' | 'lupinian' | 'vulpinian' | 'ursan'
  | 'felidian' | 'mustelid' | 'leporian' | 'cervin' | 'murid';

export interface Race {
  id: RaceId;
  name: string;
  emoji: string;
  stats: BaseStats;
  bonuses: Bonus[];
}

// Class Types
export type ClassId =
  | 'fighter' | 'duelist' | 'ninja' | 'samurai' | 'lord'
  | 'ranger' | 'wizard' | 'sage' | 'rogue' | 'pilgrim';

export interface ClassDef {
  id: ClassId;
  name: string;
  mainSubBonuses: Bonus[];
  mainBonuses: Bonus[];
  masterBonuses: Bonus[];
}

// Predisposition Types
export type PredispositionId =
  | 'sturdy' | 'agile' | 'brilliant' | 'dexterous' | 'chivalric'
  | 'shikon' | 'pursuing' | 'canny' | 'persistent';

export interface Predisposition {
  id: PredispositionId;
  name: string;
  bonuses: Bonus[];
}

// Lineage Types
export type LineageId =
  | 'steel_oath' | 'war_spirit' | 'far_sight' | 'unmoving'
  | 'breaking_hand' | 'guiding_thought' | 'hidden_principles' | 'inherited_oaths';

export interface Lineage {
  id: LineageId;
  name: string;
  bonuses: Bonus[];
}

// Bonus Types
export type BonusType =
  // Equipment multipliers
  | 'sword_multiplier' | 'katana_multiplier' | 'archery_multiplier'
  | 'armor_multiplier' | 'gauntlet_multiplier' | 'wand_multiplier'
  | 'robe_multiplier' | 'amulet_multiplier'
  | 'shield_multiplier' | 'bolt_multiplier' | 'grimoire_multiplier'
  | 'catalyst_multiplier' | 'arrow_multiplier'
  // Slot bonuses
  | 'equip_slot'
  // Stat bonuses
  | 'vitality' | 'strength' | 'intelligence' | 'mind'
  // Combat bonuses
  | 'grit' | 'caster' | 'penet' | 'pursuit'
  // Abilities
  | 'ability';

export interface Bonus {
  type: BonusType;
  value: number;
  abilityId?: AbilityId;
  abilityLevel?: number;
}

// Ability Types
export type AbilityId =
  | 'first_strike' | 'hunter' | 'defender' | 'counter' | 're_attack'
  | 'iaigiri' | 'resonance' | 'command' | 'm_barrier' | 'null_counter' | 'unlock';

export interface Ability {
  id: AbilityId;
  name: string;
  level: number;
  description: string;
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
  | 'gauntlet' | 'wand' | 'robe' | 'amulet'
  | 'shield' | 'bolt' | 'grimoire' | 'catalyst' | 'arrow';

export interface ItemDef {
  id: number;
  category: ItemCategory;
  name: string;
  meleeAttack?: number;
  meleeNoA?: number;
  rangedAttack?: number;
  rangedNoA?: number;
  magicalAttack?: number;
  magicalNoA?: number;
  partyHP?: number;
  physicalDefense?: number;
  magicalDefense?: number;
  elementalOffense?: ElementalOffense;
}

export interface Item extends ItemDef {
  enhancement: number; // 0-6
  superRare: number; // 0-5
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
  maxEquipSlots: number;
  abilities: Ability[];
  penetMultiplier: number;
  elementalOffense: ElementalOffense;
  elementalOffenseValue: number;
  attackPotency: number; // Row-based attack potency multiplier
}

// Party Types
export interface Party {
  deityName: string;
  level: number;
  experience: number;
  characters: Character[];
  inventory: InventoryRecord;
  gold: number;
}

// Computed party stats for battle
export interface ComputedPartyStats {
  hp: number;
  currentHp: number;
  physicalDefense: number;
  magicalDefense: number;
  elementalResistance: Record<ElementalResistance, number>;
  abilities: Ability[];
  offenseAmplifier: number;
  defenseAmplifiers: {
    physical: number;
    magical: number;
  };
}

// Enemy Types
export type EnemyType = 'normal' | 'boss';

export interface EnemyDef {
  id: number;
  type: EnemyType;
  poolId: number;
  name: string;
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
  elementalResistance: Record<ElementalResistance, number>;
  experience: number;
  dropItemId: number | null;
}

// Dungeon Types
export interface Dungeon {
  id: number;
  name: string;
  numberOfRooms: number;
  enemyPoolIds: number[];
  bossId: number;
}

// Battle Types
export type BattlePhase = 'long' | 'mid' | 'close';
export type BattleOutcome = 'victory' | 'defeat' | 'draw';

export interface BattleState {
  phase: BattlePhase;
  partyHp: number;
  enemyHp: number;
  log: BattleLogEntry[];
  outcome?: BattleOutcome;
}

export interface BattleLogEntry {
  phase: BattlePhase;
  actor: 'party' | 'enemy' | 'character';
  characterId?: number;
  action: string;
  damage?: number;
  isFirstStrike?: boolean;
  isCounter?: boolean;
  isReAttack?: boolean;
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
export interface RandomBag {
  tickets: number[]; // 0 = lose, 1+ = win with value
}

export interface GameBags {
  rewardBag: RandomBag;
  enhancementBag: RandomBag;
  superRareBag: RandomBag;
  physicalThreatBag: RandomBag;
  magicalThreatBag: RandomBag;
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
}

// Expedition Log Types
export interface ExpeditionLogEntry {
  room: number;
  enemyName: string;
  enemyHP: number;
  enemyAttackValues: string; // format: "LONG/MID/CLOSE" e.g. "300/0/340"
  outcome: BattleOutcome;
  damageDealt: number;
  damageTaken: number;
  remainingPartyHP: number;
  maxPartyHP: number;
  reward?: string;
  details: BattleLogEntry[];
}

export interface ExpeditionLog {
  dungeonId: number;
  dungeonName: string;
  totalExperience: number;
  totalRooms: number;
  completedRooms: number;
  finalOutcome: 'victory' | 'defeat' | 'retreat';
  entries: ExpeditionLogEntry[];
  rewards: Item[];
  autoSellProfit: number;
  remainingPartyHP: number;
  maxPartyHP: number;
}

// Game State
export type GameScene = 'home';

export interface GameState {
  scene: GameScene;
  party: Party;
  bags: GameBags;
  selectedDungeonId: number;
  lastExpeditionLog: ExpeditionLog | null;
  buildNumber: number;
}

// Level-based equipment slots
export const LEVEL_EQUIP_SLOTS: Record<number, number> = {
  1: 1,
  3: 2,
  6: 3,
  12: 4,
  16: 5,
  20: 6,
  25: 7,
};

export const MAX_LEVEL = 29;
