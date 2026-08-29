function finiteBytesFromKiB(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  const bytes = value * 1024;
  return Number.isFinite(bytes) ? bytes : null;
}

function normalizeAppMemoryMetrics(metrics, rendererPid) {
  const processBreakdown = Array.isArray(metrics)
    ? metrics.map((metric) => ({
      pid: Number.isInteger(metric?.pid) && metric.pid >= 0 ? metric.pid : null,
      type: typeof metric?.type === 'string' ? metric.type : 'Unknown',
      name: typeof metric?.name === 'string' && metric.name.length > 0 ? metric.name : null,
      serviceName: typeof metric?.serviceName === 'string' && metric.serviceName.length > 0 ? metric.serviceName : null,
      workingSetBytes: finiteBytesFromKiB(metric?.memory?.workingSetSize),
    }))
    : [];
  const aggregateWorkingSetBytes = processBreakdown.length > 0
    && processBreakdown.every((metric) => metric.workingSetBytes !== null)
    ? processBreakdown.reduce((sum, metric) => sum + metric.workingSetBytes, 0)
    : null;
  const renderer = processBreakdown.find((metric) => metric.pid === rendererPid);
  return {
    applicationWorkingSetBytes: Number.isFinite(aggregateWorkingSetBytes) ? aggregateWorkingSetBytes : null,
    rendererWorkingSetBytes: renderer?.workingSetBytes ?? null,
    processBreakdown,
  };
}

module.exports = { normalizeAppMemoryMetrics };
