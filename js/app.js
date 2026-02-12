/**
 * app.js — Main Application Controller
 *
 * Handles:
 * - Loading service data
 * - Tab switching with SVG icons + gold sliding indicator
 * - View Transitions API (progressive enhancement)
 * - Initializing all modules
 * - Global time management
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Load service data first
  await loadServices();

  // Set tab icons (icons.js must be loaded)
  initTabIcons();

  // Initialize all modules
  initMap();
  initDecisionTree();
  initConnections();

  // Set up tab switching
  initTabs();

  // Start time updates
  startTimeUpdates();
});

function initTabIcons() {
  var tabIcons = {
    'map': 'mapPin',
    'decision-tree': 'compass',
    'connections': 'gitMerge'
  };
  Object.keys(tabIcons).forEach(function(tabId) {
    var el = document.querySelector('[data-tab="' + tabId + '"] .tab-icon');
    if (el) el.innerHTML = icon(tabIcons[tabId], 24);
  });
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');
  const indicator = document.querySelector('.tab-indicator');

  // Position indicator on initial active tab
  updateTabIndicator(indicator);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = `tab-${tab.dataset.tab}`;

      // Use View Transitions API if available (progressive enhancement)
      var switchFn = function() {
        // Update tab states
        tabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        // Update panel visibility
        panels.forEach(p => p.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        // Slide indicator
        updateTabIndicator(indicator);

        // Invalidate map size when switching to map tab (Leaflet needs this)
        if (tab.dataset.tab === 'map' && map) {
          setTimeout(() => map.invalidateSize(), 100);
        }
      };

      if (document.startViewTransition) {
        document.startViewTransition(switchFn);
      } else {
        switchFn();
      }
    });
  });

  // Reposition indicator on resize
  window.addEventListener('resize', function() {
    updateTabIndicator(indicator);
  });
}

function updateTabIndicator(indicator) {
  if (!indicator) return;
  var activeTab = document.querySelector('.tab.active');
  if (!activeTab) return;
  var tabBar = activeTab.parentElement;
  var barRect = tabBar.getBoundingClientRect();
  var tabRect = activeTab.getBoundingClientRect();
  indicator.style.left = (tabRect.left - barRect.left) + 'px';
  indicator.style.width = tabRect.width + 'px';
}

function startTimeUpdates() {
  // Update open/closed badges every minute if using live time
  setInterval(() => {
    if (!timeOverride) {
      document.dispatchEvent(new CustomEvent('timechange', { detail: { time: new Date() } }));
    }
  }, 60000);
}
