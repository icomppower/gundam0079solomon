#!/bin/sh
# Battle 3D - interactive 3D battle documentary - launcher (macOS/Linux).
# Map tiles are served over http (same-origin); fetched automatically on first run. serve.js opens your browser.
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null 2>&1 || { echo "Node.js is required (https://nodejs.org)."; exit 1; }
echo "Ensuring map tiles are present (first run downloads them; later runs skip)..."
node tools/fetch_tiles.mjs || echo "(tile fetch had issues; the app will report any missing tiles)"
echo "Starting the local server - your browser will open (if a tab for this battle is already open, just switch to it; Ctrl+C to stop)..."
node tools/serve.js
