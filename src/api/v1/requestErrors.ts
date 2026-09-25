// SpecRef: 9.1.4.11 | Errors | `details` uses stable member names; `details.field` names the rejected parameter.
//
// Validators throw `invalid_request:<token>`, where `<token>` is a parameter name (`lineupId`) optionally followed by a
// rule (`targetEquipment.duplicate`). A few older tokens predate that shape and are mapped to their parameter here.

const LEGACY_TOKEN_FIELDS: Record<string, { field: string; rule?: string }> = {
  item_format: { field: 'items', rule: 'format' },
  duplicate_items: { field: 'items', rule: 'duplicate' },
  duplicate_key: { field: 'changes', rule: 'duplicate' },
  duplicate_diaryEntryId: { field: 'diaryEntryId', rule: 'duplicate' },
  confirmation_required: { field: 'confirmation', rule: 'required' },
  confirmation_with_simulation: { field: 'confirmation', rule: 'with_simulation' },
  invalid_elapsed: { field: 'elapsedSeconds' },
  invalid_deity: { field: 'deityId' },
  invalid_order: { field: 'order' },
  invalid_items: { field: 'items' },
  invalid_backup: { field: 'backup' },
};

// Readable wording for the rules validators name; any other rule reads as "is invalid (<rule>)".
const RULE_PROBLEMS: Record<string, string> = {
  required: 'is required',
  duplicate: 'contains a duplicate entry',
  format: 'has an invalid format',
  too_many: 'has too many entries',
  single: 'must name exactly one item',
  single_item: 'can be used only with one item',
  unknown_member: 'is not a known member',
  with_simulation: 'cannot be combined with `simulation`',
  jewel: 'names a jewel that this item cannot hold',
  slot: 'names a slot outside this character\'s equipment slots',
};

export interface ApiV1InvalidRequestDetails {
  field?: string;
  rule?: string;
  reason: string;
}

function tokenOf(error: unknown): string | null {
  const text = error instanceof Error ? error.message : String(error);
  const prefixed = /\binvalid_request:([A-Za-z0-9_.[\]-]+)/.exec(text);
  if (prefixed) return prefixed[1];
  const legacy = /\b(invalid_[a-z]+)\b/.exec(text);
  return legacy && LEGACY_TOKEN_FIELDS[legacy[1]] ? legacy[1] : null;
}

function problemOf(rule: string | undefined): string {
  if (!rule) return 'is invalid';
  return RULE_PROBLEMS[rule] ?? `is invalid (${rule})`;
}

/** A readable sentence for `details.reason`, e.g. "`targetItems` is required." */
function reasonOf(field: string | undefined, rule: string | undefined, fallback: string): string {
  return field ? `\`${field}\` ${problemOf(rule)}.` : fallback;
}

/** `details` for an `invalid_request` failure: the rejected `field` (and `rule`) when the validator named one. */
export function describeInvalidRequest(error: unknown): ApiV1InvalidRequestDetails {
  const token = tokenOf(error);
  const unnamed = 'The request is invalid.';
  // An unrecognized failure keeps its own message for diagnosis, without the `Error: ` prefix of a stringified Error.
  if (!token) return { reason: (error instanceof Error ? error.message : String(error)) || unnamed };
  const legacy = LEGACY_TOKEN_FIELDS[token];
  if (legacy) return { ...legacy, reason: reasonOf(legacy.field, legacy.rule, unnamed) };
  const [field, ...ruleParts] = token.split('.');
  if (!/^[a-z][A-Za-z0-9[\]]*$/.test(field)) return { rule: token, reason: unnamed };
  const rule = ruleParts.length > 0 ? ruleParts.join('.') : undefined;
  return { field, ...(rule ? { rule } : {}), reason: reasonOf(field, rule, unnamed) };
}

/** A human-readable message; clients must still branch on `code` and `details`, never on this text. */
export function invalidRequestMessage(details: ApiV1InvalidRequestDetails, fallback: string): string {
  if (!details.field) return fallback;
  return `${fallback.replace(/\.$/, '')}: ${details.reason}`;
}
