/**
 * Program templates — ready-made weekly splits.
 * dow: 0 = Monday … 6 = Sunday.
 * item: { ex, sets, reps, rest, tempo?, rpe?, note? }
 */

const W = (dow, name, items) => ({ dow, name, items });

const t = (ex, sets, reps, rest, extra = {}) => ({ ex, sets, reps, rest, ...extra });

export const TEMPLATES = [
  {
    id: 'ppl-6',
    n: 'Push / Pull / Legs — 6 дней',
    en: 'PPL 6 days',
    level: 'advanced',
    goal: 'hypertrophy',
    perWeek: 6,
    desc: 'Классический сплит с двумя кругами: два дня на каждую группу — максимум объёма при коротком отдыхе между подходами.',
    tags: ['gym', 'hypertrophy'],
    days: [
      W(0, 'Push A', [
        t('bench-press', 4, '5-6', 180),
        t('incline-db-press', 4, '8-10', 105),
        t('db-lateral-raise', 4, '12-15', 60),
        t('cable-lateral', 3, '15-20', 45),
        t('triceps-pushdown', 3, '10-12', 45),
        t('overhead-ext', 3, '12-15', 60),
      ]),
      W(1, 'Pull A', [
        t('deadlift', 3, '4-6', 240),
        t('barbell-row', 4, '6-8', 150),
        t('pullup', 4, '6-10', 120),
        t('face-pull', 3, '15-20', 45),
        t('db-curl', 3, '10-12', 60),
        t('barbell-curl', 3, '8-10', 75),
      ]),
      W(2, 'Legs A', [
        t('back-squat', 4, '6-8', 210),
        t('rdl', 3, '8-10', 150),
        t('leg-press', 3, '10-12', 120),
        t('leg-curl-lie', 4, '10-12', 60),
        t('calf-raise', 4, '12-15', 45),
        t('adductor-machine', 3, '12-15', 45),
      ]),
      W(3, 'Push B', [
        t('ohp', 4, '6-8', 150),
        t('incline-bench', 4, '8-10', 150),
        t('db-fly', 3, '12-15', 75),
        t('db-shoulder-press', 3, '10-12', 105),
        t('skullcrusher', 3, '10-12', 75),
        t('bench-dip', 3, '12-15', 45),
      ]),
      W(4, 'Pull B', [
        t('barbell-row', 4, '8-10', 150),
        t('lat-pulldown', 4, '10-12', 90),
        t('chest-supported-row', 3, '10-12', 75),
        t('shrug', 4, '10-15', 60),
        t('hammer-curl', 4, '10-12', 60),
        t('straight-arm-pulldown', 3, '12-15', 45),
      ]),
      W(5, 'Legs B', [
        t('front-squat', 4, '6-8', 180),
        t('hip-thrust', 4, '8-10', 120),
        t('leg-extension', 4, '12-15', 60),
        t('seated-leg-curl', 4, '12-15', 60),
        t('seated-calf-raise', 4, '15-20', 45),
      ]),
    ],
  },

  {
    id: 'ul-4',
    n: 'Upper / Lower — 4 дня',
    en: 'Upper / Lower 4 days',
    level: 'intermediate',
    goal: 'hypertrophy',
    perWeek: 4,
    desc: 'Сбалансированный сплит: два верхних и два нижних дня в неделю. Подходит, если нужны ноги и спина чаще, чем руки.',
    tags: ['gym', 'balanced'],
    days: [
      W(0, 'Upper', [
        t('bench-press', 4, '5-8', 180),
        t('barbell-row', 4, '6-10', 150),
        t('db-shoulder-press', 3, '8-12', 105),
        t('lat-pulldown', 3, '10-12', 90),
        t('barbell-curl', 3, '10-12', 75),
        t('triceps-pushdown', 3, '12-15', 45),
      ]),
      W(1, 'Lower', [
        t('back-squat', 4, '6-8', 210),
        t('rdl', 3, '8-10', 150),
        t('leg-press', 3, '12-15', 120),
        t('leg-curl-lie', 4, '10-12', 60),
        t('calf-raise', 4, '12-15', 45),
      ]),
      W(3, 'Upper', [
        t('incline-bench', 4, '8-10', 150),
        t('pullup', 4, '6-10', 120),
        t('db-lateral-raise', 4, '12-15', 60),
        t('seated-cable-row', 3, '10-12', 90),
        t('hammer-curl', 3, '12-15', 60),
        t('skullcrusher', 3, '10-12', 75),
      ]),
      W(4, 'Lower', [
        t('front-squat', 4, '6-8', 180),
        t('hip-thrust', 4, '10-12', 120),
        t('bulgarian-split-squat', 3, '10/leg', 90, { u: true }),
        t('leg-extension', 3, '12-15', 60),
        t('seated-calf-raise', 4, '15-20', 45),
      ]),
    ],
  },

  {
    id: 'fullbody-3',
    n: 'Full Body ×3',
    en: 'Full Body 3 days',
    level: 'beginner',
    goal: 'general',
    perWeek: 3,
    desc: 'Три тренировки в неделю на всё тело. Лучший старт: каждая мышца работает 3 раза за 7 дней, силы и техника растут быстро.',
    tags: ['gym', 'beginner', 'balanced'],
    days: [
      W(0, 'Full Body A', [
        t('squat', 4, '6-8', 180),
        t('bench-press', 4, '6-8', 180),
        t('barbell-row', 3, '8-10', 150),
        t('db-lateral-raise', 3, '12-15', 60),
        t('plank', 3, '30-60s', 45, { tempo: 'iso' }),
      ]),
      W(2, 'Full Body B', [
        t('trapbar-deadlift', 4, '5-6', 180),
        t('incline-db-press', 4, '8-10', 105),
        t('lat-pulldown', 4, '10-12', 90),
        t('leg-curl-lie', 3, '10-12', 60),
        t('cable-crunch', 3, '12-15', 45),
      ]),
      W(4, 'Full Body C', [
        t('front-squat', 4, '6-8', 180),
        t('db-bench', 4, '8-10', 120),
        t('chest-supported-row', 4, '10-12', 75),
        t('hip-thrust', 3, '10-12', 120),
        t('farmer-carry', 3, '40m', 90, { tempo: 'iso' }),
      ]),
    ],
  },

  {
    id: 'arnold',
    n: 'Сплит Арнольда',
    en: 'Arnold Split',
    level: 'advanced',
    goal: 'hypertrophy',
    perWeek: 6,
    desc: 'Классическая бодибилдерская раскладка: грудь+трицепс, спина+бицепс дважды в неделю. Требует 6 тренировок и хорошего восстановления.',
    tags: ['gym', 'hypertrophy', 'boring'],
    days: [
      W(0, 'Chest & Triceps', [
        t('bench-press', 4, '8-10', 180),
        t('incline-bench', 4, '10-12', 150),
        t('cable-fly', 3, '12-15', 60),
        t('skullcrusher', 4, '10-12', 75),
        t('triceps-pushdown', 3, '12-15', 45),
      ]),
      W(1, 'Back & Biceps', [
        t('pullup', 4, '8-12', 120),
        t('barbell-row', 4, '8-10', 150),
        t('db-row', 3, '10-12', 75),
        t('seated-cable-row', 3, '10-12', 90),
        t('barbell-curl', 4, '8-10', 75),
        t('hammer-curl', 3, '12-15', 60),
      ]),
      W(2, 'Legs', [
        t('back-squat', 5, '8-10', 210),
        t('leg-press', 4, '12-15', 120),
        t('rdl', 4, '10-12', 150),
        t('leg-extension', 4, '12-15', 60),
        t('leg-curl-lie', 4, '12-15', 60),
        t('calf-raise', 5, '12-15', 45),
      ]),
      W(3, 'Chest & Triceps', [
        t('incline-db-press', 4, '10-12', 105),
        t('db-bench', 4, '10-12', 120),
        t('db-fly', 3, '12-15', 75),
        t('overhead-ext', 4, '10-12', 60),
        t('dips-triceps', 3, '8-12', 90),
      ]),
      W(4, 'Back & Biceps', [
        t('lat-pulldown', 4, '10-12', 90),
        t('t-bar-row', 4, '8-10', 120),
        t('chest-supported-row', 4, '10-12', 75),
        t('straight-arm-pulldown', 3, '12-15', 45),
        t('incline-db-curl', 4, '10-12', 60),
        t('preacher-curl', 3, '10-12', 60),
      ]),
      W(5, 'Legs', [
        t('front-squat', 5, '8-10', 180),
        t('hip-thrust', 4, '10-12', 120),
        t('leg-press', 4, '12-15', 120),
        t('nordic-curl', 3, '6-8', 150),
        t('seated-calf-raise', 5, '15-20', 45),
      ]),
    ],
  },

  {
    id: 'strength-5x5',
    n: 'Сила 5×5',
    en: 'Strength 5×5',
    level: 'intermediate',
    goal: 'strength',
    perWeek: 3,
    desc: 'Тяжёлые базовые движения в 5 подходах по 5 повторов. Классическая схема Павла Цыпкина: прогрессия +5% каждый цикл, разгрузочная неделя.',
    tags: ['gym', 'strength', 'beginner'],
    days: [
      W(0, 'Squat A', [
        t('back-squat', 5, '5', 240, { note: '+2.5 kg next block' }),
        t('bench-press', 5, '5', 210),
        t('barbell-row', 3, '5', 180),
        t('plank', 3, '45s', 45, { tempo: 'iso' }),
      ]),
      W(2, 'Bench A', [
        t('bench-press', 5, '5', 210),
        t('ohp', 5, '5', 210),
        t('back-squat', 3, '5', 240),
        t('chest-supported-row', 3, '8-10', 90),
      ]),
      W(4, 'Deadlift A', [
        t('deadlift', 5, '5', 300),
        t('incline-bench', 3, '8-10', 150),
        t('lat-pulldown', 3, '8-10', 90),
        t('farmer-carry', 3, '40m', 90, { tempo: 'iso' }),
      ]),
    ],
  },

  {
    id: 'home-bw',
    n: 'Дома своим весом',
    en: 'Home Bodyweight',
    level: 'beginner',
    goal: 'general',
    perWeek: 4,
    desc: 'Никакого зала: перекладина, скамья и пара гантелей. Прогрессия — через объём, темп и усложнение.',
    tags: ['home', 'beginner'],
    days: [
      W(0, 'Upper A', [
        t('pushup', 4, '8-15', 60),
        t('pike-pushup', 3, '8-12', 90),
        t('incline-db-press', 3, '10-12', 90),
        t('db-lateral-raise', 3, '12-20', 60),
        t('dips-triceps', 3, '8-12', 90),
        t('dead-hang', 3, '30-45s', 45, { tempo: 'iso' }),
      ]),
      W(1, 'Lower A', [
        t('bulgarian-split-squat', 4, '10/leg', 90, { u: true }),
        t('glute-bridge', 4, '15-20', 45),
        t('step-up', 3, '12/leg', 60, { u: true }),
        t('nordic-curl', 3, '6-10', 150),
        t('calf-raise', 4, '20', 45),
      ]),
      W(3, 'Lower B', [
        t('squat', 4, '15-20', 90),
        t('kb-swing', 4, '15', 90),
        t('lunge-curl', 3, '10/leg', 75, { u: true }),
        t('superman', 3, '15', 45),
      ]),
      W(5, 'Full Body HIIT', [
        t('burpee', 4, '10', 60),
        t('mountain-climber', 4, '30s', 30),
        t('jump-rope', 4, '45s', 30),
        t('kettlebell-swing-complex', 5, '40s/20s', 60),
        t('plank', 3, '45s', 45, { tempo: 'iso' }),
      ]),
    ],
  },

  {
    id: 'hiit-fat',
    n: 'HIIT + сила (жиросжигание)',
    en: 'HIIT + Strength',
    level: 'intermediate',
    goal: 'fatloss',
    perWeek: 4,
    desc: 'Чередование силовых и интервальных тренировок. Кардио в HIIT-режиме, сила в диапазоне 8–15 повторов с контролем темпа.',
    tags: ['gym', 'fatloss', 'hiit'],
    days: [
      W(0, 'Strength Lower', [
        t('trapbar-deadlift', 4, '8-10', 180),
        t('goblet-squat', 4, '12-15', 75),
        t('rdl', 3, '10-12', 150),
        t('hip-thrust', 3, '12-15', 120),
        t('leg-curl-lie', 3, '12-15', 60),
      ]),
      W(1, 'HIIT', [
        t('battle-ropes', 6, '30s/30s', 45),
        t('burpee', 6, '30s/30s', 45),
        t('mountain-climber', 6, '30s/30s', 30),
        t('rowing-machine', 6, '1min', 45),
      ]),
      W(3, 'Strength Upper', [
        t('bench-press', 4, '8-10', 180),
        t('lat-pulldown', 4, '10-12', 90),
        t('db-shoulder-press', 3, '10-12', 105),
        t('seated-cable-row', 3, '12-15', 90),
        t('db-curl', 3, '12-15', 60),
        t('triceps-pushdown', 3, '12-15', 45),
      ]),
      W(4, 'LISS Cardio', [
        t('light-bike-warmup', 1, '15-20 min', 30),
        t('stair-climber', 1, '20 min', 60),
        t('elliptical', 1, '10 min', 45),
      ]),
    ],
  },

  {
    id: 'bro-split',
    n: 'Бро-сплит (5 дней)',
    en: 'Classic Bro Split',
    level: 'beginner',
    goal: 'hypertrophy',
    perWeek: 5,
    desc: 'Одно упражнение на группу в день по Брофису. Понятно новичку, но медленный прогресс — каждый день работает одна зона.',
    tags: ['gym', 'beginner', 'boring'],
    days: [
      W(0, 'Chest', [
        t('bench-press', 4, '6-8', 180),
        t('incline-db-press', 4, '8-12', 105),
        t('cable-fly', 4, '12-15', 60),
        t('pushup', 3, 'AMRAP', 60),
      ]),
      W(1, 'Back', [
        t('deadlift', 4, '5-6', 240),
        t('pullup', 4, '8-10', 120),
        t('barbell-row', 4, '8-10', 150),
        t('face-pull', 3, '15-20', 45),
      ]),
      W(2, 'Legs', [
        t('squat', 5, '8-10', 210),
        t('leg-press', 4, '12-15', 120),
        t('leg-curl-lie', 4, '12-15', 60),
        t('leg-extension', 3, '15-20', 60),
        t('calf-raise', 5, '15-20', 45),
      ]),
      W(3, 'Shoulders', [
        t('ohp', 4, '6-8', 150),
        t('db-lateral-raise', 5, '12-15', 60),
        t('rear-delt-fly', 4, '15-20', 45),
        t('upright-row', 3, '10-12', 90),
      ]),
      W(4, 'Arms', [
        t('barbell-curl', 4, '8-10', 75),
        t('incline-db-curl', 4, '10-12', 60),
        t('hammer-curl', 3, '12-15', 60),
        t('skullcrusher', 4, '10-12', 75),
        t('overhead-ext', 3, '12-15', 60),
        t('triceps-pushdown', 3, '15-20', 45),
      ]),
    ],
  },
];

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((tpl) => [tpl.id, tpl]));

/** Warm-up suggestions per template type */
export const WARMUP = {
  upper: [
    { ex: 'arm-circles', note: '30 s' },
    { ex: 'band-shoulder-mobility', note: '10/10' },
    { ex: 'pushup', note: '1 set на разогрев' },
  ],
  lower: [
    { ex: 'leg-swings', note: '10/10' },
    { ex: 'glute-bridge-warmup', note: '15' },
    { ex: 'squat', note: '15' },
  ],
  full: [
    { ex: 'cat-cow', note: '8' },
    { ex: 'leg-swings', note: '10/10' },
    { ex: 'arm-circles', note: '20 s' },
  ],
};
