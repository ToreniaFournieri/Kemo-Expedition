import { Type, type Static, type TSchema } from '@sinclair/typebox';
import { API_V1_OPERATIONS, type ApiV1OperationId } from './generatedOperationCatalog';

// SpecRef: 9.1.4.1 | Conformance and versioning | Shared wire metadata
export const API_V1_VERSION = 'v1' as const;
export const API_V1_SCHEMA_VERSION = 1 as const;

export const EmptyParametersSchema = Type.Object({}, { additionalProperties: false });
export const ExpectedRevisionSchema = Type.Integer({ minimum: 0 });
export const IdempotencyKeySchema = Type.String({ minLength: 16, maxLength: 128, pattern: '^[\\x20-\\x7e]+$' });
export const RequestIdSchema = Type.String({ minLength: 1, maxLength: 200 });
// ajv-formats is not a project dependency, so ISO instants are validated by pattern rather than the `format`
// keyword (matching the equivalent schema in scripts/generate-api-v1-contract.mjs); ajv's strict mode otherwise
// rejects an unrecognized `format` keyword outright.
export const IsoTimestampSchema = Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$' });
export const PartyNumberSchema = Type.Integer({ minimum: 1, maximum: 6 });
export const StableIntegerIdSchema = Type.Integer({ minimum: 1 });

export const SemanticTextSchema = Type.Object({
  key: Type.String({ minLength: 1, maxLength: 200 }),
  args: Type.Record(Type.String(), Type.Union([Type.String(), Type.Number(), Type.Boolean()])),
}, { additionalProperties: false });

export const AvailabilitySchema = Type.Object({
  available: Type.Boolean(),
  unavailableReason: Type.Union([Type.String(), Type.Null()]),
}, { additionalProperties: false });

// SpecRef: 9.1.4.14 | Parameter and payload schema conventions | Concrete payload schema definitions
// These mirror the normative TypeScript block in 9.1.4.14 verbatim. They are kept in sync by hand with the
// equivalent plain-JS schema builders in scripts/generate-api-v1-contract.mjs (a separate build-time artifact
// that cannot import this module); update both together when either changes.
export const NumericFactSchema = Type.Object({
  key: Type.String({ minLength: 1, maxLength: 200 }),
  value: Type.Number(),
  unit: Type.Union([Type.Literal('number'), Type.Literal('ratio'), Type.Literal('seconds')]),
}, { additionalProperties: false });

export const AbilityFactSchema = Type.Object({
  abilityId: Type.String({ minLength: 1, maxLength: 200 }),
  level: Type.Integer({ minimum: 1, maximum: 10 }),
}, { additionalProperties: false });

export const BonusFactSchema = Type.Object({
  bonusId: Type.String({ minLength: 1, maxLength: 200 }),
  value: Type.Number(),
}, { additionalProperties: false });

export const AttackFactSchema = Type.Object({
  attackType: Type.Union([Type.Literal('melee'), Type.Literal('ranged'), Type.Literal('magical')]),
  available: Type.Boolean(),
  facts: Type.Array(NumericFactSchema),
  speed: Type.Union([
    Type.Null(),
    Type.Object({ min: Type.Integer(), max: Type.Integer(), diceCount: Type.Integer(), dieSize: Type.Integer() }, { additionalProperties: false }),
  ]),
}, { additionalProperties: false });

export const CalculatedStatusSchema = Type.Object({
  stats: Type.Array(NumericFactSchema),
  abilities: Type.Array(AbilityFactSchema),
  bonuses: Type.Array(BonusFactSchema),
  attacks: Type.Array(AttackFactSchema),
}, { additionalProperties: false });

export const EquipmentEntryFormatSchema = Type.String({
  pattern: '^(?:0|[0-9]+/[01]/[1-9][0-9]*/[0-6]/(?:[0-9]|[1-7][0-9]|80)(?:/(?:might|arcana|fort|ward|shade|focus):[1-8])?)$',
});

export const EquipmentSetSchema = Type.Object({
  equipmentSetId: StableIntegerIdSchema,
  name: Type.String({ minLength: 1 }),
  createdAt: IsoTimestampSchema,
  equipment: Type.Optional(Type.Array(EquipmentEntryFormatSchema)),
}, { additionalProperties: false });

export const DiaryContentSchema = Type.Union([
  Type.Object({ format: Type.Literal('semantic'), title: SemanticTextSchema, subtitle: SemanticTextSchema, events: Type.Array(SemanticTextSchema) }, { additionalProperties: false }),
  Type.Object({ format: Type.Literal('legacy'), title: Type.String(), subtitle: Type.String(), text: Type.String() }, { additionalProperties: false }),
]);

export const BattleLogReferenceSchema = Type.Union([
  Type.Null(),
  Type.Object({ logId: Type.String({ minLength: 1, maxLength: 200 }), availability: AvailabilitySchema }, { additionalProperties: false }),
]);

export const DiaryEntrySchema = Type.Object({
  diaryEntryId: StableIntegerIdSchema,
  partyNumber: PartyNumberSchema,
  occurredAt: IsoTimestampSchema,
  unread: Type.Boolean(),
  content: DiaryContentSchema,
  battleLog: BattleLogReferenceSchema,
}, { additionalProperties: false });

export type NumericFact = Static<typeof NumericFactSchema>;
export type AbilityFact = Static<typeof AbilityFactSchema>;
export type BonusFact = Static<typeof BonusFactSchema>;
export type AttackFact = Static<typeof AttackFactSchema>;
export type CalculatedStatus = Static<typeof CalculatedStatusSchema>;
export type EquipmentSet = Static<typeof EquipmentSetSchema>;
export type DiaryContent = Static<typeof DiaryContentSchema>;
export type DiaryEntry = Static<typeof DiaryEntrySchema>;

export const ApiErrorSchema = Type.Object({
  code: Type.String({ minLength: 1 }),
  message: Type.String(),
  details: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
}, { additionalProperties: false });

export const ApiErrorEnvelopeSchema = Type.Object({
  apiVersion: Type.Literal(API_V1_VERSION),
  schemaVersion: Type.Literal(API_V1_SCHEMA_VERSION),
  requestId: RequestIdSchema,
  revision: Type.Optional(Type.Integer({ minimum: 0 })),
  error: ApiErrorSchema,
}, { additionalProperties: false });

export const CommitTransportEnvelopeSchema = Type.Object({
  expectedRevision: ExpectedRevisionSchema,
  idempotencyKey: IdempotencyKeySchema,
  parameters: Type.Unknown(),
  confirmationToken: Type.Optional(Type.String({ minLength: 1, maxLength: 512 })),
}, { additionalProperties: false });

export type ApiErrorEnvelope = Static<typeof ApiErrorEnvelopeSchema>;
export type CommitTransportEnvelope = Static<typeof CommitTransportEnvelopeSchema>;

export interface ApiV1OperationContract<TRequest extends TSchema = TSchema, TResponse extends TSchema = TSchema> {
  readonly operationId: ApiV1OperationId;
  readonly request: TRequest;
  readonly response: TResponse;
}

export const API_V1_OPERATION_BY_ID = new Map<ApiV1OperationId, typeof API_V1_OPERATIONS[number]>(
  API_V1_OPERATIONS.map((operation) => [operation.operationId, operation]),
);

export const API_V1_OPERATION_BY_ROUTE = new Map(
  API_V1_OPERATIONS.map((operation) => [`${operation.method} ${operation.path}`, operation]),
);

export function createReadEnvelopeSchema<T extends TSchema>(data: T) {
  return Type.Object({
    apiVersion: Type.Literal(API_V1_VERSION),
    schemaVersion: Type.Literal(API_V1_SCHEMA_VERSION),
    requestId: RequestIdSchema,
    revision: Type.Optional(Type.Integer({ minimum: 0 })),
    observedAt: IsoTimestampSchema,
    data,
  }, { additionalProperties: false });
}

export function createCommitEnvelopeSchema<T extends TSchema>(data: T) {
  return Type.Object({
    apiVersion: Type.Literal(API_V1_VERSION),
    schemaVersion: Type.Literal(API_V1_SCHEMA_VERSION),
    requestId: RequestIdSchema,
    previousRevision: Type.Integer({ minimum: 0 }),
    revision: Type.Integer({ minimum: 0 }),
    committedAt: IsoTimestampSchema,
    data,
    effects: Type.Array(Type.Object({
      key: Type.String({ minLength: 1 }),
      args: Type.Record(Type.String(), Type.Union([Type.String(), Type.Number(), Type.Boolean()])),
    }, { additionalProperties: false })),
    changedResources: Type.Array(Type.String({ minLength: 1 })),
  }, { additionalProperties: false });
}
