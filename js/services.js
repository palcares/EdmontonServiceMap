/**
 * services.js — Service Data Loader & Time-Aware Helpers
 *
 * Loads data/services.json and provides utility functions for:
 * - Checking if a service is currently open
 * - Filtering services by category, accessibility, etc.
 * - Getting drop-off locations vs mobile teams
 * - Formatting hours, phone numbers, serves labels
 */

let servicesData = [];
let timeOverride = null; // null = use real time, Date object = use override

async function loadServices() {
  try {
    const response = await fetch('data/services.json');
    servicesData = await response.json();
    return servicesData;
  } catch (err) {
    console.error('Failed to load services data:', err);
    return [];
  }
}

function getCurrentTime() {
  return timeOverride || new Date();
}

function setTimeOverride(date) {
  timeOverride = date;
  document.dispatchEvent(new CustomEvent('timechange', { detail: { time: getCurrentTime() } }));
}

function clearTimeOverride() {
  timeOverride = null;
  document.dispatchEvent(new CustomEvent('timechange', { detail: { time: getCurrentTime() } }));
}

/**
 * Check if a service is currently open
 */
function isServiceOpen(service, atTime) {
  const now = atTime || getCurrentTime();

  if (service.hours.type === '24/7') return true;

  if (service.hours.type === 'seasonal') {
    // Bus Connect: winter = 24/7, normal = M-F 11:30-7:30
    // For the demo, check the normal schedule (non-winter)
    // Winter months: Nov-Mar
    const month = now.getMonth(); // 0-indexed
    if (month >= 10 || month <= 2) {
      // Winter — check winterSchedule if available
      if (service.hours.winterSchedule && service.hours.winterSchedule.type === '24/7') {
        return true;
      }
    }
    // Fall through to check regular schedule
  }

  if (!service.hours.schedule) return false;

  const dayName = now.toLocaleDateString('en-CA', { weekday: 'long' });
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return service.hours.schedule.some(slot => {
    if (!slot.days.includes(dayName)) return false;
    const openMinutes = Math.floor(slot.open / 100) * 60 + (slot.open % 100);
    const closeMinutes = Math.floor(slot.close / 100) * 60 + (slot.close % 100);

    // Handle overnight hours (e.g., COTT 6:00-2:00)
    if (closeMinutes < openMinutes) {
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    }
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  });
}

// ── Filters ──

function getDropOffLocations() {
  return servicesData.filter(s => s.isDropOff);
}

function getMobileTeams() {
  return servicesData.filter(s => s.isMobile);
}

function getServicesByCategory(category) {
  return servicesData.filter(s => s.category === category);
}

function getServiceById(id) {
  return servicesData.find(s => s.id === id);
}

function getPilotPrograms() {
  return servicesData.filter(s => s.pilotProgram);
}

function getPublicServices() {
  return servicesData.filter(s => s.accessibility === 'public' || s.accessibility === 'public-criteria');
}

// ── Formatting Helpers ──

function formatTime(timeNum) {
  let hours = Math.floor(timeNum / 100);
  const minutes = timeNum % 100;
  if (hours === 24) hours = 0;
  const period = hours >= 12 ? 'pm' : 'am';
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  if (minutes === 0) return displayHours + period;
  return displayHours + ':' + String(minutes).padStart(2, '0') + period;
}

function formatDays(days) {
  if (days.length === 7) return 'Daily';
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const weekend = ['Saturday', 'Sunday'];
  if (days.length === 5 && weekdays.every(d => days.includes(d))) return 'Mon\u2013Fri';
  if (days.length === 2 && weekend.every(d => days.includes(d))) return 'Sat\u2013Sun';
  const abbr = {
    Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
    Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun'
  };
  return days.map(d => abbr[d] || d).join(', ');
}

function formatHours(service) {
  if (service.hours.type === '24/7') return 'Open 24/7';

  if (service.hours.type === 'seasonal') {
    const parts = [];
    if (service.hours.winterSchedule) {
      parts.push('Winter: 24/7');
    }
    if (service.hours.schedule) {
      const normal = service.hours.schedule.map(slot =>
        formatDays(slot.days) + ' ' + formatTime(slot.open) + '\u2013' + formatTime(slot.close)
      ).join(', ');
      parts.push('Normal: ' + normal);
    }
    return parts.join(' · ') || 'Seasonal hours';
  }

  if (!service.hours.schedule) return 'Hours not available';

  return service.hours.schedule.map(slot =>
    formatDays(slot.days) + ' ' + formatTime(slot.open) + '\u2013' + formatTime(slot.close)
  ).join(', ');
}

function formatServes(serves) {
  if (!serves || serves.length === 0) return '';
  if (serves.includes('all')) return 'Everyone';

  const labels = [];
  if (serves.includes('adult-men')) {
    labels.push('Adult men');
  } else if (serves.includes('adults') && serves.includes('youth')) {
    labels.push('Adults & youth');
  } else if (serves.includes('adults')) {
    labels.push('All adults');
  } else if (serves.includes('youth')) {
    labels.push('Youth (15\u201324)');
  }
  if (serves.includes('indigenous')) {
    labels.push('Indigenous community');
  }
  return labels.join(' · ') || serves.join(', ');
}

/**
 * Extract a dialable phone href from a display string
 * "211 (press 3)" → "211"
 * "780-429-3470" → "7804293470"
 */
function getPhoneTel(phone) {
  if (!phone) return '';
  const mainPart = phone.split('(')[0].trim();
  return mainPart.replace(/[^\d+]/g, '');
}

/**
 * Get the color associated with an accessibility level
 */
function getAccessibilityColor(accessibility) {
  switch (accessibility) {
    case 'public': return '#d97706';         // warm amber
    case 'public-criteria': return '#16a34a'; // green
    case 'restricted': return '#0d9488';      // teal
    case 'unknown': return '#ef4444';         // red
    default: return '#6b7280';                // gray
  }
}

function getAccessibilityLabel(accessibility) {
  switch (accessibility) {
    case 'public': return 'Publicly accessible';
    case 'public-criteria': return 'Public — specific criteria';
    case 'restricted': return 'Restricted / referral only';
    case 'unknown': return 'Status uncertain';
    default: return '';
  }
}

// ── New helpers for functional redesign ──

function getTransportServices() {
  return servicesData.filter(function(s) { return s.transport && !s.parentService; });
}

function getTopLevelMobileTeams() {
  return servicesData.filter(function(s) { return s.isMobile && !s.parentService; });
}

function getVerificationSummary() {
  var total = servicesData.length;
  var verified = servicesData.filter(function(s) {
    return s.verification && s.verification.status === 'verified';
  }).length;
  var unverified = servicesData.filter(function(s) {
    return !s.verification || s.verification.status === 'unverified';
  });
  return { total: total, verified: verified, pct: total > 0 ? Math.round((verified / total) * 100) : 0, unverified: unverified };
}

function getAllServices() {
  return servicesData;
}

// ── Category & Tag Formatting ──

function formatCategory(category) {
  if (!category) return '';
  var map = {
    'crisis-response': 'Crisis Response',
    'mental-health': 'Mental Health',
    'shelter': 'Shelter',
    'drop-in': 'Drop-In',
    'detox': 'Detox',
    'crisis-stabilization': 'Crisis Stabilization',
    'healthcare': 'Healthcare',
    'hospital': 'Hospital',
    'housing': 'Housing',
    'transport': 'Transport',
    'outreach': 'Outreach',
    'enforcement': 'Enforcement',
    'encampment': 'Encampment',
    'navigation': 'Navigation',
    'bia': 'BIA Patrol'
  };
  return map[category] || category.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

function getCategoryClass(category) {
  if (!category) return 'cat-default';
  var map = {
    'crisis-response': 'cat-crisis',
    'mental-health': 'cat-mental-health',
    'shelter': 'cat-shelter',
    'drop-in': 'cat-dropin',
    'detox': 'cat-detox',
    'crisis-stabilization': 'cat-crisis',
    'healthcare': 'cat-healthcare',
    'hospital': 'cat-hospital',
    'housing': 'cat-housing',
    'transport': 'cat-transport',
    'outreach': 'cat-outreach',
    'enforcement': 'cat-enforcement',
    'encampment': 'cat-encampment',
    'navigation': 'cat-navigation',
    'bia': 'cat-bia'
  };
  return map[category] || 'cat-default';
}

function formatServiceTag(slug) {
  if (!slug) return '';
  var map = {
    'crisis-response': 'Crisis Response',
    'wellness-checks': 'Wellness Checks',
    'transport-to-services': 'Transport',
    'referral': 'Referral',
    'harm-reduction': 'Harm Reduction',
    'emergency-shelter': 'Emergency Shelter',
    'meals': 'Meals',
    'case-management': 'Case Management',
    'drop-in': 'Drop-In',
    'health-services': 'Health Services',
    'housing-support': 'Housing Support',
    'needle-exchange': 'Needle Exchange',
    'outreach': 'Outreach',
    'addictions-support': 'Addictions Support',
    'transit-outreach': 'Transit Outreach',
    'safety': 'Safety',
    'transport': 'Transport',
    'by-law-enforcement': 'By-Law',
    'encampment-response': 'Encampment Response',
    'clean-up': 'Clean-Up',
    'emergency-response': 'Emergency Response',
    'community-engagement': 'Community Engagement',
    'navigation': 'Navigation',
    'medical-care': 'Medical Care',
    'crisis-intervention': 'Crisis Intervention',
    'in-home-care': 'In-Home Care',
    'medical-assessment': 'Medical Assessment',
    'mental-health': 'Mental Health',
    'addiction-support': 'Addiction Support',
    'assessment': 'Assessment',
    'mental-health-assessment': 'MH Assessment',
    'mental-health-act-apprehension': 'MH Act',
    'mental-health-crisis': 'MH Crisis',
    'medical-transport': 'Medical Transport',
    'hospital-discharge-support': 'Discharge Support',
    'warming-shelter': 'Warming Shelter',
    'accessible-transport': 'Accessible Transit',
    'safety-patrol': 'Safety Patrol',
    'detox': 'Detox',
    'sobering': 'Sobering',
    'crisis-stabilization': 'Crisis Stabilization',
    'short-term-residential': 'Short-Term Residential',
    'permanent-housing': 'Permanent Housing',
    'cultural-support': 'Cultural Support',
    'managed-substances': 'Managed Substances',
    'emergency-medical': 'Emergency Medical',
    'psychiatric-emergency': 'Psychiatric Emergency',
    'youth-services': 'Youth Services',
    'suicide-prevention': 'Suicide Prevention',
    'mental-health-support': 'MH Support'
  };
  return map[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

function getConnectedServices(service) {
  if (!service.connections || service.connections.length === 0) return [];
  return service.connections.map(function(cid) {
    var s = getServiceById(cid);
    return s ? { id: s.id, name: s.shortName || s.name } : null;
  }).filter(Boolean);
}

function getVerificationInfo(service) {
  if (!service.verification) return { status: 'unverified', label: 'Unverified', confidence: 'low' };
  return {
    status: service.verification.status || 'unverified',
    label: service.verification.status === 'verified' ? 'Verified' : 'Unverified',
    confidence: service.verification.confidence || 'low'
  };
}

function getPilotDaysRemaining(service) {
  if (!service.pilotProgram || !service.pilotEndDate) return null;
  var end = new Date(service.pilotEndDate);
  var now = getCurrentTime();
  var diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function getServicesByOperator() {
  var groups = {};
  servicesData.forEach(function(s) {
    var op = s.operator || 'Unknown';
    if (!groups[op]) groups[op] = [];
    groups[op].push(s);
  });
  return groups;
}

function getUniqueCategories() {
  var cats = {};
  servicesData.forEach(function(s) {
    if (s.category) cats[s.category] = true;
  });
  return Object.keys(cats).sort();
}
