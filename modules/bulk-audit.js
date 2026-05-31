// ============================================================
// SEO Master — Bulk Audit Tab Module
// UI for auditing multiple pages from the current domain
// ============================================================

document.addEventListener('render-bulk', (e) => {
  const data = e.detail;
  const container = document.getElementById('bulk-content');
  if (!container) return;

  // Extract up to 10 internal links from the current page to suggest
  const internalLinks = (data.raw.links.internal || []).filter(l => !l.href.includes('#')).map(l => l.href);
  const uniqueLinks = [...new Set(internalLinks)].slice(0, 10);
  const suggestedUrls = uniqueLinks.join('\n');

  const html = `
    <div class="fade-in">
      <div class="section-header">
        <div class="section-dot blue"></div>
        <div class="section-title">Bulk Page Audit</div>
      </div>
      
      <div class="score-card" style="margin-bottom: var(--space-lg);">
        <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: var(--space-sm);">
          Enter up to 10 URLs (one per line) to run a quick top-level audit on them simultaneously. We've pre-filled some internal links found on this page.
        </div>
        <textarea id="bulk-urls-input" style="width: 100%; height: 100px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); border-radius: 4px; padding: 6px; color: var(--text-primary); font-size: 11px; outline: none; margin-bottom: 8px; resize: vertical;">${suggestedUrls}</textarea>
        <button id="btn-run-bulk" class="btn btn-primary" style="width: 100%; font-size: 11px; padding: 6px 12px;">Run Bulk Audit</button>
      </div>

      <div id="bulk-results" style="display: none;">
        <div class="section-header">
          <div class="section-dot green"></div>
          <div class="section-title">Audit Results</div>
        </div>
        <div class="score-card" style="padding: 0; overflow-x: auto;">
          <table class="data-table" style="min-width: 400px;">
            <thead>
              <tr>
                <th style="padding-left: var(--space-md);">URL Path</th>
                <th>Score</th>
                <th>Title</th>
                <th>Desc</th>
                <th style="padding-right: var(--space-md);">H1</th>
              </tr>
            </thead>
            <tbody id="bulk-table-body">
              <!-- populated dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  const btnRun = document.getElementById('btn-run-bulk');
  const inputUrls = document.getElementById('bulk-urls-input');
  const resultsDiv = document.getElementById('bulk-results');
  const tbody = document.getElementById('bulk-table-body');

  if (btnRun && inputUrls) {
    btnRun.addEventListener('click', () => {
      const urlsText = inputUrls.value.trim();
      if (!urlsText) return;

      const urls = urlsText.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
      if (urls.length === 0) {
        alert('Please enter valid HTTP/HTTPS URLs.');
        return;
      }

      btnRun.disabled = true;
      btnRun.textContent = 'Auditing...';
      resultsDiv.style.display = 'block';
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Fetching and analyzing pages...</td></tr>';

      chrome.runtime.sendMessage({ action: 'FETCH_BULK_AUDIT', data: { urls } }, (res) => {
        btnRun.disabled = false;
        btnRun.textContent = 'Run Bulk Audit';

        if (res && res.success && res.results) {
          tbody.innerHTML = res.results.map(r => {
            if (r.error) {
              return `
                <tr>
                  <td style="padding-left: var(--space-md); color: var(--text-secondary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r.url}">${new URL(r.url).pathname}</td>
                  <td colspan="4" style="color: var(--color-error); padding-right: var(--space-md);">${r.error}</td>
                </tr>
              `;
            }
            
            const scoreColor = r.score >= 80 ? 'var(--color-success)' : (r.score >= 50 ? 'var(--color-warning)' : 'var(--color-error)');
            const titleColor = r.title.length >= 30 && r.title.length <= 60 ? 'var(--color-success)' : 'var(--color-warning)';
            const descColor = r.desc.length >= 120 && r.desc.length <= 160 ? 'var(--color-success)' : 'var(--color-warning)';
            const h1Color = r.h1Count === 1 ? 'var(--color-success)' : 'var(--color-error)';

            return `
              <tr>
                <td style="padding-left: var(--space-md); color: var(--text-primary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r.url}">${new URL(r.url).pathname || '/'}</td>
                <td style="color: ${scoreColor}; font-weight: 700;">${r.score}</td>
                <td style="color: ${titleColor};" title="${r.title}">${r.title ? r.title.length : '0'}</td>
                <td style="color: ${descColor};" title="${r.desc}">${r.desc ? r.desc.length : '0'}</td>
                <td style="color: ${h1Color}; padding-right: var(--space-md);">${r.h1Count}</td>
              </tr>
            `;
          }).join('');
        } else {
          tbody.innerHTML = '<tr><td colspan="5" style="color: var(--color-error); text-align: center;">Failed to complete bulk audit.</td></tr>';
        }
      });
    });
  }
});
