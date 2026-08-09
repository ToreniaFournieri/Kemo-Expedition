const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bokemoDesktop', {
  getStatus: () => ipcRenderer.invoke('desktop:get-status'),
  getWindowVisibility: () => ipcRenderer.invoke('desktop:get-window-visibility'),
  getLaunchAtLogin: () => ipcRenderer.invoke('desktop:get-launch-at-login'),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke('desktop:set-launch-at-login', enabled === true),
  showNotification: (payload) => ipcRenderer.invoke('desktop:show-notification', payload),
  onNotificationActivated: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('desktop:notification-activated', listener);
    return () => ipcRenderer.removeListener('desktop:notification-activated', listener);
  },
});
