/* store.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { showToast } from './ui.js';
import { Settings } from './settings.js';
import { Sync } from './sync.js';
import { Combat } from './combat.js';

export function syncCharToCombat(c) {
    if (typeof Combat !== "undefined" && c) {
      const cs = Combat.load();
      const cb = cs.combatants?.find(x => x.charId === c.id);
      if (cb && (cb.hp !== c.state?.hp || cb.wp !== c.state?.wp)) {
        cb.hp = c.state?.hp; cb.wp = c.state?.wp;
        if (cb.hp > 0) cb.defeated = false;
        Combat.save(cs);
      }
    }
  }

  /* =================================================================
   * Storage layer
   * Local mode (default): characters live in localStorage. Firebase sync
   * (Phase 5) will implement the same interface and swap in when enabled.
   * ================================================================= */

export const Store = {
    KEY: "dragonbane.characters",
    mode: window.FIREBASE_ENABLED ? "cloud" : "local",
    list() {
      try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
      catch (_) { return []; }
    },
    listLocalOnly() {
      return this.list().filter((c) => !c.campaignId);
    },
    save(chars) { localStorage.setItem(this.KEY, JSON.stringify(chars)); },
    put(c) {
      const list = this.list();
      const idx = list.findIndex((x) => x.id === c.id);
      if (idx >= 0) list[idx] = c; else list.push(c);
      this.save(list);
      syncCharToCombat(c);
      if (typeof Sync !== "undefined" && Sync.enabled) {
        if (!c.owner && Sync.uid) c.owner = Sync.uid;
        if (c.campaignId) Sync.pushChar(c);
      }
      return c;
    },
    get(id) { return this.list().find((x) => x.id === id) || null; },
    // Apply a mutator to one character and persist. Returns the updated char.
    update(id, fn) {
      const list = this.list(); const c = list.find((x) => x.id === id); if (!c) return null; fn(c); this.save(list);
      syncCharToCombat(c);
      if (typeof Sync !== "undefined" && Sync.enabled && c.campaignId && (c.owner === Sync.uid || (Sync.campaign && Sync.campaign.role === "gm"))) {
        Sync.pushChar(c);
      }
      return c;
    },
    toggleParty(id) {
      const list = this.list();
      const c = list.find((x) => x.id === id);
      if (!c) return null;
      if (typeof Sync === "undefined" || !Sync.enabled || !Sync.campaign) {
        showToast("You must join or create a party campaign first.", "error");
        return null;
      }
      if (c.campaignId === Sync.campaign.id) {
        c.campaignId = null;
        this.save(list);
        Sync.removeChar(c.id);
      } else {
        c.campaignId = Sync.campaign.id;
        if (!c.owner && Sync.uid) c.owner = Sync.uid;
        this.save(list);
        Sync.pushChar(c);
      }
      return c;
    },
    remove(id) {
      const c = this.get(id);
      this.save(this.list().filter((x) => x.id !== id));
      if (typeof Sync !== "undefined" && Sync.enabled && c?.campaignId) Sync.removeChar(id);
    },
    // Wipe locally-stored heroes and the local combat tracker (keeps theme,
    // settings, and any active campaign connection). Used by Settings → Clear.
    clear() {
      localStorage.removeItem(this.KEY);
      localStorage.removeItem("dragonbane.combat");
      window.activeCharacterId = null;
    }
  };

  /* =================================================================
   * Firebase Sync & Multiplayer (Phase 5)
   * ================================================================= */
