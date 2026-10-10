import { isDungeonEntryUnlocked, isGodsBattleAvailable } from '../../game/clearGate.ts';
import { getInstantExpeditionChargeState } from '../../game/instantExpedition.ts';
import { computePartyStats } from '../../game/partyComputation.ts';
import type { Party } from '../../types/index.ts';

// SpecRef: 8.3 | UI_EXPEDITION | "出撃" / "神魔戦" Buttons
// SpecRef: 9.1.3 | Commit | 3-2-2 {p}/sortie
// The one decision whether a sortie or a Gods Battle can start, shared by the Expedition projection (which publishes the
// reason) and the commit (which refuses with it), so a control the projection calls available is never refused for a reason
// the projection could have shown. Reasons are stable codes; the commit prefixes them with `illegal_action:`.

export type SortieUnavailableReason =
  | 'gods_battle_unavailable'
  | 'entry_gate_locked'
  | 'party_exhausted'
  | 'already_moving_to_gods_battle'
  | 'charge_insufficient';

export interface SortieAvailabilityInput {
  party: Party;
  godsBattle: boolean;
  /** The party HP the decision uses: the revealed HP while exploring in a projection, the current HP in the commit. */
  hp: number;
  maximumHp: number;
  chargeStock: number;
  /** The live cycle, when the ordinary player's runtime is the actor. */
  cycle?: { state: string; isCurrentExpeditionGodsBattle?: boolean };
}

export function getSortieUnavailableReason(input: SortieAvailabilityInput): SortieUnavailableReason | null {
  const { party, godsBattle, hp, maximumHp, chargeStock, cycle } = input;
  // The Colosseum needs no Clear-Gate, HP, or charge.
  const isColosseum = party.selectedDungeonId === 99;
  if (godsBattle && !isGodsBattleAvailable(party, party.selectedDungeonId)) return 'gods_battle_unavailable';
  if (!isColosseum && !isDungeonEntryUnlocked(party, party.selectedDungeonId)) return 'entry_gate_locked';
  if (!isColosseum && (hp <= 0 || maximumHp <= 0)) return 'party_exhausted';
  if (godsBattle && cycle?.state === 'move' && cycle.isCurrentExpeditionGodsBattle === true) return 'already_moving_to_gods_battle';
  if (!isColosseum && chargeStock <= 0) return 'charge_insufficient';
  return null;
}

export interface SortieControlFacts {
  currentHp: number;
  chargeStock: number;
  controls: { sortie: { available: boolean; unavailableReason: SortieUnavailableReason | null }; godsBattle: { available: boolean; unavailableReason: SortieUnavailableReason | null } };
}

// SpecRef: 9.1.3 | 3-2-2 {p}/sortie | `currentHp`, `chargeStock`, `controls` after the commit
/** What the next Sortie / Gods Battle would be refused for, from the party as a commit leaves it (no live cycle). */
export function getSortieControlFacts(party: Party, nowMs: number, chargeDurationScale: number): SortieControlFacts {
  const maximumHp = computePartyStats(party).partyStats.hp;
  const chargeStock = getInstantExpeditionChargeState(party, nowMs, chargeDurationScale).stock;
  const control = (godsBattle: boolean) => {
    const reason = getSortieUnavailableReason({ party, godsBattle, hp: party.currentHp, maximumHp, chargeStock });
    return { available: reason === null, unavailableReason: reason };
  };
  return { currentHp: Math.max(0, Math.floor(party.currentHp)), chargeStock, controls: { sortie: control(false), godsBattle: control(true) } };
}
