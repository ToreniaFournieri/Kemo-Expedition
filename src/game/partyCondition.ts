// SpecRef: 7.2 | AUTO progress logic | condition key table
// The one classification of a party's `condition` value into its key (Spec 7.2): the reducer's outcome adjustments, the
// UI label, and the API's compact `<conditionKey>/<conditionValue>` all use it.

export type PartyConditionState =
  | 'condition.terrible'
  | 'condition.poor'
  | 'condition.low'
  | 'condition.cautious'
  | 'condition.normal'
  | 'condition.steady'
  | 'condition.good'
  | 'condition.great'
  | 'condition.excellent';

export function getConditionState(condition: number): PartyConditionState {
  if (condition <= -350) return 'condition.terrible';
  if (condition <= -250) return 'condition.poor';
  if (condition <= -150) return 'condition.low';
  if (condition <= -50) return 'condition.cautious';
  if (condition <= 50) return 'condition.normal';
  if (condition <= 150) return 'condition.steady';
  if (condition <= 250) return 'condition.good';
  if (condition <= 350) return 'condition.great';
  return 'condition.excellent';
}
