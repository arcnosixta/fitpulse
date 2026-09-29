# Сборка Android APK

FitPulse — статическое PWA, поэтому в Android-сборку попадает только папка
`dist/`. Полный цикл: веб-сборка → `cap sync` → Gradle.

---

## Один раз: окружение

Проверенный набор (собран 2026-09-29):

| Что | Версия | Проверка |
|---|---|---|
| Node.js | 18+ (проверено на 22.23.3) | `node --version` |
| JDK | 17 или 21 (проверено на 21.0.12.1) | `java -version` |
| Capacitor | 7.6.9 | `npx cap --version` |
| Android SDK | platform-tools, `platforms;android-35` | `sdkmanager --list` |
| Gradle | 8.11.1 (тянет `./gradlew` из проекта) | `./gradlew --version` |
| AGP | 8.7.2 | `android/build.gradle` |
| minSdk / targetSdk / compileSdk | 23 / 35 / 35 | `android/variables.gradle` |

`build-tools;35.0.0` — версия по умолчанию для AGP 8.7, но сборка проходит и на
`36.0.0`: AGP берёт любую установленную совместимую. Ставить 35.0.0 нужно
только если хотите воспроизвести поведение AGP по умолчанию.

### 1. Android SDK

```bash
# официальный command-line tools
mkdir -p ~/Android/sdk && cd /tmp
curl -O https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q commandlinetools-linux-11076708_latest.zip -d ~/Android/sdk/cmdline-tools
mv ~/Android/sdk/cmdline-tools/cmdline-tools ~/Android/sdk/cmdline-tools/latest

export ANDROID_HOME="$HOME/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-35" "build-tools;36.0.0"
```

`ANDROID_HOME` должен быть виден и в текущем шелле, и в Android Studio.
Добавьте его в `~/.bashrc` или `~/.zshrc`.

> Каталог не должен содержать пробелов — Gradle и старые версии SDK manager
> с этим не справляются.

### 2. Зависимости

```bash
npm install
```

### 3. Первый запуск

```bash
npm run apk
```

Скрипт прогонит проверки, соберёт `dist/`, выполнит `cap sync` и запустит
Gradle. Если папки `android/` нет (свежий клон без платформы), скрипт сам
выполнит `cap add android`. В рабочем репозитории `android/` лежит в git —
см. «Что коммитится» ниже.

---

## Каждый раз

```bash
npm run apk            # debug APK
npm run apk:release    # подписанный release APK
bash scripts/build-apk.sh clean   # очистить сборку Gradle
```

Скрипт `scripts/build-apk.sh` перед сборкой прогоняет проверки
(`check-calculators.mjs`, `check-imports.mjs`, `check-i18n.mjs`) и веб-сборку,
так что сломанная формула или незасинхронизированный precache-список
остановят сборку.

### Где лежит результат

```
dist-apk/app-debug.apk     ≈ 4,1 МБ
dist-apk/app-release.apk   ≈ 3,1 МБ
```

Разница — debug-сборка не минифицируется и тянет отладочные символы.
В `dist-apk/` попадает только `dist/` (51 файл, ≈ 612 КБ): ни исходников, ни
`node_modules`, ни скриптов, ни документации.

Установка на устройство:

```bash
adb install -r dist-apk/app-debug.apk
```

---

## Что коммитится, а что нет

Коммитится **вся** папка `android/`, кроме артефактов сборки: в ней лежат
`signingConfig` в `app/build.gradle` и сгенерированные иконки. Без них
`cap add android` заново создаст пустую платформу, и подпись release перестанет
работать.

Не коммитится (уже в `.gitignore`):

| Путь | Почему |
|---|---|
| `android/app/keystore.properties` | пароли от keystore |
| `android/local.properties` | путь к SDK на этой машине |
| `android/**/build/`, `android/.gradle/` | артефакты Gradle |
| `dist-apk/` | собранные APK |
| `*.jks`, `*.keystore` | закрытые ключи |

---

## Иконки и splash

`npm run icons:android` генерирует иконки лаунчера и splash из того же знака,
что и веб-манифест — отдельного дизайна для Android нет:

```bash
npm run icons:android   # res/mipmap-*/ic_launcher{,_round,_foreground}.png
```

Скрипт перезаписывает `values/ic_launcher_background.xml` (в шаблоне Capacitor
там `#FFFFFF`, то есть белый квадрат под знаком), создаёт `drawable/splash.xml`
и удаляет 11 шаблонных splash-PNG и тестовые векторы робота. Запускать нужно
после `cap add android`; обычный `npm run verify` делает это сам, так что вручную
вызывать нужно только после правки `assets/icons/icon.svg`.

Adaptive-icon foreground рисуется в безопасной зоне 72/108 от полотна 108dp —
иначе часть знака срезают маски лаунчеров.

---

## Системные панели и edge-to-edge

`targetSdk 35` на Android 15+ включает edge-to-edge принудительно: окно
растягивается под статус-бар и жестовую навигацию. Два последствия, из-за
которых вёрстка «уезжает», и оба закрыты в репозитории:

1. **`android.adjustMarginsForEdgeToEdge: "auto"`** в `capacitor.config.json`.
   Значение по умолчанию — `"disable"`, при котором `CapacitorWebView` вообще не
   трогает WebView, и контент оказывается под системными панелями. С `"auto"`
   Capacitor применяет к WebView отступы system bars и выреза (display cutout)
   на Android 15+, а на более старых версиях не меняет ничего. WebView не
   отдаёт системные панели в CSS, поэтому `env(safe-area-inset-*)` в WebView
   всегда `0` — в этом режиме CSS-переменные `--safe-t`/`--safe-b` корректно
   равны нулю, и все отступы в стилях не схлопываются.

2. **Фон окна.** `AppTheme.NoActionBar` в шаблоне содержал
   `android:background="@null"`, а `AppTheme.NoActionBarLaunch` остаётся темой
   активности навсегда — Capacitor не вызывает `SplashScreen.installSplashScreen()`.
   Как только WebView перестаёт закрывать окно целиком, в панелях было видно
   либо ничего, либо splash-картинку. Теперь фон окна задан явно
   (`@color/app_window_background`, синхронизирован с токеном `bg-0`), а
   `MainActivity` вызывает `SplashScreen.installSplashScreen(this)` до
   `super.onCreate()`, чтобы тема переключалась на `AppTheme.NoActionBar` через
   `postSplashScreenTheme`.

Иконки системных панелей принудительно светлые (`windowLightStatusBar=false`) —
приложение по умолчанию тёмное, фон окна `#070810`.

> Светлая тема (`[data-theme='light']`) в панелях остаётся тёмной: цвет окна —
> одна нативная величина, а тема живёт в `localStorage` и нативному слою
> недоступна. Чтобы панель шла за темой, нужен `@capacitor/status-bar` и
> синхронизация `StatusBar.setStyle/setBackgroundColor` из `js/core/theme.js` —
> плагина в проекте нет, а его JS-обёртка не резолвится без бандлера.

---

## Release-подпись

При первом `npm run apk:release` создаётся keystore в
`~/.fitpulse/fitpulse-release.jks`, а скрипт пишет
`android/app/keystore.properties` — его читает `signingConfigs.release` в
`app/build.gradle`. Без этого файла release собирается неподписанным, поэтому
`npm run apk:release` всегда создаёт его.

Пароль по умолчанию — `fitpulse`, это только для локальной проверки. Свой:

```bash
FITPULSE_KEYSTORE_PASS='<пароль>' npm run apk:release
```

Путь к keystore тоже переопределяется:

```bash
FITPULSE_KEYSTORE=/secure/path/fitpulse.jks FITPULSE_KEYSTORE_PASS='…' npm run apk:release
```

Уже существующий keystore не перезаписывается — пароль просто должен совпадать
с тем, которым он создан.

Проверить, что APK действительно подписан:

```bash
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs dist-apk/app-release.apk
```

Собранный здесь APK подписан схемами v1 (JAR) и v2.

> Keystore и `keystore.properties` в `.gitignore` — их нельзя коммитить.
> Потерянный keystore означает, что обновлять приложение в Play нельзя;
> храните его в менеджере паролей.

---

## Известные ограничения

**Разрешение `INTERNET`.** Capacitor добавляет его в манифест по умолчанию, хотя
приложение полностью офлайн: ассеты отдаёт локальный `WebViewAssetLoader` с
`https://localhost`. Удаление разрешения — правильный шаг для приватности, но
проверить его можно только на устройстве, поэтому в репозитории оно оставлено
как есть. Проверьте на реальном устройстве и удалите строку из
`android/app/src/main/AndroidManifest.xml`, если всё работает.

**`android:allowBackup="false"`.** Бэкап отключён намеренно: стандартный Android
Auto Backup выгружал бы данные приложения в Google Drive, что противоречит
принципу «данные не уходит с устройства». Данные живут только в `localStorage`
и переживают смену устройства только через экспорт/импорт JSON внутри
приложения. Если бэкап понадобится, включается обратно в
`android/app/src/main/AndroidManifest.xml` — но тогда формулировку в README
про «не уходят с устройства» надо уточнить.

---

## Если что-то пошло не так

**`ANDROID_HOME is not set`** — переменная не видна скрипту. Проверьте
`echo $ANDROID_HOME` и путь до SDK.

**`SDK location not found`** — Gradle читает `android/local.properties` с
строкой `sdk.dir=/путь/к/sdk`. Файл генерируется автоматически, но при
переносе папки его нужно пересоздать вручную.

**`Failed to install the following SDK components`** — в системе нет нужной
platform. `sdkmanager "platforms;android-35" "build-tools;36.0.0"`.

**В лаунчере робот вместо FitPulse** — не отработал `npm run icons:android`
после `cap add android`, либо `icon.svg` менялся без перегенерации. Запустите
`npm run verify` и пересоберите APK.

**Белый фон вокруг знака на иконке** — в `values/ic_launcher_background.xml`
вернулось `#FFFFFF` из шаблона. Проверьте, что файл содержит `#0A0C14`.

**Сборка падает на лимите памяти** — в `android/gradle.properties` поднимите
`org.gradle.jvmargs=-Xmx3072m`.

**Пустой белый экран в приложении** — сборка не нашла `dist/`. Проверьте
`npm run build` и `webDir` в `capacitor.config.json` (должен быть `dist`).

**Изменения не видны в приложении** — это ожидаемо. Нативная сборка не
подхватывает файлы на лету: `npm run apk` пересобирает `dist/` и кладёт его в
APK, а установленный пакет нужно заменить — `adb install -r dist-apk/app-debug.apk`.
Service worker в контейнере отключён, поэтому старой копии из кэша быть не может.

---

## Как это устроено

`capacitor.config.json` → `webDir: "dist"`. Всё, что попадает в APK, берётся
из `dist/`, который собирает `scripts/build-web.mjs`: только `index.html`,
`sw.js`, `styles/`, `js/`, `assets/`. Исходники, `node_modules`, скрипты и
документация в сборку не идут.

Service worker внутри нативного контейнера отключён осознанно: `js/app.js`
пропускает регистрацию при `window.Capacitor.isNativePlatform()`. Ассеты и так
лежат локально, а `sw.js` в WebView закрепил бы старую сборку после
обновления приложения. Capacitor отдаёт их с `https://localhost`, поэтому по
одному протоколу это не определить — проверка идёт через API моста.
