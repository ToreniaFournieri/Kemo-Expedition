import { t } from '../i18n';
type GlossaryEntry = {
  key: string;
  label: string;
  description: string;
};

type GlossarySection = {
  id: string;
  heading: string;
  subtitle: string;
  entries: GlossaryEntry[];
};

export const GLOSSARY_SECTIONS: GlossarySection[] = [
  {
    "id": "2-1-1",
    "heading": "2.1.1 a. bonus ability",
    get subtitle() { return t('data.glossary.2_1_1.subtitle'); },
    "entries": [
    ]
  },
  {
    "id": "2-1-2",
    "heading": "2.1.2 b. bonus",
    get subtitle() { return t('data.glossary.2_1_2.subtitle'); },
    "entries": [
      {
        "key": "b.vitality+v",
        get label() { return t('data.glossary.2_1_2.label'); },
        get description() { return t('data.glossary.2_1_2.description'); }
      },
      {
        "key": "b.strength+v",
        get label() { return t('data.glossary.2.label'); },
        get description() { return t('data.glossary.2.description'); }
      },
      {
        "key": "b.intelligence+v",
        get label() { return t('data.glossary.3.label'); },
        get description() { return t('data.glossary.3.description'); }
      },
      {
        "key": "b.mind+v",
        get label() { return t('data.glossary.4.label'); },
        get description() { return t('data.glossary.4.description'); }
      }
    ]
  },
  {
    "id": "2-1-3",
    "heading": "2.1.3 c. bonus",
    get subtitle() { return t('data.glossary.2_1_3.subtitle'); },
    "entries": [
      {
        "key": "c.melee_attack+v",
        get label() { return t('data.glossary.2_1_3.label'); },
        get description() { return t('data.glossary.2_1_3.description'); }
      },
      {
        "key": "c.ranged_attack+v",
        get label() { return t('data.glossary.6.label'); },
        get description() { return t('data.glossary.6.description'); }
      },
      {
        "key": "c.magical_attack+v",
        get label() { return t('data.glossary.7.label'); },
        get description() { return t('data.glossary.7.description'); }
      },
      {
        "key": "c.physical_defense+v",
        get label() { return t('data.glossary.8.label'); },
        get description() { return t('data.glossary.8.description'); }
      },
      {
        "key": "c.magical_defense+v",
        get label() { return t('data.glossary.9.label'); },
        get description() { return t('data.glossary.9.description'); }
      },
      {
        "key": "c.melee_NoA+v",
        get label() { return t('data.glossary.10.label'); },
        get description() { return t('data.glossary.10.description'); }
      },
      {
        "key": "c.ranged_NoA+v",
        get label() { return t('data.glossary.11.label'); },
        get description() { return t('data.glossary.11.description'); }
      },
      {
        "key": "c.magical_NoA+v",
        get label() { return t('data.glossary.12.label'); },
        get description() { return t('data.glossary.12.description'); }
      },
      {
        "key": "c.accuracy+v",
        get label() { return t('data.glossary.13.label'); },
        get description() { return t('party.bonusHelp.accuracy'); }
      },
      {
        "key": "c.evasion+v",
        get label() { return t('data.glossary.14.label'); },
        get description() { return t('party.bonusHelp.evasion'); }
      },
      {
        "key": "c.equip_slot+v",
        get label() { return t('data.glossary.15.label'); },
        get description() { return t('data.glossary.15.description'); }
      },
      {
        "key": "c.equip_melee",
        get label() { return t('data.glossary.16.label'); },
        get description() { return t('party.bonusHelp.equipMelee'); }
      },
      {
        "key": "c.equip_ranged",
        get label() { return t('data.glossary.17.label'); },
        get description() { return t('party.bonusHelp.equipRanged'); }
      },
      {
        "key": "c.equip_magic",
        get label() { return t('data.glossary.18.label'); },
        get description() { return t('party.bonusHelp.equipMagic'); }
      },
      {
        "key": "c.penet+v",
        get label() { return t('data.glossary.19.label'); },
        get description() { return t('data.glossary.19.description'); }
      },
      {
        "key": "c.growth_xV",
        get label() { return t('data.glossary.20.label'); },
        get description() { return t('data.glossary.20.description'); }
      },
      {
        "key": "c.physical_attack+v",
        get label() { return t('data.glossary.21.label'); },
        get description() { return t('data.glossary.21.description'); }
      },
      {
        "key": "c.physical_offense_multiplier_xV",
        get label() { return t('data.glossary.22.label'); },
        get description() { return t('data.glossary.22.description'); }
      },
      {
        "key": "c.magical_offense_multiplier_xV",
        get label() { return t('data.glossary.23.label'); },
        get description() { return t('data.glossary.23.description'); }
      },
      {
        "key": "c.physical_defense_multiplier_xV",
        get label() { return t('data.glossary.24.label'); },
        get description() { return t('data.glossary.24.description'); }
      },
      {
        "key": "c.magical_defense_multiplier_xV",
        get label() { return t('data.glossary.25.label'); },
        get description() { return t('data.glossary.25.description'); }
      },
      {
        "key": "c.deity_physical_attack_xV",
        get label() { return t('data.glossary.26.label'); },
        get description() { return t('data.glossary.26.description'); }
      },
      {
        "key": "c.deity_magical_attack_xV",
        get label() { return t('data.glossary.27.label'); },
        get description() { return t('data.glossary.27.description'); }
      },
      {
        "key": "c.deity_physical_defense_x2/3",
        get label() { return t('data.glossary.28.label'); },
        get description() { return t('data.glossary.28.description'); }
      },
      {
        "key": "c.deity_pysical_defense_xV",
        get label() { return t('data.glossary.29.label'); },
        get description() { return t('data.glossary.29.description'); }
      },
      {
        "key": "c.deity_magical_defense_x2/3",
        get label() { return t('data.glossary.30.label'); },
        get description() { return t('data.glossary.30.description'); }
      },
      {
        "key": "c.deity_magical_defense_xV",
        get label() { return t('data.glossary.31.label'); },
        get description() { return t('data.glossary.31.description'); }
      },
      {
        "key": "c.deity_move_first+1",
        get label() { return t('data.glossary.32.label'); },
        get description() { return t('data.glossary.32.description'); }
      },
      {
        "key": "c.deity_accuracy+v",
        get label() { return t('data.glossary.33.label'); },
        get description() { return t('party.bonusHelp.accuracy'); }
      },
      {
        "key": "c.deity_evasion+v",
        get label() { return t('data.glossary.34.label'); },
        get description() { return t('party.bonusHelp.evasion'); }
      },
      {
        "key": "c.fire_defense_multiplier_xV",
        get label() { return t('data.glossary.35.label'); },
        get description() { return t('data.glossary.35.description'); }
      },
      {
        "key": "c.ice_defense_multiplier_xV",
        get label() { return t('data.glossary.36.label'); },
        get description() { return t('data.glossary.36.description'); }
      },
      {
        "key": "c.thunder_defense_multiplier_xV",
        get label() { return t('data.glossary.37.label'); },
        get description() { return t('data.glossary.37.description'); }
      },
      {
        "key": "c.upgrade_V",
        get label() { return t('data.glossary.38.label'); },
        get description() { return t('data.glossary.38.description'); }
      },
      {
        "key": "c.antagonism",
        get label() { return t('data.glossary.39.label'); },
        get description() { return t('party.bonusHelp.antagonism'); }
      },
      {
        "key": "c.unlock_caninian_ability",
        get label() { return t('data.glossary.40.label'); },
        get description() { return t('data.glossary.40.description'); }
      },
      {
        "key": "c.unlock_lupinian_ability",
        get label() { return t('data.glossary.41.label'); },
        get description() { return t('data.glossary.41.description'); }
      },
      {
        "key": "c.unlock_vulpinian_ability",
        get label() { return t('data.glossary.42.label'); },
        get description() { return t('data.glossary.42.description'); }
      },
      {
        "key": "c.unlock_ursan_ability",
        get label() { return t('data.glossary.43.label'); },
        get description() { return t('data.glossary.43.description'); }
      },
      {
        "key": "c.unlock_felidian_ability",
        get label() { return t('data.glossary.44.label'); },
        get description() { return t('data.glossary.44.description'); }
      },
      {
        "key": "c.unlock_mustelid_ability",
        get label() { return t('data.glossary.45.label'); },
        get description() { return t('data.glossary.45.description'); }
      },
      {
        "key": "c.unlock_leporian_ability",
        get label() { return t('data.glossary.46.label'); },
        get description() { return t('data.glossary.46.description'); }
      },
      {
        "key": "c.unlock_cervin_ability",
        get label() { return t('data.glossary.47.label'); },
        get description() { return t('data.glossary.47.description'); }
      },
      {
        "key": "c.unlock_murid_ability",
        get label() { return t('data.glossary.48.label'); },
        get description() { return t('data.glossary.48.description'); }
      },
      {
        "key": "c.unlock_procyonian_ability",
        get label() { return t('data.glossary.49.label'); },
        get description() { return t('data.glossary.49.description'); }
      },
      {
        "key": "c.armor_x1.x",
        get label() { return t('data.glossary.50.label'); },
        get description() { return t('data.glossary.50.description'); }
      },
      {
        "key": "c.robe_x1.x",
        get label() { return t('data.glossary.51.label'); },
        get description() { return t('data.glossary.51.description'); }
      },
      {
        "key": "c.shield_x1.x",
        get label() { return t('data.glossary.52.label'); },
        get description() { return t('data.glossary.52.description'); }
      },
      {
        "key": "c.sword_x1.x",
        get label() { return t('data.glossary.53.label'); },
        get description() { return t('data.glossary.53.description'); }
      },
      {
        "key": "c.katana_x1.x",
        get label() { return t('data.glossary.54.label'); },
        get description() { return t('data.glossary.54.description'); }
      },
      {
        "key": "c.gauntlet_x1.x",
        get label() { return t('data.glossary.55.label'); },
        get description() { return t('data.glossary.55.description'); }
      },
      {
        "key": "c.arrow_x1.x",
        get label() { return t('data.glossary.56.label'); },
        get description() { return t('data.glossary.56.description'); }
      },
      {
        "key": "c.bolt_x1.x",
        get label() { return t('data.glossary.57.label'); },
        get description() { return t('data.glossary.57.description'); }
      },
      {
        "key": "c.archery_x1.x",
        get label() { return t('data.glossary.58.label'); },
        get description() { return t('data.glossary.58.description'); }
      },
      {
        "key": "c.wand_x1.x",
        get label() { return t('data.glossary.59.label'); },
        get description() { return t('data.glossary.59.description'); }
      },
      {
        "key": "c.grimoire_x1.x",
        get label() { return t('data.glossary.60.label'); },
        get description() { return t('data.glossary.60.description'); }
      },
      {
        "key": "c.catalyst_x1.x",
        get label() { return t('data.glossary.61.label'); },
        get description() { return t('data.glossary.61.description'); }
      }
    ]
  },
  {
    "id": "2-1-4",
    "heading": "2.1.4 d. bonus",
    get subtitle() { return t('data.glossary.2_1_4.subtitle'); },
    "entries": [
      {
        "key": "d.ranged_attack",
        get label() { return t('data.glossary.2_1_4.label'); },
        get description() { return t('data.glossary.2_1_4.description'); }
      },
      {
        "key": "d.melee_attack",
        get label() { return t('data.glossary.63.label'); },
        get description() { return t('data.glossary.63.description'); }
      },
      {
        "key": "d.magical_attack",
        get label() { return t('data.glossary.64.label'); },
        get description() { return t('data.glossary.64.description'); }
      },
      {
        "key": "d.ranged_NoA+v",
        get label() { return t('data.glossary.65.label'); },
        get description() { return t('data.glossary.65.description'); }
      },
      {
        "key": "d.magical_NoA+v",
        get label() { return t('data.glossary.66.label'); },
        get description() { return t('data.glossary.66.description'); }
      },
      {
        "key": "d.melee_NoA+v",
        get label() { return t('data.glossary.67.label'); },
        get description() { return t('data.glossary.67.description'); }
      },
      {
        "key": "d.ranged_offense_amplifier",
        get label() { return t('data.glossary.68.label'); },
        get description() { return t('data.glossary.68.description'); }
      },
      {
        "key": "d.magical_offense_amplifier",
        get label() { return t('data.glossary.69.label'); },
        get description() { return t('data.glossary.69.description'); }
      },
      {
        "key": "d.melee_offense_amplifier",
        get label() { return t('data.glossary.70.label'); },
        get description() { return t('data.glossary.70.description'); }
      },
      {
        "key": "d.physical_defense",
        get label() { return t('data.glossary.71.label'); },
        get description() { return t('data.glossary.71.description'); }
      },
      {
        "key": "d.magical_defense",
        get label() { return t('data.glossary.72.label'); },
        get description() { return t('data.glossary.72.description'); }
      },
      {
        "key": "d.physical_defense_amplifier",
        get label() { return t('data.glossary.73.label'); },
        get description() { return t('data.glossary.73.description'); }
      },
      {
        "key": "d.magical_defense_amplifier",
        get label() { return t('data.glossary.74.label'); },
        get description() { return t('data.glossary.74.description'); }
      },
      {
        "key": "d.physical_accuracy",
        get label() { return t('data.glossary.75.label'); },
        get description() { return t('data.glossary.75.description'); }
      },
      {
        "key": "d.magical_accuracy",
        get label() { return t('data.glossary.76.label'); },
        get description() { return t('data.glossary.76.description'); }
      },
      {
        "key": "d.accuracy-v",
        get label() { return t('data.glossary.77.label'); },
        get description() { return t('data.glossary.77.description'); }
      },
      {
        "key": "d.evasion-v",
        get label() { return t('data.glossary.78.label'); },
        get description() { return t('data.glossary.78.description'); }
      },
      {
        "key": "d.accuracy_potency",
        get label() { return t('data.glossary.79.label'); },
        get description() { return t('data.glossary.79.description'); }
      },
      {
        "key": "d.elemental_offense_attribute",
        get label() { return t('data.glossary.80.label'); },
        get description() { return t('data.glossary.80.description'); }
      },
      {
        "key": "d.elemental_defense_attribute",
        get label() { return t('data.glossary.82.label'); },
        get description() { return t('data.glossary.82.description'); }
      },
      {
        "key": "e.fire+v",
        get label() { return t('data.glossary.element.fire.label'); },
        get description() { return t('data.glossary.element.fire.description'); }
      },
      {
        "key": "e.ice+v",
        get label() { return t('data.glossary.element.ice.label'); },
        get description() { return t('data.glossary.element.ice.description'); }
      },
      {
        "key": "e.thunder+v",
        get label() { return t('data.glossary.element.thunder.label'); },
        get description() { return t('data.glossary.element.thunder.description'); }
      }
    ]
  },
  {
    "id": "2-1-6",
    "heading": "2.1.6 f. function",
    get subtitle() { return t('data.glossary.2_1_6.subtitle'); },
    "entries": [
      {
        "key": "f.physical_targeting",
        get label() { return t('data.glossary.2_1_6.label'); },
        get description() { return t('data.glossary.2_1_6.description'); }
      },
      {
        "key": "f.magical_targeting",
        get label() { return t('data.glossary.84.label'); },
        get description() { return t('data.glossary.84.description'); }
      },
      {
        "key": "f.damage_calculation",
        get label() { return t('data.glossary.85.label'); },
        get description() { return t('data.glossary.85.description'); }
      },
      {
        "key": "f.hit_detection",
        get label() { return t('data.glossary.86.label'); },
        get description() { return t('data.glossary.86.description'); }
      },
      {
        "key": "f.counter",
        get label() { return t('data.glossary.87.label'); },
        get description() { return t('data.glossary.87.description'); }
      },
      {
        "key": "f.re-counter",
        get label() { return t('data.glossary.88.label'); },
        get description() { return t('data.glossary.88.description'); }
      },
      {
        "key": "f.re-attack",
        get label() { return t('data.glossary.89.label'); },
        get description() { return t('data.glossary.89.description'); }
      },
      {
        "key": "f.magical-counter",
        get label() { return t('data.glossary.90.label'); },
        get description() { return t('data.glossary.90.description'); }
      },
      {
        "key": "f.covering-fire",
        get label() { return t('data.glossary.91.label'); },
        get description() { return t('data.glossary.91.description'); }
      },
      {
        "key": "f.reward",
        get label() { return t('data.glossary.92.label'); },
        get description() { return t('data.glossary.92.description'); }
      },
      {
        "key": "f.donation",
        get label() { return t('data.glossary.93.label'); },
        get description() { return t('data.glossary.93.description'); }
      },
      {
        "key": "f.equipment_slots",
        get label() { return t('data.glossary.94.label'); },
        get description() { return t('data.glossary.94.description'); }
      },
      {
        "key": "f.common_enhancement",
        get label() { return t('data.glossary.95.label'); },
        get description() { return t('data.glossary.95.description'); }
      },
      {
        "key": "f.enhancement",
        get label() { return t('data.glossary.96.label'); },
        get description() { return t('data.glossary.96.description'); }
      },
      {
        "key": "f.enhancement_scaling",
        get label() { return t('data.glossary.97.label'); },
        get description() { return t('data.glossary.97.description'); }
      },
      {
        "key": "f.rarity_scaling",
        get label() { return t('data.glossary.98.label'); },
        get description() { return t('data.glossary.98.description'); }
      },
      {
        "key": "f.super-rare-scaling",
        get label() { return t('data.glossary.99.label'); },
        get description() { return t('data.glossary.99.description'); }
      },
      {
        "key": "f.afk-emulation-efficiency",
        get label() { return t('data.glossary.100.label'); },
        get description() { return t('data.glossary.100.description'); }
      },
      {
        "key": "f.condition",
        get label() { return t('data.glossary.condition.label'); },
        get description() { return t('data.glossary.condition.description'); }
      }
    ]
  },
  {
    "id": "2-1-7",
    "heading": "2.1.7 g. gods, religions",
    get subtitle() { return t('data.glossary.2_1_7.subtitle'); },
    "entries": [
      {
        "key": "Goddess of Restoration",
        get label() { return t('deity.name.GoddessOfRestoration'); },
        get description() { return t('data.glossary.2_1_7.description'); }
      },
      {
        "key": "God of Attrition",
        get label() { return t('deity.name.GodOfAttrition'); },
        get description() { return t('data.glossary.101.description'); }
      },
      {
        "key": "God of Cunning",
        get label() { return t('deity.name.GodOfCunning'); },
        get description() { return t('data.glossary.102.description'); }
      },
      {
        "key": "God of Fortification",
        get label() { return t('deity.name.GodOfFortification'); },
        get description() { return t('data.glossary.103.description'); }
      },
      {
        "key": "Goddess of Fertility",
        get label() { return t('deity.name.GoddessOfFertility'); },
        get description() { return t('data.glossary.104.description'); }
      },
      {
        "key": "God of Resonance",
        get label() { return t('deity.name.GodOfResonance'); },
        get description() { return t('data.glossary.105.description'); }
      },
      {
        "key": "Goddess of Precision",
        get label() { return t('deity.name.GoddessOfPrecision'); },
        get description() { return t('data.glossary.106.description'); }
      },
      {
        "key": "God of Fate",
        get label() { return t('deity.name.GodOfFate'); },
        get description() { return t('data.glossary.107.description'); }
      },
      {
        "key": "God of Dusk",
        get label() { return t('deity.name.GodOfDusk'); },
        get description() { return t('data.glossary.108.description'); }
      },
      {
        "key": "Goddess of Mirage",
        get label() { return t('deity.name.GoddessOfMirage'); },
        get description() { return t('data.glossary.109.description'); }
      },
      {
        "key": "God of Oblivion",
        get label() { return t('deity.name.GodOfOblivion'); },
        get description() { return t('data.glossary.110.description'); }
      },
      {
        "key": "Goddess of Discord",
        get label() { return t('deity.name.GoddessOfDiscord'); },
        get description() { return t('data.glossary.111.description'); }
      }
    ]
  },
  {
    "id": "2-1-8",
    "heading": "2.1.8 m. magic",
    get subtitle() { return t('data.glossary.2_1_8.subtitle'); },
    "entries": [
      {
        "key": "arcane_arrows",
        get label() { return t('data.glossary.2_1_8.label'); },
        get description() { return t('data.glossary.2_1_8.description'); }
      },
      {
        "key": "fire_lance",
        get label() { return t('data.glossary.113.label'); },
        get description() { return t('data.glossary.113.description'); }
      },
      {
        "key": "frost_needles",
        get label() { return t('data.glossary.114.label'); },
        get description() { return t('data.glossary.114.description'); }
      },
      {
        "key": "thunder_bolts",
        get label() { return t('data.glossary.115.label'); },
        get description() { return t('data.glossary.115.description'); }
      },
      {
        "key": "hellfire_volley",
        get label() { return t('data.glossary.116.label'); },
        get description() { return t('data.glossary.116.description'); }
      },
      {
        "key": "blizzard",
        get label() { return t('data.glossary.117.label'); },
        get description() { return t('data.glossary.117.description'); }
      },
      {
        "key": "lightning_barrage",
        get label() { return t('data.glossary.118.label'); },
        get description() { return t('data.glossary.118.description'); }
      },
      {
        "key": "astral_flare",
        get label() { return t('data.glossary.119.label'); },
        get description() { return t('data.glossary.119.description'); }
      },
      {
        "key": "pyroclasm",
        get label() { return t('data.glossary.120.label'); },
        get description() { return t('data.glossary.120.description'); }
      },
      {
        "key": "glacial_burst",
        get label() { return t('data.glossary.121.label'); },
        get description() { return t('data.glossary.121.description'); }
      },
      {
        "key": "tempest_nova",
        get label() { return t('data.glossary.122.label'); },
        get description() { return t('data.glossary.122.description'); }
      },
      {
        "key": "gravity_well",
        get label() { return t('data.glossary.123.label'); },
        get description() { return t('data.glossary.123.description'); }
      }
    ]
  }
  ,
  {
    "id": "2-1-9",
    "heading": "2.1.9 q. side quest",
    get subtitle() { return t('data.glossary.2_1_9.subtitle'); },
    "entries": [
      {
        "key": "q.none",
        get label() { return t('data.glossary.2_1_9.label'); },
        get description() { return t('data.glossary.2_1_9.description'); }
      },
      {
        "key": "q.squander",
        get label() { return t('sideQuest.squander.short'); },
        get description() { return t('data.glossary.125.description'); }
      },
      {
        "key": "q.sleeping",
        get label() { return t('sideQuest.sleeping.short'); },
        get description() { return t('data.glossary.126.description'); }
      },
      {
        "key": "q.exercise",
        get label() { return t('sideQuest.exercise.short'); },
        get description() { return t('data.glossary.127.description'); }
      },
      {
        "key": "q.embezzlement",
        get label() { return t('sideQuest.embezzlement.short'); },
        get description() { return t('data.glossary.128.description'); }
      },
      {
        "key": "q.donation",
        get label() { return t('sideQuest.donation.short'); },
        get description() { return t('data.glossary.129.description'); }
      },
      {
        "key": "q.healing",
        get label() { return t('sideQuest.healing.short'); },
        get description() { return t('data.glossary.130.description'); }
      },
      {
        "key": "q.AFK",
        get label() { return t('sideQuest.afk.short'); },
        get description() { return t('data.glossary.131.description'); }
      },
      {
        "key": "q.treasure-super-rare",
        get label() { return t('sideQuest.treasureSuperRare.short'); },
        get description() { return t('data.glossary.132.description'); }
      },
      {
        "key": "q.treasure-boss-rare",
        get label() { return t('sideQuest.treasureBossRare.short'); },
        get description() { return t('data.glossary.133.description'); }
      },
      {
        "key": "q.poor-kid",
        get label() { return t('sideQuest.poorKid.short'); },
        get description() { return t('data.glossary.134.description'); }
      },
      {
        "key": "q.consecutive-wins",
        get label() { return t('sideQuest.consecutiveWins.short'); },
        get description() { return t('data.glossary.135.description'); }
      },
      {
        "key": "q.losers",
        get label() { return t('sideQuest.losers.short'); },
        get description() { return t('data.glossary.136.description'); }
      },
      {
        "key": "q.savings",
        get label() { return t('sideQuest.savings.short'); },
        get description() { return t('data.glossary.137.description'); }
      }
    ]
  },
  {
    "id": "2-1-10",
    "heading": "1.1.10 t. terrain effects",
    get subtitle() { return t('data.glossary.2_1_10.subtitle'); },
    "entries": [
      {
        "key": "terrain.rejuvenation",
        get label() { return t('terrainEffect.terrain.rejuvenation.label'); },
        get description() { return t('terrainEffect.terrain.rejuvenation.description'); }
      },
      {
        "key": "terrain.exposure",
        get label() { return t('terrainEffect.terrain.exposure.label'); },
        get description() { return t('terrainEffect.terrain.exposure.description'); }
      },
      {
        "key": "terrain.predation",
        get label() { return t('terrainEffect.terrain.predation.label'); },
        get description() { return t('terrainEffect.terrain.predation.description'); }
      },
      {
        "key": "terrain.tailwind",
        get label() { return t('terrainEffect.terrain.tailwind.label'); },
        get description() { return t('terrainEffect.terrain.tailwind.description'); }
      },
      {
        "key": "terrain.thunderstorm",
        get label() { return t('terrainEffect.terrain.thunderstorm.label'); },
        get description() { return t('terrainEffect.terrain.thunderstorm.description'); }
      },
      {
        "key": "terrain.chill",
        get label() { return t('terrainEffect.terrain.chill.label'); },
        get description() { return t('terrainEffect.terrain.chill.description'); }
      },
      {
        "key": "terrain.rotwood",
        get label() { return t('terrainEffect.terrain.rotwood.label'); },
        get description() { return t('terrainEffect.terrain.rotwood.description'); }
      },
      {
        "key": "terrain.fog",
        get label() { return t('terrainEffect.terrain.fog.label'); },
        get description() { return t('terrainEffect.terrain.fog.description'); }
      },
      {
        "key": "terrain.vine-snare",
        get label() { return t('terrainEffect.terrain.vine-snare.label'); },
        get description() { return t('terrainEffect.terrain.vine-snare.description'); }
      },
      {
        "key": "terrain.crystal-zone",
        get label() { return t('terrainEffect.terrain.crystal-zone.label'); },
        get description() { return t('terrainEffect.terrain.crystal-zone.description'); }
      },
      {
        "key": "terrain.floor-domain",
        get label() { return t('terrainEffect.terrain.floor-domain.label'); },
        get description() { return t('terrainEffect.terrain.floor-domain.description'); }
      },
      {
        "key": "terrain.sunny-beach",
        get label() { return t('terrainEffect.terrain.sunny-beach.label'); },
        get description() { return t('terrainEffect.terrain.sunny-beach.description'); }
      },
      {
        "key": "terrain.silence-field",
        get label() { return t('terrainEffect.terrain.silence-field.label'); },
        get description() { return t('terrainEffect.terrain.silence-field.description'); }
      },
      {
        "key": "terrain.rough-waves",
        get label() { return t('terrainEffect.terrain.rough-waves.label'); },
        get description() { return t('terrainEffect.terrain.rough-waves.description'); }
      },
      {
        "key": "terrain.conduction",
        get label() { return t('terrainEffect.terrain.conduction.label'); },
        get description() { return t('terrainEffect.terrain.conduction.description'); }
      },
      {
        "key": "terrain.sacred-judgement",
        get label() { return t('terrainEffect.terrain.sacred-judgement.label'); },
        get description() { return t('terrainEffect.terrain.sacred-judgement.description'); }
      },
      {
        "key": "terrain.dry",
        get label() { return t('terrainEffect.terrain.dry.label'); },
        get description() { return t('terrainEffect.terrain.dry.description'); }
      },
      {
        "key": "terrain.heavy-wind",
        get label() { return t('terrainEffect.terrain.heavy-wind.label'); },
        get description() { return t('terrainEffect.terrain.heavy-wind.description'); }
      },
      {
        "key": "terrain.limestone-cave",
        get label() { return t('terrainEffect.terrain.limestone-cave.label'); },
        get description() { return t('terrainEffect.terrain.limestone-cave.description'); }
      },
      {
        "key": "terrain.frenzy",
        get label() { return t('terrainEffect.terrain.frenzy.label'); },
        get description() { return t('terrainEffect.terrain.frenzy.description'); }
      },
      {
        "key": "terrain.abundant",
        get label() { return t('terrainEffect.terrain.abundant.label'); },
        get description() { return t('terrainEffect.terrain.abundant.description'); }
      },
      {
        "key": "terrain.looping-path",
        get label() { return t('terrainEffect.terrain.looping-path.label'); },
        get description() { return t('terrainEffect.terrain.looping-path.description'); }
      },
      {
        "key": "terrain.ash-haze",
        get label() { return t('terrainEffect.terrain.ash-haze.label'); },
        get description() { return t('terrainEffect.terrain.ash-haze.description'); }
      },
      {
        "key": "terrain.enemy-high-ground",
        get label() { return t('terrainEffect.terrain.enemy-high-ground.label'); },
        get description() { return t('terrainEffect.terrain.enemy-high-ground.description'); }
      },
      {
        "key": "terrain.heatwave",
        get label() { return t('terrainEffect.terrain.heatwave.label'); },
        get description() { return t('terrainEffect.terrain.heatwave.description'); }
      },
      {
        "key": "terrain.fortified",
        get label() { return t('terrainEffect.terrain.fortified.label'); },
        get description() { return t('terrainEffect.terrain.fortified.description'); }
      },
      {
        "key": "terrain.burrow",
        get label() { return t('terrainEffect.terrain.burrow.label'); },
        get description() { return t('terrainEffect.terrain.burrow.description'); }
      },
      {
        "key": "terrain.leakage",
        get label() { return t('terrainEffect.terrain.leakage.label'); },
        get description() { return t('terrainEffect.terrain.leakage.description'); }
      },
      {
        "key": "terrain.deletion",
        get label() { return t('terrainEffect.terrain.deletion.label'); },
        get description() { return t('terrainEffect.terrain.deletion.description'); }
      },
      {
        "key": "terrain.machine-logic",
        get label() { return t('terrainEffect.terrain.machine-logic.label'); },
        get description() { return t('terrainEffect.terrain.machine-logic.description'); }
      },
      {
        "key": "terrain.spell-domain",
        get label() { return t('terrainEffect.terrain.spell-domain.label'); },
        get description() { return t('terrainEffect.terrain.spell-domain.description'); }
      },
      {
        "key": "terrain.cap-domain",
        get label() { return t('terrainEffect.terrain.cap-domain.label'); },
        get description() { return t('terrainEffect.terrain.cap-domain.description'); }
      },
      {
        "key": "terrain.echo-domain",
        get label() { return t('terrainEffect.terrain.echo-domain.label'); },
        get description() { return t('terrainEffect.terrain.echo-domain.description'); }
      },
      {
        "key": "terrain.decay",
        get label() { return t('terrainEffect.terrain.decay.label'); },
        get description() { return t('terrainEffect.terrain.decay.description'); }
      },
      {
        "key": "terrain.chain-lightning",
        get label() { return t('terrainEffect.terrain.chain-lightning.label'); },
        get description() { return t('terrainEffect.terrain.chain-lightning.description'); }
      },
      {
        "key": "terrain.light-field",
        get label() { return t('terrainEffect.terrain.light-field.label'); },
        get description() { return t('terrainEffect.terrain.light-field.description'); }
      },
      {
        "key": "terrain.dark-field",
        get label() { return t('terrainEffect.terrain.dark-field.label'); },
        get description() { return t('terrainEffect.terrain.dark-field.description'); }
      },
      {
        "key": "terrain.low-gravity",
        get label() { return t('terrainEffect.terrain.low-gravity.label'); },
        get description() { return t('terrainEffect.terrain.low-gravity.description'); }
      },
      {
        "key": "terrain.gravity",
        get label() { return t('terrainEffect.terrain.gravity.label'); },
        get description() { return t('terrainEffect.terrain.gravity.description'); }
      },
      {
        "key": "terrain.mana-burn",
        get label() { return t('terrainEffect.terrain.mana-burn.label'); },
        get description() { return t('terrainEffect.terrain.mana-burn.description'); }
      },
      {
        "key": "terrain.transcendence",
        get label() { return t('terrainEffect.terrain.transcendence.label'); },
        get description() { return t('terrainEffect.terrain.transcendence.description'); }
      },
      {
        "key": "terrain.gehenna",
        get label() { return t('terrainEffect.terrain.gehenna.label'); },
        get description() { return t('terrainEffect.terrain.gehenna.description'); }
      },
      {
        "key": "terrain.sanctuary",
        get label() { return t('terrainEffect.terrain.sanctuary.label'); },
        get description() { return t('terrainEffect.terrain.sanctuary.description'); }
      },
      {
        "key": "terrain.sniper-domain",
        get label() { return t('terrainEffect.terrain.sniper-domain.label'); },
        get description() { return t('terrainEffect.terrain.sniper-domain.description'); }
      },
      {
        "key": "terrain.suppression",
        get label() { return t('terrainEffect.terrain.suppression.label'); },
        get description() { return t('terrainEffect.terrain.suppression.description'); }
      },
      {
        "key": "terrain.duelist-domain",
        get label() { return t('terrainEffect.terrain.duelist-domain.label'); },
        get description() { return t('terrainEffect.terrain.duelist-domain.description'); }
      }
    ]
  }
];

export const TERRAIN_EFFECT_GLOSSARY_SECTION = GLOSSARY_SECTIONS.find(
  (section) => section.heading === '1.1.10 t. terrain effects',
);

export function getTerrainEffectGlossaryEntry(key: string): GlossaryEntry | undefined {
  return TERRAIN_EFFECT_GLOSSARY_SECTION?.entries.find((entry) => entry.key === key);
}
