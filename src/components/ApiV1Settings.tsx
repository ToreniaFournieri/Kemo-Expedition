import { useEffect, useState } from 'react';
import { t } from '../i18n';

const OFFICIAL_GITHUB_URL = 'https://github.com/ToreniaFournieri/Kemo-Expedition/';

// SpecRef: 9.1.4.6 | HTTP authentication and exclusive control | explicit enablement
// SpecRef: 8.6 | UI_SETTING | API option: `Application API v1` (confirmed before enabling, persisted), `secretToken`
// (hidden by default, click to reveal, reset by disabling), `persistSecretToken` (default on).
// The token reaches the renderer only for an explicit reveal and is dropped when hidden or when this pane closes; it is
// never kept in renderer storage.

export function ApiV1Settings() {
  const desktop = window.bokemoDesktop;
  const [settings, setSettings] = useState<DesktopApiV1Settings | null>(null);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!desktop?.getApiV1Settings) return;
    void desktop.getApiV1Settings().then(setSettings);
  }, [desktop]);

  if (!desktop?.setApiV1Enabled || !settings?.supported) return null;

  const setEnabled = (enabled: boolean) => {
    if (enabled && !window.confirm(t('setting.apiV1.enableConfirm'))) return;
    setRevealedToken(null);
    void desktop.setApiV1Enabled(enabled).then(setSettings);
  };
  const setPersistSecretToken = (persist: boolean) => {
    void desktop.setApiV1PersistSecretToken(persist).then(setSettings);
  };
  const toggleReveal = () => {
    if (revealedToken) { setRevealedToken(null); return; }
    void desktop.revealApiV1SecretToken().then(setRevealedToken);
  };

  return (
    <div className="mt-3 rounded border border-status-warning-border bg-surface-card p-3 text-sm pane-button-shadow">
      <label className="flex items-center justify-between gap-3">
        <span className="font-medium">{t('setting.apiV1.title')}</span>
        <input type="checkbox" checked={settings.enabled} onChange={(event) => setEnabled(event.target.checked)} />
      </label>
      <p className="mt-2 text-xs text-gray-500">
        {t('setting.apiV1.helpBeforeLink')}
        <a href={OFFICIAL_GITHUB_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{OFFICIAL_GITHUB_URL}</a>
        {t('setting.apiV1.helpAfterLink')}
      </p>
      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
        <span>{t('setting.apiV1.persistSecretToken')}</span>
        <input type="checkbox" checked={settings.persistSecretToken} onChange={(event) => setPersistSecretToken(event.target.checked)} />
      </label>
      {settings.enabled && (
        <div className="mt-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">{t('setting.apiV1.secretToken')}</span>
            <button type="button" className="rounded border px-2 py-0.5" onClick={toggleReveal}>
              {revealedToken ? t('setting.apiV1.hideSecretToken') : t('setting.apiV1.revealSecretToken')}
            </button>
          </div>
          <input readOnly value={revealedToken ?? '••••••••••••••••'} className="mt-1 w-full rounded border bg-gray-50 px-2 py-1 font-mono" aria-label={t('setting.apiV1.secretToken')} />
          <p className="mt-1 text-gray-500">{t('setting.apiV1.secretTokenHelp')}</p>
        </div>
      )}
      {settings.enabled && settings.connectionFile && (
        <label className="mt-2 block text-xs">
          <span className="text-gray-500">{t('setting.apiV1.connectionFile')}</span>
          <input readOnly value={settings.connectionFile} className="mt-1 w-full rounded border bg-gray-50 px-2 py-1 font-mono" />
        </label>
      )}
    </div>
  );
}
