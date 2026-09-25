(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- Theme toggle (standalone copy for admin.html) ---------- */
  var themeBtn = document.getElementById("themeToggle");
  (function () {
    var stored = null;
    try { stored = localStorage.getItem("techin-theme"); } catch (e) {}
    if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);
  })();
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var current = root.getAttribute("data-theme");
      var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var isDark = current ? current === "dark" : systemDark;
      var next = isDark ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("techin-theme", next); } catch (e) {}
    });
  }

  /* ---------- Toast ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  /* ---------- Auth ---------- */
  var loginScreen = document.getElementById("loginScreen");
  var adminApp = document.getElementById("adminApp");
  var loginForm = document.getElementById("loginForm");
  var loginError = document.getElementById("loginError");
  var logoutBtn = document.getElementById("logoutBtn");

  function showApp() {
    loginScreen.hidden = true;
    adminApp.hidden = false;
    renderEverything();
  }
  function showLogin() {
    adminApp.hidden = true;
    loginScreen.hidden = false;
  }

  if (TechinStore.isLoggedIn()) showApp(); else showLogin();

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var pass = document.getElementById("loginPassword").value;
    if (TechinStore.login(pass)) {
      loginError.textContent = "";
      showApp();
    } else {
      loginError.textContent = "Incorrect password. Try again.";
    }
  });

  logoutBtn.addEventListener("click", function () {
    TechinStore.logout();
    showLogin();
  });

  /* ---------- Tabs ---------- */
  var tabBtns = document.querySelectorAll(".admin-tab-btn");
  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      tabBtns.forEach(function (b) { b.classList.remove("active"); });
      document.querySelectorAll(".admin-panel").forEach(function (p) { p.classList.remove("active"); });
      btn.classList.add("active");
      document.getElementById("panel-" + btn.getAttribute("data-tab")).classList.add("active");
    });
  });

  /* ---------- Helpers ---------- */
  var trashIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>';
  var editIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

  function esc(str) {
    var div = document.createElement("div");
    div.textContent = String(str == null ? "" : str);
    return div.innerHTML;
  }

  function save(data) {
    TechinStore.saveData(data);
  }

  /* ---------- Courses & Videos ---------- */
  function renderCoursesAdmin() {
    var data = TechinStore.loadData();
    var wrap = document.getElementById("coursesAdminList");
    wrap.innerHTML = "";

    data.courses.forEach(function (course) {
      var card = document.createElement("div");
      card.className = "admin-card";

      var videosHtml = (course.videos || [])
        .map(function (v, vi) {
          return (
            '<div class="admin-item-row" data-video-index="' + vi + '">' +
            '<div class="grow"><strong>' + esc(v.title) + '</strong><small>' + esc(v.duration || "") + '</small></div>' +
            '<button type="button" class="icon-btn danger" data-action="delete-video" title="Delete video">' + trashIcon + '</button>' +
            '</div>'
          );
        })
        .join("");

      card.innerHTML =
        '<div class="admin-card-head">' +
        '<h3><span class="badge">' + esc(course.badge) + '</span>' + esc(course.title) + '</h3>' +
        '<button type="button" class="icon-btn danger" data-action="delete-course" title="Delete course">' + trashIcon + '</button>' +
        '</div>' +
        '<p style="color:var(--ink-muted);font-size:13.5px">' + esc(course.description) + ' &middot; <span class="tag-num" style="font-size:12px">' + esc(course.pace) + '</span></p>' +
        '<div style="margin-top:10px">' + (videosHtml || '<p class="admin-item-empty">No videos yet — add the first one below.</p>') + '</div>' +
        '<form class="admin-inline-form" data-action="add-video">' +
        '<input type="text" placeholder="Video title" data-field="title" required />' +
        '<input type="text" class="dur" placeholder="12:34" data-field="duration" />' +
        '<button type="submit" class="btn btn-primary btn-sm">Add Video</button>' +
        '</form>';

      card.querySelector('[data-action="delete-course"]').addEventListener("click", function () {
        if (!confirm('Delete the course "' + course.title + '" and all its videos?')) return;
        var d = TechinStore.loadData();
        d.courses = d.courses.filter(function (c) { return c.id !== course.id; });
        save(d);
        toast("Course deleted");
        renderCoursesAdmin();
      });

      card.querySelectorAll('[data-action="delete-video"]').forEach(function (btn) {
        btn.addEventListener("click", function () {
          var row = btn.closest("[data-video-index]");
          var vi = parseInt(row.getAttribute("data-video-index"), 10);
          var d = TechinStore.loadData();
          var c = d.courses.find(function (c) { return c.id === course.id; });
          if (c) c.videos.splice(vi, 1);
          save(d);
          toast("Video removed");
          renderCoursesAdmin();
        });
      });

      card.querySelector('[data-action="add-video"]').addEventListener("submit", function (e) {
        e.preventDefault();
        var title = e.target.querySelector('[data-field="title"]').value.trim();
        var duration = e.target.querySelector('[data-field="duration"]').value.trim();
        if (!title) return;
        var d = TechinStore.loadData();
        var c = d.courses.find(function (c) { return c.id === course.id; });
        if (c) {
          if (!c.videos) c.videos = [];
          c.videos.push({ title: title, duration: duration });
        }
        save(d);
        toast("Video added");
        renderCoursesAdmin();
      });

      wrap.appendChild(card);
    });
  }

  document.getElementById("addCourseForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var title = document.getElementById("ncTitle").value.trim();
    var badge = document.getElementById("ncBadge").value.trim();
    var pace = document.getElementById("ncPace").value.trim();
    var desc = document.getElementById("ncDesc").value.trim();
    if (!title || !badge || !pace || !desc) return;
    var d = TechinStore.loadData();
    d.courses.push({
      id: TechinStore.makeId("course"),
      title: title,
      badge: badge,
      pace: pace,
      description: desc,
      videos: []
    });
    save(d);
    toast("Course added");
    e.target.reset();
    renderCoursesAdmin();
  });

  /* ---------- Indicators ---------- */
  function renderIndicatorsAdmin() {
    var data = TechinStore.loadData();
    var wrap = document.getElementById("indicatorsAdminList");
    wrap.innerHTML = "";

    data.indicators.forEach(function (ind) {
      var card = document.createElement("div");
      card.className = "admin-card";
      card.innerHTML =
        '<div class="admin-card-head">' +
        '<h3>' + esc(ind.title) + '</h3>' +
        '<button type="button" class="icon-btn danger" data-action="delete-indicator" title="Delete indicator">' + trashIcon + '</button>' +
        '</div>' +
        '<p style="color:var(--ink-muted);font-size:13.5px">' + esc(ind.description) + '</p>' +
        '<p class="admin-help" style="margin-top:8px">Tags: ' + esc((ind.tags || []).join(", ") || "—") + ' &middot; Platform: ' + esc(ind.platform || "TradingView") + '</p>';

      card.querySelector('[data-action="delete-indicator"]').addEventListener("click", function () {
        if (!confirm('Delete the indicator "' + ind.title + '"?')) return;
        var d = TechinStore.loadData();
        d.indicators = d.indicators.filter(function (i) { return i.id !== ind.id; });
        save(d);
        toast("Indicator deleted");
        renderIndicatorsAdmin();
      });

      wrap.appendChild(card);
    });
  }

  document.getElementById("addIndicatorForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var title = document.getElementById("niTitle").value.trim();
    var desc = document.getElementById("niDesc").value.trim();
    var tagsRaw = document.getElementById("niTags").value.trim();
    var platform = document.getElementById("niPlatform").value.trim() || "TradingView";
    if (!title || !desc) return;
    var tags = tagsRaw ? tagsRaw.split(",").map(function (t) { return t.trim(); }).filter(Boolean) : [];
    var d = TechinStore.loadData();
    d.indicators.push({
      id: TechinStore.makeId("indicator"),
      title: title,
      description: desc,
      tags: tags,
      platform: platform
    });
    save(d);
    toast("Indicator added");
    e.target.reset();
    document.getElementById("niPlatform").value = "TradingView";
    renderIndicatorsAdmin();
  });

  /* ---------- Live chart ---------- */
  function renderChartAdmin() {
    var data = TechinStore.loadData();
    document.getElementById("tvSymbolInput").value = data.tvSymbol || "NSE:NIFTY";
  }
  document.getElementById("chartForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var symbol = document.getElementById("tvSymbolInput").value.trim();
    if (!symbol) return;
    var d = TechinStore.loadData();
    d.tvSymbol = symbol;
    save(d);
    toast("Chart symbol saved");
  });

  /* ---------- Backup & security ---------- */
  document.getElementById("exportBtn").addEventListener("click", function () {
    var blob = new Blob([TechinStore.exportJSON()], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "techin-by-raj-backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Backup downloaded");
  });

  document.getElementById("importFile").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        TechinStore.importJSON(reader.result);
        toast("Backup imported");
        renderEverything();
      } catch (err) {
        alert("Could not import this file: " + err.message);
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  document.getElementById("passwordForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var val = document.getElementById("newPassword").value;
    if (val.length < 6) return;
    TechinStore.setAdminPassword(val);
    e.target.reset();
    toast("Password updated");
  });

  document.getElementById("resetBtn").addEventListener("click", function () {
    if (!confirm("This deletes all courses, videos, and indicators in this browser and restores the defaults. Continue?")) return;
    TechinStore.resetData();
    toast("Reset to defaults");
    renderEverything();
  });

  /* ---------- Orchestration ---------- */
  function renderEverything() {
    renderCoursesAdmin();
    renderIndicatorsAdmin();
    renderChartAdmin();
  }
})();
