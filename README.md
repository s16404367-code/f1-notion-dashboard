# F1 Notion Dashboard (OpenF1) — Dynamic GitHub Pages (No Backend)

This repository hosts an **advanced, dynamic** F1 telemetry dashboard that runs entirely in the browser (GitHub Pages compatible):

- Live timing tower + weather + race control + team radio
- Historical replay with scrubber + **true interpolation** for smooth track map
- **Web Worker** processing (keeps UI smooth)
- **PWA offline caching** (Service Worker)
- Saves preferences (favorites, last session, layout) in browser storage

## Deploy on GitHub Pages (clicks only)
1. Create repo: `f1-notion-dashboard`
2. Upload all files from this folder
3. Repo → **Settings → Pages**
4. Source: **Deploy from a branch**
5. Branch: `main`  Folder: `/ (root)`
6. Wait 1–3 minutes
7. Open: `https://YOURNAME.github.io/f1-notion-dashboard/`

## Run locally
Use any simple server (because browsers block ES modules on file://):

### Python
```bash
python -m http.server 5173
```
Open: `http://localhost:5173/`

## Notes
OpenF1 availability and fields vary by session. The app is defensive and won’t crash on missing data.
