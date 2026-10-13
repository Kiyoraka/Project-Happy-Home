/* ==========================================================================
   Happy Home - admin/view-house.js
   "House" view: searchable, filterable grid of rental houses and the wide
   drawer editor (details, pricing, photos, room builder, amenities and
   visibility). Routes: #house  #house/new  #house/<id>
   The editor keeps its working copy in `ed.data`; each section re-renders
   on its own so typing elsewhere never loses focus.
   ========================================================================== */
(function () {
  if (!window.Admin) return;

  const U = window.UI;
  const S = window.Store;
  const A = window.Admin;
  const ic = A.icons;
  const esc = U.esc;

  const HOUSE_TYPES = ["Single-storey terrace", "Double-storey terrace", "Semi-D", "Bungalow", "Townhouse", "Cluster house", "Condominium"];
  const FURNISHING = { full: "Fully furnished", partial: "Partly furnished", none: "Unfurnished" };
  const ROOM_TYPES = { living: "Living room", dining: "Dining", kitchen: "Kitchen", bedroom: "Bedroom", bathroom: "Bathroom", study: "Study", outdoor: "Outdoor", other: "Other" };
  const QUICK_ROOMS = ["living", "kitchen", "bedroom", "bathroom"];
  const AMENITY_SUGGEST = ["Wi-Fi ready", "Air-conditioning", "Water heater", "Washing machine", "Fridge", "Covered parking", "Gated & guarded", "Swimming pool", "Gym", "Near LRT", "Near MRT", "Garden", "Balcony", "CCTV", "Playground", "Pet friendly"];
  const PRICE_FIELDS = ["rentMonthly", "depositMonths", "utilityDeposit", "minMonths"];

  const list = { q: "", status: "all" };
  let ed = null; // { key, id, data, root, newRoomId }
  let rid = 0;
  const tmpId = () => `rn${Date.now().toString(36)}${(rid++).toString(36)}`;
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const swap = (arr, a, z) => {
    if (z < 0 || z >= arr.length) return false;
    [arr[a], arr[z]] = [arr[z], arr[a]];
    return true;
  };
  const tool = (act, label, icon, off = false, cls = "") =>
    `<button type="button" class="he-ibtn${cls ? " " + cls : ""}" data-act="${act}" aria-label="${label}" title="${label}"${off ? " disabled" : ""}>${icon}</button>`;
  const idxOf = (node, key) => {
    const host = node.closest(`[data-${key}]`);
    return host ? Number(host.dataset[key]) : -1;
  };

  /* ================================================================ List */
  function allHouses() {
    return S.getHouses({ includeHidden: true });
  }

  function subtitle() {
    const all = allHouses();
    const visible = all.filter((h) => h.status === "active").length;
    return `${U.plural(all.length, "house")} · ${visible} visible on website`;
  }

  function availability(h) {
    const today = U.todayISO();
    const occ = S.liveRanges(h.id).find((r) => r.status === "ACTIVE" && r.from <= today && today < r.to);
    if (occ) return { busy: true, text: `Occupied until ${U.fmtDate(occ.to)}` };
    const from = S.availableFrom(h.id);
    return { busy: false, text: from <= today ? "Available now" : `Available from ${U.fmtDate(from)}` };
  }

  function card(h, i) {
    const cover = S.coverImage(h);
    const hidden = h.status === "hidden";
    const av = availability(h);
    const photos = (h.images || []).length;
    const media = cover
      ? `<div class="hcard__media skeleton"><img class="img-load" src="${esc(cover)}" alt="${esc(h.name)}" loading="lazy"></div>`
      : `<div class="hcard__media hcard__media--empty">${ic.image}<span>No photos yet</span></div>`;
    return `
      <article class="hcard-wrap reveal" style="--i:${i % 9}" data-hid="${esc(h.id)}">
        <div class="hcard${hidden ? " is-hidden" : ""}">
          <button type="button" class="hcard__open" data-act="edit" aria-label="Edit ${esc(h.name)}">
            ${media}
            ${hidden ? `<span class="badge badge--glass hcard__flag">${ic.eyeOff} Hidden</span>` : ""}
            ${photos ? `<span class="badge badge--glass hcard__count">${ic.image} ${photos}</span>` : ""}
          </button>
          <div class="hcard__body">
            <h3 class="hcard__name">${esc(h.name)}</h3>
            <p class="hcard__meta">${esc(h.area)}${h.type ? ` · ${esc(h.type)}` : ""}</p>
            <p class="hcard__price"><strong>${U.fmtRM(h.rentMonthly)}</strong><span>/month</span></p>
            <ul class="hcard__specs">
              <li>${ic.bed}${esc(h.bedrooms)} bed</li>
              <li>${ic.bath}${esc(h.bathrooms)} bath</li>
              <li>${ic.area}${U.fmtNumber(h.sqft)} sqft</li>
            </ul>
            <div class="hcard__foot">
              <span class="hcard__avail ${av.busy ? "is-busy" : "is-free"}">${esc(av.text)}</span>
              <span class="hcard__rooms">${U.plural((h.rooms || []).length, "room")}</span>
            </div>
          </div>
          <div class="hcard__actions">
            <button type="button" class="hcard__btn" data-act="edit">${ic.edit}<span>Edit</span></button>
            <button type="button" class="hcard__btn" data-act="toggle">${hidden ? ic.eye : ic.eyeOff}<span>${hidden ? "Show" : "Hide"}</span></button>
            <button type="button" class="hcard__btn hcard__btn--danger" data-act="delete">${ic.trash}<span>Delete</span></button>
          </div>
        </div>
      </article>`;
  }

  function filtered(all) {
    const q = list.q.trim().toLowerCase();
    return all.filter((h) => {
      if (list.status !== "all" && h.status !== list.status) return false;
      if (!q) return true;
      return [h.name, h.area, h.type].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }

  function renderChips(root, all) {
    const n = { all: all.length, active: all.filter((h) => h.status === "active").length };
    n.hidden = all.length - n.active;
    const label = { all: "All", active: "Visible", hidden: "Hidden" };
    const chip = (k) =>
      `<button type="button" class="chip${list.status === k ? " is-active" : ""}" data-status="${k}" aria-pressed="${list.status === k}">${label[k]}<span class="chip__count">${n[k]}</span></button>`;
    U.qs("[data-house-chips]", root).innerHTML = Object.keys(label).map(chip).join("");
  }

  function renderGrid(root) {
    const all = allHouses();
    renderChips(root, all);
    const grid = U.qs("[data-house-grid]", root);
    const rows = filtered(all);
    if (!all.length) {
      grid.innerHTML = `<div class="house-grid__empty">${A.emptyState("No houses yet. Add your first house to show it on the website.", ic.house)}</div>`;
    } else if (!rows.length) {
      grid.innerHTML = `<div class="house-grid__empty">${A.emptyState("No houses match your search.", ic.search)}</div>`;
    } else {
      grid.innerHTML = rows.map(card).join("");
    }
    const sub = U.qs("#viewSub");
    if (sub) sub.textContent = subtitle();
    U.initReveal(grid);
    U.initImages(grid);
  }

  function renderList(root) {
    root.innerHTML = `
      <div class="toolbar">
        <label class="search toolbar__grow">${ic.search}
          <input class="input" type="search" placeholder="Search name, area or type" value="${esc(list.q)}" data-house-q aria-label="Search houses">
        </label>
        <div class="chips" data-house-chips role="group" aria-label="Filter by visibility"></div>
        <button type="button" class="btn btn--primary" data-house-add>${ic.plus} Add house</button>
      </div>
      <div class="house-grid" data-house-grid></div>`;
    renderGrid(root);
    if (root._houseBound) return;
    root._houseBound = true;
    root.addEventListener("input", U.debounce((e) => {
      if (!e.target.matches("[data-house-q]")) return;
      list.q = e.target.value;
      renderGrid(root);
    }, 160));
    root.addEventListener("click", (e) => onListClick(e, root));
  }

  async function onListClick(e, root) {
    if (e.target.closest("[data-house-add]")) return A.go("house", "new");
    const chip = e.target.closest("[data-status]");
    if (chip) {
      list.status = chip.dataset.status;
      return renderGrid(root);
    }
    const btn = e.target.closest("[data-act]");
    const host = btn && btn.closest("[data-hid]");
    if (!host) return;
    const h = S.getHouse(host.dataset.hid);
    if (!h) return renderGrid(root);
    const act = btn.dataset.act;
    if (act === "edit") return A.go("house", h.id);
    if (act === "toggle") {
      const next = h.status === "hidden" ? "active" : "hidden";
      const res = S.setHouseStatus(h.id, next);
      if (!res.ok) return U.toast("Could not update this house.", "error");
      U.toast(next === "active" ? `${h.name} is now visible on the website.` : `${h.name} is now hidden from the website.`, "success");
      return renderGrid(root);
    }
    if (act === "delete") {
      const msg = "This removes the house, its photos and room list for good. Past bookings keep their records.";
      const ok = await U.confirm({ title: `Delete ${h.name}?`, message: msg, okText: "Delete house", danger: true });
      if (!ok) return;
      const res = S.deleteHouse(h.id);
      if (!res.ok) return U.toast(res.reason || "Could not delete this house.", "warning", 5200);
      U.toast(`${h.name} deleted.`, "success");
      renderGrid(root);
    }
  }

  /* ============================================================== Editor */
  function blankHouse() {
    const base = { name: "", area: "", address: "", type: "", furnishing: "full", description: "", bedrooms: 3, bathrooms: 2, sqft: "" };
    return { ...base, rentMonthly: "", depositMonths: 2, utilityDeposit: 0, minMonths: 6, images: [], rooms: [], amenities: [], status: "active" };
  }

  const field = (label, inner, cls = "") => `<div class="field${cls ? " " + cls : ""}"><label>${label}</label>${inner}</div>`;
  const input = (f, attrs = "") => `<input class="input" data-f="${f}" value="${esc(ed.data[f])}" ${attrs}>`;
  const numInput = (f, attrs = "") => input(f, `type="number" inputmode="decimal" min="0" ${attrs}`);
  const money = (f, attrs = "") => `<div class="input-group"><span class="addon">RM</span>${numInput(f, attrs)}</div>`;

  function sectionDetails() {
    const d = ed.data;
    const furn = Object.keys(FURNISHING).map((k) => `<option value="${k}"${d.furnishing === k ? " selected" : ""}>${FURNISHING[k]}</option>`).join("");
    return `
      <div class="form-grid">
        ${field("House name", input("name", 'placeholder="e.g. Taman Melati terrace" maxlength="80"'), "span-2")}
        ${field("Area", input("area", 'placeholder="e.g. Setapak, KL" maxlength="60"'))}
        ${field("House type", input("type", 'list="heTypeList" placeholder="Choose or type" maxlength="40"'))}
        ${field("Address", input("address", 'placeholder="Street, postcode, city" maxlength="160"'), "span-2")}
        ${field("Furnishing", `<select class="select" data-f="furnishing">${furn}</select>`)}
        ${field("Built-up (sqft)", numInput("sqft", 'step="10" placeholder="1200"'))}
        ${field("Bedrooms", numInput("bedrooms", 'step="1"'))}
        ${field("Bathrooms", numInput("bathrooms", 'step="1"'))}
        ${field("Description", `<textarea class="textarea" data-f="description" rows="4" maxlength="1200" placeholder="What makes this home nice to live in?">${esc(d.description)}</textarea>`, "span-2")}
      </div>
      <datalist id="heTypeList">${HOUSE_TYPES.map((t) => `<option value="${esc(t)}">`).join("")}</datalist>`;
  }

  function sectionPricing() {
    return `
      <div class="form-grid">
        ${field("Monthly rent", money("rentMonthly", 'step="50" placeholder="1500"'))}
        ${field("Deposit (months of rent)", numInput("depositMonths", 'step="0.5"'))}
        ${field("Utility deposit", money("utilityDeposit", 'step="50"'))}
        ${field("Minimum stay (months)", numInput("minMonths", 'step="1" min="1"'))}
      </div>
      <div class="he-summary" data-he-summary aria-live="polite"></div>`;
  }

  function renderSummary() {
    const box = U.qs("[data-he-summary]", ed.root);
    if (!box) return;
    const [rent, months, utility] = ["rentMonthly", "depositMonths", "utilityDeposit"].map((f) => Number(ed.data[f]) || 0);
    const deposit = rent * months;
    box.innerHTML = `
      <span class="he-summary__label">Tenant pays <strong>${U.fmtRM(rent + deposit + utility)}</strong> upfront</span>
      <small>1st month ${U.fmtRM(rent)} + deposit ${U.fmtRM(deposit)} (${esc(months)} mo) + utility ${U.fmtRM(utility)}</small>`;
  }

  function renderPhotos() {
    const box = U.qs("[data-he-photos]", ed.root);
    const imgs = ed.data.images;
    U.qs("[data-photo-count]", ed.root).textContent = imgs.length ? `(${imgs.length})` : "";
    if (!imgs.length) {
      box.innerHTML = `<p class="he-empty">No photos yet. The first photo becomes the cover on the website.</p>`;
      return;
    }
    const last = imgs.length - 1;
    const thumb = (im, i) => `
        <figure class="he-photo" data-pi="${i}">
          <button type="button" class="he-photo__img skeleton" data-act="photo-view" aria-label="View photo ${i + 1}">
            <img class="img-load" src="${esc(S.imageUrl(im.src))}" alt="${esc(im.caption)}">
          </button>
          ${i === 0 ? `<span class="badge badge--glass he-photo__cover">${ic.star} Cover</span>` : ""}
          <div class="he-photo__tools">${tool("photo-left", "Move left", ic.chevron, i === 0, "is-flip")}${tool("photo-cover", "Set as cover", ic.star, i === 0)}${tool(
            "photo-right", "Move right", ic.chevron, i === last)}${tool("photo-remove", "Remove photo", ic.trash, false, "he-ibtn--danger")}</div>
          <input class="input he-photo__cap" data-pcap="${i}" value="${esc(im.caption)}" placeholder="Caption" maxlength="80" aria-label="Photo ${i + 1} caption">
        </figure>`;
    box.innerHTML = `<div class="he-photos">${imgs.map(thumb).join("")}</div>`;
    U.initImages(box);
  }

  async function addFiles(files) {
    const images = Array.from(files || []).filter((f) => /^image\//.test(f.type));
    if (!images.length) return U.toast("Only image files can be added.", "warning");
    const zone = U.qs("[data-he-drop]", ed.root);
    zone.classList.add("is-busy");
    const editing = ed;
    let added = 0;
    for (const f of images) {
      try {
        const src = await U.compressImage(f);
        if (ed !== editing) return; // drawer closed meanwhile
        ed.data.images.push({ src, caption: "" });
        added++;
      } catch (err) {
        U.toast(`Could not read ${f.name}.`, "error");
      }
    }
    zone.classList.remove("is-busy");
    if (added) renderPhotos(), U.toast(`${U.plural(added, "photo")} added.`, "success");
  }

  function itemRow(it, j) {
    return `
      <div class="he-item" data-ii="${j}">
        <input class="input" data-if="name" value="${esc(it.name)}" placeholder="Item, e.g. Queen bed + mattress" maxlength="80" aria-label="Item name">
        <input class="input he-item__qty" type="number" min="1" step="1" data-if="qty" value="${esc(it.qty)}" aria-label="Quantity">
        ${tool("item-remove", "Remove item", ic.x, false, "he-ibtn--danger")}
      </div>`;
  }

  function roomCard(r, i, n) {
    const opts = Object.keys(ROOM_TYPES).map((k) => `<option value="${k}"${r.type === k ? " selected" : ""}>${ROOM_TYPES[k]}</option>`).join("");
    return `
      <div class="he-room${r.id === ed.newRoomId ? " is-new" : ""}" data-ri="${i}">
        <div class="he-room__head">
          <span class="he-room__num">${i + 1}</span>
          <div class="field he-room__name"><input class="input" data-rf="name" value="${esc(r.name)}" placeholder="Room name, e.g. Master bedroom" maxlength="60" aria-label="Room name"></div>
          <select class="select he-room__type" data-rf="type" aria-label="Room type">${opts}</select>
          <div class="he-room__tools">${tool("room-up", "Move room up", ic.arrowUp, i === 0)}${tool("room-down", "Move room down", ic.arrowDown, i === n - 1)}${tool(
            "room-remove", "Remove room", ic.trash, false, "he-ibtn--danger")}</div>
        </div>
        <input class="input he-room__note" data-rf="note" value="${esc(r.note)}" placeholder="Note (optional), e.g. Attached bathroom" maxlength="120" aria-label="Room note">
        <div class="he-items">
          ${r.items.length ? r.items.map(itemRow).join("") : `<p class="he-empty he-empty--sm">Nothing listed yet.</p>`}
        </div>
        <button type="button" class="btn btn--ghost btn--sm he-room__add" data-act="item-add">${ic.plus} Add item</button>
      </div>`;
  }

  function renderRooms() {
    const box = U.qs("[data-he-rooms]", ed.root);
    const rooms = ed.data.rooms;
    refreshRoomCount();
    box.innerHTML = rooms.length
      ? rooms.map((r, i) => roomCard(r, i, rooms.length)).join("")
      : `<p class="he-empty">No rooms yet. Add rooms so tenants can see what is inside each one.</p>`;
    ed.newRoomId = null;
  }

  function refreshRoomCount() {
    const rooms = ed.data.rooms;
    const items = rooms.reduce((s, r) => s + r.items.length, 0);
    U.qs("[data-room-count]", ed.root).textContent = rooms.length ? `(${U.plural(rooms.length, "room")}, ${U.plural(items, "item")})` : "";
  }

  /** Re-render one room card in place (item add/remove). */
  function renderRoom(i, focusItem = -1) {
    const old = U.qs(`[data-ri="${i}"]`, ed.root);
    if (!old) return renderRooms();
    const node = U.el(roomCard(ed.data.rooms[i], i, ed.data.rooms.length));
    old.replaceWith(node);
    if (focusItem > -1) {
      const row = U.qs(`[data-ii="${focusItem}"]`, node);
      if (row) {
        row.classList.add("is-new");
        U.qs("input", row).focus();
      }
    }
  }

  function addRoom(type = "other") {
    const name = type === "other" ? "" : ROOM_TYPES[type];
    const room = { id: tmpId(), name, type, note: "", items: [] };
    ed.data.rooms.push(room);
    ed.newRoomId = room.id;
    renderRooms();
    const node = U.qs(`[data-ri="${ed.data.rooms.length - 1}"]`, ed.root);
    if (node) {
      node.scrollIntoView({ behavior: U.prefersReducedMotion() ? "auto" : "smooth", block: "nearest" });
      U.qs('[data-rf="name"]', node).focus({ preventScroll: true });
    }
  }

  function renderAmenities(focus = false) {
    const box = U.qs("[data-he-amen]", ed.root);
    const list = ed.data.amenities;
    const have = new Set(list.map((a) => a.toLowerCase()));
    const sugg = AMENITY_SUGGEST.filter((a) => !have.has(a.toLowerCase()));
    box.innerHTML = `
      <div class="he-tags" data-act="amen-focus">
        ${list.map((a, i) => `<span class="he-tag" data-ai="${i}">${esc(a)}<button type="button" data-act="amen-remove" aria-label="Remove ${esc(a)}">${ic.x}</button></span>`).join("")}
        <input class="he-tags__input" data-amen-input placeholder="${list.length ? "Add more…" : "Type an amenity and press Enter"}" maxlength="40" aria-label="Add amenity">
      </div>
      ${sugg.length ? `<div class="he-suggest"><span class="hint">Suggestions</span>${sugg.map((a) => `<button type="button" class="he-suggest__chip" data-act="amen-add" data-value="${esc(a)}">${ic.plus}${esc(a)}</button>`).join("")}</div>` : ""}`;
    if (focus) U.qs("[data-amen-input]", box).focus();
  }

  function addAmenity(value) {
    const list = ed.data.amenities;
    const before = list.length;
    String(value || "").split(",").map((v) => v.trim().slice(0, 40)).filter(Boolean)
      .forEach((v) => list.some((a) => a.toLowerCase() === v.toLowerCase()) || list.push(v));
    return list.length > before;
  }

  function editorBody() {
    const sec = (n, title, inner, extra = "") =>
      `<section class="drawer__section he-sec"><h3><span class="he-step">${n}</span>${title} ${extra}</h3>${inner}</section>`;
    return `
      <div class="house-editor">
        ${sec(1, "Details", sectionDetails())}
        ${sec(2, "Pricing", sectionPricing())}
        ${sec(3, "Photos", `
          <label class="dropzone he-drop" data-he-drop>
            <input type="file" accept="image/*" multiple hidden data-he-file>
            ${ic.upload}<strong>Drop photos here or click to upload</strong>
            <span class="hint">JPG or PNG · resized automatically · first photo is the cover</span>
          </label>
          <div data-he-photos></div>`, '<small class="he-count" data-photo-count></small>')}
        ${sec(4, "Rooms &amp; what's inside", `
          <div class="he-rooms" data-he-rooms></div>
          <div class="he-rooms__add">
            <button type="button" class="btn btn--outline btn--sm" data-act="room-add">${ic.plus} Add room</button>
            ${QUICK_ROOMS.map((t) => `<button type="button" class="chip" data-act="room-add" data-type="${t}">${ic.plus}${ROOM_TYPES[t]}</button>`).join("")}
          </div>`, '<small class="he-count" data-room-count></small>')}
        ${sec(5, "Amenities", `<div data-he-amen></div>`)}
        ${sec(6, "Visibility", `
          <label class="switch"><input type="checkbox" data-f="status"${ed.data.status !== "hidden" ? " checked" : ""}><span class="switch__track"></span><span>Show on website</span></label>
          <p class="hint he-vis-hint">Hidden houses stay here with their bookings, but tenants cannot see or book them.</p>`)}
      </div>`;
  }

  function openEditor(key) {
    const house = key === "new" ? null : S.getHouse(key);
    if (key !== "new" && !house) {
      U.toast("That house no longer exists.", "warning");
      return A.go("house");
    }
    const data = { images: [], amenities: [], ...(house ? clone(house) : blankHouse()) };
    data.rooms = (data.rooms || []).map((r) => ({ ...r, id: r.id || tmpId(), items: (r.items || []).map((it) => ({ ...it })) }));
    ed = { key, id: house ? house.id : null, data, root: null, newRoomId: null };
    const drawer = A.openDrawer({
      title: house ? `Edit ${house.name}` : "Add house",
      wide: true,
      body: editorBody(),
      foot: `<button type="button" class="btn btn--ghost" data-drawer-close>Cancel</button>
             <button type="button" class="btn btn--primary" data-he-save>${ic.save} ${house ? "Save changes" : "Create house"}</button>`,
      onClose() {
        ed = null;
        if (/^#house\//.test(location.hash)) A.go("house");
      }
    });
    ed.root = U.qs(".house-editor", drawer);
    renderSummary();
    renderPhotos();
    renderRooms();
    renderAmenities();
    bindEditor(ed.root);
    U.qs("[data-he-save]", drawer).addEventListener("click", save);
  }

  function onEditorInput(e) {
    const t = e.target;
    const d = ed.data;
    if (t.matches("[data-f]")) {
      const f = t.dataset.f;
      d[f] = f === "status" ? (t.checked ? "active" : "hidden") : t.value;
      clearErr(t);
      if (PRICE_FIELDS.includes(f)) renderSummary();
    } else if (t.matches("[data-pcap]")) {
      const im = d.images[Number(t.dataset.pcap)];
      if (im) im.caption = t.value;
    } else if (t.matches("[data-rf]")) {
      const r = d.rooms[idxOf(t, "ri")];
      if (r) r[t.dataset.rf] = t.value;
      clearErr(t);
    } else if (t.matches("[data-if]")) {
      const r = d.rooms[idxOf(t, "ri")];
      const it = r && r.items[idxOf(t, "ii")];
      if (it) it[t.dataset.if] = t.value;
    } else if (t.matches("[data-amen-input]") && t.value.includes(",")) {
      if (addAmenity(t.value)) renderAmenities(true);
      else t.value = "";
    }
  }

  async function onEditorClick(e) {
    const b = e.target.closest("[data-act]");
    if (!b || !ed || !ed.root.contains(b)) return;
    const d = ed.data;
    const act = b.dataset.act;
    const pi = idxOf(b, "pi");
    const ri = idxOf(b, "ri");
    switch (act) {
      case "photo-view":
        return U.lightbox(d.images.map((im) => ({ src: S.imageUrl(im.src), caption: im.caption })), pi);
      case "photo-left":
      case "photo-right":
        return swap(d.images, pi, pi + (act === "photo-left" ? -1 : 1)) && renderPhotos();
      case "photo-cover":
        d.images.unshift(d.images.splice(pi, 1)[0]);
        renderPhotos();
        return U.toast("Cover photo updated.", "success", 1800);
      case "photo-remove":
        d.images.splice(pi, 1);
        return renderPhotos();
      case "room-add":
        return addRoom(b.dataset.type || "other");
      case "room-up":
      case "room-down":
        return swap(d.rooms, ri, ri + (act === "room-up" ? -1 : 1)) && renderRooms();
      case "room-remove": {
        const r = d.rooms[ri];
        if (!r) return;
        if (r.items.length) {
          const message = `It lists ${U.plural(r.items.length, "item")}. They will be removed too.`;
          const ok = await U.confirm({ title: `Remove ${r.name || "this room"}?`, message, okText: "Remove room", danger: true });
          if (!ok || !ed || ed.data !== d) return;
        }
        d.rooms.splice(d.rooms.indexOf(r), 1);
        return renderRooms();
      }
      case "item-add":
        d.rooms[ri].items.push({ name: "", qty: 1 });
        renderRoom(ri, d.rooms[ri].items.length - 1);
        return refreshRoomCount();
      case "item-remove":
        d.rooms[ri].items.splice(idxOf(b, "ii"), 1);
        renderRoom(ri);
        return refreshRoomCount();
      case "amen-add":
        return addAmenity(b.dataset.value) && renderAmenities();
      case "amen-remove":
        d.amenities.splice(idxOf(b, "ai"), 1);
        return renderAmenities(true);
      case "amen-focus":
        return e.target === b && U.qs("[data-amen-input]", b).focus();
    }
  }

  function onEditorKey(e) {
    const t = e.target;
    if (!t.matches("[data-amen-input]")) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (addAmenity(t.value)) renderAmenities(true);
      else t.value = "";
    } else if (e.key === "Backspace" && !t.value && ed.data.amenities.length) {
      ed.data.amenities.pop();
      renderAmenities(true);
    }
  }

  function bindEditor(root) {
    root.addEventListener("input", onEditorInput);
    root.addEventListener("change", onEditorInput);
    root.addEventListener("click", onEditorClick);
    root.addEventListener("keydown", onEditorKey);
    root.addEventListener("focusout", (e) => {
      const t = e.target;
      if (t.matches("[data-amen-input]") && t.value.trim() && addAmenity(t.value)) renderAmenities();
    });
    const file = U.qs("[data-he-file]", root);
    file.addEventListener("change", () => (addFiles(file.files), (file.value = "")));
    const zone = U.qs("[data-he-drop]", root);
    const over = (e) => (e.preventDefault(), zone.classList.add("is-drag"));
    ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, over));
    ["dragleave", "drop"].forEach((ev) => zone.addEventListener(ev, () => zone.classList.remove("is-drag")));
    zone.addEventListener("drop", (e) => (e.preventDefault(), addFiles(e.dataTransfer && e.dataTransfer.files)));
  }

  /* ---------------------------------------------------------------- Save */
  function markInvalid(inputEl, msg) {
    U.setInvalid(inputEl, msg);
    const group = inputEl.closest(".input-group");
    const err = inputEl.parentElement.querySelector(".error-text");
    if (group && err) group.after(err);
  }

  function clearErr(inputEl) {
    inputEl.classList.remove("is-invalid");
    const host = inputEl.closest(".field") || inputEl.parentElement;
    const err = host && host.querySelector(".error-text");
    if (err) err.remove();
  }

  function save() {
    if (!ed) return;
    const root = ed.root;
    U.qsa(".is-invalid", root).forEach(clearErr);
    const d = ed.data;
    const bad = [];
    const named = (x) => String(x.name || "").trim();
    d.rooms.forEach((r, i) => !named(r) && r.items.some(named) && bad.push([U.qs(`[data-ri="${i}"] [data-rf="name"]`, root), "Give this room a name."]));
    const payload = { ...d, amenities: d.amenities.slice(), rooms: d.rooms.map((r) => ({ ...r, id: /^rn/.test(r.id) ? undefined : r.id })) };
    const res = bad.length ? { ok: false, errors: {} } : ed.id ? S.updateHouse(ed.id, payload) : S.createHouse(payload);
    if (!res.ok) {
      const errors = res.errors || {};
      Object.keys(errors).forEach((f) => bad.push([U.qs(`[data-f="${f}"]`, root), errors[f]]));
      bad.forEach(([node, msg]) => node && markInvalid(node, msg));
      if (errors._) U.toast(errors._, "error");
      const first = U.qsa(".is-invalid", root)[0];
      if (!first) return;
      first.scrollIntoView({ behavior: U.prefersReducedMotion() ? "auto" : "smooth", block: "center" });
      first.focus({ preventScroll: true });
      return U.toast("Please check the highlighted fields.", "warning");
    }
    U.toast(ed.id ? `${res.house.name} saved.` : `${res.house.name} added.`, "success");
    A.closeDrawer();
    A.refresh();
  }

  /* ---------------------------------------------------------------- View */
  A.register("house", {
    title: "House",
    subtitle,
    render(el, param) {
      renderList(el);
      if (param && (!ed || ed.key !== param)) openEditor(param);
      else if (!param && ed) A.closeDrawer();
    }
  });
})();
