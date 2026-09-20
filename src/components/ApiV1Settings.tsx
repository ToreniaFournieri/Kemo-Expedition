import { useEffect, useState } from 'react';
import { t } from '../i18n';

const OFFICIAL_GITHUB_URL = 'https://github.com/ToreniaFournieri/Kemo-Expedition/';

// SpecRef: 9.1.4.6 | HTTP authentication and exclusive control | explicit enablement

export function ApiV1Settings() {
  const desktop = window.bokemoDesktop;
  const [settings, setSettings] = useState<DesktopApiV1Settings | null>(null);

  useEffect(() => {
    if (!desktop?.getApiV1Settings) return;
    void desktop.getApiV1Settings().then(setSettings);
  }, [desktop]);

  if (!desktop?.setApiV1Enabled || !settings?.supported) return null;
  return (
    <div className="mt-3 rounded border border-status-warning-border bg-surface-card p-3 text-sm pane-button-shadow">
      <label className="flex items-center justify-between gap-3">
        <span className="font-medium">{t('setting.apiV1.title')}</span>
        <input type="checkbox" checked={settings.enabled} onChange={(event) => void desktop.setApiV1Enabled(event.target.checked).then(setSettings)} />
      </label>
      <p className="mt-2 text-xs text-gray-500">
        {t('setting.apiV1.helpBeforeLink')}
        <a href={OFFICIAL_GITHUB_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{OFFICIAL_GITHUB_URL}</a>
        {t('setting.apiV1.helpAfterLink')}
      </p>
      {settings.enabled && settings.connectionFile && (
        <label className="mt-2 block text-xs">
          <span className="text-gray-500">{t('setting.apiV1.connectionFile')}</span>
          <input readOnly value={settings.connectionFile} className="mt-1 w-full rounded border bg-gray-50 px-2 py-1 font-mono" />
        </label>
      )}
    </div>
  );
}
