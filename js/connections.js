/**
 * connections.js — Action-Oriented Connections Tab
 *
 * Four sections built from services.json data:
 * 1. Places You Can Bring Someone
 * 2. Teams That Come To You
 * 3. Who Can Transport
 * 4. How Services Connect (referral flows)
 * Plus a verification banner at the bottom.
 */

// ── Referral chains for the flow diagram ──
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
  }
];

// ── Section navigation pill IDs ──
var CONN_SECTIONS = [
  { id: 'conn-bring', label: 'Bring Someone', icon: 'pin' },
  { id: 'conn-come', label: 'Come To You', icon: 'truck' },
  { id: 'conn-transport', label: 'Transport', icon: 'truck' },
  { id: 'conn-flow', label: 'How It Connects', icon: 'gitMerge' }
];

function initConnections() {
  var container = document.getElementById('connections-container');
  container.innerHTML = buildConnectionsPage();

  // Section pill navigation
  container.querySelectorAll('.conn-nav-pill').forEach(function(pill) {
    pill.addEventListener('click', function() {
      var targetId = pill.dataset.section;
      var target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        container.querySelectorAll('.conn-nav-pill').forEach(function(p) { p.classList.remove('active'); });
        pill.classList.add('active');
      }
    });
  });

  // Card detail toggles
  container.querySelectorAll('.conn-card[data-id]').forEach(function(card) {
    card.addEventListener('click', function(e) {
      // Don't interfere with phone links
      if (e.target.closest('a')) return;
      card.classList.toggle('expanded');
    });
  });

  // Time change updates
  document.addEventListener('timechange', function() {
    // Re-render open/closed badges (lightweight: just update badge text)
    container.querySelectorAll('.conn-card[data-id]').forEach(function(card) {
      var svc = getServiceById(card.dataset.id);
      if (!svc) return;
      var badge = card.querySelector('.conn-status-badge');
      if (badge) {
        var open = isServiceOpen(svc);
        badge.className = 'conn-status-badge ' + (open ? 'badge-open' : 'badge-closed');
        badge.textContent = open ? 'Open' : 'Closed';
      }
    });
  });
}

function buildConnectionsPage() {
  var dropoffs = getDropOffLocations();
  var mobileTeams = getTopLevelMobileTeams();
  var transportServices = getTransportServices();
  var verify = getVerificationSummary();

  return '<div class="conn-page">' +
    '<h2>Edmonton Crisis Services</h2>' +
    '<p class="conn-subtitle">How services are organized, who can transport, and how they connect.</p>' +

    // Navigation pills
    '<div class="conn-nav">' +
      CONN_SECTIONS.map(function(s, i) {
        return '<button class="conn-nav-pill' + (i === 0 ? ' active' : '') + '" data-section="' + s.id + '">' +
          icon(s.icon, 14) + ' ' + s.label +
        '</button>';
      }).join('') +
    '</div>' +

    // Section 1: Places You Can Bring Someone
    '<div class="conn-section" id="conn-bring">' +
      '<h3 class="conn-section-title">' + icon('pin', 18) + ' Places You Can Bring Someone</h3>' +
      '<p class="conn-section-desc">Drop-off locations with walk-in intake. ' + dropoffs.length + ' locations.</p>' +
      dropoffs.map(function(svc) { return buildConnCard(svc, 'dropoff'); }).join('') +
    '</div>' +

    // Section 2: Teams That Come To You
    '<div class="conn-section" id="conn-come">' +
      '<h3 class="conn-section-title">' + icon('truck', 18) + ' Teams That Come To You</h3>' +
      '<p class="conn-section-desc">Mobile teams dispatched to your location. ' + mobileTeams.length + ' teams.</p>' +
      mobileTeams.map(function(svc) { return buildConnCardMobile(svc); }).join('') +
    '</div>' +

    // Section 3: Who Can Transport
    '<div class="conn-section" id="conn-transport">' +
      '<h3 class="conn-section-title">' + icon('truck', 18) + ' Who Can Transport</h3>' +
      '<p class="conn-section-desc">Services that can physically move someone to care. ' + transportServices.length + ' services.</p>' +
      transportServices.map(function(svc) { return buildConnCardTransport(svc); }).join('') +
    '</div>' +

    // Section 4: How Services Connect
    '<div class="conn-section" id="conn-flow">' +
      '<h3 class="conn-section-title">' + icon('gitMerge', 18) + ' How Services Connect</h3>' +
      '<p class="conn-section-desc">Key referral pathways through the system.</p>' +
      '<div class="conn-flows">' +
        REFERRAL_CHAINS.map(function(chain) { return buildReferralFlow(chain); }).join('') +
      '</div>' +
    '</div>' +

    // Verification Banner
    '<div class="conn-verification">' +
      '<h3>' + icon('alertTri', 16) + ' Data Verification</h3>' +
      '<div class="conn-verify-bar-wrap">' +
        '<div class="conn-verify-bar">' +
          '<div class="conn-verify-fill" style="width:' + verify.pct + '%"></div>' +
        '</div>' +
        '<span class="conn-verify-count">' + verify.verified + '/' + verify.total + ' verified (' + verify.pct + '%)</span>' +
      '</div>' +
      (verify.unverified.length > 0
        ? '<div class="conn-verify-list">' +
            '<details>' +
              '<summary>Unverified services (' + verify.unverified.length + ')</summary>' +
              '<ul>' + verify.unverified.map(function(s) {
                return '<li>' + (s.shortName || s.name) +
                  (s.verification && s.verification.notes ? ' \u2014 <em>' + s.verification.notes + '</em>' : '') +
                '</li>';
              }).join('') + '</ul>' +
            '</details>' +
          '</div>'
        : '') +
      '<p class="conn-verify-disclaimer">This is a demo with researched data. Verify with operators before operational use.</p>' +
    '</div>' +

  '</div>';
}

// ── Drop-off card ──
function buildConnCard(svc, type) {
  var open = isServiceOpen(svc);
  var badgeClass = open ? 'badge-open' : 'badge-closed';
  var badgeText = open ? 'Open' : 'Closed';
  var accColor = getAccessibilityColor(svc.accessibility);
  var hours = formatHours(svc);
  var serves = formatServes(svc.serves);

  var phoneHTML = '';
  if (svc.phone) {
    var tel = getPhoneTel(svc.phone);
    phoneHTML = '<a href="tel:' + tel + '" class="conn-phone-cta">' + icon('phone', 14) + ' ' + svc.phone + '</a>';
  }

  var verifyIcon = '';
  if (svc.verification) {
    verifyIcon = svc.verification.status === 'verified'
      ? '<span class="svc-verified">' + icon('check', 12) + '</span>'
      : '<span class="svc-unverified">' + icon('alertTri', 12) + '</span>';
  }

  var operatorHTML = svc.operator
    ? '<div class="conn-card-operator">' + svc.operator + '</div>' : '';

  var descHTML = svc.description
    ? '<div class="conn-card-desc">' + svc.description + '</div>' : '';

  var pilotHTML = '';
  if (svc.pilotProgram) {
    var endDate = svc.pilotEndDate
      ? new Date(svc.pilotEndDate).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
      : 'TBD';
    pilotHTML = '<div class="svc-pilot">' + icon('alertTri', 14) +
      ' Pilot \u2014 funded until ' + endDate + '</div>';
  }

  var transportBadge = '';
  if (svc.transport) {
    transportBadge = '<span class="conn-badge transport-badge-yes">' + icon('truck', 10) + ' Transports</span>';
  }

  return '<div class="conn-card" data-id="' + svc.id + '">' +
    '<div class="conn-card-accent" style="background:' + accColor + '"></div>' +
    '<div class="conn-card-body">' +
      '<div class="conn-card-top">' +
        '<span class="conn-card-name">' + (svc.shortName || svc.name) + verifyIcon + '</span>' +
        transportBadge +
        '<span class="conn-status-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</div>' +
      operatorHTML +
      '<div class="conn-card-meta">' +
        icon('clock', 12) + ' ' + hours +
        (svc.address ? ' \u00b7 ' + icon('pin', 12) + ' ' + svc.address : '') +
      '</div>' +
      (serves ? '<div class="conn-card-serves">' + icon('users', 12) + ' ' + serves + '</div>' : '') +
      pilotHTML +
      '<div class="conn-card-details">' +
        descHTML +
        phoneHTML +
        '<div class="conn-access-bar" style="border-color:' + accColor + '">' +
          getAccessibilityLabel(svc.accessibility) +
          (svc.accessNotes ? ' \u2014 ' + svc.accessNotes : '') +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

// ── Mobile team card ──
function buildConnCardMobile(svc) {
  var open = isServiceOpen(svc);
  var badgeClass = open ? 'badge-open' : 'badge-closed';
  var badgeText = open ? 'Open' : 'Closed';
  var accColor = getAccessibilityColor(svc.accessibility);
  var hours = formatHours(svc);

  var transportBadge = svc.transport
    ? '<span class="conn-badge transport-badge-yes">' + icon('truck', 10) + ' Transports</span>'
    : '<span class="conn-badge transport-badge-no">No transport</span>';

  var phoneHTML = '';
  if (svc.phone) {
    var tel = getPhoneTel(svc.phone);
    phoneHTML = '<a href="tel:' + tel + '" class="conn-phone-cta">' + icon('phone', 14) + ' ' + svc.phone + '</a>';
  }

  var operatorHTML = svc.operator
    ? '<div class="conn-card-operator">' + svc.operator + '</div>' : '';

  var descHTML = svc.description
    ? '<div class="conn-card-desc">' + svc.description + '</div>' : '';

  var serves = formatServes(svc.serves);
  var servesHTML = serves
    ? '<div class="conn-card-serves">' + icon('users', 12) + ' ' + serves + '</div>' : '';

  var pilotHTML = '';
  if (svc.pilotProgram) {
    var endDate = svc.pilotEndDate
      ? new Date(svc.pilotEndDate).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
      : 'TBD';
    pilotHTML = '<div class="svc-pilot">' + icon('alertTri', 14) +
      ' Pilot \u2014 funded until ' + endDate + '</div>';
  }

  // Show child services
  var childHTML = '';
  if (svc.childServices && svc.childServices.length > 0) {
    var children = svc.childServices.map(function(cid) { return getServiceById(cid); }).filter(Boolean);
    if (children.length > 0) {
      childHTML = '<div class="conn-children">' +
        children.map(function(child) {
          var childOpen = isServiceOpen(child);
          var childBadge = childOpen ? '<span class="conn-badge badge-open" style="font-size:10px">Open</span>' : '<span class="conn-badge badge-closed" style="font-size:10px">Closed</span>';
          var childTransport = child.transportNotes ? ' \u2014 ' + child.transportNotes : '';
          var childServes = formatServes(child.serves);
          return '<div class="conn-child-item">' +
            '<span class="conn-child-name">' + (child.shortName || child.name) + ' ' + childBadge + '</span>' +
            (childServes ? '<span class="conn-child-info">' + icon('users', 10) + ' ' + childServes + '</span>' : '') +
            (childTransport ? '<span class="conn-child-info">' + icon('truck', 10) + childTransport + '</span>' : '') +
            (child.description ? '<span class="conn-child-info">' + child.description + '</span>' : '') +
          '</div>';
        }).join('') +
      '</div>';
    }
  }

  var verifyIcon = '';
  if (svc.verification) {
    verifyIcon = svc.verification.status === 'verified'
      ? '<span class="svc-verified">' + icon('check', 12) + '</span>'
      : '<span class="svc-unverified">' + icon('alertTri', 12) + '</span>';
  }

  return '<div class="conn-card" data-id="' + svc.id + '">' +
    '<div class="conn-card-accent" style="background:' + accColor + '"></div>' +
    '<div class="conn-card-body">' +
      '<div class="conn-card-top">' +
        '<span class="conn-card-name">' + (svc.shortName || svc.name) + verifyIcon + '</span>' +
        transportBadge +
        '<span class="conn-status-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</div>' +
      operatorHTML +
      '<div class="conn-card-meta">' +
        icon('clock', 12) + ' ' + hours +
        ' \u00b7 ' + icon('phone', 12) + ' ' + (svc.entryPoint || 'direct') +
        ' \u00b7 ' + icon('layers', 12) + ' ' + (svc.coverageArea || 'local') +
      '</div>' +
      servesHTML +
      pilotHTML +
      '<div class="conn-card-details">' +
        descHTML +
        phoneHTML +
        childHTML +
      '</div>' +
    '</div>' +
  '</div>';
}

// ── Transport card (expanded) ──
function buildConnCardTransport(svc) {
  var open = isServiceOpen(svc);
  var badgeClass = open ? 'badge-open' : 'badge-closed';
  var badgeText = open ? 'Open' : 'Closed';
  var hours = formatHours(svc);

  var phoneHTML = '';
  if (svc.phone) {
    var tel = getPhoneTel(svc.phone);
    phoneHTML = '<a href="tel:' + tel + '" class="conn-phone-cta">' + icon('phone', 14) + ' ' + svc.phone + '</a>';
  }

  var operatorHTML = svc.operator
    ? '<div class="conn-card-operator">' + svc.operator + '</div>' : '';

  var serves = formatServes(svc.serves);
  var servesRow = serves
    ? '<div class="conn-transport-row"><strong>Serves:</strong> ' + serves + '</div>' : '';

  var coverageRow = svc.coverageArea
    ? '<div class="conn-transport-row"><strong>Coverage:</strong> ' + svc.coverageArea + '</div>' : '';

  // Aggregated child van info for CDT
  var vanInfo = '';
  if (svc.childServices && svc.childServices.length > 0) {
    var children = svc.childServices.map(function(cid) { return getServiceById(cid); }).filter(Boolean);
    var vanDetails = children.filter(function(c) { return c.transportNotes; })
      .map(function(c) { return (c.shortName || c.name) + ': ' + c.transportNotes; });
    if (vanDetails.length > 0) {
      vanInfo = '<div class="conn-transport-vans">' + vanDetails.join(' \u00b7 ') + '</div>';
    }
  }

  var descHTML = svc.description
    ? '<div class="conn-card-desc">' + svc.description + '</div>' : '';

  return '<div class="conn-card conn-card-transport" data-id="' + svc.id + '">' +
    '<div class="conn-card-accent" style="background:var(--green)"></div>' +
    '<div class="conn-card-body">' +
      '<div class="conn-card-top">' +
        '<span class="conn-card-name">' + icon('truck', 14) + ' ' + (svc.shortName || svc.name) + '</span>' +
        '<span class="conn-status-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</div>' +
      operatorHTML +
      descHTML +
      '<div class="conn-transport-grid">' +
        '<div class="conn-transport-row"><strong>Transports?</strong> <span class="transport-yes-text">YES</span></div>' +
        '<div class="conn-transport-row"><strong>Where to:</strong> ' + (svc.transportNotes || 'Various locations') + '</div>' +
        '<div class="conn-transport-row"><strong>How to request:</strong> ' + (svc.entryPoint || 'Direct') + (svc.phone ? ' \u2014 ' + svc.phone : '') + '</div>' +
        '<div class="conn-transport-row"><strong>Hours:</strong> ' + hours + '</div>' +
        servesRow +
        coverageRow +
        (svc.referralRequired ? '<div class="conn-transport-row"><strong>Restriction:</strong> Referral required</div>' : '') +
        (svc.pilotProgram ? '<div class="conn-transport-row conn-pilot-note">' + icon('alertTri', 12) + ' Pilot program' + (svc.pilotEndDate ? ' \u2014 until ' + new Date(svc.pilotEndDate).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' }) : '') + '</div>' : '') +
      '</div>' +
      vanInfo +
      phoneHTML +
    '</div>' +
  '</div>';
}

// ── Referral flow diagram ──
function buildReferralFlow(chain) {
  var stepsHTML = chain.steps.map(function(step, i) {
    var isLast = i === chain.steps.length - 1;
    var classNames = 'flow-step flow-' + step.type;
    var noteHTML = step.note ? '<span class="flow-note">' + step.note + '</span>' : '';
    var arrowHTML = !isLast ? '<span class="flow-arrow">\u2192</span>' : '';

    return '<div class="' + classNames + '">' +
      '<span class="flow-name">' + step.name + '</span>' +
      noteHTML +
    '</div>' +
    arrowHTML;
  }).join('');

  return '<div class="conn-flow-chain">' +
    '<div class="conn-flow-label">' + chain.label + '</div>' +
    '<div class="conn-flow-steps">' + stepsHTML + '</div>' +
  '</div>';
}
