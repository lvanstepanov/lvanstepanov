// Shared navigation state between screens: the guide keeps its inputs while the user
// visits the map, and the map can hand an issuer over to the guide (PROMPT_MAP.md, 7.3).
import type { Mode, SegKey } from './compass';

export interface GuideMemory { mode: Mode; iss: string; seg: SegKey; ten: number; vol: number }
export const guideMemory: GuideMemory = { mode: 'repeat', iss: 'BI Development Ltd.', seg: 'mfo', ten: 2, vol: 2 };

/** «#map?size=n&color=price» → { view: 'map', params } */
export function parseHash(hash = location.hash) {
  const h = hash.replace(/^#/, '');
  const i = h.indexOf('?');
  return { view: i < 0 ? h : h.slice(0, i), params: new URLSearchParams(i < 0 ? '' : h.slice(i + 1)) };
}

/** Rewrites the hash without a hashchange event (keeps the view mounted). */
export function replaceHash(view: string, params: Record<string, string | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null) p.set(k, v);
  const q = p.toString();
  history.replaceState(null, '', '#' + view + (q ? '?' + q : ''));
}

export function openGuideFor(iss: string) {
  guideMemory.mode = 'repeat';
  guideMemory.iss = iss;
  location.hash = 'guide';
}
