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

/** `details` for an `invalid_request` failure: the rejected `field` (and `rule`) when the validator named one. */
export function describeInvalidRequest(error: unknown): ApiV1InvalidRequestDetails {
  // The bare thrown message (`invalid_request:targetItems`), not the stringified `Error: …` wrapper.
  const reason = error instanceof Error ? error.message : String(error);
  const token = tokenOf(error);
  if (!token) return { reason };
  const legacy = LEGACY_TOKEN_FIELDS[token];
  if (legacy) return { ...legacy, reason };
  const [field, ...rule] = token.split('.');
  if (!/^[a-z][A-Za-z0-9[\]]*$/.test(field)) return { rule: token, reason };
  return { field, ...(rule.length > 0 ? { rule: rule.join('.') } : {}), reason };
}

/** A human-readable message; clients must still branch on `code` and `details`, never on this text. */
export function invalidRequestMessage(details: ApiV1InvalidRequestDetails, fallback: string): string {
  if (!details.field) return fallback;
  return `${fallback.replace(/\.$/, '')}: \`${details.field}\` is invalid${details.rule ? ` (${details.rule})` : ''}.`;
}
