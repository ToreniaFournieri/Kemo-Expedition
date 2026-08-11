import { useEffect, useState } from 'react';
import {
  getDesktopPreferences,
  saveDesktopPreferences,
  type DesktopPreferences,
} from '../game/desktopNotifications';
import { t } from '../i18n';

export function DesktopNotificationSettings() {
  const desktop = window.bokemoDesktop;
  const [isAvailable, setIsAvailable] = useState(false);
  const [notificationSupported, setNotificationSupported] = useState(true);
  const [preferences, setPreferences] = useState<DesktopPreferences>(() => getDesktopPreferences());
  const [launchAtLogin, setLaunchAtLogin] = useState(false);

  useEffect(() => {
    if (!desktop) return;
    void Promise.all([desktop.getStatus(), desktop.getLaunchAtLogin()]).then(([status, launchEnabled]) => {
      setIsAvailable(status.isMacDesktop);
      setNotificationSupported(status.notificationSupported);
      setLaunchAtLogin(launchEnabled);
    });
  }, [desktop]);

  if (!desktop || !isAvailable) return null;

  const updatePreferences = (updates: Partial<DesktopPreferences>) => {
    const next = { ...preferences, ...updates };
    setPreferences(next);
    saveDesktopPreferences(next);
  };

  return (
    <div className="rounded border border-gray-200 bg-white p-3 text-sm pane-button-shadow">
      <div className="mb-2 font-medium">{t('setting.desktopNotifications.title')}</div>
      <label className="flex items-center justify-between gap-3 py-1">
        <span>{t('setting.desktopNotifications.enabled')}</span>
        <input
          type="checkbox"
          checked={preferences.nativeNotificationsEnabled}
          disabled={!notificationSupported}
          onChange={(event) => updatePreferences({ nativeNotificationsEnabled: event.target.checked })}
        />
      </label>
      <label className="flex items-center justify-between gap-3 py-1">
        <span>{t('setting.desktopNotifications.delivery')}</span>
        <select
          value={preferences.nativeNotificationMode}
          onChange={(event) => updatePreferences({ nativeNotificationMode: event.target.value === 'always' ? 'always' : 'hiddenOnly' })}
          className="rounded border border-gray-300 bg-white px-2 py-1"
        >
          <option value="hiddenOnly">{t('setting.desktopNotifications.hiddenOnly')}</option>
          <option value="always">{t('setting.desktopNotifications.always')}</option>
        </select>
      </label>
      <label className="flex items-center justify-between gap-3 py-1">
        <span>{t('setting.desktopNotifications.launchAtLogin')}</span>
        <input
          type="checkbox"
          checked={launchAtLogin}
          onChange={(event) => {
            const requested = event.target.checked;
            void desktop.setLaunchAtLogin(requested).then(setLaunchAtLogin);
          }}
        />
      </label>
      <p className="mt-2 text-xs text-gray-500">
        {notificationSupported
          ? t('setting.desktopNotifications.help')
          : t('setting.desktopNotifications.unsupported')}
      </p>
    </div>
  );
}
