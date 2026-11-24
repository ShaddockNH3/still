/* ============================================================
   STILL
   The page counts what you do to it.
   ============================================================ */

(() => {
  "use strict";

  const body = document.body;
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ----------------------------------------------------------
     Deterministic randomness.
     Corruption must look the same if you scroll back to it.
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
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* ----------------------------------------------------------
     Elements
     ---------------------------------------------------------- */

  const el = {
    presence: document.getElementById("presence"),
    counter: document.getElementById("counter"),
    counterLabel: document.getElementById("counterLabel"),
    numbersAside: document.getElementById("numbersAside"),
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
  };

  const acts = [...document.querySelectorAll(".act")];
  const collapseSection = document.querySelector(".act-collapse");
  const roomSection = document.querySelector(".act-room");
  const endSection = document.querySelector(".act-end");

  const SEEN_KEY = "still.returned";

  /* ----------------------------------------------------------
     The visitor has been here before
     ---------------------------------------------------------- */

  const returned = sessionStorage.getItem(SEEN_KEY) === "1";

  if (returned) {
    el.heroEyebrow.textContent = "Practice № 002";
    el.heroTitle.textContent = "You came back.";
    el.heroLede.textContent = "It doesn't work like that. Nothing here begins.";
    el.heroCta.textContent = "Continue";
    el.heroFine.textContent = "You still have nothing to lose.";
    el.navCta.textContent = "Continue";
    el.accessCta.textContent = "You already have access";
  }

  /* ----------------------------------------------------------
     Scroll state
     ---------------------------------------------------------- */

  let progress = 0;
  let stage = 0;
  let maxStage = 0;
  let totalScrolled = 0;
  let lastY = window.scrollY;
  let ticking = false;

  const pageHeight = () =>
    document.documentElement.scrollHeight - window.innerHeight;

  /* ----------------------------------------------------------
     The point that is always there
     ---------------------------------------------------------- */

  // [progress, x%, y%, size px, opacity, blur px]
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
    const t = clamp((p - a[0]) / span);

    const s = el.presence.style;
    s.setProperty("--px", lerp(a[1], b[1], t) + "%");
    s.setProperty("--py", lerp(a[2], b[2], t) + "%");
    s.setProperty("--ps", lerp(a[3], b[3], t).toFixed(2) + "px");
    s.setProperty("--po", lerp(a[4], b[4], t).toFixed(3));
    s.setProperty("--pb", lerp(a[5], b[5], t).toFixed(2) + "px");
  }

  /* ----------------------------------------------------------
     Counter — it grows while you scroll, because you are scrolling
     ---------------------------------------------------------- */

  const BASE_COUNT = 14002113;
  let shownCount = BASE_COUNT;
  let targetCount = BASE_COUNT;

  const LABELS = [
    "minutes held, all time",
    "minutes held, all time",
    "and counting",
    "and counting",
    "these are not minutes",
    "these were never minutes",
    "each one is a scroll",
    "each one is yours",
  ];

  function renderCounter() {
    targetCount = BASE_COUNT + Math.floor(totalScrolled * 0.72);
    shownCount = Math.round(lerp(shownCount, targetCount, 0.22));
    el.counter.textContent = shownCount.toLocaleString("en-US");
  }

  /* ----------------------------------------------------------
     Text corruption
     Latin letters swapped for Cyrillic twins.
     The word still reads. It just stops being the same word.
     ---------------------------------------------------------- */

  const CONFUSABLES = {
    a: "а", e: "е", o: "о", i: "і", c: "с", p: "р",
    x: "х", y: "у", s: "ѕ", j: "ј",
    A: "А", E: "Е", O: "О", C: "С", P: "Р",
    X: "Х", S: "Ѕ", Y: "У",
  };

  const STAGE_PROBABILITY = [0, 0, 0, 0.01, 0.028, 0.052, 0.068, 0.068];

  const originalText = new WeakMap();

  const SKIP_PARENTS = new Set([
    "SCRIPT", "STYLE", "CODE", "PRE",
  ]);

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
      if (SKIP_PARENTS.has(parent.tagName)) continue;
      if (parent.closest("#counter, .rl, .brand, .btn, .foot, .nav, #endLine")) continue;
      if (!n.nodeValue.trim()) continue;
      nodes.push(n);
    }
    return nodes;
  }

  const textNodes = collectTextNodes();

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
     Stage switching
     ---------------------------------------------------------- */

  function setStage(next) {
    if (next === stage) return;
    stage = next;

    for (let i = 0; i < 8; i++) body.classList.toggle("is-stage-" + i, i === stage);

    // once you are past the grey, the tab stops pretending
    if (stage >= 6 && !document.title.startsWith("still")) {
      document.title = "still here";
    }

    el.counterLabel.textContent = LABELS[stage] || LABELS[LABELS.length - 1];

    if (stage >= 5 && !el.terms.classList.contains("bad")) {
      el.terms.classList.add("bad");
      el.terms.textContent =
        "By continuing to scroll you accept something else. There is no account to cancel, " +
        "because no account was ever created. There is no way to un-read this page. " +
        "There is only this page, and you are still on it.";
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
     Act 5 — the sentences arrive one at a time
     ---------------------------------------------------------- */

  const COLLAPSE_AT = [0.04, 0.26, 0.5, 0.74];

  function renderCollapse() {
    const r = collapseSection.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    const p = clamp(-r.top / span);

    el.collapseLines.forEach((line, i) => {
      if (p >= COLLAPSE_AT[i]) line.classList.add("on");
      else if (p < COLLAPSE_AT[i] - 0.14) line.classList.remove("on");
    });

    // the block drifts while you scroll — nothing here sits still
    if (el.collapseWrap) {
      const drift = (p - 0.5) * 11;
      const skew = (p - 0.5) * -1.1;
      el.collapseWrap.style.transform =
        `translateX(${drift.toFixed(2)}px) skewX(${skew.toFixed(2)}deg)`;
    }
  }

  /* ----------------------------------------------------------
     Act 6 — typing. Slow on purpose.
     ---------------------------------------------------------- */

  let typing = false;
  let typedOnce = false;

  // The page lies about its own length. You will have scrolled further.
  function roomScript() {
    const scrolled = Math.round(totalScrolled);
    const claimed = Math.round((document.documentElement.scrollHeight * 0.4) / 100) * 100;
    return [
      `You scrolled ${scrolled.toLocaleString("en-US")} pixels.`,
      `This page is ${claimed.toLocaleString("en-US")} pixels long.`,
      "Whatever you are standing in is not the page.",
    ];
  }

  async function typeAll() {
    if (typing || typedOnce) return;
    typing = true;
    typedOnce = true;

    const script = roomScript();

    for (let i = 0; i < el.roomLines.length; i++) {
      const line = el.roomLines[i];
      const full = script[i] || "";
      line.textContent = "";

      if (reduceMotion) {
        line.textContent = full;
        await sleep(400);
        continue;
      }

      for (const ch of full) {
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

    // scrolled back above the room: let it play again on the next pass
    if (r.top > window.innerHeight * 0.9 && !typing) {
      typedOnce = false;
      el.roomLines.forEach((l) => (l.textContent = ""));
    }
  }

  /* ----------------------------------------------------------
     Act 7 — the last two sentences
     ---------------------------------------------------------- */

  let endPhase = 0;

  function renderEnd() {
    const r = endSection.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    const p = clamp(-r.top / span);

    if (endPhase === 0 && p > 0.34) {
      endPhase = 1;
      el.endLine.classList.add("fade");
      setTimeout(() => {
        el.endLine.textContent = "Still here.";
        el.endLine.classList.remove("fade");
      }, 1000);
    }

    if (endPhase === 1 && p > 0.72) {
      endPhase = 2;
      el.endLine.classList.add("fade");
    }
  }

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

    // which act is in the middle of the screen
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

    if (progress > 0.93) el.footCopy.innerHTML = "&copy; you";

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  // counter keeps easing toward its target even when scrolling stops
  setInterval(() => {
    const next = Math.round(lerp(shownCount, targetCount, 0.18));
    if (next !== shownCount) {
      shownCount = next;
      el.counter.textContent = shownCount.toLocaleString("en-US");
    }
  }, 90);

  /* ----------------------------------------------------------
     Boot
     ---------------------------------------------------------- */

  if (reduceMotion) {
    document.querySelector(".grain").style.animation = "none";
  }

  if (!returned) {
    window.scrollTo(0, 0);
  }

  frame();

  // after everything settles, measure once more
  window.addEventListener("load", frame);


})();
