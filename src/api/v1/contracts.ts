import { Type, type Static, type TSchema } from '@sinclair/typebox';
import { API_V1_OPERATIONS, type ApiV1OperationId } from './generatedOperationCatalog';

// SpecRef: 9.1.4.1 | Conformance and versioning | Shared wire metadata
export const API_V1_VERSION = 'v1' as const;
export const API_V1_SCHEMA_VERSION = 1 as const;

export const EmptyParametersSchema = Type.Object({}, { additionalProperties: false });
export const ExpectedRevisionSchema = Type.Integer({ minimum: 0 });
export const IdempotencyKeySchema = Type.String({ minLength: 16, maxLength: 128, pattern: '^[\\x20-\\x7e]+$' });
export const RequestIdSchema = Type.String({ minLength: 1, maxLength: 200 });
export const IsoTimestampSchema = Type.String({ format: 'date-time' });
export const PartyNumberSchema = Type.Integer({ minimum: 1, maximum: 6 });
export const StableIntegerIdSchema = Type.Integer({ minimum: 1 });

export const SemanticTextSchema = Type.Object({
  key: Type.String({ minLength: 1 }),
  args: Type.Record(Type.String(), Type.Union([Type.String(), Type.Number(), Type.Boolean()])),
}, { additionalProperties: false });

export const AvailabilitySchema = Type.Object({
  available: Type.Boolean(),
  unavailableReason: Type.Union([Type.String(), Type.Null()]),
}, { additionalProperties: false });

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
