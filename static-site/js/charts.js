/* Techin By Raj — illustrative candlestick sparkline renderer (indicator cards). */

function techinDrawCandles(canvasId, opts) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var candles = [];
  var count = opts.count || 24;

  function seedCandles() {
    candles = [];
    var price = opts.startPrice || 100;
    for (var i = 0; i < count; i++) {
      var vol = opts.volatility || 2.2;
      var open = price;
      var drift = (Math.random() - 0.46) * vol;
      var close = Math.max(1, open + drift);
      var high = Math.max(open, close) + Math.random() * (vol * 0.5);
      var low = Math.max(0.5, Math.min(open, close) - Math.random() * (vol * 0.5));
      candles.push({ open: open, close: close, high: high, low: low });
      price = close;
    }
  }
  seedCandles();

  function resize() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  }

  function getVars() {
    var styles = getComputedStyle(document.documentElement);
    return {
      up: styles.getPropertyValue("--accent").trim() || "#39E29D",
      down: styles.getPropertyValue("--danger").trim() || "#FF6B6B",
      grid: styles.getPropertyValue("--border").trim() || "#22302A",
      wick: styles.getPropertyValue("--ink-faint").trim() || "#5E6F67"
    };
  }

  function draw() {
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    var colors = getVars();

    var all = candles.reduce(function (acc, c) {
      return { min: Math.min(acc.min, c.low), max: Math.max(acc.max, c.high) };
    }, { min: Infinity, max: -Infinity });
    var pad = (all.max - all.min) * 0.12 || 1;
    var min = all.min - pad, max = all.max + pad;

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1 * dpr;
    ctx.globalAlpha = 0.6;
    for (var g = 1; g < 4; g++) {
      var y = (h / 4) * g;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    var slot = w / count;
    var bodyW = Math.max(2 * dpr, slot * 0.55);

    candles.forEach(function (c, i) {
      var x = i * slot + slot / 2;
      var yHigh = h - ((c.high - min) / (max - min)) * h;
      var yLow = h - ((c.low - min) / (max - min)) * h;
      var yOpen = h - ((c.open - min) / (max - min)) * h;
      var yClose = h - ((c.close - min) / (max - min)) * h;
      var up = c.close >= c.open;
      var color = up ? colors.up : colors.down;

      ctx.strokeStyle = colors.wick;
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      ctx.fillStyle = color;
      var top = Math.min(yOpen, yClose);
      var bodyH = Math.max(1.5 * dpr, Math.abs(yClose - yOpen));
      ctx.fillRect(x - bodyW / 2, top, bodyW, bodyH);
    });
  }

  resize();
  draw();
  window.addEventListener("resize", function () {
    resize();
    draw();
  });

  if (!reduceMotion) {
    var timer = setInterval(function () {
      if (!document.body.contains(canvas)) { clearInterval(timer); return; }
      candles.shift();
      var last = candles[candles.length - 1];
      var vol = opts.volatility || 2.2;
      var open = last.close;
      var drift = (Math.random() - 0.46) * vol;
      var close = Math.max(1, open + drift);
      var high = Math.max(open, close) + Math.random() * (vol * 0.5);
      var low = Math.max(0.5, Math.min(open, close) - Math.random() * (vol * 0.5));
      candles.push({ open: open, close: close, high: high, low: low });
      draw();
    }, 1600);
  }

  window.addEventListener("techin-theme-change", draw);
}
