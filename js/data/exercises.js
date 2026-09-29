/**
 * Exercise library.
 * Fields:
 *  id, n (name RU), en, p (primary muscle), s (secondary muscles),
 *  eq (equipment), t (type: strength|warmup|mobility|cardio), d (difficulty 1-4),
 *  pat (movement pattern), u (unilateral), bw (bodyweight friendly),
 *  rest (suggested rest, sec), tempo, cues (technique tips)
 */

import { getLang } from '../core/i18n.js';

export const MUSCLES = {
  chest: { n: 'Грудь', en: 'Chest' },
  lats: { n: 'Широчайшие', en: 'Lats' },
  back: { n: 'Спина', en: 'Back' },
  traps: { n: 'Трапеции', en: 'Traps' },
  rearDelts: { n: 'Задние дельты', en: 'Rear delts' },
  delts: { n: 'Дельты', en: 'Shoulders' },
  biceps: { n: 'Бицепс', en: 'Biceps' },
  triceps: { n: 'Трицепс', en: 'Triceps' },
  forearms: { n: 'Предплечья', en: 'Forearms' },
  abs: { n: 'Пресс', en: 'Abs' },
  obliques: { n: 'Косые', en: 'Obliques' },
  lowerBack: { n: 'Поясница', en: 'Lower back' },
  glutes: { n: 'Ягодицы', en: 'Glutes' },
  quads: { n: 'Квадрицепсы', en: 'Quads' },
  hamstrings: { n: 'Задняя поверхность бедра', en: 'Hamstrings' },
  calves: { n: 'Икры', en: 'Calves' },
  adductors: { n: 'Приводящие', en: 'Adductors' },
  neck: { n: 'Шея', en: 'Neck' },
  fullBody: { n: 'Всё тело', en: 'Full body' },
};

export const EQUIPMENT = {
  barbell: { n: 'Штанга', en: 'Barbell' },
  dumbbell: { n: 'Гантели', en: 'Dumbbells' },
  kettlebell: { n: 'Гиря', en: 'Kettlebell' },
  machine: { n: 'Тренажёр', en: 'Machine' },
  cable: { n: 'Канат', en: 'Cable' },
  bodyweight: { n: 'Своим весом', en: 'Bodyweight' },
  band: { n: 'Резинка', en: 'Band' },
  smith: { n: 'Смит', en: 'Smith machine' },
  trapbar: { n: 'Гантельная тяга', en: 'Trap bar' },
  ez: { n: 'Гриф EZ', en: 'EZ bar' },
  bench: { n: 'Скамья', en: 'Bench' },
  pullup: { n: 'Турник', en: 'Pull-up bar' },
  plate: { n: 'Блины', en: 'Plates' },
  sled: { n: 'Санки', en: 'Sled' },
  cardio: { n: 'Кардио', en: 'Cardio' },
};

export const PATTERNS = {
  horizPush: { n: 'Горизонтальный жим', en: 'Horizontal push' },
  vertPush: { n: 'Вертикальный жим', en: 'Vertical push' },
  horizPull: { n: 'Горизонтальная тяга', en: 'Horizontal pull' },
  vertPull: { n: 'Вертикальная тяга', en: 'Vertical pull' },
  squat: { n: 'Приседание', en: 'Squat' },
  hinge: { n: 'Наклон', en: 'Hinge' },
  lunge: { n: 'Выпад', en: 'Lunge' },
  carry: { n: 'Переноска', en: 'Carry' },
  antiRotation: { n: 'Антиротация', en: 'Anti-rotation' },
  rotation: { n: 'Ротация', en: 'Rotation' },
  iso: { n: 'Изоляция', en: 'Isolation' },
  dynamic: { n: 'Динамика', en: 'Dynamic' },
};

const E = (id, n, en, p, s, eq, t, d, pat, opts = {}) => ({
  id,
  n,
  en,
  p,
  s,
  eq,
  t,
  d,
  pat,
  u: !!opts.u,
  bw: !!opts.bw || eq === 'bodyweight' || eq === 'band',
  rest: opts.rest ?? (t === 'cardio' ? 30 : d >= 3 ? 150 : d === 2 ? 90 : 60),
  tempo: opts.tempo ?? (pat === 'iso' ? '2-1-1' : '3-1-1'),
  cues: opts.cues ?? [],
});

export const EXERCISES = [
  /* ---------------- ГРУДЬ ---------------- */
  E('bench-press', 'Жим штанги лёжа', 'Barbell Bench Press', 'chest', ['triceps', 'delts'], 'barbell', 'strength', 2, 'horizPush', {
    rest: 180,
    cues: ['Лопатки сведены вниз-назад, грудь вверх', 'Локоть под углом ~45° к корпусу', 'Точка касания — нижняя линия сосков'],
  }),
  E('incline-bench', 'Жим штанги на наклонной', 'Incline Barbell Press', 'chest', ['delts', 'triceps'], 'barbell', 'strength', 2, 'horizPush', {
    rest: 165,
    cues: ['Угол 30–45°, выше — дельты', 'Не отрывайте ягодицы от скамьи'],
  }),
  E('db-bench', 'Жим гантелей на скамье', 'Dumbbell Bench Press', 'chest', ['triceps', 'delts'], 'dumbbell', 'strength', 1, 'horizPush', {
    rest: 120,
    cues: ['Лопатки прижаты к скамье весь подход', 'Гантели на уровне сосков'],
  }),
  E('incline-db-press', 'Жим гантелей на наклонной', 'Incline Dumbbell Press', 'chest', ['delts', 'triceps'], 'dumbbell', 'strength', 1, 'horizPush', {
    rest: 105,
    cues: ['Скамья 30–45°', 'В нижней точке растягивайте грудную'],
  }),
  E('db-fly', 'Разведение гантелей', 'Dumbbell Fly', 'chest', ['delts'], 'dumbbell', 'strength', 1, 'iso', {
    rest: 75,
    cues: ['Небольшой сгиб в локте 15–20°', 'Только движение в суставах плеча'],
  }),
  E('cable-fly', 'Разведение в канате', 'Cable Crossover', 'chest', ['delts'], 'cable', 'strength', 1, 'iso', {
    rest: 60,
    cues: ['Руки чуть согнуты и зафиксированы', 'Впереди — акцент на грудь'],
  }),
  E('dips-chest', 'Отжимания на брусьях (грудь)', 'Chest Dips', 'chest', ['triceps', 'delts'], 'bodyweight', 'strength', 2, 'horizPush', {
    rest: 120,
    cues: ['Наклон корпуса вперёд усиливает грудь', 'Глубокая амплитуда, но без боли в плече'],
  }),
  E('pushup', 'Отжимания от пола', 'Push-up', 'chest', ['triceps', 'delts', 'abs'], 'bodyweight', 'strength', 1, 'horizPush', {
    rest: 60,
    cues: ['Тело — одна линия', 'Лопатки не разводятся'],
  }),
  E('pushup-decline', 'Отжимания с возвышения', 'Decline Push-up', 'chest', ['delts', 'triceps'], 'bodyweight', 'strength', 1, 'horizPush', {
    rest: 60,
    cues: ['Ноги на скамье → больше нагрузка на грудь'],
  }),
  E('svend', 'Свенд-пуш', 'Svend Press', 'chest', ['triceps', 'delts'], 'bodyweight', 'strength', 1, 'iso', {
    rest: 60,
    cues: ['Тяните блины в стороны максимально долго'],
  }),
  E('landmine-press', 'Жим гантели из Смит-грифа', 'Landmine Press', 'delts', ['chest', 'triceps'], 'barbell', 'strength', 2, 'vertPush', {
    rest: 90,
    cues: ['Диагональная траектория, акцент на переднюю дельту'],
  }),

  /* ---------------- СПИНА ---------------- */
  E('deadlift', 'Становая тяга', 'Conventional Deadlift', 'lowerBack', ['hamstrings', 'glutes', 'back', 'traps', 'forearms'], 'barbell', 'strength', 4, 'hinge', {
    rest: 240,
    cues: ['Бёдра назад, грудь вверх', 'Пятки прижаты, гриф прижимается к ногам', 'Ниже нейтральной — нейтральная спина'],
  }),
  E('sumo-deadlift', 'Сумовая тяга', 'Sumo Deadlift', 'glutes', ['adductors', 'hamstrings', 'lowerBack'], 'barbell', 'strength', 3, 'hinge', {
    rest: 210,
    cues: ['Широкая постановка стоп, носки наружу'],
  }),
  E('trapbar-deadlift', 'Тяга с гантельной (hex) грифом', 'Trap Bar Deadlift', 'glutes', ['quads', 'lowerBack', 'back'], 'trapbar', 'strength', 2, 'hinge', {
    rest: 180,
    cues: ['Корпус вертикальнее, чем в классической', 'Меньше нагрузка на поясницу'],
  }),
  E('rdl', 'Румынская тяга', 'Romanian Deadlift', 'hamstrings', ['glutes', 'lowerBack', 'back'], 'barbell', 'strength', 3, 'hinge', {
    rest: 150,
    cues: ['Слегка согнутые колени — постоянно', 'Таз идёт назад, гриф скользит по ногам'],
  }),
  E('rack-pull', 'Тяга со стойки', 'Rack Pull', 'back', ['traps', 'lats'], 'barbell', 'strength', 3, 'vertPull', {
    rest: 150,
    cues: ['Разгибание корпуса, лопатки вниз'],
  }),
  E('pullup', 'Подтягивания', 'Pull-up', 'lats', ['biceps', 'back', 'forearms'], 'pullup', 'strength', 3, 'vertPull', {
    rest: 150,
    cues: ['Начинайте с лопаток, потом руки', 'Никаких качений'],
  }),
  E('chinup', 'Подтягивания обратным хватом', 'Chin-up', 'lats', ['biceps', 'forearms'], 'pullup', 'strength', 2, 'vertPull', {
    rest: 120,
    cues: ['Локти вниз и назад'],
  }),
  E('lat-pulldown', 'Тяга верхнего блока', 'Lat Pulldown', 'lats', ['biceps', 'back'], 'cable', 'strength', 1, 'vertPull', {
    rest: 90,
    cues: ['Грудь к верхнему блоку', 'Плечи вниз на финише'],
  }),
  E('barbell-row', 'Тяга штанги в наклоне', 'Barbell Bent-over Row', 'back', ['lats', 'biceps', 'lowerBack'], 'barbell', 'strength', 3, 'horizPull', {
    rest: 150,
    cues: ['Корпус 45–60°, таз не прогибается', 'Тяните к поясу, а не к груди'],
  }),
  E('db-row', 'Тяга гантели в наклоне', 'One-arm Dumbbell Row', 'back', ['lats', 'biceps'], 'dumbbell', 'strength', 1, 'horizPull', {
    rest: 75,
    cues: ['Спина параллельна полу', 'Локоть идёт вдоль корпуса'],
  }),
  E('chest-supported-row', 'Тяга гантели с упором в скамью', 'Chest-supported Row', 'back', ['rearDelts', 'lats'], 'dumbbell', 'strength', 1, 'horizPull', {
    rest: 75,
    cues: ['Грудь в скамью — снимаем нагрузку с поясницы'],
  }),
  E('seated-cable-row', 'Горизонтальная тяга в канате', 'Seated Cable Row', 'back', ['lats', 'biceps', 'rearDelts'], 'cable', 'strength', 1, 'horizPull', {
    rest: 90,
    cues: ['Корпус не раскачивается', 'Сводите лопатки'],
  }),
  E('t-bar-row', 'Тяга в Т-грифе', 'T-Bar Row', 'back', ['lats', 'chest'], 'barbell', 'strength', 3, 'horizPull', {
    rest: 120,
    cues: ['Хват нейтральный, шире плеч'],
  }),
  E('machine-row', 'Тяга в тренажёре', 'Machine Row', 'back', ['lats', 'biceps'], 'machine', 'strength', 1, 'horizPull', {
    rest: 60,
    cues: ['Грудь в упор, спина прямая'],
  }),
  E('straight-arm-pulldown', 'Тяга прямых рук вниз', 'Straight-arm Pulldown', 'lats', ['triceps'], 'cable', 'strength', 1, 'vertPull', {
    rest: 60,
    cues: ['Руки прямые, работает только лопатка'],
  }),
  E('shrug', 'Шраги', 'Barbell Shrug', 'traps', ['forearms'], 'barbell', 'strength', 1, 'vertPull', {
    rest: 60,
    cues: ['Поднимайте плечи к ушам, без вращения'],
  }),
  E('face-pull', 'Тяга к лицу (rope)', 'Face Pull', 'rearDelts', ['traps', 'back'], 'cable', 'strength', 1, 'horizPull', {
    rest: 60,
    cues: ['Тяните к вискам, внешняя сторона'],
  }),
  E('superman', 'Супермен', 'Superman Hold', 'lowerBack', ['glutes', 'traps'], 'bodyweight', 'strength', 1, 'iso', {
    rest: 45,
    cues: ['Поднимайте грудной отдел, не за счёт шеи'],
  }),

  /* ---------------- ПЛЕЧИ ---------------- */
  E('ohp', 'Жим штанги стоя', 'Overhead Press', 'delts', ['triceps', 'chest', 'abs'], 'barbell', 'strength', 2, 'vertPush', {
    rest: 150,
    cues: ['Ягодицы сжаты, пресс напряжён', 'Не прогибайтесь в пояснице'],
  }),
  E('db-shoulder-press', 'Жим гантелей сидя', 'Seated DB Shoulder Press', 'delts', ['triceps'], 'dumbbell', 'strength', 1, 'vertPush', {
    rest: 105,
    cues: ['Спина в спинку скамьи'],
  }),
  E('db-lateral-raise', 'Махи гантелями в стороны', 'Lateral Raise', 'delts', [], 'dumbbell', 'strength', 1, 'iso', {
    rest: 60,
    cues: ['Наклон 10–15° вперёд', 'Поднимайте до уровня плеч, не выше'],
  }),
  E('cable-lateral', 'Махи в канате', 'Cable Lateral Raise', 'delts', [], 'cable', 'strength', 1, 'iso', {
    rest: 45,
    cues: ['Постоянное напряжение, без раскачки'],
  }),
  E('rear-delt-fly', 'Махи на задние дельты', 'Rear Delt Fly', 'rearDelts', ['back'], 'dumbbell', 'strength', 1, 'iso', {
    rest: 45,
    cues: ['Наклон корпуса 60–90°'],
  }),
  E('arnold-press', 'Жим гантелей Арнольда', 'Arnold Press', 'delts', ['chest', 'triceps'], 'dumbbell', 'strength', 2, 'vertPush', {
    rest: 90,
    cues: ['Разворачивайте кисти в ходе движения'],
  }),
  E('pike-pushup', 'Отжимания пирамидкой', 'Pike Push-up', 'delts', ['triceps', 'chest'], 'bodyweight', 'strength', 2, 'vertPush', {
    rest: 90,
    cues: ['Таз вверх, голова к полу', 'Амплитуда ниже, вес тела'],
  }),
  E('upright-row', 'Тяга штанги к подбородку', 'Upright Row', 'delts', ['back', 'biceps'], 'barbell', 'strength', 2, 'vertPull', {
    rest: 90,
    cues: ['Локти выше кистей', 'Движение строго вверх'],
  }),

  /* ---------------- РУКИ ---------------- */
  E('barbell-curl', 'Сгибание штанги стоя', 'Barbell Curl', 'biceps', ['forearms'], 'barbell', 'strength', 1, 'iso', {
    rest: 75,
    cues: ['Локти у корпуса', 'Не раскачивайте корпус'],
  }),
  E('db-curl', 'Сгибание гантелей', 'Dumbbell Curl', 'biceps', ['forearms'], 'dumbbell', 'strength', 1, 'iso', {
    rest: 60,
    cues: ['Разгибайте полностью внизу'],
  }),
  E('incline-db-curl', 'Сгибание гантелей на наклонной', 'Incline DB Curl', 'biceps', [], 'dumbbell', 'strength', 1, 'iso', {
    rest: 60,
    cues: ['Растяжение внизу, скамья 30–45°'],
  }),
  E('hammer-curl', 'Молотковое сгибание', 'Hammer Curl', 'biceps', ['forearms'], 'dumbbell', 'strength', 1, 'iso', {
    rest: 60,
    cues: ['Нейтральный хват — акцент на плечелучевую'],
  }),
  E('preacher-curl', 'Сгибание на скамье Скотта', 'Preacher Curl', 'biceps', [], 'bench', 'strength', 2, 'iso', {
    rest: 60,
    cues: ['Плечо в упор — изоляция без раскачки'],
  }),
  E('cable-curl', 'Сгибание в канате', 'Cable Curl', 'biceps', [], 'cable', 'strength', 1, 'iso', {
    rest: 45,
    cues: ['Постоянное напряжение'],
  }),
  E('zottman-curl', 'Сгибание Зоттмана', 'Zottman Curl', 'biceps', ['forearms'], 'dumbbell', 'strength', 2, 'iso', {
    rest: 60,
    cues: ['Супинация вверху, пронация внизу'],
  }),
  E('triceps-pushdown', 'Разгибание в канате', 'Triceps Pushdown', 'triceps', [], 'cable', 'strength', 1, 'iso', {
    rest: 45,
    cues: ['Локти зафиксированы у корпуса'],
  }),
  E('skullcrusher', 'Французский жим', 'Skull Crusher', 'triceps', [], 'ez', 'strength', 2, 'iso', {
    rest: 75,
    cues: ['Только предплечья двигаются, плечо неподвижно'],
  }),
  E('overhead-ext', 'Разгибание над головой', 'Overhead Triceps Extension', 'triceps', [], 'dumbbell', 'strength', 1, 'iso', {
    rest: 60,
    cues: ['Смотрите на кисти внизу'],
  }),
  E('dips-triceps', 'Отжимания на брусьях (трицепс)', 'Triceps Dips', 'triceps', ['chest'], 'bodyweight', 'strength', 2, 'horizPush', {
    rest: 90,
    cues: ['Корпус вертикальный, ноги близко'],
  }),
  E('bench-dip', 'Отжимания от скамьи', 'Bench Dip', 'triceps', ['delts'], 'bodyweight', 'strength', 1, 'horizPush', {
    rest: 45,
    cues: ['Локоть уходит назад, а не в стороны'],
  }),
  E('wrist-curl', 'Сгибание запястья', 'Wrist Curl', 'forearms', [], 'dumbbell', 'strength', 1, 'iso', { rest: 40 }),
  E('farmer-carry', 'Переноска гантелей', 'Farmer Carry', 'forearms', ['traps', 'abs', 'back'], 'dumbbell', 'strength', 1, 'carry', {
    rest: 90,
    tempo: 'iso',
    cues: ['Плечи назад, корпус как доска', 'Идеально для укрепления хвата и корпуса'],
  }),
  E('dead-hang', 'Вис на перекладине', 'Dead Hang', 'forearms', ['lats'], 'pullup', 'strength', 1, 'iso', { rest: 45 }),

  /* ---------------- НОГИ ---------------- */
  E('back-squat', 'Приседание со штангой', 'Back Squat', 'quads', ['glutes', 'hamstrings', 'lowerBack', 'abs'], 'barbell', 'strength', 3, 'squat', {
    rest: 210,
    cues: ['Гриф на трапециях/скраме или на дельтах', 'Колени по носкам, разводите их в приседе', 'Глубина — до параллели и ниже'],
  }),
  E('front-squat', 'Приседание с грифом на груди', 'Front Squat', 'quads', ['abs', 'back', 'glutes'], 'barbell', 'strength', 3, 'squat', {
    rest: 180,
    cues: ['Локти высоко, корпус вертикальный'],
  }),
  E('goblet-squat', 'Гоблет-присед', 'Goblet Squat', 'quads', ['glutes', 'abs'], 'dumbbell', 'strength', 1, 'squat', {
    rest: 75,
    cues: ['Гантель у груди, локти вниз'],
  }),
  E('squat', 'Присед с собственным весом', 'Bodyweight Squat', 'quads', ['glutes', 'hamstrings'], 'bodyweight', 'strength', 1, 'squat', {
    rest: 60,
    cues: ['Стопы на ширине плеч, носки наружу', 'Глубина до параллели бёдер с полом', 'Корпус слегка наклонён вперёд'],
  }),
  E('leg-press', 'Жим ногами в тренажёре', 'Leg Press', 'quads', ['glutes', 'hamstrings'], 'machine', 'strength', 1, 'squat', {
    rest: 120,
    cues: ['Поясница остаётся прижатой', 'Не блокируйте колени вверху'],
  }),
  E('hack-squat', 'Гакк-присед', 'Hack Squat', 'quads', ['glutes'], 'machine', 'strength', 2, 'squat', { rest: 105 }),
  E('bulgarian-split-squat', 'Болгарский сплит-присед', 'Bulgarian Split Squat', 'quads', ['glutes', 'hamstrings'], 'dumbbell', 'strength', 2, 'lunge', {
    u: true,
    rest: 90,
    cues: ['Передняя нога — 90°, корпус слегка вперёд'],
  }),
  E('walking-lunge', 'Выпады с переносом', 'Walking Lunge', 'quads', ['glutes', 'hamstrings'], 'dumbbell', 'strength', 2, 'lunge', {
    u: true,
    rest: 90,
    cues: ['Колено не выходит за носок'],
  }),
  E('reverse-lunge', 'Обратный выпад', 'Reverse Lunge', 'quads', ['glutes'], 'dumbbell', 'strength', 1, 'lunge', { u: true, rest: 75 }),
  E('step-up', 'Зашагивание на тумбу', 'Step-up', 'quads', ['glutes'], 'dumbbell', 'strength', 1, 'lunge', {
    u: true,
    rest: 60,
    cues: ['Выносите колено над стопой'],
  }),
  E('lunge-curl', 'Выпад с гантелями (сгибание)', 'Lunge with Dumbbell Curl', 'quads', ['biceps', 'glutes'], 'dumbbell', 'strength', 2, 'lunge', { u: true, rest: 75 }),
  E('leg-extension', 'Разгибание ног', 'Leg Extension', 'quads', [], 'machine', 'strength', 1, 'iso', { rest: 60 }),
  E('leg-curl-lie', 'Сгибание ног лёжа', 'Lying Leg Curl', 'hamstrings', ['calves'], 'machine', 'strength', 1, 'iso', { rest: 60 }),
  E('nordic-curl', 'Скандинавское сгибание', 'Nordic Hamstring Curl', 'hamstrings', ['glutes'], 'bodyweight', 'strength', 4, 'iso', {
    rest: 150,
    cues: ['Одно из лучших упражнений для задней поверхности'],
  }),
  E('seated-leg-curl', 'Сгибание ног сидя', 'Seated Leg Curl', 'hamstrings', [], 'machine', 'strength', 1, 'iso', { rest: 60 }),
  E('hip-thrust', 'Ягодичный мост', 'Hip Thrust', 'glutes', ['hamstrings', 'abs'], 'barbell', 'strength', 2, 'hinge', {
    rest: 120,
    cues: ['Подбородок в грудь, таз вверх', 'Задержка вверху 1–2 с'],
  }),
  E('kb-swing', 'Рывок гири', 'Kettlebell Swing', 'glutes', ['hamstrings', 'lowerBack', 'abs'], 'kettlebell', 'strength', 3, 'hinge', {
    rest: 90,
    cues: ['Взрыв бёдер, а не рук', 'Мощное сокращение ягодиц'],
  }),
  E('glute-bridge', 'Ягодичный мост без веса', 'Glute Bridge', 'glutes', ['hamstrings'], 'bodyweight', 'strength', 1, 'hinge', { rest: 45 }),
  E('hip-thrust-db', 'Ягодичный мост с гантелью', 'DB Hip Thrust', 'glutes', ['hamstrings'], 'dumbbell', 'strength', 1, 'hinge', { rest: 90 }),
  E('calf-raise', 'Подъём на носки стоя', 'Standing Calf Raise', 'calves', [], 'machine', 'strength', 1, 'iso', { rest: 45, tempo: '1-2-1' }),
  E('seated-calf-raise', 'Подъём на носки сидя', 'Seated Calf Raise', 'calves', [], 'machine', 'strength', 1, 'iso', { rest: 45 }),
  E('jump-rope', 'Скакалка', 'Jump Rope', 'calves', ['fullBody'], 'cardio', 'cardio', 1, 'dynamic', { rest: 30, bw: true }),
  E('adductor-machine', 'Сведение ног в тренажёре', 'Adductor Machine', 'adductors', ['glutes'], 'machine', 'strength', 1, 'iso', { rest: 45 }),
  E('sumo-squat-db', 'Присед с гантелью (сумо)', 'Sumo DB Squat', 'adductors', ['glutes', 'quads'], 'dumbbell', 'strength', 1, 'squat', { rest: 75 }),

  /* ---------- ПРЕСС / КОР ---------- */
  E('plank', 'Планка', 'Plank', 'abs', ['obliques', 'delts', 'glutes'], 'bodyweight', 'strength', 1, 'antiRotation', {
    rest: 45,
    tempo: 'iso',
    cues: ['Таз не провисает', 'Напрягите пресс и ягодицы'],
  }),
  E('side-plank', 'Боковая планка', 'Side Plank', 'obliques', ['abs'], 'bodyweight', 'strength', 1, 'antiRotation', { rest: 45, tempo: 'iso' }),
  E('dead-bug', 'Dead Bug', 'Dead Bug', 'abs', ['obliques'], 'bodyweight', 'strength', 1, 'antiRotation', { rest: 40, tempo: '3-1-3' }),
  E('hanging-leg-raise', 'Подъём ног в висе', 'Hanging Leg Raise', 'abs', ['forearms', 'lats'], 'pullup', 'strength', 3, 'iso', { rest: 60 }),
  E('cable-crunch', 'Скручивание в канате', 'Cable Crunch', 'abs', ['obliques'], 'cable', 'strength', 1, 'iso', { rest: 45 }),
  E('russian-twist', 'Русский твист', 'Russian Twist', 'obliques', ['abs'], 'bodyweight', 'strength', 1, 'rotation', { rest: 45 }),
  E('hollow-body', 'Hollow Body Hold', 'Hollow Body Hold', 'abs', ['lowerBack'], 'bodyweight', 'strength', 2, 'antiRotation', { rest: 45, tempo: 'iso' }),
  E('pallof-press', 'Палов-пресс', 'Pallof Press', 'obliques', ['abs', 'back'], 'band', 'strength', 1, 'antiRotation', { rest: 45 }),
  E('mountain-climber', 'Альпинист', 'Mountain Climber', 'abs', ['fullBody'], 'bodyweight', 'cardio', 2, 'dynamic', { rest: 30 }),
  E('leg-raise', 'Подъём ног лёжа', 'Lying Leg Raise', 'abs', ['quads'], 'bodyweight', 'strength', 1, 'iso', { rest: 45 }),
  E('bicycle-crunch', 'Велосипед', 'Bicycle Crunch', 'abs', ['obliques'], 'bodyweight', 'strength', 1, 'rotation', { rest: 45 }),

  /* ---------- РАЗМИНКА / МОБИЛЬНОСТЬ / КАРДИО ---------- */
  E('jump-rope-interval', 'Скакалка интервалами', 'Jump Rope Intervals', 'fullBody', ['calves'], 'cardio', 'cardio', 1, 'dynamic', { rest: 20 }),
  E('rowing-machine', 'Гребной тренажёр', 'Rowing Machine', 'fullBody', ['lats', 'quads', 'back'], 'cardio', 'cardio', 2, 'dynamic', { rest: 60 }),
  E('bike', 'Велотренажёр', 'Stationary Bike', 'quads', ['glutes', 'calves'], 'cardio', 'cardio', 1, 'dynamic', { rest: 45 }),
  E('elliptical', 'Эллиптический тренажёр', 'Elliptical', 'fullBody', ['glutes'], 'cardio', 'cardio', 1, 'dynamic', { rest: 45 }),
  E('battle-ropes', 'Боевые верёвки', 'Battle Ropes', 'fullBody', ['delts', 'calves'], 'cardio', 'cardio', 2, 'dynamic', { rest: 60 }),
  E('sled-push', 'Толкание санок', 'Sled Push', 'fullBody', ['quads', 'glutes', 'calves'], 'sled', 'strength', 2, 'dynamic', { rest: 90 }),
  E('sled-pull', 'Тяга санок', 'Sled Pull', 'fullBody', ['lats', 'back'], 'sled', 'strength', 2, 'dynamic', { rest: 90 }),
  E('stair-climber', 'Степпер', 'Stair Climber', 'glutes', ['quads', 'calves'], 'cardio', 'cardio', 2, 'dynamic', { rest: 45 }),
  E('kettlebell-swing-complex', 'Гиря: качели + чистая', 'KB Complex', 'fullBody', ['glutes', 'abs'], 'kettlebell', 'cardio', 3, 'dynamic', { rest: 60 }),
  E('assault-bike', 'Ассаулт-байк', 'Assault Bike', 'fullBody', ['quads', 'delts'], 'cardio', 'cardio', 3, 'dynamic', { rest: 60 }),
  E('burpee', 'Бёрпи', 'Burpee', 'fullBody', ['chest', 'quads', 'glutes'], 'bodyweight', 'cardio', 2, 'dynamic', { rest: 60 }),
  E('thruster', 'Трастер', 'Thruster', 'fullBody', ['quads', 'delts'], 'dumbbell', 'cardio', 3, 'dynamic', { rest: 60 }),
  E('box-jump', 'Прыжок на тумбу', 'Box Jump', 'fullBody', ['quads', 'glutes'], 'bodyweight', 'cardio', 2, 'dynamic', { rest: 60 }),
  E('cat-cow', 'Кошка-корова', 'Cat-Cow', 'lowerBack', ['abs', 'glutes'], 'bodyweight', 'mobility', 1, 'dynamic', { rest: 30, tempo: '2-2-2-2' }),
  E('world-greatest', 'World’s Greatest Stretch', 'World’s Greatest Stretch', 'glutes', ['hamstrings', 'lowerBack'], 'bodyweight', 'mobility', 1, 'dynamic', { rest: 30 }),
  E('hip-flexor-stretch', 'Растяжка сгибателей бедра', 'Hip Flexor Stretch', 'quads', ['glutes'], 'bodyweight', 'mobility', 1, 'dynamic', { rest: 30, tempo: 'iso' }),
  E('thoracic-rotation', 'Ротация грудного отдела', 'Thoracic Rotation', 'back', ['obliques'], 'bodyweight', 'mobility', 1, 'dynamic', { rest: 30 }),
  E('ankle-mobility', 'Мобильность голеностопа', 'Ankle Mobility', 'calves', [], 'bodyweight', 'mobility', 1, 'dynamic', { rest: 30 }),
  E('foam-roll', 'Миофасциальный релиз', 'Foam Rolling', 'fullBody', [], 'cardio', 'mobility', 1, 'dynamic', { rest: 20 }),
  E('light-bike-warmup', 'Лёгкий велотренажёр (разминка)', 'Bike Warm-up', 'fullBody', [], 'cardio', 'warmup', 1, 'dynamic', { rest: 20 }),
  E('arm-circles', 'Круговые вращения руками', 'Arm Circles', 'delts', [], 'bodyweight', 'warmup', 1, 'dynamic', { rest: 15 }),
  E('leg-swings', 'Махи ногами', 'Leg Swings', 'hamstrings', ['glutes'], 'bodyweight', 'warmup', 1, 'dynamic', { rest: 20 }),
  E('glute-bridge-warmup', 'Активация ягодиц', 'Glute Bridge Activation', 'glutes', ['hamstrings'], 'bodyweight', 'warmup', 1, 'dynamic', { rest: 20 }),
  E('band-shoulder-mobility', 'Мобильность плеч с резинкой', 'Band Shoulder Mobility', 'delts', ['back'], 'band', 'warmup', 1, 'dynamic', { rest: 20 }),
];

/** Exercise lookup by id */
export const EX_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export const getExercise = (id) => EX_BY_ID[id] || null;

/** Muscle label in the active language. */
export const muscleName = (id) => {
  const m = MUSCLES[id];
  if (!m) return id;
  return getLang() === 'en' ? m.en || m.n : m.n;
};

/** Human-readable muscle list, localised for display. */
export const muscleNames = (ex, primaryFirst = true) => {
  if (!ex) return [];
  return [...(primaryFirst ? [ex.p] : []), ...ex.s].map(muscleName);
};

/** Both languages at once — for search, where the user may type either. */
export const muscleSearchText = (ex) => {
  if (!ex) return '';
  return [...new Set([ex.p, ...ex.s])]
    .flatMap((m) => [MUSCLES[m]?.n, MUSCLES[m]?.en])
    .filter(Boolean)
    .join(' ');
};

/** Equipment and movement-pattern labels, localised for display. */
const localized = (id, table) => {
  const m = table[id];
  if (!m) return id;
  return getLang() === 'en' ? m.en || m.n : m.n;
};

export const equipmentName = (id) => localized(id, EQUIPMENT);
export const patternName = (id) => localized(id, PATTERNS);
