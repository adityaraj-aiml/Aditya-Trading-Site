# Static Site (Archived Build)

This folder is a standalone, plain HTML/CSS/JS build of a "Techin By Raj" landing page — courses, indicators, pricing, FAQ, a live TradingView chart, and a client-side admin panel (`admin.html`) for managing course videos and indicators.

**This is not the live site.** The live site is the React app in `/frontend` (with `/backend`), deployed via `.github/workflows/deploy.yml`. This folder is kept here purely for reference/backup and is not wired into that deploy workflow — pushing changes here will not affect the live GitHub Pages site.

## Running it locally

Open `index.html` through a local server (e.g. VS Code's "Live Server" extension) rather than double-clicking the file — the admin panel and public page share data through `localStorage`, and some browsers isolate `file://` pages from each other, which breaks that sharing.

## Admin panel

Open `admin.html`, log in (default password `raj@techin2026` — change it from the Backup & Security tab), and manage:
- Course videos (add/edit/delete per course, or add whole new courses)
- Indicators
- The default TradingView chart symbol shown in the hero

Content is stored in that browser's `localStorage` only — export a JSON backup from the admin panel regularly.
