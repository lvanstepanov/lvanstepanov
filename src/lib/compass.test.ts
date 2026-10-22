// Control figures from SPEC.md, section 6, and data/acceptance.json.
import { describe, expect, it } from 'vitest';
import acc from '../../compass-pack/data/acceptance.json';
import {
  BT_A, BT_B, BT_BN, BT_C, BT_D, BT_DN, BT_DOWN, BT_NEW, CMAY, CNOW, DEALS, SEGS, SEGSTAT, STICK, STICK_ALL, STICK_PRIV,
  buyersBySeg, couponMln, guide, marketTiles, stickLine, yieldAt,
} from './compass';
import { nf } from './format';

const near = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol + 1e-9);
const corridor = (g: { lo: number; hi: number }) => `${nf(g.lo, 1)}–${nf(g.hi, 1)}`;

describe('GCB curve', () => {
  it('19.10.2026: 20 auctions, a, b', () => {
    expect(CNOW.n).toBe(20);
    expect(CNOW.last).toBe('2026-10-20');
    near(CNOW.a, 15.7178, 0.0001);
    near(CNOW.b, -0.7968, 0.0001);
  });
  it('yields 1/2/3/5 years', () => {
    near(yieldAt(CNOW, 1), 15.72);
    near(yieldAt(CNOW, 2), 15.17);
    near(yieldAt(CNOW, 3), 14.84);
    near(yieldAt(CNOW, 5), 14.44);
  });
  it('15.05.2026: 23 auctions, 2y 16.58, drop 1.42', () => {
    expect(CMAY.n).toBe(23);
    near(yieldAt(CMAY, 2), 16.58);
    near(yieldAt(CMAY, 2) - yieldAt(CNOW, 2), 1.42);
  });
});

describe('segment spreads', () => {
  for (const s of SEGS) {
    it(s.k, () => {
      const e = acc.segstat[s.k];
      const g = SEGSTAT[s.k];
      expect(g.n).toBe(e.n);
      near(g.p25, e.p25, 0.001);
      near(g.p50, e.p50, 0.001);
      near(g.p75, e.p75, 0.001);
    });
  }
  it('145 deals with spread', () => {
    expect(DEALS.filter((d) => d.spr != null).length).toBe(145);
  });
});

describe('guide, repeat issuer', () => {
  it('BI Development Ltd., 2 years, 2 bn', () => {
    const g = guide({ mode: 'repeat', iss: 'BI Development Ltd.', seg: 'mfo', ten: 2 });
    expect(g.last!.tk).toBe('BIGDb11');
    expect(g.last!.d).toBe('2026-06-09');
    expect(g.hist!.length).toBe(5);
    near(g.last!.fin, 20);
    near(g.last!.spr, 3.72);
    near(g.keep!, 18.89);
    near(g.rep!, 20);
    near(g.mid, 19.44);
    near(g.dG!, -1.11);
    near(g.rep! - g.g, 4.83);
    near(couponMln(2, g.rep! - g.keep!), 22.3, 0.05);
    expect(corridor(g)).toBe('18,9–20,0');
  });
  it('KMF Банк, 2 years, 6 bn', () => {
    const g = guide({ mode: 'repeat', iss: 'KMF Банк', seg: 'mfo', ten: 2 });
    expect(g.last!.tk).toBe('MFKMb10');
    expect(g.last!.d).toBe('2026-06-15');
    near(g.last!.fin, 21);
    near(g.last!.spr, 4.88);
    near(g.keep!, 20.05);
    near(g.dG!, -0.95);
    near(couponMln(6, g.rep! - g.keep!), 57.3, 0.05);
    expect(corridor(g)).toBe('20,0–21,0');
  });
});

describe('guide, new issuer', () => {
  it('MFO, 2 years', () => {
    const g = guide({ mode: 'new', iss: '', seg: 'mfo', ten: 2 });
    near(g.lo, 20.72);
    near(g.mid, 21.58);
    near(g.hi, 21.99);
    expect(corridor(g)).toBe('20,7–22,0');
  });
  it('leasing, 3 years', () => {
    const g = guide({ mode: 'new', iss: '', seg: 'leas', ten: 3 });
    near(g.g, 14.84);
    expect(corridor(g)).toBe('20,3–22,3');
  });
});

describe('backtest', () => {
  it('D (Compass): 110, MAE 0.70, 70 within (64%)', () => {
    expect(BT_D.n).toBe(110);
    near(BT_D.mae, 0.7);
    expect(BT_D.k05).toBe(70);
    expect(Math.round(BT_D.w05 * 100)).toBe(64);
  });
  it('B: MAE 1.04, 49 (45%)', () => {
    near(BT_B.mae, 1.04);
    expect(BT_B.k05).toBe(49);
    expect(Math.round(BT_B.w05 * 100)).toBe(45);
  });
  it('A: MAE 1.12, 32 (29%)', () => {
    near(BT_A.mae, 1.12);
    expect(BT_A.k05).toBe(32);
    expect(Math.round(BT_A.w05 * 100)).toBe(29);
  });
  it('repeat issuers C / D: n 89, MAE 0.28 / 0.32', () => {
    expect(BT_C.n).toBe(89);
    expect(BT_DOWN.n).toBe(89);
    near(BT_C.mae, 0.28);
    near(BT_DOWN.mae, 0.32);
  });
  it('new issuers A: n 21, MAE 2.32', () => {
    expect(BT_NEW.n).toBe(21);
    near(BT_NEW.mae, 2.32);
  });
  it('without re-placements: 87; D 50 (57%); B 35 (40%)', () => {
    expect(BT_DN.n).toBe(87);
    expect(BT_DN.k05).toBe(50);
    expect(BT_BN.k05).toBe(35);
    expect(Math.round(BT_DN.w05 * 100)).toBe(57);
    expect(Math.round(BT_BN.w05 * 100)).toBe(40);
  });
});

describe('sticky coupon', () => {
  it('27 of 81, private 13 of 14, ifi 0 of 9, quasi 7 of 43, banks 7 of 15', () => {
    expect(STICK_ALL).toEqual({ n: 81, same: 27 });
    expect(STICK_PRIV).toEqual({ n: 14, same: 13 });
    expect(STICK.ifi).toEqual({ n: 9, same: 0 });
    expect(STICK.quasi).toEqual({ n: 43, same: 7 });
    expect(STICK.bank).toEqual({ n: 15, same: 7 });
    expect(stickLine('leas')).toContain('13 из 14');
    expect(stickLine('bank')).toContain('У банков 7 из 15');
  });
});

describe('market tiles', () => {
  it('187; 3.24 trn; 100.9%; 20% (34 of 167); 61% (104 of 170)', () => {
    const m = marketTiles();
    expect(m.deals).toBe(187);
    near(m.volTrn, 3.242, 0.001);
    near(m.medCov, 100.9, 0.05);
    expect([m.under, m.withCov]).toEqual([34, 167]);
    expect([m.same, m.rng]).toEqual([104, 170]);
    expect(Math.round((m.under / m.withCov) * 100)).toBe(20);
    expect(Math.round((m.same / m.rng) * 100)).toBe(61);
  });
});

describe('buyers', () => {
  it('leasing retail 76%, 13 of 21 ≥80%; MFO 39%; quasi banks 37%, inst 39%', () => {
    const r = buyersBySeg();
    const L = r.find((x) => x.s.k === 'leas')!;
    const M = r.find((x) => x.s.k === 'mfo')!;
    const Q = r.find((x) => x.s.k === 'quasi')!;
    expect(Math.round(L.bm.mix.ret)).toBe(76);
    expect([L.r80, L.bm.n]).toEqual([13, 21]);
    expect(Math.round(M.bm.mix.ret)).toBe(39);
    expect(Math.round(Q.bm.mix.bank)).toBe(37);
    expect(Math.round(Q.bm.mix.inst)).toBe(39);
  });
});
