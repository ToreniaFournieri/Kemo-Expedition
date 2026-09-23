const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = process.env.BOKEMO_PLAY_USERDATA || fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-v1-play-'));
fs.mkdirSync(root, { recursive: true });
app.setPath('userData', root);
app.getVersion = () => require('../package.json').version;

const descriptorOutPath = process.env.BOKEMO_PLAY_DESCRIPTOR || path.join(root, 'play-session-descriptor.json');
let ready = false;

app.on('browser-window-created', (_event, window) => {
  if (ready) return;
  window.webContents.once('did-finish-load', async () => {
    if (ready) return;
    try {
      const bridgeType = await window.webContents.executeJavaScript('typeof window.bokemoDesktop');
      if (bridgeType === 'undefined') return;
      ready = true;
      const settings = await window.webContents.executeJavaScript('window.bokemoDesktop.setApiV1Enabled(true)');
      const descriptor = JSON.parse(fs.readFileSync(settings.connectionFile, 'utf8'));
      fs.writeFileSync(descriptorOutPath, JSON.stringify({ userData: root, connectionFile: settings.connectionFile, endpoint: descriptor.endpoint, token: descriptor.token }, null, 2));
      console.log('PLAY_SESSION_READY', descriptorOutPath);
    } catch (error) {
      console.error('PLAY_SESSION_FAILED', error.stack || error.message);
      app.exit(1);
    }
  });
});

require('../desktop/main.cjs');
