/* ==========================================================================
   Happy Home - admin/view-booking.js
   Booking view: filterable list (table on desktop, cards on phones) and a
   detail drawer with status stepper, customer, lease, payment, receipt,
   admin note, history and Confirm / Reject / Cancel actions.
   Routes:  #booking            list
            #booking/<ref>      list + that booking's drawer
   ========================================================================== */
(function (global) {
  "use strict";
  if (!global.Admin) return;

  const U = global.UI;
  const S = global.Store;
  const A = global.Admin;

  const MOBILE_MQ = global.matchMedia("(max-width: 767px)");
  const STATUS_FILTERS = ["ALL", ...S.ALL_STATUS];

  /* Module state - survives re-renders. */
  let filters = null; // { status, q, house, month }
  let host = null; // the <section data-view="booking">
  let drawerRef = null; // ref currently shown in the drawer
  let silentClose = false; // closing the drawer from the router, not the user

  /* --------------------------------------------------------------- Helpers */
  const stagger = (i) => Math.min(i, 10);
  const avatar = (name, sm = true) => `<span class="avatar${sm ? " avatar--sm" : ""}">${U.esc(A.initials(name) || "?")}</span>`;
  const bookingHash = (ref) => `#booking/${encodeURIComponent(ref)}`;

  function initFilters(list) {
    if (filters) return;
    filters = {
      status: list.some((b) => b.status === "PENDING") ? "PENDING" : "ALL",
      q: "",
      house: "",
      month: ""
    };
  }

  /** Every filter except status (status chips show counts against this set). */
  function matchesBase(b) {
    if (filters.house && b.houseId !== filters.house) return false;
    if (filters.month && U.monthKey(b.moveIn) !== filters.month) return false;
    const q = filters.q.trim().toLowerCase();
    if (!q) return true;
    if (String(b.ref).toLowerCase().includes(q)) return true;
    if (String(b.name).toLowerCase().includes(q)) return true;
    const digits = q.replace(/\D/g, "");
    if (digits.length >= 3 && S.normPhone(b.phone).includes(S.normPhone(digits))) return true;
    return false;
  }

  /* ------------------------------------------------------------------ List */
  function toolbarHtml(list) {
    const houses = S.getHouses({ includeHidden: true });
    const months = [...new Set(list.map((b) => U.monthKey(b.moveIn)).filter(Boolean))].sort().reverse();
    if (filters.month && !months.includes(filters.month)) filters.month = "";
    if (filters.house && !houses.some((h) => h.id === filters.house)) filters.house = "";
    return `
      <div class="toolbar bk-toolbar">
        <label class="search toolbar__grow">
          ${A.icons.search}
          <input class="input" type="search" id="bkSearch" placeholder="Search ref, name or phone" value="${U.esc(filters.q)}" autocomplete="off" aria-label="Search bookings">
        </label>
        <select class="select bk-toolbar__select" id="bkHouse" aria-label="Filter by house">
          <option value="">All houses</option>
          ${houses.map((h) => `<option value="${U.esc(h.id)}"${h.id === filters.house ? " selected" : ""}>${U.esc(h.name)}</option>`).join("")}
        </select>
        <select class="select bk-toolbar__select" id="bkMonth" aria-label="Filter by move-in month">
          <option value="">Any move-in month</option>
          ${months.map((m) => `<option value="${U.esc(m)}"${m === filters.month ? " selected" : ""}>${U.esc(U.fmtMonthKey(m))}</option>`).join("")}
        </select>
      </div>
      <div class="chips bk-chips" id="bkChips" role="tablist" aria-label="Filter by status"></div>
      <div id="bkResults"></div>`;
  }

  function chipsHtml(base) {
    return STATUS_FILTERS.map((s) => {
      const count = s === "ALL" ? base.length : base.filter((b) => b.status === s).length;
      const label = s === "ALL" ? "All" : S.STATUS_LABEL[s];
      const on = filters.status === s;
      return `<button type="button" class="chip${on ? " is-active" : ""}" data-status="${s}" role="tab" aria-selected="${on}">
        ${U.esc(label)}<span class="chip__count">${count}</span></button>`;
    }).join("");
  }

  function tableHtml(rows) {
    return `
      <div class="panel bk-panel">
        <div class="table-wrap">
          <table class="table bk-table">
            <thead><tr>
              <th>Ref</th><th>Customer</th><th>House</th><th>Move-in → Move-out</th>
              <th class="num">Months</th><th class="num">Pay now</th><th>Status</th><th>Requested</th>
            </tr></thead>
            <tbody>
              ${rows
                .map(
                  (b, i) => `
                <tr class="reveal" style="--i:${stagger(i)}" data-href="${U.esc(b.ref)}" tabindex="0">
                  <td class="bk-ref">${U.esc(b.ref)}</td>
                  <td>
                    <span class="bk-cust">${avatar(b.name)}
                      <span class="bk-cust__text"><strong>${U.esc(b.name)}</strong><small>${U.esc(U.fmtPhone(b.phone))}</small></span>
                    </span>
                  </td>
                  <td class="bk-house">${U.esc(A.houseName(b.houseId))}</td>
                  <td class="bk-period">${U.esc(U.fmtDate(b.moveIn))} → ${U.esc(U.fmtDate(b.moveOut))}</td>
                  <td class="num">${b.months}</td>
                  <td class="num">${U.esc(U.fmtRM(b.amounts && b.amounts.payNow))}</td>
                  <td>${A.statusBadge(b.status)}</td>
                  <td class="bk-created">${U.esc(U.fmtDate(b.createdAt))}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function cardsHtml(rows) {
    return `
      <div class="bk-cards">
        ${rows
          .map(
            (b, i) => `
          <a class="bk-card reveal" style="--i:${stagger(i)}" href="${bookingHash(b.ref)}">
            <span class="bk-card__top">
              ${avatar(b.name, false)}
              <span class="bk-card__who"><strong>${U.esc(b.name)}</strong><small>${U.esc(b.ref)} · ${U.esc(U.fmtPhone(b.phone))}</small></span>
              ${A.statusBadge(b.status)}
            </span>
            <span class="bk-card__house">${A.icons.house}${U.esc(A.houseName(b.houseId))}</span>
            <span class="bk-card__meta">
              <span>${A.icons.calendar}${U.esc(U.fmtDate(b.moveIn))} → ${U.esc(U.fmtDate(b.moveOut))}</span>
              <span class="muted">${U.esc(U.plural(b.months, "month"))}</span>
            </span>
            <span class="bk-card__foot">
              <small class="muted">Requested ${U.esc(U.fmtDate(b.createdAt))}</small>
              <strong>${U.esc(U.fmtRM(b.amounts && b.amounts.payNow))}</strong>
            </span>
          </a>`
          )
          .join("")}
      </div>`;
  }

  /** Re-draw chips + results only, so the search box keeps focus. */
  function renderResults() {
    if (!host) return;
    const chipsEl = U.qs("#bkChips", host);
    const resEl = U.qs("#bkResults", host);
    if (!chipsEl || !resEl) return;
    const base = S.getBookings().filter(matchesBase);
    const rows = filters.status === "ALL" ? base : base.filter((b) => b.status === filters.status);
    chipsEl.innerHTML = chipsHtml(base);
    if (!rows.length) {
      const any = filters.q || filters.house || filters.month || filters.status !== "ALL";
      resEl.innerHTML = A.emptyState(any ? "No bookings match these filters." : "No bookings yet. New requests from the website appear here.", A.icons.calendar);
    } else {
      resEl.innerHTML = MOBILE_MQ.matches ? cardsHtml(rows) : tableHtml(rows);
    }
    U.initReveal(resEl);
    U.initImages(resEl);
  }

  function bindList(el) {
    const search = U.qs("#bkSearch", el);
    search.addEventListener(
      "input",
      U.debounce(() => {
        filters.q = search.value;
        renderResults();
      }, 160)
    );
    U.qs("#bkHouse", el).addEventListener("change", (e) => {
      filters.house = e.target.value;
      renderResults();
    });
    U.qs("#bkMonth", el).addEventListener("change", (e) => {
      filters.month = e.target.value;
      renderResults();
    });
    U.qs("#bkChips", el).addEventListener("click", (e) => {
      const chip = e.target.closest("[data-status]");
      if (!chip) return;
      filters.status = chip.dataset.status;
      renderResults();
    });
    const results = U.qs("#bkResults", el);
    results.addEventListener("click", (e) => {
      const row = e.target.closest("tr[data-href]");
      if (row) A.go("booking", row.dataset.href);
    });
    results.addEventListener("keydown", (e) => {
      const row = e.target.closest("tr[data-href]");
      if (row && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        A.go("booking", row.dataset.href);
      }
    });
  }

  // Swap table <-> cards when crossing the phone breakpoint.
  const onMedia = () => {
    if (host && !host.hidden) renderResults();
  };
  if (MOBILE_MQ.addEventListener) MOBILE_MQ.addEventListener("change", onMedia);
  else if (MOBILE_MQ.addListener) MOBILE_MQ.addListener(onMedia);

  /* --------------------------------------------------------------- Stepper */
  const STEPS = ["Submitted", "Confirmed", "Moved in", "Ended"];

  /** Index of the step where a rejected / cancelled booking stopped. */
  function failedIndex(b) {
    if (b.status === "REJECTED") return 1;
    const hist = b.history || [];
    const wasConfirmed = hist.some((h) => h.status === "CONFIRMED");
    if (!wasConfirmed) return 1;
    const cancelled = [...hist].reverse().find((h) => h.status === "CANCELLED");
    const at = cancelled ? String(cancelled.at).slice(0, 10) : U.todayISO();
    return at >= b.moveIn ? 3 : 2;
  }

  function stepperHtml(b) {
    const reached = { PENDING: 1, CONFIRMED: 2, ACTIVE: 3, ENDED: 4 }[b.status];
    const failed = reached === undefined ? failedIndex(b) : -1;
    return `<div class="stepper bk-stepper">${STEPS.map((label, i) => {
      let cls = "";
      let dot = String(i + 1);
      let text = label;
      if (failed >= 0) {
        if (i < failed) {
          cls = "is-done";
          dot = A.icons.check;
        } else if (i === failed) {
          cls = "is-failed";
          dot = A.icons.x;
          text = S.STATUS_LABEL[b.status];
        }
      } else if (i < reached) {
        cls = "is-done";
        dot = A.icons.check;
      } else if (i === reached) {
        cls = "is-current";
      }
      return `<div class="stepper__step ${cls}"><span class="stepper__dot">${dot}</span>${U.esc(text)}</div>`;
    }).join("")}</div>`;
  }

  /* ---------------------------------------------------------------- Detail */
  function whatsappText(b, house) {
    const first = String(b.name || "").split(/\s+/)[0] || "there";
    const hn = house ? house.name : "the house";
    const intro = `Hi ${first}, this is Happy Home about your booking ${b.ref} for ${hn}.`;
    const msg = {
      PENDING: "We have received your payment receipt and are reviewing it now. We will update you shortly.",
      CONFIRMED: `Good news - your booking is confirmed! Move-in date: ${U.fmtDate(b.moveIn)}.`,
      ACTIVE: "We hope you are settling in well. Let us know if you need anything.",
      ENDED: "Thank you for staying with us. We hope to host you again!",
      REJECTED: "We are sorry, we could not confirm this booking.",
      CANCELLED: "This booking has been cancelled."
    }[b.status];
    const note = b.adminNote && ["REJECTED", "CANCELLED", "CONFIRMED"].includes(b.status) ? ` Note: ${b.adminNote}` : "";
    return `${intro} ${msg || ""}${note}`.trim();
  }

  function houseHtml(b, house) {
    if (!house) {
      return `<div class="bk-house-card"><span class="bk-house-card__thumb"></span>
        <span class="bk-house-card__text"><strong>Removed house</strong><small class="muted">This house no longer exists.</small></span></div>`;
    }
    const thumb = S.coverImage(house);
    return `
      <div class="bk-house-card">
        <span class="bk-house-card__thumb skeleton">${thumb ? `<img class="img-load" src="${U.esc(thumb)}" alt="">` : ""}</span>
        <span class="bk-house-card__text">
          <strong>${U.esc(house.name)}</strong>
          <small class="muted">${U.esc(house.area || "")}</small>
          <a href="../house.html?id=${encodeURIComponent(house.id)}" target="_blank" rel="noopener" class="bk-link">View on website ${A.icons.chevron}</a>
        </span>
      </div>`;
  }

  function receiptHtml(b) {
    const r = b.receipt;
    if (!r) return `<p class="muted small bk-receipt-none">${A.icons.image}Receipt kept offline (demo data)</p>`;
    if (/^data:application\/pdf/i.test(r)) {
      return `<a class="btn btn--ghost btn--sm" href="${U.esc(r)}" download="${U.esc(b.ref)}-receipt.pdf">${A.icons.upload}Download PDF receipt</a>`;
    }
    return `<button type="button" class="bk-receipt" data-receipt aria-label="Open receipt">
      <img src="${U.esc(r)}" alt="Payment receipt for ${U.esc(b.ref)}"><span class="bk-receipt__zoom">${A.icons.eye}View full size</span></button>`;
  }

  function historyHtml(b) {
    const items = b.history || [];
    if (!items.length) return `<p class="muted small">No history yet.</p>`;
    return `<ul class="timeline">${items
      .map(
        (h) => `<li><strong>${U.esc(h.status === "PENDING" ? "Submitted" : S.STATUS_LABEL[h.status] || h.status)}</strong>
          <small>${U.esc(U.fmtDateTime(h.at))}</small>${h.note ? `<p>${U.esc(h.note)}</p>` : ""}</li>`
      )
      .join("")}</ul>`;
  }

  function detailBody(b) {
    const house = S.getHouse(b.houseId);
    const a = b.amounts || {};
    const canEdit = Object.values(S.allowedActions(b)).some(Boolean);
    return `
      <div class="booking-detail">
        <section class="drawer__section">
          <div class="bk-status">${A.statusBadge(b.status)}<small class="muted">Updated ${U.esc(U.fmtDateTime(b.updatedAt || b.createdAt))}</small></div>
          ${stepperHtml(b)}
        </section>

        <section class="drawer__section">
          <h3>House</h3>
          ${houseHtml(b, house)}
        </section>

        <section class="drawer__section">
          <h3>Customer</h3>
          <div class="bk-customer">
            ${avatar(b.name, false)}
            <div class="bk-customer__text">
              <strong>${U.esc(b.name)}</strong>
              <small class="muted">${U.esc(U.plural(b.occupants || 1, "occupant"))}</small>
            </div>
          </div>
          <dl class="kv bk-kv">
            <dt>Phone</dt>
            <dd class="bk-phone">${U.esc(U.fmtPhone(b.phone))}
              <a class="btn btn--sm btn--success bk-wa" href="${U.esc(U.whatsappUrl(b.phone, whatsappText(b, house)))}" target="_blank" rel="noopener">${A.icons.whatsapp}WhatsApp</a>
            </dd>
            <dt>Email</dt>
            <dd>${b.email ? `<a class="bk-link" href="mailto:${U.esc(b.email)}">${U.esc(b.email)}</a>` : `<span class="muted">Not given</span>`}</dd>
            <dt>Occupants</dt>
            <dd>${U.esc(String(b.occupants || 1))}</dd>
          </dl>
        </section>

        <section class="drawer__section">
          <h3>Lease</h3>
          <dl class="kv">
            <dt>Move-in</dt><dd>${U.esc(U.fmtDate(b.moveIn))}</dd>
            <dt>Move-out</dt><dd>${U.esc(U.fmtDate(b.moveOut))}</dd>
            <dt>Tenure</dt><dd>${U.esc(U.plural(b.months, "month"))}</dd>
          </dl>
        </section>

        <section class="drawer__section">
          <h3>Payment</h3>
          <dl class="kv">
            <dt>First month rent</dt><dd>${U.esc(U.fmtRM(a.rent))}</dd>
            <dt>Deposit</dt><dd>${U.esc(U.fmtRM(a.deposit))}</dd>
            <dt>Utility deposit</dt><dd>${U.esc(U.fmtRM(a.utility))}</dd>
            <dt>Total paid upfront</dt><dd class="total">${U.esc(U.fmtRM(a.payNow))}</dd>
            <dt>Contract value</dt><dd>${U.esc(U.fmtRM(a.contract))}</dd>
          </dl>
        </section>

        <section class="drawer__section">
          <h3>Receipt</h3>
          ${receiptHtml(b)}
        </section>

        <section class="drawer__section">
          <h3>Admin note to customer</h3>
          <div class="field">
            <textarea class="textarea" id="bkNote" rows="3" maxlength="500" placeholder="${canEdit ? "e.g. Keys can be collected from the guard house." : "No note"}"${canEdit ? "" : " readonly"}>${U.esc(b.adminNote || "")}</textarea>
            <span class="hint">The customer sees this note when tracking the booking. Required when rejecting.</span>
          </div>
        </section>

        <section class="drawer__section">
          <h3>History</h3>
          ${historyHtml(b)}
        </section>
      </div>`;
  }

  function detailFoot(b) {
    const can = S.allowedActions(b);
    return [
      `<button type="button" class="btn btn--ghost" data-drawer-close>Close</button>`,
      can.cancel ? `<button type="button" class="btn btn--ghost bk-act-cancel" data-act="CANCELLED">${A.icons.ban}Cancel booking</button>` : "",
      can.reject ? `<button type="button" class="btn btn--danger" data-act="REJECTED">${A.icons.x}Reject</button>` : "",
      can.confirm ? `<button type="button" class="btn btn--success" data-act="CONFIRMED">${A.icons.check}Confirm</button>` : ""
    ].join("");
  }

  let busy = false;

  async function runAction(b, status, drawer) {
    if (busy) return;
    const noteEl = U.qs("#bkNote", drawer);
    const note = noteEl ? noteEl.value.trim() : "";
    if (status === "REJECTED") {
      if (!note) {
        U.setInvalid(noteEl, "Add a note so the customer knows why the booking was rejected.");
        noteEl.focus();
        noteEl.scrollIntoView({ behavior: "smooth", block: "center" });
        U.toast("Please write a note before rejecting.", "error");
        return;
      }
      const ok = await U.confirm({
        title: `Reject ${b.ref}?`,
        message: `${b.name} will see your note when tracking this booking. The dates will be released for other customers.`,
        okText: "Reject booking",
        danger: true
      });
      if (!ok) return;
    }
    if (status === "CANCELLED") {
      const ok = await U.confirm({
        title: `Cancel ${b.ref}?`,
        message: "The booking will be marked as cancelled and the house becomes free for these dates. This cannot be undone.",
        okText: "Cancel booking",
        cancelText: "Keep booking",
        danger: true
      });
      if (!ok) return;
    }
    busy = true;
    const res = S.setBookingStatus(b.ref, status, note);
    busy = false;
    if (!res.ok) {
      U.toast(res.reason || "Could not update this booking.", "error", 4200);
      return;
    }
    U.toast(`${b.ref} ${S.STATUS_LABEL[status].toLowerCase()}.`, "success");
    A.refreshBadges();
    A.refresh(); // re-renders the list and re-opens the drawer with fresh data
  }

  function bindDetail(drawer, b) {
    const noteEl = U.qs("#bkNote", drawer);
    if (noteEl) noteEl.addEventListener("input", () => U.clearInvalid(noteEl));
    const receiptBtn = U.qs("[data-receipt]", drawer);
    if (receiptBtn) {
      receiptBtn.addEventListener("click", () => U.lightbox([{ src: b.receipt, caption: `Payment receipt · ${b.ref}` }]));
    }
    U.qsa("[data-act]", drawer).forEach((btn) => {
      btn.addEventListener("click", () => runAction(b, btn.dataset.act, drawer));
    });
  }

  function onDrawerClosed() {
    drawerRef = null;
    if (silentClose) return;
    if (/^#booking\//.test(location.hash)) A.go("booking");
  }

  function openDetail(ref) {
    const b = S.getBooking(ref);
    if (!b) {
      U.toast(`Booking ${ref} was not found.`, "error");
      closeDetailSilently();
      A.go("booking");
      return;
    }
    drawerRef = b.ref;
    const drawer = A.openDrawer({
      title: b.ref,
      body: detailBody(b),
      foot: detailFoot(b),
      wide: false,
      onClose: onDrawerClosed
    });
    bindDetail(drawer, b);
  }

  function closeDetailSilently() {
    if (!drawerRef) return;
    silentClose = true;
    A.closeDrawer();
    silentClose = false;
    drawerRef = null;
  }

  /* ---------------------------------------------------------------- Render */
  function render(el, param) {
    host = el;
    const list = S.getBookings();
    initFilters(list);
    el.innerHTML = toolbarHtml(list);
    bindList(el);
    renderResults();
    if (param) openDetail(param);
    else closeDetailSilently(); // e.g. browser Back from #booking/<ref>
  }

  A.register("booking", {
    title: "Booking",
    subtitle: () => {
      const list = S.getBookings();
      const waiting = list.filter((b) => b.status === "PENDING").length;
      return `${U.plural(list.length, "booking")} · ${waiting} waiting`;
    },
    render
  });
})(window);
