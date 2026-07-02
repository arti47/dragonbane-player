/* screens.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $, CORE_SCHOOLS, DB, MAGICX, el, esc, sectionTitle } from './core.js';
import { confirmModal, promptModal, showToast } from './ui.js';
import { Magic, Settings } from './settings.js';
import { Store } from './store.js';
import { Sync } from './sync.js';
import { Pregens, Wizard } from './wizard.js';
import { Sheet } from './sheet.js';
import { Combat } from './combat.js';
import { SoloMode } from './solo.js';
import { GM } from './gm.js';
import { Router } from './router.js';

export function renderPartyBanner() {
    if (typeof Sync === "undefined" || !Sync.enabled) return null;
    if (!Sync.campaign) {
      const banner = el(`<div class="panel" style="border-left:4px solid var(--accent);background:var(--bg-raised);cursor:pointer;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
        <div>
          <h3 style="margin:0;color:var(--accent);font-size:1.2rem">🛡️ Multiplayer Cloud Sync Ready</h3>
          <p class="stat-line" style="margin:4px 0 0 0;font-size:0.95rem">You are offline/local. Join or create a party campaign to sync characters and combat live across devices.</p>
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
      return `<div class="roster-row" data-id="${esc(c.id)}" style="display:flex;justify-content:space-between;align-items:center;padding:8px 6px;border-bottom:1px solid var(--line);cursor:pointer;border-radius:6px;transition:background 0.15s">
        <div><b>${esc(c.identity?.name || "Hero")}</b> ${isMe ? '<span class="tag" style="background:var(--accent);color:#fff">YOU</span>' : ''}<br>
        <span class="stat-line" style="font-size:0.8rem">${esc(c.identity?.kin||"")} ${esc(c.identity?.profession||"")}</span></div>
        <div style="text-align:right"><b>❤️ ${c.state?.hp}/${c.derived?.hpMax} · ⚡ ${c.state?.wp}/${c.derived?.wpMax}</b>
        ${conds ? `<br><span style="color:var(--bad);font-size:0.8rem">⚠ ${esc(conds)}</span>` : ''}</div>
      </div>`;
    }).join("");
    const bannerEl = el(`<div class="panel" style="border-color:var(--accent);background:rgba(122,46,29,0.05);margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <h3 style="margin:0">🛡️ Party Roster (${esc(Sync.campaign.name)})</h3>
        <span class="tag code">${esc(Sync.campaign.joinCode)}</span>
      </div>
      <div style="margin-top:8px">${items}</div>
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
    home() {
      const chars = Store.list();
      let body;
      if (!chars.length) {
        body = `
          <div class="panel">
            <div class="empty">
              <div class="big">⚔</div>
              <h2>No heroes yet</h2>
              <p class="stat-line">Create a character to begin your adventures in the Misty Vale.</p>
            </div>
            <button class="btn block" id="new-hero">Forge a new hero</button>
            <p></p>
            <button class="btn ghost block" id="use-pregen">Use a pre-generated hero</button>
          </div>`;
      } else {
        const inPartyCamp = typeof Sync !== "undefined" && Sync.enabled && Sync.campaign;
        const myChars = inPartyCamp
          ? chars.filter(c => !c.owner || c.owner === Sync.uid || c.campaignId !== Sync.campaign.id)
          : chars;

        const renderCard = (c) => {
          const inParty = inPartyCamp && c.campaignId === Sync.campaign.id;
          const iconBtn = inPartyCamp
            ? `<button class="btn secondary step btn-toggle-party" data-id="${esc(c.id)}" style="font-size:0.75rem;padding:3px 10px;border-radius:4px;flex-shrink:0" type="button" title="${inParty ? "In Party (Click to make private)" : "Private (Click to share with party)"}">${inParty ? "🛡️ In Party" : "⚡ Private"}</button>`
            : "";
          return `
            <div class="card" data-id="${esc(c.id)}" style="cursor:pointer;display:flex;flex-direction:column;align-items:stretch">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%">
                <h3 style="margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.identity?.name || "Unnamed")}</h3>
                ${iconBtn}
              </div>
              <div class="meta" style="margin-top:4px">${esc(c.identity?.kin || "—")} · ${esc(c.identity?.profession || "—")}${c.identity?.age ? " · " + esc(c.identity.age) : ""}</div>
            </div>`;
        };

        const myCards = myChars.map(renderCard).join("");

        body = `
          ${sectionTitle("Your heroes")}
          <div class="card-grid">${myCards || '<p class="stat-line" style="padding:8px">No heroes created by you yet.</p>'}</div>
          <p></p>
          <button class="btn block" id="new-hero">Forge a new hero</button>
          <p></p>
          <button class="btn ghost block" id="use-pregen">Use a pre-generated hero</button>`;
      }
      const root = el(`<div>${body}</div>`);
      const pb = renderPartyBanner(); if (pb) root.insertBefore(pb, root.firstChild);
      root.querySelector("#new-hero").addEventListener("click", () => Wizard.start());
      root.querySelector("#use-pregen").addEventListener("click", () => Pregens.open());
      root.querySelectorAll(".card[data-id]").forEach((card) =>
        card.addEventListener("click", (e) => {
          if (e.target.closest(".btn-toggle-party")) return;
          Sheet.open(card.dataset.id);
        }));
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
          <div class="panel" style="margin-bottom:12px;padding:10px">
            <input type="text" id="rules-search" class="input" placeholder="🔍 Search rules, spells, gear, journeys..." style="width:100%;font-size:1.1rem;padding:10px">
          </div>
          <div id="rules-acc-wrap" style="display:flex;flex-direction:column;gap:8px"></div>
        </div>`);

      const cats = [
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
        const acc = el(`<details class="rule-accordion" data-cat="${key}" style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 12px;overflow:hidden">
          <summary style="font-size:1.25rem;font-weight:bold;cursor:pointer;padding:6px 0;list-style:none;display:flex;justify-content:space-between;align-items:center">
            <span>${label}</span><span style="font-size:0.9rem;color:var(--muted)">▼</span>
          </summary>
          <div class="rule-content" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">${contentHtml}</div>
        </details>`);
        accWrap.appendChild(acc);
      });

      const sInp = root.querySelector("#rules-search");
      sInp.oninput = (e) => {
        const q = e.target.value.toLowerCase().trim();
        root.querySelectorAll("details.rule-accordion").forEach(acc => {
          if (!q) {
            acc.style.display = "";
            acc.open = false;
          } else {
            const text = acc.textContent.toLowerCase();
            const match = text.includes(q);
            acc.style.display = match ? "" : "none";
            if (match) acc.open = true;
          }
        });
      };

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
              <button class="btn secondary" id="btn-export">Export heroes (JSON)</button>
              <button class="btn secondary" id="btn-import">Import heroes (JSON)</button>
              <button class="btn ghost" id="btn-clear" style="color:var(--bad)">Clear all storage</button>
            </div>
            <input type="file" id="file-import" accept=".json" style="display:none">
          </div>
        </div>`);

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
        const authLine = `<p class="stat-line"><b>Identity:</b> ${esc(authName)} ${Sync.user?.isAnonymous ? `<button class="btn ghost small" id="link-google" style="margin-left:8px;padding:2px 8px;font-size:0.8rem">🔗 Link Google</button>` : '✓ Google Linked'}</p>`;
        syncPanel.appendChild(el(authLine));
        if (Sync.user?.isAnonymous) {
          syncPanel.querySelector("#link-google").onclick = () => Sync.linkGoogle();
        }

        if (!Sync.campaign) {
          const createRow = el(`<div style="margin-top:8px"><button class="btn secondary block" id="btn-create-camp">⚡ Create New Party Campaign</button></div>`);
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
          const campInfo = el(`<div style="margin-top:8px;padding:8px;background:var(--bg);border-radius:6px;border-left:4px solid var(--accent)">
            <b>Active Campaign:</b> ${esc(Sync.campaign.name)}<br>
            <b>Join Code:</b> <code style="font-size:1.1rem;color:var(--accent)">${esc(Sync.campaign.joinCode)}</code><br>
            <span class="stat-line" style="font-size:0.85rem">Share this code with players so they can join your party.</span>
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
    if (key === "stages") {
      html = `<div class="panel" style="border-left:4px solid var(--accent)">
        <h3>Core Gameplay Loop &amp; Stages</h3>
        <details style="margin-bottom:8px" open><summary style="cursor:pointer"><b>⏱️ Time Scales (Rounds vs Shifts)</b></summary>
          <p class="stat-line" style="margin-top:4px">· <b>Combat Rounds:</b> Roughly 10 seconds. Every combatant gets 1 Turn (Action + Movement).<br>· <b>Wilderness Shifts:</b> Roughly 6 hours (Morning, Day, Evening, Night).</p>
        </details>
        <details style="margin-bottom:8px"><summary style="cursor:pointer"><b>⚔️ Combat Stage Sequence</b></summary>
          <p class="stat-line" style="margin-top:4px">1. <b>Draw Initiative:</b> 1 to 10 ascending.<br>2. <b>Take Turns:</b> Move + Action (Attack, Cast, Dash, Rally).<br>3. <b>Reaction:</b> Parry or Evade (spends your upcoming action).<br>4. <b>End Round:</b> Redraw cards if needed.</p>
        </details>
        <details style="margin-bottom:8px"><summary style="cursor:pointer"><b>🎲 Core D20 Mechanic &amp; Pushing</b></summary>
          <p class="stat-line" style="margin-top:4px">Roll D20 ≤ Skill level. 1 is Dragon (Critical), 20 is Demon (Mishap). If you fail, you can <b>Push</b> the roll by accepting a Condition Bane (Exhausted, Battered, etc.).</p>
        </details>
      </div>`;
    } else if (key === "journeys") {
      html = `<div class="panel" style="border-left:4px solid var(--ok)">
        <h3>Wilderness Journeys &amp; Travel</h3>
        <p class="stat-line"><b>Time Measurement:</b> In wilderness, time is measured in <b>Shifts</b> (Morning, Day, Evening, Night — ~6h each). Travel speed: 1 node/hex per shift.</p>
        <p><b>⛺ Camp &amp; Rest:</b> Making camp requires a Bushcraft check. Success lets party rest (Shift rest = restore full HP/WP). Failure means no rest &amp; roll on Mishap Table.</p>
        <p><b>🍄 Foraging &amp; Hunting:</b> Spend a shift making Bushcraft/Hunting checks to gather rations.</p>
        <h4 style="margin:8px 0 4px 0;color:var(--bad)">🎲 Journey Mishaps (D6)</h4>
        <p class="stat-line">1: Sudden Downpour (cold condition) · 2: Spoiled Rations · 3: Wild Beast Attack · 4: Lost Way · 5: Broken Gear · 6: Restless Spirits (fear condition)</p>
      </div>`;
    } else if (key === "kin") {
      html = (DB.kin || []).map((k) => `
        <div class="panel">
          <h3>${esc(k.name)} <span class="tag">Move ${k.movement}</span></h3>
          ${(k.abilities || []).map((a) => `<p><b>${esc(a.name)}</b> ${a.wp ? `<span class="tag">WP ${a.wp}</span>` : `<span class="tag">No WP</span>`}<br><span class="stat-line">${esc(a.text)}</span></p>`).join("")}
        </div>`).join("");
    } else if (key === "professions") {
      html = (DB.professions || []).map((p) => `
        <div class="panel">
          <h3>${esc(p.name)} <span class="tag">${esc(p.keyAttribute)}</span></h3>
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
        return `<details class="panel rule-accordion" style="margin-bottom:10px;padding:12px"><summary style="font-size:1.15rem;font-weight:bold;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center"><span>🧙‍♂️ ${esc(pool.name || labels[k] || Magic.cap(k))}</span><span>${isNew ? '<span class="tag">Book of Magic</span> ' : ""}<span class="tag">${(pool.tricks||[]).length + (pool.spells||[]).length}</span></span></summary><div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)">${pool.entry ? `<p class="stat-line" style="margin-bottom:10px"><i>${esc(pool.entry)}</i></p>` : ""}${tricks ? `<details open style="margin-bottom:8px;background:var(--bg);padding:8px;border-radius:6px;border:1px solid var(--line)"><summary style="font-weight:bold;cursor:pointer">✨ Magic Tricks (${(pool.tricks||[]).length})</summary><div style="margin-top:8px">${tricks}</div></details>` : ""}${spells ? `<details style="background:var(--bg);padding:8px;border-radius:6px;border:1px solid var(--line)"><summary style="font-weight:bold;cursor:pointer">📖 Ranked Spells (${(pool.spells||[]).length})</summary><div style="margin-top:8px">${spells}</div></details>` : ""}</div></details>`;
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
              <div class="panel"><h3>Armor</h3>${a}<h3 style="margin-top:10px">Helmets</h3>${h}</div>`;
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
