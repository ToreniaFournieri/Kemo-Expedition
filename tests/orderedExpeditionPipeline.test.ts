import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createOrderedExpeditionPipeline } from '../src/game/events/orderedExpeditionPipeline.ts';

type Event = 'test:event' | 'test:empty';

interface State {
  readonly values: readonly string[];
}

interface Context {
  readonly suffix: string;
}

function handler<EventId extends string = 'test:event'>(
  id: string,
  priority: number,
  sourceOrder: number,
  event: EventId = 'test:event' as EventId,
) {
  return {
    id,
    event,
    priority,
    sourceOrder,
    apply(state: Readonly<State>, context: Readonly<Context>): State {
      return { values: [...state.values, `${id}${context.suffix}`] };
    },
  };
}

test('ordered expedition handlers use numeric priority then source order', () => {
  const pipeline = createOrderedExpeditionPipeline<Event, State, Context>([
    handler('test:third', 20, 0),
    handler('test:second', 10, 2),
    handler('test:first', 10, 1),
  ]);
  assert.deepEqual(pipeline.handlerIdsFor('test:event'), ['test:first', 'test:second', 'test:third']);
  assert.deepEqual(pipeline.run('test:event', { values: [] }, { suffix: '!' }).values, [
    'test:first!', 'test:second!', 'test:third!',
  ]);
});

test('handler order snapshots are frozen and an empty event preserves state identity', () => {
  const pipeline = createOrderedExpeditionPipeline<Event, State, Context>([handler('test:only', 10, 0)]);
  assert.equal(Object.isFrozen(pipeline.handlerIdsFor('test:event')), true);
  const initial = { values: ['unchanged'] };
  assert.equal(pipeline.run('test:empty', initial, { suffix: '' }), initial);
});

test('pipeline rejects duplicate handler ids', () => {
  assert.throws(
    () => createOrderedExpeditionPipeline([handler('test:duplicate', 10, 0), handler('test:duplicate', 20, 0)]),
    /Duplicate ordered expedition handler id: test:duplicate/,
  );
});

test('pipeline rejects ambiguous event order keys', () => {
  assert.throws(
    () => createOrderedExpeditionPipeline([handler('test:one', 10, 0), handler('test:two', 10, 0)]),
    /Duplicate ordered expedition handler order key: test:event:10:0/,
  );
});

test('pipeline rejects invalid or non-namespaced handler and event ids', () => {
  assert.throws(
    () => createOrderedExpeditionPipeline([handler('', 1, 0)]),
    /Invalid ordered expedition handler id: <empty>/,
  );
  assert.throws(
    () => createOrderedExpeditionPipeline([handler('not-namespaced', 1, 0)]),
    /Invalid ordered expedition handler id: not-namespaced/,
  );
  assert.throws(
    () => createOrderedExpeditionPipeline([handler('test:valid', 1, 0, 'not-namespaced')]),
    /Invalid ordered expedition event id: not-namespaced/,
  );
  assert.throws(
    () => createOrderedExpeditionPipeline([handler('test:valid', 1, 0, '')]),
    /Invalid ordered expedition event id: <empty>/,
  );
});

test('pipeline rejects negative, fractional, or unsafe order keys and invalid capacity', () => {
  assert.throws(
    () => createOrderedExpeditionPipeline([handler('test:fractional', 1.5, 0)]),
    /must use non-negative safe-integer priority and sourceOrder/,
  );
  assert.throws(
    () => createOrderedExpeditionPipeline([handler('test:negative', 1, -1)]),
    /must use non-negative safe-integer priority and sourceOrder/,
  );
  assert.throws(
    () => createOrderedExpeditionPipeline([handler('test:unsafe', Number.MAX_SAFE_INTEGER + 1, 0)]),
    /must use non-negative safe-integer priority and sourceOrder/,
  );
  assert.throws(
    () => createOrderedExpeditionPipeline([handler('test:one', 1, 0)], { maxHandlers: 0 }),
    /maxHandlers must be a positive integer/,
  );
  assert.throws(
    () => createOrderedExpeditionPipeline([handler('test:one', 1, 0)], { maxHandlers: 0.5 }),
    /maxHandlers must be a positive integer/,
  );
});

test('pipeline enforces its configured handler cap', () => {
  assert.throws(
    () => createOrderedExpeditionPipeline([handler('test:one', 1, 0), handler('test:two', 2, 0)], { maxHandlers: 1 }),
    /has 2 handlers; maximum is 1/,
  );
});

test('expedition handlers do not import native battle execution authorities', () => {
  const sources = [
    '../src/game/events/orderedExpeditionPipeline.ts',
    '../src/game/expeditionRunContext.ts',
    '../src/game/expeditionEffects/postBattleEffects.ts',
    '../src/game/expeditionEffects/auriferousEffect.ts',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));
  for (const source of sources) {
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/gu)].map((match) => match[1]);
    assert.equal(imports.some((path) => (
      path.includes('battleCandidate')
      || path.includes('battleKernel')
      || path.includes('/generated/')
      || path.includes('/native/')
    )), false);
  }
});
