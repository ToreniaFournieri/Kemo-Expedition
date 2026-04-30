type EnvironmentId = 'dev' | 'beta' | 'default';

function getPathname(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
}

// SpecRef: 9 | Environment | getEnvironmentId
export function getEnvironmentId(): EnvironmentId {
  const pathname = getPathname();
  const normalizedPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (normalizedPath.includes('/dev/')) return 'dev';
  if (normalizedPath.includes('/beta/')) return 'beta';
  return 'default';
}

// SpecRef: 9 | Environment | getEnvLabel
export function getEnvLabel(): string {
  const env = getEnvironmentId();
  if (env === 'dev') return '開発環境';
  if (env === 'beta') return 'βテスト';
  return '';
}

// SpecRef: 9 | Environment | createEnvironmentStorageKey
export function createEnvironmentStorageKey(baseKey: string): string {
  return `${baseKey}:${getEnvironmentId()}`;
}
