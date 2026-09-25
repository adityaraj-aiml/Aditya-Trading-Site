/* Techin By Raj — renders courses, indicators, and the live TradingView chart
   from TechinStore (localStorage) into the public site. */

(function () {
  "use strict";

  var checkIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
  var tvIcon =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';

  function esc(str) {
    var div = document.createElement("div");
    div.textContent = String(str == null ? "" : str);
    return div.innerHTML;
  }

  /* ---------- Courses ---------- */
  function renderCourses(courses) {
    var grid = document.getElementById("coursesGrid");
    if (!grid) return;
    grid.innerHTML = courses
      .map(function (course) {
        var videos = (course.videos || [])
          .map(function (v) {
            return (
              '<li>' + checkIcon +
              '<span style="flex:1">' + esc(v.title) + '</span>' +
              '<span class="tag-num" style="color:var(--ink-faint);font-size:12px;flex-shrink:0;margin-left:8px">' +
              esc(v.duration || "") + "</span></li>"
            );
          })
          .join("");
        return (
          '<article class="course-card">' +
          '<span class="badge">' + esc(course.badge) + "</span>" +
          "<h3>" + esc(course.title) + "</h3>" +
          "<p>" + esc(course.description) + "</p>" +
          '<ul class="course-list">' + (videos || '<li style="color:var(--ink-faint)">No videos added yet</li>') + "</ul>" +
          '<div class="duration"><span>' + esc(course.pace || "") + '</span><a href="#pricing">View pricing →</a></div>' +
          "</article>"
        );
      })
      .join("");
  }

  /* ---------- Indicators ---------- */
  function renderIndicators(indicators) {
    var grid = document.getElementById("indicatorsGrid");
    if (!grid) return;
    grid.innerHTML = indicators
      .map(function (ind, i) {
        var tags = (ind.tags || [])
          .map(function (t) { return "<span>" + esc(t) + "</span>"; })
          .join("");
        var sparkId = "spark-" + i;
        return (
          '<article class="ind-card">' +
          '<div class="ind-spark"><canvas id="' + sparkId + '" style="width:100%;height:100%"></canvas></div>' +
          '<div class="ind-body">' +
          "<h3>" + esc(ind.title) + "</h3>" +
          "<p>" + esc(ind.description) + "</p>" +
          '<div class="ind-tags">' + tags + "</div>" +
          '<span class="ind-platform">' + tvIcon + "Compatible with " + esc(ind.platform || "TradingView") + "</span>" +
          "</div></article>"
        );
      })
      .join("");

    indicators.forEach(function (ind, i) {
      techinDrawCandles("spark-" + i, {
        count: 24,
        startPrice: 60 + i * 20,
        volatility: 2 + i * 0.3
      });
    });
  }

  /* ---------- Live TradingView chart ---------- */
  var tvScriptLoading = null;
  function ensureTVScript() {
    if (window.TradingView) return Promise.resolve();
    if (tvScriptLoading) return tvScriptLoading;
    tvScriptLoading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://s3.tradingview.com/tv.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return tvScriptLoading;
  }

  function currentTheme() {
    var attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark" || attr === "light") return attr;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function renderTVChart(symbol) {
    var container = document.getElementById("tvChart");
    var label = document.getElementById("tvSymbolLabel");
    if (label) label.textContent = symbol;
    if (!container) return;

    ensureTVScript()
      .then(function () {
        container.innerHTML = "";
        var innerId = "tv-inner-" + Date.now();
        var inner = document.createElement("div");
        inner.id = innerId;
        inner.style.height = "100%";
        container.appendChild(inner);

        var theme = currentTheme();
        new window.TradingView.widget({
          width: "100%",
          height: 320,
          symbol: symbol,
          interval: "60",
          timezone: "Asia/Kolkata",
          theme: theme,
          style: "1",
          locale: "en",
          toolbar_bg: theme === "dark" ? "#111815" : "#ffffff",
          enable_publishing: false,
          allow_symbol_change: true,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: innerId
        });
      })
      .catch(function () {
        container.innerHTML =
          '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--ink-faint);font-size:13px;text-align:center;padding:16px">Live chart could not load — check your internet connection.</div>';
      });
  }

  /* ---------- Orchestration ---------- */
  function renderAll() {
    var data = TechinStore.loadData();
    renderCourses(data.courses || []);
    renderIndicators(data.indicators || []);
    renderTVChart(data.tvSymbol || "NSE:NIFTY");
  }

  renderAll();
  window.addEventListener("techin-data-change", renderAll);
  window.addEventListener("storage", function (e) {
    if (e.key === TechinStore.DATA_KEY) renderAll();
  });
  window.addEventListener("techin-theme-change", function () {
    var data = TechinStore.loadData();
    renderTVChart(data.tvSymbol || "NSE:NIFTY");
  });
})();
