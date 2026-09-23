const { app } = require('electron');
const fs = require('node:fs');
app.setPath('userData', '/private/tmp/claude-501/-Users-Torenia-Documents-ChatGPT-BoKemo/6b5e7117-c110-475d-8fe6-6e3f7be27e0e/scratchpad/profile');
app.getVersion = () => require('../package.json').version;
let done = false;
app.on('browser-window-created', (_e, w) => {
  w.webContents.on('did-finish-load', async () => {
    if (done) return;
    const t = await w.webContents.executeJavaScript('typeof window.bokemoDesktop');
    if (t === 'undefined') return;
    done = true;
    const s = await w.webContents.executeJavaScript('window.bokemoDesktop.setApiV1Enabled(true)');
    fs.copyFileSync(s.connectionFile, '/private/tmp/claude-501/-Users-Torenia-Documents-ChatGPT-BoKemo/6b5e7117-c110-475d-8fe6-6e3f7be27e0e/scratchpad/conn.json');
    console.log('API_READY');
  });
});
require('../desktop/main.cjs');
