import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homeSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');
const itemNameSource = readFileSync(new URL('../src/game/gameState.ts', import.meta.url), 'utf8');

test('FULL auto-equipment refreshes an item notification after assigning its Jewel', () => {
  assert.match(itemNameSource, /getItemDisplayName\(item: Item\)[\s\S]{0,300}jewelLabel\(item\.jewel\)/);

  const jewelAssignmentStart = homeSource.indexOf('assignments.forEach((assignment) => {', homeSource.indexOf('planAutoJewelAssignmentsForCharacter'));
  const jewelAssignmentEnd = homeSource.indexOf('summary.jewelAssignmentCount += 1;', jewelAssignmentStart);
  const jewelAssignment = homeSource.slice(jewelAssignmentStart, jewelAssignmentEnd);

  assert.match(jewelAssignment, /simulatedEquipmentSlots\[assignment\.slotIndex\] = \{[\s\S]*jewel: \{ key: assignment\.key, rank: assignment\.rank \}/);
  assert.match(jewelAssignment, /updateSlotNotificationItem\([\s\S]*simulatedEquipmentSlots\[assignment\.slotIndex\]!/);
  assert.ok(
    jewelAssignment.indexOf('updateSlotNotificationItem(') > jewelAssignment.indexOf('simulatedEquipmentSlots[assignment.slotIndex] = {'),
    'the notification must use the final, jewel-attached item snapshot',
  );
});
