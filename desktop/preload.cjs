const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bokemoDesktop', {
  getStatus: () => ipcRenderer.invoke('desktop:get-status'),
  getWindowVisibility: () => ipcRenderer.invoke('desktop:get-window-visibility'),
  getMemoryMetrics: () => ipcRenderer.invoke('desktop:get-memory-metrics'),
  getLaunchAtLogin: () => ipcRenderer.invoke('desktop:get-launch-at-login'),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke('desktop:set-launch-at-login', enabled === true),
  showNotification: (payload) => ipcRenderer.invoke('desktop:show-notification', payload),
  updatePartyProgressPane: (snapshot) => ipcRenderer.invoke('desktop:update-party-progress-pane', snapshot),
  getApiV1Settings: () => ipcRenderer.invoke('desktop:get-api-v1-settings'),
  setApiV1Enabled: (enabled) => ipcRenderer.invoke('desktop:set-api-v1-enabled', enabled === true),
  createApiAccount: (identity, savePayload) => ipcRenderer.invoke('desktop:api-account-create', identity, savePayload),
  loadApiAccount: (identity) => ipcRenderer.invoke('desktop:api-account-load', identity),
  commitApiAccount: (identity, savePayload, control) => ipcRenderer.invoke('desktop:api-account-commit', identity, savePayload, control),
  onApiV1Request: (callback) => {
    const listener = (_event, request) => {
      Promise.resolve(callback(request.operation, request.payload))
        .then((result) => ipcRenderer.send('desktop:api-v1-response', { requestId: request.requestId, result }))
        .catch(() => ipcRenderer.send('desktop:api-v1-response', {
          requestId: request.requestId,
          result: { status: 500, error: { code: 'internal_error', message: 'The Application API operation failed.' } },
        }));
    };
    ipcRenderer.on('desktop:api-v1-request', listener);
    ipcRenderer.send('desktop:api-v1-ready');
    return () => ipcRenderer.removeListener('desktop:api-v1-request', listener);
  },
  notifyApiV1PopupActivity: () => ipcRenderer.invoke('desktop:api-v1-popup-activity'),
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
