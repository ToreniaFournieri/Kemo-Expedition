import assert from 'node:assert/strict';
import test from 'node:test';
import { GameStateAuthority } from '../src/game/gameStateAuthority.ts';

type State = Readonly<{ value: number; label: string }>;
type Action =
  | Readonly<{ type: 'increment'; amount: number }>
  | Readonly<{ type: 'label'; label: string }>;

const reduce = (state: State, action: Action): State => {
  if (action.type === 'increment') {
    return action.amount === 0 ? state : { ...state, value: state.value + action.amount };
  }
  return action.label === state.label ? state : { ...state, label: action.label };
};

test('authoritative versions install synchronously while presentation remains coalesced', () => {
  const authority = new GameStateAuthority<State, Action>({ value: 0, label: 'initial' }, reduce);
  let publications = 0;
  authority.subscribe(() => { publications += 1; });

  const first = authority.apply({ type: 'increment', amount: 1 });
  const second = authority.apply({ type: 'increment', amount: 2 });

  assert.equal(first.version, 1);
  assert.equal(second.previousVersion, 1);
  assert.equal(second.version, 2);
  assert.equal(authority.getAuthoritativeSnapshot().state.value, 3);
  assert.equal(authority.getPresentedSnapshot().state.value, 0);
  assert.equal(publications, 0);

  assert.equal(authority.publishLatest(), true);
  assert.equal(authority.getPresentedSnapshot().version, 2);
  assert.equal(authority.getPresentedSnapshot().state.value, 3);
  assert.equal(publications, 1);
  assert.equal(authority.publishLatest(), false);
  assert.equal(publications, 1);
});

test('no-op actions neither advance authority nor publish a duplicate version', () => {
  const authority = new GameStateAuthority<State, Action>({ value: 4, label: 'same' }, reduce);
  const receipt = authority.apply({ type: 'label', label: 'same' });

  assert.equal(receipt.changed, false);
  assert.equal(receipt.version, 0);
  assert.equal(receipt.previousVersion, 0);
  assert.equal(authority.publishLatest(), false);
});

test('an immediate mutation reduces against hidden authoritative progress', () => {
  const authority = new GameStateAuthority<State, Action>({ value: 0, label: 'old' }, reduce);
  authority.apply({ type: 'increment', amount: 5 });
  const uiReceipt = authority.apply({ type: 'label', label: 'user' });
  authority.publishLatest();

  assert.deepEqual(uiReceipt.state, { value: 5, label: 'user' });
  assert.deepEqual(authority.getPresentedSnapshot().state, { value: 5, label: 'user' });
});
