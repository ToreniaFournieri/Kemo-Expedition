const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bokemoDesktop', {
  aiPlay: (() => { const arg = process.argv.find(value => value.startsWith('--bokemo-ai-play=')); return arg ? JSON.parse(arg.slice('--bokemo-ai-play='.length)) : null; })(),
  getStatus: () => ipcRenderer.invoke('desktop:get-status'),
  getWindowVisibility: () => ipcRenderer.invoke('desktop:get-window-visibility'),
  getMemoryMetrics: () => ipcRenderer.invoke('desktop:get-memory-metrics'),
  getLaunchAtLogin: () => ipcRenderer.invoke('desktop:get-launch-at-login'),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke('desktop:set-launch-at-login', enabled === true),
  showNotification: (payload) => ipcRenderer.invoke('desktop:show-notification', payload),
  updatePartyProgressPane: (snapshot) => ipcRenderer.invoke('desktop:update-party-progress-pane', snapshot),
  getExperimentalApiSettings: () => ipcRenderer.invoke('desktop:get-experimental-api-settings'),
  setExperimentalApiEnabled: (enabled) => ipcRenderer.invoke('desktop:set-experimental-api-enabled', enabled === true),
  onExperimentalApiRequest: (callback) => {
    const listener = (_event, request) => {
      Promise.resolve(callback(request.operation, request.payload))
        .then((result) => ipcRenderer.send('desktop:experimental-api-response', { requestId: request.requestId, result }))
        .catch(() => ipcRenderer.send('desktop:experimental-api-response', {
          requestId: request.requestId,
          result: { status: 500, error: { code: 'renderer_operation_failed', message: 'The renderer operation failed.', retryable: true } },
        }));
    };
    ipcRenderer.on('desktop:experimental-api-request', listener);
    ipcRenderer.send('desktop:experimental-api-ready');
    return () => ipcRenderer.removeListener('desktop:experimental-api-request', listener);
  },
  onNotificationActivated: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('desktop:notification-activated', listener);
    return () => ipcRenderer.removeListener('desktop:notification-activated', listener);
  },
  onPartyProgressPartyActivated: (callback) => {
    const listener = (_event, partyId) => callback(partyId);
    ipcRenderer.on('desktop:party-progress-party-activated', listener);
    return () => ipcRenderer.removeListener('desktop:party-progress-party-activated', listener);
  },
});
