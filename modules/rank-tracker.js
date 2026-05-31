// ============================================================
// SEO Master — Rank Tracker Tab Module
// UI for tracking keywords and displaying simulated rank data
// ============================================================

document.addEventListener('render-rank', async (e) => {
  const data = e.detail;
  const container = document.getElementById('rank-content');
  if (!container) return;

  const currentDomain = (() => { try { return new URL(data.url).hostname; } catch(err) { return data.url; } })();

  // Load keywords from storage
  const storageData = await chrome.storage.local.get(['trackedKeywords']);
  const keywords = storageData.trackedKeywords || {};
  const domainKeywords = keywords[currentDomain] || [];

  let html = `
    <div class="fade-in">
      <div class="section-header">
        <div class="section-dot purple"></div>
        <div class="section-title">Keyword Rank Tracker</div>
      </div>
      <div class="score-card" style="padding: 0; margin-bottom: var(--space-lg);">
        <div style="padding: var(--space-sm) var(--space-md); border-bottom: 1px solid var(--glass-border); display: flex; gap: 8px;">
          <input type="text" id="add-keyword-input" placeholder="Add a target keyword..." style="flex: 1; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); border-radius: 4px; padding: 6px 8px; color: var(--text-primary); font-size: 12px; outline: none;">
          <button id="btn-add-keyword" class="btn btn-primary" style="padding: 4px 12px; font-size: 11px;">Track</button>
        </div>
      </div>

      <div class="section-header">
        <div class="section-dot cyan"></div>
        <div class="section-title">Tracked Keywords (${currentDomain})</div>
      </div>
      <div class="score-card" style="padding: 0;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="padding-left: var(--space-md);">Keyword</th>
              <th>Position</th>
              <th style="padding-right: var(--space-md); width: 60px;">Action</th>
            </tr>
          </thead>
          <tbody id="keyword-list">
            ${domainKeywords.length > 0 
              ? domainKeywords.map(k => renderKeywordRow(k)).join('')
              : '<tr><td colspan="3" style="text-align: center; padding: var(--space-md); color: var(--text-tertiary);">No keywords tracked yet. Add one above.</td></tr>'
            }
          </tbody>
        </table>
      </div>
      
      <div style="margin-top: var(--space-md); font-size: 10px; color: var(--text-tertiary); text-align: center;">
        Note: Ranking data is simulated in this extension environment to prevent search engine IP blocks.
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Add Keyword Logic
  const btnAdd = document.getElementById('btn-add-keyword');
  const inputKeyword = document.getElementById('add-keyword-input');

  if (btnAdd && inputKeyword) {
    btnAdd.addEventListener('click', async () => {
      const kw = inputKeyword.value.trim();
      if (!kw) return;
      
      // Prevent duplicates
      if (domainKeywords.some(k => k.keyword.toLowerCase() === kw.toLowerCase())) {
        inputKeyword.value = '';
        return;
      }

      btnAdd.disabled = true;
      btnAdd.textContent = '...';

      // Simulate checking rank via background
      chrome.runtime.sendMessage({
        action: 'CHECK_RANK',
        data: { keyword: kw, domain: currentDomain }
      }, async (response) => {
        btnAdd.disabled = false;
        btnAdd.textContent = 'Track';
        inputKeyword.value = '';

        if (response && response.success) {
          const newEntry = {
            keyword: kw,
            position: response.position,
            change: response.change || 0,
            dateAdded: new Date().toISOString()
          };
          
          domainKeywords.push(newEntry);
          keywords[currentDomain] = domainKeywords;
          await chrome.storage.local.set({ trackedKeywords: keywords });
          
          // Re-render
          document.dispatchEvent(new CustomEvent('render-rank', { detail: data }));
        }
      });
    });
  }

  // Delete Keyword Logic
  container.querySelectorAll('.btn-delete-kw').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const kwToDelete = e.currentTarget.getAttribute('data-kw');
      keywords[currentDomain] = domainKeywords.filter(k => k.keyword !== kwToDelete);
      await chrome.storage.local.set({ trackedKeywords: keywords });
      document.dispatchEvent(new CustomEvent('render-rank', { detail: data }));
    });
  });
});

function renderKeywordRow(data) {
  let changeHtml = '';
  if (data.change > 0) {
    changeHtml = `<span style="color: var(--color-success); font-size: 10px; margin-left: 4px;">▲${data.change}</span>`;
  } else if (data.change < 0) {
    changeHtml = `<span style="color: var(--color-error); font-size: 10px; margin-left: 4px;">▼${Math.abs(data.change)}</span>`;
  } else {
    changeHtml = `<span style="color: var(--text-tertiary); font-size: 10px; margin-left: 4px;">-</span>`;
  }

  return `
    <tr>
      <td style="padding-left: var(--space-md); color: var(--text-primary); font-weight: 500;">
        ${data.keyword}
      </td>
      <td>
        <div style="display: flex; align-items: center;">
          <span style="font-size: 14px; font-weight: 700; ${data.position <= 3 ? 'color: var(--color-success);' : (data.position <= 10 ? 'color: var(--color-warning);' : 'color: var(--text-secondary);')}">
            ${data.position > 100 ? '>100' : '#' + data.position}
          </span>
          ${changeHtml}
        </div>
      </td>
      <td style="padding-right: var(--space-md);">
        <button class="btn btn-secondary btn-delete-kw" data-kw="${data.keyword}" style="padding: 2px 6px; font-size: 10px; background: transparent; border-color: transparent; color: var(--color-error);">✕</button>
      </td>
    </tr>
  `;
}
