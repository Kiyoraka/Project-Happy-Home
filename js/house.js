/* ==========================================================================
   Happy Home - house.js
   House detail page (house.html?id=h1): photo gallery with lightbox, specs,
   description, amenities, every room with the items inside it, booked
   periods, and a sticky price panel that opens the booking form.
   Depends on: ui.js, seed.js, store.js; booking.js provides window.Booking
   ========================================================================== */
(function () {
  "use strict";

  const U = window.UI;
  const S = window.Store;

  const I = (d, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    back: I('<path d="m15 18-6-6 6-6"/>', 2.4),
    pin: I('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
    bed: I('<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M2 17h20"/>'),
    bath: I('<path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/><path d="M6 12V5a2 2 0 0 1 3.5-1.3"/>'),
    area: I('<path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/>'),
    sofa: I('<path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2Z"/>'),
    check: I('<path d="M20 6 9 17l-5-5"/>', 2.4),
    chevDown: I('<path d="m6 9 6 6 6-6"/>', 2.4),
    chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>',
    photos: I('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>'),
    calendar: I('<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M4 10h16"/>'),
    shield: I('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>'),
    clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    wa: I('<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4Z"/><path d="M9 10c.5 2 2 3.5 4 4l1.2-1.2 2 .8-.4 2c-3.5.3-7.3-3.5-7-7l2-.4.8 2Z"/>', 1.8),
    rooms: {
      living: I('<path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2Z"/><path d="M5 18v2M19 18v2"/>'),
      dining: I('<path d="M3 10h18"/><path d="M5 10v10M19 10v10"/><path d="M8 4v3M12 4v3M16 4v3"/>'),
      kitchen: I('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M4 10h16M8 6h.01M8 14v3"/>'),
      bedroom: I('<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M2 17h20"/>'),
      bathroom: I('<path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/><path d="M6 12V5a2 2 0 0 1 3.5-1.3"/><path d="M6 20l-1 2M18 20l1 2"/>'),
      study: I('<rect x="2" y="4" width="20" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
      outdoor: I('<path d="M12 22V12"/><path d="M12 12c-4 0-7-3-7-7 4 0 7 3 7 7Z"/><path d="M12 12c4 0 7-3 7-7-4 0-7 3-7 7Z"/>'),
      other: I('<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/>')
    }
  };

  const FURNISH = { full: "Fully furnished", partial: "Partly furnished", none: "Unfurnished" };

  function paintSettings() {
    const s = S.getSettings();
    U.qsa("[data-setting]").forEach((el) => {
      const [group, key] = el.dataset.setting.split(".");
      const value = s[group] && s[group][key];
      if (value) el.textContent = value;
    });
    U.qsa(".js-wa").forEach((a) => (a.href = U.whatsappUrl(s.company.whatsapp, "Hi Happy Home, I would like to ask about renting a house.")));
    const year = U.qs("#year");
    if (year) year.textContent = new Date().getFullYear();
  }

  function notFound(root) {
    document.title = "House not found · Happy Home";
    root.innerHTML = `
      <section class="container house-missing fade-up">
        ${ICON.rooms.other}
        <h1 class="h2">We could not find that house</h1>
        <p class="muted">It may have been taken off the website. Have a look at our other homes.</p>
        <a class="btn btn--primary" href="index.html#houses">See all houses ${ICON.chev}</a>
      </section>`;
  }

  function gallery(h) {
    const imgs = (h.images || []).map((i) => ({ src: S.imageUrl(i.src), caption: i.caption || h.name }));
    if (!imgs.length) return `<div class="hgallery hgallery--empty">${ICON.photos}<p>Photos coming soon</p></div>`;
    const tile = (img, i, cls = "") => `
      <button type="button" class="hgallery__tile ${cls} skeleton" data-photo="${i}" aria-label="Open photo ${i + 1}">
        <img class="img-load" src="${U.esc(img.src)}" alt="${U.esc(img.caption)}">
        <span class="hgallery__cap">${U.esc(img.caption)}</span>
      </button>`;
    return `
      <div class="hgallery hgallery--${Math.min(imgs.length, 3)}">
        ${tile(imgs[0], 0, "hgallery__tile--main")}
        ${imgs.slice(1, 3).map((img, k) => tile(img, k + 1)).join("")}
        <button type="button" class="btn btn--glass btn--sm hgallery__all" data-photo="0">${ICON.photos} ${U.plural(imgs.length, "photo")}</button>
      </div>`;
  }

  function roomsBlock(h) {
    const rooms = h.rooms || [];
    if (!rooms.length) return `<p class="muted">Room details coming soon.</p>`;
    const total = rooms.reduce((n, r) => n + r.items.reduce((m, it) => m + (Number(it.qty) || 1), 0), 0);
    return `
      <div class="rooms-head">
        <p class="muted">${U.plural(rooms.length, "room")} · ${U.plural(total, "item")} included</p>
        <button type="button" class="link-btn" id="toggleRooms">Expand all</button>
      </div>
      <div class="rooms">
        ${rooms
          .map(
            (r, i) => `
          <div class="room reveal${i === 0 ? " is-open" : ""}" style="--i:${Math.min(i, 6)}">
            <button type="button" class="room__head" aria-expanded="${i === 0}">
              <span class="room__icon">${ICON.rooms[r.type] || ICON.rooms.other}</span>
              <span class="room__title">
                <strong>${U.esc(r.name)}</strong>
                <small>${r.items.length ? U.plural(r.items.length, "item type") : "Empty room"}${r.note ? ` · ${U.esc(r.note)}` : ""}</small>
              </span>
              <span class="room__chev">${ICON.chevDown}</span>
            </button>
            <div class="room__panel">
              <div class="room__inner">
                ${
                  r.items.length
                    ? `<ul class="room__items">${r.items
                        .map((it) => `<li>${ICON.check}<span>${U.esc(it.name)}</span>${Number(it.qty) > 1 ? `<em>×${Number(it.qty)}</em>` : ""}</li>`)
                        .join("")}</ul>`
                    : `<p class="muted small">Nothing inside yet - bring your own furniture.</p>`
                }
                ${r.note ? `<p class="room__note">${U.esc(r.note)}</p>` : ""}
              </div>
            </div>
          </div>`
          )
          .join("")}
      </div>`;
  }

  function bookedBlock(h) {
    const ranges = S.liveRanges(h.id).filter((r) => r.to > U.todayISO());
    if (!ranges.length) return `<p class="free-line">${ICON.check} No upcoming bookings - pick any move-in date from today.</p>`;
    return `<ul class="booked">${ranges
      .map(
        (r) => `<li><span class="booked__dot booked__dot--${r.status.toLowerCase()}"></span>
          <span>${U.fmtDate(r.from)} → ${U.fmtDate(r.to)}</span>
          <small>${r.status === "PENDING" ? "On hold (awaiting confirmation)" : r.status === "ACTIVE" ? "Occupied" : "Booked"}</small></li>`
      )
      .join("")}</ul>`;
  }

  function pricePanel(h) {
    const a = S.amountsFor(h, h.minMonths);
    const from = S.availableFrom(h.id);
    const now = from === U.todayISO();
    return `
      <aside class="price-panel">
        <div class="price-panel__card">
          <p class="price-panel__rent">${U.fmtRM(h.rentMonthly)} <small>/ month</small></p>
          <p class="price-panel__avail ${now ? "is-now" : ""}">${ICON.calendar}${now ? "Available now" : `Available from ${U.esc(U.fmtDate(from))}`}</p>
          <dl class="price-panel__list">
            <div><dt>Security deposit</dt><dd>${U.plural(h.depositMonths, "month")} · ${U.fmtRM(a.deposit)}</dd></div>
            <div><dt>Utility deposit</dt><dd>${U.fmtRM(a.utility)}</dd></div>
            <div><dt>Minimum stay</dt><dd>${U.plural(h.minMonths, "month")}</dd></div>
            <div class="is-total"><dt>Pay to book</dt><dd>${U.fmtRM(a.payNow)}</dd></div>
          </dl>
          <button type="button" class="btn btn--primary btn--lg btn--block" data-book>Book this house ${ICON.chev}</button>
          <a class="btn btn--ghost btn--block" target="_blank" rel="noopener" href="${U.whatsappUrl(S.getSettings().company.whatsapp, `Hi Happy Home, I am interested in ${h.name} (${h.area}).`)}">${ICON.wa} Ask on WhatsApp</a>
          <ul class="price-panel__perks">
            <li>${ICON.shield} Deposit refunded at move-out</li>
            <li>${ICON.clock} Booking confirmed within 24 hours</li>
          </ul>
        </div>
      </aside>`;
  }

  function render() {
    const root = U.qs("#houseRoot");
    const id = new URLSearchParams(location.search).get("id");
    const h = id ? S.getHouse(id) : null;
    if (!h || h.status !== "active") return notFound(root);

    document.title = `${h.name} · ${h.area} · Happy Home`;
    root.innerHTML = `
      <section class="house-top">
        <div class="container">
          <a class="back-link fade-up" href="index.html#houses">${ICON.back} Back to houses</a>
          ${gallery(h)}
        </div>
      </section>

      <section class="container house-layout">
        <div class="house-main">
          <header class="house-head reveal">
            <div class="house-head__badges">
              <span class="badge badge--glass-light">${ICON.sofa}${U.esc(FURNISH[h.furnishing] || "Furnished")}</span>
              <span class="badge">${U.esc(h.type)}</span>
            </div>
            <h1 class="h2">${U.esc(h.name)}</h1>
            <p class="house-head__addr">${ICON.pin}${U.esc(h.address || h.area)}</p>
            <div class="house-specs">
              <span>${ICON.bed}<strong>${h.bedrooms}</strong> Bedrooms</span>
              <span>${ICON.bath}<strong>${h.bathrooms}</strong> Bathrooms</span>
              ${h.sqft ? `<span>${ICON.area}<strong>${U.fmtNumber(h.sqft)}</strong> sqft</span>` : ""}
            </div>
          </header>

          <article class="house-section reveal">
            <h2 class="h3">About this home</h2>
            <p class="house-desc">${U.esc(h.description || "")}</p>
            ${h.amenities && h.amenities.length ? `<ul class="amenities">${h.amenities.map((a) => `<li>${ICON.check}${U.esc(a)}</li>`).join("")}</ul>` : ""}
          </article>

          <article class="house-section reveal" id="rooms">
            <h2 class="h3">Rooms &amp; what's inside</h2>
            ${roomsBlock(h)}
          </article>

          <article class="house-section reveal">
            <h2 class="h3">Booked periods</h2>
            ${bookedBlock(h)}
          </article>
        </div>
        ${pricePanel(h)}
      </section>

      <div class="mobile-book">
        <div><strong>${U.fmtRM(h.rentMonthly)}</strong><small>/ month</small></div>
        <button type="button" class="btn btn--primary" data-book>Book now ${ICON.chev}</button>
      </div>`;

    bind(h);
    U.initImages(root);
    U.initReveal(root);
  }

  function bind(h) {
    const root = U.qs("#houseRoot");
    const photos = (h.images || []).map((i) => ({ src: S.imageUrl(i.src), caption: i.caption || h.name }));
    U.qsa("[data-photo]", root).forEach((b) => b.addEventListener("click", () => U.lightbox(photos, Number(b.dataset.photo))));

    U.qsa(".room__head", root).forEach((btn) =>
      btn.addEventListener("click", () => {
        const room = btn.closest(".room");
        const open = !room.classList.contains("is-open");
        room.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", open);
      })
    );
    const toggle = U.qs("#toggleRooms", root);
    if (toggle) {
      toggle.addEventListener("click", () => {
        const rooms = U.qsa(".room", root);
        const openAll = rooms.some((r) => !r.classList.contains("is-open"));
        rooms.forEach((r) => {
          r.classList.toggle("is-open", openAll);
          U.qs(".room__head", r).setAttribute("aria-expanded", openAll);
        });
        toggle.textContent = openAll ? "Collapse all" : "Expand all";
      });
    }

    U.qsa("[data-book]", root).forEach((b) => b.addEventListener("click", () => window.Booking && window.Booking.open(h.id)));
    if (location.hash === "#book") setTimeout(() => window.Booking && window.Booking.open(h.id), 300);
  }

  U.ready(() => {
    paintSettings();
    render();
    // Admin changed something (price, rooms, a booking) in another tab.
    S.onChange(() => {
      if (!U.qs("#bookModal.is-open")) render();
    });
  });

  window.HousePage = { render };
})();
