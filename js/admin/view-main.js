/* ==========================================================================
   Happy Home - admin/view-main.js
   "Main" overview: welcome hero, headline stats, pending queue, upcoming
   move-ins / lease ends, house strip and recent booking activity.
   ========================================================================== */
(function (global) {
  "use strict";
  if (!global.Admin) return;

  const U = global.UI;
  const S = global.Store;
  const A = global.Admin;
  const I = A.icons;

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }

  function sessionName() {
    const s = S.getSession() || A.session || {};
    return String(s.name || "there");
  }

  /* ------------------------------------------------------------- Sections */
  function hero(st) {
    const today = new Date().toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const occ = `${st.occupied} of ${U.plural(st.activeHouses, "house")} occupied`;
    const wait = st.pending
      ? `${U.plural(st.pending, "booking")} waiting for you`
      : "no bookings waiting";
    return `
      <div class="mhero reveal" style="--i:0">
        <div class="mhero__text">
          <span class="mhero__date">${I.calendar}${U.esc(today)}</span>
          <h2 class="mhero__title">${U.esc(greeting())}, ${U.esc(sessionName())}</h2>
          <p class="mhero__line">${U.esc(occ)} · ${U.esc(wait)}</p>
        </div>
        <div class="mhero__actions">
          <a class="btn btn--primary" href="#booking">${I.inbox}Review bookings</a>
          <a class="btn btn--glass" href="#house/new">${I.plus}Add house</a>
        </div>
      </div>`;
  }

  function statCard({ i, icon, label, foot, key, navy }) {
    return `
      <div class="stat${navy ? " stat--navy" : ""} reveal" style="--i:${i}">
        <span class="stat__icon">${icon}</span>
        <span class="stat__label">${U.esc(label)}</span>
        <strong class="stat__value" data-count="${key}">0</strong>
        <div class="stat__foot">${U.esc(foot)}</div>
      </div>`;
  }

  function statsBlock(st) {
    return `
      <div class="stats">
        ${statCard({ i: 1, icon: I.key, label: "Houses occupied", foot: `out of ${U.plural(st.activeHouses, "listed house")}`, key: "occupied", navy: true })}
        ${statCard({ i: 2, icon: I.clock, label: "Pending bookings", foot: st.pending ? "Need your review" : "All caught up", key: "pending" })}
        ${statCard({ i: 3, icon: I.money, label: "Rent this month", foot: "From occupied houses", key: "rent" })}
        ${statCard({ i: 4, icon: I.calendar, label: "New this week", foot: "Bookings in the last 7 days", key: "week" })}
      </div>`;
  }

  function pendingPanel(pending) {
    const body = pending.length
      ? pending.map((b) => A.bookingRow(b, { meta: "created" })).join("")
      : A.emptyState("No bookings waiting. You're all caught up.", I.check);
    return `
      <div class="panel reveal" style="--i:5">
        <div class="panel__head">
          <h2>Waiting for confirmation</h2>
          <a href="#booking">View all</a>
        </div>
        <div class="panel__body panel__body--flush">${body}</div>
      </div>`;
  }

  function soonPanel(st) {
    const ins = st.moveInsSoon.length
      ? st.moveInsSoon.map((b) => A.bookingRow(b)).join("")
      : A.emptyState("No move-ins in the next 30 days.", I.calendar);
    const outs = st.moveOutsSoon.length
      ? `<ul class="msoon">${st.moveOutsSoon
          .map(
            (b) => `
          <li><a href="#booking/${encodeURIComponent(b.ref)}">
            <span><strong>${U.esc(b.name)}</strong><small>${U.esc(A.houseName(b.houseId))}</small></span>
            <span class="msoon__date">${U.esc(U.fmtDate(b.moveOut))}</span>
          </a></li>`
          )
          .join("")}</ul>`
      : `<p class="msoon__none">No leases ending in the next 60 days.</p>`;
    return `
      <div class="panel reveal" style="--i:6">
        <div class="panel__head">
          <h2>Moving in soon (30 days)</h2>
          <a href="#booking">Calendar</a>
        </div>
        <div class="panel__body panel__body--flush">${ins}</div>
        <div class="msoon__wrap">
          <h3 class="msoon__title">${I.key}Leases ending soon</h3>
          ${outs}
        </div>
      </div>`;
  }

  function houseStatus(h, bookings, today) {
    if (h.status === "hidden") {
      return `<span class="mhouse__pill mhouse__pill--hidden">${I.eyeOff}Hidden</span>`;
    }
    const act = bookings.find((b) => b.houseId === h.id && b.status === "ACTIVE");
    if (act) {
      return `<span class="mhouse__pill mhouse__pill--occupied">Occupied until ${U.esc(U.fmtDate(act.moveOut))}</span>`;
    }
    const from = S.availableFrom(h.id);
    const label = !from || from <= today ? "Available now" : `Available from ${U.fmtDate(from)}`;
    return `<span class="mhouse__pill mhouse__pill--free">${U.esc(label)}</span>`;
  }

  function housesStrip(houses, bookings) {
    const today = U.todayISO();
    const cards = houses
      .map((h, n) => {
        const img = S.coverImage(h);
        return `
        <a class="mhouse reveal" style="--i:${Math.min(n, 6)}" href="#house/${encodeURIComponent(h.id)}">
          <span class="mhouse__photo skeleton">${img ? `<img class="img-load" src="${U.esc(img)}" alt="${U.esc(h.name)}" loading="lazy">` : ""}
            ${houseStatus(h, bookings, today)}
          </span>
          <span class="mhouse__info">
            <strong>${U.esc(h.name)}</strong>
            <small>${U.esc(h.area || "")}</small>
            <span class="mhouse__rent">${U.fmtRM(h.rentMonthly)}<small>/month</small></span>
          </span>
        </a>`;
      })
      .join("");
    return `
      <section class="mhouses">
        <div class="mhouses__head reveal" style="--i:0">
          <h2>Your houses</h2>
          <a class="panel__link" href="#house">Manage houses</a>
        </div>
        ${houses.length ? `<div class="mhouses__track">${cards}</div>` : A.emptyState("No houses yet. Add your first one.", I.house)}
      </section>`;
  }

  function activityPanel(bookings) {
    const events = [];
    bookings.forEach((b) =>
      (b.history || []).forEach((h) => events.push({ ...h, ref: b.ref, name: b.name, houseId: b.houseId }))
    );
    events.sort((a, b) => (String(a.at) < String(b.at) ? 1 : -1));
    const list = events.slice(0, 6);
    const body = list.length
      ? `<ul class="timeline">${list
          .map(
            (e) => `
          <li>
            <strong><a href="#booking/${encodeURIComponent(e.ref)}">${U.esc(e.name)}</a> · ${U.esc(S.STATUS_LABEL[e.status] || e.status)}</strong>
            <small>${U.esc(e.ref)} · ${U.esc(A.houseName(e.houseId))} · ${U.esc(U.fmtDateTime(e.at))}</small>
            ${e.note ? `<p>${U.esc(e.note)}</p>` : ""}
          </li>`
          )
          .join("")}</ul>`
      : A.emptyState("No activity yet.", I.clock);
    return `
      <div class="panel mactivity reveal" style="--i:1">
        <div class="panel__head">
          <h2>Recent activity</h2>
          <a href="#booking">All bookings</a>
        </div>
        <div class="panel__body">${body}</div>
      </div>`;
  }

  /* --------------------------------------------------------------- Render */
  function render(el) {
    const st = S.stats();
    const bookings = S.getBookings();
    const pending = bookings
      .filter((b) => b.status === "PENDING")
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const houses = S.getHouses({ includeHidden: true });

    el.innerHTML = `
      ${hero(st)}
      ${statsBlock(st)}
      <div class="panels">
        ${pendingPanel(pending)}
        ${soonPanel(st)}
      </div>
      ${housesStrip(houses, bookings)}
      ${activityPanel(bookings)}`;

    const n = (k) => U.qs(`[data-count="${k}"]`, el);
    U.countUp(n("occupied"), st.occupied, { suffix: ` / ${st.activeHouses}` });
    U.countUp(n("pending"), st.pending);
    U.countUp(n("rent"), st.rentThisMonth, { prefix: "RM " });
    U.countUp(n("week"), st.newThisWeek);
  }

  A.register("main", {
    title: "Main",
    subtitle: () => `${greeting()}, ${sessionName()}`,
    render
  });
})(window);
