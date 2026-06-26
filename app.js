/*
 * app.js — Dragonbane Player (application shell)
 * ----------------------------------------------
 * Phase 0 scaffold: bootstrap, local/offline storage layer, theme toggle,
 * routing, and a working Rules browser backed by the data.js library.
 *
 * Character creation wizard (Phase 1), full tracker (Phase 2), dice engine
 * (Phase 3), in-play systems (Phase 4), and Firebase sync (Phase 5) are
 * built on top of this shell. See CLAUDE.md for the roadmap.
 */
(function () {
  "use strict";

  const DB = window.DRAGONBANE || {};
  const $ = (sel, root = document) => root.querySelector(sel);

  /* =================================================================
   * Storage layer
   * Local mode (default): characters live in localStorage. Firebase sync
   * (Phase 5) will implement the same interface and swap in when enabled.
   * ================================================================= */
  const Store = {
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
      if (typeof Sync !== "undefined" && Sync.enabled) {
        if (!c.owner && Sync.uid) c.owner = Sync.uid;
        if (Sync.campaign && !c.campaignId) c.campaignId = Sync.campaign.id;
        Sync.pushChar(c);
      }
      return c;
    },
    get(id) { return this.list().find((x) => x.id === id) || null; },
    // Apply a mutator to one character and persist. Returns the updated char.
    update(id, fn) {
      const list = this.list(); const c = list.find((x) => x.id === id); if (!c) return null; fn(c); this.save(list);
      if (typeof Sync !== "undefined" && Sync.enabled && (c.owner === Sync.uid || (Sync.campaign && Sync.campaign.role === "gm"))) {
        Sync.pushChar(c);
      }
      return c;
    },
    remove(id) {
      this.save(this.list().filter((x) => x.id !== id));
      if (typeof Sync !== "undefined" && Sync.enabled) Sync.removeChar(id);
    }
  };

  /* =================================================================
   * Firebase Sync & Multiplayer (Phase 5)
   * ================================================================= */
  const FANTASY_WORDS = ["dragon","demon","sword","shield","spear","mage","knight","wolf","falcon","griffon","shadow","flame","frost","storm","thunder","crown","skull","rune","iron","gold","ruby","emerald","forest","mountain","river","cavern","tower","castle","keep","dungeon","red","blue","dark","light","wild","ancient","mighty","silent","broken","golden"];

  const Sync = {
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
        alert(`Cloud sync could not connect:\n\n${this.lastAuthError || "Check firebase-config.js setup."}`);
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
        alert(`Database error:\n${err.message || err.code || "Permission denied"}\n\nCheck your Firebase Console > Realtime Database > Rules tab.`);
        return;
      }
      this.campaign = { id, joinCode, name: camp.name, role: "gm" };
      localStorage.setItem("dragonbane.campaign", JSON.stringify(this.campaign));
      this.attachListeners();
      this.updateHeaderStatus();
      alert(`Created campaign "${camp.name}"!\nInvite Code: ${joinCode}`);
      Router.go("about");
    },

    async joinCampaign(code) {
      if (!await this.ensureAuth()) {
        alert(`Cloud sync could not connect:\n\n${this.lastAuthError || "Check firebase-config.js setup."}`);
        return;
      }
      const clean = String(code).trim().toLowerCase();
      if (!clean) return;
      try {
        const snap = await this.timeoutRace(this.db.ref(`joinCodes/${clean}`).once("value"), "verify join code");
        const id = snap.val();
        if (!id) { alert("Invalid join code. Check spelling and try again."); return; }
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
        alert(msg);
        return;
      }
      localStorage.setItem("dragonbane.campaign", JSON.stringify(this.campaign));
      this.attachListeners();
      this.updateHeaderStatus();
      alert(`Joined campaign "${this.campaign.name}"!`);
      Router.go("home");
    },

    leaveCampaign() {
      if (confirm("Disconnect from current campaign? Your local characters will remain.")) {
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
        alert("Linked to Google account: " + (res.user.displayName || res.user.email));
        Router.go("about");
      }).catch((err) => {
        if (err.code === "auth/credential-already-in-use") {
          alert("This Google account is already linked to another Dragonbane profile.");
        } else if (err.code === "auth/unauthorized-domain") {
          const domain = window.location.hostname || "your current domain";
          alert(`Google linking blocked (Unauthorized Domain):\n\nFirebase does not recognize '${domain}' as an authorized website for Google Login.\n\nTo allow login on this domain:\n1. Open console.firebase.google.com\n2. Select project '${window.FIREBASE_CONFIG?.projectId || "dragonbane-rpg-party"}'\n3. Go to Build > Authentication > Settings tab > Authorized domains\n4. Click 'Add domain', paste:\n   ${domain}\n5. Save and try linking again.`);
        } else {
          alert("Google linking failed: " + err.message);
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
          localStorage.setItem("dragonbane.combat", JSON.stringify(val));
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
        localStorage.setItem(Store.KEY, JSON.stringify(merged));
        const homeBtn = $("#app-nav button[data-route='home']");
        if (window.activeCharacterId && Store.get(window.activeCharacterId)) {
          if ($("#screen .wiz-progress")) {
            Sheet.render();
          }
        } else if (homeBtn && homeBtn.classList.contains("active")) {
          Router.go("home");
        }
      });
    },

    detachListeners() {
      if (this.combatRef) { this.combatRef.off(); this.combatRef = null; }
      if (this.charsRef) { this.charsRef.off(); this.charsRef = null; }
    },

    pushChar(charObj) {
      if (!this.enabled || !this.uid || !this.db) return;
      const payload = { ...charObj, owner: charObj.owner || this.uid };
      if (this.campaign && !payload.campaignId) payload.campaignId = this.campaign.id;
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
  const Theme = {
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
  const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const sectionTitle = (t) => `<div class="section-title"><h2>${esc(t)}</h2><span class="rule"></span></div>`;
  const uid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const mountScreen = (node) => { const s = $("#screen"); s.innerHTML = ""; s.appendChild(node); window.scrollTo(0, 0); };

  /* =================================================================
   * Dice + rules calculations (from data.js tables)
   * ================================================================= */
  const Dice = {
    d(sides) { return Math.floor(Math.random() * sides) + 1; },
    // Parse and roll a spec like "D6", "2D8", "4D6".
    roll(spec) {
      const m = /^(\d*)d(\d+)$/i.exec(String(spec).trim());
      if (!m) return parseInt(spec, 10) || 0;
      const n = parseInt(m[1] || "1", 10), sides = parseInt(m[2], 10);
      let t = 0; for (let i = 0; i < n; i++) t += this.d(sides);
      return t;
    },
    // 4D6, drop the lowest die → 3-18.
    attribute() {
      const r = [this.d(6), this.d(6), this.d(6), this.d(6)].sort((a, b) => a - b);
      return r[1] + r[2] + r[3];
    }
  };

  const Calc = {
    lookup(table, score) { const row = (table || []).find((r) => score >= r.min && score <= r.max); return row ? row.value : null; },
    baseChance(score) { return this.lookup(DB.tables.baseChance, score) || 0; },
    damageBonus(score) { return this.lookup(DB.tables.damageBonus, score); }, // null | "D4" | "D6"
    movementMod(score) { return this.lookup(DB.tables.movementMod, score) || 0; },
    dmgBonusLabel(score) { const v = this.damageBonus(score); return v ? "+" + v : "—"; }
  };

  function findHeroicAbility(name) {
    let h = (DB.heroicAbilities || []).find((x) => x.name === name);
    if (!h && typeof DRAGONBANE_SOLO !== "undefined" && DRAGONBANE_SOLO.heroicAbilities) {
      h = DRAGONBANE_SOLO.heroicAbilities.find((x) => x.name === name);
    }
    return h || null;
  }

  function resolveEquippedWeapons(invItems) {
    if (!invItems || !Array.isArray(invItems)) return [];
    const dbWpns = DB.weapons || [];
    const found = [];
    invItems.forEach((it) => {
      const rawName = typeof it === "string" ? it : (it && it.name) || "";
      String(rawName).split("/").forEach((part) => {
        let clean = part.toLowerCase().replace(/[\s\-_(),]/g, "");
        if (!clean) return;
        if (clean.includes("lightcrossbow")) clean = "crossbowlight";
        if (clean.includes("heavycrossbow")) clean = "crossbowheavy";
        if (clean.includes("handcrossbow")) clean = "crossbowhand";
        if (clean.includes("warhammersmall") || clean.includes("lightwarhammer")) clean = "warhammerlight";
        if (clean.includes("warhammerlarge") || clean.includes("heavywarhammer")) clean = "warhammerheavy";
        if (clean.includes("shortsword")) clean = "shortsword";

        const w = dbWpns.find((dw) => {
          const cdw = dw.name.toLowerCase().replace(/[\s\-_(),]/g, "");
          return cdw === clean || (clean.length >= 4 && cdw.includes(clean)) || (cdw.length >= 4 && clean.includes(cdw));
        });
        if (w && !found.some((x) => x.name === w.name)) found.push(w);
      });
    });
    return found;
  }

  /* =================================================================
   * App settings (local)
   * ================================================================= */
  const Settings = {
    KEY: "dragonbane.settings",
    load() { try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch (_) { return {}; } },
    get(k) { return this.load()[k]; },
    set(k, v) { const s = this.load(); s[k] = v; localStorage.setItem(this.KEY, JSON.stringify(s)); },
    bookOfMagic() { return !!this.get("bookOfMagic"); },
    soloMode() { return !!this.get("soloMode"); }
  };

  /* =================================================================
   * Magic library — applies revised spells (always) and the Book of
   * Magic expansion (behind the content toggle). See CLAUDE.md §10.
   * ================================================================= */
  const MAGICX = window.DRAGONBANE_MAGIC || {};
  const CORE_SCHOOLS = ["general", "animism", "elementalism", "mentalism"];
  const Magic = {
    enabled() { return Settings.bookOfMagic(); },
    cap(k) { return k.charAt(0).toUpperCase() + k.slice(1); },
    // Effective tricks+spells for a core school, with revised overrides (always)
    // and Book of Magic additions (when enabled).
    corePool(key) {
      const base = (DB.spells && DB.spells[key]) || { tricks: [], spells: [] };
      const schoolName = key === "general" ? "General" : this.cap(key);
      const revised = (MAGICX.revisedSpells || []).filter((s) => s.school.toLowerCase() === schoolName.toLowerCase());
      const revByName = {}; revised.forEach((s) => revByName[s.name] = s);
      let spells = (base.spells || []).map((s) => revByName[s.name] || s);
      revised.forEach((s) => { if (!spells.some((x) => x.name === s.name)) spells.push(s); }); // e.g. Sleep added to Animism
      let tricks = [...(base.tricks || [])];
      if (this.enabled() && MAGICX.newSpells && MAGICX.newSpells[key]) {
        tricks = tricks.concat(MAGICX.newSpells[key].tricks || []);
        spells = spells.concat(MAGICX.newSpells[key].spells || []);
      }
      return { tricks, spells, name: schoolName };
    },
    newSchoolPool(key) { const s = (MAGICX.schools || {})[key]; return s ? { tricks: s.tricks || [], spells: s.spells || [], name: this.cap(key), entry: s.entry } : { tricks: [], spells: [], name: this.cap(key) }; },
    poolFor(key) { return CORE_SCHOOLS.includes(key) ? this.corePool(key) : this.newSchoolPool(key); },
    // Schools a newly created mage may select (Dracomancy is learn-in-play; Harmonism is bard-only).
    mageSchools() {
      const core = [["animism", "Animism"], ["elementalism", "Elementalism"], ["mentalism", "Mentalism"]];
      if (!this.enabled()) return core;
      const extra = Object.keys(MAGICX.schools || {}).filter((k) => k !== "dracomancy" && k !== "harmonism").map((k) => [k, this.cap(k)]);
      return core.concat(extra);
    },
    // All school keys to show in the Rules browser (core always; new ones when enabled).
    browseSchools() { return this.enabled() ? CORE_SCHOOLS.concat(Object.keys(MAGICX.schools || {})) : CORE_SCHOOLS; },
    // A reasonable trained-skill list for a new-school mage (the Book of Magic lists
    // recommended skills per school; not yet extracted — this generic set is used as a fallback).
    fallbackMageSkills(schoolDisplayName) { return [schoolDisplayName, "Awareness", "Evade", "Healing", "Languages", "Myths & Legends", "Spot Hidden", "Staves"]; }
  };

  // Parse a profession gear-row string into { items[], money } — rolls dice expressions.
  function parseGear(rowText) {
    const items = [], money = { gold: 0, silver: 0, copper: 0 };
    String(rowText).split(",").map((s) => s.trim()).filter(Boolean).forEach((piece) => {
      let m = /^(\d*d\d+|\d+)\s+(gold|silver|copper)$/i.exec(piece);
      if (m) { money[m[2].toLowerCase()] += Dice.roll(m[1]); return; }
      m = /^(\d*d\d+)\s+(.+)$/i.exec(piece); // e.g. "D6 food rations"
      if (m) { items.push(m[2] + " (×" + Dice.roll(m[1]) + ")"); return; }
      if (piece.includes("/")) {
        piece.split("/").map(s => s.trim()).filter(Boolean).forEach(sub => items.push(sub));
      } else {
        items.push(piece);
      }
    });
    return { items, money };
  }

  // Build the full skills map for a character (all core skills + trained magic school).
  function buildSkills(attrs, trainedSet, mageSchool) {
    const skills = {};
    (DB.skills || []).forEach((sk) => {
      if (sk.kind === "magic" && (!mageSchool || sk.name.toLowerCase() !== mageSchool)) return; // only the chosen school
      const base = Calc.baseChance(attrs[sk.attribute]);
      const trained = trainedSet.has(sk.name);
      skills[sk.name] = { attribute: sk.attribute, kind: sk.kind, base, level: trained ? base * 2 : base, trained, mark: false };
    });
    // Book of Magic schools aren't in DB.skills — add the chosen one as an INT-based magic skill.
    if (mageSchool && !["general", "animism", "elementalism", "mentalism"].includes(mageSchool)) {
      const display = mageSchool.charAt(0).toUpperCase() + mageSchool.slice(1);
      const base = Calc.baseChance(attrs.INT);
      const trained = trainedSet.has(display);
      skills[display] = { attribute: "INT", kind: "magic", base, level: trained ? base * 2 : base, trained, mark: false };
    }
    return skills;
  }

  /* =================================================================
   * Character Creation Wizard (Phase 1)
   * ================================================================= */
  const Wizard = {
    s: null,
    start() {
      this.s = {
        step: 0,
        rolled: null,            // six rolled attribute values
        assign: { STR: null, CON: null, AGL: null, INT: null, WIL: null, CHA: null }, // attr -> rolled index
        kin: null,
        profession: null,
        mageSchool: null,        // for mages: "animism" | "elementalism" | "mentalism"
        age: null,
        trained: new Set(),
        heroic: null,
        spells: { tricks: [], known: [] }, // mage only
        gearRow: null,
        identity: { name: "", appearance: "", weakness: "", memento: "" }
      };
      this.render();
    },
    // The ordered list of steps. Mages skip the heroic step; mages and
    // Harmonism-bards get a magic step.
    isMage() { return this.s.profession === "mage"; },
    isCaster() { return this.isMage() || (this.s.profession === "bard" && this.s.bardHarmonism); },
    steps() {
      return [
        "attributes", "kin", "profession", "age", "skills",
        ...(this.isMage() ? [] : ["heroic"]),
        ...(this.isCaster() ? ["magic"] : []),
        "gear", "details", "review"
      ];
    },
    prof() { return (DB.professions || []).find((p) => p.key === this.s.profession) || null; },
    kinObj() { return (DB.kin || []).find((k) => k.key === this.s.kin) || null; },
    ageObj() { return (DB.ages || []).find((a) => a.key === this.s.age) || null; },
    professionSkillList() {
      const p = this.prof(); if (!p) return [];
      if (p.key === "mage") {
        if (!this.s.mageSchool) return [];
        if (p.schools[this.s.mageSchool]) return p.schools[this.s.mageSchool]; // core schools
        return Magic.fallbackMageSkills(Magic.cap(this.s.mageSchool)); // Book of Magic schools (recommended set)
      }
      return p.skills;
    },
    // Final attribute scores (assigned values + age modifiers, capped 3-18).
    finalAttrs() {
      const a = {};
      const age = this.ageObj();
      Object.keys(this.s.assign).forEach((k) => {
        let v = this.s.rolled && this.s.assign[k] != null ? this.s.rolled[this.s.assign[k]] : 0;
        if (age && age.mods[k]) v += age.mods[k];
        a[k] = Math.max(3, Math.min(18, v));
      });
      return a;
    },

    render() {
      const step = this.steps()[this.s.step];
      const root = el(`<div></div>`);
      root.appendChild(el(`
        <div class="wiz-head">
          <button class="btn ghost wiz-x" id="wiz-cancel">✕</button>
          <div class="wiz-progress">Step ${this.s.step + 1} of ${this.steps().length} — ${this.stepTitle(step)}</div>
        </div>`));
      const bodyWrap = el(`<div id="wiz-body"></div>`);
      bodyWrap.appendChild(this["step_" + step]());
      root.appendChild(bodyWrap);

      const nav = el(`<div class="wiz-nav"></div>`);
      if (this.s.step > 0) { const b = el(`<button class="btn ghost">Back</button>`); b.onclick = () => { this.s.step--; this.render(); }; nav.appendChild(b); }
      const isLast = step === "review";
      const next = el(`<button class="btn">${isLast ? "Create hero" : "Next"}</button>`);
      next.onclick = () => { const err = this.validate(step); if (err) { alert(err); return; } if (isLast) { this.save(); } else { this.s.step++; this.render(); } };
      nav.appendChild(next);
      root.appendChild(nav);

      mountScreen(root);
      root.querySelector("#wiz-cancel").onclick = () => { if (confirm("Discard this character?")) Router.go("home"); };
    },
    stepTitle(step) {
      return { attributes: "Attributes", kin: "Kin", profession: "Profession", age: "Age",
        skills: "Trained Skills", magic: "Magic", heroic: "Heroic Ability",
        gear: "Starting Gear", details: "Details", review: "Review" }[step];
    },

    /* ---- Step: Attributes ---- */
    step_attributes() {
      const wrap = el(`<div class="panel"></div>`);
      wrap.appendChild(el(`<p class="stat-line">Roll 4D6 (drop the lowest) six times, then assign each score to an attribute. Age modifiers are applied later.</p>`));
      const rollBtn = el(`<button class="btn block" style="margin-bottom:14px">${this.s.rolled ? "Re-roll all" : "Roll attributes"}</button>`);
      const grid = el(`<div class="attr-grid"></div>`);
      const renderGrid = () => {
        grid.innerHTML = "";
        if (!this.s.rolled) { grid.appendChild(el(`<p class="stat-line">Press “Roll attributes” to begin.</p>`)); return; }
        grid.appendChild(el(`<div class="rolled-row">Rolled: ${this.s.rolled.map((v, i) => `<span class="tag ${Object.values(this.s.assign).includes(i) ? "used" : ""}">${v}</span>`).join("")}</div>`));
        (DB.attributes || []).forEach((at) => {
          const row = el(`<div class="attr-row"><label>${at.key} <span class="stat-line">${at.name}</span></label></div>`);
          const sel = el(`<select></select>`);
          sel.appendChild(el(`<option value="">—</option>`));
          this.s.rolled.forEach((v, i) => {
            const takenBy = Object.keys(this.s.assign).find((k) => this.s.assign[k] === i);
            if (takenBy && takenBy !== at.key) return;
            const o = el(`<option value="${i}">${v}</option>`); if (this.s.assign[at.key] === i) o.selected = true; sel.appendChild(o);
          });
          sel.onchange = () => { this.s.assign[at.key] = sel.value === "" ? null : parseInt(sel.value, 10); renderGrid(); };
          row.appendChild(sel);
          grid.appendChild(row);
        });
      };
      rollBtn.onclick = () => { this.s.rolled = [0,0,0,0,0,0].map(() => Dice.attribute()); this.s.assign = { STR:null,CON:null,AGL:null,INT:null,WIL:null,CHA:null }; renderGrid(); };
      renderGrid();
      wrap.appendChild(rollBtn); wrap.appendChild(grid);
      return wrap;
    },

    /* ---- Step: Kin ---- */
    step_kin() {
      const wrap = el(`<div></div>`);
      wrap.appendChild(el(sectionTitle("Choose your kin")));
      const grid = el(`<div class="card-grid"></div>`);
      (DB.kin || []).forEach((k) => {
        const c = el(`<button class="card ${this.s.kin === k.key ? "sel" : ""}">
          <h3>${esc(k.name)} <span class="tag">Move ${k.movement}</span></h3>
          <div class="meta">${k.abilities.map((a) => esc(a.name)).join(", ")}</div></button>`);
        c.onclick = () => { this.s.kin = k.key; this.render(); };
        grid.appendChild(c);
      });
      wrap.appendChild(grid);
      return wrap;
    },

    /* ---- Step: Profession ---- */
    step_profession() {
      const wrap = el(`<div></div>`);
      wrap.appendChild(el(sectionTitle("Choose your profession")));
      const grid = el(`<div class="card-grid"></div>`);
      (DB.professions || []).forEach((p) => {
        const c = el(`<button class="card ${this.s.profession === p.key ? "sel" : ""}">
          <h3>${esc(p.name)} <span class="tag">${esc(p.keyAttribute)}</span></h3>
          <div class="meta">${p.key === "mage" ? "Spellcaster — choose a school" : "Heroic ability: " + p.heroicAbilities.join(" / ")}</div></button>`);
        c.onclick = () => { this.s.profession = p.key; if (p.key !== "mage") this.s.mageSchool = null; this.s.bardHarmonism = false; this.s.trained = new Set(); this.s.spells = { tricks: [], known: [] }; this.s.heroic = (p.heroicAbilities.length === 1 ? p.heroicAbilities[0] : null); this.render(); };
        grid.appendChild(c);
      });
      wrap.appendChild(grid);
      if (this.s.profession === "mage") {
        wrap.appendChild(el(`<p class="section-title" style="margin-top:18px"><b>Choose your school of magic</b></p>`));
        const sg = el(`<div class="card-grid"></div>`);
        Magic.mageSchools().forEach(([key, label]) => {
          const c = el(`<button class="card ${this.s.mageSchool === key ? "sel" : ""}"><h3>${esc(label)}</h3>${CORE_SCHOOLS.includes(key) ? "" : `<div class="meta">Book of Magic</div>`}</button>`);
          c.onclick = () => { this.s.mageSchool = key; this.s.trained = new Set(); this.render(); };
          sg.appendChild(c);
        });
        wrap.appendChild(sg);
        if (Magic.enabled()) wrap.appendChild(el(`<p class="stat-line">Dracomancy is learn-in-play only; Harmonism is for bards.</p>`));
      }
      if (this.s.profession === "bard" && Magic.enabled()) {
        const row = el(`<div class="panel" style="margin-top:16px"><b>Harmonism</b><br><span class="stat-line">Bards may study Harmonism (cast via Performance). You'll choose 3 magic tricks and 3 rank-1 spells.</span></div>`);
        const tog = el(`<button class="toggle ${this.s.bardHarmonism ? "on" : ""}" style="margin-top:8px"><span class="knob"></span></button>`);
        tog.onclick = () => { this.s.bardHarmonism = !this.s.bardHarmonism; if (!this.s.bardHarmonism) this.s.spells = { tricks: [], known: [] }; this.render(); };
        row.appendChild(tog); wrap.appendChild(row);
      }
      return wrap;
    },

    /* ---- Step: Age ---- */
    step_age() {
      const wrap = el(`<div></div>`);
      wrap.appendChild(el(sectionTitle("Choose your age")));
      const grid = el(`<div class="card-grid"></div>`);
      (DB.ages || []).forEach((a) => {
        const mods = Object.entries(a.mods).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(", ") || "no attribute changes";
        const c = el(`<button class="card ${this.s.age === a.key ? "sel" : ""}">
          <h3>${esc(a.name)}</h3><div class="meta">${a.trainedSkills} trained skills · ${esc(mods)}</div></button>`);
        c.onclick = () => { this.s.age = a.key; this.render(); };
        grid.appendChild(c);
      });
      wrap.appendChild(grid);
      if (this.s.age && this.s.rolled) {
        const a = this.finalAttrs();
        wrap.appendChild(el(`<div class="panel" style="margin-top:16px"><b>Final attributes</b><div class="rolled-row">${
          (DB.attributes||[]).map((at)=>`<span class="tag">${at.key} ${a[at.key]}</span>`).join("")}</div>
          <p class="stat-line">HP ${a.CON} · WP ${a.WIL} · Move ${(this.kinObj()?.movement||0)+Calc.movementMod(a.AGL)} · STR dmg ${Calc.dmgBonusLabel(a.STR)} · AGL dmg ${Calc.dmgBonusLabel(a.AGL)}</p></div>`));
      }
      return wrap;
    },

    /* ---- Step: Trained skills ---- */
    step_skills() {
      const wrap = el(`<div></div>`);
      const age = this.ageObj();
      const profList = this.professionSkillList();
      const isMage = this.s.profession === "mage";
      const schoolName = isMage && this.s.mageSchool ? this.s.mageSchool[0].toUpperCase() + this.s.mageSchool.slice(1) : null;
      if (isMage && schoolName) this.s.trained.add(schoolName); // school is always trained
      wrap.appendChild(el(sectionTitle("Trained skills")));
      const counter = el(`<div class="panel notice" id="skill-count"></div>`);
      wrap.appendChild(counter);
      const updateCount = () => {
        const total = this.s.trained.size;
        const fromProf = [...this.s.trained].filter((n) => profList.includes(n)).length;
        counter.innerHTML = `Trained: <b>${total} / ${age.trainedSkills}</b> · from profession: <b>${fromProf} / 6</b>. Pick exactly ${age.trainedSkills} (at least 6 from your profession). Trained skills start at twice their base chance.`;
      };
      const makeChip = (name, locked) => {
        const on = this.s.trained.has(name);
        const sk = (DB.skills || []).find((x) => x.name === name);
        const chip = el(`<button class="skill-chip ${on ? "on" : ""} ${locked ? "locked" : ""}">${esc(name)}${sk ? ` <span class="stat-line">${sk.attribute}</span>` : ""}</button>`);
        chip.onclick = () => { if (locked) return; if (on) this.s.trained.delete(name); else this.s.trained.add(name); render(); };
        return chip;
      };
      const listWrap = el(`<div></div>`);
      const render = () => {
        listWrap.innerHTML = "";
        listWrap.appendChild(el(`<p class="section-title"><b>Profession skills</b> <span class="stat-line">(choose ≥6)</span></p>`));
        const pg = el(`<div class="chip-wrap"></div>`);
        profList.forEach((n) => pg.appendChild(makeChip(n, isMage && n === schoolName)));
        listWrap.appendChild(pg);
        listWrap.appendChild(el(`<p class="section-title"><b>Other skills</b> <span class="stat-line">(free picks)</span></p>`));
        const og = el(`<div class="chip-wrap"></div>`);
        (DB.skills || []).filter((sk) => sk.kind !== "magic" && !profList.includes(sk.name)).forEach((sk) => og.appendChild(makeChip(sk.name, false)));
        listWrap.appendChild(og);
        updateCount();
      };
      render();
      wrap.appendChild(listWrap);
      return wrap;
    },

    /* ---- Step: Magic (mage or Harmonism bard) ---- */
    step_magic() {
      const wrap = el(`<div></div>`);
      wrap.appendChild(el(sectionTitle("Magic")));
      const isHarmonist = this.s.profession === "bard" && this.s.bardHarmonism;
      const school = isHarmonist ? "harmonism" : this.s.mageSchool;
      const schoolPool = Magic.poolFor(school);
      // Harmonists cannot learn General Magic; mages may also pick from General.
      const genPool = isHarmonist ? { tricks: [], spells: [] } : Magic.corePool("general");
      const allTricks = [...(schoolPool.tricks || []).map((t) => ({ ...t, src: school })), ...(genPool.tricks || []).map((t) => ({ ...t, src: "general" }))];
      const allRank1 = [...(schoolPool.spells || []).filter((x) => x.rank === 1).map((x) => ({ ...x, src: school })), ...(genPool.spells || []).filter((x) => x.rank === 1).map((x) => ({ ...x, src: "general" }))];
      wrap.appendChild(el(`<p class="stat-line">As ${isHarmonist ? "a Harmonism bard (cast via Performance)" : "a " + esc(Magic.cap(school)) + " mage"}, choose <b>3 magic tricks</b> and <b>3 rank-1 spells</b>${isHarmonist ? " from Harmonism." : " (from your school or General Magic)."}</p>`));
      const mk = (arr, bucket, max, label) => {
        const sec = el(`<div class="panel"></div>`);
        sec.appendChild(el(`<p class="section-title"><b>${label}</b> <span class="stat-line" id="cnt-${bucket}"></span></p>`));
        const wrapc = el(`<div class="chip-wrap"></div>`);
        const refresh = () => { sec.querySelector(`#cnt-${bucket}`).textContent = `(${this.s.spells[bucket].length} / ${max})`; };
        arr.forEach((item) => {
          const on = this.s.spells[bucket].some((x) => x.name === item.name);
          const chip = el(`<button class="skill-chip ${on ? "on" : ""}">${esc(item.name)}${item.rank ? ` <span class="stat-line">R${item.rank}</span>` : ""}</button>`);
          chip.onclick = () => {
            const idx = this.s.spells[bucket].findIndex((x) => x.name === item.name);
            if (idx >= 0) this.s.spells[bucket].splice(idx, 1);
            else { if (this.s.spells[bucket].length >= max) { alert("You've already chosen " + max + "."); return; } this.s.spells[bucket].push({ name: item.name, rank: item.rank || 0, school: item.src, text: item.text }); }
            chip.classList.toggle("on"); refresh();
          };
          wrapc.appendChild(chip);
        });
        sec.appendChild(wrapc); refresh();
        return sec;
      };
      wrap.appendChild(mk(allTricks, "tricks", 3, "Magic tricks (rank 0)"));
      wrap.appendChild(mk(allRank1, "known", 3, "Rank-1 spells"));
      return wrap;
    },

    /* ---- Step: Heroic ability ---- */
    step_heroic() {
      const wrap = el(`<div></div>`);
      const p = this.prof();
      wrap.appendChild(el(sectionTitle("Heroic ability")));
      wrap.appendChild(el(`<p class="stat-line">Your profession grants one starting heroic ability${p.heroicAbilities.length > 1 ? " — choose one" : ""}. (Its skill requirement is waived for a starting ability.)</p>`));
      const grid = el(`<div class="card-grid"></div>`);
      const pool = [...p.heroicAbilities];
      if (Settings.soloMode() && typeof DRAGONBANE_SOLO !== "undefined" && DRAGONBANE_SOLO.heroicAbilities) {
        DRAGONBANE_SOLO.heroicAbilities.forEach((ha) => { if (!pool.includes(ha.name)) pool.push(ha.name); });
      }
      pool.forEach((name) => {
        const ab = findHeroicAbility(name) || { name, text: "" };
        const c = el(`<button class="card ${this.s.heroic === name ? "sel" : ""}"><h3>${esc(name)} <span class="tag">${ab.wp == null ? "No WP" : "WP " + ab.wp}</span></h3><div class="meta">${esc(ab.text)}</div></button>`);
        c.onclick = () => { this.s.heroic = name; this.render(); };
        grid.appendChild(c);
      });
      wrap.appendChild(grid);
      return wrap;
    },

    /* ---- Step: Gear ---- */
    step_gear() {
      const wrap = el(`<div></div>`);
      const p = this.prof();
      wrap.appendChild(el(sectionTitle("Starting gear")));
      wrap.appendChild(el(`<p class="stat-line">Pick a starting gear package (or roll). Dice in the list (coins, rations) are rolled when you create the hero.</p>`));
      const rollBtn = el(`<button class="btn secondary" style="margin-bottom:12px">🎲 Roll a random package</button>`);
      const grid = el(`<div class="card-grid"></div>`);
      const renderRows = () => {
        grid.innerHTML = "";
        (p.gear || []).forEach((g, i) => {
          const c = el(`<button class="card ${this.s.gearRow === i ? "sel" : ""}"><h3>Roll ${esc(g.roll)}</h3><div class="meta">${esc(g.items)}</div></button>`);
          c.onclick = () => { this.s.gearRow = i; renderRows(); };
          grid.appendChild(c);
        });
      };
      rollBtn.onclick = () => { const rows = p.gear || []; if (!rows.length) return; this.s.gearRow = Math.floor(Math.random() * rows.length); renderRows(); };
      renderRows();
      wrap.appendChild(rollBtn); wrap.appendChild(grid);
      if (!(p.gear || []).length) wrap.appendChild(el(`<p class="notice">No gear table for this profession; you can add equipment later.</p>`));
      return wrap;
    },

    /* ---- Step: Details ---- */
    step_details() {
      const wrap = el(`<div class="panel"></div>`);
      wrap.appendChild(el(sectionTitle("Details")));
      const field = (key, label, ph) => {
        const f = el(`<div class="form-field"><label>${label}</label></div>`);
        const inp = key === "name" ? el(`<input type="text" placeholder="${ph}">`) : el(`<textarea rows="2" placeholder="${ph}"></textarea>`);
        inp.value = this.s.identity[key] || "";
        inp.oninput = () => { this.s.identity[key] = inp.value; };
        if (key === "name" && DB.names) {
          const btnWrap = el(`<div style="display:flex;gap:6px;margin-top:6px"></div>`);
          const genBtn = el(`<button type="button" class="btn step" style="flex:1;font-size:0.9rem">🎲 Random Hero Name</button>`);
          genBtn.onclick = () => {
            const kinKey = this.s.kin || "human";
            const profKey = this.s.profession || "artisan";
            const kNames = (DB.names.kin && DB.names.kin[kinKey]) || DB.names.kin.human;
            const pNick = (DB.names.nicknames && DB.names.nicknames[profKey]) || [];
            const first = kNames[Math.floor(Math.random() * kNames.length)];
            const nick = pNick.length && Math.random() < 0.65 ? " \"" + pNick[Math.floor(Math.random() * pNick.length)] + "\"" : "";
            inp.value = first + nick;
            this.s.identity.name = inp.value;
          };
          btnWrap.appendChild(genBtn);
          f.appendChild(inp); f.appendChild(btnWrap); return f;
        }
        if (key !== "name" && DB.flavor && DB.flavor[key]) {
          const btnWrap = el(`<div style="display:flex;gap:6px;margin-top:6px"></div>`);
          const labelName = key.charAt(0).toUpperCase() + key.slice(1);
          const genBtn = el(`<button type="button" class="btn step" style="flex:1;font-size:0.85rem;padding:4px 8px">🎲 Random ${labelName}</button>`);
          genBtn.onclick = () => {
            const list = DB.flavor[key] || [];
            if (!list.length) return;
            inp.value = list[Math.floor(Math.random() * list.length)];
            this.s.identity[key] = inp.value;
          };
          btnWrap.appendChild(genBtn);
          f.appendChild(inp); f.appendChild(btnWrap); return f;
        }
        f.appendChild(inp); return f;
      };
      wrap.appendChild(field("name", "Name *", "Your hero's name"));
      wrap.appendChild(field("appearance", "Appearance", "A few distinctive details"));
      wrap.appendChild(field("weakness", "Weakness", "A flaw or vice"));
      wrap.appendChild(field("memento", "Memento", "A meaningful keepsake"));
      return wrap;
    },

    /* ---- Step: Review ---- */
    step_review() {
      const c = this.build();
      const wrap = el(`<div></div>`);
      wrap.appendChild(el(sectionTitle("Review")));
      const a = c.attributes;
      wrap.appendChild(el(`<div class="panel">
        <h3>${esc(c.identity.name || "Unnamed")}</h3>
        <p class="meta">${esc(this.kinObj().name)} · ${esc(this.prof().name)}${this.s.mageSchool ? " (" + esc(this.s.mageSchool) + ")" : ""} · ${esc(this.ageObj().name)}</p>
        <div class="rolled-row">${(DB.attributes||[]).map((at)=>`<span class="tag">${at.key} ${a[at.key]}</span>`).join("")}</div>
        <p class="stat-line">HP ${c.derived.hpMax} · WP ${c.derived.wpMax} · Move ${c.derived.movement} · STR dmg ${c.derived.dmgBonusSTR ? "+"+c.derived.dmgBonusSTR : "—"} · AGL dmg ${c.derived.dmgBonusAGL ? "+"+c.derived.dmgBonusAGL : "—"}</p>
        <p><b>Trained:</b> ${Object.entries(c.skills).filter(([,v])=>v.trained).map(([n,v])=>`<span class="tag">${esc(n)} ${v.level}</span>`).join(" ")}</p>
        <p><b>Abilities:</b> ${c.abilities.map((x)=>`<span class="tag">${esc(x.name)}</span>`).join(" ")}</p>
        ${c.spells.known.length || c.spells.tricks.length ? `<p><b>Magic:</b> ${[...c.spells.tricks,...c.spells.known].map((x)=>`<span class="tag">${esc(x.name)}</span>`).join(" ")}</p>` : ""}
        <p class="stat-line"><b>Gear:</b> ${c.inventory.items.map(esc).join(", ") || "—"} · ${c.inventory.money.gold}g ${c.inventory.money.silver}s ${c.inventory.money.copper}c</p>
      </div>`));
      return wrap;
    },

    validate(step) {
      const s = this.s;
      if (step === "attributes") { if (!s.rolled) return "Roll your attributes first."; if (Object.values(s.assign).some((v) => v == null)) return "Assign all six rolled scores to attributes."; }
      if (step === "kin" && !s.kin) return "Choose a kin.";
      if (step === "profession") { if (!s.profession) return "Choose a profession."; if (s.profession === "mage" && !s.mageSchool) return "Choose a school of magic."; }
      if (step === "age" && !s.age) return "Choose an age.";
      if (step === "skills") {
        const age = this.ageObj(); const profList = this.professionSkillList();
        if (s.trained.size !== age.trainedSkills) return `Pick exactly ${age.trainedSkills} trained skills (you have ${s.trained.size}).`;
        const fromProf = [...s.trained].filter((n) => profList.includes(n)).length;
        if (fromProf < 6) return `At least 6 trained skills must come from your profession (you have ${fromProf}).`;
      }
      if (step === "magic") { if (s.spells.tricks.length !== 3) return "Choose exactly 3 magic tricks."; if (s.spells.known.length !== 3) return "Choose exactly 3 rank-1 spells."; }
      if (step === "heroic" && !s.heroic) return "Choose a heroic ability.";
      if (step === "details" && !s.identity.name.trim()) return "Give your hero a name.";
      return null;
    },

    // Assemble the full character object from wizard state.
    build() {
      const attrs = this.finalAttrs();
      const kin = this.kinObj();
      const skills = buildSkills(attrs, this.s.trained, this.s.mageSchool);
      const abilities = [];
      (kin.abilities || []).forEach((a) => abilities.push({ name: a.name, source: "kin", wp: a.wp, text: a.text }));
      if (this.s.heroic) { const h = findHeroicAbility(this.s.heroic); abilities.push({ name: this.s.heroic, source: "profession", wp: h ? h.wp : null, text: h ? h.text : "" }); }
      const gearRow = this.prof().gear && this.s.gearRow != null ? this.prof().gear[this.s.gearRow] : null;
      const gear = gearRow ? parseGear(gearRow.items) : { items: [], money: { gold: 0, silver: 0, copper: 0 } };
      const movement = (kin.movement || 0) + Calc.movementMod(attrs.AGL);
      return {
        id: uid(), createdAt: new Date().toISOString(), schemaVersion: 1,
        identity: { name: this.s.identity.name.trim(), kin: kin.name, profession: this.prof().name, mageSchool: this.s.mageSchool, age: this.ageObj().name,
          appearance: this.s.identity.appearance, weakness: this.s.identity.weakness, memento: this.s.identity.memento, portraitUrl: null },
        attributes: attrs,
        derived: { movement, hpMax: attrs.CON, wpMax: attrs.WIL, dmgBonusSTR: Calc.damageBonus(attrs.STR), dmgBonusAGL: Calc.damageBonus(attrs.AGL) },
        state: { hp: attrs.CON, wp: attrs.WIL, conditions: {}, deathRolls: { successes: 0, failures: 0 } },
        skills,
        abilities,
        // Harmonism bards cast via Performance (no INT school skill); record it for the caster.
        spells: Object.assign({}, this.s.spells, (this.s.profession === "bard" && this.s.bardHarmonism) ? { castSkill: "Performance", castSchool: "Harmonism" } : {}),
        inventory: { items: gear.items, tiny: [], mementos: this.s.identity.memento ? [this.s.identity.memento] : [], money: gear.money },
        notes: ""
      };
    },
    save() {
      const c = this.build();
      const list = Store.list(); list.push(c); Store.save(list);
      Sheet.open(c.id);
    }
  };

  /* =================================================================
   * Pre-generated characters (Dragonbane Core Set)
   * ================================================================= */
  const Pregens = {
    findSpell(name, school) {
      const sp = DB.spells || {};
      const pools = [sp.general, sp[school]].filter(Boolean);
      for (const pool of pools) {
        const inTricks = (pool.tricks || []).find((t) => t.name === name);
        if (inTricks) return { name, rank: 0, text: inTricks.text };
        const inSpells = (pool.spells || []).find((t) => t.name === name);
        if (inSpells) return { name, rank: inSpells.rank, text: inSpells.text, school };
      }
      return { name, rank: 0, text: "" };
    },
    // Turn a pregen definition into a full character object.
    instantiate(p) {
      const attrs = { ...p.attributes };
      const kin = (DB.kin || []).find((k) => k.key === p.kin);
      const prof = (DB.professions || []).find((x) => x.key === p.profession);
      const age = (DB.ages || []).find((x) => x.key === p.age);
      const trainedSet = new Set(p.trained);
      const skills = buildSkills(attrs, trainedSet, p.mageSchool);
      const abilities = [];
      (kin.abilities || []).forEach((a) => abilities.push({ name: a.name, source: "kin", wp: a.wp, text: a.text }));
      if (p.heroic) { const h = findHeroicAbility(p.heroic); abilities.push({ name: p.heroic, source: "profession", wp: h ? h.wp : null, text: h ? h.text : "" }); }
      const spells = {
        tricks: (p.spells.tricks || []).map((n) => this.findSpell(n, p.mageSchool)),
        known: (p.spells.known || []).map((n) => this.findSpell(n, p.mageSchool))
      };
      const items = [
        ...(p.weapons || []),
        ...(p.armor ? [/armor|mail|plate/i.test(p.armor) ? p.armor : p.armor + " armor"] : []),
        ...(p.helmet ? [p.helmet] : []),
        ...(p.gear || [])
      ];
      return {
        id: uid(), createdAt: new Date().toISOString(), schemaVersion: 1, fromPregen: p.name,
        identity: { name: p.name, kin: kin.name, profession: prof.name, mageSchool: p.mageSchool, age: age.name,
          appearance: p.appearance, weakness: p.weakness, memento: p.memento, portraitUrl: null },
        attributes: attrs,
        derived: { movement: (kin.movement || 0) + Calc.movementMod(attrs.AGL), hpMax: attrs.CON, wpMax: attrs.WIL, dmgBonusSTR: Calc.damageBonus(attrs.STR), dmgBonusAGL: Calc.damageBonus(attrs.AGL) },
        state: { hp: attrs.CON, wp: attrs.WIL, conditions: {}, deathRolls: { successes: 0, failures: 0 } },
        skills, abilities, spells,
        inventory: { items, tiny: [], mementos: p.memento ? [p.memento] : [], money: { gold: 0, silver: 0, copper: 0 } },
        notes: ""
      };
    },
    open() {
      const root = el(`<div></div>`);
      root.appendChild(el(`<div class="wiz-head"><button class="btn ghost" id="pg-back">← Heroes</button><div class="wiz-progress">Pre-generated heroes</div></div>`));
      root.appendChild(el(`<p class="stat-line">Ready-to-play characters from the Dragonbane Core Set. Pick one to add it to your roster — you can rename or adjust it afterwards.</p>`));
      const grid = el(`<div class="card-grid" style="margin-top:12px"></div>`);
      (window.DRAGONBANE_PREGENS || []).forEach((p) => {
        const kin = (DB.kin || []).find((k) => k.key === p.kin);
        const prof = (DB.professions || []).find((x) => x.key === p.profession);
        const age = (DB.ages || []).find((x) => x.key === p.age);
        const a = p.attributes;
        const c = el(`<button class="card">
          <h3>${esc(p.name)}</h3>
          <div class="meta">${esc(kin.name)} · ${esc(prof.name)}${p.mageSchool ? " (" + esc(p.mageSchool) + ")" : ""} · ${esc(age.name)}</div>
          <p class="stat-line" style="margin:6px 0">${esc(p.blurb)}</p>
          <div class="rolled-row">${(DB.attributes||[]).map((at)=>`<span class="tag">${at.key} ${a[at.key]}</span>`).join("")}</div>
        </button>`);
        c.onclick = () => {
          const ch = this.instantiate(p);
          const list = Store.list(); list.push(ch); Store.save(list);
          Sheet.open(ch.id);
        };
        grid.appendChild(c);
      });
      root.appendChild(grid);
      mountScreen(root);
      root.querySelector("#pg-back").onclick = () => Router.go("home");
    }
  };

  /* =================================================================
   * Modal overlay helper
   * ================================================================= */
  function modal(title) {
    const back = el(`<div class="modal-back"></div>`);
    const card = el(`<div class="modal-card"></div>`);
    card.appendChild(el(`<div class="modal-head"><h3>${esc(title)}</h3></div>`));
    const x = el(`<button class="icon-btn modal-x" aria-label="Close">✕</button>`);
    card.querySelector(".modal-head").appendChild(x);
    const body = el(`<div class="modal-body"></div>`);
    card.appendChild(body);
    back.appendChild(card);
    document.body.appendChild(back);
    const close = () => back.remove();
    back.onclick = (e) => { if (e.target === back) close(); };
    x.onclick = close;
    return { body, close };
  }

  /* =================================================================
   * Dice engine (Phase 3) — skill rolls, damage, spell casting
   * ================================================================= */
  const MISHAPS = [
    "The magical powers leave you Dazed.",
    "The spellcasting suddenly makes you Exhausted.",
    "The energies take a toll on your body and make you Sickly.",
    "You lose control of the spell, which makes you very Angry.",
    "The spell subjects you to demonic visions that leave you Scared.",
    "You see the world beyond the veil and feel Disheartened.",
    "The magic ravages your body, inflicting D6 damage per power level.",
    "The spell drains your willpower; you lose D6 WP per power level.",
    "The spell gives rise to a magical disease (virulence 3D6); you and everyone you contact this shift are exposed.",
    "Another random spell of yours activates instead, same target and power level.",
    "You vomit a frog the moment you tell a lie. Roll D4 each morning; on a 1 it ends (or DISPEL).",
    "Any gold or silver you touch withers to dust. Roll D4 each morning; on a 1 it ends (or DISPEL).",
    "The spell blinds you (act as in total darkness). Roll D4 each morning; on a 1 you recover (or DISPEL).",
    "Amnesia — you forget who you and the other PCs are. Roll D4 each morning; on a 1 it returns.",
    "The spell also affects a friend/unintended victim (a healing spell affects an enemy).",
    "The spell backfires — an offensive spell hits you; a protecting/healing spell inflicts damage.",
    "You turn into an animal (D6: cat/fox/goat/wolf/deer/bear). Roll D4 each morning; on a 1 you revert.",
    "You become one age category younger (attributes change, skills don't). Permanent.",
    "You become one age category older (attributes change, skills don't). Permanent.",
    "Your magic attracts a demon, which shows up within the shift to cause trouble (GM's call)."
  ];
  const CONDITION_BY_MISHAP = ["dazed","exhausted","sickly","angry","scared","disheartened"];

  const Roller = {
    // Roll a d20 honoring a net boon/bane (+ = boon → take lowest; − = bane → take highest).
    d20net(net) {
      if (net === 0) { const r = Dice.d(20); return { dice: [r], used: r }; }
      const two = [Dice.d(20), Dice.d(20)];
      return { dice: two, used: net > 0 ? Math.min(...two) : Math.max(...two) };
    },
    netLabel(net) { return net > 0 ? `Boon ×${net}` : net < 0 ? `Bane ×${-net}` : "Even (1d20)"; },
    refresh(charId) { if (Sheet.id === charId) Sheet.render(); },

    // ---- Skill roll ----
    skill(charId, name) {
      const c = Store.get(charId); if (!c) return;
      const sk = c.skills[name];
      const condBane = !!(DB.conditions || []).find((cn) => cn.attribute === sk.attribute && c.state.conditions[cn.key]);
      let net = condBane ? -1 : 0;
      const m = modal(`Roll: ${name}`);
      const head = el(`<p class="stat-line">Skill level <b>${sk.level}</b> · ${sk.attribute}${condBane ? ` · <span style="color:var(--bad)">${sk.attribute} condition → bane</span>` : ""}. Roll equal or under to succeed.</p>`);
      const ctl = el(`<div class="roll-ctl"></div>`);
      const lbl = el(`<span class="net-lbl">${this.netLabel(net)}</span>`);
      const minus = el(`<button class="step">−</button>`), plus = el(`<button class="step">+</button>`);
      minus.onclick = () => { net--; lbl.textContent = this.netLabel(net); };
      plus.onclick = () => { net++; lbl.textContent = this.netLabel(net); };
      ctl.append(el(`<span class="stat-line">Boon / Bane</span>`), minus, lbl, plus);
      const rollBtn = el(`<button class="btn block" style="margin-top:12px">Roll d20</button>`);
      const result = el(`<div class="roll-result"></div>`);
      const doRoll = (pushedCondition) => {
        if (!pushedCondition) {
          rollBtn.disabled = true; rollBtn.style.opacity = "0.4"; rollBtn.style.cursor = "not-allowed";
          minus.disabled = true; plus.disabled = true;
        }
        const r = this.d20net(net);
        const dragon = r.used === 1, demon = r.used === 20;
        const success = r.used <= sk.level;
        if (dragon || demon) Store.update(charId, (ch) => { ch.skills[name].mark = true; });
        let html = `<div class="dice-faces">${r.dice.map((d) => `<span class="die ${d === r.used ? "used" : ""}">${d}</span>`).join("")}</div>`;
        html += `<p class="outcome ${success ? "ok" : "bad"}">${dragon ? "🐉 DRAGON — critical success!" : demon ? "👹 DEMON — critical failure!" : success ? "Success" : "Failure"}</p>`;
        if (dragon || demon) html += `<p class="stat-line">Advancement mark added to ${esc(name)}.</p>`;
        if (pushedCondition) html += `<p class="stat-line">Pushed — gained <b>${esc(pushedCondition)}</b>.</p>`;
        result.innerHTML = html;
        // Offer push if failed, not a demon, and conditions remain
        const curChar = Store.get(charId) || c;
        const curConds = curChar?.state?.conditions || {};
        const remaining = (DB.conditions || []).filter((cn) => !curConds[cn.key]);
        const hasSS = curChar?.abilities?.some((a) => a.name === "Sole Survivor") && (curChar?.state?.wp || 0) >= 3;
        if (!success && !demon && !pushedCondition && (remaining.length || hasSS)) {
          const pushWrap = el(`<div class="push-wrap"><p class="stat-line">Push the roll? Choose a condition to suffer, then re-roll:</p></div>`);
          const cw = el(`<div class="chip-wrap"></div>`);
          remaining.forEach((cn) => {
            const chip = el(`<button class="skill-chip">${esc(cn.name)} <span class="stat-line">${cn.attribute}</span></button>`);
            chip.onclick = () => { Store.update(charId, (ch) => { ch.state.conditions[cn.key] = true; }); this.refresh(charId); doRoll(cn.name); };
            cw.appendChild(chip);
          });
          if (hasSS) {
            const chip = el(`<button class="skill-chip" style="border-color:var(--accent)">💫 Sole Survivor <span class="stat-line">−3 WP</span></button>`);
            chip.onclick = () => { Store.update(charId, (ch) => { ch.state.wp -= 3; }); this.refresh(charId); doRoll("Sole Survivor (−3 WP)"); };
            cw.appendChild(chip);
          }
          pushWrap.appendChild(cw); result.appendChild(pushWrap);
        }
        this.refresh(charId);
      };
      rollBtn.onclick = () => doRoll(null);
      m.body.append(head, ctl, rollBtn, result);
    },

    renderDamageApplier(attackerCombatantId, rawDamage, defaultIgnoreArmor = false) {
      const cst = Combat.load() || { combatants: [] };
      const targets = (cst.combatants || []).filter(cb => cb.id !== attackerCombatantId && !cb.defeated && (cb.hp == null || cb.hp > 0));
      if (!targets.length) return el(`<p class="stat-line" style="color:var(--muted);margin-top:12px">💡 No active opponent targets in combat tracker. (Add monsters or NPCs in the <b>Combat</b> tab to apply damage directly to their HP)</p>`);

      const wrap = el(`<div style="margin-top:14px;padding:12px;background:var(--bg);border:1px solid var(--ok);border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)"></div>`);
      wrap.appendChild(el(`<p class="stat-line" style="margin:0 0 8px 0;color:var(--ok);font-size:1.1rem"><b>🎯 Apply Damage to Target:</b></p>`));

      const row = el(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px"></div>`);
      const sel = el(`<select class="input" style="flex:1;min-width:180px"></select>`);
      targets.forEach(t => {
        const arm = t.armor || 0;
        sel.appendChild(el(`<option value="${t.id}">${esc(t.name)} (HP: ${t.hp == null ? "?" : t.hp}${arm ? ` · Armor ${arm}` : ""})</option>`));
      });
      row.appendChild(sel);

      const chkLbl = el(`<label style="display:flex;align-items:center;gap:6px;font-size:0.95rem;cursor:pointer"><input type="checkbox" ${defaultIgnoreArmor ? "checked" : ""}> Ignore Target Armor</label>`);
      row.appendChild(chkLbl);
      wrap.appendChild(row);

      const applyBtn = el(`<button class="btn block" style="background:var(--ok);color:#fff;font-size:1.15rem;padding:10px">💥 Apply ${rawDamage} Damage Now</button>`);
      applyBtn.onclick = () => {
        const targetId = sel.value;
        const ignoreArm = chkLbl.querySelector("input").checked;
        const comb = Combat.load();
        if (!comb || !comb.combatants) return;
        const tgt = comb.combatants.find(c => c.id === targetId);
        if (!tgt) return;

        const armSub = ignoreArm ? 0 : (tgt.armor || 0);
        const netDmg = Math.max(0, rawDamage - armSub);
        
        if (tgt.hp != null) {
          tgt.hp = Math.max(0, tgt.hp - netDmg);
          if (tgt.hp === 0) tgt.defeated = true;
          if (tgt.kind === "hero" && tgt.charId) {
            Store.update(tgt.charId, ch => { ch.state.hp = tgt.hp; });
          }
        } else {
          tgt.hp = 0; tgt.defeated = true;
        }

        if (attackerCombatantId) {
          const att = comb.combatants.find(c => c.id === attackerCombatantId);
          if (att) att.acted = true;
        }
        Combat.save(comb);
        if (attackerCombatantId) Combat.advanceTurn(attackerCombatantId);

        applyBtn.disabled = true;
        applyBtn.textContent = `✓ Applied ${netDmg} Net Damage to ${tgt.name}!`;
        applyBtn.style.background = "var(--muted)";
        
        const activeNav = document.querySelector("#app-nav button.active");
        if (activeNav && activeNav.dataset.route === "party") {
          Combat.rerender();
        }
      };
      wrap.appendChild(applyBtn);
      return wrap;
    },

    // ---- Hero weapon attack & damage (all-in-one) ----
    damage(charId, weapon, combatantId) { this.heroWeaponAttack(charId, weapon, combatantId); },
    heroWeaponAttack(charId, weapon, combatantId) {
      const c = Store.get(charId); if (!c) return;
      const skillName = weapon.skill || "Swords";
      const skillObj = c.skills[skillName] || { level: 5 };
      const target = skillObj.level || 5;
      const skillDef = (DB.skills || []).find((s) => s.name === skillName);
      const attr = skillDef ? skillDef.attribute : "STR";
      const noBonus = (weapon.features || []).includes("no damage bonus");
      const bonusDie = noBonus ? null : (attr === "AGL" ? c.derived.dmgBonusAGL : c.derived.dmgBonusSTR);
      const isRanged = weapon.type === "ranged" || (weapon.features || []).some(f => /quiver|arrow|bolt|sling/i.test(f));

      const m = modal(`${c.identity.name || "Hero"}: ${weapon.name}`);
      const out = el(`<div class="roll-result"></div>`);
      
      // Top section: Attack Roll
      const atkDiv = el(`<div class="panel" style="margin-bottom:12px;background:var(--card-bg);padding:12px"></div>`);
      const head = el(`<div class="rest-row" style="margin-bottom:8px"></div>`);
      head.appendChild(el(`<span class="stat-line" style="margin:0;font-size:1.2rem"><b>Attack Roll:</b> ${esc(skillName)} ≤ ${target}</span>`));
      
      const ctl = el(`<div class="net-control"></div>`);
      let net = 0;
      const lbl = el(`<span class="net-val">0</span>`);
      const minus = el(`<button class="step" title="bane">−</button>`);
      const plus = el(`<button class="step" title="boon">+</button>`);
      const upd = () => { lbl.textContent = net === 0 ? "Normal" : net > 0 ? `+${net} Boon` : `${net} Bane`; lbl.className = `net-val ${net > 0 ? "boon" : net < 0 ? "bane" : ""}`; };
      minus.onclick = () => { net--; upd(); }; plus.onclick = () => { net++; upd(); };
      ctl.append(minus, lbl, plus);
      head.appendChild(ctl);
      atkDiv.appendChild(head);

      const isLong = (weapon.features || []).some(f => /long/i.test(f));
      if (isLong) {
        atkDiv.appendChild(el(`<p class="stat-line" style="color:var(--accent);margin:4px 0">🗡️ <b>Long Weapon (2m Reach):</b> Strike enemies 2m away without provoking close combat retaliation.</p>`));
      }

      if (c.state.conditions && c.state.conditions[attr]) {
        atkDiv.appendChild(el(`<p class="warn-bane" style="margin:4px 0">⚠ ${attr} condition bane applies</p>`));
      }

      if (isRanged) {
        if (typeof c.state.combatAmmo !== "number") c.state.combatAmmo = 12;
        const pbRow = el(`<label style="display:flex;align-items:center;gap:6px;font-size:0.95rem;margin:6px 0;cursor:pointer"><input type="checkbox"> Point-blank (engaged within 2m) → Bane</label>`);
        pbRow.querySelector("input").onchange = (e) => { net += e.target.checked ? -1 : 1; upd(); };
        atkDiv.appendChild(pbRow);
        const ammoRow = el(`<div style="display:flex;align-items:center;gap:8px;margin-top:8px"></div>`);
        const aMin = el(`<button class="step" style="width:28px;height:28px;font-size:1.2rem">−</button>`);
        const aPl = el(`<button class="step" style="width:28px;height:28px;font-size:1.2rem">+</button>`);
        const aLbl = el(`<span style="font-weight:bold;font-size:1.1rem">Arrows / Bolts: ${c.state.combatAmmo}</span>`);
        aMin.onclick = () => { c.state.combatAmmo = Math.max(0, c.state.combatAmmo - 1); Store.update(charId, ch => { ch.state.combatAmmo = c.state.combatAmmo; }); aLbl.textContent = `Arrows / Bolts: ${c.state.combatAmmo}`; };
        aPl.onclick = () => { c.state.combatAmmo++; Store.update(charId, ch => { ch.state.combatAmmo = c.state.combatAmmo; }); aLbl.textContent = `Arrows / Bolts: ${c.state.combatAmmo}`; };
        ammoRow.append(aMin, aLbl, aPl);
        atkDiv.appendChild(ammoRow);
      }

      const rollAtkBtn = el(`<button class="btn block" style="margin-top:10px">Roll Attack (d20 ≤ ${target})</button>`);
      
      // Bottom section: Damage Roll
      const dmgDiv = el(`<div style="margin-top:12px"></div>`);
      const rollDmgBtn = el(`<button class="btn secondary block" disabled style="opacity:0.4;cursor:not-allowed">Roll Damage (${esc(weapon.damage)}${bonusDie ? " +" + bonusDie : ""})</button>`);
      rollDmgBtn.onclick = () => {
        const base = Dice.roll(weapon.damage);
        let tot = base; let p = `${weapon.damage} = <b>${base}</b>`;
        if (bonusDie) { const b = Dice.roll(bonusDie); tot += b; p += ` · ${attr} bonus ${bonusDie} = <b>${b}</b>`; }
        out.innerHTML += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)"><p class="outcome ok" style="font-size:1.6rem;margin:0">${tot} damage</p><p class="stat-line" style="margin:4px 0 0 0">${p}</p></div>`;
        out.appendChild(Roller.renderDamageApplier(combatantId, tot, false));
      };
      dmgDiv.appendChild(rollDmgBtn);

      const doRoll = (isPush) => {
        if (isRanged && !isPush && (c.state.combatAmmo || 0) <= 0) {
          alert("🏹 Out of Ammunition: You have 0 Arrows/Bolts remaining.");
          return;
        }
        if (!isPush) {
          rollAtkBtn.disabled = true; rollAtkBtn.style.opacity = "0.4"; rollAtkBtn.style.cursor = "not-allowed";
        }
        if (combatantId && !isPush) {
          const comb = Combat.load();
          if (comb && comb.combatants) {
            const att = comb.combatants.find(cb => cb.id === combatantId);
            if (att && !att.acted) {
              att.acted = true;
              Combat.save(comb);
              const activeNav = document.querySelector("#app-nav button.active");
              if (activeNav && activeNav.dataset.route === "party") Combat.rerender();
            }
          }
        }
        if (isRanged && !isPush) {
          c.state.combatAmmo--;
          const invItem = (c.inventory?.items || []).find(it => /quiver|arrow|bolt|stone|bullet/i.test(it.name));
          if (invItem) {
            invItem.name = invItem.name.replace(/\s*\(\d+\)$/, "") + ` (${c.state.combatAmmo})`;
          }
          Store.update(charId, ch => {
            ch.state.combatAmmo = c.state.combatAmmo;
            if (invItem && ch.inventory) ch.inventory.items = c.inventory.items;
          });
          const aLbl = atkDiv.querySelector("span[style*='Arrows']");
          if (aLbl) aLbl.textContent = `Arrows / Bolts: ${c.state.combatAmmo}`;
        }
        let effNet = net;
        if (c.state.conditions && c.state.conditions[attr]) effNet--;
        const r = this.d20net(effNet);
        const crit = r.used === 1, fumble = r.used === 20;
        const success = r.used <= target;
        
        if ((crit || fumble) && !(c.skills?.[skillName]?.mark)) {
          Store.update(charId, (ch) => { if (ch.skills?.[skillName]) ch.skills[skillName].mark = true; });
        }

        let outcomeHtml = `<div style="margin-top:10px"><p class="outcome ${success ? "ok" : "bad"}" style="font-size:1.6rem;margin:0">${crit ? "🐉 Dragon Critical Hit!" : fumble ? "👿 Demon Fumble!" : success ? "Hit!" : "Miss!"} <small style="font-size:1rem;font-weight:normal">(${r.used} vs ${target})</small></p>`;
        if ((crit || fumble) && !(c.skills?.[skillName]?.mark)) outcomeHtml += `<p class="stat-line" style="color:var(--ok);margin:4px 0 0 0">★ Auto-marked ${esc(skillName)} for advancement</p>`;

        if (!crit && !fumble && !isPush) {
          const curChar = Store.get(charId) || c;
          const curConds = curChar?.state?.conditions || {};
          const unchosen = (DB.conditions||[]).filter(cn => !curConds[cn.key]);
          const hasSS = curChar?.abilities?.some(a => a.name === "Sole Survivor") && (curChar?.state?.wp || 0) >= 3;
          if (unchosen.length || hasSS) {
            const pushWrap = el(`<div style="margin-top:10px;padding:8px;background:var(--bg);border-radius:6px"></div>`);
            pushWrap.appendChild(el(`<p class="stat-line" style="margin:0 0 6px 0"><b>Push roll</b> (mark condition & re-roll):</p>`));
            const cw = el(`<div class="push-conditions" style="display:flex;flex-wrap:wrap;gap:4px"></div>`);
            unchosen.forEach(cn => {
              const chip = el(`<button class="skill-chip" style="font-size:0.9rem;padding:4px 8px">${esc(cn.name)}</button>`);
              chip.onclick = () => { Store.update(charId, ch => { ch.state.conditions[cn.key] = true; }); doRoll(true); };
              cw.appendChild(chip);
            });
            if (hasSS) {
              const chip = el(`<button class="skill-chip" style="font-size:0.9rem;padding:4px 8px;border-color:var(--accent)">💫 Sole Survivor (−3 WP)</button>`);
              chip.onclick = () => { Store.update(charId, ch => { ch.state.wp -= 3; }); doRoll(true); };
              cw.appendChild(chip);
            }
            pushWrap.appendChild(cw);
            outcomeHtml += pushWrap.outerHTML;
          }
        }
        outcomeHtml += `</div>`;
        out.innerHTML = outcomeHtml;
        if (!success && combatantId && !isPush) {
          Combat.advanceTurn(combatantId);
        }

        if (crit) {
          rollDmgBtn.disabled = false;
          rollDmgBtn.style.opacity = "1";
          rollDmgBtn.style.cursor = "pointer";
          rollDmgBtn.textContent = `Roll CRITICAL Damage (Double Dice: ${esc(weapon.damage)}×2${bonusDie ? " +" + bonusDie : ""})`;
          rollDmgBtn.className = "btn block";
          rollDmgBtn.style.background = "var(--ok)";
          rollDmgBtn.style.color = "#fff";
          rollDmgBtn.onclick = () => {
            const b1 = Dice.roll(weapon.damage);
            const b2 = Dice.roll(weapon.damage);
            let tot = b1 + b2; let p = `${weapon.damage} crit (${b1}+${b2}) = <b>${b1+b2}</b>`;
            if (bonusDie) { const b = Dice.roll(bonusDie); tot += b; p += ` · ${attr} bonus ${bonusDie} = <b>${b}</b>`; }
            out.innerHTML += `<div style="margin-top:12px;padding-top:12px;border-top:2px dashed var(--ok)"><p class="outcome ok" style="font-size:1.8rem;margin:0">💥 ${tot} CRITICAL DAMAGE!</p><p class="stat-line" style="margin:4px 0 0 0">${p}</p></div>`;
            out.appendChild(Roller.renderDamageApplier(combatantId, tot, false));
          };
        } else if (success) {
          rollDmgBtn.disabled = false;
          rollDmgBtn.style.opacity = "1";
          rollDmgBtn.style.cursor = "pointer";
          rollDmgBtn.textContent = `Roll Damage (${esc(weapon.damage)}${bonusDie ? " +" + bonusDie : ""})`;
          rollDmgBtn.className = "btn secondary block";
          rollDmgBtn.style.background = "";
          rollDmgBtn.style.color = "";
        } else {
          rollDmgBtn.disabled = true;
          rollDmgBtn.style.opacity = "0.4";
          rollDmgBtn.style.cursor = "not-allowed";
          rollDmgBtn.textContent = `Roll Damage (${esc(weapon.damage)}${bonusDie ? " +" + bonusDie : ""})`;
          rollDmgBtn.className = "btn secondary block";
          rollDmgBtn.style.background = "";
          rollDmgBtn.style.color = "";
        }
      };

      rollAtkBtn.onclick = () => doRoll(false);
      atkDiv.appendChild(rollAtkBtn);

      m.body.append(atkDiv, dmgDiv, out);
    },

    // ---- Monster attack (auto-hit) ----
    monsterAttack(monsterName, atk, d6Roll, combatantId) {
      if (combatantId) {
        const comb = Combat.load();
        if (comb && comb.combatants) {
          const att = comb.combatants.find(cb => cb.id === combatantId);
          if (att && !att.acted) {
            att.acted = true;
            Combat.save(comb);
            const activeNav = document.querySelector("#app-nav button.active");
            if (activeNav && activeNav.dataset.route === "party") Combat.rerender();
          }
        }
      }
      const title = d6Roll ? `${monsterName}: 🎲 Rolled ${d6Roll} → ${atk.name}` : `${monsterName}: ${atk.name}`;
      const m = modal(title);
      const out = el(`<div class="roll-result"></div>`);
      const bodyElems = [];
      if (d6Roll) {
        bodyElems.push(el(`<p class="stat-line" style="font-size:1.2rem;color:var(--ok);margin:0 0 8px 0"><b>🎲 Rolled ${d6Roll} on Monster Attack Table!</b></p>`));
      }
      bodyElems.push(el(`<p class="stat-line" style="margin:0"><b>Automatic hit!</b> · ${esc(atk.desc || "")}</p>`));
      if (atk.damage) {
        const base = Dice.roll(atk.damage);
        out.innerHTML = `<div style="margin-top:12px;padding:10px;background:var(--bg-raised);border-radius:8px;border:1px solid var(--line)"><p class="outcome ok" style="font-size:1.6rem;margin:0">💥 ${base} damage</p><p class="stat-line" style="margin:4px 0 0 0">${atk.damage} = <b>${base}</b></p></div>`;
        const ignoreArm = /ignores armor/i.test(atk.desc || "");
        out.appendChild(Roller.renderDamageApplier(combatantId, base, ignoreArm));
      }
      bodyElems.push(out);
      m.body.append(...bodyElems);
    },

    // ---- Rulebook NPC / Animal attack (d20 vs skill) ----
    npcAttack(npcName, w, combatantId) {
      if (combatantId) {
        const comb = Combat.load();
        if (comb && comb.combatants) {
          const att = comb.combatants.find(cb => cb.id === combatantId);
          if (att && !att.acted) {
            att.acted = true;
            Combat.save(comb);
            const activeNav = document.querySelector("#app-nav button.active");
            if (activeNav && activeNav.dataset.route === "party") Combat.rerender();
          }
        }
      }
      const m = modal(`${npcName}: ${w.name}`);
      const out = el(`<div class="roll-result"></div>`);
      const rollBtn = el(`<button class="btn block">Roll Attack (Target ≤ ${w.skill})</button>`);
      let dmgBtn = null;
      if (w.damage) {
        dmgBtn = el(`<button class="btn secondary block" disabled style="margin-top:8px;opacity:0.4;cursor:not-allowed">Roll Damage (${esc(w.damage)}${w.bonus ? " +" + esc(w.bonus) : ""})</button>`);
        dmgBtn.onclick = () => {
          const base = Dice.roll(w.damage);
          let tot = base;
          let p = `${w.damage} = <b>${base}</b>`;
          if (w.bonus) {
            const b = Dice.roll(w.bonus); tot += b; p += ` · bonus ${w.bonus} = <b>${b}</b>`;
          }
          out.innerHTML += `<p class="outcome ok" style="font-size:1.6rem;margin-top:12px">${tot} damage</p><p class="stat-line">${p}</p>`;
          out.appendChild(Roller.renderDamageApplier(combatantId, tot, false));
        };
      }
      rollBtn.onclick = () => {
        rollBtn.disabled = true; rollBtn.style.opacity = "0.4"; rollBtn.style.cursor = "not-allowed";
        const d = Dice.d(20);
        const ok = d <= w.skill;
        const crit = d === 1; const fumble = d === 20;
        out.innerHTML = `<p class="outcome ${ok ? "ok" : "bad"}" style="font-size:1.6rem;margin-top:12px">${crit ? "🐉 Dragon Critical Hit!" : fumble ? "👿 Demon Fumble!" : ok ? "Hit!" : "Miss!"} (rolled ${d} vs ${w.skill})</p>`;
        if (dmgBtn) {
          dmgBtn.disabled = !ok;
          dmgBtn.style.opacity = ok ? "1" : "0.4";
          dmgBtn.style.cursor = ok ? "pointer" : "not-allowed";
        }
        if (!ok && combatantId) Combat.advanceTurn(combatantId);
      };
      const bodyElems = [el(`<p class="stat-line">Skill level ${w.skill} · Damage ${esc(w.damage)}${w.bonus ? " +" + esc(w.bonus) : ""}</p>`), rollBtn];
      if (dmgBtn) bodyElems.push(dmgBtn);
      bodyElems.push(out);
      m.body.append(...bodyElems);
    },

    rollNpcAttackTable(npcName, combatantId) {
      if (combatantId) {
        const comb = Combat.load();
        if (comb && comb.combatants) {
          const att = comb.combatants.find(cb => cb.id === combatantId);
          if (att && !att.acted) { att.acted = true; Combat.save(comb); const activeNav = document.querySelector("#app-nav button.active"); if (activeNav && activeNav.dataset.route === "party") Combat.rerender(); }
        }
      }
      const nat = typeof DB !== "undefined" && DB.solo && DB.solo.npcAttacks;
      if (!nat) return;
      const roles = nat.roles || ["Melee Attacker", "Ranged Attacker", "Sneaky Attacker", "Magic Attacker"];
      const m = modal(`${npcName}: NPC Attack Table`);
      const sel = el(`<select class="input" style="width:100%;margin-bottom:10px"></select>`);
      roles.forEach(r => sel.appendChild(el(`<option value="${r}">${r}</option>`)));
      const rollBtn = el(`<button class="btn block">🎲 Roll D6 AI Action</button>`);
      const out = el(`<div style="margin-top:12px"></div>`);
      rollBtn.onclick = () => {
        const role = sel.value;
        const roleMap = { "Melee Attacker": "melee", "Ranged Attacker": "ranged", "Sneaky Attacker": "sneaky", "Magic Attacker": "magic" };
        const prop = roleMap[role] || "melee";
        const r = Dice.d(6);
        const row = nat.rows.find(x => (x.d6 === "4" && r === 4) || (x.d6 === "5" && r === 5) || (x.d6 === "6" && r === 6) || (x.d6 === "1-3" && r <= 3)) || nat.rows[0];
        out.innerHTML = `<div style="padding:12px;background:var(--bg);border-radius:6px;border-left:4px solid var(--accent)">
          <p class="outcome ok" style="font-size:1.4rem;margin:0">Rolled ${r}: ${role}</p>
          <p class="stat-line" style="margin-top:6px;font-size:1.15rem">${row[prop] || "—"}</p>
        </div>`;
      };
      m.body.append(el(`<p class="stat-line">Select NPC role:</p>`), sel, rollBtn, out);
    },

    npcCast(npcName, spell, combatantId) {
      const comb = Combat.load();
      const cb = comb?.combatants?.find(c => c.id === combatantId) || { name: npcName, wp: 16, maxWp: 16 };
      let skillLvl = 14;
      if (npcName.toLowerCase().includes("boss") || npcName.toLowerCase().includes("archmage") || npcName.toLowerCase().includes("chieftain")) skillLvl = 15;
      
      const m = modal(`${npcName}: Cast ${spell.name}`);
      const sDetail = el(`<div class="spell-detail-card" style="margin-bottom:12px;padding:10px;background:var(--bg-raised);border-left:4px solid var(--accent)">
        <p style="margin:0;font-weight:bold">${esc(spell.name)} <span class="tag">${spell.rank ? `Rank ${spell.rank}` : "Trick"}</span></p>
        <p class="stat-line" style="margin:4px 0 0 0;font-size:0.95rem">${esc(spell.text || spell.desc || "Magical spell.")}</p>
      </div>`);

      const skillRow = el(`<div class="roll-ctl" style="margin-bottom:10px">
        <span class="stat-line">Magic Skill</span>
        <button class="step" id="sm">−</button>
        <span class="net-lbl" id="slvl">${skillLvl}</span>
        <button class="step" id="sp">+</button>
      </div>`);
      skillRow.querySelector("#sm").onclick = () => { skillLvl = Math.max(1, skillLvl - 1); skillRow.querySelector("#slvl").textContent = skillLvl; };
      skillRow.querySelector("#sp").onclick = () => { skillLvl = Math.min(20, skillLvl + 1); skillRow.querySelector("#slvl").textContent = skillLvl; };

      const out = el(`<div class="roll-result"></div>`);
      
      const d20Btn = el(`<button class="btn secondary block" style="margin-bottom:8px">🎲 Roll D20 Magic Check (vs PC Target)</button>`);
      d20Btn.onclick = () => {
        const r = Dice.d(20);
        const success = r <= skillLvl;
        if (cb.wp != null && cb.wp > 0) { cb.wp = Math.max(0, cb.wp - 2); Combat.save(comb); Combat.rerender(); }
        out.innerHTML = `<div style="padding:10px;background:var(--bg);border-radius:6px;border-left:4px solid ${success ? "var(--ok)" : "var(--bad)"}">
          <p class="outcome ${success ? "ok" : "bad"}" style="margin:0;font-size:1.3rem">Rolled ${r} vs Skill ${skillLvl} — ${success ? "SUCCESS!" : "FAILED!"}</p>
          ${cb.wp != null ? `<p class="stat-line" style="margin:4px 0 0 0">WP Remaining: ${cb.wp}/${cb.maxWp||cb.wp}</p>` : ""}
        </div>`;
        if (success) {
          const tot = (spell.rank || 1) * 2;
          out.appendChild(Roller.renderDamageApplier(combatantId, tot, false));
        }
      };

      const autoBtn = el(`<button class="btn block" style="background:var(--ok);color:#fff;border:none">✓ Auto-Succeed (Self / Ally Buff)</button>`);
      autoBtn.onclick = () => {
        if (cb.wp != null && cb.wp > 0) { cb.wp = Math.max(0, cb.wp - 2); Combat.save(comb); Combat.rerender(); }
        out.innerHTML = `<div style="padding:10px;background:var(--bg);border-radius:6px;border-left:4px solid var(--ok)">
          <p class="outcome ok" style="margin:0;font-size:1.3rem">Spell Cast Automatically!</p>
          ${cb.wp != null ? `<p class="stat-line" style="margin:4px 0 0 0">WP Remaining: ${cb.wp}/${cb.maxWp||cb.wp}</p>` : ""}
        </div>`;
      };

      m.body.append(sDetail, skillRow, d20Btn, autoBtn, out);
    },

    // ---- Spell / trick casting ----
    cast(charId, spell, isTrick) {
      const c = Store.get(charId); if (!c) return;
      let schoolEntry = Object.entries(c.skills).find(([, v]) => v.kind === "magic");
      if (!schoolEntry && c.spells && c.spells.castSkill && c.skills[c.spells.castSkill]) schoolEntry = [c.spells.castSkill, c.skills[c.spells.castSkill]];
      const level = schoolEntry ? schoolEntry[1].level : 0;
      const schoolName = schoolEntry ? schoolEntry[0] : "(no school)";
      const castAttr = schoolEntry ? schoolEntry[1].attribute : "INT";
      const m = modal(`Cast: ${spell.name}`);
      
      const sDetail = el(`<div class="spell-detail-card" style="margin-bottom:12px;padding:10px;background:var(--bg-raised);border-left:4px solid var(--gold)">
        <p style="margin:0;font-weight:bold">${esc(spell.name)} <span class="tag">${spell.rank ? `Rank ${spell.rank}` : "Trick"}</span></p>
        <p class="stat-line" style="margin:4px 0 0 0;font-size:0.95rem">${esc(spell.text || spell.desc || "Magical incantation.")}</p>
        ${spell.range ? `<p class="stat-line" style="margin:4px 0 0 0;font-size:0.85rem"><b>Range:</b> ${esc(spell.range)} · <b>Time:</b> ${esc(spell.time || "Action")}</p>` : ""}
      </div>`);

      const hasMetal = (c.gear?.armor?.name?.toLowerCase().match(/chain|plate|scale|ring|metal/)) ||
                       (c.inventory?.items?.some(x => x.equipped && x.name?.toLowerCase().match(/sword|dagger|knife|axe|spear|mace|halberd|warhammer|scimitar|chain|plate|metal/)));
      if (hasMetal) {
        sDetail.appendChild(el(`<div class="notice" style="border-color:var(--bad);background:rgba(200,0,0,0.1);color:var(--bad);margin-top:8px">⚠️ <b>Metal Restriction:</b> Wearing metal armor or holding metal weapons penalizes or blocks spellcasting.</div>`));
      }

      const isHeal = spell.name?.toLowerCase().match(/heal|cure|treat|resurrect/);
      if (c.state.wp <= 1) {
        if (isHeal) {
          sDetail.appendChild(el(`<div style="margin-top:8px;padding:6px;background:rgba(200,0,0,0.1);border-radius:4px;color:var(--bad);font-size:0.85rem">⚠️ Desperate? Power from the Body cannot be used for healing spells.</div>`));
        } else {
          const pWrap = el(`<div style="margin-top:8px;padding:8px;background:var(--bg);border:1px dashed var(--bad);border-radius:6px">
            <div style="color:var(--bad);font-weight:bold;font-size:0.9rem;margin-bottom:6px">🩸 Power from the Body (Convert HP to WP)</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap"></div>
          </div>`);
          const btnsWrap = pWrap.querySelector("div:nth-child(2)");
          [4, 6, 8, 10, 12, 20].forEach(d => {
            const db = el(`<button class="btn step small" style="flex:1;min-width:36px;border-color:var(--bad);color:var(--bad)">D${d}</button>`);
            db.onclick = () => {
              const roll = Dice.d(d);
              Store.update(charId, ch => {
                ch.state.hp = Math.max(0, ch.state.hp - roll);
                ch.state.wp = Math.min(ch.derived.wpMax || 99, ch.state.wp + roll);
              });
              alert(`🩸 Power from the Body (Rolled D${d})!\nTook ${roll} damage.\nGained ${roll} Willpower Points!`);
              m.close();
              Roller.cast(charId, spell, isTrick);
            };
            btnsWrap.appendChild(db);
          });
          sDetail.appendChild(pWrap);
        }
      }

      if (isTrick) {
        const out = el(`<div class="roll-result"></div>`);
        const btn = el(`<button class="btn block">Cast (1 WP, auto-success)</button>`);
        btn.onclick = () => {
          if (c.state.wp < 1) { out.innerHTML = `<p class="outcome bad">Not enough WP.</p>`; return; }
          Store.update(charId, (ch) => { ch.state.wp = Math.max(0, ch.state.wp - 1); }); this.refresh(charId);
          out.innerHTML = `<p class="outcome ok">Cast! −1 WP.</p>`;
        };
        m.body.append(sDetail, el(`<p class="stat-line">Magic tricks succeed automatically and cost 1 WP.</p>`), btn, out);
        return;
      }
      const isDraco = spell.school === "dracomancy";
      const perLevel = isDraco ? 6 : 2;
      let pl = 1;
      const condCn = (DB.conditions || []).find((cn) => cn.attribute === castAttr && c.state.conditions[cn.key]);
      const condBane = !!condCn;
      const head = el(`<p class="stat-line">Roll <b>${esc(schoolName)}</b> (level ${level})${condBane ? ` · <span style="color:var(--bad)">${esc(condCn.name)} → bane</span>` : ""}. ${perLevel} WP per power level.</p>`);
      const plRow = el(`<div class="roll-ctl"></div>`);
      const plLbl = el(`<span class="net-lbl">Power level ${pl} · ${pl * perLevel} WP</span>`);
      const pm = el(`<button class="step">−</button>`), pp = el(`<button class="step">+</button>`);
      pm.onclick = () => { pl = Math.max(1, pl - 1); plLbl.textContent = `Power level ${pl} · ${pl * perLevel} WP`; };
      pp.onclick = () => { pl = Math.min(3, pl + 1); plLbl.textContent = `Power level ${pl} · ${pl * perLevel} WP`; };
      plRow.append(el(`<span class="stat-line">Power</span>`), pm, plLbl, pp);
      
      const isReaction = spell.time?.toLowerCase().includes("reaction") || spell.castingTime?.toLowerCase().includes("reaction");
      const grimWrap = el(`<label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:0.95rem;cursor:pointer">
        <input type="checkbox" id="cast-unprepared" ${spell.prepared === false ? "checked" : ""}>
        <span>📖 Cast Unprepared from Grimoire (Doubles time)</span>
      </label>`);

      const castBtn = el(`<button class="btn block" style="margin-top:12px">Cast</button>`);
      const out = el(`<div class="roll-result"></div>`);
      const doCast = (pushedCondition) => {
        if (!pushedCondition) {
          castBtn.disabled = true; castBtn.style.opacity = "0.4"; castBtn.style.cursor = "not-allowed";
          pm.disabled = true; pp.disabled = true;
        }
        const isUnprepared = grimWrap.querySelector("#cast-unprepared")?.checked;
        if (isUnprepared && isReaction) {
          out.innerHTML = `<p class="outcome bad">❌ Reaction spells cannot be cast unprepared from a grimoire.</p>`;
          return;
        }

        const cost = pl * perLevel;
        const cur = Store.get(charId);
        if (cur.state.wp < cost && !pushedCondition) { out.innerHTML = `<p class="outcome bad">Not enough WP (need ${cost}, have ${cur.state.wp}).</p>`; return; }
        if (!pushedCondition) Store.update(charId, (ch) => { ch.state.wp = Math.max(0, ch.state.wp - cost); }); // WP spent regardless of result
        const net = (condBane ? -1 : 0);
        const r = this.d20net(net);
        const dragon = r.used === 1, demon = r.used === 20, success = r.used <= level;
        if (dragon || demon) Store.update(charId, (ch) => { if (schoolEntry) ch.skills[schoolEntry[0]].mark = true; });
        let html = `<div class="dice-faces">${r.dice.map((d) => `<span class="die ${d === r.used ? "used" : ""}">${d}</span>`).join("")}</div>`;
        html += `<p class="outcome ${success ? "ok" : "bad"}">${dragon ? "🐉 DRAGON — cast! choose: double damage/range, no WP cost, or cast another (bane)" : demon ? "👹 DEMON — magical mishap!" : success ? `Success — power level ${pl}` : "Failed — WP still spent"}</p>`;
        if (!pushedCondition) html += `<p class="stat-line">−${cost} WP.</p>`;
        if (isUnprepared && success) html += `<p class="stat-line" style="color:var(--bad)">⏳ Unprepared: Casting time doubled (takes 2 rounds/stretches).</p>`;
        if (demon) {
          const roll = Dice.d(20); const text = MISHAPS[roll - 1];
          html += `<p class="notice" style="border-color:var(--bad)"><b>Mishap (D20=${roll}):</b> ${esc(text)}</p>`;
          if (roll <= 6) Store.update(charId, (ch) => { ch.state.conditions[CONDITION_BY_MISHAP[roll - 1]] = true; });
          else if (roll === 7) { const dmg = Dice.roll(pl + "D6"); Store.update(charId, (ch) => { ch.state.hp = Math.max(0, ch.state.hp - dmg); }); html += `<p class="stat-line">Took ${dmg} damage.</p>`; }
          else if (roll === 8) { const wl = Dice.roll(pl + "D6"); Store.update(charId, (ch) => { ch.state.wp = Math.max(0, ch.state.wp - wl); }); html += `<p class="stat-line">Lost a further ${wl} WP.</p>`; }
        }
        if (pushedCondition) html += `<p class="stat-line">Pushed — gained <b>${esc(pushedCondition)}</b>.</p>`;
        out.innerHTML = html;
        const cur2 = Store.get(charId) || c;
        const curConds2 = cur2?.state?.conditions || {};
        const remaining = (DB.conditions || []).filter((cn) => !curConds2[cn.key]);
        const hasSS2 = cur2?.abilities?.some(a => a.name === "Sole Survivor") && (cur2?.state?.wp || 0) >= 3;
        if (!success && !demon && !pushedCondition && (remaining.length || hasSS2)) {
          const pushWrap = el(`<div class="push-wrap"><p class="stat-line">Push? Choose a condition, then re-roll (WP already spent):</p></div>`);
          const cw = el(`<div class="chip-wrap"></div>`);
          remaining.forEach((cn) => { const chip = el(`<button class="skill-chip">${esc(cn.name)}</button>`); chip.onclick = () => { Store.update(charId, (ch) => { ch.state.conditions[cn.key] = true; }); doCast(cn.name); }; cw.appendChild(chip); });
          if (hasSS2) {
            const chip = el(`<button class="skill-chip" style="border-color:var(--accent)">💫 Sole Survivor (−3 WP)</button>`);
            chip.onclick = () => { Store.update(charId, (ch) => { ch.state.wp -= 3; }); doCast("Sole Survivor (−3 WP)"); };
            cw.appendChild(chip);
          }
          pushWrap.appendChild(cw); out.appendChild(pushWrap);
        }
        this.refresh(charId);
      };
      castBtn.onclick = () => doCast(null);
      m.body.append(sDetail, head, plRow, grimWrap, castBtn, out);
    }
  };

  /* =================================================================
   * Character sheet — live, persistent tracker (Phase 2)
   * ================================================================= */
  // Ensure a character's inventory uses the structured shape (migrates legacy data).
  function normalizeInventory(c) {
    if (!c) return;
    if (!c.identity) c.identity = { name: "Unnamed Hero", kin: "Human", profession: "Fighter" };
    if (!c.state) c.state = {};
    if (!c.derived) c.derived = { hpMax: 10, wpMax: 10 };
    if (!c.attributes) c.attributes = {};
    if (!c.skills) c.skills = {};
    if (!c.spells) c.spells = { tricks: [], known: [] };
    const inv = c.inventory || (c.inventory = {});
    inv.items = (inv.items || []).map((it) => typeof it === "string" ? { name: it, weight: 1 } : { name: it?.name || "Item", weight: it?.weight == null ? 1 : it.weight });
    inv.tiny = (inv.tiny || []).map((it) => typeof it === "string" ? { name: it } : it || { name: "Tiny" });
    inv.mementos = (inv.mementos || []).map((m) => typeof m === "string" ? m : m?.name || "");
    inv.money = Object.assign({ gold: 0, silver: 0, copper: 0 }, inv.money || {});
    if (!c.state.conditions) c.state.conditions = {};
    if (!c.state.deathRolls) c.state.deathRolls = { successes: 0, failures: 0 };
    if (!Array.isArray(c.companions)) c.companions = [];
    if (!Array.isArray(c.effects)) c.effects = [];
    if (typeof c.state.wpPenalty !== "number") c.state.wpPenalty = 0;
  }
  // Effective max WP after permanent reductions (rituals, corruption); restorable via Focused.
  const effWpMax = (c) => Math.max(0, c.derived.wpMax - (c.state.wpPenalty || 0));
  // Does a spell summon/raise a creature (gets its own roster entry)?
  function isSummonSpell(sp) {
    const t = ((sp.name || "") + " " + (sp.text || "")).toLowerCase();
    return /\bsummon|\braise |\banimate |counts as a monster|familiar|homunculus|golem|earth elemental|fire elemental|wind elemental|water elemental|skeletal horde|guardian demon|bestial helper|companion/.test(t);
  }
  // A spell worth tracking as an ongoing effect (lasting, non-instant duration).
  function isTrackableSpell(sp) { return sp.duration && !/instant/i.test(sp.duration); }
  function isConcentration(sp) { return sp.duration && /concentration/i.test(sp.duration); }
  const encLimit = (c) => Math.ceil(c.attributes.STR / 2);
  const encUsed = (c) => (c.inventory.items || []).reduce((t, it) => t + (Number(it.weight) || 0), 0);

  const Sheet = {
    id: null,
    open(id) {
      const c = Store.get(id);
      if (!c) { Router.go("home"); return; }
      normalizeInventory(c); Store.update(id, normalizeInventory);
      this.id = id; window.activeCharacterId = id; this.render();
    },
    mutate(fn) { Store.update(this.id, fn); this.render(); },
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
    toast(msg) {
      const t = el(`<div class="toast">${esc(msg)}</div>`);
      document.body.appendChild(t);
      setTimeout(() => t.classList.add("show"), 10);
      setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
    },
    rest(kind) {
      if (kind === "round") {
        const w = Dice.roll("D6");
        this.mutate((ch) => { ch.state.wp = Math.min(effWpMax(ch), ch.state.wp + w); });
        this.toast(`Round rest: +${w} WP.`);
      } else if (kind === "shift") {
        this.mutate((ch) => { ch.state.hp = ch.derived.hpMax; ch.state.wp = effWpMax(ch); ch.state.conditions = {}; ch.state.deathRolls = { successes: 0, failures: 0 }; });
        this.toast("Shift rest: full HP & WP, all conditions cleared.");
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
      } else { // stretch
        const h = Dice.roll("D6"), w = Dice.roll("D6");
        this.mutate((ch) => { ch.state.hp = Math.min(ch.derived.hpMax, ch.state.hp + h); ch.state.wp = Math.min(effWpMax(ch), ch.state.wp + w); });
        const cur = Store.get(this.id);
        const held = (DB.conditions || []).filter((cn) => cur.state.conditions[cn.key]);
        if (!held.length) { this.toast(`Stretch rest: +${h} HP, +${w} WP.`); return; }
        const m = modal("Stretch rest — heal a condition");
        m.body.appendChild(el(`<p class="stat-line">Recovered +${h} HP and +${w} WP. Choose one condition to heal:</p>`));
        const cw = el(`<div class="chip-wrap"></div>`);
        held.forEach((cn) => { const chip = el(`<button class="skill-chip cond-on">${esc(cn.name)}</button>`); chip.onclick = () => { Store.update(this.id, (ch) => { ch.state.conditions[cn.key] = false; }); m.close(); this.render(); }; cw.appendChild(chip); });
        m.body.appendChild(cw);
      }
    },
    deathRoll() {
      const con = Store.get(this.id).attributes.CON;
      const roll = Dice.d(20);
      const dragon = roll === 1, demon = roll === 20;
      const success = roll <= con;
      let stabilized = false, dead = false, recovered = 0;
      this.mutate((ch) => {
        const dr = ch.state.deathRolls || { successes: 0, failures: 0 };
        if (dragon) dr.successes += 2; else if (demon) dr.failures += 2; else if (success) dr.successes += 1; else dr.failures += 1;
        if (dr.failures >= 3) { dead = true; ch.state.deathRolls = dr; }
        else if (dr.successes >= 3) { stabilized = true; recovered = Dice.roll("D6"); ch.state.hp = recovered; ch.state.rallied = false; ch.state.deathRolls = { successes: 0, failures: 0 }; }
        else ch.state.deathRolls = dr;
      });
      let msg = `Death roll ${roll} vs CON ${con}: ` + (dragon ? "🐉 Dragon — two successes!" : demon ? "👹 Demon — two failures!" : success ? "success." : "failure.");
      if (stabilized) msg += ` Stabilized — recovered ${recovered} HP!`; else if (dead) msg += " 💀 Your hero has died.";
      this.toast(msg);
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
        (pool.spells || []).filter((s) => !known.has(s.name)).forEach((s) => { const chip = el(`<button class="skill-chip">${esc(s.name)} <span class="stat-line">R${s.rank}</span></button>`); chip.onclick = () => { this.mutate((ch) => ch.spells.known.push({ name: s.name, rank: s.rank, school: sel.value, text: s.text })); renderList(); this.toast(`Learned: ${s.name}.`); }; cw.appendChild(chip); });
        if (!cw.children.length) cw.appendChild(el(`<span class="stat-line">All spells in this school are known.</span>`));
        listWrap.appendChild(cw);
      };
      sel.onchange = renderList; m.body.append(sel, listWrap); renderList();
    },
    endSession() {
      const c = Store.get(this.id);
      const marked = Object.keys(c.skills).filter((n) => c.skills[n].mark);
      if (!marked.length) { this.toast("No advancement marks to roll."); return; }
      const results = [];
      this.mutate((ch) => {
        marked.forEach((n) => {
          const sk = ch.skills[n]; const roll = Dice.d(20);
          const improved = roll > sk.level && sk.level < 18;
          if (improved) sk.level = Math.min(18, sk.level + 1);
          sk.mark = false;
          results.push({ name: n, roll, level: sk.level, improved });
        });
      });
      const m = modal("Session end — advancement");
      m.body.appendChild(el(`<p class="stat-line">For each marked skill, roll D20; if it exceeds the skill's level, the skill improves by 1 (max 18). Marks are then cleared.</p>`));
      results.forEach((r) => m.body.appendChild(el(`<p>${esc(r.name)}: rolled <b>${r.roll}</b> → ${r.improved ? `<span style="color:var(--good)">improved to ${r.level}</span>` : `no change (${r.level})`}</p>`)));
    },
    render() {
      const c = Store.get(this.id);
      if (!c) { Router.go("home"); return; }
      const a = c.attributes;
      const condByAttr = {}; (DB.conditions || []).forEach((cn) => { if (c.state.conditions[cn.key]) condByAttr[cn.attribute] = true; });
      const root = el(`<div></div>`);

      // Header
      root.appendChild(el(`<div class="wiz-head"><button class="btn ghost" id="sheet-back">← Heroes</button><div class="wiz-progress">${esc(c.identity.name)}</div></div>`));

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
      idWrap.querySelector("#portrait-wrap").onclick = () => this.uploadPortrait();
      top.appendChild(idWrap);
      const attrRow = el(`<div class="rolled-row" style="margin-top:8px">${(DB.attributes||[]).map((at)=>`<span class="tag ${condByAttr[at.key]?"baned":""}" title="${condByAttr[at.key]?"A condition imposes a bane on "+at.key+" rolls":""}">${at.key} ${a[at.key]}${condByAttr[at.key]?" ⚠":""}</span>`).join("")}</div>`);
      top.appendChild(attrRow);
      top.appendChild(el(`<p class="stat-line">Move ${c.derived.movement} · STR dmg ${c.derived.dmgBonusSTR?"+"+c.derived.dmgBonusSTR:"—"} · AGL dmg ${c.derived.dmgBonusAGL?"+"+c.derived.dmgBonusAGL:"—"} · Enc. limit ${encLimit(c)}</p>`));
      // HP / WP steppers
      const stepper = (label, cur, max, key, cls) => {
        const w = el(`<div class="vital ${cls}"><div class="vital-label">${label}</div></div>`);
        const ctrl = el(`<div class="stepper"></div>`);
        const minus = el(`<button class="step">−</button>`);
        const val = el(`<span class="vital-val">${cur} / ${max}</span>`);
        const plus = el(`<button class="step">+</button>`);
        minus.onclick = () => this.mutate((ch) => {
          if (key === "hp" && ch.state.hp <= 0) { ch.state.deathRolls.failures = Math.min(3, (ch.state.deathRolls.failures || 0) + 1); } // damage while down = a failed death roll
          else ch.state[key] = Math.max(0, ch.state[key] - 1);
        });
        plus.onclick = () => this.mutate((ch) => { ch.state[key] = Math.min(max, ch.state[key] + 1); if (key === "hp" && ch.state.hp > 0) { ch.state.deathRolls = { successes: 0, failures: 0 }; ch.state.rallied = false; } });
        ctrl.append(minus, val, plus); w.appendChild(ctrl);
        return w;
      };
      const vitals = el(`<div class="vitals"></div>`);
      vitals.appendChild(stepper("Hit Points", c.state.hp, c.derived.hpMax, "hp", "hp"));
      vitals.appendChild(stepper("Willpower", c.state.wp, effWpMax(c), "wp", "wp"));
      top.appendChild(vitals);

      // Movement Tracker
      const baseMove = c.derived.movement || 10;
      if (typeof c.state.moveSpent !== "number") c.state.moveSpent = 0;
      if (typeof c.state.isDashing !== "boolean") c.state.isDashing = false;
      if (typeof c.state.isMounted !== "boolean") c.state.isMounted = false;
      
      const calcMaxMove = () => {
        let m = c.state.isMounted ? 20 : baseMove;
        if (c.abilities?.some(x => x.name === "Longstrider")) m *= 2;
        if (c.state.isDashing) m *= 2;
        return m;
      };
      
      const movePanel = el(`<div class="move-panel">
        <div class="move-meter">
          <span>🏃 <b>Movement Pool:</b> <small>(Base ${baseMove}m)</small></span>
          <span class="move-val">${Math.max(0, calcMaxMove() - c.state.moveSpent)}m / ${calcMaxMove()}m</span>
        </div>
        <div class="move-toggles">
          <button type="button" class="move-btn ${c.state.isDashing ? "active" : ""}" title="Dash: doubles pool & auto-spends Action">⚡ Dash ${c.state.isDashing ? "ON" : "OFF"}</button>
          <button type="button" class="move-btn ${c.state.isMounted ? "active" : ""}" title="Mounted: base speed 20m">🐴 Mount</button>
          <button type="button" class="move-btn" title="Step 2m (1 grid square)">+2m</button>
          <button type="button" class="move-btn" title="Difficult Terrain (Water/Door) → spends 4m">+4m (½)</button>
          <button type="button" class="move-btn" title="Reset movement turn">↺ Reset</button>
        </div>
      </div>`);
      
      const moveBtns = movePanel.querySelectorAll(".move-btn");
      moveBtns[0].onclick = () => this.mutate(ch => {
        ch.state.isDashing = !ch.state.isDashing;
        if (ch.state.isDashing) {
          const comb = Combat.load();
          if (comb && comb.combatants) {
            const ref = comb.combatants.find(x => x.charId === ch.id);
            if (ref) { ref.acted = true; Combat.save(comb); }
          }
        }
      });
      moveBtns[1].onclick = () => this.mutate(ch => { ch.state.isMounted = !ch.state.isMounted; });
      moveBtns[2].onclick = () => this.mutate(ch => { ch.state.moveSpent = Math.min(calcMaxMove(), (ch.state.moveSpent || 0) + 2); });
      moveBtns[3].onclick = () => this.mutate(ch => { ch.state.moveSpent = Math.min(calcMaxMove(), (ch.state.moveSpent || 0) + 4); });
      moveBtns[4].onclick = () => this.mutate(ch => { ch.state.moveSpent = 0; ch.state.isDashing = false; });
      
      top.appendChild(movePanel);

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
          const rally = el(`<button class="btn ghost" title="ally PERSUASION (within 10m) or self WIL with a bane — you act, but keep rolling">${c.state.rallied ? "Rallied ✓" : "Rally"}</button>`);
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
      const advBtn = el(`<button class="btn ghost" style="margin:4px 0 10px">End session — roll advancement${markedCount?` (${markedCount} marked)`:""}</button>`);
      advBtn.onclick = () => this.endSession();
      skPanel.appendChild(advBtn);
      const skList = el(`<div class="skill-list"></div>`);
      Object.entries(c.skills).sort((x,y)=>x[0].localeCompare(y[0])).forEach(([n,v]) => {
        const baned = condByAttr[v.attribute];
        const row = el(`<div class="skill-row ${v.trained?"trained":""}">
          <button class="mark ${v.mark?"marked":""}" title="advancement mark">${v.mark?"●":"◦"}</button>
          <button class="sk-name rollable">${esc(n)} <span class="stat-line">${v.attribute}${baned?" ⚠":""}</span></button>
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
          const rm = el(`<button class="step rm" title="end effect">✕</button>`); rm.onclick = () => this.mutate((ch) => ch.effects.splice(i, 1));
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
        sethp.onclick = () => { const n = parseInt(prompt(`Max HP for ${cp.name}?`, cp.hpMax || ""), 10); if (!isNaN(n)) this.mutate((ch) => { ch.companions[i].hpMax = Math.max(0, n); ch.companions[i].hp = Math.max(0, n); }); };
        const rm = el(`<button class="step rm">✕</button>`); rm.onclick = () => this.mutate((ch) => ch.companions.splice(i, 1));
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

      // Inventory + encumbrance
      const used = encUsed(c), limit = encLimit(c), over = used > limit;
      const invPanel = el(`<div class="panel"><h3>Inventory</h3></div>`);
      invPanel.appendChild(el(`<div class="enc-bar"><div class="enc-fill ${over?"over":""}" style="width:${Math.min(100, limit?used/limit*100:0)}%"></div></div>
        <p class="stat-line">${used} / ${limit} item slots used${over?` · <b style="color:var(--bad)">Over-encumbered! Make a STR roll to move.</b>`:""}</p>`));
      const itemList = el(`<div></div>`);
      (c.inventory.items||[]).forEach((it, i) => {
        const row = el(`<div class="inv-row"><span class="inv-name">${esc(it.name)}</span></div>`);
        const wpns = resolveEquippedWeapons([it]);
        wpns.forEach((wpn) => {
          const dmg = el(`<button class="step dmg" title="roll attack / damage (${esc(wpn.name)})">⚔ ${wpns.length > 1 ? esc(wpn.name) : ""}</button>`);
          dmg.onclick = () => Roller.damage(this.id, wpn);
          row.appendChild(dmg);
        });
        const wt = el(`<input type="number" class="wt" min="0" step="1" value="${it.weight}">`);
        wt.onchange = () => this.mutate((ch) => { ch.inventory.items[i].weight = Math.max(0, Number(wt.value)||0); });
        const rm = el(`<button class="step rm">✕</button>`);
        rm.onclick = () => this.mutate((ch) => { ch.inventory.items.splice(i, 1); });
        row.append(el(`<span class="stat-line">wt</span>`), wt, rm);
        itemList.appendChild(row);
      });
      if (!(c.inventory.items||[]).length) itemList.appendChild(el(`<p class="stat-line">No items.</p>`));
      invPanel.appendChild(itemList);
      const addRow = el(`<div class="inv-add"></div>`);
      const addName = el(`<input type="text" placeholder="Add an item…">`);
      const addWt = el(`<input type="number" class="wt" min="0" step="1" value="1" title="weight">`);
      const addBtn = el(`<button class="btn secondary">Add</button>`);
      const doAdd = () => { const name = addName.value.trim(); if (!name) return; this.mutate((ch) => ch.inventory.items.push({ name, weight: Math.max(0, Number(addWt.value)||0) })); };
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
      const notesField = el(`<div class="form-field"><label>Notes / Journal</label></div>`);
      const notes = el(`<textarea rows="4" placeholder="Session notes, threads, loot…"></textarea>`);
      notes.value = c.notes || "";
      notes.oninput = () => { Store.update(this.id, (ch) => { ch.notes = notes.value; }); }; // save without re-render
      notesField.appendChild(notes); flav.appendChild(notesField); root.appendChild(flav);

      // Delete
      const del = el(`<button class="btn ghost block" style="margin-top:6px">Delete hero</button>`);
      del.onclick = () => { if (confirm("Delete " + c.identity.name + "?")) { window.activeCharacterId = null; Store.remove(this.id); Router.go("home"); } };
      root.appendChild(del);

      // Mount, preserving scroll across re-renders
      const y = window.scrollY;
      const s = $("#screen"); s.innerHTML = ""; s.appendChild(root); window.scrollTo(0, y);
      root.querySelector("#sheet-back").onclick = () => { window.activeCharacterId = null; Router.go("home"); };
    }
  };

  /* =================================================================
   * Combat-round helper (Phase 4) — local initiative tracker
   * ================================================================= */
  const Combat = {
    KEY: "dragonbane.combat",
    isGm() {
      return typeof Sync === "undefined" || !Sync.enabled || !Sync.campaign || Sync.campaign.role === "gm";
    },
    guardGm(fn) {
      if (!this.isGm()) {
        alert("🛡️ GM Locked: Only the Campaign Game Master can manage combat turns or advance rounds.");
        return;
      }
      fn();
    },
    load() {
      try {
        const raw = JSON.parse(localStorage.getItem(this.KEY));
        return { round: raw?.round || 0, combatants: Array.isArray(raw?.combatants) ? raw.combatants : [] };
      } catch (_) {
        return { round: 0, combatants: [] };
      }
    },
    save(s) {
      localStorage.setItem(this.KEY, JSON.stringify(s));
      if (typeof Sync !== "undefined" && Sync.enabled && Sync.campaign) {
        Sync.pushCombat(s);
      }
    },
    rerender() { const y = window.scrollY; const sc = $("#screen"); sc.innerHTML = ""; sc.appendChild(this.view()); window.scrollTo(0, y); },
    mutate(fn) {
      const s = this.load();
      fn(s);
      if (s.combatants && s.combatants.length > 0) {
        if (!s.round || s.combatants.some(c => c.init == null)) {
          this.draw(s);
          s.round = s.round || 1;
        }
        s.combatants.sort((a, b) => (a.init == null ? 99 : a.init) - (b.init == null ? 99 : b.init));
      }
      this.save(s);
      this.rerender();
    },
    advanceTurn(combatantId) {
      this.mutate(st => {
        if (combatantId) {
          const ref = st.combatants.find(c => c.id === combatantId);
          if (ref) { ref.done = true; ref.acted = true; }
        }
        const enemies = st.combatants.filter(c => c.kind === "monster" || (c.kind === "npc" && !c.isCompanion));
        const allEnemiesDead = enemies.length > 0 && enemies.every(c => c.hp != null && c.hp <= 0);
        if (allEnemiesDead) {
          st.round = 0;
          st.combatants = st.combatants.filter(c => c.kind === "hero");
          setTimeout(() => alert("🎉 VICTORY! All enemies defeated! Battle concluded."), 50);
          return;
        }
        const active = st.combatants.filter(c => c.hp == null || c.hp > 0);
        if (active.length > 0 && active.every(c => c.done)) {
          this.draw(st);
          st.round = (st.round || 1) + 1;
          st.combatants.forEach(c => { c.done = false; c.acted = false; });
          setTimeout(() => alert("⚔️ Round " + st.round + "! Initiative redrawn."), 50);
        }
      });
    },
    draw(s) {
      s.combatants = (s.combatants || []).filter(c => !c.isArmyOfOneSecondary);
      const cards = [1,2,3,4,5,6,7,8,9,10];
      for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
      let idx = 0;
      const nextCard = () => idx < 10 ? cards[idx++] : Dice.d(10);
      const extras = [];
      s.combatants.forEach((cb) => {
        cb.init = nextCard(); cb.done = false; cb.acted = false;
        if (cb.kind === "hero" && cb.charId) {
          const ch = Store.get(cb.charId);
          if (ch && ch.abilities?.some(a => a.name === "Army of One")) {
            extras.push({ ...cb, id: uid(), init: nextCard(), done: false, acted: false, name: `${cb.name} (Turn 2)`, isArmyOfOneSecondary: true });
          }
        }
      });
      s.combatants.push(...extras);
    },
    ordered(s) { return [...s.combatants].sort((a, b) => (a.init == null ? 99 : a.init) - (b.init == null ? 99 : b.init)); },
    view() {
      const s = this.load();
      const root = el(`<div></div>`);
      if (typeof renderPartyBanner === "function") { const pb = renderPartyBanner(); if (pb) root.appendChild(pb); }
      root.appendChild(el(sectionTitle("Combat tracker")));
      root.appendChild(el(`<p class="stat-line">An all-in-one tabletop dashboard: track initiative order, step HP/WP vitals (+/−), and roll monster auto-hits or hero attacks inline.</p>`));

      // Add controls panel
      const addPanel = el(`<div class="panel"></div>`);
      window._combatAddSelections = window._combatAddSelections || {};
      const heroes = Store.list();
      if (heroes.length) {
        const heroRow = el(`<div class="inv-add"></div>`);
        const sel = el(`<select></select>`); sel.appendChild(el(`<option value="">Add a hero…</option>`));
        heroes.forEach((h) => sel.appendChild(el(`<option value="${esc(h.id)}">${esc(h.identity.name)}</option>`)));
        if (window._combatAddSelections.hero) sel.value = window._combatAddSelections.hero;
        sel.onchange = () => { window._combatAddSelections.hero = sel.value; };
        const add = el(`<button class="btn secondary">Add</button>`);
        add.onclick = () => {
          if (!sel.value) return; const h = Store.get(sel.value);
          window._combatAddSelections.hero = "";
          this.mutate((st) => st.combatants.push({
            id: uid(), name: h.identity.name, kind: "hero", charId: h.id, init: null, done: false,
            hp: h.state.hp, maxHp: h.derived.hpMax, wp: h.state.wp, maxWp: h.derived.wpMax,
            armor: (h.gear && h.gear.armor ? h.gear.armor.rating : 0)
          }));
        };
        heroRow.append(sel, add); addPanel.appendChild(heroRow);
      }

      // Bestiary monsters
      const monsters = typeof DRAGONBANE_MONSTERS !== "undefined" ? DRAGONBANE_MONSTERS : [];
      if (monsters.length) {
        const monRow = el(`<div class="inv-add"></div>`);
        const monSel = el(`<select></select>`); monSel.appendChild(el(`<option value="">Add Bestiary monster…</option>`));
        monsters.forEach((m) => monSel.appendChild(el(`<option value="${esc(m.id)}">${esc(m.name)} (HP ${m.hp})</option>`)));
        if (window._combatAddSelections.monster) monSel.value = window._combatAddSelections.monster;
        monSel.onchange = () => { window._combatAddSelections.monster = monSel.value; };
        const monAdd = el(`<button class="btn secondary">Add</button>`);
        monAdd.onclick = () => {
          if (!monSel.value) return; const m = monsters.find(x => x.id === monSel.value);
          window._combatAddSelections.monster = "";
          this.mutate((st) => st.combatants.push({
            id: uid(), name: m.name, kind: "monster", monId: m.id, init: null, done: false,
            hp: m.hp, maxHp: m.hp, armor: m.armor, attacks: m.attacks
          }));
        };
        monRow.append(monSel, monAdd); addPanel.appendChild(monRow);
      }

      // Rulebook NPCs & Animals
      const npcs = typeof DRAGONBANE_NPCS !== "undefined" ? DRAGONBANE_NPCS : [];
      if (npcs.length) {
        const rNpcRow = el(`<div class="inv-add"></div>`);
        const rNpcSel = el(`<select></select>`); rNpcSel.appendChild(el(`<option value="">Add Rulebook NPC / Animal…</option>`));
        npcs.forEach((n) => rNpcSel.appendChild(el(`<option value="${esc(n.id)}">${esc(n.name)} (HP ${n.hp})</option>`)));
        if (window._combatAddSelections.npc) rNpcSel.value = window._combatAddSelections.npc;
        rNpcSel.onchange = () => { window._combatAddSelections.npc = rNpcSel.value; };
        const rNpcAdd = el(`<button class="btn secondary">Add</button>`);
        rNpcAdd.onclick = () => {
          if (!rNpcSel.value) return; const n = npcs.find(x => x.id === rNpcSel.value);
          window._combatAddSelections.npc = "";
          this.mutate((st) => st.combatants.push({
            id: uid(), name: n.name, kind: "npc", npcId: n.id, init: null, done: false,
            hp: n.hp, maxHp: n.hp, wp: n.wp || null, maxWp: n.wp || null, armor: n.armor || 0, desc: n.desc || "", weapons: n.weapons || null, spells: n.spells || null
          }));
        };
        rNpcRow.append(rNpcSel, rNpcAdd); addPanel.appendChild(rNpcRow);
      }

      // Custom NPC
      const npcRow = el(`<div class="inv-add"></div>`);
      const npcName = el(`<input type="text" placeholder="Add custom humanoid NPC…">`);
      if (window._combatAddSelections.custom) npcName.value = window._combatAddSelections.custom;
      npcName.oninput = () => { window._combatAddSelections.custom = npcName.value; };
      const npcAdd = el(`<button class="btn secondary">Add</button>`);
      const doNpc = () => {
        const n = npcName.value.trim(); if (!n) return;
        window._combatAddSelections.custom = "";
        this.mutate((st) => st.combatants.push({ id: uid(), name: n, kind: "npc", init: null, done: false, hp: 10, maxHp: 10, armor: 0 }));
      };
      npcAdd.onclick = doNpc; npcName.onkeydown = (e) => { if (e.key === "Enter") doNpc(); };
      npcRow.append(npcName, npcAdd); addPanel.appendChild(npcRow);
      root.appendChild(addPanel);

      if (!s.combatants.length) { root.appendChild(el(`<div class="empty"><div class="big">⚔</div><p class="stat-line">Add combatants to begin.</p></div>`)); return root; }

      // Round controls
      const ctrl = el(`<div class="panel"></div>`);
      ctrl.appendChild(el(`<p><b>${s.round ? "Round " + s.round : "Not started"}</b></p>`));
      const btns = el(`<div class="rest-row"></div>`);
      const drawBtn = el(`<button class="btn">${s.round ? "Re-draw" : "Draw initiative"}</button>`);
      drawBtn.onclick = () => this.guardGm(() => this.mutate((st) => { this.draw(st); if (!st.round) st.round = 1; }));
      const nextTurn = el(`<button class="btn ghost">Next turn</button>`);
      nextTurn.onclick = () => this.guardGm(() => this.mutate((st) => { const ord = this.ordered(st).filter((c) => c.init != null); const cur = ord.find((c) => !c.done); if (cur) { const ref = st.combatants.find((c) => c.id === cur.id); ref.done = true; } }));
      const nextRound = el(`<button class="btn ghost">Next round</button>`);
      nextRound.onclick = () => this.guardGm(() => this.mutate((st) => { this.draw(st); st.round = (st.round || 0) + 1; st.combatants.forEach(c => { c.done = false; c.acted = false; }); }));
      const resetTurns = el(`<button class="btn ghost">Reset Turns</button>`);
      resetTurns.onclick = () => this.guardGm(() => this.mutate((st) => { st.combatants.forEach(c => { c.done = false; c.acted = false; }); }));
      const end = el(`<button class="btn ghost">End combat</button>`);
      end.onclick = () => this.guardGm(() => { if (confirm("End combat and clear all combatants?")) this.mutate((st) => { st.round = 0; st.combatants = []; }); });
      const fleeBtn = el(`<button class="btn ghost" style="border:1px dashed var(--bad);color:var(--bad)">🏃 Flee Close Combat</button>`);
      fleeBtn.onclick = () => {
        const d = Dice.d(20);
        if (d <= 5) {
          alert(`🏃 Evade Roll: ${d} ≤ 5 → Success!\nYou successfully flee close combat without provoking a Free Attack.`);
        } else {
          const fm = modal("Evade Failed! Free Attack Triggered");
          fm.body.append(
            el(`<p class="outcome bad" style="font-size:1.4rem">Rolled ${d} (Failed Evade)</p>`),
            el(`<p class="stat-line">You fail to break away cleanly. The engaged enemy gets an immediate Free Attack against you!</p>`),
            el(`<button class="btn block" style="background:var(--bad);color:#fff" onclick="this.disabled=true;alert('🎲 GM rolls Enemy Free Attack! Apply damage as usual.');">🎲 Roll Enemy Free Attack</button>`)
          );
        }
      };
      btns.append(drawBtn, nextTurn, nextRound, resetTurns, fleeBtn, end); ctrl.appendChild(btns);
      root.appendChild(ctrl);

      // Combatant list (ordered accordions)
      const list = el(`<div style="display:flex;flex-direction:column;gap:8px"></div>`);
      const ord = this.ordered(s);
      const currentId = (ord.find((c) => c.init != null && !c.done) || {}).id;
      ord.forEach((cb) => {
        const isCur = cb.id === currentId;
        const isDefeated = cb.defeated || (cb.hp != null && cb.hp <= 0);
        const card = el(`<div class="panel ${isCur ? "current" : ""} ${cb.done || cb.acted ? "done" : ""}" style="margin:0;padding:0;overflow:hidden;border:1px solid ${isCur ? "var(--accent)" : "var(--border)"};opacity:${isDefeated ? "0.55" : "1"}"></div>`);
        
        const head = el(`<div class="combat-row" style="display:flex;flex-direction:column;padding:10px 12px;cursor:pointer;gap:8px;${isDefeated ? "text-decoration:line-through;background:rgba(0,0,0,0.15)" : ""}">
          <div style="display:flex;align-items:center;gap:10px;width:100%">
            <span class="init-card" style="margin:0;flex-shrink:0">${cb.init == null ? "–" : cb.init}</span>
            <span class="cb-name" style="font-weight:bold;font-size:1.3rem;color:var(--ink);word-break:break-word">${esc(cb.name)}</span>
            <div class="row-top-actions" style="display:flex;align-items:center;gap:4px;margin-left:auto"></div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;width:100%;flex-wrap:wrap">
            <span class="tag">${cb.kind === "hero" ? "Hero" : cb.kind === "monster" ? "Monster" : "NPC"}</span>
            ${isCur && !isDefeated ? '<span class="tag" style="background:var(--accent);color:#f7eed6;border-color:var(--accent)">now</span>' : ""}
            ${isDefeated ? '<span class="tag" style="background:var(--bad);color:#fff">💀 DEFEATED</span>' : ""}
            <div class="quick-attacks" style="display:flex;gap:6px;align-items:center;margin-left:auto"></div>
            <span style="font-weight:bold;font-size:1.15rem;color:${isDefeated ? "var(--bad)" : "inherit"};padding-left:4px">${cb.hp != null ? `HP ${cb.hp}/${cb.maxHp || cb.hp}` : ""}</span>
          </div>
        </div>`);

        const quickWrap = head.querySelector(".quick-attacks");
        if (!isDefeated) {
          if (cb.kind === "monster" && cb.attacks && cb.attacks.length) {
            const d6Quick = el(`<button class="btn step" style="font-size:0.95rem;padding:4px 10px;background:var(--ok);color:#fff;border:none">🎲 Attack</button>`);
            d6Quick.onclick = (e) => {
              e.stopPropagation();
              const d6 = Dice.d(6);
              const idx = Math.min(cb.attacks.length - 1, Math.floor((d6 - 1) / (6 / cb.attacks.length)));
              const chosen = cb.attacks[idx] || cb.attacks[0];
              Roller.monsterAttack(cb.name, chosen, d6, cb.id);
            };
            quickWrap.appendChild(d6Quick);
          } else if (cb.kind === "hero" && cb.charId) {
            const h = Store.get(cb.charId);
            const hWeapons = resolveEquippedWeapons(h && h.inventory && h.inventory.items);
            if (hWeapons[0]) {
              const w0 = hWeapons[0];
              const hQuick = el(`<button class="btn step" style="font-size:0.95rem;padding:4px 10px">⚔️ ${esc(w0.name)}</button>`);
              hQuick.onclick = (e) => { e.stopPropagation(); Roller.heroWeaponAttack(cb.charId, w0, cb.id); };
              quickWrap.appendChild(hQuick);
            }
          } else if (cb.kind === "npc" && cb.weapons && cb.weapons[0]) {
            const nw0 = cb.weapons[0];
            const nQuick = el(`<button class="btn step" style="font-size:0.95rem;padding:4px 10px">⚔️ ${esc(nw0.name)}</button>`);
            nQuick.onclick = (e) => { e.stopPropagation(); Roller.npcAttack(cb.name, nw0, cb.id); };
            quickWrap.appendChild(nQuick);
          }

          const actedBadge = el(`<button class="skill-chip ${cb.acted ? "picked" : ""}" style="font-size:0.85rem;padding:3px 8px">${cb.acted ? "Acted ✓" : "Turn [ ]"}</button>`);
          actedBadge.onclick = (e) => {
            e.stopPropagation();
            this.guardGm(() => this.mutate(st => {
              const ref = st.combatants.find(c => c.id === cb.id);
              if (ref) ref.acted = !ref.acted;
            }));
          };
          quickWrap.appendChild(actedBadge);
        }

        const body = el(`<div style="padding:12px;border-top:1px dashed var(--border);display:${isCur ? "block" : "none"};background:var(--bg)"></div>`);
        
        head.onclick = (e) => {
          if (e.target.tagName === "BUTTON") return;
          body.style.display = body.style.display === "none" ? "block" : "none";
        };

        const topActions = head.querySelector(".row-top-actions");
        if (cb.kind === "hero" && cb.charId) {
          const open = el(`<button class="step" title="open sheet">↗</button>`);
          open.onclick = (e) => { e.stopPropagation(); Sheet.open(cb.charId); };
          topActions.appendChild(open);
        }
        const rm = el(`<button class="step rm">✕</button>`);
        rm.onclick = (e) => { e.stopPropagation(); this.mutate((st) => { st.combatants = st.combatants.filter((c) => c.id !== cb.id); }); };
        topActions.appendChild(rm);

        // Vitals
        if (cb.hp != null) {
          const vitRow = el(`<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap"></div>`);
          const hpMin = el(`<button class="step" style="width:34px;height:34px;font-size:1.5rem">−</button>`);
          const hpPl = el(`<button class="step" style="width:34px;height:34px;font-size:1.5rem">+</button>`);
          hpMin.onclick = () => {
            this.mutate((st) => {
              const ref = st.combatants.find(c => c.id === cb.id);
              if (ref && ref.hp != null) {
                ref.hp = Math.max(0, ref.hp - 1);
                if (ref.hp === 0) ref.defeated = true;
                if (ref.kind === "hero" && ref.charId) Store.update(ref.charId, ch => { ch.state.hp = ref.hp; });
              }
            });
          };
          hpPl.onclick = () => {
            this.mutate((st) => {
              const ref = st.combatants.find(c => c.id === cb.id);
              if (ref && ref.hp != null) {
                ref.hp = Math.min(ref.maxHp || 999, (ref.hp || 0) + 1);
                if (ref.hp > 0) ref.defeated = false;
                if (ref.kind === "hero" && ref.charId) Store.update(ref.charId, ch => { ch.state.hp = ref.hp; });
              }
            });
          };
          vitRow.append(el(`<span class="stat-line" style="margin:0"><b>HP:</b></span>`), hpMin, el(`<span style="font-size:1.3rem;font-weight:bold;min-width:48px;text-align:center">${cb.hp} / ${cb.maxHp || cb.hp}</span>`), hpPl);
          if (cb.armor != null && cb.armor > 0) vitRow.append(el(`<span class="tag" style="margin-left:6px">Armor ${cb.armor}</span>`));
          body.appendChild(vitRow);
        }

        // Attacks
        if (cb.kind === "monster" && cb.attacks && cb.attacks.length) {
          const atkDiv = el(`<div style="display:flex;flex-direction:column;gap:6px"></div>`);
          atkDiv.appendChild(el(`<p class="stat-line" style="margin:0 0 6px 0"><b>Monster Attacks (Auto-hit):</b></p>`));
          
          const d6BannerBtn = el(`<button class="btn block" style="background:var(--ok);color:#fff;font-size:1.15rem;padding:10px;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,0.2)">🎲 Roll D6 Monster Attack Table</button>`);
          d6BannerBtn.onclick = () => {
            const d6 = Dice.d(6);
            const idx = Math.min(cb.attacks.length - 1, Math.floor((d6 - 1) / (6 / cb.attacks.length)));
            const chosen = cb.attacks[idx] || cb.attacks[0];
            Roller.monsterAttack(cb.name, chosen, d6, cb.id);
          };
          atkDiv.appendChild(d6BannerBtn);

          const grid = el(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px"></div>`);
          cb.attacks.forEach((atk, i) => {
            const rangeStr = (cb.attacks.length === 6) ? `${i+1}` : (cb.attacks.length === 3 ? `${i*2+1}-${i*2+2}` : `${i+1}`);
            const b = el(`<button class="btn secondary block" style="text-align:left;font-size:1.1rem;padding:8px;background:var(--card-bg);color:var(--text);border:1px solid var(--border)"><b>[${rangeStr}]</b> ${esc(atk.name)}${atk.damage ? ` <br><small style="color:var(--muted)">(${atk.damage})</small>` : ""}</button>`);
            b.onclick = () => Roller.monsterAttack(cb.name, atk, null, cb.id);
            grid.appendChild(b);
          });
          atkDiv.appendChild(grid); body.appendChild(atkDiv);
        } else if (cb.kind === "hero" && cb.charId) {
          const h = Store.get(cb.charId);
          if (h) {
            const hDiv = el(`<div style="display:flex;flex-direction:column;gap:8px"></div>`);
            const hWeapons = resolveEquippedWeapons(h.inventory && h.inventory.items);
            if (hWeapons.length) {
              hDiv.appendChild(el(`<p class="stat-line" style="margin:0"><b>Equipped Weapons:</b></p>`));
              const grid = el(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px"></div>`);
              hWeapons.forEach(w => {
                const b = el(`<button class="btn secondary block" style="text-align:left;font-size:1.15rem;padding:8px">${esc(w.name)} <br><small>${esc(w.skill)} (${w.damage})</small></button>`);
                b.onclick = () => Roller.heroWeaponAttack(cb.charId, w, cb.id);
                grid.appendChild(b);
              });
              hDiv.appendChild(grid);
            }
            const allSpells = [...((h.spells && h.spells.tricks) || []), ...((h.spells && h.spells.known) || [])];
            if (allSpells.length) {
              hDiv.appendChild(el(`<p class="stat-line" style="margin:4px 0 0 0"><b>Known Spells & Tricks:</b></p>`));
              const sGrid = el(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px"></div>`);
              allSpells.forEach(sp => {
                const isT = (h.spells.tricks || []).includes(sp);
                const b = el(`<button class="btn ghost block" style="text-align:left;font-size:1.1rem;padding:6px;border:1px solid var(--border)">★ ${esc(sp.name)} <br><small style="color:var(--muted)">${isT ? "Trick (1 WP)" : `Rank ${sp.rank||1} Spell`}</small></button>`);
                b.onclick = () => Roller.cast(cb.charId, sp, isT);
                sGrid.appendChild(b);
              });
              hDiv.appendChild(sGrid);
            }
            if (hDiv.children.length) body.appendChild(hDiv);
          }
        } else if (cb.kind === "npc") {
          const npcDiv = el(`<div style="display:flex;flex-direction:column;gap:6px"></div>`);
          if (cb.desc) npcDiv.appendChild(el(`<p class="stat-line" style="margin:0 0 6px 0;font-size:1.15rem">${esc(cb.desc)}</p>`));
          if (cb.weapons && cb.weapons.length) {
            const grid = el(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px"></div>`);
            cb.weapons.forEach(w => {
              const b = el(`<button class="btn secondary block" style="text-align:left;font-size:1.15rem;padding:8px">${esc(w.name)} <br><small>Skill ${w.skill}${w.damage ? ` (${w.damage}${w.bonus ? "+"+w.bonus : ""})` : ""}</small></button>`);
              b.onclick = () => Roller.npcAttack(cb.name, w, cb.id);
              grid.appendChild(b);
            });
            npcDiv.appendChild(grid);
          } else {
            npcDiv.appendChild(el(`<p class="stat-line" style="margin:0">💡 Ordinary NPCs roll standard combat skills against PCs. True Monsters auto-hit.</p>`));
          }
          if (cb.spells && cb.spells.length) {
            npcDiv.appendChild(el(`<p class="stat-line" style="margin:4px 0 0 0"><b>Known Spells:</b></p>`));
            const sGrid = el(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px"></div>`);
            cb.spells.forEach(sp => {
              const b = el(`<button class="btn ghost block" style="text-align:left;font-size:1.1rem;padding:6px;border:1px solid var(--accent)">🪄 ${esc(sp.name)} <br><small style="color:var(--muted)">Rank ${sp.rank||1} Spell</small></button>`);
              b.onclick = () => Roller.npcCast(cb.name, sp, cb.id);
              sGrid.appendChild(b);
            });
            npcDiv.appendChild(sGrid);
          }
          if (typeof DB !== "undefined" && DB.solo && DB.solo.npcAttacks) {
            const natBtn = el(`<button class="btn ghost block" style="margin-top:4px;border:1px dashed var(--accent)">🎲 Roll NPC Attack Table (AI Action)</button>`);
            natBtn.onclick = () => Roller.rollNpcAttackTable(cb.name, cb.id);
            npcDiv.appendChild(natBtn);
          }
          body.appendChild(npcDiv);
        }

        card.append(head, body);
        list.appendChild(card);
      });
      root.appendChild(list);
      return root;
    }
  };

  /* =================================================================
   * Solo Assistant (Phase 5B) — Oracle, Inspiration, NPCs
   * ================================================================= */
  const SoloMode = {
    view() {
      const solo = typeof DRAGONBANE_SOLO !== "undefined" ? DRAGONBANE_SOLO : null;
      const root = el(`<div></div>`);
      root.appendChild(el(sectionTitle("Solo Assistant")));
      if (!solo) {
        root.appendChild(el(`<div class="panel"><p class="stat-line">Solo rules library not loaded.</p></div>`));
        return root;
      }

      // Play mode switch banner
      const sm = Settings.soloMode();
      const banner = el(`
        <div class="panel" style="background:var(--card);border:1px solid var(--accent);display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <b>🧭 Solo Campaign Mode: <span style="color:${sm ? "var(--ok)" : "var(--muted)"}">${sm ? "Active" : "Standard"}</span></b><br>
            <span class="stat-line">When active, unlocks solo heroic abilities (Army of One, Sole Survivor) in character creation.</span>
          </div>
        </div>`);
      const bBtn = el(`<button class="btn ${sm ? "secondary" : ""}">${sm ? "Disable Solo Mode" : "Enable Solo Mode"}</button>`);
      bBtn.onclick = () => { Settings.set("soloMode", !sm); Router.go("solo"); };
      banner.appendChild(bBtn);
      root.appendChild(banner);

      // 1. Fortune Chart Oracle
      const f = solo.fortune;
      const fPanel = el(`
        <div class="panel">
          <h3>🔮 Fortune Chart (Oracle)</h3>
          <p class="stat-line">Ask a question, set likelihood, and leave the answer to fate.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
            <div style="flex:1;min-width:140px">
              <label class="stat-line">Likelihood</label><br>
              <select id="solo-f-like" class="input" style="width:100%;margin-top:4px">
                ${f.likelihoods.map(l => `<option value="${l.key}">${l.label} (${l.roll})</option>`).join("")}
              </select>
            </div>
            <div style="flex:1;min-width:140px">
              <label class="stat-line">Question / Column</label><br>
              <select id="solo-f-col" class="input" style="width:100%;margin-top:4px">
                ${f.columns.map(c => `<option value="${c.toLowerCase()}">${c}</option>`).join("")}
              </select>
            </div>
          </div>
          <button class="btn block" id="solo-f-roll">Roll Oracle</button>
          <div id="solo-f-out" style="margin-top:12px"></div>
        </div>`);

      fPanel.querySelector("#solo-f-roll").onclick = () => {
        const likeKey = fPanel.querySelector("#solo-f-like").value;
        const colKey = fPanel.querySelector("#solo-f-col").value;
        const colMap = { "yes/no": "yesNo", "number": "number", "scale": "scale", "power": "power", "quality": "quality", "reaction": "reaction" };
        const prop = colMap[colKey] || "yesNo";

        let d1 = Dice.d(6), d2 = Dice.d(6);
        let used = d1;
        let rollText = `${d1}`;
        if (likeKey === "unlikely") { used = Math.min(d1, d2); rollText = `2D6 lowest (${d1}, ${d2}) → <b>${used}</b>`; }
        else if (likeKey === "likely") { used = Math.max(d1, d2); rollText = `2D6 highest (${d1}, ${d2}) → <b>${used}</b>`; }

        const row = f.chart.find(r => {
          if (r.d6 === "1" && used === 1) return true;
          if (r.d6 === "6" && used === 6) return true;
          if (r.d6 === "2-3" && (used === 2 || used === 3)) return true;
          if (r.d6 === "4-5" && (used === 4 || used === 5)) return true;
          return false;
        }) || f.chart[0];

        const ans = row[prop] || "—";
        const twist = used === 1 || used === 6;

        fPanel.querySelector("#solo-f-out").innerHTML = `
          <div style="padding:10px;background:var(--bg);border-radius:6px;border-left:4px solid ${twist ? "var(--accent)" : "var(--ok)"}">
            <p class="stat-line" style="margin:0 0 4px 0">Rolled ${rollText}</p>
            <p style="font-size:1.4rem;font-weight:bold;margin:0;color:${twist ? "var(--accent)" : "var(--ok)"}">${esc(ans)}</p>
            ${twist ? `<p class="stat-line" style="margin:4px 0 0 0;color:var(--accent)">★ Extreme result / twist!</p>` : ""}
          </div>`;
      };
      root.appendChild(fPanel);

      // 2. Inspiration Table
      const insp = solo.inspiration || [];
      const iPanel = el(`
        <div class="panel">
          <h3>💡 Inspiration Table</h3>
          <p class="stat-line">Generate open-ended adventure prompts (D20×3).</p>
          <div style="display:flex;gap:6px;margin:10px 0;flex-wrap:wrap">
            <button class="btn block" id="solo-i-all" style="flex:1 1 100%">🎲 Roll Phrase (3D20)</button>
            <button class="btn ghost" id="solo-i-act" style="flex:1">Action</button>
            <button class="btn ghost" id="solo-i-att" style="flex:1">Attribute</button>
            <button class="btn ghost" id="solo-i-thg" style="flex:1">Thing</button>
          </div>
          <div id="solo-i-out"></div>
        </div>`);

      const doInsp = (mode) => {
        let r1 = Dice.d(20), r2 = Dice.d(20), r3 = Dice.d(20);
        const row1 = insp.find(x => x.d20 === r1) || insp[0];
        const row2 = insp.find(x => x.d20 === r2) || insp[0];
        const row3 = insp.find(x => x.d20 === r3) || insp[0];

        let res = "";
        if (mode === "all") res = `<b>${row1.action}</b> · <b>${row2.attribute}</b> · <b>${row3.thing}</b> <small style="font-weight:normal;color:var(--muted)">(${r1}, ${r2}, ${r3})</small>`;
        else if (mode === "act") res = `Action (${r1}): <b>${row1.action}</b>`;
        else if (mode === "att") res = `Attribute (${r2}): <b>${row2.attribute}</b>`;
        else if (mode === "thg") res = `Thing (${r3}): <b>${row3.thing}</b>`;

        iPanel.querySelector("#solo-i-out").innerHTML = `
          <div style="padding:10px;background:var(--bg);border-radius:6px;font-size:1.3rem;text-align:center;margin-top:8px">
            ${res}
          </div>`;
      };
      iPanel.querySelector("#solo-i-all").onclick = () => doInsp("all");
      iPanel.querySelector("#solo-i-act").onclick = () => doInsp("act");
      iPanel.querySelector("#solo-i-att").onclick = () => doInsp("att");
      iPanel.querySelector("#solo-i-thg").onclick = () => doInsp("thg");
      root.appendChild(iPanel);

      // 3. Narrative Twists
      const tw = solo.dragonDemonEffects || [];
      const tPanel = el(`
        <div class="panel">
          <h3>🐉 Narrative Twists (Out of Combat)</h3>
          <p class="stat-line">Roll 1D6 for non-combat twists when rolling a Dragon or Demon.</p>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn" style="flex:1;background:var(--ok);color:#fff" id="solo-t-drag">🐉 Dragon Twist</button>
            <button class="btn" style="flex:1;background:var(--bad);color:#fff" id="solo-t-dem">👹 Demon Twist</button>
          </div>
          <div id="solo-t-out" style="margin-top:12px"></div>
        </div>`);
      const doTwist = (isDrag) => {
        const r = Dice.d(6);
        const row = tw.find(x => x.d6 === r) || tw[0];
        const txt = isDrag ? row.dragon : row.demon;
        tPanel.querySelector("#solo-t-out").innerHTML = `
          <div style="padding:10px;background:var(--bg);border-radius:6px;border-left:4px solid ${isDrag ? "var(--ok)" : "var(--bad)"}">
            <p class="stat-line" style="margin:0 0 4px 0">Rolled ${r}</p>
            <p style="font-size:1.2rem;margin:0;color:${isDrag ? "var(--ok)" : "var(--bad)"}">${esc(txt)}</p>
          </div>`;
      };
      tPanel.querySelector("#solo-t-drag").onclick = () => doTwist(true);
      tPanel.querySelector("#solo-t-dem").onclick = () => doTwist(false);
      root.appendChild(tPanel);

      // 4. Solo NPC Generator & Attack Roller
      const npcs = solo.npcTemplates || [];
      const nat = solo.npcAttackTable || { roles: [], rows: [] };
      const nPanel = el(`
        <div class="panel">
          <h3>⚔ Solo NPC &amp; Foe Generator</h3>
          <p class="stat-line">Quickly instantiate simple foes or roll their AI attacks.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
            <div style="flex:1;min-width:140px">
              <label class="stat-line">Template</label><br>
              <select id="solo-n-tmpl" class="input" style="width:100%;margin-top:4px">
                ${npcs.map(n => `<option value="${n.name}">${n.name} (${n.hp} HP)</option>`).join("")}
              </select>
            </div>
            <div style="flex:2;min-width:180px">
              <label class="stat-line">Name / Custom Label</label><br>
              <div style="display:flex;gap:4px;margin-top:4px">
                <input type="text" id="solo-n-name" class="input" placeholder="e.g. Deepfall Goblin Scout" style="flex:1">
                <button type="button" class="btn step" id="solo-n-gen" title="Roll random D20 NPC name">🎲</button>
              </div>
            </div>
          </div>
          <button class="btn secondary block" id="solo-n-add">⚡ Add to Combat Tracker</button>
          
          <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
            <b>🎲 NPC Attack Table AI Roller</b>
            <p class="stat-line" style="margin:2px 0 8px 0">Select a combat role to roll their D6 action turn:</p>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <select id="solo-n-role" class="input" style="flex:1;min-width:160px">
                ${(nat.roles || []).map(r => `<option value="${r}">${r}</option>`).join("")}
              </select>
              <button class="btn" id="solo-n-atk">Roll NPC Attack (D6)</button>
            </div>
            <div id="solo-n-out" style="margin-top:10px"></div>
          </div>
        </div>`);

      if (nPanel.querySelector("#solo-n-gen")) {
        nPanel.querySelector("#solo-n-gen").onclick = () => {
          const rows = DB.names && DB.names.npc;
          if (!rows || !rows.length) return;
          const row = rows[Math.floor(Math.random() * rows.length)];
          const chosen = row[Math.floor(Math.random() * row.length)];
          nPanel.querySelector("#solo-n-name").value = chosen;
        };
      }

      nPanel.querySelector("#solo-n-add").onclick = () => {
        const tmplName = nPanel.querySelector("#solo-n-tmpl").value;
        const tmpl = npcs.find(x => x.name === tmplName) || npcs[0];
        const custom = nPanel.querySelector("#solo-n-name").value.trim();
        const foeName = custom || `Solo ${tmpl.name}`;
        
        Combat.mutate(st => st.combatants.push({
          id: uid(), name: foeName, kind: "npc", init: null, done: false,
          hp: tmpl.hp, maxHp: tmpl.hp, armor: tmpl.armor || 0, notes: `${tmpl.name} template (${tmpl.damage})`
        }));
        alert(`Added "${foeName}" to the Combat Tracker!`);
      };

      nPanel.querySelector("#solo-n-atk").onclick = () => {
        const role = nPanel.querySelector("#solo-n-role").value;
        const roleMap = { "Melee Attacker": "melee", "Ranged Attacker": "ranged", "Sneaky Attacker": "sneaky", "Magic Attacker": "magic" };
        const prop = roleMap[role] || "melee";
        const r = Dice.d(6);

        const row = nat.rows.find(x => {
          if (x.d6 === "4" && r === 4) return true;
          if (x.d6 === "5" && r === 5) return true;
          if (x.d6 === "6" && r === 6) return true;
          if (x.d6 === "1-3" && r <= 3) return true;
          return false;
        }) || nat.rows[0];

        const actionText = row[prop] || "—";
        nPanel.querySelector("#solo-n-out").innerHTML = `
          <div style="padding:10px;background:var(--bg);border-radius:6px;border-left:4px solid var(--accent)">
            <p class="stat-line" style="margin:0 0 4px 0">${esc(role)} · Rolled ${r}</p>
            <p style="font-size:1.15rem;margin:0;font-weight:bold">${esc(actionText)}</p>
          </div>`;
      };
      root.appendChild(nPanel);

      const jPanel = el(`<div class="panel" style="margin-top:12px;border-left:4px solid var(--ok)">
        <h3>🌲 Wilderness Journeys &amp; Travel Reference</h3>
        <p class="stat-line"><b>⏱️ Shifts:</b> Morning, Day, Evening, Night (~6h each). Travel speed: 1 node/hex per shift.</p>
        <p><b>⛺ Camp &amp; Rest:</b> Roll Bushcraft. Success lets party rest (Shift rest = full HP/WP). Failure = Mishap Roll.</p>
        <p><b>🍄 Foraging &amp; Hunting:</b> Spend a shift making Bushcraft/Hunting checks for rations.</p>
        <details style="margin-top:8px"><summary style="color:var(--bad);font-weight:bold;cursor:pointer">🎲 View Journey Mishap Table (D6)</summary>
          <p class="stat-line" style="margin-top:6px">1: Sudden Downpour (cold condition)<br>2: Spoiled Rations<br>3: Wild Beast Attack<br>4: Lost Way<br>5: Broken Gear<br>6: Restless Spirits (fear condition)</p>
        </details>
      </div>`);
      root.appendChild(jPanel);

      return root;
    }
  };

  function renderPartyBanner() {
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
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3>🛡️ Party Roster (${esc(Sync.campaign.name)})</h3>
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
  const Screens = {
    solo() { return SoloMode.view(); },
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
        const cards = chars.map((c) => `
          <button class="card" data-id="${esc(c.id)}">
            <h3>${esc(c.identity?.name || "Unnamed")}</h3>
            <div class="meta">${esc(c.identity?.kin || "—")} · ${esc(c.identity?.profession || "—")}${c.identity?.age ? " · " + esc(c.identity.age) : ""}</div>
          </button>`).join("");
        body = `
          ${sectionTitle("Your heroes")}
          <div class="card-grid">${cards}</div>
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
        card.addEventListener("click", () => Sheet.open(card.dataset.id)));
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
          createRow.querySelector("#btn-create-camp").onclick = () => {
            const n = prompt("Enter a Campaign / Party Name:", "Misty Vale Adventurers");
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
          leaveBtn.onclick = () => { if (confirm("Disconnect from this party campaign?")) Sync.leaveCampaign(); };
          syncPanel.append(campInfo, leaveBtn);
        }
      }
      root.appendChild(syncPanel);

      root.querySelector("#btn-export").addEventListener("click", () => this.export());
      root.querySelector("#btn-import").addEventListener("click", () => root.querySelector("#file-import").click());
      root.querySelector("#file-import").addEventListener("change", (e) => this.importFile(e));
      root.querySelector("#btn-clear").addEventListener("click", () => {
        if (confirm("Clear all locally saved heroes and reset app?")) {
          Store.clear(); Router.go("home");
        }
      });
      return root;
    }
  };

  /* ---- Rule detail rendering ----------------------------------------- */
  function renderRuleDetail(key, container) {
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
  const Router = {
    go(route) {
      if (route !== "sheet") window.activeCharacterId = null;
      if (route === "solo" && !Settings.soloMode()) {
        this.go("home");
        return;
      }
      const soloNav = document.querySelector("#app-nav button[data-route='solo']");
      if (soloNav) {
        soloNav.style.display = Settings.soloMode() ? "" : "none";
      }
      const screen = $("#screen");
      screen.innerHTML = "";
      screen.appendChild((Screens[route] || Screens.home)());
      document.querySelectorAll("#app-nav button").forEach((b) =>
        b.classList.toggle("active", b.dataset.route === route));
      window.scrollTo(0, 0);
    },
    init() {
      document.querySelectorAll("#app-nav button").forEach((b) =>
        b.addEventListener("click", () => this.go(b.dataset.route)));
      this.go("home");
    }
  };

  /* =================================================================
   * Bootstrap
   * ================================================================= */
  function init() {
    if (typeof Sync !== "undefined") Sync.init();

    const pill = $("#sync-status");
    if (pill) {
      pill.style.cursor = "pointer";
      pill.onclick = () => {
        Router.go("about");
        setTimeout(() => {
          const mp = document.querySelector("#btn-create-camp")?.closest(".panel") || document.querySelector("#rules-search")?.closest(".panel");
          if (mp) mp.scrollIntoView({ behavior: "smooth" });
        }, 100);
      };
    }

    Theme.init();
    Router.init();

    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("service-worker.js").then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                const toast = el(`<div class="update-toast" role="alert" title="Click to reload with updated version">Update Available: Click to Reload 🔄</div>`);
                toast.onclick = () => window.location.reload();
                document.body.appendChild(toast);
              }
            });
          }
        });
      }).catch(() => {});
    }

    if (!window.DRAGONBANE) {
      $("#screen").innerHTML = `<div class="panel notice">Could not load the rules library (data.js). Check that all files are served together.</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
