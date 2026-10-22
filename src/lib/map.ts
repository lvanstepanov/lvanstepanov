// «Карта рынка»: data, formats, colour bins and the treemap layout.
// Mirrors compass-map-pack/reference/map_reference.html (PROMPT_MAP.md, sections 3–6).
import { hierarchy, treemap, treemapSquarify, type HierarchyRectangularNode } from 'd3-hierarchy';
import raw from '../../compass-pack/data/map_data.json';
import { quantile } from './compass';
import { MINUS, NB, PP, plural } from './format';

export type SegCode = 'quasi' | 'bank' | 'corp' | 'mfo' | 'leas' | 'ifi';
export type Bin = 'w2' | 'w1' | 'n' | 'c1' | 'c2' | 'na';
export type SizeMode = 'vol' | 'n';
export type ColorMode = 'demand' | 'price';

export interface MapSeg {
  code: SegCode; name: string; short: string; issuers: number; n: number; vol_bn: number;
  vol_share: number; n_share: number; with_cov: number; under: number; cov_med: number | null;
  spr_n: number; spr_p50: number | null;
}
export interface MapIssuer {
  name: string; label: string; seg: SegCode; vol_bn: number; n: number; ccy: string[];
  first: string; last: string; with_cov: number; under: number; cov_med: number | null;
  spr_n: number; spr_med: number | null; seg_p50: number | null; spr_delta: number | null;
  ten_med: number | null; spr_na: string | null; cov_na: string | null;
  bin_demand: Bin; bin_price: Bin; in_guide: boolean; deal_ids: number[];
}
export interface MapDeal {
  id: number; d: string; iss: string; tk: string; ccy: string; ten: number | null; met: string;
  fin: number | null; knd: string | null; spr: number | null; cov: number | null; vol: number;
  prt: number | null; ini: string | null; url: string;
}
export interface BinDef { key: Bin; from: number | null; to: number | null; label: string }
interface MapData {
  asof: string; period: string; usd_rate: number; under_threshold: number;
  totals: { issuers: number; n: number; vol_bn: number };
  segments: MapSeg[]; issuers: MapIssuer[]; deals: MapDeal[];
  bins: Record<ColorMode, BinDef[]>;
  texts: Record<string, string>;
  acceptance: Record<string, unknown>;
}

export const MAP = raw as unknown as MapData;
export const MSEG = Object.fromEntries(MAP.segments.map((s) => [s.code, s])) as Record<SegCode, MapSeg>;
export const MDEAL = new Map(MAP.deals.map((d) => [d.id, d]));
export const MISS = new Map(MAP.issuers.map((z) => [z.name, z]));
export const TXT = MAP.texts;

/* ---------- formats (section 5) ---------- */
const fmt = (x: number, n = 1) => x.toLocaleString('ru-RU', { minimumFractionDigits: n, maximumFractionDigits: n });
export const sgnPP = (x: number, n = 2) => (x < 0 ? MINUS : '+') + fmt(Math.abs(x), n);
export { fmt as mfmt };

export function money(bn: number): string {
  if (bn >= 1000) return `${fmt(bn / 1000, 2)}${NB}трлн${NB}₸`;
  if (bn >= 1) return `${fmt(bn, 1)}${NB}млрд${NB}₸`;
  return `${fmt(bn * 1000, 0)}${NB}млн${NB}₸`;
}
export const razm = (n: number) => `${n}${NB}${plural(n, 'размещение', 'размещения', 'размещений')}`;
export const emit = (n: number) => `${n}${NB}${plural(n, 'эмитент', 'эмитента', 'эмитентов')}`;
export function years(t: number | null): string {
  if (t == null) return '—';
  if (t < 1) return `${Math.round(t * 12)}${NB}мес.`;
  if (Math.abs(t - Math.round(t)) < 1e-9) {
    const n = Math.round(t);
    return `${n}${NB}${plural(n, 'год', 'года', 'лет')}`;
  }
  return `${fmt(t, 2).replace(/0$/, '')}${NB}года`;
}
export function deltaText(d: number): string {
  if (Math.abs(d) < 0.25) return 'почти как у типа';
  return `${d > 0 ? 'дороже типа на ' : 'дешевле типа на '}${fmt(Math.abs(d), 2)}${NB}${PP}`;
}

/* ---------- bins (section 6) ---------- */
export function binOf(mode: ColorMode, x: number | null | undefined): Bin {
  if (x == null) return 'na';
  for (const b of MAP.bins[mode]) {
    const lo = b.from == null ? -Infinity : b.from;
    const hi = b.to == null ? Infinity : b.to;
    if (x >= lo && x < hi) return b.key;
  }
  return 'na';
}
export const binLabel = (mode: ColorMode, k: Bin) => (k === 'na' ? 'нет данных' : MAP.bins[mode].find((b) => b.key === k)!.label);

/* ---------- tiles ---------- */
export type Item =
  | { kind: 'iss'; key: string; seg: SegCode; z: MapIssuer; v: number }
  | { kind: 'more'; key: string; seg: SegCode; items: MapIssuer[]; v: number };

export interface Metric { v: number | null; bin: Bin }
export function metricOf(it: Item, color: ColorMode): Metric {
  if (it.kind === 'iss') return color === 'demand' ? { v: it.z.cov_med, bin: it.z.bin_demand } : { v: it.z.spr_delta, bin: it.z.bin_price };
  const ds = it.items.flatMap((z) => z.deal_ids.map((id) => MDEAL.get(id)!));
  if (color === 'demand') {
    const v = quantile(ds.filter((d) => d.cov != null).map((d) => d.cov), 0.5);
    return { v, bin: binOf('demand', v) };
  }
  const p50 = MSEG[it.seg].spr_p50 ?? 0;
  const v = quantile(ds.filter((d) => d.spr != null).map((d) => d.spr! - p50), 0.5);
  return { v, bin: binOf('price', v) };
}
export function metricText(m: Metric, color: ColorMode, long: boolean): string {
  if (color === 'demand') return m.v == null ? 'спрос: нет данных' : `спрос${NB}${fmt(m.v, 0)}%`;
  if (m.v == null) return 'спред: нет данных';
  return `${sgnPP(m.v)}${NB}${PP}${long ? ` к${NB}типу` : ''}`;
}

/* ---------- layout (section 4) ---------- */
export const HEADER = 22;
export const HEADER_S = 16;
export const MIN_SIDE = 16;
export function headerOf(w: number, h: number): number {
  if (w >= 96 && h >= 64) return HEADER;
  if (w >= 56 && h >= 40) return HEADER_S;
  return 0;
}
export function mapHeight(W: number): number {
  if (W >= 900) return 620;
  if (W >= 600) return 560;
  return Math.max(520, Math.min(680, Math.round(W * 1.6)));
}

export interface Rect { x0: number; y0: number; x1: number; y1: number }
export interface GroupBox extends Rect { seg: MapSeg; header: number }
export interface TileBox extends Rect { item: Item }
export interface Layout { groups: GroupBox[]; tiles: TileBox[] }

type Node = { kind: 'root' | 'seg'; seg?: MapSeg; children: (Node | Item)[] } | Item;

export function layoutMap(issuers: MapIssuer[], size: SizeMode, W: number, H: number): Layout {
  const val = (z: MapIssuer) => (size === 'vol' ? z.vol_bn : z.n);
  const groups: { kind: 'seg'; seg: MapSeg; children: Item[] }[] = MAP.segments.map((s) => ({
    kind: 'seg',
    seg: s,
    children: issuers.filter((z) => z.seg === s.code).map((z) => ({ kind: 'iss' as const, key: 'i:' + z.name, seg: s.code, z, v: val(z) })),
  }));
  const run = () =>
    treemap<Node>()
      .size([W, H])
      .tile(treemapSquarify.ratio(1))
      .round(true)
      .paddingInner((n) => (n.depth === 0 ? 8 : 2))
      .paddingTop((n) => (n.depth === 1 ? headerOf(n.x1 - n.x0, n.y1 - n.y0) : 0))(
      hierarchy<Node>({ kind: 'root', children: groups }, (d) => ('children' in d ? d.children : undefined))
        .sum((d) => ('v' in d ? d.v : 0))
        .sort((a, b) => Number(a.data.kind === 'more') - Number(b.data.kind === 'more') || (b.value ?? 0) - (a.value ?? 0)),
    );
  let root = run();
  let again = false;
  for (const g of root.children ?? []) {
    const tiny = (g.children ?? []).filter((l) => l.data.kind === 'iss' && Math.min(l.x1 - l.x0, l.y1 - l.y0) < MIN_SIDE);
    if (tiny.length >= 2) {
      const grp = g.data as (typeof groups)[number];
      const names = new Set(tiny.map((l) => (l.data as Extract<Item, { kind: 'iss' }>).z.name));
      const moved = grp.children.filter((c) => c.kind === 'iss' && names.has(c.z.name)) as Extract<Item, { kind: 'iss' }>[];
      grp.children = grp.children.filter((c) => !(c.kind === 'iss' && names.has(c.z.name)));
      grp.children.push({ kind: 'more', key: 'm:' + grp.seg.code, seg: grp.seg.code, items: moved.map((c) => c.z), v: moved.reduce((s, c) => s + c.v, 0) });
      again = true;
    }
  }
  if (again) root = run();
  const box = (n: HierarchyRectangularNode<Node>): Rect => ({ x0: n.x0, y0: n.y0, x1: n.x1, y1: n.y1 });
  return {
    groups: (root.children ?? []).map((g) => ({ ...box(g), seg: (g.data as { seg: MapSeg }).seg, header: headerOf(g.x1 - g.x0, g.y1 - g.y0) })),
    tiles: root.leaves().map((l) => ({ ...box(l), item: l.data as Item })),
  };
}

/* ---------- label zones (section 5) ---------- */
export type Zone = 'xl' | 'l' | 'm' | 's' | 'xs';
export function zone(w: number, h: number): Zone {
  if (w >= 220 && h >= 130) return 'xl';
  if (w >= 130 && h >= 80) return 'l';
  if (w >= 84 && h >= 46) return 'm';
  if (w >= 54 && h >= 26) return 's';
  return 'xs';
}
