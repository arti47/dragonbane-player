/* screens.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { Table } from './table.js';
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
import { renderRuleDetail, rulesScreen } from './library.js';
export { renderRuleDetail };
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
            <div class="card hero-card${hp <= 0 ? " is-dying" : ""}" data-id="${esc(c.id)}" tabindex="0" role="button" aria-label="Open ${esc(c.identity?.name || "hero")}">
              ${portrait}
              <div class="hc-body">
                <div class="hc-top">
                  <h3>${esc(c.identity?.name || "Unnamed")}</h3>
                  ${iconBtn}
                </div>
                ${c.soloCopy ? '<span class="tag hc-solo">Solo copy</span>' : ""}<div class="meta">${emblem("prof", c.identity?.profession, "emb card-emb")}${esc(c.identity?.kin || "—")} · ${esc(c.identity?.profession || "—")}${c.identity?.age ? " · " + esc(c.identity.age) : ""}</div>
                <div class="hc-vitals" aria-hidden="true">
                  <span class="hc-bar hp${hp <= 0 ? " down" : ""}"><i style="width:${pct(hp, hpM)}%"></i><b>HP ${hp}/${hpM}</b></span>
                  <span class="hc-bar wp"><i style="width:${pct(wp, wpM)}%"></i><b>WP ${wp}/${wpM}</b></span>
                </div>
                ${conds.length ? `<div class="hc-conds" title="${esc(conds.map((x) => x.name).join(", "))}">${conds.map((x) => `<span class="hc-dot">${esc(x.name)}</span>`).join("")}</div>` : ""}
              </div>
            </div>`;
        };

        const myCards = myChars.map(renderCard).join("");

        let lastId = null; try { lastId = localStorage.getItem("dragonbane.lastHero"); } catch (_) {}
        const last = myChars.length > 1 && lastId ? myChars.find((x) => x.id === lastId) : null;
        let lastHpM = 0; try { if (last) lastHpM = effHpMax(last); } catch (_) {}
        const resume = last ? `<button type="button" class="resume-card" data-resume="${esc(last.id)}"><span class="rc-play" aria-hidden="true">▶</span><span class="rc-txt"><span class="rc-k">Continue</span><b>${esc(last.identity?.name || "Hero")}</b></span><span class="rc-hp">HP ${last.state?.hp ?? 0}/${lastHpM}</span></button>` : "";
        body = `
          ${sectionTitle("Your heroes")}
          ${resume}
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
      root.querySelector(".resume-card")?.addEventListener("click", (e) => Sheet.open(e.currentTarget.dataset.resume));
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

    rules() { return rulesScreen(); },

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
      const beg = !!Settings.get("beginner");
      const row0 = el(`<div class="toggle-row"><div><b>Beginner mode (this device)</b><br><span class="stat-line">Explains every roll in plain words, shows what each combat action does, adds a hint to the game-phase banner, and hides advanced panels (familiar, teacher training, GM automation, permanent WP loss).</span></div></div>`);
      const tog0 = el(`<button class="toggle ${beg ? "on" : ""}" role="switch" aria-checked="${beg}" id="tog-beginner"><span class="knob"></span></button>`);
      tog0.onclick = () => { Settings.set("beginner", !Settings.get("beginner")); Table.applyBeginner(); Table.render(); Router.go("about"); };
      row0.appendChild(tog0); sp.appendChild(row0);
      sp.appendChild(el(`<div style="margin-top:10px;border-top:1px solid var(--border)"></div>`));
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
      // Group the toggles: Content (what's in the rules) vs Play style (how this device plays).
      {
        const rows = [...sp.querySelectorAll(":scope > .toggle-row")]; // beginner, book of magic, solo, gm automation, gm screen
        sp.querySelectorAll(":scope > div:not(.toggle-row)").forEach((d) => d.remove());
        const [rBeg, rBom, rSolo, rAuto, rGm] = rows;
        sp.append(rBom, el(`<h3 class="set-h">Play style</h3>`), rBeg, rSolo, rGm, rAuto);
        rows.forEach((r) => { r.style.marginTop = ""; r.style.borderTop = ""; r.style.paddingTop = ""; const d = r.querySelector(".stat-line"); if (d) { d.classList.add("tr-desc"); d.onclick = () => d.classList.toggle("open"); } });
      }

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

  /* =================================================================
   * Router
   * ================================================================= */
