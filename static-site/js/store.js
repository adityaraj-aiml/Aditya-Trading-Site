/* Techin By Raj — shared localStorage data layer.
   Used by both index.html (read-only render) and admin.html (read + write).
   IMPORTANT: localStorage is per-browser, per-origin. Serve this project through
   a local server (e.g. VS Code "Live Server") rather than double-clicking the
   HTML files, so index.html and admin.html reliably share the same storage. */

var TechinStore = (function () {
  var DATA_KEY = "techin-site-data";
  var PASS_KEY = "techin-admin-pass";
  var SESSION_KEY = "techin-admin-session";
  var DEFAULT_ADMIN_PASSWORD = "raj@techin2026";

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function loadData() {
    var raw = safeGet(DATA_KEY);
    if (!raw) {
      var seeded = clone(TECHIN_DEFAULT_DATA);
      safeSet(DATA_KEY, JSON.stringify(seeded));
      return seeded;
    }
    try {
      var parsed = JSON.parse(raw);
      if (!parsed.courses) parsed.courses = clone(TECHIN_DEFAULT_DATA.courses);
      if (!parsed.indicators) parsed.indicators = clone(TECHIN_DEFAULT_DATA.indicators);
      if (!parsed.tvSymbol) parsed.tvSymbol = TECHIN_DEFAULT_DATA.tvSymbol;
      return parsed;
    } catch (e) {
      return clone(TECHIN_DEFAULT_DATA);
    }
  }

  function saveData(data) {
    var ok = safeSet(DATA_KEY, JSON.stringify(data));
    if (ok && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("techin-data-change"));
    }
    return ok;
  }

  function resetData() {
    safeRemove(DATA_KEY);
    return loadData();
  }

  function exportJSON() {
    return JSON.stringify(loadData(), null, 2);
  }

  function importJSON(jsonString) {
    var parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid data file");
    if (!Array.isArray(parsed.courses) || !Array.isArray(parsed.indicators)) {
      throw new Error("File is missing courses or indicators");
    }
    saveData(parsed);
    return parsed;
  }

  function makeId(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 9);
  }

  function getAdminPassword() {
    return safeGet(PASS_KEY) || DEFAULT_ADMIN_PASSWORD;
  }
  function setAdminPassword(newPassword) {
    return safeSet(PASS_KEY, newPassword);
  }
  function isLoggedIn() {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch (e) { return false; }
  }
  function login(password) {
    if (password === getAdminPassword()) {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) {}
      return true;
    }
    return false;
  }
  function logout() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  return {
    loadData: loadData,
    saveData: saveData,
    resetData: resetData,
    exportJSON: exportJSON,
    importJSON: importJSON,
    makeId: makeId,
    getAdminPassword: getAdminPassword,
    setAdminPassword: setAdminPassword,
    isLoggedIn: isLoggedIn,
    login: login,
    logout: logout,
    DATA_KEY: DATA_KEY
  };
})();
