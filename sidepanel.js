// ============================================================
// SEO Master — Side Panel Controller
// Handles UI state, tab navigation, and receiving data
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    currentTab: 'overview',
    isAnalyzing: false,
    lastData: null
  };

  // DOM Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const refreshBtn = document.getElementById('refresh-btn');
  const pageUrlEl = document.getElementById('page-url');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');

  // ── Theme Toggle ──────────────────────────────────────────────
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const sunIcon = themeToggleBtn.querySelector('.theme-icon-dark');
    const moonIcon = themeToggleBtn.querySelector('.theme-icon-light');
    if (theme === 'light') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }

  // Load saved theme on startup
  chrome.storage.local.get(['seoMasterTheme'], (res) => {
    const savedTheme = res.seoMasterTheme || 'dark';
    applyTheme(savedTheme);
  });

  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    chrome.storage.local.set({ seoMasterTheme: next });
  });

  // ── Tab Navigation ──────────────────────────────────────────
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab === state.currentTab) return;

      const switchTab = () => {
        // Update active classes
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const panelId = targetTab === 'content' ? 'panel-content-tab' : `panel-${targetTab}`;
        tabPanels.forEach(p => p.classList.remove('active'));
        const targetPanel = document.getElementById(panelId);
        if (targetPanel) targetPanel.classList.add('active');
        
        state.currentTab = targetTab;

        // Render tab content if we have data
        if (state.lastData) {
          renderCurrentTab();
        }
      };

      // Use View Transitions API if supported
      if (document.startViewTransition) {
        document.documentElement.style.viewTransitionName = 'tab-content';
        document.startViewTransition(switchTab).finished.finally(() => {
          document.documentElement.style.viewTransitionName = '';
        });
      } else {
        switchTab();
      }
    });
  });

  // ── Analysis Trigger ────────────────────────────────────────
  refreshBtn.addEventListener('click', () => {
    if (state.isAnalyzing) return;
    requestAnalysis();
  });

  function requestAnalysis() {
    setLoadingState(true);
    chrome.runtime.sendMessage({ action: 'ANALYZE_PAGE' }, (response) => {
      if (chrome.runtime.lastError || !response || response.error) {
        showError(response?.error || chrome.runtime.lastError?.message || 'Unknown error');
        setLoadingState(false);
        return;
      }
      // Success is handled via ANALYSIS_COMPLETE message from background
    });
  }

  function getCachedData() {
    setLoadingState(true);
    chrome.runtime.sendMessage({ action: 'GET_CACHED_RESULTS' }, (response) => {
      if (response && !response.error) {
        handleAnalysisData(response);
      } else {
        // If no cache, request fresh
        requestAnalysis();
      }
    });
  }

  // ── Listen for Background Updates ───────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'ANALYSIS_COMPLETE') {
      handleAnalysisData(message.data);
    }
  });

  // ── Data Handling & Rendering ───────────────────────────────
  function handleAnalysisData(data) {
    state.lastData = data;
    state.isAnalyzing = false;
    
    // Update Header
    try {
      const url = new URL(data.url);
      pageUrlEl.textContent = url.hostname + (url.pathname !== '/' ? url.pathname : '');
      pageUrlEl.title = data.url;
    } catch {
      pageUrlEl.textContent = data.url;
    }

    refreshBtn.classList.remove('spinning');
    
    // Hide all loading skeletons, show content containers
    document.querySelectorAll('.loading-state').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.panel-content').forEach(el => el.style.display = 'flex');

    renderCurrentTab();
  }

  function renderCurrentTab() {
    if (!state.lastData) return;
    
    // Dispatch custom event to notify specific tab modules
    const event = new CustomEvent(`render-${state.currentTab}`, {
      detail: state.lastData
    });
    document.dispatchEvent(event);
  }

  function setLoadingState(isLoading) {
    state.isAnalyzing = isLoading;
    if (isLoading) {
      refreshBtn.classList.add('spinning');
      document.querySelectorAll('.loading-state').forEach(el => el.style.display = 'flex');
      document.querySelectorAll('.panel-content').forEach(el => el.style.display = 'none');
      pageUrlEl.textContent = 'Analyzing page...';
    } else {
      refreshBtn.classList.remove('spinning');
    }
  }

  function showError(msg) {
    console.error('[SEO Master UI Error]', msg);
    document.querySelectorAll('.loading-state').forEach(el => el.style.display = 'none');
    
    const currentPanel = document.getElementById(`panel-${state.currentTab}`);
    const contentContainer = document.getElementById(`${state.currentTab}-content`);
    
    if (contentContainer) {
      contentContainer.style.display = 'flex';
      contentContainer.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <div class="error-title">Analysis Failed</div>
          <div class="error-desc">${msg}</div>
          <button id="retry-btn" class="btn btn-secondary" style="margin-top: 16px;">Try Again</button>
        </div>
      `;
      const retryBtn = document.getElementById('retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          document.getElementById('refresh-btn').click();
        });
      }
    }
  }

  // ── Initialization ──────────────────────────────────────────
  getCachedData();
});
