// ============================================================
// SEO Master — Content Audit Tab Module
// Renders Readability, Links, Thin Content checks
// ============================================================

document.addEventListener('render-content', (e) => {
  const data = e.detail;
  const container = document.getElementById('content-tab-content');
  if (!container) return;

  const text = data.raw.textContent || {};
  const links = data.raw.links || { internal: [], external: [], total: 0 };
  const issues = data.issues.filter(i => i.category === 'content');

  // Readability
  const grade = text.readability?.gradeLevel || 0;
  const ease = text.readability?.readingEase || 0;
  let gradeClass = 'good';
  if (grade > 12) gradeClass = 'warning';
  if (grade > 16) gradeClass = 'poor';

  // Links
  const totalLinks = links.total;
  const internalRatio = totalLinks > 0 ? ((links.internal.length / totalLinks) * 100).toFixed(0) : 0;
  
  let html = `
    <!-- Issues Summary -->
    ${issues.length > 0 ? `
      <div class="fade-in">
        <div class="section-header">
          <div class="section-dot red"></div>
          <div class="section-title">Content Issues</div>
          <div class="section-count">${issues.length}</div>
        </div>
        <div class="issue-list animate-list" style="margin-bottom: var(--space-lg);">
          ${issues.map(i => renderIssue(i)).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Readability & Depth -->
    <div class="fade-in delay-1">
      <div class="section-header">
        <div class="section-dot cyan"></div>
        <div class="section-title">Readability & Depth</div>
      </div>
      <div class="score-card">
        <div class="kv-row">
          <span class="kv-key">Word Count</span>
          <span class="kv-value ${text.wordCount < 300 ? 'poor' : 'good'}">
            ${text.wordCount} words
          </span>
        </div>
        <div class="kv-row">
          <span class="kv-key">Estimated Reading Time</span>
          <span class="kv-value">${text.readingTimeMinutes} min</span>
        </div>
        <div class="kv-row" style="margin-top: 8px; border-top: 1px solid var(--glass-border); padding-top: 12px;">
          <span class="kv-key">Flesch-Kincaid Grade</span>
          <span class="kv-value ${gradeClass}">${grade.toFixed(1)}</span>
        </div>
        <div class="kv-row">
          <span class="kv-key">Reading Ease (0-100)</span>
          <span class="kv-value">${ease.toFixed(1)}</span>
        </div>
        
        <!-- Explanation -->
        <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 12px; line-height: 1.4; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
          ${grade <= 8 ? 'Very easy to read. Easily understood by a 13-year-old.' : 
            grade <= 12 ? 'Conversational English. Easily understood by most adults.' : 
            grade <= 16 ? 'Fairly difficult to read. Requires some college education.' : 
            'Very difficult to read. Academic or highly technical.'}
        </div>
      </div>
    </div>

    <!-- Link Analysis -->
    <div class="fade-in delay-2" style="margin-top: var(--space-lg);">
      <div class="section-header">
        <div class="section-dot purple"></div>
        <div class="section-title">Link Profile (On-Page)</div>
        <div class="section-count">${totalLinks}</div>
      </div>
      <div class="score-card">
        <!-- Visual Ratio Bar -->
        <div style="display: flex; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 12px;">
          <div style="width: ${internalRatio}%; background: var(--accent-cyan);" title="Internal: ${internalRatio}%"></div>
          <div style="width: ${100 - internalRatio}%; background: var(--accent-purple);" title="External: ${100 - internalRatio}%"></div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary); margin-bottom: 16px;">
          <span style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-cyan);"></span>
            Internal (${links.internal.length})
          </span>
          <span style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-purple);"></span>
            External (${links.external.length})
          </span>
        </div>

        <div class="kv-row">
          <span class="kv-key">Internal Links</span>
          <span class="kv-value ${links.internal.length === 0 ? 'poor' : 'good'}">${links.internal.length}</span>
        </div>
        <div class="kv-row">
          <span class="kv-key">External Links</span>
          <span class="kv-value">${links.external.length}</span>
        </div>
        
        ${links.external.filter(l => l.isNofollow).length > 0 ? `
          <div class="kv-row">
            <span class="kv-key">Nofollow Links</span>
            <span class="kv-value">${links.external.filter(l => l.isNofollow).length}</span>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- AI Rewrite Tool -->
    <div class="fade-in delay-3" style="margin-top: var(--space-lg);">
      <div class="section-header">
        <div class="section-dot pink" style="background: var(--accent-pink);"></div>
        <div class="section-title" style="color: var(--accent-pink);">AI Copywriter</div>
      </div>
      <div style="background: rgba(236, 72, 153, 0.1); border: 1px solid var(--glass-border); border-radius: var(--radius-md); padding: var(--space-md);">
        <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: 8px;">
          Paste a thin or poorly written paragraph to rewrite it for better SEO.
        </div>
        <textarea id="ai-rewrite-input" placeholder="Paste text here..." style="width: 100%; height: 60px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); border-radius: 4px; padding: 6px; color: var(--text-primary); font-size: 11px; outline: none; margin-bottom: 8px; resize: vertical;"></textarea>
        <button id="btn-run-rewrite" class="btn btn-primary" style="width: 100%; font-size: 11px; padding: 6px 12px; background: var(--gradient-brand);">Rewrite with AI</button>
        <div id="rewrite-result-container" style="display: none; margin-top: 12px;">
          <div style="font-size: 10px; color: var(--accent-pink); margin-bottom: 4px;">AI Suggestion:</div>
          <div id="ai-rewrite-result" style="font-size: 11px; color: var(--text-primary); line-height: 1.5; background: rgba(0,0,0,0.4); padding: 8px; border-radius: 4px; border-left: 2px solid var(--accent-pink);"></div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // AI Rewrite Logic
  const btnRewrite = document.getElementById('btn-run-rewrite');
  const inputRewrite = document.getElementById('ai-rewrite-input');
  const resultContainer = document.getElementById('rewrite-result-container');
  const resultRewrite = document.getElementById('ai-rewrite-result');

  if (btnRewrite && inputRewrite) {
    btnRewrite.addEventListener('click', () => {
      const text = inputRewrite.value.trim();
      if (!text) return;

      btnRewrite.disabled = true;
      btnRewrite.textContent = '...';
      resultContainer.style.display = 'block';
      resultRewrite.innerHTML = '<div class="skeleton-card short" style="height: 40px;"></div>';

      chrome.runtime.sendMessage({
        action: 'FETCH_AI_REWRITE',
        data: { text: text }
      }, (response) => {
        btnRewrite.disabled = false;
        btnRewrite.textContent = 'Rewrite with AI';

        if (response && response.success && response.result) {
          resultRewrite.innerHTML = response.result.replace(/\n/g, '<br/>');
        } else {
          resultRewrite.innerHTML = `<span style="color: var(--color-error);">Failed to generate rewrite.</span>`;
        }
      });
    });
  }
});

function renderIssue(issue) {
  const iconClass = issue.severity === 'critical' ? 'critical' : 'warning';
  const iconSymbol = issue.severity === 'critical' ? '!' : '⚠';
  
  return `
    <div class="issue-item">
      <div class="issue-icon ${iconClass}">${iconSymbol}</div>
      <div class="issue-content">
        <div class="issue-title">${issue.title}</div>
        <div class="issue-desc">${issue.description}</div>
      </div>
    </div>
  `;
}
