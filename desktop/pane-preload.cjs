const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bokemoPartyProgress', {
  getSnapshot: () => ipcRenderer.invoke('desktop:get-party-progress-snapshot'),
  openMainWindow: () => ipcRenderer.invoke('desktop:open-main-window'),
  selectParty: (partyId) => ipcRenderer.invoke('desktop:select-party-from-pane', partyId),
  onSnapshot: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on('desktop:party-progress-snapshot', listener);
    return () => ipcRenderer.removeListener('desktop:party-progress-snapshot', listener);
  },
});
