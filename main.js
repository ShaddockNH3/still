/* ============================================================
   STILL / 常住
   The page counts what you do to it.
   ============================================================ */

(() => {
  "use strict";

  const I18N = window.STILL_I18N || {};
  const body = document.body;
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ----------------------------------------------------------
     Language
     ---------------------------------------------------------- */

  const SUPPORTED = ["en", "zh"];

  let lang = localStorage.getItem("still.lang");
  if (!SUPPORTED.includes(lang)) {
    const nav = (navigator.language || "en").toLowerCase();
    lang = nav.startsWith("zh") ? "zh" : "en";
  }

  const t = (key) => {
    const v = I18N[lang] ? I18N[lang][key] : undefined;
    return v !== undefined ? v : I18N.en ? I18N.en[key] : "";
  };

  /* ----------------------------------------------------------
     Deterministic randomness
     ---------------------------------------------------------- */

  const hashString = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  const mulberry32 = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  /* ----------------------------------------------------------
     Elements
     ---------------------------------------------------------- */

  const el = {
    presence: document.getElementById("presence"),
    counter: document.getElementById("counter"),
    counterLabel: document.getElementById("counterLabel"),
    cardThree: document.getElementById("cardThree"),
    cardAfter: document.getElementById("cardAfter"),
    terms: document.getElementById("terms"),
    collapseLines: [...document.querySelectorAll(".cl")],
    collapseWrap: document.getElementById("collapseLines"),
    roomLines: [...document.querySelectorAll(".rl")],
    endLine: document.getElementById("endLine"),
    footCopy: document.getElementById("footCopy"),
    heroEyebrow: document.getElementById("heroEyebrow"),
    heroTitle: document.getElementById("heroTitle"),
    heroLede: document.getElementById("heroLede"),
    heroCta: document.getElementById("heroCta"),
    heroFine: document.getElementById("heroFine"),
    navCta: document.getElementById("navCta"),
    accessCta: document.getElementById("accessCta"),
    langBtn: document.getElementById("langBtn"),
    idleLine: document.getElementById("idleLine"),
    soundToggle: document.getElementById("soundToggle"),
    soundLabel: document.getElementById("soundLabel"),
  };

  const acts = [...document.querySelectorAll(".act")];
  const collapseSection = document.querySelector(".act-collapse");
  const roomSection = document.querySelector(".act-room");
  const endSection = document.querySelector(".act-end");

  const SEEN_KEY = "still.returned";
  const returned = sessionStorage.getItem(SEEN_KEY) === "1";

  /* ----------------------------------------------------------
     Scroll state
     ---------------------------------------------------------- */

  let progress = 0;
  let stage = 0;
  let maxStage = 0;
  let totalScrolled = 0;
  let lastY = window.scrollY;
  let ticking = false;
  let titleLocked = false;
  let endPhase = 0;

  const pageHeight = () => document.documentElement.scrollHeight - window.innerHeight;

  /* ----------------------------------------------------------
     Copy that depends on state
     ---------------------------------------------------------- */

  function applyReturned() {
    el.heroEyebrow.textContent = t("ret.eyebrow");
    el.heroTitle.textContent = t("ret.title");
    el.heroLede.textContent = t("ret.lede");
    el.heroCta.textContent = t("ret.cta");
    el.heroFine.textContent = t("ret.fine");
    el.navCta.textContent = t("ret.cta");
    el.accessCta.textContent = t("ret.accessCta");
  }

  function applyCopy() {
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.dataset.i18n;
      if (key.startsWith("num.labels")) return;
      const v = t(key);
      if (v === undefined || v === null || v === "") return;
      if (node.hasAttribute("data-html")) node.innerHTML = v;
      else node.textContent = v;
    });
  }

  function refreshDynamic() {
    const labels = t("num.labels");
    if (Array.isArray(labels)) {
      el.counterLabel.textContent = labels[stage] || labels[labels.length - 1];
    }

    if (el.terms.classList.contains("bad")) {
      el.terms.textContent = t("access.termsBad");
    }

    if (returned) applyReturned();

    el.endLine.textContent = endPhase >= 1 ? t("end.still") : t("end.stop");

    if (progress > 0.93) el.footCopy.textContent = t("foot.copyEnd");

    document.title = titleLocked ? t("title.still") : t("title.base");
  }

  /* ----------------------------------------------------------
     The point that is always there
     ---------------------------------------------------------- */

  const PRESENCE_KEYS = [
    [0.0, 66, 33, 2.0, 0.4, 0],
    [0.3, 65, 35, 3.0, 0.4, 0],
    [0.5, 62, 39, 5.0, 0.38, 0.2],
    [0.66, 58, 44, 8.0, 0.34, 0.6],
    [0.8, 54, 48, 12.5, 0.3, 1.2],
    [0.9, 51, 50, 9.0, 0.22, 1.6],
    [0.97, 50, 50, 3.0, 0.55, 0.3],
    [1.0, 50, 50, 2.4, 0.88, 0],
  ];

  function renderPresence(p) {
    let i = 0;
    while (i < PRESENCE_KEYS.length - 2 && p > PRESENCE_KEYS[i + 1][0]) i++;
    const a = PRESENCE_KEYS[i];
    const b = PRESENCE_KEYS[i + 1];
    const span = b[0] - a[0] || 1;
    const k = clamp((p - a[0]) / span);

    const s = el.presence.style;
    s.setProperty("--px", lerp(a[1], b[1], k) + "%");
    s.setProperty("--py", lerp(a[2], b[2], k) + "%");
    s.setProperty("--ps", lerp(a[3], b[3], k).toFixed(2) + "px");
    s.setProperty("--po", lerp(a[4], b[4], k).toFixed(3));
    s.setProperty("--pb", lerp(a[5], b[5], k).toFixed(2) + "px");
  }

  /* ----------------------------------------------------------
     Counter
     ---------------------------------------------------------- */

  const BASE_COUNT = 14002113;
  let shownCount = BASE_COUNT;
  let targetCount = BASE_COUNT;

  function renderCounter() {
    targetCount = BASE_COUNT + Math.floor(totalScrolled * 0.72);
    shownCount = Math.round(lerp(shownCount, targetCount, 0.22));
    el.counter.textContent = shownCount.toLocaleString("en-US");
  }

  /* ----------------------------------------------------------
     Text corruption
     ---------------------------------------------------------- */

  const CONFUSABLES = {
    a: "а", e: "е", o: "о", i: "і", c: "с", p: "р",
    x: "х", y: "у", s: "ѕ", j: "ј",
    A: "А", E: "Е", O: "О", C: "С", P: "Р",
    X: "Х", S: "Ѕ", Y: "У",
  };

  const STAGE_PROBABILITY = [0, 0, 0, 0.01, 0.028, 0.052, 0.068, 0.068];

  const SKIP = "#counter, .rl, .brand, .btn, .foot, .nav, #endLine, .idle-line, .sound-toggle";

  let originalText = new WeakMap();
  let textNodes = [];

  function collectTextNodes() {
    const nodes = [];
    const walker = document.createTreeWalker(
      document.querySelector("main"),
      NodeFilter.SHOW_TEXT
    );
    let n;
    while ((n = walker.nextNode())) {
      const parent = n.parentElement;
      if (!parent) continue;
      if (parent.closest(SKIP)) continue;
      if (!n.nodeValue.trim()) continue;
      nodes.push(n);
    }
    return nodes;
  }

  function rebuildTextNodes() {
    originalText = new WeakMap();
    textNodes = collectTextNodes();
  }

  function corruptText(level) {
    const prob = STAGE_PROBABILITY[level];
    if (prob <= 0) return;

    for (const node of textNodes) {
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const original = originalText.get(node);

      const rand = mulberry32(hashString(original) ^ (level * 2654435761));
      let out = "";
      let changed = false;

      for (const ch of original) {
        if (CONFUSABLES[ch] && rand() < prob) {
          out += CONFUSABLES[ch];
          changed = true;
        } else {
          out += ch;
        }
      }

      if (changed) node.nodeValue = out;
    }
  }

  /* ----------------------------------------------------------
     Stage
     ---------------------------------------------------------- */

  function setStage(next) {
    if (next === stage) return;
    stage = next;

    for (let i = 0; i < 8; i++) body.classList.toggle("is-stage-" + i, i === stage);

    if (stage >= 6 && !titleLocked) {
      titleLocked = true;
      document.title = t("title.still");
    }

    const labels = t("num.labels");
    if (Array.isArray(labels)) {
      el.counterLabel.textContent = labels[stage] || labels[labels.length - 1];
    }

    if (stage >= 5 && !el.terms.classList.contains("bad")) {
      el.terms.classList.add("bad");
      el.terms.textContent = t("access.termsBad");
    }

    if (stage > maxStage) {
      maxStage = stage;
      corruptText(maxStage);
    }
  }

  /* ----------------------------------------------------------
     Act 1 — the line that arrives a beat too late
     ---------------------------------------------------------- */

  const cardObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setTimeout(() => el.cardAfter.classList.add("on"), 900);
          cardObserver.disconnect();
        }
      }
    },
    { threshold: 0.6 }
  );
  cardObserver.observe(el.cardThree);

  /* ----------------------------------------------------------
     Act 5
     ---------------------------------------------------------- */

  const COLLAPSE_AT = [0.04, 0.26, 0.5, 0.74];

  function renderCollapse() {
    const r = collapseSection.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    const p = clamp(-r.top / span);

    // once a sentence is up it stays up. nothing here can be un-read.
    el.collapseLines.forEach((line, i) => {
      if (p >= COLLAPSE_AT[i]) line.classList.add("on");
    });

    if (el.collapseWrap) {
      const drift = (p - 0.5) * 11;
      const skew = (p - 0.5) * -1.1;
      el.collapseWrap.style.transform =
        `translateX(${drift.toFixed(2)}px) skewX(${skew.toFixed(2)}deg)`;
    }
  }

  /* ----------------------------------------------------------
     Act 6 — the terminal
     ---------------------------------------------------------- */

  let typing = false;
  let typedOnce = false;
  let typeVersion = 0;

  function roomScript() {
    const digits = lang === "zh" ? "zh-CN" : "en-US";
    const scrolled = Math.round(totalScrolled).toLocaleString(digits);
    const claimed = (Math.round((document.documentElement.scrollHeight * 0.4) / 100) * 100)
      .toLocaleString(digits);
    return [
      t("room.t1").replace("{n}", scrolled),
      t("room.t2").replace("{m}", claimed),
      t("room.t3"),
    ];
  }

  function resetRoom() {
    typeVersion++;
    typing = false;
    typedOnce = false;
    el.roomLines.forEach((l) => (l.textContent = ""));
  }

  async function typeAll() {
    if (typing || typedOnce) return;
    typing = true;
    typedOnce = true;

    const mine = typeVersion;
    const script = roomScript();

    for (let i = 0; i < el.roomLines.length; i++) {
      if (mine !== typeVersion) { typing = false; return; }
      const line = el.roomLines[i];
      const full = script[i] || "";
      line.textContent = "";

      if (reduceMotion) {
        line.textContent = full;
        await sleep(400);
        continue;
      }

      for (const ch of full) {
        if (mine !== typeVersion) { typing = false; return; }
        line.textContent += ch;
        await sleep(30 + Math.random() * 48);
      }
      await sleep(900);
    }

    typing = false;
  }

  function renderRoom() {
    const r = roomSection.getBoundingClientRect();
    if (-r.top > 40) typeAll();

    if (r.top > window.innerHeight * 0.9 && !typing) {
      resetRoom();
    }
  }

  /* ----------------------------------------------------------
     Act 7
     ---------------------------------------------------------- */

  function renderEnd() {
    const r = endSection.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    const p = clamp(-r.top / span);

    if (endPhase === 0 && p > 0.34) {
      endPhase = 1;
      el.endLine.classList.add("fade");
      setTimeout(() => {
        el.endLine.textContent = t("end.still");
        el.endLine.classList.remove("fade");
      }, 1000);
    }

    if (endPhase === 1 && p > 0.72) {
      endPhase = 2;
      el.endLine.classList.add("fade");
    }
  }

  /* ----------------------------------------------------------
     It notices when you stop
     ---------------------------------------------------------- */

  let lastInput = Date.now();
  let idleShown = 0;
  let idleOn = false;
  let idleHide = null;

  function hideIdle() {
    el.idleLine.classList.remove("on");
    idleOn = false;
  }

  function noteInput() {
    lastInput = Date.now();
    if (idleOn) hideIdle();
  }

  function showIdle() {
    idleOn = true;
    idleShown++;
    el.idleLine.textContent = t("idle." + Math.min(idleShown, 4));
    el.idleLine.classList.add("on");
    clearTimeout(idleHide);
    idleHide = setTimeout(hideIdle, 5200);
  }

  setInterval(() => {
    if (stage < 3 || stage > 5) return;
    if (idleOn) return;
    if (Date.now() - lastInput < 25000) return;
    showIdle();
  }, 800);

  ["mousemove", "mousedown", "wheel", "keydown", "touchstart", "touchmove"].forEach((ev) =>
    window.addEventListener(ev, noteInput, { passive: true })
  );

  /* ----------------------------------------------------------
     Sound — synthesised, nothing to download
     ---------------------------------------------------------- */

  let audio = null;
  let beatTimer = null;
  let soundOn = false;

  function startAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;

    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // two sines a few Hz apart, so the drone beats against itself
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 210;
    lp.Q.value = 0.7;

    const bed = ctx.createGain();
    bed.gain.value = 0.42;

    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.value = 54.5;

    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = 57.3;

    o1.connect(lp);
    o2.connect(lp);
    lp.connect(bed);
    bed.connect(master);
    o1.start();
    o2.start();

    // air
    const len = Math.floor(ctx.sampleRate * 4);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.35;

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 820;
    bp.Q.value = 0.55;

    const ng = ctx.createGain();
    ng.gain.value = 0.018;

    noise.connect(bp);
    bp.connect(ng);
    ng.connect(master);
    noise.start();

    return { ctx, master };
  }

  function thump() {
    if (!audio) return;
    const { ctx, master } = audio;
    const now = ctx.currentTime;

    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "sine";
    o.frequency.setValueAtTime(82, now);
    o.frequency.exponentialRampToValueAtTime(36, now + 0.2);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.6, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    o.connect(g);
    g.connect(master);
    o.start(now);
    o.stop(now + 0.4);
  }

  function beatLoop() {
    if (!audio) return;
    thump();
    const gap = lerp(1550, 700, clamp(progress * 1.15));
    beatTimer = setTimeout(beatLoop, gap);
  }

  function updateAudioLevel() {
    if (!audio) return;
    const target = progress < 0.22 ? 0 : Math.min(0.045 + (progress - 0.22) * 0.135, 0.125);
    audio.master.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.7);
  }

  function enableSound() {
    if (soundOn) return;
    audio = audio || startAudio();
    if (!audio) return;

    // never block the UI on resume() — some environments leave it pending
    if (audio.ctx.state === "suspended") {
      audio.ctx.resume().catch(() => {});
    }

    soundOn = true;
    updateAudioLevel();
    if (!beatTimer) beatLoop();

    el.soundToggle.classList.add("live");
    el.soundLabel.textContent = t("sound.on");

    setTimeout(() => el.soundToggle.classList.add("gone"), 1600);
  }

  el.soundToggle.addEventListener("click", enableSound);

  /* ----------------------------------------------------------
     Frame
     ---------------------------------------------------------- */

  function frame() {
    const y = window.scrollY;
    totalScrolled += Math.abs(y - lastY);
    lastY = y;

    progress = clamp(y / Math.max(pageHeight(), 1));
    root.style.setProperty("--p", progress.toFixed(4));

    renderPresence(progress);
    renderCounter();
    updateAudioLevel();

    const mid = y + window.innerHeight * 0.45;
    let next = 0;
    for (const a of acts) {
      if (mid >= a.offsetTop && mid < a.offsetTop + a.offsetHeight) {
        next = Number(a.dataset.stage) || 0;
        break;
      }
    }
    setStage(next);

    renderCollapse();
    renderRoom();
    renderEnd();

    if (progress > 0.86) sessionStorage.setItem(SEEN_KEY, "1");
    if (progress > 0.93) el.footCopy.textContent = t("foot.copyEnd");

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener("scroll", () => { noteInput(); onScroll(); }, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  setInterval(() => {
    const next = Math.round(lerp(shownCount, targetCount, 0.18));
    if (next !== shownCount) {
      shownCount = next;
      el.counter.textContent = shownCount.toLocaleString("en-US");
    }
  }, 90);

  /* ----------------------------------------------------------
     Language switching
     ---------------------------------------------------------- */

  function setLang(next) {
    lang = SUPPORTED.includes(next) ? next : "en";
    localStorage.setItem("still.lang", lang);

    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    body.dataset.lang = lang;
    el.langBtn.textContent = lang === "zh" ? "EN" : "中";

    applyCopy();
    rebuildTextNodes();
    if (maxStage > 0) corruptText(maxStage);

    resetRoom();
    refreshDynamic();

    // the terminal line counts pixels; rebuild it if we are standing there
    if (stage >= 6) requestAnimationFrame(renderRoom);
  }

  el.langBtn.addEventListener("click", () => {
    setLang(lang === "zh" ? "en" : "zh");
    noteInput();
  });

  /* ----------------------------------------------------------
     Boot
     ---------------------------------------------------------- */

  if (reduceMotion) {
    const g = document.querySelector(".grain");
    if (g) g.style.animation = "none";
  }

  setLang(lang);

  if (!returned) window.scrollTo(0, 0);

  frame();
  window.addEventListener("load", frame);
})();
