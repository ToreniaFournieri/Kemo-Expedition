const { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, net, protocol, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const APP_HOST = 'bokemo';
const APP_ORIGIN = `app://${APP_HOST}`;
const DIST_ROOT = path.resolve(__dirname, '..', 'dist');
const PRELOAD_PATH = path.resolve(__dirname, 'preload.cjs');
const APP_ICON_PATH = path.resolve(DIST_ROOT, 'app_icon.png');
const START_HIDDEN_ARG = '--hidden';
const DESKTOP_ENVIRONMENT_ARG_PREFIX = '--environment=';
const DESKTOP_ENVIRONMENTS = new Set(['dev', 'beta', 'prod']);
const desktopEnvironment = resolveDesktopEnvironment(process.argv);
const desktopEnvironmentPath = desktopEnvironment === 'prod' ? '/' : `/${desktopEnvironment}/`;
let mainWindow = null;
let tray = null;
let isQuitting = false;

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

function resolveDesktopEnvironment(argv) {
  const value = argv
    .find((argument) => argument.startsWith(DESKTOP_ENVIRONMENT_ARG_PREFIX))
    ?.slice(DESKTOP_ENVIRONMENT_ARG_PREFIX.length);
  return DESKTOP_ENVIRONMENTS.has(value) ? value : 'prod';
}

function stripEnvironmentPrefix(pathname) {
  for (const environment of ['dev', 'beta']) {
    const prefix = `/${environment}`;
    if (pathname === prefix || pathname === `${prefix}/`) return '/';
    if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  }
  return pathname;
}

function resolvePackagedFile(requestUrl) {
  const url = new URL(requestUrl);
  if (url.host !== APP_HOST) return null;

  const environmentAgnosticPath = stripEnvironmentPrefix(url.pathname);
  const requestedPath = decodeURIComponent(environmentAgnosticPath === '/' ? '/index.html' : environmentAgnosticPath);
  const filePath = path.resolve(DIST_ROOT, `.${requestedPath}`);
  const relativePath = path.relative(DIST_ROOT, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
  return filePath;
}

// SpecRef: 9.1 | Desktop distribution | Renderer code must not have access to Node.js APIs
function createWindow(options = {}) {
  const window = new BrowserWindow({
    show: options.show !== false,
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: 'BoKemo',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: PRELOAD_PATH,
      backgroundThrottling: false,
    },
  });

  mainWindow = window;

  window.on('close', (event) => {
    if (isQuitting || process.platform !== 'darwin') return;
    event.preventDefault();
    window.hide();
  });
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
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

  // SpecRef: 9 | Environment | Desktop launch environment
  void window.loadURL(`${APP_ORIGIN}${desktopEnvironmentPath}`);
  return window;
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }
  mainWindow?.show();
  mainWindow?.focus();
}

function createTray() {
  if (process.platform !== 'darwin' || tray) return;
  const icon = nativeImage.createFromPath(APP_ICON_PATH).resize({ width: 18, height: 18 });
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('BoKemo');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open BoKemo', click: showMainWindow },
    { type: 'separator' },
    {
      label: 'Quit BoKemo',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));
  tray.on('click', showMainWindow);
}

function normalizeNotificationPayload(value) {
  if (!value || typeof value !== 'object') return null;
  const kind = value.kind === 'diary' || value.kind === 'afkSummary' ? value.kind : null;
  if (!kind || typeof value.id !== 'string' || typeof value.title !== 'string' || typeof value.body !== 'string') return null;
  return {
    id: value.id.slice(0, 200),
    title: value.title.slice(0, 200),
    body: value.body.slice(0, 1000),
    kind,
    partyId: Number.isInteger(value.partyId) ? value.partyId : undefined,
    diaryLogId: typeof value.diaryLogId === 'string' ? value.diaryLogId.slice(0, 200) : undefined,
  };
}

ipcMain.handle('desktop:get-status', () => ({
  isMacDesktop: process.platform === 'darwin',
  notificationSupported: Notification.isSupported(),
}));
ipcMain.handle('desktop:get-window-visibility', () => Boolean(mainWindow?.isVisible()));
ipcMain.handle('desktop:get-launch-at-login', () => app.getLoginItemSettings().openAtLogin);
ipcMain.handle('desktop:set-launch-at-login', (_event, enabled) => {
  if (process.platform !== 'darwin') return false;
  app.setLoginItemSettings({
    openAtLogin: enabled === true,
    openAsHidden: enabled === true,
    args: enabled === true ? [START_HIDDEN_ARG] : [],
  });
  return app.getLoginItemSettings().openAtLogin;
});
ipcMain.handle('desktop:show-notification', (_event, rawPayload) => {
  if (process.platform !== 'darwin' || !Notification.isSupported()) return false;
  const payload = normalizeNotificationPayload(rawPayload);
  if (!payload) return false;
  // SpecRef: 9.1.1 | macOS background lifecycle and native notifications | BoKemo notification icon
  const notification = new Notification({
    title: payload.title,
    body: payload.body,
    icon: APP_ICON_PATH,
  });
  notification.on('failed', (_event, error) => {
    console.error('Failed to show native notification:', error);
  });
  notification.on('click', () => {
    showMainWindow();
    mainWindow?.webContents.send('desktop:notification-activated', payload);
  });
  notification.show();
  return true;
});

app.whenReady().then(() => {
  // Serving the packaged Vite output through a standard, secure custom scheme gives
  // localStorage a stable origin while preserving relative assets and query strings.
  protocol.handle('app', (request) => {
    const filePath = resolvePackagedFile(request.url);
    return filePath
      ? net.fetch(pathToFileURL(filePath).toString())
      : new Response('Not found', { status: 404 });
  });

  if (process.platform === 'darwin') {
    app.dock?.setIcon(APP_ICON_PATH);
  }

  createTray();
  const shouldStartHidden = process.argv.includes(START_HIDDEN_ARG) && process.platform === 'darwin';
  createWindow({ show: !shouldStartHidden });
  app.on('activate', () => {
    showMainWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
