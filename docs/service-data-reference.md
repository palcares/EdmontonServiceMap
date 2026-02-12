# Edmonton Crisis Services — Data Reference

This document provides context and operational notes for each service in `data/services.json`. Use this when building the app to ensure descriptions, restrictions, and relationships are accurate.

## Source of Truth

The primary reference for service relationships is `docs/service-ecosystem-map.png` — the official mapping created by the working group. All connections, hierarchies, and accessibility levels should match that diagram.

### Accessibility Color Coding (from the ecosystem map)

| Color | Meaning | JSON `accessibility` value |
|-------|---------|---------------------------|
| Yellow/warm | Publicly accessible — few criteria | `"public"` |
| Green | Publicly accessible — specific criteria to meet | `"public-criteria"` |
| Teal/dark | Not publicly accessible | `"restricted"` |
| Red/pink | Unsure if active | `"unknown"` |

---

## Entry Points

### 911 — Emergency Services
- **Police (EPS):** Patrol (vehicles 24/7), Beats (foot officers, variable hours), H.E.L.P. (officers + navigators, case management, EPS referrals only)
- **Fire:** Standard fire response
- **EMS:** Emergency medical services

### 311 — City Services
- **Peace Officers:** Transit POs (ETS/LRT, 7 days, not 24hr), Park Rangers (river valley, 7 days, not 24hr), Community Standards (by-law, 7 days, not 24hr)
- **COTT:** Peace officers + outreach workers in transit system. 6am-2am, 7 teams. PO referrals. Can transport.
- **Encampment Response:** Low-risk (PO + outreach, clean-up) and High-risk (PO + EPS)

### 211+3 — Crisis Diversion
- **CDT** is the umbrella — dispatched through 211 (press 3), operated by CMHA Edmonton
- CDT coordinates two operators: **Hope Mission** (5 vans, up to 7 day / 4 night) and **Boyle Street** (6 vans)
- Under Hope Mission: UHEI (pilot, EPS calls only), Health Access Mobile (pilot, RAH referrals only), Bus Connect (pilot, winter warming bus)
- Under Boyle Street: Streetworks (harm reduction/needle exchange, DT hours only), Mobile Outreach Addictions Team

### AHS — Alberta Health Services
- **Community Paramedics:** Mobile acute care, 8am-8pm daily. Phone: 1-833-367-2788
- **Community Response Team:** 6 teams, nurse/paramedic, in-home care, no transport. Phone: 1-833-367-2788
- **City Centre Team:** Downtown focus, 8am-8pm daily. Phone: 1-833-367-2788
- **Access 24/7:** Walk-in + phone. Mental health & addiction. Located at RAH campus (10240 Kingsway Ave). Phone: 1-833-367-2788
  - **PACT** (Police & Crisis Team): EPS + mental health therapist. Can apprehend under Mental Health Act. 24/7. Phone: 780-424-2424. Not public.
  - **CREMS** (Crisis Response & EMS): Paramedic + mental health therapist. 24/7. Phone: 1-833-367-2788. Not public.

### DATS — Dedicated Accessible Transit
- Application required for eligibility (physical/cognitive disability)
- Pre-booked rides

### BIA Teams — Business Improvement Areas
- **DBA Core Patrol:** Downtown BIA, 24/7, HireGood staff
- **Stoney Plain Road:** 2 navigators, 4-month pilot, 4 days/week, HireGood
- **Old Strathcona:** On-call, 9am-12am, HireGood staff

---

## Drop-Off Locations (Map Pins)

These are physical locations where someone can bring a person in crisis:

| Service | Address | 24/7? | Who | Notes |
|---------|---------|-------|-----|-------|
| Hope Mission (Herb Jamieson) | 10014 105A Ave NW | Yes | Adult men | Walk-in, open door |
| Boyle Street Community Services | 10116 105 Ave NW | No | All adults | M-F 8-4, Sat-Sun 9-3 |
| George Spady Detox | 10015 105A Ave NW | Yes | All adults | Walk-in, intoxication |
| George Spady Aurora Centre | 10015 105A Ave NW | Yes | All adults | Crisis stabilization |
| Access 24/7 | 10240 Kingsway Ave NW | Yes | All | Mental health/addiction |
| Royal Alexandra Hospital | 10240 Kingsway Ave NW | Yes | All | Emergency |
| U of A Hospital | 8440 112 St NW | Yes | All | Emergency |
| YESS | 9310 82 Ave NW | Yes | Youth 15-24 | Emergency shelter |

### Not drop-off but important physical location:
| Service | Address | Notes |
|---------|---------|-------|
| Ambrose Place (NiGiNan) | 9629 106 Ave NW | Indigenous supportive housing, NOT emergency shelter |

---

## Pilot Programs — Time-Sensitive

**⚠️ These may end March 2026. Show prominent warnings.**

1. **UHEI** (Unsheltered Homelessness & Encampments Initiative) — funded until March 2026
2. **Health Access Mobile Team** — contract until end of March 2026
3. **Bus Connect** — funded until March 31, 2026
4. **Stoney Plain Rd BIA Navigators** — 4-month pilot, end date unclear

---

## Key Operational Notes

### Transport
- CDT (Hope Mission + Boyle Street vans): **Yes — all transport is voluntary**
- COTT: Can transport from transit locations
- PACT: Can transport to hospital (Mental Health Act)
- CREMS: Can transport to hospital/crisis services
- Health Access Mobile: RAH → medical centres/shelters
- Bus Connect: Mobile warming bus, west loop route
- DATS: Pre-booked accessible rides
- **Most AHS community teams do NOT transport**

### Referral Requirements
- H.E.L.P.: EPS referrals only
- UHEI: EPS calls only
- Health Access Mobile: RAH Navigator referrals only
- PACT: Dispatched through EPS or AHS
- CREMS: Dispatched through AHS
- COTT: PO referrals
- DATS: Application required

### Time-Awareness Gotchas
- COTT runs 6am-2am (NOT 24/7 — gap between 2am-6am)
- Peace officers are NOT 24hr — varies by type
- AHS community teams typically 8am-8pm
- Boyle Street drop-in closes at 4pm weekdays, 3pm weekends
- Access 24/7 phone is 24/7 but walk-in hours should be verified
- Bus Connect has two modes: winter 24/7 vs normal M-F 11:30-7:30

---

## Decision Tree Logic Notes

### For EPS Officers
- Non-violent crisis + intoxication → George Spady Detox (24/7), CDT for transport
- Mental health crisis → PACT (24/7, call dispatch), Access 24/7 walk-in
- Encampment → UHEI (if still funded), Low/High-risk encampment teams
- Youth → YESS (24/7, ages 15-24)
- Indigenous person requesting culturally safe care → Ambrose Place (not emergency, but reference), CDT can transport to culturally appropriate services

### For Community Members / Business Owners
- Start with 211 (press 3) for CDT
- If medical emergency → 911
- If mental health crisis → 1-833-367-2788 (Access 24/7 phone)
- If someone needs shelter → direct to Hope Mission (men) or other shelters
- If youth → YESS

### For Peace Officers
- Transit-related → COTT, then CDT if needed
- River valley → Park Rangers, then CDT if needed
- Encampment → Low/High-risk teams
