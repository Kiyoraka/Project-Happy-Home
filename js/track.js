/* ==========================================================================
   Happy Home - track.js
   "Track your booking" on the landing page: the customer types the phone
   number used when booking (any format: 012-345 6789, +60123456789) and sees
   every booking made with it - house, period, status stepper and the note
   from the admin. index.html?phone=0123456789#track pre-fills and searches.
   Depends on: ui.js, seed.js, store.js
   ========================================================================== */
(function () {
  "use strict";

  const U = window.UI;
  const S = window.Store;

  const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    check: I('<path d="M20 6 9 17l-5-5"/>'),
    x: I('<path d="M6 6l12 12M18 6 6 18"/>'),
    calendar: I('<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M4 10h16"/>'),
    money: I('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>'),
    note: I('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
    wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4Z"/><path d="M9 10c.5 2 2 3.5 4 4l1.2-1.2 2 .8-.4 2c-3.5.3-7.3-3.5-7-7l2-.4.8 2Z"/></svg>'
  };

  const MESSAGE = {
    PENDING: "We have your booking and receipt. We will confirm within one working day.",
    CONFIRMED: "Your booking is confirmed. We will WhatsApp you before move-in day.",
    ACTIVE: "You are living here now. Welcome home!",
    ENDED: "This stay has ended. Thank you for staying with Happy Home.",
    REJECTED: "We could not accept this booking. See the note below or contact us.",
    CANCELLED: "This booking was cancelled."
  };

  /** Submitted -> Confirmed -> Moved in -> Ended, with a red stop for rejected/cancelled. */
  function stepper(b) {
    const labels = ["Submitted", "Confirmed", "Moved in", "Ended"];
    const reached = { PENDING: 0, CONFIRMED: 1, ACTIVE: 2, ENDED: 3 }[b.status];
    let failAt = -1;
    if (b.status === "REJECTED") failAt = 1;
    if (b.status === "CANCELLED") {
      const wasConfirmed = (b.history || []).some((h) => h.status === "CONFIRMED");
      failAt = !wasConfirmed ? 1 : U.todayISO() < b.moveIn ? 2 : 3;
    }
    return `<div class="stepper">${labels
      .map((label, i) => {
        let cls = "";
        let dot = String(i + 1);
        if (failAt > -1) {
          if (i < failAt) [cls, dot] = ["is-done", ICON.check];
          else if (i === failAt) [cls, dot, label] = ["is-failed", ICON.x, b.status === "REJECTED" ? "Rejected" : "Cancelled"];
        } else if (i < reached || (i === reached && b.status === "ENDED")) {
          [cls, dot] = ["is-done", ICON.check];
        } else if (i === reached) {
          [cls, dot] = ["is-current", String(i + 1)];
        }
        return `<div class="stepper__step ${cls}"><span class="stepper__dot">${dot}</span>${U.esc(label)}</div>`;
      })
      .join("")}</div>`;
  }

  function card(b, i) {
    const h = S.getHouse(b.houseId);
    const cover = h ? S.coverImage(h) : "";
    const status = b.status.toLowerCase();
    return `
      <article class="tcard reveal" style="--i:${Math.min(i, 5)}">
        <a class="tcard__media skeleton" href="${h ? `house.html?id=${encodeURIComponent(h.id)}` : "#houses"}">
          ${cover ? `<img class="img-load" src="${U.esc(cover)}" alt="">` : ""}
        </a>
        <div class="tcard__body">
          <header class="tcard__head">
            <div>
              <p class="tcard__ref">${U.esc(b.ref)}</p>
              <h3 class="h3">${U.esc(h ? h.name : "House no longer listed")}</h3>
              <p class="muted small">${U.esc(h ? `${h.area} · ${h.type}` : "")}</p>
            </div>
            <span class="badge badge--dot badge--${status}">${U.esc(S.STATUS_LABEL[b.status])}</span>
          </header>
          <p class="tcard__msg tcard__msg--${status}">${U.esc(MESSAGE[b.status] || "")}</p>
          ${stepper(b)}
          <dl class="tcard__facts">
            <div><dt>${ICON.calendar}Move in</dt><dd>${U.fmtDate(b.moveIn)}</dd></div>
            <div><dt>${ICON.calendar}Move out</dt><dd>${U.fmtDate(b.moveOut)}</dd></div>
            <div><dt>${ICON.calendar}Stay</dt><dd>${U.plural(b.months, "month")}</dd></div>
            <div><dt>${ICON.money}Paid upfront</dt><dd>${U.fmtRM(b.amounts.payNow)}</dd></div>
          </dl>
          ${b.adminNote ? `<div class="tcard__note">${ICON.note}<div><strong>Note from Happy Home</strong><p>${U.esc(b.adminNote)}</p></div></div>` : ""}
          <p class="tcard__foot muted small">Booked ${U.fmtDateTime(b.createdAt)} for ${U.esc(b.name)}</p>
        </div>
      </article>`;
  }

  function render(phone) {
    const box = U.qs("#trackResults");
    const list = S.findByPhone(phone);
    const s = S.getSettings();
    if (!list.length) {
      box.innerHTML = `
        <div class="track-empty fade-up">
          ${ICON.search}
          <h3 class="h3">No booking found for ${U.esc(U.fmtPhone(phone))}</h3>
          <p class="muted">Check the number you used when booking, or chat with us and we will look it up.</p>
          <a class="btn btn--primary" target="_blank" rel="noopener" href="${U.whatsappUrl(s.company.whatsapp, `Hi Happy Home, I cannot find my booking. My phone number is ${phone}.`)}">${ICON.wa} WhatsApp us</a>
        </div>`;
      return;
    }
    box.innerHTML = `
      <p class="track-summary fade-up">${U.plural(list.length, "booking")} found for <strong>${U.esc(U.fmtPhone(phone))}</strong></p>
      <div class="track-list">${list.map(card).join("")}</div>`;
    U.initImages(box);
    U.initReveal(box);
  }

  U.ready(() => {
    const form = U.qs("#trackForm");
    const input = U.qs("#trackPhone");
    if (!form) return;
    let last = "";

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const digits = S.normPhone(input.value);
      if (digits.length < 9) {
        U.setInvalid(input, "Enter the phone number you used to book, e.g. 012-345 6789.");
        input.focus();
        return;
      }
      U.clearInvalid(input);
      last = input.value;
      const btn = U.qs("button[type=submit]", form);
      btn.classList.add("is-loading");
      // Tiny pause so the result feels looked-up rather than instant.
      setTimeout(() => {
        btn.classList.remove("is-loading");
        render(last);
        try {
          sessionStorage.setItem("hh.trackPhone", last);
        } catch (err) {
          /* private mode - nothing to remember */
        }
      }, 450);
    });
    input.addEventListener("input", () => U.clearInvalid(input));

    const fromUrl = new URLSearchParams(location.search).get("phone");
    let remembered = "";
    try {
      remembered = sessionStorage.getItem("hh.trackPhone") || "";
    } catch (err) {
      remembered = "";
    }
    const start = fromUrl || remembered;
    if (start) {
      input.value = start;
      last = start;
      render(start);
      if (fromUrl) setTimeout(() => U.scrollToId("#track", 40), 350);
    }

    // Admin confirmed in another tab: refresh what the customer is looking at.
    S.onChange(() => last && render(last));
  });
})();
