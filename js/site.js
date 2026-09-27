/* Sable Villas — shared site behaviour (all pages) */
(function () {
  const body = document.body;

  /* Mobile nav */
  const toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const open = body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".site-nav a").forEach((a) =>
      a.addEventListener("click", () => body.classList.remove("nav-open"))
    );
  }

  /* Reveal on scroll */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* Count-up numbers outside the film band */
  const counters = document.querySelectorAll(".page .stat-number:not([data-static]), .page-flow .stat-number:not([data-static])");
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.value);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const dur = 1600, t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (counters.length && "IntersectionObserver" in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    counters.forEach((el) => cio.observe(el));
  }

  /* Forms. All forms post to the Formspree endpoint in js/config.js, which
     relays them by email to the client. reCAPTCHA v3 runs invisibly on submit
     and Formspree verifies the token server-side. A honeypot field is added to
     every form as a second, free layer. With no endpoint configured, the form
     just shows its local success state. */
  const CFG = window.SABLE || {};
  const forms = document.querySelectorAll("form.form, form.news-form");

  function loadRecaptcha() {
    if (!CFG.recaptchaSiteKey || document.getElementById("recaptcha-lib")) return;
    const s = document.createElement("script");
    s.id = "recaptcha-lib";
    s.src = "https://www.google.com/recaptcha/api.js?render=" + encodeURIComponent(CFG.recaptchaSiteKey);
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  }
  function captchaToken(action) {
    return new Promise((resolve) => {
      if (!CFG.recaptchaSiteKey || !window.grecaptcha) return resolve("");
      try {
        grecaptcha.ready(() => grecaptcha.execute(CFG.recaptchaSiteKey, { action }).then(resolve, () => resolve("")));
      } catch (_) { resolve(""); }
    });
  }

  forms.forEach((form) => {
    // honeypot: hidden from people, tempting to bots; Formspree drops any submission that fills it
    const hp = document.createElement("input");
    hp.type = "text"; hp.name = "_gotcha"; hp.tabIndex = -1; hp.autocomplete = "off"; hp.setAttribute("aria-hidden", "true");
    hp.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0";
    form.appendChild(hp);
    // load reCAPTCHA once a visitor shows intent (keeps the badge off pages nobody submits from)
    form.addEventListener("focusin", loadRecaptcha, { once: true });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const endpoint = form.dataset.endpoint || CFG.formEndpoint;
      const btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Sending…"; }
      try {
        if (endpoint) {
          const name = form.dataset.form || (form.classList.contains("news-form") ? "newsletter" : "form");
          const data = new FormData(form);
          data.append("_subject", `Sable Villas website: ${name.replace(/-/g, " ")}`);
          data.append("form", name);
          data.append("page", location.href);
          const token = await captchaToken("submit");
          if (token) data.append("g-recaptcha-response", token);
          const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error("Request failed");
        }
        form.classList.add("sent");
        const ok = form.parentElement.querySelector(".form-success");
        if (ok) ok.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
        alert("Something went wrong sending your message. Please email " + (CFG.notifyEmail || "sales@sablevillas.ae") + ".");
      }
    });
  });

  /* Contact route cards pre-select the reason field */
  const reason = document.getElementById("reason");
  if (reason) {
    const apply = (val) => {
      reason.value = val;
      document.querySelectorAll(".route-card").forEach((c) => c.classList.toggle("active", c.dataset.reason === val));
    };
    document.querySelectorAll(".route-card").forEach((card) => {
      card.addEventListener("click", () => {
        apply(card.dataset.reason);
        document.getElementById("form").scrollIntoView({ behavior: "smooth" });
      });
    });
    const q = new URLSearchParams(location.search).get("reason");
    if (q) apply(q);
    const community = new URLSearchParams(location.search).get("community");
    const cSel = document.getElementById("community");
    if (community && cSel) cSel.value = community;
  }

  /* Community filters */
  const filterBtns = document.querySelectorAll(".filter");
  if (filterBtns.length) {
    const cards = document.querySelectorAll(".community-card[data-tags]");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const f = btn.dataset.filter;
        cards.forEach((c) => {
          const tags = c.dataset.tags.split(" ");
          c.classList.toggle("hidden", f !== "all" && !tags.includes(f));
        });
      });
    });
  }
})();
