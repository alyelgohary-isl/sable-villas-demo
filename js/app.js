/* Motion site template — scroll film engine (home page). Configure via window.FILM; do not edit per site. */

gsap.registerPlugin(ScrollTrigger);

const GROUND = (getComputedStyle(document.documentElement).getPropertyValue("--cream").trim() || "#101a1c");  // matches --cream
const FRAME_RADIUS = 16;           // css px, rounded card edge on the film
const HEADER_H = 84;               // css px, keeps the card clear of the fixed header

/* ——— Film sources + timeline ———
   The page declares the film in a small config script (window.FILM, see
   templates/film.config.js) so this engine never needs editing per site:
     FILM.sources  = { film: {dir, prefix, count}, backyard: {...}, ... }
     FILM.timeline = [ {id, units, src, f0, f1}, ... ]   frames indexed within src
     FILM.overlay  = { enter: "clip6:0.12", leave: "glow:0.97" }   (optional)
     FILM.marquee  = { enter: "hold4:0.4",  leave: "hold5:0.9"  }   (optional)
   Segment lengths are relative "units", normalised to 0..1 at load, so adding
   a clip never breaks the others. Text sections reference segments by id:
   data-seg="clip1:0.15,clip1:0.95". */
const FILM = window.FILM || {};
const SOURCES = FILM.sources || { film: { dir: "frames", prefix: "frame_", count: 1 } };
const FILES = [];
const OFFSET = {};
for (const [key, src] of Object.entries(SOURCES)) {
  OFFSET[key] = FILES.length;
  for (let i = 0; i < src.count; i++) FILES.push(`${src.dir}/${src.prefix}${String(i + 1).padStart(4, "0")}.webp`);
}
const F = (src, i) => OFFSET[src] + i;
const FRAME_COUNT = FILES.length;
const framePath = (i) => FILES[i];

const TIMELINE = (FILM.timeline || [{ id: "hero", units: 1, src: "film", f0: 0, f1: SOURCES.film.count - 1 }])
  .map((seg) => ({ ...seg, f0: F(seg.src, seg.f0), f1: F(seg.src, seg.f1) }));
{
  const total = TIMELINE.reduce((a, s) => a + s.units, 0);
  let acc = 0;
  for (const s of TIMELINE) { s.p0 = acc / total; acc += s.units; s.p1 = acc / total; }
}
const SEG = Object.fromEntries(TIMELINE.map((s) => [s.id, s]));
/* "clip1:0.15" → progress 15% of the way into segment clip1 */
function at(ref) {
  const [id, frac] = ref.trim().split(":");
  const s = SEG[id];
  if (!s) { console.warn("unknown segment", id); return 0; }
  return s.p0 + (parseFloat(frac ?? "0")) * (s.p1 - s.p0);
}

const OVERLAY = FILM.overlay ? { enter: at(FILM.overlay.enter), leave: at(FILM.overlay.leave), max: FILM.overlay.max ?? 0.9, fade: 0.03 } : { enter: 2, leave: 2, max: 0, fade: 0.03 };
const MARQUEE = FILM.marquee ? { enter: at(FILM.marquee.enter), leave: at(FILM.marquee.leave) } : { enter: 2, leave: 2 };

/* ——— Lenis smooth scroll ——— */

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ——— Canvas ——— */

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const frames = new Array(FRAME_COUNT).fill(null);
let currentFrame = 0;
let dpr = 1;

function sizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}

/* Frame placement. The film is square; the page is not. On landscape
   screens the frame is anchored to the right and the text lives on the
   solid ground to its left. On portrait screens it sits in the lower part
   of the viewport under the text. No blur, no feathering: a clean card. */
function frameRect() {
  const cw = canvas.width, ch = canvas.height;
  const landscape = cw > ch * 1.05;
  if (landscape) {
    // sits below the fixed header, with a slimmer margin at the bottom
    const top = HEADER_H * dpr, bottom = Math.max(24 * dpr, ch * 0.04);
    const size = Math.min(ch - top - bottom, cw * 0.56);
    const margin = cw * 0.03;
    return { dx: cw - size - margin, dy: top, dw: size, dh: size };
  }
  const size = Math.min(cw * 0.94, ch * 0.38);
  return { dx: (cw - size) / 2, dy: ch - size - ch * 0.03, dw: size, dh: size };
}

function roundedPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFrame(index) {
  let img = frames[index];
  for (let k = index; !img && k >= 0; k--) img = frames[k];   // nearest frame already loaded
  if (!img) return;
  const cw = canvas.width, ch = canvas.height;
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, cw, ch);
  const { dx, dy, dw, dh } = frameRect();
  ctx.save();
  roundedPath(dx, dy, dw, dh, FRAME_RADIUS * dpr);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function progressToFrame(p) {
  for (const s of TIMELINE) {
    if (p >= s.p0 && p <= s.p1) {
      const t = s.p1 === s.p0 ? 0 : (p - s.p0) / (s.p1 - s.p0);
      return Math.round(s.f0 + t * (s.f1 - s.f0));
    }
  }
  return p < 0 ? 0 : FRAME_COUNT - 1;
}

/* ——— Preloader ——— */

const loaderEl = document.getElementById("loader");
const loaderBar = document.getElementById("loader-bar");
const loaderPct = document.getElementById("loader-percent");
let loaded = 0;

function loadImage(i) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { frames[i] = img; done(); };
    img.onerror = () => { frames[i] = null; done(); };
    function done() {
      loaded++;
      const pct = Math.min(100, Math.round((loaded / FIRST_CHUNK) * 100));
      loaderBar.style.width = pct + "%";
      loaderPct.textContent = pct;
      resolve();
    }
    img.src = framePath(i);
  });
}

const FIRST_CHUNK = Math.min(FRAME_COUNT, FILM.firstChunk || 40);   // frames that must be in before the page shows
let nextToLoad = 0;
function loadNext() {
  if (nextToLoad >= FRAME_COUNT) return;
  const i = nextToLoad++;
  loadImage(i).then(() => {
    if (i === currentFrame) requestAnimationFrame(() => drawFrame(currentFrame));
    loadNext();
  });
}
async function preload() {
  await Promise.all([...Array(FIRST_CHUNK).keys()].map(loadImage));
  nextToLoad = FIRST_CHUNK;
  sizeCanvas();
  drawFrame(0);
  loaderEl.classList.add("done");
  playHeroIntro();
  for (let k = 0; k < 6; k++) loadNext();   // stream the rest, six at a time, in scroll order
}

/* ——— Band sections ——— */

const bandSections = [...document.querySelectorAll(".band-section")];
const sectionState = new Map();

function buildTimeline(section) {
  const type = section.dataset.animation;
  const children = section.querySelectorAll(
    ".beat-index, .beat-heading, .beat-body, .stats-hero, .stat"
  );
  const tl = gsap.timeline({
    paused: true,
    onReverseComplete: () => section.classList.remove("is-active"),
  });
  switch (type) {
    case "slide-left":
      tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" });
      break;
    case "slide-right":
      tl.from(children, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" });
      break;
    case "clip-reveal":
      tl.from(children, { clipPath: "inset(0 0 100% 0)", y: 30, opacity: 0, stagger: 0.15, duration: 1.1, ease: "power4.inOut" });
      break;
    case "fade-up":
      tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out" });
      break;
    case "rotate-in":
      tl.from(children, { y: 40, rotation: 2.5, transformOrigin: "left bottom", opacity: 0, stagger: 0.1, duration: 0.9, ease: "power3.out" });
      break;
    case "stagger-up":
      tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: "power3.out" });
      break;
    case "hero":
      break; // built separately on load; scroll only fades it
  }
  return tl;
}

bandSections.forEach((s) => {
  const [enterRef, leaveRef] = s.dataset.seg.split(",");
  sectionState.set(s, {
    enter: at(enterRef),
    leave: at(leaveRef),
    tl: buildTimeline(s),
    countersFired: false,
  });
});

const heroSection = document.querySelector(".hero-section");

function playHeroIntro() {
  const words = heroSection.querySelectorAll(".hero-heading .word");
  gsap.timeline()
    .from(".hero-section .eyebrow", { y: 14, opacity: 0, duration: 0.6, ease: "power3.out" })
    .from(words, { yPercent: 115, duration: 1.1, stagger: 0.06, ease: "power4.out" }, "-=0.3")
    .from(".hero-tagline", { y: 26, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.55")
    .from(".hero-ctas .btn", { y: 20, opacity: 0, stagger: 0.09, duration: 0.7, ease: "power3.out" }, "-=0.5")
    .from(".hero-section .badge-strip", { opacity: 0, duration: 0.7, ease: "power2.out" }, "-=0.3");
}

function fireCounters(scope) {
  scope.querySelectorAll(".stat-number").forEach((el) => {
    if (el.hasAttribute("data-static")) return;   // years, codes: never count up
    const target = parseFloat(el.dataset.value);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    gsap.fromTo(el, { textContent: 0 }, {
      textContent: target,
      duration: 1.8,
      ease: "power1.out",
      snap: { textContent: decimals === 0 ? 1 : 0.1 },
      onUpdate() { el.textContent = parseFloat(el.textContent).toFixed(decimals); },
    });
  });
}

function updateBand(p) {
  bandSections.forEach((s) => {
    const st = sectionState.get(s);
    const inRange = p >= st.enter && p <= st.leave;
    if (s === heroSection) {
      const h = SEG.hero;
      const o = gsap.utils.clamp(0, 1, 1 - (p - (h.p0 + 0.12 * (h.p1 - h.p0))) / (0.65 * (h.p1 - h.p0)));
      s.style.opacity = o;
      s.classList.toggle("is-active", o > 0.01);
      return;
    }
    if (inRange) {
      if (!s.classList.contains("is-active")) {
        s.classList.add("is-active");
        st.tl.timeScale(1).play();
        if (s.classList.contains("stats-section") && !st.countersFired) {
          st.countersFired = true;
          fireCounters(s);
        }
      }
    } else if (s.classList.contains("is-active")) {
      st.tl.timeScale(1.8).reverse();
      if (s.classList.contains("stats-section")) st.countersFired = false;
    }
  });
}

/* ——— Overlay + marquee ——— */

const overlayEl = document.getElementById("dark-overlay") || document.createElement("div");
const marqueeEl = document.getElementById("marquee") || document.createElement("div");
const marqueeText = marqueeEl.querySelector(".marquee-text") || document.createElement("span");

function updateOverlay(p) {
  const { enter, leave, max, fade } = OVERLAY;
  let o = 0;
  if (p >= enter - fade && p < enter) o = max * ((p - (enter - fade)) / fade);
  else if (p >= enter && p <= leave) o = max;
  else if (p > leave && p <= leave + fade) o = max * (1 - (p - leave) / fade);
  overlayEl.style.opacity = o;
}

function updateMarquee(p) {
  const { enter, leave } = MARQUEE;
  const span = 0.025;
  let o = 0;
  if (p >= enter && p <= leave) o = Math.min(1, (p - enter) / span, (leave - p) / span);
  marqueeEl.style.opacity = o;
  if (o > 0) {
    const t = (p - enter) / (leave - enter);
    gsap.set(marqueeText, { xPercent: -8 - t * 30 });
  }
}

/* ——— Master scroll binding ——— */

const scrollContainer = document.getElementById("scroll-container");

ScrollTrigger.create({
  trigger: scrollContainer,
  start: "top top",
  end: "bottom bottom",
  scrub: true,
  onUpdate(self) {
    const p = self.progress;
    const index = progressToFrame(p);
    if (index !== currentFrame) {
      currentFrame = index;
      requestAnimationFrame(() => drawFrame(currentFrame));
    }
    updateBand(p);
    updateOverlay(p);
    updateMarquee(p);
  },
});

/* Hide the film once the page flow has covered it */
ScrollTrigger.create({
  trigger: ".page-flow",
  start: "top 60%",
  onEnter: () => {
    gsap.to(["#canvas-wrap", "#band", "#dark-overlay", "#marquee"], { autoAlpha: 0, duration: 0.4 });
    document.querySelector(".site-header").classList.add("solid");
  },
  onLeaveBack: () => {
    gsap.to(["#canvas-wrap", "#band"], { autoAlpha: 1, duration: 0.4 });
    gsap.set(["#dark-overlay", "#marquee"], { visibility: "visible" });
    document.querySelector(".site-header").classList.remove("solid");
  },
});

/* ——— Same-page anchors through the runway (Lenis) ——— */

const runwayTargets = {
  "#top": 0,
  "#flow": () => scrollContainer.offsetHeight * SEG.clip1.p0,
};

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (href === "#") return;
    e.preventDefault();
    if (href in runwayTargets) {
      const t = runwayTargets[href];
      lenis.scrollTo(typeof t === "function" ? t() : t, { duration: 1.6 });
    } else {
      const el = document.querySelector(href);
      if (el) lenis.scrollTo(el, { offset: -80, duration: 1.6 });
    }
  });
});

/* ——— Resize ——— */

window.addEventListener("resize", () => {
  sizeCanvas();
  drawFrame(currentFrame);
});

/* ——— QA hook: /?p=0.42 jumps straight to that film progress after preload ——— */

function jumpToProgress() {
  const q = new URLSearchParams(location.search).get("p");
  if (q === null) return;
  const p = Math.min(1, Math.max(0, parseFloat(q)));
  const y = p * (scrollContainer.offsetHeight - window.innerHeight);
  lenis.scrollTo(y, { immediate: true });
  window.scrollTo(0, y);
  ScrollTrigger.refresh();
}

/* ——— Go ——— */

sizeCanvas();
preload().then(jumpToProgress);
