import { CLASS_SHORT_NAMES } from '../data/classes';
import { EnemyDef } from '../types';

export const ENEMY_TYPE_SHORT_NAMES: Record<string, string> = {
  Beast: '猛',
  Slime_Colony: '粘',
  Plant_Fungal: '植',
  Insect_Swarm: '虫',
  Aerial: '飛',
  Frost: '雪',
  Fruit: '果',
  Dragon: '竜',
  Voidspawn: '虚',
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
  Caninian: 'ケイナイアン',
  Lupinian: 'ルピニアン',
  Vulpinian: 'ヴァルピニアン',
  Ursan: 'ウルサン',
  Felidian: 'フェリディアン',
  Mustelid: 'マステリド',
  Leporian: 'レポリアン',
  Cervin: 'セルヴィン',
  Procyonian: 'プロキオニアン',
  Murid: 'ミュリッド',
};

function formatEnemyName(
  name: string,
  enemyType: string,
  classId: keyof typeof CLASS_SHORT_NAMES,
  subClassId?: keyof typeof CLASS_SHORT_NAMES | 'none',
): string {
  // SpecRef: 6.1.7 | Logs | p.enemy_name
  const enemyTypeLabel = ['Caninian', 'Lupinian', 'Vulpinian', 'Ursan', 'Felidian', 'Mustelid', 'Leporian', 'Cervin', 'Procyonian', 'Murid']
    .includes(enemyType)
    ? `icon.${enemyType}`
    : ENEMY_TYPE_SHORT_NAMES[enemyType];
  const classLabel = CLASS_SHORT_NAMES[classId];
  const hasSubClass = !!subClassId && subClassId !== 'none';
  const subClassLabel = hasSubClass ? CLASS_SHORT_NAMES[subClassId] : '';
  const isMasterClass = hasSubClass && classId === subClassId;
  const classText = classLabel
    ? (isMasterClass ? `${classLabel}M` : (subClassLabel ? `${classLabel}/${subClassLabel}` : classLabel))
    : '';
  const labels = [enemyTypeLabel, classText].filter(Boolean);
  return labels.length > 0 ? `${name}(${labels.join(',')})` : name;
}

export function formatEnemyDefName(enemy: Pick<EnemyDef, 'name' | 'enemyType' | 'enemyClass' | 'enemySubClass'>): string {
  return formatEnemyName(enemy.name, enemy.enemyType, enemy.enemyClass, enemy.enemySubClass);
}
