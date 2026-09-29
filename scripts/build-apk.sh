#!/usr/bin/env bash
#
# Builds the Android APK.
#
#   ./scripts/build-apk.sh              debug APK
#   ./scripts/build-apk.sh release      signed release APK (needs a keystore)
#   ./scripts/build-apk.sh clean        wipe the Gradle build first
#
# Requirements: Node 18+, JDK 17 or 21, Android SDK with the matching platform
# and build-tools, and ANDROID_HOME / ANDROID_SDK_ROOT exported. See
# docs/APK_BUILD.md for the full one-time setup.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"
MODE="${1:-debug}"
APK_OUT="$ROOT/dist-apk"
KEYSTORE="${FITPULSE_KEYSTORE:-$HOME/.fitpulse/fitpulse-release.jks}"

say() { printf '\033[1;36m▸\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

command -v node >/dev/null || die "node is not installed"
command -v java  >/dev/null || die "JDK not found — install JDK 17 or 21"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[ -n "$SDK" ] || die "ANDROID_HOME is not set (see docs/APK_BUILD.md)"

say "tool versions"
node --version
java -version 2>&1 | head -1

say "checks"
node scripts/check-calculators.mjs
node scripts/check-imports.mjs
node scripts/check-i18n.mjs

say "web build"
node scripts/build-web.mjs

if [ ! -d "$ROOT/android" ]; then
  say "adding the android platform (first run)"
  npx --yes @capacitor/cli@7 add android
fi

say "capacitor sync"
npx --yes @capacitor/cli@7 sync android

cd "$ROOT/android"

if [ "$MODE" = "clean" ]; then
  say "clean"
  ./gradlew clean
  say "done — re-run without 'clean' to build"
  exit 0
fi

mkdir -p "$APK_OUT"
GRADLE_TASK="assembleDebug"

if [ "$MODE" = "release" ]; then
  PASS="${FITPULSE_KEYSTORE_PASS:-fitpulse}"
  if [ ! -f "$KEYSTORE" ]; then
    echo
    say "no keystore at $KEYSTORE — creating one"
    mkdir -p "$(dirname "$KEYSTORE")"
    keytool -genkeypair -v \
      -keystore "$KEYSTORE" \
      -alias fitpulse \
      -keyalg RSA -keysize 4096 -validity 10000 \
      -storepass "$PASS" -keypass "$PASS" \
      -dname "CN=FitPulse, OU=Mobile, O=FitPulse, L=-, S=-, C=RU"
    say "keystore created — move it to your password manager, it is the only key that can update this app"
  fi

  say "injecting signing config"
  # credentials stay out of version control; android/app/keystore.properties is gitignored
  cat > app/keystore.properties <<EOF
storeFile=$KEYSTORE
storePassword=$PASS
keyAlias=fitpulse
keyPassword=$PASS
EOF

  GRADLE_TASK="assembleRelease"
fi

say "gradle $GRADLE_TASK (this can take a few minutes on the first run)"
./gradlew "$GRADLE_TASK"

say "collecting the APK"
find app/build/outputs/apk -name '*.apk' -exec cp -v {} "$APK_OUT/" \;

echo
say "APK output → $APK_OUT"
ls -lh "$APK_OUT"/*.apk
echo
say "install on a connected device:  adb install -r $APK_OUT/*.apk"
