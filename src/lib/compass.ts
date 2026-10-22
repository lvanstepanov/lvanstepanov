// Pure calculations for KASE Compass. Mirrors compass-pack/reference/compass_reference.html
// (SPEC.md, section 3). No DOM here: everything is tested in compass.test.ts.
import raw from '../../compass-pack/data/compass_data.json';

export type SegKey = 'quasi' | 'bank' | 'corp' | 'mfo' | 'leas' | 'ifi';
export type BuyKey = 'ret' | 'bank' | 'inst' | 'bdo' | 'oth' | 'leg';

export interface Deal {
  id: number;
  d: string;
  iss: string;
  seg: SegKey;
  tk: string;
  ccy: 'KZT' | 'USD' | 'RUB';
  ten: number | null;
  met: string;
  prt: number | null;
  bid: number | null;
  cov: number | null;
  bmin: number | null;
  bmax: number | null;
  fin: number | null;
  knd: string | null;
  vol: number;
  src: string | null;
  ret: number | null;
  bank: number | null;
  inst: number | null;
  bdo: number | null;
  oth: number | null;
  leg: number | null;
  ini: string | null;
  gcb: number | null;
  spr: number | null;
}
/** Deal that has a spread: tenge, fixed rate. */
export type SprDeal = Deal & { spr: number; fin: number; ten: number; gcb: number };

export interface Auction { d: string; y: number; t: number }
export interface BtRow {
  d: string; tk: string; iss: string; seg: SegKey; t: number; rate: number;
  A: number | null; B: number | null; C: number | null; D: number | null; own: boolean;
}
export type Stick = Record<SegKey, { n: number; same: number }>;

interface Data { asof: string; deals: Deal[]; gcb: Auction[]; bt: BtRow[]; stick: Stick }
export const DATA = raw as unknown as Data;
export const { asof: ASOF, deals: DEALS, gcb: GCB, bt: BT, stick: STICK } = DATA;
export const NEWS = 'https://kase.kz/ru/information/news/show/';

export const SEGS: { k: SegKey; name: string; short: string; gen: string }[] = [
  { k: 'quasi', name: 'Квазигосударственные', short: 'Квазигос', gen: 'квазигосударственных эмитентов' },
  { k: 'bank', name: 'Банки', short: 'Банки', gen: 'банков' },
  { k: 'corp', name: 'Корпорации', short: 'Корпорации', gen: 'корпораций' },
  { k: 'mfo', name: 'Микрофинансовые организации', short: 'МФО', gen: 'МФО' },
  { k: 'leas', name: 'Лизинговые компании', short: 'Лизинг', gen: 'лизинговых компаний' },
  { k: 'ifi', name: 'Международные финорганизации', short: 'Межд. финорганизации', gen: 'международных финорганизаций' },
];
export const SEGBY = Object.fromEntries(SEGS.map((s) => [s.k, s])) as Record<SegKey, (typeof SEGS)[number]>;

export const BUY: { k: BuyKey; name: string }[] = [
  { k: 'ret', name: 'Физлица' },
  { k: 'bank', name: 'Банки' },
  { k: 'inst', name: 'Другие институционалы' },
  { k: 'bdo', name: 'Брокеры-дилеры' },
  { k: 'oth', name: 'Прочие юрлица' },
  { k: 'leg', name: 'Юрлица без разбивки' },
];

/* ---------- basics (3.1) ---------- */
const DAY = 86_400_000;
export const t0 = (s: string) => Date.parse(s + 'T00:00:00Z');
export const clip = (t: number) => Math.min(Math.max(t, 0.5), 15);

export function quantile(arr: (number | null | undefined)[], p: number): number | null {
  const v = arr.filter((x): x is number => x != null && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const h = (v.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return v[lo] + (v[hi] - v[lo]) * (h - lo);
}
export const median = (a: (number | null | undefined)[]) => quantile(a, 0.5);
export function mean(a: (number | null | undefined)[]): number | null {
  const v = a.filter((x): x is number => x != null && !Number.isNaN(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

/* ---------- GCB curve (3.2) ---------- */
export interface Curve { a: number; b: number; n: number; pts: Auction[]; last: string }

export function curveAt(date: string, win = 45): Curve | null {
  const d = t0(date);
  const pts = GCB.filter((p) => Math.abs(t0(p.d) - d) / DAY <= win);
  const n = pts.length;
  if (n < 3) return null;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (const p of pts) {
    const x = Math.log(clip(p.t));
    sx += x; sy += p.y; sxy += x * p.y; sxx += x * x;
  }
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const a = (sy - b * sx) / n;
  const last = pts.reduce((m, p) => (p.d > m ? p.d : m), '');
  return { a, b, n, pts, last };
}
export const yieldAt = (c: Curve, t: number) => c.a + c.b * Math.log(clip(t));
export const CNOW = curveAt(ASOF)!;
export const CMAY = curveAt('2026-05-15')!;

/* ---------- segment spreads (3.3) ---------- */
export interface SegStat { n: number; p25: number; p50: number; p75: number }
const sprDeals = DEALS.filter((d): d is SprDeal => d.spr != null);
export const SEGSTAT = Object.fromEntries(
  SEGS.map((s) => {
    const v = sprDeals.filter((d) => d.seg === s.k).map((d) => d.spr);
    return [s.k, { n: v.length, p25: quantile(v, 0.25)!, p50: quantile(v, 0.5)!, p75: quantile(v, 0.75)! }];
  }),
) as Record<SegKey, SegStat>;

/** Issuers with at least one spread deal, ru alphabetical. */
export const ISSUERS = Array.from(new Set(sprDeals.map((d) => d.iss))).sort((a, b) => a.localeCompare(b, 'ru'));

export function historyOf(iss: string): SprDeal[] {
  return sprDeals
    .filter((d) => d.iss === iss)
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.id - b.id));
}
export const segOfIssuer = (iss: string): SegKey => DEALS.find((x) => x.iss === iss)?.seg ?? 'corp';

/* ---------- guide (3.4, 3.5) ---------- */
export type Mode = 'repeat' | 'new';
export interface GuideInput { mode: Mode; iss: string; seg: SegKey; ten: number }
export interface Guide {
  mode: Mode;
  ten: number;
  g: number;
  seg: SegKey;
  lo: number; mid: number; hi: number;
  // repeat
  hist?: SprDeal[]; last?: SprDeal; keep?: number; rep?: number; dG?: number;
  // new
  st?: SegStat;
}

export function guide(inp: GuideInput): Guide {
  const g = yieldAt(CNOW, inp.ten);
  if (inp.mode === 'repeat') {
    const hist = historyOf(inp.iss);
    const last = hist[hist.length - 1];
    const keep = g + last.spr;
    const rep = last.fin;
    const lo = Math.min(keep, rep);
    const hi = Math.max(keep, rep);
    const dG = yieldAt(CNOW, last.ten) - last.gcb;
    return { mode: 'repeat', ten: inp.ten, g, seg: segOfIssuer(inp.iss), lo, hi, mid: (lo + hi) / 2, hist, last, keep, rep, dG };
  }
  const st = SEGSTAT[inp.seg];
  return { mode: 'new', ten: inp.ten, g, seg: inp.seg, st, lo: g + st.p25, mid: g + st.p50, hi: g + st.p75 };
}

/* ---------- money (3.6) ---------- */
/** Annual coupon, mln ₸, for a volume in bn ₸ and a rate in %. */
export const couponMln = (vol: number, rate: number) => vol * rate * 10;

/* ---------- variants (3.7) ---------- */
export interface Variant { ten: number; rate: number; perYear: number; total: number }
export function variant(vol: number, ten: number, rate: number): Variant {
  const perYear = couponMln(vol, rate);
  return { ten, rate, perYear, total: perYear * ten };
}

/* ---------- comparable deals (3.8) ---------- */
export interface CompRow { d: SprDeal; own: boolean }
export function comps(inp: GuideInput, out: Guide): CompRow[] {
  const lo = t0(ASOF) - 180 * DAY;
  const byTen = (a: SprDeal, b: SprDeal) => Math.abs(a.ten - out.ten) - Math.abs(b.ten - out.ten) || (a.d < b.d ? 1 : -1);
  if (inp.mode === 'repeat') {
    const own = out.hist!.slice(-4).reverse().map((d) => ({ d, own: true }));
    const peers = sprDeals
      .filter((d) => d.seg === out.seg && d.iss !== inp.iss && t0(d.d) >= lo)
      .sort(byTen)
      .slice(0, 5)
      .map((d) => ({ d, own: false }));
    return own.concat(peers);
  }
  return sprDeals
    .filter((d) => d.seg === out.seg && t0(d.d) >= lo)
    .sort(byTen)
    .slice(0, 8)
    .map((d) => ({ d, own: false }));
}

/* ---------- buyers (3.9) ---------- */
export interface Mix { n: number; mix: Record<BuyKey, number> }
export function buyerMix(list: Deal[]): Mix {
  const withB = list.filter((d) => d.src);
  const mix = {} as Record<BuyKey, number>;
  for (const b of BUY) mix[b.k] = withB.length ? mean(withB.map((d) => d[b.k] || 0))! : 0;
  return { n: withB.length, mix };
}
export function topBuyer(m: Mix) {
  return BUY.slice().sort((a, b) => m.mix[b.k] - m.mix[a.k])[0];
}

/* ---------- market window (3.10–3.12) ---------- */
export type WinStatus = 'open' | 'neutral' | 'closed' | 'few';
export const ST_LABEL: Record<WinStatus, string> = { closed: 'закрыто', open: 'открыто', neutral: 'нейтрально', few: 'мало сделок' };
export function statusOf(withCov: number, under: number): WinStatus {
  if (withCov < 3) return 'few';
  const sh = under / withCov;
  return sh >= 1 / 3 - 1e-9 ? 'closed' : sh <= 0.15 + 1e-9 ? 'open' : 'neutral';
}
const isUnder = (d: Deal) => d.cov != null && d.cov < 99.95;

export function marketTiles() {
  const withCov = DEALS.filter((d) => d.cov != null);
  const under = withCov.filter(isUnder);
  const rng = DEALS.filter((d) => d.bmin != null && d.bmax != null && d.fin != null && d.knd !== 'маржа');
  const same = rng.filter((d) => d.bmin === d.bmax);
  return {
    deals: DEALS.length,
    volTrn: DEALS.reduce((a, d) => a + (d.vol || 0), 0) / 1000,
    medCov: median(withCov.map((d) => d.cov))!,
    under: under.length, withCov: withCov.length,
    same: same.length, rng: rng.length,
  };
}

export interface WinRow { n: number; vol: number; withCov: number; under: number; medCov: number | null; st: WinStatus }
function winRow(list: Deal[]): WinRow {
  const c = list.filter((d) => d.cov != null);
  const u = c.filter(isUnder);
  return {
    n: list.length,
    vol: list.reduce((a, d) => a + (d.vol || 0), 0),
    withCov: c.length,
    under: u.length,
    medCov: median(c.map((d) => d.cov)),
    st: statusOf(c.length, u.length),
  };
}
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь'];
export function byMonth() {
  return MONTHS.map((name, i) => ({
    name: i === 9 ? 'Октябрь (1–19)' : name,
    short: name.slice(0, 3).toLowerCase(),
    ...winRow(DEALS.filter((d) => Number(d.d.slice(5, 7)) === i + 1)),
  }));
}
export function bySeg90() {
  const lo = t0(ASOF) - 90 * DAY;
  return SEGS.map((s) => {
    const list = DEALS.filter((x) => x.seg === s.k && t0(x.d) > lo);
    return { s, ...winRow(list), spr: median(list.map((x) => x.spr)), year: SEGSTAT[s.k].p50 };
  });
}

/* ---------- spreads chart ---------- */
export type Bucket = 'all' | 's' | 'm' | 'l';
export const BUCKETS: [Bucket, string][] = [['all', 'Все сроки'], ['s', 'До 1 года'], ['m', '1–3 года'], ['l', 'Больше 3 лет']];
export const inBucket = (b: Bucket, t: number) => b === 'all' || (b === 's' ? t <= 1 : b === 'm' ? t > 1 && t <= 3 : t > 3);
export const segsByMedian = () => SEGS.slice().sort((a, b) => SEGSTAT[a.k].p50 - SEGSTAT[b.k].p50);
export function spreadRows(b: Bucket) {
  return segsByMedian().map((s) => {
    const pts = sprDeals.filter((d) => d.seg === s.k && inBucket(b, d.ten));
    const v = pts.map((d) => d.spr);
    return { s, pts, p25: quantile(v, 0.25), p50: quantile(v, 0.5), p75: quantile(v, 0.75) };
  });
}

/* ---------- buyers by segment ---------- */
export function buyersBySeg() {
  return SEGS.map((s) => {
    const d = DEALS.filter((x) => x.seg === s.k);
    return { s, n: d.length, bm: buyerMix(d), r80: d.filter((x) => x.src && (x.ret || 0) >= 80).length };
  });
}

/* ---------- backtest (3.13, 3.15) ---------- */
type Method = 'A' | 'B' | 'C' | 'D';
export interface BtStat { n: number; mae: number; w05: number; k05: number }
const seen = (r: BtRow) => DEALS.some((d) => d.iss === r.iss && d.tk === r.tk && d.spr != null && d.d < r.d);
export function btStat(key: Method, filt?: (r: BtRow) => boolean): BtStat {
  const r = BT.filter((x) => x[key] != null && (!filt || filt(x)));
  const e = r.map((x) => Math.abs(x.rate - (x[key] as number)));
  const k05 = e.filter((v) => v <= 0.5 + 1e-9).length;
  return { n: r.length, mae: mean(e) ?? NaN, w05: r.length ? k05 / r.length : NaN, k05 };
}
export const BT_D = btStat('D');
export const BT_A = btStat('A');
export const BT_B = btStat('B');
export const BT_C = btStat('C', (x) => x.own);
export const BT_DOWN = btStat('D', (x) => x.own);
export const BT_NEW = btStat('A', (x) => !x.own);
export const BT_DN = btStat('D', (x) => !seen(x));
export const BT_BN = btStat('B', (x) => !seen(x));

/* ---------- sticky coupon (3.14) ---------- */
export const PRIV: SegKey[] = ['corp', 'mfo', 'leas'];
const sumStick = (keys: SegKey[]) => keys.reduce((a, k) => ({ n: a.n + STICK[k].n, same: a.same + STICK[k].same }), { n: 0, same: 0 });
export const STICK_PRIV = sumStick(PRIV);
export const STICK_ALL = sumStick(SEGS.map((s) => s.k));
export function stickLine(seg: SegKey): string {
  if (PRIV.includes(seg)) return `У лизинга, МФО и корпораций ${STICK_PRIV.same} из ${STICK_PRIV.n} новых выпусков 2026 года вышли с купоном прошлого выпуска.`;
  const v = STICK[seg];
  if (!v || v.n < 3) return '';
  return `У ${SEGBY[seg].gen} ${v.same} из ${v.n} новых выпусков 2026 года вышли с купоном прошлого выпуска.`;
}
