import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent, FocusEvent as RFocusEvent, ReactNode } from 'react';
import { NEWS, ST_LABEL, type WinStatus } from '../lib/compass';

/* ---------- tooltip ---------- */
interface TipState { x: number; y: number; title: string; lines: string[] }
type TipFn = () => [string, string[]];
const TipCtx = createContext<{ show: (s: TipState) => void; hide: () => void }>({ show: () => {}, hide: () => {} });

export function TipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: -9999, top: 0 });
  const hide = useCallback(() => setTip(null), []);
  useLayoutEffect(() => {
    if (!tip || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const pad = 10;
    let nx = tip.x + 14;
    let ny = tip.y + 14;
    if (nx + r.width > window.innerWidth - pad) nx = tip.x - r.width - 14;
    if (ny + r.height > window.innerHeight - pad) ny = tip.y - r.height - 14;
    setPos({ left: Math.max(pad, nx), top: Math.max(pad, ny) });
  }, [tip]);
  useEffect(() => {
    window.addEventListener('scroll', hide, { passive: true });
    return () => window.removeEventListener('scroll', hide);
  }, [hide]);
  return (
    <TipCtx.Provider value={{ show: setTip, hide }}>
      {children}
      {tip && (
        <div className="tip" role="tooltip" ref={ref} style={pos}>
          <strong>{tip.title}</strong>
          {tip.lines.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </TipCtx.Provider>
  );
}

/** Props that give an SVG mark a tooltip on hover and on keyboard focus. */
export function useTip() {
  const { show, hide } = useContext(TipCtx);
  return useCallback(
    (fn: TipFn, label?: string) => ({
      tabIndex: 0,
      'aria-label': label ?? fn()[0] + ', ' + fn()[1].join(', '),
      onPointerMove: (e: RPointerEvent) => { const [t, l] = fn(); show({ x: e.clientX, y: e.clientY, title: t, lines: l }); },
      onPointerLeave: hide,
      onFocus: (e: RFocusEvent<Element>) => {
        const b = e.currentTarget.getBoundingClientRect();
        const [t, l] = fn();
        show({ x: b.left + b.width / 2, y: b.top, title: t, lines: l });
      },
      onBlur: hide,
    }),
    [show, hide],
  );
}
export function useTipRaw() { return useContext(TipCtx); }

/* ---------- size ---------- */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function useReducedMotion() {
  const [r, setR] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)');
    const f = () => setR(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return r;
}

/** Smoothly moves a number to its new value (≤ 300 ms). */
export function useTween(value: number, ms = 280): number {
  const reduced = useReducedMotion();
  const [v, setV] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced || from.current === value) { from.current = value; setV(value); return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const cur = a + (value - a) * e;
      from.current = cur;
      setV(cur);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms, reduced]);
  return v;
}

/* ---------- building blocks ---------- */
export function PageHead({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
    </header>
  );
}

export function Block({ title, aside, children, id, className }: { title: ReactNode; aside?: ReactNode; children: ReactNode; id?: string; className?: string }) {
  return (
    <section className={'block' + (className ? ' ' + className : '')} aria-labelledby={id}>
      <div className="block-head">
        <h2 id={id}>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Chart with a «Показать таблицей» switch. */
export function ChartBlock({ title, id, note, controls, legend, chart, table, after }: {
  title: ReactNode; id: string; note?: ReactNode; controls?: ReactNode; legend?: ReactNode;
  chart: (w: number) => ReactNode; table: ReactNode; after?: ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  const [ref, w] = useWidth<HTMLDivElement>();
  return (
    <Block
      title={title}
      id={id}
      aside={
        <button type="button" className="linkbtn" aria-expanded={asTable} aria-controls={id + '-body'} onClick={() => setAsTable(!asTable)}>
          {asTable ? 'Показать графиком' : 'Показать таблицей'}
        </button>
      }
    >
      {note && <p className="note">{note}</p>}
      {controls}
      <div id={id + '-body'}>
        {asTable ? (
          <div className="scroll" style={{ marginTop: 16 }}>{table}</div>
        ) : (
          <>
            {legend}
            <div className="chart" ref={ref}>{w > 0 && chart(w)}</div>
          </>
        )}
      </div>
      {after}
    </Block>
  );
}

export function SrcLink({ id, label = 'KASE ↗' }: { id: number; label?: string }) {
  return (
    <a className="src-link" href={NEWS + id} target="_blank" rel="noopener noreferrer" aria-label={`Сообщение KASE ${id}, откроется в новой вкладке`}>
      {label}
    </a>
  );
}

/* ---------- window status ---------- */
export function StatusGlyph({ st, size = 12, x, y }: { st: WinStatus; size?: number; x?: number; y?: number }) {
  const col = st === 'closed' ? 'var(--accent-text)' : st === 'open' ? 'var(--data-text)' : 'var(--muted)';
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" x={x} y={y} aria-hidden="true">
      {st === 'closed' && (
        <>
          <rect x="1" y="1" width="10" height="10" rx="2" fill={col} />
          <path d="M4 4 L8 8 M8 4 L4 8" stroke="var(--bg)" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {st === 'open' && (
        <>
          <circle cx="6" cy="6" r="5.5" fill={col} />
          <path d="M3.3 6.2 L5.2 8 L8.7 4.3" fill="none" stroke="var(--bg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {st === 'neutral' && (
        <>
          <circle cx="6" cy="6" r="5.5" fill={col} />
          <path d="M3.5 6 H8.5" stroke="var(--bg)" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {st === 'few' && <circle cx="6" cy="6" r="5" fill="none" stroke={col} strokeWidth="1.4" />}
    </svg>
  );
}
export function Status({ st }: { st: WinStatus }) {
  return (
    <span className={'st st-' + st}>
      <StatusGlyph st={st} />
      {ST_LABEL[st]}
    </span>
  );
}

export const BUY_VAR: Record<string, string> = { ret: 'var(--b1)', bank: 'var(--b2)', inst: 'var(--b3)', bdo: 'var(--b4)', oth: 'var(--b5)', leg: 'var(--b6)' };

/** Linear scale helper. */
export const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

/** Bar path with 4 px rounded top. */
export function barPath(x: number, y: number, w: number, base: number, r = 4) {
  const h = base - y;
  const rr = Math.min(r, h, w / 2);
  return `M${x} ${base}V${y + rr}Q${x} ${y} ${x + rr} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${base}Z`;
}
