import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CalculatedStatusSchema, DiaryEntrySchema, EquipmentEntryFormatSchema, EquipmentSetSchema } from '../../src/api/v1/contracts';

// SpecRef: 9.1.4.14 | Parameter and payload schema conventions | Concrete payload schema definitions
// contracts.ts and scripts/generate-api-v1-contract.mjs define the spec-normative shared shapes independently
// (the desktop JSON contract is produced by a plain-JS build script that cannot import TypeScript). This guards
// against silent drift between the two by comparing their serialized JSON Schema output.
function toJson(schema: unknown): unknown {
  return JSON.parse(JSON.stringify(schema));
}

const catalog = JSON.parse(readFileSync('desktop/api-v1-contract.json', 'utf8')) as {
  operations: Array<{ operationId: string; response: { data: { properties: Record<string, unknown> } } }>;
};
const byId = new Map(catalog.operations.map((operation) => [operation.operationId, operation]));

const diaryEntryOperation = byId.get('read/diary/diaryEntry/{diaryEntryId}');
assert.ok(diaryEntryOperation, 'read/diary/diaryEntry/{diaryEntryId} is missing from the generated catalog');
const generatedDiaryEntry = diaryEntryOperation!.response.data.properties.entry;
assert.deepEqual(toJson(DiaryEntrySchema), generatedDiaryEntry, 'DiaryEntrySchema drifted from the generated read/diary/diaryEntry/{diaryEntryId} response shape');

const equipmentSetOperation = byId.get('read/build/character/{characterId}/equipmentSet');
assert.ok(equipmentSetOperation, 'read/build/character/{characterId}/equipmentSet is missing from the generated catalog');
const equipmentSetsSchema = equipmentSetOperation!.response.data.properties.equipmentSets as { items: { properties: Record<string, unknown> } };
const generatedEquipmentSet = equipmentSetsSchema.items.properties.equipmentSet as { properties: Record<string, unknown> };
assert.deepEqual(toJson(EquipmentSetSchema), generatedEquipmentSet, 'EquipmentSetSchema drifted from the generated equipmentSet response shape');

const generatedEquipmentPattern = (generatedEquipmentSet.properties.equipment as { items: { pattern: string } }).items.pattern;
assert.equal(EquipmentEntryFormatSchema.pattern, generatedEquipmentPattern, 'EquipmentEntryFormatSchema pattern drifted from the generated equipment-entry pattern');

const characterStatusOperation = byId.get('read/build/character/{characterId}/status');
assert.ok(characterStatusOperation, 'read/build/character/{characterId}/status is missing from the generated catalog');
const generatedCalculatedStatus = characterStatusOperation!.response.data.properties.calculatedStatus;
assert.deepEqual(toJson(CalculatedStatusSchema), generatedCalculatedStatus, 'CalculatedStatusSchema drifted from the generated read/build/character/{characterId}/status response shape');

console.log('apiV1SharedContracts profile ok');
