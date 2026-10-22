# -*- coding: utf-8 -*-
"""Данные для «Карты размещений» KASE Compass — как посчитан map_data.json.

Вход:  compass-pack/data/compass_data.json (187 размещений 09.01–19.10.2026).
Выход: map_data.json и map_issuers.csv. Повторный запуск даёт тот же файл.
"""
import json, csv, math, os, sys
from collections import OrderedDict

# Запуск из папки проекта:  python compass-map-pack/tools/build_map_data.py compass-pack/data/compass_data.json compass-map-pack/data
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join('compass-pack', 'data', 'compass_data.json')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join('compass-map-pack', 'data')
os.makedirs(OUT, exist_ok=True)

D = json.load(open(SRC, encoding='utf-8'))
DEALS = D['deals']
ASOF = D['asof']

SEGS = [
    ('quasi', 'Квазигосударственные', 'Квазигос', 'квазигосударственных компаний'),
    ('bank', 'Банки', 'Банки', 'банков'),
    ('corp', 'Корпорации', 'Корпорации', 'корпораций'),
    ('mfo', 'Микрофинансовые организации', 'МФО', 'МФО'),
    ('leas', 'Лизинговые компании', 'Лизинг', 'лизинговых компаний'),
    ('ifi', 'Международные финорганизации', 'Межд. финорганизации', 'международных финорганизаций'),
]
SEGNAME = {c: n for c, n, s, g in SEGS}
SEGSHORT = {c: s for c, n, s, g in SEGS}
SEGGEN = {c: g for c, n, s, g in SEGS}
PRIV = ['corp', 'mfo', 'leas']

LABELS = {
    'Самрук-Қазына': 'Самрук-Қазына',
    'Байтерек': 'Байтерек',
    'Отбасы банк': 'Отбасы банк',
    'Казахстанский фонд устойчивости': 'КФУ',
    'Казахстанская Жилищная Компания': 'КЖК',
    'Фонд развития промышленности': 'ФРП',
    'КазАгроФинанс': 'КазАгроФинанс',
    'Национальная компания QazaqGaz': 'QazaqGaz',
    'Аграрная кредитная корпорация': 'АКК',
    'Банк Развития Казахстана': 'БРК',
    'Bereke Bank': 'Bereke Bank',
    'Altyn Bank': 'Altyn Bank',
    'Народный Банк Казахстана': 'Народный банк',
    'Home Credit Bank': 'Home Credit',
    'Банк Bank RBK': 'Bank RBK',
    'KMF Банк': 'KMF Банк',
    'Банк ЦентрКредит': 'БЦК',
    'BI Development Ltd.': 'BI Development',
    'TRANZIT TRANS LOGISTICS': 'Tranzit Trans',
    'Сейф-Ломбард': 'Сейф-Ломбард',
    'QARABULAQ GOLD': 'Qarabulaq Gold',
    'BI Property': 'BI Property',
    'Fincraft Group': 'Fincraft',
    'Скулбас': 'Скулбас',
    'Eurasia Building-British': 'Eurasia Building',
    'BASS Gold': 'BASS Gold',
    'Евразийский банк развития': 'ЕАБР',
    'Азиатский банк развития': 'АБР',
    'Capital Leasing Group': 'Capital Leasing',
    'Лизинг Групп': 'Лизинг Групп',
    'Orbis Leasing': 'Orbis Leasing',
    'Garanti Leasing': 'Garanti Leasing',
    'Эксперт Лизинг': 'Эксперт Лизинг',
    'Smart Leasing': 'Smart Leasing',
    'TAS Finance Group': 'TAS Finance',
    'Шинхан Финанс': 'Шинхан Финанс',
    'MyCar Finance': 'MyCar Finance',
    'R-Finance': 'R-Finance',
    'Тойота Файнаншл Сервисез Казахстан': 'Тойота Файнаншл',
    'Swiss Capital': 'Swiss Capital',
    'MOST': 'MOST',
}

UNDER = 99.95  # как на сайте (SPEC 3.10): cov < 99,95 — недобор


def quantile(v, p):
    v = sorted(v)
    if not v:
        return None
    h = (len(v) - 1) * p
    lo, hi = math.floor(h), math.ceil(h)
    return v[lo] + (v[hi] - v[lo]) * (h - lo)


def med(v):
    return quantile(v, 0.5)


def r(x, n=2):
    return None if x is None else round(x + 0.0, n)


# Корзины цвета. Границы: [from, to). None — открытая граница.
BINS = {
    'demand': [
        {'key': 'w2', 'from': None, 'to': 80, 'label': 'меньше 80%'},
        {'key': 'w1', 'from': 80, 'to': UNDER, 'label': '80–100%'},
        {'key': 'n', 'from': UNDER, 'to': 105, 'label': '100–105%'},
        {'key': 'c1', 'from': 105, 'to': 150, 'label': '105–150%'},
        {'key': 'c2', 'from': 150, 'to': None, 'label': 'от 150%'},
    ],
    'price': [
        {'key': 'c2', 'from': None, 'to': -1.0, 'label': '−1 и ниже'},
        {'key': 'c1', 'from': -1.0, 'to': -0.25, 'label': 'от −1 до −0,25'},
        {'key': 'n', 'from': -0.25, 'to': 0.25, 'label': '±0,25'},
        {'key': 'w1', 'from': 0.25, 'to': 1.0, 'label': 'от +0,25 до +1'},
        {'key': 'w2', 'from': 1.0, 'to': None, 'label': '+1 и выше'},
    ],
}


def bin_of(mode, x):
    if x is None:
        return 'na'
    for b in BINS[mode]:
        lo = -math.inf if b['from'] is None else b['from']
        hi = math.inf if b['to'] is None else b['to']
        if lo <= x < hi:
            return b['key']
    raise ValueError(x)


def fmt(x, n=1):
    s = f'{x:,.{n}f}'.replace(',', ' ').replace('.', ',')
    return s.replace(' ', ' ')


def sgn(x, n=2):
    s = fmt(abs(x), n)
    return ('+' if x >= 0 else '−') + s


def plural(n, one, few, many):
    n10, n100 = n % 10, n % 100
    if n10 == 1 and n100 != 11:
        return one
    if 2 <= n10 <= 4 and not (12 <= n100 <= 14):
        return few
    return many


# ---- сегментная статистика спредов (SPEC 3.3) ----
seg_spr = {c: [x['spr'] for x in DEALS if x['seg'] == c and x['spr'] is not None] for c, *_ in SEGS}
seg_p50 = {c: med(v) for c, v in seg_spr.items()}

# ---- эмитенты ----
deals_sorted = sorted(DEALS, key=lambda x: (x['d'], x['id']))
iss = OrderedDict()
for x in deals_sorted:
    i = iss.setdefault(x['iss'], {'name': x['iss'], 'seg': x['seg'], 'deals': []})
    assert i['seg'] == x['seg'], x['iss']
    i['deals'].append(x)

issuers = []
for name, i in iss.items():
    ds = i['deals']
    cov = [x['cov'] for x in ds if x['cov'] is not None]
    spr = [x['spr'] for x in ds if x['spr'] is not None]
    cov_med = med(cov)
    spr_med = med(spr)
    delta = None if spr_med is None else spr_med - seg_p50[i['seg']]
    ten = [x['ten'] for x in ds if x['ten'] is not None]
    why = []
    if not spr:
        if any(x['ccy'] != 'KZT' for x in ds):
            why.append('выпуски в валюте')
        if any(x['knd'] == 'маржа' for x in ds):
            why.append('плавающая ставка')
        if any(x['fin'] is None for x in ds):
            why.append('ставка не раскрыта')
    issuers.append({
        'name': name,
        'label': LABELS[name],
        'seg': i['seg'],
        'vol_bn': r(sum(x['vol'] for x in ds), 3),
        'n': len(ds),
        'ccy': sorted({x['ccy'] for x in ds}),
        'first': ds[0]['d'],
        'last': ds[-1]['d'],
        'with_cov': len(cov),
        'under': sum(1 for c in cov if c < UNDER),
        'cov_med': r(cov_med, 2),
        'spr_n': len(spr),
        'spr_med': r(spr_med, 3),
        'seg_p50': r(seg_p50[i['seg']], 3),
        'spr_delta': r(delta, 3),
        'ten_med': r(med(ten), 2),
        'spr_na': ', '.join(why) if not spr else None,
        'cov_na': None if cov else 'KASE не опубликовала спрос к предложению',
        'bin_demand': bin_of('demand', cov_med),
        'bin_price': bin_of('price', delta),
        'in_guide': len(spr) > 0,
        'deal_ids': [x['id'] for x in sorted(ds, key=lambda x: (x['d'], x['id']), reverse=True)],
    })

# порядок: сегмент (фиксированный), затем объём по убыванию
segorder = {c: k for k, (c, *_) in enumerate(SEGS)}
issuers.sort(key=lambda z: (segorder[z['seg']], -z['vol_bn'], z['name']))

# ---- сегменты ----
TOT_VOL = sum(x['vol'] for x in DEALS)
TOT_N = len(DEALS)
segments = []
for c, n, s, g in SEGS:
    ds = [x for x in DEALS if x['seg'] == c]
    cov = [x['cov'] for x in ds if x['cov'] is not None]
    vol = sum(x['vol'] for x in ds)
    segments.append({
        'code': c, 'name': n, 'short': s,
        'issuers': sum(1 for z in issuers if z['seg'] == c),
        'n': len(ds),
        'vol_bn': r(vol, 3),
        'vol_share': r(vol / TOT_VOL * 100, 2),
        'n_share': r(len(ds) / TOT_N * 100, 2),
        'with_cov': len(cov),
        'under': sum(1 for v in cov if v < UNDER),
        'cov_med': r(med(cov), 2),
        'spr_n': len(seg_spr[c]),
        'spr_p50': r(seg_p50[c], 3),
    })
SEG = {s['code']: s for s in segments}

# ---- сделки для панели ----
deals_out = []
for x in sorted(DEALS, key=lambda x: (x['d'], x['id']), reverse=True):
    deals_out.append({k: x[k] for k in ['id', 'd', 'iss', 'tk', 'ccy', 'ten', 'met', 'fin', 'knd', 'spr', 'cov', 'vol', 'prt', 'ini']} |
                     {'url': f"https://kase.kz/ru/information/news/show/{x['id']}"})

# ---- тексты (считаются) ----
top_seg = max(segments, key=lambda s: s['vol_bn'])
priv_vol = sum(SEG[c]['vol_bn'] for c in PRIV)
priv_n = sum(SEG[c]['n'] for c in PRIV)
priv_vol_share = priv_vol / TOT_VOL * 100
by_n = sorted(issuers, key=lambda z: (-z['n'], -z['vol_bn']))
t1, t2, t3, t4 = by_n[:4]
assert t3['n'] == t4['n']

leas, quasi = SEG['leas'], SEG['quasi']
# сегмент с наибольшей долей недобора (при with_cov >= 10)
worst = max([s for s in segments if s['with_cov'] >= 10], key=lambda s: s['under'] / s['with_cov'])
assert worst['code'] == 'leas'

mfo_iss = [z for z in issuers if z['seg'] == 'mfo' and z['spr_med'] is not None]
mfo_lo = min(mfo_iss, key=lambda z: z['spr_med'])
mfo_hi = max(mfo_iss, key=lambda z: z['spr_med'])

texts = {
    'eyebrow': 'Карта рынка · 2026',
    'title_vol': f"{round(top_seg['vol_share'])}% денег рынка привлекли квазигосударственные компании",
    'sub_vol': (f"МФО, лизинг и корпорации привлекли {fmt(priv_vol_share, 1)}% денег, "
                f"но провели {priv_n} из {TOT_N} размещений. Переключите размер на «Размещения», чтобы их увидеть."),
    'title_cnt': f"МФО, лизинг и корпорации провели {priv_n} из {TOT_N} размещений",
    'sub_cnt': (f"Чаще всех на рынок выходили {t1['label']} ({t1['n']} {plural(t1['n'], 'размещение', 'размещения', 'размещений')}), "
                f"{t2['label']} ({t2['n']}), {t3['label']} и {t4['label']} (по {t3['n']})."),
    'cap_demand': (f"Цвет — медиана спроса к предложению по размещениям эмитента. Чаще всего спрос не покрывал предложение "
                   f"у лизинговых компаний: в {leas['under']} из {leas['with_cov']} размещений; "
                   f"у квазигосударственных — в {quasi['under']} из {quasi['with_cov']}."),
    'cap_price': (f"Цвет — медианный спред эмитента к ГЦБ того же срока относительно медианы его типа. "
                  f"Внутри одного типа разница большая: у МФО — от {sgn(mfo_lo['spr_med'])} п. п. у {mfo_lo['name']} "
                  f"до {sgn(mfo_hi['spr_med'])} у {mfo_hi['name']}. Это не всегда переплата: спред зависит от срока и риска эмитента."),
    'how_to_read': 'Одна плитка — один эмитент. Наведите курсор или нажмите на плитку, чтобы увидеть сделки.',
    'lg_demand': 'Спрос к предложению · медиана по размещениям эмитента',
    'lg_price': 'Спред к ГЦБ против медианы своего типа, п. п.',
    'size_vol': 'Площадь — привлечённый объём',
    'size_n': 'Площадь — число размещений',
    'note': ('Размещения на KASE с 09.01 по 19.10.2026: 187 сообщений KASE об итогах. Выпуски в долларах и рублях '
             'пересчитаны в тенге (USD — по 475,09 ₸). Спред — ставка размещения минус доходность ГЦБ того же срока; '
             'есть только у выпусков в тенге с фиксированной ставкой. Источник каждой сделки — ссылка «KASE ↗».'),
}

data = {
    'asof': ASOF,
    'period': '09.01–19.10.2026',
    'usd_rate': 475.09,
    'under_threshold': UNDER,
    'totals': {'issuers': len(issuers), 'n': TOT_N, 'vol_bn': r(TOT_VOL, 3)},
    'segments': segments,
    'bins': BINS,
    'issuers': issuers,
    'deals': deals_out,
    'texts': texts,
}

# ---- контрольные цифры ----
def cnt(mode):
    out = {}
    for z in issuers:
        k = z['bin_' + mode]
        out[k] = out.get(k, 0) + 1
    return out

IS = {z['name']: z for z in issuers}
acc = {
    'totals': data['totals'],
    'segments': {s['code']: {'issuers': s['issuers'], 'n': s['n'], 'vol_bn': round(s['vol_bn'], 1),
                             'under': s['under'], 'with_cov': s['with_cov'], 'spr_p50': round(s['spr_p50'], 3)} for s in segments},
    'top_vol': [[z['name'], round(z['vol_bn'], 1), z['n']] for z in sorted(issuers, key=lambda z: -z['vol_bn'])[:3]],
    'top_n': [[z['name'], z['n']] for z in by_n[:4]],
    'bins_demand': cnt('demand'),
    'bins_price': cnt('price'),
    'check_issuers': {k: {f: IS[k][f] for f in ['n', 'vol_bn', 'cov_med', 'under', 'with_cov', 'spr_med', 'spr_delta', 'bin_demand', 'bin_price', 'in_guide']}
                      for k in ['KMF Банк', 'BI Development Ltd.', 'Казахстанский фонд устойчивости', 'Шинхан Финанс', 'Самрук-Қазына', 'Capital Leasing Group']},
    'priv': {'vol_bn': round(priv_vol, 1), 'vol_share': round(priv_vol_share, 1), 'n': priv_n},
}
data['acceptance'] = acc

json.dump(data, open(os.path.join(OUT, 'map_data.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

with open(os.path.join(OUT, 'map_issuers.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['эмитент', 'подпись', 'тип', 'привлечено_млрд_тг', 'размещений', 'валюты', 'первое', 'последнее',
                'с_данными_о_спросе', 'с_недобором', 'медиана_спроса_%', 'сделок_со_спредом', 'медианный_спред_пп',
                'медиана_типа_пп', 'к_медиане_типа_пп', 'цвет_спрос', 'цвет_цена', 'ссылки_KASE'])
    for z in issuers:
        w.writerow([z['name'], z['label'], SEGNAME[z['seg']], z['vol_bn'], z['n'], '/'.join(z['ccy']), z['first'], z['last'],
                    z['with_cov'], z['under'], z['cov_med'], z['spr_n'], z['spr_med'], z['seg_p50'], z['spr_delta'],
                    z['bin_demand'], z['bin_price'],
                    ' '.join(f"https://kase.kz/ru/information/news/show/{i}" for i in z['deal_ids'])])

print(json.dumps(acc, ensure_ascii=False, indent=1))
print(json.dumps(texts, ensure_ascii=False, indent=1))
