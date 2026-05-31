// ============================================================
// SEO Master — DOM Extractor (Utility)
// Pure data extraction functions — no business logic
// Runs as content script
// ============================================================

const SEOExtractor = {
  // ── Meta Tags ─────────────────────────────────────────────
  extractMeta() {
    const getMeta = (name) => {
      const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"], meta[name="${name}" i]`);
      return el ? el.getAttribute('content') : null;
    };

    return {
      title: document.title || null,
      titleLength: (document.title || '').length,
      description: getMeta('description'),
      descriptionLength: (getMeta('description') || '').length,
      keywords: getMeta('keywords'),
      robots: getMeta('robots'),
      author: getMeta('author'),
      viewport: getMeta('viewport'),
      canonical: (() => {
        const link = document.querySelector('link[rel="canonical"]');
        return link ? link.href : null;
      })(),
      charset: (() => {
        const meta = document.querySelector('meta[charset]');
        return meta ? meta.getAttribute('charset') : null;
      })(),
      language: document.documentElement.lang || null,
      // Open Graph
      ogTitle: getMeta('og:title'),
      ogDescription: getMeta('og:description'),
      ogImage: getMeta('og:image'),
      ogUrl: getMeta('og:url'),
      ogType: getMeta('og:type'),
      ogSiteName: getMeta('og:site_name'),
      // Twitter Card
      twitterCard: getMeta('twitter:card'),
      twitterTitle: getMeta('twitter:title'),
      twitterDescription: getMeta('twitter:description'),
      twitterImage: getMeta('twitter:image'),
      twitterSite: getMeta('twitter:site'),
      // Other
      themeColor: getMeta('theme-color'),
      generator: getMeta('generator'),
    };
  },

  // ── Headings ──────────────────────────────────────────────
  extractHeadings() {
    const headings = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
      headings.push({
        tag: h.tagName,
        text: h.textContent.trim().substring(0, 200),
        id: h.id || null,
        level: parseInt(h.tagName.replace('H', '')),
        isEmpty: h.textContent.trim().length === 0
      });
    });
    return headings;
  },

  // ── Images ────────────────────────────────────────────────
  extractImages() {
    const images = [];
    document.querySelectorAll('img').forEach(img => {
      images.push({
        src: img.src || img.getAttribute('data-src') || null,
        alt: img.alt || null,
        altLength: (img.alt || '').length,
        hasAlt: img.hasAttribute('alt'),
        width: img.naturalWidth || img.width || null,
        height: img.naturalHeight || img.height || null,
        loading: img.loading || null,
        isLazy: img.loading === 'lazy' || img.hasAttribute('data-src'),
        isDecorative: img.getAttribute('role') === 'presentation' || img.alt === '',
        fileSize: null // Cannot determine from DOM
      });
    });
    return images;
  },

  // ── Links ─────────────────────────────────────────────────
  extractLinks() {
    const internal = [];
    const external = [];
    const currentHost = window.location.hostname;

    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href;
      const text = a.textContent.trim().substring(0, 100);
      const rel = a.getAttribute('rel') || '';
      const isNofollow = rel.includes('nofollow');
      const isSponsored = rel.includes('sponsored');
      const isUgc = rel.includes('ugc');

      const linkData = {
        href,
        text,
        rel,
        isNofollow,
        isSponsored,
        isUgc,
        hasText: text.length > 0,
        isBlank: a.target === '_blank',
        title: a.title || null
      };

      try {
        const url = new URL(href);
        if (url.hostname === currentHost || url.hostname === '') {
          internal.push(linkData);
        } else {
          external.push(linkData);
        }
      } catch {
        // relative or malformed URL = treat as internal
        internal.push(linkData);
      }
    });

    return { internal, external, total: internal.length + external.length };
  },

  // ── Schema / Structured Data ──────────────────────────────
  extractSchema() {
    const schemas = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const parsed = JSON.parse(script.textContent);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => schemas.push(item));
        } else if (parsed['@graph']) {
          parsed['@graph'].forEach(item => schemas.push(item));
        } else {
          schemas.push(parsed);
        }
      } catch (e) {
        schemas.push({ _error: 'Invalid JSON-LD', _raw: script.textContent.substring(0, 500) });
      }
    });
    return schemas;
  },

  // ── Text Content Analysis ─────────────────────────────────
  extractTextContent() {
    // Get main text content, excluding scripts, styles, nav, footer
    const excludeSelectors = 'script, style, nav, footer, header, noscript, svg, [role="navigation"], [aria-hidden="true"]';
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll(excludeSelectors).forEach(el => el.remove());
    const fullText = clone.textContent.replace(/\s+/g, ' ').trim();

    // Word count
    const words = fullText.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // Sentence count
    const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const sentenceCount = sentences.length;

    // Syllable count (approximation)
    const syllableCount = words.reduce((total, word) => {
      return total + countSyllables(word);
    }, 0);

    // Readability
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const avgSyllablesPerWord = wordCount > 0 ? syllableCount / wordCount : 0;

    // Flesch-Kincaid Grade Level
    const gradeLevel = sentenceCount > 0 && wordCount > 0
      ? 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59
      : 0;

    // Flesch Reading Ease
    const readingEase = sentenceCount > 0 && wordCount > 0
      ? 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord
      : 0;

    // Reading time (avg 200 wpm)
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    // Keyword frequency (top 15)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'not', 'no', 'nor', 'as', 'if', 'than', 'so', 'just', 'about', 'up', 'out', 'all', 'also', 'how', 'what', 'when', 'where', 'who', 'which', 'there', 'here', 'more', 'some', 'any', 'each', 'every', 'both', 'few', 'most', 'other', 'into', 'over', 'after', 'before', 'between', 'under', 'through', 'very', 'too', 'only']);
    const freq = {};
    words.forEach(w => {
      const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.length > 2 && !stopWords.has(clean)) {
        freq[clean] = (freq[clean] || 0) + 1;
      }
    });

    const topKeywords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, count]) => ({
        word,
        count,
        density: ((count / wordCount) * 100).toFixed(2) + '%'
      }));

    return {
      fullText: fullText.substring(0, 5000),
      wordCount,
      sentenceCount,
      syllableCount,
      readingTimeMinutes,
      readability: {
        gradeLevel: Math.max(0, parseFloat(gradeLevel.toFixed(1))),
        readingEase: Math.max(0, Math.min(100, parseFloat(readingEase.toFixed(1)))),
        avgWordsPerSentence: parseFloat(avgWordsPerSentence.toFixed(1)),
        avgSyllablesPerWord: parseFloat(avgSyllablesPerWord.toFixed(1))
      },
      topKeywords
    };
  },

  // ── Lists ─────────────────────────────────────────────────
  extractLists() {
    const ols = document.querySelectorAll('ol');
    const uls = document.querySelectorAll('ul:not(nav ul):not([role="navigation"] ul)');
    return {
      ordered: ols.length,
      unordered: uls.length,
      count: ols.length + uls.length
    };
  },

  // ── Hreflang ──────────────────────────────────────────────
  extractHreflang() {
    const tags = [];
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => {
      tags.push({
        lang: link.getAttribute('hreflang'),
        href: link.href
      });
    });
    return tags;
  },

  // ── Resources / Performance ───────────────────────────────
  extractResources() {
    try {
      const resources = performance.getEntriesByType('resource');
      return resources.map(r => ({
        name: r.name,
        type: r.initiatorType,
        duration: Math.round(r.duration),
        size: r.transferSize || r.decodedBodySize || 0
      })).sort((a, b) => b.duration - a.duration).slice(0, 15);
    } catch (e) {
      return [];
    }
  },

  // ── Full Extraction ───────────────────────────────────────
  extractAll() {
    return {
      url: window.location.href,
      domain: window.location.hostname,
      protocol: window.location.protocol,
      meta: this.extractMeta(),
      headings: this.extractHeadings(),
      images: this.extractImages(),
      links: this.extractLinks(),
      schema: this.extractSchema(),
      textContent: this.extractTextContent(),
      lists: this.extractLists(),
      hreflang: this.extractHreflang(),
      resources: this.extractResources(),
      timestamp: new Date().toISOString()
    };
  }
};

// Syllable counter helper
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}
