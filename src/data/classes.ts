import { t } from '../i18n';
import { ClassDef, ClassId } from '../types';

export const CLASS_SHORT_NAME_KEYS: Record<ClassId | 'fighter' | 'rogue', string> = {
  fighter: 'masterData.class.fighter.short',
  guardian: 'masterData.class.guardian.short',
  duelist: 'masterData.class.duelist.short',
  samurai: 'masterData.class.samurai.short',
  'sword-saint': 'masterData.class.sword-saint.short',
  ranger: 'masterData.class.ranger.short',
  striker: 'masterData.class.striker.short',
  ninja: 'masterData.class.ninja.short',
  wizard: 'masterData.class.wizard.short',
  sage: 'masterData.class.sage.short',
  alchemist: 'masterData.class.alchemist.short',
  pilgrim: 'masterData.class.pilgrim.short',
  lord: 'masterData.class.lord.short',
  rogue: 'masterData.class.rogue.short',
};

export const CLASS_SHORT_NAMES: Record<ClassId | 'fighter' | 'rogue', string> = new Proxy(CLASS_SHORT_NAME_KEYS, {
  get: (target, classId: string) => t(target[classId as ClassId | 'fighter' | 'rogue'] ?? classId),
}) as Record<ClassId | 'fighter' | 'rogue', string>;




export function getClassShortName(classId: ClassId | 'fighter' | 'rogue'): string {
  return t(CLASS_SHORT_NAME_KEYS[classId] ?? classId);
}

// SpecRef: 2.2 | CHARACTER_&_PARTY_MASTER_DATA | class.master_data
export const CLASSES: ClassDef[] = [
  {
    id: 'guardian',
    get name() { return t('masterData.class.guardian.name'); },
    mainSubBonuses: [
      { type: 'armor_multiplier', value: 1.4 },
      { type: 'equip_slot', value: 2 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'defender', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'defender', abilityLevel: 2 },
      { type: 'armor_multiplier', value: 1.2 },
    ],
  },
  {
    id: 'duelist',
    get name() { return t('masterData.class.duelist.name'); },
    mainSubBonuses: [
      { type: 'equip_melee', value: 1 },
      { type: 'sword_multiplier', value: 1.4 },
      { type: 'bolt_multiplier', value: 1.1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'counter', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'counter', abilityLevel: 2 },
      { type: 'sword_multiplier', value: 1.2 },
    ],
  },
  {
    id: 'samurai',
    get name() { return t('masterData.class.samurai.name'); },
    mainSubBonuses: [
      { type: 'equip_melee', value: 1 },
      { type: 'katana_multiplier', value: 1.4 },
      { type: 'archery_multiplier', value: 1.2 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'iaigiri', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'iaigiri', abilityLevel: 2 },
    ],
  },
  {
    id: 'sword-saint',
    get name() { return t('masterData.class.sword-saint.name'); },
    mainSubBonuses: [
      { type: 'equip_melee', value: 1 },
      { type: 'gauntlet_multiplier', value: 1.4 },
      { type: 'grimoire_multiplier', value: 1.1 },
      { type: 'equip_slot', value: 1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 're_attack', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 're_attack', abilityLevel: 2 },
      { type: 'katana_multiplier', value: 1.2 },
    ],
  },
  {
    id: 'ranger',
    get name() { return t('masterData.class.ranger.name'); },
    mainSubBonuses: [
      { type: 'equip_ranged', value: 1 },
      { type: 'arrow_multiplier', value: 1.4 },
      { type: 'sword_multiplier', value: 1.1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'hunter', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'hunter', abilityLevel: 2 },
      { type: 'arrow_multiplier', value: 1.2 },
    ],
  },
  {
    id: 'striker',
    get name() { return t('masterData.class.striker.name'); },
    mainSubBonuses: [
      { type: 'equip_ranged', value: 1 },
      { type: 'bolt_multiplier', value: 1.4 },
      { type: 'katana_multiplier', value: 1.1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'heavy_strike', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'heavy_strike', abilityLevel: 2 },
      { type: 'bolt_multiplier', value: 1.2 },
    ],
  },
  {
    id: 'ninja',
    get name() { return t('masterData.class.ninja.name'); },
    mainSubBonuses: [
      { type: 'equip_ranged', value: 1 },
      { type: 'archery_multiplier', value: 1.4 },
      { type: 'wand_multiplier', value: 1.1 },
      { type: 'equip_slot', value: 1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'first_strike', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'first_strike', abilityLevel: 2 },
      { type: 'archery_multiplier', value: 1.2 },
    ],
  },
  {
    id: 'wizard',
    get name() { return t('masterData.class.wizard.name'); },
    mainSubBonuses: [
      { type: 'equip_magic', value: 1 },
      { type: 'wand_multiplier', value: 1.4 },
      { type: 'bolt_multiplier', value: 1.1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'resonance', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'resonance', abilityLevel: 2 },
      { type: 'wand_multiplier', value: 1.2 },
    ],
  },
  {
    id: 'sage',
    get name() { return t('masterData.class.sage.name'); },
    mainSubBonuses: [
      { type: 'equip_magic', value: 1 },
      { type: 'grimoire_multiplier', value: 1.4 },
      { type: 'sword_multiplier', value: 1.2 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'arc_magic', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'arc_magic', abilityLevel: 2 },
      { type: 'grimoire_multiplier', value: 1.2 },
    ],
  },
  {
    id: 'alchemist',
    get name() { return t('masterData.class.alchemist.name'); },
    mainSubBonuses: [
      { type: 'equip_magic', value: 1 },
      { type: 'catalyst_multiplier', value: 1.4 },
      { type: 'robe_multiplier', value: 1.1 },
      { type: 'equip_slot', value: 1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'arcane_stability', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'arcane_stability', abilityLevel: 2 },
      { type: 'catalyst_multiplier', value: 1.2 },
    ],
  },
  {
    id: 'pilgrim',
    get name() { return t('masterData.class.pilgrim.name'); },
    mainSubBonuses: [
      { type: 'robe_multiplier', value: 1.4 },
      { type: 'equip_slot', value: 2 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'm_barrier', abilityLevel: 1 },
      { type: 'ability', value: 1, abilityId: 'tithe', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'm_barrier', abilityLevel: 2 },
      { type: 'ability', value: 1, abilityId: 'tithe', abilityLevel: 1 },
      { type: 'robe_multiplier', value: 1.2 },
    ],
  },
  {
    id: 'lord',
    get name() { return t('masterData.class.lord.name'); },
    mainSubBonuses: [
      { type: 'shield_multiplier', value: 1.4 },
      { type: 'equip_slot', value: 2 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'command', abilityLevel: 1 },
      { type: 'ability', value: 1, abilityId: 'squander', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'command', abilityLevel: 2 },
      { type: 'ability', value: 1, abilityId: 'squander', abilityLevel: 1 },
      { type: 'shield_multiplier', value: 1.2 },
    ],
  },
];

export const getClassById = (id: string): ClassDef | undefined =>
  CLASSES.find(c => c.id === id);
