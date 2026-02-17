/**
 * connections-graph.js — Canvas 2D Network Graph (v2)
 *
 * Renders an interactive force-graph of Edmonton's crisis service ecosystem
 * using Canvas 2D. Warm light theme with flat nodes, bezier curved edges,
 * particle animations, cluster watermarks, touch pinch-to-zoom, smooth camera
 * interpolation, and a rich side-panel detail view.
 *
 * Data driven from services.json via getAllServices().
 *
 * Public API:
 *   window.initConnectionsGraph(container)
 *   window.destroyConnectionsGraph()
 */
(function () {
  'use strict';

  // ═══════════════════════════════════
  //  PALETTE
  // ═══════════════════════════════════

  var CL = {
    '911':          { c: '#4ea4ff', label: '911 Emergency' },
    '311':          { c: '#34d9c0', label: '311 City Services' },
    '211+3':        { c: '#f5c542', label: '211+3 Crisis' },
    'AHS':          { c: '#a78bfa', label: 'Alberta Health' },
    'DATS':         { c: '#f09848', label: 'DATS Transit' },
    'BIA':          { c: '#f06888', label: 'BIA Teams' },
    'shelters':     { c: '#4ecdc4', label: 'Shelters' },
    'crisis-lines': { c: '#e879a8', label: 'Crisis Lines' },
    'community':    { c: '#6b82aa', label: 'Community Services' }
  };

  var AC = {
    'public':          { c: '#34d9c0', l: 'Public \u2013 few criteria' },
    'public-criteria': { c: '#f5c542', l: 'Public \u2013 specific criteria' },
    'restricted':      { c: '#f09848', l: 'Not publicly accessible' },
    'unknown':         { c: '#f06888', l: 'Unsure if active' },
    'system':          { c: '#6b82aa', l: 'System / entry point' }
  };

  // ═══════════════════════════════════
  //  STATE
  // ═══════════════════════════════════

  var ND = [], ED = [], cMap = {}, lk = {}, traits = {};
  var canvas, ctx, W, H, dpr;
  var cam = {}, targetCam = {};
  var cx = 2400, cy = 1500;
  var particles = [];
  var clusterCentroids = {};
  var edgeCurves = {};
  var hlSet = new Set(), hlEdges = new Set(), traitLines = [];
  var selNode = null, hoverNode = null, activeFilter = null, activeCluster = null;
  var isPanning = false, panSX = 0, panSY = 0, panCX = 0, panCY = 0;
  var rafId = null;
  var resizeObs = null;
  var containerEl = null;
  var detailEl = null, filtersEl = null, navEl = null, searchEl = null, legendEl = null;
  var initialized = false;
  var startTime = 0;

  // Touch state
  var touches = {};
  var lastPinchDist = 0;

  // ═══════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════

  window.initConnectionsGraph = function (container) {
    if (initialized) window.destroyConnectionsGraph();
    containerEl = container;
    containerEl.classList.add('cg-light');

    buildGraphData();
    buildLayout();
    resolveCollisions();
    computeClusterCentroids();
    computeEdgeCurves();
    centerCamera();
    initParticles();
    createDOM();
    attachEvents();

    initialized = true;
    startTime = Date.now();
    document.addEventListener('timechange', onTimeChange);

    // Defer canvas init to next frame so container has layout dimensions
    requestAnimationFrame(function () {
      initCanvas();
      rafId = requestAnimationFrame(draw);
    });
  };

  window.destroyConnectionsGraph = function () {
    if (!initialized) return;
    document.removeEventListener('timechange', onTimeChange);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (canvas) {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    }
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('resize', onResize);
    if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
    ND = []; ED = []; cMap = {}; lk = {}; traits = {}; particles = [];
    clusterCentroids = {}; edgeCurves = {};
    hlSet = new Set(); hlEdges = new Set(); traitLines = [];
    selNode = null; hoverNode = null; activeFilter = null; activeCluster = null;
    touches = {}; didAutoFit = false; graphBounds = null;
    containerEl = canvas = ctx = detailEl = filtersEl = navEl = searchEl = legendEl = null;
    initialized = false;
  };

  // ═══════════════════════════════════
  //  DATA BUILDING
  // ═══════════════════════════════════

  function mapAccessibility(acc) {
    switch (acc) {
      case 'public': return 'public';
      case 'public-criteria': return 'public-criteria';
      case 'restricted': return 'restricted';
      case 'unknown': return 'unknown';
      default: return 'system';
    }
  }

  function resolveCluster(svc, svcMap) {
    var ep = svc.entryPoint;
    if (ep && ep !== 'direct' && CL[ep]) return ep;

    // Walk up parent chain — if parent belongs to a named cluster, use that
    var visited = {};
    var cur = svc;
    while (cur && cur.entryPoint === 'direct' && cur.parentService && !visited[cur.id]) {
      visited[cur.id] = true;
      cur = svcMap[cur.parentService];
      if (cur && cur.entryPoint !== 'direct' && CL[cur.entryPoint]) return cur.entryPoint;
    }

    // Sub-cluster "direct" services by category to avoid one giant blob
    var cat = svc.category;
    if (svc.id === '211') return '211+3'; // 211 belongs with 211+3 cluster
    if (cat === 'shelter') return 'shelters';
    if (cat === 'crisis-line') return 'crisis-lines';
    // Phone-only mental-health services (no address) go with crisis lines
    if (cat === 'mental-health' && !svc.address && !svc.isDropOff) return 'crisis-lines';
    return 'community';
  }

  function buildGraphData() {
    var services = getAllServices();
    var svcMap = {};
    services.forEach(function (s) { svcMap[s.id] = s; });

    ND = []; cMap = {}; lk = {}; ED = [];

    services.forEach(function (s) {
      var cluster = resolveCluster(s, svcMap);
      var status = mapAccessibility(s.accessibility);
      var hoursStr = formatHours(s);
      var is247 = s.hours && s.hours.type === '24/7';
      var pilotNote = null;
      if (s.pilotProgram && s.pilotEndDate) {
        var d = new Date(s.pilotEndDate);
        pilotNote = 'Funded until ' + d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
      } else if (s.pilotProgram) {
        pilotNote = 'Pilot program \u2013 end date TBD';
      }

      var node = {
        id: s.id,
        label: s.shortName || s.name,
        full: s.name,
        cluster: cluster,
        status: status,
        hours: hoursStr,
        is247: is247,
        phone: s.phone || null,
        transport: s.transport ? 'Yes' : 'No',
        vans: s.transportNotes || null,
        desc: s.description || '',
        note: pilotNote,
        parent: s.parentService || null,
        dc: 0,
        depth: 0,
        wx: 0, wy: 0,
        svc: s
      };
      ND.push(node);
      lk[s.id] = node;
    });

    // Build child map and edge list from parentService
    ND.forEach(function (n) {
      if (n.parent && lk[n.parent]) {
        if (!cMap[n.parent]) cMap[n.parent] = [];
        cMap[n.parent].push(n.id);
        ED.push([n.parent, n.id, 'tree']);
      }
    });

    // Add edges from connections field (non-hierarchical referral links)
    ND.forEach(function (n) {
      var svc = n.svc;
      if (!svc || !svc.connections) return;
      svc.connections.forEach(function (cid) {
        if (!lk[cid] || cid === n.parent) return;
        if (cMap[n.id] && cMap[n.id].indexOf(cid) >= 0) return;
        var exists = ED.some(function (e) {
          return (e[0] === n.id && e[1] === cid) || (e[0] === cid && e[1] === n.id);
        });
        if (!exists) ED.push([n.id, cid, 'conn']);
      });
    });

    // Compute depth and downstream count
    var roots = ND.filter(function (n) { return !n.parent || !lk[n.parent]; });
    function setDepth(id, d) {
      lk[id].depth = d;
      (cMap[id] || []).forEach(function (kid) { setDepth(kid, d + 1); });
    }
    roots.forEach(function (r) { setDepth(r.id, 0); });

    function countDown(id) {
      var kids = cMap[id] || [];
      return kids.length + kids.reduce(function (a, kid) { return a + countDown(kid); }, 0);
    }
    ND.forEach(function (n) { n.dc = countDown(n.id); });

    // Assign tiers for visual hierarchy:
    //   tier 0 = hubs (have children or are entry-points) — always visible, biggest
    //   tier 1 = operational (drop-off locations, mobile services) — visible at medium zoom
    //   tier 2 = leaves (phone lines, small services) — visible at high zoom
    ND.forEach(function (n) {
      var svc = n.svc;
      if (!svc) { n.tier = 2; return; }
      if (n.dc >= 2 || svc.category === 'entry-point') {
        n.tier = 0;
      } else if (svc.isDropOff || (svc.isMobile && n.dc >= 1) || n.dc >= 1) {
        n.tier = 1;
      } else {
        n.tier = 2;
      }
    });

    // Build traits
    traits = {
      'Public Access': ND.filter(function (n) { return n.status === 'public' || n.status === 'public-criteria'; }),
      'Restricted': ND.filter(function (n) { return n.status === 'restricted'; }),
      '24/7': ND.filter(function (n) { return n.is247; }),
      'Transport': ND.filter(function (n) { return n.transport === 'Yes'; }),
      'Has Phone': ND.filter(function (n) { return !!n.phone; }),
      'Mental Health': ND.filter(function (n) {
        var d = (n.desc || '').toLowerCase();
        return d.indexOf('mental health') >= 0 || d.indexOf('crisis') >= 0 || d.indexOf('therapist') >= 0;
      }),
      'Harm Reduction': ND.filter(function (n) {
        var d = (n.desc || '').toLowerCase();
        return d.indexOf('harm reduction') >= 0 || d.indexOf('needle') >= 0 || d.indexOf('addiction') >= 0;
      }),
      'Funding at Risk': ND.filter(function (n) { return !!n.note; })
    };
  }

  // ═══════════════════════════════════
  //  LAYOUT
  // ═══════════════════════════════════

  function buildLayout() {
    var clusterRoots = {};
    ND.forEach(function (n) {
      if (n.depth === 0) {
        if (!clusterRoots[n.cluster]) clusterRoots[n.cluster] = [];
        clusterRoots[n.cluster].push(n);
      }
    });

    var usedClusters = Object.keys(CL).filter(function (k) {
      return clusterRoots[k] && clusterRoots[k].length > 0;
    });

    var clusterRadius = 900;

    usedClusters.forEach(function (k, i) {
      var angle = -Math.PI / 2 + i * (2 * Math.PI / usedClusters.length);
      var clCx = cx + Math.cos(angle) * clusterRadius;
      var clCy = cy + Math.sin(angle) * clusterRadius;

      var roots = clusterRoots[k];
      roots.sort(function (a, b) { return b.dc - a.dc; });

      var spacing = Math.max(180, 240 - roots.length * 5);
      placeInRings(roots, clCx, clCy, spacing);

      roots.forEach(function (root) {
        var outAngle = Math.atan2(root.wy - cy, root.wx - cx);
        var childRad = root.dc > 3 ? 280 : 210;
        layoutChildren(root.id, root.wx, root.wy, outAngle, childRad);
      });
    });
  }

  function placeInRings(nodes, ringCx, ringCy, spacing) {
    if (!nodes.length) return;
    var placed = 0;
    var ring = 0;
    while (placed < nodes.length) {
      if (ring === 0) {
        nodes[placed].wx = ringCx;
        nodes[placed].wy = ringCy;
        placed++;
      } else {
        var ringR = ring * spacing;
        var maxInRing = Math.max(Math.floor(2 * Math.PI * ringR / (spacing * 0.9)), 1);
        var count = Math.min(maxInRing, nodes.length - placed);
        for (var j = 0; j < count; j++) {
          var a = -Math.PI / 2 + (2 * Math.PI * j / count);
          nodes[placed].wx = ringCx + Math.cos(a) * ringR;
          nodes[placed].wy = ringCy + Math.sin(a) * ringR;
          placed++;
        }
      }
      ring++;
    }
  }

  function layoutChildren(parentId, px, py, baseAngle, radius) {
    var kids = cMap[parentId] || [];
    if (!kids.length) return;
    var spreadAngle = kids.length <= 2 ? Math.PI * 0.6 : Math.PI * 0.9;
    var step = spreadAngle / kids.length;

    kids.forEach(function (kid, i) {
      var a = baseAngle - spreadAngle / 2 + step * (i + 0.5);
      lk[kid].wx = px + Math.cos(a) * radius;
      lk[kid].wy = py + Math.sin(a) * radius;
      layoutChildren(kid, lk[kid].wx, lk[kid].wy, a, radius * 0.65);
    });
  }

  function resolveCollisions() {
    for (var pass = 0; pass < 120; pass++) {
      var moved = false;
      for (var i = 0; i < ND.length; i++) {
        for (var j = i + 1; j < ND.length; j++) {
          var a = ND[i], b = ND[j];
          if (!a.wx || !b.wx) continue;
          var ra = nodeRadius(a) + a.label.length * 6 + 50;
          var rb = nodeRadius(b) + b.label.length * 6 + 50;
          var dx = a.wx - b.wx, dy = a.wy - b.wy;
          var dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          var minDist = ra + rb;
          if (dist >= minDist) continue;
          if (dx === 0 && dy === 0) { dx = (Math.random() - 0.5) * 2; dy = (Math.random() - 0.5) * 2; dist = 1; }
          var overlap = (minDist - dist) * 0.55;
          var px = dx / dist * overlap, py = dy / dist * overlap;
          var aw = a.depth === 0 ? 0.2 : 1;
          var bw = b.depth === 0 ? 0.2 : 1;
          var tot = aw + bw;
          a.wx += px * (aw / tot); a.wy += py * (aw / tot);
          b.wx -= px * (bw / tot); b.wy -= py * (bw / tot);
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  // ═══════════════════════════════════
  //  CLUSTER CENTROIDS (for watermarks)
  // ═══════════════════════════════════

  function computeClusterCentroids() {
    clusterCentroids = {};
    var sums = {};
    ND.forEach(function (n) {
      if (!sums[n.cluster]) sums[n.cluster] = { x: 0, y: 0, count: 0 };
      sums[n.cluster].x += n.wx;
      sums[n.cluster].y += n.wy;
      sums[n.cluster].count++;
    });
    Object.keys(sums).forEach(function (k) {
      var s = sums[k];
      clusterCentroids[k] = { x: s.x / s.count, y: s.y / s.count };
    });
  }

  // ═══════════════════════════════════
  //  BEZIER EDGE CURVES
  // ═══════════════════════════════════

  function computeEdgeCurves() {
    edgeCurves = {};
    ED.forEach(function (e) {
      var s = lk[e[0]], t = lk[e[1]];
      if (!s || !t) return;
      var key = e[0] + '>' + e[1];
      var mx = (s.wx + t.wx) / 2;
      var my = (s.wy + t.wy) / 2;
      var dx = t.wx - s.wx;
      var dy = t.wy - s.wy;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      // Perpendicular offset — use a hash for consistent varied curvature
      var hash = simpleHash(key);
      var sign = hash % 2 === 0 ? 1 : -1;
      var curvature = e[2] === 'conn' ? len * 0.25 : len * 0.12;
      var offset = curvature * sign;
      edgeCurves[key] = {
        cx: mx + (-dy / len) * offset,
        cy: my + (dx / len) * offset
      };
    });
  }

  function simpleHash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  // Quadratic bezier point at t
  function bezierPoint(sx, sy, cx, cy, tx, ty, t) {
    var u = 1 - t;
    return {
      x: u * u * sx + 2 * u * t * cx + t * t * tx,
      y: u * u * sy + 2 * u * t * cy + t * t * ty
    };
  }

  function centerCamera() {
    if (!ND.length) return;
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    ND.forEach(function (n) {
      if (n.wx < minX) minX = n.wx; if (n.wx > maxX) maxX = n.wx;
      if (n.wy < minY) minY = n.wy; if (n.wy > maxY) maxY = n.wy;
    });
    cx = (minX + maxX) / 2;
    cy = (minY + maxY) / 2;
    graphBounds = { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
    // Start zoomed in for intro, ease out to fit-to-view (computed in first draw)
    cam.x = cx; cam.y = cy - 100; cam.z = 0.15;
    targetCam.x = cx; targetCam.y = cy; targetCam.z = 0.4;
  }

  var graphBounds = null;
  var didAutoFit = false;

  function autoFitCamera() {
    if (!graphBounds || !W || !H || didAutoFit) return;
    didAutoFit = true;
    var pad = 120;
    var bw = graphBounds.maxX - graphBounds.minX;
    var bh = graphBounds.maxY - graphBounds.minY;
    if (bw <= 0 || bh <= 0) return;
    var zx = (W - pad * 2) / bw;
    var zy = (H - pad * 2) / bh;
    var fitZ = Math.min(zx, zy);
    fitZ = Math.min(Math.max(fitZ, 0.15), 0.8);
    targetCam.z = fitZ;
    targetCam.x = cx;
    targetCam.y = cy;
  }

  // ═══════════════════════════════════
  //  PARTICLES
  // ═══════════════════════════════════

  function initParticles() {
    particles = [];
    ED.forEach(function (e) {
      var s = lk[e[0]], t = lk[e[1]];
      if (!s || !t) return;
      var count = e[2] === 'tree' ? 3 : 1;
      var key = e[0] + '>' + e[1];
      var curve = edgeCurves[key];
      for (var p = 0; p < count; p++) {
        particles.push({
          sx: s.wx, sy: s.wy, tx: t.wx, ty: t.wy,
          curveCx: curve ? curve.cx : (s.wx + t.wx) / 2,
          curveCy: curve ? curve.cy : (s.wy + t.wy) / 2,
          p: Math.random(), speed: 0.0012 + Math.random() * 0.0025,
          cluster: s.cluster, edge: e
        });
      }
    });
  }

  // ═══════════════════════════════════
  //  DOM
  // ═══════════════════════════════════

  function createDOM() {
    containerEl.innerHTML = '';

    // Canvas
    canvas = document.createElement('canvas');
    canvas.className = 'cg-canvas';
    containerEl.appendChild(canvas);

    // Detail panel
    detailEl = document.createElement('div');
    detailEl.id = 'cg-detail';
    detailEl.innerHTML = '<div class="dp"><button class="dp-close" aria-label="Close">\u2715</button><div id="dpContent"></div></div>';
    containerEl.appendChild(detailEl);

    // Filters
    filtersEl = document.createElement('div');
    filtersEl.id = 'cg-filters';
    buildFilterButtons();
    containerEl.appendChild(filtersEl);

    // Legend
    legendEl = document.createElement('div');
    legendEl.id = 'cg-legend';
    legendEl.innerHTML =
      '<div class="lt">Border = Access Level</div>' +
      '<div class="lr"><div class="lp" style="background:#34d9c0"></div>Public \u2013 few criteria</div>' +
      '<div class="lr"><div class="lp" style="background:#f5c542"></div>Public \u2013 specific criteria</div>' +
      '<div class="lr"><div class="lp lp-dash" style="border-color:#f09848"></div>Not publicly accessible</div>' +
      '<div class="lr"><div class="lp lp-dot" style="border-color:#f06888"></div>Unsure if active</div>' +
      '<div class="lr"><div class="lp" style="background:#6b82aa"></div>System / entry point</div>' +
      '<div class="lt lt2">Badges = Properties</div>' +
      '<div class="lr"><div class="lb" style="background:#16a34a"></div>24/7 Service</div>' +
      '<div class="lr"><div class="lb" style="background:#2563eb"></div>Has Transport</div>' +
      '<div class="lr"><div class="lb" style="background:#ea580c"></div>Referral Required</div>' +
      '<div class="lr"><div class="lb" style="background:#dc2626"></div>Pilot / At Risk</div>' +
      '<div class="lt lt2">Shape = Type</div>' +
      '<div class="lr"><div class="ls" style="border-radius:50%"></div>Mobile / Transport</div>' +
      '<div class="lr"><div class="ls" style="border-radius:3px"></div>Physical Location</div>' +
      '<div class="lr"><div class="ls ls-diamond"></div>Crisis Line</div>' +
      '<div class="lr"><div class="ls ls-hex"></div>Entry Point</div>';
    containerEl.appendChild(legendEl);

    // Search
    searchEl = document.createElement('div');
    searchEl.id = 'cg-search';
    searchEl.innerHTML = '<input type="text" id="cg-search-input" placeholder="Search services\u2026">';
    containerEl.appendChild(searchEl);

    // Nav bar
    navEl = document.createElement('nav');
    navEl.id = 'cg-nav';
    buildNavBar();
    containerEl.appendChild(navEl);

    // Orientation hint — auto-dismiss
    var hint = document.createElement('div');
    hint.className = 'cg-hint';
    hint.innerHTML = 'Tap a node to explore \u00b7 Scroll to zoom \u00b7 Drag to pan';
    containerEl.appendChild(hint);
    var dismissHint = function () {
      hint.classList.add('cg-hint-hide');
      setTimeout(function () { if (hint.parentNode) hint.parentNode.removeChild(hint); }, 500);
      canvas.removeEventListener('pointerdown', dismissHint);
      canvas.removeEventListener('wheel', dismissHint);
    };
    canvas.addEventListener('pointerdown', dismissHint);
    canvas.addEventListener('wheel', dismissHint);
    setTimeout(dismissHint, 5000);
  }

  function buildFilterButtons() {
    filtersEl.innerHTML = '';
    Object.keys(traits).forEach(function (t) {
      var btn = document.createElement('button');
      btn.className = 'fb';
      btn.dataset.trait = t;
      btn.innerHTML = t + ' <span class="fc">' + traits[t].length + '</span>';
      btn.addEventListener('click', function () { applyFilter(t); });
      filtersEl.appendChild(btn);
    });
  }

  function buildNavBar() {
    navEl.innerHTML = '';
    Object.keys(CL).forEach(function (k) {
      var cl = CL[k];
      var hasNodes = ND.some(function (n) { return n.cluster === k; });
      if (!hasNodes) return;
      var btn = document.createElement('button');
      btn.className = 'nb';
      btn.dataset.cluster = k;
      btn.innerHTML = '<span class="d" style="background:' + cl.c + ';box-shadow:0 0 6px ' + cl.c + '"></span>' + cl.label;
      btn.addEventListener('click', function () { onClusterClick(k, btn); });
      navEl.appendChild(btn);
    });
    var sp = document.createElement('div');
    sp.className = 'sep';
    navEl.appendChild(sp);
    var rb = document.createElement('button');
    rb.className = 'nr';
    rb.textContent = '\u27F3 Reset';
    rb.addEventListener('click', resetAll);
    navEl.appendChild(rb);
  }

  // ═══════════════════════════════════
  //  CANVAS SETUP
  // ═══════════════════════════════════

  function initCanvas() {
    ctx = canvas.getContext('2d');
    onResize();
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) {
      resizeObs = new ResizeObserver(onResize);
      resizeObs.observe(containerEl);
    }
  }

  function onResize() {
    if (!containerEl || !canvas || !ctx) return;
    var cw = containerEl.clientWidth, ch = containerEl.clientHeight;
    if (!cw || !ch) { W = 0; H = 0; return; }
    dpr = window.devicePixelRatio || 1;
    W = cw; H = ch;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ═══════════════════════════════════
  //  CAMERA + TRANSFORMS
  // ═══════════════════════════════════

  function w2s(wx, wy) {
    return { x: (wx - cam.x) * cam.z + W / 2, y: (wy - cam.y) * cam.z + H / 2 };
  }
  function s2w(sx, sy) {
    return { x: (sx - W / 2) / cam.z + cam.x, y: (sy - H / 2) / cam.z + cam.y };
  }

  // ═══════════════════════════════════
  //  HIT TESTING
  // ═══════════════════════════════════

  function nodeRadius(n) {
    // Tier-based sizing: hubs are large, operational medium, leaves small
    if (n.tier === 0) return 44 + Math.min(n.dc, 10) * 4;
    if (n.tier === 1) return 22 + Math.min(n.dc, 4) * 3;
    return 12 + n.dc * 2;
  }

  function nodeShape(n) {
    var svc = n.svc;
    if (!svc) return 'circle';
    if (svc.category === 'entry-point') return 'hexagon';
    if (svc.isDropOff && svc.address) return 'square';
    if (svc.category === 'crisis-line' || (!svc.isDropOff && !svc.isMobile && !svc.address && svc.phone)) return 'diamond';
    return 'circle';
  }

  function drawShape(ctx, x, y, r, shape) {
    switch (shape) {
      case 'square':
        var s = r * 1.6;
        var cr = r * 0.22;
        roundRect(ctx, x - s / 2, y - s / 2, s, s, cr);
        break;
      case 'diamond':
        ctx.moveTo(x, y - r * 1.15);
        ctx.lineTo(x + r * 0.9, y);
        ctx.lineTo(x, y + r * 1.15);
        ctx.lineTo(x - r * 0.9, y);
        ctx.closePath();
        break;
      case 'hexagon':
        for (var i = 0; i < 6; i++) {
          var a = -Math.PI / 2 + i * Math.PI / 3;
          var hx = x + r * Math.cos(a);
          var hy = y + r * Math.sin(a);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        break;
      default:
        ctx.arc(x, y, r, 0, Math.PI * 2);
    }
  }

  // Tiny white icon drawn inside a property badge
  function drawBadgeIcon(ctx, x, y, r, type) {
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = Math.max(1, r * 0.4);
    ctx.lineCap = 'round';
    switch (type) {
      case 'clock': // 24/7 — clock hands
        ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 0.6);
        ctx.moveTo(x, y); ctx.lineTo(x + r * 0.45, y + r * 0.1); ctx.stroke();
        break;
      case 'arrow': // transport — upward arrow
        ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r * 0.6);
        ctx.moveTo(x - r * 0.5, y - r * 0.2); ctx.lineTo(x, y - r); ctx.lineTo(x + r * 0.5, y - r * 0.2); ctx.stroke();
        break;
      case 'lock': // referral — padlock
        ctx.beginPath(); ctx.arc(x, y - r * 0.3, r * 0.45, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.rect(x - r * 0.55, y - r * 0.05, r * 1.1, r * 0.9);
        ctx.fill();
        break;
      case 'warn': // pilot — exclamation mark
        ctx.beginPath(); ctx.moveTo(x, y - r * 0.8); ctx.lineTo(x, y + r * 0.15); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y + r * 0.6, r * 0.22, 0, Math.PI * 2); ctx.fill();
        break;
    }
    ctx.lineCap = 'butt';
  }

  function findNodeAt(sx, sy) {
    var w = s2w(sx, sy);
    var best = null, bestD = 1e9;
    ND.forEach(function (n) {
      if (!n.wx) return;
      var dx = n.wx - w.x, dy = n.wy - w.y;
      var r = nodeRadius(n) / cam.z + 14 / cam.z;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < r && d < bestD) { bestD = d; best = n; }
    });
    return best;
  }

  // ═══════════════════════════════════
  //  HIGHLIGHT TREE
  // ═══════════════════════════════════

  function highlightTree(n) {
    hlSet.clear(); hlEdges.clear();
    function wUp(nd) {
      hlSet.add(nd.id);
      if (nd.parent && lk[nd.parent]) { hlEdges.add(nd.parent + '>' + nd.id); wUp(lk[nd.parent]); }
    }
    function wDn(nd) {
      hlSet.add(nd.id);
      (cMap[nd.id] || []).forEach(function (kid) { hlEdges.add(nd.id + '>' + kid); wDn(lk[kid]); });
    }
    wUp(n); wDn(n);
    ED.forEach(function (e) {
      if (e[2] === 'conn' && (e[0] === n.id || e[1] === n.id)) {
        hlEdges.add(e[0] + '>' + e[1]);
        hlSet.add(e[0]); hlSet.add(e[1]);
      }
    });
  }

  // ═══════════════════════════════════
  //  RENDER LOOP
  // ═══════════════════════════════════

  function hexRgb(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16)
    };
  }

  function draw() {
    if (!ctx || W <= 0 || H <= 0) { rafId = requestAnimationFrame(draw); return; }

    // Auto-fit on first frame when we know viewport size
    autoFitCamera();

    var now = Date.now();
    var elapsed = (now - startTime) / 1000;

    // Camera interpolation
    cam.x += (targetCam.x - cam.x) * 0.06;
    cam.y += (targetCam.y - cam.y) * 0.06;
    cam.z += (targetCam.z - cam.z) * 0.06;

    ctx.clearRect(0, 0, W, H);

    // Warm light background
    ctx.fillStyle = '#f7f4f0';
    ctx.fillRect(0, 0, W, H);

    // Subtle warm grid
    if (cam.z > 0.15) {
      var gs = 200;
      var ox = (-cam.x * cam.z + W / 2) % (gs * cam.z);
      var oy = (-cam.y * cam.z + H / 2) % (gs * cam.z);
      ctx.strokeStyle = 'rgba(0,30,80,0.04)';
      ctx.lineWidth = 1;
      for (var gx = ox; gx < W; gx += gs * cam.z) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (var gy = oy; gy < H; gy += gs * cam.z) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }
    }

    // ── Cluster background panels — rounded regions behind each cluster ──
    Object.keys(clusterCentroids).forEach(function (k) {
      var cl = CL[k];
      if (!cl) return;
      var clusterNodes = ND.filter(function (n) { return n.cluster === k; });
      if (!clusterNodes.length) return;
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      clusterNodes.forEach(function (n) {
        var r = nodeRadius(n);
        if (n.wx - r < minX) minX = n.wx - r;
        if (n.wx + r > maxX) maxX = n.wx + r;
        if (n.wy - r < minY) minY = n.wy - r;
        if (n.wy + r > maxY) maxY = n.wy + r;
      });
      var pad = 100;
      var p1 = w2s(minX - pad, minY - pad);
      var p2 = w2s(maxX + pad, maxY + pad);
      var rw = p2.x - p1.x, rh = p2.y - p1.y;
      if (p1.x > W + 50 || p2.x < -50 || p1.y > H + 50 || p2.y < -50) return;
      var rgb = hexRgb(cl.c);
      var isActive = activeCluster === k;
      var panelAlpha = isActive ? 0.1 : 0.05;
      ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + panelAlpha + ')';
      ctx.beginPath();
      roundRect(ctx, p1.x, p1.y, rw, rh, 20 * cam.z);
      ctx.fill();
      // Subtle border
      ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (isActive ? 0.3 : 0.15) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      roundRect(ctx, p1.x, p1.y, rw, rh, 20 * cam.z);
      ctx.stroke();
    });

    // ── Cluster watermark labels ──
    Object.keys(clusterCentroids).forEach(function (k) {
      var cl = CL[k];
      if (!cl) return;
      var centroid = clusterCentroids[k];
      var sp = w2s(centroid.x, centroid.y);
      if (sp.x < -300 || sp.x > W + 300 || sp.y < -300 || sp.y > H + 300) return;
      var rgb = hexRgb(cl.c);
      var fs = Math.max(32, 90 * cam.z);
      var isActive = activeCluster === k;
      var alpha = isActive ? 0.18 : 0.09;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 ' + fs + 'px Inter, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
      ctx.fillText(cl.label.toUpperCase(), sp.x, sp.y);
    });

    // Cluster ambient glow
    Object.keys(clusterCentroids).forEach(function (k) {
      var cl = CL[k];
      if (!cl) return;
      var centroid = clusterCentroids[k];
      var sp = w2s(centroid.x, centroid.y);
      var rgb = hexRgb(cl.c);
      var radius = 500 * cam.z;
      var glow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, radius);
      var isActive = activeCluster === k;
      glow.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (isActive ? 0.06 : 0.02) + ')');
      glow.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
      ctx.beginPath(); ctx.arc(sp.x, sp.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = glow; ctx.fill();
    });

    var anyHL = hlSet.size > 0;

    // Trait cross-cluster lines
    if (traitLines.length > 0) {
      traitLines.forEach(function (tl) {
        var p1 = w2s(tl.x1, tl.y1), p2 = w2s(tl.x2, tl.y2);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = 'rgba(0,30,80,0.08)';
        ctx.lineWidth = 0.8 * cam.z;
        ctx.setLineDash([4 * cam.z, 6 * cam.z]); ctx.stroke(); ctx.setLineDash([]);
      });
    }

    // ── Bezier curved edges ──
    ED.forEach(function (e) {
      var s = lk[e[0]], t = lk[e[1]];
      if (!s || !t || !s.wx || !t.wx) return;
      var p1 = w2s(s.wx, s.wy), p2 = w2s(t.wx, t.wy);
      // Cull offscreen
      if (p1.x < -200 && p2.x < -200) return;
      if (p1.x > W + 200 && p2.x > W + 200) return;
      var ek = e[0] + '>' + e[1], isHL = hlEdges.has(ek);
      var cl = CL[s.cluster] || CL['direct'];
      var rgb = hexRgb(cl.c);
      var isConn = e[2] === 'conn';
      var curve = edgeCurves[ek];
      var cp = curve ? w2s(curve.cx, curve.cy) : { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
      if (isConn) ctx.setLineDash([4 * cam.z, 4 * cam.z]);

      if (anyHL) {
        if (isHL) {
          // Glow effect for highlighted edges
          ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.15)';
          ctx.lineWidth = 8 * cam.z; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
          ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.8)';
          ctx.lineWidth = 2.5 * cam.z; ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(0,30,80,0.06)';
          ctx.lineWidth = 0.8 * cam.z; ctx.stroke();
        }
      } else {
        var baseAlpha = isConn ? 0.35 : 0.55;
        ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + baseAlpha + ')';
        ctx.lineWidth = (isConn ? 1.5 : 2.5) * cam.z; ctx.stroke();
      }
      if (isConn) ctx.setLineDash([]);
    });

    // ── Particles following bezier curves ──
    particles.forEach(function (pt) {
      pt.p += pt.speed; if (pt.p > 1) pt.p -= 1;
      // Follow the bezier curve
      var bp = bezierPoint(pt.sx, pt.sy, pt.curveCx, pt.curveCy, pt.tx, pt.ty, pt.p);
      var sp = w2s(bp.x, bp.y);
      if (sp.x < -40 || sp.x > W + 40 || sp.y < -40 || sp.y > H + 40) return;
      var cl = CL[pt.cluster] || CL['direct'];
      var rgb = hexRgb(cl.c);
      var ek = pt.edge[0] + '>' + pt.edge[1], isHL = hlEdges.has(ek);
      var alpha = anyHL ? (isHL ? 0.9 : 0.05) : 0.4;
      var sz = anyHL ? (isHL ? 3 : 0.8) : 1.5;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, sz * cam.z, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
      ctx.fill();
      // Particle glow when highlighted
      if (isHL && anyHL) {
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 6 * cam.z, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.12)';
        ctx.fill();
      }
    });

    // ── Nodes — clean flat circles ──
    ND.forEach(function (n) {
      if (!n.wx) return;
      var sp = w2s(n.wx, n.wy);
      if (sp.x < -120 || sp.x > W + 120 || sp.y < -120 || sp.y > H + 120) return;
      var r = nodeRadius(n) * cam.z;
      var cl = CL[n.cluster] || CL['direct'];
      var rgb = hexRgb(cl.c);
      var acObj = AC[n.status] || AC['system'];
      var acCol = acObj.c;
      var isHL = hlSet.has(n.id);
      var dim = anyHL && !isHL;
      var isHover = hoverNode && hoverNode.id === n.id;
      var isSel = selNode && selNode.id === n.id;

      // 24/7 pulse animation
      var pulseScale = 1;
      if (n.is247 && !dim) {
        pulseScale = 1 + 0.03 * Math.sin(elapsed * 2 + simpleHash(n.id) * 0.1);
      }
      var pr = r * pulseScale;

      // Soft shadow behind node (light theme)
      if (!dim) {
        var shR = pr * 1.6;
        var shAlpha = isHL ? 0.12 : (n.tier === 0 ? 0.08 : 0.04);
        var grd = ctx.createRadialGradient(sp.x, sp.y + pr * 0.15, pr * 0.3, sp.x, sp.y + pr * 0.15, shR);
        grd.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + shAlpha + ')');
        grd.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
        ctx.beginPath(); ctx.arc(sp.x, sp.y + pr * 0.15, shR, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
      }

      // White base + colored fill
      var fillAlpha = dim ? 0.2 : (isHL || isHover ? 1 : 0.88);
      // White undercoat for clean look
      if (!dim) {
        ctx.beginPath(); drawShape(ctx, sp.x, sp.y, pr + 1.5 * cam.z, nodeShape(n));
        ctx.fillStyle = '#fff'; ctx.fill();
      }
      ctx.beginPath(); drawShape(ctx, sp.x, sp.y, pr, nodeShape(n));
      ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + fillAlpha + ')';
      ctx.fill();

      // Border ring — colored by accessibility, with dash pattern
      if (!dim && pr > 3) {
        var ar = hexRgb(acCol);
        var ringAlpha = isHL ? 0.95 : 0.75;
        var ringWidth = n.tier === 0 ? 3.5 : 2.5;
        // Restricted = dashed, Unknown = dotted
        if (n.status === 'restricted') {
          ctx.setLineDash([6 * cam.z, 4 * cam.z]);
        } else if (n.status === 'unknown') {
          ctx.setLineDash([3 * cam.z, 3 * cam.z]);
        }
        ctx.beginPath(); drawShape(ctx, sp.x, sp.y, pr, nodeShape(n));
        ctx.strokeStyle = 'rgba(' + ar.r + ',' + ar.g + ',' + ar.b + ',' + ringAlpha + ')';
        ctx.lineWidth = ringWidth * cam.z; ctx.stroke();
        ctx.setLineDash([]);
      }

      // Outer ring for hub nodes (tier 0)
      if (!dim && n.tier === 0 && pr > 5) {
        ctx.beginPath(); drawShape(ctx, sp.x, sp.y, pr + 4 * cam.z, nodeShape(n));
        ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (isHL ? 0.4 : 0.2) + ')';
        ctx.lineWidth = 1.5 * cam.z; ctx.stroke();
      }

      // Selected pulse ring
      if (isSel) {
        var pulse = 0.5 + 0.5 * Math.sin(now * 0.004);
        ctx.beginPath(); drawShape(ctx, sp.x, sp.y, pr + 6 * cam.z + pulse * 4 * cam.z, nodeShape(n));
        ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (0.4 - pulse * 0.3) + ')';
        ctx.lineWidth = 2 * cam.z; ctx.stroke();
      }

      // Hover ring
      if (isHover && !isSel) {
        ctx.beginPath(); drawShape(ctx, sp.x, sp.y, pr + 3 * cam.z, nodeShape(n));
        ctx.strokeStyle = 'rgba(0,30,80,0.3)';
        ctx.lineWidth = 1.5 * cam.z; ctx.stroke();
      }

      if (dim) return;

      // ── Property badge dots (above node) ──
      if (pr > 8) {
        var svc = n.svc;
        var bdgs = [];
        if (n.is247)                          bdgs.push({ c: '#16a34a', ic: 'clock' });   // green  — 24/7
        if (svc && svc.transport)             bdgs.push({ c: '#2563eb', ic: 'arrow' });   // blue   — transport
        if (svc && svc.referralRequired)      bdgs.push({ c: '#ea580c', ic: 'lock' });    // orange — referral
        if (svc && svc.pilotProgram)          bdgs.push({ c: '#dc2626', ic: 'warn' });    // red    — pilot
        if (bdgs.length) {
          var bR = Math.max(4, Math.min(7, pr * 0.18));
          var bGap = bR * 2.8;
          var bX0 = sp.x - (bdgs.length - 1) * bGap / 2;
          var bY = sp.y - pr - bR - 3 * cam.z;
          for (var bi = 0; bi < bdgs.length; bi++) {
            var bx = bX0 + bi * bGap;
            // White outline
            ctx.beginPath(); ctx.arc(bx, bY, bR + 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fff'; ctx.fill();
            // Colored circle
            ctx.beginPath(); ctx.arc(bx, bY, bR, 0, Math.PI * 2);
            ctx.fillStyle = bdgs[bi].c; ctx.fill();
            // Tiny white icon inside
            drawBadgeIcon(ctx, bx, bY, bR * 0.5, bdgs[bi].ic);
          }
        }
      }

      // Labels — tier-based progressive LOD:
      //   tier 0 (hubs): always visible with large font
      //   tier 1 (operational): visible at medium zoom
      //   tier 2 (leaves): visible only at high zoom or when highlighted
      var la;
      if (isHL || isHover || isSel) la = 1;
      else if (n.tier === 0) la = cam.z > 0.12 ? 1 : 0.7;
      else if (n.tier === 1) la = cam.z > 0.32 ? 0.9 : cam.z > 0.22 ? 0.4 : 0;
      else la = cam.z > 0.45 ? 0.8 : cam.z > 0.32 ? 0.3 : 0;
      if (la <= 0) return;

      var fs;
      if (n.tier === 0) fs = Math.max(15, 26 * cam.z);
      else if (n.tier === 1) fs = Math.max(12, 18 * cam.z);
      else fs = Math.max(10, 14 * cam.z);

      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = (n.tier === 0 ? '700 ' : '500 ') + fs + 'px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

      // Label background pill for readability
      var labelY = sp.y + pr + 6 * cam.z;
      var labelW = ctx.measureText(n.label).width;
      if (la > 0.2 && labelW > 0) {
        var lpx = 8, lpy = 3;
        ctx.fillStyle = 'rgba(255,255,255,' + (la * 0.88) + ')';
        ctx.beginPath();
        roundRect(ctx, sp.x - labelW / 2 - lpx, labelY - lpy, labelW + lpx * 2, fs + lpy * 2, 5);
        ctx.fill();
        // Subtle pill border
        ctx.strokeStyle = 'rgba(0,30,80,' + (la * 0.1) + ')';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        roundRect(ctx, sp.x - labelW / 2 - lpx, labelY - lpy, labelW + lpx * 2, fs + lpy * 2, 5);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(20,25,50,' + la + ')';
      ctx.fillText(n.label, sp.x, labelY);

      // Sub-label for 24/7 or downstream count
      var showSub = (isHL || isHover || (n.tier === 0 && cam.z > 0.3) || cam.z > 0.5) && (n.is247 || n.dc > 0);
      if (showSub) {
        var sub = n.is247 ? '24/7' : (n.dc > 0 ? n.dc + ' downstream' : '');
        if (sub) {
          var subFs = Math.max(9, 12 * cam.z);
          ctx.font = '500 ' + subFs + 'px monospace';
          ctx.fillStyle = 'rgba(80,90,120,' + (la * 0.6) + ')';
          ctx.fillText(sub, sp.x, labelY + fs + 4);
        }
      }
    });

    // ── Hover tooltip — rich info card ──
    if (hoverNode && !selNode) {
      var hsp = w2s(hoverNode.wx, hoverNode.wy);
      var hr = nodeRadius(hoverNode) * cam.z;
      var hcl = CL[hoverNode.cluster] || CL['direct'];
      var hrgb = hexRgb(hcl.c);
      var hac = AC[hoverNode.status] || AC['system'];

      // Build tooltip lines
      var ttName = hoverNode.full;
      var ttLine2 = hoverNode.hours || '';
      var ttLine3 = hac.l;
      if (hoverNode.phone) ttLine3 += '  \u00b7  ' + hoverNode.phone;

      ctx.font = '700 15px Inter, -apple-system, sans-serif';
      var nameW = ctx.measureText(ttName).width;
      ctx.font = '400 13px Inter, -apple-system, sans-serif';
      var line2W = ctx.measureText(ttLine2).width;
      var line3W = ctx.measureText(ttLine3).width;
      var ttW = Math.max(nameW, line2W, line3W) + 32;
      var ttH = 72;
      var ttX = hsp.x - ttW / 2;
      var ttY = hsp.y - hr - ttH - 12;

      // Keep on screen
      if (ttX < 8) ttX = 8;
      if (ttX + ttW > W - 8) ttX = W - 8 - ttW;
      if (ttY < 8) ttY = hsp.y + hr + 12;

      // Shadow
      ctx.shadowColor = 'rgba(0,20,60,0.12)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
      // Background
      ctx.fillStyle = 'rgba(255,255,255,0.97)';
      ctx.beginPath();
      roundRect(ctx, ttX, ttY, ttW, ttH, 10);
      ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      // Accent left bar
      ctx.fillStyle = hcl.c;
      ctx.beginPath();
      roundRect(ctx, ttX, ttY, 4, ttH, 2);
      ctx.fill();
      // Border
      ctx.strokeStyle = 'rgba(0,30,80,0.1)';
      ctx.lineWidth = 1; ctx.beginPath();
      roundRect(ctx, ttX, ttY, ttW, ttH, 10);
      ctx.stroke();

      // Text
      var ttCx = ttX + 18;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = '700 15px Inter, -apple-system, sans-serif';
      ctx.fillStyle = '#1a1e32';
      ctx.fillText(ttName, ttCx, ttY + 12);
      ctx.font = '400 13px Inter, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(40,50,80,0.6)';
      ctx.fillText(ttLine2, ttCx, ttY + 32);
      ctx.fillStyle = 'rgba(' + hrgb.r + ',' + hrgb.g + ',' + hrgb.b + ',0.85)';
      ctx.fillText(ttLine3, ttCx, ttY + 50);
    }

    rafId = requestAnimationFrame(draw);
  }

  // Rounded rect helper
  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }

  // ═══════════════════════════════════
  //  INTERACTION
  // ═══════════════════════════════════

  function attachEvents() {
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('click', onClick);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Touch pinch-to-zoom
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    // Search
    var searchInput = containerEl.querySelector('#cg-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var q = this.value;
        clr();
        if (!q || q.length < 2) return;
        var lq = q.toLowerCase();
        var hits = ND.filter(function (n) {
          return n.full.toLowerCase().indexOf(lq) >= 0 ||
                 n.label.toLowerCase().indexOf(lq) >= 0 ||
                 (n.desc || '').toLowerCase().indexOf(lq) >= 0;
        });
        if (hits.length) {
          hits.forEach(function (h) { hlSet.add(h.id); });
          if (hits.length === 1) {
            selNode = hits[0]; highlightTree(hits[0]); showDetail(hits[0]);
            targetCam.x = hits[0].wx - 150 / cam.z; targetCam.y = hits[0].wy; targetCam.z = 0.5;
          } else if (hits.length <= 8) {
            var ax = 0, ay = 0;
            hits.forEach(function (h) { ax += h.wx; ay += h.wy; });
            targetCam.x = ax / hits.length; targetCam.y = ay / hits.length;
          }
        }
      });
    }

    // Detail close button
    detailEl.querySelector('.dp-close').addEventListener('click', clr);
  }

  function onWheel(e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left, my = e.clientY - rect.top;
    var f = e.deltaY > 0 ? 0.9 : 1.1;
    var nz = Math.min(Math.max(targetCam.z * f, 0.12), 2.5);
    var wx = (mx - W / 2) / cam.z + cam.x;
    var wy = (my - H / 2) / cam.z + cam.y;
    targetCam.z = nz;
    targetCam.x = wx - (mx - W / 2) / nz;
    targetCam.y = wy - (my - H / 2) / nz;
  }

  function onPointerDown(e) {
    isPanning = true;
    panSX = e.clientX; panSY = e.clientY;
    panCX = targetCam.x; panCY = targetCam.y;
    canvas.style.cursor = 'grabbing';
  }

  function onPointerMove(e) {
    if (isPanning) {
      targetCam.x = panCX - (e.clientX - panSX) / cam.z;
      targetCam.y = panCY - (e.clientY - panSY) / cam.z;
      return;
    }
    var rect = canvas.getBoundingClientRect();
    var n = findNodeAt(e.clientX - rect.left, e.clientY - rect.top);
    if (n !== hoverNode) {
      hoverNode = n;
      canvas.style.cursor = n ? 'pointer' : 'default';
      if (!selNode && !activeFilter) {
        if (n) { highlightTree(n); }
        else { hlSet.clear(); hlEdges.clear(); }
      }
    }
  }

  function onPointerUp() {
    isPanning = false;
    canvas.style.cursor = hoverNode ? 'pointer' : 'default';
  }

  function onClick(e) {
    if (Math.abs(e.clientX - panSX) > 5 || Math.abs(e.clientY - panSY) > 5) return;
    var rect = canvas.getBoundingClientRect();
    var n = findNodeAt(e.clientX - rect.left, e.clientY - rect.top);
    if (n) {
      if (selNode === n) { clr(); return; }
      clearFilterState();
      selNode = n; highlightTree(n); showDetail(n);
      targetCam.x = n.wx - 150 / cam.z; targetCam.y = n.wy; targetCam.z = Math.max(cam.z, 0.5);
    } else {
      clr();
    }
  }

  // ── Touch handlers for pinch-to-zoom ──

  function getTouchDist(t1, t2) {
    var dx = t1.clientX - t2.clientX;
    var dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getTouchCenter(t1, t2) {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
  }

  function onTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      isPanning = false;
      lastPinchDist = getTouchDist(e.touches[0], e.touches[1]);
      var center = getTouchCenter(e.touches[0], e.touches[1]);
      panSX = center.x; panSY = center.y;
      panCX = targetCam.x; panCY = targetCam.y;
    }
  }

  function onTouchMove(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      var dist = getTouchDist(e.touches[0], e.touches[1]);
      var center = getTouchCenter(e.touches[0], e.touches[1]);
      var rect = canvas.getBoundingClientRect();
      var mx = center.x - rect.left, my = center.y - rect.top;

      // Zoom
      var scale = dist / lastPinchDist;
      var nz = Math.min(Math.max(targetCam.z * scale, 0.12), 2.5);
      var wx = (mx - W / 2) / cam.z + cam.x;
      var wy = (my - H / 2) / cam.z + cam.y;
      targetCam.z = nz;
      targetCam.x = wx - (mx - W / 2) / nz;
      targetCam.y = wy - (my - H / 2) / nz;

      // Pan
      targetCam.x -= (center.x - panSX) / cam.z;
      targetCam.y -= (center.y - panSY) / cam.z;

      lastPinchDist = dist;
      panSX = center.x; panSY = center.y;
    }
  }

  function onTouchEnd(e) {
    lastPinchDist = 0;
  }

  // ═══════════════════════════════════
  //  CLEAR / RESET
  // ═══════════════════════════════════

  function clr() {
    selNode = null; hlSet.clear(); hlEdges.clear(); traitLines = [];
    activeFilter = null; activeCluster = null;
    if (detailEl) detailEl.classList.remove('show');
    if (legendEl) legendEl.classList.remove('pushed');
    if (filtersEl) filtersEl.querySelectorAll('.fb').forEach(function (b) { b.classList.remove('on'); });
    if (navEl) navEl.querySelectorAll('.nb').forEach(function (b) { b.classList.remove('on'); b.style.background = ''; });
  }

  function clearFilterState() {
    activeFilter = null; activeCluster = null; traitLines = [];
    if (filtersEl) filtersEl.querySelectorAll('.fb').forEach(function (b) { b.classList.remove('on'); });
    if (navEl) navEl.querySelectorAll('.nb').forEach(function (b) { b.classList.remove('on'); b.style.background = ''; });
  }

  function resetAll() {
    clr();
    var si = containerEl.querySelector('#cg-search-input');
    if (si) si.value = '';
    targetCam.x = cx; targetCam.y = cy; targetCam.z = 0.4;
  }

  // ═══════════════════════════════════
  //  SELECT BY ID (for detail panel navigation)
  // ═══════════════════════════════════

  function selById(id) {
    var n = lk[id]; if (!n) return;
    clearFilterState();
    selNode = n; highlightTree(n); showDetail(n);
    targetCam.x = n.wx - 150 / cam.z; targetCam.y = n.wy; targetCam.z = Math.max(cam.z, 0.5);
  }

  // ═══════════════════════════════════
  //  DETAIL PANEL
  // ═══════════════════════════════════

  function showDetail(n) {
    var cl = CL[n.cluster] || CL['direct'];
    var ac = AC[n.status] || AC['system'];
    var parentLabel = n.parent && lk[n.parent] ? lk[n.parent].label : null;
    var kids = cMap[n.id] || [];
    var svc = n.svc;

    var h = '<div class="dp-head"><div class="dp-bar" style="background:' + cl.c + '"></div><div><div class="dp-name">' + esc(n.full) + '</div><div class="dp-via">' + (parentLabel ? '\u21b3 via ' + esc(parentLabel) : esc(cl.label) + ' entry point') + '</div></div></div>';

    // Badges
    h += '<div class="dp-badges"><span class="bdg" style="background:' + ac.c + '15;color:' + ac.c + ';border:1px solid ' + ac.c + '30">' + ac.l + '</span>';
    if (n.dc > 0) h += '<span class="bdg" style="background:' + cl.c + '15;color:' + cl.c + ';border:1px solid ' + cl.c + '30">' + n.dc + ' downstream</span>';
    h += '</div>';

    // Description
    if (n.desc) h += '<div class="dp-desc">' + esc(n.desc) + '</div>';

    // Key Facts
    var facts = '';
    if (n.hours) facts += '<div class="fa"><div class="fi" style="background:rgba(52,217,192,0.1);color:#34d9c0">' + icon('clock', 16) + '</div><div class="ft"><b>Hours:</b> ' + esc(n.hours) + '</div></div>';
    if (n.phone) {
      var tel = getPhoneTel(n.phone);
      facts += '<div class="fa"><div class="fi" style="background:rgba(78,164,255,0.1);color:#4ea4ff">' + icon('phone', 16) + '</div><div class="ft"><b>Phone:</b> <a href="tel:' + tel + '" style="color:#4ea4ff;text-decoration:none">' + esc(n.phone) + '</a></div></div>';
    }
    if (n.transport) facts += '<div class="fa"><div class="fi" style="background:rgba(240,152,72,0.1);color:#f09848">' + (n.transport === 'Yes' ? icon('truck', 16) : icon('x', 16)) + '</div><div class="ft"><b>Transport:</b> ' + esc(n.transport) + '</div></div>';
    if (n.vans) facts += '<div class="fa"><div class="fi" style="background:rgba(245,197,66,0.1);color:#f5c542">' + icon('truck', 16) + '</div><div class="ft"><b>Vans:</b> ' + esc(n.vans) + '</div></div>';
    if (n.note) facts += '<div class="fa"><div class="fi" style="background:rgba(240,104,136,0.1);color:#f06888">' + icon('alertTri', 16) + '</div><div class="ft"><b>' + esc(n.note) + '</b></div></div>';
    if (svc && svc.address) facts += '<div class="fa"><div class="fi" style="background:rgba(107,130,170,0.1);color:#6b82aa">' + icon('pin', 16) + '</div><div class="ft"><b>Address:</b> ' + esc(svc.address) + '</div></div>';
    if (facts) h += '<div class="dp-section"><div class="dp-stitle">Key Facts</div><div class="dp-facts">' + facts + '</div></div>';

    // Shared Traits
    var nodeTraits = [];
    Object.keys(traits).forEach(function (t) {
      if (traits[t].some(function (x) { return x.id === n.id; })) nodeTraits.push(t);
    });
    if (nodeTraits.length) {
      h += '<div class="dp-section"><div class="dp-stitle">Shared Traits</div>';
      nodeTraits.forEach(function (t) {
        var count = traits[t].length;
        var others = traits[t].filter(function (x) { return x.id !== n.id && x.cluster !== n.cluster; }).length;
        h += '<div class="dp-trait" data-trait="' + esc(t) + '"><b>' + esc(t) + '</b> \u2014 ' + count + ' services' + (others > 0 ? ' \u00b7 ' + others + ' cross-cluster' : '') + ' \u2192</div>';
      });
      h += '</div>';
    }

    // Path from entry
    var path = [];
    function anc(nd) { path.unshift(nd); if (nd.parent && lk[nd.parent]) anc(lk[nd.parent]); }
    anc(n);
    h += '<div class="dp-section"><div class="dp-stitle">Path from Entry</div><div class="dp-path">';
    path.forEach(function (p, i) {
      var cur = p.id === n.id;
      h += '<span class="pchip" data-id="' + p.id + '" style="background:' + (cur ? cl.c + '25' : 'rgba(255,255,255,0.05)') + ';color:' + (cur ? cl.c : 'rgba(255,255,255,0.5)') + ';border:1px solid ' + (cur ? cl.c + '40' : 'rgba(255,255,255,0.08)') + '">' + esc(p.label) + '</span>';
      if (i < path.length - 1) h += '<span class="parr">\u2192</span>';
    });
    h += '</div></div>';

    // Downstream services
    if (kids.length) {
      h += '<div class="dp-section"><div class="dp-stitle">Downstream Services (' + kids.length + ')</div><div class="dp-kids">';
      kids.forEach(function (kid) {
        var k = lk[kid];
        if (!k) return;
        var kac = AC[k.status] || AC['system'];
        var sub = k.is247 ? '24/7' : (k.desc || kac.l);
        h += '<div class="kid-row" data-id="' + kid + '"><div class="kid-dot" style="background:' + kac.c + '"></div><div class="kid-info"><div class="kid-name">' + esc(k.label) + '</div><div class="kid-sub">' + esc(sub) + '</div></div><div class="kid-arrow">\u2192</div></div>';
      });
      h += '</div></div>';
    }

    // Sibling services
    if (n.parent && cMap[n.parent]) {
      var siblings = cMap[n.parent].filter(function (s) { return s !== n.id; });
      if (siblings.length) {
        h += '<div class="dp-section"><div class="dp-stitle">Sibling Services (' + siblings.length + ')</div><div class="dp-kids">';
        siblings.forEach(function (sid) {
          var s = lk[sid];
          if (!s) return;
          var sac = AC[s.status] || AC['system'];
          h += '<div class="kid-row" data-id="' + sid + '"><div class="kid-dot" style="background:' + sac.c + '"></div><div class="kid-info"><div class="kid-name">' + esc(s.label) + '</div><div class="kid-sub">' + esc(s.is247 ? '24/7' : (s.desc || sac.l)) + '</div></div><div class="kid-arrow">\u2192</div></div>';
        });
        h += '</div></div>';
      }
    }

    detailEl.querySelector('#dpContent').innerHTML = h;
    detailEl.classList.add('show');
    if (legendEl) legendEl.classList.add('pushed');

    // Attach click handlers within detail panel
    detailEl.querySelectorAll('.pchip[data-id]').forEach(function (chip) {
      chip.addEventListener('click', function () { selById(chip.dataset.id); });
    });
    detailEl.querySelectorAll('.kid-row[data-id]').forEach(function (row) {
      row.addEventListener('click', function () { selById(row.dataset.id); });
    });
    detailEl.querySelectorAll('.dp-trait[data-trait]').forEach(function (tr) {
      tr.addEventListener('click', function () { applyFilter(tr.dataset.trait); });
    });
  }

  // ═══════════════════════════════════
  //  FILTER SYSTEM
  // ═══════════════════════════════════

  function applyFilter(traitName) {
    selNode = null; hlEdges.clear();
    if (detailEl) detailEl.classList.remove('show');
    if (legendEl) legendEl.classList.remove('pushed');

    if (activeFilter === traitName) {
      activeFilter = null; hlSet.clear(); traitLines = [];
      if (filtersEl) filtersEl.querySelectorAll('.fb').forEach(function (b) { b.classList.remove('on'); });
      return;
    }

    activeFilter = traitName;
    if (filtersEl) {
      filtersEl.querySelectorAll('.fb').forEach(function (b) { b.classList.remove('on'); });
      filtersEl.querySelectorAll('.fb').forEach(function (b) { if (b.dataset.trait === traitName) b.classList.add('on'); });
    }

    hlSet.clear(); traitLines = [];
    var nodes = traits[traitName] || [];
    nodes.forEach(function (n) { hlSet.add(n.id); });
    ED.forEach(function (e) { if (hlSet.has(e[0]) && hlSet.has(e[1])) hlEdges.add(e[0] + '>' + e[1]); });
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        if (nodes[i].cluster !== nodes[j].cluster) {
          traitLines.push({ x1: nodes[i].wx, y1: nodes[i].wy, x2: nodes[j].wx, y2: nodes[j].wy });
        }
      }
    }
  }

  // ═══════════════════════════════════
  //  CLUSTER NAV
  // ═══════════════════════════════════

  function onClusterClick(k, btn) {
    clr();
    if (activeCluster === k) {
      activeCluster = null;
      return;
    }
    activeCluster = k;
    if (navEl) {
      navEl.querySelectorAll('.nb').forEach(function (b) { b.classList.remove('on'); b.style.background = ''; });
      btn.classList.add('on'); btn.style.background = CL[k].c + '18';
    }
    ND.filter(function (n) { return n.cluster === k; }).forEach(function (n) { hlSet.add(n.id); });
    ED.forEach(function (e) { var s = lk[e[0]]; if (s && s.cluster === k) hlEdges.add(e[0] + '>' + e[1]); });
    var cn = ND.filter(function (n) { return n.cluster === k; });
    var ax = 0, ay = 0;
    cn.forEach(function (n) { ax += n.wx; ay += n.wy; });
    targetCam.x = ax / cn.length; targetCam.y = ay / cn.length; targetCam.z = 0.5;
  }

  // ═══════════════════════════════════
  //  TIME CHANGE
  // ═══════════════════════════════════

  function onTimeChange() {
    ND.forEach(function (n) {
      if (n.svc) {
        n.hours = formatHours(n.svc);
        n.is247 = n.svc.hours && n.svc.hours.type === '24/7';
      }
    });
  }

  // ═══════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
