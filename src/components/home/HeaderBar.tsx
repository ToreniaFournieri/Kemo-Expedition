import { buildHeaderView, type HeaderProjection } from '../../api/v1/headerView';
import { t } from '../../i18n';
import { formatNumber, IOS_GLASS_BUTTON_CLASS } from './homeShared';

// SpecRef: 8.1.2 | Header | The header renders only from the `read/observation/overview` projection; Report Progress
// and auto-repeat remain reviewed local exceptions (docs/api-v1-implementation-plan.md, Stage 4).

interface HeaderBarProps {
  header: HeaderProjection | null;
  nowMs: number;
  gameTitle: string;
  versionLabel: string;
  onReportProgress: () => void;
  onEnableAutoRepeat: () => void;
}

export function HeaderBar({ header, nowMs, gameTitle, versionLabel, onReportProgress, onEnableAutoRepeat }: HeaderBarProps) {
  const view = buildHeaderView(header, nowMs);
  const hoursLabel = view.remainingBonusHours === null ? null : `${formatNumber(view.remainingBonusHours)}h`;
  const speedOfTimeLabel = view.speedOfTimeUnlimited
    ? '(∞)'
    : view.speedOfTimeModeLabel
      ? (hoursLabel === null ? `(${view.speedOfTimeModeLabel})` : `(${view.speedOfTimeModeLabel}) (${hoursLabel})`)
      : (hoursLabel === null ? '' : `(${hoursLabel})`);
  return (
    <div className="fixed top-0 left-0 right-0 z-30 pt-[env(safe-area-inset-top)]">
      <div className="absolute inset-0 bg-white/25 backdrop-blur-[4px]" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-[500px] px-3 py-2.5 bg-white/25 backdrop-blur-[4px]">
        <div className="flex justify-between items-center gap-3 min-h-[44px]">
          <div className="pl-3">
            {/* SpecRef: 8.1.2 | Header | Game title label */}
            <h1 className="flex items-center gap-1 text-lg font-bold">
              <span aria-label={gameTitle}>
                <span className="inline-block text-[1.35em] leading-none" style={{ transform: 'rotate(-22.5deg) scale(1.0)' }}>{t('home.nav.expeditionIcon')}</span>
                <span>{t('setting.theme.kemo')}</span>
                {header?.gameMode === 'mode.orca' && <span>orca</span>}
              </span>
              <span className="text-xs font-normal text-gray-500">{versionLabel}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 pr-3 text-right text-sm font-medium leading-none">
            <button
              type="button"
              onClick={onReportProgress}
              className={`${IOS_GLASS_BUTTON_CLASS} px-2 py-1 text-sub hover:opacity-90`}
            >
              {speedOfTimeLabel ? `${view.speedOfTimeSymbol} ${speedOfTimeLabel}` : view.speedOfTimeSymbol}
            </button>
            <span>{formatNumber(view.gold)}G</span>
            {view.autoRepeatPaused && (
              <button
                type="button"
                onClick={onEnableAutoRepeat}
                className={`${IOS_GLASS_BUTTON_CLASS} px-2 py-1 text-sub hover:opacity-90`}
              >
                {t('home.header.paused')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
