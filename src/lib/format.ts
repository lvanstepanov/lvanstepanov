// Russian number and text formatting. Narrow no-break space (U+202F) is what
// ru-RU toLocaleString uses for thousands; U+00A0 is used before units.

export const NB = ' ';
export const MINUS = '−';
export const PP = `п.${NB}п.`;

export function nf(v: number | null | undefined, d = 2): string {
  if (v == null || Number.isNaN(v)) return '—';
  return v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Signed number with typographic minus: «+3,72», «−0,07». */
export function sg(v: number | null | undefined, d = 2): string {
  if (v == null || Number.isNaN(v)) return '—';
  const zero = Math.abs(v) < Math.pow(10, -d) / 2;
  return (zero ? '' : v > 0 ? '+' : MINUS) + nf(Math.abs(v), d);
}

export function pf(v: number | null | undefined, d = 0): string {
  if (v == null || Number.isNaN(v)) return '—';
  return nf(v * 100, d) + '%';
}

export const dmy = (s: string) => `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}`;

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** «2 года», «1,5 года», «5 лет». */
export function yrs(t: number | null | undefined): string {
  if (t == null) return '—';
  const r = Math.round(t * 100) / 100;
  const digits = r % 1 === 0 ? 0 : Math.round(r * 10) === r * 10 ? 1 : 2;
  const w = nf(r, digits);
  const n = Math.abs(r);
  if (n % 1 !== 0) return `${w}${NB}года`;
  return `${w}${NB}${plural(n, 'год', 'года', 'лет')}`;
}

export const mln = (v: number) => `${nf(v, 0)}${NB}млн${NB}₸`;
