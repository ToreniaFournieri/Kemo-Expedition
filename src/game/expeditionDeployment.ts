export type ExpeditionDeployStatus = 'prod' | 'test' | 'no';
export type ExpeditionEnvironmentId = 'dev' | 'beta' | 'prod';

// SpecRef: 4.1.1 | Expedition Definitions | deploy status
export function isExpeditionDeployed(
  deployStatus: ExpeditionDeployStatus,
  environment: ExpeditionEnvironmentId,
): boolean {
  if (deployStatus === 'no') return false;
  if (deployStatus === 'test') return environment === 'dev';
  return true;
}

export function getDeployedExpeditions<T extends { deployStatus: ExpeditionDeployStatus }>(
  expeditions: readonly T[],
  environment: ExpeditionEnvironmentId,
): T[] {
  return expeditions.filter((expedition) => isExpeditionDeployed(expedition.deployStatus, environment));
}
