// «Карта рынка»: map_data.json against compass_data.json, control figures and layout properties
// (PROMPT_MAP.md, sections 3.2 and 9).
import { describe, expect, it } from 'vitest';
import { DEALS, SEGSTAT, median, type Deal } from './compass';
import { MAP, MISS, MSEG, binOf, layoutMap, mapHeight, money, type Bin } from './map';

const near = (a: number | null, b: number | null, tol = 0.01) => {
  if (a == null || b == null) return expect(a).toBe(b);
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol + 1e-9);
};
const acc = MAP.acceptance as {
  segments: Record<string, { issuers: number; n: number; vol_bn: number; under: number; with_cov: number; spr_p50: number }>;
  check_issuers: Record<string, { n: number; vol_bn: number; cov_med: number | null; under: number; with_cov: number; spr_med: number | null; spr_delta: number | null; bin_demand: Bin; bin_price: Bin; in_guide: boolean }>;
  bins_demand: Record<Bin, number>;
  bins_price: Record<Bin, number>;
  top_vol: [string, number, number][];
  top_n: [string, number][];
  priv: { vol_bn: number; vol_share: number; n: number };
};

function agg(list: Deal[]) {
  const cov = list.map((d) => d.cov).filter((x): x is number => x != null);
  return {
    n: list.length,
    vol: list.reduce((s, d) => s + d.vol, 0),
    with_cov: cov.length,
    under: cov.filter((c) => c < 99.95).length,
    cov_med: median(cov),
    spr_med: median(list.map((d) => d.spr)),
  };
}

describe('map totals from compass_data.json', () => {
  it('41 issuers, 187 deals, 3241.837 bn = «3,24 трлн ₸»', () => {
    expect(MAP.totals.issuers).toBe(41);
    expect(new Set(DEALS.map((d) => d.iss)).size).toBe(41);
    expect(MAP.totals.n).toBe(187);
    near(DEALS.reduce((s, d) => s + d.vol, 0), MAP.totals.vol_bn);
    near(MAP.totals.vol_bn, 3241.837, 0.001);
    expect(money(MAP.totals.vol_bn)).toBe('3,24 трлн ₸');
  });
  for (const s of MAP.segments) {
    it(`segment ${s.code}`, () => {
      const list = DEALS.filter((d) => d.seg === s.code);
      const a = agg(list);
      const e = acc.segments[s.code];
      expect(new Set(list.map((d) => d.iss)).size).toBe(e.issuers);
      expect(a.n).toBe(e.n);
      near(a.vol, s.vol_bn);
      near(Math.round(a.vol * 10) / 10, e.vol_bn);
      expect([a.under, a.with_cov]).toEqual([e.under, e.with_cov]);
      near(SEGSTAT[s.code].p50, e.spr_p50, 0.001);
      near(s.spr_p50, e.spr_p50, 0.001);
    });
  }
  it('quasi share 65,4%; MFO + leasing + corp 150,5 bn (4,6%), 65 deals', () => {
    near(MSEG.quasi.vol_share, 65.38);
    const priv = DEALS.filter((d) => ['mfo', 'leas', 'corp'].includes(d.seg));
    near(priv.reduce((s, d) => s + d.vol, 0), 150.5, 0.05);
    expect(priv.length).toBe(65);
    expect(acc.priv).toEqual({ vol_bn: 150.5, vol_share: 4.6, n: 65 });
  });
});

describe('control issuers', () => {
  for (const [name, e] of Object.entries(acc.check_issuers)) {
    it(name, () => {
      const list = DEALS.filter((d) => d.iss === name);
      const a = agg(list);
      const seg = list[0].seg;
      const sprMed = a.spr_med;
      const delta = sprMed == null ? null : sprMed - SEGSTAT[seg].p50;
      expect(a.n).toBe(e.n);
      near(a.vol, e.vol_bn, 0.001);
      near(a.cov_med, e.cov_med);
      expect([a.under, a.with_cov]).toEqual([e.under, e.with_cov]);
      near(sprMed, e.spr_med);
      near(delta, e.spr_delta);
      expect(binOf('demand', a.cov_med)).toBe(e.bin_demand);
      expect(binOf('price', delta)).toBe(e.bin_price);
      expect(list.some((d) => d.spr != null)).toBe(e.in_guide);
      const z = MISS.get(name)!;
      expect([z.n, z.bin_demand, z.bin_price, z.in_guide]).toEqual([e.n, e.bin_demand, e.bin_price, e.in_guide]);
      near(z.cov_med, e.cov_med);
      near(z.spr_delta, e.spr_delta);
    });
  }
  it('KMF Банк: 9; 29,221; 100,4%; 4 из 9; +4,72; +1,82; n; w2', () => {
    const z = MISS.get('KMF Банк')!;
    expect([z.n, z.under, z.with_cov, z.bin_demand, z.bin_price]).toEqual([9, 4, 9, 'n', 'w2']);
    near(z.vol_bn, 29.221, 0.001);
    near(z.spr_med, 4.72);
    near(z.spr_delta, 1.82);
  });
  it('Самрук-Қазына: no spread (floating), not in guide', () => {
    const z = MISS.get('Самрук-Қазына')!;
    expect([z.spr_med, z.bin_price, z.in_guide, z.spr_na]).toEqual([null, 'na', false, 'плавающая ставка']);
  });
});

describe('bins and leaders', () => {
  const count = (k: 'bin_demand' | 'bin_price') => MAP.issuers.reduce((a, z) => ({ ...a, [z[k]]: (a[z[k]] || 0) + 1 }), {} as Record<string, number>);
  it('demand: w2 6, w1 3, n 18, c1 11, c2 1, na 2', () => {
    expect(count('bin_demand')).toEqual({ w2: 6, w1: 3, n: 18, c1: 11, c2: 1, na: 2 });
    for (const z of MAP.issuers) expect(binOf('demand', z.cov_med)).toBe(z.bin_demand);
  });
  it('price: c2 5, c1 7, n 4, w1 7, w2 10, na 8', () => {
    expect(count('bin_price')).toEqual({ c2: 5, c1: 7, n: 4, w1: 7, w2: 10, na: 8 });
    for (const z of MAP.issuers) expect(binOf('price', z.spr_delta)).toBe(z.bin_price);
  });
  it('largest by volume and most frequent', () => {
    const byVol = MAP.issuers.slice().sort((a, b) => b.vol_bn - a.vol_bn).slice(0, 3).map((z) => [z.name, Math.round(z.vol_bn * 10) / 10, z.n]);
    expect(byVol).toEqual([['Самрук-Қазына', 490.7, 8], ['Байтерек', 484.5, 8], ['Отбасы банк', 350, 7]]);
    const byN = MAP.issuers.slice().sort((a, b) => b.n - a.n || b.vol_bn - a.vol_bn).slice(0, 4).map((z) => [z.name, z.n]);
    expect(byN).toEqual(acc.top_n);
  });
  it('texts are the computed ones', () => {
    expect(MAP.texts.title_vol).toBe('65% денег рынка привлекли квазигосударственные компании');
    expect(MAP.texts.title_cnt).toBe('МФО, лизинг и корпорации провели 65 из 187 размещений');
  });
});

describe('layout', () => {
  const overlap = (a: { x0: number; y0: number; x1: number; y1: number }, b: typeof a) =>
    Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0;
  for (const size of ['vol', 'n'] as const) {
    for (const W of [360, 390, 1024, 1232]) {
      it(`${size} @ ${W}px`, () => {
        const H = mapHeight(W);
        const L = layoutMap(MAP.issuers, size, W, H);
        // every issuer is placed exactly once
        const names = L.tiles.flatMap((t) => (t.item.kind === 'iss' ? [t.item.z.name] : t.item.items.map((z) => z.name)));
        expect(names.sort()).toEqual(MAP.issuers.map((z) => z.name).sort());
        // inside the map and not overlapping
        for (const t of L.tiles) {
          expect(t.x0).toBeGreaterThanOrEqual(0);
          expect(t.y0).toBeGreaterThanOrEqual(0);
          expect(t.x1).toBeLessThanOrEqual(W);
          expect(t.y1).toBeLessThanOrEqual(H);
        }
        for (let i = 0; i < L.tiles.length; i++) for (let j = i + 1; j < L.tiles.length; j++) expect(overlap(L.tiles[i], L.tiles[j])).toBe(false);
        for (let i = 0; i < L.groups.length; i++) for (let j = i + 1; j < L.groups.length; j++) expect(overlap(L.groups[i], L.groups[j])).toBe(false);
        // group area ∝ group value, up to headers and gaps
        const total = L.groups.reduce((s, g) => s + (g.x1 - g.x0 + 8) * (g.y1 - g.y0 + 8), 0);
        const vt = MAP.issuers.reduce((s, z) => s + (size === 'vol' ? z.vol_bn : z.n), 0);
        for (const g of L.groups) {
          const share = ((g.x1 - g.x0 + 8) * (g.y1 - g.y0 + 8)) / total;
          const vs = (size === 'vol' ? g.seg.vol_bn : g.seg.n) / vt;
          expect(Math.abs(share - vs)).toBeLessThan(0.02);
        }
        // tile area ∝ tile value inside its group, up to the 2 px gaps and rounding
        for (const g of L.groups) {
          const ts = L.tiles.filter((t) => t.item.seg === g.seg.code);
          const inner = ts.reduce((s, t) => s + (t.x1 - t.x0 + 2) * (t.y1 - t.y0 + 2), 0);
          const vg = ts.reduce((s, t) => s + t.item.v, 0);
          for (const t of ts) {
            const a = ((t.x1 - t.x0 + 2) * (t.y1 - t.y0 + 2)) / inner;
            const v = t.item.v / vg;
            const side = Math.min(t.x1 - t.x0, t.y1 - t.y0);
            expect(Math.abs(a - v)).toBeLessThan(side >= 40 ? 0.02 : 0.05);
          }
        }
      });
    }
  }
  it('small tiles merge into «ещё N» on a phone, none in «Размещения» on desktop', () => {
    const phone = layoutMap(MAP.issuers, 'vol', 390, mapHeight(390));
    expect(phone.tiles.some((t) => t.item.kind === 'more')).toBe(true);
    const desk = layoutMap(MAP.issuers, 'n', 1232, mapHeight(1232));
    expect(desk.tiles.some((t) => t.item.kind === 'more')).toBe(false);
    // the «ещё N» tile is last in its group order and keeps a stable key
    for (const t of phone.tiles) if (t.item.kind === 'more') expect(t.item.key).toBe('m:' + t.item.seg);
  });
  it('KFU tile in «Размещения» is 34 deals', () => {
    const L = layoutMap(MAP.issuers, 'n', 1232, 620);
    const t = L.tiles.find((x) => x.item.kind === 'iss' && x.item.z.name === 'Казахстанский фонд устойчивости')!;
    expect(t.item.v).toBe(34);
  });
});
