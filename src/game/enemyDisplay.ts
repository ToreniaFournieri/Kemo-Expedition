import { getClassShortName } from '../data/classes';
import { t } from '../i18n';
import { EnemyClassId, EnemyDef } from '../types';

export const ENEMY_TYPE_SHORT_NAME_KEYS: Record<string, string> = {
  Beast: 'masterData.enemyType.Beast.short',
  Slime_Colony: 'masterData.enemyType.Slime_Colony.short',
  Plant_Fungal: 'masterData.enemyType.Plant_Fungal.short',
  Insect_Swarm: 'masterData.enemyType.Insect_Swarm.short',
  Aerial: 'masterData.enemyType.Aerial.short',
  Frost: 'masterData.enemyType.Frost.short',
  Fruit: 'masterData.enemyType.Fruit.short',
  Dragon: 'masterData.enemyType.Dragon.short',
  Voidspawn: 'masterData.enemyType.Voidspawn.short',
  Spirit: 'masterData.enemyType.Spirit.short',
  Ghost: 'masterData.enemyType.Ghost.short',
  Undead: 'masterData.enemyType.Undead.short',
  Golem: 'masterData.enemyType.Golem.short',
  Shadowfang: 'masterData.enemyType.Shadowfang.short',
  Mech: 'masterData.enemyType.Mech.short',
  Chiropteran: 'masterData.enemyType.Chiropteran.short',
  Chimera: 'masterData.enemyType.Chimera.short',
  Titan: 'masterData.enemyType.Titan.short',
  Pony: 'masterData.enemyType.Pony.short',
  Origami: 'masterData.enemyType.Origami.short',
  Jinma: 'masterData.enemyType.Jinma.short',
  Orcinian: 'masterData.enemyType.Orcinian.short',
  Kemono: 'masterData.enemyType.Kemono.short',
  Caninian: 'masterData.enemyType.Caninian.short',
  Lupinian: 'masterData.enemyType.Lupinian.short',
  Vulpinian: 'masterData.enemyType.Vulpinian.short',
  Ursan: 'masterData.enemyType.Ursan.short',
  Felidian: 'masterData.enemyType.Felidian.short',
  Mustelid: 'masterData.enemyType.Mustelid.short',
  Leporian: 'masterData.enemyType.Leporian.short',
  Cervin: 'masterData.enemyType.Cervin.short',
  Procyonian: 'masterData.enemyType.Procyonian.short',
  Murid: 'masterData.enemyType.Murid.short',
};

export function getEnemyTypeShortName(enemyType: string): string {
  return t(ENEMY_TYPE_SHORT_NAME_KEYS[enemyType] ?? enemyType);
}

function formatEnemyName(
  name: string,
  enemyType: string,
  classId: EnemyClassId,
  subClassId?: EnemyClassId | 'none',
): string {
  // SpecRef: 6.1.7 | Logs | p.enemy_name
  const enemyTypeLabel = ['Caninian', 'Lupinian', 'Vulpinian', 'Ursan', 'Felidian', 'Mustelid', 'Leporian', 'Cervin', 'Procyonian', 'Murid']
    .includes(enemyType)
    ? `icon.${enemyType}`
    : getEnemyTypeShortName(enemyType);
  const classLabel = getClassShortName(classId);
  const hasSubClass = !!subClassId && subClassId !== 'none';
  const subClassLabel = hasSubClass ? getClassShortName(subClassId) : '';
  const isMasterClass = hasSubClass && classId === subClassId;
  const classText = classLabel
    ? (isMasterClass ? `${classLabel}M` : (subClassLabel ? `${classLabel}/${subClassLabel}` : classLabel))
    : '';
  const labels = [enemyTypeLabel, classText].filter(Boolean);
  return labels.length > 0 ? `${name}(${labels.join(',')})` : name;
}

export function formatEnemyDefName(enemy: Pick<EnemyDef, 'name' | 'nameKey' | 'enemyType' | 'enemyClass' | 'enemySubClass'>): string {
  // SpecRef: 8.1 | UI_FOUNDATIONS | Localization lookup
  const localizedName = enemy.nameKey ? t(enemy.nameKey) : enemy.name;
  return formatEnemyName(localizedName, enemy.enemyType, enemy.enemyClass, enemy.enemySubClass);
}
