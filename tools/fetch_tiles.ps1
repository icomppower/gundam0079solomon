# fetch_tiles.ps1 — thin wrapper for back-compat. The real, cross-platform fetcher is tools/fetch_tiles.mjs,
# which reads the map box from the battle's own meta.geo (one source of truth — no hand-duplicated bbox).
#   pwsh tools/fetch_tiles.ps1            # fetch for data.js
#   pwsh tools/fetch_tiles.ps1 --dry      # preview the tile count, download nothing
#   pwsh tools/fetch_tiles.ps1 data.example.js
# (Node is already required by the toolchain — tools/serve.js, tools/validate.mjs.)
$here = Split-Path $PSCommandPath -Parent
& node (Join-Path $here "fetch_tiles.mjs") @args
exit $LASTEXITCODE
