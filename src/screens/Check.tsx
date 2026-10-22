import { BT, BT_A, BT_B, BT_BN, BT_C, BT_D, BT_DN, BT_DOWN, BT_NEW, CMAY, CNOW, SEGBY, STICK, STICK_PRIV, yieldAt, type BtStat, type SegKey } from '../lib/compass';
import { NB, PP, dmy, nf, pf, plural, yrs } from '../lib/format';
import { Block, ChartBlock, PageHead, lin, useTip } from '../components/ui';

const METHODS: { lab: string; note: string; st: BtStat; main?: boolean }[] = [
  { lab: 'Медиана ставок того же типа за 180 дней', note: 'как если читать новости', st: BT_B },
  { lab: 'ГЦБ того же срока + медианный спред типа', note: 'без истории эмитента', st: BT_A },
  { lab: 'Compass: ГЦБ + прошлый спред эмитента', note: 'для новых эмитентов — спред типа', st: BT_D, main: true },
];

export function Check() {
  const removed = BT.length - BT_DN.n;
  const order: SegKey[] = ['leas', 'mfo', 'corp', 'bank', 'quasi', 'ifi'];
  const drop2 = yieldAt(CMAY, 2) - yieldAt(CNOW, 2);
  return (
    <>
      <PageHead
        eyebrow="06 · Проверка на истории"
        title="Проверка ориентира на реальных выпусках"
        lede="Для каждого размещения в тенге с марта по октябрь мы взяли только то, что было известно до его даты: кривую ГЦБ по аукционам Минфина за 60 дней до сделки и прошлые сделки того же типа за 180 дней. Затем сравнили ориентир с фактической ставкой."
      />

      <ChartBlock
        id="c-bars"
        title={`Compass попадает в ±0,5${NB}${PP} в ${pf(BT_D.w05)} случаев против ${pf(BT_B.w05)} у медианы по новостям`}
        note={`Доля из ${BT_D.n} размещений, где ориентир ошибся не больше чем на 0,5${NB}${PP}`}
        chart={(w) => <Bars w={w} />}
        table={
          <table className="tbl">
            <thead><tr><th scope="col">Способ</th><th className="num" scope="col">В ±0,5 {PP}</th><th className="num" scope="col">Доля</th><th className="num" scope="col">Средняя ошибка</th></tr></thead>
            <tbody>{METHODS.map((m) => <tr key={m.lab}><td>{m.lab}</td><td className="num">{m.st.k05} из {m.st.n}</td><td className="num">{pf(m.st.w05)}</td><td className="num">{nf(m.st.mae, 2)}</td></tr>)}</tbody>
          </table>
        }
      />

      <div className="grid-2">
        <Block title="Средняя ошибка по группам" id="c-mae">
          <div className="scroll">
            <table className="tbl">
              <thead><tr><th scope="col">Способ</th><th className="num" scope="col">Ошибка, {PP}</th><th className="num" scope="col">Сделок</th></tr></thead>
              <tbody>
                <tr><td>Все 110: медиана ставок типа</td><td className="num">{nf(BT_B.mae, 2)}</td><td className="num">{BT_B.n}</td></tr>
                <tr><td>Все 110: ГЦБ + спред типа</td><td className="num">{nf(BT_A.mae, 2)}</td><td className="num">{BT_A.n}</td></tr>
                <tr className="hl"><td>Все 110: Compass</td><td className="num">{nf(BT_D.mae, 2)}</td><td className="num">{BT_D.n}</td></tr>
                <tr><td>Повторные эмитенты: прошлый купон</td><td className="num">{nf(BT_C.mae, 2)}</td><td className="num">{BT_C.n}</td></tr>
                <tr><td>Повторные эмитенты: прошлый спред + кривая</td><td className="num">{nf(BT_DOWN.mae, 2)}</td><td className="num">{BT_DOWN.n}</td></tr>
                <tr><td>Новые эмитенты: ГЦБ + спред типа</td><td className="num">{nf(BT_NEW.mae, 2)}</td><td className="num">{BT_NEW.n}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="note" style={{ marginTop: 12 }}>
            Если убрать {removed} {plural(removed, 'повторное размещение', 'повторных размещения', 'повторных размещений')} уже обращающихся выпусков, Compass
            попадает в ±0,5{NB}{PP} в {pf(BT_DN.w05)} из {BT_DN.n} случаев, медиана типа — в {pf(BT_BN.w05)}. По новым эмитентам ошибка около
            2{NB}{PP}: по одному типу эмитента ставку не угадать. Этот пробел закрывают рейтинги и кривая спроса в полной версии.
          </p>
        </Block>
        <ChartBlock
          id="c-sc"
          title="Ориентир Compass против фактической ставки"
          legend={
            <div className="legend">
              <span><i className="key dot" style={{ background: 'var(--data)' }} />эмитент уже размещался</span>
              <span><i className="key dot" style={{ background: 'var(--b2)' }} />новый эмитент</span>
              <span><i className="key" style={{ background: 'var(--data-soft)', opacity: 0.6 }} />±0,5{NB}{PP}</span>
            </div>
          }
          chart={(w) => <Scatter w={w} />}
          table={
            <table className="tbl">
              <thead><tr><th scope="col">Дата</th><th scope="col">Выпуск</th><th className="num" scope="col">Ориентир</th><th className="num" scope="col">Факт</th><th scope="col">Эмитент</th></tr></thead>
              <tbody>
                {BT.map((r, i) => (
                  <tr key={i}><td className="date">{dmy(r.d)}</td><td className="mono">{r.tk}</td><td className="num">{nf(r.D, 2)}</td><td className="num">{nf(r.rate, 2)}</td><td className="sub">{r.own ? 'уже размещался' : 'новый'}</td></tr>
                ))}
              </tbody>
            </table>
          }
        />
      </div>

      <Block title="Частные эмитенты почти не меняют купон" id="c-stick">
        <div className="stick">
          <div className="stick-fig">
            <div className="big-num">{STICK_PRIV.same} из {STICK_PRIV.n}</div>
            <p className="hint">новых выпусков лизинга, МФО и корпораций вышли с купоном прошлого выпуска</p>
          </div>
          <div>
            <p className="note">
              Новый выпуск эмитента, который уже размещался в течение года: у лизинга, МФО и корпораций купон совпал с прошлым выпуском в {STICK_PRIV.same} из{' '}
              {STICK_PRIV.n} случаев, хотя доходность двухлетних ГЦБ с мая по октябрь снизилась на {nf(drop2, 1)}{NB}{PP} Международные финорганизации меняли
              ставку каждый раз. Поэтому прошлый купон — лучший прогноз, а сравнение со спредом показывает, где эмитент мог переплатить. Доразмещения уже
              обращающихся выпусков и транши в один день не учитываются.
            </p>
            <div className="scroll" style={{ marginTop: 16 }}>
              <table className="tbl">
                <thead><tr><th scope="col">Тип эмитента</th><th className="num" scope="col">Новых выпусков</th><th className="num" scope="col">Тот же купон</th><th className="num" scope="col">Доля</th></tr></thead>
                <tbody>
                  {order.map((k) => (
                    <tr key={k}><td>{SEGBY[k].name}</td><td className="num">{STICK[k].n}</td><td className="num">{STICK[k].same}</td><td className="num">{STICK[k].n ? pf(STICK[k].same / STICK[k].n) : '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Block>
    </>
  );
}

function Bars({ w }: { w: number }) {
  const tip = useTip();
  const narrow = w < 640;
  const rowH = narrow ? 76 : 64;
  const numW = narrow ? 64 : 96;
  const x1 = w - numW - 12;
  const H = METHODS.length * rowH;
  return (
    <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="group" aria-label="Доля размещений с ошибкой ориентира не больше 0,5 п. п.">
      {METHODS.map((m, i) => {
        const y = i * rowH;
        const bw = Math.max(4, m.st.w05 * x1);
        return (
          <g key={m.lab}>
            <text x={0} y={y + 16} className="ink">{m.lab}</text>
            {!narrow && <text x={x1} y={y + 16} textAnchor="end">{m.note}</text>}
            <rect x={0} y={y + 26} width={x1} height={18} rx={4} fill="var(--grid)" />
            <rect
              x={0} y={y + 26} width={bw} height={18} rx={4} fill={m.main ? 'var(--data)' : 'var(--data-soft)'}
              {...tip(() => [pf(m.st.w05), [m.lab, `${m.st.k05} из ${m.st.n} размещений`, `средняя ошибка ${nf(m.st.mae, 2)} п. п.`]])}
            />
            <text x={w} y={y + 44} textAnchor="end" style={{ font: `600 ${narrow ? 20 : 28}px var(--f-num)`, fill: m.main ? 'var(--data-text)' : 'var(--text)' }}>{pf(m.st.w05)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Scatter({ w }: { w: number }) {
  const tip = useTip();
  const H = Math.min(400, Math.max(280, w * 0.8));
  const L = 44, R = 10, T = 28, B = 36;
  const iw = w - L - R;
  const ih = H - T - B;
  const mn = 14, mx = 31;
  const X = lin(mn, mx, L, L + iw);
  const Y = lin(mn, mx, T + ih, T);
  const band = `M${X(mn)} ${Y(mn + 0.5)}L${X(mx - 0.5)} ${Y(mx)}L${X(mx)} ${Y(mx)}L${X(mx)} ${Y(mx - 0.5)}L${X(mn + 0.5)} ${Y(mn)}L${X(mn)} ${Y(mn)}Z`;
  return (
    <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="group" aria-label="Ориентир Compass против фактической ставки, 110 размещений">
      {[14, 18, 22, 26, 30].map((v) => (
        <g key={v}>
          <line x1={L} x2={L + iw} y1={Y(v)} y2={Y(v)} stroke="var(--grid)" strokeWidth={1} />
          <text x={L - 8} y={Y(v) + 4} textAnchor="end">{v}%</text>
          <text x={X(v)} y={T + ih + 16} textAnchor="middle">{v}%</text>
        </g>
      ))}
      <path d={band} fill="var(--data-soft)" opacity={0.45} />
      <line x1={X(mn)} y1={Y(mn)} x2={X(mx)} y2={Y(mx)} stroke="var(--line-strong)" strokeWidth={1} strokeOpacity={0.6} />
      <text x={L + iw} y={H - 2} textAnchor="end">ориентир Compass</text>
      <text x={0} y={12}>фактическая ставка</text>
      {BT.map((r, i) => {
        const cx = X(Math.min(r.D!, mx));
        const cy = Y(Math.min(r.rate, mx));
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={4} fill={r.own ? 'var(--data)' : 'var(--b2)'} stroke="var(--bg)" strokeWidth={1.25} />
            <circle
              cx={cx} cy={cy} r={12} fill="transparent"
              {...tip(() => [`${nf(r.rate, 2)}% факт · ${nf(r.D, 2)}% ориентир`, [`${r.iss} · ${r.tk}`, `${dmy(r.d)}, ${yrs(r.t)}`, r.own ? 'ориентир по истории эмитента' : 'новый эмитент: ориентир по типу']])}
            />
          </g>
        );
      })}
    </svg>
  );
}
