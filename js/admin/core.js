/* ==========================================================================
   Happy Home - admin/core.js
   Admin dashboard core: auth guard, hash router, sidebar + bottom nav with
   sliding pills, topbar, pending badges, shared drawer and render helpers.

   View contract - each js/admin/view-*.js calls:
     Admin.register("booking", {
       title: "Booking",
       subtitle: () => "12 bookings",          // optional, string or fn
       render(el, param) { ... }                // el = <section data-view>, param = text after "#booking/"
     });
   Routes look like  #main  #house  #house/new  #house/h3  #booking/HH-2026-0007
   Exposes a single global: window.Admin
   ========================================================================== */
(function (global) {
  "use strict";

  const U = global.UI;
  const S = global.Store;
  const views = {};
  const DEFAULT_VIEW = "main";
  let current = null;

  /* ------------------------------------------------------------------ Auth */
  const session = S.getSession();
  if (!session) {
    location.replace("login.html");
    return;
  }

  /* ----------------------------------------------------------------- Icons */
  const I = (d, w = 2) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const icons = {
    house: I('<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    calendar: I('<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M4 10h16"/>'),
    clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    money: I('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'),
    users: I('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
    key: I('<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14 9l2 2"/>'),
    plus: I('<path d="M12 5v14M5 12h14"/>', 2.4),
    edit: I('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    trash: I('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>'),
    eye: I('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff: I('<path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.4 0-10-7-10-7a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.6 9.6 0 0 1 12 4c6.4 0 10 7 10 7a18.4 18.4 0 0 1-2.2 3.2M1 1l22 22"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
    check: I('<path d="M20 6 9 17l-5-5"/>', 2.4),
    x: I('<path d="M6 6l12 12M18 6 6 18"/>', 2.2),
    ban: I('<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>'),
    whatsapp: I('<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4Z"/><path d="M9 10c.5 2 2 3.5 4 4l1.2-1.2 2 .8-.4 2c-3.5.3-7.3-3.5-7-7l2-.4.8 2Z"/>', 1.6),
    image: I('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>'),
    upload: I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>'),
    star: I('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z"/>'),
    arrowUp: I('<path d="m18 15-6-6-6 6"/>'),
    arrowDown: I('<path d="m6 9 6 6 6-6"/>'),
    chevron: I('<path d="m9 18 6-6-6-6"/>', 2.4),
    bed: I('<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M2 17h20"/>'),
    bath: I('<path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/><path d="M6 12V5a2 2 0 0 1 3.5-1.3"/><path d="M6 20l-1 2M18 20l1 2"/>'),
    area: I('<path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/>'),
    inbox: I('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z"/>'),
    refresh: I('<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>'),
    save: I('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>')
  };

  /* --------------------------------------------------------------- Helpers */
  const houseName = (id) => {
    const h = S.getHouse(id);
    return h ? h.name : "Removed house";
  };

  function statusBadge(status) {
    const s = String(status || "").toLowerCase();
    return `<span class="badge badge--dot badge--${U.esc(s)}">${U.esc(S.STATUS_LABEL[status] || status)}</span>`;
  }

  function emptyState(text, icon = icons.inbox) {
    return `<div class="empty">${icon}<p>${U.esc(text)}</p></div>`;
  }

  function initials(name) {
    return String(name || "?")
      .split(/\s+/)
      .filter((w) => /^[A-Za-z]/.test(w))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  /** Compact booking line used on Main and in lists. Clicking opens #booking/<ref>. */
  function bookingRow(b, { meta = "period" } = {}) {
    const h = S.getHouse(b.houseId);
    const thumb = h ? S.coverImage(h) : "";
    const line =
      meta === "created"
        ? `Requested ${U.fmtDateTime(b.createdAt)}`
        : `${U.fmtDate(b.moveIn)} → ${U.fmtDate(b.moveOut)} · ${U.plural(b.months, "month")}`;
    return `
      <a class="brow" href="#booking/${encodeURIComponent(b.ref)}">
        <span class="brow__thumb skeleton">${thumb ? `<img class="img-load" src="${U.esc(thumb)}" alt="">` : ""}</span>
        <span class="brow__main">
          <strong>${U.esc(b.name)}</strong>
          <small>${U.esc(houseName(b.houseId))} · ${U.esc(b.ref)}</small>
          <small class="muted">${U.esc(line)}</small>
        </span>
        <span class="brow__side">${statusBadge(b.status)}<small>${U.fmtRM(b.amounts.payNow)}</small></span>
      </a>`;
  }

  /* ---------------------------------------------------------------- Drawer */
  const drawer = U.qs("#drawer");
  const drawerBackdrop = U.qs("#drawerBackdrop");
  let drawerOnClose = null;

  /**
   * openDrawer({ title, body, foot, wide, onClose }) - body/foot are HTML strings.
   * Returns the drawer element so the caller can bind events inside it.
   */
  function openDrawer({ title = "", body = "", foot = "", wide = false, onClose = null } = {}) {
    U.qs("#drawerTitle").textContent = title;
    U.qs("#drawerBody").innerHTML = body;
    U.qs("#drawerFoot").innerHTML = foot;
    U.qs("#drawerFoot").hidden = !foot;
    drawer.classList.toggle("drawer--wide", wide);
    drawerOnClose = onClose;
    drawer.classList.add("is-open");
    drawerBackdrop.classList.add("is-open");
    document.body.classList.add("modal-open");
    U.qs("#drawerBody").scrollTop = 0;
    U.initImages(drawer);
    return drawer;
  }

  function closeDrawer() {
    if (!drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    drawerBackdrop.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    const cb = drawerOnClose;
    drawerOnClose = null;
    if (cb) cb();
  }

  drawerBackdrop.addEventListener("click", closeDrawer);
  drawer.addEventListener("click", (e) => {
    if (e.target.closest("[data-drawer-close]")) closeDrawer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("is-open") && !U.qs(".modal-backdrop.is-open")) closeDrawer();
  });

  /* ---------------------------------------------------------------- Router */
  function parseHash() {
    const raw = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    const [key, ...rest] = raw.split("/");
    return { key: views[key] ? key : DEFAULT_VIEW, param: rest.join("/") || "" };
  }

  function movePill(container, pill, activeEl) {
    if (!container || !pill) return;
    if (!activeEl || !activeEl.offsetParent) {
      pill.style.opacity = "0";
      return;
    }
    const c = container.getBoundingClientRect();
    const r = activeEl.getBoundingClientRect();
    pill.style.opacity = "1";
    pill.style.transform = `translate(${r.left - c.left}px, ${r.top - c.top}px)`;
    pill.style.width = `${r.width}px`;
    pill.style.height = `${r.height}px`;
  }

  function syncNav(key) {
    U.qsa("[data-view]").forEach((a) => {
      if (a.tagName === "A") a.classList.toggle("is-active", a.dataset.view === key);
    });
    const side = U.qs(".sidebar__nav");
    movePill(side, U.qs(".sidebar__pill", side), U.qs(`.sidebar__link[data-view="${key}"]`, side));
    const bottom = U.qs(".bottom-nav");
    movePill(bottom, U.qs(".bottom-nav__pill", bottom), U.qs(`a[data-view="${key}"]`, bottom));
  }

  function setTitle(view) {
    U.qs("#viewTitle").textContent = view.title;
    const sub = typeof view.subtitle === "function" ? view.subtitle() : view.subtitle || "";
    U.qs("#viewSub").textContent = sub;
    document.title = `${view.title} · Happy Home Admin`;
  }

  function show() {
    const { key, param } = parseHash();
    const view = views[key];
    const changed = current !== key;
    // A drawer belongs to the view that opened it - leaving the view closes it.
    if (changed) closeDrawer();
    U.qsa(".view-host > .view").forEach((sec) => {
      const on = sec.dataset.view === key;
      sec.hidden = !on;
      if (on && changed) {
        sec.classList.remove("view--enter");
        void sec.offsetWidth;
        sec.classList.add("view--enter");
      }
    });
    const el = U.qs(`.view-host > .view[data-view="${key}"]`);
    current = key;
    syncNav(key);
    closeSidebar();
    try {
      view.render(el, param);
    } catch (err) {
      console.error(`[admin] view "${key}" failed to render`, err);
      el.innerHTML = emptyState("Something went wrong showing this page.");
    }
    setTitle(view);
    U.initReveal(el);
    U.initImages(el);
    refreshBadges();
    if (changed) global.scrollTo({ top: 0, behavior: "auto" });
  }

  function register(key, view) {
    views[key] = view;
  }

  /** Navigate to "#key/param" (same hash re-renders). */
  function go(key, param = "") {
    const hash = `#${key}${param ? "/" + encodeURIComponent(param) : ""}`;
    if (location.hash === hash) show();
    else location.hash = hash;
  }

  /** Re-render the current view in place (after a save). */
  function refresh() {
    if (current) show();
  }

  /* ---------------------------------------------------------------- Badges */
  function refreshBadges() {
    const pending = S.getBookings().filter((b) => b.status === "PENDING").length;
    U.qsa('[data-badge="pending"]').forEach((b) => {
      b.hidden = pending === 0;
      if (!b.classList.contains("nav-badge--dot")) b.textContent = pending;
    });
  }

  /* --------------------------------------------------------------- Sidebar */
  const sidebar = U.qs("#sidebar");
  const sidebarBackdrop = U.qs("#sidebarBackdrop");

  function openSidebar() {
    sidebar.classList.add("is-open");
    sidebarBackdrop.classList.add("is-open");
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    sidebarBackdrop.classList.remove("is-open");
  }

  /* ------------------------------------------------------------------ User */
  function renderUser() {
    const s = S.getSession() || session;
    U.qs("#userName").textContent = s.name;
    U.qs("#userEmail").textContent = s.email;
    U.qs("#userAvatar").textContent = initials(s.name) || "A";
  }

  /* ------------------------------------------------------------------ Boot */
  U.ready(() => {
    renderUser();
    U.qs("#menuBtn").addEventListener("click", openSidebar);
    sidebarBackdrop.addEventListener("click", closeSidebar);
    U.qs("#logoutBtn").addEventListener("click", async () => {
      const ok = await U.confirm({ title: "Log out?", message: "You will need to sign in again to manage bookings.", okText: "Log out" });
      if (!ok) return;
      S.logout();
      location.replace("login.html");
    });
    global.addEventListener("hashchange", show);
    global.addEventListener("resize", U.debounce(() => syncNav(current), 120));
    // New bookings made on the website in another tab show up live.
    S.onChange(() => {
      refreshBadges();
      if (!drawer.classList.contains("is-open")) refresh();
    });
    show();
    requestAnimationFrame(() => document.body.classList.add("is-ready"));
  });

  global.Admin = {
    session,
    icons,
    register,
    go,
    refresh,
    refreshBadges,
    renderUser,
    openDrawer,
    closeDrawer,
    statusBadge,
    emptyState,
    bookingRow,
    houseName,
    initials
  };
})(window);
