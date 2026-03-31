import { CLASS_SHORT_NAMES } from '../data/classes';
import { EnemyDef } from '../types';

export const ENEMY_TYPE_SHORT_NAMES: Record<string, string> = {
  Beast: '猛',
  Slime_Colony: '粘',
  Plant_Fungal: '植',
  Insect_Swarm: '虫',
  Aerial: '飛',
  Frost: '雪',
  Marine: '海',
  Dragon: '竜',
  Spirit: '霊',
  Ghost: '怨',
  Undead: '屍',
  Golem: '造',
  Shadowfang: '影',
  Mech: '機',
  Chimera: '合',
  Titan: '巨',
  Jinma: '神',
  Kemono: 'ケ',
};

export function formatEnemyName(
  name: string,
  enemyType: string,
  classId: keyof typeof CLASS_SHORT_NAMES,
  subClassId?: keyof typeof CLASS_SHORT_NAMES | 'none',
): string {
  const classLabel = CLASS_SHORT_NAMES[classId];
  const subClassLabel = subClassId && subClassId !== 'none' ? CLASS_SHORT_NAMES[subClassId] : '';
  const classText = classLabel ? (subClassLabel ? `${classLabel}/${subClassLabel}` : classLabel) : '';
  const labels = [ENEMY_TYPE_SHORT_NAMES[enemyType], classText].filter(Boolean);
  return labels.length > 0 ? `${name}(${labels.join(',')})` : name;
}

export function formatEnemyDefName(enemy: Pick<EnemyDef, 'name' | 'enemyType' | 'enemyClass' | 'enemySubClass'>): string {
  return formatEnemyName(enemy.name, enemy.enemyType, enemy.enemyClass, enemy.enemySubClass);
}
