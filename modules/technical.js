// ============================================================
// SEO Master — Technical Tab Module
// Renders Core Web Vitals, Indexability, Schema, and Security
// ============================================================

document.addEventListener('render-technical', (e) => {
  const data = e.detail;
  const container = document.getElementById('technical-content');
  if (!container) return;

  const vitals = data.raw.webVitals || {};
  const meta = data.raw.meta || {};
  const schema = data.raw.schema || [];
  const hreflang = data.raw.hreflang || [];
  const resources = data.raw.resources || [];
  const issues = data.issues.filter(i => i.category === 'technical');

  // Local classify helper (WebVitalsCollector is only available in content script context)
  function classifyVital(metric, value) {
    if (value === null || value === undefined) return 'unknown';
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      cls: { good: 0.1, poor: 0.25 },
      inp: { good: 200, poor: 500 },
      fcp: { good: 1800, poor: 3000 },
      ttfb: { good: 800, poor: 1800 }
    };
    const t = thresholds[metric];
    if (!t) return 'unknown';
    if (value <= t.good) return 'good';
    if (value <= t.poor) return 'needs-improvement';
    return 'poor';
  }

  // Validate Schema
  const schemaValidation = window.SchemaValidator ? SchemaValidator.validate(schema) : { count: schema.length, types: [], valid: true, errors: [] };

  let html = `
    <!-- Core Web Vitals (Real User / Field approximation via PerformanceObserver) -->
    <div class="fade-in">
      <div class="section-header">
        <div class="section-dot blue"></div>
        <div class="section-title">Core Web Vitals (Local)</div>
      </div>
      
      <div class="skeleton-scores" style="grid-template-columns: repeat(3, 1fr);">
        <!-- LCP -->
        <div class="score-card" style="padding: var(--space-sm); align-items: center; text-align: center;">
          <div style="font-size: var(--font-xs); color: var(--text-tertiary); margin-bottom: var(--space-xs);">LCP</div>
          <div class="score-value ${classifyVital('lcp', vitals.lcp)}" style="font-size: 20px;">
            ${vitals.lcp ? (vitals.lcp / 1000).toFixed(2) + 's' : '-'}
          </div>
          <div style="font-size: 9px; color: var(--text-tertiary); margin-top: 2px;">Target < 2.5s</div>
        </div>
        
        <!-- CLS -->
        <div class="score-card" style="padding: var(--space-sm); align-items: center; text-align: center;">
          <div style="font-size: var(--font-xs); color: var(--text-tertiary); margin-bottom: var(--space-xs);">CLS</div>
          <div class="score-value ${classifyVital('cls', vitals.cls)}" style="font-size: 20px;">
            ${vitals.cls !== null ? vitals.cls.toFixed(3) : '-'}
          </div>
          <div style="font-size: 9px; color: var(--text-tertiary); margin-top: 2px;">Target < 0.1</div>
        </div>
        
        <!-- INP -->
        <div class="score-card" style="padding: var(--space-sm); align-items: center; text-align: center;">
          <div style="font-size: var(--font-xs); color: var(--text-tertiary); margin-bottom: var(--space-xs);">INP</div>
          <div class="score-value ${classifyVital('inp', vitals.inp)}" style="font-size: 20px;">
            ${vitals.inp ? vitals.inp + 'ms' : '-'}
          </div>
          <div style="font-size: 9px; color: var(--text-tertiary); margin-top: 2px;">Target < 200ms</div>
        </div>
      </div>
    </div>

    <!-- Resource Load Times -->
    ${resources.length > 0 ? `
      <div class="fade-in delay-1" style="margin-top: var(--space-lg);">
        <div class="section-header">
          <div class="section-dot orange"></div>
          <div class="section-title">Slowest Resources (Waterfall)</div>
        </div>
        <div class="score-card" style="padding: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="padding-left: var(--space-md);">Resource</th>
                <th>Type</th>
                <th style="padding-right: var(--space-md);">Time</th>
              </tr>
            </thead>
            <tbody>
              ${resources.map(r => `
                <tr>
                  <td style="padding-left: var(--space-md); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px;" title="${r.name}">${r.name.split('/').pop() || r.name}</td>
                  <td><span class="tag-chip" style="font-size: 9px; padding: 2px 4px;">${r.type || 'unknown'}</span></td>
                  <td style="padding-right: var(--space-md); color: ${r.duration > 1000 ? 'var(--color-error)' : (r.duration > 500 ? 'var(--color-warning)' : 'var(--color-success)')}; font-weight: 600;">${r.duration}ms</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}

    <!-- Indexability & Directives -->
    <div class="fade-in delay-1" style="margin-top: var(--space-lg);">
      <div class="section-header">
        <div class="section-dot purple"></div>
        <div class="section-title">Indexability</div>
      </div>
      <div class="score-card">
        <div class="kv-row">
          <span class="kv-key">Robots Meta</span>
          <span class="kv-value ${meta.robots?.includes('noindex') ? 'poor' : 'good'}">
            ${meta.robots || 'index, follow (implied)'}
          </span>
        </div>
        <div class="kv-row">
          <span class="kv-key">Canonical URL</span>
          <span class="kv-value" style="font-size: 11px; color: ${!meta.canonical ? 'var(--color-warning)' : 'var(--text-primary)'}">
            ${meta.canonical || 'Not specified'}
          </span>
        </div>
        <div class="kv-row">
          <span class="kv-key">Language (HTML)</span>
          <span class="kv-value">${meta.language || 'Not specified'}</span>
        </div>
      </div>
    </div>

    <!-- Schema Markup -->
    <div class="fade-in delay-2" style="margin-top: var(--space-lg);">
      <div class="section-header">
        <div class="section-dot orange"></div>
        <div class="section-title">Structured Data (Schema)</div>
        <div class="section-count">${schemaValidation.count} found</div>
      </div>
      <div class="score-card">
        ${schemaValidation.count > 0 ? `
          <div class="tags-container" style="margin-bottom: var(--space-md);">
            ${schemaValidation.types.map(t => `<span class="tag-chip primary">${t}</span>`).join('')}
          </div>
          
          ${!schemaValidation.valid ? `
            <div style="background: rgba(245, 158, 11, 0.1); border-left: 2px solid var(--color-warning); padding: 8px; font-size: 11px; margin-bottom: 8px;">
              <strong>Validation Issues:</strong>
              <ul style="margin-top: 4px; padding-left: 16px;">
                ${schemaValidation.errors.map(err => `<li>[${err.type}] ${err.message}</li>`).join('')}
              </ul>
            </div>
          ` : `
            <div style="color: var(--color-success); font-size: 12px; display: flex; align-items: center; gap: 4px;">
              ✓ Required properties present
            </div>
          `}
        ` : `
          <div style="color: var(--text-tertiary); font-size: var(--font-sm);">No JSON-LD schema found on this page.</div>
        `}
      </div>
    </div>

    <!-- Hreflang Tags -->
    ${hreflang.length > 0 ? `
      <div class="fade-in delay-3" style="margin-top: var(--space-lg);">
        <div class="section-header">
          <div class="section-dot green"></div>
          <div class="section-title">Hreflang Tags</div>
          <div class="section-count">${hreflang.length}</div>
        </div>
        <div class="score-card" style="padding: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="padding-left: var(--space-md);">Lang/Region</th>
                <th style="padding-right: var(--space-md);">URL</th>
              </tr>
            </thead>
            <tbody>
              ${hreflang.map(tag => `
                <tr>
                  <td style="padding-left: var(--space-md); color: var(--accent-cyan); font-family: monospace;">${tag.lang}</td>
                  <td style="padding-right: var(--space-md); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px;" title="${tag.href}">${tag.href}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}

  `;

  container.innerHTML = html;
});
