#!/usr/bin/env bash
set -euo pipefail
# Offline, non-root Debian packaging after verified frontend Vite build.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(node -p "require(process.argv[1]).version" "$ROOT/package.json")"
OUT="${1:-$ROOT/dist-packages}"
command -v dpkg-deb >/dev/null || { echo 'BLOCKED: dpkg-deb is required' >&2;exit 1; }
[[ -s "$ROOT/frontend/dist/index.html" ]] || { echo 'BLOCKED: Missing verified frontend/dist; run npm --prefix frontend install && npm --prefix frontend run build first' >&2; exit 2; }
compgen -G "$ROOT/frontend/dist/assets/index-*.js" >/dev/null || { echo 'BLOCKED: Missing compiled frontend JS asset' >&2;exit 2; }
TMP="$(mktemp -d)";trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/DEBIAN" "$TMP/opt/roboforge/frontend" "$TMP/opt/roboforge/backend" "$TMP/usr/bin" "$TMP/usr/share/applications" "$TMP/usr/share/icons/hicolor/scalable/apps" "$OUT"
cp -a "$ROOT/frontend/dist" "$TMP/opt/roboforge/frontend/dist"
cp -a "$ROOT/backend/." "$TMP/opt/roboforge/backend/"
cp -a "$ROOT/package.json" "$TMP/opt/roboforge/package.json"
cp "$ROOT/docs/assets/logo.svg" "$TMP/usr/share/icons/hicolor/scalable/apps/roboforge.svg"
cat > "$TMP/usr/bin/roboforge-server" <<'SCRIPT'
#!/bin/sh
set -eu
exec node /opt/roboforge/backend/server.js
SCRIPT
cat > "$TMP/usr/bin/roboforge-desktop" <<'SCRIPT'
#!/bin/sh
set -eu
URL=http://127.0.0.1:3001
if ! curl -fsS --max-time 2 "$URL/api/health" 2>/dev/null | grep -q '"name":"RoboForge"'; then
  LOGDIR="${XDG_STATE_HOME:-$HOME/.local/state}/roboforge"
  mkdir -p "$LOGDIR"
  nohup roboforge-server >>"$LOGDIR/server.log" 2>&1 </dev/null &
  sleep 2
fi
curl -fsS --max-time 2 "$URL/api/health" 2>/dev/null | grep -q '"name":"RoboForge"' || { echo "Unable to connect to RoboForge backend at $URL" >&2;exit 1; }
exec xdg-open "$URL"
SCRIPT
chmod 0755 "$TMP/usr/bin/roboforge-server" "$TMP/usr/bin/roboforge-desktop"
cat > "$TMP/usr/share/applications/roboforge.desktop" <<'DESKTOP'
[Desktop Entry]
Type=Application
Name=RoboForge Studio
Comment=Local-first industrial AI engineering workbench
Exec=roboforge-desktop
Icon=roboforge
Terminal=false
Categories=Development;Science;
DESKTOP
cat > "$TMP/DEBIAN/control" <<EOF_CONTROL
Package: roboforge-studio
Version: ${VERSION}
Section: devel
Priority: optional
Architecture: all
Maintainer: Janus5G <noreply@github.com>
Depends: nodejs (>= 20.19), curl, xdg-utils
Description: RoboForge Studio industrial AI development workbench
 Local-first GUI and opt-in MCP Gateway. Optional external runtimes not bundled.
EOF_CONTROL
DPKG_DEB_COMPRESSOR_TYPE=xz dpkg-deb --root-owner-group --build "$TMP" "$OUT/roboforge-studio_${VERSION}_all.deb"
sha256sum "$OUT/roboforge-studio_${VERSION}_all.deb" > "$OUT/roboforge-studio_${VERSION}_all.deb.sha256"
echo "PASS: packaged RoboForge $VERSION from already-built frontend; no build at first launch"
