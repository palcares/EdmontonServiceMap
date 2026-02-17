/**
 * connections.js — Redesigned Connections Tab
 *
 * Three views:
 * 1. Ecosystem Map — Interactive flow diagram showing entry points → services → destinations
 * 2. Organizations — Hierarchy tree grouped by operator
 * 3. Service Directory — Searchable/filterable enriched list
 */

// ── Referral chains for the ecosystem flow diagram ──
var REFERRAL_CHAINS = [
  {
    label: '911 \u2192 Emergency Response',
    steps: [
      { id: null, name: '911', type: 'entry' },
      { id: 'eps-patrol', name: 'EPS Patrol', type: 'service' },
      { id: 'pact', name: 'PACT', type: 'service', note: 'Mental health' },
      { id: 'uhei', name: 'UHEI', type: 'service', note: 'Encampments' },
      { id: 'cdt', name: 'CDT', type: 'service', note: 'Crisis diversion' }
    ]
  },
  {
    label: '211+3 \u2192 Crisis Diversion',
    steps: [
      { id: null, name: '211 press 3', type: 'entry' },
      { id: 'cdt', name: 'CDT', type: 'service' },
      { id: 'hope-mission-cdt', name: 'Hope Mission Vans', type: 'child', note: '5\u20137 vans' },
      { id: 'boyle-street-cdt', name: 'Boyle Street Vans', type: 'child', note: '6 vans' }
    ]
  },
  {
    label: 'AHS \u2192 Mental Health & Medical',
    steps: [
      { id: null, name: 'AHS', type: 'entry' },
      { id: 'access-247', name: 'Access 24/7', type: 'service' },
      { id: 'pact', name: 'PACT', type: 'service', note: 'Police + therapist' },
      { id: 'crems', name: 'CREMS', type: 'service', note: 'Paramedic + therapist' }
    ]
  },
  {
    label: '311 \u2192 Peace Officers & Outreach',
    steps: [
      { id: null, name: '311', type: 'entry' },
      { id: 'peace-officers-transit', name: 'Transit POs', type: 'service' },
      { id: 'cott', name: 'COTT', type: 'service', note: 'Transit outreach' },
      { id: 'encampment-low-risk', name: 'Encampment Response', type: 'service' }
    ]
  },
  {
    label: 'BIA \u2192 Business Area Patrols',
    steps: [
      { id: null, name: 'BIA', type: 'entry' },
      { id: 'bia-core-patrol', name: 'DBA Core Patrol', type: 'service', note: '24/7' },
      { id: 'bia-old-strathcona', name: 'Old Strathcona', type: 'service', note: '9am\u201312am' },
      { id: 'bia-stoney-plain', name: 'Stoney Plain Rd', type: 'child', note: 'Pilot' }
    ]
  },
  {
    label: 'DATS \u2192 Accessible Transit',
    steps: [
      { id: null, name: 'DATS', type: 'entry' },
      { id: 'dats', name: 'DATS', type: 'service', note: 'Pre-booked' }
    ]
  }
];

// ── View tabs ──
var CONN_VIEWS = [
  { id: 'graph', label: 'Network Graph', icon: 'network' },
  { id: 'ecosystem', label: 'Ecosystem Map', icon: 'gitMerge' },
  { id: 'organizations', label: 'Organizations', icon: 'users' },
  { id: 'directory', label: 'Service Directory', icon: 'layers' }
];

var currentConnView = 'graph';
var currentDirCategory = 'all';
var currentDirAccess = 'all';

function initConnections() {
  var container = document.getElementById('connections-container');
  container.innerHTML = buildConnectionsPage();
  attachConnectionsHandlers(container);

  // Toggle graph-mode class on conn-page AND tab panel (for layout)
  var connPage = container.querySelector('.conn-page');
  if (connPage) connPage.classList.toggle('conn-graph-mode', currentConnView === 'graph');
  var tabPanel = document.getElementById('tab-connections');
  if (tabPanel) tabPanel.classList.toggle('conn-graph-active', currentConnView === 'graph');

  // Initialize graph if it's the default view
  if (currentConnView === 'graph') {
    var graphRoot = container.querySelector('.conn-graph-container');
    if (graphRoot) initConnectionsGraph(graphRoot);
  }

  // Time change updates
  document.addEventListener('timechange', function() {
    // Update all open/closed badges (non-graph views)
    container.querySelectorAll('[data-svc-id]').forEach(function(el) {
      var svc = getServiceById(el.dataset.svcId);
      if (!svc) return;
      var badge = el.querySelector('.conn-status-badge');
      if (badge) {
        var open = isServiceOpen(svc);
        badge.className = 'conn-status-badge ' + (open ? 'badge-open' : 'badge-closed');
        badge.textContent = open ? 'Open' : 'Closed';
      }
    });
  });
}

function attachConnectionsHandlers(container) {
  // View tab switching
  container.querySelectorAll('.conn-view-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      // Destroy graph if switching away
      if (currentConnView === 'graph' && tab.dataset.view !== 'graph') {
        destroyConnectionsGraph();
      }

      currentConnView = tab.dataset.view;
      container.querySelectorAll('.conn-view-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');

      // Toggle graph-mode layout
      var connPage = container.querySelector('.conn-page');
      if (connPage) connPage.classList.toggle('conn-graph-mode', currentConnView === 'graph');
      var tabPanel = document.getElementById('tab-connections');
      if (tabPanel) tabPanel.classList.toggle('conn-graph-active', currentConnView === 'graph');

      var viewContainer = container.querySelector('.conn-view-container');
      viewContainer.innerHTML = buildCurrentView();
      attachViewHandlers(container);

      // Initialize graph if switching to it
      if (currentConnView === 'graph') {
        var graphRoot = viewContainer.querySelector('.conn-graph-container');
        if (graphRoot) initConnectionsGraph(graphRoot);
      }
    });
  });

  attachViewHandlers(container);
}

function attachViewHandlers(container) {
  // Ecosystem node click → highlight connections + show detail panel
  container.querySelectorAll('.eco-flow-node[data-svc-id]').forEach(function(node) {
    node.addEventListener('click', function() {
      var isActive = node.classList.contains('eco-node-active');
      // Clear all highlights
      container.querySelectorAll('.eco-flow-node').forEach(function(n) { n.classList.remove('eco-node-active', 'eco-node-connected'); });
      // Remove any existing detail panel
      var existing = container.querySelector('.eco-detail-panel');
      if (existing) existing.remove();

      if (!isActive) {
        node.classList.add('eco-node-active');
        var svc = getServiceById(node.dataset.svcId);
        if (svc) {
          // Highlight connected nodes
          var relatedIds = (svc.connections || []).concat(svc.childServices || []);
          if (svc.parentService) relatedIds.push(svc.parentService);
          relatedIds.forEach(function(rid) {
            container.querySelectorAll('.eco-flow-node[data-svc-id="' + rid + '"]').forEach(function(rn) {
              rn.classList.add('eco-node-connected');
            });
          });

          // Build and insert detail panel below the flow chain
          var panel = buildEcoDetailPanel(svc);
          var chain = node.closest('.eco-flow-chain');
          if (chain) {
            chain.insertAdjacentHTML('afterend', panel);
            // Scroll panel into view
            var panelEl = container.querySelector('.eco-detail-panel');
            if (panelEl) panelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            // Attach phone link handlers in panel (they're just <a> tags, work by default)
            // Attach "related service" click handlers in the detail panel
            container.querySelectorAll('.eco-detail-related-link').forEach(function(link) {
              link.addEventListener('click', function(e) {
                e.preventDefault();
                var targetId = link.dataset.svcId;
                var targetNode = container.querySelector('.eco-flow-node[data-svc-id="' + targetId + '"]');
                if (targetNode) {
                  targetNode.click();
                  targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              });
            });
          }
        }
      }
    });
  });

  // Org card expand
  container.querySelectorAll('.org-program[data-svc-id]').forEach(function(prog) {
    prog.addEventListener('click', function(e) {
      if (e.target.closest('a')) return;
      prog.classList.toggle('expanded');
    });
  });

  // Conn card expand (directory)
  container.querySelectorAll('.conn-card[data-id]').forEach(function(card) {
    card.addEventListener('click', function(e) {
      if (e.target.closest('a')) return;
      card.classList.toggle('expanded');
    });
  });

  // Directory filter chips
  container.querySelectorAll('.dir-cat-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      currentDirCategory = chip.dataset.cat;
      container.querySelectorAll('.dir-cat-chip').forEach(function(c) { c.classList.remove('active'); });
      chip.classList.add('active');
      var viewContainer = container.querySelector('.conn-view-container');
      viewContainer.innerHTML = buildDirectoryView();
      attachViewHandlers(container);
    });
  });

  container.querySelectorAll('.dir-access-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      currentDirAccess = chip.dataset.access;
      container.querySelectorAll('.dir-access-chip').forEach(function(c) { c.classList.remove('active'); });
      chip.classList.add('active');
      var viewContainer = container.querySelector('.conn-view-container');
      viewContainer.innerHTML = buildDirectoryView();
      attachViewHandlers(container);
    });
  });
}

function buildConnectionsPage() {
  return '<div class="conn-page">' +
    '<h2>Edmonton Crisis Services</h2>' +
    '<p class="conn-subtitle">How the service ecosystem is organized, who operates what, and how services connect.</p>' +

    // View tabs
    '<div class="conn-nav">' +
      CONN_VIEWS.map(function(v) {
        return '<button class="conn-nav-pill conn-view-tab' + (v.id === currentConnView ? ' active' : '') + '" data-view="' + v.id + '">' +
          icon(v.icon, 14) + ' ' + v.label +
        '</button>';
      }).join('') +
    '</div>' +

    // View container
    '<div class="conn-view-container">' +
      buildCurrentView() +
    '</div>' +
  '</div>';
}

function buildCurrentView() {
  if (currentConnView === 'graph') return '<div class="conn-graph-container"></div>';
  if (currentConnView === 'ecosystem') return buildEcosystemView();
  if (currentConnView === 'organizations') return buildOrganizationsView();
  if (currentConnView === 'directory') return buildDirectoryView();
  return '';
}

// ═══════════════════════════════════════
// VIEW 1: ECOSYSTEM MAP
// ═══════════════════════════════════════

function buildEcosystemView() {
  var pilotPrograms = getPilotPrograms();

  // Pilot summary banner
  var pilotBanner = '';
  if (pilotPrograms.length > 0) {
    var endingSoon = pilotPrograms.filter(function(p) {
      var days = getPilotDaysRemaining(p);
      return days !== null && days <= 90;
    });
    pilotBanner = '<div class="eco-pilot-banner">' +
      icon('alertTri', 16) +
      '<div>' +
        '<strong>' + pilotPrograms.length + ' pilot program' + (pilotPrograms.length > 1 ? 's' : '') + '</strong>' +
        (endingSoon.length > 0 ? ' \u2014 ' + endingSoon.length + ' ending within 90 days' : '') +
        '<div class="eco-pilot-list">' +
          pilotPrograms.map(function(p) {
            var days = getPilotDaysRemaining(p);
            var dateStr = p.pilotEndDate
              ? new Date(p.pilotEndDate).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
              : 'End date TBD';
            var urgency = (days !== null && days <= 60) ? ' eco-pilot-urgent' : '';
            return '<span class="eco-pilot-item' + urgency + '">' + (p.shortName || p.name) + ' \u2014 ' + dateStr + '</span>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // Legend
  var legend = '<div class="eco-legend">' +
    '<span class="eco-legend-item eco-acc-public">Public access</span>' +
    '<span class="eco-legend-item eco-acc-criteria">Specific criteria</span>' +
    '<span class="eco-legend-item eco-acc-restricted">Restricted / referral</span>' +
    '<span class="eco-legend-item eco-acc-pilot">Pilot program</span>' +
  '</div>';

  // Build flow chains
  var flowsHTML = REFERRAL_CHAINS.map(function(chain) {
    return buildEcosystemFlow(chain);
  }).join('');

  // Verification banner
  var verify = getVerificationSummary();
  var verifyHTML = '<div class="conn-verification">' +
    '<h3>' + icon('alertTri', 16) + ' Data Verification</h3>' +
    '<div class="conn-verify-bar-wrap">' +
      '<div class="conn-verify-bar">' +
        '<div class="conn-verify-fill" style="width:' + verify.pct + '%"></div>' +
      '</div>' +
      '<span class="conn-verify-count">' + verify.verified + '/' + verify.total + ' verified (' + verify.pct + '%)</span>' +
    '</div>' +
    '<p class="conn-verify-disclaimer">This is a demo with researched data. Verify with operators before operational use.</p>' +
  '</div>';

  return pilotBanner + legend +
    '<div class="eco-flows">' + flowsHTML + '</div>' +
    verifyHTML;
}

function buildEcosystemFlow(chain) {
  var stepsHTML = chain.steps.map(function(step, i) {
    var isLast = i === chain.steps.length - 1;
    var arrowHTML = !isLast ? '<span class="flow-arrow">\u2192</span>' : '';

    if (!step.id) {
      // Entry point node
      return '<div class="eco-flow-node eco-flow-entry">' +
        '<span class="flow-name">' + step.name + '</span>' +
      '</div>' + arrowHTML;
    }

    var svc = getServiceById(step.id);
    if (!svc) {
      return '<div class="eco-flow-node eco-flow-missing">' +
        '<span class="flow-name">' + step.name + '</span>' +
        (step.note ? '<span class="flow-note">' + step.note + '</span>' : '') +
      '</div>' + arrowHTML;
    }

    var open = isServiceOpen(svc);
    var accClass = 'eco-node-' + (svc.accessibility || 'unknown').replace('-', '');
    var pilotClass = svc.pilotProgram ? ' eco-node-pilot' : '';
    var badgeClass = open ? 'badge-open' : 'badge-closed';
    var badgeText = open ? 'Open' : 'Closed';

    return '<div class="eco-flow-node ' + accClass + pilotClass + '" data-svc-id="' + svc.id + '">' +
      '<span class="flow-name">' + (svc.shortName || svc.name) + '</span>' +
      '<span class="conn-status-badge ' + badgeClass + '" style="font-size:9px;padding:1px 6px">' + badgeText + '</span>' +
      (step.note ? '<span class="flow-note">' + step.note + '</span>' : '') +
      (svc.transport ? '<span class="eco-node-transport">' + icon('truck', 10) + '</span>' : '') +
    '</div>' + arrowHTML;
  }).join('');

  return '<div class="eco-flow-chain">' +
    '<div class="eco-flow-label">' + chain.label + '</div>' +
    '<div class="eco-flow-steps">' + stepsHTML + '</div>' +
  '</div>';
}

function buildEcoDetailPanel(svc) {
  var open = isServiceOpen(svc);
  var badgeClass = open ? 'badge-open' : 'badge-closed';
  var badgeText = open ? 'Open Now' : 'Closed';
  var accColor = getAccessibilityColor(svc.accessibility);
  var accLabel = getAccessibilityLabel(svc.accessibility);
  var hours = formatHours(svc);
  var serves = formatServes(svc.serves);

  // Category
  var catBadge = svc.category
    ? '<span class="popup-cat-badge ' + getCategoryClass(svc.category) + '">' + formatCategory(svc.category) + '</span>'
    : '';

  // Phone CTA
  var phoneHTML = '';
  if (svc.phone) {
    var tel = getPhoneTel(svc.phone);
    phoneHTML = '<a href="tel:' + tel + '" class="eco-detail-phone">' + icon('phone', 14) + ' Call ' + svc.phone + '</a>';
  }

  // Pilot
  var pilotHTML = '';
  if (svc.pilotProgram) {
    var daysLeft = getPilotDaysRemaining(svc);
    var endText = svc.pilotEndDate
      ? new Date(svc.pilotEndDate).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
      : 'End date TBD';
    var urgency = (daysLeft !== null && daysLeft <= 60) ? ' — <strong>' + daysLeft + ' days left</strong>' : '';
    pilotHTML = '<div class="eco-detail-pilot">' + icon('alertTri', 12) + ' Pilot program — ' + endText + urgency + '</div>';
  }

  // Referral
  var referralHTML = '';
  if (svc.referralRequired) {
    referralHTML = '<div class="eco-detail-referral">' + icon('lock', 12) + ' <strong>Referral required</strong> — ' + (svc.accessNotes || '') + '</div>';
  }

  // Transport
  var transportHTML = '';
  if (svc.transport) {
    transportHTML = '<div class="eco-detail-transport">' + icon('truck', 12) + ' <strong>Can transport</strong>' +
      (svc.transportNotes ? ' — ' + svc.transportNotes : '') + '</div>';
  }

  // Service tags
  var svcTagsHTML = '';
  if (svc.services && svc.services.length > 0) {
    svcTagsHTML = '<div class="eco-detail-tags">' +
      svc.services.map(function(s) { return '<span class="popup-svc-tag">' + formatServiceTag(s) + '</span>'; }).join('') +
    '</div>';
  }

  // Parent service
  var parentHTML = '';
  if (svc.parentService) {
    var parent = getServiceById(svc.parentService);
    if (parent) {
      parentHTML = '<div class="eco-detail-relation">' +
        '<span class="eco-detail-relation-label">Part of:</span> ' +
        '<a href="#" class="eco-detail-related-link" data-svc-id="' + parent.id + '">' + (parent.shortName || parent.name) + '</a>' +
      '</div>';
    }
  }

  // Child services
  var childHTML = '';
  if (svc.childServices && svc.childServices.length > 0) {
    var children = svc.childServices.map(function(cid) { return getServiceById(cid); }).filter(Boolean);
    if (children.length > 0) {
      childHTML = '<div class="eco-detail-relation">' +
        '<span class="eco-detail-relation-label">Sub-programs:</span> ' +
        children.map(function(c) {
          var cOpen = isServiceOpen(c);
          return '<a href="#" class="eco-detail-related-link" data-svc-id="' + c.id + '">' +
            (c.shortName || c.name) +
            '<span class="conn-status-badge ' + (cOpen ? 'badge-open' : 'badge-closed') + '" style="font-size:9px;padding:0 5px;margin-left:4px">' + (cOpen ? 'Open' : 'Closed') + '</span>' +
          '</a>';
        }).join(' ') +
      '</div>';
    }
  }

  // Connected services (not parent/child)
  var connected = getConnectedServices(svc).filter(function(c) {
    return c.id !== svc.parentService && !(svc.childServices || []).includes(c.id);
  });
  var connectedHTML = '';
  if (connected.length > 0) {
    connectedHTML = '<div class="eco-detail-relation">' +
      '<span class="eco-detail-relation-label">Connects to:</span> ' +
      connected.map(function(c) {
        return '<a href="#" class="eco-detail-related-link" data-svc-id="' + c.id + '">' + c.name + '</a>';
      }).join(' ') +
    '</div>';
  }

  return '<div class="eco-detail-panel" style="border-left-color:' + accColor + '">' +
    '<div class="eco-detail-header">' +
      '<div class="eco-detail-title">' +
        '<strong>' + svc.name + '</strong> ' +
        catBadge +
        '<span class="conn-status-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</div>' +
      (svc.operator ? '<div class="eco-detail-operator">' + svc.operator + '</div>' : '') +
    '</div>' +
    pilotHTML +
    referralHTML +
    (svc.description ? '<div class="eco-detail-desc">' + svc.description + '</div>' : '') +
    svcTagsHTML +
    '<div class="eco-detail-info">' +
      '<div class="eco-detail-row">' + icon('clock', 12) + ' ' + hours + '</div>' +
      (svc.address ? '<div class="eco-detail-row">' + icon('pin', 12) + ' ' + svc.address + '</div>' : '') +
      (svc.entryPoint ? '<div class="eco-detail-row">' + icon('phone', 12) + ' Access via: ' + svc.entryPoint + '</div>' : '') +
      (serves ? '<div class="eco-detail-row">' + icon('users', 12) + ' ' + serves + '</div>' : '') +
      (svc.coverageDescription ? '<div class="eco-detail-row">' + icon('layers', 12) + ' ' + svc.coverageDescription + '</div>' : '') +
    '</div>' +
    transportHTML +
    '<div class="eco-detail-access" style="border-left-color:' + accColor + '">' + accLabel +
      (svc.accessNotes && !svc.referralRequired ? ' — ' + svc.accessNotes : '') +
    '</div>' +
    parentHTML +
    childHTML +
    connectedHTML +
    phoneHTML +
  '</div>';
}

// ═══════════════════════════════════════
// VIEW 2: ORGANIZATIONS
// ═══════════════════════════════════════

function buildOrganizationsView() {
  var groups = getServicesByOperator();
  var operators = Object.keys(groups).sort(function(a, b) {
    return groups[b].length - groups[a].length;
  });

  // Pilot summary at top
  var pilotPrograms = getPilotPrograms();
  var pilotSummary = '';
  if (pilotPrograms.length > 0) {
    var endingSoon = pilotPrograms.filter(function(p) {
      var days = getPilotDaysRemaining(p);
      return days !== null && days <= 90;
    });
    pilotSummary = '<div class="org-pilot-summary">' +
      icon('alertTri', 16) +
      '<div>' +
        '<strong>' + pilotPrograms.length + ' pilot programs</strong>' +
        (endingSoon.length > 0
          ? ' \u2014 <span class="org-pilot-urgent">' + endingSoon.length + ' ending within 90 days</span>'
          : '') +
        '<div class="org-pilot-impact">If pilots end: ' +
          pilotPrograms.map(function(p) { return p.shortName || p.name; }).join(', ') +
          ' would lose funding.' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  var orgCards = operators.map(function(op) {
    return buildOrgCard(op, groups[op]);
  }).join('');

  return pilotSummary +
    '<div class="org-grid">' + orgCards + '</div>';
}

function buildOrgCard(operator, services) {
  // Separate parent and child services for hierarchy
  var parents = services.filter(function(s) { return !s.parentService; });
  var childMap = {};
  services.forEach(function(s) {
    if (s.parentService) {
      if (!childMap[s.parentService]) childMap[s.parentService] = [];
      childMap[s.parentService].push(s);
    }
  });

  var programCount = services.length;
  var pilotCount = services.filter(function(s) { return s.pilotProgram; }).length;

  var programsHTML = parents.map(function(svc) {
    var children = childMap[svc.id] || [];
    return buildOrgProgram(svc, children);
  }).join('');

  // If there are orphan children (parent in another org), show them too
  var orphanChildren = services.filter(function(s) {
    return s.parentService && !parents.find(function(p) { return p.id === s.parentService; });
  });
  orphanChildren.forEach(function(svc) {
    programsHTML += buildOrgProgram(svc, []);
  });

  return '<div class="org-card">' +
    '<div class="org-card-header">' +
      '<div class="org-card-title">' + operator + '</div>' +
      '<div class="org-card-count">' + programCount + ' program' + (programCount > 1 ? 's' : '') +
        (pilotCount > 0 ? ' <span class="org-pilot-badge">' + pilotCount + ' pilot</span>' : '') +
      '</div>' +
    '</div>' +
    '<div class="org-programs">' + programsHTML + '</div>' +
  '</div>';
}

function buildOrgProgram(svc, children) {
  var open = isServiceOpen(svc);
  var badgeClass = open ? 'badge-open' : 'badge-closed';
  var badgeText = open ? 'Open' : 'Closed';
  var accColor = getAccessibilityColor(svc.accessibility);
  var hours = formatHours(svc);
  var catBadge = svc.category
    ? '<span class="org-cat-badge ' + getCategoryClass(svc.category) + '">' + formatCategory(svc.category) + '</span>'
    : '';

  var pilotHTML = '';
  if (svc.pilotProgram) {
    var daysLeft = getPilotDaysRemaining(svc);
    var endText = svc.pilotEndDate
      ? new Date(svc.pilotEndDate).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
      : 'End date TBD';
    var urgency = (daysLeft !== null && daysLeft <= 60) ? ' <strong>(' + daysLeft + ' days left)</strong>' : '';
    pilotHTML = '<div class="org-pilot-flag">' + icon('alertTri', 12) + ' Pilot \u2014 ' + endText + urgency + '</div>';
  }

  var referralBadge = svc.referralRequired
    ? '<span class="org-referral-badge">' + icon('lock', 10) + ' Referral</span>'
    : '';

  var transportBadge = svc.transport
    ? '<span class="org-transport-badge">' + icon('truck', 10) + ' Transport</span>'
    : '';

  // Expandable details
  var phoneHTML = '';
  if (svc.phone) {
    var tel = getPhoneTel(svc.phone);
    phoneHTML = '<a href="tel:' + tel + '" class="conn-phone-cta">' + icon('phone', 14) + ' ' + svc.phone + '</a>';
  }

  var detailsHTML = '<div class="org-program-details">' +
    (svc.description ? '<div class="org-detail-desc">' + svc.description + '</div>' : '') +
    '<div class="org-detail-row">' + icon('clock', 12) + ' ' + hours + '</div>' +
    (svc.address ? '<div class="org-detail-row">' + icon('pin', 12) + ' ' + svc.address + '</div>' : '') +
    (svc.entryPoint ? '<div class="org-detail-row">' + icon('phone', 12) + ' Access via: ' + svc.entryPoint + '</div>' : '') +
    (svc.accessNotes ? '<div class="org-detail-row org-access-note" style="border-left: 3px solid ' + accColor + '">' + svc.accessNotes + '</div>' : '') +
    phoneHTML +
  '</div>';

  // Children
  var childHTML = '';
  if (children.length > 0) {
    childHTML = '<div class="org-children">' +
      children.map(function(child) {
        var childOpen = isServiceOpen(child);
        var childBadge = childOpen
          ? '<span class="conn-status-badge badge-open" style="font-size:9px;padding:1px 6px">Open</span>'
          : '<span class="conn-status-badge badge-closed" style="font-size:9px;padding:1px 6px">Closed</span>';
        var childPilot = child.pilotProgram ? '<span class="org-child-pilot">' + icon('alertTri', 10) + ' Pilot</span>' : '';
        return '<div class="org-child" data-svc-id="' + child.id + '">' +
          '<span class="org-child-indent">\u2514</span>' +
          '<span class="org-child-name">' + (child.shortName || child.name) + '</span>' +
          childBadge + childPilot +
          (child.transportNotes ? '<span class="org-child-transport">' + icon('truck', 10) + ' ' + child.transportNotes + '</span>' : '') +
        '</div>';
      }).join('') +
    '</div>';
  }

  return '<div class="org-program" data-svc-id="' + svc.id + '">' +
    '<div class="org-program-header">' +
      '<div class="org-program-accent" style="background:' + accColor + '"></div>' +
      '<div class="org-program-info">' +
        '<div class="org-program-top">' +
          '<span class="org-program-name">' + (svc.shortName || svc.name) + '</span>' +
          catBadge +
          transportBadge +
          referralBadge +
          '<span class="conn-status-badge ' + badgeClass + '">' + badgeText + '</span>' +
        '</div>' +
        pilotHTML +
      '</div>' +
    '</div>' +
    detailsHTML +
    childHTML +
  '</div>';
}

// ═══════════════════════════════════════
// VIEW 3: SERVICE DIRECTORY
// ═══════════════════════════════════════

function buildDirectoryView() {
  var allServices = getAllServices().filter(function(s) { return !s.parentService; });

  // Category filter chips
  var categories = getUniqueCategories();
  var catChips = '<button class="dir-cat-chip' + (currentDirCategory === 'all' ? ' active' : '') + '" data-cat="all">All</button>';
  catChips += categories.map(function(cat) {
    return '<button class="dir-cat-chip ' + getCategoryClass(cat) + (currentDirCategory === cat ? ' active' : '') + '" data-cat="' + cat + '">' +
      formatCategory(cat) + '</button>';
  }).join('');

  // Accessibility filter
  var accessChips = [
    { id: 'all', label: 'All Access' },
    { id: 'public', label: 'Public' },
    { id: 'public-criteria', label: 'Criteria' },
    { id: 'restricted', label: 'Restricted' }
  ].map(function(a) {
    return '<button class="dir-access-chip' + (currentDirAccess === a.id ? ' active' : '') + '" data-access="' + a.id + '">' + a.label + '</button>';
  }).join('');

  // Filter services
  var filtered = allServices;
  if (currentDirCategory !== 'all') {
    filtered = filtered.filter(function(s) { return s.category === currentDirCategory; });
  }
  if (currentDirAccess !== 'all') {
    filtered = filtered.filter(function(s) { return s.accessibility === currentDirAccess; });
  }

  // Group by category
  var grouped = {};
  filtered.forEach(function(s) {
    var cat = s.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });

  var cardsHTML = '';
  if (filtered.length === 0) {
    cardsHTML = '<div class="dir-empty">No services match these filters</div>';
  } else {
    Object.keys(grouped).sort().forEach(function(cat) {
      cardsHTML += '<div class="dir-section">' +
        '<div class="dir-section-header">' +
          '<span class="dir-section-label ' + getCategoryClass(cat) + '">' + formatCategory(cat) + '</span>' +
          '<span class="dir-section-count">' + grouped[cat].length + '</span>' +
        '</div>';
      cardsHTML += grouped[cat].map(function(svc) {
        return buildDirectoryCard(svc);
      }).join('');
      cardsHTML += '</div>';
    });
  }

  return '<div class="dir-filters">' +
    '<div class="dir-filter-row">' + catChips + '</div>' +
    '<div class="dir-filter-row">' + accessChips + '</div>' +
  '</div>' +
  '<div class="dir-results-count">' + filtered.length + ' service' + (filtered.length !== 1 ? 's' : '') + '</div>' +
  '<div class="dir-cards">' + cardsHTML + '</div>';
}

function buildDirectoryCard(svc) {
  var open = isServiceOpen(svc);
  var badgeClass = open ? 'badge-open' : 'badge-closed';
  var badgeText = open ? 'Open' : 'Closed';
  var accColor = getAccessibilityColor(svc.accessibility);
  var hours = formatHours(svc);
  var serves = formatServes(svc.serves);

  var catBadge = svc.category
    ? '<span class="conn-badge ' + getCategoryClass(svc.category) + '">' + formatCategory(svc.category) + '</span>'
    : '';

  var transportBadge = svc.transport
    ? '<span class="conn-badge transport-badge-yes">' + icon('truck', 10) + ' Transport</span>'
    : '';

  var referralBadge = svc.referralRequired
    ? '<span class="conn-badge sheet-referral-badge">' + icon('lock', 10) + ' Referral</span>'
    : '';

  var typeBadge = '';
  if (svc.isMobile) {
    typeBadge = '<span class="conn-badge type-mobile">Mobile</span>';
  } else if (svc.isDropOff) {
    typeBadge = '<span class="conn-badge type-dropoff">Drop-off</span>';
  }

  var phoneHTML = '';
  if (svc.phone) {
    var tel = getPhoneTel(svc.phone);
    phoneHTML = '<a href="tel:' + tel + '" class="conn-phone-cta">' + icon('phone', 14) + ' ' + svc.phone + '</a>';
  }

  // Enhanced pilot warning
  var pilotHTML = '';
  if (svc.pilotProgram) {
    var daysLeft = getPilotDaysRemaining(svc);
    var endText = svc.pilotEndDate
      ? new Date(svc.pilotEndDate).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
      : 'End date TBD';
    var urgency = (daysLeft !== null && daysLeft <= 60)
      ? ' <strong>(' + daysLeft + ' days left)</strong>'
      : '';
    pilotHTML = '<div class="svc-pilot">' + icon('alertTri', 14) + ' Pilot \u2014 ' + endText + urgency + '</div>';
  }

  // Service tags
  var svcTagsHTML = '';
  if (svc.services && svc.services.length > 0) {
    var tags = svc.services.slice(0, 4).map(function(s) {
      return '<span class="dir-svc-tag">' + formatServiceTag(s) + '</span>';
    });
    if (svc.services.length > 4) {
      tags.push('<span class="dir-svc-tag dir-svc-tag-more">+' + (svc.services.length - 4) + '</span>');
    }
    svcTagsHTML = '<div class="dir-svc-tags">' + tags.join('') + '</div>';
  }

  var operatorHTML = svc.operator
    ? '<div class="conn-card-operator">' + svc.operator + '</div>' : '';

  var descHTML = svc.description
    ? '<div class="conn-card-desc">' + svc.description + '</div>' : '';

  // Connected services
  var connected = getConnectedServices(svc);
  var relatedHTML = '';
  if (connected.length > 0) {
    relatedHTML = '<div class="dir-related">' +
      '<span class="dir-related-label">Connected:</span> ' +
      connected.map(function(c) { return '<span class="dir-related-name">' + c.name + '</span>'; }).join(' ') +
    '</div>';
  }

  return '<div class="conn-card" data-id="' + svc.id + '">' +
    '<div class="conn-card-accent" style="background:' + accColor + '"></div>' +
    '<div class="conn-card-body">' +
      '<div class="conn-card-top">' +
        '<span class="conn-card-name">' + (svc.shortName || svc.name) + '</span>' +
        catBadge +
        typeBadge +
        transportBadge +
        referralBadge +
        '<span class="conn-status-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</div>' +
      operatorHTML +
      '<div class="conn-card-meta">' +
        icon('clock', 12) + ' ' + hours +
        (svc.entryPoint ? ' \u00b7 ' + icon('phone', 12) + ' ' + svc.entryPoint : '') +
        (svc.coverageArea ? ' \u00b7 ' + icon('layers', 12) + ' ' + svc.coverageArea : '') +
      '</div>' +
      (serves ? '<div class="conn-card-serves">' + icon('users', 12) + ' ' + serves + '</div>' : '') +
      pilotHTML +
      '<div class="conn-card-details">' +
        descHTML +
        svcTagsHTML +
        (svc.address ? '<div class="dir-detail-row">' + icon('pin', 12) + ' ' + svc.address + '</div>' : '') +
        '<div class="conn-access-bar" style="border-color:' + accColor + '">' +
          getAccessibilityLabel(svc.accessibility) +
          (svc.accessNotes ? ' \u2014 ' + svc.accessNotes : '') +
        '</div>' +
        relatedHTML +
        phoneHTML +
      '</div>' +
    '</div>' +
  '</div>';
}
