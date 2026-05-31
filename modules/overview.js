// ============================================================
// SEO Master — Overview Tab Module
// Renders the main dashboard with score gauges and recommendations
// ============================================================

document.addEventListener('render-overview', (e) => {
  const data = e.detail;
  const container = document.getElementById('overview-content');
  if (!container) return;

  const { scores, summary, recommendations } = data;

  const html = `
    <!-- Top Level Score & Live Monitor -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
      <div style="font-size: var(--font-lg); font-weight: 700; color: var(--text-primary);">Dashboard</div>
      <button id="btn-live-monitor" class="btn btn-secondary" style="padding: 4px 10px; font-size: 10px; border-radius: var(--radius-full);">
        <span class="live-dot" style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--text-tertiary); margin-right: 4px; transition: background 0.3s;"></span>
        Live Monitor: OFF
      </button>
    </div>

    <!-- Top Level Score -->
    <div class="score-card fade-in">
      <div class="score-card-header">
        <span class="score-card-title">OVERALL SEO SCORE</span>
        <span class="score-value ${getScoreClass(scores.overall)}">${scores.overall}</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill ${getScoreClass(scores.overall)}" style="width: ${scores.overall}%"></div>
      </div>
    </div>

    <!-- 4 Gauges Grid -->
    <div class="skeleton-scores fade-in delay-1" style="margin-top: -8px;">
      ${renderGauge('On-Page', scores.onPage, getScoreClass(scores.onPage))}
      ${renderGauge('Technical', scores.technical, getScoreClass(scores.technical))}
      ${renderGauge('Content', scores.content, getScoreClass(scores.content))}
      ${renderGauge('AI / GEO', scores.aiGeo, getScoreClass(scores.aiGeo))}
    </div>

    <!-- Recommendations -->
    <div class="fade-in delay-2" style="margin-top: 8px;">
      <div class="section-header">
        <div class="section-dot red"></div>
        <div class="section-title">Critical Recommendations</div>
        <div class="section-count">${summary.critical} issues</div>
      </div>
      <div class="issue-list animate-list">
        ${recommendations.length > 0 
          ? recommendations.map(rec => renderRecommendation(rec)).join('')
          : '<div class="issue-item"><div class="issue-icon success">✓</div><div class="issue-content"><div class="issue-title">Looking Good!</div><div class="issue-desc">No critical SEO issues found on this page.</div></div></div>'
        }
      </div>
      <button class="btn btn-primary btn-full" id="btn-view-issues" style="justify-content: space-between;">
        View Detailed Report <span>→</span>
      </button>
    </div>

    <!-- Authority & Traffic Metrics -->
    <div class="fade-in delay-2" style="margin-top: var(--space-lg);">
      <div class="section-header">
        <div class="section-dot blue"></div>
        <div class="section-title">Domain Authority & Traffic</div>
      </div>
      <div class="score-card" style="padding: var(--space-sm);">
        <div id="domain-metrics-container" style="display: flex; justify-content: space-between; align-items: center; text-align: center;">
          <div style="flex: 1; padding: 4px;">
            <div style="font-size: 10px; color: var(--text-tertiary); margin-bottom: 4px;">Domain Auth</div>
            <div id="metric-da" style="font-size: 18px; font-weight: 700; color: var(--text-primary);">-</div>
          </div>
          <div style="width: 1px; height: 30px; background: var(--glass-border);"></div>
          <div style="flex: 1; padding: 4px;">
            <div style="font-size: 10px; color: var(--text-tertiary); margin-bottom: 4px;">Page Auth</div>
            <div id="metric-pa" style="font-size: 18px; font-weight: 700; color: var(--text-primary);">-</div>
          </div>
          <div style="width: 1px; height: 30px; background: var(--glass-border);"></div>
          <div style="flex: 1; padding: 4px;">
            <div style="font-size: 10px; color: var(--text-tertiary); margin-bottom: 4px;">Backlinks</div>
            <div id="metric-bl" style="font-size: 16px; font-weight: 600; color: var(--accent-cyan);">-</div>
          </div>
          <div style="width: 1px; height: 30px; background: var(--glass-border);"></div>
          <div style="flex: 1; padding: 4px;">
            <div style="font-size: 10px; color: var(--text-tertiary); margin-bottom: 4px;">Traffic /mo</div>
            <div id="metric-tr" style="font-size: 16px; font-weight: 600; color: var(--color-success);">-</div>
          </div>
        </div>
      </div>
    </div>

    <!-- SEO Trend History -->
    <div class="fade-in delay-2" style="margin-top: var(--space-lg);">
      <div class="section-header">
        <div class="section-dot purple"></div>
        <div class="section-title">Score History</div>
      </div>
      <div class="score-card" style="padding: var(--space-md); text-align: center;">
        <div id="trend-chart-container" style="height: 60px; display: flex; align-items: flex-end; justify-content: space-between; gap: 4px;">
          <div style="font-size: 11px; color: var(--text-tertiary); width: 100%;">Loading...</div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Trigger SVG gauge animations after a tiny delay
  setTimeout(() => {
    container.querySelectorAll('.gauge-fill').forEach(fill => {
      const score = parseInt(fill.getAttribute('data-score'));
      const offset = 283 - (283 * (score / 100));
      fill.style.strokeDashoffset = offset;
    });
  }, 50);

  // Fetch Domain Metrics
  const targetUrl = data.url || (data.raw && data.raw.url) || '';
  const domain = (() => { try { return new URL(targetUrl).hostname; } catch(err) { return targetUrl; } })();
  
  chrome.runtime.sendMessage({
    action: 'FETCH_DOMAIN_METRICS',
    data: { domain }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[SEO Master] FETCH_DOMAIN_METRICS lastError:', chrome.runtime.lastError);
    }
    console.log('[SEO Master] FETCH_DOMAIN_METRICS response:', response);
    
    if (response && response.success) {
      const { da, pa, backlinks, traffic } = response.metrics;
      document.getElementById('metric-da').textContent = da;
      document.getElementById('metric-pa').textContent = pa;
      document.getElementById('metric-bl').textContent = backlinks;
      document.getElementById('metric-tr').textContent = traffic;
    } else {
      console.error('[SEO Master] FETCH_DOMAIN_METRICS failed or invalid response.');
      document.getElementById('metric-da').textContent = 'N/A';
      document.getElementById('metric-pa').textContent = 'N/A';
      document.getElementById('metric-bl').textContent = 'N/A';
      document.getElementById('metric-tr').textContent = 'N/A';
    }
  });

  // Live Monitor Toggle Logic
  const btnLiveMonitor = document.getElementById('btn-live-monitor');
  const liveDot = btnLiveMonitor.querySelector('.live-dot');

  // Initialize state from storage
  chrome.storage.local.get(['liveMonitoring'], (res) => {
    if (res.liveMonitoring) {
      setLiveMonitorUI(true);
    }
  });

  function setLiveMonitorUI(enabled) {
    if (enabled) {
      btnLiveMonitor.innerHTML = '<span class="live-dot" style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--color-success); margin-right: 4px; box-shadow: 0 0 8px var(--color-success);"></span>Live Monitor: ON';
      btnLiveMonitor.style.borderColor = 'var(--color-success)';
      btnLiveMonitor.style.color = 'var(--color-success)';
    } else {
      btnLiveMonitor.innerHTML = '<span class="live-dot" style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--text-tertiary); margin-right: 4px;"></span>Live Monitor: OFF';
      btnLiveMonitor.style.borderColor = '';
      btnLiveMonitor.style.color = '';
    }
  }

  btnLiveMonitor.addEventListener('click', async () => {
    const res = await chrome.storage.local.get(['liveMonitoring']);
    const newState = !res.liveMonitoring;
    
    await chrome.storage.local.set({ liveMonitoring: newState });
    setLiveMonitorUI(newState);
    
    // Notify active tab to start/stop observing
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'SET_LIVE_MONITORING', enabled: newState }).catch(() => {});
    }
  });

  // Render History Chart
  const trendContainer = document.getElementById('trend-chart-container');
  if (trendContainer) {
    chrome.storage.local.get(['seoHistory'], (res) => {
      const history = res.seoHistory || {};
      const domain = (() => { try { return new URL(data.url).hostname; } catch(err) { return data.url; } })();
      const domainHistory = history[domain] || [];

      if (domainHistory.length < 2) {
        trendContainer.innerHTML = '<div style="font-size: 11px; color: var(--text-tertiary); width: 100%;">Not enough history yet. Run audits over time to see trends.</div>';
        return;
      }

      let chartHtml = '';
      domainHistory.forEach(entry => {
        const height = entry.score + '%';
        const color = entry.score >= 80 ? 'var(--color-success)' : (entry.score >= 50 ? 'var(--color-warning)' : 'var(--color-error)');
        const dateStr = new Date(entry.date).toLocaleDateString();
        chartHtml += `
          <div title="Score: ${entry.score} on ${dateStr}" style="flex: 1; background: ${color}; height: ${height}; min-height: 5px; border-radius: 2px 2px 0 0; opacity: 0.8; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.8"></div>
        `;
      });
      trendContainer.innerHTML = chartHtml;
    });
  }

  // "View Detailed Report" → switch to On-Page tab
  const btnViewIssues = document.getElementById('btn-view-issues');
  if (btnViewIssues) {
    btnViewIssues.addEventListener('click', () => {
      const onpageTab = document.getElementById('tab-btn-onpage');
      if (onpageTab) onpageTab.click();
    });
  }
});

// ── Helpers ──────────────────────────────────────────────────

function getScoreClass(score) {
  if (score >= 80) return 'good';
  if (score >= 50) return 'warning';
  return 'poor';
}

function renderGauge(label, score, typeClass) {
  return `
    <div class="score-card" style="padding: var(--space-sm); align-items: center;">
      <div class="gauge-container">
        <svg class="gauge-svg" viewBox="0 0 100 100">
          <path class="gauge-bg" d="M 10 50 A 40 40 0 1 1 90 50" />
          <path class="gauge-fill ${typeClass}" data-score="${score}" d="M 10 50 A 40 40 0 1 1 90 50" />
        </svg>
        <div class="gauge-text">
          <span class="gauge-score ${typeClass}">${score}</span>
        </div>
      </div>
      <span class="gauge-label">${label}</span>
    </div>
  `;
}

function renderRecommendation(rec) {
  const iconClass = rec.priority === 'high' ? 'critical' : 'warning';
  const iconSymbol = rec.priority === 'high' ? '!' : '⚠';
  
  return `
    <div class="issue-item">
      <div class="issue-icon ${iconClass}">${iconSymbol}</div>
      <div class="issue-content">
        <div class="issue-title">${rec.title}</div>
        <div class="issue-fix">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M12.5 4.5l-6 6-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          ${rec.action}
        </div>
      </div>
    </div>
  `;
}
