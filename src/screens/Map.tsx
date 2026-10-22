import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as RKeyboardEvent, ReactNode } from 'react';
import {
  MAP, MDEAL, MISS, MSEG, TXT, binLabel, deltaText, emit, layoutMap, mapHeight, metricOf, metricText, mfmt, money, razm, sgnPP, years, zone,
  type Bin, type ColorMode, type Item, type MapIssuer, type SegCode, type SizeMode, type Zone,
} from '../lib/map';
import { NB, PP, dmy } from '../lib/format';
import { openGuideFor, parseHash, replaceHash } from '../lib/nav';
import { useReducedMotion } from '../components/ui';
import './map.css';

/* ---------- text measuring: a line with a number is shown whole or not at all ---------- */
const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
function tw(str: string, font: string) {
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(str.replace(/ /g, ' ')).width;
}
const FONTS: Record<Exclude<Zone, 'xs'>, { pad: number; q?: string; u?: string; v?: string; m?: string }> = {
  xl: { pad: 14, q: "500 22px Unbounded", u: "500 14px Onest", v: "500 13px Onest", m: "400 13px Onest" },
  l: { pad: 10, v: "500 13px Onest", m: "400 12px Onest" },
  m: { pad: 8, v: "400 12px Onest", m: "400 12px Onest" },
  s: { pad: 6 },
};
interface Lines { big?: [string, string]; v?: string; m?: string }
function fitLines(z: Zone, w: number, h: number, val: string, met: string, size: SizeMode): Lines {
  if (z === 'xs' || z === 's') return {};
  const f = FONTS[z];
  const room = w - 2 * f.pad;
  const fits = (width: number) => width * 1.06 + 2 <= room;
  const out: Lines = {};
  if (z === 'xl') {
    const i = val.indexOf(NB);
    const q = i < 0 ? val : val.slice(0, i);
    const u = i < 0 ? '' : val.slice(i);
    if (fits(tw(q, f.q!) + tw(u, f.u!))) out.big = [q, u];
    else if (fits(tw(val, f.v!))) out.v = val;
    if (fits(tw(met, f.m!))) out.m = met;
    return out;
  }
  if (z === 'l') {
    if (fits(tw(val, f.v!))) out.v = val;
    if (fits(tw(met, f.m!))) out.m = met;
    return out;
  }
  const first = size === 'vol' ? val : met;
  const second = size === 'vol' ? met : val;
  if (fits(tw(first, f.v!))) out.v = first;
  if (h >= 62 && fits(tw(second, f.m!))) out.m = second;
  return out;
}

type Drawer =
  | { kind: 'iss'; name: string }
  | { kind: 'seg'; code: SegCode }
  | { kind: 'more'; seg: SegCode; items: MapIssuer[] };

const binOfIss = (z: MapIssuer, c: ColorMode): Bin => (c === 'demand' ? z.bin_demand : z.bin_price);
const segVal = (code: SegCode, size: SizeMode) => (size === 'vol' ? money(MSEG[code].vol_bn) : razm(MSEG[code].n));
const ORDER: Record<string, string[]> = {};
for (const s of MAP.segments) ORDER[s.code] = MAP.issuers.filter((z) => z.seg === s.code).map((z) => 'i:' + z.name);

export function MapScreen() {
  const [init] = useState(() => parseHash().params);
  const [size, setSize] = useState<SizeMode>(init.get('size') === 'n' ? 'n' : 'vol');
  const [color, setColor] = useState<ColorMode>(init.get('color') === 'price' ? 'price' : 'demand');
  const [showTable, setShowTable] = useState(false);
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [hl, setHl] = useState<{ bin?: Bin; seg?: SegCode } | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    replaceHash('map', { size: size === 'n' ? 'n' : null, color: color === 'price' ? 'price' : null });
  }, [size, color]);
  useEffect(() => {
    const name = init.get('open');
    if (name && MISS.has(name)) setDrawer({ kind: 'iss', name });
  }, [init]);

  const open = (d: Drawer, from?: HTMLElement | null) => {
    if (from) lastFocus.current = from;
    else if (!drawer) lastFocus.current = document.activeElement as HTMLElement;
    setDrawer(d);
  };
  const close = () => {
    setDrawer(null);
    const f = lastFocus.current;
    lastFocus.current = null;
    if (f && document.contains(f)) setTimeout(() => f.focus(), 0);
  };

  const legendBins = MAP.bins[color];
  const poles = color === 'demand' ? ['← недобор', 'переподписка →'] : ['← дешевле типа', 'дороже типа →'];

  return (
    <>
      <header className="page-head map-head">
        <div className="eyebrow">{TXT.eyebrow}</div>
        <h1>{size === 'vol' ? TXT.title_vol : TXT.title_cnt}</h1>
        <p className="lede">{size === 'vol' ? TXT.sub_vol : TXT.sub_cnt}</p>
      </header>

      <section className="block map-block" aria-label="Карта рынка">
        <div className="map-ctl">
          <div className="map-ctl-g">
            <span className="eyebrow">Размер</span>
            <div className="seg-btns" role="group" aria-label="Размер плитки">
              {([['vol', 'Объём'], ['n', 'Размещения']] as const).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={size === k} onClick={() => setSize(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="map-ctl-g">
            <span className="eyebrow">Цвет</span>
            <div className="seg-btns" role="group" aria-label="Цвет плитки">
              {([['demand', 'Спрос'], ['price', 'Цена']] as const).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={color === k} onClick={() => setColor(k)}>{l}</button>
              ))}
            </div>
          </div>
          <button type="button" className="linkbtn map-tv" aria-expanded={showTable} aria-controls="map-table" onClick={() => setShowTable(!showTable)}>
            {showTable ? 'Скрыть таблицу' : 'Показать таблицей'}
          </button>
        </div>

        <div className="map-legend" onPointerLeave={() => setHl(null)}>
          <div>
            <p className="lg-title">{color === 'demand' ? TXT.lg_demand : TXT.lg_price}</p>
            <div className="lg-row">
              <div className="lg-main">
                {legendBins.map((b) => (
                  <button
                    key={b.key} type="button" className="sw"
                    onPointerEnter={() => setHl({ bin: b.key })} onFocus={() => setHl({ bin: b.key })} onBlur={() => setHl(null)}
                    aria-label={`Подсветить плитки: ${b.label}`}
                  >
                    <i className={'b-' + b.key} />
                    <span>{b.label}</span>
                  </button>
                ))}
                <div className="lg-poles" aria-hidden="true"><span>{poles[0]}</span><span>{poles[1]}</span></div>
              </div>
              <button
                type="button" className="sw sw-na"
                onPointerEnter={() => setHl({ bin: 'na' })} onFocus={() => setHl({ bin: 'na' })} onBlur={() => setHl(null)}
                aria-label="Подсветить плитки: нет данных"
              >
                <i className="b-na" />
                <span>нет данных</span>
              </button>
            </div>
          </div>
          <p className="size-note">{size === 'vol' ? TXT.size_vol : TXT.size_n}</p>
        </div>
        <p className="note map-cap">{color === 'demand' ? TXT.cap_demand : TXT.cap_price}</p>
        <p className="hint map-how">{TXT.how_to_read}</p>

        <Treemap
          size={size} color={color} hl={hl} drawer={drawer}
          onOpen={(d, el) => open(d, el)}
        />

        <div className="segrow" onPointerLeave={() => setHl(null)}>
          <span>Типы эмитентов:</span>
          {MAP.segments.map((s) => (
            <button
              key={s.code} type="button"
              onPointerEnter={() => setHl({ seg: s.code })} onFocus={() => setHl({ seg: s.code })} onBlur={() => setHl(null)}
              onClick={(e) => open({ kind: 'seg', code: s.code }, e.currentTarget)}
            >
              {s.short} · {segVal(s.code, size)}
            </button>
          ))}
        </div>

        {showTable && <IssuerTable color={color} onOpen={(name, el) => open({ kind: 'iss', name }, el)} />}

        <p className="note map-note">{TXT.note}</p>
      </section>

      {drawer && <DrawerView d={drawer} color={color} onClose={close} onOpen={(d) => setDrawer(d)} />}
    </>
  );
}

/* ======================= treemap ======================= */
function Treemap({ size, color, hl, drawer, onOpen }: {
  size: SizeMode; color: ColorMode; hl: { bin?: Bin; seg?: SegCode } | null; drawer: Drawer | null;
  onOpen: (d: Drawer, el: HTMLElement) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);
  const [fontsTick, setFontsTick] = useState(0);
  const [ready, setReady] = useState(false);
  const [moving, setMoving] = useState(false);
  const reduced = useReducedMotion();
  const prevSize = useRef(size);
  const seen = useRef(new Set<string>());

  useLayoutEffect(() => {
    const el = ref.current!;
    setW(Math.round(el.clientWidth));
    let t = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(() => setW(Math.round(el.clientWidth)), 120);
    });
    ro.observe(el);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);
  useEffect(() => {
    document.fonts?.ready.then(() => setFontsTick((x) => x + 1));
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(r);
  }, []);
  useEffect(() => {
    if (prevSize.current === size) return;
    prevSize.current = size;
    if (reduced) return;
    setMoving(true);
    const t = setTimeout(() => setMoving(false), 470);
    return () => clearTimeout(t);
  }, [size, reduced]);

  const H = W ? mapHeight(W) : 620;
  const L = useMemo(() => (W ? layoutMap(MAP.issuers, size, W, H) : null), [W, H, size]);

  /* tooltip */
  const [tip, setTip] = useState<{ it: Item; x: number; y: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState({ left: -9999, top: 0 });
  useLayoutEffect(() => {
    if (!tip || !tipRef.current) return;
    const r = tipRef.current.getBoundingClientRect();
    const pad = 12;
    let left = tip.x + 16;
    let top = tip.y + 16;
    if (left + r.width > innerWidth - pad) left = tip.x - r.width - 16;
    if (left < pad) left = pad;
    if (top + r.height > innerHeight - pad) top = tip.y - r.height - 16;
    if (top < pad) top = pad;
    setTipPos({ left, top });
  }, [tip]);
  useEffect(() => { if (drawer) setTip(null); }, [drawer]);
  useEffect(() => {
    const f = () => setTip(null);
    addEventListener('scroll', f, { passive: true });
    return () => removeEventListener('scroll', f);
  }, []);

  const tilesByKey = new Map(L?.tiles.map((t) => [t.item.key, t]) ?? []);
  const selKey = drawer?.kind === 'iss' ? 'i:' + drawer.name : null;
  void fontsTick;

  const cls = ['map', ready && !reduced ? 'ready' : '', moving ? 'moving' : '', hl ? 'filtering' : ''].filter(Boolean).join(' ');
  const nextSeen = new Set<string>();

  return (
    <>
      <div
        ref={ref}
        className={cls}
        style={{ height: H }}
        onPointerLeave={() => setTip(null)}
      >
        {L && L.groups.map((g) => {
          const code = g.seg.code;
          const w = g.x1 - g.x0;
          const gv = segVal(code, size);
          const GF = '500 11px "JetBrains Mono"';
          const wName = tw(g.seg.short.toUpperCase(), GF) + g.seg.short.length * 1.1;
          const wVal = tw(gv.toUpperCase(), GF) + gv.length * 1.1 + 8;
          const showSum = g.header === 22 && wName + wVal <= w - 4;
          const keys = [...ORDER[code], 'm:' + code].filter((k) => tilesByKey.has(k));
          return (
            <Fragment key={code}>
              <button
                type="button"
                className={'gh' + (g.header === 16 ? ' gh-s' : '')}
                style={{ left: g.x0, top: g.y0, width: w, opacity: g.header ? 1 : 0, pointerEvents: g.header ? 'auto' : 'none' }}
                tabIndex={g.header ? 0 : -1}
                aria-hidden={g.header ? undefined : true}
                aria-label={`${g.seg.name}: ${money(g.seg.vol_bn)}, ${razm(g.seg.n)}, ${emit(g.seg.issuers)}. Открыть список`}
                onClick={(e) => onOpen({ kind: 'seg', code }, e.currentTarget)}
              >
                <b>{g.seg.short}</b>
                {showSum && <span>{gv}</span>}
              </button>
              {keys.map((k) => {
                const t = tilesByKey.get(k)!;
                const it = t.item;
                nextSeen.add(k);
                const fresh = ready && !seen.current.has(k);
                const w = t.x1 - t.x0;
                const h = t.y1 - t.y0;
                const z = zone(w, h);
                const m = metricOf(it, color);
                const headed = g.header > 0;
                let name: string;
                if (it.kind === 'iss') name = it.z.label;
                else if (it.items.length === MSEG[it.seg].issuers) name = `${MSEG[it.seg].short} · ${emit(it.items.length)}`;
                else name = (headed ? '' : MSEG[it.seg].short + ': ') + 'ещё' + NB + it.items.length;
                const val = it.kind === 'iss'
                  ? (size === 'vol' ? money(it.z.vol_bn) : razm(it.z.n))
                  : (size === 'vol' ? money(it.items.reduce((s, x) => s + x.vol_bn, 0)) : razm(it.items.reduce((s, x) => s + x.n, 0)));
                const met = metricText(m, color, z === 'xl');
                const lines = fitLines(z, w, h, val, met, size);
                const hit = hl && (hl.bin ? m.bin === hl.bin : it.seg === hl.seg);
                const label = `${it.kind === 'iss' ? it.z.name : 'Ещё ' + emit(it.items.length)}, ${MSEG[it.seg].name}: ${val}, ${metricText(m, color, true)}`;
                return (
                  <button
                    key={k}
                    type="button"
                    data-map-tile=""
                    className={`tile z-${z} b-${m.bin}${it.kind === 'more' ? ' more' : ''}${selKey === k ? ' is-sel' : ''}${hit ? ' hit' : ''}${fresh ? ' fresh' : ''}`}
                    style={{ left: t.x0, top: t.y0, width: w, height: h }}
                    aria-label={label}
                    onPointerMove={(e) => { if (e.pointerType !== 'touch') setTip({ it, x: e.clientX, y: e.clientY }); }}
                    onFocus={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      setTip({ it, x: r.left + Math.min(r.width, 160) - 16, y: r.top + Math.min(r.height, 80) - 16 });
                    }}
                    onBlur={() => setTip(null)}
                    onClick={(e) => {
                      setTip(null);
                      onOpen(it.kind === 'iss' ? { kind: 'iss', name: it.z.name } : { kind: 'more', seg: it.seg, items: it.items }, e.currentTarget);
                    }}
                  >
                    {z !== 'xs' && <span className="t-n">{name}</span>}
                    {lines.big && (
                      <span className="t-v t-big" data-fit=""><span className="q">{lines.big[0]}</span><span className="u">{lines.big[1]}</span></span>
                    )}
                    {lines.v && <span className="t-v" data-fit="">{lines.v}</span>}
                    {lines.m && <span className="t-m" data-fit="">{lines.m}</span>}
                  </button>
                );
              })}
            </Fragment>
          );
        })}
        <SeenSync seen={seen} next={nextSeen} />
      </div>
      {tip && (
        <div className="map-tip" ref={tipRef} style={tipPos} role="tooltip">
          <TipBody it={tip.it} size={size} color={color} />
        </div>
      )}
    </>
  );
}

/** Remembers which tiles were already on screen, so only new ones fade in. */
function SeenSync({ seen, next }: { seen: React.MutableRefObject<Set<string>>; next: Set<string> }) {
  useEffect(() => { seen.current = next; });
  return null;
}

function TipBody({ it, size, color }: { it: Item; size: SizeMode; color: ColorMode }) {
  if (it.kind === 'more') {
    return (
      <>
        <h4>Ещё {emit(it.items.length)}</h4>
        <p className="k">{MSEG[it.seg].name}</p>
        <ul>
          {it.items.map((z) => <li key={z.name}><span>{z.label}</span><span>{size === 'vol' ? money(z.vol_bn) : razm(z.n)}</span></li>)}
        </ul>
        <p className="f">Нажмите — список с данными по каждому</p>
      </>
    );
  }
  const z = it.z;
  return (
    <>
      <h4>{z.name}</h4>
      <p className="k">{MSEG[z.seg].name}</p>
      <dl>
        <div><dt>Привлечено</dt><dd>{money(z.vol_bn)}</dd></div>
        <div><dt>Размещений</dt><dd>{z.n}, последнее {dmy(z.last)}</dd></div>
        <div className={color === 'demand' ? 'on' : undefined}>
          <dt>Спрос</dt>
          <dd>{z.with_cov ? <>медиана {mfmt(z.cov_med!, 1)}%<br />недобор в {z.under} из {z.with_cov}</> : z.cov_na}</dd>
        </div>
        <div className={color === 'price' ? 'on' : undefined}>
          <dt>Спред к ГЦБ</dt>
          <dd>{z.spr_n ? <>{sgnPP(z.spr_med!)}{NB}{PP}, у типа {sgnPP(z.seg_p50!)}<br />{deltaText(z.spr_delta!)}</> : `нет: ${z.spr_na}`}</dd>
        </div>
        <div><dt>Срок</dt><dd>{z.ten_med == null ? '—' : `обычно ${years(z.ten_med)}`}</dd></div>
      </dl>
      <p className="f">Нажмите — сделки и ссылки на KASE</p>
    </>
  );
}

/* ======================= drawer ======================= */
function DrawerView({ d, color, onClose, onOpen }: { d: Drawer; color: ColorMode; onClose: () => void; onOpen: (d: Drawer) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('.dr-x')?.focus();
    ref.current?.scrollTo(0, 0);
  }, [d]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  const onKey = useCallback((e: RKeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab') return;
    const f = [...(ref.current?.querySelectorAll<HTMLElement>('a[href],button,[tabindex="0"]') ?? [])];
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }, [onClose]);

  let eyebrow: string;
  let title: string;
  let body: ReactNode;
  if (d.kind === 'iss') {
    const z = MISS.get(d.name)!;
    eyebrow = MSEG[z.seg].name;
    title = z.name;
    body = <IssuerBody z={z} />;
  } else if (d.kind === 'seg') {
    const s = MSEG[d.code];
    eyebrow = 'Тип эмитента';
    title = s.name;
    body = (
      <>
        <Kpis items={[
          ['Привлечено', money(s.vol_bn), true],
          ['Размещений', String(s.n), true],
          ['Доля денег рынка', `${mfmt(s.vol_share, 1)}%`],
          ['Медиана спроса', s.cov_med == null ? '—' : `${mfmt(s.cov_med, 1)}%`],
          ['С недобором', `${s.under} из ${s.with_cov}`],
          ['Медианный спред', s.spr_p50 == null ? '—' : `${sgnPP(s.spr_p50)}${NB}${PP}`],
        ]} />
        <IssList list={MAP.issuers.filter((z) => z.seg === d.code)} color={color} onOpen={onOpen} />
      </>
    );
  } else {
    eyebrow = MSEG[d.seg].name;
    title = 'Ещё ' + emit(d.items.length);
    body = <IssList list={d.items} color={color} onOpen={onOpen} />;
  }
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-title" ref={ref} onKeyDown={onKey}>
        <div className="dr-h">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id="dr-title">{title}</h2>
          </div>
          <button type="button" className="dr-x" aria-label="Закрыть" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        {body}
      </div>
    </>
  );
}

function Kpis({ items }: { items: [string, string, boolean?][] }) {
  return (
    <dl className="dr-kpis">
      {items.map(([k, v, big]) => (
        <div key={k}><dt>{k}</dt><dd className={big ? 'big' : undefined}>{v}</dd></div>
      ))}
    </dl>
  );
}

function IssuerBody({ z }: { z: MapIssuer }) {
  const deals = z.deal_ids.map((id) => MDEAL.get(id)!);
  const segShort = MSEG[z.seg].short;
  let note: string;
  if (z.spr_n && z.spr_delta != null) {
    const dd = z.spr_delta;
    const tail = Math.abs(dd) < 0.25
      ? 'размещается почти как тип'
      : `платит на ${mfmt(Math.abs(dd), 2)}${NB}${PP} ${dd > 0 ? 'больше' : 'меньше'}`;
    note = `У типа «${segShort}» медианный спред ${sgnPP(z.seg_p50!)}${NB}${PP}: этот эмитент ${tail}.`;
  } else note = `Спреда нет: ${z.spr_na}.`;
  return (
    <>
      <Kpis items={[
        ['Привлечено', money(z.vol_bn), true],
        ['Размещений', String(z.n), true],
        ['Последнее', dmy(z.last)],
        ['Медиана спроса', z.cov_med == null ? '—' : `${mfmt(z.cov_med, 1)}%`],
        ['С недобором', z.with_cov ? `${z.under} из ${z.with_cov}` : '—'],
        ['Медианный спред', z.spr_med == null ? '—' : `${sgnPP(z.spr_med)}${NB}${PP}`],
      ]} />
      <p className="dr-note">{note}</p>
      <div className="dr-act">
        {z.in_guide ? (
          <a className="btn" href="#guide" onClick={(e) => { e.preventDefault(); openGuideFor(z.name); }}>Рассчитать ориентир купона →</a>
        ) : (
          <p className="dr-note">Ориентир считается по выпускам в тенге с фиксированной ставкой — у этого эмитента их нет.</p>
        )}
      </div>
      <h3 className="dr-sub">Размещения · {z.n}</h3>
      <div className="dt-wrap">
        <table className="tbl dt">
          <thead>
            <tr>
              <th scope="col">Дата</th><th scope="col">Выпуск</th><th scope="col" className="num">Срок</th><th scope="col" className="num">Ставка</th>
              <th scope="col" className="num">Спред</th><th scope="col" className="num">Спрос</th><th scope="col" className="num">Объём</th><th scope="col" className="num">Источник</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((x) => {
              const rate = x.fin == null ? '—' : x.knd === 'маржа' ? `маржа ${mfmt(x.fin, 2)}` : `${mfmt(x.fin, 2)}%`;
              const tk = x.tk + (x.ccy !== 'KZT' ? ' · ' + x.ccy : '');
              const sum = [years(x.ten), rate, x.spr == null ? null : `спред ${sgnPP(x.spr)}`, x.cov == null ? null : `спрос ${mfmt(x.cov, 1)}%`, money(x.vol)].filter(Boolean).join(' · ');
              return (
                <tr key={x.id}>
                  <td className="date">{dmy(x.d)}</td>
                  <td className="mono">{tk}</td>
                  <td className="num">{years(x.ten)}</td>
                  <td className="num">{rate}</td>
                  <td className="num">{x.spr == null ? '—' : sgnPP(x.spr)}</td>
                  <td className="num">{x.cov == null ? '—' : `${mfmt(x.cov, 1)}%`}</td>
                  <td className="num">{money(x.vol)}</td>
                  <td className="c-sum"><span className="mono">{dmy(x.d)} · {tk}</span><br />{sum}</td>
                  <td className="num c-src">
                    <a href={x.url} target="_blank" rel="noopener noreferrer" aria-label={`Сообщение KASE об итогах размещения ${x.tk} от ${dmy(x.d)}`}>KASE{NB}↗</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function IssList({ list, color, onOpen }: { list: MapIssuer[]; color: ColorMode; onOpen: (d: Drawer) => void }) {
  const rows = list.slice().sort((a, b) => b.vol_bn - a.vol_bn);
  return (
    <>
      <h3 className="dr-sub">Эмитенты · {list.length}</h3>
      <ul className="iss-list">
        {rows.map((z) => {
          const bin = binOfIss(z, color);
          return (
            <li key={z.name}>
              <button type="button" onClick={() => onOpen({ kind: 'iss', name: z.name })}>
                <i className={'b-' + bin} aria-hidden="true" />
                <b>{z.name}</b>
                <small>{money(z.vol_bn)} · {razm(z.n)}<br />{binLabel(color, bin)}</small>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* ======================= table ======================= */
type SortK = 'name' | 'seg' | 'vol_bn' | 'n' | 'cov_med' | 'under' | 'spr_med' | 'spr_delta';
const COLS: [SortK, string, boolean][] = [
  ['name', 'Эмитент', false], ['seg', 'Тип', false], ['vol_bn', 'Привлечено', true], ['n', 'Размещений', true],
  ['cov_med', 'Медиана спроса', true], ['under', 'С недобором', true], ['spr_med', 'Медианный спред', true], ['spr_delta', 'К медиане типа', true],
];
function IssuerTable({ color, onOpen }: { color: ColorMode; onOpen: (name: string, el: HTMLElement) => void }) {
  const [k, setK] = useState<SortK>('vol_bn');
  const [dir, setDir] = useState(-1);
  const rows = useMemo(() => MAP.issuers.slice().sort((a, b) => {
    const x = k === 'seg' ? MSEG[a.seg].short : a[k];
    const y = k === 'seg' ? MSEG[b.seg].short : b[k];
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return (typeof x === 'string' ? x.localeCompare(y as string, 'ru') : (x as number) - (y as number)) * dir;
  }), [k, dir]);
  return (
    <div id="map-table" className="map-table">
      <p className="hint">Эмитенты 2026 года · нажмите строку, чтобы открыть сделки</p>
      <div className="scroll">
        <table className="tbl">
          <thead>
            <tr>
              {COLS.map(([key, label, num]) => (
                <th key={key} scope="col" className={num ? 'num' : undefined} aria-sort={k === key ? (dir > 0 ? 'ascending' : 'descending') : undefined}>
                  <button type="button" onClick={() => { if (k === key) setDir(-dir); else { setK(key); setDir(key === 'name' || key === 'seg' ? 1 : -1); } }}>
                    {label}<span aria-hidden="true" className="sort-ic">{k === key ? (dir > 0 ? '↑' : '↓') : ''}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((z) => {
              const bin = binOfIss(z, color);
              return (
                <tr
                  key={z.name} tabIndex={0} className="click-row"
                  onClick={(e) => onOpen(z.name, e.currentTarget)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(z.name, e.currentTarget); } }}
                  aria-label={`${z.name}: открыть сделки`}
                >
                  <td className="iss"><i className={'dot b-' + bin} aria-hidden="true" />{z.name}</td>
                  <td className="sub">{MSEG[z.seg].short}</td>
                  <td className="num">{money(z.vol_bn)}</td>
                  <td className="num">{z.n}</td>
                  <td className="num">{z.cov_med == null ? '—' : `${mfmt(z.cov_med, 1)}%`}</td>
                  <td className="num">{z.with_cov ? `${z.under} из ${z.with_cov}` : '—'}</td>
                  <td className="num">{z.spr_med == null ? '—' : sgnPP(z.spr_med)}</td>
                  <td className="num">{z.spr_delta == null ? '—' : sgnPP(z.spr_delta)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
