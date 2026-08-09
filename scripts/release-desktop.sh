#!/usr/bin/env bash
# Build, sign and publish a desktop release that the auto-updater can consume.
# Usage: scripts/release-desktop.sh 0.1.2 ["release notes"]
# Requires: the signing key at ~/.tauri/upkept.key and `gh` authenticated.
set -euo pipefail

VER="${1:?usage: release-desktop.sh <version e.g. 0.1.2> [notes]}"
NOTES="${2:-Upkept $VER}"
KEY="$HOME/.tauri/upkept.key"
[ -f "$KEY" ] || { echo "!! signing key missing at $KEY — updater builds need it"; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export TAURI_SIGNING_PRIVATE_KEY="$(cat "$KEY")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""

# Without this the bundle keeps only the linker's ad-hoc signature on the inner
# binary and has no _CodeSignature, so a downloaded copy fails Gatekeeper with
# "upkept is damaged". "-" means ad-hoc; set a Developer ID to drop the warning
# entirely (plus APPLE_ID/APPLE_PASSWORD/APPLE_TEAM_ID to notarize).
export APPLE_SIGNING_IDENTITY="${APPLE_SIGNING_IDENTITY:--}"

# CI hands these over as empty strings when the secrets are unset, and Tauri
# treats "set but empty" as "notarize with these", which fails the build.
for v in APPLE_CERTIFICATE APPLE_CERTIFICATE_PASSWORD APPLE_ID APPLE_PASSWORD APPLE_TEAM_ID; do
  [ -n "${!v:-}" ] || unset "$v"
done
if [ "$APPLE_SIGNING_IDENTITY" = "-" ]; then
  echo "note: ad-hoc signing — macOS will still warn until a Developer ID notarizes it"
fi

# keep app version in sync so the updater compares correctly
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VER\"/" src-tauri/tauri.conf.json

npx tauri build --bundles app

B="src-tauri/target/release/bundle/macos"

# DMG for direct download
STAGE="$(mktemp -d)"
cp -R "$B/upkept.app" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
rm -f "$B/Upkept.dmg"
hdiutil create -volname "Upkept" -srcfolder "$STAGE" -ov -format UDZO "$B/Upkept.dmg" >/dev/null
rm -rf "$STAGE"

# updater manifest (embeds the signature; url resolves to the latest release)
SIG="$(cat "$B/upkept.app.tar.gz.sig")"
PUBDATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
# A quote or backslash in the notes would produce invalid JSON and the updater
# would silently stop seeing new versions.
NOTES_JSON="${NOTES//\\/\\\\}"; NOTES_JSON="${NOTES_JSON//\"/\\\"}"
cat > "$B/latest.json" <<JSON
{
  "version": "$VER",
  "notes": "$NOTES_JSON",
  "pub_date": "$PUBDATE",
  "platforms": {
    "darwin-aarch64": {
      "signature": "$SIG",
      "url": "https://github.com/erenbekman/upkept/releases/latest/download/upkept.app.tar.gz"
    }
  }
}
JSON

gh release create "v$VER" \
  "$B/Upkept.dmg" "$B/upkept.app.tar.gz" "$B/latest.json" \
  --title "Upkept $VER" --notes "$NOTES"

echo "✓ Released v$VER — existing installs will auto-update on next launch."
echo "  Don't forget: commit the version bump (src-tauri/tauri.conf.json) and push."
