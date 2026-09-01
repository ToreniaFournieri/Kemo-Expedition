/**
 * Use this pipeline only when an expedition event has independently owned
 * handlers whose relative order is part of the deterministic rules. Prefer a
 * direct pure function for a single calculation, a tightly coupled sequence,
 * or any kernel-owned combat behavior.
 */
export interface OrderedExpeditionHandler<Event extends string, State, Context> {
  readonly id: string;
  readonly event: Event;
  readonly priority: number;
  readonly sourceOrder: number;
  readonly apply: (state: Readonly<State>, context: Readonly<Context>) => State;
}

export interface OrderedExpeditionPipeline<Event extends string, State, Context> {
  readonly run: (event: Event, initialState: State, context: Context) => State;
  readonly handlerIdsFor: (event: Event) => readonly string[];
}

export interface OrderedExpeditionPipelineOptions {
  readonly maxHandlers?: number;
}

const NAMESPACED_IDENTIFIER = /^[a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+)*:[a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+)*$/u;

function isNamespacedIdentifier(value: string): boolean {
  return NAMESPACED_IDENTIFIER.test(value);
}

export function createOrderedExpeditionPipeline<Event extends string, State, Context>(
  handlers: readonly OrderedExpeditionHandler<Event, State, Context>[],
  options: OrderedExpeditionPipelineOptions = {},
): OrderedExpeditionPipeline<Event, State, Context> {
  const maxHandlers = options.maxHandlers ?? 64;
  if (!Number.isSafeInteger(maxHandlers) || maxHandlers <= 0) {
    throw new Error("Ordered expedition pipeline maxHandlers must be a positive integer");
  }
  if (handlers.length > maxHandlers) {
    throw new Error(
      `Ordered expedition pipeline has ${handlers.length} handlers; maximum is ${maxHandlers}`,
    );
  }

  const ids = new Set<string>();
  const orderKeys = new Set<string>();
  const handlersByEvent = new Map<Event, OrderedExpeditionHandler<Event, State, Context>[]>();

  for (const handler of handlers) {
    if (!isNamespacedIdentifier(handler.id)) {
      throw new Error(`Invalid ordered expedition handler id: ${handler.id || '<empty>'}`);
    }
    if (!isNamespacedIdentifier(handler.event)) {
      throw new Error(`Invalid ordered expedition event id: ${handler.event || '<empty>'}`);
    }
    if (ids.has(handler.id)) {
      throw new Error(`Duplicate ordered expedition handler id: ${handler.id}`);
    }
    ids.add(handler.id);

    if (!Number.isSafeInteger(handler.priority)
      || handler.priority < 0
      || !Number.isSafeInteger(handler.sourceOrder)
      || handler.sourceOrder < 0) {
      throw new Error(
        `Ordered expedition handler ${handler.id} must use non-negative safe-integer priority and sourceOrder`,
      );
    }

    const orderKey = `${handler.event}:${handler.priority}:${handler.sourceOrder}`;
    if (orderKeys.has(orderKey)) {
      throw new Error(`Duplicate ordered expedition handler order key: ${orderKey}`);
    }
    orderKeys.add(orderKey);

    const eventHandlers = handlersByEvent.get(handler.event) ?? [];
    eventHandlers.push(Object.freeze({ ...handler }));
    handlersByEvent.set(handler.event, eventHandlers);
  }

  for (const eventHandlers of handlersByEvent.values()) {
    eventHandlers.sort(
      (left, right) =>
        left.priority - right.priority || left.sourceOrder - right.sourceOrder,
    );
    Object.freeze(eventHandlers);
  }

  return Object.freeze({
    run(event: Event, initialState: State, context: Context): State {
      let state = initialState;
      for (const handler of handlersByEvent.get(event) ?? []) {
        state = handler.apply(state, context);
      }
      return state;
    },
    handlerIdsFor(event: Event): readonly string[] {
      return Object.freeze((handlersByEvent.get(event) ?? []).map((handler) => handler.id));
    },
  });
}
