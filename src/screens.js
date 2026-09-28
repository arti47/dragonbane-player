/* screens.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $, CORE_SCHOOLS, DB, MAGICX, el, esc, helpBox, sectionTitle } from './core.js';
import { confirmModal, promptModal, showToast } from './ui.js';
import { Magic, Settings } from './settings.js';
import { Store } from './store.js';
import { effHpMax, effWpMax } from './derived.js';
import { Sync } from './sync.js';
import { Pregens, Wizard } from './wizard.js';
import { Sheet } from './sheet.js';
import { Combat } from './combat.js';
import { SoloMode } from './solo.js';
import { GM } from './gm.js';
import { icon } from './icons.js';
import { crest, emblem, illo } from './graphics.js';
import { Router } from './router.js';

export function renderPartyBanner() {
    if (typeof Sync === "undefined" || !Sync.enabled) return null;
    if (!Sync.campaign) {
      const banner = el(`<div class="panel" style="border-left:4px solid var(--accent);background:var(--bg-raised);cursor:pointer;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;box-shadow:0 2px 8px var(--tint-shade)">
        <div>
          <h3 style="margin:0;color:var(--accent-ink);font-size:var(--fs-lg)">🛡️ Multiplayer Cloud Sync Ready</h3>
          <p class="stat-line" style="margin:4px 0 0 0;font-size:var(--fs-sm)">You are offline/local. Join or create a party campaign to sync characters and combat live across devices.</p>
        </div>
        <button class="btn secondary" style="flex-shrink:0;margin-left:12px">⚡ Join Party</button>
      </div>`);
      banner.onclick = () => {
        Router.go("about");
        setTimeout(() => {
          const mp = document.querySelector("#multiplayer-panel") || document.querySelector("#btn-create-camp")?.closest(".panel");
          if (mp) mp.scrollIntoView({ behavior: "smooth" });
        }, 100);
      };
      return banner;
    }
    const chars = Store.list().filter(c => c.campaignId === Sync.campaign.id);
    if (!chars.length) return null;
    const items = chars.map(c => {
      const isMe = c.owner === Sync.uid;
      const conds = Object.entries(c.state?.conditions || {}).filter(([_, v]) => v).map(([k]) => k).join(", ");
      return `<div class="roster-row" data-id="${esc(c.id)}" style="display:flex;justify-content:space-between;align-items:center;padding:8px 6px;border-bottom:1px solid var(--line);cursor:pointer;border-radius:var(--r-sm);transition:background 0.15s">
        <div><b>${esc(c.identity?.name || "Hero")}</b> ${isMe ? '<span class="tag" style="background:var(--accent);color:var(--on-accent)">YOU</span>' : ''}<br>
        <span class="stat-line" style="font-size:var(--fs-xs)">${esc(c.identity?.kin||"")} ${esc(c.identity?.profession||"")}</span></div>
        <div style="text-align:right"><b>❤️ ${c.state?.hp}/${c.derived?.hpMax} · ⚡ ${c.state?.wp}/${c.derived?.wpMax}</b>
        ${conds ? `<br><span style="color:var(--bad);font-size:var(--fs-xs)">⚠ ${esc(conds)}</span>` : ''}</div>
      </div>`;
    }).join("");
    const bannerEl = el(`<div class="panel" style="border-color:var(--accent);background:var(--tint-accent);margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <h3 class="u-m0">🛡️ Party Roster (${esc(Sync.campaign.name)})</h3>
        <span class="tag code">${esc(Sync.campaign.joinCode)}</span>
      </div>
      <div class="u-mt2">${items}</div>
    </div>`);
    bannerEl.querySelectorAll(".roster-row[data-id]").forEach(row => {
      row.onclick = () => Sheet.open(row.dataset.id);
    });
    return bannerEl;
  }

  /* =================================================================
   * Screens
   * ================================================================= */

export const Screens = {
    solo() { return SoloMode.view(); },
    gm() { return GM.view(); },
    // Deep-link to the "How to Play" tutorial: open the Rules tab, expand and
    // scroll to that accordion. Used by the "New here?" buttons.
    openTutorial() {
      Router.go("rules");
      setTimeout(() => {
        const acc = document.querySelector("details.rule-accordion[data-cat='howtoplay']");
        if (acc) { acc.open = true; acc.scrollIntoView({ behavior: "smooth", block: "start" }); }
      }, 60);
    },
    home() {
      const chars = Store.list();
      let body;
      if (!chars.length) {
        body = `
          ${sectionTitle("Your heroes")}
          <div class="panel">
            <div class="empty">
              ${illo("campfire")}
              <div class="big">⚔</div>
              <h2>No heroes yet</h2>
              <p class="stat-line">Create a character to begin your adventures in the Misty Vale.<br><b>New to Dragonbane or solo play? Tap 📘 How to Play first.</b></p>
            </div>
            <div class="home-actions">
              <button class="btn block" id="new-hero">Forge a new hero</button>
              <button class="btn ghost block" id="use-pregen">Use a pre-generated hero</button>
              <button class="btn ghost block" id="open-tutorial">📘 New here? How to Play</button>
            </div>
          </div>`;
      } else {
        const inPartyCamp = typeof Sync !== "undefined" && Sync.enabled && Sync.campaign;
        const myChars = inPartyCamp
          ? chars.filter(c => !c.owner || c.owner === Sync.uid || c.campaignId !== Sync.campaign.id)
          : chars;

        const renderCard = (c) => {
          const inParty = inPartyCamp && c.campaignId === Sync.campaign.id;
          const iconBtn = inPartyCamp
            ? `<button class="btn secondary step btn-toggle-party" data-id="${esc(c.id)}" style="font-size:var(--fs-xs);padding:3px 10px;border-radius:var(--r-sm);flex-shrink:0" type="button" title="${inParty ? "In Party (Click to make private)" : "Private (Click to share with party)"}">${inParty ? "🛡️ In Party" : "⚡ Private"}</button>`
            : "";
          const words = String(c.identity?.name || "?").trim().split(/\s+/);
          const ini = (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)).toUpperCase();
          const hp = c.state?.hp ?? 0, wp = c.state?.wp ?? 0;
          let hpM = 0, wpM = 0; try { hpM = effHpMax(c); wpM = effWpMax(c); } catch (_) {}
          const pct = (v, m) => (m > 0 ? Math.max(0, Math.min(100, (v / m) * 100)) : 0);
          const conds = (DB.conditions || []).filter((cn) => c.state?.conditions?.[cn.key]);
          const portrait = `<span class="hc-side">${c.identity?.portraitUrl ? `<img class="hc-mono" src="${esc(c.identity.portraitUrl)}" alt="">` : `<span class="hc-mono has-crest" aria-hidden="true">${crest(c.identity?.name, c.identity?.kin, ini)}</span>`}<svg class="hc-ribbon" viewBox="0 0 58 14" aria-hidden="true"><path class="rb" d="M0 3h8l-3 4 3 4H0zM58 3h-8l3 4-3 4h8z" opacity=".7"/><path class="rb" d="M6 1h46v10H6z"/><path class="rb-edge" d="M6 2.5h46M6 9.5h46"/></svg></span>`;
          return `
            <div class="card hero-card" data-id="${esc(c.id)}" tabindex="0" role="button" aria-label="Open ${esc(c.identity?.name || "hero")}">
              ${portrait}
              <div class="hc-body">
                <div class="hc-top">
                  <h3>${esc(c.identity?.name || "Unnamed")}</h3>
                  ${iconBtn}
                </div>
                <div class="meta">${emblem("prof", c.identity?.profession, "emb card-emb")}${esc(c.identity?.kin || "—")} · ${esc(c.identity?.profession || "—")}${c.identity?.age ? " · " + esc(c.identity.age) : ""}</div>
                <div class="hc-vitals" aria-hidden="true">
                  <span class="hc-bar hp${hp <= 0 ? " down" : ""}"><i style="width:${pct(hp, hpM)}%"></i><b>HP ${hp}/${hpM}</b></span>
                  <span class="hc-bar wp"><i style="width:${pct(wp, wpM)}%"></i><b>WP ${wp}/${wpM}</b></span>
                </div>
                ${conds.length ? `<div class="hc-conds" title="${esc(conds.map((x) => x.name).join(", "))}">${conds.map((x) => `<span class="hc-dot">${esc(x.name)}</span>`).join("")}</div>` : ""}
              </div>
            </div>`;
        };

        const myCards = myChars.map(renderCard).join("");

        body = `
          ${sectionTitle("Your heroes")}
          <div class="card-grid">${myCards || '<p class="stat-line" style="padding:8px">No heroes created by you yet.</p>'}</div>
          <div class="fleuron-div" aria-hidden="true"></div>
          <div class="home-actions">
            <button class="btn block" id="new-hero">Forge a new hero</button>
            <button class="btn ghost block" id="use-pregen">Use a pre-generated hero</button>
            <button class="btn ghost block" id="open-tutorial">📘 How to Play</button>
          </div>`;
      }
      const root = el(`<div>${body}</div>`);
      root.insertBefore(helpBox("Heroes", [
        "Tap <b>Forge a new hero</b> to run the character-creation wizard.",
        "Or <b>Use a pre-generated hero</b> for a ready-made Core Set PC.",
        "Tap any hero card to open its full sheet.",
        "In a party campaign, toggle a card's <b>In Party / Private</b> chip to share or hide that hero."
      ]), root.firstChild);
      const pb = renderPartyBanner(); if (pb) root.insertBefore(pb, root.firstChild);
      root.querySelector("#new-hero").addEventListener("click", () => Wizard.start());
      root.querySelector("#use-pregen").addEventListener("click", () => Pregens.open());
      root.querySelector("#open-tutorial")?.addEventListener("click", () => Screens.openTutorial());
      root.querySelectorAll(".card[data-id]").forEach((card) => {
        card.addEventListener("click", (e) => {
          if (e.target.closest(".btn-toggle-party")) return;
          Sheet.open(card.dataset.id);
        });
        card.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === card) { e.preventDefault(); Sheet.open(card.dataset.id); } });
      });
      root.querySelectorAll(".btn-toggle-party").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          Store.toggleParty(btn.dataset.id);
          Router.go("home");
        });
      });
      return root;
    },

    party() { return Combat.view(); },

    rules() {
      const root = el(`
        <div>
          ${sectionTitle("Rules library & Compendiums")}
          <div class="panel search-panel" style="margin-bottom:12px;padding:10px">
            <div class="search-wrap">
              <span class="search-ic">${icon("search")}</span>
              <input type="search" id="rules-search" class="input" placeholder="Search rules, spells, gear, journeys…" aria-label="Search rules, spells, gear, journeys" autocomplete="off" style="width:100%">
              <button type="button" class="search-clear" aria-label="Clear search" hidden>✕</button>
            </div>
            <div class="search-count" role="status" aria-live="polite"></div>
            <div class="empty-illo search-empty" hidden>${illo("book")}</div>
          </div>
          <div class="u-col2" id="rules-acc-wrap"></div>
        </div>`);
      root.insertBefore(helpBox("Rules library", [
        "Tap a category header to expand it; tap again to collapse.",
        "Type in the <b>search</b> box to filter across every rule, spell, and item.",
        "New to the game? Start with <b>📘 How to Play</b> for the full tutorial.",
        "Extra magic schools appear only with <b>Book of Magic</b> on (About)."
      ]), root.querySelector("#rules-acc-wrap"));

      const cats = [
        ["📘 How to Play (Tutorial)", "howtoplay"],
        ["🔄 Core Loop & Gameplay Stages", "stages"],
        ["🌲 Wilderness Journeys & Travel", "journeys"],
        ["🧑 Kin", "kin"],
        ["🛡️ Professions", "professions"],
        ["🎯 Skills", "skills"],
        ["⚡ Heroic Abilities", "heroicAbilities"],
        ["✨ Spells & Tricks", "spells"],
        ["⚔️ Weapons & Armor", "equipment"],
        ["🎒 Adventuring Gear", "gear"]
      ];

      const accWrap = root.querySelector("#rules-acc-wrap");
      cats.forEach(([label, key]) => {
        const contentHtml = renderRuleDetail(key, null);
        const acc = el(`<details class="rule-accordion" data-cat="${key}" style="background:var(--card);border:1px solid var(--border);border-radius:var(--r-md);padding:8px 12px;overflow:hidden">
          <summary class="cat-summary">
            <span>${label}</span><span class="chev" aria-hidden="true"></span>
          </summary>
          <div class="rule-content" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">${contentHtml}</div>
        </details>`);
        accWrap.appendChild(acc);
      });

      const sInp = root.querySelector("#rules-search");
      const sClr = root.querySelector(".search-clear");
      const sCnt = root.querySelector(".search-count");
      sInp.oninput = (e) => {
        const q = e.target.value.toLowerCase().trim();
        let hits = 0;
        root.querySelectorAll("details.rule-accordion").forEach(acc => {
          if (!q) {
            acc.style.display = "";
            acc.open = false;
          } else {
            const text = acc.textContent.toLowerCase();
            const match = text.includes(q);
            acc.style.display = match ? "" : "none";
            if (match) { acc.open = true; if (acc.parentElement && acc.parentElement.id === "rules-acc-wrap") hits++; }
          }
        });
        sClr.hidden = !q;
        sCnt.textContent = q ? (hits ? `${hits} of ${cats.length} categories match` : "No matches") : "";
        const sEmpty = root.querySelector(".search-empty"); if (sEmpty) sEmpty.hidden = !(q && !hits);
      };
      sClr.onclick = () => { sInp.value = ""; sInp.oninput({ target: sInp }); sInp.focus(); };

      return root;
    },

    about() {
      const installed = window.matchMedia("(display-mode: standalone)").matches;
      const root = el(`
        <div>
          ${sectionTitle("Settings & About")}
          <div class="panel" id="settings-panel"><h3>Content</h3></div>
          <div class="panel">
            <h3>Dragonbane Player</h3>
            <p class="meta">Locally persistent character sheet, wizard, and initiative tracker for the <b>Dragonbane RPG</b> (Fria Ligan).</p>
            <p class="stat-line">Zero telemetry, full offline support, PWA installable. Works entirely out of your browser's local storage.</p>
          </div>
          <div class="panel">
            <h3>Data management</h3>
            <div class="rest-row">
              <button class="btn secondary data-btn" id="btn-export">⬇ Export heroes (JSON)</button>
              <button class="btn secondary data-btn" id="btn-import">⬆ Import heroes (JSON)</button>
              <button class="btn danger-ghost data-btn" id="btn-clear">Clear all storage</button>
            </div>
            <input type="file" id="file-import" accept=".json" style="display:none">
          </div>
        </div>`);

      root.insertBefore(helpBox("Settings & About", [
        "Toggle content: <b>Book of Magic</b>, <b>Solo Mode</b>, <b>GM Automation</b>, <b>GM Screen</b>.",
        "<b>Multiplayer</b>: <b>Create</b> a campaign (get a join code) or <b>Join</b> one to sync your party.",
        "Optionally <b>Link Google</b> to back up characters across devices.",
        "<b>Export / Import / Clear</b> manage your locally-stored heroes."
      ]), root.firstChild);
      const sp = root.querySelector("#settings-panel");
      const bom = Settings.bookOfMagic();
      const row = el(`<div class="toggle-row"><div><b>Book of Magic content</b><br><span class="stat-line">Adds the 9 new schools &amp; extra spells to the Rules browser and character creation. Revised core spells apply either way.</span></div></div>`);
      const tog = el(`<button class="toggle ${bom ? "on" : ""}" role="switch" aria-checked="${bom}"><span class="knob"></span></button>`);
      tog.onclick = () => { Settings.set("bookOfMagic", !Settings.bookOfMagic()); Router.go("about"); };
      row.appendChild(tog); sp.appendChild(row);

      const sm = Settings.soloMode();
      const row2 = el(`<div class="toggle-row" style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px"><div><b>Solo Mode Campaign</b><br><span class="stat-line">Unlocks solo heroic abilities (Army of One, Sole Survivor) during character creation.</span></div></div>`);
      const tog2 = el(`<button class="toggle ${sm ? "on" : ""}" role="switch" aria-checked="${sm}"><span class="knob"></span></button>`);
      tog2.onclick = () => { Settings.set("soloMode", !Settings.soloMode()); Router.go("about"); };
      row2.appendChild(tog2); sp.appendChild(row2);

      const gm = Settings.gmAutomation();
      const row3 = el(`<div class="toggle-row" style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px"><div><b>Advanced / GM Automation</b><br><span class="stat-line">Reveals an optional GM panel on the sheet: time clock (rounds/stretches/shifts), round-rest once-per-shift, light burn-out, sleep deprivation, cold &amp; disease, fear attacks, and concentration interruption.</span></div></div>`);
      const tog3 = el(`<button class="toggle ${gm ? "on" : ""}" role="switch" aria-checked="${gm}"><span class="knob"></span></button>`);
      tog3.onclick = () => { Settings.set("gmAutomation", !Settings.gmAutomation()); Router.go("about"); };
      row3.appendChild(tog3); sp.appendChild(row3);

      const gs = GM.enabled();
      const row4 = el(`<div class="toggle-row" style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px"><div><b>GM Screen</b><br><span class="stat-line">Adds a 🎲 GM tab: a live party panel (HP/WP/conditions), peek any sheet, drop monsters/NPCs into combat, hand out damage/conditions/fear, plus glanceable GM reference tables. Defaults on for a campaign GM; this toggle overrides.</span></div></div>`);
      const tog4 = el(`<button class="toggle ${gs ? "on" : ""}" role="switch" aria-checked="${gs}"><span class="knob"></span></button>`);
      tog4.onclick = () => { Settings.set("gmScreen", !GM.enabled()); Router.go("about"); };
      row4.appendChild(tog4); sp.appendChild(row4);

      const syncPanel = el(`<div class="panel" id="multiplayer-panel"><h3>Multiplayer &amp; Cloud Sync</h3></div>`);
      if (!Sync.enabled) {
        syncPanel.appendChild(el(`<p class="stat-line">Cloud sync is currently disabled. To enable party sharing across devices, configure your Firebase keys in <code>firebase-config.js</code>.</p>`));
      } else {
        const authName = Sync.user?.isAnonymous ? `Anonymous Player (${Sync.uid.slice(0,6)})` : (Sync.user?.displayName || Sync.user?.email || "Connected Player");
        const authLine = `<p class="stat-line"><b>Identity:</b> ${esc(authName)} ${Sync.user?.isAnonymous ? `<button class="btn ghost small" id="link-google" style="margin-left:8px;padding:2px 8px;font-size:var(--fs-xs)">🔗 Link Google</button>` : '✓ Google Linked'}</p>`;
        syncPanel.appendChild(el(authLine));
        if (Sync.user?.isAnonymous) {
          syncPanel.querySelector("#link-google").onclick = () => Sync.linkGoogle();
        }

        if (!Sync.campaign) {
          const createRow = el(`<div class="u-mt2"><button class="btn secondary block" id="btn-create-camp">⚡ Create New Party Campaign</button></div>`);
          createRow.querySelector("#btn-create-camp").onclick = async () => {
            const n = await promptModal("Enter a Campaign / Party Name:", { title: "Create campaign", defaultValue: "Misty Vale Adventurers", okText: "Create" });
            if (n !== null) Sync.createCampaign(n.trim() || "Dragonbane Campaign");
          };
          const joinRow = el(`<div style="display:flex;gap:8px;margin-top:8px">
            <input type="text" id="join-code" class="input" placeholder="Join Code (e.g. VALE42)" style="flex:1;text-transform:uppercase">
            <button class="btn" id="btn-join-camp">Join</button>
          </div>`);
          joinRow.querySelector("#btn-join-camp").onclick = () => {
            const code = joinRow.querySelector("#join-code").value.trim();
            if (code) Sync.joinCampaign(code);
          };
          syncPanel.append(createRow, joinRow);
        } else {
          const campInfo = el(`<div style="margin-top:8px;padding:8px;background:var(--bg);border-radius:var(--r-sm);border-left:4px solid var(--accent)">
            <b>Active Campaign:</b> ${esc(Sync.campaign.name)}<br>
            <b>Join Code:</b> <code style="font-size:var(--fs-lg);color:var(--accent-ink)">${esc(Sync.campaign.joinCode)}</code><br>
            <span class="stat-line" style="font-size:var(--fs-sm)">Share this code with players so they can join your party.</span>
          </div>`);
          const leaveBtn = el(`<button class="btn ghost block" style="margin-top:8px;color:var(--bad)">Disconnect from Campaign</button>`);
          leaveBtn.onclick = () => Sync.leaveCampaign();
          syncPanel.append(campInfo, leaveBtn);
        }
      }
      root.appendChild(syncPanel);

      root.querySelector("#btn-export").addEventListener("click", () => Screens.export());
      root.querySelector("#btn-import").addEventListener("click", () => root.querySelector("#file-import").click());
      root.querySelector("#file-import").addEventListener("change", (e) => Screens.importFile(e));
      root.querySelector("#btn-clear").addEventListener("click", async () => {
        if (await confirmModal("Clear all locally saved heroes and reset the app? This cannot be undone.", { title: "Clear all storage", okText: "Clear everything", danger: true })) {
          Store.clear(); Router.go("home");
        }
      });
      return root;
    },
    // Download all locally-stored heroes as a JSON file.
    export() {
      const data = JSON.stringify(Store.list(), null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "dragonbane-heroes.json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    // Import heroes from a JSON file (merge by id; imported overrides on conflict).
    importFile(e) {
      const file = e.target.files && e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target.result);
          if (!Array.isArray(imported)) throw new Error("Expected a JSON array of heroes.");
          const byId = {}; Store.list().forEach((c) => { if (c && c.id) byId[c.id] = c; });
          let added = 0, updated = 0;
          imported.forEach((c) => { if (!c || !c.id) return; if (byId[c.id]) updated++; else added++; byId[c.id] = c; });
          Store.save(Object.values(byId));
          showToast(`Imported ${imported.length} hero(es): ${added} added, ${updated} updated.`, "success");
          Router.go("home");
        } catch (err) {
          showToast("Import failed: " + (err.message || err), "error");
        }
      };
      reader.readAsText(file);
    }
  };

  /* ---- Rule detail rendering ----------------------------------------- */

export function renderRuleDetail(key, container) {
    let html = "";
    if (key === "howtoplay") {
      const acc = (title, body, open) => `<details class="rule-accordion" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;margin-bottom:6px"${open ? " open" : ""}><summary class="u-bold-ptr">${title}</summary><div class="stat-line u-mt2">${body}</div></details>`;
      html = `<div class="panel" style="border-left:4px solid var(--accent)">
        <h3>📘 How to Play</h3>
        <p class="stat-line">Combined rules primer + how to drive this app. Nav tabs: <b>⚔ Heroes</b>, <b>🛡 Combat</b>, <b>🧭 Solo</b> (when enabled), <b>🎲 GM</b> (when enabled), <b>📖 Rules</b>, <b>⚙ About</b>.</p>
        ${acc("🎬 Your first session — Start → Keep playing → End well", "<b>START.</b><br>① On <b>⚔ Heroes</b>, tap <b>Forge a new hero</b> (or <b>Use a pre-generated hero</b> to skip creation).<br>② Choose how you'll play. <b>With friends:</b> one person opens <b>⚙ About → Create campaign</b> and shares the join code; everyone else taps <b>Join</b>. <b>Solo (no GM):</b> About → turn on <b>Solo Mode</b>, open the <b>🧭 Solo</b> tab, and pick your hero under <b>🎲 Rolling as</b>.<br>③ Set the opening <b>scene</b> — where you are and your goal (group: the GM says it aloud; solo: type it in the Solo <b>Journal</b>).<br><br><b>KEEP PLAYING — repeat this each scene:</b><br>④ Decide what happens: the <b>GM</b> narrates, or (solo) tap the <b>Fortune Chart</b> oracle for a yes/no answer.<br>⑤ <b>Act:</b> open your sheet and tap a <b>skill</b> to roll <b>D20 ≤ its level</b>. Miss? <b>Push</b> (take a Condition and re-roll) or (solo) <b>🎲 Fail forward</b>.<br>⑥ <b>Fights</b> run on the <b>🛡 Combat</b> tab: add foes, <b>Draw initiative</b>, then attack/cast and apply damage.<br>⑦ <b>Recover</b> with the sheet's <b>Rest</b> buttons (Round / Stretch / Shift).<br>⑧ Keep notes in the <b>Journal</b> / Notes and track open questions as <b>🧵 Threads</b>.<br><br><b>END WELL.</b><br>⑨ At a good stopping point, on the sheet tap <b>End session — advancement</b>: answer the 5 questions, then roll each marked skill to try to improve it.<br>⑩ <b>Solo:</b> when a mission is complete, tap <b>🏅 Mission +5</b> instead.<br>⑪ Progress saves automatically (and syncs in a campaign; use <b>About → Export</b> for a backup).<br>⑫ Jot the <b>next scene</b> in your journal so you can pick up easily next time.", true)}
        ${acc("① Setup &amp; storage", "The app runs offline in <b>Local</b> mode (top-right pill) — no login. For a shared party, tap the pill or <b>About → Multiplayer</b> to <b>create a campaign</b> (get a join code) or <b>join</b> one. Optional Google link in About backs up across devices. Content toggles in About: <b>Book of Magic</b>, <b>Solo Mode</b>, <b>GM Automation</b>, <b>GM Screen</b>.", true)}
        ${acc("② Make a hero", "<b>Heroes → Forge a new hero</b> runs the 9-step wizard: roll 4D6-drop-lowest ×6 and assign to STR/CON/AGL/INT/WIL/CHA, pick kin, profession (mages/Harmonism-bards pick a school), age, trained skills (6 + age bonus), heroic ability or magic, gear, details. Or <b>Use a pre-generated hero</b> for a Core Set PC. Everything derived (HP=CON, WP=WIL, movement, damage bonus, skill chances) is computed for you.", false)}
        ${acc("③ Core roll mechanic", "Roll <b>D20 ≤ skill</b> (tap a skill on the sheet). <b>1 = Dragon</b> (crit), <b>20 = Demon</b> (fumble) — both auto-add an advancement mark. A <b>boon</b> rolls 2D20 keep lowest, a <b>bane</b> keep highest (net stepper; conditions/worn-armor auto-apply banes). Fail a roll → <b>Push</b>: take a condition (its attribute is then baned) and re-roll. Six conditions: Exhausted/STR, Sickly/CON, Dazed/AGL, Angry/INT, Scared/WIL, Disheartened/CHA.", false)}
        ${acc("④ Combat", "<b>Combat</b> tab: add heroes, Bestiary monsters, rulebook NPCs, or custom foes. <b>Draw initiative</b> (cards 1–10, low acts first). Each turn = move + action; expand a row for weapon attacks (auto damage bonus + armor mitigation via the damage applier), spell casting, movement pool, and parry/dodge reactions. Monsters auto-hit (roll their D6 table ×Ferocity); NPCs roll d20. <b>Next turn/round</b> redraws. GM-locked in a synced campaign.", false)}
        ${acc("⑤ Magic", "Tap a spell/trick on the sheet or in combat. Tricks (rank 0) cost 1 WP, auto-succeed. Spells cost 2 WP/level (power level 1–3), roll the school skill; failure still spends WP; Demon → mishap table. Metal armor/weapon blocks casting. The VTT resolution card handles heal/damage/AoE/summon/etc. Learn new spells/schools via the sheet's Magic panel.", false)}
        ${acc("⑥ Rest, death &amp; advancement", "<b>Round rest</b> +D6 WP (once/shift), <b>Stretch rest</b> +D6 HP/WP + heal a condition (once/shift), <b>Shift rest</b> full HP/WP + clear conditions. At <b>0 HP</b> a dying panel runs death rolls (D20 ≤ CON; 3 successes stabilize, 3 fail = death). <b>End session — advancement</b> answers the 5 questions then rolls each marked skill (improve on a roll over its level, max 18).", false)}
        ${acc("▶ Running a NON-SOLO game (group + GM)", "One player <b>creates a campaign</b> (About) → becomes GM → shares the join code; others <b>join</b>. Add your PC to the party (Heroes card toggle / sheet). Sheets, party HP/WP/conditions, and the combat tracker sync live. GM turns on <b>GM Screen</b> (About) for the <b>🎲 GM</b> tab: live party panel, peek any sheet, drop monsters/NPCs into combat, hand out damage/conditions/fear, roll+push private tables, broadcast messages. Combat controls (initiative/turns/reset) are GM-locked in a synced campaign. Loop: GM frames a scene → players roll skills → combat as needed → rest → end-of-session advancement.", false)}
        ${acc("🧭 Running a SOLO game (no GM)", "Enable <b>Solo Mode</b> (About) → <b>🧭 Solo</b> tab; creation grants a 2nd free heroic ability (Army of One / Sole Survivor). Solo tab tools: <b>Fortune Chart</b> oracle (ask yes/no etc. at a likelihood), <b>Inspiration</b> (3D20 prompt), <b>Dragon/Demon</b> narrative twists, <b>NPC generator</b> + attack-table AI, and <b>Wilderness Journeys &amp; Travel Tools</b> (random shift, Camp/Forage skill rolls, Journey Mishap with follow-up WIL/CON check). <b>Link a hero</b> at the top of the Solo tab so those rolls use your sheet + full dice engine. Loop: set a scene → ask the oracle → roll skills/combat → mishaps → advance (Solo: <b>Mission +5 marks</b>). Fail-forward turns failures into complications.", false)}
        ${acc("🔤 Glossary (game terms)", "<b>HP</b> Hit Points — how much damage you can take (0 = dying). · <b>WP</b> Willpower Points — the fuel for spells &amp; heroic abilities. · <b>Skill</b> a rating 1–18; you succeed by rolling D20 <b>≤</b> it (roll-under). · <b>Boon</b> roll 2D20, keep the lower (better). · <b>Bane</b> roll 2D20, keep the higher (worse). · <b>Push</b> re-roll a failed check by taking a Condition. · <b>Condition</b> one of six states (Exhausted/Sickly/Dazed/Angry/Scared/Disheartened); each banes rolls using its attribute. · <b>Dragon</b> a natural 1 = critical success. · <b>Demon</b> a natural 20 = fumble. · <b>Kin</b> your ancestry (Human, Elf, Dwarf…). · <b>Heroic ability</b> a special power (some cost WP). · <b>Round</b> ~10s of combat. · <b>Stretch</b> a short break (minutes). · <b>Shift</b> ~6 hours (Morning/Day/Evening/Night). · <b>Advancement mark</b> a tick a skill earns on a Dragon/Demon; at session end you may roll to improve it. · <b>Oracle</b> (solo) a yes/no answer engine that stands in for a GM.", false)}
      </div>`;
    } else if (key === "stages") {
      html = `<div class="panel" style="border-left:4px solid var(--accent)">
        <h3>Core Gameplay Loop &amp; Stages</h3>
        <details class="u-mb2" open><summary style="cursor:pointer"><b>⏱️ Time Scales (Rounds vs Shifts)</b></summary>
          <p class="stat-line u-mt1">· <b>Combat Rounds:</b> Roughly 10 seconds. Every combatant gets 1 Turn (Action + Movement).<br>· <b>Wilderness Shifts:</b> Roughly 6 hours (Morning, Day, Evening, Night).</p>
        </details>
        <details class="u-mb2"><summary style="cursor:pointer"><b>⚔️ Combat Stage Sequence</b></summary>
          <p class="stat-line u-mt1">1. <b>Draw Initiative:</b> 1 to 10 ascending.<br>2. <b>Take Turns:</b> Move + Action (Attack, Cast, Dash, Rally).<br>3. <b>Reaction:</b> Parry or Evade (spends your upcoming action).<br>4. <b>End Round:</b> Redraw cards if needed.</p>
        </details>
        <details class="u-mb2"><summary style="cursor:pointer"><b>🎲 Core D20 Mechanic &amp; Pushing</b></summary>
          <p class="stat-line u-mt1">Roll D20 ≤ Skill level. 1 is Dragon (Critical), 20 is Demon (Mishap). If you fail, you can <b>Push</b> the roll by accepting a Condition Bane (Exhausted, Battered, etc.).</p>
        </details>
      </div>`;
    } else if (key === "journeys") {
      html = `<div class="panel" style="border-left:4px solid var(--ok)">
        <h3>Wilderness Journeys &amp; Travel</h3>
        <p class="stat-line"><b>Time Measurement:</b> In wilderness, time is measured in <b>Shifts</b> (Morning, Day, Evening, Night — ~6h each). Travel speed: 1 node/hex per shift.</p>
        <p><b>⛺ Camp &amp; Rest:</b> Making camp requires a Bushcraft check. Success lets party rest (Shift rest = restore full HP/WP). Failure means no rest &amp; roll on Mishap Table.</p>
        <p><b>🍄 Foraging &amp; Hunting:</b> Spend a shift making Bushcraft/Hunting checks to gather rations.</p>
        <h4 style="margin:8px 0 4px 0;color:var(--bad)">🎲 Journey Mishaps (D6)</h4>
        <p class="stat-line">${(DB.journeyMishaps || []).map((x) => `${x.d6}: ${esc(x.effect)}`).join(" · ")}</p>
      </div>`;
    } else if (key === "kin") {
      html = (DB.kin || []).map((k) => `
        <div class="panel">
          <h3>${emblem("kin", k.key)} ${esc(k.name)} <span class="tag">Move ${k.movement}</span></h3>
          ${(k.abilities || []).map((a) => `<p><b>${esc(a.name)}</b> ${a.wp ? `<span class="tag">WP ${a.wp}</span>` : `<span class="tag">No WP</span>`}<br><span class="stat-line">${esc(a.text)}</span></p>`).join("")}
        </div>`).join("");
    } else if (key === "professions") {
      html = (DB.professions || []).map((p) => `
        <div class="panel">
          <h3>${emblem("prof", p.key)} ${esc(p.name)} <span class="tag">${esc(p.keyAttribute)}</span></h3>
          <p class="stat-line">${p.skills ? "Skills: " + p.skills.map(esc).join(", ") : "Mage — choose a school of magic."}</p>
          <p>${(p.heroicAbilities || []).length ? "Heroic ability: " + p.heroicAbilities.map((h) => `<span class="tag">${esc(h)}</span>`).join("") : '<span class="tag">Gets magic instead</span>'}</p>
        </div>`).join("");
    } else if (key === "skills") {
      const byKind = { general: [], weapon: [], magic: [] };
      (DB.skills || []).forEach((s) => byKind[s.kind]?.push(s));
      html = Object.entries({ general: "General", weapon: "Weapon", magic: "Magic schools" }).map(([k, label]) => `
        <div class="panel"><h3>${label}</h3>
          ${byKind[k].map((s) => `<span class="tag">${esc(s.name)} (${esc(s.attribute)})</span>`).join("")}
        </div>`).join("");
    } else if (key === "heroicAbilities") {
      html = `<div class="panel">` + (DB.heroicAbilities || []).map((a) => `
        <p><b>${esc(a.name)}</b> <span class="tag">${a.req ? esc(a.req) : "No req"}</span> <span class="tag">${a.wp == null ? "No WP" : "WP " + a.wp}</span><br>
        <span class="stat-line">${esc(a.text)}</span></p>`).join("") + `</div>`;
    } else if (key === "spells") {
      const labels = { general: "General Magic", animism: "Animism", elementalism: "Elementalism", mentalism: "Mentalism" };
      const renderSchool = (k, pool, isNew) => {
        const tricks = (pool.tricks || []).map((t) => `<p style="padding:6px 0;border-bottom:1px solid var(--line);margin:0"><b>${esc(t.name)}</b> <span class="tag">Trick</span><br><span class="stat-line">${esc(t.text)}</span></p>`).join("");
        const spells = (pool.spells || []).map((s) => `<p style="padding:6px 0;border-bottom:1px solid var(--line);margin:0"><b>${esc(s.name)}</b> <span class="tag">Rank ${s.rank}</span><br><span class="stat-line">${esc(s.range || s.ingredients || s.item || "")}${s.duration ? " · " + esc(s.duration) : ""} — ${esc(s.text)}</span></p>`).join("");
        return `<details class="panel rule-accordion" style="margin-bottom:10px;padding:12px"><summary class="school-summary"><span class="ss-name">${emblem("school", k)}🧙‍♂️ ${esc(pool.name || labels[k] || Magic.cap(k))}</span><span class="ss-tags">${isNew ? '<span class="tag">Book of Magic</span> ' : ""}<span class="tag">${(pool.tricks||[]).length + (pool.spells||[]).length}</span></span></summary><div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)">${pool.entry ? `<p class="stat-line u-mb25"><i>${esc(pool.entry)}</i></p>` : ""}${tricks ? `<details open style="margin-bottom:8px;background:var(--bg);padding:8px;border-radius:var(--r-sm);border:1px solid var(--line)"><summary class="u-bold-ptr">✨ Magic Tricks (${(pool.tricks||[]).length})</summary><div class="u-mt2">${tricks}</div></details>` : ""}${spells ? `<details style="background:var(--bg);padding:8px;border-radius:var(--r-sm);border:1px solid var(--line)"><summary class="u-bold-ptr">📖 Ranked Spells (${(pool.spells||[]).length})</summary><div class="u-mt2">${spells}</div></details>` : ""}</div></details>`;
      };
      const parts = [];
      if (Magic.enabled()) parts.push(`<p class="notice">Book of Magic content is ON (toggle it in Settings). Revised core spells are always applied.</p>`);
      CORE_SCHOOLS.forEach((k) => parts.push(renderSchool(k, Magic.corePool(k), false)));
      if (Magic.enabled()) Object.keys(MAGICX.schools || {}).forEach((k) => parts.push(renderSchool(k, Magic.newSchoolPool(k), true)));
      html = parts.join("");
    } else if (key === "equipment") {
      const w = (DB.weapons || []).map((x) => `<p><b>${esc(x.name)}</b> <span class="tag">${esc(x.skill || x.type)}</span> <span class="stat-line">${esc(x.damage)}${x.str ? " · STR " + x.str : ""}${x.range ? " · " + x.range + "m" : ""} · ${esc(x.cost)}</span></p>`).join("");
      const a = (DB.armor || []).map((x) => `<span class="tag">${esc(x.name)} (rating ${x.rating})</span>`).join("");
      const h = (DB.helmets || []).map((x) => `<span class="tag">${esc(x.name)} (+${x.rating})</span>`).join("");
      html = `<div class="panel"><h3>Weapons &amp; Shields</h3>${w}</div>
              <div class="panel"><h3>Armor</h3>${a}<h3 class="u-mt25">Helmets</h3>${h}</div>`;
    } else if (key === "gear") {
      html = `<div class="panel"><h3>Adventuring gear</h3>` + (DB.gear || []).map((g) =>
        `<p><b>${esc(g.name)}</b> <span class="tag">${esc(g.cost)}</span> <span class="tag">wt ${g.weight}</span><br><span class="stat-line">${esc(g.effect || "")}</span></p>`).join("") + `</div>`;
    }
    if (container) {
      container.innerHTML = html;
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return html;
  }

  /* =================================================================
   * Router
   * ================================================================= */
