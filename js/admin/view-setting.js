/* ==========================================================================
   Happy Home - admin/view-setting.js
   "Setting" view: company profile (with live footer preview), payment
   details (with "Pay to" preview + copy), booking rules, the signed-in
   account and demo-data reset. Each section saves on its own, with dirty
   tracking and inline validation. Section nav = sticky side list on desktop,
   horizontal chips on phones, highlighted by scroll position.
   ========================================================================== */
(function () {
  if (!window.Admin) return;

  const U = window.UI;
  const S = window.Store;
  const A = window.Admin;

  const SECTIONS = [
    { key: "company", label: "Company profile", icon: A.icons.house },
    { key: "bank", label: "Payment details", icon: A.icons.money },
    { key: "rules", label: "Booking rules", icon: A.icons.calendar },
    { key: "account", label: "Your account", icon: A.icons.users },
    { key: "data", label: "Demo data", icon: A.icons.refresh }
  ];
  const SECTION_KEYS = SECTIONS.map((s) => s.key);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const digits = (v) => String(v || "").replace(/\D/g, "");

  let observer = null;
  let pendingScroll = true; // true on first load and after every hash change
  window.addEventListener("hashchange", () => {
    pendingScroll = true;
  });

  /* ------------------------------------------------------------ Markup */
  function field(name, label, value, { type = "text", hint = "", span = false, textarea = false, attrs = "" } = {}) {
    const id = `set-${name.replace(".", "-")}`;
    const control = textarea
      ? `<textarea class="textarea" id="${id}" name="${name}" rows="3" ${attrs}>${U.esc(value)}</textarea>`
      : `<input class="input" id="${id}" name="${name}" type="${type}" value="${U.esc(value)}" ${attrs}>`;
    return `
      <div class="field${span ? " span-2" : ""}">
        <label for="${id}">${U.esc(label)}</label>
        ${control}
        ${hint ? `<span class="hint">${U.esc(hint)}</span>` : ""}
      </div>`;
  }

  function panel(key, i, title, sub, body, { form = true } = {}) {
    const inner = form
      ? `<form class="set-form" data-sec="${key}" novalidate>
           ${body}
           <div class="set-actions">
             <button type="submit" class="btn btn--primary" disabled>${A.icons.save}<span>Save changes</span></button>
           </div>
         </form>`
      : body;
    return `
      <section class="panel set-panel reveal" id="set-${key}" data-sec="${key}" style="--i:${i}">
        <header class="panel__head">
          <div><h2>${U.esc(title)}</h2><p class="set-sub">${U.esc(sub)}</p></div>
          ${form ? '<span class="set-dirty" hidden>Unsaved changes</span>' : ""}
        </header>
        <div class="panel__body">${inner}</div>
      </section>`;
  }

  function companyPreview(c) {
    const addr = U.esc(c.address || "").replace(/\n/g, "<br>");
    return `
      <div class="set-preview set-preview--navy">
        <span class="set-preview__tag">Website footer preview</span>
        <strong class="set-preview__brand">${U.esc(c.name || "Company name")}</strong>
        <p class="set-preview__tagline">${U.esc(c.tagline || "")}</p>
        <ul class="set-preview__list">
          <li><span>Phone</span>${U.esc(U.fmtPhone(c.phone))}</li>
          <li><span>Email</span>${U.esc(c.email || "--")}</li>
          <li><span>Office</span>${addr || "--"}</li>
          <li><span>Hours</span>${U.esc(c.hours || "--")}</li>
        </ul>
        <span class="set-preview__wa">${A.icons.whatsapp}<span>Chat on WhatsApp · ${U.esc(U.fmtPhone(c.whatsapp))}</span></span>
      </div>`;
  }

  function bankPreview(b) {
    return `
      <div class="set-preview set-preview--pay">
        <span class="set-preview__tag">Customers see this in the booking form</span>
        <span class="set-pay__label">Pay to</span>
        <strong class="set-pay__bank">${U.esc(b.bankName || "Bank name")}</strong>
        <span class="set-pay__name">${U.esc(b.accountName || "Account name")}</span>
        <div class="set-pay__row">
          <code class="set-pay__no">${U.esc(b.accountNumber || "--")}</code>
          <button type="button" class="btn btn--sm btn--outline" data-copy>Copy</button>
        </div>
      </div>`;
  }

  function template(st, ses) {
    const c = st.company;
    const b = st.bank;
    const r = st.rules;
    const houses = S.getHouses({ includeHidden: true }).length;
    const bookings = S.getBookings().length;
    const nav = SECTIONS.map(
      (s, i) => `<a href="#setting/${s.key}" class="set-nav__link${i === 0 ? " is-active" : ""}" data-target="${s.key}">${s.icon}<span>${U.esc(s.label)}</span></a>`
    ).join("");

    const company = panel("company", 1, "Company profile", "Shown in the website footer and contact block.", `
      <div class="set-split">
        <div class="form-grid">
          ${field("company.name", "Company name", c.name, { span: true, attrs: "required maxlength=\"80\"" })}
          ${field("company.tagline", "Tagline", c.tagline, { span: true, attrs: 'maxlength="120"' })}
          ${field("company.phone", "Phone", c.phone, { type: "tel", attrs: 'inputmode="tel"' })}
          ${field("company.whatsapp", "WhatsApp number", c.whatsapp, { type: "tel", hint: "Customers tap this to chat with you.", attrs: 'inputmode="tel"' })}
          ${field("company.email", "Email", c.email, { type: "email", span: true, attrs: 'inputmode="email"' })}
          ${field("company.address", "Office address", c.address, { textarea: true, span: true })}
          ${field("company.hours", "Office hours", c.hours, { span: true, attrs: 'placeholder="Mon-Fri, 9am - 6pm"' })}
        </div>
        <div class="set-split__preview" data-preview="company">${companyPreview(c)}</div>
      </div>`);

    const bank = panel("bank", 2, "Payment details", "Where customers transfer the deposit and first month.", `
      <div class="set-split">
        <div class="form-grid">
          ${field("bank.bankName", "Bank name", b.bankName, { span: true })}
          ${field("bank.accountName", "Account name", b.accountName, { span: true })}
          ${field("bank.accountNumber", "Account number", b.accountNumber, { span: true, attrs: 'inputmode="numeric"' })}
        </div>
        <div class="set-split__preview" data-preview="bank">${bankPreview(b)}</div>
      </div>`);

    const rules = panel("rules", 3, "Booking rules", "Limits applied when customers book online.", `
      <div class="form-grid">
        ${field("rules.maxMonths", "Maximum months per booking", r.maxMonths, { type: "number", hint: "Between 1 and 60 months.", attrs: 'min="1" max="60" step="1" inputmode="numeric"' })}
        ${field("rules.leadDays", "Minimum notice before move-in (days)", r.leadDays, { type: "number", hint: "0 lets customers move in today. Max 60.", attrs: 'min="0" max="60" step="1" inputmode="numeric"' })}
      </div>`);

    const account = panel("account", 4, "Your account", "How you appear in the dashboard.", `
      <div class="set-account">
        <span class="avatar set-account__avatar" data-avatar>${U.esc(A.initials(ses.name) || "A")}</span>
        <div class="form-grid">
          ${field("account.name", "Display name", ses.name, { span: true, attrs: 'maxlength="60"' })}
          ${field("account.email", "Email", ses.email, { type: "email", span: true, hint: "Sign-in email cannot be changed here.", attrs: "readonly" })}
        </div>
      </div>
      <p class="set-note">${A.icons.key}<span>Demo mode: any email and password can sign in.</span></p>`);

    const data = panel("data", 5, "Demo data", "Everything is stored in this browser only.", `
      <dl class="set-counts">
        <div><dt>Houses</dt><dd>${houses}</dd></div>
        <div><dt>Bookings</dt><dd>${bookings}</dd></div>
      </dl>
      <div class="set-danger">
        <p>Resetting restores the sample houses, bookings and settings. Your changes will be lost.</p>
        <button type="button" class="btn btn--danger" data-reset>${A.icons.trash}<span>Reset demo data</span></button>
      </div>`, { form: false });

    return `
      <div class="set-layout">
        <nav class="set-nav reveal" style="--i:0" aria-label="Setting sections">${nav}</nav>
        <div class="set-content">${company}${bank}${rules}${account}${data}</div>
      </div>`;
  }

  /* ------------------------------------------------------------ Forms */
  const readForm = (form) => {
    const out = {};
    U.qsa("input[name], textarea[name]", form).forEach((inp) => {
      if (!inp.readOnly) out[inp.name.split(".")[1]] = inp.value.trim();
    });
    return out;
  };
  const input = (form, name) => U.qs(`[name="${name}"]`, form);

  function validate(sec, form, v) {
    const errs = [];
    const need = (key, label) => {
      if (!v[key]) errs.push([input(form, `${sec}.${key}`), `${label} is required.`]);
      return !!v[key];
    };
    const phone = (key, label) => {
      if (need(key, label) && digits(v[key]).length < 9) errs.push([input(form, `${sec}.${key}`), `${label} needs at least 9 digits.`]);
    };
    const range = (key, min, max) => {
      const n = Number(v[key]);
      if (v[key] === "" || !Number.isInteger(n) || n < min || n > max)
        errs.push([input(form, `${sec}.${key}`), `Enter a whole number from ${min} to ${max}.`]);
    };
    if (sec === "company") {
      need("name", "Company name");
      phone("phone", "Phone");
      phone("whatsapp", "WhatsApp number");
      if (need("email", "Email") && !EMAIL_RE.test(v.email)) errs.push([input(form, "company.email"), "Enter a valid email address."]);
    } else if (sec === "bank") {
      need("bankName", "Bank name");
      need("accountName", "Account name");
      if (need("accountNumber", "Account number") && digits(v.accountNumber).length < 6)
        errs.push([input(form, "bank.accountNumber"), "Account number needs at least 6 digits."]);
    } else if (sec === "rules") {
      range("maxMonths", 1, 60);
      range("leadDays", 0, 60);
    } else if (sec === "account") {
      if (need("name", "Display name") && v.name.length < 2) errs.push([input(form, "account.name"), "Use at least 2 characters."]);
    }
    return errs;
  }

  function persist(sec, v) {
    if (sec === "account") {
      const ok = S.updateSession({ name: v.name });
      if (ok) A.renderUser();
      return !!ok;
    }
    if (sec === "rules") v = { maxMonths: Number(v.maxMonths), leadDays: Number(v.leadDays) };
    return !!S.saveSettings({ [sec]: v });
  }

  function bindForm(form) {
    const sec = form.dataset.sec;
    const panelEl = form.closest(".set-panel");
    const pill = U.qs(".set-dirty", panelEl);
    const btn = U.qs('button[type="submit"]', form);
    let snapshot = JSON.stringify(readForm(form));

    const update = () => {
      const v = readForm(form);
      const dirty = JSON.stringify(v) !== snapshot;
      btn.disabled = !dirty;
      pill.hidden = !dirty;
      panelEl.classList.toggle("is-dirty", dirty);
      if (sec === "company") U.qs('[data-preview="company"]', panelEl).innerHTML = companyPreview(v);
      if (sec === "bank") U.qs('[data-preview="bank"]', panelEl).innerHTML = bankPreview(v);
      if (sec === "account") U.qs("[data-avatar]", panelEl).textContent = A.initials(v.name) || "A";
    };

    form.addEventListener("input", (e) => {
      if (e.target.classList && e.target.classList.contains("is-invalid")) U.clearInvalid(e.target);
      update();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      U.qsa(".is-invalid", form).forEach((i) => U.clearInvalid(i));
      const v = readForm(form);
      const errs = validate(sec, form, v);
      if (errs.length) {
        errs.forEach(([inp, msg]) => inp && U.setInvalid(inp, msg));
        errs[0][0] && errs[0][0].focus();
        U.toast("Please fix the highlighted fields.", "error");
        return;
      }
      if (!persist(sec, v)) {
        U.toast("Could not save. Browser storage may be full or your session expired.", "error");
        return;
      }
      snapshot = JSON.stringify(readForm(form));
      update();
      const label = SECTIONS.find((s) => s.key === sec).label;
      U.toast(`${label} saved.`, "success");
    });
  }

  /* ------------------------------------------------------------ Copy */
  function copyText(text) {
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        if (!ok) throw new Error("copy failed");
        U.toast("Account number copied.", "success");
      } catch (err) {
        U.toast(`Copy not supported here. Account number: ${text}`, "info", 5000);
      }
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => U.toast("Account number copied.", "success"), fallback);
    } else fallback();
  }

  /* ------------------------------------------------------------ Nav */
  function setActive(el, key) {
    U.qsa(".set-nav__link", el).forEach((a) => {
      const on = a.dataset.target === key;
      a.classList.toggle("is-active", on);
      if (on) {
        const nav = a.parentElement;
        if (nav.scrollWidth > nav.clientWidth) {
          nav.scrollTo({ left: a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2, behavior: "smooth" });
        }
      }
    });
  }

  function scrollToSection(el, key, smooth = true) {
    const target = U.qs(`#set-${key}`, el);
    if (!target) return;
    setActive(el, key);
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: smooth && !reduce ? "smooth" : "auto", block: "start" });
  }

  function bindNav(el) {
    U.qsa(".set-nav__link", el).forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault(); // keep the hash so unsaved edits are not re-rendered away
        scrollToSection(el, a.dataset.target);
      });
    });
    if (!("IntersectionObserver" in window)) return;
    observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((en) => en.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0];
        if (hit) setActive(el, hit.target.dataset.sec);
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    U.qsa(".set-panel", el).forEach((p) => observer.observe(p));
  }

  /* ------------------------------------------------------------ Data */
  function bindReset(el) {
    const btn = U.qs("[data-reset]", el);
    btn.addEventListener("click", async () => {
      const ok = await U.confirm({
        title: "Reset demo data?",
        message: "All houses, bookings and settings go back to the original sample data. This cannot be undone.",
        okText: "Reset data",
        danger: true
      });
      if (!ok) return;
      S.resetDemo();
      U.toast("Demo data has been reset.", "success");
      A.renderUser();
      A.refreshBadges();
      A.refresh();
    });
  }

  /* ------------------------------------------------------------ Render */
  A.register("setting", {
    title: "Setting",
    subtitle: "Company profile, payment and account",
    render(el, param) {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      const ses = S.getSession() || A.session || { name: "", email: "" };
      el.innerHTML = template(S.getSettings(), ses);
      U.qsa(".set-form", el).forEach(bindForm);
      bindNav(el);
      bindReset(el);
      el.addEventListener("click", onCopyClick);

      const key = String(param || "").toLowerCase();
      if (pendingScroll && SECTION_KEYS.includes(key)) {
        // core scrolls to top after render; jump once that has happened.
        setTimeout(() => scrollToSection(el, key, false), 60);
      }
      pendingScroll = false;
    }
  });

  function onCopyClick(e) {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const form = btn.closest(".set-panel");
    const inp = form && U.qs('[name="bank.accountNumber"]', form);
    const value = inp ? inp.value.trim() : "";
    if (!value) {
      U.toast("No account number to copy yet.", "info");
      return;
    }
    copyText(value);
  }
})();
