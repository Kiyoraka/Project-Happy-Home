/* ==========================================================================
   Happy Home - charts.js
   Thin wrapper over Chart.js 4 (window.Chart, UMD) in the Concept C palette.
   Sets global defaults once, keeps a registry so re-rendering a canvas
   destroys the previous chart, and degrades to a friendly message when
   Chart.js failed to load.

     Charts.line(canvas, { labels, data, label, money })
     Charts.bar(canvas, { labels, data, label, horizontal, money, max })
     Charts.doughnut(canvas, { labels, data, colors })
     Charts.destroyAll()
   Exposes a single global: window.Charts
   ========================================================================== */
(function (global) {
  "use strict";

  const U = global.UI;
  const registry = new Map();
  let configured = false;

  const C = {
    navy: "#0b1530",
    navy800: "#111e42",
    navy700: "#1a2a57",
    coral: "#ff6b5b",
    coralSoft: "#ff8a75",
    peach: "#ffc9b5",
    text: "#7a83a6",
    grid: "#eee8ef"
  };

  const STATUS_COLORS = {
    PENDING: "#f2a93b",
    CONFIRMED: "#4d7cfe",
    ACTIVE: "#22b07d",
    ENDED: "#a9b3d1",
    REJECTED: "#e5484d",
    CANCELLED: "#ff8a75"
  };

  const available = () => typeof global.Chart === "function";
  const reduced = () => (U && U.prefersReducedMotion ? U.prefersReducedMotion() : false);
  const money = (v) => (U ? U.fmtRM(v) : `RM ${v}`);
  const num = (v) => (U ? U.fmtNumber(v) : String(v));

  /* -------------------------------------------------------------- Defaults */
  function configure() {
    if (configured || !available()) return;
    const d = global.Chart.defaults;
    d.font.family = '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    d.font.size = 12;
    d.color = C.text;
    d.borderColor = C.grid;
    d.maintainAspectRatio = false;
    d.responsive = true;
    d.animation.duration = reduced() ? 0 : 700;
    d.animation.easing = "easeOutQuart";
    const tt = d.plugins.tooltip;
    tt.backgroundColor = C.navy;
    tt.titleColor = "#ffffff";
    tt.bodyColor = "#f5f7ff";
    tt.padding = 12;
    tt.cornerRadius = 12;
    tt.displayColors = false;
    tt.titleFont = { weight: "700" };
    tt.bodyFont = { weight: "600" };
    d.plugins.legend.labels.usePointStyle = true;
    d.plugins.legend.labels.pointStyle = "circle";
    d.plugins.legend.labels.boxWidth = 8;
    d.plugins.legend.labels.boxHeight = 8;
    configured = true;
  }

  /* ------------------------------------------------------------- Registry */
  function resolve(canvas) {
    return typeof canvas === "string" ? document.querySelector(canvas) : canvas;
  }

  function destroy(canvas) {
    const node = resolve(canvas);
    if (!node) return;
    const old = registry.get(node);
    if (old) {
      old.destroy();
      registry.delete(node);
    }
  }

  function destroyAll() {
    registry.forEach((chart) => chart.destroy());
    registry.clear();
  }

  function fallback(node) {
    const host = node.parentElement;
    if (!host) return null;
    host.innerHTML =
      '<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/></svg><p>Charts could not load. Check your internet connection and refresh.</p></div>';
    return null;
  }

  /** Common entry: resolve canvas, guard Chart.js, drop old chart, create new. */
  function make(canvas, config) {
    const node = resolve(canvas);
    if (!node) return null;
    if (!available()) return fallback(node);
    configure();
    destroy(node);
    // Re-read in case the visitor toggled reduced motion since first load.
    global.Chart.defaults.animation.duration = reduced() ? 0 : 700;
    // Clean registry entries whose canvas was removed from the DOM.
    registry.forEach((chart, el) => {
      if (!el.isConnected) {
        chart.destroy();
        registry.delete(el);
      }
    });
    const chart = new global.Chart(node, config);
    registry.set(node, chart);
    return chart;
  }

  const fmt = (isMoney) => (v) => (isMoney ? money(v) : num(v));

  function valueScale(isMoney, max) {
    return {
      beginAtZero: true,
      max: max != null ? max : undefined,
      border: { display: false },
      grid: { color: C.grid, drawTicks: false },
      ticks: {
        padding: 8,
        maxTicksLimit: 6,
        precision: isMoney ? undefined : 0,
        callback: max === 100 && !isMoney ? (v) => `${v}%` : fmt(isMoney)
      }
    };
  }

  function categoryScale() {
    return {
      border: { display: false },
      grid: { display: false },
      ticks: { padding: 6, autoSkip: true, maxRotation: 0 }
    };
  }

  /* ------------------------------------------------------------------ Line */
  function line(canvas, { labels = [], data = [], label = "", money: isMoney = false } = {}) {
    return make(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label,
            data,
            borderColor: C.coral,
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBorderWidth: 3,
            pointHoverBackgroundColor: "#ffffff",
            pointHoverBorderColor: C.coral,
            backgroundColor(ctx) {
              const { chart } = ctx;
              const area = chart.chartArea;
              if (!area) return "rgba(255, 107, 91, 0.12)";
              const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
              g.addColorStop(0, "rgba(255, 107, 91, 0.32)");
              g.addColorStop(0.6, "rgba(255, 201, 181, 0.12)");
              g.addColorStop(1, "rgba(255, 201, 181, 0)");
              return g;
            }
          }
        ]
      },
      options: {
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => `${label ? label + ": " : ""}${fmt(isMoney)(c.parsed.y)}` } }
        },
        scales: { x: categoryScale(), y: valueScale(isMoney) }
      }
    });
  }

  /* ------------------------------------------------------------------- Bar */
  function bar(canvas, { labels = [], data = [], label = "", horizontal = false, money: isMoney = false, max = null } = {}) {
    const pct = max === 100 && !isMoney;
    const valueAxis = horizontal ? "x" : "y";
    const catAxis = horizontal ? "y" : "x";
    const show = (v) => (pct ? `${v}%` : fmt(isMoney)(v));
    return make(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label,
            data,
            backgroundColor: horizontal ? C.coral : C.navy700,
            hoverBackgroundColor: horizontal ? C.coralSoft : C.coral,
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: horizontal ? 22 : 34,
            categoryPercentage: 0.7,
            barPercentage: 0.9
          }
        ]
      },
      options: {
        indexAxis: horizontal ? "y" : "x",
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => `${label ? label + ": " : ""}${show(c.parsed[valueAxis])}` } }
        },
        scales: { [catAxis]: categoryScale(), [valueAxis]: valueScale(isMoney, max) }
      }
    });
  }

  /* -------------------------------------------------------------- Doughnut */
  function doughnut(canvas, { labels = [], data = [], colors = [] } = {}) {
    const palette = colors.length ? colors : [C.coral, C.navy700, C.peach, C.coralSoft, C.navy800, C.text];
    return make(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: palette,
            hoverBackgroundColor: palette,
            borderColor: "#ffffff",
            borderWidth: 3,
            hoverOffset: 8,
            borderRadius: 6
          }
        ]
      },
      options: {
        cutout: "70%",
        layout: { padding: 6 },
        plugins: {
          legend: { position: "bottom", labels: { padding: 16, font: { weight: "600" } } },
          tooltip: {
            callbacks: {
              label(c) {
                const total = c.dataset.data.reduce((s, v) => s + (Number(v) || 0), 0) || 1;
                return `${c.label}: ${num(c.parsed)} (${Math.round((c.parsed / total) * 100)}%)`;
              }
            }
          }
        }
      }
    });
  }

  global.Charts = {
    available,
    colors: C,
    STATUS_COLORS,
    line,
    bar,
    doughnut,
    destroy,
    destroyAll
  };
})(window);
