import { useEffect, useState } from 'react';
import { t } from '../i18n';

const OFFICIAL_GITHUB_URL = 'https://github.com/ToreniaFournieri/Kemo-Expedition/';

export function ExperimentalApiSettings() {
  const desktop = window.bokemoDesktop;
  const [settings, setSettings] = useState<DesktopExperimentalApiSettings | null>(null);
  const [copyLabel, setCopyLabel] = useState(false);

  useEffect(() => {
    if (!desktop?.getExperimentalApiSettings) return;
    void desktop.getExperimentalApiSettings().then(setSettings);
    const update = (event: Event) => setSettings((event as CustomEvent<DesktopExperimentalApiSettings>).detail);
    window.addEventListener('bokemo-experimental-api-settings', update);
    return () => window.removeEventListener('bokemo-experimental-api-settings', update);
  }, [desktop]);

  if (!desktop?.setExperimentalApiEnabled || !settings?.supported) return null;
  const endpoint = settings.enabled && settings.port ? `http://${settings.host}:${settings.port}/experimental/v1` : null;

  return (
    <div className="mt-3 rounded border border-status-warning-border bg-surface-card p-3 text-sm pane-button-shadow">
      <label className="flex items-center justify-between gap-3">
        <span className="font-medium">{t('setting.experimentalApi.title')}</span>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => void desktop.setExperimentalApiEnabled(event.target.checked).then(setSettings)}
        />
      </label>
      <p className="mt-2 text-xs text-gray-500">
        {t('setting.experimentalApi.helpBeforeLink')}
        <a
          href={OFFICIAL_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {OFFICIAL_GITHUB_URL}
        </a>
        {t('setting.experimentalApi.helpAfterLink')}
      </p>
      {endpoint && settings.token && (
        <div className="mt-2 space-y-2">
          <label className="block text-xs">
            <span className="text-gray-500">{t('setting.experimentalApi.endpoint')}</span>
            <input readOnly value={endpoint} className="mt-1 w-full rounded border bg-gray-50 px-2 py-1 font-mono" />
          </label>
          <label className="block text-xs">
            <span className="text-gray-500">{t('setting.experimentalApi.token')}</span>
            <div className="mt-1 flex gap-2">
              <input readOnly value={settings.token} className="min-w-0 flex-1 rounded border bg-gray-50 px-2 py-1 font-mono" />
              <button type="button" className="rounded border px-2 py-1" onClick={() => void navigator.clipboard.writeText(settings.token ?? '').then(() => { setCopyLabel(true); window.setTimeout(() => setCopyLabel(false), 1500); })}>
                {copyLabel ? t('setting.experimentalApi.copied') : t('setting.experimentalApi.copy')}
              </button>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
