import { useRef, useState } from 'react';
import { BUCKETS, CMAY, CNOW, SEGSTAT, segsByMedian, spreadRows, yieldAt, type Bucket, type Curve } from '../lib/compass';
import { MINUS, NB, PP, dmy, nf, plural, sg, yrs } from '../lib/format';
import { ChartBlock, PageHead, lin, useTip, useTipRaw } from '../components/ui';

export function Spreads() {
  const [b, setB] = useState<Bucket>('all');
  const rows = spreadRows(b);
  const ord = segsByMedian();
  const lo = ord[0];
  const hi = ord[ord.length - 1];
  const title = b === 'all'
    ? `Медианный спред — от ${sg(SEGSTAT[lo.k].p50, 1)}${NB}${PP} у ${lo.gen} до ${sg(SEGSTAT[hi.k].p50, 1)} у ${hi.gen}`
    : `Спред по типам эмитентов: ${BUCKETS.find((x) => x[0] === b)![1].toLowerCase()}`;
  const may2 = yieldAt(CMAY, 2);
  const now2 = yieldAt(CNOW, 2);
  return (
    <>
      <PageHead
        eyebrow="03 · Спреды к ГЦБ"
        title="Цена риска: спред к ГЦБ того же срока"
        lede="Спред — ставка размещения минус доходность ГЦБ того же срока на дату сделки. Так сравнимы выпуски разных сроков и месяцев. Размещения в тенге с фиксированной ставкой."
      />
      <ChartBlock
        id="sp"
        title={title}
        controls={
          <div className="pills" role="group" aria-label="Срок до погашения" style={{ marginTop: 16 }}>
            {BUCKETS.map(([k, l]) => (
              <button key={k} type="button" className="pill" aria-pressed={b === k} onClick={() => setB(k)}>{l}</button>
            ))}
          </div>
        }
        legend={
          <div className="legend">
            <span><i className="key dot" style={{ background: 'var(--muted)', opacity: 0.7 }} />размещение</span>
            <span><i className="key" style={{ background: 'var(--data-soft)' }} />средние 50% сделок</span>
            <span><i className="key line" style={{ background: 'var(--data)', height: 3 }} />медиана</span>
          </div>
        }
        chart={(w) => <SpreadChart w={w} rows={rows} />}
        table={
          <table className="tbl">
            <thead><tr><th scope="col">Тип эмитента</th><th className="num" scope="col">Сделок</th><th className="num" scope="col">p25</th><th className="num" scope="col">Медиана</th><th className="num" scope="col">p75</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.s.k}><td>{r.s.name}</td><td className="num">{r.pts.length}</td><td className="num">{sg(r.p25)}</td><td className="num">{sg(r.p50)}</td><td className="num">{sg(r.p75)}</td></tr>
              ))}
            </tbody>
          </table>
        }
        after={<p className="note" style={{ marginTop: 8 }}>Наведите на точку, чтобы увидеть выпуск. Все значения — в разделе «База размещений».</p>}
      />

      <ChartBlock
        id="cv"
        title="Кривая ГЦБ перевёрнута и сместилась вниз"
        legend={
          <div className="legend">
            <span><i className="key line" style={{ background: 'var(--data-soft)', height: 2 }} />кривая на 15.05.2026 · {CMAY.n} аукционов</span>
            <span><i className="key line" style={{ background: 'var(--data)', height: 3 }} />кривая на 19.10.2026 · {CNOW.n} аукционов</span>
          </div>
        }
        chart={(w) => <CurveChart w={w} />}
        table={
          <table className="tbl">
            <thead><tr><th scope="col">Срок</th><th className="num" scope="col">15.05.2026, %</th><th className="num" scope="col">19.10.2026, %</th><th className="num" scope="col">Разница, {PP}</th></tr></thead>
            <tbody>
              {[0.5, 1, 2, 3, 5, 7, 10, 15].map((t) => (
                <tr key={t}><td>{yrs(t)}</td><td className="num">{nf(yieldAt(CMAY, t), 2)}</td><td className="num">{nf(yieldAt(CNOW, t), 2)}</td><td className="num">{sg(yieldAt(CNOW, t) - yieldAt(CMAY, t))}</td></tr>
              ))}
            </tbody>
          </table>
        }
        after={
          <p className="note" style={{ marginTop: 8 }}>
            Двухлетние ГЦБ: {nf(may2, 2)}% в мае и {nf(now2, 2)}% в октябре — на {nf(may2 - now2, 2)}{NB}{PP} ниже. Короткие бумаги доходнее длинных,
            поэтому ставку выпуска сравниваем с ГЦБ того же срока, а не «с ГЦБ вообще». Точки — фактические аукционы Минфина в окне ±45 дней.
          </p>
        }
      />
    </>
  );
}

type Row = ReturnType<typeof spreadRows>[number];
function SpreadChart({ w, rows }: { w: number; rows: Row[] }) {
  const tip = useTip();
  const narrow = w < 560;
  const Lw = narrow ? 0 : 220;
  const rowH = narrow ? 76 : 60;
  const T = 28;
  const x0 = Lw + 10;
  const x1 = w - 12;
  const vMin = -2, vMax = 15;
  const X = lin(vMin, vMax, x0, x1);
  const H = T + rows.length * rowH + 40;
  const ticks = narrow ? [0, 4, 8, 12] : [-2, 0, 2, 4, 6, 8, 10, 12, 14];
  return (
    <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="group" aria-label="Спред к ГЦБ по типам эмитентов">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X(t)} x2={X(t)} y1={T - 6} y2={T + rows.length * rowH} stroke={t === 0 ? 'var(--line-strong)' : 'var(--grid)'} strokeWidth={1} />
          <text x={X(t)} y={T + rows.length * rowH + 16} textAnchor="middle">{t > 0 ? '+' + t : t < 0 ? MINUS + -t : '0'}</text>
        </g>
      ))}
      <text x={X(0) + 6} y={T - 12}>0 = доходность ГЦБ</text>
      <text x={(x0 + x1) / 2} y={H - 4} textAnchor="middle">спред к ГЦБ того же срока, {PP}</text>
      {rows.map((r, i) => {
        const yc = T + i * rowH + (narrow ? 50 : rowH / 2);
        return (
          <g key={r.s.k}>
            {i > 0 && <line x1={0} x2={w} y1={T + i * rowH} y2={T + i * rowH} stroke="var(--line)" strokeWidth={1} />}
            {narrow ? (
              <text x={0} y={T + i * rowH + 16} className="ink">{r.s.name} · {r.pts.length}</text>
            ) : (
              <>
                <text x={0} y={yc - 2} className="ink">{r.s.name}</text>
                <text x={0} y={yc + 15}>{r.pts.length} {plural(r.pts.length, 'размещение', 'размещения', 'размещений')}</text>
              </>
            )}
            {r.pts.length >= 2 && r.p25 != null ? (
              <>
                <rect x={X(r.p25)} y={yc - 13} width={Math.max(2, X(r.p75!) - X(r.p25))} height={26} rx={4} fill="var(--data-soft)" opacity={0.55} />
                {r.pts.map((d, j) => {
                  const cy = yc + (((j * 7) % 9) - 4) * 2.4;
                  const cx = X(Math.min(d.spr, vMax));
                  return (
                    <g key={d.id}>
                      <circle cx={cx} cy={cy} r={3.4} fill="var(--muted)" fillOpacity={0.65} stroke="var(--bg)" strokeWidth={1} />
                      <circle
                        cx={cx} cy={cy} r={12} fill="transparent"
                        {...tip(() => [`${sg(d.spr)}${NB}${PP}`, [`${d.iss} · ${d.tk}`, `${dmy(d.d)}, ${yrs(d.ten)}, ставка ${nf(d.fin, 2)}%`]])}
                      />
                    </g>
                  );
                })}
                <line x1={X(r.p50!)} x2={X(r.p50!)} y1={yc - 16} y2={yc + 16} stroke="var(--data)" strokeWidth={3} strokeLinecap="round" />
                <text x={X(r.p50!) + 6} y={yc - 18} className="val">{sg(r.p50, 1)}</text>
              </>
            ) : r.pts.length === 1 ? (
              <circle cx={X(r.pts[0].spr)} cy={yc} r={3.4} fill="var(--muted)" />
            ) : (
              <text x={x0} y={yc + 4}>нет сделок с таким сроком</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function CurveChart({ w }: { w: number }) {
  const { show, hide } = useTipRaw();
  const narrow = w < 520;
  const H = 300, L = 46, R = narrow ? 44 : 64, T = 16, B = 40;
  const iw = w - L - R;
  const ih = H - T - B;
  const X = lin(0, 15, L, L + iw);
  const Y = lin(13, 18, T + ih, T);
  const series: { name: string; c: Curve; col: string; sw: number }[] = [
    { name: '15.05', c: CMAY, col: 'var(--data-soft)', sw: 2 },
    { name: '19.10', c: CNOW, col: 'var(--data)', sw: 2.5 },
  ];
  const tens: number[] = [];
  for (let t = 0.5; t <= 15.001; t += 0.25) tens.push(Math.round(t * 100) / 100);
  return (
    <CurveSvg
      w={w} H={H} L={L} T={T} iw={iw} ih={ih} X={X} Y={Y} series={series} tens={tens} narrow={narrow}
      onMove={(ev, t) => show({ x: ev.clientX, y: ev.clientY, title: yrs(t), lines: series.map((s) => `${s.name}.2026: ${nf(yieldAt(s.c, t), 2)}%`) })}
      onLeave={hide}
    />
  );
}

function CurveSvg({ w, H, L, T, iw, ih, X, Y, series, tens, narrow, onMove, onLeave }: {
  w: number; H: number; L: number; T: number; iw: number; ih: number; X: (v: number) => number; Y: (v: number) => number;
  series: { name: string; c: Curve; col: string; sw: number }[]; tens: number[]; narrow: boolean;
  onMove: (ev: { clientX: number; clientY: number }, t: number) => void; onLeave: () => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [ct, setCt] = useState<number | null>(null);
  const move = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    const px = (clientX - r.left) * (w / r.width);
    const t = Math.round(Math.min(15, Math.max(0.5, ((px - L) / iw) * 15)) * 2) / 2;
    setCt(t);
    onMove({ clientX, clientY }, t);
  };
  const showAt = (t: number) => {
    setCt(t);
    const r = ref.current!.getBoundingClientRect();
    onMove({ clientX: r.left + (X(t) / w) * r.width, clientY: r.top + (Y(yieldAt(series[1].c, t)) / H) * r.height }, t);
  };
  const key = (e: React.KeyboardEvent) => {
    const cur = ct ?? 2;
    if (e.key === 'ArrowRight') showAt(Math.min(15, cur + 0.5));
    else if (e.key === 'ArrowLeft') showAt(Math.max(0.5, cur - 0.5));
    else return;
    e.preventDefault();
  };
  return (
    <svg ref={ref} width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="group" aria-label="Кривая доходности ГЦБ 15.05.2026 и 19.10.2026">
      {[13, 14, 15, 16, 17, 18].map((v) => (
        <g key={v}>
          <line x1={L} x2={L + iw} y1={Y(v)} y2={Y(v)} stroke={v === 13 ? 'var(--line-strong)' : 'var(--grid)'} strokeWidth={1} />
          <text x={L - 8} y={Y(v) + 4} textAnchor="end">{v}%</text>
        </g>
      ))}
      {[0, 1, 2, 3, 5, 7, 10, 15].filter((t) => !(narrow && (t === 1 || t === 3))).map((t) => (
        <text key={t} x={X(t)} y={T + ih + 18} textAnchor="middle">{t}</text>
      ))}
      <text x={L + iw} y={H - 2} textAnchor="end">срок до погашения, лет</text>
      {series.map((s) => (
        <g key={s.name}>
          {s.c.pts.map((p, i) => (
            <circle key={i} cx={X(Math.min(p.t, 15))} cy={Y(Math.min(Math.max(p.y, 13), 18))} r={3} fill={s.col} fillOpacity={0.6} />
          ))}
          <path
            d={tens.map((t, i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(yieldAt(s.c, t)).toFixed(1)}`).join('')}
            fill="none" stroke={s.col} strokeWidth={s.sw} strokeLinecap="round" strokeLinejoin="round"
          />
          <text x={X(15) + 6} y={Y(yieldAt(s.c, 15)) + 4} className={s.col === 'var(--data)' ? 'val' : undefined}>{s.name}</text>
        </g>
      ))}
      {ct != null && (
        <g>
          <line x1={X(ct)} x2={X(ct)} y1={T} y2={T + ih} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="3 3" />
          {series.map((s) => <circle key={s.name} cx={X(ct)} cy={Y(yieldAt(s.c, ct))} r={4} fill="var(--bg)" stroke={s.col} strokeWidth={2} />)}
        </g>
      )}
      <rect
        x={L} y={T} width={iw} height={ih} fill="transparent" tabIndex={0}
        aria-label="Кривая ГЦБ: стрелками влево и вправо выбирайте срок"
        onPointerMove={(e) => move(e.clientX, e.clientY)}
        onPointerLeave={() => { setCt(null); onLeave(); }}
        onFocus={() => showAt(ct ?? 2)}
        onBlur={() => { setCt(null); onLeave(); }}
        onKeyDown={key}
      />
    </svg>
  );
}
