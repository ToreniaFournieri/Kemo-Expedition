export type EnvironmentId = 'dev' | 'beta' | 'prod';

function getPathname(): string {
  if (typeof window !== 'undefined') return window.location.pathname;
  const workerLocation = (globalThis as { location?: { pathname?: unknown } }).location;
  return typeof workerLocation?.pathname === 'string' ? workerLocation.pathname : '';
}

// SpecRef: 9 | Environment | getEnvironmentId
export function getEnvironmentIdFromPathname(pathname: string): EnvironmentId {
  const normalizedPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (normalizedPath.includes('/dev/')) return 'dev';
  if (normalizedPath.includes('/beta/')) return 'beta';
  return 'prod';
}

export function getEnvironmentId(): EnvironmentId {
  return getEnvironmentIdFromPathname(getPathname());
}

// SpecRef: 9 | Environment | getEnvLabel
export function getEnvLabel(): string {
  const env = getEnvironmentId();
  if (env === 'dev') return 'D';
  if (env === 'beta') return 'β';
  return '';
}

// SpecRef: 9 | Environment | Debug mode
export function isDebugModeEnabled(): boolean {
  return getEnvironmentId() !== 'prod';
}

// SpecRef: 9 | Environment | createEnvironmentStorageKey
export function createEnvironmentStorageKey(baseKey: string): string {
  return `${baseKey}:${getEnvironmentId()}`;
}
