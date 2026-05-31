// ============================================================
// SEO Master — AI & GEO Tab Module
// Renders Generative Engine Optimization score and readiness
// ============================================================

document.addEventListener('render-aigeo', (e) => {
  const data = e.detail;
  const container = document.getElementById('aigeo-content');
  if (!container) return;

  const score = data.scores.aiGeo || 0;
  const issues = data.issues.filter(i => i.category === 'aigeo');
  
  // Extract specific signals we checked in background.js
  const schema = data.raw.schema || [];
  const text = data.raw.textContent || {};
  const content = text.fullText || '';
  const headings = data.raw.headings || [];

  const hasSchema = schema.length > 0;
  const hasNumbers = /\\d+(\\.\\d+)?%|\\$[\\d,]+/.test(content);
  const hasQuotes = /[""].*?[""]/.test(content) || /<blockquote/i.test(content);
  const hasDefinitions = headings.some(h => /what is|definition|meaning/i.test(h.text));
  const hasShortParagraphs = content.split(/\\n\\n+/).filter(p => p.length > 50 && p.length < 300).length >= 3;
  
  let html = `
    <!-- Top Level Score -->
    <div class="score-card fade-in" style="margin-bottom: var(--space-lg);">
      <div style="display: flex; gap: var(--space-md); align-items: center;">
        <div style="width: 80px;">
          ${renderMiniGauge(score, getScoreClass(score))}
        </div>
        <div>
          <div style="font-size: var(--font-xl); font-weight: 700; background: var(--gradient-brand); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">GEO Readiness</div>
          <div style="font-size: var(--font-xs); color: var(--text-tertiary); margin-top: 4px;">
            Optimized for AI Overviews, ChatGPT, and Perplexity
          </div>
        </div>
      </div>
    </div>

    <!-- AI Issues / Recommendations -->
    ${issues.length > 0 ? `
      <div class="fade-in delay-1">
        <div class="section-header">
          <div class="section-dot purple"></div>
          <div class="section-title">AI Optimization Gaps</div>
        </div>
        <div class="issue-list animate-list" style="margin-bottom: var(--space-lg);">
          ${issues.map(i => renderIssue(i)).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Citability Checklist -->
    <div class="fade-in delay-2">
      <div class="section-header">
        <div class="section-dot cyan"></div>
        <div class="section-title">Citability Signals</div>
      </div>
      <div class="score-card" style="padding: var(--space-sm) var(--space-md);">
        ${renderChecklistItem('Structured Data (JSON-LD)', hasSchema, 'Required for AI understanding')}
        ${renderChecklistItem('Data Points / Statistics', hasNumbers, 'Increases likelihood of direct citation')}
        ${renderChecklistItem('Quotes / Expert Sources', hasQuotes, 'Signals authority to LLMs')}
        ${renderChecklistItem('Definition Headings', hasDefinitions, 'Targets direct answer snippets')}
        ${renderChecklistItem('Bite-sized Paragraphs', hasShortParagraphs, 'Easier for LLMs to extract and display')}
      </div>
    </div>

    <!-- AI Content Audit -->
    <div class="fade-in delay-3" style="margin-top: var(--space-lg);">
      <div class="section-header">
        <div class="section-dot purple"></div>
        <div class="section-title">AI Content Optimizer</div>
      </div>
      <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid var(--glass-border); border-radius: var(--radius-md); padding: var(--space-md);">
        <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: 12px;">
          Generate AI-specific improvements using Pollinations.ai text analysis based on this page's content.
        </div>
        <button id="btn-run-ai-audit" class="btn btn-primary" style="width: 100%; font-size: 12px; padding: 6px 12px;">Run AI Audit</button>
        <div id="ai-audit-result" style="margin-top: 12px; display: none; font-size: 11px; color: var(--text-primary); line-height: 1.5;"></div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // AI Audit Button Logic
  const btnAudit = document.getElementById('btn-run-ai-audit');
  const resAudit = document.getElementById('ai-audit-result');
  
  if (btnAudit) {
    btnAudit.addEventListener('click', () => {
      btnAudit.textContent = 'Analyzing with AI...';
      btnAudit.disabled = true;
      resAudit.style.display = 'block';
      resAudit.innerHTML = '<div class="skeleton-card short" style="height: 40px; margin-top: 8px;"></div>';
      
      chrome.runtime.sendMessage({
        action: 'FETCH_AI_AUDIT',
        data: { text: content, url: data.url }
      }, (response) => {
        btnAudit.textContent = 'Run AI Audit again';
        btnAudit.disabled = false;
        
        if (response && response.success) {
          // simple markdown to HTML converter for bullet points
          let formattedText = response.result.replace(/\\n\\n/g, '<br/>').replace(/\\n/g, '<br/>');
          formattedText = formattedText.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
          formattedText = formattedText.replace(/- /g, '• ');
          
          resAudit.innerHTML = `<div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; border-left: 2px solid var(--accent-purple);">${formattedText}</div>`;
        } else {
          resAudit.innerHTML = `<div style="color: var(--color-error);">Failed to run AI Audit. Please try again.</div>`;
        }
      });
    });
  }

  // Trigger SVG gauge animations after a tiny delay
  setTimeout(() => {
    container.querySelectorAll('.gauge-fill').forEach(fill => {
      const s = parseInt(fill.getAttribute('data-score'));
      const offset = 126 - (126 * (s / 100)); // smaller circumference
      fill.style.strokeDashoffset = offset;
    });
  }, 50);
});

// ── Helpers ──────────────────────────────────────────────────

function getScoreClass(score) {
  if (score >= 80) return 'good';
  if (score >= 50) return 'warning';
  return 'poor';
}

function renderIssue(issue) {
  const iconClass = issue.severity === 'critical' ? 'critical' : (issue.severity === 'warning' ? 'warning' : 'info');
  const iconSymbol = issue.severity === 'critical' ? '!' : (issue.severity === 'warning' ? '⚠' : 'i');
  
  return `
    <div class="issue-item" style="padding: var(--space-sm);">
      <div class="issue-icon ${iconClass}" style="width: 20px; height: 20px; font-size: 10px;">${iconSymbol}</div>
      <div class="issue-content">
        <div class="issue-title" style="font-size: 12px;">${issue.title}</div>
        <div class="issue-desc" style="font-size: 10px;">${issue.description}</div>
      </div>
    </div>
  `;
}

function renderChecklistItem(title, isPass, subtext) {
  const icon = isPass 
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  
  return `
    <div style="display: flex; align-items: flex-start; gap: var(--space-sm); padding: 8px 0; border-bottom: 1px solid var(--glass-border);">
      <div style="margin-top: 2px;">${icon}</div>
      <div>
        <div style="font-size: 12px; font-weight: ${isPass ? '600' : '400'}; color: ${isPass ? 'var(--text-primary)' : 'var(--text-secondary)'};">${title}</div>
        <div style="font-size: 10px; color: var(--text-tertiary);">${subtext}</div>
      </div>
    </div>
  `;
}

function renderMiniGauge(score, typeClass) {
  // Semi-circle arc gauge — same geometry as overview gauges
  // Arc circumference = π * r ≈ 3.14159 * 40 ≈ 125.66
  const arcLen = 125.66;
  const offset = arcLen - (arcLen * (score / 100));
  return `
    <div style="position: relative; width: 80px; height: 50px; display: flex; justify-content: center; align-items: flex-end;">
      <svg viewBox="0 0 100 55" style="width: 80px; height: 50px;">
        <!-- Background arc -->
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="10" stroke-linecap="round"/>
        <!-- Filled arc -->
        <path class="gauge-fill ${typeClass}" data-score="${score}" d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke-width="10" stroke-linecap="round"
          stroke-dasharray="${arcLen}" stroke-dashoffset="${offset}"
          style="transition: stroke-dashoffset 1.5s cubic-bezier(0.19, 1, 0.22, 1);"/>
      </svg>
      <div style="position: absolute; bottom: 0; left: 0; width: 100%; text-align: center; font-size: 22px; font-weight: 800; color: var(--text-primary); line-height: 1;">
        ${score}<span style="font-size: 11px; font-weight: 600; color: var(--text-tertiary);">%</span>
      </div>
    </div>
  `;
}
