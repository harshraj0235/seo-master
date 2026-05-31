// ============================================================
// SEO Master — Competitor Tab Module
// UI for competitor side-by-side comparison
// ============================================================

document.addEventListener('render-competitor', (e) => {
  const data = e.detail;
  const container = document.getElementById('competitor-content');
  if (!container) return;

  const html = `
    <div class="fade-in">
      <div class="section-header">
        <div class="section-dot purple"></div>
        <div class="section-title">Competitor Comparison</div>
      </div>
      
      <div class="score-card" style="margin-bottom: var(--space-lg);">
        <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: var(--space-sm);">
          Compare your on-page metrics against a top competitor.
        </div>
        <div style="display: flex; gap: 8px;">
          <input type="url" id="comp-url-input" placeholder="https://competitor.com/page" style="flex: 1; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); border-radius: 4px; padding: 6px 8px; color: var(--text-primary); font-size: 12px; outline: none;">
          <button id="btn-compare" class="btn btn-primary" style="padding: 4px 12px; font-size: 11px;">Compare</button>
        </div>
      </div>

      <div id="comparison-results" style="display: none;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="padding-left: var(--space-md);">Metric</th>
              <th>Your Page</th>
              <th style="padding-right: var(--space-md);">Competitor</th>
            </tr>
          </thead>
          <tbody id="comp-table-body">
            <!-- populated dynamically -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;

  const btnCompare = document.getElementById('btn-compare');
  const inputUrl = document.getElementById('comp-url-input');
  const resultsDiv = document.getElementById('comparison-results');
  const tbody = document.getElementById('comp-table-body');

  if (btnCompare && inputUrl) {
    btnCompare.addEventListener('click', () => {
      const url = inputUrl.value.trim();
      if (!url) return;

      btnCompare.disabled = true;
      btnCompare.textContent = '...';

      chrome.runtime.sendMessage({ action: 'FETCH_COMPETITOR_HTML', data: { url } }, (res) => {
        btnCompare.disabled = false;
        btnCompare.textContent = 'Compare';

        if (res && res.success && res.html) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(res.html, 'text/html');
          
          // Basic extraction
          const compTitle = doc.title || '';
          const compDescEl = doc.querySelector('meta[name="description"]');
          const compDesc = compDescEl ? compDescEl.getAttribute('content') : '';
          const compH1s = doc.querySelectorAll('h1').length;
          
          const clone = doc.body.cloneNode(true);
          clone.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
          const compWords = clone.textContent.replace(/\s+/g, ' ').trim().split(/\s+/).length;

          // Your data
          const myTitle = data.raw.meta.title || '';
          const myDesc = data.raw.meta.description || '';
          const myH1s = data.raw.headings.filter(h => h.tag === 'H1').length;
          const myWords = data.raw.textContent.wordCount || 0;

          tbody.innerHTML = `
            <tr>
              <td style="padding-left: var(--space-md); font-weight: 500;">Title Length</td>
              <td style="color: ${myTitle.length >= 30 && myTitle.length <= 60 ? 'var(--color-success)' : 'var(--color-warning)'}">${myTitle.length} chars</td>
              <td style="padding-right: var(--space-md); color: var(--text-secondary);">${compTitle.length} chars</td>
            </tr>
            <tr>
              <td style="padding-left: var(--space-md); font-weight: 500;">Description Length</td>
              <td style="color: ${myDesc.length >= 120 && myDesc.length <= 160 ? 'var(--color-success)' : 'var(--color-warning)'}">${myDesc.length} chars</td>
              <td style="padding-right: var(--space-md); color: var(--text-secondary);">${compDesc.length} chars</td>
            </tr>
            <tr>
              <td style="padding-left: var(--space-md); font-weight: 500;">H1 Count</td>
              <td style="color: ${myH1s === 1 ? 'var(--color-success)' : 'var(--color-error)'}">${myH1s}</td>
              <td style="padding-right: var(--space-md); color: var(--text-secondary);">${compH1s}</td>
            </tr>
            <tr>
              <td style="padding-left: var(--space-md); font-weight: 500;">Word Count</td>
              <td style="color: ${myWords > 300 ? 'var(--color-success)' : 'var(--color-warning)'}">${myWords} words</td>
              <td style="padding-right: var(--space-md); color: var(--text-secondary);">${compWords} words</td>
            </tr>
          `;
          resultsDiv.style.display = 'block';
        } else {
          alert('Failed to fetch competitor page. CORS or invalid URL.');
        }
      });
    });
  }
});
