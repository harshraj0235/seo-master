// ============================================================
// SEO Master — Service Worker (Background Script)
// Central controller: routes messages, orchestrates analysis
// ============================================================

// Open side panel when user clicks the extension icon
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('[SEO Master] setPanelBehavior error:', error));
});

// Store the latest analysis results per tab
const tabResults = new Map();

// ── Message Router ──────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, data } = message;

  switch (action) {
    // Side panel requests a fresh analysis of the active tab
    case 'ANALYZE_PAGE':
      analyzeActiveTab().then(res => sendResponse(res)).catch(err => {
        console.error('[SEO Master] Analysis error:', err);
        sendResponse({ error: err.message });
      });
      return true; // async response

    // Content script sends extracted DOM data
    case 'DOM_DATA_READY':
      const tabId = sender.tab?.id;
      if (tabId) {
        const results = processAnalysis(data);
        tabResults.set(tabId, results);
        // Persist to storage
        chrome.storage.local.set({ [`tab_${tabId}`]: results });
        // Notify side panel
        chrome.runtime.sendMessage({
          action: 'ANALYSIS_COMPLETE',
          data: results
        }).catch(() => { /* side panel might not be open */ });
      }
      sendResponse({ success: true });
      return false;

    // Side panel requests cached results
    case 'GET_CACHED_RESULTS':
      getCachedResults().then(res => sendResponse(res)).catch(err => {
        sendResponse({ error: err.message });
      });
      return true;

    // AI Snippet Optimizer (Pollinations AI)
    case 'FETCH_AI_AUDIT':
      fetchAIAudit(data.text, data.url).then(res => sendResponse(res)).catch(err => {
        sendResponse({ error: err.message });
      });
      return true;

    // SERP Gap (Pollinations AI)
    case 'FETCH_SERP_GAP':
      fetchSERPGap(data.keyword, data.text).then(res => sendResponse(res)).catch(err => {
        sendResponse({ error: err.message });
      });
      return true;

    // AI Content Rewrite
    case 'FETCH_AI_REWRITE':
      fetchAIRewrite(data.text).then(res => sendResponse(res)).catch(err => {
        sendResponse({ error: err.message });
      });
      return true;

    // Competitor Fetch
    case 'FETCH_COMPETITOR_HTML':
      fetch(data.url)
        .then(res => res.text())
        .then(html => sendResponse({ success: true, html }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // Bulk Audit
    case 'FETCH_BULK_AUDIT':
      runBulkAudit(data.urls).then(res => sendResponse(res));
      return true;

    // Keyword Rank Check (Simulated)
    case 'CHECK_RANK':
      setTimeout(() => {
        const mockPosition = Math.floor(Math.random() * 50) + 1;
        const mockChange = Math.floor(Math.random() * 5) - 2; // -2 to +2
        sendResponse({ success: true, position: mockPosition, change: mockChange });
      }, 1500);
      return true;

    // Domain Authority / Backlink / Traffic Metrics
    case 'FETCH_DOMAIN_METRICS':
      fetchDomainMetrics(data.domain).then(res => sendResponse(res)).catch(err => {
        sendResponse({ error: err.message });
      });
      return true;

    // SERP Overlay batch domain metrics
    case 'FETCH_SERP_DOMAIN_METRICS':
      fetchBatchDomainMetrics(data.domains).then(res => sendResponse(res)).catch(err => {
        sendResponse({ error: err.message });
      });
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
      return false;
  }
});

// ── Tab Change Listener ─────────────────────────────────────
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // When user switches tabs, notify side panel with cached or fresh data
  const cached = tabResults.get(activeInfo.tabId);
  if (cached) {
    chrome.runtime.sendMessage({
      action: 'ANALYSIS_COMPLETE',
      data: cached
    }).catch(() => {});
  }
});

// ── Tab Update Listener (page navigation) ───────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    // Clear old results for this tab
    tabResults.delete(tabId);
  }
});

// ── Core Functions ──────────────────────────────────────────

async function analyzeActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    return { error: 'No active tab found' };
  }
  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
    return { error: 'Cannot analyze Chrome internal pages' };
  }

  try {
    // Inject and execute content script extraction
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_SEO_DATA' });
    if (response && response.data) {
      const results = processAnalysis(response.data);
      results.url = tab.url;
      results.title = tab.title;
      results.favicon = tab.favIconUrl;
      results.analyzedAt = new Date().toISOString();
      tabResults.set(tab.id, results);
      chrome.storage.local.set({ [`tab_${tab.id}`]: results });
      recordHistory(tab.url, results.scores.overall);
      return results;
    }
    return { error: 'No data received from content script' };
  } catch (err) {
    console.error('[SEO Master] Content script error:', err);
    return { error: `Could not analyze page: ${err.message}` };
  }
}

async function recordHistory(url, score) {
  try {
    const domain = new URL(url).hostname;
    const { seoHistory } = await chrome.storage.local.get(['seoHistory']);
    const history = seoHistory || {};
    const domainHistory = history[domain] || [];
    
    // Check if last entry is recent and same score
    if (domainHistory.length > 0) {
      const last = domainHistory[domainHistory.length - 1];
      if (last.score === score && (new Date() - new Date(last.date)) < 3600000) {
        return; // skip if same score within 1 hour
      }
    }

    domainHistory.push({ date: new Date().toISOString(), score });
    if (domainHistory.length > 10) domainHistory.shift(); // Keep last 10
    
    history[domain] = domainHistory;
    await chrome.storage.local.set({ seoHistory: history });
  } catch (e) {
    console.error('[SEO Master] History error:', e);
  }
}

async function getCachedResults() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return null;
  const cached = tabResults.get(tab.id);
  if (cached) return cached;
  // Try storage
  const stored = await chrome.storage.local.get(`tab_${tab.id}`);
  return stored[`tab_${tab.id}`] || null;
}

// ── Analysis Processing Engine ──────────────────────────────

function processAnalysis(rawData) {
  const scores = calculateScores(rawData);
  const issues = detectIssues(rawData);
  const recommendations = generateRecommendations(issues);

  return {
    raw: rawData,
    scores,
    issues,
    recommendations,
    summary: {
      totalIssues: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length
    }
  };
}

function calculateScores(data) {
  const onPage = calculateOnPageScore(data);
  const technical = calculateTechnicalScore(data);
  const content = calculateContentScore(data);
  const aiGeo = calculateAIGeoScore(data);

  const overall = Math.round(
    onPage * 0.30 + technical * 0.25 + content * 0.25 + aiGeo * 0.20
  );

  return { overall, onPage, technical, content, aiGeo };
}

function calculateOnPageScore(data) {
  let score = 100;
  const meta = data.meta || {};
  const headings = data.headings || [];
  const images = data.images || [];

  // Title checks
  if (!meta.title) score -= 25;
  else if (meta.title.length < 30) score -= 10;
  else if (meta.title.length > 60) score -= 8;

  // Meta description
  if (!meta.description) score -= 20;
  else if (meta.description.length < 70) score -= 8;
  else if (meta.description.length > 160) score -= 5;

  // Headings
  const h1s = headings.filter(h => h.tag === 'H1');
  if (h1s.length === 0) score -= 15;
  else if (h1s.length > 1) score -= 10;

  // Check heading hierarchy
  if (headings.length > 0) {
    let prevLevel = 0;
    let skipped = false;
    headings.forEach(h => {
      const level = parseInt(h.tag.replace('H', ''));
      if (level > prevLevel + 1 && prevLevel !== 0) skipped = true;
      prevLevel = level;
    });
    if (skipped) score -= 5;
  }

  // Images
  const missingAlt = images.filter(img => !img.alt || img.alt.trim() === '');
  if (images.length > 0 && missingAlt.length > 0) {
    score -= Math.min(15, missingAlt.length * 3);
  }

  // OG tags
  if (!meta.ogTitle && !meta.ogDescription) score -= 5;

  // Canonical
  if (!meta.canonical) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function calculateTechnicalScore(data) {
  let score = 100;
  const meta = data.meta || {};
  const vitals = data.webVitals || {};
  const schema = data.schema || [];

  // Indexability
  if (meta.robots?.includes('noindex')) score -= 20;

  // HTTPS
  if (data.url && !data.url.startsWith('https')) score -= 15;

  // Schema
  if (schema.length === 0) score -= 10;

  // Viewport
  if (!meta.viewport) score -= 10;

  // Core Web Vitals
  if (vitals.lcp) {
    if (vitals.lcp > 4000) score -= 15;
    else if (vitals.lcp > 2500) score -= 8;
  }
  if (vitals.cls !== undefined) {
    if (vitals.cls > 0.25) score -= 15;
    else if (vitals.cls > 0.1) score -= 8;
  }
  if (vitals.inp) {
    if (vitals.inp > 500) score -= 15;
    else if (vitals.inp > 200) score -= 8;
  }

  // Canonical conflicts
  if (meta.canonical && data.url && meta.canonical !== data.url) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateContentScore(data) {
  let score = 100;
  const text = data.textContent || {};
  const links = data.links || { internal: [], external: [] };

  // Word count
  if (text.wordCount < 100) score -= 25;
  else if (text.wordCount < 300) score -= 15;
  else if (text.wordCount < 600) score -= 5;

  // Readability
  if (text.readability) {
    if (text.readability.gradeLevel > 16) score -= 15;
    else if (text.readability.gradeLevel > 12) score -= 8;
  }

  // Internal links
  if (links.internal.length === 0) score -= 15;
  else if (links.internal.length < 3) score -= 5;

  // External links
  if (links.external.length === 0) score -= 5;

  // Link ratio balance
  const total = links.internal.length + links.external.length;
  if (total > 0) {
    const ratio = links.internal.length / total;
    if (ratio < 0.3) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateAIGeoScore(data) {
  let score = 0;
  const schema = data.schema || [];
  const meta = data.meta || {};
  const headings = data.headings || [];
  const text = data.textContent || {};

  // Structured data presence (0-20)
  if (schema.length > 0) {
    score += 10;
    const hasFAQ = schema.some(s => s['@type'] === 'FAQPage' || s['@type'] === 'Question');
    const hasHowTo = schema.some(s => s['@type'] === 'HowTo');
    const hasArticle = schema.some(s => ['Article', 'NewsArticle', 'BlogPosting'].includes(s['@type']));
    if (hasFAQ) score += 5;
    if (hasHowTo) score += 3;
    if (hasArticle) score += 2;
  }

  // Entity coverage (0-20)
  const content = text.fullText || '';
  const hasNumbers = /\d+(\.\d+)?%|\$[\d,]+|\d+ (million|billion|thousand)/i.test(content);
  const hasQuotes = /[""].*?[""]/.test(content) || /<blockquote/i.test(content);
  const hasDates = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/i.test(content) || /\d{4}-\d{2}-\d{2}/.test(content);
  const hasLists = data.lists?.count > 0;

  if (hasNumbers) score += 5;
  if (hasQuotes) score += 5;
  if (hasDates) score += 5;
  if (hasLists) score += 5;

  // Citability signals (0-20)
  const hasDefinitions = headings.some(h => /what is|definition|meaning|overview/i.test(h.text));
  const hasComparisons = headings.some(h => /vs|versus|comparison|compare|difference/i.test(h.text));
  const hasSteps = headings.some(h => /step|how to|guide|tutorial/i.test(h.text));

  if (hasDefinitions) score += 7;
  if (hasComparisons) score += 7;
  if (hasSteps) score += 6;

  // Answer readiness (0-20)
  const shortParagraphs = content.split(/\n\n+/).filter(p => p.length > 50 && p.length < 300);
  if (shortParagraphs.length >= 3) score += 10;
  if (meta.description && meta.description.length >= 120) score += 5;
  if (headings.some(h => h.text.includes('?'))) score += 5;

  // Content freshness (0-20)
  const hasUpdated = /updated|last modified|revised/i.test(content);
  const hasYear = /202[4-6]/.test(content);
  if (hasUpdated) score += 10;
  if (hasYear) score += 10;

  return Math.min(100, score);
}

// ── Issue Detection ─────────────────────────────────────────

function detectIssues(data) {
  const issues = [];
  const meta = data.meta || {};
  const headings = data.headings || [];
  const images = data.images || [];
  const schema = data.schema || [];
  const links = data.links || { internal: [], external: [] };
  const text = data.textContent || {};
  const vitals = data.webVitals || {};

  // ── On-Page Issues ──
  if (!meta.title) {
    issues.push({ category: 'onpage', severity: 'critical', title: 'Missing page title', description: 'This page has no <title> tag. Search engines use the title as the primary ranking signal and display it in SERPs.', fix: 'Add a unique, descriptive <title> tag between 30-60 characters.' });
  } else {
    if (meta.title.length > 60) issues.push({ category: 'onpage', severity: 'warning', title: 'Title too long', description: `Title is ${meta.title.length} characters. Google typically displays 50-60 characters.`, fix: 'Shorten the title to under 60 characters while keeping primary keywords.' });
    if (meta.title.length < 30) issues.push({ category: 'onpage', severity: 'warning', title: 'Title too short', description: `Title is only ${meta.title.length} characters. You're missing an opportunity to include more keywords.`, fix: 'Expand the title to at least 30 characters with relevant keywords.' });
  }

  if (!meta.description) {
    issues.push({ category: 'onpage', severity: 'critical', title: 'Missing meta description', description: 'No meta description found. Google will auto-generate one, which may not represent your page well.', fix: 'Add a compelling meta description between 120-160 characters with a call to action.' });
  } else {
    if (meta.description.length > 160) issues.push({ category: 'onpage', severity: 'warning', title: 'Meta description too long', description: `Description is ${meta.description.length} characters. It will be truncated in SERPs.`, fix: 'Shorten to under 160 characters.' });
    if (meta.description.length < 70) issues.push({ category: 'onpage', severity: 'warning', title: 'Meta description too short', description: `Description is only ${meta.description.length} characters.`, fix: 'Expand to at least 120 characters for better SERP presence.' });
  }

  const h1s = headings.filter(h => h.tag === 'H1');
  if (h1s.length === 0) {
    issues.push({ category: 'onpage', severity: 'critical', title: 'No H1 heading', description: 'Every page should have exactly one H1 heading.', fix: 'Add a single H1 heading that describes the page content.' });
  } else if (h1s.length > 1) {
    issues.push({ category: 'onpage', severity: 'warning', title: `Multiple H1 headings (${h1s.length})`, description: 'Having multiple H1s can confuse search engines about the page topic.', fix: 'Keep only one H1 and convert others to H2 or H3.' });
  }

  // Heading hierarchy
  let prevLevel = 0;
  headings.forEach(h => {
    const level = parseInt(h.tag.replace('H', ''));
    if (level > prevLevel + 1 && prevLevel !== 0) {
      issues.push({ category: 'onpage', severity: 'info', title: `Skipped heading level: ${h.tag}`, description: `Jumped from H${prevLevel} to ${h.tag}. This breaks heading hierarchy.`, fix: `Use H${prevLevel + 1} instead of ${h.tag}.` });
    }
    prevLevel = level;
  });

  // Images
  const missingAlt = images.filter(img => !img.alt || img.alt.trim() === '');
  if (missingAlt.length > 0) {
    issues.push({ category: 'onpage', severity: 'warning', title: `${missingAlt.length} image(s) missing alt text`, description: 'Images without alt text hurt accessibility and miss SEO opportunities.', fix: 'Add descriptive alt text to all images.' });
  }

  if (!meta.canonical) {
    issues.push({ category: 'onpage', severity: 'info', title: 'No canonical URL', description: 'No canonical link element found. This can lead to duplicate content issues.', fix: 'Add <link rel="canonical"> pointing to the preferred URL.' });
  }

  if (!meta.ogTitle && !meta.ogImage) {
    issues.push({ category: 'onpage', severity: 'info', title: 'Missing Open Graph tags', description: 'No OG tags found. Social shares will not display rich previews.', fix: 'Add og:title, og:description, and og:image meta tags.' });
  }

  // ── Technical Issues ──
  if (!meta.viewport) {
    issues.push({ category: 'technical', severity: 'critical', title: 'No viewport meta tag', description: 'Without a viewport tag, the page won\'t render properly on mobile devices.', fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' });
  }

  if (schema.length === 0) {
    issues.push({ category: 'technical', severity: 'warning', title: 'No structured data', description: 'No JSON-LD schema markup found. Structured data helps search engines understand your content.', fix: 'Add relevant Schema.org markup (Article, Product, FAQ, etc.).' });
  }

  if (meta.robots?.includes('noindex')) {
    issues.push({ category: 'technical', severity: 'critical', title: 'Page is set to noindex', description: 'This page has a noindex directive and will NOT appear in search results.', fix: 'Remove the noindex directive if you want this page indexed.' });
  }

  if (vitals.lcp && vitals.lcp > 2500) {
    issues.push({ category: 'technical', severity: vitals.lcp > 4000 ? 'critical' : 'warning', title: `Slow LCP: ${(vitals.lcp / 1000).toFixed(1)}s`, description: `Largest Contentful Paint is ${vitals.lcp > 4000 ? 'poor' : 'needs improvement'}. Target is under 2.5 seconds.`, fix: 'Optimize images, reduce render-blocking resources, and use a CDN.' });
  }

  if (vitals.cls !== undefined && vitals.cls > 0.1) {
    issues.push({ category: 'technical', severity: vitals.cls > 0.25 ? 'critical' : 'warning', title: `High CLS: ${vitals.cls.toFixed(3)}`, description: `Cumulative Layout Shift is ${vitals.cls > 0.25 ? 'poor' : 'needs improvement'}. Target is under 0.1.`, fix: 'Set explicit dimensions on images/videos and avoid inserting content above existing content.' });
  }

  if (vitals.inp && vitals.inp > 200) {
    issues.push({ category: 'technical', severity: vitals.inp > 500 ? 'critical' : 'warning', title: `Slow INP: ${vitals.inp}ms`, description: `Interaction to Next Paint is ${vitals.inp > 500 ? 'poor' : 'needs improvement'}. Target is under 200ms.`, fix: 'Break up long JavaScript tasks, optimize event handlers, and reduce main thread work.' });
  }

  // ── Content Issues ──
  if (text.wordCount < 300) {
    issues.push({ category: 'content', severity: text.wordCount < 100 ? 'critical' : 'warning', title: `Thin content: ${text.wordCount} words`, description: 'Pages with very little content rarely rank well. Most top-ranking pages have 1,000+ words.', fix: 'Expand the content with valuable, relevant information.' });
  }

  if (links.internal.length === 0) {
    issues.push({ category: 'content', severity: 'warning', title: 'No internal links', description: 'This page has no internal links, making it an orphan in your site structure.', fix: 'Add internal links to relevant pages on your site.' });
  }

  if (text.readability && text.readability.gradeLevel > 12) {
    issues.push({ category: 'content', severity: 'warning', title: `Complex readability: Grade ${text.readability.gradeLevel.toFixed(1)}`, description: 'Content reads at a college level or above, which may alienate a broader audience.', fix: 'Simplify language, use shorter sentences, and break up complex paragraphs.' });
  }

  // ── AI/GEO Issues ──
  if (schema.length === 0) {
    issues.push({ category: 'aigeo', severity: 'warning', title: 'No structured data for AI', description: 'AI systems like ChatGPT and Perplexity rely heavily on structured data to understand and cite content.', fix: 'Add FAQ, HowTo, or Article schema to improve AI discoverability.' });
  }

  const content = text.fullText || '';
  if (!/\d+(\.\d+)?%|\$[\d,]+/.test(content)) {
    issues.push({ category: 'aigeo', severity: 'info', title: 'No statistics or data points', description: 'AI systems prefer citing content with specific numbers, percentages, and data.', fix: 'Include relevant statistics, research data, and specific numbers.' });
  }

  if (!headings.some(h => h.text.includes('?'))) {
    issues.push({ category: 'aigeo', severity: 'info', title: 'No question-based headings', description: 'Question headings (What, How, Why) make content more likely to be cited by AI assistants.', fix: 'Rephrase some headings as questions that your audience asks.' });
  }

  return issues;
}

// ── Recommendation Generator ────────────────────────────────

function generateRecommendations(issues) {
  const critical = issues.filter(i => i.severity === 'critical');
  const warnings = issues.filter(i => i.severity === 'warning');

  const recommendations = [];

  // Top 3 quick wins
  const topIssues = [...critical, ...warnings].slice(0, 3);
  topIssues.forEach(issue => {
    recommendations.push({
      priority: issue.severity === 'critical' ? 'high' : 'medium',
      title: issue.title,
      action: issue.fix,
      category: issue.category
    });
  });

  return recommendations;
}

// ── Pollinations AI Integrations (Free, No Auth) ────────────

async function fetchAIAudit(pageText, url) {
  const content = pageText.substring(0, 3000); // Limit text to avoid payload issues
  const prompt = `You are an expert SEO AI. Analyze this webpage content from ${url}. Provide exactly 3 concise, actionable suggestions to make this content more likely to be cited by AI Overviews and ChatGPT. Format as a bulleted list. Content snippet: "${content}"`;
  
  try {
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    if (!response.ok) throw new Error('API request failed');
    const result = await response.text();
    return { success: true, result };
  } catch (err) {
    console.error('[SEO Master] AI Audit error:', err);
    return { error: 'Failed to fetch AI audit from Pollinations.ai' };
  }
}

async function fetchSERPGap(keyword, pageText) {
  const content = pageText.substring(0, 2000);
  const prompt = `You are an SEO competitor analysis tool. The target keyword is "${keyword}". Based on the provided text of my page, identify 3 critical semantic topics or sub-topics that the top-ranking competitors cover, but my page is missing or weak on. Keep it extremely brief, just comma-separated topics. My page text: "${content}"`;
  
  try {
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    if (!response.ok) throw new Error('API request failed');
    const result = await response.text();
    // Clean up result into an array of topics
    const topics = result.replace(/^.*: /, '').split(',').map(t => t.trim().replace(/^\d+\.\s*/, '').replace(/^- /, ''));
    return { success: true, topics: topics.slice(0, 4) };
  } catch (err) {
    console.error('[SEO Master] SERP Gap error:', err);
    return { error: 'Failed to fetch SERP gap from Pollinations.ai' };
  }
}

async function fetchAIRewrite(textToRewrite) {
  const content = textToRewrite.substring(0, 2000);
  const prompt = `You are an expert SEO copywriter. Rewrite the following text to improve its SEO value, readability, and engagement. Make it concise but impactful. Output ONLY the rewritten text, nothing else.\n\nOriginal Text:\n"${content}"`;
  
  try {
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    if (!response.ok) throw new Error('API request failed');
    const result = await response.text();
    return { success: true, result: result.trim() };
  } catch (err) {
    console.error('[SEO Master] AI Rewrite error:', err);
    return { error: 'Failed to fetch AI rewrite from Pollinations.ai' };
  }
}

async function runBulkAudit(urls) {
  const results = [];
  // Limit to 10 to avoid performance/network issues
  const limitedUrls = urls.slice(0, 10);
  
  for (const url of limitedUrls) {
    try {
      const res = await fetch(url);
      const html = await res.text();
      
      // Basic extraction using regex since we don't have DOMParser in SW
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || 
                        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
      const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
      
      const title = titleMatch ? titleMatch[1].trim() : '';
      const desc = descMatch ? descMatch[1].trim() : '';
      
      // Calculate a rough score
      let score = 100;
      if (!title || title.length < 30 || title.length > 60) score -= 20;
      if (!desc || desc.length < 120 || desc.length > 160) score -= 20;
      if (h1Count !== 1) score -= 20;

      results.push({ url, title, desc, h1Count, score: Math.max(0, score) });
    } catch (e) {
      results.push({ url, error: 'Failed to fetch or parse' });
    }
  }
  return { success: true, results };
}
function generateDeterministicMetrics(domain) {
  domain = (domain || '').toString();
  if (!domain) {
    return { da: 0, pa: 0, backlinks: '0', traffic: '0' };
  }
  
  // Simple hash function for deterministic results
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash << 5) - hash + domain.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);
  
  // Base authority on domain length and TLD (shorter and common TLDs generally have higher DA)
  const isCom = domain.endsWith('.com');
  const isOrg = domain.endsWith('.org') || domain.endsWith('.gov') || domain.endsWith('.edu');
  
  let baseDA = 20 + (hash % 60);
  if (isCom) baseDA += 10;
  if (isOrg) baseDA += 15;
  if (domain.length < 8) baseDA += 10;
  
  const da = Math.min(99, Math.max(1, baseDA));
  const pa = Math.min(99, Math.max(1, da - (hash % 15)));
  
  // Exponential scaling for backlinks and traffic based on DA
  const backlinkBase = Math.pow(1.15, da);
  const backlinks = Math.floor(backlinkBase * (1 + (hash % 100) / 100) * 10);
  
  const trafficBase = Math.pow(1.18, da);
  const traffic = Math.floor(trafficBase * (1 + (hash % 50) / 100) * 5);
  
  return {
    da,
    pa,
    backlinks: formatNumber(backlinks),
    traffic: formatNumber(traffic)
  };
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

async function fetchDomainMetrics(domain) {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 600));
  return { success: true, metrics: generateDeterministicMetrics(domain) };
}

async function fetchBatchDomainMetrics(domains) {
  await new Promise(r => setTimeout(r, 800));
  const results = {};
  domains.forEach(d => {
    results[d] = generateDeterministicMetrics(d);
  });
  return { success: true, results };
}
