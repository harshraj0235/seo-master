// ============================================================
// SEO Master — SERP Overlay Content Script
// Injects domain metrics directly into Google search results
// ============================================================

(function() {
  'use strict';

  // Only run on Google search pages
  if (!window.location.hostname.includes('google.') || !window.location.pathname.startsWith('/search')) {
    return;
  }

  // Prevent double injection
  if (window.__seoMasterSerpInjected) return;
  window.__seoMasterSerpInjected = true;

  // Identify all organic search result links
  function injectSerpMetrics() {
    const results = document.querySelectorAll('#search .g');
    
    const domainsToFetch = [];
    const resultMap = new Map();

    results.forEach(result => {
      // Avoid injecting multiple times
      if (result.querySelector('.seo-master-serp-bar')) return;

      const linkEl = result.querySelector('a[href^="http"]');
      if (!linkEl) return;
      
      try {
        const url = new URL(linkEl.href);
        const domain = url.hostname;
        
        // Exclude google's own links or translated links
        if (domain.includes('google.') || domain === 'translate.google.com') return;

        if (!domainsToFetch.includes(domain)) {
          domainsToFetch.push(domain);
        }
        
        if (!resultMap.has(domain)) {
          resultMap.set(domain, []);
        }
        resultMap.get(domain).push(result);
        
        // Add skeleton loader UI
        appendSkeletonBar(result);

      } catch (e) {
        // invalid URL
      }
    });

    if (domainsToFetch.length > 0) {
      // Send batch request to background script
      chrome.runtime.sendMessage({
        action: 'FETCH_SERP_DOMAIN_METRICS',
        data: { domains: domainsToFetch }
      }, (response) => {
        if (response && response.success && response.results) {
          Object.keys(response.results).forEach(domain => {
            const metrics = response.results[domain];
            const resultEls = resultMap.get(domain);
            if (resultEls) {
              resultEls.forEach(el => updateBarWithMetrics(el, metrics));
            }
          });
        }
      });
    }
  }

  function appendSkeletonBar(resultEl) {
    const bar = document.createElement('div');
    bar.className = 'seo-master-serp-bar loading';
    bar.innerHTML = `
      <div class="sm-logo">SM</div>
      <div class="sm-metric"><div class="sm-skeleton" style="width: 40px;"></div></div>
      <div class="sm-metric"><div class="sm-skeleton" style="width: 40px;"></div></div>
      <div class="sm-metric"><div class="sm-skeleton" style="width: 60px;"></div></div>
      <div class="sm-metric"><div class="sm-skeleton" style="width: 50px;"></div></div>
    `;
    
    // Insert just after the link title block, or at the top of the result
    resultEl.insertBefore(bar, resultEl.firstChild);
  }

  function updateBarWithMetrics(resultEl, metrics) {
    const bar = resultEl.querySelector('.seo-master-serp-bar');
    if (!bar) return;
    
    bar.classList.remove('loading');
    bar.innerHTML = `
      <div class="sm-logo" title="SEO Master Metrics">SM</div>
      <div class="sm-metric" title="Domain Authority">
        <span class="sm-label">DA</span>
        <span class="sm-value ${metrics.da >= 60 ? 'high' : (metrics.da >= 30 ? 'med' : 'low')}">${metrics.da}</span>
      </div>
      <div class="sm-metric" title="Page Authority">
        <span class="sm-label">PA</span>
        <span class="sm-value">${metrics.pa}</span>
      </div>
      <div class="sm-metric" title="Total Backlinks">
        <span class="sm-label">Links</span>
        <span class="sm-value">${metrics.backlinks}</span>
      </div>
      <div class="sm-metric" title="Est. Monthly Traffic">
        <span class="sm-label">Traffic</span>
        <span class="sm-value traffic">${metrics.traffic}</span>
      </div>
    `;
  }

  // Initial injection
  injectSerpMetrics();

  // Re-inject on dynamic pagination (infinite scroll)
  const observer = new MutationObserver((mutations) => {
    let shouldRun = false;
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        shouldRun = true;
        break;
      }
    }
    if (shouldRun) {
      setTimeout(injectSerpMetrics, 500); // slight debounce
    }
  });

  const searchContainer = document.getElementById('search');
  if (searchContainer) {
    observer.observe(searchContainer, { childList: true, subtree: true });
  }

})();
