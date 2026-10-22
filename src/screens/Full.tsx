import { NB } from '../lib/format';
import { Block, PageHead } from '../components/ui';

const AGR = [
  ['Кривая спроса по заявкам', 'Сколько денег было на каждой ставке: можно ли было взять больше или дешевле.'],
  ['Подробные категории покупателей', 'Пенсионные активы, страховые компании, УИП, банки, брокеры, физлица, нерезиденты — по каждому выпуску, только агрегатами, без имён.'],
  ['Первые 30 дней торгов', 'Цена сделок после размещения против цены размещения: был ли выпуск недооценён и насколько.'],
];
const OPEN = [
  ['Рейтинги эмитентов', 'Сузят коридор для новых эмитентов: сейчас на истории ошибка по ним около 2 п. п.'],
  ['Календарь размещений', 'Объявленные торги и подписки и выпуски, недавно включённые в список: кто выйдет к тем же инвесторам на этой неделе.'],
  ['PDF для совета директоров и API', 'Обоснование ставки со списком сделок и источниками; выгрузка базы для андеррайтеров.'],
];
const PLANS = [
  { name: 'Старт', mrp: 50, tng: '216 250', items: ['МФО, лизинговые компании, новые эмитенты', 'База, спреды, рынок сейчас', '2 пользователя'] },
  { name: 'Эмитент', mrp: 100, tng: '432 500', items: ['Казначейства корпораций, банков, квазигосударственных компаний', 'Плюс ориентир купона, покупатели, PDF для совета директоров', '5 пользователей'] },
  { name: 'Профессиональный', mrp: 200, tng: '865 000', items: ['Андеррайтеры, инвестиционные банки, институционалы', 'Плюс API и выгрузка всей базы', 'Пользователи без лимита'] },
];

export function Full() {
  return (
    <>
      <PageHead
        eyebrow="07 · Полная версия"
        title="Что добавит полная версия"
        lede="MVP работает на открытых сообщениях KASE. Полная версия опирается на данные, которые есть только у биржи; их KASE предоставляет по соглашению."
      />
      <Block title="По соглашению с KASE" id="f-agr">
        <ul className="feat">
          {AGR.map(([h, p], i) => (
            <li key={h}>
              <span className="eyebrow feat-tag tag-agr">по соглашению</span>
              <h3>{h}</h3>
              {i === 0 && <DemandSketch />}
              <p className="note">{i === 0 ? 'Схема без цифр. ' : ''}{p}</p>
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Из открытых данных" id="f-open">
        <ul className="feat">
          {OPEN.map(([h, p]) => (
            <li key={h}>
              <span className="eyebrow feat-tag tag-open">открытые данные</span>
              <h3>{h}</h3>
              <p className="note">{p.replace(' п. п.', `${NB}п.${NB}п.`)}</p>
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Тарифы" id="f-plans">
        <ul className="plans">
          {PLANS.map((p) => (
            <li key={p.name}>
              <h3>{p.name}</h3>
              <div className="plan-price">{p.mrp}{NB}МРП</div>
              <div className="hint">{p.tng.replace(' ', ' ')}{NB}₸ в месяц</div>
              <ul className="plan-items">{p.items.map((x) => <li key={x}>{x}</li>)}</ul>
            </li>
          ))}
        </ul>
        <p className="note" style={{ marginTop: 16 }}>Без НДС, МРП 2026 года — 4{' '}325{NB}₸. Цены — гипотеза команды, проверяем на интервью.</p>
      </Block>
    </>
  );
}

/** Schematic, no numbers: demand volume by bid rate. */
function DemandSketch() {
  const steps = [6, 10, 18, 30, 44, 58, 70, 78, 84, 88];
  return (
    <svg viewBox="0 0 220 84" width="100%" height="84" aria-hidden="true" style={{ display: 'block', margin: '12px 0' }}>
      <line x1="0" x2="220" y1="80" y2="80" stroke="var(--line-strong)" strokeWidth="1" />
      {steps.map((v, i) => (
        <rect key={i} x={i * 22 + 2} y={80 - v * 0.85} width="18" height={v * 0.85} rx="2" fill={i === 5 ? 'var(--data)' : 'var(--data-soft)'} />
      ))}
      <line x1="123" x2="123" y1="4" y2="80" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  );
}
