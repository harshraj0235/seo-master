// ============================================================
// SEO Master — Content Script
// Thin orchestrator: uses SEOExtractor + WebVitalsCollector
// Responds to messages from the service worker
// ============================================================

(function() {
  'use strict';

  // Prevent double injection
  if (window.__seoMasterInjected) return;
  window.__seoMasterInjected = true;

  let liveMonitoringEnabled = false;
  let observer = null;
  let debounceTimer = null;

  function runExtraction() {
    try {
      // If the extension was reloaded, the context is invalidated.
      if (!chrome.runtime?.id) {
        stopLiveMonitoring();
        return;
      }
      
      const data = SEOExtractor.extractAll();
      data.webVitals = WebVitalsCollector.getMetrics();
      chrome.runtime.sendMessage({
        action: 'DOM_DATA_READY',
        data
      }).catch(() => { /* extension context may not be ready */ });
    } catch (err) {
      const errorStr = String(err?.message || err);
      if (errorStr.includes('Extension context invalidated') || errorStr.includes('context invalidated')) {
        stopLiveMonitoring();
      } else {
        console.error('[SEO Master] Auto-extract error:', err);
      }
    }
  }

  function startLiveMonitoring() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      // Basic check to see if we should trigger
      const hasSignificantChanges = mutations.some(m => 
        m.type === 'childList' || 
        (m.type === 'attributes' && (m.attributeName === 'alt' || m.attributeName === 'href' || m.attributeName === 'content'))
      );
      if (!hasSignificantChanges) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        runExtraction();
      }, 2000);
    });
    
    if (document.body) observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['alt', 'href'] });
    if (document.head) observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['content'] });
  }

  function stopLiveMonitoring() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    clearTimeout(debounceTimer);
  }

  // ── Message Listener ────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'EXTRACT_SEO_DATA') {
      try {
        const data = SEOExtractor.extractAll();
        // Attach web vitals
        data.webVitals = WebVitalsCollector.getMetrics();
        sendResponse({ data });
      } catch (err) {
        console.error('[SEO Master] Extraction error:', err);
        sendResponse({ error: err.message });
      }
      return true;
    } else if (message.action === 'SET_LIVE_MONITORING') {
      liveMonitoringEnabled = message.enabled;
      if (liveMonitoringEnabled) {
        startLiveMonitoring();
      } else {
        stopLiveMonitoring();
      }
      sendResponse({ success: true });
    }
  });

  // ── Auto-extract on load (send to background) ──────────────
  // Wait a moment for Web Vitals to accumulate
  setTimeout(() => {
    runExtraction();
    chrome.storage.local.get(['liveMonitoring'], (res) => {
      if (res.liveMonitoring) {
        liveMonitoringEnabled = true;
        startLiveMonitoring();
      }
    });
  }, 2000);
})();
