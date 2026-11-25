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
  const bootTime = new Date();

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad2 = (n) => String(n).padStart(2, "0");
  const fmtHHMM = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  const NUM_FMT = {
    en: new Intl.NumberFormat("en-US"),
    zh: new Intl.NumberFormat("zh-CN"),
  };

  const STAGE_PAPERS = [
    "#f7f6f2",
    "#f5f3ee",
    "#f1eee7",
    "#ebe7de",
    "#dcd7cc",
    "#bdb7aa",
    "#1c1b19",
    "#050506",
  ];

  const DARK_FAVICON =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23050506'/%3E%3Ccircle cx='16' cy='16' r='3.2' fill='%23cfc9bd'/%3E%3C/svg%3E";

  /* ----------------------------------------------------------
     Language
     ---------------------------------------------------------- */

  const SUPPORTED = ["en", "zh"];

  let lang = null;
  try {
    lang = localStorage.getItem("still.lang");
  } catch (_) {
    /* ignore storage restrictions */
  }
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
     Elements & session state
     ---------------------------------------------------------- */

  const el = {
    presence: document.getElementById("presence"),
    counter: document.getElementById("counter"),
    counterLabel: document.getElementById("counterLabel"),
    cardThree: document.getElementById("cardThree"),
    cardAfter: document.getElementById("cardAfter"),
    c1t: document.querySelector('[data-i18n="method.c1t"]'),
    c1b: document.querySelector('[data-i18n="method.c1b"]'),
    c2t: document.querySelector('[data-i18n="method.c2t"]'),
    c2b: document.querySelector('[data-i18n="method.c2b"]'),
    c3t: document.querySelector('[data-i18n="method.c3t"]'),
    c3b: document.querySelector('[data-i18n="method.c3b"]'),
    q3: document.querySelector('[data-i18n="voices.q3"]'),
    q3c: document.querySelector('[data-i18n="voices.q3c"]'),
    q4c: document.querySelector('[data-i18n="voices.q4c"]'),
    terms: document.getElementById("terms"),
    collapseLines: [...document.querySelectorAll(".cl")],
    collapseWrap: document.getElementById("collapseLines"),
    roomLines: [...document.querySelectorAll(".rl")],
    endLine: document.getElementById("endLine"),
    mirrorHint: document.getElementById("mirrorHint"),
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
    jump: document.getElementById("jump"),
    themeColor: document.getElementById("themeColor"),
    favicon: document.getElementById("favicon"),
  };

  const acts = [...document.querySelectorAll(".act")];
  const accessSection = document.querySelector(".act-access");
  const collapseSection = document.querySelector(".act-collapse");
  const roomSection = document.querySelector(".act-room");
  const endSection = document.querySelector(".act-end");

  const SEEN_KEY = "still.returned";
  const FACE_KEY = "still.seen";

  const readSession = (key) => {
    try {
      return sessionStorage.getItem(key) === "1";
    } catch (_) {
      return false;
    }
  };

  const writeSession = (key, val) => {
    try {
      sessionStorage.setItem(key, val);
    } catch (_) {
      /* ignore */
    }
  };

  let returned = readSession(SEEN_KEY);
  let seenFace = readSession(FACE_KEY);

  /* ----------------------------------------------------------
     Scroll & non-euclidean scrollbar state
     ---------------------------------------------------------- */

  let progress = 0;
  let stage = 0;
  let maxStage = 0;
  let totalScrolled = 0;
  let lastY = window.scrollY;
  let ticking = false;
  let titleLocked = false;
  let cardsMutated = false;
  let endPhase = 0;
  let jumped = false;
  let jumpArmed = false;

  // Progressive abyss unlocking: scrollbar reaches ~90% at Act 4, then snaps backward 3 times
  let abyssLevel = 0;
  let fullScrollSpan = 1;
  let initialPagePixels = 4800;

  const rawPageSpan = () =>
    Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);

  function measureMetrics() {
    const wasLocked = body.classList.contains("abyss-locked");
    if (wasLocked) body.classList.remove("abyss-locked");
    fullScrollSpan = rawPageSpan();
    if (wasLocked) body.classList.add("abyss-locked");

    if (abyssLevel === 0 && body.classList.contains("abyss-locked")) {
      initialPagePixels = document.documentElement.scrollHeight;
    }
  }

  function unlockAbyss(level) {
    if (level <= abyssLevel) return;
    for (let lv = abyssLevel + 1; lv <= level; lv++) {
      body.classList.add("abyss-" + lv);
    }
    abyssLevel = level;
    if (abyssLevel >= 3) {
      body.classList.remove("abyss-locked");
      fullScrollSpan = rawPageSpan();
    }
  }

  /* ----------------------------------------------------------
     Environment-aware surveillance & stateful copy
     ---------------------------------------------------------- */

  function applyVoicesContext() {
    if (!el.q3 || !el.q3c || !el.q4c) return;

    const isMobile =
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 768;
    const hour = bootTime.getHours();
    const isNight = hour >= 20 || hour < 5;

    const q3Key = isNight
      ? isMobile
        ? "voices.q3_night_mobile"
        : "voices.q3_night_desktop"
      : isMobile
        ? "voices.q3_day_mobile"
        : "voices.q3_day_desktop";

    const twoMinAgo = new Date(bootTime.getTime() - 2 * 60 * 1000);
    const justNow = new Date(bootTime.getTime() - 40 * 1000);

    el.q3.textContent = t(q3Key) || t("voices.q3");
    el.q3c.textContent = t("voices.timeAgo2").replace("{t}", fmtHHMM(twoMinAgo));
    el.q4c.textContent = t("voices.timeJustNow").replace("{t}", fmtHHMM(justNow));
  }

  function applyMutatedCards() {
    if (!cardsMutated) return;
    if (el.c1t) el.c1t.textContent = t("method.bad1t");
    if (el.c1b) el.c1b.textContent = t("method.bad1b");
    if (el.c2t) el.c2t.textContent = t("method.bad2t");
    if (el.c2b) el.c2b.textContent = t("method.bad2b");
    if (el.c3t) el.c3t.textContent = t("method.bad3t");
    if (el.c3b) el.c3b.textContent = t("method.bad3b");
    if (el.cardAfter) {
      el.cardAfter.textContent = t("method.bad3after");
      el.cardAfter.classList.add("on");
    }
  }

  function applyReturned() {
    el.heroEyebrow.textContent = t("ret.eyebrow");
    if (seenFace) {
      el.heroTitle.textContent = t("seen.title");
      el.heroLede.textContent = t("seen.lede");
    } else {
      el.heroTitle.textContent = t("ret.title");
      el.heroLede.textContent = t("ret.lede");
    }
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
    applyVoicesContext();
    applyMutatedCards();

    const labels = t("num.labels");
    if (Array.isArray(labels)) {
      el.counterLabel.textContent = labels[stage] || labels[labels.length - 1];
    }

    if (el.terms.classList.contains("bad")) {
      el.terms.textContent = t("access.termsBad");
    }

    if (returned || seenFace) applyReturned();

    el.endLine.textContent = jumped
      ? t("face.after")
      : endPhase >= 1
        ? t("end.still")
        : t("end.stop");

    if (el.mirrorHint) el.mirrorHint.textContent = t("end.mirror");

    if (progress > 0.93) el.footCopy.textContent = t("foot.copyEnd");

    el.soundLabel.textContent = soundOn ? t("sound.on") : t("sound.label");
    if (!document.hidden) {
      document.title = titleLocked ? t("title.still") : t("title.base");
    }
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
     Counter — only runs an animation loop while catching up
     ---------------------------------------------------------- */

  const BASE_COUNT = 14002113;
  let shownCount = BASE_COUNT;
  let targetCount = BASE_COUNT;
  let counterRaf = 0;

  function stepCounter() {
    counterRaf = 0;
    const diff = targetCount - shownCount;
    if (diff === 0) return;

    const delta = Math.sign(diff) * Math.max(1, Math.round(Math.abs(diff) * 0.2));
    shownCount += delta;
    el.counter.textContent = NUM_FMT.en.format(shownCount);

    if (shownCount !== targetCount) {
      counterRaf = requestAnimationFrame(stepCounter);
    }
  }

  function updateCounterTarget() {
    const nextTarget = BASE_COUNT + Math.floor(totalScrolled * 0.72);
    if (nextTarget !== targetCount) {
      targetCount = nextTarget;
      if (!counterRaf) counterRaf = requestAnimationFrame(stepCounter);
    }
  }

  /* ----------------------------------------------------------
     Text corruption (Latin homoglyphs + CJK visual near-twins)
     ---------------------------------------------------------- */

  const LATIN_CONFUSABLES = {
    a: "а", e: "е", o: "о", i: "і", c: "с", p: "р",
    x: "х", y: "у", s: "ѕ", j: "ј",
    A: "А", E: "Е", O: "О", C: "С", P: "Р",
    X: "Х", S: "Ѕ", Y: "У",
  };

  // Subtle stroke-level uncanny valley in Chinese (e.g. 人→入, 自/日→目, 话→活, 睡→瞳)
  const CJK_CONFUSABLES = {
    人: "入", 己: "已", 已: "巳", 自: "目", 日: "目",
    白: "百", 天: "夭", 大: "太", 话: "活", 睡: "瞳",
    眼: "眠", 住: "往", 停: "佇", 心: "必", 未: "末", 免: "兔",
  };

  const STAGE_PROBABILITY = [0, 0, 0, 0.01, 0.028, 0.052, 0.068, 0.068];

  const SKIP =
    "#counter, .rl, .brand, .btn, .foot, .nav, #endLine, #mirrorHint, .idle-line, .sound-toggle";

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
      if (!parent || parent.closest(SKIP)) continue;
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
    const baseProb = STAGE_PROBABILITY[level] || 0;
    if (baseProb <= 0) return;

    const isZh = lang === "zh";
    const map = isZh ? CJK_CONFUSABLES : LATIN_CONFUSABLES;
    const prob = isZh ? Math.min(baseProb * 2.1, 0.15) : baseProb;

    for (const node of textNodes) {
      if (!node.isConnected) continue;
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const original = originalText.get(node);

      const rand = mulberry32(hashString(original) ^ (level * 2654435761));
      let out = "";
      let changed = false;

      for (const ch of original) {
        if (map[ch] && rand() < prob) {
          out += map[ch];
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

    if (el.themeColor && STAGE_PAPERS[stage]) {
      el.themeColor.setAttribute("content", STAGE_PAPERS[stage]);
    }

    if (stage >= 6 && !titleLocked) {
      titleLocked = true;
      if (!document.hidden) document.title = t("title.still");
      if (el.favicon) el.favicon.href = DARK_FAVICON;
    }

    const labels = t("num.labels");
    if (Array.isArray(labels)) {
      el.counterLabel.textContent = labels[stage] || labels[labels.length - 1];
    }

    let domRewritten = false;

    if (stage >= 5 && !el.terms.classList.contains("bad")) {
      el.terms.classList.add("bad");
      el.terms.textContent = t("access.termsBad");
      domRewritten = true;
    }

    // Once you sink into stage 5+, the three calm method cards at the top mutate behind you
    if (stage >= 5 && !cardsMutated) {
      cardsMutated = true;
      applyMutatedCards();
      domRewritten = true;
    }

    if (domRewritten) {
      rebuildTextNodes();
    }

    if (stage > maxStage) {
      maxStage = stage;
      corruptText(maxStage);
    } else if (domRewritten && maxStage > 0) {
      corruptText(maxStage);
    }

    scheduleIdleCheck();
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
     Upward scroll resistance: easy to sink, heavy to climb out
     ---------------------------------------------------------- */

  window.addEventListener(
    "wheel",
    (e) => {
      if (e.deltaY < 0 && stage >= 5 && stage <= 6 && !jumped && !e.ctrlKey) {
        e.preventDefault();
        window.scrollBy(0, e.deltaY * 0.36);
      }
    },
    { passive: false }
  );

  // Ensure clicking "#room" CTA unlocks the abyss before anchor navigation
  if (el.accessCta) {
    el.accessCta.addEventListener("click", () => {
      unlockAbyss(2);
    });
  }

  /* ----------------------------------------------------------
     Act 5
     ---------------------------------------------------------- */

  const COLLAPSE_AT = [0.04, 0.26, 0.5, 0.74];

  function renderCollapse() {
    if (abyssLevel < 1) return;
    const r = collapseSection.getBoundingClientRect();
    const span = Math.max(r.height - window.innerHeight, 1);
    const p = clamp(-r.top / span);

    if (p > 0.52 && abyssLevel < 2) unlockAbyss(2);

    // once a sentence is up it stays up. nothing here can be un-read.
    el.collapseLines.forEach((line, i) => {
      if (p >= COLLAPSE_AT[i]) line.classList.add("on");
    });

    if (el.collapseWrap && !reduceMotion) {
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
    const fmt = NUM_FMT[lang] || NUM_FMT.en;
    const rawClaimed = Math.max(
      2800,
      Math.round(initialPagePixels / 100) * 100
    );
    const observed = Math.max(Math.round(totalScrolled), Math.round(window.scrollY));
    const claimedNum =
      observed > rawClaimed + 800
        ? rawClaimed
        : Math.max(1200, Math.floor((observed * 0.52) / 100) * 100);
    const scrolledNum = Math.max(observed, claimedNum + 1604);

    return [
      t("room.t1").replace("{n}", fmt.format(scrolledNum)),
      t("room.t2").replace("{m}", fmt.format(claimedNum)),
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
      if (mine !== typeVersion) {
        typing = false;
        return;
      }
      const line = el.roomLines[i];
      const full = script[i] || "";
      line.textContent = "";

      if (reduceMotion) {
        line.textContent = full;
        await sleep(400);
        continue;
      }

      for (const ch of full) {
        if (mine !== typeVersion) {
          typing = false;
          return;
        }
        line.textContent += ch;
        await sleep(30 + Math.random() * 48);
      }
      await sleep(900);
    }

    typing = false;
  }

  function renderRoom() {
    if (abyssLevel < 2) return;
    const r = roomSection.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.65 && abyssLevel < 3) unlockAbyss(3);
    if (-r.top > 40) typeAll();

    if (r.top > window.innerHeight * 0.9 && !typing) {
      resetRoom();
    }
  }

  /* ----------------------------------------------------------
     Act 7 — black mirror lure -> jump
     ---------------------------------------------------------- */

  let mirrorTimer = null;

  function renderEnd() {
    if (abyssLevel < 3) return;
    const r = endSection.getBoundingClientRect();
    const span = Math.max(r.height - window.innerHeight, 1);
    const p = clamp(-r.top / span);

    if (endPhase === 0 && p > 0.3) {
      endPhase = 1;
      el.endLine.classList.add("fade");
      setTimeout(() => {
        if (!jumped && endPhase === 1) {
          el.endLine.textContent = t("end.still");
          el.endLine.classList.remove("fade");
        }
      }, 950);
    }

    if (endPhase === 1 && p > 0.66) {
      endPhase = 2;
      el.endLine.classList.add("fade");
      if (!jumped) {
        body.classList.add("is-mirror");
        clearTimeout(mirrorTimer);
        mirrorTimer = setTimeout(() => {
          if (!jumped && el.mirrorHint) el.mirrorHint.classList.add("on");
        }, 900);
      }
    }

    // Pure black glass + tiny dim text makes you lean closer to your reflection first
    if (!jumpArmed && !jumped && endPhase === 2 && p > 0.76) {
      jumpArmed = true;
      setTimeout(triggerJump, 3400);
    }
  }

  /* ----------------------------------------------------------
     Bottom whispers (idle detection, tab-switch catch, copy hijack)
     ---------------------------------------------------------- */

  const IDLE_WAIT_MS = 25000;
  let idleShown = 0;
  let idleOn = false;
  let idleTimer = null;
  let idleHide = null;

  function hideWhisper() {
    el.idleLine.classList.remove("on");
    idleOn = false;
  }

  function flashWhisper(text, duration = 5000) {
    if (!text || jumped) return;
    idleOn = true;
    el.idleLine.textContent = text;
    el.idleLine.classList.add("on");
    clearTimeout(idleHide);
    idleHide = setTimeout(() => {
      hideWhisper();
      scheduleIdleCheck();
    }, duration);
  }

  function showIdle() {
    if (stage < 3 || stage > 5 || idleOn || document.hidden) return;
    idleShown++;
    flashWhisper(t("idle." + Math.min(idleShown, 4)), 5200);
  }

  function scheduleIdleCheck() {
    clearTimeout(idleTimer);
    if (stage >= 3 && stage <= 5 && !idleOn && !document.hidden) {
      idleTimer = setTimeout(showIdle, IDLE_WAIT_MS);
    }
  }

  function noteInput() {
    if (idleOn) hideWhisper();
    scheduleIdleCheck();
  }

  ["mousemove", "mousedown", "wheel", "keydown", "touchstart", "touchmove"].forEach(
    (ev) => window.addEventListener(ev, noteInput, { passive: true })
  );

  /* ----------------------------------------------------------
     Tab visibility trap: notices when you switch tabs to escape
     ---------------------------------------------------------- */

  let tabLeftAt = 0;
  let tabAwayTimer = null;
  let tabAwayIdx = 0;
  let tabSwitchCount = 0;

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(idleTimer);
      if ((stage >= 4 || maxStage >= 4) && !jumped) {
        tabLeftAt = Date.now();
        tabAwayIdx = 0;
        const seq = t("tab.away");
        if (Array.isArray(seq) && seq.length) {
          document.title = seq[0];
          clearInterval(tabAwayTimer);
          tabAwayTimer = setInterval(() => {
            tabAwayIdx = (tabAwayIdx + 1) % seq.length;
            document.title = seq[tabAwayIdx];
          }, 2200);
        }
      }
    } else {
      clearInterval(tabAwayTimer);
      tabAwayTimer = null;
      document.title = titleLocked ? t("title.still") : t("title.base");

      if (tabLeftAt > 0 && !jumped) {
        const awayMs = Date.now() - tabLeftAt;
        tabLeftAt = 0;
        if (awayMs >= 1500) {
          tabSwitchCount++;
          if (abyssLevel < 1) unlockAbyss(1);
          const creep = Math.min(340, 140 + Math.round(awayMs * 0.025));
          window.scrollBy({ top: creep, behavior: "smooth" });
          setTimeout(() => {
            flashWhisper(
              t(tabSwitchCount === 1 ? "tab.back1" : "tab.back2"),
              5200
            );
          }, 450);
        }
      }
      scheduleIdleCheck();
    }
  });

  /* ----------------------------------------------------------
     Clipboard contamination: copying text passes it on
     ---------------------------------------------------------- */

  document.addEventListener("copy", (e) => {
    if (stage < 3 && maxStage < 4) return;
    const sel = window.getSelection ? window.getSelection().toString().trim() : "";
    if (!sel || !e.clipboardData) return;

    e.preventDefault();
    const cleanUrl = window.location.href.split("#")[0];
    const payload =
      stage >= 5 || maxStage >= 5
        ? t("copy.deep").replace("{url}", cleanUrl)
        : t("copy.mid").replace("{text}", sel);

    e.clipboardData.setData("text/plain", payload);
    flashWhisper(t("copy.notice"), 4800);
  });

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

  // Unlock AudioContext on first user gesture so late-stage audio isn't blocked by autoplay policy
  function unlockAudioOnce() {
    if (!audio) audio = startAudio();
    if (audio && audio.ctx.state === "suspended") {
      audio.ctx.resume().catch(() => {});
    }
  }

  ["pointerdown", "keydown"].forEach((ev) =>
    window.addEventListener(ev, unlockAudioOnce, { once: true, passive: true })
  );

  function thump() {
    if (!audio || !soundOn || jumped) return;
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
    if (!audio || !soundOn || jumped) {
      beatTimer = null;
      return;
    }
    thump();
    const gap = lerp(1550, 700, clamp(progress * 1.15));
    beatTimer = setTimeout(beatLoop, gap);
  }

  function updateAudioLevel() {
    if (!audio || !soundOn || jumped) return;
    const target =
      progress < 0.22 ? 0 : Math.min(0.045 + (progress - 0.22) * 0.135, 0.125);
    audio.master.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.7);
  }

  function enableSound() {
    if (soundOn) return;
    audio = audio || startAudio();
    if (!audio) return;

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
     The thing that has been behind you the whole time
     ---------------------------------------------------------- */

  function scream() {
    let ctx = audio ? audio.ctx : null;

    if (!ctx) {
      const made = startAudio();
      if (!made) return;
      audio = made;
      ctx = audio.ctx;
    }

    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const out = ctx.destination;

    const len = Math.floor(ctx.sampleRate * 1.4);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2500;
    bp.Q.value = 0.6;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 650;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.55, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.22, now + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

    src.connect(bp);
    bp.connect(hp);
    hp.connect(g);
    g.connect(out);
    src.start(now);
    src.stop(now + 1.2);

    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(150, now);
    o.frequency.exponentialRampToValueAtTime(24, now + 0.75);

    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, now);
    og.gain.exponentialRampToValueAtTime(0.85, now + 0.008);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

    o.connect(og);
    og.connect(out);
    o.start(now);
    o.stop(now + 1);
  }

  function triggerJump() {
    if (jumped) return;
    if (document.hidden) {
      setTimeout(triggerJump, 1200);
      return;
    }

    jumped = true;
    seenFace = true;
    writeSession(FACE_KEY, "1");

    clearTimeout(beatTimer);
    clearTimeout(mirrorTimer);
    beatTimer = null;

    if (el.mirrorHint) el.mirrorHint.classList.remove("on");

    // everything goes quiet for one beat first. that is the part that works.
    if (audio) {
      audio.master.gain.cancelScheduledValues(audio.ctx.currentTime);
      audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.06);
    }

    setTimeout(() => {
      if (!el.jump) return;
      el.jump.classList.add("on");
      scream();

      setTimeout(() => {
        el.jump.classList.remove("on");
        body.classList.remove("is-mirror");
        body.classList.add("is-seen");

        setTimeout(() => {
          el.endLine.classList.remove("fade");
          el.endLine.textContent = t("face.after");
          applyReturned();
        }, 900);
      }, 1250);
    }, 650);
  }

  // preload the face so it never decodes late
  new Image().src = "assets/face.jpg";

  /* ----------------------------------------------------------
     Frame
     ---------------------------------------------------------- */

  function frame() {
    const y = window.scrollY;
    totalScrolled += Math.abs(y - lastY);
    lastY = y;

    // Unlock the first abyss stretch right as the scrollbar hits ~90% in Act 4
    if (abyssLevel < 1 && accessSection) {
      const ar = accessSection.getBoundingClientRect();
      if (ar.top < window.innerHeight * 0.52) unlockAbyss(1);
    }

    progress = clamp(y / Math.max(fullScrollSpan, 1));
    root.style.setProperty("--p", progress.toFixed(4));

    renderPresence(progress);
    updateCounterTarget();
    updateAudioLevel();

    const mid = y + window.innerHeight * 0.45;
    let next = 0;
    for (const a of acts) {
      if (a.offsetHeight === 0) continue;
      if (mid >= a.offsetTop && mid < a.offsetTop + a.offsetHeight) {
        next = Number(a.dataset.stage) || 0;
        break;
      }
    }
    setStage(next);

    renderCollapse();
    renderRoom();
    renderEnd();

    if (progress > 0.86 && !returned) {
      returned = true;
      writeSession(SEEN_KEY, "1");
    }
    if (progress > 0.93) el.footCopy.textContent = t("foot.copyEnd");

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener(
    "scroll",
    () => {
      noteInput();
      onScroll();
    },
    { passive: true }
  );
  window.addEventListener(
    "resize",
    () => {
      measureMetrics();
      onScroll();
    },
    { passive: true }
  );

  /* ----------------------------------------------------------
     Language switching
     ---------------------------------------------------------- */

  function setLang(next) {
    lang = SUPPORTED.includes(next) ? next : "en";
    try {
      localStorage.setItem("still.lang", lang);
    } catch (_) {
      /* ignore */
    }

    root.lang = lang === "zh" ? "zh-CN" : "en";
    body.dataset.lang = lang;
    el.langBtn.textContent = lang === "zh" ? "EN" : "中";

    applyCopy();
    refreshDynamic();
    rebuildTextNodes();
    if (maxStage > 0) corruptText(maxStage);

    measureMetrics();
    resetRoom();
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

  // Lock the lower abyss initially so the scrollbar looks like a normal short landing page
  fullScrollSpan = rawPageSpan();
  body.classList.add("abyss-locked");
  initialPagePixels = document.documentElement.scrollHeight;

  if (!returned) {
    window.scrollTo(0, 0);
  } else if (window.scrollY > initialPagePixels * 0.7) {
    unlockAbyss(3);
  }

  setLang(lang);
  frame();
  window.addEventListener("load", () => {
    measureMetrics();
    frame();
  });
})();
