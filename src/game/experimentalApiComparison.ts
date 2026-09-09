import type { buildExperimentalObservation } from './experimentalApi';

type PublicParty = ReturnType<typeof buildExperimentalObservation>['parties'][number];
const changedFields = (before: object, after: object) => {
  const a = before as Record<string, unknown>, b = after as Record<string, unknown>;
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().flatMap(field => {
    const previous = a[field] ?? null, next = b[field] ?? null;
    return JSON.stringify(previous) === JSON.stringify(next) ? [] : [{ field, before: previous, after: next,
      ...(typeof previous === 'number' && typeof next === 'number' ? { delta: next - previous } : {}) }];
  });
};
// SpecRef: 9.1.3 | Experimental AI API | Candidate comparison
// Compare only public projections, without evaluating equipment, combat or randomness again.
export function compareApiParties(before: PublicParty, after: PublicParty) {
  return {
    partyId: after.id,
    maximumHp: { before: before.hp.maximum, after: after.hp.maximum, delta: after.hp.maximum - before.hp.maximum },
    strategyChanges: changedFields({ deityId: before.deityId, ...before.expedition }, { deityId: after.deityId, ...after.expedition }),
    characters: after.characters.map(c => {
      const old = before.characters.find(v => v.id === c.id)!;
      const slots = [...new Set([...old.equipment, ...c.equipment].map(v => v.slotIndex))].sort((a, b) => a - b);
      return { characterId: c.id, row: { before: old.row, after: c.row },
        autoEquipmentMode: { before: old.autoEquipmentMode, after: c.autoEquipmentMode },
        buildChanges: changedFields(old.build, c.build), combatChanges: changedFields(old.computed ?? {}, c.computed ?? {}),
        equipmentChanges: slots.flatMap(slotIndex => {
          const previous = old.equipment.find(v => v.slotIndex === slotIndex) ?? null;
          const next = c.equipment.find(v => v.slotIndex === slotIndex) ?? null;
          return JSON.stringify(previous) === JSON.stringify(next) ? [] : [{ slotIndex, before: previous, after: next }];
        }),
      };
    }),
  };
}
