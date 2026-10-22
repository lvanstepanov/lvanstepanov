import { useMemo, useState } from 'react';
import { DEALS, SEGBY, SEGS, type Deal } from '../lib/compass';
import { NB, PP, dmy, nf, sg } from '../lib/format';
import { PageHead, SrcLink } from '../components/ui';

type Col = { k: keyof Deal; label: string; num: boolean; sortable?: boolean };
const COLS: Col[] = [
  { k: 'd', label: 'Дата', num: false },
  { k: 'iss', label: 'Эмитент', num: false },
  { k: 'seg', label: 'Тип', num: false },
  { k: 'tk', label: 'Выпуск', num: false },
  { k: 'ten', label: 'Срок, лет', num: true },
  { k: 'fin', label: 'Ставка, %', num: true },
  { k: 'spr', label: `Спред, ${PP}`, num: true },
  { k: 'cov', label: 'Спрос / предл., %', num: true },
  { k: 'prt', label: 'Участн.', num: true },
  { k: 'vol', label: `Объём, млрд${NB}₸`, num: true },
  { k: 'ret', label: 'Физлица, %', num: true },
  { k: 'ini', label: 'Организатор', num: false },
  { k: 'id', label: 'Источник', num: false, sortable: false },
];

export function Deals() {
  const [q, setQ] = useState('');
  const [seg, setSeg] = useState('');
  const [ccy, setCcy] = useState('');
  const [met, setMet] = useState('');
  const [sort, setSort] = useState<keyof Deal>('d');
  const [dir, setDir] = useState(-1);

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const r = DEALS.filter(
      (d) => (!qq || `${d.iss} ${d.tk}`.toLowerCase().includes(qq)) && (!seg || d.seg === seg) && (!ccy || d.ccy === ccy) && (!met || d.met === met),
    );
    const val = (d: Deal) => (sort === 'ret' ? (d.src ? d.ret || 0 : null) : d[sort]);
    return r.slice().sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (typeof va === 'string' ? va.localeCompare(vb as string, 'ru') : (va as number) - (vb as number)) * dir;
    });
  }, [q, seg, ccy, met, sort, dir]);

  const clickSort = (c: Col) => {
    if (sort === c.k) setDir(-dir);
    else { setSort(c.k); setDir(c.num || c.k === 'd' ? -1 : 1); }
  };

  return (
    <>
      <PageHead
        eyebrow="04 · База размещений"
        title="База размещений"
        lede="Каждая строка — сообщение KASE об итогах размещения, ссылка ведёт на источник. Покупатели — доли в спросе или в размещении, как их раскрыла KASE."
      />
      <section className="block" aria-label="Таблица размещений">
        <div className="filters">
          <div className="fld f-q">
            <label htmlFor="d-q">Поиск</label>
            <input id="d-q" className="input" type="search" placeholder="Эмитент или тикер" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="fld">
            <label htmlFor="d-seg">Тип эмитента</label>
            <select id="d-seg" className="input" value={seg} onChange={(e) => setSeg(e.target.value)}>
              <option value="">Все</option>
              {SEGS.map((s) => <option key={s.k} value={s.k}>{s.name}</option>)}
            </select>
          </div>
          <div className="fld">
            <label htmlFor="d-ccy">Валюта</label>
            <select id="d-ccy" className="input" value={ccy} onChange={(e) => setCcy(e.target.value)}>
              <option value="">Все</option><option value="KZT">Тенге</option><option value="USD">Доллары</option><option value="RUB">Рубли</option>
            </select>
          </div>
          <div className="fld">
            <label htmlFor="d-met">Способ</label>
            <select id="d-met" className="input" value={met} onChange={(e) => setMet(e.target.value)}>
              <option value="">Все</option><option value="спецторги">Специализированные торги</option><option value="подписка">Подписка</option>
            </select>
          </div>
          <p className="count" role="status">Найдено: <b>{rows.length}</b> из {DEALS.length}</p>
        </div>
        <div className="scroll deals-scroll">
          <table className="tbl deals-tbl">
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th key={c.k} scope="col" className={c.num ? 'num' : undefined} aria-sort={sort === c.k ? (dir > 0 ? 'ascending' : 'descending') : undefined}>
                    {c.sortable === false ? c.label : (
                      <button type="button" onClick={() => clickSort(c)}>
                        {c.label}
                        <span aria-hidden="true" className="sort-ic">{sort === c.k ? (dir > 0 ? '↑' : '↓') : ''}</span>
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td className="date">{dmy(d.d)}</td>
                  <td className="iss">{d.iss}</td>
                  <td className="sub">{SEGBY[d.seg].short}</td>
                  <td className="mono">{d.tk}{d.ccy !== 'KZT' && <span className="sub"> · {d.ccy}</span>}</td>
                  <td className="num">{d.ten != null ? nf(d.ten, d.ten % 1 ? 2 : 0) : '—'}</td>
                  <td className="num">{d.fin != null ? nf(d.fin, 2) : '—'}{d.knd === 'маржа' && <span className="sub" title="маржа к плавающей ставке">{NB}м</span>}</td>
                  <td className="num">{sg(d.spr)}</td>
                  <td className="num">{d.cov != null ? nf(d.cov, 1) : '—'}</td>
                  <td className="num">{d.prt != null ? nf(d.prt, 0) : '—'}</td>
                  <td className="num">{nf(d.vol, 2)}</td>
                  <td className="num">{d.src ? nf(d.ret || 0, 1) : '—'}</td>
                  <td className="ini">{d.ini || '—'}</td>
                  <td><SrcLink id={d.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note" style={{ marginTop: 12 }}>
          «м» — ставка задана маржой к плавающей ставке, без спреда. Сроки до погашения — по датам обращения из сообщений KASE. Суммы в долларах пересчитаны по 475,09{NB}₸.
        </p>
      </section>
    </>
  );
}
