export const EXPERIMENTAL_API_COMMAND_TYPES = [
  'update_character_build',
  'reorder_character',
  'set_deity',
  'set_auto_equipment_mode',
  'run_auto_equipment',
  'toggle_equipment_lock',
  'set_jewel_priority_party',
  'set_expedition_destination',
  'set_expedition_depth',
  'set_expedition_difficulty',
  'set_auto_run',
  'god_battle',
] as const;

export type ExperimentalApiCommandType = typeof EXPERIMENTAL_API_COMMAND_TYPES[number];

export const EXPERIMENTAL_API_TRAINING_PATHS = [
  '/experimental/v1/build-options',
  '/experimental/v1/command',
  '/experimental/v1/sortie',
] as const;

export type ExperimentalApiTrainingPath = typeof EXPERIMENTAL_API_TRAINING_PATHS[number];

export type ExperimentalApiTrainingRequest = {
  method: 'POST';
  path: ExperimentalApiTrainingPath;
  body: Record<string, unknown>;
};

export type ExperimentalApiLegalAction = {
  type: string;
  partyId?: number | null;
  characterId?: number | null;
  constraints?: Record<string, unknown>;
};

export function isExperimentalApiCommandType(value: unknown): value is ExperimentalApiCommandType {
  return typeof value === 'string'
    && (EXPERIMENTAL_API_COMMAND_TYPES as readonly string[]).includes(value);
}

export function isExperimentalApiTrainingPath(value: unknown): value is ExperimentalApiTrainingPath {
  return typeof value === 'string'
    && (EXPERIMENTAL_API_TRAINING_PATHS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function validateExperimentalApiTrainingRequest(
  request: unknown,
  revision: number,
  legalActions: readonly ExperimentalApiLegalAction[],
): string[] {
  const errors: string[] = [];
  if (!isRecord(request)) return ['request must be an object'];
  if (request.method !== 'POST') errors.push('method must be POST');
  if (!isExperimentalApiTrainingPath(request.path)) errors.push('path is not trainable');
  if (!isRecord(request.body)) return [...errors, 'body must be an object'];

  const body = request.body;
  if (request.path === '/experimental/v1/build-options') {
    if (body.revision !== revision) errors.push('build-options revision must match the observation');
    if (!Number.isInteger(body.partyId) || !Number.isInteger(body.characterId)) {
      errors.push('build-options requires integer partyId and characterId');
    }
    return errors;
  }

  if (body.expectedRevision !== revision) errors.push('expectedRevision must match the observation');
  if (request.path === '/experimental/v1/sortie') {
    const legal = legalActions.some((action) => action.type === 'sortie' && action.partyId === body.partyId);
    if (!legal) errors.push('sortie is not listed in _legalActions for the party');
    if (!Number.isInteger(body.count) || Number(body.count) < 1 || Number(body.count) > 100) {
      errors.push('sortie count must be an integer from 1 through 100');
    }
    return errors;
  }

  if (!isRecord(body.command) || !isExperimentalApiCommandType(body.command.type)) {
    return [...errors, 'command discriminator is unsupported'];
  }
  const command = body.command;
  const legal = legalActions.some((action) => (
    action.type === command.type
    && (action.partyId == null || action.partyId === command.partyId)
    && (action.characterId == null || action.characterId === command.characterId)
  ));
  if (!legal) errors.push('command is not listed in _legalActions for the target');
  return errors;
}
