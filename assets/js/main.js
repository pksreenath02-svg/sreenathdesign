(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // real mouse only: on touch screens no hover effects, so every link opens on the first tap
  const fine = matchMedia("(hover:hover) and (pointer:fine)").matches, reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const shot = location.search.includes("shot");
  if (shot) document.documentElement.classList.add("shot");

  // header: slides away while reading down, comes back as soon as you scroll up
  const header = $("header"), bar = $(".progress i"); let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY, d = y - lastY;
    if (header && !document.body.classList.contains("menu-open")) {
      header.classList.toggle("is-scrolled", y > 8);
      if (y > 160 && d > 6) header.classList.add("is-hidden");
      else if (d < -6 || y < 160) header.classList.remove("is-hidden");
    }
    if (bar) bar.style.setProperty("--p", Math.min(1, y / Math.max(1, document.documentElement.scrollHeight - innerHeight)));
    lastY = y; ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true }); onScroll();

  // arriving after a colour wipe
  const wipe = $(".wipe");
  const lum = h => { const n = parseInt((h || "#000").slice(1), 16); return ((n >> 16 & 255) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) / 255; };
  function paintWipe(c, tt) { if (!wipe) return; wipe.style.setProperty("--wc", c); wipe.style.setProperty("--wt", lum(c) > .6 ? "#000" : "#fff"); wipe.innerHTML = tt ? `<span class="wipe-t"><span>${tt}</span></span>` : ""; }
  try { const c = sessionStorage.getItem("wipe"); if (c && wipe) { paintWipe(c, sessionStorage.getItem("wipet") || ""); wipe.classList.add("is-out"); sessionStorage.removeItem("wipe"); sessionStorage.removeItem("wipet"); } } catch (e) {}

  // logo draws itself on load
  const logo = $(".nav-logo"), root = document.documentElement, intro = $(".intro");
  window.__introEnd = 0;
  if (intro && root.classList.contains("intro-on")) {
    // first visit: the logo draws itself (about 1 s), then flies into its place in the header and the page appears
    try { sessionStorage.setItem("intro", "1"); } catch (e) {}
    const il = $(".intro-logo", intro); let done = false, t1, t2;
    const finish = () => { if (done) return; done = true; clearTimeout(t1); clearTimeout(t2);
      root.classList.add("intro-done"); intro.classList.add("is-gone"); setTimeout(() => { root.classList.remove("intro-on"); intro.remove(); }, 600); };
    const fly = () => { const a = il.getBoundingClientRect(), b = logo ? $(".logo-svg", logo).getBoundingClientRect() : null;
      intro.classList.add("is-fly");
      if (b && b.width) il.style.transform = `translate(${b.left - a.left}px,${b.top - a.top}px) scale(${b.width / a.width})`;
      t2 = setTimeout(finish, 750); };
    t1 = setTimeout(fly, 1250); window.__introEnd = performance.now() + 1750;
    ["wheel", "touchstart", "keydown", "mousedown"].forEach(ev => addEventListener(ev, () => { if (!done) { window.__introEnd = 0; finish(); } }, { once: true, passive: true }));
  } else if (logo && !shot) { logo.classList.add("logo-intro"); setTimeout(() => logo.classList.remove("logo-intro"), 1900); }

  // text-in (on load) stagger
  $$(".text-in").forEach((el, i) => { if (!el.style.getPropertyValue("--stagger-delay")) el.style.setProperty("--stagger-delay", (0.2 + i * 0.07) + "s"); });

  // scroll-in groups, borders, cards, images
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; const el = e.target; io.unobserve(el);
    if (el.classList.contains("scroll-in-group")) $$(".scroll-in", el).forEach((s, i) => { s.style.setProperty("--stagger-delay", (i * 0.06) + "s"); s.classList.add("is-visible"); });
    $$(".border", el).forEach(b => b.classList.add("is-visible"));
    el.classList.add("is-visible");
  }), { rootMargin: "0px 0px -6% 0px" });
  $$(".scroll-in-group, .project-card, .project-image, .about-photo-wrapper, .border, .reveal").forEach(el => io.observe(el));

  const setMark = c => c && document.documentElement.style.setProperty("--mark", c);

  // home hero: letters rise, the window opens from a hairline and pushes "Sree" and "nath" apart, then cycles films
  const box = $(".home-title-image-box"), hero = $(".home-hero");
  if (box) {
    setTimeout(() => hero.classList.add("is-in"), 40);
    setTimeout(() => { $$(".home-title-word").forEach(b => b.classList.add("is-animated")); box.classList.add("is-animated"); }, 650);
    const cap = $(".hero-cap-t");
    const items = $$(".home-title-image", box); let i = 0;
    const load = m => { if (m && !m.getAttribute("src") && m.dataset.src) { m.src = m.dataset.src; m.preload = "auto"; } };
    const show = n => { load(items[n]); load(items[(n + 1) % items.length]); items.forEach((m, k) => { m.classList.toggle("is-current", k === n); if (k === n) { m.currentTime = 0; m.play().catch(() => {}); } else setTimeout(() => m.pause(), 600); }); box.href = items[n].dataset.href; box.dataset.c = items[n].dataset.c; setMark(items[n].dataset.c);
      if (cap && cap.textContent !== items[n].dataset.name) { cap.classList.add("is-out"); setTimeout(() => { cap.textContent = items[n].dataset.name; cap.classList.remove("is-out"); }, 350); } };
    show(0); setInterval(() => { i = (i + 1) % items.length; show(i); }, 3400);
    // depth: while scrolling away the halves drift apart and the window grows; the pointer tilts the window a little
    const hws = $$(".hw", hero); let tx = 0, ty = 0, sp = 0;
    const paint = () => {
      hws[0].style.transform = `translateX(${-sp * 5}vw)`; hws[1].style.transform = `translateX(${sp * 5}vw)`;
      box.style.transform = `scale(${1 + sp * .22}) rotateX(${ty}deg) rotateY(${tx}deg)`;
      $(".home-hero-subtitle").style.opacity = 1 - sp * 1.4;
    };
    if (!reduced) {
      addEventListener("scroll", () => { sp = Math.min(1, scrollY / (innerHeight * .9)); requestAnimationFrame(paint); }, { passive: true });
      if (fine) hero.addEventListener("mousemove", e => { const r = box.getBoundingClientRect(); tx = ((e.clientX - (r.left + r.width / 2)) / innerWidth) * 10; ty = -((e.clientY - (r.top + r.height / 2)) / innerHeight) * 8; requestAnimationFrame(paint); });
      if (fine) hero.addEventListener("mouseleave", () => { tx = ty = 0; requestAnimationFrame(paint); });
    }
  }

  // title window on graphic / motion pages: cycles visuals or clips
  $$(".cycler").forEach(cy => {
    setTimeout(() => cy.classList.add("is-animated"), 250);
    const items = $$(".cy-item", cy), int = +cy.dataset.int || 1500; let i = 0;
    const show = n => items.forEach((m, k) => {
      const on = k === n; m.classList.toggle("is-current", on);
      if (m.tagName === "VIDEO") { if (on) { if (!m.src) m.src = m.dataset.src; m.currentTime = 0; m.play().catch(() => {}); } else setTimeout(() => m.pause(), 500); }
    });
    show(0); if (items.length > 1) setInterval(() => { i = (i + 1) % items.length; show(i); }, int);
  });

  // film cards play like GIFs while on screen: film-only projects always, the others when "Motion" is chosen
  let filterNow = "all"; const seen = new Set();
  const wants = c => c.dataset.auto || filterNow === "m";
  const sync = c => { const v = $("video", c); if (!v) return;
    if (seen.has(c) && wants(c)) { if (!v.src) v.src = c.dataset.loop; v.play().catch(() => {}); } else { v.pause(); c.classList.remove("is-playing"); } };
  const vio = new IntersectionObserver(es => es.forEach(e => { e.isIntersecting ? seen.add(e.target) : seen.delete(e.target); sync(e.target); }), { threshold: .3 });
  const loopCards = $$(".project-card[data-loop]");
  loopCards.forEach(c => { const v = $("video", c); if (v) { v.addEventListener("playing", () => c.classList.add("is-playing")); vio.observe(c); } });

  // nav: one black pill marks the page; on hover it stretches over to the link under the pointer, then settles
  const links = $(".nav-links"), pill = $(".nav-pill");
  if (links && pill) {
    links.classList.add("js");
    const ls = $$(".nav-link", links), cur = $(".nav-link.is-active", links); let at = null;
    const go = (el, instant) => {
      const W = links.clientWidth, l = el.offsetLeft, r = W - l - el.offsetWidth;
      const prev = at ? at.offsetLeft : l, right = l > prev;
      pill.style.setProperty("--dl", right ? ".09s" : "0s"); pill.style.setProperty("--dr", right ? "0s" : ".09s");
      if (instant) pill.classList.add("no-tr");
      pill.style.setProperty("--l", l + "px"); pill.style.setProperty("--r", r + "px");
      if (instant) { void pill.offsetWidth; pill.classList.remove("no-tr"); }
      ls.forEach(x => x.classList.toggle("is-lit", x === el)); pill.classList.add("is-on"); at = el;
    };
    const home = () => { if (cur) go(cur, !at); else { pill.classList.remove("is-on"); ls.forEach(x => x.classList.remove("is-lit")); at = null; } };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(home); addEventListener("resize", () => { at = null; home(); });
    ls.forEach(l => {
      l.addEventListener("mouseenter", () => go(l, !at));
      l.addEventListener("mousedown", () => pill.classList.add("is-press"));
      l.addEventListener("mouseup", () => pill.classList.remove("is-press"));
      if (fine) {
        l.addEventListener("mousemove", e => { const r = l.getBoundingClientRect(), dx = (e.clientX - r.left - r.width / 2) / r.width, dy = (e.clientY - r.top - r.height / 2) / r.height; $(".roll", l).style.transform = `translate(${dx * 6}px,${dy * 4}px)`; });
        l.addEventListener("mouseleave", () => { $(".roll", l).style.transform = ""; pill.classList.remove("is-press"); });
      }
    });
    links.addEventListener("mouseleave", home);
  }

  if (fine) {
    $$(".project-card").forEach(c => c.addEventListener("mouseenter", () => setMark(c.dataset.c)));

    // buttons: colour fills from where the pointer enters
    $$(".nav-button").forEach(b => b.addEventListener("mouseenter", e => { const r = b.getBoundingClientRect(); b.style.setProperty("--fx", (e.clientX - r.left) + "px"); b.style.setProperty("--fy", (e.clientY - r.top) + "px"); }));
    $$(".nav-button").forEach(b => b.addEventListener("mouseleave", e => { const r = b.getBoundingClientRect(); b.style.setProperty("--fx", (e.clientX - r.left) + "px"); b.style.setProperty("--fy", (e.clientY - r.top) + "px"); }));

    // magnetic: buttons lean toward the pointer
    $$(".magnetic").forEach(m => {
      const host = m.closest(".footer-big") || m;
      host.addEventListener("mousemove", e => { const r = m.getBoundingClientRect(); m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; });
      host.addEventListener("mouseleave", () => { m.style.transform = ""; });
    });
  }

  // copy email
  $$(".copy-email").forEach(b => b.addEventListener("click", () => {
    const done = () => { const lbl = b.querySelector(".roll"); const old = lbl.innerHTML; b.classList.add("is-done"); lbl.innerHTML = `<span>${b.dataset.done}</span>`; setTimeout(() => { b.classList.remove("is-done"); lbl.innerHTML = old; }, 1800); };
    (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.email) : Promise.reject()).then(done).catch(() => { location.href = "mailto:" + b.dataset.email; });
  }));

  // image viewer on project pages: click an image, arrows / Esc / swipe
  const zs = $$("[data-zoom]");
  if (zs.length) {
    const lb = document.createElement("div"); lb.className = "viewer"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true");
    lb.innerHTML = '<img alt=""><button class="viewer-close" aria-label="Close">Esc ✕</button><button class="viewer-prev" aria-label="Previous">←</button><button class="viewer-next" aria-label="Next">→</button><span class="viewer-count"></span>';
    document.body.appendChild(lb); const im = $("img", lb), ct = $(".viewer-count", lb); let at = 0;
    const show = n => { at = (n + zs.length) % zs.length; im.src = zs[at].currentSrc || zs[at].src; im.alt = zs[at].alt; ct.textContent = `${at + 1} / ${zs.length}`; };
    const open = n => { show(n); lb.classList.add("is-open"); document.body.classList.add("menu-open"); };
    const close = () => { lb.classList.remove("is-open"); document.body.classList.remove("menu-open"); };
    zs.forEach((z, i) => { z.addEventListener("click", () => open(i)); if (fine) z.dataset.cursor = "Zoom"; });
    $(".viewer-close", lb).addEventListener("click", close); $(".viewer-prev", lb).addEventListener("click", e => { e.stopPropagation(); show(at - 1); }); $(".viewer-next", lb).addEventListener("click", e => { e.stopPropagation(); show(at + 1); });
    lb.addEventListener("click", e => { if (e.target === lb) close(); });
    addEventListener("keydown", e => { if (!lb.classList.contains("is-open")) return; if (e.key === "Escape") close(); if (e.key === "ArrowRight") show(at + 1); if (e.key === "ArrowLeft") show(at - 1); });
    let sx = 0; lb.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true }); lb.addEventListener("touchend", e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1)); });
  }

  // scroll-lit words + footer fill
  const scrubs = $$(".scrub").map(el => ({ el, ws: $$(".wd", el) })), fill = $(".footer-big .roll");
  const scrubTick = () => {
    const vh = innerHeight;
    scrubs.forEach(({ el, ws }) => { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      const pr = Math.min(1, Math.max(0, (vh * .88 - r.top) / (vh * .5 + r.height * .6))); const n = Math.round(pr * ws.length);
      ws.forEach((w, i) => w.classList.toggle("on", i < n)); });
    if (fill) { const r = fill.getBoundingClientRect(); const pr = Math.min(1, Math.max(0, (vh * .95 - r.top) / (vh * .55))); fill.style.setProperty("--fp", (100 - pr * 100).toFixed(1) + "%"); }
  };
  if (reduced) { scrubs.forEach(s => s.ws.forEach(w => w.classList.add("on"))); if (fill) fill.style.setProperty("--fp", "0%"); }
  else { addEventListener("scroll", () => requestAnimationFrame(scrubTick), { passive: true }); addEventListener("resize", scrubTick); scrubTick(); }

  // marquee: runs only while it is on screen, reacts to scroll speed and direction (no layout reads per frame)
  $$(".mq-track").forEach(mq => {
    if (reduced) return;
    const base = +mq.dataset.speed || 0.6; let lastS = scrollY, vel = 0, dir = -1, mx = 0, slow = 1, spd = -base, half = mq.scrollWidth / 2, on = false, raf = 0;
    addEventListener("resize", () => { half = mq.scrollWidth / 2; });
    mq.addEventListener("mouseenter", () => slow = .15); mq.addEventListener("mouseleave", () => slow = 1);
    const tick = () => {
      const y = scrollY, d = y - lastS; lastS = y; vel += (d - vel) * .08; if (Math.abs(d) > .5) dir = d > 0 ? -1 : 1;
      const target = dir * (base + Math.min(14, Math.abs(vel) * .5)) * slow; spd += (target - spd) * .06; mx += spd;
      if (mx <= -half) mx += half; if (mx > 0) mx -= half; mq.style.transform = `translate3d(${mx.toFixed(2)}px,0,0)`;
      raf = on ? requestAnimationFrame(tick) : 0;
    };
    new IntersectionObserver(es => es.forEach(en => { on = en.isIntersecting; if (on && !raf) { lastS = scrollY; raf = requestAnimationFrame(tick); } })).observe(mq);
  });

  // featured: image slider (arrows page through three at a time; swipe works too)
  $$(".fs").forEach(fs => {
    const tr = $(".fs-track", fs), cnt = $(".fs-count", fs), prev = $(".fs-btn[data-d='-1']", fs), next = $(".fs-btn[data-d='1']", fs), n = tr.children.length;
    const upd = () => { const per = Math.max(1, Math.round(tr.clientWidth / tr.children[0].offsetWidth)), pages = Math.ceil(n / per), pg = Math.min(pages, Math.round(tr.scrollLeft / tr.clientWidth) + 1);
      cnt.textContent = pg + " / " + pages; prev.disabled = tr.scrollLeft < 4; next.disabled = tr.scrollLeft + tr.clientWidth > tr.scrollWidth - 4; };
    $$(".fs-btn", fs).forEach(b => b.addEventListener("click", () => { tr.scrollBy({ left: +b.dataset.d * (tr.clientWidth + 6), behavior: reduced ? "auto" : "smooth" }); setTimeout(upd, 650); }));
    let tk = 0; tr.addEventListener("scroll", () => { if (!tk) tk = requestAnimationFrame(() => { tk = 0; upd(); }); }, { passive: true });
    tr.addEventListener("scrollend", upd); addEventListener("resize", upd); upd();
  });

  // project pages: live "Image 03 / 22" counter
  const ic = $(".img-count");
  if (ic) {
    const ims = $$(".project-image-box > .project-image, .project-image-box > .project-video, .project-image-box > .project-locked"), pad = n => String(n).padStart(2, "0");
    $("i", ic).textContent = pad(ims.length);
    const cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) $("b", ic).textContent = pad(ims.indexOf(e.target) + 1); }), { rootMargin: "-45% 0px -45% 0px" });
    ims.forEach(m => cio.observe(m));
  }

  // work filters: All / Graphic / Motion (cards carry data-tags="g m")
  const grids = $$("[data-grid]"), fbtns = $$(".filter");
  const applyF = f => { filterNow = f; loopCards.forEach(sync); fbtns.forEach(b => b.classList.toggle("is-on", b.dataset.f === f)); grids.forEach(g => $$(".project-card", g).forEach(cd => cd.classList.toggle("is-out", f !== "all" && !(cd.dataset.tags || "").split(" ").includes(f)))); };
  fbtns.forEach(b => b.addEventListener("click", () => applyF(b.dataset.f)));
  const pre = grids.length && grids[0].dataset.pre; if (pre && pre !== "all") applyF(pre);

  // featured rows: the project's film plays while the row is on screen
  const fio = new IntersectionObserver(es => es.forEach(e => {
    const v = $("video", e.target); if (!v) return;
    if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
  }), { threshold: .35 });
  $$(".feat-media").forEach(m => { const v = $("video", m); if (v) { v.addEventListener("playing", () => m.classList.add("is-playing")); fio.observe(m); } });

  // remember an explicit language choice (the head script otherwise follows the browser language)
  $$("[data-lang]").forEach(a => a.addEventListener("click", () => { try { localStorage.setItem("lang", a.dataset.lang); } catch (e) {} }));

  // statement headline: words rise in order, film boxes open, and play only while on screen
  const sth = $(".st-h1");
  if (sth) {
    $$(".st-w>span, .st-chip", sth).forEach((el, i) => el.style.setProperty("--i", i));
    const go = () => document.body.classList.add("st-in"), wait = Math.max(80, (window.__introEnd || 0) - performance.now());
    setTimeout(go, wait); addEventListener("wheel", go, { once: true, passive: true }); addEventListener("touchstart", go, { once: true, passive: true });
    const cio = new IntersectionObserver(es => es.forEach(e => { const v = $("video", e.target); if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }), { threshold: .2 });
    $$(".st-chip", sth).forEach(ch => cio.observe(ch));
  }

  // stage: the three headline films play one after another, only while on screen
  const stg = $(".stage");
  if (stg) {
    const fr = $(".stage-frame", stg), vs = $$("video", fr), nm = $(".stage-now b", stg), ct = $(".stage-count b", stg); let cur = 0, vis = false;
    const show = n => { vs.forEach((v, k) => { v.classList.toggle("is-on", k === n); if (k !== n) v.pause(); });
      cur = n; const v = vs[n]; fr.href = v.dataset.href; nm.textContent = v.dataset.name; ct.textContent = String(n + 1).padStart(2, "0");
      if (!v.src) v.src = v.dataset.src; v.currentTime = 0; if (vis) v.play().catch(() => {}); };
    vs.forEach(v => v.addEventListener("ended", () => show((cur + 1) % vs.length)));
    new IntersectionObserver(es => es.forEach(e => { vis = e.isIntersecting; const v = vs[cur]; if (vis) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }), { threshold: .15 }).observe(fr);
  }

  // burger
  const bb = $(".burger-button"), bm = $(".burger-mobile");
  if (bb && bm) {
    $$(".burger-link-el", bm).forEach((el, i) => el.style.setProperty("--stagger-delay", (0.2 + i * 0.08) + "s"));
    const set = o => { bm.classList.toggle("is-open", o); bb.classList.toggle("is-open", o); document.body.classList.toggle("menu-open", o); };
    bb.addEventListener("click", () => set(!bm.classList.contains("is-open")));
    $(".burger-mobile-overlay", bm).addEventListener("click", () => set(false));
  }

  // film player on motion pages
  $$(".project-video").forEach(p => {
    const v = $("video", p), bar = $(".pv-bar", p), fill = $(".pv-bar i", p), tm = $(".pv-time", p), snd = $(".pv-sound", p);
    const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const toggle = () => v.paused ? v.play() : v.pause(), silent = p.classList.contains("is-silent");
    const label = () => { if (snd) snd.textContent = v.muted ? snd.dataset.off : snd.dataset.on; }; label();
    const withSound = () => { v.muted = false; v.loop = false; v.currentTime = 0; v.play().catch(() => {}); p.classList.add("is-sound"); label(); };
    v.addEventListener("play", () => p.classList.add("is-playing")); v.addEventListener("pause", () => p.classList.remove("is-playing"));
    v.addEventListener("timeupdate", () => { fill.style.width = (v.currentTime / (v.duration || 1) * 100) + "%"; tm.textContent = fmt(v.currentTime) + " / " + fmt(v.duration || 0); });
    $(".pv-play", p).addEventListener("click", e => { e.stopPropagation(); silent ? toggle() : withSound(); });
    v.addEventListener("click", () => { if (!silent && !p.classList.contains("is-sound")) withSound(); else toggle(); });
    if (snd) snd.addEventListener("click", e => { e.stopPropagation(); v.muted = !v.muted; if (!v.muted) p.classList.add("is-sound"); label(); });
    v.addEventListener("ended", () => { v.loop = true; v.muted = true; v.play().catch(() => {}); p.classList.remove("is-sound"); label(); });
    bar.addEventListener("click", e => { const r = bar.getBoundingClientRect(); v.currentTime = (e.clientX - r.left) / r.width * v.duration; });
  });

  // footer: Hamburg time, back to top
  const clock = $(".clock");
  if (clock) { const tick = () => { clock.textContent = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date()); }; tick(); setInterval(tick, 15000); }
  $$(".footer-top").forEach(b => b.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" })));

  // cursor
  const cur = $(".cursor");
  if (cur && fine) {
    let x = -40, y = -40, cx = x, cy = y; addEventListener("mousemove", e => { x = e.clientX; y = e.clientY; });
    (function loop() { cx += (x - cx) * .25; cy += (y - cy) * .25; cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();
    $$("[data-cursor]").forEach(el => {
      el.addEventListener("mouseenter", () => { $("span", cur).textContent = el.dataset.cursor; cur.classList.add("is-big"); cur.style.background = el.dataset.c || "#000"; });
      el.addEventListener("mouseleave", () => { cur.classList.remove("is-big"); cur.style.background = ""; });
    });
    $$("a:not([data-cursor]), button").forEach(el => { el.addEventListener("mouseenter", () => cur.classList.add("is-link")); el.addEventListener("mouseleave", () => cur.classList.remove("is-link")); });
  } else if (cur) cur.remove();

  // page wipe in the destination's colour (one click, starts at once)
  $$("a[href]").forEach(a => {
    const h = a.getAttribute("href"); if (!h || /^(mailto:|tel:|https?:|#)/.test(h) || a.target === "_blank" || a.hasAttribute("download")) return;
    a.addEventListener("click", e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; e.preventDefault();
      const c = a.dataset.c || "#000", go = a.href, tt = a.dataset.t || ""; try { sessionStorage.setItem("wipe", c); sessionStorage.setItem("wipet", tt); } catch (err) {}
      if (wipe) { paintWipe(c, tt); wipe.classList.remove("is-out"); void wipe.offsetWidth; wipe.classList.add("is-in"); }
      setTimeout(() => { location.href = go; }, tt ? 520 : 380);
    });
  });
  addEventListener("pageshow", e => { if (e.persisted && wipe) wipe.classList.remove("is-in", "is-out"); });
})();
