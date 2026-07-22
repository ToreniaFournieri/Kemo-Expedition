const { app, BrowserWindow, net, protocol, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const APP_HOST = 'bokemo';
const APP_ORIGIN = `app://${APP_HOST}`;
const DIST_ROOT = path.resolve(__dirname, '..', 'dist');

// SpecRef: 9.1 | Desktop distribution | stable application origin and profile
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function resolvePackagedFile(requestUrl) {
  const url = new URL(requestUrl);
  if (url.host !== APP_HOST) return null;

  const requestedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.resolve(DIST_ROOT, `.${requestedPath}`);
  const relativePath = path.relative(DIST_ROOT, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
  return filePath;
}

// SpecRef: 9.1 | Desktop distribution | Renderer code must not have access to Node.js APIs
function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: 'BoKemo',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) {
      event.preventDefault();
      if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url);
    }
  });

  void window.loadURL(`${APP_ORIGIN}/`);
}

app.whenReady().then(() => {
  // Serving the packaged Vite output through a standard, secure custom scheme gives
  // localStorage a stable origin while preserving relative assets and query strings.
  protocol.handle('app', (request) => {
    const filePath = resolvePackagedFile(request.url);
    return filePath
      ? net.fetch(pathToFileURL(filePath).toString())
      : new Response('Not found', { status: 404 });
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
