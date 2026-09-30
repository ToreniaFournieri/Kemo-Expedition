import type { GameState } from '../../types';
import { computePartyStats } from '../../game/partyComputation';
import { serializeGameState } from '../../game/saveCodec';
import { base64FromUtf8, encodePersistedState } from '../../game/storageCompression';
import { buildBattleLogData } from './battleLogs';
import type { ApiV1DeliveryAttachment, ApiV1DeliveryPayload } from './deliveries';

// SpecRef: 9.1.4.15 | External delivery and rewards | Content captured once, at admission
// Builds the exact network payload for `commit/progress/progressReport` and `commit/setting/feedback` from one
// immutable (state, parameters, uploadedFiles) snapshot at commit time. The sender (applicationApi.ts) only ever
// reads the stored result on every attempt — content is never re-derived from live state on retry.

export function buildProgressReportDeliveryPayload(state: GameState, now: number): ApiV1DeliveryPayload {
  const partyLines = state.parties.map((party, index) => {
    const { partyStats } = computePartyStats(party);
    return `PT${index + 1}: Lv${party.level} (${party.experience} XP), HP ${Math.max(0, Math.floor(partyStats.hp))}`;
  });
  const content = [
    '**Progress Report**',
    `**Timestamp:** ${new Date(now).toISOString()}`,
    `**User ID:** ${state.global.userId}`,
    `**Gold:** ${state.global.gold}`,
    ...partyLines,
  ].join('\n');
  return { content, username: 'KEMO EXPEDITION API', attachments: [] };
}

const ATTACHMENT_EXTENSION_BY_MEDIA_TYPE: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export function buildFeedbackDeliveryPayload(
  state: GameState,
  parameters: Record<string, unknown>,
  uploadedFiles: Record<string, Record<string, unknown>>,
  now: number,
): ApiV1DeliveryPayload {
  const name = typeof parameters.name === 'string' ? parameters.name : '';
  const category = typeof parameters.category === 'string' ? parameters.category : 'feedback';
  const text = typeof parameters.text === 'string' ? parameters.text : '';
  const latestBattleLogParty = parameters.latestBattleLogParty;
  const includeBackup = parameters.includeBackup === true;
  const attachmentNames = Array.isArray(parameters.attachments)
    ? parameters.attachments.filter((entry): entry is string => typeof entry === 'string')
    : [];

  const content = [
    '**Feedback**',
    `**Timestamp:** ${new Date(now).toISOString()}`,
    `**User ID:** ${state.global.userId}`,
    `**Name:** ${name || '-'}`,
    `**Category:** ${category}`,
    `**Feedback text:** ${text}`,
  ].join('\n');

  const attachments: ApiV1DeliveryAttachment[] = [];
  attachmentNames.forEach((partName, index) => {
    const file = uploadedFiles[partName];
    const contentBase64 = typeof file?.contentBase64 === 'string' ? file.contentBase64 : null;
    if (!contentBase64) return;
    const mediaType = typeof file?.mediaType === 'string' ? file.mediaType : 'application/octet-stream';
    const extension = ATTACHMENT_EXTENSION_BY_MEDIA_TYPE[mediaType] ?? 'bin';
    attachments.push({ name: `attachment${index}.${extension}`, mediaType, contentBase64 });
  });

  if (includeBackup) {
    const backupText = encodePersistedState(JSON.stringify(serializeGameState(state)));
    attachments.push({ name: 'backup.bokemo', mediaType: 'application/octet-stream', contentBase64: base64FromUtf8(backupText) });
  }

  if (latestBattleLogParty !== 'none') {
    const partyNumber = typeof latestBattleLogParty === 'number' ? latestBattleLogParty : 1;
    const log = state.parties[partyNumber - 1]?.lastExpeditionLog ?? null;
    if (log) {
      const battleLogText = JSON.stringify(buildBattleLogData(log, partyNumber, 'feedback'), null, 2);
      attachments.push({ name: `latestBattleLog-PT${partyNumber}.json`, mediaType: 'application/json', contentBase64: base64FromUtf8(battleLogText) });
    }
  }

  return { content, username: 'KEMO EXPEDITION API FEEDBACK', attachments };
}
