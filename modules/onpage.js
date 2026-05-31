// ============================================================
// SEO Master — On-Page Tab Module
// Renders Meta tags, Headings tree, Images, and Keywords
// ============================================================

document.addEventListener('render-onpage', (e) => {
  const data = e.detail;
  const container = document.getElementById('onpage-content');
  if (!container) return;

  const meta = data.raw.meta || {};
  const headings = data.raw.headings || [];
  const images = data.raw.images || [];
  const keywords = data.raw.textContent?.topKeywords || [];
  const issues = data.issues.filter(i => i.category === 'onpage');

  let html = `
    <!-- Issues Summary -->
    ${issues.length > 0 ? `
      <div class="fade-in">
        <div class="section-header">
          <div class="section-dot red"></div>
          <div class="section-title">On-Page Issues</div>
          <div class="section-count">${issues.length}</div>
        </div>
        <div class="issue-list animate-list" style="margin-bottom: var(--space-lg);">
          ${issues.map(i => renderIssue(i)).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Title & Description (SERP Preview) -->
    <div class="fade-in delay-1">
      <div class="section-header">
        <div class="section-dot cyan"></div>
        <div class="section-title">SERP Snippet</div>
      </div>
      <div class="score-card">
        <div class="kv-row" style="border: none; padding-bottom: 0;">
          <div style="width: 100%;">
            <div style="font-size: var(--font-xs); color: var(--text-tertiary); margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
              <img id="serp-favicon" src="${data.favicon || ''}" style="width: 12px; height: 12px; border-radius: 50%;">
              ${data.url}
            </div>
            <div style="color: #8ab4f8; font-size: 16px; font-weight: 500; margin-bottom: 4px; line-height: 1.3;">
              ${meta.title || 'Missing Title'}
            </div>
            <div style="color: var(--text-secondary); font-size: 13px; line-height: 1.5; text-overflow: ellipsis; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
              ${meta.description || 'Missing Meta Description'}
            </div>
          </div>
        </div>
        
        <div style="margin-top: var(--space-md); padding-top: var(--space-sm); border-top: 1px solid var(--glass-border);">
          <div class="kv-row">
            <span class="kv-key">Title Length</span>
            <span class="kv-value ${getLengthClass(meta.titleLength, 30, 60)}">${meta.titleLength || 0} / 60</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">Desc Length</span>
            <span class="kv-value ${getLengthClass(meta.descriptionLength, 70, 160)}">${meta.descriptionLength || 0} / 160</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Social Previews (Open Graph / Twitter) -->
    <div class="fade-in delay-1" style="margin-top: var(--space-lg);">
      <div class="section-header">
        <div class="section-dot blue"></div>
        <div class="section-title">Social Sharing Preview</div>
      </div>
      <div class="score-card" style="padding: 0; overflow: hidden; border-radius: var(--radius-md);">
        ${meta.ogImage || meta.twitterImage ? `
          <div style="width: 100%; height: 160px; background: url('${meta.ogImage || meta.twitterImage}') center/cover no-repeat; border-bottom: 1px solid var(--glass-border);"></div>
        ` : `
          <div style="width: 100%; height: 100px; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); font-size: 11px; border-bottom: 1px solid var(--glass-border);">No OG/Twitter Image Found</div>
        `}
        <div style="padding: var(--space-md); background: #f0f2f5;">
          <div style="font-size: 11px; color: #606770; text-transform: uppercase; margin-bottom: 4px;">
            ${meta.ogSiteName || new URL(data.url).hostname}
          </div>
          <div style="font-size: 14px; font-weight: 600; color: #1d2129; margin-bottom: 4px; line-height: 1.3;">
            ${meta.ogTitle || meta.twitterTitle || meta.title || 'Missing Title'}
          </div>
          <div style="font-size: 12px; color: #606770; line-height: 1.4; text-overflow: ellipsis; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;">
            ${meta.ogDescription || meta.twitterDescription || meta.description || ''}
          </div>
        </div>
      </div>
    </div>
  `;

  // (rest of html continues with headings, keywords, images sections above)
  html += `
    <!-- Heading Tree -->
    <div class="fade-in delay-2" style="margin-top: var(--space-lg);">
      <div class="section-header">
        <div class="section-dot purple"></div>
        <div class="section-title">Heading Structure</div>
        <div class="section-count">${headings.length}</div>
      </div>
      <div class="score-card" style="padding: 0;">
        <div style="max-height: 300px; overflow-y: auto; padding: var(--space-md);">
          ${headings.length > 0 
            ? headings.map(h => renderHeadingRow(h)).join('')
            : '<div class="kv-key" style="text-align: center;">No headings found</div>'
          }
        </div>
      </div>
    </div>

    <!-- Top Keywords -->
    <div class="fade-in delay-3" style="margin-top: var(--space-lg);">
      <div class="section-header">
        <div class="section-dot green"></div>
        <div class="section-title">Keyword Density (Top 10)</div>
      </div>
      <div class="score-card" style="padding: 0;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="padding-left: var(--space-md);">Keyword</th>
              <th>Count</th>
              <th style="padding-right: var(--space-md);">Density</th>
            </tr>
          </thead>
          <tbody>
            ${keywords.slice(0, 10).map(k => `
              <tr>
                <td style="padding-left: var(--space-md); color: var(--text-primary);">${k.word}</td>
                <td>${k.count}</td>
                <td style="padding-right: var(--space-md); color: var(--accent-cyan);">${k.density}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Images Summary -->
    <div class="fade-in delay-3" style="margin-top: var(--space-lg);">
      <div class="section-header">
        <div class="section-dot orange"></div>
        <div class="section-title">Images</div>
        <div class="section-count">${images.length}</div>
      </div>
      <div class="score-card">
        <div class="kv-row">
          <span class="kv-key">Total Images</span>
          <span class="kv-value">${images.length}</span>
        </div>
        <div class="kv-row">
          <span class="kv-key">Missing Alt Text</span>
          <span class="kv-value ${images.filter(img => !img.hasAlt).length > 0 ? 'poor' : 'good'}">
            ${images.filter(img => !img.hasAlt).length}
          </span>
        </div>
        <div class="kv-row">
          <span class="kv-key">Empty Alt (Decorative)</span>
          <span class="kv-value">${images.filter(img => img.hasAlt && img.alt === '').length}</span>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Handle favicon error without inline handler (CSP compliant)
  const favicon = document.getElementById('serp-favicon');
  if (favicon) {
    favicon.addEventListener('error', () => { favicon.style.display = 'none'; });
  }
});

// ── Helpers ──────────────────────────────────────────────────

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

function getLengthClass(len, min, max) {
  if (!len) return 'poor';
  if (len < min || len > max) return 'warning';
  return 'good';
}

function renderHeadingRow(h) {
  const indent = (h.level - 1) * 16;
  const color = h.level === 1 ? 'var(--accent-purple)' : 'var(--text-secondary)';
  const weight = h.level === 1 ? '700' : '500';
  
  return `
    <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; margin-left: ${indent}px; line-height: 1.3;">
      <span style="font-size: 10px; padding: 2px 4px; background: var(--glass-bg); border-radius: 4px; color: ${color}; flex-shrink: 0; margin-top: 2px;">
        ${h.tag}
      </span>
      <span style="font-size: var(--font-sm); font-weight: ${weight}; color: var(--text-primary); word-break: break-word;">
        ${h.text || '<em style="color:var(--text-tertiary)">[Empty]</em>'}
      </span>
    </div>
  `;
}
