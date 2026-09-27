/* Sable Villas — generic scroll frame scrubber for inner pages.
   Any <canvas data-scrub> becomes a scroll-driven image sequence:

     data-frames   "/frames/seasons/se_"   path prefix; files are prefix + 0001.webp …
     data-count    "183"                   number of frames
     data-poster   "/assets/img/x.webp"    drawn immediately while frames load
     data-runway   "#seasons"              element whose scroll span drives progress 0..1
     data-timeline "0:0,0.08:0,0.34:60"    progress:frame keyframes, linear between them

   Elements with data-at="0.34" inside the same runway get .is-active once
   progress passes that value (used for the season tabs). No dependencies. */
(function () {
  const canvases = document.querySelectorAll("canvas[data-scrub]");
  if (!canvases.length) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  canvases.forEach((canvas) => {
    const prefix = canvas.dataset.frames;
    const count = parseInt(canvas.dataset.count, 10);
    const runway = document.querySelector(canvas.dataset.runway) || canvas.closest("section");
    const timeline = (canvas.dataset.timeline || `0:0,1:${count - 1}`).split(",").map((kv) => {
      const [p, f] = kv.split(":").map(Number);
      return { p, f };
    });
    const marks = [...runway.querySelectorAll("[data-at]")].map((el) => ({ el, at: parseFloat(el.dataset.at) }));
    const ctx = canvas.getContext("2d");
    const frames = new Array(count).fill(null);
    let current = -1;
    let dpr = 1;

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    }

    function draw(img) {
      if (!img || !img.naturalWidth) return;
      const cw = canvas.width, ch = canvas.height;
      // cover
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    }

    function frameFor(p) {
      for (let i = 1; i < timeline.length; i++) {
        const a = timeline[i - 1], b = timeline[i];
        if (p <= b.p) {
          const t = b.p === a.p ? 0 : (p - a.p) / (b.p - a.p);
          return Math.round(a.f + t * (b.f - a.f));
        }
      }
      return timeline[timeline.length - 1].f;
    }

    function nearestLoaded(i) {
      for (let k = i; k >= 0; k--) if (frames[k]) return frames[k];
      return poster;
    }

    function progress() {
      const top = runway.getBoundingClientRect().top + window.scrollY;
      const span = runway.offsetHeight - window.innerHeight;
      if (span <= 0) return 0;
      return Math.min(1, Math.max(0, (window.scrollY - top) / span));
    }

    function update() {
      const p = reduced ? 0 : progress();
      const idx = frameFor(p);
      if (idx !== current) {
        current = idx;
        draw(nearestLoaded(idx));
      }
      marks.forEach((m) => m.el.classList.toggle("is-active", p >= m.at));
      // exactly one tab active: the last one passed
      let last = null;
      marks.forEach((m) => { if (p >= m.at) last = m; });
      marks.forEach((m) => m.el.classList.toggle("is-current", m === last));
    }

    const poster = new Image();
    poster.onload = () => { size(); if (current < 0) draw(poster); };
    if (canvas.dataset.poster) poster.src = canvas.dataset.poster;

    // Progressive preload: first frames first, a few at a time, redraw as they land.
    let next = 0;
    function loadOne() {
      if (next >= count) return;
      const i = next++;
      const img = new Image();
      img.onload = () => { frames[i] = img; if (frameFor(progress()) === i || (current < 0 && i === 0)) { current = -1; update(); } loadOne(); };
      img.onerror = () => loadOne();
      img.src = `${prefix}${String(i + 1).padStart(4, "0")}.webp`;
    }
    if (!reduced) for (let k = 0; k < 6; k++) loadOne();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", () => { size(); current = -1; update(); });
    size();
    update();
  });
})();
