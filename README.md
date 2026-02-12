# Edmonton Crisis Services Navigator

A mobile-first web app that maps Edmonton's crisis response service ecosystem — showing where to bring someone in crisis, what services are available right now, and how everything connects.

**Built for:** Presentation to Edmonton city directors and officials working group.  
**Built by:** PALcares (Perseverance Analytics Ltd.)

## Quick Start

```bash
# Option 1: Just open the file
open index.html

# Option 2: Local server (needed for JSON fetch)
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Edmonton Crisis Services Navigator"
git remote add origin https://github.com/[your-username]/edmonton-crisis-navigator.git
git push -u origin main
```

Then in GitHub repo Settings → Pages → Source: Deploy from main branch, root folder.

## Project Structure

```
├── index.html              # Single page app
├── css/styles.css          # Mobile-first responsive styles
├── js/
│   ├── app.js              # Tab switching, time management
│   ├── map.js              # Leaflet map, pins, overlays
│   ├── decision-tree.js    # Interactive decision tree
│   ├── connections.js      # Service ecosystem diagram
│   └── services.js         # Data loader, time-aware helpers
├── data/services.json      # All service data (source of truth)
├── docs/                   # Reference materials (not deployed)
│   ├── service-ecosystem-map.png
│   └── service-data-reference.md
├── CLAUDE.md               # Build instructions for Claude Code
└── README.md               # This file
```

## Tech

- Plain HTML/CSS/JS — no build step
- Leaflet.js + CartoDB Voyager tiles (via CDN)
- No frameworks, no npm, no bundlers

## Data

All service data is in `data/services.json`. Edit that file to update services, hours, contacts, or status.

## Three Tabs

1. **Map** — Drop-off locations + mobile team coverage overlays
2. **Decision Tree** — 2-3 clicks to the right service based on who you are and the situation
3. **Connections** — How all services relate and refer to each other

## Notes

- Time-aware: shows real-time open/closed status
- Time slider for demo: simulate any time of day
- Pilot program warnings for services ending March 2026
- All transport is voluntary
