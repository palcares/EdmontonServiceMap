/**
 * map.js — Mobile-first Leaflet map with search, bottom sheet & SVG icons
 *
 * Features:
 * - CartoDB Voyager tiles, Edmonton downtown
 * - Custom colored pin markers with transport badge and pulse glow
 * - Search bar: searches all service fields, dropdown results, fly-to
 * - 11 action-oriented filters (including Bring Here, Come To You, Transports)
 * - Two-section bottom sheet: Drop-offs + Mobile teams
 * - Coverage area overlay toggles via legend panel
 * - Geolocation "find me" button
 */

var map = null;
var markerLayer = null;
var overlayLayers = {};
var markers = [];
var userLocationMarker = null;
var userLatLng = null;
var sheetState = 'peek';
var currentFilter = 'all';

// ── Approximate coverage areas for mobile teams ──

var COVERAGE_AREAS = {
  cdt: {
    label: 'Crisis Diversion (CDT)',
    type: 'circle',
    center: [53.5461, -113.4937],
    radius: 14000,
    color: '#d97706',
    info: '24/7 \u00b7 Citywide \u00b7 211 press 3'
  },
  cott: {
    label: 'COTT \u2014 Transit',
    type: 'polyline',
    points: [
      [53.4484, -113.5076],
      [53.4860, -113.5087],
      [53.5073, -113.5115],
      [53.5211, -113.5060],
      [53.5344, -113.4982],
      [53.5387, -113.4929],
      [53.5420, -113.4903],
      [53.5480, -113.4894],
      [53.5692, -113.4949],
      [53.5907, -113.4586],
      [53.6062, -113.4105]
    ],
    color: '#0d9488',
    weight: 6,
    info: '6am\u20132am \u00b7 Transit corridors \u00b7 PO referral'
  },
  'city-centre-team': {
    label: 'City Centre Team',
    type: 'polygon',
    points: [
      [53.557, -113.518],
      [53.557, -113.473],
      [53.532, -113.473],
      [53.532, -113.518]
    ],
    color: '#16a34a',
    info: '8am\u20138pm daily \u00b7 Downtown'
  },
  'bia-core-patrol': {
    label: 'DBA Core Patrol',
    type: 'polygon',
    points: [
      [53.552, -113.512],
      [53.552, -113.483],
      [53.538, -113.483],
      [53.538, -113.512]
    ],
    color: '#7c3aed',
    info: '24/7 \u00b7 Downtown BIA \u00b7 HireGood'
  },
  streetworks: {
    label: 'Streetworks Outreach',
    type: 'polygon',
    points: [
      [53.553, -113.515],
      [53.553, -113.490],
      [53.538, -113.490],
      [53.538, -113.515]
    ],
    color: '#e11d48',
    info: 'Mon\u2013Fri 9am\u20135pm \u00b7 Downtown core'
  },
  'community-paramedics': {
    label: 'Community Paramedics',
    type: 'circle',
    center: [53.5461, -113.4937],
    radius: 12000,
    color: '#0891b2',
    info: '8am\u20138pm daily \u00b7 Citywide'
  },
  pact: {
    label: 'PACT',
    type: 'circle',
    center: [53.5461, -113.4937],
    radius: 13000,
    color: '#7c3aed',
    info: '24/7 \u00b7 Citywide \u00b7 Restricted'
  },
  crems: {
    label: 'CREMS',
    type: 'circle',
    center: [53.5461, -113.4937],
    radius: 13000,
    color: '#dc2626',
    info: '24/7 \u00b7 Citywide \u00b7 Restricted'
  }
};

// ── Filter options (11 action-oriented) ──

var SHEET_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'bring', label: 'Bring Someone Here', icon: 'pin' },
  { id: 'come', label: 'They Come To You', icon: 'truck' },
  { id: 'open', label: 'Open Now' },
  { id: 'transports', label: 'Transports', icon: 'truck' },
  { id: 'crisis', label: 'Crisis' },
  { id: 'mental-health', label: 'Mental Health' },
  { id: 'shelter', label: 'Shelter' },
  { id: 'medical', label: 'Medical' },
  { id: 'youth', label: 'Youth' },
  { id: 'intoxication', label: 'Intoxication' }
];

// ── Init ──

function initMap() {
  map = L.map('map', {
    zoomControl: false
  }).setView([53.5461, -113.4937], 12);

  L.control.zoom({ position: 'topleft' }).addTo(map);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  addDropOffPins();
  buildLegend();
  buildBottomSheet();
  addLocateButton();
  initSearch();

  document.addEventListener('timechange', function() {
    updatePinStatus();
    updateSheetCards();
  });
}

// ═══════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════

function initSearch() {
  var input = document.getElementById('search-input');
  var clearBtn = document.getElementById('search-clear');
  var resultsEl = document.getElementById('search-results');
  var searchIconEl = document.querySelector('.search-icon');
  if (searchIconEl) searchIconEl.innerHTML = icon('search', 16);

  input.addEventListener('input', function() {
    var query = input.value.trim();
    clearBtn.style.display = query ? 'flex' : 'none';
    if (query.length < 2) {
      resultsEl.style.display = 'none';
      return;
    }
    var results = searchServices(query);
    renderSearchResults(results, resultsEl);
  });

  input.addEventListener('focus', function() {
    var query = input.value.trim();
    if (query.length >= 2) {
      resultsEl.style.display = 'block';
    }
  });

  clearBtn.addEventListener('click', function() {
    input.value = '';
    clearBtn.style.display = 'none';
    resultsEl.style.display = 'none';
    input.focus();
  });

  // Close on outside click
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#map-search')) {
      resultsEl.style.display = 'none';
    }
  });
}

function searchServices(query) {
  var q = query.toLowerCase();
  var scored = servicesData.map(function(svc) {
    var score = 0;
    var fields = [
      svc.name, svc.shortName, svc.description, svc.operator,
      svc.phone, svc.address, svc.category,
      (svc.tags || []).join(' '),
      (svc.services || []).join(' ')
    ];
    fields.forEach(function(f) {
      if (!f) return;
      var fl = f.toLowerCase();
      if (fl === q) score += 10;
      else if (fl.indexOf(q) === 0) score += 5;
      else if (fl.indexOf(q) >= 0) score += 2;
    });
    // Boost for transport-related queries
    if (q.indexOf('transport') >= 0 && svc.transport) score += 5;
    if (q.indexOf('detox') >= 0 && (svc.services || []).indexOf('detox') >= 0) score += 5;
    return { svc: svc, score: score };
  }).filter(function(x) { return x.score > 0; });

  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.slice(0, 8).map(function(x) { return x.svc; });
}

function renderSearchResults(results, container) {
  if (results.length === 0) {
    container.innerHTML = '<div class="search-no-results">No services found</div>';
    container.style.display = 'block';
    return;
  }

  container.innerHTML = results.map(function(svc) {
    var open = isServiceOpen(svc);
    var badge = open ? '<span class="search-badge badge-open">Open</span>' : '<span class="search-badge badge-closed">Closed</span>';
    var typeBadge = '';
    if (svc.isDropOff) typeBadge = '<span class="search-type-badge type-dropoff">Drop-off</span>';
    else if (svc.isMobile) typeBadge = '<span class="search-type-badge type-mobile">Mobile</span>';
    else typeBadge = '<span class="search-type-badge type-phone">Phone</span>';

    var transportIcon = svc.transport ? '<span class="search-transport">' + icon('truck', 12) + '</span>' : '';

    return '<div class="search-result-item" data-id="' + svc.id + '">' +
      '<div class="search-result-top">' +
        '<span class="search-result-name">' + (svc.shortName || svc.name) + '</span>' +
        transportIcon +
        badge +
      '</div>' +
      '<div class="search-result-meta">' + typeBadge + ' ' + formatHours(svc) + '</div>' +
    '</div>';
  }).join('');

  container.style.display = 'block';

  container.querySelectorAll('.search-result-item').forEach(function(item) {
    item.addEventListener('click', function() {
      focusService(item.dataset.id);
      container.style.display = 'none';
      document.getElementById('search-input').value = '';
      document.getElementById('search-clear').style.display = 'none';
    });
  });
}

// ═══════════════════════════════════════
// MARKERS (pins with transport badge)
// ═══════════════════════════════════════

function createPinIcon(accessibility, isOpen, hasTransport) {
  var color = getAccessibilityColor(accessibility);
  var openClass = isOpen ? ' map-pin-open' : '';
  var transportBadge = hasTransport
    ? '<div class="map-pin-transport">' + icon('truck', 10) + '</div>'
    : '';
  return L.divIcon({
    className: 'map-pin-wrapper',
    html: '<div class="map-pin' + openClass + '" style="--pin-color: ' + color + '">' +
          '<div class="map-pin-head"><div class="map-pin-dot"></div></div>' +
          '<div class="map-pin-point"></div>' +
          transportBadge +
          '</div>',
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -46]
  });
}

function getAdjustedCoordinates(service, allDropOffs) {
  var lat = service.coordinates[0];
  var lng = service.coordinates[1];
  var sameSpot = allDropOffs.filter(function(s) {
    return s.id !== service.id &&
      s.coordinates &&
      Math.abs(s.coordinates[0] - lat) < 0.0002 &&
      Math.abs(s.coordinates[1] - lng) < 0.0002;
  });

  if (sameSpot.length > 0) {
    var group = [service].concat(sameSpot).sort(function(a, b) {
      return a.id.localeCompare(b.id);
    });
    var idx = group.findIndex(function(s) { return s.id === service.id; });
    var n = group.length;
    var step = 0.0004;
    var angle = (2 * Math.PI * idx) / n - Math.PI / 2;
    lat += Math.sin(angle) * step;
    lng += Math.cos(angle) * step;
  }
  return [lat, lng];
}

function addDropOffPins() {
  var dropOffs = getDropOffLocations();

  dropOffs.forEach(function(service) {
    if (!service.coordinates) return;

    var coords = getAdjustedCoordinates(service, dropOffs);
    var isOpen = isServiceOpen(service);
    var pinIcon = createPinIcon(service.accessibility, isOpen, service.transport);
    var marker = L.marker(coords, { icon: pinIcon }).addTo(markerLayer);

    marker.bindPopup(createPopupHTML(service), {
      maxWidth: 300,
      minWidth: 240,
      className: 'custom-popup'
    });
    marker.serviceId = service.id;
    markers.push(marker);
  });
}

// ── Popup (with transport info row) ──

function createPopupHTML(service) {
  var open = isServiceOpen(service);
  var badgeClass = open ? 'popup-badge-open' : 'popup-badge-closed';
  var badgeText = open ? 'Open Now' : 'Closed';
  var hours = formatHours(service);
  var serves = formatServes(service.serves);
  var accLabel = getAccessibilityLabel(service.accessibility);
  var accColor = getAccessibilityColor(service.accessibility);

  var phoneHTML = '';
  if (service.phone) {
    var tel = getPhoneTel(service.phone);
    phoneHTML =
      '<a href="tel:' + tel + '" class="popup-phone-cta">' +
        icon('phone', 16) + ' Call ' + service.phone +
      '</a>';
  }

  var pilotHTML = '';
  if (service.pilotProgram) {
    var endDate = service.pilotEndDate
      ? new Date(service.pilotEndDate).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
      : 'TBD';
    pilotHTML =
      '<div class="popup-pilot">' +
        icon('alertTri', 14) + ' Pilot program \u2014 funded until ' + endDate +
      '</div>';
  }

  // Transport info row
  var transportHTML = '';
  if (service.transport) {
    transportHTML = '<div class="popup-transport popup-transport-yes">' +
      icon('truck', 14) + ' <strong>Transport available</strong>' +
      (service.transportNotes ? ' \u2014 ' + service.transportNotes : '') +
    '</div>';
  } else {
    transportHTML = '<div class="popup-transport popup-transport-no">' +
      icon('pin', 14) + ' Drop-off only \u2014 no transport' +
    '</div>';
  }

  var directionsHTML = '';
  if (service.address && service.coordinates) {
    var mapsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' +
      encodeURIComponent(service.address + ', Edmonton, AB');
    directionsHTML =
      '<a href="' + mapsUrl + '" target="_blank" rel="noopener" class="popup-directions">' +
        icon('navigation', 16) + ' Get Directions' +
      '</a>';
  }

  var operatorHTML = '';
  if (service.operator) {
    operatorHTML = '<div class="popup-row popup-operator">' +
      '<span style="font-style:italic;color:#6b7280;font-size:0.78rem">' + service.operator + '</span>' +
    '</div>';
  }

  var descHTML = '';
  if (service.description) {
    descHTML = '<div class="popup-row popup-desc">' +
      '<span style="font-size:0.82rem;color:#4b5563;line-height:1.4">' + service.description + '</span>' +
    '</div>';
  }

  var entryHTML = '';
  if (service.entryPoint) {
    entryHTML = '<div class="popup-row">' +
      icon('phone', 16) +
      '<span>Access via: ' + service.entryPoint + '</span>' +
    '</div>';
  }

  return (
    '<div class="map-popup">' +
      '<div class="popup-accent-bar" style="background:' + accColor + '"></div>' +
      '<div class="popup-header">' +
        '<h3 class="popup-name">' + service.name + '</h3>' +
        '<span class="popup-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</div>' +
      operatorHTML +
      pilotHTML +
      '<div class="popup-body">' +
        descHTML +
        (service.address
          ? '<div class="popup-row">' +
              icon('pin', 16) +
              '<span>' + service.address + '</span>' +
            '</div>'
          : '') +
        '<div class="popup-row">' +
          icon('clock', 16) +
          '<span>' + hours + '</span>' +
        '</div>' +
        (serves
          ? '<div class="popup-row">' +
              icon('users', 16) +
              '<span>' + serves + '</span>' +
            '</div>'
          : '') +
        entryHTML +
        transportHTML +
        phoneHTML +
        '<div class="popup-access" style="border-left-color: ' + accColor + '">' +
          '<span class="popup-access-label">' + accLabel + '</span>' +
          (service.accessNotes
            ? '<span class="popup-access-notes">' + service.accessNotes + '</span>'
            : '') +
        '</div>' +
        directionsHTML +
      '</div>' +
    '</div>'
  );
}

// ── Update pins on time change ──

function updatePinStatus() {
  markers.forEach(function(marker) {
    var service = getServiceById(marker.serviceId);
    if (service) {
      var isOpen = isServiceOpen(service);
      marker.setIcon(createPinIcon(service.accessibility, isOpen, service.transport));
      marker.setPopupContent(createPopupHTML(service));
    }
  });
}

// ── Legend ──

function buildLegend() {
  var legend = document.getElementById('map-legend');

  var colorKey = [
    { color: '#d97706', label: 'Public access' },
    { color: '#16a34a', label: 'Specific criteria' },
    { color: '#0d9488', label: 'Restricted' },
    { color: '#ef4444', label: 'Status uncertain' }
  ];

  var typeKey = [
    { html: '<span class="legend-pin-mini" style="background:#d97706"></span>', label: 'Drop-off location' },
    { html: '<span class="legend-overlay-mini" style="background:#d97706"></span>', label: 'Mobile team coverage' },
    { html: icon('truck', 12), label: 'Can transport' }
  ];

  var html =
    '<div class="legend-panel">' +
      '<button class="legend-toggle" id="legend-toggle" aria-label="Toggle legend">' +
        icon('layers', 16) + ' Legend' +
      '</button>' +
      '<div class="legend-body" id="legend-body">' +
        '<div class="legend-section">' +
          '<h4 class="legend-heading">Access Level</h4>' +
          colorKey.map(function(item) {
            return '<div class="legend-color-row">' +
              '<span class="legend-dot" style="background:' + item.color + '"></span>' +
              '<span>' + item.label + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="legend-section">' +
          '<h4 class="legend-heading">Service Types</h4>' +
          typeKey.map(function(item) {
            return '<div class="legend-color-row">' +
              item.html +
              '<span>' + item.label + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="legend-section">' +
          '<h4 class="legend-heading">Coverage Areas</h4>';

  Object.keys(COVERAGE_AREAS).forEach(function(id) {
    var area = COVERAGE_AREAS[id];
    html +=
      '<label class="legend-overlay-toggle">' +
        '<input type="checkbox" data-overlay="' + id + '">' +
        '<span class="legend-overlay-swatch" style="background:' + area.color + '"></span>' +
        '<span class="legend-overlay-label">' +
          '<span>' + area.label + '</span>' +
          '<span class="legend-overlay-info">' + area.info + '</span>' +
        '</span>' +
      '</label>';
  });

  html +=
        '</div>' +
      '</div>' +
    '</div>';

  legend.innerHTML = html;

  document.getElementById('legend-toggle').addEventListener('click', function() {
    document.getElementById('legend-body').classList.toggle('open');
  });

  legend.querySelectorAll('input[data-overlay]').forEach(function(checkbox) {
    checkbox.addEventListener('change', function(e) {
      toggleOverlay(e.target.dataset.overlay, e.target.checked);
    });
  });
}

// ── Coverage Overlays ──

function toggleOverlay(id, show) {
  if (show) {
    if (overlayLayers[id]) {
      overlayLayers[id].addTo(map);
      return;
    }
    var area = COVERAGE_AREAS[id];
    if (!area) return;

    var layer;
    if (area.type === 'circle') {
      layer = L.circle(area.center, {
        radius: area.radius,
        color: area.color,
        fillColor: area.color,
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6 4'
      });
    } else if (area.type === 'polygon') {
      layer = L.polygon(area.points, {
        color: area.color,
        fillColor: area.color,
        fillOpacity: 0.12,
        weight: 2
      });
    } else if (area.type === 'polyline') {
      layer = L.polyline(area.points, {
        color: area.color,
        weight: area.weight || 4,
        opacity: 0.6,
        dashArray: '8 6'
      });
    }

    if (layer) {
      layer.addTo(map);
      overlayLayers[id] = layer;
    }
  } else {
    if (overlayLayers[id]) {
      map.removeLayer(overlayLayers[id]);
    }
  }
}

// ═══════════════════════════════════════
// BOTTOM SHEET (Two sections)
// ═══════════════════════════════════════

function buildBottomSheet() {
  var tabMap = document.getElementById('tab-map');
  var sheet = document.createElement('div');
  sheet.className = 'bottom-sheet peek';
  sheet.id = 'bottom-sheet';

  var counts = getSheetCounts();

  sheet.innerHTML =
    '<div class="sheet-handle" id="sheet-handle"><div class="sheet-handle-bar"></div></div>' +
    '<div class="sheet-header">' +
      '<div class="sheet-summary">' +
        '<span class="sheet-summary-text">' +
          '<span class="sheet-summary-count">' + counts.dropoffs + ' drop-offs</span>' +
          ' \u00b7 ' + counts.mobile + ' mobile teams' +
          ' \u00b7 <span class="sheet-summary-open">' + counts.open + ' open now</span>' +
        '</span>' +
        '<button class="sheet-expand-btn" id="sheet-expand-btn">' +
          icon('chevronUp', 16) +
        '</button>' +
      '</div>' +
      '<div class="sheet-filters" id="sheet-filters">' +
        buildFilterPills() +
      '</div>' +
    '</div>' +
    '<div class="sheet-list" id="sheet-list">' +
      buildSheetContent() +
    '</div>';

  tabMap.appendChild(sheet);

  document.getElementById('sheet-handle').addEventListener('click', toggleSheet);
  document.getElementById('sheet-expand-btn').addEventListener('click', toggleSheet);

  sheet.querySelectorAll('.filter-pill').forEach(function(pill) {
    pill.addEventListener('click', function() {
      currentFilter = pill.dataset.filter;
      sheet.querySelectorAll('.filter-pill').forEach(function(p) { p.classList.remove('active'); });
      pill.classList.add('active');
      updateSheetCards();
    });
  });

  sheet.addEventListener('click', function(e) {
    if (e.target.closest('.call-btn')) return;
    var card = e.target.closest('.sheet-card');
    if (!card) return;
    var serviceId = card.dataset.id;
    if (serviceId) focusService(serviceId);
  });
}

function getSheetCounts() {
  var all = servicesData;
  var dropoffs = all.filter(function(s) { return s.isDropOff; });
  var mobile = all.filter(function(s) { return s.isMobile && !s.parentService; });
  var open = all.filter(function(s) { return (s.isDropOff || s.isMobile) && isServiceOpen(s); }).length;
  return { dropoffs: dropoffs.length, mobile: mobile.length, open: open };
}

function buildFilterPills() {
  return SHEET_FILTERS.map(function(f) {
    var activeClass = f.id === currentFilter ? ' active' : '';
    var iconHTML = f.icon ? icon(f.icon, 12) + ' ' : '';
    return '<button class="filter-pill' + activeClass + '" data-filter="' + f.id + '">' + iconHTML + f.label + '</button>';
  }).join('');
}

function getFilteredServices() {
  var all = servicesData.filter(function(s) {
    return (s.isDropOff || s.isMobile) && !s.parentService;
  });

  if (currentFilter === 'all') return all;
  if (currentFilter === 'bring') return all.filter(function(s) { return s.isDropOff; });
  if (currentFilter === 'come') return all.filter(function(s) { return s.isMobile; });
  if (currentFilter === 'open') return all.filter(function(s) { return isServiceOpen(s); });
  if (currentFilter === 'transports') return all.filter(function(s) { return s.transport; });
  if (currentFilter === 'crisis') return all.filter(function(s) {
    return s.category === 'crisis-response' || (s.tags && s.tags.indexOf('crisis') >= 0);
  });
  if (currentFilter === 'mental-health') return all.filter(function(s) {
    return s.category === 'mental-health' || (s.tags && s.tags.indexOf('mental-health') >= 0);
  });
  if (currentFilter === 'shelter') return all.filter(function(s) {
    return s.category === 'shelter' || s.category === 'drop-in' || (s.tags && s.tags.indexOf('shelter') >= 0);
  });
  if (currentFilter === 'medical') return all.filter(function(s) {
    return s.category === 'healthcare' || s.category === 'hospital' ||
      (s.tags && (s.tags.indexOf('medical') >= 0 || s.tags.indexOf('paramedic') >= 0));
  });
  if (currentFilter === 'youth') return all.filter(function(s) {
    return (s.serves && s.serves.indexOf('youth') >= 0) || (s.tags && s.tags.indexOf('youth') >= 0);
  });
  if (currentFilter === 'intoxication') return all.filter(function(s) {
    return s.category === 'detox' || (s.tags && (s.tags.indexOf('detox') >= 0 || s.tags.indexOf('sobering') >= 0)) ||
      (s.services && s.services.indexOf('detox') >= 0);
  });
  return all;
}

function buildSheetContent() {
  var filtered = getFilteredServices();

  if (filtered.length === 0) {
    return '<div style="padding:24px 16px;text-align:center;color:#9ca3af;font-size:0.82rem">No services match this filter</div>';
  }

  // Split into drop-offs and mobile
  var dropoffs = filtered.filter(function(s) { return s.isDropOff; });
  var mobile = filtered.filter(function(s) { return s.isMobile; });

  var html = '';

  if (dropoffs.length > 0) {
    html += '<div class="sheet-section-header">' +
      icon('pin', 14) + ' Bring Someone Here <span class="sheet-section-count">(' + dropoffs.length + ')</span>' +
    '</div>';
    html += dropoffs.map(function(svc) { return buildSheetCard(svc); }).join('');
  }

  if (mobile.length > 0) {
    html += '<div class="sheet-section-header">' +
      icon('truck', 14) + ' Teams That Come To You <span class="sheet-section-count">(' + mobile.length + ')</span>' +
    '</div>';
    html += mobile.map(function(svc) { return buildSheetCard(svc); }).join('');
  }

  return html;
}

function buildSheetCard(svc) {
  var open = isServiceOpen(svc);
  var badgeClass = open ? 'badge-open' : 'badge-closed';
  var badgeText = open ? 'Open' : 'Closed';
  var accColor = getAccessibilityColor(svc.accessibility);
  var hours = formatHours(svc);

  var distHTML = '';
  if (userLatLng && svc.coordinates) {
    var dist = getDistance(userLatLng[0], userLatLng[1], svc.coordinates[0], svc.coordinates[1]);
    distHTML = '<span class="sheet-card-distance">' + formatDistance(dist) + '</span>';
  }

  var pilotBadge = '';
  if (svc.pilotProgram) {
    var endDate = svc.pilotEndDate
      ? new Date(svc.pilotEndDate).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
      : 'TBD';
    pilotBadge = '<span class="sheet-card-badge badge-pilot">Pilot \u2014 ' + endDate + '</span>';
  }

  // Type badge
  var typeBadge = '';
  if (svc.isMobile) {
    typeBadge = '<span class="sheet-card-badge type-mobile">Mobile</span>';
  } else if (svc.isDropOff) {
    typeBadge = '<span class="sheet-card-badge type-dropoff">Drop-off</span>';
  }

  // Transport badge
  var transportBadge = svc.transport
    ? '<span class="sheet-card-badge transport-badge-yes">' + icon('truck', 10) + ' Transports</span>'
    : '';

  var phoneBtn = '';
  if (svc.phone) {
    var tel = getPhoneTel(svc.phone);
    phoneBtn = '<a href="tel:' + tel + '" class="card-action-btn call-btn" aria-label="Call ' + (svc.shortName || svc.name) + '">' +
      icon('phone', 16) + ' Call</a>';
  }

  // Description snippet (truncated)
  var descHTML = '';
  if (svc.description) {
    descHTML = '<div class="sheet-card-desc">' + svc.description + '</div>';
  }

  // Serves info
  var serves = formatServes(svc.serves);
  var servesHTML = serves
    ? '<span class="sheet-card-serves">' + icon('users', 10) + ' ' + serves + '</span>' : '';

  return '<div class="sheet-card" data-id="' + svc.id + '">' +
    '<div class="sheet-card-accent" style="background:' + accColor + '"></div>' +
    '<div class="sheet-card-body">' +
      '<div class="sheet-card-top">' +
        '<span class="sheet-card-name">' + (svc.shortName || svc.name) + '</span>' +
        typeBadge +
        transportBadge +
        pilotBadge +
        '<span class="sheet-card-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</div>' +
      descHTML +
      '<div class="sheet-card-info">' + hours + servesHTML + distHTML + '</div>' +
    '</div>' +
    '<div class="sheet-card-actions">' +
      phoneBtn +
    '</div>' +
  '</div>';
}

function updateSheetCards() {
  var list = document.getElementById('sheet-list');
  if (!list) return;

  list.innerHTML = buildSheetContent();

  // Update summary counts
  var counts = getSheetCounts();
  var summaryText = document.querySelector('.sheet-summary-text');
  if (summaryText) {
    summaryText.innerHTML =
      '<span class="sheet-summary-count">' + counts.dropoffs + ' drop-offs</span>' +
      ' \u00b7 ' + counts.mobile + ' mobile teams' +
      ' \u00b7 <span class="sheet-summary-open">' + counts.open + ' open now</span>';
  }
}

function toggleSheet() {
  var sheet = document.getElementById('bottom-sheet');
  var btn = document.getElementById('sheet-expand-btn');
  if (sheetState === 'peek') {
    sheetState = 'expanded';
    sheet.className = 'bottom-sheet expanded';
    if (btn) btn.innerHTML = icon('chevronDown', 16);
  } else {
    sheetState = 'peek';
    sheet.className = 'bottom-sheet peek';
    if (btn) btn.innerHTML = icon('chevronUp', 16);
  }
}

function focusService(serviceId) {
  var service = getServiceById(serviceId);
  if (!service) return;

  // If it's a drop-off with a marker, fly to it
  var marker = markers.find(function(m) { return m.serviceId === serviceId; });
  if (marker) {
    sheetState = 'peek';
    var sheet = document.getElementById('bottom-sheet');
    if (sheet) sheet.className = 'bottom-sheet peek';
    var btn = document.getElementById('sheet-expand-btn');
    if (btn) btn.innerHTML = icon('chevronUp', 16);

    map.flyTo(marker.getLatLng(), 15, { duration: 0.5 });
    setTimeout(function() { marker.openPopup(); }, 550);
  } else if (service.isMobile && COVERAGE_AREAS[serviceId]) {
    // For mobile teams, show their coverage overlay
    sheetState = 'peek';
    var sheet = document.getElementById('bottom-sheet');
    if (sheet) sheet.className = 'bottom-sheet peek';
    var btn = document.getElementById('sheet-expand-btn');
    if (btn) btn.innerHTML = icon('chevronUp', 16);

    toggleOverlay(serviceId, true);
    // Check the legend checkbox too
    var checkbox = document.querySelector('input[data-overlay="' + serviceId + '"]');
    if (checkbox) checkbox.checked = true;

    // Pan to coverage area center
    var area = COVERAGE_AREAS[serviceId];
    if (area.center) {
      map.flyTo(area.center, 11, { duration: 0.5 });
    } else if (area.points) {
      var bounds = L.latLngBounds(area.points);
      map.flyToBounds(bounds, { duration: 0.5, padding: [20, 20] });
    }
  }

  // Highlight active card
  document.querySelectorAll('.sheet-card').forEach(function(c) { c.classList.remove('active'); });
  var card = document.querySelector('.sheet-card[data-id="' + serviceId + '"]');
  if (card) card.classList.add('active');
}

// ═══════════════════════════════════════
// GEOLOCATION
// ═══════════════════════════════════════

function addLocateButton() {
  var tabMap = document.getElementById('tab-map');
  var btn = document.createElement('button');
  btn.className = 'map-locate-btn';
  btn.id = 'locate-btn';
  btn.setAttribute('aria-label', 'Find my location');
  btn.innerHTML = icon('crosshair', 20);
  btn.addEventListener('click', locateUser);
  tabMap.appendChild(btn);
}

function locateUser() {
  if (!navigator.geolocation) return;

  var btn = document.getElementById('locate-btn');
  if (btn) btn.classList.add('active');

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      userLatLng = [lat, lng];

      if (userLocationMarker) {
        map.removeLayer(userLocationMarker);
      }
      userLocationMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'map-pin-wrapper',
          html: '<div class="user-location-dot"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        }),
        zIndexOffset: 1000
      }).addTo(map);

      map.flyTo([lat, lng], 14, { duration: 0.5 });
      updateSheetCards();
    },
    function() {
      if (btn) btn.classList.remove('active');
    }
  );
}

function getDistance(lat1, lng1, lat2, lng2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km < 1) return Math.round(km * 1000) + 'm';
  return km.toFixed(1) + 'km';
}
