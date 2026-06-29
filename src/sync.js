/* sync.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $, FANTASY_WORDS, uid } from './core.js';
import { confirmModal, showToast } from './ui.js';
import { Settings } from './settings.js';
import { Store, syncCharToCombat } from './store.js';
import { Sheet } from './sheet.js';
import { Combat } from './combat.js';
import { Router } from './router.js';
import { init } from './main.js';

export const Sync = {
    enabled: false,
    app: null,
    db: null,
    auth: null,
    storage: null,
    uid: null,
    user: null,
    campaign: null, // { id, joinCode, name, role }
    combatRef: null,
    charsRef: null,
    broadcastRef: null,
    broadcast: [],            // [{ id, text, ts, from }] — GM → players feed (last 30)
    _broadcastSeen: null,     // Set of message ids already seen (suppresses toast on initial load)
    isGm() { return !!(this.campaign && this.campaign.role === "gm"); },

    init() {
      if (!window.FIREBASE_ENABLED || typeof firebase === "undefined" || !window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
        return;
      }
      try {
        const customUrl = localStorage.getItem("dragonbane.customDbUrl");
        const cfg = { ...window.FIREBASE_CONFIG };
        if (customUrl) cfg.databaseURL = customUrl;
        if (!firebase.apps.length) {
          this.app = firebase.initializeApp(cfg);
        } else {
          this.app = firebase.app();
        }
        this.db = customUrl ? this.app.database(customUrl) : firebase.database();
        this.auth = firebase.auth();
        try { if (window.FIREBASE_CONFIG?.storageBucket && !window.FIREBASE_CONFIG.storageBucket.includes("YOUR_PROJECT")) this.storage = firebase.storage(); } catch (_) { this.storage = null; }
        this.enabled = true;
        Store.mode = "cloud";

        try { this.campaign = JSON.parse(localStorage.getItem("dragonbane.campaign")) || null; } catch (_) {}

        this.auth.onAuthStateChanged((user) => {
          if (user) {
            this.user = user;
            this.uid = user.uid;
            this.attachListeners();
            this.updateHeaderStatus();
          } else {
            this.auth.signInAnonymously().catch(() => {});
          }
        });
      } catch (e) {
        console.warn("Firebase initialization failed:", e);
      }
    },

    updateHeaderStatus() {
      const pill = $("#sync-status");
      if (!pill) return;
      if (this.enabled && this.uid) {
        if (this.campaign) {
          pill.textContent = `Party (${this.campaign.joinCode})`;
          pill.className = "status-pill synced";
          pill.title = `Connected to ${this.campaign.name}`;
        } else {
          pill.textContent = "⚡ Join Party";
          pill.className = "status-pill local";
          pill.title = "Cloud sync active — Click to join or create a party campaign";
        }
      } else {
        pill.textContent = "Local";
        pill.className = "status-pill local";
        pill.title = "Local / offline storage";
      }
    },

    async ensureAuth() {
      if (!this.enabled) this.init();
      if (!this.enabled) {
        if (typeof firebase === "undefined") {
          this.lastAuthError = "Firebase SDK failed to load. Check internet connection or privacy ad-blocker.";
        } else if (!window.FIREBASE_ENABLED) {
          this.lastAuthError = "FIREBASE_ENABLED is set to false in firebase-config.js.";
        } else if (!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
          this.lastAuthError = "Firebase API keys are missing or placeholder in firebase-config.js.";
        } else {
          this.lastAuthError = "Cloud sync failed to initialize.";
        }
        return false;
      }
      if (!this.uid && this.auth) {
        try {
          const cred = await this.auth.signInAnonymously();
          this.user = cred.user;
          this.uid = cred.user.uid;
        } catch (e) {
          console.warn("Anonymous sign-in failed:", e);
          this.lastAuthError = e.message || e.code || String(e);
          let localUid = localStorage.getItem("dragonbane.localUid");
          if (!localUid) {
            localUid = "anon_" + Math.random().toString(36).slice(2, 11);
            localStorage.setItem("dragonbane.localUid", localUid);
          }
          this.uid = localUid;
        }
      }
      return !!this.uid;
    },

    generateJoinCode() {
      const w = FANTASY_WORDS;
      const pick = () => w[Math.floor(Math.random() * w.length)];
      return `${pick()}-${pick()}-${pick()}`;
    },

    timeoutRace(promise, actionName) {
      return Promise.race([
        promise,
        new Promise((_, rej) => setTimeout(() => rej(new Error(`Realtime Database connection timed out during '${actionName}'.\n\nThe database is not responding or doesn't exist yet.`)), 6000))
      ]);
    },

    async createCampaign(name) {
      if (!await this.ensureAuth()) {
        showToast(`Cloud sync could not connect:\n\n${this.lastAuthError || "Check firebase-config.js setup."}`, "error");
        return;
      }
      const id = "camp_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const joinCode = this.generateJoinCode();
      const camp = { id, name: name || "Dragonbane Campaign", joinCode, createdAt: Date.now(), ownerUid: this.uid };
      try {
        await this.timeoutRace(Promise.all([
          this.db.ref(`campaigns/${id}/meta`).set(camp),
          this.db.ref(`campaigns/${id}/members/${this.uid}`).set({ displayName: "Game Master", role: "gm" }),
          this.db.ref(`joinCodes/${joinCode}`).set(id)
        ]), "create campaign");
      } catch (err) {
        console.error("Failed to create campaign in RTDB:", err);
        showToast(`Database error:\n${err.message || err.code || "Permission denied"}\n\nCheck your Firebase Console > Realtime Database > Rules tab.`, "error");
        return;
      }
      this.campaign = { id, joinCode, name: camp.name, role: "gm" };
      localStorage.setItem("dragonbane.campaign", JSON.stringify(this.campaign));
      this.attachListeners();
      this.updateHeaderStatus();
      showToast(`Created campaign "${camp.name}"!\nInvite Code: ${joinCode}`, "success");
      Router.go("about");
    },

    async joinCampaign(code) {
      if (!await this.ensureAuth()) {
        showToast(`Cloud sync could not connect:\n\n${this.lastAuthError || "Check firebase-config.js setup."}`, "error");
        return;
      }
      const clean = String(code).trim().toLowerCase();
      if (!clean) return;
      try {
        const snap = await this.timeoutRace(this.db.ref(`joinCodes/${clean}`).once("value"), "verify join code");
        const id = snap.val();
        if (!id) { showToast("Invalid join code. Check spelling and try again.", "error"); return; }
        const metaSnap = await this.timeoutRace(this.db.ref(`campaigns/${id}/meta`).once("value"), "fetch campaign info");
        const meta = metaSnap.val() || { name: "Campaign" };
        await this.timeoutRace(this.db.ref(`campaigns/${id}/members/${this.uid}`).set({ displayName: "Player", role: "player" }), "join campaign");
        this.campaign = { id, joinCode: clean, name: meta.name, role: "player" };
      } catch (err) {
        console.error("Failed to join campaign in RTDB:", err);
        let msg = `Database error:\n${err.message || err.code || "Permission denied"}\n\n`;
        if (err.message && err.message.includes("timed out")) {
          msg += `To fix timeout:\n1. Open console.firebase.google.com\n2. Go to Build > Realtime Database\n3. Ensure database exists and check Rules tab.`;
        } else {
          msg += `Check your Firebase Console > Realtime Database > Rules tab.`;
        }
        showToast(msg);
        return;
      }
      localStorage.setItem("dragonbane.campaign", JSON.stringify(this.campaign));
      this.attachListeners();
      this.updateHeaderStatus();
      showToast(`Joined campaign "${this.campaign.name}"!`, "success");
      Router.go("home");
    },

    async leaveCampaign() {
      if (await confirmModal("Disconnect from current campaign? Your local characters will remain.", { title: "Leave campaign", okText: "Disconnect" })) {
        this.detachListeners();
        this.campaign = null;
        localStorage.removeItem("dragonbane.campaign");
        this.updateHeaderStatus();
        Router.go("about");
      }
    },

    linkGoogle() {
      if (!this.enabled || !this.auth || !this.user) return;
      const provider = new firebase.auth.GoogleAuthProvider();
      this.user.linkWithPopup(provider).then((res) => {
        this.user = res.user;
        this.uid = res.user.uid;
        showToast("Linked to Google account: " + (res.user.displayName || res.user.email), "success");
        Router.go("about");
      }).catch((err) => {
        if (err.code === "auth/credential-already-in-use") {
          showToast("This Google account is already linked to another Dragonbane profile.", "error");
        } else if (err.code === "auth/unauthorized-domain") {
          const domain = window.location.hostname || "your current domain";
          showToast(`Google linking blocked (Unauthorized Domain):\n\nFirebase does not recognize '${domain}' as an authorized website for Google Login.\n\nTo allow login on this domain:\n1. Open console.firebase.google.com\n2. Select project '${window.FIREBASE_CONFIG?.projectId || "dragonbane-rpg-party"}'\n3. Go to Build > Authentication > Settings tab > Authorized domains\n4. Click 'Add domain', paste:\n   ${domain}\n5. Save and try linking again.`, "error");
        } else {
          showToast("Google linking failed: " + err.message, "error");
        }
      });
    },

    attachListeners() {
      this.detachListeners();
      if (!this.enabled || !this.campaign) return;
      const id = this.campaign.id;

      this.combatRef = this.db.ref(`campaigns/${id}/combat`);
      this.combatRef.on("value", (snap) => {
        const val = snap.val();
        if (val) {
          const newJson = JSON.stringify(val);
          const prevJson = localStorage.getItem("dragonbane.combat");
          localStorage.setItem("dragonbane.combat", newJson);
          if (prevJson === newJson) return;
          (val.combatants || []).forEach(cb => {
            if (cb.kind === "hero" && cb.charId) {
              const ch = Store.get(cb.charId);
              if (ch) {
                let changed = false;
                if (cb.hp != null && ch.state.hp !== cb.hp) { ch.state.hp = cb.hp; changed = true; }
                if (cb.wp != null && ch.state.wp !== cb.wp) { ch.state.wp = cb.wp; changed = true; }
                if (changed) Store.put(ch);
              }
            }
          });
          const partyBtn = $("#app-nav button[data-route='party']");
          if (partyBtn && partyBtn.classList.contains("active")) {
            Combat.rerender();
          }
        }
      });

      this.charsRef = this.db.ref("characters").orderByChild("campaignId").equalTo(id);
      this.charsRef.on("value", (snap) => {
        const list = [];
        snap.forEach((cSnap) => { list.push(cSnap.val()); });
        const local = Store.listLocalOnly();
        const merged = [...local];
        list.forEach((rem) => {
          const idx = merged.findIndex((x) => x.id === rem.id);
          if (idx >= 0) merged[idx] = rem;
          else merged.push(rem);
        });
        const newJson = JSON.stringify(merged);
        const prevJson = localStorage.getItem(Store.KEY);
        localStorage.setItem(Store.KEY, newJson);
        list.forEach(rem => syncCharToCombat(rem));
        if (prevJson === newJson) return;
        const homeBtn = $("#app-nav button[data-route='home']");
        if (window.activeCharacterId && Store.get(window.activeCharacterId)) {
          if ($("#screen .wiz-progress")) {
            Sheet.render();
          }
        } else if (homeBtn && homeBtn.classList.contains("active")) {
          Router.go("home");
        }
      });

      // GM → players broadcast feed.
      this._broadcastSeen = null;
      this.broadcastRef = this.db.ref(`campaigns/${id}/broadcast`).limitToLast(30);
      this.broadcastRef.on("value", (snap) => {
        const list = [];
        snap.forEach((m) => { const v = m.val() || {}; list.push({ id: m.key, text: v.text || "", ts: v.ts || 0, from: v.from || "" }); });
        list.sort((a, b) => a.ts - b.ts);
        this.broadcast = list;
        const firstLoad = this._broadcastSeen === null;
        const seen = this._broadcastSeen || new Set();
        // Toast only genuinely-new messages from someone else (not on initial load, not your own).
        if (!firstLoad) {
          list.forEach((msg) => { if (!seen.has(msg.id) && msg.from !== this.uid) showToast("📢 GM: " + msg.text); });
        }
        this._broadcastSeen = new Set(list.map((m) => m.id));
        // Refresh the GM-messages panel if a sheet is open.
        if (window.activeCharacterId && Store.get(window.activeCharacterId) && $("#screen .wiz-progress")) Sheet.render();
      });
    },

    detachListeners() {
      if (this.combatRef) { this.combatRef.off(); this.combatRef = null; }
      if (this.charsRef) { this.charsRef.off(); this.charsRef = null; }
      if (this.broadcastRef) { this.broadcastRef.off(); this.broadcastRef = null; }
      this.broadcast = []; this._broadcastSeen = null;
    },

    // GM pushes a message (or a rolled table result) to all players in the campaign.
    pushBroadcast(text) {
      text = String(text || "").trim();
      if (!text) return false;
      if (!this.enabled || !this.db || !this.isGm()) { showToast("Only a campaign GM (synced) can push to players.", "warn"); return false; }
      this.db.ref(`campaigns/${this.campaign.id}/broadcast`).push({ text, ts: Date.now(), from: this.uid }).catch(() => {});
      showToast("Sent to players.", "success");
      return true;
    },

    clearBroadcast() {
      if (!this.enabled || !this.db || !this.isGm()) return;
      this.db.ref(`campaigns/${this.campaign.id}/broadcast`).remove().catch(() => {});
    },

    pushChar(charObj) {
      if (!this.enabled || !this.uid || !this.db || !charObj.campaignId) return;
      const payload = { ...charObj, owner: charObj.owner || this.uid };
      this.db.ref(`characters/${charObj.id}`).set(payload).catch(() => {});
    },

    removeChar(charId) {
      if (!this.enabled || !this.uid || !this.db) return;
      this.db.ref(`characters/${charId}`).remove().catch(() => {});
    },

    pushCombat(combatState) {
      if (!this.enabled || !this.campaign || !this.db) return;
      this.db.ref(`campaigns/${this.campaign.id}/combat`).set(combatState).catch(() => {});
    }
  };

  /* =================================================================
   * Theme
   * ================================================================= */

export const Theme = {
    KEY: "dragonbane.theme",
    init() {
      const saved = localStorage.getItem(this.KEY) || "light";
      this.apply(saved);
      $("#theme-toggle").addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        this.apply(next);
        localStorage.setItem(this.KEY, next);
      });
    },
    apply(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      $("#theme-toggle").textContent = theme === "dark" ? "☀" : "☾";
    }
  };

  /* =================================================================
   * Small render helpers
   * ================================================================= */
