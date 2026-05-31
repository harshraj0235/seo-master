// ============================================================
// SEO Master — Core Web Vitals Measurement
// Uses PerformanceObserver API (no external libraries)
// ============================================================

const WebVitalsCollector = {
  metrics: {
    lcp: null,
    cls: null,
    inp: null,
    fcp: null,
    ttfb: null
  },

  init() {
    this.observeLCP();
    this.observeCLS();
    this.observeINP();
    this.observeFCP();
    this.measureTTFB();
  },

  // Largest Contentful Paint
  observeLCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = Math.round(lastEntry.startTime);
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('[SEO Master] LCP observation not supported');
    }
  },

  // Cumulative Layout Shift
  observeCLS() {
    try {
      let clsValue = 0;
      let sessionValue = 0;
      let sessionEntries = [];

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0];
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            if (
              sessionEntries.length > 0 &&
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000
            ) {
              sessionValue += entry.value;
            } else {
              sessionValue = entry.value;
              sessionEntries = [];
            }
            sessionEntries.push(entry);

            if (sessionValue > clsValue) {
              clsValue = sessionValue;
              this.metrics.cls = parseFloat(clsValue.toFixed(4));
            }
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.warn('[SEO Master] CLS observation not supported');
    }
  },

  // Interaction to Next Paint
  observeINP() {
    try {
      let maxINP = 0;
      const interactions = [];

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.interactionId) {
            const duration = entry.duration;
            interactions.push(duration);
            // INP is the 98th percentile of interactions
            interactions.sort((a, b) => b - a);
            const idx = Math.floor(interactions.length * 0.02);
            this.metrics.inp = Math.round(interactions[Math.min(idx, interactions.length - 1)]);
          }
        }
      });
      observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });
    } catch (e) {
      console.warn('[SEO Master] INP observation not supported');
    }
  },

  // First Contentful Paint
  observeFCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          this.metrics.fcp = Math.round(entries[0].startTime);
        }
      });
      observer.observe({ type: 'paint', buffered: true });
    } catch (e) {
      console.warn('[SEO Master] FCP observation not supported');
    }
  },

  // Time to First Byte
  measureTTFB() {
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        this.metrics.ttfb = Math.round(nav.responseStart);
      }
    } catch (e) {
      console.warn('[SEO Master] TTFB measurement not supported');
    }
  },

  getMetrics() {
    return { ...this.metrics };
  },

  // Classify metric quality
  classify(metric, value) {
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
};

// Auto-initialize
WebVitalsCollector.init();
