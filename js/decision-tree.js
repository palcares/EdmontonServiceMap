/**
 * decision-tree.js — Action-First Decision Tree
 *
 * Opens with "What do you need right now?" instead of "Who are you?"
 * 2 clicks to a result (3 max for "not sure" path).
 * Transport info prominently displayed on every result.
 * Progress bar, staggered animations, gold CTA.
 */

var DECISION_TREE = {
  start: {
    question: "What do you need right now?",
    options: [
      {
        label: "I can bring someone somewhere",
        subtitle: "I have a vehicle or the person can travel",
        icon: "pin",
        category: "default",
        next: "bring-situation"
      },
      {
        label: "I need someone to come here",
        subtitle: "Send a team to my location",
        icon: "truck",
        category: "crisis",
        next: "come-situation"
      },
      {
        label: "I need to call someone",
        subtitle: "Phone advice, dispatch, or reporting",
        icon: "phone",
        category: "default",
        next: "call-situation"
      },
      {
        label: "Not sure \u2014 just need help",
        subtitle: "Guide me through it",
        icon: "helpCircle",
        category: "default",
        next: "triage-emergency"
      }
    ]
  },

  // ═══════════════════════════════════════
  // BRANCH 1: "I can bring someone somewhere"
  // ═══════════════════════════════════════

  "bring-situation": {
    question: "What\u2019s the situation?",
    options: [
      { label: "Person is intoxicated", icon: "droplet", category: "intoxication", next: "result-bring-intoxicated" },
      { label: "Mental health crisis", icon: "brain", category: "mental-health", next: "result-bring-mental-health" },
      { label: "Person needs shelter", icon: "home", category: "shelter", next: "result-bring-shelter" },
      { label: "Youth under 24 needs help", icon: "heart", category: "youth", next: "result-bring-youth" },
      { label: "Medical concern", icon: "heartPulse", category: "medical", next: "result-bring-medical" }
    ]
  },

  "result-bring-intoxicated": {
    type: "result",
    title: "Bring Someone \u2014 Intoxicated",
    description: "Drop-off locations that accept intoxicated individuals for safe sobering.",
    transportInfo: {
      type: "you-transport",
      text: "You are providing transport. These locations accept walk-ins \u2014 no need to call ahead."
    },
    primaryServices: ["george-spady-detox", "george-spady-aurora"],
    secondaryServices: ["hope-mission", "access-247"],
    actions: [
      "George Spady Detox (Aurora Centre) \u2014 24/7 walk-in for intoxicated adults. 15625 Stony Plain Rd NW",
      "If the person also needs crisis stabilization \u2192 George Spady Aurora Centre (same location)",
      "Hope Mission (Herb Jamieson) \u2014 24/7 emergency shelter for adult men. 10014 105A Ave NW",
      "If medical emergency (unresponsive, difficulty breathing) \u2192 call 911"
    ]
  },

  "result-bring-mental-health": {
    type: "result",
    title: "Bring Someone \u2014 Mental Health Crisis",
    description: "Walk-in locations for mental health and addiction support.",
    transportInfo: {
      type: "you-transport",
      text: "You are providing transport. Access 24/7 is the primary walk-in destination."
    },
    primaryServices: ["access-247"],
    secondaryServices: ["royal-alexandra-hospital", "u-of-a-hospital"],
    actions: [
      "Access 24/7 \u2014 walk-in mental health & addiction support, 24/7. 10959 102 St NW (Anderson Hall). Phone: 780-424-2424",
      "If the person is a danger to self or others \u2192 Emergency department (RAH or UAH)",
      "If suicidal \u2192 call 988 (Suicide Crisis Helpline, 24/7)",
      "If person is unwilling to go \u2192 call 211 press 3 for CDT mobile response"
    ]
  },

  "result-bring-shelter": {
    type: "result",
    title: "Bring Someone \u2014 Needs Shelter",
    description: "Emergency shelters and drop-in centres with walk-in intake.",
    transportInfo: {
      type: "you-transport",
      text: "You are providing transport. Check hours before going \u2014 some locations are not 24/7."
    },
    primaryServices: ["hope-mission", "boyle-street", "yess"],
    secondaryServices: ["george-spady-detox"],
    actions: [
      "Adult men \u2192 Hope Mission (Herb Jamieson Centre), walk-in 24/7. 10014 105A Ave NW. Phone: 780-429-3470",
      "All adults (daytime) \u2192 Boyle Street (King Thunderbird Centre), M-F 8am\u20134pm, Sat-Sun 9am\u20133pm. 10010 107A Ave NW",
      "Youth 15\u201321 \u2192 YESS, walk-in 24/7. 9310 82 Ave NW. Phone: 780-468-7070",
      "If intoxicated \u2192 George Spady Detox, walk-in 24/7. 15625 Stony Plain Rd NW"
    ]
  },

  "result-bring-youth": {
    type: "result",
    title: "Bring Someone \u2014 Youth Under 24",
    description: "Youth-specific emergency services and shelter.",
    transportInfo: {
      type: "you-transport",
      text: "You are providing transport. YESS is the primary youth shelter destination."
    },
    primaryServices: ["yess"],
    secondaryServices: ["access-247", "988-crisis-line"],
    actions: [
      "YESS (Youth Empowerment & Support Services) \u2014 emergency shelter ages 15\u201321, daytime programs 15\u201324. Walk-in 24/7. 9310 82 Ave NW. Phone: 780-468-7070",
      "For mental health concerns \u2192 Access 24/7 serves youth too. Phone: 780-424-2424",
      "If suicidal crisis \u2192 call or text 988 (24/7)",
      "CDT (211 press 3) can also help transport youth to YESS"
    ]
  },

  "result-bring-medical": {
    type: "result",
    title: "Bring Someone \u2014 Medical Concern",
    description: "Emergency departments and medical walk-in options.",
    transportInfo: {
      type: "you-transport",
      text: "You are providing transport. For emergencies, call 911 for an ambulance instead."
    },
    primaryServices: ["royal-alexandra-hospital", "u-of-a-hospital"],
    secondaryServices: ["access-247", "george-spady-detox"],
    actions: [
      "Emergency \u2192 Royal Alexandra Hospital, 10240 Kingsway Ave NW (inner-city, high crisis volume). Phone: 780-735-4111",
      "Emergency \u2192 U of A Hospital, 8440 112 St NW. Phone: 780-407-8822",
      "If mental health + medical \u2192 Access 24/7 can assess both. 10959 102 St NW",
      "If intoxicated + medical concern \u2192 George Spady Detox can stabilize. 15625 Stony Plain Rd NW",
      "For non-emergency medical \u2192 Community Paramedics, 8am\u20138pm daily. Phone: 1-833-367-2788"
    ]
  },

  // ═══════════════════════════════════════
  // BRANCH 2: "I need someone to come here"
  // ═══════════════════════════════════════

  "come-situation": {
    question: "What\u2019s happening?",
    options: [
      { label: "Person in crisis (non-violent)", icon: "helpCircle", category: "crisis", next: "result-come-crisis" },
      { label: "Mental health emergency", icon: "brain", category: "mental-health", next: "result-come-mental-health" },
      { label: "Medical concern (not 911)", icon: "heartPulse", category: "medical", next: "result-come-medical" },
      { label: "Encampment / unsheltered person", icon: "tent", category: "shelter", next: "result-come-encampment" },
      { label: "On transit / at a station", icon: "train", category: "transit", next: "result-come-transit" }
    ]
  },

  "result-come-crisis": {
    type: "result",
    title: "Send a Team \u2014 Person in Crisis",
    description: "Mobile crisis response teams that come to your location.",
    transportInfo: {
      type: "team-transport",
      text: "CDT \u2014 CAN TRANSPORT to shelters, detox, and services (voluntary). PACT \u2014 CAN TRANSPORT under Mental Health Act."
    },
    primaryServices: ["cdt"],
    secondaryServices: ["pact", "community-paramedics"],
    actions: [
      "Call 211, press 3 \u2014 Crisis Diversion Team (CDT) responds 24/7 anywhere in Edmonton. CAN TRANSPORT.",
      "CDT will assess the situation and connect the person to appropriate services",
      "If the person is a danger to self or others \u2192 call 911",
      "If medical concern \u2192 Community Paramedics (8am\u20138pm daily). Phone: 1-833-367-2788"
    ]
  },

  "result-come-mental-health": {
    type: "result",
    title: "Send a Team \u2014 Mental Health",
    description: "Specialized mental health crisis response teams.",
    transportInfo: {
      type: "team-transport",
      text: "PACT \u2014 CAN TRANSPORT to hospital under Mental Health Act. CREMS \u2014 CAN TRANSPORT to hospital or crisis services. CDT \u2014 CAN TRANSPORT (voluntary)."
    },
    primaryServices: ["pact", "crems", "cdt"],
    secondaryServices: ["access-247", "988-crisis-line"],
    actions: [
      "PACT (Police & Crisis Team) \u2014 EPS officer + mental health therapist. 24/7. Can apprehend under Mental Health Act. Dispatched through EPS/AHS. Phone: 780-424-2424",
      "CREMS (Crisis Response & EMS) \u2014 paramedic + mental health therapist. 24/7. Dispatched through AHS. Phone: 780-424-2424",
      "CDT (211 press 3) \u2014 24/7 mobile crisis response. CAN TRANSPORT voluntarily.",
      "Phone support: Access 24/7 phone line available 24/7 at 780-424-2424",
      "If suicidal crisis \u2192 988 (call or text, 24/7)"
    ]
  },

  "result-come-medical": {
    type: "result",
    title: "Send a Team \u2014 Medical Concern",
    description: "Mobile medical teams for non-emergency medical care.",
    transportInfo: {
      type: "no-transport",
      text: "Community Paramedics and Community Response Team do NOT transport. If transport is needed, also call CDT (211 press 3)."
    },
    primaryServices: ["community-paramedics", "community-response-team"],
    secondaryServices: ["city-centre-team", "cdt"],
    actions: [
      "Community Paramedics \u2014 mobile acute medical care, 8am\u20138pm daily. For people experiencing homelessness, addiction, or mental health issues. Phone: 1-833-367-2788. NO TRANSPORT.",
      "Community Response Team \u2014 nurse/paramedic teams, in-home care, 8am\u20138pm daily. Phone: 1-833-367-2788. NO TRANSPORT.",
      "City Centre Team (AHS) \u2014 downtown only, 8am\u20138pm daily. Phone: 1-833-367-2788",
      "If transport needed \u2192 also call CDT (211 press 3) \u2014 CAN TRANSPORT 24/7",
      "If emergency \u2192 call 911"
    ]
  },

  "result-come-encampment": {
    type: "result",
    title: "Send a Team \u2014 Encampment Response",
    description: "Teams that respond to encampments and unsheltered individuals.",
    transportInfo: {
      type: "team-transport",
      text: "UHEI \u2014 CAN TRANSPORT from encampments (EPS calls only, pilot program). CDT \u2014 CAN TRANSPORT (voluntary)."
    },
    primaryServices: ["uhei", "cdt"],
    secondaryServices: ["encampment-low-risk", "encampment-high-risk"],
    actions: [
      "UHEI (Unsheltered Homelessness & Encampments Initiative) \u2014 responds to EPS calls regarding encampments. CAN TRANSPORT. Pilot funded until Mar 2026.",
      "CDT (211 press 3) \u2014 can assist individuals at encampments 24/7. CAN TRANSPORT.",
      "Low-risk encampment (no safety concerns) \u2192 call 311 for PO + outreach response",
      "High-risk encampment (safety concerns) \u2192 call 311 and EPS non-emergency",
      "River valley / parks \u2192 Park Rangers also available via 311 (7am\u20139pm daily)"
    ]
  },

  "result-come-transit": {
    type: "result",
    title: "Send a Team \u2014 Transit Location",
    description: "Teams that serve transit corridors and stations.",
    transportInfo: {
      type: "team-transport",
      text: "COTT \u2014 CAN TRANSPORT from transit locations. CDT \u2014 CAN TRANSPORT (24/7 backup)."
    },
    primaryServices: ["cott", "cdt"],
    secondaryServices: ["peace-officers-transit"],
    actions: [
      "COTT (Community Outreach Transit Team) \u2014 PO + outreach workers, 6am\u20132am daily, 7 teams. CAN TRANSPORT. PO referral. Call 311.",
      "CDT (211 press 3) \u2014 responds to transit locations too, 24/7. CAN TRANSPORT.",
      "Between 2am\u20136am (COTT gap) \u2192 CDT is the primary option",
      "Transit Peace Officers available at stations, 7 days/week",
      "If emergency \u2192 call 911"
    ]
  },

  // ═══════════════════════════════════════
  // BRANCH 3: "I need to call someone"
  // ═══════════════════════════════════════

  "call-situation": {
    question: "What kind of call?",
    options: [
      { label: "Mental health or suicide crisis", icon: "brain", category: "mental-health", next: "result-call-mental-health" },
      { label: "General crisis \u2014 someone needs help", icon: "helpCircle", category: "crisis", next: "result-call-crisis" },
      { label: "Report a concern (encampment, by-law)", icon: "clipboard", category: "default", next: "result-call-reporting" },
      { label: "Find who can transport someone", icon: "truck", category: "transport", next: "result-call-transport" }
    ]
  },

  "result-call-mental-health": {
    type: "result",
    title: "Call \u2014 Mental Health & Suicide Crisis",
    description: "Phone numbers for immediate mental health support.",
    transportInfo: {
      type: "phone-only",
      text: "These are phone-based services. If you need a team sent, call Access 24/7 or 211 press 3."
    },
    primaryServices: ["988-crisis-line", "access-247"],
    secondaryServices: ["cdt"],
    actions: [
      "988 \u2014 Suicide Crisis Helpline. Call or text. 24/7. Free and confidential.",
      "780-424-2424 \u2014 Access 24/7. Mental health & addiction support by phone 24/7. Can also dispatch PACT or CREMS.",
      "211 press 3 \u2014 Crisis Diversion Team for mobile response. 24/7.",
      "If immediate danger \u2192 call 911"
    ]
  },

  "result-call-crisis": {
    type: "result",
    title: "Call \u2014 General Crisis",
    description: "The key phone numbers for crisis situations in Edmonton.",
    transportInfo: {
      type: "phone-only",
      text: "Call 211 press 3 to get a mobile team with transport capability sent to your location."
    },
    primaryServices: ["cdt", "access-247"],
    secondaryServices: ["988-crisis-line"],
    actions: [
      "211 press 3 \u2014 Crisis Diversion Team. 24/7. They come to you and CAN TRANSPORT.",
      "780-424-2424 \u2014 Access 24/7. Phone support + can dispatch specialized teams.",
      "988 \u2014 if the concern is suicidal thoughts or self-harm. Call or text, 24/7.",
      "911 \u2014 if there is immediate danger to anyone"
    ]
  },

  "result-call-reporting": {
    type: "result",
    title: "Call \u2014 Report a Concern",
    description: "Numbers for reporting non-emergency situations.",
    transportInfo: null,
    primaryServices: [],
    secondaryServices: [],
    actions: [
      "311 \u2014 Encampment concerns, by-law issues, peace officer requests",
      "311 \u2014 COTT (transit outreach) requests go through peace officers",
      "EPS non-emergency: 780-423-4567 \u2014 for police-related non-emergency concerns",
      "211 press 3 \u2014 if someone needs immediate help (crisis, not by-law)"
    ]
  },

  "result-call-transport": {
    type: "result",
    title: "Who Can Transport Someone?",
    description: "All services in Edmonton that provide transport for individuals in crisis.",
    transportInfo: {
      type: "transport-directory",
      text: "Transport is critical in crisis response. Here\u2019s every service that can move someone to care."
    },
    primaryServices: ["cdt", "pact", "crems", "cott"],
    secondaryServices: ["uhei", "bus-connect", "health-access-mobile", "dats"],
    actions: [
      "CDT (211 press 3) \u2014 CAN TRANSPORT. 24/7. Voluntary transport to shelters, detox, services. Hope Mission 5\u20137 vans + Boyle Street 6 vans.",
      "PACT (780-424-2424) \u2014 CAN TRANSPORT. 24/7. To hospital for mental health assessment under Mental Health Act.",
      "CREMS (780-424-2424) \u2014 CAN TRANSPORT. 24/7. To hospital or crisis services.",
      "COTT (311) \u2014 CAN TRANSPORT. 6am\u20132am. From transit locations. PO referral.",
      "UHEI (211 press 3) \u2014 CAN TRANSPORT. 24/7. From encampments. EPS calls only. Pilot ends Mar 2026.",
      "Bus Connect (211 press 3) \u2014 CAN TRANSPORT. Winter 24/7, normal M-F 11:30am\u20137:30pm. West loop. Pilot ends Mar 2026.",
      "Health Access Mobile \u2014 CAN TRANSPORT. 8am\u20138pm. RAH to services. RAH referral only. Pilot ends Mar 2026.",
      "DATS (780-496-4567) \u2014 Accessible transit. Pre-booked. Application required."
    ]
  },

  // ═══════════════════════════════════════
  // BRANCH 4: "Not sure — just need help"
  // ═══════════════════════════════════════

  "triage-emergency": {
    question: "Is this an emergency? (danger to life, violence, medical emergency)",
    options: [
      { label: "Yes \u2014 someone is in danger", icon: "alertTri", category: "crisis", next: "result-emergency-911" },
      { label: "No \u2014 not an emergency", icon: "check", category: "default", next: "triage-what" }
    ]
  },

  "result-emergency-911": {
    type: "result",
    title: "Call 911",
    description: "If someone is in immediate danger, call 911 first.",
    transportInfo: {
      type: "emergency",
      text: "911 dispatches EPS, Fire, and EMS. After the immediate emergency is handled, these services can follow up."
    },
    primaryServices: [],
    secondaryServices: ["pact", "cdt", "access-247"],
    actions: [
      "Call 911 immediately for police, fire, or ambulance",
      "After the emergency \u2192 PACT (police + therapist) can be dispatched for mental health follow-up",
      "After the emergency \u2192 CDT (211 press 3) can help with next steps and transport",
      "Access 24/7 (780-424-2424) available for ongoing mental health support"
    ]
  },

  "triage-what": {
    question: "What best describes the situation?",
    options: [
      { label: "Person seems intoxicated", icon: "droplet", category: "intoxication", next: "result-triage-intoxicated" },
      { label: "Mental health concern", icon: "brain", category: "mental-health", next: "result-triage-mental-health" },
      { label: "Person needs a place to stay", icon: "home", category: "shelter", next: "result-bring-shelter" },
      { label: "Person needs medical attention", icon: "heartPulse", category: "medical", next: "result-come-medical" }
    ]
  },

  "result-triage-intoxicated": {
    type: "result",
    title: "Not Sure? \u2014 Person Appears Intoxicated",
    description: "Here\u2019s the simplest path to help.",
    transportInfo: {
      type: "team-transport",
      text: "CDT \u2014 CAN TRANSPORT. They\u2019ll come to you and can take the person to George Spady Detox or other services."
    },
    primaryServices: ["cdt", "george-spady-detox"],
    secondaryServices: ["hope-mission"],
    actions: [
      "Call 211, press 3 \u2014 Crisis Diversion Team will come to you. 24/7. CAN TRANSPORT.",
      "They can take the person to George Spady Detox (24/7) or other appropriate services",
      "If you can take the person yourself \u2192 George Spady Detox at 15625 Stony Plain Rd NW (24/7 walk-in)",
      "If medical emergency (unresponsive, difficulty breathing) \u2192 call 911"
    ]
  },

  "result-triage-mental-health": {
    type: "result",
    title: "Not Sure? \u2014 Mental Health Concern",
    description: "Start with a phone call. You don\u2019t need to diagnose anything.",
    transportInfo: {
      type: "phone-only",
      text: "Start by calling. The operator will help you figure out what to do next."
    },
    primaryServices: ["access-247", "cdt", "988-crisis-line"],
    secondaryServices: [],
    actions: [
      "Call 780-424-2424 (Access 24/7) \u2014 mental health professionals available 24/7 by phone. They\u2019ll guide you.",
      "Call 211, press 3 (CDT) \u2014 if you need someone to come to the location. 24/7. CAN TRANSPORT.",
      "Call or text 988 \u2014 if the person is talking about suicide or self-harm. 24/7.",
      "You don\u2019t need to know the system \u2014 these numbers will connect you to the right help",
      "Stay calm, give space, don\u2019t leave them alone if possible"
    ]
  }
};

var currentStep = 'start';
var stepHistory = [];

// ── Max depth for progress calculation ──
var MAX_DEPTH = 3;

// ── Init ──

function initDecisionTree() {
  renderStep('start');
  initTimeControls();

  // Re-render current step when time changes (updates open/closed badges)
  document.addEventListener('timechange', function() {
    if (DECISION_TREE[currentStep] && DECISION_TREE[currentStep].type === 'result') {
      renderResult(DECISION_TREE[currentStep], document.getElementById('decision-tree-container'));
    }
  });
}

// ── Progress Bar ──

function getProgressHTML() {
  var depth = stepHistory.length;
  var step = DECISION_TREE[currentStep];
  var isResult = step && step.type === 'result';
  var currentDepth = isResult ? MAX_DEPTH : depth + 1;
  var pct = Math.min(100, Math.round((currentDepth / MAX_DEPTH) * 100));
  var label = isResult ? 'Result' : 'Step ' + currentDepth + ' of ' + MAX_DEPTH;

  return '<div class="dt-progress">' +
    '<div class="dt-progress-label">' + label + '</div>' +
    '<div class="dt-progress-bar">' +
      '<div class="dt-progress-fill" style="width:' + pct + '%"></div>' +
    '</div>' +
  '</div>';
}

// ── Rendering ──

function renderStep(stepId) {
  currentStep = stepId;
  var step = DECISION_TREE[stepId];
  var container = document.getElementById('decision-tree-container');

  if (!step) {
    container.innerHTML = '<p class="dt-error">Error: step not found</p>';
    return;
  }

  if (step.type === 'result') {
    renderResult(step, container);
  } else {
    renderQuestion(step, stepId, container);
  }
}

function renderQuestion(step, stepId, container) {
  var backBtn = stepHistory.length > 0
    ? '<button class="btn-back" onclick="goBack()">' + icon('arrowLeft', 16) + ' Back</button>'
    : '';

  var optionsHTML = step.options.map(function(opt, idx) {
    var cat = opt.category || 'default';
    var delay = (idx * 60) + 'ms';
    var subtitleHTML = opt.subtitle
      ? '<span class="option-subtitle">' + opt.subtitle + '</span>'
      : '';
    return '<button class="option-card' + (opt.subtitle ? ' has-subtitle' : '') + '" style="animation-delay:' + delay + '" onclick="selectOption(\'' + stepId + '\', \'' + opt.next + '\')">' +
      '<span class="option-icon" data-category="' + cat + '">' + icon(opt.icon, 22) + '</span>' +
      '<span class="option-text"><span class="option-label">' + opt.label + '</span>' + subtitleHTML + '</span>' +
      '<span class="option-arrow">' + icon('chevronRight', 16) + '</span>' +
    '</button>';
  }).join('');

  container.innerHTML =
    getProgressHTML() +
    '<div class="decision-step">' +
      backBtn +
      '<h2>' + step.question + '</h2>' +
      '<div class="options">' + optionsHTML + '</div>' +
    '</div>';
}

function renderResult(step, container) {
  var primaryHTML = renderServiceCards(step.primaryServices, 'Recommended');
  var secondaryHTML = renderServiceCards(step.secondaryServices, 'Also available');

  // Transport info banner
  var transportBannerHTML = '';
  if (step.transportInfo) {
    var bannerClass = 'transport-banner';
    var bannerIcon = 'truck';
    if (step.transportInfo.type === 'you-transport') {
      bannerClass += ' transport-you';
      bannerIcon = 'pin';
    } else if (step.transportInfo.type === 'team-transport') {
      bannerClass += ' transport-team';
    } else if (step.transportInfo.type === 'no-transport') {
      bannerClass += ' transport-none';
      bannerIcon = 'alertTri';
    } else if (step.transportInfo.type === 'phone-only') {
      bannerClass += ' transport-phone';
      bannerIcon = 'phone';
    } else if (step.transportInfo.type === 'emergency') {
      bannerClass += ' transport-emergency';
      bannerIcon = 'alertTri';
    } else if (step.transportInfo.type === 'transport-directory') {
      bannerClass += ' transport-team';
    }
    transportBannerHTML = '<div class="' + bannerClass + '">' +
      icon(bannerIcon, 18) +
      '<span>' + step.transportInfo.text + '</span>' +
    '</div>';
  }

  var actionsHTML = '';
  if (step.actions && step.actions.length > 0) {
    actionsHTML = '<div class="result-actions"><h3>What to do</h3><ol>';
    step.actions.forEach(function(a) {
      // Bold CAN TRANSPORT and NO TRANSPORT
      var highlighted = a
        .replace(/CAN TRANSPORT/g, '<strong class="transport-yes">CAN TRANSPORT</strong>')
        .replace(/NO TRANSPORT/g, '<strong class="transport-no">NO TRANSPORT</strong>');
      actionsHTML += '<li>' + highlightPhoneNumbers(highlighted) + '</li>';
    });
    actionsHTML += '</ol></div>';
  }

  container.innerHTML =
    getProgressHTML() +
    '<div class="decision-result">' +
      '<button class="btn-back" onclick="goBack()">' + icon('arrowLeft', 16) + ' Back</button>' +
      '<h2>' + step.title + '</h2>' +
      '<p class="result-description">' + step.description + '</p>' +
      transportBannerHTML +
      primaryHTML +
      secondaryHTML +
      actionsHTML +
      '<button class="btn-start-over" onclick="startOver()">' + icon('rotateCcw', 18) + ' Start Over</button>' +
    '</div>';
}

// ── Highlight key phone numbers ──

function highlightPhoneNumbers(text) {
  return text
    .replace(/\b(911|988|211)\b/g, '<span class="result-phone-highlight">$1</span>')
    .replace(/(\d{3}-\d{3}-\d{4})/g, '<span class="result-phone-highlight">$1</span>')
    .replace(/(780-424-2424|780-468-7070|587-686-7788|780-429-3470|780-735-4111|780-407-8822|780-496-4567|780-423-4567)/g, '<span class="result-phone-highlight">$1</span>');
}

// ── Service Cards ──

function renderServiceCards(serviceIds, sectionLabel) {
  if (!serviceIds || serviceIds.length === 0) return '';

  var cards = serviceIds.map(function(id, idx) {
    var svc = getServiceById(id);
    if (!svc) return '';
    return buildServiceCard(svc, idx);
  }).join('');

  return '<div class="result-services">' +
    '<h3 class="services-section-label">' + sectionLabel + '</h3>' +
    cards +
  '</div>';
}

function buildServiceCard(svc, idx) {
  var open = isServiceOpen(svc);
  var badgeClass = open ? 'svc-badge-open' : 'svc-badge-closed';
  var badgeText = open ? 'Open Now' : 'Closed';
  var hours = formatHours(svc);
  var accColor = getAccessibilityColor(svc.accessibility);
  var accLabel = getAccessibilityLabel(svc.accessibility);
  var delay = ((idx || 0) * 60) + 'ms';

  // Transport badge
  var transportBadgeHTML = '';
  if (svc.transport) {
    transportBadgeHTML = '<span class="svc-transport-badge transport-badge-yes">' + icon('truck', 12) + ' Transports</span>';
  } else {
    transportBadgeHTML = '<span class="svc-transport-badge transport-badge-no">Drop-off only</span>';
  }

  // Type badge
  var typeBadgeHTML = '';
  if (svc.isMobile) {
    typeBadgeHTML = '<span class="svc-type-badge type-mobile">Mobile</span>';
  } else if (svc.isDropOff) {
    typeBadgeHTML = '<span class="svc-type-badge type-dropoff">Drop-off</span>';
  }

  // Gold phone CTA button
  var phoneHTML = '';
  if (svc.phone) {
    var tel = getPhoneTel(svc.phone);
    phoneHTML = '<a href="tel:' + tel + '" class="svc-phone-cta">' +
      icon('phone', 16) + ' Call ' + svc.phone + '</a>';
  }

  var addressHTML = '';
  if (svc.address) {
    addressHTML = '<div class="svc-row">' + icon('pin', 14) +
      '<span>' + svc.address + '</span></div>';
  }

  var pilotHTML = '';
  if (svc.pilotProgram) {
    var endDate = svc.pilotEndDate
      ? new Date(svc.pilotEndDate).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
      : 'TBD';
    pilotHTML = '<div class="svc-pilot">' + icon('alertTri', 14) +
      ' Pilot \u2014 funded until ' + endDate + '</div>';
  }

  var transportHTML = '';
  if (svc.transport && svc.transportNotes) {
    transportHTML = '<div class="svc-row svc-transport-row">' + icon('truck', 14) +
      '<span>' + svc.transportNotes + '</span></div>';
  }

  // Verification indicator
  var verifyHTML = '';
  if (svc.verification) {
    if (svc.verification.status === 'verified') {
      verifyHTML = '<span class="svc-verified" title="Verified">' + icon('check', 12) + '</span>';
    } else {
      verifyHTML = '<span class="svc-unverified" title="Unverified">' + icon('alertTri', 12) + '</span>';
    }
  }

  // Operator
  var operatorHTML = '';
  if (svc.operator) {
    operatorHTML = '<div class="svc-operator">' + svc.operator + '</div>';
  }

  // Description
  var descriptionHTML = '';
  if (svc.description) {
    descriptionHTML = '<div class="svc-description">' + svc.description + '</div>';
  }

  // Who they serve
  var serves = formatServes(svc.serves);
  var servesHTML = '';
  if (serves) {
    servesHTML = '<div class="svc-serves-row">' + icon('users', 14) + ' <span>' + serves + '</span></div>';
  }

  // Coverage area (for mobile teams)
  var coverageHTML = '';
  if (svc.isMobile && svc.coverageArea) {
    coverageHTML = '<div class="svc-coverage-row">' + icon('layers', 14) + ' <span>Coverage: ' + svc.coverageArea + '</span></div>';
  }

  // Entry point
  var entryHTML = '';
  if (svc.entryPoint) {
    entryHTML = '<div class="svc-entry-row">' + icon('phone', 14) + ' <span>Access via: ' + svc.entryPoint + '</span></div>';
  }

  return '<div class="svc-card" style="animation-delay:' + delay + '">' +
    '<div class="svc-card-accent" style="background:' + accColor + '"></div>' +
    '<div class="svc-card-content">' +
      '<div class="svc-card-header">' +
        '<div class="svc-name">' + (svc.shortName || svc.name) + verifyHTML + '</div>' +
        '<span class="svc-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</div>' +
      operatorHTML +
      '<div class="svc-card-badges">' + typeBadgeHTML + transportBadgeHTML + '</div>' +
      pilotHTML +
      descriptionHTML +
      '<div class="svc-row">' + icon('clock', 14) + '<span>' + hours + '</span></div>' +
      addressHTML +
      servesHTML +
      coverageHTML +
      entryHTML +
      phoneHTML +
      transportHTML +
      '<div class="svc-access-label" style="color: ' + accColor + '">' + accLabel + '</div>' +
      (svc.accessNotes ? '<div class="svc-access-notes">' + svc.accessNotes + '</div>' : '') +
    '</div>' +
  '</div>';
}

// ── Navigation ──

function selectOption(fromStep, toStep) {
  stepHistory.push(fromStep);
  renderStep(toStep);
}

function goBack() {
  if (stepHistory.length > 0) {
    var prevStep = stepHistory.pop();
    renderStep(prevStep);
  }
}

function startOver() {
  stepHistory = [];
  renderStep('start');
}

// ── Time Controls ──

function initTimeControls() {
  var slider = document.getElementById('time-slider');
  var display = document.getElementById('time-display');
  var modeLabel = document.getElementById('time-mode');
  var resetBtn = document.getElementById('time-reset');

  // Set slider to current time
  var now = new Date();
  var currentMinutes = now.getHours() * 60 + now.getMinutes();
  slider.value = currentMinutes;
  updateTimeDisplay(display, modeLabel, now, false);

  slider.addEventListener('input', function() {
    var mins = parseInt(slider.value, 10);
    var hours = Math.floor(mins / 60);
    var minutes = mins % 60;
    var override = new Date();
    override.setHours(hours, minutes, 0, 0);
    updateTimeDisplay(display, modeLabel, override, true);
    setTimeOverride(override);
  });

  resetBtn.addEventListener('click', function() {
    clearTimeOverride();
    var now = new Date();
    slider.value = now.getHours() * 60 + now.getMinutes();
    updateTimeDisplay(display, modeLabel, now, false);
  });

  // Update live time every minute
  setInterval(function() {
    if (!timeOverride) {
      var now = new Date();
      slider.value = now.getHours() * 60 + now.getMinutes();
      updateTimeDisplay(display, modeLabel, now, false);
    }
  }, 60000);
}

function updateTimeDisplay(el, modeEl, date, isOverride) {
  var h = date.getHours();
  var m = date.getMinutes();
  var period = h >= 12 ? 'PM' : 'AM';
  var dh = h % 12;
  if (dh === 0) dh = 12;
  el.textContent = dh + ':' + String(m).padStart(2, '0') + ' ' + period;
  modeEl.textContent = isOverride ? 'Simulating' : 'Live';
  modeEl.className = isOverride ? 'time-simulating' : 'time-live';
}
