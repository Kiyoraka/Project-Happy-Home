/* ==========================================================================
   Happy Home - store.js
   The single data layer for every page. Everything lives in localStorage:
     hh.houses   - rental houses with rooms, items and photos
     hh.bookings - monthly rental bookings with receipts and history
     hh.settings - company profile, bank details, booking rules
     hh.session  - admin sign-in (any email + password)
   Also owns availability, the move-in quote, booking status rules and the
   numbers behind the admin dashboard.
   Depends on: ui.js (window.UI), seed.js (window.SEED)
   Exposes a single global: window.Store
   ========================================================================== */
(function (global) {
  "use strict";

  const U = global.UI;
  const SEED = global.SEED;

  const KEYS = {
    houses: "hh.houses",
    bookings: "hh.bookings",
    settings: "hh.settings",
    session: "hh.session",
    seed: "hh.seedVersion"
  };
  const SEED_VERSION = 1;
  const SESSION_HOURS = 12;

  /** Stored statuses. ACTIVE and ENDED are computed from CONFIRMED + today. */
  const STATUS = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"];
  const ALL_STATUS = ["PENDING", "CONFIRMED", "ACTIVE", "ENDED", "REJECTED", "CANCELLED"];
  /** Statuses that hold the house (block other bookings). */
  const LIVE = ["PENDING", "CONFIRMED", "ACTIVE"];

  const STATUS_LABEL = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    ACTIVE: "Active",
    ENDED: "Ended",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled"
  };

  /* --------------------------------------------------------------- Storage */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  /** Returns false (and toasts) when the browser storage is full. */
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (U && U.toast) U.toast("Browser storage is full - remove some photos and try again.", "error", 5000);
      return false;
    }
  }

  function uid(prefix = "") {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /** Digits only, with a leading Malaysian "60" folded to "0" so both forms match. */
  function normPhone(value) {
    let d = String(value || "").replace(/\D/g, "");
    if (d.startsWith("60")) d = d.slice(1);
    return d;
  }

  const clone = (v) => JSON.parse(JSON.stringify(v));

  /* ------------------------------------------------------------------ Seed */
  function seedHouses() {
    return SEED.HOUSES.map((h, i) => ({
      ...clone(h),
      rooms: h.rooms.map((r) => ({
        id: uid("r"),
        name: r.name,
        type: r.type,
        note: r.note || "",
        items: r.items.map(([name, qty]) => ({ name, qty }))
      })),
      status: "active",
      order: i,
      createdAt: new Date(Date.now() - (400 - i * 30) * 86400000).toISOString()
    }));
  }

  function seedBookings(houses) {
    const today = U.todayISO();
    const year = new Date().getFullYear();
    return SEED.BOOKINGS.map((row, i) => {
      const [houseId, name, phone, email, occupants, [mOff, dOff], months, status, createdOff, note] = row;
      const house = houses.find((h) => h.id === houseId);
      const moveIn = U.addDays(U.addMonths(today, mOff), dOff);
      const moveOut = U.addMonths(moveIn, months);
      const created = new Date(U.parseISO(U.addDays(today, createdOff)).getTime() + (9 + (i % 8)) * 3600000);
      const createdAt = created.toISOString();
      const history = [{ at: createdAt, status: "PENDING", note: "Booking submitted with payment receipt." }];
      if (status !== "PENDING") {
        history.push({
          at: new Date(created.getTime() + 26 * 3600000).toISOString(),
          status,
          note: note || (status === "CONFIRMED" ? "Booking confirmed." : "")
        });
      }
      return {
        ref: `HH-${year - (createdOff < -365 ? 1 : 0)}-${String(i + 1).padStart(4, "0")}`,
        houseId,
        name,
        phone: normPhone(phone),
        email,
        occupants,
        moveIn,
        months,
        moveOut,
        amounts: amountsFor(house, months),
        receipt: null,
        status,
        adminNote: status === "PENDING" ? "" : note,
        createdAt,
        updatedAt: history[history.length - 1].at,
        history
      };
    });
  }

  function seed(force = false) {
    if (!force && read(KEYS.seed, 0) === SEED_VERSION && read(KEYS.houses, null)) return;
    const houses = seedHouses();
    write(KEYS.houses, houses);
    write(KEYS.bookings, seedBookings(houses));
    write(KEYS.settings, clone(SEED.SETTINGS));
    write(KEYS.seed, SEED_VERSION);
  }

  function resetDemo() {
    seed(true);
  }

  /* -------------------------------------------------------------- Settings */
  function getSettings() {
    const saved = read(KEYS.settings, null) || {};
    const d = SEED.SETTINGS;
    return {
      company: { ...d.company, ...(saved.company || {}) },
      bank: { ...d.bank, ...(saved.bank || {}) },
      rules: { ...d.rules, ...(saved.rules || {}) }
    };
  }

  function saveSettings(patch) {
    const cur = getSettings();
    const next = {
      company: { ...cur.company, ...(patch.company || {}) },
      bank: { ...cur.bank, ...(patch.bank || {}) },
      rules: { ...cur.rules, ...(patch.rules || {}) }
    };
    return write(KEYS.settings, next) ? next : null;
  }

  /* ---------------------------------------------------------------- Images */
  /** Seed paths are relative to the site root; admin pages set <html data-base="../">. */
  function imageUrl(src) {
    if (!src) return "";
    if (/^(data:|https?:|blob:|\/)/.test(src)) return src;
    const base = (document.documentElement && document.documentElement.dataset.base) || "";
    return base + src;
  }

  /* ---------------------------------------------------------------- Houses */
  function getHouses({ includeHidden = false } = {}) {
    const list = read(KEYS.houses, []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return includeHidden ? list : list.filter((h) => h.status === "active");
  }

  function getHouse(id) {
    return read(KEYS.houses, []).find((h) => h.id === id) || null;
  }

  function coverImage(house) {
    const first = house && house.images && house.images[0];
    return first ? imageUrl(first.src) : "";
  }

  function normalizeHouse(data) {
    const num = (v, d = 0) => (Number.isFinite(Number(v)) && v !== "" ? Number(v) : d);
    return {
      name: String(data.name || "").trim(),
      area: String(data.area || "").trim(),
      address: String(data.address || "").trim(),
      type: String(data.type || "").trim(),
      rentMonthly: num(data.rentMonthly),
      depositMonths: num(data.depositMonths, 2),
      utilityDeposit: num(data.utilityDeposit),
      minMonths: Math.max(1, num(data.minMonths, 6)),
      bedrooms: num(data.bedrooms),
      bathrooms: num(data.bathrooms),
      sqft: num(data.sqft),
      furnishing: ["full", "partial", "none"].includes(data.furnishing) ? data.furnishing : "full",
      description: String(data.description || "").trim(),
      amenities: (data.amenities || []).map((a) => String(a).trim()).filter(Boolean),
      images: (data.images || []).filter((i) => i && i.src).map((i) => ({ src: i.src, caption: String(i.caption || "").trim() })),
      rooms: (data.rooms || [])
        .filter((r) => r && String(r.name || "").trim())
        .map((r) => ({
          id: r.id || uid("r"),
          name: String(r.name).trim(),
          type: r.type || "other",
          note: String(r.note || "").trim(),
          items: (r.items || [])
            .filter((it) => it && String(it.name || "").trim())
            .map((it) => ({ name: String(it.name).trim(), qty: Math.max(1, num(it.qty, 1)) }))
        })),
      status: data.status === "hidden" ? "hidden" : "active"
    };
  }

  function validateHouse(h) {
    const errors = {};
    if (!h.name) errors.name = "House name is required.";
    if (!h.area) errors.area = "Area is required.";
    if (!(h.rentMonthly > 0)) errors.rentMonthly = "Monthly rent must be more than 0.";
    if (h.depositMonths < 0) errors.depositMonths = "Deposit cannot be negative.";
    if (h.utilityDeposit < 0) errors.utilityDeposit = "Utility deposit cannot be negative.";
    return errors;
  }

  /** createHouse(data) -> { ok, house, errors } */
  function createHouse(data) {
    const h = normalizeHouse(data);
    const errors = validateHouse(h);
    if (Object.keys(errors).length) return { ok: false, errors };
    const all = read(KEYS.houses, []);
    const maxN = all.reduce((m, x) => Math.max(m, Number(String(x.id).replace(/\D/g, "")) || 0), 0);
    const house = { id: `h${maxN + 1}`, ...h, order: all.length, createdAt: new Date().toISOString() };
    all.push(house);
    return write(KEYS.houses, all) ? { ok: true, house } : { ok: false, errors: { _: "Could not save." } };
  }

  function updateHouse(id, data) {
    const all = read(KEYS.houses, []);
    const i = all.findIndex((h) => h.id === id);
    if (i < 0) return { ok: false, errors: { _: "House not found." } };
    const h = normalizeHouse({ ...all[i], ...data });
    const errors = validateHouse(h);
    if (Object.keys(errors).length) return { ok: false, errors };
    all[i] = { ...all[i], ...h, updatedAt: new Date().toISOString() };
    return write(KEYS.houses, all) ? { ok: true, house: all[i] } : { ok: false, errors: { _: "Could not save." } };
  }

  function setHouseStatus(id, status) {
    return updateHouse(id, { status });
  }

  /** Deleting is blocked while the house has a pending, confirmed or active booking. */
  function deleteHouse(id) {
    const live = getBookings().filter((b) => b.houseId === id && LIVE.includes(b.status));
    if (live.length) return { ok: false, reason: `This house has ${U.plural(live.length, "live booking")}. Hide it instead, or close the bookings first.` };
    const all = read(KEYS.houses, []).filter((h) => h.id !== id);
    return { ok: write(KEYS.houses, all) };
  }

  /* -------------------------------------------------------------- Bookings */
  function amountsFor(house, months) {
    const rent = Number(house ? house.rentMonthly : 0) || 0;
    const deposit = rent * (Number(house ? house.depositMonths : 0) || 0);
    const utility = Number(house ? house.utilityDeposit : 0) || 0;
    return { rent, deposit, utility, payNow: rent + deposit + utility, contract: rent * (Number(months) || 0) };
  }

  /** CONFIRMED becomes ACTIVE on move-in day and ENDED on move-out day. */
  function computeStatus(b, today = U.todayISO()) {
    if (b.status !== "CONFIRMED") return b.status;
    if (today >= b.moveOut) return "ENDED";
    if (today >= b.moveIn) return "ACTIVE";
    return "CONFIRMED";
  }

  function withComputed(b) {
    return { ...b, storedStatus: b.status, status: computeStatus(b) };
  }

  function getBookings() {
    return read(KEYS.bookings, []).map(withComputed).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  function getBooking(ref) {
    const b = read(KEYS.bookings, []).find((x) => x.ref === ref);
    return b ? withComputed(b) : null;
  }

  /** All bookings made with a phone number (any formatting), newest first. */
  function findByPhone(phone) {
    const p = normPhone(phone);
    if (p.length < 9) return [];
    return getBookings().filter((b) => normPhone(b.phone) === p);
  }

  /** Periods that currently hold a house, oldest first. */
  function liveRanges(houseId, { ignoreRef = null } = {}) {
    return getBookings()
      .filter((b) => b.houseId === houseId && LIVE.includes(b.status) && b.ref !== ignoreRef)
      .map((b) => ({ ref: b.ref, from: b.moveIn, to: b.moveOut, status: b.status }))
      .sort((a, b) => (a.from < b.from ? -1 : 1));
  }

  /**
   * Earliest move-in date from today with a free window of `months`
   * (defaults to the house's minimum stay) that no live booking touches.
   */
  function availableFrom(houseId, months = null, { ignoreRef = null } = {}) {
    const house = getHouse(houseId);
    const span = Number(months) || (house ? house.minMonths : 1) || 1;
    const ranges = liveRanges(houseId, { ignoreRef });
    const fits = (start) => {
      const end = U.addMonths(start, span);
      return !ranges.some((r) => start < r.to && r.from < end);
    };
    const today = U.todayISO();
    const candidates = [today, ...ranges.map((r) => r.to).filter((d) => d > today)].sort();
    return candidates.find(fits) || (ranges.length ? ranges[ranges.length - 1].to : today);
  }

  function isAvailableNow(houseId) {
    return availableFrom(houseId) === U.todayISO();
  }

  /**
   * quote(houseId, moveIn, months) -> { ok, errors[], moveIn, moveOut, months, amounts }
   * Checks the house, the dates, the tenure and clashes with live bookings.
   */
  function quote(houseId, moveIn, months, { ignoreRef = null } = {}) {
    const house = getHouse(houseId);
    const s = getSettings();
    const m = Number(months) || 0;
    const errors = [];
    if (!house || house.status !== "active") errors.push("This house is not available for booking.");
    if (!moveIn) errors.push("Choose a move-in date.");
    else if (moveIn < U.addDays(U.todayISO(), s.rules.leadDays || 0)) errors.push("Move-in date cannot be in the past.");
    if (house && m < house.minMonths) errors.push(`Minimum stay for this house is ${U.plural(house.minMonths, "month")}.`);
    if (m > (s.rules.maxMonths || 36)) errors.push(`Maximum booking is ${s.rules.maxMonths} months.`);
    const moveOut = moveIn && m > 0 ? U.addMonths(moveIn, m) : "";
    if (house && moveIn && moveOut) {
      const clash = liveRanges(houseId, { ignoreRef }).find((r) => moveIn < r.to && r.from < moveOut);
      if (clash) errors.push(`${house.name} is taken from ${U.fmtDate(clash.from)} to ${U.fmtDate(clash.to)}. The next free ${U.plural(m || house.minMonths, "month")} start on ${U.fmtDate(availableFrom(houseId, m, { ignoreRef }))}.`);
    }
    return { ok: errors.length === 0, errors, moveIn, moveOut, months: m, amounts: amountsFor(house, m), house };
  }

  function nextRef() {
    const year = new Date().getFullYear();
    const prefix = `HH-${year}-`;
    const max = read(KEYS.bookings, [])
      .map((b) => b.ref)
      .filter((r) => r.startsWith(prefix))
      .reduce((m, r) => Math.max(m, Number(r.slice(prefix.length)) || 0), 0);
    const all = read(KEYS.bookings, []).length;
    return prefix + String(Math.max(max, all) + 1).padStart(4, "0");
  }

  /**
   * createBooking({ houseId, moveIn, months, name, phone, email, occupants, receipt })
   * -> { ok, booking, errors[] }
   */
  function createBooking(data) {
    const q = quote(data.houseId, data.moveIn, data.months);
    const errors = q.errors.slice();
    if (!String(data.name || "").trim()) errors.push("Your name is required.");
    if (normPhone(data.phone).length < 9) errors.push("Enter a valid phone number.");
    if (!data.receipt) errors.push("Upload your payment receipt.");
    if (errors.length) return { ok: false, errors };
    const now = new Date().toISOString();
    const booking = {
      ref: nextRef(),
      houseId: data.houseId,
      name: String(data.name).trim(),
      phone: normPhone(data.phone),
      email: String(data.email || "").trim(),
      occupants: Math.max(1, Number(data.occupants) || 1),
      moveIn: q.moveIn,
      months: q.months,
      moveOut: q.moveOut,
      amounts: q.amounts,
      receipt: data.receipt,
      status: "PENDING",
      adminNote: "",
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, status: "PENDING", note: "Booking submitted with payment receipt." }]
    };
    const all = read(KEYS.bookings, []);
    all.push(booking);
    return write(KEYS.bookings, all) ? { ok: true, booking: withComputed(booking) } : { ok: false, errors: ["Could not save your booking."] };
  }

  /** Which admin actions a booking allows right now. */
  function allowedActions(b) {
    const s = b.status;
    return {
      confirm: s === "PENDING",
      reject: s === "PENDING",
      cancel: s === "PENDING" || s === "CONFIRMED" || s === "ACTIVE"
    };
  }

  /**
   * setBookingStatus(ref, "CONFIRMED" | "REJECTED" | "CANCELLED", note)
   * Confirming re-checks for clashes so two bookings can never hold the same months.
   */
  function setBookingStatus(ref, status, note = "") {
    if (!STATUS.includes(status) || status === "PENDING") return { ok: false, reason: "Unknown status." };
    const all = read(KEYS.bookings, []);
    const i = all.findIndex((b) => b.ref === ref);
    if (i < 0) return { ok: false, reason: "Booking not found." };
    const current = withComputed(all[i]);
    const can = allowedActions(current);
    const key = { CONFIRMED: "confirm", REJECTED: "reject", CANCELLED: "cancel" }[status];
    if (!can[key]) return { ok: false, reason: `A ${STATUS_LABEL[current.status].toLowerCase()} booking cannot be ${STATUS_LABEL[status].toLowerCase()}.` };
    if (status === "CONFIRMED") {
      const clash = getBookings().find(
        (b) => b.ref !== ref && b.houseId === current.houseId && ["CONFIRMED", "ACTIVE"].includes(b.status) && current.moveIn < b.moveOut && b.moveIn < current.moveOut
      );
      if (clash) return { ok: false, reason: `Clashes with ${clash.ref} (${U.fmtDate(clash.moveIn)} - ${U.fmtDate(clash.moveOut)}).` };
    }
    const now = new Date().toISOString();
    all[i] = {
      ...all[i],
      status,
      adminNote: String(note || "").trim(),
      updatedAt: now,
      history: [...(all[i].history || []), { at: now, status, note: String(note || "").trim() }]
    };
    return write(KEYS.bookings, all) ? { ok: true, booking: withComputed(all[i]) } : { ok: false, reason: "Could not save." };
  }

  /* ----------------------------------------------------------------- Stats */
  /** Bookings that pay rent in a given month ("YYYY-MM"). */
  function occupyingMonth(key, list = getBookings()) {
    const from = `${key}-01`;
    const to = U.addMonths(from, 1);
    return list.filter((b) => ["CONFIRMED", "ACTIVE", "ENDED"].includes(b.status) && b.moveIn < to && from < b.moveOut);
  }

  /** Last `n` month keys ending with the current month, oldest first. */
  function lastMonths(n = 12, endISO = U.todayISO()) {
    const out = [];
    for (let k = n - 1; k >= 0; k--) out.push(U.monthKey(U.addMonths(U.startOfMonth(endISO), -k)));
    return out;
  }

  function stats() {
    const today = U.todayISO();
    const houses = getHouses({ includeHidden: true });
    const active = houses.filter((h) => h.status === "active");
    const bookings = getBookings();
    const thisMonth = U.monthKey(today);
    const occupiedIds = new Set(bookings.filter((b) => b.status === "ACTIVE").map((b) => b.houseId));
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    return {
      houses: houses.length,
      activeHouses: active.length,
      occupied: active.filter((h) => occupiedIds.has(h.id)).length,
      pending: bookings.filter((b) => b.status === "PENDING").length,
      rentThisMonth: occupyingMonth(thisMonth, bookings).reduce((s, b) => s + b.amounts.rent, 0),
      newThisWeek: bookings.filter((b) => b.createdAt >= weekAgo).length,
      moveInsSoon: bookings
        .filter((b) => b.status === "CONFIRMED" && b.moveIn >= today && b.moveIn <= U.addDays(today, 30))
        .sort((a, b) => (a.moveIn < b.moveIn ? -1 : 1)),
      moveOutsSoon: bookings
        .filter((b) => b.status === "ACTIVE" && b.moveOut <= U.addDays(today, 60))
        .sort((a, b) => (a.moveOut < b.moveOut ? -1 : 1))
    };
  }

  /** Rent collected per month for the last `n` months. */
  function revenueByMonth(n = 12) {
    const list = getBookings();
    return lastMonths(n).map((key) => ({ key, total: occupyingMonth(key, list).reduce((s, b) => s + b.amounts.rent, 0) }));
  }

  /** New bookings created per month for the last `n` months. */
  function bookingsByMonth(n = 12) {
    const list = getBookings();
    return lastMonths(n).map((key) => ({ key, count: list.filter((b) => U.monthKey(b.createdAt.slice(0, 10)) === key).length }));
  }

  function bookingsByStatus() {
    const list = getBookings();
    return ALL_STATUS.map((status) => ({ status, label: STATUS_LABEL[status], count: list.filter((b) => b.status === status).length }));
  }

  /** Share of the last `n` months each house was rented (0-100). */
  function occupancyByHouse(n = 12) {
    const list = getBookings();
    const keys = lastMonths(n);
    return getHouses({ includeHidden: true }).map((h) => {
      const own = list.filter((b) => b.houseId === h.id);
      const rented = keys.filter((k) => occupyingMonth(k, own).length > 0).length;
      return { id: h.id, name: h.name, rate: Math.round((rented / keys.length) * 100), requests: own.length };
    });
  }

  /* --------------------------------------------------------------- Session */
  /** Demo sign-in: any well-formed email and any non-empty password. */
  function login(email, password) {
    const e = String(email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, field: "email", reason: "Enter a valid email address." };
    if (!String(password || "").length) return { ok: false, field: "password", reason: "Enter any password." };
    const name = e.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const session = { email: e, name, at: Date.now() };
    write(KEYS.session, session);
    return { ok: true, session };
  }

  function getSession() {
    const s = read(KEYS.session, null);
    if (!s || Date.now() - s.at > SESSION_HOURS * 3600000) return null;
    return s;
  }

  function updateSession(patch) {
    const s = getSession();
    if (!s) return null;
    const next = { ...s, ...patch };
    write(KEYS.session, next);
    return next;
  }

  function logout() {
    localStorage.removeItem(KEYS.session);
  }

  /* ------------------------------------------------------------ Change feed */
  /** Fires when another tab changes the data (landing <-> admin stay in sync). */
  function onChange(cb) {
    global.addEventListener("storage", (e) => {
      if (e.key && e.key.startsWith("hh.") && e.key !== KEYS.session) cb(e.key);
    });
  }

  seed();

  global.Store = {
    KEYS,
    STATUS,
    ALL_STATUS,
    LIVE,
    STATUS_LABEL,
    normPhone,
    imageUrl,
    coverImage,
    resetDemo,
    getSettings,
    saveSettings,
    getHouses,
    getHouse,
    createHouse,
    updateHouse,
    setHouseStatus,
    deleteHouse,
    amountsFor,
    getBookings,
    getBooking,
    findByPhone,
    liveRanges,
    availableFrom,
    isAvailableNow,
    quote,
    createBooking,
    allowedActions,
    setBookingStatus,
    stats,
    revenueByMonth,
    bookingsByMonth,
    bookingsByStatus,
    occupancyByHouse,
    login,
    getSession,
    updateSession,
    logout,
    onChange
  };
})(window);
