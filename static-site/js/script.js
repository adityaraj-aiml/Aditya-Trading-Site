(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Theme toggle ---------- */
  var themeBtn = document.getElementById("themeToggle");
  function getStoredTheme() {
    try { return localStorage.getItem("techin-theme"); } catch (e) { return null; }
  }
  function storeTheme(v) {
    try { localStorage.setItem("techin-theme", v); } catch (e) {}
  }
  var stored = getStoredTheme();
  if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var current = root.getAttribute("data-theme");
      var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var isDark = current ? current === "dark" : systemDark;
      var next = isDark ? "light" : "dark";
      root.setAttribute("data-theme", next);
      storeTheme(next);
    });
  }

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var open = navLinks.getAttribute("data-open") === "true";
      navLinks.setAttribute("data-open", open ? "false" : "true");
      navToggle.setAttribute("aria-expanded", open ? "false" : "true");
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.setAttribute("data-open", "false");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------- Stat counters ---------- */
  var counters = document.querySelectorAll("[data-count]");
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }
    var start = 0;
    var duration = 900;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var value = Math.floor(start + (target - start) * progress);
      el.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            cio.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- Ticker (illustrative demo data) ---------- */
  var tickerTrack = document.getElementById("tickerTrack");
  if (tickerTrack) {
    var symbols = [
      { sym: "NIFTY 50", price: "24,812.35", change: "+0.64%", up: true },
      { sym: "BANKNIFTY", price: "51,204.10", change: "+0.41%", up: true },
      { sym: "RELIANCE", price: "2,945.60", change: "-0.22%", up: false },
      { sym: "TCS", price: "4,182.15", change: "+0.87%", up: true },
      { sym: "BTC/USDT", price: "68,420", change: "+1.35%", up: true },
      { sym: "XAU/USD", price: "2,614.80", change: "-0.18%", up: false },
      { sym: "HDFC BANK", price: "1,708.25", change: "+0.29%", up: true }
    ];
    function renderTicker() {
      var html = symbols
        .map(function (s) {
          return (
            '<span class="ticker-item"><span class="sym">' +
            s.sym +
            '</span><span class="tag-num">' +
            s.price +
            '</span><span class="' +
            (s.up ? "up" : "down") +
            '">' +
            s.change +
            "</span></span>"
          );
        })
        .join("");
      tickerTrack.innerHTML = html + html;
    }
    renderTicker();
  }

  /* ---------- Theme change broadcast (consumed by render.js / charts.js) ---------- */
  if (themeBtn) {
    var mo = new MutationObserver(function () {
      window.dispatchEvent(new Event("techin-theme-change"));
    });
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /* ---------- Contact form (mailto fallback, no backend) ---------- */
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("cfName").value.trim();
      var email = document.getElementById("cfEmail").value.trim();
      var message = document.getElementById("cfMessage").value.trim();
      var subject = encodeURIComponent("Enquiry from " + (name || "website visitor"));
      var body = encodeURIComponent(
        (message || "") + "\n\n— " + (name || "") + (email ? " (" + email + ")" : "")
      );
      window.location.href = "mailto:hello@techinbyraj.com?subject=" + subject + "&body=" + body;
    });
  }
})();
