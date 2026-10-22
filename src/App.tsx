import { useEffect, useState } from 'react';
import { TipProvider } from './components/ui';
import { Guide } from './screens/Guide';
import { Market } from './screens/Market';
import { Spreads } from './screens/Spreads';
import { Deals } from './screens/Deals';
import { Buyers } from './screens/Buyers';
import { Check } from './screens/Check';
import { Full } from './screens/Full';

const VIEWS = [
  { id: 'guide', label: 'Ориентир купона', C: Guide },
  { id: 'market', label: 'Рынок сейчас', C: Market },
  { id: 'spreads', label: 'Спреды к ГЦБ', C: Spreads },
  { id: 'deals', label: 'База размещений', C: Deals },
  { id: 'buyers', label: 'Покупатели', C: Buyers },
  { id: 'check', label: 'Проверка на истории', C: Check },
  { id: 'full', label: 'Полная версия', C: Full },
] as const;

const fromHash = () => {
  const h = location.hash.slice(1);
  return VIEWS.some((v) => v.id === h) ? h : 'guide';
};

type Theme = 'light' | 'dark';
const systemTheme = (): Theme => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export function App() {
  const [view, setView] = useState(fromHash);
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.getAttribute('data-theme') as Theme) || systemTheme());

  useEffect(() => {
    const f = () => {
      setView(fromHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  useEffect(() => {
    const v = VIEWS.find((x) => x.id === view)!;
    document.title = view === 'guide' ? 'KASE Compass' : `${v.label} · KASE Compass`;
  }, [view]);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('kc-theme', next); } catch { /* storage may be blocked */ }
  };

  const Cur = VIEWS.find((v) => v.id === view)!.C;
  return (
    <TipProvider>
      <a className="sr skip" href="#main">К содержанию</a>
      <header className="top">
        <div className="wrap">
          <a className="brand" href="#guide" aria-label="KASE Compass — на главную">
            <img src="./compass-mark.svg" alt="" width={32} height={32} />
            <span className="wordmark"><b>KASE</b> Compass</span>
          </a>
          <nav className="nav" aria-label="Разделы">
            {VIEWS.map((v) => (
              <a key={v.id} href={'#' + v.id} aria-current={view === v.id ? 'page' : undefined}>{v.label}</a>
            ))}
          </nav>
          <div className="tools">
            <button type="button" className="theme-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M14.5 11.2A6 6 0 0 1 6.8 3.5a6 6 0 1 0 7.7 7.7z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        <div className="wrap" key={view}>
          <Cur />
        </div>
      </main>
      <footer>
        <div className="wrap">
          <p>
            <strong>KASE Compass</strong> — учебный концепт-прототип для кейс-чемпионата KASE. Это не официальный сервис KASE и не инвестиционная
            рекомендация: все цифры — статистика прошлых размещений.
          </p>
          <p>
            Источники:{' '}
            <a href="https://kase.kz/ru/information/news/market" target="_blank" rel="noopener noreferrer">сообщения KASE об итогах размещений и аукционов Минфина</a>{' '}
            (ссылка на каждое — в базе),{' '}
            <a href="https://kase.kz/uploads/15_10_2026_Itogi_3q_rus_3609a63a33.pdf" target="_blank" rel="noopener noreferrer">итоги KASE за 9 месяцев 2026 года</a>.
            Размещения с 09.01 по 19.10.2026, аукционы ГЦБ по 20.10.2026. Суммы в долларах пересчитаны по 475,09{' '}₸.
          </p>
        </div>
      </footer>
    </TipProvider>
  );
}
