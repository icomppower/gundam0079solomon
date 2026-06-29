@echo off
REM Battle 3D - interactive 3D battle documentary - launcher (Windows).
REM Real map tiles are served over http (same-origin) by a tiny local Node server, which opens your browser for you.
REM Double-click to run; the terrain + imagery tiles are fetched automatically on first launch.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required ^(https://nodejs.org^). & pause & exit /b 1)
echo Ensuring map tiles are present (first run downloads them; later runs skip)...
node "tools\fetch_tiles.mjs"
echo Starting the local server - your browser will open (if a tab for this battle is already open, just switch to it; don't re-run)...
node "tools\serve.js"
