<p align="center">
  <img src="assets/icons/icon.svg" alt="FitPulse" width="112" height="112">
</p>

<h1 align="center">FitPulse</h1>

<p align="center"><strong>Офлайн-трекер тренировок и питания.</strong><br>
PWA и Android. Без рекламы, без аккаунта, без сервера.<br>
Все данные остаются в <code>localStorage</code> устройства.</p>

<p align="center">
  <a href="https://github.com/arcnosixta/fitpulse/releases/latest">
    <img alt="release" src="https://img.shields.io/github/v/release/arcnosixta/fitpulse?label=release&color=b6ff3a"></a>
  <a href="https://github.com/arcnosixta/fitpulse/blob/main/LICENSE">
    <img alt="license" src="https://img.shields.io/github/license/arcnosixta/fitpulse?color=35e0ff"></a>
  <a href="https://github.com/arcnosixta/fitpulse/actions/workflows/pages.yml">
    <img alt="deploy" src="https://github.com/arcnosixta/fitpulse/actions/workflows/pages.yml/badge.svg"></a>
  <img alt="dependencies" src="https://img.shields.io/badge/runtime_dependencies-0-b6ff3a">
  <img alt="bundle" src="https://img.shields.io/badge/web-620_KB-35e0ff">
</p>

## Попробовать

<table>
<tr>
<td width="50%" valign="top">

**В браузере — PWA**

Открыть <https://arcnosixta.github.io/fitpulse/> и установить как приложение:
работает офлайн, данные не уходят с устройства.

</td>
<td width="50%" valign="top">

**На Android — APK**

```bash
# с компьютера
adb install -r app-release.apk

# или просто скачать файл и открыть его на телефоне
```

[Скачать последний релиз](https://github.com/arcnosixta/fitpulse/releases/latest) ·
~3 МБ · Android 6.0+ · подписан тем же ключом, что и предыдущие версии,
поэтому обновление ставится поверх

</td>
</tr>
</table>

## Что внутри

| Раздел | Содержание |
|---|---|
| Дашборд | калории, тренировка дня, прогресс, быстрые действия |
| Программа | шаблоны PPL/full body/домашняя, своя программа по дням недели |
| Библиотека | 111 упражнений, фильтры по мышце, инвентарю, паттерну, избранному |
| Тренировка | таймер отдыха, подходы, RPE, тайм-темпо, звук и вибро |
| Питание | 218 продуктов, дневной баланс, вода, оценка рациона |
| Прогресс | вес, объём по мышцам, обхваты, личные рекорды, тренд расхода |
| Калькуляторы | ИМТ, идеальный вес, % жира (Navy, D&W, Jackson–Pollock), БЖУ, TDEE, 1ПМ, блины |
| История | завершённые тренировки, объём, месячные сводки |
| Настройки | тема, акцент, язык, единицы, экспорт и импорт данных |

Дополнительно: тёмная и светлая темы, пять акцентов, RU/EN, метрическая и
имперская система, полный экспорт данных в JSON, установка как PWA.

## Подход

Без сборщика, без фреймворков и без runtime-зависимостей: чистый JavaScript,
ES-модули, CSS и service worker. Node.js нужен только для проверок и сборки.
Графика и шрифты свои, без внешних CDN — приложение работает офлайн с первого
запуска. Страницы статичные, анимация только на интерактивных элементах.

## Быстрый старт

```bash
npm install          # только dev-инструменты и Capacitor
npm run dev          # http://localhost:4173
```

Открывать нужно по HTTP: service worker не работает на `file://`.

## Проверки

```bash
npm run check        # импорты, данные, i18n, калькуляторы
npm run check:smoke  # весь интерфейс в jsdom: все маршруты и языки
npm run verify       # всё выше + иконки (веб и Android) + веб-сборка
```

| Скрипт | Что проверяет |
|---|---|
| `check:imports` | все именованные импорты разрешаются, нет неиспользуемых |
| `check:data` | 111 упражнений, 218 продуктов, 8 шаблонов: ссылки, дубликаты, сходимость калорий |
| `check:i18n` | паритет RU/EN, все ключи из кода есть в обоих словарях |
| `check:calculators` | 144 теста формул с эталонными значениями из публикаций |
| `check:smoke` | бутстрап приложения, все маршруты, все инструменты, обе единицы, оба языка |

Формулы и источники — в [docs/CALCULATIONS.md](docs/CALCULATIONS.md).
Подробный разбор каждой — с указанием публикаций и типичной погрешности.

## Сборка

```bash
npm run build        # dist/ — только статика, без исходников и node_modules
```

`scripts/build-web.mjs` собирает `dist/` (≈ 620 КБ) и сверяет список precache из
`sw.js` с фактическим содержимым: забытый в precache файл валит сборку.

## Android

```bash
npm run apk          # debug APK -> dist-apk/ (~4,1 МБ)
npm run apk:release  # подписанный release APK (~3 МБ)
```

Приложение офлайновое: в APK попадает только `dist/`, ни `node_modules`, ни
исходников. Иконка лаунчера и splash генерируются из того же знака, что и PWA, —
отдельной графики для Android нет.

Полная инструкция по SDK, JDK, подписи и решению проблем —
в [docs/APK_BUILD.md](docs/APK_BUILD.md).

## Структура

```
index.html            оболочка приложения
sw.js                 service worker
js/core/              состояние, роутер, i18n, темы, форматирование, анимации
js/calc/              формулы: тело, сила, макросы
js/data/              упражнения, продукты, шаблоны программ
js/ui/                общие компоненты: графики, формы, карточки, таймер
js/views/             экраны, по одному файлу на маршрут
styles/               токены, база, компоненты, экраны
scripts/              проверки, сборка, иконки, локальный сервер
docs/                 формулы и сборка Android
```

## Принципы

- **Данные не уходят с устройства.** Нет сети, нет телеметрии, нет аккаунта.
- **Формулы проверяются тестами.** Ожидаемое значение в тесте посчитано по
  публикации, а не скопировано из реализации.
- **SI внутри, единица отображения — на экране.** В хранилище всегда кг и см;
  конвертация только в `toDisplay*`/`fromDisplay*`.
- **Кривые и шрифты — свои.** Никаких внешних CDN: приложение работает офлайн
  с первого запуска.
- **Производительность важнее декора.** Никакой анимации, которая крутится
  сама по себе; фон рисуется один раз.

## Лицензия

MIT — см. [LICENSE](LICENSE).
