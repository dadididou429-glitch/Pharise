/**
 * Pharis Command API — OpenClaw control layer (Phase 1)
 * -------------------------------------------------------
 * Exposes window.PharisCommand(command, params) so OpenClaw
 * (via browser tool) can fully drive the Pharis web app.
 *
 * Load this script AFTER the main app scripts, before </body>.
 * Example:
 *   <script src="./pharis-command-api.js"></script>
 *
 * Version: 1.0.0
 */
(function (global) {
  "use strict";

  const API_VERSION = "1.0.0";
  const LOG_PREFIX = "[PharisAPI]";

  // ─── Internal state bridge ───────────────────────────────────────────────
  // The main React app can register handlers via:
  //   window.__pharisRegisterHandler("findOpen", fn)
  // or push state via:
  //   window.__pharisSetState({ pharmacies, userLocation, ... })
  const handlers = Object.create(null);
  let appState = {
    ready: false,
    language: "ar",
    userLocation: null,
    pharmacies: [],
    filters: {},
    selectedPharmacyId: null,
    lastError: null,
  };

  function log() {
    if (typeof console !== "undefined" && console.log) {
      console.log.apply(console, [LOG_PREFIX].concat([].slice.call(arguments)));
    }
  }

  function ok(data) {
    return { ok: true, data: data == null ? null : data, ts: Date.now() };
  }

  function fail(message, code) {
    return {
      ok: false,
      error: String(message || "unknown_error"),
      code: code || "ERROR",
      ts: Date.now(),
    };
  }

  // ─── Public registration (called from main app if desired) ───────────────
  global.__pharisRegisterHandler = function (name, fn) {
    if (typeof name === "string" && typeof fn === "function") {
      handlers[name] = fn;
      log("handler registered:", name);
    }
  };

  global.__pharisSetState = function (partial) {
    if (partial && typeof partial === "object") {
      Object.assign(appState, partial);
      appState.ready = true;
    }
  };

  global.__pharisGetState = function () {
    return Object.assign({}, appState);
  };

  // ─── DOM helpers (fallback when no React handler is registered) ──────────
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function clickByText(texts) {
    const list = Array.isArray(texts) ? texts : [texts];
    const nodes = qsa("button, a, [role='button'], .btn, [onclick]");
    for (let i = 0; i < nodes.length; i++) {
      const t = (nodes[i].innerText || nodes[i].textContent || "").trim();
      for (let j = 0; j < list.length; j++) {
        if (t.indexOf(list[j]) !== -1) {
          nodes[i].click();
          return true;
        }
      }
    }
    return false;
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  // ─── Command implementations ─────────────────────────────────────────────
  async function cmdPing() {
    return ok({
      version: API_VERSION,
      ready: !!appState.ready || !!document.getElementById("root"),
      url: location.href,
      title: document.title,
    });
  }

  async function cmdGetState() {
    // Prefer live state from app if registered
    if (typeof handlers.getState === "function") {
      try {
        const s = await handlers.getState();
        return ok(s);
      } catch (e) {
        return fail(e.message || e, "HANDLER_ERROR");
      }
    }
    return ok(Object.assign({}, appState, {
      domReady: !!document.getElementById("root"),
      bootVisible: !!document.getElementById("pharis-boot"),
    }));
  }

  async function cmdHideBoot() {
    if (typeof global.__pharisHideBoot === "function") {
      try {
        global.__pharisHideBoot();
      } catch (e) {}
    }
    const boot = document.getElementById("pharis-boot");
    if (boot && boot.parentNode) {
      boot.style.transition = "opacity 0.3s ease";
      boot.style.opacity = "0";
      setTimeout(function () {
        if (boot.parentNode) boot.parentNode.removeChild(boot);
      }, 350);
    }
    return ok({ hidden: true });
  }

  async function cmdRefresh() {
    if (typeof handlers.refresh === "function") {
      try {
        const r = await handlers.refresh();
        return ok(r || { refreshed: true });
      } catch (e) {
        return fail(e.message || e, "HANDLER_ERROR");
      }
    }
    // DOM fallback: look for update / refresh buttons
    const clicked =
      clickByText(["تحديث", "Refresh", "Actualiser", "🔄", "تحديث جديد"]) ||
      clickByText(["إعادة", "Reload"]);
    if (clicked) return ok({ refreshed: true, via: "dom" });
    // last resort
    location.reload();
    return ok({ refreshed: true, via: "reload" });
  }

  async function cmdSetLanguage(params) {
    const lang = (params && params.lang) || (params && params.language) || "ar";
    if (typeof handlers.setLanguage === "function") {
      try {
        await handlers.setLanguage(lang);
        appState.language = lang;
        return ok({ language: lang });
      } catch (e) {
        return fail(e.message || e, "HANDLER_ERROR");
      }
    }
    // DOM: try language switcher
    const map = {
      ar: ["العربية", "عربي", "AR"],
      fr: ["Français", "Francais", "FR"],
      en: ["English", "EN"],
    };
    const labels = map[lang] || [lang];
    if (clickByText(labels)) {
      appState.language = lang;
      return ok({ language: lang, via: "dom" });
    }
    return fail("Language control not available yet. Register handler setLanguage.", "NOT_WIRED");
  }

  async function cmdSetLocation(params) {
    const lat = params && params.lat;
    const lng = params && params.lng;
    if (lat == null || lng == null) {
      return fail("lat and lng are required", "BAD_PARAMS");
    }
    if (typeof handlers.setLocation === "function") {
      try {
        const r = await handlers.setLocation(Number(lat), Number(lng));
        appState.userLocation = { lat: Number(lat), lng: Number(lng) };
        return ok(r || appState.userLocation);
      } catch (e) {
        return fail(e.message || e, "HANDLER_ERROR");
      }
    }
    // Dispatch event for app to listen
    try {
      document.dispatchEvent(
        new CustomEvent("pharis:setLocation", {
          detail: { lat: Number(lat), lng: Number(lng) },
        })
      );
    } catch (e) {}
    appState.userLocation = { lat: Number(lat), lng: Number(lng) };
    return ok({
      location: appState.userLocation,
      note: "Event dispatched. Wire handler setLocation for full control.",
    });
  }

  async function cmdUseMyLocation() {
    if (typeof handlers.useMyLocation === "function") {
      try {
        const r = await handlers.useMyLocation();
        return ok(r);
      } catch (e) {
        return fail(e.message || e, "HANDLER_ERROR");
      }
    }
    const clicked = clickByText([
      "موقعي",
      "موقعي الحالي",
      "My location",
      "Ma position",
      "📍",
    ]);
    if (clicked) return ok({ via: "dom" });
    return fail("useMyLocation not wired", "NOT_WIRED");
  }

  async function cmdFindOpen(params) {
    const filters = (params && params.filters) || params || {};
    if (typeof handlers.findOpen === "function") {
      try {
        const list = await handlers.findOpen(filters);
        return ok({ count: Array.isArray(list) ? list.length : null, items: list });
      } catch (e) {
        return fail(e.message || e, "HANDLER_ERROR");
      }
    }
    // Try to trigger search / open filter via DOM
    clickByText(["مفتوحة", "Open", "Ouvertes", "صيدليات مفتوحة"]);
    await wait(400);
    // Return whatever state we have
    const state = typeof handlers.getState === "function" ? await handlers.getState() : appState;
    const items = (state && state.pharmacies) || appState.pharmacies || [];
    return ok({
      count: items.length,
      items: items.slice(0, 30),
      note: "DOM/state fallback. Register findOpen for precise results.",
    });
  }

  async function cmdSearch(params) {
    const q = (params && (params.query || params.q || params.text)) || "";
    if (!q) return fail("query is required", "BAD_PARAMS");
    if (typeof handlers.search === "function") {
      try {
        const list = await handlers.search(String(q));
        return ok({ query: q, count: Array.isArray(list) ? list.length : null, items: list });
      } catch (e) {
        return fail(e.message || e, "HANDLER_ERROR");
      }
    }
    // DOM: find search input
    const input =
      qs('input[type="search"]') ||
      qs('input[placeholder*="بحث"]') ||
      qs('input[placeholder*="Search"]') ||
      qs('input[placeholder*="Rech"]') ||
      qs("input");
    if (input) {
      input.focus();
      input.value = q;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      const form = input.closest("form");
      if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      return ok({ query: q, via: "dom" });
    }
    return fail("search input not found", "NOT_FOUND");
  }

  async function cmdOpenPharmacy(params) {
    const id = params && (params.id || params.pharmacyId);
    const name = params && params.name;
    if (!id && !name) return fail("id or name required", "BAD_PARAMS");
    if (typeof handlers.openPharmacy === "function") {
      try {
        const r = await handlers.openPharmacy({ id: id, name: name });
        appState.selectedPharmacyId = id || null;
        return ok(r || { opened: true, id: id, name: name });
      } catch (e) {
        return fail(e.message || e, "HANDLER_ERROR");
      }
    }
    if (name && clickByText([name])) {
      return ok({ opened: true, name: name, via: "dom" });
    }
    try {
      document.dispatchEvent(
        new CustomEvent("pharis:openPharmacy", { detail: { id: id, name: name } })
      );
    } catch (e) {}
    return ok({
      requested: true,
      id: id,
      name: name,
      note: "Event dispatched. Register openPharmacy handler for full control.",
    });
  }

  async function cmdSetFilter(params) {
    if (!params || typeof params !== "object") {
      return fail("filters object required", "BAD_PARAMS");
    }
    if (typeof handlers.setFilter === "function") {
      try {
        const r = await handlers.setFilter(params);
        Object.assign(appState.filters, params);
        return ok(r || appState.filters);
      } catch (e) {
        return fail(e.message || e, "HANDLER_ERROR");
      }
    }
    try {
      document.dispatchEvent(new CustomEvent("pharis:setFilter", { detail: params }));
    } catch (e) {}
    Object.assign(appState.filters, params);
    return ok({
      filters: appState.filters,
      note: "Event dispatched. Register setFilter for full control.",
    });
  }

  async function cmdScreenshotInfo() {
    // Helper for OpenClaw: describe visible UI text for the agent
    const root = document.getElementById("root") || document.body;
    const text = (root.innerText || "").replace(/\s+/g, " ").trim().slice(0, 4000);
    return ok({
      title: document.title,
      textPreview: text,
      bootVisible: !!document.getElementById("pharis-boot"),
    });
  }

  async function cmdEval(params) {
    // Restricted eval for advanced OpenClaw use — only simple expressions on PharisAPI surface
    const code = params && params.code;
    if (!code || typeof code !== "string") return fail("code string required", "BAD_PARAMS");
    if (code.length > 500) return fail("code too long", "BAD_PARAMS");
    // Block dangerous patterns
    if (/document\.cookie|localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest|import\s*\(|require\s*\(/i.test(code)) {
      return fail("blocked pattern in code", "FORBIDDEN");
    }
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("PharisCommand", "state", "return (" + code + ")");
      const result = fn(global.PharisCommand, appState);
      return ok({ result: result });
    } catch (e) {
      return fail(e.message || e, "EVAL_ERROR");
    }
  }

  // ─── Command router ──────────────────────────────────────────────────────
  const COMMANDS = {
    ping: cmdPing,
    getState: cmdGetState,
    hideBoot: cmdHideBoot,
    refresh: cmdRefresh,
    setLanguage: cmdSetLanguage,
    setLocation: cmdSetLocation,
    useMyLocation: cmdUseMyLocation,
    findOpen: cmdFindOpen,
    search: cmdSearch,
    openPharmacy: cmdOpenPharmacy,
    setFilter: cmdSetFilter,
    screenshotInfo: cmdScreenshotInfo,
    eval: cmdEval,
  };

  /**
   * Main entry: window.PharisCommand(command, params?)
   * Returns a Promise<{ ok, data?, error?, code?, ts }>
   */
  async function PharisCommand(command, params) {
    const name = String(command || "").trim();
    if (!name) return fail("command is required", "BAD_PARAMS");
    const fn = COMMANDS[name];
    if (!fn) {
      return fail(
        "Unknown command: " + name + ". Available: " + Object.keys(COMMANDS).join(", "),
        "UNKNOWN_COMMAND"
      );
    }
    try {
      log("→", name, params || {});
      const result = await fn(params || {});
      log("←", name, result && result.ok ? "ok" : "fail");
      return result;
    } catch (e) {
      log("×", name, e);
      return fail(e.message || String(e), "EXCEPTION");
    }
  }

  PharisCommand.version = API_VERSION;
  PharisCommand.commands = function () {
    return Object.keys(COMMANDS);
  };
  PharisCommand.help = function () {
    return {
      version: API_VERSION,
      commands: Object.keys(COMMANDS),
      usage: 'await PharisCommand("findOpen", { filters: { openOnly: true } })',
      register:
        'window.__pharisRegisterHandler("findOpen", async (filters) => { ... })',
    };
  };

  global.PharisCommand = PharisCommand;

  // Mark API ready
  try {
    document.documentElement.setAttribute("data-pharis-api", API_VERSION);
  } catch (e) {}

  log("ready v" + API_VERSION, "commands:", Object.keys(COMMANDS).join(", "));
})(typeof window !== "undefined" ? window : globalThis);
