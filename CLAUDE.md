# Edmonton Crisis Services Navigator

## Project Summary

A mobile-first, presentation-grade web app that maps Edmonton's crisis response service ecosystem. Built as a demo for a working group of city directors and officials to show what a unified crisis service navigation tool could look like.

**This is a demo/prototype for presentation purposes — not a production tool.** Prioritize visual impact, clarity, and accurate service data over edge case handling or auth flows.

## Tech Stack

- **Plain HTML, CSS, and JavaScript** — zero build step, zero dependencies to install
- **Leaflet.js** via CDN (map) with **OpenStreetMap / CartoDB Voyager** tiles (warm, clean look)
- **GitHub Pages** deployment — just push and it works
- No frameworks, no bundlers, no npm

## Target Device

**Mobile-first (phone).** This is meant to be used by EPS officers, peace officers, and community members in the field on their phones. Must work well on small screens. Desktop should also look good for the presentation meeting room (projector/large screen).

## Users

Five user types with different needs:
1. **EPS officers** on scene — need fast answers: "where can I bring this person RIGHT NOW?"
2. **Transit peace officers** — similar to EPS but transit-corridor focused
3. **Community members / bystanders** — found someone in crisis, don't know the system
4. **Business owners** — someone in/near their business needs help
5. **Service providers / caseworkers** — looking up options, referral pathways, hours

## Visual Design

**Warm and human.** This is about people in crisis, not a tech demo.

- Light theme, soft colors, rounded corners, approachable typography
- **Edmonton city branding** — use Edmonton's official colors:
  - Primary: `#00338D` (Edmonton blue)
  - Secondary: `#FFB81C` (Edmonton gold)  
  - Accent warm tones for crisis/care context
- Sans-serif font (system fonts or Inter/Open Sans via CDN)
- Avoid dark/techy aesthetics
- Service cards should feel like helpful information, not database rows
- Accessibility color coding from the ecosystem map:
  - 🟡 Yellow/warm: Publicly accessible, few criteria
  - 🟢 Green: Publicly accessible, specific criteria to meet
  - 🔵 Teal: Not publicly accessible (restricted/referral only)
  - 🔴 Red: Unsure if active / pilot program ending

## App Structure — Three Equal Tabs

### Tab 1: Map — "Where Can I Bring Someone?"

Interactive Leaflet map of Edmonton with two layers:

**Drop-off Location Pins:**
Each pin has a popup showing: name, address, hours, phone, who it serves, intake procedure, whether you need to call first, current status (open/closed based on time of day).

**Coverage Area Overlays (toggle on/off):**
Click a service name to show its geographic coverage zone on the map. Each overlay shows: hours, case types, whether they transport, public vs restricted access. Services with overlays include CDT (citywide), COTT (transit corridors), AHS City Centre Team (downtown), BIA patrols (specific BIA zones), PACT (citywide but restricted).

Use CartoDB Voyager tiles: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`

Map center: `[53.5461, -113.4937]` (Edmonton downtown), zoom level 12.

### Tab 2: Decision Tree — "What Should I Do?"

Interactive step-by-step guide. 2-3 clicks to a recommended action.

**Flow:**
1. "Who are you?" → Officer / Peace Officer / Community Member / Business Owner / Service Provider
2. "What's the situation?" → branches by scenario type (intoxication, mental health crisis, homelessness/shelter need, youth in crisis, Indigenous person needing culturally safe care, etc.)
3. "What time is it?" → time-aware filtering (auto-detect current time, allow override)
4. **Result:** Matched services with: name, phone, address, whether they're open RIGHT NOW, what to do if they're closed, transport options

**Time-awareness:** Use `new Date()` to auto-detect time. Show real-time open/closed badges. Also include a time-of-day override slider so the presenter can demo "what if it's 3am?" scenarios in the meeting.

### Tab 3: Connections — "How It All Fits Together"

Visual diagram showing the service ecosystem. This should represent the structure from `docs/service-ecosystem-map.png` — the authoritative reference for how services connect.

**Key relationships to show:**
- Entry points: 911 → Police/Fire/EMS, 311 → Peace Officers, 211+3 → Crisis Diversion, AHS programs, DATS, BIA Teams
- CDT coordinates Hope Mission + Boyle Street vans, dispatched via 211 (CMHA partnership)
- Hope Mission downstream: UHEI, Health Access Mobile Team, Bus Connect
- Boyle Street downstream: Streetworks Mobile Outreach, Mobile Outreach Addictions Team
- AHS programs: Community Paramedics, Community Response Team, City Centre Team, Access 24/7 (which includes PACT and CREMS)
- Referral flows between services
- Which services transport vs. which don't

This can be built as an interactive HTML/CSS/SVG diagram — doesn't need a charting library. Keep it simple but clear.

## Service Data

All service data lives in `data/services.json`. This is the single source of truth.

**See `docs/service-data-reference.md`** for the full compiled dataset with notes on each service, sourced from research conversations.

**See `docs/service-ecosystem-map.png`** for the visual map of how services connect (this is the authoritative reference the app's Connections tab should represent).

### Data Schema

Each service in `services.json` follows this structure:

```json
{
  "id": "cdt",
  "name": "Crisis Diversion Team",
  "shortName": "CDT",
  "entryPoint": "211+3",
  "operator": "REACH Edmonton (via Hope Mission & Boyle Street)",
  "description": "24/7 mobile crisis response for vulnerable individuals",
  "phone": "211 (press 3)",
  "address": null,
  "coordinates": null,
  "isDropOff": false,
  "isMobile": true,
  "coverageArea": "citywide",
  "coveragePolygon": null,
  "hours": {
    "type": "24/7"
  },
  "accessibility": "public",
  "accessNotes": "Publicly accessible. Call 211 press 3.",
  "serves": ["adults", "all-genders"],
  "services": ["crisis-response", "transport", "referral"],
  "transport": true,
  "transportNotes": "Hope Mission 5 vans (day up to 7, night up to 4), Boyle Street 6 vans",
  "referralRequired": false,
  "pilotProgram": false,
  "pilotEndDate": null,
  "status": "active",
  "parentService": null,
  "childServices": ["hope-mission-cdt", "boyle-street-cdt"],
  "connections": ["hope-mission", "boyle-street", "211"],
  "category": "crisis-response",
  "tags": ["mobile", "crisis", "transport", "24/7"]
}
```

### Key Data Fields

- `hours.type`: One of `"24/7"`, `"scheduled"`, `"seasonal"`
- `hours.schedule`: Array of `{days, open, close}` objects for scheduled services
- `accessibility`: One of `"public"`, `"public-criteria"`, `"restricted"`, `"unknown"`
- `pilotProgram`: Boolean — if true, show warning badge with `pilotEndDate`
- `isDropOff`: Boolean — determines if it shows as a map pin
- `isMobile`: Boolean — determines if it shows as a coverage overlay
- `parentService` / `childServices`: For hierarchy (CDT → Hope Mission CDT + Boyle Street CDT)

## File Structure

```
edmonton-crisis-navigator/
├── index.html              # Single page app, all three tabs
├── css/
│   └── styles.css          # All styles, mobile-first responsive
├── js/
│   ├── app.js              # Main app logic, tab switching, time management
│   ├── map.js              # Leaflet map, pins, overlays
│   ├── decision-tree.js    # Decision tree logic and rendering
│   ├── connections.js      # Service connections diagram
│   └── services.js         # Service data loader and time-aware helpers
├── data/
│   └── services.json       # All service data (single source of truth)
├── assets/                 # Icons, logos if needed
├── docs/
│   ├── service-ecosystem-map.png  # Reference diagram (DO NOT deploy)
│   └── service-data-reference.md  # Detailed notes on each service
├── CLAUDE.md               # This file
└── README.md               # Deploy instructions
```

## Implementation Notes

### Time-Aware Logic

```javascript
function isServiceOpen(service, overrideTime = null) {
  const now = overrideTime || new Date();
  if (service.hours.type === '24/7') return true;
  if (service.hours.type === 'seasonal') {
    // Check seasonal availability (e.g., Bus Connect winter only)
  }
  // Check schedule against current day/time
  const day = now.toLocaleDateString('en-CA', { weekday: 'long' });
  const time = now.getHours() * 100 + now.getMinutes();
  return service.hours.schedule?.some(slot => 
    slot.days.includes(day) && time >= slot.open && time <= slot.close
  );
}
```

### Time Override Slider

For the presentation demo, include a time slider at the top of the Decision Tree tab:
- Shows current time by default
- Can drag to any hour of day
- Updates all open/closed badges in real time
- Label: "Simulating: [time]" when overridden, "Live: [time]" when using real time

### Map Implementation

```javascript
const map = L.map('map').setView([53.5461, -113.4937], 12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors © CARTO',
  maxZoom: 19
}).addTo(map);
```

### Mobile-First CSS

- Default styles target phone (< 768px)
- Use `@media (min-width: 768px)` for tablet+
- Use `@media (min-width: 1024px)` for desktop
- Tab bar should be bottom-anchored on mobile (thumb-friendly)
- Map should fill available viewport height
- Decision tree cards should be full-width on mobile, max 600px on desktop

### Pilot Program Warnings

Services with `pilotProgram: true` should show a prominent warning badge:
- "⚠️ Pilot program — funded until [date]"
- Use the red/coral accent color
- In the Connections tab, show these with a dashed border

## What NOT to Build

- No backend, no API calls, no authentication
- No service worker / offline mode (nice to have but not for demo)
- No user accounts or saved preferences
- No real-time data feeds — all data is static in services.json
- No analytics or tracking

## Testing the Build

After building, verify:
1. `index.html` opens directly in a browser (no server needed, or use `python3 -m http.server`)
2. Map loads with all drop-off pins visible
3. Clicking a pin shows popup with hours, phone, address
4. Coverage overlays toggle on/off
5. Decision tree reaches a result in 2-3 clicks
6. Time slider updates open/closed badges
7. Connections diagram shows the ecosystem from the reference PNG
8. Works on mobile viewport (Chrome DevTools device mode)
9. All data matches `services.json` — no hardcoded service info in HTML/JS

## Deployment

```bash
# Just push to GitHub and enable Pages
git init
git add .
git commit -m "Edmonton Crisis Services Navigator"
git remote add origin https://github.com/[username]/edmonton-crisis-navigator.git
git push -u origin main
# Enable GitHub Pages in repo settings → Source: main branch, root folder
```
