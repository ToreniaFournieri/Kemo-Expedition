import { t } from '../i18n';
import { AbilityId, Bonus, EnemyClassId, ItemCategory } from '../types';

type GodMythicDrop = {
  dropBy: string;
  tier: number;
  category: ItemCategory;
  name: string;
  bonuses?: Bonus[];
};

export type GodEnemyProfile = {
  enemyId: number;
  expId: number;
  tier: number;
  level: number;
  name: string;
  title: string;
  displayName: string;
  enemyClass: EnemyClassId;
  representFor: string;
  abilities: Array<{ id: AbilityId; level: number }>;
  itemIds: readonly [number, number];
  expedition: string;
  image_path?: string;
};



export const GOD_ENEMY_PROFILES: GodEnemyProfile[] = [
  { enemyId: 1, expId: 1, tier: 3, level: 18, name: 'Seiran', title: 'Goddess of Restoration', get displayName() { return t('masterData.god.Seiran.displayName'); }, enemyClass: 'pilgrim', representFor: 'Caninian', abilities: [{ id: 'resurrect', level: 2 }], itemIds: [8501, 8502], get expedition() { return t('masterData.god.Seiran.expedition'); }, image_path: '/enemy/E_1.png' },
  { enemyId: 2, expId: 2, tier: 4, level: 25, name: 'Garv', title: 'God of Attrition', get displayName() { return t('masterData.god.Garv.displayName'); }, enemyClass: 'samurai', representFor: 'Lupinian', abilities: [{ id: 'rage', level: 2 }, { id: 're_counter', level: 2 }], itemIds: [8503, 8504], get expedition() { return t('masterData.god.Garv.expedition'); }, image_path: '/enemy/E_2.png' },
  { enemyId: 3, expId: 3, tier: 5, level: 32, name: 'Kyōen', title: 'God of Cunning', get displayName() { return t('masterData.god.Kyōen.displayName'); }, enemyClass: 'striker', representFor: 'Vulpinian', abilities: [{ id: 'momentum', level: 2 }], itemIds: [8505, 8506], get expedition() { return t('masterData.god.Kyōen.expedition'); }, image_path: '/enemy/E_3.png' },
  { enemyId: 4, expId: 4, tier: 7, level: 39, name: 'Miora', title: 'Goddess of Fertility', get displayName() { return t('masterData.god.Miora.displayName'); }, enemyClass: 'sage', representFor: 'Felidian', abilities: [{ id: 'first_strike', level: 2 }], itemIds: [8509, 8510], get expedition() { return t('masterData.god.Miora.expedition'); }, image_path: '/enemy/E_4.png' },
  { enemyId: 5, expId: 5, tier: 6, level: 46, name: 'Dolvar', title: 'God of Fortification', get displayName() { return t('masterData.god.Dolvar.displayName'); }, enemyClass: 'guardian', representFor: 'Ursan', abilities: [{ id: 'cyborgization', level: 2 }], itemIds: [8507, 8508], get expedition() { return t('masterData.god.Dolvar.expedition'); }, image_path: '/enemy/E_5.png' },
  { enemyId: 6, expId: 6, tier: 7, level: 53, name: 'Tanue', title: 'Goddess of Mirage', get displayName() { return t('masterData.god.Tanue.displayName'); }, enemyClass: 'duelist', representFor: 'Procyonian', abilities: [], itemIds: [8519, 8520], get expedition() { return t('masterData.god.Tanue.expedition'); }, image_path: '/enemy/E_6.png' },
  { enemyId: 7, expId: 7, tier: 8, level: 60, name: 'Lira', title: 'Goddess of Precision', get displayName() { return t('masterData.god.Lira.displayName'); }, enemyClass: 'ranger', representFor: 'Leporian', abilities: [{ id: 'composure', level: 2 }], itemIds: [8513, 8514], get expedition() { return t('masterData.god.Lira.expedition'); }, image_path: '/enemy/E_7.png' },
  { enemyId: 8, expId: 8, tier: 8, level: 61, name: 'Forne', title: 'God of Fate', get displayName() { return t('masterData.god.Forne.displayName'); }, enemyClass: 'lord', representFor: 'Cervin', abilities: [{ id: 'focus', level: 2 }], itemIds: [8515, 8516], get expedition() { return t('masterData.god.Forne.expedition'); }, image_path: '/enemy/E_8.png' },
  { enemyId: 9, expId: 9, tier: 8, level: 62, name: 'Skuva', title: 'God of Dusk', get displayName() { return t('masterData.god.Skuva.displayName'); }, enemyClass: 'ninja', representFor: 'Murid', abilities: [{ id: 'stealth', level: 1 }], itemIds: [8517, 8518], get expedition() { return t('masterData.god.Skuva.expedition'); }, image_path: '/enemy/E_9.png' },
  { enemyId: 10, expId: 10, tier: 7, level: 63, name: 'Rondel', title: 'God of Resonance', get displayName() { return t('masterData.god.Rondel.displayName'); }, enemyClass: 'wizard', representFor: 'Mustelid', abilities: [{ id: 'resonance', level: 4 }], itemIds: [8511, 8512], expedition: '(not yet)', image_path: '/enemy/E_10.png' },
  { enemyId: 11, expId: 11, tier: 8, level: 70, name: 'Noctyra', title: 'God of Oblivion', get displayName() { return t('masterData.god.Noctyra.displayName'); }, enemyClass: 'samurai', representFor: '-', abilities: [{ id: 'rage', level: 2 }, { id: 'first_strike', level: 2 }], itemIds: [8521, 8522], expedition: '(not yet)', image_path: '/enemy/E_11.png' },
  { enemyId: 12, expId: 12, tier: 8, level: 71, name: 'Eris', title: 'Goddess of Discord', get displayName() { return t('masterData.god.Eris.displayName'); }, enemyClass: 'pilgrim', representFor: '-', abilities: [{ id: 'momentum', level: 2 }, { id: 'resonance', level: 4 }, { id: 'stealth', level: 1 }], itemIds: [8523, 8524], expedition: '(not yet)', image_path: '/enemy/E_12.png' },
];

export function getGodProfileForDungeon(dungeonId: number, dungeonName: string): GodEnemyProfile | undefined {
  const byExpId = GOD_ENEMY_PROFILES.find((god) => god.expId === dungeonId);
  if (byExpId) return byExpId;

  const byExpeditionName = GOD_ENEMY_PROFILES.find((god) => god.expedition === dungeonName);
  if (byExpeditionName) return byExpeditionName;

  // Fallback for legacy saves where dungeon names may differ from the latest localized names.
  return GOD_ENEMY_PROFILES[dungeonId - 1];
}

export const GOD_MYTHIC_DROPS: GodMythicDrop[] = [
  { dropBy: 'Seiran', tier: 3, category: 'grimoire', get name() { return t('masterData.mythicDrop.Seiran.1.name'); }, bonuses: [{ type: 'unlock_caninian_ability', value: 1 }] },
  { dropBy: 'Seiran', tier: 3, category: 'robe', get name() { return t('masterData.mythicDrop.Seiran.2.name'); }, bonuses: [{ type: 'unlock_caninian_ability', value: 1 }] },
  { dropBy: 'Garv', tier: 4, category: 'katana', get name() { return t('masterData.mythicDrop.Garv.1.name'); }, bonuses: [{ type: 'unlock_lupinian_ability', value: 1 }] },
  { dropBy: 'Garv', tier: 4, category: 'shield', get name() { return t('masterData.mythicDrop.Garv.2.name'); }, bonuses: [{ type: 'unlock_lupinian_ability', value: 1 }] },
  { dropBy: 'Kyōen', tier: 5, category: 'archery', get name() { return t('masterData.mythicDrop.Kyōen.1.name'); }, bonuses: [{ type: 'unlock_vulpinian_ability', value: 1 }] },
  { dropBy: 'Kyōen', tier: 5, category: 'bolt', get name() { return t('masterData.mythicDrop.Kyōen.2.name'); }, bonuses: [{ type: 'unlock_vulpinian_ability', value: 1 }] },
  { dropBy: 'Dolvar', tier: 6, category: 'armor', get name() { return t('masterData.mythicDrop.Dolvar.1.name'); }, bonuses: [{ type: 'unlock_ursan_ability', value: 1 }] },
  { dropBy: 'Dolvar', tier: 6, category: 'gauntlet', get name() { return t('masterData.mythicDrop.Dolvar.2.name'); }, bonuses: [{ type: 'unlock_ursan_ability', value: 1 }] },
  { dropBy: 'Miora', tier: 7, category: 'sword', get name() { return t('masterData.mythicDrop.Miora.1.name'); }, bonuses: [{ type: 'unlock_felidian_ability', value: 1 }] },
  { dropBy: 'Miora', tier: 7, category: 'catalyst', get name() { return t('masterData.mythicDrop.Miora.2.name'); }, bonuses: [{ type: 'unlock_felidian_ability', value: 1 }] },
  { dropBy: 'Rondel', tier: 7, category: 'wand', get name() { return t('masterData.mythicDrop.Rondel.1.name'); }, bonuses: [{ type: 'unlock_mustelid_ability', value: 1 }] },
  { dropBy: 'Rondel', tier: 7, category: 'arrow', get name() { return t('masterData.mythicDrop.Rondel.2.name'); }, bonuses: [{ type: 'unlock_mustelid_ability', value: 1 }] },
  { dropBy: 'Lira', tier: 8, category: 'arrow', get name() { return t('masterData.mythicDrop.Lira.1.name'); }, bonuses: [{ type: 'unlock_leporian_ability', value: 1 }] },
  { dropBy: 'Lira', tier: 8, category: 'archery', get name() { return t('masterData.mythicDrop.Lira.2.name'); }, bonuses: [{ type: 'unlock_leporian_ability', value: 1 }] },
  { dropBy: 'Forne', tier: 8, category: 'armor', get name() { return t('masterData.mythicDrop.Forne.1.name'); }, bonuses: [{ type: 'unlock_cervin_ability', value: 1 }] },
  { dropBy: 'Forne', tier: 8, category: 'robe', get name() { return t('masterData.mythicDrop.Forne.2.name'); }, bonuses: [{ type: 'unlock_cervin_ability', value: 1 }] },
  { dropBy: 'Skuva', tier: 8, category: 'shield', get name() { return t('masterData.mythicDrop.Skuva.1.name'); }, bonuses: [{ type: 'unlock_murid_ability', value: 1 }] },
  { dropBy: 'Skuva', tier: 8, category: 'catalyst', get name() { return t('masterData.mythicDrop.Skuva.2.name'); }, bonuses: [{ type: 'unlock_murid_ability', value: 1 }] },
  { dropBy: 'Tanue', tier: 7, category: 'sword', get name() { return t('masterData.mythicDrop.Tanue.1.name'); }, bonuses: [{ type: 'unlock_procyonian_ability', value: 1 }] },
  { dropBy: 'Tanue', tier: 7, category: 'gauntlet', get name() { return t('masterData.mythicDrop.Tanue.2.name'); }, bonuses: [{ type: 'unlock_procyonian_ability', value: 1 }] },
  { dropBy: 'Noctyra', tier: 8, category: 'bolt', get name() { return t('masterData.mythicDrop.Noctyra.1.name'); } },
  { dropBy: 'Noctyra', tier: 8, category: 'katana', get name() { return t('masterData.mythicDrop.Noctyra.2.name'); } },
  { dropBy: 'Eris', tier: 8, category: 'grimoire', get name() { return t('masterData.mythicDrop.Eris.1.name'); } },
  { dropBy: 'Eris', tier: 8, category: 'wand', get name() { return t('masterData.mythicDrop.Eris.2.name'); } },
];
