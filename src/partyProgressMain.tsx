import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { translate, type TranslationParams } from './i18n';
import './partyProgressPane.css';

const NUMBER_FORMATTER = new Intl.NumberFormat('ja-JP');

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getProgress(progress: DesktopPartyProgressValue, now: number): { ratio: number; detail: string; remaining: string } | null {
  if (progress.kind === 'none') return null;
  if (progress.kind === 'steps') {
    const total = Math.max(1, progress.total);
    const completed = clamp(progress.completed, 0, total);
    return { ratio: completed / total, detail: `${NUMBER_FORMATTER.format(completed)}/${NUMBER_FORMATTER.format(total)}`, remaining: '' };
  }
  const duration = Math.max(1, progress.endsAt - progress.startedAt);
  const remainingSeconds = Math.max(0, Math.ceil((progress.endsAt - now) / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return {
    ratio: clamp((now - progress.startedAt) / duration, 0, 1),
    detail: `${Math.round(clamp((now - progress.startedAt) / duration, 0, 1) * 100)}%`,
    remaining: `${NUMBER_FORMATTER.format(minutes)}:${NUMBER_FORMATTER.format(seconds).padStart(2, '0')}`,
  };
}

function PartyProgressPane() {
  const bridge = window.bokemoPartyProgress;
  const [snapshot, setSnapshot] = useState<DesktopPartyProgressSnapshot | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!bridge) return;
    void bridge.getSnapshot().then(setSnapshot);
    return bridge.onSnapshot(setSnapshot);
  }, [bridge]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const language = snapshot?.language ?? 'en';
  const text = (key: string, params?: TranslationParams) => translate(language, key, params);
  const appTitle = text('app.title');
  const theme = snapshot?.theme ?? 'dark';
  const updatedTime = useMemo(() => snapshot
    ? new Date(snapshot.updatedAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })
    : '', [language, snapshot]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.style.colorScheme = theme === 'dark' || theme.endsWith('-dark') ? 'dark' : 'light';
    document.body.dataset.theme = theme;
  }, [language, theme]);

  return (
    <main className="pane-shell">
      <header className="pane-header">
        <div>
          <span className="eyebrow">{appTitle}</span>
          <h1>{text('desktopPartyProgress.title')}</h1>
        </div>
        <button className="open-button" type="button" onClick={() => void bridge?.openMainWindow()}>{text('desktopPartyProgress.open', { app: appTitle })}</button>
      </header>

      {snapshot && snapshot.unreadDiaryCount > 0 && (
        <div className="unread-badge">● {text('desktopPartyProgress.unreadDiary')} {NUMBER_FORMATTER.format(snapshot.unreadDiaryCount)}</div>
      )}

      <section className="party-list">
        {snapshot?.parties.length ? snapshot.parties.map((party, index) => {
          const progress = getProgress(party.progress, now);
          const subProgress = getProgress(party.subProgress, now);
          return (
            <button className="party-card" type="button" key={party.id} onClick={() => void bridge?.selectParty(party.id)}>
              <div className="party-first-row">
                <span className="party-headline">
                  <strong>{party.name || `PT${NUMBER_FORMATTER.format(index + 1)}`}</strong>
                  <span>{party.headlineFloorName}</span>
                </span>
                <span className="party-result">
                  <span className="charge"><span>{party.chargeCells}</span><i>{party.chargeTimerText}</i></span>
                  <span>{party.outcomeLabel}</span>
                </span>
              </div>
              <div className="compact-items">
                {party.compactProgressItems.map((item, itemIndex) => (
                  <span className="compact-item" key={`${party.id}-${itemIndex}`}>
                    {item.progressRatio !== null && <span className="compact-fill" style={{ width: `${item.progressRatio * 100}%` }} />}
                    <span>{item.text}</span>
                  </span>
                ))}
              </div>
              <div className="state-progress">
                <div className="progress-track">{progress && <span style={{ width: `${progress.ratio * 100}%` }} />}</div>
                <span className="state-label">{party.stateLabel}</span>
                <span className="progress-detail">{progress ? progress.remaining || progress.detail : ''}</span>
              </div>
              <div className="sub-progress-track" aria-hidden="true">
                {subProgress && <span style={{ width: `${subProgress.ratio * 100}%` }} />}
              </div>
              <div className="hp-row">
                <span>{text('desktopPartyProgress.hp')} {NUMBER_FORMATTER.format(party.currentHp)} / {NUMBER_FORMATTER.format(party.maxHp)}</span>
              </div>
            </button>
          );
        }) : (
          <div className="empty-state">{text('desktopPartyProgress.unavailable', { app: appTitle })}</div>
        )}
      </section>

      <footer>{text('desktopPartyProgress.updated')} {updatedTime}</footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><PartyProgressPane /></StrictMode>,
);
