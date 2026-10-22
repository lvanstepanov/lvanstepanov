import { useEffect, useMemo, useState } from 'react';
import {
  BT_D, BT_NEW, BUY, CNOW, ISSUERS, NEWS, SEGBY, SEGS, buyerMix, comps, couponMln, guide, stickLine, topBuyer, variant,
  type CompRow, type Guide as GuideOut, type GuideInput, type Mode, type SegKey,
} from '../lib/compass';
import { NB, PP, dmy, mln, nf, pf, plural, sg, yrs } from '../lib/format';
import { guideMemory, parseHash, replaceHash } from '../lib/nav';
import { Instrument } from '../components/Instrument';
import { BUY_VAR, Block, PageHead, SrcLink, useTip, useTween, useWidth } from '../components/ui';
import './guide.css';

const QUICK = [1, 2, 3, 5];
const parse = (s: string) => parseFloat(s.replace(',', '.'));
const ASOF_RU = '19.10.2026';

export function Guide() {
  // Inputs survive a trip to the map; «#guide?iss=…» opens a given issuer.
  const [init] = useState(() => {
    const q = parseHash().params.get('iss');
    if (q && ISSUERS.includes(q)) { guideMemory.mode = 'repeat'; guideMemory.iss = q; replaceHash('guide', {}); }
    if (!ISSUERS.includes(guideMemory.iss)) guideMemory.iss = 'BI Development Ltd.';
    return { ...guideMemory };
  });
  const [mode, setMode] = useState<Mode>(init.mode);
  const [iss, setIss] = useState(init.iss);
  const [seg, setSeg] = useState<SegKey>(init.seg);
  const [ten, setTen] = useState(init.ten);
  const [tenStr, setTenStr] = useState(String(init.ten).replace('.', ','));
  const [vol, setVol] = useState(init.vol);
  const [volStr, setVolStr] = useState(String(init.vol).replace('.', ','));
  useEffect(() => { Object.assign(guideMemory, { mode, iss, seg, ten, vol }); }, [mode, iss, seg, ten, vol]);

  const inp: GuideInput = { mode, iss, seg, ten };
  const out = useMemo(() => guide(inp), [mode, iss, seg, ten]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => comps(inp, out), [out]); // eslint-disable-line react-hooks/exhaustive-deps

  const setTenBoth = (t: number) => { setTen(t); setTenStr(String(t).replace('.', ',')); };
  const hint = mode === 'repeat'
    ? `${SEGBY[out.seg].name} · ${out.hist!.length} ${plural(out.hist!.length, 'размещение', 'размещения', 'размещений')} в тенге с фиксированной ставкой в 2026 году`
    : `${SEGBY[seg].name} · ${out.st!.n} ${plural(out.st!.n, 'сделка', 'сделки', 'сделок')} со спредом в 2026 году`;

  return (
    <>
      <PageHead
        eyebrow="01 · Ориентир купона"
        title="Ориентир купона для нового выпуска"
        lede={`Выберите эмитента, срок и объём. Compass берёт доходность ГЦБ того же срока на ${ASOF_RU} и спреды прошлых размещений на KASE, показывает похожие сделки, их покупателей и цену выпуска в деньгах.`}
      />
      <div className="guide">
        <form className="card guide-form" onSubmit={(e) => e.preventDefault()} aria-label="Параметры выпуска">
          <fieldset className="fld">
            <legend className="lbl">Кто выпускает</legend>
            <div className="seg-ctl">
              {([['repeat', 'Уже был на KASE'], ['new', 'Новый эмитент']] as const).map(([v, l]) => (
                <label key={v}>
                  <input type="radio" name="g-mode" value={v} checked={mode === v} onChange={() => setMode(v)} />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
          {mode === 'repeat' ? (
            <div className="fld">
              <label htmlFor="g-iss">Эмитент</label>
              <select id="g-iss" className="input" value={iss} onChange={(e) => setIss(e.target.value)}>
                {ISSUERS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <p className="hint">{hint}</p>
              <a className="hint map-link" href={'#map?open=' + encodeURIComponent(iss)}>Этот эмитент на карте рынка →</a>
            </div>
          ) : (
            <div className="fld">
              <label htmlFor="g-seg">Тип эмитента</label>
              <select id="g-seg" className="input" value={seg} onChange={(e) => setSeg(e.target.value as SegKey)}>
                {SEGS.map((s) => <option key={s.k} value={s.k}>{s.name}</option>)}
              </select>
              <p className="hint">{hint}</p>
            </div>
          )}
          <div className="fld">
            <label htmlFor="g-ten">Срок выпуска, лет</label>
            <input
              id="g-ten" className="input" type="text" inputMode="decimal" value={tenStr}
              aria-describedby="g-ten-h"
              onChange={(e) => {
                setTenStr(e.target.value);
                const v = parse(e.target.value);
                if (!Number.isNaN(v) && v > 0) setTen(Math.min(Math.max(v, 0.5), 15));
              }}
              onBlur={() => setTenStr(String(ten).replace('.', ','))}
            />
            <div className="pills" role="group" aria-label="Быстрый выбор срока">
              {QUICK.map((t) => (
                <button key={t} type="button" className="pill" aria-pressed={ten === t} onClick={() => setTenBoth(t)}>
                  {yrs(t)}
                </button>
              ))}
            </div>
            <p className="hint" id="g-ten-h">От 0,5 до 15 лет, шаг 0,5.</p>
          </div>
          <div className="fld">
            <label htmlFor="g-vol">Объём выпуска, млрд{NB}₸</label>
            <input
              id="g-vol" className="input" type="text" inputMode="decimal" value={volStr}
              onChange={(e) => {
                setVolStr(e.target.value);
                const v = parse(e.target.value);
                if (!Number.isNaN(v) && v > 0) setVol(Math.min(v, 500));
              }}
              onBlur={() => setVolStr(String(vol).replace('.', ','))}
            />
          </div>
          <p className="hint form-foot">Дата расчёта — {ASOF_RU}, последние данные в базе. Тенге, фиксированный купон.</p>
        </form>

        <Result out={out} inp={inp} vol={vol} rows={rows} />
      </div>

      <div className="grid-2 guide-lower">
        <Variants out={out} inp={inp} vol={vol} />
        <Buyers rows={rows} />
      </div>

      <Comps rows={rows} mode={mode} />
    </>
  );
}

/* ---------- result ---------- */
function Result({ out, inp, vol, rows }: { out: GuideOut; inp: GuideInput; vol: number; rows: CompRow[] }) {
  const lo = useTween(out.lo);
  const hi = useTween(out.hi);
  const [instRef, instW] = useWidth<HTMLDivElement>();
  const size = instW && instW < 300 ? 220 : 300;
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const L = out.last;
  const fell = out.mode === 'repeat' && out.dG! <= -0.3;
  const rose = out.mode === 'repeat' && out.dG! >= 0.3;

  const copy = () => {
    const txt = summaryText(out, inp, vol, rows);
    const done = () => setCopied(true);
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.append(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      ta.remove();
      done();
    };
    try {
      navigator.clipboard.writeText(txt).then(done, fallback);
    } catch {
      fallback();
    }
  };

  return (
    <section className="guide-result" aria-labelledby="g-res-h" aria-live="polite">
      <div className="eyebrow" id="g-res-h">Ориентир купона на {ASOF_RU}</div>
      <div className="hero">
        <span className="hero-num">{nf(lo, 1)}–{nf(hi, 1)}%</span>
        <span className="hero-unit">годовых</span>
      </div>
      <div className="chips">
        {out.mode === 'repeat' ? (
          <span className="chip chip-data"><Dot />На истории: ошибка до 0,5{NB}{PP} в {pf(BT_D.w05)} случаев</span>
        ) : (
          <span className="chip chip-warn"><Dot />Новые эмитенты: средняя ошибка на истории {nf(BT_NEW.mae, 1)}{NB}{PP}</span>
        )}
        <span className="chip">ГЦБ {yrs(out.ten)}: {nf(out.g, 2)}%</span>
      </div>

      <div className="res-grid">
        <dl className="facts">
          <Fact
            dt={`Доходность ГЦБ на ${yrs(out.ten)}`}
            dd={`${nf(out.g, 2)}%`}
            sub={`Кривая по ${CNOW.n} ${plural(CNOW.n, 'аукциону', 'аукционам', 'аукционам')} Минфина в окне ±45 дней, последний — ${dmy(CNOW.last)}`}
            blue
          />
          {out.mode === 'repeat' ? (
            <>
              <Fact
                dt="Прошлый выпуск в тенге"
                dd={<><span className="mono">{L!.tk}</span> · {dmy(L!.d)}</>}
                sub={`${yrs(L!.ten)}, купон ${nf(L!.fin, 2)}%, спред ${sg(L!.spr)}${NB}${PP} к ГЦБ того же срока`}
              />
              <Fact dt="Сохранить прошлый спред" dd={`${nf(out.keep!, 2)}%`} />
              <Fact dt="Повторить прошлый купон" dd={`${nf(out.rep!, 2)}%`} />
            </>
          ) : (
            <>
              <Fact
                dt={`Спред «${SEGBY[out.seg].short}» в 2026 году`}
                dd={`${sg(out.st!.p25)}…${sg(out.st!.p75)}${NB}${PP}`}
                sub={`Средние 50% из ${out.st!.n} ${plural(out.st!.n, 'сделки', 'сделок', 'сделок')} со спредом; медиана ${sg(out.st!.p50)}${NB}${PP}`}
              />
              <Fact dt="Медиана ориентира" dd={`${nf(out.mid, 2)}%`} />
            </>
          )}
        </dl>
        <div className="inst" ref={instRef}>
          {instW > 0 && (
            <Instrument
              lo={out.lo} hi={out.hi} g={out.g} size={size}
              spread={out.mode === 'repeat' ? L!.spr : out.st!.p50}
              spreadTo={out.mode === 'repeat' ? out.keep! : out.mid}
              spreadLabel={out.mode === 'repeat' ? 'спред' : 'спред типа'}
            />
          )}
          <div className="inst-key">
            <span><i className="key line" style={{ background: 'var(--accent)', height: 3 }} />коридор</span>
            <span><i className="key line" style={{ background: 'var(--data)', height: 3, width: 3 }} />ГЦБ</span>
            <span><i className="key line" style={{ background: 'var(--accent)', width: 10, height: 3 }} />стрелка — середина</span>
          </div>
        </div>
      </div>

      {fell && (
        <div className="plate">
          <strong>Рынок сдвинулся, а купон?</strong>
          <p>
            С {dmy(L!.d)} доходность ГЦБ на {yrs(L!.ten)} снизилась на {nf(-out.dG!, 2)}{NB}{PP} Повторив купон {nf(out.rep!, 2)}%,
            эмитент заплатит спред {sg(out.rep! - out.g)}{NB}{PP} вместо прошлых {sg(L!.spr)}:{' '}
            <b>{mln(couponMln(vol, Math.abs(out.rep! - out.keep!)))} в год</b> на {nf(vol, 1)}{NB}млрд{NB}₸. {stickLine(out.seg)}
          </p>
        </div>
      )}
      {rose && (
        <div className="plate">
          <strong>Рынок подорожал</strong>
          <p>
            С {dmy(L!.d)} доходность ГЦБ на {yrs(L!.ten)} выросла на {nf(out.dG!, 2)}{NB}{PP} Прежний купон может не собрать спрос:
            сохранить спред — это {nf(out.keep!, 2)}%.
          </p>
        </div>
      )}
      {out.mode === 'new' && (
        <div className="plate">
          <strong>Широкий коридор — честно</strong>
          <p>
            По одному типу эмитента ставку точно не угадать: внутри сегмента ставки отличаются на несколько {PP} В полной версии коридор
            сузят кредитные рейтинги и кривая спроса.
          </p>
        </div>
      )}

      <div className="money">
        <div>
          <div className="eyebrow">Цена 0,1{NB}{PP}</div>
          <div className="money-v">{mln(couponMln(vol, 0.1))}</div>
          <div className="hint">купона в год на {nf(vol, 1)}{NB}млрд{NB}₸</div>
        </div>
        <div>
          <div className="eyebrow">Края коридора</div>
          <div className="money-v">{mln(couponMln(vol, out.hi - out.lo))}</div>
          <div className="hint">разница в год</div>
        </div>
      </div>
      <p className="sr">
        0,1 {PP} на {nf(vol, 1)} млрд ₸ — {mln(couponMln(vol, 0.1))} купона в год. Разница между краями коридора — {mln(couponMln(vol, out.hi - out.lo))} в год.
      </p>

      <div className="copy-row">
        <button type="button" className="btn" onClick={copy}>
          {copied ? (
            <><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Скопировано</>
          ) : 'Скопировать обоснование'}
        </button>
        <span className="hint">Расчёт и список сделок со ссылками — для письма андеррайтеру или совету директоров.</span>
        <span className="sr" role="status">{copied ? 'Обоснование скопировано в буфер обмена' : ''}</span>
      </div>
    </section>
  );
}

const Dot = () => <i className="chip-dot" aria-hidden="true" />;

function Fact({ dt, dd, sub, blue }: { dt: string; dd: React.ReactNode; sub?: string; blue?: boolean }) {
  return (
    <div className="fact">
      <dt>{dt}</dt>
      <dd className={blue ? 'blue' : undefined}>{dd}</dd>
      {sub && <div className="fact-sub">{sub}</div>}
    </div>
  );
}

function summaryText(out: GuideOut, inp: GuideInput, vol: number, rows: CompRow[]) {
  const who = inp.mode === 'repeat' ? `${inp.iss} (${SEGBY[out.seg].name})` : `Новый эмитент, тип «${SEGBY[out.seg].name}»`;
  const lines = [
    `KASE Compass · ориентир купона на ${ASOF_RU}`,
    `${who}, срок ${yrs(out.ten)}, объём ${nf(vol, 1)} млрд ₸`,
    `Ориентир: ${nf(out.lo, 2)}–${nf(out.hi, 2)}% годовых`,
    `Доходность ГЦБ на ${yrs(out.ten)}: ${nf(out.g, 2)}% (кривая по ${CNOW.n} аукционам Минфина)`,
  ];
  if (out.mode === 'repeat') {
    const L = out.last!;
    lines.push(`Прошлый выпуск: ${L.tk}, ${dmy(L.d)}, купон ${nf(L.fin, 2)}%, спред ${sg(L.spr)} п. п.; сохранить спред — ${nf(out.keep!, 2)}%`);
  } else {
    lines.push(`Спред типа в 2026 году: ${sg(out.st!.p25)}…${sg(out.st!.p75)} п. п. (средние 50% из ${out.st!.n} сделок)`);
  }
  lines.push('Сопоставимые сделки:');
  for (const { d } of rows) lines.push(`· ${dmy(d.d)} ${d.iss} ${d.tk}, ${yrs(d.ten)}, ${nf(d.fin, 2)}%, спред ${sg(d.spr)} — ${NEWS}${d.id}`);
  lines.push('Статистика прошлых размещений KASE, не инвестиционная рекомендация.');
  return lines.join('\n').replace(/ /g, ' ');
}

/* ---------- variants (3.7) ---------- */
function Variants({ out, inp, vol }: { out: GuideOut; inp: GuideInput; vol: number }) {
  const defTen = Math.min(15, out.ten + 1);
  const [tenB, setTenB] = useState(defTen);
  const [rateB, setRateB] = useState<number | null>(null);
  const [tenStr, setTenStr] = useState(String(defTen));
  const [rateStr, setRateStr] = useState('');
  // Reset B whenever the main inputs change (as in the reference).
  useEffect(() => {
    setTenB(defTen); setTenStr(String(defTen).replace('.', ','));
    setRateB(null);
  }, [inp.mode, inp.iss, inp.seg, out.ten]); // eslint-disable-line react-hooks/exhaustive-deps

  const autoB = guide({ ...inp, ten: tenB }).mid;
  const rB = rateB ?? autoB;
  useEffect(() => { if (rateB == null) setRateStr(nf(autoB, 2)); }, [autoB, rateB]);

  const A = variant(vol, out.ten, out.mid);
  const B = variant(vol, tenB, rB);
  const d = B.perYear - A.perYear;
  const dt = Math.abs(tenB - out.ten);
  const longer = tenB > out.ten ? 'дольше' : 'короче';
  const verdict = Math.abs(d) < 0.5
    ? `Купон в год почти одинаковый${dt ? `; вариант B даёт деньги на ${yrs(dt)} ${longer}` : ''}.`
    : `Вариант B ${d > 0 ? 'дороже' : 'дешевле'} на ${mln(Math.abs(d))} в год${dt ? `, зато деньги на ${yrs(dt)} ${longer}` : ''}.`;

  return (
    <section className="card variants" aria-labelledby="var-h">
      <h2 id="var-h">Сравнить два варианта выпуска</h2>
      <p className="note">Объём {nf(vol, 1)}{NB}млрд{NB}₸. Ставка B считается тем же способом для нового срока; её можно поменять вручную.</p>
      <div className="scroll">
        <table className="tbl var-tbl">
          <thead>
            <tr><th scope="col"><span className="sr">Показатель</span></th><th className="num" scope="col">Вариант A</th><th className="num" scope="col">Вариант B</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Срок, лет</td>
              <td className="num">{nf(out.ten, out.ten % 1 ? 1 : 0)}</td>
              <td className="num">
                <input
                  className="input cell-in" type="text" inputMode="decimal" aria-label="Срок варианта B, лет" value={tenStr}
                  onChange={(e) => {
                    setTenStr(e.target.value);
                    const v = parse(e.target.value);
                    if (!Number.isNaN(v) && v > 0) { setTenB(Math.min(Math.max(v, 0.5), 15)); setRateB(null); }
                  }}
                />
              </td>
            </tr>
            <tr>
              <td>Ставка, % <span className="sub">середина ориентира</span></td>
              <td className="num">{nf(out.mid, 2)}</td>
              <td className="num">
                <input
                  className="input cell-in" type="text" inputMode="decimal" aria-label="Ставка варианта B, %" value={rateStr}
                  onChange={(e) => {
                    setRateStr(e.target.value);
                    const v = parse(e.target.value);
                    if (!Number.isNaN(v) && v > 0 && v < 60) setRateB(v);
                  }}
                />
              </td>
            </tr>
            <tr><td>Купон в год</td><td className="num">{mln(A.perYear)}</td><td className="num">{mln(B.perYear)}</td></tr>
            <tr><td>Купон за весь срок</td><td className="num">{mln(A.total)}</td><td className="num">{mln(B.total)}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="verdict">{verdict}</p>
    </section>
  );
}

/* ---------- buyers of similar deals (3.9) ---------- */
function Buyers({ rows }: { rows: CompRow[] }) {
  const bm = buyerMix(rows.map((r) => r.d));
  const top = topBuyer(bm);
  const [ref, w] = useWidth<HTMLDivElement>();
  const tip = useTip();
  const shown = BUY.filter((b) => bm.mix[b.k] > 0.05);
  let x = 0;
  const total = Math.max(100, BUY.reduce((a, b) => a + bm.mix[b.k], 0));
  return (
    <Block title="Кто покупал похожие выпуски" id="buy-h">
      <p className="note">
        {bm.n
          ? `Средние доли по ${bm.n} ${plural(bm.n, 'сделке', 'сделкам', 'сделкам')} из списка ниже, где KASE раскрыла покупателей. Больше всего — ${top.name.toLowerCase()}.`
          : 'По этим сделкам KASE не раскрыла покупателей.'}
      </p>
      {bm.n > 0 && (
        <>
          <div className="chart" ref={ref}>
            {w > 0 && (
              <svg width={w} height={28} viewBox={`0 0 ${w} 28`} role="group" aria-label="Состав покупателей похожих выпусков">
                {shown.map((b) => {
                  const v = bm.mix[b.k];
                  const bw = Math.max(1, (v / total) * w - 2);
                  const el = (
                    <rect key={b.k} x={x} y={0} width={bw} height={28} rx={4} fill={BUY_VAR[b.k]}
                      {...tip(() => [`${nf(v, 1)}%`, [b.name]])} />
                  );
                  x += bw + 2;
                  return el;
                })}
              </svg>
            )}
          </div>
          <div className="legend buy-legend">
            {shown.map((b) => (
              <span key={b.k}><i className="key" style={{ background: BUY_VAR[b.k] }} />{b.name} <b>{nf(bm.mix[b.k], 0)}%</b></span>
            ))}
          </div>
        </>
      )}
    </Block>
  );
}

/* ---------- comparable deals (3.8) ---------- */
function Comps({ rows, mode }: { rows: CompRow[]; mode: Mode }) {
  return (
    <Block
      title="Сопоставимые размещения"
      id="comps-h"
      aside={<span className="hint">{mode === 'repeat' ? 'свои выпуски и выпуски того же типа за 180 дней с близким сроком' : 'выпуски того же типа за 180 дней с близким сроком'}</span>}
    >
      <div className="scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Дата</th><th scope="col">Эмитент</th><th scope="col">Выпуск</th>
              <th scope="col" className="num">Срок</th><th scope="col" className="num">Ставка, %</th><th scope="col" className="num">Спред, {PP}</th>
              <th scope="col" className="num">Спрос к предл.</th><th scope="col" className="num">Физлица</th><th scope="col">Источник</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ d, own }) => (
              <tr key={d.id} className={own ? 'hl' : undefined}>
                <td className="date">{dmy(d.d)}</td>
                <td className="iss">{d.iss}{own && <span className="sub"> · свой выпуск</span>}</td>
                <td className="mono">{d.tk}</td>
                <td className="num">{yrs(d.ten)}</td>
                <td className="num">{nf(d.fin, 2)}</td>
                <td className="num">{sg(d.spr)}</td>
                <td className="num">{d.cov != null ? nf(d.cov, 1) + '%' : '—'}</td>
                <td className="num">{d.src ? nf(d.ret || 0, 1) + '%' : '—'}</td>
                <td><SrcLink id={d.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Block>
  );
}
