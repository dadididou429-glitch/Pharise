/**
 * Pharis Bridge Snippet — paste inside your React app (index.html Babel block)
 * ---------------------------------------------------------------------------
 * Goal: connect React state/actions to window.PharisCommand handlers.
 *
 * How to use:
 * 1. Keep pharis-command-api.js loaded in the page.
 * 2. Inside your main React component (or after pharmacies/map state exist),
 *    call the registerPharisBridge(...) helper below with your real functions.
 *
 * Example (inside useEffect when map + data are ready):
 *
 *   useEffect(() => {
 *     if (typeof window.registerPharisBridge === "function") {
 *       window.registerPharisBridge({
 *         getState: () => ({
 *           language,
 *           userLocation,
 *           pharmacies: filteredPharmacies,
 *           filters,
 *           selectedPharmacyId: selected?.id || null,
 *         }),
 *         refresh: () => { loadPharmacies(); return { refreshed: true }; },
 *         setLanguage: (lang) => setLanguage(lang),
 *         setLocation: (lat, lng) => { setUserLocation({ lat, lng }); centerMap(lat, lng); },
 *         useMyLocation: () => requestGeo(),
 *         findOpen: (filters) => applyFilters({ ...filters, openOnly: true }),
 *         search: (q) => runSearch(q),
 *         openPharmacy: ({ id, name }) => openDetails(id || name),
 *         setFilter: (f) => setFilters((prev) => ({ ...prev, ...f })),
 *       });
 *     }
 *   }, [language, userLocation, filteredPharmacies, filters, selected]);
 *
 * Adjust names (setLanguage, loadPharmacies, ...) to match YOUR actual variables.
 */

(function (global) {
  "use strict";

  /**
   * Register all handlers at once.
   * @param {Object} api - map of command name → async/sync function
   */
  function registerPharisBridge(api) {
    if (!api || typeof api !== "object") return;
    if (typeof global.__pharisRegisterHandler !== "function") {
      console.warn("[PharisBridge] pharis-command-api.js not loaded yet");
      return;
    }
    Object.keys(api).forEach(function (key) {
      if (typeof api[key] === "function") {
        global.__pharisRegisterHandler(key, api[key]);
      }
    });
    if (typeof global.__pharisSetState === "function" && api.getState) {
      try {
        const s = api.getState();
        if (s && typeof s === "object") global.__pharisSetState(s);
      } catch (e) {}
    }
    console.log("[PharisBridge] handlers wired:", Object.keys(api).join(", "));
  }

  // Optional: listen for custom events from the API (works even before React wires handlers)
  document.addEventListener("pharis:setLocation", function (ev) {
    const d = ev && ev.detail;
    if (!d) return;
    if (typeof global.__pharisRegisterHandler === "function") {
      // no-op; handlers take priority when registered
    }
    console.log("[PharisBridge] event setLocation", d);
  });

  document.addEventListener("pharis:openPharmacy", function (ev) {
    console.log("[PharisBridge] event openPharmacy", ev && ev.detail);
  });

  document.addEventListener("pharis:setFilter", function (ev) {
    console.log("[PharisBridge] event setFilter", ev && ev.detail);
  });

  global.registerPharisBridge = registerPharisBridge;
})(typeof window !== "undefined" ? window : globalThis);
