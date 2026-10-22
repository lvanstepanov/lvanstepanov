import { byMonth, bySeg90, marketTiles, ST_LABEL, type WinStatus } from '../lib/compass';
import { NB, PP, nf, pf, plural, sg } from '../lib/format';
import { Block, ChartBlock, PageHead, Status, StatusGlyph, barPath, lin, useTip } from '../components/ui';

export function Market() {
  const m = marketTiles();
  const months = byMonth();
  const segs = bySeg90();
  const tiles: [string, string][] = [
    [m.deals.toLocaleString('ru-RU'), 'размещений с 9 января'],
    [`${nf(m.volTrn, 2)}${NB}трлн${NB}₸`, 'привлечено'],
    [`${nf(m.medCov, 1)}%`, 'медиана спроса к предложению'],
    [pf(m.under / m.withCov), `сделок с недобором спроса (${m.under} из ${m.withCov})`],
    [pf(m.same / m.rng), `сделок, где все заявки по одной ставке (${m.same} из ${m.rng})`],
  ];
  return (
    <>
      <PageHead
        eyebrow="02 · Рынок сейчас"
        title="Первичный рынок облигаций KASE в 2026 году"
        lede="Все размещения, итоги которых KASE опубликовала с 9 января по 19 октября: корпоративные облигации и облигации международных финансовых организаций."
      />
      <dl className="kpis">
        {tiles.map(([v, l]) => (
          <div key={l} className="kpi">
            <dd>{v}</dd>
            <dt>{l}</dt>
          </div>
        ))}
      </dl>

      <ChartBlock
        id="m-vol"
        title="Объём размещений и «окно» по месяцам"
        note="Столбец — объём размещений за месяц. Под столбцом — статус окна по доле сделок, где спрос не покрыл предложение: «закрыто» — треть сделок и больше, «открыто» — не больше 15%. Пороги — допущение команды."
        chart={(w) => <MonthChart w={w} months={months} />}
        table={
          <table className="tbl">
            <thead><tr><th scope="col">Месяц</th><th className="num" scope="col">Размещений</th><th className="num" scope="col">Объём, млрд{NB}₸</th><th className="num" scope="col">Медиана спроса</th><th className="num" scope="col">С недобором</th><th scope="col">Окно</th></tr></thead>
            <tbody>
              {months.map((x) => (
                <tr key={x.name}><td>{x.name}</td><td className="num">{x.n}</td><td className="num">{nf(x.vol, 0)}</td><td className="num">{nf(x.medCov, 1)}%</td><td className="num">{x.under} из {x.withCov}</td><td><Status st={x.st} /></td></tr>
              ))}
            </tbody>
          </table>
        }
      />

      <Block title="Окно по типам эмитентов за последние 90 дней" id="m-seg" aside={<span className="hint mono">21.07 – 19.10.2026</span>}>
        <div className="scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Тип эмитента</th><th className="num" scope="col">Размещений</th><th className="num" scope="col">Объём, млрд{NB}₸</th>
                <th className="num" scope="col">Медиана спроса</th><th className="num" scope="col">С недобором</th>
                <th className="num" scope="col">Спред 90 дней, {PP}</th><th className="num" scope="col">Спред за год</th><th scope="col">Окно</th>
              </tr>
            </thead>
            <tbody>
              {segs.map((r) => (
                <tr key={r.s.k}>
                  <td>{r.s.name}</td><td className="num">{r.n}</td><td className="num">{nf(r.vol, 1)}</td>
                  <td className="num">{r.medCov != null ? nf(r.medCov, 1) + '%' : '—'}</td>
                  <td className="num">{r.withCov ? `${r.under} из ${r.withCov}` : '—'}</td>
                  <td className="num">{sg(r.spr)}</td><td className="num">{sg(r.year)}</td>
                  <td><Status st={r.st} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note" style={{ marginTop: 12 }}>Спред — ставка минус доходность ГЦБ того же срока на дату сделки. «Мало сделок» — меньше трёх сделок с данными о спросе.</p>
      </Block>
    </>
  );
}

type Month = ReturnType<typeof byMonth>[number];
function MonthChart({ w, months }: { w: number; months: Month[] }) {
  const tip = useTip();
  const H = 312, L = 44, R = 8, T = 24, B = 76;
  const ih = H - T - B;
  const band = (w - L - R) / months.length;
  const bw = Math.min(28, band * 0.5);
  const Y = lin(0, 700, T + ih, T);
  const peak = months.reduce((a, x) => (x.vol > a.vol ? x : a), months[0]);
  const narrow = band < 48;
  const legend: [WinStatus, string][] = [['open', 'открыто'], ['neutral', 'нейтрально'], ['closed', 'закрыто']];
  let lx = L;
  return (
    <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="group" aria-label="Объём размещений по месяцам 2026 года, млрд тенге">
      {[0, 200, 400, 600].map((t) => (
        <g key={t}>
          <line x1={L} x2={w - R} y1={Y(t)} y2={Y(t)} stroke={t ? 'var(--grid)' : 'var(--line-strong)'} strokeWidth={1} />
          <text x={L - 8} y={Y(t) + 4} textAnchor="end">{nf(t, 0)}</text>
        </g>
      ))}
      <text x={L - 8} y={T - 10} textAnchor="end">млрд{NB}₸</text>
      {months.map((x, i) => {
        const cx = L + band * i + band / 2;
        const y = Y(x.vol);
        return (
          <g key={x.name}>
            <path d={barPath(cx - bw / 2, y, bw, T + ih)} fill="var(--data)" />
            {x === peak && <text x={cx} y={y - 8} textAnchor="middle" className="val">{nf(x.vol, 0)}</text>}
            <text x={cx} y={T + ih + 18} textAnchor="middle">{narrow ? x.short.slice(0, 3) : x.short}</text>
            <StatusGlyph st={x.st} x={cx - 6} y={T + ih + 28} />
            <rect
              x={L + band * i} y={T} width={band} height={ih + 44} fill="transparent"
              {...tip(() => [
                `${nf(x.vol, 0)}${NB}млрд${NB}₸`,
                [`${x.name} 2026`, `${x.n} ${plural(x.n, 'размещение', 'размещения', 'размещений')}`, `медиана спроса ${nf(x.medCov, 1)}%`, `недобор ${x.under} из ${x.withCov} · окно ${ST_LABEL[x.st]}`],
              ])}
            />
          </g>
        );
      })}
      {legend.map(([st, label]) => {
        const x0 = lx;
        lx += 16 + label.length * 6.8 + 20;
        return (
          <g key={st}>
            <StatusGlyph st={st} x={x0} y={H - 18} />
            <text x={x0 + 16} y={H - 8}>{label}</text>
          </g>
        );
      })}
    </svg>
  );
}
