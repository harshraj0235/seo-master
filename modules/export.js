// ============================================================
// SEO Master — Export Tab Module
// Handles formatting raw data into CSV/JSON and triggering downloads
// ============================================================

document.addEventListener('render-export', (e) => {
  const data = e.detail;
  const container = document.getElementById('export-content');
  if (!container) return;

  const html = `
    <div class="fade-in">
      <div style="text-align: center; margin-bottom: var(--space-2xl);">
        <div style="font-size: 48px; margin-bottom: var(--space-md);">📊</div>
        <h2 style="font-size: var(--font-lg); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-xs);">Export Audit Report</h2>
        <p style="font-size: var(--font-sm); color: var(--text-secondary); max-width: 280px; margin: 0 auto;">
          Download a complete raw data extract of ${(() => { try { return new URL(data.url).hostname; } catch(e) { return data.url || 'this page'; } })()}
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: var(--space-md);">
        
        <div style="display: flex; gap: var(--space-sm); margin-top: var(--space-md);">
          <button id="btn-export-csv" class="btn btn-primary" style="flex: 1;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 10v3H2v-3M8 3v8M5 8l3 3 3-3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            CSV Format
          </button>
          <button id="btn-export-json" class="btn btn-secondary" style="flex: 1;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 10v3H2v-3M8 3v8M5 8l3 3 3-3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            JSON Format
          </button>
        </div>
        <button id="btn-export-pdf" class="btn btn-secondary" style="width: 100%; margin-top: var(--space-sm); background: rgba(0, 212, 255, 0.1); border-color: rgba(0, 212, 255, 0.2); color: var(--accent-cyan);">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
             <path d="M14 10v3H2v-3M8 3v8M5 8l3 3 3-3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Download PDF Report
        </button>

        <!-- Copy to Clipboard -->
        <button id="btn-copy-issues" class="btn btn-secondary btn-full" style="justify-content: space-between; padding: 16px; margin-top: var(--space-sm);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <div style="text-align: left;">
              <div style="font-size: var(--font-sm); font-weight: 600;">Copy Issues List</div>
              <div style="font-size: 10px; font-weight: 400; color: var(--text-tertiary);">To clipboard (Text format)</div>
            </div>
          </div>
          <span id="copy-status">→</span>
        </button>

      </div>
    </div>
  `;

  container.innerHTML = html;

  // Event Listeners
  const btnCsv = document.getElementById('btn-export-csv');
  const btnJson = document.getElementById('btn-export-json');
  const btnPdf = document.getElementById('btn-export-pdf');

  if (btnCsv) {
    btnCsv.addEventListener('click', () => {
      downloadFile(generateCSV(data), 'seo-audit.csv', 'text/csv');
    });
  }

  if (btnJson) {
    btnJson.addEventListener('click', () => {
      const exportData = JSON.parse(JSON.stringify(data));
      if (exportData.raw?.textContent?.fullText) {
        delete exportData.raw.textContent.fullText;
      }
      downloadFile(JSON.stringify(exportData, null, 2), 'seo-audit.json', 'application/json');
    });
  }
  
  if (btnPdf) {
    btnPdf.addEventListener('click', () => {
      generatePdfReport(data);
    });
  }

  document.getElementById('btn-copy-issues').addEventListener('click', async () => {
    const issuesText = data.issues.map(i => `[${i.severity.toUpperCase()}] ${i.title}\n- ${i.description}\n- Fix: ${i.fix}\n`).join('\n');
    try {
      await navigator.clipboard.writeText(`SEO Audit Issues for ${data.url}\n\n${issuesText}`);
      const statusEl = document.getElementById('copy-status');
      statusEl.textContent = 'Copied!';
      setTimeout(() => statusEl.textContent = '→', 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  });
});

// ── Helpers ──────────────────────────────────────────────────

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateCSV(data) {
  const rows = [];
  
  // Helper to escape CSV fields
  const esc = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  rows.push(['URL', esc(data.url)]);
  rows.push(['Overall Score', data.scores.overall]);
  rows.push(['Analyzed At', esc(data.analyzedAt)]);
  rows.push([]);
  
  // Scores
  rows.push(['CATEGORY SCORES']);
  rows.push(['On-Page', data.scores.onPage]);
  rows.push(['Technical', data.scores.technical]);
  rows.push(['Content', data.scores.content]);
  rows.push(['AI/GEO', data.scores.aiGeo]);
  rows.push([]);

  // Meta
  rows.push(['META DATA']);
  rows.push(['Title', esc(data.raw.meta.title), `Length: ${data.raw.meta.titleLength}`]);
  rows.push(['Description', esc(data.raw.meta.description), `Length: ${data.raw.meta.descriptionLength}`]);
  rows.push(['Canonical', esc(data.raw.meta.canonical)]);
  rows.push(['Robots', esc(data.raw.meta.robots)]);
  rows.push([]);

  // Content
  rows.push(['CONTENT']);
  rows.push(['Word Count', data.raw.textContent.wordCount]);
  rows.push(['Readability Grade', data.raw.textContent.readability.gradeLevel]);
  rows.push([]);

  // Issues
  rows.push(['ISSUES']);
  rows.push(['Severity', 'Category', 'Title', 'Description', 'Fix Action']);
  data.issues.forEach(i => {
    rows.push([esc(i.severity), esc(i.category), esc(i.title), esc(i.description), esc(i.fix)]);
  });

  return rows.map(r => r.join(',')).join('\n');
}

function generatePdfReport(data) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the PDF.');
    return;
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>SEO Audit - ${data.url}</title>
      <style>
        body { font-family: system-ui, sans-serif; color: #333; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
        h1, h2 { color: #111; border-bottom: 2px solid #eee; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; }
        th { background: #f9f9f9; }
        .score-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
        .critical { color: #dc2626; font-weight: bold; }
        .warning { color: #d97706; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>SEO Audit Report</h1>
      <p><strong>URL:</strong> ${data.url}</p>
      <p><strong>Date:</strong> ${new Date(data.analyzedAt).toLocaleString()}</p>
      
      <div class="score-box">
        <h2 style="border:none; margin:0 0 10px 0;">Overall Score: ${data.scores.overall}/100</h2>
        <p>On-Page: ${data.scores.onPage} | Technical: ${data.scores.technical} | Content: ${data.scores.content} | AI/GEO: ${data.scores.aiGeo}</p>
      </div>

      <h2>Top Issues</h2>
      <table>
        <tr><th>Severity</th><th>Issue</th><th>Recommendation</th></tr>
        ${data.issues.map(i => `
          <tr>
            <td class="${i.severity}">${i.severity.toUpperCase()}</td>
            <td><strong>${i.title}</strong><br/>${i.description}</td>
            <td>${i.fix}</td>
          </tr>
        `).join('')}
      </table>
      
      <script>
        window.onload = () => { window.print(); };
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
