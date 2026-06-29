/* sheet.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $, CORE_SCHOOLS, DB, Dice, MAGICX, el, esc, uid } from './core.js';
import { confirmModal, modal, promptModal, showToast } from './ui.js';
import { Calc, classifyItem, heroicReqMet, resolveEquippedWeapons } from './rules.js';
import { applyInvoluntaryConditionTo, effHpMax, effWpMax, encLimit, encUsed, isConcentration, isSummonSpell, isTrackableSpell, lightDieFor, normalizeInventory } from './derived.js';
import { Magic, Settings } from './settings.js';
import { Store } from './store.js';
import { Sync } from './sync.js';
import { SpellAutomation } from './spell-automation.js';
import { Roller } from './roller.js';
import { Combat } from './combat.js';
import { Router } from './router.js';

export const Sheet = {
    id: null,
    open(id) {
      const c = Store.get(id);
      if (!c) { Router.go("home"); return; }
      normalizeInventory(c); Store.update(id, normalizeInventory);
      this.id = id; window.activeCharacterId = id; this.render();
    },
    mutate(fn) {
      const c = Store.get(this.id);
      const inPartyCamp = typeof Sync !== "undefined" && Sync.enabled && Sync.campaign;
      const canEdit = !inPartyCamp || !c?.owner || c.owner === Sync.uid || Sync.campaign.role === "gm";
      if (!canEdit) return;
      Store.update(this.id, fn);
      this.render();
    },
    uploadPortrait() {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*";
      inp.onchange = (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxDim = 400;
            let w = img.width, h = img.height;
            if (w > h) { if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; } }
            else { if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; } }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL("image/webp", 0.82);
            if (typeof Sync !== "undefined" && Sync.enabled && Sync.storage && Sync.campaign) {
              canvas.toBlob((blob) => {
                const ref = Sync.storage.ref(`portraits/${Sync.campaign.id}/${this.id}.webp`);
                ref.put(blob).then(() => ref.getDownloadURL()).then((url) => {
                  this.mutate((ch) => { ch.identity.portraitUrl = url; });
                }).catch(() => {
                  this.mutate((ch) => { ch.identity.portraitUrl = dataUrl; });
                });
              }, "image/webp", 0.82);
            } else {
              this.mutate((ch) => { ch.identity.portraitUrl = dataUrl; });
            }
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      };
      inp.click();
    },
    toast(msg, type) { return showToast(msg, type); },
    rest(kind) {
      const gm = Settings.gmAutomation();
      const cg = Store.get(this.id);
      const deprived = gm && (cg.state.awakeShifts || 0) >= 3; // sleep deprivation blocks WP/condition recovery
      if (kind === "round") {
        // Round rest is once per shift (core rule — not just GM automation).
        if (cg.state.roundRestUsed) { this.toast("Round rest already used this shift — take a stretch or shift rest."); return; }
        if (deprived) { this.toast("Too sleep-deprived to recover WP — sleep (shift rest)."); return; }
        const w = Dice.roll("D6");
        this.mutate((ch) => { ch.state.wp = Math.min(effWpMax(ch), ch.state.wp + w); ch.state.roundRestUsed = true; });
        this.toast(`Round rest: +${w} WP (used this shift).`);
      } else if (kind === "shift") {
        this.mutate((ch) => { ch.state.hp = effHpMax(ch); ch.state.wp = effWpMax(ch); ch.state.conditions = {}; ch.state.deathRolls = { successes: 0, failures: 0 }; ch.state.roundRestUsed = false; ch.state.stretchRestUsed = false; if (gm) { ch.state.awakeShifts = 0; } });
        this.toast("Shift rest: full HP & WP, all conditions cleared." + (gm ? " Sleep resets deprivation." : ""));
        const cur = Store.get(this.id);
        if ((cur?.spells?.known || []).length > 0) {
          const m = modal("🧙‍♂️ Shift Rest: Prepare Grimoire Spells");
          m.body.appendChild(el(`<p class="stat-line">You completed a full Shift Rest. Review your Grimoire and check the spells you wish to keep <b>Prepared</b> (unprepared spells take double time to cast):</p>`));
          const listDiv = el(`<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px"></div>`);
          cur.spells.known.forEach((sp, i) => {
            const isPrep = sp.prepared !== false;
            const row = el(`<label style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-raised);border-radius:6px;border:1px solid var(--line);cursor:pointer">
              <input type="checkbox" ${isPrep ? "checked" : ""}>
              <div><b>${esc(sp.name)}</b> <span class="tag">Rank ${sp.rank || 1}</span><br><small class="stat-line">${esc(sp.text||sp.desc||"")}</small></div>
            </label>`);
            row.querySelector("input").onchange = (e) => {
              Store.update(this.id, ch => { ch.spells.known[i].prepared = e.target.checked; });
              this.render();
            };
            listDiv.appendChild(row);
          });
          m.body.appendChild(listDiv);
        }
      } else { // stretch (once per shift; HEALING assist + Inner Peace + Fast Healer)
        if (cg.state.stretchRestUsed) { this.toast("Stretch rest already used this shift — take a shift rest."); return; }
        const hasInnerPeace = (cg.abilities || []).some((a) => a.name === "Inner Peace");
        const hasFastHealer = (cg.abilities || []).some((a) => a.name === "Fast Healer");
        const m = modal("Stretch rest");
        const info = el(`<p class="stat-line">Heals D6 HP and D6 WP, and lets you recover one condition.${hasFastHealer ? " <b>Fast Healer:</b> +D6 HP." : ""}${hasInnerPeace ? " <b>Inner Peace:</b> +D6 HP, +D6 WP, and +1 condition." : ""}${deprived ? " <b style='color:var(--bad)'>Sleep-deprived — no WP or condition recovery.</b>" : ""}</p>`);
        const assistLbl = el(`<label style="display:flex;align-items:center;gap:6px;margin:6px 0;cursor:pointer"><input type="checkbox"> Tended by an ally (successful HEALING roll) → heal 2D6 HP instead of D6</label>`);
        const restBtn = el(`<button class="btn block" style="margin-top:8px">Rest</button>`);
        const out = el(`<div class="roll-result" role="status" aria-live="polite" style="margin-top:10px"></div>`);
        restBtn.onclick = () => {
          restBtn.disabled = true; restBtn.style.opacity = "0.4";
          const assisted = assistLbl.querySelector("input").checked;
          let hp = Dice.roll(assisted ? "2D6" : "D6");
          let wp = deprived ? 0 : Dice.roll("D6");
          let condHeals = deprived ? 0 : 1;
          const notes = [`+${hp} HP`];
          if (hasFastHealer) { const fh = Dice.roll("D6"); hp += fh; notes[0] = `+${hp} HP`; }
          if (hasInnerPeace && !deprived) { const ip = Dice.roll("D6"); hp += ip; const ipw = Dice.roll("D6"); wp += ipw; notes[0] = `+${hp} HP`; condHeals += 1; }
          if (!deprived) notes.push(`+${wp} WP`);
          this.mutate((ch) => { ch.state.hp = Math.min(effHpMax(ch), ch.state.hp + hp); ch.state.wp = Math.min(effWpMax(ch), ch.state.wp + wp); ch.state.stretchRestUsed = true; });
          out.innerHTML = `<p class="outcome ok">Stretch rest: ${notes.join(", ")}.${deprived ? " Sleep-deprived → no WP/condition recovery." : ""}</p>`;
          // Condition recovery (up to condHeals) — a stable header + chip area.
          let remaining = condHeals;
          const condHdr = el(`<p class="stat-line" style="margin:6px 0 2px"></p>`);
          const cw = el(`<div class="chip-wrap"></div>`);
          out.append(condHdr, cw);
          const renderConds = () => {
            cw.innerHTML = "";
            const cur = Store.get(this.id);
            const held = (DB.conditions || []).filter((cn) => cur.state.conditions[cn.key]);
            if (!remaining || !held.length) { condHdr.style.display = "none"; return; }
            condHdr.style.display = ""; condHdr.textContent = `Recover ${remaining} condition${remaining > 1 ? "s" : ""}:`;
            held.forEach((cn) => {
              const chip = el(`<button class="skill-chip cond-on">${esc(cn.name)}</button>`);
              chip.onclick = () => { Store.update(this.id, (ch) => { ch.state.conditions[cn.key] = false; }); remaining--; renderConds(); };
              cw.appendChild(chip);
            });
          };
          renderConds();
        };
        m.body.append(info, assistLbl, restBtn, out);
      }
    },
    // ---- Advanced / GM Automation (Phase 18; gated by Settings.gmAutomation) ----
    advanceClock(unit) {
      if (unit === "round") { this.mutate((ch) => { ch.state.time.round++; }); this.toast("Round +1."); return; }
      if (unit === "stretch") { this.mutate((ch) => { ch.state.time.stretch++; }); this.lightStretch(); return; }
      // shift
      let drained = 0, dep = false;
      this.mutate((ch) => {
        ch.state.time.shift++;
        ch.state.roundRestUsed = false;
        ch.state.stretchRestUsed = false;
        ch.state.awakeShifts = (ch.state.awakeShifts || 0) + 1;
        if (ch.state.awakeShifts >= 3) { dep = true; drained = Dice.roll("D6"); ch.state.wp = Math.max(0, ch.state.wp - drained); }
      });
      this.toast(dep ? `Shift +1 — sleep-deprived (${Store.get(this.id).state.awakeShifts} shifts): −${drained} WP.` : "Shift +1 (stayed awake — sleep with a shift rest).");
    },
    lightStretch() {
      const c = Store.get(this.id);
      const lit = (c.inventory.items || []).map((it, i) => ({ it, i })).filter((x) => x.it.lit && lightDieFor(x.it.name));
      if (!lit.length) { this.toast("Stretch +1. No lit light sources to roll."); return; }
      const m = modal("Light burn-out — roll each lit source");
      m.body.appendChild(el(`<p class="stat-line">Each stretch, roll a lit source's die; on a <b>1</b> it goes out.</p>`));
      lit.forEach(({ it, i }) => {
        const die = lightDieFor(it.name);
        const row = el(`<div class="inv-row"><span class="inv-name">${esc(it.name)} <span class="tag">D${die}</span></span></div>`);
        const out = el(`<span class="stat-line"></span>`);
        const b = el(`<button class="step" style="width:auto;padding:0 8px">Roll D${die}</button>`);
        b.onclick = () => { const r = Dice.d(die); if (r === 1) { this.mutate((ch) => { ch.inventory.items[i].lit = false; }); out.innerHTML = `<b style="color:var(--bad)">${r} — went out!</b>`; b.disabled = true; } else { out.innerHTML = `${r} — still burning`; } };
        row.append(b, out); m.body.appendChild(row);
      });
    },
    fearAttack() {
      const c = Store.get(this.id);
      const wil = c.attributes.WIL;
      const fearless = (c.abilities || []).some((a) => a.name === "Fearless");
      const m = modal("Fear attack — WIL roll");
      const out = el(`<div class="roll-result" role="status" aria-live="polite"></div>`);
      if (fearless) { m.body.append(el(`<p class="outcome ok">Fearless — you automatically resist fear (no roll).</p>`)); return; }
      const btn = el(`<button class="btn block">Roll d20 ≤ WIL ${wil}</button>`);
      btn.onclick = () => {
        btn.disabled = true; btn.style.opacity = "0.4";
        const r = Dice.d(20), ok = r <= wil;
        if (ok) { out.innerHTML = `<p class="outcome ok">${r} vs WIL ${wil} — you resist the fear.</p>`; return; }
        const tbl = DB.fearTable || []; const fr = Dice.d(6); const row = tbl.find((x) => x.d6 === fr) || tbl[0];
        let label = "";
        this.mutate((ch) => { label = applyInvoluntaryConditionTo(ch, "scared"); });
        out.innerHTML = `<p class="outcome bad">${r} vs WIL ${wil} — fear takes hold! ${esc(label)}.</p><p class="notice" style="border-color:var(--bad)">Fear table (D6=${fr}): ${esc(row ? row.effect : "")}</p>`;
      };
      m.body.append(el(`<p class="stat-line">A fear attack forces a WIL roll; failure applies Scared and a fear-table result.</p>`), btn, out);
    },
    afflictionRoll(kind) {
      const c = Store.get(this.id);
      const con = c.attributes.CON;
      const m = modal(`${kind === "cold" ? "Cold" : "Disease"} — CON roll`);
      const out = el(`<div class="roll-result" role="status" aria-live="polite"></div>`);
      const btn = el(`<button class="btn block">Roll d20 ≤ CON ${con}</button>`);
      btn.onclick = () => {
        btn.disabled = true; btn.style.opacity = "0.4";
        const r = Dice.d(20), ok = r <= con;
        if (ok) { out.innerHTML = `<p class="outcome ok">${r} vs CON ${con} — you resist.</p>`; return; }
        const dmg = Dice.roll("D6");
        let label = "";
        this.mutate((ch) => { ch.state.hp = Math.max(0, ch.state.hp - dmg); label = applyInvoluntaryConditionTo(ch, "sickly"); });
        out.innerHTML = `<p class="outcome bad">${r} vs CON ${con} — failed! −${dmg} HP; ${esc(label)}.</p>`;
      };
      m.body.append(el(`<p class="stat-line">While afflicted, roll CON each interval; failure deals D6 damage and applies Sickly.</p>`), btn, out);
    },
    // Concentration interruption: when a concentrating caster takes damage, a
    // WIL roll is required to maintain each active concentration effect.
    concentrationCheck() {
      const c = Store.get(this.id);
      if (!Settings.gmAutomation()) return;
      const conc = (c.effects || []).filter((fx) => fx.concentration);
      if (!conc.length) return;
      const wil = c.attributes.WIL;
      const m = modal("Concentration interrupted — WIL roll");
      m.body.appendChild(el(`<p class="stat-line">You took damage while concentrating. Roll WIL (≤ ${wil}) to maintain each effect; failure ends it.</p>`));
      conc.forEach((fx) => {
        const row = el(`<div class="inv-row"><span class="inv-name">${esc(fx.name)}</span></div>`);
        const out = el(`<span class="stat-line"></span>`);
        const b = el(`<button class="step" style="width:auto;padding:0 8px">Roll WIL</button>`);
        b.onclick = () => { b.disabled = true; const r = Dice.d(20), ok = r <= wil; if (ok) { out.innerHTML = `${r} — maintained`; } else { this.mutate((ch) => { const i = (ch.effects || []).findIndex((e) => e.id === fx.id); if (i >= 0) ch.effects.splice(i, 1); }); out.innerHTML = `<b style="color:var(--bad)">${r} — concentration broken</b>`; } };
        row.append(b, out); m.body.appendChild(row);
      });
    },
    deathRoll(targetId) { this.deathRollModal(targetId); },
    deathRollModal(targetId) {
      const cid = typeof targetId === "string" ? targetId : this.id;
      const c = Store.get(cid);
      if (!c) return;
      const inPartyCamp = typeof Sync !== "undefined" && Sync.enabled && Sync.campaign;
      const canEdit = !inPartyCamp || !c.owner || c.owner === Sync.uid || Sync.campaign.role === "gm";
      if (!canEdit) { this.toast("🔒 Read-Only: You cannot roll for another player's hero."); return; }

      const con = c.attributes.CON;
      const m = modal(`💀 Death Roll — ${c.identity.name}`);
      const dr = c.state.deathRolls || { successes: 0, failures: 0 };
      const dots = (n, cls) => Array.from({length:3}, (_,i)=>`<span class="dr-dot ${i<n?cls:""}"></span>`).join("");
      
      const head = el(`<p class="stat-line">Roll D20 vs CON <b>${con}</b> (roll ≤ CON = success).<br>3 successes → stabilize (+D6 HP). 3 failures → death.<br>Dragon (1) = 2 successes; Demon (20) = 2 failures.</p>
        <p class="stat-line cur-dr">Successes <span class="dr-dots">${dots(dr.successes,"ok")}</span> &nbsp; Failures <span class="dr-dots">${dots(dr.failures,"bad")}</span></p>`);
      const btn = el(`<button class="btn block" style="margin-top:12px">Roll Death Roll</button>`);
      const out = el(`<div class="roll-result" style="margin-top:14px"></div>`);

      btn.onclick = () => {
        btn.disabled = true; btn.style.opacity = "0.4";
        const roll = Dice.d(20);
        const dragon = roll === 1, demon = roll === 20;
        const success = roll <= con;
        let stabilized = false, dead = false, recovered = 0;
        let sCount = 0, fCount = 0;

        Store.update(cid, (ch) => {
          const curDr = ch.state.deathRolls || { successes: 0, failures: 0 };
          if (dragon) curDr.successes += 2; else if (demon) curDr.failures += 2; else if (success) curDr.successes += 1; else curDr.failures += 1;
          curDr.successes = Math.min(3, curDr.successes || 0);
          curDr.failures = Math.min(3, curDr.failures || 0);
          sCount = curDr.successes; fCount = curDr.failures;
          if (curDr.failures >= 3) { dead = true; ch.state.deathRolls = curDr; }
          else if (curDr.successes >= 3) { stabilized = true; recovered = Dice.roll("D6"); ch.state.hp = recovered; ch.state.rallied = false; ch.state.deathRolls = { successes: 0, failures: 0 }; }
          else ch.state.deathRolls = curDr;
        });

        if (this.id === cid) this.render();
        if (typeof Combat !== "undefined" && $("#app-nav button[data-route='party']")?.classList.contains("active")) {
          Combat.rerender();
        }

        let html = `<div class="dice-faces"><span class="die used">${roll}</span></div>`;
        html += `<p class="outcome ${success ? "ok" : "bad"}">${dragon ? "🐉 DRAGON (2 Successes!)" : demon ? "👹 DEMON (2 Failures!)" : success ? "Success" : "Failure"}</p>`;
        if (stabilized) {
          html += `<p class="stat-line" style="color:var(--ok);font-size:1.1rem"><b>✨ Stabilized! Recovered ${recovered} HP!</b></p>`;
        } else if (dead) {
          html += `<p class="stat-line" style="color:var(--bad);font-size:1.1rem"><b>💀 Your hero has succumbed to their wounds.</b></p>`;
        } else {
          html += `<p class="stat-line" style="margin-top:8px">Successes <span class="dr-dots">${dots(sCount,"ok")}</span> &nbsp; Failures <span class="dr-dots">${dots(fCount,"bad")}</span></p>`;
        }
        out.innerHTML = html;
        if (head.querySelector(".cur-dr")) head.querySelector(".cur-dr").style.display = "none";
      };

      m.body.append(head, btn, out);
    },
    movementModal(targetId) {
      const cid = typeof targetId === "string" ? targetId : this.id;
      const c = Store.get(cid);
      if (!c) return;
      const inPartyCamp = typeof Sync !== "undefined" && Sync.enabled && Sync.campaign;
      const canEdit = !inPartyCamp || !c.owner || c.owner === Sync.uid || Sync.campaign.role === "gm";
      if (!canEdit) { this.toast("🔒 Read-Only: You cannot move another player's hero."); return; }

      const m = modal(`🏃 Movement Pool — ${c.identity.name}`);
      const refreshModal = () => {
        const cur = Store.get(cid);
        if (!cur) { m.close(); return; }
        m.body.innerHTML = "";
        m.body.appendChild(this.buildMovementDOM(cur, refreshModal));
        if (this.id === cid) this.render();
      };
      refreshModal();
    },
    buildMovementDOM(c, onChange) {
      const baseMove = c.derived?.movement || 10;
      if (typeof c.state.moveSpent !== "number") c.state.moveSpent = 0;
      if (typeof c.state.isDashing !== "boolean") c.state.isDashing = false;
      if (typeof c.state.isMounted !== "boolean") c.state.isMounted = false;

      const calcMaxMove = () => {
        let m = c.state.isMounted ? 20 : baseMove;
        if (c.abilities?.some(x => x.name === "Longstrider")) m *= 2;
        if (c.state.isDashing) m *= 2;
        return m;
      };
      const maxMove = calcMaxMove();
      const remMove = Math.max(0, maxMove - c.state.moveSpent);

      const panel = el(`<div class="move-panel" style="background:var(--card-bg);border:1px solid var(--border);border-radius:8px;padding:12px;margin:8px 0">
        <div class="move-meter" style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed var(--border);padding-bottom:8px;margin-bottom:10px">
          <span>🏃 <b>Movement Pool:</b> <small style="color:var(--muted)">(Rating ${baseMove}m)</small></span>
          <span class="move-val" style="font-size:1.3rem;font-weight:bold;color:${remMove===0?"var(--bad)":"var(--accent)"}">${remMove}m / ${maxMove}m</span>
        </div>
        
        <p class="stat-line" style="margin:0 0 10px 0;font-size:0.85rem">
          💡 <b>Splitting:</b> Move freely before, after, or during action. Unused meters cannot be saved for later rounds.
        </p>

        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
            <button type="button" class="move-btn ${c.state.isDashing ? "active" : ""}" title="Action: Dash. Doubles pool for round & uses Action.">⚡ Dash ${c.state.isDashing ? "(2x)" : ""}</button>
            <button type="button" class="move-btn ${c.state.isMounted ? "active" : ""}" title="Mounted speed 20m">🐴 Mount</button>
            <button type="button" class="move-btn ${c.state.prone ? "active" : ""}" title="Free action on own turn">🛌 ${c.state.prone ? "Prone" : "Stand"}</button>
            <button type="button" class="move-btn" style="background:rgba(200,50,50,0.1);border-color:var(--bad)" title="Reset pool for new round">↺ Reset</button>
          </div>

          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span style="font-size:0.8rem;font-weight:bold;color:var(--muted);min-width:60px;white-space:nowrap;flex:0 0 auto">WALK:</span>
            <button type="button" class="move-btn" style="flex:1" title="Step 1 meter">+1m</button>
            <button type="button" class="move-btn" style="flex:1" title="Step 2 meters (1 grid square)">+2m</button>
            <button type="button" class="move-btn" style="flex:1" title="Step 4 meters">+4m</button>
          </div>

          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span style="font-size:0.8rem;font-weight:bold;color:var(--muted);min-width:60px;white-space:nowrap;flex:0 0 auto">HAZARDS:</span>
            <button type="button" class="move-btn" style="flex:1;color:#b46428;border-color:#b46428" title="Passing closed unlocked door consumes ½ total pool">🚪 Door (−½)</button>
            <button type="button" class="move-btn" style="flex:1;color:#2878b4;border-color:#2878b4" title="Water halves speed (costs 2m pool per 1m moved)">🌊 Water (+1m)</button>
            <button type="button" class="move-btn" style="flex:1;color:#784696;border-color:#784696" title="Leap horizontal gap (≤¼ auto, ≤½ Acrobatics check)">🤸 Leap</button>
          </div>

          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span style="font-size:0.8rem;font-weight:bold;color:var(--muted);min-width:60px;white-space:nowrap;flex:0 0 auto">TACTICS:</span>
            <button type="button" class="move-btn" style="flex:1;color:#964646;border-color:#964646" title="Rough terrain check (Acrobatics). Fail = Prone & lose pool">🪨 Rough check</button>
            <button type="button" class="move-btn" style="flex:1;color:var(--bad);border-color:var(--bad)" title="Voluntarily leaving enemy reach (within 2m) requires Evade check">⚔️ Disengage</button>
            <button type="button" class="move-btn" style="flex:1;color:var(--ok);border-color:var(--ok)" title="Free immediate 2m move after successful dodge/parry">🛡️ Reaction Move</button>
          </div>

          <div style="display:flex;justify-content:flex-end">
            <button type="button" class="move-btn" style="flex:0 0 auto;color:var(--muted);border-color:var(--border);font-size:0.75rem;padding:4px 8px" title="Forced reaction before turn replaces normal turn & movement">💥 Lost Turn (Reaction)</button>
          </div>
        </div>
      </div>`);

      const doMutate = (fn) => {
        Store.update(c.id, fn);
        if (typeof onChange === "function") onChange();
        // Only re-render the combat tracker when it is actually on screen (e.g.
        // the movement modal opened over it). When the character SHEET is shown
        // — even with the nav still on "party" after opening the sheet from
        // combat — re-rendering combat would replace the sheet, making the
        // movement buttons look unresponsive.
        if (typeof Combat !== "undefined" && document.querySelector("#screen .combat-row")) {
          Combat.rerender();
        }
      };

      const btns = panel.querySelectorAll(".move-btn");
      // 0: Dash
      btns[0].onclick = () => doMutate(ch => {
        ch.state.isDashing = !ch.state.isDashing;
        if (ch.state.isDashing && typeof Combat !== "undefined") {
          const comb = Combat.load();
          const ref = comb?.combatants?.find(x => x.charId === ch.id);
          if (ref) { ref.acted = true; Combat.save(comb); }
        }
      });
      // 1: Mount
      btns[1].onclick = () => doMutate(ch => { ch.state.isMounted = !ch.state.isMounted; });
      // 2: Prone/Stand
      btns[2].onclick = () => doMutate(ch => { ch.state.prone = !ch.state.prone; });
      // 3: Reset
      btns[3].onclick = () => doMutate(ch => { ch.state.moveSpent = 0; ch.state.isDashing = false; });
      // 4: +1m
      btns[4].onclick = () => doMutate(ch => { ch.state.moveSpent = Math.min(calcMaxMove(), (ch.state.moveSpent || 0) + 1); });
      // 5: +2m
      btns[5].onclick = () => doMutate(ch => { ch.state.moveSpent = Math.min(calcMaxMove(), (ch.state.moveSpent || 0) + 2); });
      // 6: +4m
      btns[6].onclick = () => doMutate(ch => { ch.state.moveSpent = Math.min(calcMaxMove(), (ch.state.moveSpent || 0) + 4); });
      // 7: Door
      btns[7].onclick = () => doMutate(ch => {
        const half = Math.ceil(calcMaxMove() / 2);
        if (calcMaxMove() - (ch.state.moveSpent || 0) < half) {
          showToast("🚪 Not enough movement left to pass through the door! You stop directly in front of it.", "error");
        }
        ch.state.moveSpent = Math.min(calcMaxMove(), (ch.state.moveSpent || 0) + half);
      });
      // 8: Water
      btns[8].onclick = () => doMutate(ch => { ch.state.moveSpent = Math.min(calcMaxMove(), (ch.state.moveSpent || 0) + 2); });
      // 9: Leap
      btns[9].onclick = async () => {
        const raw = await promptModal(`Leap distance (m)?\n• ≤ ¼ pool (${(maxMove/4).toFixed(1)}m): Free/Auto.\n• ≤ ½ pool (${(maxMove/2).toFixed(1)}m): Requires Acrobatics check.\n• > ½ pool: Too far!`, { title: "🤸 Leap", inputType: "number", placeholder: "metres", okText: "Leap" });
        if (raw == null) return;
        const d = parseFloat(raw);
        if (isNaN(d) || d <= 0) return;
        if (d > maxMove / 2) {
          showToast(`❌ Too far! You cannot leap more than half your movement rate (${(maxMove/2).toFixed(1)}m).`, "error");
          return;
        }
        doMutate(ch => { ch.state.moveSpent = Math.min(calcMaxMove(), (ch.state.moveSpent || 0) + d); });
        if (d > maxMove / 4) {
          Roller.skill(c.id, "Acrobatics", {
            onRoll: (success) => {
              if (!success) showToast("💥 Leap failed! You fall short into the gap/hazard!", "error");
            }
          });
        } else {
          this.toast(`🤸 Leap ${d}m — automatic success!`);
        }
      };
      // 10: Rough check
      btns[10].onclick = () => {
        Roller.skill(c.id, "Acrobatics", {
          onRoll: (success) => {
            if (!success) {
              doMutate(ch => { ch.state.prone = true; ch.state.moveSpent = calcMaxMove(); });
              showToast("💥 Failed! You trip and fall prone, instantly losing all remaining movement pool this round.", "error");
            } else {
              this.toast("✅ Success! You navigate the rough terrain safely.");
            }
          }
        });
      };
      // 11: Disengage
      btns[11].onclick = () => {
        Roller.skill(c.id, "Evade", {
          onRoll: (success) => {
            if (!success) {
              showToast("🩸 Evade failed! The enemy within reach gets an immediate free attack that cannot be dodged or parried!", "error");
            } else {
              this.toast("✨ Success! You voluntarily walk away from enemy reach without triggering free attacks.");
            }
          }
        });
      };
      // 12: Reaction Move (+2m free)
      btns[12].onclick = () => {
        this.toast("🛡️ Special 2m Reaction Move (successful Dodge/Parry): Free! Does not cost pool or trigger free attacks.");
      };
      // 13: Lost Turn (Reaction)
      btns[13].onclick = () => {
        doMutate(ch => { ch.state.moveSpent = calcMaxMove(); });
        this.toast("💥 Forced reaction before turn: normal turn replaced & regular movement pool lost.");
      };

      return panel;
    },
    addCompanion(name, hpMax, notes) {
      this.mutate((ch) => ch.companions.push({ id: uid(), name, hp: hpMax || 0, hpMax: hpMax || 0, notes: notes || "" }));
      this.toast(`Added ${name} to your companions.`);
    },
    addEffect(name, concentration, notes) {
      this.mutate((ch) => ch.effects.push({ id: uid(), name, concentration: !!concentration, notes: notes || "" }));
      this.toast(`Tracking: ${name}.`);
    },
    // Learn a new spell or school during play (Phase 4B; Dracomancy is gated).
    learnMagic() {
      const c = Store.get(this.id);
      const m = modal("Learn magic");
      const knownSchools = new Set();
      Object.entries(c.skills).forEach(([n, v]) => { if (v.kind === "magic") knownSchools.add(n.toLowerCase()); });
      if (c.spells.castSkill === "Performance") knownSchools.add("harmonism");
      const hasIntSchool = Object.values(c.skills).some((v) => v.kind === "magic" && v.attribute === "INT");
      const hasRank5 = (c.spells.known || []).some((s) => s.rank >= 5);

      // ---- Learn a new school ----
      m.body.appendChild(el(`<p class="section-title"><b>Learn a new school</b></p>`));
      const allSchools = [["animism", "Animism"], ["elementalism", "Elementalism"], ["mentalism", "Mentalism"]]
        .concat(Magic.enabled() ? Object.keys(MAGICX.schools || {}).map((k) => [k, Magic.cap(k)]) : []);
      const schoolWrap = el(`<div class="chip-wrap"></div>`);
      allSchools.forEach(([key, label]) => {
        if (knownSchools.has(key) || key === "harmonism") return;
        if (key === "dracomancy" && !hasRank5) { schoolWrap.appendChild(el(`<span class="skill-chip locked" title="Learn-in-play only: requires mastering another school (a rank-5 spell)">${esc(label)} 🔒</span>`)); return; }
        const chip = el(`<button class="skill-chip">${esc(label)}${CORE_SCHOOLS.includes(key) ? "" : ' <span class="stat-line">BoM</span>'}</button>`);
        chip.onclick = () => { this.mutate((ch) => { const base = Calc.baseChance(ch.attributes.INT); ch.skills[Magic.cap(key)] = { attribute: "INT", kind: "magic", base, level: base * 2, trained: true, mark: false }; }); m.close(); this.toast(`Learned ${label} (trained at ${Calc.baseChance(c.attributes.INT) * 2}).`); };
        schoolWrap.appendChild(chip);
      });
      if (!schoolWrap.children.length) schoolWrap.appendChild(el(`<span class="stat-line">No new schools available${Magic.enabled() ? "" : " — enable Book of Magic in Settings for more"}.</span>`));
      m.body.appendChild(schoolWrap);
      m.body.appendChild(el(`<p class="stat-line">Learning a school normally needs the Magic Talent heroic ability and a teacher. Dracomancy is learn-in-play only and requires mastering another school (a rank-5 spell).</p>`));

      // ---- Learn a spell ----
      m.body.appendChild(el(`<p class="section-title" style="margin-top:14px"><b>Learn a spell</b></p>`));
      const spellSchools = [...knownSchools]; if (hasIntSchool && !spellSchools.includes("general")) spellSchools.push("general");
      if (!spellSchools.length) { m.body.appendChild(el(`<p class="stat-line">Learn a school first.</p>`)); return; }
      const sel = el(`<select></select>`);
      spellSchools.forEach((k) => sel.appendChild(el(`<option value="${k}">${esc(k === "harmonism" ? "Harmonism" : Magic.cap(k))}</option>`)));
      const listWrap = el(`<div style="margin-top:8px"></div>`);
      const renderList = () => {
        listWrap.innerHTML = "";
        const cur = Store.get(this.id);
        const known = new Set([...(cur.spells.tricks || []).map((s) => s.name), ...(cur.spells.known || []).map((s) => s.name)]);
        const pool = Magic.poolFor(sel.value);
        const cw = el(`<div class="chip-wrap"></div>`);
        (pool.tricks || []).filter((t) => !known.has(t.name)).forEach((t) => { const chip = el(`<button class="skill-chip">${esc(t.name)} <span class="stat-line">trick</span></button>`); chip.onclick = () => { this.mutate((ch) => ch.spells.tricks.push({ name: t.name, rank: 0, school: sel.value, text: t.text })); renderList(); this.toast(`Learned trick: ${t.name}.`); }; cw.appendChild(chip); });
        (pool.spells || []).filter((s) => !known.has(s.name)).forEach((s) => { const chip = el(`<button class="skill-chip">${esc(s.name)} <span class="stat-line">R${s.rank}</span></button>`); chip.onclick = async () => { if (sel.value.toLowerCase() === "dracomancy" && !(await confirmModal("🐉 Dracomancy Spell Learning: Has the GM awarded you the required ancient Draconic Relic or Lore study to learn this spell?", { title: "Learn Dracomancy spell", okText: "Yes, learn it" }))) return; this.mutate((ch) => ch.spells.known.push({ name: s.name, rank: s.rank, school: sel.value, text: s.text })); renderList(); this.toast(`Learned: ${s.name}.`, "success"); }; cw.appendChild(chip); });
        if (!cw.children.length) cw.appendChild(el(`<span class="stat-line">All spells in this school are known.</span>`));
        listWrap.appendChild(cw);
      };
      sel.onchange = renderList; m.body.append(sel, listWrap); renderList();
    },
    // Marked-skill chooser shared by the questionnaire / overcome-weakness flows.
    // `cap` = how many unmarked skills may be picked; `picked` mutated in place.
    markSkillPicker(picked, capFn, onChange) {
      const wrap = el(`<div class="chip-wrap"></div>`);
      const refresh = () => {
        while (picked.length > capFn()) picked.pop();
        wrap.innerHTML = "";
        const cur = Store.get(this.id);
        Object.keys(cur.skills).sort().forEach((n) => {
          if (cur.skills[n].mark && !picked.includes(n)) return; // already marked elsewhere
          const on = picked.includes(n);
          const chip = el(`<button class="skill-chip ${on ? "on" : ""}">${esc(n)} <span class="stat-line">${cur.skills[n].level}</span></button>`);
          chip.onclick = () => {
            const i = picked.indexOf(n);
            if (i >= 0) picked.splice(i, 1);
            else { if (picked.length >= capFn()) { showToast(`You can mark at most ${capFn()} skill(s) here.`, "error"); return; } picked.push(n); }
            refresh(); if (onChange) onChange();
          };
          wrap.appendChild(chip);
        });
      };
      refresh();
      return { wrap, refresh };
    },
    endSession() {
      if (Settings.soloMode()) { this.soloMissionMarks(); return; }
      const qs = DB.advancementQuestions || [];
      const m = modal("Session end — advancement");
      m.body.appendChild(el(`<p class="stat-line">Answer the advancement questions. Each <b>Yes</b> lets you mark one unmarked skill (in addition to Dragon/Demon marks). Then roll advancement.</p>`));
      const yesState = qs.map(() => false);
      const yesCount = () => yesState.filter(Boolean).length;
      const picked = [];
      const counter = el(`<p class="stat-line"></p>`);
      const updCounter = () => { counter.innerHTML = `<b>Yes: ${yesCount()}</b> — mark up to ${yesCount()} skill(s); chosen ${picked.length}.`; };
      const { wrap, refresh } = this.markSkillPicker(picked, yesCount, updCounter);
      const qWrap = el(`<div style="margin:6px 0"></div>`);
      qs.forEach((q, i) => {
        const row = el(`<label style="display:flex;gap:8px;margin:4px 0;cursor:pointer"><input type="checkbox"><span>${esc(q)}</span></label>`);
        row.querySelector("input").onchange = (e) => { yesState[i] = e.target.checked; refresh(); updCounter(); };
        qWrap.appendChild(row);
      });
      updCounter();
      const rollBtn = el(`<button class="btn block" style="margin-top:10px">Mark skills &amp; roll advancement</button>`);
      rollBtn.onclick = () => {
        Store.update(this.id, (ch) => { picked.forEach((n) => { if (ch.skills[n]) ch.skills[n].mark = true; }); });
        m.close(); this.rollAdvancement();
      };
      m.body.append(qWrap, counter, el(`<p class="section-title" style="margin-top:8px"><b>Mark skills (your choice)</b></p>`), wrap, rollBtn);
    },
    rollAdvancement() {
      const c = Store.get(this.id);
      const marked = Object.keys(c.skills).filter((n) => c.skills[n].mark);
      if (!marked.length) { this.toast("No advancement marks to roll."); this.mutate((ch) => { ch.state.weaknessCooldown = false; }); return; }
      const results = [], reached18 = [];
      this.mutate((ch) => {
        marked.forEach((n) => {
          const sk = ch.skills[n]; const before = sk.level; const roll = Dice.d(20);
          const improved = roll > sk.level && sk.level < 18;
          if (improved) sk.level = Math.min(18, sk.level + 1);
          sk.mark = false;
          if (before < 18 && sk.level === 18) reached18.push(n);
          results.push({ name: n, roll, level: sk.level, improved });
        });
        ch.state.weaknessCooldown = false; // new session — a new weakness may be chosen
      });
      const m = modal("Advancement");
      m.body.appendChild(el(`<p class="stat-line">For each marked skill, roll D20; if it exceeds the skill's level, it improves by 1 (max 18).</p>`));
      results.forEach((r) => m.body.appendChild(el(`<p>${esc(r.name)}: rolled <b>${r.roll}</b> → ${r.improved ? `<span style="color:var(--ok)">improved to ${r.level}</span>` : `no change (${r.level})`}</p>`)));
      if (reached18.length) {
        m.body.appendChild(el(`<p class="notice" style="border-color:var(--ok)">★ ${reached18.map(esc).join(", ")} reached 18 — choose a free heroic ability.</p>`));
        const cont = el(`<button class="btn block">Choose free heroic ability${reached18.length > 1 ? ` (×${reached18.length})` : ""}</button>`);
        cont.onclick = () => { m.close(); this.gainHeroicAbility(reached18.length); };
        m.body.appendChild(cont);
      }
    },
    // Heroic-ability picker with requirement locking. `times` = how many to pick.
    gainHeroicAbility(times = 1) {
      const c = Store.get(this.id);
      const owned = new Set((c.abilities || []).map((a) => a.name));
      const m = modal("Choose a heroic ability" + (times > 1 ? ` (${times} left)` : ""));
      m.body.appendChild(el(`<p class="stat-line">Abilities whose skill requirement you don't meet are locked.</p>`));
      const grid = el(`<div class="card-grid"></div>`);
      (DB.heroicAbilities || []).forEach((ab) => {
        if (owned.has(ab.name)) return;
        const met = heroicReqMet(c, ab.req);
        const card = el(`<button class="card ${met ? "" : "locked"}" style="${met ? "" : "opacity:0.5;cursor:not-allowed"}"><h3>${esc(ab.name)} ${met ? "" : "🔒"}<span class="tag">${esc(ab.req || "No req")}</span> <span class="tag">${ab.wp == null ? "No WP" : "WP " + ab.wp}</span></h3><div class="meta">${esc(ab.text)}</div></button>`);
        if (met) card.onclick = () => { this.mutate((ch) => ch.abilities.push({ name: ab.name, source: "heroic", wp: ab.wp, text: ab.text })); m.close(); this.toast("Gained " + ab.name + "."); if (times > 1) this.gainHeroicAbility(times - 1); };
        grid.appendChild(card);
      });
      m.body.appendChild(grid);
    },
    overcomeWeakness() {
      const c = Store.get(this.id);
      if (!c.identity.weakness) { this.toast("No weakness to overcome."); return; }
      const m = modal("Overcome your weakness");
      m.body.appendChild(el(`<p class="stat-line">Acting against your weakness: gain <b>2 advancement marks</b> (mark two unmarked skills), delete the weakness, and you can't take a new one until next session.</p>`));
      m.body.appendChild(el(`<p class="stat-line"><i>${esc(c.identity.weakness)}</i></p>`));
      const picked = [];
      const { wrap } = this.markSkillPicker(picked, () => 2);
      const btn = el(`<button class="btn block" style="margin-top:8px">Overcome (mark 2 skills)</button>`);
      btn.onclick = () => {
        if (picked.length !== 2) { showToast("Pick exactly two skills to mark.", "error"); return; }
        this.mutate((ch) => { picked.forEach((n) => { if (ch.skills[n]) ch.skills[n].mark = true; }); ch.identity.weakness = ""; ch.state.weaknessCooldown = true; });
        m.close(); this.toast("Weakness overcome — 2 marks gained.");
      };
      m.body.append(el(`<p class="section-title"><b>Mark two skills</b></p>`), wrap, btn);
    },
    trainTeacher() {
      const c = Store.get(this.id);
      const m = modal("Train with a teacher");
      m.body.appendChild(el(`<p class="stat-line">Spend a shift training a skill with an NPC teacher (skill 15+). You get one advancement roll now; a teacher raises you by at most +1, so each skill can be teacher-trained once.</p>`));
      const sel = el(`<select class="input" style="width:100%;margin-bottom:8px"></select>`);
      Object.keys(c.skills).sort().forEach((n) => { const done = c.state.teacherTrained && c.state.teacherTrained[n]; sel.appendChild(el(`<option value="${esc(n)}" ${done ? "disabled" : ""}>${esc(n)} (${c.skills[n].level})${done ? " — already trained" : ""}</option>`)); });
      const out = el(`<div class="roll-result" role="status" aria-live="polite"></div>`);
      const btn = el(`<button class="btn block">Roll advancement (teacher)</button>`);
      btn.onclick = () => {
        const n = sel.value; if (!n) return;
        if (c.state.teacherTrained && c.state.teacherTrained[n]) { showToast("This teacher has already raised that skill.", "error"); return; }
        btn.disabled = true; btn.style.opacity = "0.4";
        let roll, improved, reached18 = false, newLvl;
        this.mutate((ch) => { const sk = ch.skills[n]; const before = sk.level; roll = Dice.d(20); improved = roll > sk.level && sk.level < 18; if (improved) sk.level = Math.min(18, sk.level + 1); newLvl = sk.level; ch.state.teacherTrained[n] = true; if (before < 18 && sk.level === 18) reached18 = true; });
        out.innerHTML = `<p class="outcome ${improved ? "ok" : "bad"}">Rolled ${roll} → ${improved ? `improved to ${newLvl}` : `no change (${newLvl})`}</p>`;
        if (reached18) { const cont = el(`<button class="btn block" style="margin-top:8px">★ Reached 18 — choose a free heroic ability</button>`); cont.onclick = () => { m.close(); this.gainHeroicAbility(1); }; out.appendChild(cont); }
      };
      m.body.append(sel, btn, out);
    },
    studyLibrary() {
      const c = Store.get(this.id);
      const knowSkills = ["Beast Lore", "Myths & Legends", "Languages"];
      const sel = el(`<select class="input" style="width:100%;margin-bottom:8px"></select>`);
      knowSkills.forEach((n) => { if (c.skills[n]) sel.appendChild(el(`<option value="${esc(n)}">${esc(n)} (${c.skills[n].level})</option>`)); });
      const m = modal("Study in prestigious library");
      m.body.appendChild(el(`<p class="stat-line">Spend a shift studying in a prestigious library (like the Guild of Tomes in Arkand) to get an immediate advancement roll in specific knowledge skills.</p>`));
      const out = el(`<div class="roll-result" role="status" aria-live="polite"></div>`);
      const btn = el(`<button class="btn block">Roll advancement (study)</button>`);
      btn.onclick = () => {
        const n = sel.value; if (!n) return;
        btn.disabled = true; btn.style.opacity = "0.4";
        let roll, improved, reached18 = false, newLvl;
        this.mutate((ch) => { const sk = ch.skills[n]; const before = sk.level; roll = Dice.d(20); improved = roll > sk.level && sk.level < 18; if (improved) sk.level = Math.min(18, sk.level + 1); newLvl = sk.level; if (before < 18 && sk.level === 18) reached18 = true; });
        out.innerHTML = `<p class="outcome ${improved ? "ok" : "bad"}">Rolled ${roll} → ${improved ? `improved to ${newLvl}` : `no change (${newLvl})`}</p>`;
        if (reached18) { const cont = el(`<button class="btn block" style="margin-top:8px">★ Reached 18 — choose a free heroic ability</button>`); cont.onclick = () => { m.close(); this.gainHeroicAbility(1); }; out.appendChild(cont); }
      };
      m.body.append(sel, btn, out);
    },
    replacementCatchup() {
      const picked = [];
      const m = modal("Catch up after death — Replacement PC");
      m.body.appendChild(el(`<p class="stat-line">In Dragonbane, replacement characters catch up by getting <b>one extra advancement roll per session played</b> by the group so far, plus starting with the same number of Heroic Abilities.</p>`));
      const countInput = el(`<input type="number" min="1" max="100" value="1" style="width:80px;padding:6px;font-size:1rem;margin-left:8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink)">`);
      const countRow = el(`<div style="margin:10px 0;display:flex;align-items:center"><label style="font-weight:600">Sessions played so far:</label></div>`);
      countRow.appendChild(countInput);
      const capFn = () => Math.max(1, parseInt(countInput.value || "1", 10));
      const { wrap, refresh } = this.markSkillPicker(picked, capFn);
      countInput.oninput = () => refresh();
      const rollBtn = el(`<button class="btn block" style="margin-top:10px">Mark skills &amp; roll catch-up advancement</button>`);
      rollBtn.onclick = () => {
        const n = capFn();
        if (picked.length !== n) { showToast(`Please pick exactly ${n} skill(s) to mark.`, "error"); return; }
        Store.update(this.id, (ch) => { picked.forEach((s) => { if (ch.skills[s]) ch.skills[s].mark = true; }); });
        m.close(); this.rollAdvancement();
      };
      const abBtn = el(`<button class="btn ghost block" style="margin-top:10px;border-color:var(--gold)">Catch up Heroic Abilities</button>`);
      abBtn.onclick = () => { m.close(); this.gainHeroicAbility(capFn()); };
      m.body.append(countRow, el(`<p class="section-title"><b>Choose skills for catch-up advancement</b></p>`), wrap, rollBtn, abBtn);
    },
    // Solo (Phase 17): completing a mission grants 5 advancement marks.
    soloMissionMarks() {
      const picked = [];
      const m = modal("Mission complete — +5 advancement marks");
      m.body.appendChild(el(`<p class="stat-line">Solo play: on returning from a successful mission, mark 5 skills of your choice, then roll advancement.</p>`));
      const { wrap } = this.markSkillPicker(picked, () => 5);
      const btn = el(`<button class="btn block" style="margin-top:8px">Mark 5 &amp; roll advancement</button>`);
      btn.onclick = () => { if (picked.length !== 5) { showToast("Pick exactly 5 skills to mark.", "error"); return; } Store.update(this.id, (ch) => { picked.forEach((n) => { if (ch.skills[n]) ch.skills[n].mark = true; }); }); m.close(); this.rollAdvancement(); };
      m.body.append(el(`<p class="section-title"><b>Mark five skills</b></p>`), wrap, btn);
    },
    render() {
      const c = Store.get(this.id);
      if (!c) { Router.go("home"); return; }
      const inPartyCamp = typeof Sync !== "undefined" && Sync.enabled && Sync.campaign;
      const canEdit = !inPartyCamp || !c.owner || c.owner === Sync.uid || Sync.campaign.role === "gm";
      const a = c.attributes;
      const condByAttr = {}; (DB.conditions || []).forEach((cn) => { if (c.state.conditions[cn.key]) condByAttr[cn.attribute] = true; });
      const root = el(`<div></div>`);

      // Header
      root.appendChild(el(`<div class="wiz-head"><button class="btn ghost" id="sheet-back">← Heroes</button><div class="wiz-progress">${esc(c.identity.name)}</div></div>`));
      if (!canEdit) {
        root.appendChild(el(`<div class="panel" style="border-color:var(--bad);background:rgba(180,50,50,0.1);padding:10px 14px;margin-bottom:12px">
          <b style="color:var(--bad)">🔒 Read-Only View</b><br>
          <span class="stat-line" style="font-size:0.85rem">You are viewing another player's hero. Rolling dice and editing stats are disabled.</span>
        </div>`));
      }

      // GM messages feed (only in a synced campaign) — pushed by the GM.
      if (Sync && Sync.campaign && (Sync.broadcast || []).length) {
        const feed = el(`<details class="panel" open><summary style="cursor:pointer;font-weight:600">📢 GM messages <span class="stat-line">(${Sync.broadcast.length})</span></summary></details>`);
        const list = el(`<div style="margin-top:8px;display:flex;flex-direction:column;gap:6px"></div>`);
        Sync.broadcast.slice().reverse().forEach((m) => {
          const when = m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
          list.appendChild(el(`<div style="padding:6px 8px;background:var(--bg);border-left:3px solid var(--accent);border-radius:4px"><span class="stat-line" style="float:right">${esc(when)}</span>${esc(m.text)}</div>`));
        });
        feed.appendChild(list);
        root.appendChild(feed);
      }

      // Identity + derived + HP/WP
      const top = el(`<div class="panel"></div>`);
      const portUrl = c.identity.portraitUrl;
      const portImg = portUrl
        ? `<img src="${portUrl}" alt="Portrait" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid var(--accent);cursor:pointer;flex-shrink:0" title="Tap to change portrait">`
        : `<div style="width:56px;height:56px;border-radius:50%;background:var(--bg);border:2px dashed var(--line);display:flex;align-items:center;justify-content:center;font-size:1.4rem;cursor:pointer;flex-shrink:0" title="Tap to upload portrait">🖼️</div>`;

      const idWrap = el(`<div style="display:flex;align-items:center;gap:12px">
        <div id="portrait-wrap">${portImg}</div>
        <div>
          <h2 style="margin-bottom:2px">${esc(c.identity.name)}</h2>
          <p class="meta">${esc(c.identity.kin)} · ${esc(c.identity.profession)}${c.identity.mageSchool ? " (" + esc(c.identity.mageSchool) + ")" : ""} · ${esc(c.identity.age)}</p>
        </div>
      </div>`);
      idWrap.querySelector("#portrait-wrap").onclick = () => { if (canEdit) this.uploadPortrait(); };
      top.appendChild(idWrap);
      const attrRow = el(`<div class="rolled-row" style="margin-top:8px">${(DB.attributes||[]).map((at)=>`<span class="tag ${condByAttr[at.key]?"baned":""}" title="${condByAttr[at.key]?"A condition imposes a bane on "+at.key+" rolls":""}">${at.key} ${a[at.key]}${condByAttr[at.key]?" ⚠":""}</span>`).join("")}</div>`);
      top.appendChild(attrRow);
      top.appendChild(el(`<p class="stat-line">Move ${c.derived.movement} · STR dmg ${c.derived.dmgBonusSTR?"+"+c.derived.dmgBonusSTR:"—"} · AGL dmg ${c.derived.dmgBonusAGL?"+"+c.derived.dmgBonusAGL:"—"} · Enc. limit ${encLimit(c)}</p>`));
      // HP / WP steppers
      const stepper = (label, cur, max, key, cls) => {
        const w = el(`<div class="vital ${cls}"><div class="vital-label">${label}</div></div>`);
        const ctrl = el(`<div class="stepper"></div>`);
        const minus = el(`<button class="step" type="button" aria-label="Decrease ${label}">−</button>`);
        const val = el(`<span class="vital-val" role="status" aria-live="polite">${cur} / ${max}</span>`);
        const plus = el(`<button class="step" type="button" aria-label="Increase ${label}">+</button>`);
        const doStep = (d) => {
          const prevHp = c.state.hp;
          Store.update(this.id, ch => {
            if (d < 0) {
              if (key === "hp" && ch.state.hp <= 0) ch.state.deathRolls.failures = Math.min(3, (ch.state.deathRolls.failures || 0) + 1);
              else ch.state[key] = Math.max(0, ch.state[key] - 1);
            } else {
              ch.state[key] = Math.min(max, ch.state[key] + 1);
              if (key === "hp" && ch.state.hp > 0) { ch.state.deathRolls = { successes: 0, failures: 0 }; ch.state.rallied = false; }
            }
            c.state[key] = ch.state[key];
            if (ch.state.deathRolls) c.state.deathRolls = ch.state.deathRolls;
          });
          val.textContent = `${c.state[key]} / ${max}`;
          // Concentration interruption: taking HP damage prompts a WIL roll.
          if (key === "hp" && d < 0 && c.state.hp < prevHp) this.concentrationCheck();
          if (key === "hp" && ((prevHp <= 0 && c.state.hp > 0) || (prevHp > 0 && c.state.hp <= 0))) {
            this.render();
          }
        };
        minus.onclick = (e) => { e.preventDefault(); doStep(-1); };
        plus.onclick = (e) => { e.preventDefault(); doStep(1); };
        ctrl.append(minus, val, plus); w.appendChild(ctrl);
        return w;
      };
      const vitals = el(`<div class="vitals"></div>`);
      vitals.appendChild(stepper("Hit Points", c.state.hp, effHpMax(c), "hp", "hp"));
      vitals.appendChild(stepper("Willpower", c.state.wp, effWpMax(c), "wp", "wp"));
      top.appendChild(vitals);

      // Movement Tracker
      top.appendChild(this.buildMovementDOM(c, () => this.render()));

      // Permanent WP loss (rituals / corruption)
      if (c.state.wpPenalty || (c.spells.tricks || []).length || (c.spells.known || []).length) {
        const pen = el(`<div class="wp-pen"><span class="stat-line">Permanent WP loss (rituals/corruption): <b>${c.state.wpPenalty || 0}</b> · max WP ${effWpMax(c)}/${c.derived.wpMax}</span></div>`);
        const minus = el(`<button class="step" title="restore (e.g. Focused)">−</button>`);
        const plus = el(`<button class="step" title="lose 1 permanent max WP">+</button>`);
        minus.onclick = () => this.mutate((ch) => { ch.state.wpPenalty = Math.max(0, (ch.state.wpPenalty || 0) - 1); ch.state.wp = Math.min(ch.state.wp, effWpMax(ch)); });
        plus.onclick = () => this.mutate((ch) => { ch.state.wpPenalty = (ch.state.wpPenalty || 0) + 1; ch.state.wp = Math.min(ch.state.wp, effWpMax(ch)); });
        pen.append(minus, plus); top.appendChild(pen);
      }
      // Rest buttons
      const restRow = el(`<div class="rest-row"></div>`);
      [["Round rest","round","+D6 WP"],["Stretch rest","stretch","+D6 HP/WP, heal 1 condition"],["Shift rest","shift","full HP/WP, all conditions"]].forEach(([label,kind,hint]) => {
        const b = el(`<button class="btn ghost rest-btn" title="${hint}">${label}</button>`);
        b.onclick = () => this.rest(kind);
        restRow.appendChild(b);
      });
      top.appendChild(restRow);
      root.appendChild(top);

      // Advanced / GM Automation panel (Phase 18) — gated behind one toggle.
      if (Settings.gmAutomation()) {
        const t = c.state.time || { round: 0, stretch: 0, shift: 0 };
        const gmPanel = el(`<div class="panel" style="border-left:4px solid var(--accent)"><h3>⏱️ GM Automation</h3></div>`);
        gmPanel.appendChild(el(`<p class="stat-line">Time — Round <b>${t.round}</b> · Stretch <b>${t.stretch}</b> · Shift <b>${t.shift}</b>${c.state.awakeShifts >= 3 ? ` · <b style="color:var(--bad)">sleep-deprived (${c.state.awakeShifts} shifts)</b>` : c.state.awakeShifts ? ` · awake ${c.state.awakeShifts} shift(s)` : ""}${c.state.roundRestUsed ? " · round rest used" : ""}</p>`));
        const clockRow = el(`<div class="rest-row"></div>`);
        [["+ Round", "round"], ["+ Stretch", "stretch"], ["+ Shift", "shift"]].forEach(([label, unit]) => { const b = el(`<button class="btn ghost">${label}</button>`); b.onclick = () => this.advanceClock(unit); clockRow.appendChild(b); });
        gmPanel.appendChild(clockRow);

        // Light sources (toggle lit; burn-out rolls on +Stretch)
        const lights = (c.inventory.items || []).map((it, i) => ({ it, i })).filter((x) => lightDieFor(x.it.name));
        if (lights.length) {
          gmPanel.appendChild(el(`<p class="stat-line" style="margin-top:6px"><b>Light sources</b> (toggle lit; burn-out rolls on “+ Stretch”)</p>`));
          const lw = el(`<div class="chip-wrap"></div>`);
          lights.forEach(({ it, i }) => { const chip = el(`<button class="skill-chip ${it.lit ? "on" : ""}">${it.lit ? "🔥" : "🕯️"} ${esc(it.name)} <span class="stat-line">D${lightDieFor(it.name)}</span></button>`); chip.onclick = () => this.mutate((ch) => { ch.inventory.items[i].lit = !ch.inventory.items[i].lit; }); lw.appendChild(chip); });
          gmPanel.appendChild(lw);
        }

        // Cold & disease + fear
        const statusRow = el(`<div class="rest-row" style="margin-top:6px"></div>`);
        const af = c.state.afflictions || { cold: false, disease: null };
        const coldBtn = el(`<button class="btn ghost ${af.cold ? "" : ""}" title="toggle cold; roll CON when active">${af.cold ? "❄️ Cold ON" : "❄️ Cold"}</button>`);
        coldBtn.onclick = () => this.mutate((ch) => { ch.state.afflictions.cold = !ch.state.afflictions.cold; });
        const coldRoll = el(`<button class="btn ghost" title="CON roll vs cold">Cold CON roll</button>`);
        coldRoll.onclick = () => this.afflictionRoll("cold");
        const disBtn = el(`<button class="btn ghost">${af.disease ? "🦠 Disease ON" : "🦠 Disease"}</button>`);
        disBtn.onclick = () => this.mutate((ch) => { ch.state.afflictions.disease = ch.state.afflictions.disease ? null : { virulence: Dice.roll("3D6") }; });
        const disRoll = el(`<button class="btn ghost" title="CON roll vs disease">Disease CON roll</button>`);
        disRoll.onclick = () => this.afflictionRoll("disease");
        const fearBtn = el(`<button class="btn ghost" style="border-color:var(--bad)">😱 Fear attack</button>`);
        fearBtn.onclick = () => this.fearAttack();
        statusRow.append(coldBtn, coldRoll, disBtn, disRoll, fearBtn);
        gmPanel.appendChild(statusRow);
        if (af.disease) gmPanel.appendChild(el(`<p class="stat-line">Disease virulence: <b>${af.disease.virulence}</b></p>`));
        root.appendChild(gmPanel);
      }

      // Death & dying
      if (c.state.hp <= 0) {
        const dr = c.state.deathRolls || { successes: 0, failures: 0 };
        const dead = dr.failures >= 3;
        const dyingPanel = el(`<div class="panel dying"><h3>${dead ? "💀 Dead" : c.state.rallied ? "Dying — rallied (acting, still rolling)" : "Dying — at 0 HP"}</h3></div>`);
        const dots = (n, cls) => Array.from({length:3}, (_,i)=>`<span class="dr-dot ${i<n?cls:""}"></span>`).join("");
        dyingPanel.appendChild(el(`<p class="stat-line">Each round, roll a death roll: <b>D20 vs CON ${c.attributes.CON}</b> (roll ≤ CON = success). <b>3 successes</b> → stabilize &amp; recover D6 HP. <b>3 failures</b> → death. Dragon (1) = two successes; Demon (20) = two failures. Taking damage while down counts as a failed death roll (the HP − button adds one at 0 HP).</p>
          <p>Successes <span class="dr-dots">${dots(dr.successes,"ok")}</span> &nbsp; Failures <span class="dr-dots">${dots(dr.failures,"bad")}</span></p>`));
        if (!dead) {
          const btns = el(`<div class="rest-row"></div>`);
          const roll = el(`<button class="btn">Death roll</button>`); roll.onclick = () => this.deathRoll(); btns.appendChild(roll);
          const rallyTitle = Settings.soloMode()
            ? "Solo: rally yourself with a PERSUASION roll (no bane) — you act, but keep rolling"
            : "ally PERSUASION (within 10m), or self WIL with a bane — you act, but keep rolling";
          const rally = el(`<button class="btn ghost" title="${rallyTitle}">${c.state.rallied ? "Rallied ✓" : "Rally"}</button>`);
          rally.onclick = () => this.mutate((ch) => { ch.state.rallied = true; });
          const saved = el(`<button class="btn ghost" title="an adjacent ally's successful HEALING roll (bane without bandages)">Saved (Healing) +D6 HP</button>`);
          saved.onclick = () => this.mutate((ch) => { ch.state.hp = Dice.roll("D6"); ch.state.rallied = false; ch.state.deathRolls = { successes: 0, failures: 0 }; });
          btns.append(rally, saved); dyingPanel.appendChild(btns);
        } else {
          dyingPanel.appendChild(el(`<p class="notice" style="border-color:var(--bad)">Your hero has fallen. Heal them above 0 HP to revive (or delete below).</p>`));
        }
        root.appendChild(dyingPanel);
      }

      // Conditions
      const condPanel = el(`<div class="panel"><h3>Conditions</h3><p class="stat-line">Each imposes a bane on rolls using its attribute. Gained by pushing a roll.</p></div>`);
      const cw = el(`<div class="chip-wrap"></div>`);
      (DB.conditions || []).forEach((cn) => {
        const on = !!c.state.conditions[cn.key];
        const chip = el(`<button class="skill-chip ${on?"cond-on":""}">${esc(cn.name)} <span class="stat-line">${cn.attribute}</span></button>`);
        chip.onclick = () => this.mutate((ch) => { ch.state.conditions[cn.key] = !ch.state.conditions[cn.key]; });
        cw.appendChild(chip);
      });
      condPanel.appendChild(cw); root.appendChild(condPanel);

      // Skills
      const skPanel = el(`<div class="panel"><h3>Skills</h3><p class="stat-line">Tap a skill to roll it. Tap the ◦ to toggle an advancement mark (ticked on a Dragon/Demon). ⚠ = a condition banes this skill.</p></div>`);
      const markedCount = Object.values(c.skills).filter((v) => v.mark).length;
      const advRow = el(`<div class="rest-row" style="margin:4px 0 10px"></div>`);
      const advBtn = el(`<button class="btn ghost">End session — advancement${markedCount?` (${markedCount} marked)`:""}</button>`);
      advBtn.onclick = () => this.endSession();
      const teachBtn = el(`<button class="btn ghost" title="train a skill with an NPC teacher (skill 15+); +1 cap per teacher">Train teacher</button>`);
      teachBtn.onclick = () => this.trainTeacher();
      const studyBtn = el(`<button class="btn ghost" title="study in a prestigious library: advancement roll in Beast Lore, Myths & Legends, or Languages">📖 Study library</button>`);
      studyBtn.onclick = () => this.studyLibrary();
      const gainBtn = el(`<button class="btn ghost" title="gain a heroic ability (requirement-locked)">Gain ability</button>`);
      gainBtn.onclick = () => this.gainHeroicAbility(1);
      const catchupBtn = el(`<button class="btn ghost" title="replacement PC catch-up: extra advancement roll per session played">💀 Catch up (Death)</button>`);
      catchupBtn.onclick = () => this.replacementCatchup();
      advRow.append(advBtn, teachBtn, studyBtn, gainBtn, catchupBtn);
      if (Settings.soloMode()) {
        const missionBtn = el(`<button class="btn ghost" title="solo: gain 5 advancement marks for a completed mission" style="border-color:var(--accent)">🏅 Mission (+5 marks)</button>`);
        missionBtn.onclick = () => this.soloMissionMarks();
        advRow.appendChild(missionBtn);
      }
      skPanel.appendChild(advRow);
      const skList = el(`<div class="skill-list"></div>`);
      Object.entries(c.skills).sort((x,y)=>x[0].localeCompare(y[0])).forEach(([n,v]) => {
        const baned = condByAttr[v.attribute];
        const row = el(`<div class="skill-row ${v.trained?"trained":""}">
          <button class="mark ${v.mark?"marked":""}" title="advancement mark" aria-label="${v.mark?"Remove":"Add"} advancement mark for ${esc(n)}" aria-pressed="${v.mark?"true":"false"}">${v.mark?"●":"◦"}</button>
          <button class="sk-name rollable" aria-label="Roll ${esc(n)} (${v.attribute}), skill ${v.level}">${esc(n)} <span class="stat-line">${v.attribute}${baned?" ⚠":""}</span></button>
          <b class="sk-lvl">${v.level}</b></div>`);
        row.querySelector(".mark").onclick = () => this.mutate((ch) => { ch.skills[n].mark = !ch.skills[n].mark; });
        row.querySelector(".sk-name").onclick = () => Roller.skill(this.id, n);
        skList.appendChild(row);
      });
      skPanel.appendChild(skList); root.appendChild(skPanel);

      // Abilities
      root.appendChild(el(`<div class="panel"><h3>Abilities</h3>${c.abilities.map((x)=>`<p><b>${esc(x.name)}</b> <span class="tag">${x.source==="kin"?"Kin":"Heroic"}</span> <span class="tag">${x.wp==null?"No WP":"WP "+x.wp}</span><br><span class="stat-line">${esc(x.text||"")}</span></p>`).join("") || '<p class="stat-line">—</p>'}</div>`));

      // Magic
      if ((c.spells.tricks||[]).length || (c.spells.known||[]).length) {
        const magicPanel = el(`<details class="panel rule-accordion" open style="padding:10px"><summary style="font-size:1.2rem;font-weight:bold;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center"><span>✨ Magic & Tricks</span><span class="tag">${(c.spells.tricks||[]).length + (c.spells.known||[]).length}</span></summary><div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)"></div></details>`);
        const inner = magicPanel.querySelector("div");
        const learnBtn = el(`<button class="btn ghost" style="margin-bottom:8px">＋ Learn a spell or school</button>`);
        learnBtn.onclick = () => this.learnMagic();
        inner.appendChild(learnBtn);
        const spellRow = (x, isTrick) => {
          const isPrep = isTrick || x.prepared !== false;
          const tagStr = isTrick ? "Trick · 1 WP" : `Rank ${x.rank}` + (isPrep ? " · Prepared" : " · Grimoire");
          const row = el(`<div class="cast-row"><div class="cast-info"><b>${esc(x.name)}</b> <span class="tag" style="${!isPrep ? 'background:var(--muted);color:#fff' : ''}">${tagStr}</span><br><span class="stat-line">${esc(x.text||"")}</span></div></div>`);
          const btns = el(`<div class="cast-actions"></div>`);
          const cast = el(`<button class="btn secondary cast-btn">Cast</button>`);
          cast.onclick = () => Roller.cast(this.id, x, isTrick);
          btns.appendChild(cast);
          if (isSummonSpell(x)) { const b = el(`<button class="btn ghost cast-btn" title="add to your summons/companions">+ Summon</button>`); b.onclick = () => this.addCompanion(x.name, 0, x.text); btns.appendChild(b); }
          if (x.school === "enchanting") { const b = el(`<button class="btn ghost cast-btn" title="bind to a new item in your inventory">+ Craft</button>`); b.onclick = () => { this.mutate((ch) => ch.inventory.items.push({ name: "Enchanted item — " + x.name, weight: 1 })); this.toast(`Crafted: ${x.name}.`); }; btns.appendChild(b); }
          else if (x.school === "alchemy") { const b = el(`<button class="btn ghost cast-btn" title="add a brewed dose to your inventory">+ Brew</button>`); b.onclick = () => { this.mutate((ch) => ch.inventory.items.push({ name: x.name + " (dose)", weight: 1 })); this.toast(`Brewed: ${x.name}.`); }; btns.appendChild(b); }
          else if (!isTrick && isTrackableSpell(x) && !isSummonSpell(x)) { const b = el(`<button class="btn ghost cast-btn" title="track as an ongoing effect">+ Track</button>`); b.onclick = () => this.addEffect(x.name, isConcentration(x), x.duration); btns.appendChild(b); }
          row.appendChild(btns);
          return row;
        };
        if ((c.spells.tricks||[]).length) {
          const tDet = el(`<details open style="margin-bottom:10px;background:var(--bg-raised);padding:8px;border-radius:6px;border:1px solid var(--line)"><summary style="font-weight:bold;cursor:pointer">🎩 Magic Tricks (${c.spells.tricks.length})</summary><div style="margin-top:8px;display:flex;flex-direction:column;gap:6px"></div></details>`);
          const tDiv = tDet.querySelector("div");
          c.spells.tricks.forEach((x) => tDiv.appendChild(spellRow(x, true)));
          inner.appendChild(tDet);
        }
        if ((c.spells.known||[]).length) {
          const sDet = el(`<details open style="margin-bottom:6px;background:var(--bg-raised);padding:8px;border-radius:6px;border:1px solid var(--line)"><summary style="font-weight:bold;cursor:pointer">📜 Known Spells (${c.spells.known.length})</summary><div style="margin-top:8px;display:flex;flex-direction:column;gap:6px"></div></details>`);
          const sDiv = sDet.querySelector("div");
          c.spells.known.forEach((x) => sDiv.appendChild(spellRow(x, false)));
          inner.appendChild(sDet);
        }
        root.appendChild(magicPanel);
      }

      // Active spells & effects (Phase 4B) — concentration spells, runes, illusions, buffs
      if ((c.effects || []).length || (c.spells.known || []).length) {
        const fxPanel = el(`<div class="panel"><h3>Active Spells &amp; Effects</h3></div>`);
        if (!(c.effects || []).length) fxPanel.appendChild(el(`<p class="stat-line">Nothing active. Use “+ Track” on a lasting spell, or add one below.</p>`));
        (c.effects || []).forEach((fx, i) => {
          const row = el(`<div class="comp-row"><div class="comp-info"><b>${esc(fx.name)}</b> ${fx.concentration ? '<span class="tag">Concentration</span>' : fx.notes ? `<span class="tag">${esc(fx.notes)}</span>` : ""}</div></div>`);
          const rm = el(`<button class="step rm" title="end effect" aria-label="End effect">✕</button>`); rm.onclick = () => this.mutate((ch) => ch.effects.splice(i, 1));
          row.appendChild(rm); fxPanel.appendChild(row);
        });
        const addFx = el(`<div class="inv-add"></div>`);
        const fxName = el(`<input type="text" placeholder="Track an effect / rune / illusion…">`);
        const fxBtn = el(`<button class="btn secondary">Add</button>`);
        const doAddFx = () => { const n = fxName.value.trim(); if (!n) return; this.addEffect(n, false, ""); };
        fxBtn.onclick = doAddFx; fxName.onkeydown = (e) => { if (e.key === "Enter") doAddFx(); };
        addFx.append(fxName, fxBtn); fxPanel.appendChild(addFx);
        root.appendChild(fxPanel);
      }

      // Familiar WP splitting (Phase 15) — a mage may assign up to half their
      // max WP to a familiar; the two pools are tracked separately.
      const isCaster = Object.values(c.skills).some((v) => v.kind === "magic") || (c.spells && c.spells.castSkill);
      if (isCaster) {
        const cap = Math.floor(effWpMax(c) / 2);
        const famPanel = el(`<div class="panel"><h3>Familiar</h3><p class="stat-line">Assign up to half your max WP (${cap}) to a familiar; the pools are tracked separately.</p></div>`);
        if (!c.state.familiar) {
          const addRow = el(`<div class="inv-add"></div>`);
          const fIn = el(`<input type="text" placeholder="Name your familiar…">`);
          const fBtn = el(`<button class="btn secondary">Bind familiar</button>`);
          const doFam = () => { const n = fIn.value.trim() || "Familiar"; this.mutate((ch) => { ch.state.familiar = { name: n, wp: 0, wpMax: Math.floor(effWpMax(ch) / 2) }; }); };
          fBtn.onclick = doFam; fIn.onkeydown = (e) => { if (e.key === "Enter") doFam(); };
          addRow.append(fIn, fBtn); famPanel.appendChild(addRow);
        } else {
          const fam = c.state.familiar;
          const pools = el(`<div class="vitals"></div>`);
          // Mage WP
          const mw = el(`<div class="vital wp"><div class="vital-label">Mage WP</div></div>`);
          mw.appendChild(el(`<div class="stepper"><span class="vital-val">${c.state.wp} / ${effWpMax(c)}</span></div>`));
          // Familiar WP with transfer controls
          const fw = el(`<div class="vital"><div class="vital-label">${esc(fam.name)} WP</div></div>`);
          const fctrl = el(`<div class="stepper"></div>`);
          const toMage = el(`<button class="step" title="return 1 WP to mage">−</button>`);
          const fval = el(`<span class="vital-val">${fam.wp} / ${cap}</span>`);
          const toFam = el(`<button class="step" title="move 1 WP to familiar">+</button>`);
          toFam.onclick = () => this.mutate((ch) => { const f = ch.state.familiar; const cp = Math.floor(effWpMax(ch) / 2); if (ch.state.wp > 0 && f.wp < cp) { ch.state.wp--; f.wp++; f.wpMax = cp; } });
          toMage.onclick = () => this.mutate((ch) => { const f = ch.state.familiar; if (f.wp > 0 && ch.state.wp < effWpMax(ch)) { f.wp--; ch.state.wp++; } });
          fctrl.append(toMage, fval, toFam); fw.appendChild(fctrl);
          pools.append(mw, fw); famPanel.appendChild(pools);
          const rm = el(`<button class="btn ghost block" style="margin-top:8px">Release familiar (return its WP)</button>`);
          rm.onclick = () => this.mutate((ch) => { const f = ch.state.familiar; ch.state.wp = Math.min(effWpMax(ch), ch.state.wp + (f.wp || 0)); ch.state.familiar = null; });
          famPanel.appendChild(rm);
        }
        root.appendChild(famPanel);
      }

      // Summons & Companions (Phase 4B)
      const compPanel = el(`<div class="panel"><h3>Summons &amp; Companions</h3><p class="stat-line">Track raised undead, summoned creatures, familiars, and animal companions — each with its own HP.</p></div>`);
      (c.companions || []).forEach((cp, i) => {
        const row = el(`<div class="comp-row"><div class="comp-info"><b>${esc(cp.name)}</b>${cp.notes ? `<br><span class="stat-line">${esc(cp.notes.length > 90 ? cp.notes.slice(0, 90) + "…" : cp.notes)}</span>` : ""}</div></div>`);
        if (cp.hpMax > 0) {
          const ctrl = el(`<div class="stepper"></div>`);
          const m = el(`<button class="step">−</button>`), v = el(`<span class="vital-val" style="min-width:54px">${cp.hp}/${cp.hpMax}</span>`), p = el(`<button class="step">+</button>`);
          m.onclick = () => this.mutate((ch) => { ch.companions[i].hp = Math.max(0, ch.companions[i].hp - 1); });
          p.onclick = () => this.mutate((ch) => { ch.companions[i].hp = Math.min(ch.companions[i].hpMax, ch.companions[i].hp + 1); });
          ctrl.append(m, v, p); row.appendChild(ctrl);
        }
        const sethp = el(`<button class="step" title="set max HP">HP</button>`);
        sethp.onclick = async () => { const raw = await promptModal(`Max HP for ${cp.name}?`, { title: "Set max HP", inputType: "number", defaultValue: cp.hpMax || "", okText: "Set" }); if (raw == null) return; const n = parseInt(raw, 10); if (!isNaN(n)) this.mutate((ch) => { ch.companions[i].hpMax = Math.max(0, n); ch.companions[i].hp = Math.max(0, n); }); };
        const rm = el(`<button class="step rm" aria-label="Remove companion">✕</button>`); rm.onclick = () => this.mutate((ch) => ch.companions.splice(i, 1));
        row.append(sethp, rm);
        compPanel.appendChild(row);
      });
      const addComp = el(`<div class="inv-add"></div>`);
      const compName = el(`<input type="text" placeholder="Add a summon / companion…">`);
      const compHp = el(`<input type="number" class="wt" min="0" step="1" value="0" title="max HP">`);
      const compBtn = el(`<button class="btn secondary">Add</button>`);
      const doAddComp = () => { const n = compName.value.trim(); if (!n) return; this.addCompanion(n, Math.max(0, Number(compHp.value) || 0), ""); };
      compBtn.onclick = doAddComp; compName.onkeydown = (e) => { if (e.key === "Enter") doAddComp(); };
      addComp.append(compName, compHp, compBtn); compPanel.appendChild(addComp);
      root.appendChild(compPanel);

      // Inventory + encumbrance (slot-based, rules-accurate)
      const used = encUsed(c), limit = encLimit(c), over = used > limit;
      const invPanel = el(`<div class="panel"><h3>Inventory</h3></div>`);
      const coinTot = (c.inventory.money.gold||0)+(c.inventory.money.silver||0)+(c.inventory.money.copper||0);
      const coinSlots = Math.floor(coinTot / ((DB.currency && DB.currency.coinsPerItem) || 100));
      invPanel.appendChild(el(`<div class="enc-bar"><div class="enc-fill ${over?"over":""}" style="width:${Math.min(100, limit?used/limit*100:0)}%"></div></div>`));
      invPanel.appendChild(el(`<p class="stat-line">${used} / ${limit} item slots used${coinSlots?` · ${coinTot} coins → ${coinSlots} slot${coinSlots>1?"s":""}`:""}${over?` · <b style="color:var(--bad)">Over-encumbered! Make a STR roll to move.</b>`:""}</p>`));
      if (over) {
        const strBtn = el(`<button class="btn ghost block" style="border-color:var(--bad);color:var(--bad);margin-bottom:10px">⚖ Roll STR to move (over-encumbered)</button>`);
        strBtn.onclick = () => {
          const m = modal("Over-encumbered — STR roll to move");
          const out = el(`<div class="roll-result" role="status" aria-live="polite"></div>`);
          const b = el(`<button class="btn block">Roll d20 ≤ STR ${c.attributes.STR}</button>`);
          b.onclick = () => { b.disabled = true; b.style.opacity = "0.4"; const r = Dice.d(20); const ok = r <= c.attributes.STR; out.innerHTML = `<p class="outcome ${ok?"ok":"bad"}">${r} vs STR ${c.attributes.STR} — ${ok?"You can move this turn / travel the shift.":"You fail to move (no movement this turn / no progress this shift)."}</p>`; };
          m.body.append(el(`<p class="stat-line">While over the encumbrance limit you must succeed a STR roll to move in combat or travel a shift.</p>`), b, out);
        };
        invPanel.appendChild(strBtn);
      }

      const items = c.inventory.items || [];
      // Equip caps: 1 armor + 1 helmet + up to 3 weapons-at-hand (shields count).
      const counts = { armor: 0, helmet: 0, weapon: 0 };
      items.forEach((x) => { if (x.equipped) { const k = classifyItem(x.name); if (counts[k] != null) counts[k]++; } });
      const itemRow = (it, i, isEquipped) => {
        const row = el(`<div class="inv-row"><span class="inv-name">${esc(it.name)}</span></div>`);
        const slot = classifyItem(it.name);
        const wpns = resolveEquippedWeapons([it]);
        wpns.forEach((wpn) => {
          const dmg = el(`<button class="step dmg" title="roll attack / damage (${esc(wpn.name)})" aria-label="Roll attack or damage with ${esc(wpn.name)}">⚔ ${wpns.length > 1 ? esc(wpn.name) : ""}</button>`);
          dmg.onclick = () => Roller.damage(this.id, wpn);
          row.appendChild(dmg);
        });
        // Durability for equipped weapons/shields that have a rating.
        if (isEquipped && slot === "weapon" && wpns[0] && wpns[0].durability != null) {
          const max = wpns[0].durability;
          const cur = it.durability == null ? max : it.durability;
          const broken = cur <= 0;
          const dctrl = el(`<span class="stepper" title="durability"></span>`);
          const dm = el(`<button class="step">−</button>`), dv = el(`<span class="vital-val" style="min-width:52px;${broken?"color:var(--bad)":""}">${cur}/${max}${broken?" 💥":""}</span>`), dp = el(`<button class="step">+</button>`);
          dm.onclick = () => this.mutate((ch) => { const x = ch.inventory.items[i]; x.durability = Math.max(0, (x.durability == null ? max : x.durability) - 1); });
          dp.onclick = () => this.mutate((ch) => { const x = ch.inventory.items[i]; x.durability = Math.min(max, (x.durability == null ? max : x.durability) + 1); });
          dctrl.append(dm, dv, dp); row.append(el(`<span class="stat-line">dur</span>`), dctrl);
        }
        // Equip / unequip control (only for equippable items).
        if (slot) {
          if (isEquipped) {
            const un = el(`<button class="step" style="width:auto;padding:0 8px" title="unequip">Unequip</button>`);
            un.onclick = () => this.mutate((ch) => { ch.inventory.items[i].equipped = false; });
            row.append(el(`<span class="tag">${slot}</span>`), un);
          } else {
            const eq = el(`<button class="step" style="width:auto;padding:0 8px" title="equip (exempt from encumbrance)">Equip</button>`);
            eq.onclick = () => {
              if (slot === "armor" && counts.armor >= 1) { showToast("You're already wearing armor. Unequip it first.", "error"); return; }
              if (slot === "helmet" && counts.helmet >= 1) { showToast("You're already wearing a helmet.", "error"); return; }
              if (slot === "weapon" && counts.weapon >= 3) { showToast("You can keep at most 3 weapons at hand.", "error"); return; }
              this.mutate((ch) => { const x = ch.inventory.items[i]; x.equipped = true; if (slot === "weapon") { const w = resolveEquippedWeapons([x.name])[0]; if (w && w.durability != null && x.durability == null) x.durability = w.durability; } });
            };
            row.append(el(`<span class="tag" style="opacity:0.55">${slot}</span>`), eq);
          }
        }
        if (!isEquipped) {
          const wt = el(`<input type="number" class="wt" min="0" step="1" value="${it.weight}">`);
          wt.onchange = () => this.mutate((ch) => { ch.inventory.items[i].weight = Math.max(0, Number(wt.value)||0); });
          row.append(el(`<span class="stat-line">wt</span>`), wt);
        }
        if (it.name.match(/\(dose\)|elixir|oil|draught|potion|poison|acid|brew/i)) {
          const useBtn = el(`<button class="step" style="width:auto;padding:0 6px;border-color:#50c878;color:#50c878" title="consume potion/brew">🧪 Use</button>`);
          useBtn.onclick = () => SpellAutomation.usePotion(this.id, it, i);
          row.append(useBtn);
        }
        const rm = el(`<button class="step rm" aria-label="Remove ${esc(it.name)}">✕</button>`);
        rm.onclick = () => this.mutate((ch) => { ch.inventory.items.splice(i, 1); });
        row.append(rm);
        return row;
      };

      const equippedIdx = items.map((it, i) => ({ it, i })).filter((x) => x.it.equipped);
      const carriedIdx = items.map((it, i) => ({ it, i })).filter((x) => !x.it.equipped);
      if (equippedIdx.length) {
        invPanel.appendChild(el(`<p class="stat-line" style="margin:6px 0 2px"><b>Equipped</b> <span class="stat-line">(armor · helmet · up to 3 weapons-at-hand — no encumbrance)</span></p>`));
        equippedIdx.forEach(({ it, i }) => invPanel.appendChild(itemRow(it, i, true)));
      }
      invPanel.appendChild(el(`<p class="stat-line" style="margin:8px 0 2px"><b>Carried</b></p>`));
      const itemList = el(`<div></div>`);
      carriedIdx.forEach(({ it, i }) => itemList.appendChild(itemRow(it, i, false)));
      if (!carriedIdx.length) itemList.appendChild(el(`<p class="stat-line">No carried items.</p>`));
      invPanel.appendChild(itemList);
      const addRow = el(`<div class="inv-add"></div>`);
      const addName = el(`<input type="text" placeholder="Add an item…">`);
      const addWt = el(`<input type="number" class="wt" min="0" step="1" value="1" title="weight">`);
      const addBtn = el(`<button class="btn secondary">Add</button>`);
      const doAdd = () => { const name = addName.value.trim(); if (!name) return; this.mutate((ch) => ch.inventory.items.push({ name, weight: Math.max(0, Number(addWt.value)||0), equipped: false })); };
      addBtn.onclick = doAdd; addName.onkeydown = (e) => { if (e.key === "Enter") doAdd(); };
      addRow.append(addName, addWt, addBtn); invPanel.appendChild(addRow);

      // Tiny items + mementos
      if ((c.inventory.tiny||[]).length) invPanel.appendChild(el(`<p class="stat-line"><b>Tiny items:</b> ${c.inventory.tiny.map((t)=>esc(t.name)).join(", ")}</p>`));
      if ((c.inventory.mementos||[]).length) invPanel.appendChild(el(`<p class="stat-line"><b>Memento:</b> ${c.inventory.mementos.map(esc).join("; ")}</p>`));

      // Money
      const money = el(`<div class="money"></div>`);
      ["gold","silver","copper"].forEach((coin) => {
        const box = el(`<div class="coin"><div class="coin-label">${coin}</div></div>`);
        const ctrl = el(`<div class="stepper"></div>`);
        const m = el(`<button class="step">−</button>`), v = el(`<span class="vital-val">${c.inventory.money[coin]}</span>`), p = el(`<button class="step">+</button>`);
        m.onclick = () => this.mutate((ch) => { ch.inventory.money[coin] = Math.max(0, ch.inventory.money[coin] - 1); });
        p.onclick = () => this.mutate((ch) => { ch.inventory.money[coin] = ch.inventory.money[coin] + 1; });
        ctrl.append(m, v, p); box.appendChild(ctrl); money.appendChild(box);
      });
      invPanel.appendChild(el(`<h3 style="margin-top:14px">Money</h3>`)); invPanel.appendChild(money);
      root.appendChild(invPanel);

      // Flavor + notes
      const flav = el(`<div class="panel"><h3>Character</h3>
        ${c.identity.appearance?`<p class="stat-line"><b>Appearance:</b> ${esc(c.identity.appearance)}</p>`:""}
        ${c.identity.weakness?`<p class="stat-line"><b>Weakness:</b> ${esc(c.identity.weakness)}</p>`:""}</div>`);
      // Overcome Weakness / re-choose after cooldown.
      if (c.identity.weakness) {
        const owBtn = el(`<button class="btn ghost" style="border-color:var(--accent)">⚡ Overcome Weakness (+2 marks)</button>`);
        owBtn.onclick = () => this.overcomeWeakness();
        flav.appendChild(owBtn);
      } else if (c.state.weaknessCooldown) {
        flav.appendChild(el(`<p class="stat-line"><i>Weakness overcome — a new weakness can be chosen next session.</i></p>`));
      } else {
        const wkRow = el(`<div class="inv-add"></div>`);
        const wkIn = el(`<input type="text" placeholder="Choose a new weakness…">`);
        const wkBtn = el(`<button class="btn secondary">Set</button>`);
        const doWk = () => { const v = wkIn.value.trim(); if (!v) return; this.mutate((ch) => { ch.identity.weakness = v; }); };
        wkBtn.onclick = doWk; wkIn.onkeydown = (e) => { if (e.key === "Enter") doWk(); };
        wkRow.append(wkIn, wkBtn); flav.appendChild(wkRow);
      }
      const notesField = el(`<div class="form-field"><label>Notes / Journal</label></div>`);
      const notes = el(`<textarea rows="4" placeholder="Session notes, threads, loot…"></textarea>`);
      notes.value = c.notes || "";
      notes.oninput = () => { if (canEdit) Store.update(this.id, (ch) => { ch.notes = notes.value; }); }; // save without re-render
      notesField.appendChild(notes); flav.appendChild(notesField); root.appendChild(flav);

      if (canEdit) {
        if (inPartyCamp) {
          const inParty = c.campaignId === Sync.campaign.id;
          const partyBtn = el(`<button class="btn secondary block" style="margin-top:14px">${inParty ? "🛡️ Remove from Party Campaign" : "⚡ Add to Party Campaign"}</button>`);
          partyBtn.onclick = () => { Store.toggleParty(this.id); this.render(); };
          root.appendChild(partyBtn);
        }
        // Delete
        const del = el(`<button class="btn ghost block" style="margin-top:6px">Delete hero</button>`);
        del.onclick = async () => { if (await confirmModal("Delete " + c.identity.name + "? This cannot be undone.", { title: "Delete hero", okText: "Delete", danger: true })) { window.activeCharacterId = null; Store.remove(this.id); Router.go("home"); } };
        root.appendChild(del);
      } else {
        notes.readOnly = true;
        root.querySelectorAll("input").forEach(inp => inp.disabled = true);
        root.addEventListener("click", (e) => {
          if (e.target.id === "sheet-back" || e.target.closest("#sheet-back")) return;
          e.stopPropagation();
          e.preventDefault();
          this.toast("🔒 Read-Only: You cannot roll or edit another player's hero.");
        }, true);
      }

      // Mount, preserving scroll across re-renders
      const y = window.scrollY;
      const s = $("#screen"); s.innerHTML = ""; s.appendChild(root); window.scrollTo(0, y);
      root.querySelector("#sheet-back").onclick = () => { window.activeCharacterId = null; Router.go("home"); };
    }
  };

  /* =================================================================
   * Combat-round helper (Phase 4) — local initiative tracker
   * ================================================================= */
