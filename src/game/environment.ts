export type EnvironmentId = 'dev' | 'qa' | 'default';

function getPathname(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
}

export function getEnvironmentId(): EnvironmentId {
  const pathname = getPathname();
  if (pathname.includes('/dev/')) return 'dev';
  if (pathname.includes('/qa/')) return 'qa';
  return 'default';
}

export function getEnvLabel(): string {
  const env = getEnvironmentId();
  if (env === 'dev') return '開発環境';
  if (env === 'qa') return 'αテスト';
  return '';
}

export function createEnvironmentStorageKey(baseKey: string): string {
  return `${baseKey}:${getEnvironmentId()}`;
}
