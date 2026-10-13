/* ==========================================================================
   Happy Home - landing.js
   Landing page: navbar on scroll, hero crossfade, search + filter chips,
   house cards with live availability, gallery masonry + lightbox, settings
   (company name, contact) painted into the page, scroll-spy for the phone
   bottom nav. Re-renders when the admin changes data in another tab.
   Depends on: ui.js, seed.js, store.js
   ========================================================================== */
(function () {
  "use strict";

  const U = window.UI;
  const S = window.Store;

  const ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M2 17h20"/></svg>',
    bath: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/><path d="M6 12V5a2 2 0 0 1 3.5-1.3"/></svg>',
    area: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg>',
    sofa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2Z"/><path d="M5 18v2M19 18v2"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'
  };

  const FURNISH = { full: "Fully furnished", partial: "Partly furnished", none: "Unfurnished" };

  const state = { chip: "all", area: "", beds: "", rent: "" };

  /* ------------------------------------------------------------- Settings */
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

  /* ---------------------------------------------------------------- Navbar */
  function initNav() {
    const nav = U.qs("#nav");
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    U.qsa('a[href^="#"]').forEach((a) =>
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2 || !U.qs(id)) return;
        e.preventDefault();
        U.scrollToId(id, id === "#top" ? 0 : 60);
        history.replaceState(null, "", id === "#top" ? location.pathname : id);
      })
    );

    U.scrollSpy(U.qsa(".nav__links a"), { offset: 160 });
    const bottomLinks = U.qsa(".site-bottom-nav a");
    U.scrollSpy(bottomLinks, { offset: 200 });
  }

  /* ------------------------------------------------------------------ Hero */
  function initHero() {
    const slides = U.qsa(".hero__slide");
    const dots = U.qs("#heroDots");
    if (!slides.length) return;
    slides.forEach((s) => {
      const img = new Image();
      img.onload = () => (s.style.backgroundImage = `url("${img.src}")`);
      img.src = s.dataset.src;
    });
    let index = 0;
    let timer;
    dots.innerHTML = slides.map((_, i) => `<button type="button" aria-label="Photo ${i + 1}"${i === 0 ? ' class="is-active"' : ""}></button>`).join("");
    const go = (i) => {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle("is-active", k === index));
      U.qsa("button", dots).forEach((d, k) => d.classList.toggle("is-active", k === index));
    };
    const start = () => {
      clearInterval(timer);
      if (!U.prefersReducedMotion()) timer = setInterval(() => go(index + 1), 6500);
    };
    U.qsa("button", dots).forEach((d, k) =>
      d.addEventListener("click", () => {
        go(k);
        start();
      })
    );
    document.addEventListener("visibilitychange", () => (document.hidden ? clearInterval(timer) : start()));
    start();
  }

  /* ---------------------------------------------------------------- Search */
  function fillSearch(houses) {
    const areaSel = U.qs("#fArea");
    const current = areaSel.value;
    const areas = [...new Set(houses.map((h) => h.area).filter(Boolean))].sort();
    areaSel.innerHTML = '<option value="">Any area</option>' + areas.map((a) => `<option value="${U.esc(a)}">${U.esc(a)}</option>`).join("");
    areaSel.value = areas.includes(current) ? current : "";
    const min = houses.reduce((m, h) => Math.min(m, h.rentMonthly), Infinity);
    U.qs("#factFrom").textContent = Number.isFinite(min) ? U.fmtRM(min) : "--";
    U.qs("#heroCount").textContent = houses.length;
  }

  function initSearch() {
    U.qs("#searchForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.area = U.qs("#fArea").value;
      state.beds = U.qs("#fBeds").value;
      state.rent = U.qs("#fRent").value;
      renderHouses();
      U.scrollToId("#houses", 40);
    });
    U.qsa("#houseChips .chip").forEach((chip) =>
      chip.addEventListener("click", () => {
        state.chip = chip.dataset.chip;
        U.qsa("#houseChips .chip").forEach((c) => c.classList.toggle("is-active", c === chip));
        renderHouses();
      })
    );
  }

  function matches(h) {
    if (state.area && h.area !== state.area) return false;
    if (state.beds && h.bedrooms < Number(state.beds)) return false;
    if (state.rent && h.rentMonthly > Number(state.rent)) return false;
    if (state.chip === "now" && !S.isAvailableNow(h.id)) return false;
    if (state.chip === "big" && h.bedrooms < 4) return false;
    if (state.chip === "budget" && h.rentMonthly >= 1300) return false;
    return true;
  }

  /* ---------------------------------------------------------------- Houses */
  function availabilityBadge(h) {
    const from = S.availableFrom(h.id);
    if (from === U.todayISO()) return '<span class="badge badge--avail badge--dot">Available now</span>';
    return `<span class="badge badge--soon">From ${U.esc(U.fmtDate(from))}</span>`;
  }

  function houseCard(h, i) {
    const cover = S.coverImage(h);
    return `
      <article class="house-card reveal" style="--i:${Math.min(i, 6)}">
        <div class="house-card__media skeleton">
          ${cover ? `<img class="img-load" src="${U.esc(cover)}" alt="${U.esc(h.name)}" loading="lazy">` : ""}
          <div class="house-card__badges">
            <span class="badge badge--glass">${ICON.sofa}${U.esc(FURNISH[h.furnishing] || "Furnished")}</span>
            ${availabilityBadge(h)}
          </div>
          <span class="house-card__area">${ICON.pin}${U.esc(h.area)}</span>
        </div>
        <div class="house-card__body">
          <h3 class="house-card__name">${U.esc(h.name)}</h3>
          <p class="house-card__type">${U.esc(h.type)}</p>
          <p class="house-card__price">${U.fmtRM(h.rentMonthly)} <small>/ month</small></p>
          <div class="specs">
            <span>${ICON.bed}${U.plural(h.bedrooms, "Bedroom")}</span>
            <span>${ICON.bath}${U.plural(h.bathrooms, "Bathroom")}</span>
            ${h.sqft ? `<span>${ICON.area}${U.fmtNumber(h.sqft)} sqft</span>` : ""}
          </div>
          <a class="btn btn--primary btn--block house-card__link" href="house.html?id=${encodeURIComponent(h.id)}" aria-label="View ${U.esc(h.name)}">View house ${ICON.chev}</a>
        </div>
      </article>`;
  }

  function renderHouses() {
    const all = S.getHouses();
    fillSearch(all);
    const list = all.filter(matches);
    const grid = U.qs("#houseGrid");
    const filtered = state.area || state.beds || state.rent || state.chip !== "all";
    U.qs("#houseCount").textContent = filtered ? `Showing ${list.length} of ${U.plural(all.length, "home")}` : `${U.plural(all.length, "home")} ready for you`;
    grid.innerHTML = list.length
      ? list.map(houseCard).join("")
      : `<div class="empty house-empty">${ICON.search}<p>No house matches that search yet.</p><button class="btn btn--glass btn--sm" type="button" id="clearFilters">Show all homes</button></div>`;
    const clear = U.qs("#clearFilters");
    if (clear) {
      clear.addEventListener("click", () => {
        Object.assign(state, { chip: "all", area: "", beds: "", rent: "" });
        U.qs("#searchForm").reset();
        U.qsa("#houseChips .chip").forEach((c) => c.classList.toggle("is-active", c.dataset.chip === "all"));
        renderHouses();
      });
    }
    U.initImages(grid);
    U.initReveal(grid);
  }

  /* --------------------------------------------------------------- Gallery */
  function galleryItems() {
    const items = [];
    S.getHouses().forEach((h) =>
      (h.images || []).forEach((img) => items.push({ src: S.imageUrl(img.src), caption: `${h.name} · ${img.caption || h.area}` }))
    );
    return items;
  }

  function renderGallery() {
    const items = galleryItems();
    // Mix houses so neighbouring tiles differ: take photo 1 of each house, then 2, then 3.
    const byIndex = [];
    S.getHouses().forEach((h) => (h.images || []).forEach((img, k) => (byIndex[k] = byIndex[k] || []).push({ src: S.imageUrl(img.src), caption: `${h.name} · ${img.caption || h.area}` })));
    const mixed = byIndex.flat();
    const show = mixed.slice(0, 8);
    const grid = U.qs("#galleryGrid");
    grid.innerHTML = show
      .map(
        (it, i) => `
        <button type="button" class="gallery-item skeleton reveal reveal--zoom" style="--i:${i % 4}" data-index="${i}">
          <img class="img-load" src="${U.esc(it.src)}" alt="${U.esc(it.caption)}" loading="lazy">
          <figcaption>${U.esc(it.caption)}</figcaption>
        </button>`
      )
      .join("");
    U.qsa(".gallery-item", grid).forEach((btn) => btn.addEventListener("click", () => U.lightbox(mixed, Number(btn.dataset.index))));
    U.qs("#galleryAll").onclick = () => U.lightbox(mixed.length ? mixed : items, 0);
    U.qs("#galleryAll").hidden = mixed.length <= show.length;
    U.initImages(grid);
    U.initReveal(grid);
  }

  /* ------------------------------------------------------------------ Boot */
  function renderAll() {
    paintSettings();
    renderHouses();
    renderGallery();
  }

  U.ready(() => {
    initNav();
    initHero();
    initSearch();
    renderAll();
    S.onChange(renderAll);
    // Deep link from house.html: index.html#track?phone=...
    if (location.hash.startsWith("#track")) setTimeout(() => U.scrollToId("#track", 40), 300);
  });
})();
