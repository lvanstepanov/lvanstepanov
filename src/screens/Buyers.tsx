import { BUY, buyersBySeg } from '../lib/compass';
import { nf, plural } from '../lib/format';
import { BUY_VAR, ChartBlock, PageHead, useTip } from '../components/ui';

export function Buyers() {
  const rows = buyersBySeg();
  const L = rows.find((r) => r.s.k === 'leas')!;
  const M = rows.find((r) => r.s.k === 'mfo')!;
  const Q = rows.find((r) => r.s.k === 'quasi')!;
  return (
    <>
      <PageHead
        eyebrow="05 · Покупатели"
        title="Кто покупает выпуски"
        lede="По отчёту KASE, физлица купили 1,2% корпоративных облигаций на первичном рынке за девять месяцев. По отдельным типам эмитентов картина другая."
      />
      <ChartBlock
        id="b"
        title={`Лизинг финансируют физлица: ${nf(L.bm.mix.ret, 0)}% спроса в среднем`}
        legend={
          <div className="legend">
            {BUY.map((b) => <span key={b.k}><i className="key" style={{ background: BUY_VAR[b.k] }} />{b.name}</span>)}
          </div>
        }
        chart={(w) => <Stacks w={w} rows={rows} />}
        table={
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Тип эмитента</th><th className="num" scope="col">Сделок с данными</th>
                {BUY.map((b) => <th key={b.k} className="num" scope="col">{b.name}, %</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.s.k}>
                  <td>{r.s.name}</td><td className="num">{r.bm.n}</td>
                  {BUY.map((b) => <td key={b.k} className="num">{nf(r.bm.mix[b.k] || 0, 1)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        }
        after={
          <p className="note" style={{ marginTop: 16 }}>
            В {L.r80} из {L.bm.n} выпусков лизинговых компаний физлица дали 80% спроса и больше; у МФО их доля в среднем {nf(M.bm.mix.ret, 0)}%.
            Квазигосударственные выпуски берут банки ({nf(Q.bm.mix.bank, 0)}%) и институционалы ({nf(Q.bm.mix.inst, 0)}%). Среднее по сделкам, где
            KASE раскрыла покупателей; фраза «весь объём заявок пришёлся на …» учтена как 100%.
          </p>
        }
      />
    </>
  );
}

type Row = ReturnType<typeof buyersBySeg>[number];
function Stacks({ w, rows }: { w: number; rows: Row[] }) {
  const tip = useTip();
  const narrow = w < 560;
  const Lw = narrow ? 0 : 220;
  const rowH = narrow ? 56 : 52;
  const T = 4;
  const x0 = Lw + 4;
  const bwid = w - 4 - x0;
  const H = T + rows.length * rowH + 24;
  return (
    <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="group" aria-label="Средний состав покупателей по типам эмитентов">
      {[0, 25, 50, 75, 100].map((t) => {
        const x = x0 + (t / 100) * bwid;
        return (
          <g key={t}>
            <line x1={x} x2={x} y1={T} y2={T + rows.length * rowH} stroke="var(--grid)" strokeWidth={1} />
            <text x={x} y={H - 4} textAnchor={t === 0 ? 'start' : t === 100 ? 'end' : 'middle'}>{t}%</text>
          </g>
        );
      })}
      {rows.map((r, i) => {
        const y = T + i * rowH + (narrow ? 24 : 12);
        let x = x0;
        return (
          <g key={r.s.k}>
            {narrow ? (
              <text x={0} y={T + i * rowH + 15} className="ink">{r.s.name} · {r.bm.n} {plural(r.bm.n, 'сделка', 'сделки', 'сделок')}</text>
            ) : (
              <>
                <text x={0} y={y + 11} className="ink">{r.s.name}</text>
                <text x={0} y={y + 26}>по {r.bm.n} {plural(r.bm.n, 'сделке', 'сделкам', 'сделкам')}</text>
              </>
            )}
            {BUY.map((b) => {
              const v = r.bm.mix[b.k] || 0;
              const ws = (v / 100) * bwid - 2;
              if (v < 0.05 || ws <= 0) return null;
              const x1 = x;
              x += ws + 2;
              return (
                <g key={b.k}>
                  <rect x={x1} y={y} width={ws} height={24} rx={4} fill={BUY_VAR[b.k]} {...tip(() => [`${nf(v, 1)}%`, [b.name, r.s.name]])} />
                  {b.k === 'ret' && ws > 44 && (
                    <text x={x1 + 8} y={y + 16.5} style={{ fill: 'var(--on-b1)', fontWeight: 600 }} pointerEvents="none">{nf(v, 0)}%</text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
