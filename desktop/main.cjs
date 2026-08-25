const { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, net, protocol, screen, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createExperimentalApi } = require('./experimental-api.cjs');

const APP_HOST = 'bokemo';
const APP_ORIGIN = `app://${APP_HOST}`;
const DIST_ROOT = path.resolve(__dirname, '..', 'dist');
const PRELOAD_PATH = path.resolve(__dirname, 'preload.cjs');
const PANE_PRELOAD_PATH = path.resolve(__dirname, 'pane-preload.cjs');
const APP_ICON_PATH = path.resolve(DIST_ROOT, 'app_icon.png');
const START_HIDDEN_ARG = '--hidden';
const PARTY_PROGRESS_SCHEMA_VERSION = 1;
const DESKTOP_ENVIRONMENT_ARG_PREFIX = '--environment=';
const DESKTOP_ENVIRONMENTS = new Set(['dev', 'beta', 'prod']);
const desktopEnvironment = resolveDesktopEnvironment(process.argv);
const desktopEnvironmentPath = desktopEnvironment === 'prod' ? '/' : `/${desktopEnvironment}/`;
let mainWindow = null;
let partyProgressWindow = null;
let tray = null;
let isQuitting = false;
let isExperimentalApiShutdownComplete = false;
let experimentalApiShutdownPromise = null;
let latestPartyProgressSnapshot = null;
let experimentalApiRequestId = 0;
const experimentalApiPendingRequests = new Map();
const buildNumber = Number.parseInt(fs.readFileSync(path.resolve(__dirname, '..', 'build_number.txt'), 'utf8').trim(), 10);

function invokeExperimentalApiRenderer(operation, payload) {
  return new Promise((resolve, reject) => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoadingMainFrame()) {
      reject(new Error('Renderer unavailable'));
      return;
    }
    const requestId = ++experimentalApiRequestId;
    const timeout = setTimeout(() => {
      experimentalApiPendingRequests.delete(requestId);
      reject(new Error('Renderer request timed out'));
    }, operation === 'sortie' ? 120_000 : 15_000);
    experimentalApiPendingRequests.set(requestId, { resolve, reject, timeout });
    mainWindow.webContents.send('desktop:experimental-api-request', { requestId, operation, payload });
  });
}

const experimentalApi = createExperimentalApi({
  environment: desktopEnvironment,
  version: app.getVersion(),
  build: buildNumber,
  invokeRenderer: invokeExperimentalApiRenderer,
});

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

function ensureDockIconVisible() {
  if (process.platform !== 'darwin') return;
  // SpecRef: 9.1.1 | macOS background lifecycle | retain the BoKemo Dock icon
  // Keep BoKemo as a regular foreground app even though it also owns a menu-bar
  // pane. Explicitly showing the Dock tile also repairs accessory-only launch
  // state left behind by login-item or development launches.
  app.setActivationPolicy('regular');
  void app.dock?.show().then(() => {
    app.dock?.setIcon(APP_ICON_PATH);
  });
}

function showMainWindow() {
  ensureDockIconVisible();
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }
  mainWindow?.show();
  mainWindow?.focus();
}

function selectPartyInMainWindow(partyId) {
  showMainWindow();
  if (!mainWindow) return;
  if (mainWindow.webContents.isLoadingMainFrame()) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send('desktop:party-progress-party-activated', partyId);
    });
  } else {
    mainWindow.webContents.send('desktop:party-progress-party-activated', partyId);
  }
}

function positionPartyProgressWindow() {
  if (!tray || !partyProgressWindow) return;
  const trayBounds = tray.getBounds();
  const windowBounds = partyProgressWindow.getBounds();
  const workArea = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y }).workArea;
  const centeredX = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  const x = Math.max(workArea.x + 8, Math.min(centeredX, workArea.x + workArea.width - windowBounds.width - 8));
  const belowY = trayBounds.y + trayBounds.height + 6;
  const y = belowY + windowBounds.height <= workArea.y + workArea.height
    ? belowY
    : Math.max(workArea.y + 8, trayBounds.y - windowBounds.height - 6);
  partyProgressWindow.setPosition(x, y, false);
}

// SpecRef: 9.1.2 | macOS menu-bar Party Progress pane | secondary Electron BrowserWindow
function createPartyProgressWindow() {
  if (partyProgressWindow && !partyProgressWindow.isDestroyed()) return partyProgressWindow;
  const window = new BrowserWindow({
    show: false,
    width: 390,
    height: 520,
    frame: false,
    transparent: true,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: PANE_PRELOAD_PATH,
      backgroundThrottling: false,
    },
  });
  partyProgressWindow = window;
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.on('blur', () => window.hide());
  window.on('closed', () => {
    if (partyProgressWindow === window) partyProgressWindow = null;
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) event.preventDefault();
  });
  window.webContents.on('did-finish-load', () => {
    if (latestPartyProgressSnapshot) {
      window.webContents.send('desktop:party-progress-snapshot', latestPartyProgressSnapshot);
    }
  });
  void window.loadURL(`${APP_ORIGIN}${desktopEnvironmentPath}party-progress.html`);
  return window;
}

function togglePartyProgressWindow() {
  const window = createPartyProgressWindow();
  if (window.isVisible()) {
    window.hide();
    return;
  }
  positionPartyProgressWindow();
  window.show();
  window.focus();
}

function createTrayMenu() {
  const launchAtLogin = process.platform === 'darwin' && app.getLoginItemSettings().openAtLogin;
  return Menu.buildFromTemplate([
    { label: 'Open BoKemo', click: showMainWindow },
    {
      label: 'Launch at Login',
      type: 'checkbox',
      checked: launchAtLogin,
      click: (item) => {
        app.setLoginItemSettings({
          openAtLogin: item.checked,
          openAsHidden: item.checked,
          args: item.checked ? [START_HIDDEN_ARG] : [],
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Quit BoKemo',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function createTray() {
  if (process.platform !== 'darwin' || tray) return;
  const icon = nativeImage.createFromPath(APP_ICON_PATH).resize({ width: 18, height: 18 });
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('BoKemo');
  tray.on('click', togglePartyProgressWindow);
  tray.on('right-click', () => tray?.popUpContextMenu(createTrayMenu()));
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

function normalizePartyProgress(value) {
  if (!value || typeof value !== 'object') return { kind: 'none' };
  if (value.kind === 'continuous') {
    const startedAt = Number(value.startedAt);
    const endsAt = Number(value.endsAt);
    if (Number.isFinite(startedAt) && Number.isFinite(endsAt) && endsAt > startedAt) {
      return { kind: 'continuous', startedAt, endsAt };
    }
  }
  if (value.kind === 'steps') {
    const total = Math.max(1, Math.floor(Number(value.total)));
    const completed = Math.max(0, Math.min(total, Math.floor(Number(value.completed))));
    if (Number.isFinite(total) && Number.isFinite(completed)) return { kind: 'steps', completed, total };
  }
  return { kind: 'none' };
}

function normalizePartyProgressSnapshot(value) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== PARTY_PROGRESS_SCHEMA_VERSION) return null;
  if (value.environment !== desktopEnvironment || !['dev', 'beta', 'prod'].includes(value.environment)) return null;
  if (!['ja', 'en', 'zh-CN', 'zh-TW'].includes(value.language) || !Array.isArray(value.parties)) return null;
  const parties = value.parties.slice(0, 6).flatMap((party) => {
    if (!party || typeof party !== 'object' || !Number.isInteger(party.id)) return [];
    const maxHp = Math.max(1, Math.floor(Number(party.maxHp)));
    const currentHp = Math.max(0, Math.min(maxHp, Math.floor(Number(party.currentHp))));
    if (!Number.isFinite(maxHp) || !Number.isFinite(currentHp)) return [];
    const normalized = {
      id: party.id,
      name: String(party.name ?? '').slice(0, 80),
      state: String(party.state ?? 'idle').slice(0, 40),
      stateLabel: String(party.stateLabel ?? '').slice(0, 80),
      headlineFloorName: String(party.headlineFloorName ?? '').slice(0, 120),
      outcomeLabel: String(party.outcomeLabel ?? '').slice(0, 80),
      chargeCells: String(party.chargeCells ?? '').slice(0, 12),
      chargeTimerText: String(party.chargeTimerText ?? '').slice(0, 20),
      compactProgressItems: Array.isArray(party.compactProgressItems)
        ? party.compactProgressItems.slice(0, 3).flatMap((item) => {
            if (!item || typeof item !== 'object') return [];
            const ratio = item.progressRatio === null ? null : Number(item.progressRatio);
            return [{
              text: String(item.text ?? '').slice(0, 160),
              progressRatio: ratio === null || !Number.isFinite(ratio) ? null : Math.max(0, Math.min(1, ratio)),
            }];
          })
        : [],
      currentHp,
      maxHp,
      progress: normalizePartyProgress(party.progress),
      subProgress: normalizePartyProgress(party.subProgress),
    };
    return [normalized];
  });
  return {
    schemaVersion: PARTY_PROGRESS_SCHEMA_VERSION,
    environment: desktopEnvironment,
    language: value.language,
    updatedAt: Date.now(),
    unreadDiaryCount: Math.max(0, Math.floor(Number(value.unreadDiaryCount) || 0)),
    theme: ['dark', 'laika', 'laika-dark', 'luna', 'luna-dark'].includes(value.theme) ? value.theme : 'light',
    parties,
  };
}

ipcMain.handle('desktop:get-status', () => ({
  isMacDesktop: process.platform === 'darwin',
  notificationSupported: Notification.isSupported(),
}));
ipcMain.handle('desktop:get-window-visibility', () => Boolean(mainWindow?.isVisible()));
ipcMain.handle('desktop:get-process-memory-metrics', (event) => {
  const processId = event.sender.getOSProcessId();
  const metric = app.getAppMetrics().find((entry) => entry.pid === processId);
  const memory = metric?.memory;
  return {
    privateBytes: Number.isFinite(memory?.privateBytes) ? memory.privateBytes * 1024 : null,
    residentSetBytes: Number.isFinite(memory?.workingSetSize) ? memory.workingSetSize * 1024 : null,
  };
});
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
ipcMain.handle('desktop:update-party-progress-pane', (_event, rawSnapshot) => {
  if (process.platform !== 'darwin') return false;
  const snapshot = normalizePartyProgressSnapshot(rawSnapshot);
  if (!snapshot) return false;
  // SpecRef: 9.1.2 | macOS menu-bar Party Progress pane | isolated minimum display snapshot
  latestPartyProgressSnapshot = snapshot;
  if (partyProgressWindow && !partyProgressWindow.isDestroyed()) {
    partyProgressWindow.webContents.send('desktop:party-progress-snapshot', snapshot);
  }
  return true;
});
ipcMain.handle('desktop:get-party-progress-snapshot', () => latestPartyProgressSnapshot);
ipcMain.handle('desktop:open-main-window', () => {
  partyProgressWindow?.hide();
  showMainWindow();
  return true;
});
ipcMain.handle('desktop:select-party-from-pane', (_event, partyId) => {
  if (!Number.isInteger(partyId)) return false;
  partyProgressWindow?.hide();
  selectPartyInMainWindow(partyId);
  return true;
});
ipcMain.handle('desktop:get-experimental-api-settings', () => experimentalApi.getSettings());
ipcMain.handle('desktop:set-experimental-api-enabled', async (_event, enabled) => (
  enabled === true ? experimentalApi.enable() : experimentalApi.disable()
));
ipcMain.on('desktop:experimental-api-response', (_event, message) => {
  if (!message || !Number.isInteger(message.requestId)) return;
  const pending = experimentalApiPendingRequests.get(message.requestId);
  if (!pending) return;
  clearTimeout(pending.timeout);
  experimentalApiPendingRequests.delete(message.requestId);
  pending.resolve(message.result);
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

  ensureDockIconVisible();

  createTray();
  createPartyProgressWindow();
  const shouldStartHidden = process.argv.includes(START_HIDDEN_ARG) && process.platform === 'darwin';
  createWindow({ show: !shouldStartHidden });
  app.on('activate', () => {
    showMainWindow();
  });
});

app.on('before-quit', (event) => {
  isQuitting = true;
  if (isExperimentalApiShutdownComplete) return;
  event.preventDefault();
  if (!experimentalApiShutdownPromise) {
    experimentalApiShutdownPromise = experimentalApi.shutdown().finally(() => {
      isExperimentalApiShutdownComplete = true;
      app.quit();
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
