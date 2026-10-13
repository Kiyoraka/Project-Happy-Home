/* ==========================================================================
   Happy Home - admin/view-analysis.js
   "Analysis" view: range chips (6 / 12 / 24 months), KPI row, rent line,
   occupancy bars, status doughnut, requests-per-month bars and a
   "Top houses" ranking table. Charts are drawn through window.Charts.
   ========================================================================== */
(function () {
  if (!window.Admin) return;

  const U = window.UI;
  const S = window.Store;
  const A = window.Admin;

  const RANGES = [6, 12, 24];
  const DECIDED_OK = ["CONFIRMED", "ACTIVE", "ENDED"];
  let range = 12;

  const icons = {
    money: A.icons.money,
    key: A.icons.key,
    inbox: A.icons.inbox,
    check: A.icons.check
  };

  /* ------------------------------------------------------------- Data prep */
  /** Rent earned per house over the given month keys (same rule as Store.revenueByMonth). */
  function rentByHouse(keys, bookings) {
    const out = {};
    keys.forEach((key) => {
      const from = `${key}-01`;
      const to = U.addMonths(from, 1);
      bookings.forEach((b) => {
        if (!DECIDED_OK.includes(b.status) || !(b.moveIn < to && from < b.moveOut)) return;
        out[b.houseId] = (out[b.houseId] || 0) + (Number(b.amounts && b.amounts.rent) || 0);
      });
    });
    return out;
  }

  function collect(n) {
    const revenue = S.revenueByMonth(n);
    const requests = S.bookingsByMonth(n);
    const keys = revenue.map((r) => r.key);
    const firstKey = keys[0] || "";
    const all = S.getBookings();
    const inRange = all.filter((b) => U.monthKey(String(b.createdAt || "").slice(0, 10)) >= firstKey);

    const statusCounts = S.bookingsByStatus().map((s) => ({
      status: s.status,
      label: s.label,
      count: inRange.filter((b) => b.status === s.status).length
    }));

    const approved = inRange.filter((b) => DECIDED_OK.includes(b.status)).length;
    const rejected = inRange.filter((b) => b.status === "REJECTED").length;
    const decided = approved + rejected;

    const occupancy = S.occupancyByHouse(n);
    const earned = rentByHouse(keys, all);
    const houses = occupancy
      .map((h) => ({
        ...h,
        requests: inRange.filter((b) => b.houseId === h.id).length,
        rent: earned[h.id] || 0
      }))
      .sort((a, b) => b.rent - a.rent || b.rate - a.rate);

    return {
      revenue,
      requests,
      statusCounts,
      occupancy,
      houses,
      totalRent: revenue.reduce((s, r) => s + r.total, 0),
      totalRequests: requests.reduce((s, r) => s + r.count, 0),
      avgOccupancy: occupancy.length ? occupancy.reduce((s, h) => s + h.rate, 0) / occupancy.length : 0,
      approvalRate: decided ? (approved / decided) * 100 : null,
      approved,
      rejected
    };
  }

  /* ------------------------------------------------------------- Templates */
  function chipsHTML() {
    return RANGES.map(
      (n) =>
        `<button type="button" class="chip${n === range ? " is-active" : ""}" data-range="${n}" aria-pressed="${n === range}">${n} months</button>`
    ).join("");
  }

  function statHTML({ i, icon, label, id, foot, navy }) {
    return `
      <article class="stat reveal${navy ? " stat--navy" : ""}" style="--i:${i}">
        <span class="stat__icon">${icon}</span>
        <span class="stat__label">${U.esc(label)}</span>
        <strong class="stat__value" data-kpi="${id}">0</strong>
        <p class="stat__foot">${U.esc(foot)}</p>
      </article>`;
  }

  function panelHTML({ i, title, sub = "", body, wide = false, flush = false }) {
    return `
      <section class="panel reveal${wide ? " an-wide" : ""}" style="--i:${i}">
        <header class="panel__head">
          <h2>${U.esc(title)}</h2>
          ${sub ? `<span class="muted small">${U.esc(sub)}</span>` : ""}
        </header>
        <div class="panel__body${flush ? " panel__body--flush" : ""}">${body}</div>
      </section>`;
  }

  const chartBox = (id, label, tall) =>
    `<div class="an-chart${tall ? " an-chart--tall" : ""}"><canvas id="${id}" role="img" aria-label="${U.esc(label)}"></canvas></div>`;

  function topHousesHTML(houses) {
    if (!houses.length) return A.emptyState("No houses yet. Add one to start tracking performance.", A.icons.house);
    const best = Math.max(1, ...houses.map((h) => h.rent));
    const rows = houses
      .map((h, idx) => {
        const share = Math.round((h.rent / best) * 100);
        return `
          <tr>
            <td class="an-rank">${idx + 1}</td>
            <td>
              <strong class="an-house">${U.esc(h.name)}</strong>
              <span class="an-bar" aria-hidden="true"><span style="--w:${share}%"></span></span>
            </td>
            <td class="num">${U.esc(String(h.rate))}%</td>
            <td class="num">${U.esc(U.fmtNumber(h.requests))}</td>
            <td class="num"><strong>${U.esc(U.fmtRM(h.rent))}</strong></td>
          </tr>`;
      })
      .join("");
    return `
      <div class="table-wrap">
        <table class="table an-top">
          <thead>
            <tr><th>#</th><th>House</th><th class="num">Occupancy</th><th class="num">Requests</th><th class="num">Rent earned</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  /* ---------------------------------------------------------------- Charts */
  function drawCharts(el, d) {
    if (!window.Charts) return;
    const short = (key) => U.fmtMonthKey(key, { short: true });
    const q = (id) => U.qs(`#${id}`, el);

    window.Charts.line(q("anRent"), {
      labels: d.revenue.map((r) => short(r.key)),
      data: d.revenue.map((r) => r.total),
      label: "Rent",
      money: true
    });

    if (q("anOcc")) {
      window.Charts.bar(q("anOcc"), {
        labels: d.occupancy.map((h) => h.name),
        data: d.occupancy.map((h) => h.rate),
        label: "Occupied",
        horizontal: true,
        max: 100
      });
    }

    if (q("anStatus")) {
      const used = d.statusCounts.filter((s) => s.count > 0);
      window.Charts.doughnut(q("anStatus"), {
        labels: used.map((s) => s.label),
        data: used.map((s) => s.count),
        colors: used.map((s) => window.Charts.STATUS_COLORS[s.status] || "#a9b3d1")
      });
    }

    window.Charts.bar(q("anReq"), {
      labels: d.requests.map((r) => short(r.key)),
      data: d.requests.map((r) => r.count),
      label: "Requests"
    });
  }

  /* ---------------------------------------------------------------- Render */
  function render(el) {
    const d = collect(range);
    const statusTotal = d.statusCounts.reduce((s, x) => s + x.count, 0);

    el.innerHTML = `
      <div class="toolbar an-toolbar reveal" style="--i:0">
        <div class="chips" role="group" aria-label="Date range">${chipsHTML()}</div>
        <span class="muted small an-range-note">Last ${range} months, including this month</span>
      </div>

      <div class="stats">
        ${statHTML({ i: 1, icon: icons.money, label: "Total rent", id: "rent", foot: `Collected over ${range} months`, navy: true })}
        ${statHTML({ i: 2, icon: icons.key, label: "Average occupancy", id: "occ", foot: `Across ${U.plural(d.occupancy.length, "house")}` })}
        ${statHTML({ i: 3, icon: icons.inbox, label: "Bookings received", id: "req", foot: "New requests in range" })}
        ${statHTML({
          i: 4,
          icon: icons.check,
          label: "Approval rate",
          id: "appr",
          foot: d.approvalRate == null ? "No decisions yet" : `${d.approved} approved · ${d.rejected} rejected`
        })}
      </div>

      <div class="panels an-panels">
        ${panelHTML({ i: 5, title: "Rent collected per month", sub: U.fmtRM(d.totalRent), body: chartBox("anRent", "Rent collected per month", true), wide: true })}
        ${panelHTML({
          i: 6,
          title: "Occupancy by house",
          sub: "% of months rented",
          body: d.occupancy.length ? chartBox("anOcc", "Occupancy by house") : A.emptyState("No houses yet.", A.icons.house)
        })}
        ${panelHTML({
          i: 7,
          title: "Bookings by status",
          sub: `${U.fmtNumber(statusTotal)} total`,
          body: statusTotal ? chartBox("anStatus", "Bookings by status") : A.emptyState("No bookings in this range yet.")
        })}
        ${panelHTML({ i: 8, title: "Booking requests per month", sub: `${U.fmtNumber(d.totalRequests)} requests`, body: chartBox("anReq", "Booking requests per month") })}
        ${panelHTML({ i: 9, title: "Top houses", sub: "Ranked by rent earned", body: topHousesHTML(d.houses), flush: true })}
      </div>`;

    U.qsa("[data-range]", el).forEach((btn) =>
      btn.addEventListener("click", () => {
        const n = Number(btn.dataset.range);
        if (n === range) return;
        range = n;
        render(el);
        U.initReveal(el);
      })
    );

    const kpi = (id) => U.qs(`[data-kpi="${id}"]`, el);
    U.countUp(kpi("rent"), d.totalRent, { formatter: U.fmtRM });
    U.countUp(kpi("occ"), d.avgOccupancy, { suffix: "%" });
    U.countUp(kpi("req"), d.totalRequests);
    if (d.approvalRate == null) kpi("appr").textContent = "-";
    else U.countUp(kpi("appr"), d.approvalRate, { suffix: "%" });

    drawCharts(el, d);
  }

  A.register("analysis", {
    title: "Analysis",
    subtitle: "How your houses are performing",
    render(el) {
      render(el);
    }
  });
})();
