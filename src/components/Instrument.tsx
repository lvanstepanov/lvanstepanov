// Compass instrument: 12–26 % a year on a 240° dial (−120°…+120° from vertical).
// Brass arc — corridor [lo, hi]; blue tick — GCB of the same tenor; needle — corridor middle.
import { nf, sg, PP } from '../lib/format';

const VMIN = 12;
const VMAX = 26;
const C = 150;
const R_RING = 132;
const R_ARC = 141;
const R_BR = 96;

const ang = (v: number) => -120 + ((Math.min(Math.max(v, VMIN), VMAX) - VMIN) / (VMAX - VMIN)) * 240;
const pt = (a: number, r: number): [number, number] => {
  const rad = (a * Math.PI) / 180;
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)];
};
const arcD = (r: number) => {
  const [x0, y0] = pt(-120, r);
  const [x1, y1] = pt(120, r);
  return `M${x0} ${y0}A${r} ${r} 0 1 1 ${x1} ${y1}`;
};

const ticks: { v: number; major: boolean }[] = [];
for (let v = VMIN; v <= VMAX + 1e-9; v += 0.5) ticks.push({ v, major: Math.abs(v % 2) < 1e-9 });

const ROT = { transformOrigin: `${C}px ${C}px`, transformBox: 'view-box' as const };
const MOVE = 'transform 600ms cubic-bezier(.16,1,.3,1), stroke-dasharray 600ms cubic-bezier(.16,1,.3,1), stroke-dashoffset 600ms cubic-bezier(.16,1,.3,1)';

export function Instrument({ lo, hi, g, spread, spreadTo, size, spreadLabel = 'спред' }: {
  lo: number; hi: number; g: number; spread: number; spreadTo: number; size: number; spreadLabel?: string;
}) {
  const mid = (lo + hi) / 2;
  const a0 = ang(lo);
  const a1 = ang(hi);
  const aG = ang(g);
  const aM = ang(mid);
  const aS = ang(spreadTo);
  const bA = Math.min(aG, aS);
  const bB = Math.max(aG, aS);
  const label = `${spreadLabel} ${sg(spread, 1)}${' '}${PP}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 300"
      role="img"
      aria-label={`Шкала ставок 12–26%: коридор ${nf(lo, 1)}–${nf(hi, 1)}%, ГЦБ ${nf(g, 2)}%, ${label}`}
      className="instrument"
    >
      <circle cx={C} cy={C} r={148} fill="var(--surface)" stroke="var(--line)" strokeWidth="1" />
      <circle cx={C} cy={C} r={R_RING} fill="none" stroke="var(--line)" strokeWidth="1" />
      <circle cx={C} cy={C} r={62} fill="none" stroke="var(--grid)" strokeWidth="1" />
      <path d={`M${C} 40V260M40 ${C}H260`} stroke="var(--grid)" strokeWidth="1" strokeDasharray="2 6" />

      {ticks.map(({ v, major }) => {
        const a = ang(v);
        const [x0, y0] = pt(a, R_RING);
        const [x1, y1] = pt(a, R_RING - (major ? 12 : 6));
        return <line key={v} x1={x0} y1={y0} x2={x1} y2={y1} stroke={major ? 'var(--text-2)' : 'var(--muted)'} strokeOpacity={major ? 0.9 : 0.55} strokeWidth={major ? 1.25 : 1} />;
      })}
      {ticks.filter((t) => t.major).map(({ v }) => {
        const [x, y] = pt(ang(v), R_RING - 26);
        return (
          <text key={v} x={x} y={y + 4} textAnchor="middle" style={{ font: '500 11px var(--f-mono)', fill: 'var(--muted)' }}>
            {v}
          </text>
        );
      })}

      {/* corridor */}
      <path
        d={arcD(R_ARC)}
        pathLength={240}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
        style={{ strokeDasharray: `${Math.max(0.6, a1 - a0)} 1000`, strokeDashoffset: -(a0 + 120), transition: MOVE }}
      />

      {/* spread bracket: GCB → anchor */}
      <path
        d={arcD(R_BR)}
        pathLength={240}
        fill="none"
        stroke="var(--data)"
        strokeOpacity=".55"
        strokeWidth="1"
        strokeDasharray="1 0"
        style={{ strokeDasharray: `${Math.max(0, bB - bA)} 1000`, strokeDashoffset: -(bA + 120), transition: MOVE }}
      />
      {/* GCB tick */}
      <g style={{ ...ROT, transform: `rotate(${aG}deg)`, transition: MOVE }}>
        <line x1={C} y1={C - R_BR + 4} x2={C} y2={C - R_ARC - 6} stroke="var(--data)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={C} cy={C - R_BR} r="2.5" fill="var(--data)" />
      </g>
      {/* spread anchor end */}
      <g style={{ ...ROT, transform: `rotate(${aS}deg)`, transition: MOVE }}>
        <circle cx={C} cy={C - R_BR} r="2.5" fill="var(--surface)" stroke="var(--data)" strokeWidth="1.25" />
      </g>

      {/* needle */}
      <g style={{ ...ROT, transform: `rotate(${aM}deg)`, transition: MOVE }}>
        <path d={`M${C} ${C - 112}L${C + 6} ${C}L${C - 6} ${C}Z`} fill="var(--accent)" />
        <path d={`M${C} ${C + 40}L${C + 6} ${C}L${C - 6} ${C}Z`} fill="var(--text-2)" />
      </g>
      <circle cx={C} cy={C} r="9" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2" />
      <circle cx={C} cy={C} r="3" fill="var(--accent)" />

      <text x={C} y={C + 72} textAnchor="middle" style={{ font: '500 10px var(--f-mono)', letterSpacing: '0.12em', fill: 'var(--muted)' }}>
        СЕРЕДИНА
      </text>
      <text x={C} y={C + 97} textAnchor="middle" style={{ font: '600 20px var(--f-num)', fill: 'var(--text)' }}>
        {nf(mid, 2)}%
      </text>
      <text x={C} y={C + 122} textAnchor="middle" style={{ font: '500 11px var(--f-mono)', fill: 'var(--data-text)' }}>
        {label}
      </text>
    </svg>
  );
}
