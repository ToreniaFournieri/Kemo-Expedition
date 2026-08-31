export interface VersionedState<State> {
  readonly version: number;
  readonly state: State;
  readonly installedAt: number;
}

export interface AuthorityReceipt<State> extends VersionedState<State> {
  readonly previousVersion: number;
  readonly changed: boolean;
}

/**
 * Owns synchronous authoritative state separately from its React presentation.
 * Only the current authoritative and presented roots are retained; immutable
 * structural sharing keeps this boundary bounded while presentation is deferred.
 */
export class GameStateAuthority<State, Action> {
  private authoritative: VersionedState<State>;
  private presented: VersionedState<State>;
  private readonly listeners = new Set<() => void>();
  private readonly reduce: (state: State, action: Action) => State;

  constructor(
    initialState: State,
    reduce: (state: State, action: Action) => State,
  ) {
    this.reduce = reduce;
    const initial = Object.freeze({ version: 0, state: initialState, installedAt: performance.now() });
    this.authoritative = initial;
    this.presented = initial;
  }

  readonly getAuthoritativeSnapshot = (): VersionedState<State> => this.authoritative;

  readonly getPresentedSnapshot = (): VersionedState<State> => this.presented;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  apply(action: Action): AuthorityReceipt<State> {
    const previous = this.authoritative;
    const state = this.reduce(previous.state, action);
    if (state === previous.state) {
      return Object.freeze({
        ...previous,
        previousVersion: previous.version,
        changed: false,
      });
    }
    const next = Object.freeze({
      version: previous.version + 1,
      state,
      installedAt: performance.now(),
    });
    this.authoritative = next;
    return Object.freeze({
      ...next,
      previousVersion: previous.version,
      changed: true,
    });
  }

  publishLatest(): boolean {
    const next = this.authoritative;
    if (next.version === this.presented.version) return false;
    this.presented = next;
    this.listeners.forEach((listener) => listener());
    return true;
  }
}
