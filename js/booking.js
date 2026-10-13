/* ==========================================================================
   Happy Home - booking.js
   Booking form for one house (opened from house.html): move-in date and
   months with a live payment summary, customer details, bank transfer
   details, receipt upload, then a success screen with the booking ref and a
   link to track it by phone.
   Depends on: ui.js, seed.js, store.js
   Exposes: window.Booking.open(houseId)
   ========================================================================== */
(function () {
  "use strict";

  const U = window.UI;
  const S = window.Store;

  const I = (d, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    upload: I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>'),
    file: I('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>'),
    copy: I('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    bank: I('<path d="M3 21h18M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8"/><path d="m12 3 9 5H3Z"/>'),
    check: I('<path d="M20 6 9 17l-5-5"/>', 2.6),
    alert: I('<circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/>'),
    chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>'
  };

  const MAX_RECEIPT_MB = 5;
  let house = null;
  let receipt = null;

  const modal = () => U.qs("#bookModal");

  function monthOptions(h) {
    const max = S.getSettings().rules.maxMonths || 36;
    const opts = [];
    for (let m = h.minMonths; m <= max; m++) {
      if (m <= 12 || m % 6 === 0) opts.push(m);
    }
    return opts.map((m) => `<option value="${m}">${U.plural(m, "month")}${m === 12 ? " (1 year)" : m === 24 ? " (2 years)" : ""}</option>`).join("");
  }

  function formHtml(h) {
    const s = S.getSettings();
    const start = S.availableFrom(h.id);
    return `
      <form id="bookForm" class="book-form" novalidate>
        <section class="book-step">
          <h3 class="book-step__title"><span>1</span>When do you want to move in?</h3>
          <div class="form-grid">
            <div class="field">
              <label for="bMoveIn">Move-in date</label>
              <input class="input" id="bMoveIn" type="date" min="${U.todayISO()}" value="${start}" required>
            </div>
            <div class="field">
              <label for="bMonths">How long</label>
              <select class="select" id="bMonths">${monthOptions(h)}</select>
            </div>
          </div>
          <div class="book-summary" id="bSummary" aria-live="polite"></div>
        </section>

        <section class="book-step">
          <h3 class="book-step__title"><span>2</span>Your details</h3>
          <div class="form-grid">
            <div class="field span-2">
              <label for="bName">Full name (as in IC)</label>
              <input class="input" id="bName" autocomplete="name" placeholder="e.g. Nurul Aina binti Hassan" required>
            </div>
            <div class="field">
              <label for="bPhone">Phone number</label>
              <input class="input" id="bPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="012-345 6789" required>
              <span class="hint">You will use this number to track your booking.</span>
            </div>
            <div class="field">
              <label for="bEmail">Email (optional)</label>
              <input class="input" id="bEmail" type="email" autocomplete="email" placeholder="you@email.com">
            </div>
            <div class="field">
              <label for="bOcc">People staying</label>
              <select class="select" id="bOcc">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<option value="${n}"${n === 2 ? " selected" : ""}>${U.plural(n, "person", "people")}</option>`).join("")}</select>
            </div>
          </div>
        </section>

        <section class="book-step">
          <h3 class="book-step__title"><span>3</span>Pay &amp; upload your receipt</h3>
          <div class="payto">
            <span class="payto__icon">${ICON.bank}</span>
            <div class="payto__body">
              <small>Transfer <strong id="bPayNow">RM 0</strong> to</small>
              <strong>${U.esc(s.bank.bankName)} · ${U.esc(s.bank.accountNumber)}</strong>
              <small>${U.esc(s.bank.accountName)}</small>
            </div>
            <button type="button" class="btn btn--sm btn--glass payto__copy" id="bCopy">${ICON.copy}Copy</button>
          </div>
          <label class="dropzone" id="bDrop" for="bReceipt">
            ${ICON.upload}
            <strong>Upload payment receipt</strong>
            <span class="small">JPG, PNG or PDF · up to ${MAX_RECEIPT_MB} MB · tap or drop here</span>
          </label>
          <input id="bReceipt" type="file" accept="image/*,application/pdf" hidden>
          <span class="error-text" id="bReceiptErr" hidden></span>
          <label class="agree">
            <input type="checkbox" id="bAgree">
            <span>I confirm the details are correct and agree that the deposit is refundable at move-out, less any damage.</span>
          </label>
        </section>

        <div class="book-errors" id="bErrors" hidden></div>
      </form>`;
  }

  function updateSummary() {
    const moveIn = U.qs("#bMoveIn").value;
    const months = Number(U.qs("#bMonths").value);
    const q = S.quote(house.id, moveIn, months);
    const a = q.amounts;
    U.qs("#bPayNow").textContent = U.fmtRM(a.payNow);
    U.qs("#bSummary").innerHTML = `
      <div class="book-summary__rows">
        <div><span>First month rent</span><strong>${U.fmtRM(a.rent)}</strong></div>
        <div><span>Security deposit (${U.plural(house.depositMonths, "month")})</span><strong>${U.fmtRM(a.deposit)}</strong></div>
        <div><span>Utility deposit</span><strong>${U.fmtRM(a.utility)}</strong></div>
        <div class="is-total"><span>Pay now</span><strong>${U.fmtRM(a.payNow)}</strong></div>
      </div>
      <p class="book-summary__period">${q.moveOut ? `${U.fmtDate(moveIn)} → ${U.fmtDate(q.moveOut)} · then ${U.fmtRM(a.rent)} every month` : ""}</p>
      ${q.ok ? "" : `<p class="book-summary__warn">${ICON.alert}${U.esc(q.errors[0])}</p>`}`;
    return q;
  }

  async function onReceipt(file) {
    const err = U.qs("#bReceiptErr");
    err.hidden = true;
    if (!file) return;
    const okType = /^image\//.test(file.type) || file.type === "application/pdf";
    if (!okType || file.size > MAX_RECEIPT_MB * 1024 * 1024) {
      err.textContent = okType ? `That file is larger than ${MAX_RECEIPT_MB} MB.` : "Please upload an image or a PDF.";
      err.hidden = false;
      return;
    }
    try {
      receipt = file.type === "application/pdf" ? await U.readFile(file) : await U.compressImage(file, { max: 1200, quality: 0.78 });
    } catch (e) {
      err.textContent = "We could not read that file. Try another one.";
      err.hidden = false;
      return;
    }
    const drop = U.qs("#bDrop");
    drop.classList.add("has-file");
    drop.innerHTML =
      file.type === "application/pdf"
        ? `${ICON.file}<strong>${U.esc(file.name)}</strong><span class="small">Tap to change</span>`
        : `<img src="${receipt}" alt="Receipt preview"><span class="small">${U.esc(file.name)} · tap to change</span>`;
  }

  function bindForm() {
    const form = U.qs("#bookForm");
    ["#bMoveIn", "#bMonths"].forEach((sel) => U.qs(sel).addEventListener("input", updateSummary));
    U.qsa("input, select", form).forEach((i) => i.addEventListener("input", () => U.clearInvalid(i)));

    const fileInput = U.qs("#bReceipt");
    fileInput.addEventListener("change", () => onReceipt(fileInput.files[0]));
    const drop = U.qs("#bDrop");
    ["dragenter", "dragover"].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.add("is-drag");
      })
    );
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove("is-drag")));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      onReceipt(e.dataTransfer.files[0]);
    });

    U.qs("#bCopy").addEventListener("click", async () => {
      const num = S.getSettings().bank.accountNumber.replace(/\s/g, "");
      try {
        await navigator.clipboard.writeText(num);
        U.toast("Account number copied", "success");
      } catch (e) {
        U.toast(`Account number: ${num}`, "info", 5000);
      }
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submit();
    });
  }

  function submit() {
    const name = U.qs("#bName");
    const phone = U.qs("#bPhone");
    const agree = U.qs("#bAgree");
    let bad = null;
    if (!name.value.trim()) {
      U.setInvalid(name, "Please enter your name.");
      bad = bad || name;
    }
    if (S.normPhone(phone.value).length < 9) {
      U.setInvalid(phone, "Enter a valid phone number, e.g. 012-345 6789.");
      bad = bad || phone;
    }
    if (!receipt) {
      const err = U.qs("#bReceiptErr");
      err.textContent = "Please upload your payment receipt.";
      err.hidden = false;
      bad = bad || U.qs("#bDrop");
    }
    if (!agree.checked) {
      U.toast("Please tick the confirmation box.", "warning");
      bad = bad || agree;
    }
    const q = updateSummary();
    if (!q.ok) bad = bad || U.qs("#bMoveIn");
    if (bad) {
      bad.scrollIntoView({ behavior: U.prefersReducedMotion() ? "auto" : "smooth", block: "center" });
      return;
    }

    const btn = U.qs("#bSubmit");
    btn.classList.add("is-loading");
    setTimeout(() => {
      const res = S.createBooking({
        houseId: house.id,
        moveIn: U.qs("#bMoveIn").value,
        months: Number(U.qs("#bMonths").value),
        name: name.value,
        phone: phone.value,
        email: U.qs("#bEmail").value,
        occupants: U.qs("#bOcc").value,
        receipt
      });
      btn.classList.remove("is-loading");
      if (!res.ok) {
        const box = U.qs("#bErrors");
        box.hidden = false;
        box.innerHTML = res.errors.map((e) => `<p>${ICON.alert}${U.esc(e)}</p>`).join("");
        box.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      success(res.booking);
    }, 700);
  }

  function success(b) {
    const trackUrl = `index.html?phone=${encodeURIComponent(b.phone)}#track`;
    U.qs("#bookBody").innerHTML = `
      <div class="book-done">
        <div class="book-done__tick">${ICON.check}</div>
        <h3 class="h2">Booking sent!</h3>
        <p class="muted">Thank you, ${U.esc(b.name.split(" ")[0])}. We have your receipt and will confirm within one working day.</p>
        <div class="book-done__ref">
          <small>Your booking reference</small>
          <strong>${U.esc(b.ref)}</strong>
        </div>
        <dl class="book-done__facts">
          <div><dt>House</dt><dd>${U.esc(house.name)}</dd></div>
          <div><dt>Move in</dt><dd>${U.fmtDate(b.moveIn)}</dd></div>
          <div><dt>Stay</dt><dd>${U.plural(b.months, "month")}</dd></div>
          <div><dt>Paid</dt><dd>${U.fmtRM(b.amounts.payNow)}</dd></div>
        </dl>
        <p class="small muted">Track it any time with your phone number <strong>${U.esc(U.fmtPhone(b.phone))}</strong>.</p>
      </div>`;
    U.qs("#bookFoot").innerHTML = `
      <button type="button" class="btn btn--ghost" data-close>Close</button>
      <a class="btn btn--primary" href="${trackUrl}">Track my booking ${ICON.chev}</a>`;
    if (window.HousePage) setTimeout(() => window.HousePage.render(), 50);
  }

  function open(houseId) {
    house = S.getHouse(houseId);
    if (!house) return;
    receipt = null;
    U.qs("#bookTitle").textContent = `${house.name} · ${house.area}`;
    U.qs("#bookBody").innerHTML = formHtml(house);
    U.qs("#bookFoot").innerHTML = `
      <button type="button" class="btn btn--ghost" data-close>Cancel</button>
      <button type="submit" form="bookForm" class="btn btn--primary" id="bSubmit">Submit booking ${ICON.chev}</button>`;
    bindForm();
    updateSummary();
    U.modalOpen(modal());
    U.qs("#bookBody").scrollTop = 0;
  }

  window.Booking = { open };
})();
