/* icons.js — custom minimal line icons (illuminated-manuscript look).
   Emoji in rendered text are swapped for inline SVGs at render time. The
   original emoji stays in the DOM (visually hidden) so textContent, copy and
   screen-reader output are unchanged — only the visual glyph differs.
   Emoji without an icon get a sepia tint (.emo) so they sit with the palette. */

// 24×24 stroke paths (currentColor). Keep them simple — one idea per glyph.
const P = {
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/>',
  swords: '<path d="M4 4l10 10M20 4L10 14M5 15l4 4M19 15l-4 4M7 17l-2 2M17 17l2 2"/>',
  dagger: '<path d="M18 3l3 3-9 9-3-3zM9 12l-2 2 3 3 2-2M7 14l-3 3 3 3 3-3"/>',
  bolt: '<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>',
  burst: '<path d="M12 2l2 6 6-3-3 6 5 3-6 1 1 6-5-4-4 5-1-6-6-1 5-3-3-6 6 3z"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>',
  dragon: '<path d="M3 18c3 0 4-3 7-3s4 3 7 3c2 0 3-1 4-2M7 14c0-4 2-7 5-8l-1 3 4-2-1 3 4-1-2 4M15 9h.01"/>',
  warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
  sparkle: '<path d="M12 3c.6 4 2 5.4 6 6-4 .6-5.4 2-6 6-.6-4-2-5.4-6-6 4-.6 5.4-2 6-6zM19 15c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  book: '<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1zM12 6v14"/>',
  demon: '<path d="M5 3l2 5M19 3l-2 5M6 8h12v6a6 6 0 01-12 0zM9 12h.01M15 12h.01M10 16h4"/>',
  skull: '<path d="M12 3a8 8 0 00-5 14v3h10v-3a8 8 0 00-5-14z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10 20v-2M14 20v-2"/>',
  medal: '<path d="M8 3l4 6 4-6"/><circle cx="12" cy="15" r="6"/><path d="M12 12l1 2h2l-1.5 1.3.5 2-2-1.2-2 1.2.5-2L9 14h2z"/>',
  drop: '<path d="M12 3c3 5 6 8 6 11a6 6 0 01-12 0c0-3 3-6 6-11z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3M12 15v2"/>',
  horn: '<path d="M3 10v4h3l8 5V5L6 10zM18 8a5 5 0 010 8"/>',
  run: '<circle cx="14" cy="4.5" r="1.8"/><path d="M6 20l4-5 3 2 1-5 4 3M10 10l3-2 3 2M6 12l3-3"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 13V9M10 2h4M19 6l-1.5 1.5"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z"/>',
  leap: '<circle cx="17" cy="5" r="1.8"/><path d="M3 19c3-6 7-9 12-10l-3 5 4 2M9 12l-3-2M12 14l-1 5"/>',
  thread: '<path d="M7 4h10M7 20h10M8 4v16M16 4v16M8 8l8 2M8 12l8 2M8 16l8 0"/>',
  tent: '<path d="M2 20h20M12 4L3 20M12 4l9 16M12 4v16M9 20l3-6 3 6"/>',
  mushroom: '<path d="M3 12a9 7 0 0118 0z"/><path d="M9 12v6a3 3 0 006 0v-6"/>',
  fear: '<circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 9h.01"/><ellipse cx="12" cy="15.5" rx="2" ry="2.5"/>',
  swirl: '<path d="M12 12a2 2 0 102-2 4 4 0 10-4 4 6 6 0 106-6 8 8 0 10-8 8"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z"/>',
  refresh: '<path d="M20 11a8 8 0 00-14-5L4 8M4 4v4h4M4 13a8 8 0 0014 5l2-2M20 20v-4h-4"/>',
  tree: '<path d="M12 2l6 8h-3l4 6H5l4-6H6zM12 16v6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  hat: '<path d="M3 19c3 1.5 15 1.5 18 0M6 18.5L10.5 5c.4-1.2 1.6-1.2 2 0l1 3.5 2.5 1-1.5 1.5 2 7.5M8 14h8"/>',
  wand: '<path d="M4 20L15 9M16 3v3M16 12v3M19 6h3M10 6h3M18.5 4.5l1.5-1.5M18.5 10.5l1.5 1.5"/>',
  journal: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18M12 8h4M12 12h4"/>',
  scroll: '<path d="M6 4h11a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6M6 4a2 2 0 100 4h2M10 10h6M10 14h6"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 3-6 6-6s6 2 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4 1.8 4 5"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/>',
  storm: '<path d="M7 16a5 5 0 01.5-10 6 6 0 0111 2 4 4 0 01-.5 8M13 12l-3 5h4l-3 5"/>',
  door: '<path d="M6 21V3h12v18M3 21h18M14 12h.01"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18"/>',
  forbid: '<circle cx="12" cy="12" r="9"/><path d="M6 18L18 6"/>',
  snow: '<path d="M12 2v20M3.5 7l17 10M3.5 17l17-10M9 4l3 2 3-2M9 20l3-2 3 2"/>',
  germ: '<circle cx="12" cy="12" r="5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M5 19l3.5-3.5M15.5 8.5L19 5"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 10a1.5 1.5 0 001.3 2h11.4a1.5 1.5 0 001.3-2l-5-10V3M7 15h10"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  pack: '<path d="M7 8a5 5 0 0110 0v12H7zM9 8V5h6v3M9 14h6"/>',
  link: '<path d="M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1 1M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1-1"/>',
  clapper: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 9l2-5 16 2-1 3M8 5l2 4M13 5.6l2 3.4"/>',
  orb: '<circle cx="12" cy="11" r="7"/><path d="M6 21h12M8 18l-1 3M16 18l1 3M10 8a3 3 0 013-2"/>',
  sunrise: '<path d="M3 18h18M6 18a6 6 0 0112 0M12 4v4M4.5 9.5l2 2M19.5 9.5l-2 2M3 21h18"/>',
  moon: '<path d="M20 14A8 8 0 1110 4a6.5 6.5 0 0010 10z"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 4M12 17v.01"/>',
  bed: '<path d="M3 7v13M3 16h18v4M21 16v-3a3 3 0 00-3-3h-8v6"/><circle cx="7" cy="12" r="2"/>',
  wave: '<path d="M2 12c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 17c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>',
  rock: '<path d="M4 18l2-7 5-4 6 2 3 6-2 3z"/>',
  check: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 12l3 3 7-7"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  fire: '<path d="M12 3c1 4 5 6 5 11a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z"/>',
  candle: '<path d="M9 10h6v11H9zM12 10V7M12 3c1 1.5 1 2.5 0 4-1-1.5-1-2.5 0-4z"/>',
  scales: '<path d="M12 3v18M7 21h10M4 7h16M6 7l-3 7h6zM18 7l-3 7h6"/>',
  bow: '<path d="M5 3c8 3 13 8 16 16M5 3L21 19M3 11l6-6M13 21l6-6M16 3h5v5"/>',
  party: '<path d="M4 20l5-13 8 8zM14 4l1 2M19 5l-2 2M20 10h-2M12 8l1 1"/>',
  hand: '<path d="M8 13V5a1.5 1.5 0 013 0v6M11 11V4a1.5 1.5 0 013 0v7M14 11V5.5a1.5 1.5 0 013 0V14a7 7 0 01-7 7c-3 0-4.5-2-6-4l-2-3a1.5 1.5 0 012.5-1.5L8 15"/>',
  horse: '<path d="M6 21v-6l-2-3 3-6 3-2 1 2 5 2 4 6-2 2-3-2-2 3v4"/>',
  letters: '<path d="M3 18l4-11 4 11M4.5 14h5M14 12a3 3 0 116 0v6M20 15h-3a2 2 0 100 3h3"/>',
};

// Emoji (without VS16) → icon key. Everything else gets the .emo tint.
const MAP = {
  "🎲": "dice", "⚔": "swords", "🗡": "dagger", "⚡": "bolt", "💥": "burst", "🛡": "shield",
  "🐉": "dragon", "⚠": "warn", "✨": "sparkle", "🧭": "compass", "📘": "book", "📖": "book",
  "👹": "demon", "👿": "demon", "💀": "skull", "🏅": "medal", "🩸": "drop", "🔒": "lock",
  "📢": "horn", "🏃": "run", "🧿": "eye", "👁": "eye", "⚙": "gear", "⏱": "timer",
  "⏳": "hourglass", "💡": "bulb", "🤸": "leap", "🧵": "thread", "⛺": "tent", "🍄": "mushroom",
  "😱": "fear", "💫": "swirl", "❤": "heart", "💚": "heart", "🔄": "refresh", "♻": "refresh",
  "🌲": "tree", "🎯": "target", "🧙": "hat", "🎩": "hat", "🪄": "wand", "📓": "journal",
  "📜": "scroll", "👥": "people", "🧑": "person", "🌩": "storm", "🚪": "door", "❌": "cross",
  "⛔": "forbid", "❄": "snow", "🦠": "germ", "🧪": "flask", "🔍": "search", "🎒": "pack",
  "🔗": "link", "🎬": "clapper", "🔮": "orb", "🌅": "sunrise", "🌆": "sunrise", "🌙": "moon",
  "❓": "question", "🛌": "bed", "🌊": "wave", "🪨": "rock", "✅": "check", "🖼": "image",
  "🔥": "fire", "🕯": "candle", "⚖": "scales", "🏹": "bow", "🎉": "party", "👋": "hand",
  "🐴": "horse", "🔤": "letters",
};
// Icons that carry a semantic tint (the rest inherit the text colour).
const TINT = { heart: "var(--hp)", drop: "var(--hp)", bolt: "var(--wp)", dragon: "var(--gold-ink)", medal: "var(--gold-ink)", sparkle: "var(--gold-ink)", demon: "var(--bad)", skull: "var(--ink-soft)", warn: "var(--gold-ink)" };

// Pictographic emoji (+ optional VS16 and a gendered ZWJ tail). Typographic
// marks we keep as text (✕ ✓ ★ ☀ ☾ ↗ ⇅ …) are outside these ranges.
const RE = /(?:[\u{1F300}-\u{1FAFF}]|[☀-⛿✀-➿⏩-⏺⌚⌛⭐])️?(?:‍[♀♂]️?)?/gu;
const KEEP = new Set(["✕", "✓", "★", "☀", "☾", "✔", "✖", "☐", "☑"]);
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION", "TITLE", "svg", "SVG", "CODE"]);

export function icon(name, cls = "ic") {
  const body = P[name];
  if (!body) return "";
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

function glyphNode(raw) {
  const base = raw.replace(/️|‍[♀♂]️?/g, "");
  const key = MAP[base];
  const wrap = document.createElement("span");
  if (key) {
    wrap.className = "icw";
    if (TINT[key]) wrap.style.color = TINT[key];
    wrap.innerHTML = icon(key) + `<span class="ic-t"></span>`;
    wrap.lastChild.textContent = raw; // keep the emoji for textContent / screen readers
  } else {
    wrap.className = "emo";
    wrap.textContent = raw;
  }
  return wrap;
}

function processText(node) {
  const text = node.nodeValue;
  if (!text || text.length < 1) return;
  RE.lastIndex = 0;
  if (!RE.test(text)) return;
  RE.lastIndex = 0;
  const frag = document.createDocumentFragment();
  let last = 0, m, changed = false;
  while ((m = RE.exec(text))) {
    if (KEEP.has(m[0].replace(/️/g, ""))) continue;
    if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
    frag.appendChild(glyphNode(m[0]));
    last = m.index + m[0].length;
    changed = true;
  }
  if (!changed) return;
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  node.parentNode.replaceChild(frag, node);
}

function skip(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (SKIP_TAGS.has(n.tagName)) return true;
    if (n.classList && (n.classList.contains("ic-t") || n.classList.contains("emo") || n.classList.contains("icw"))) return true;
    if (n.isContentEditable || (n.dataset && n.dataset.noicon !== undefined)) return true;
  }
  return false;
}

export function iconize(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (root.parentElement && !skip(root.parentElement)) processText(root); return; }
  if (root.nodeType !== 1 || skip(root)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (t) => (RE.lastIndex = 0, RE.test(t.nodeValue) && !skip(t.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const list = [];
  while (walker.nextNode()) list.push(walker.currentNode);
  list.forEach(processText);
}

// Watch the whole document; batch mutations into one pass per frame.
export function startIcons() {
  iconize(document.body);
  let queue = new Set(), scheduled = false;
  const flush = () => { scheduled = false; const q = queue; queue = new Set(); q.forEach((n) => n.isConnected && iconize(n)); };
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") queue.add(m.target);
      else m.addedNodes.forEach((n) => queue.add(n));
    }
    if (!scheduled) { scheduled = true; queueMicrotask(flush); }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
