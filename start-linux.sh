#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null || { echo 'Node.js 20.19+ required';exit 1; }
command -v npm >/dev/null || { echo 'npm required';exit 1; }
if [ ! -d frontend/node_modules/vite ]; then npm --prefix frontend install; fi
npm --prefix frontend run build
node scripts/ensure-port-free.js
echo 'Open http://127.0.0.1:3001'
node backend/server.js
