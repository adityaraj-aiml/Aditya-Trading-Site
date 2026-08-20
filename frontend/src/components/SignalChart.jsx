import { useEffect, useRef, useState } from "react";

// Loads TradingView's tv.js once and renders a real candlestick chart.
let tvScriptPromise = null;
function loadTradingView() {
  if (window.TradingView) return Promise.resolve();
  if (!tvScriptPromise) {
    tvScriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://s3.tradingview.com/tv.js";
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }
  return tvScriptPromise;
}

export default function SignalChart({ symbol = "BINANCE:BTCUSDT" }) {
  const containerId = useRef(`tv_${Math.random().toString(36).slice(2)}`);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadTradingView()
      .then(() => {
        if (cancelled || !window.TradingView) { setFailed(true); return; }
        const el = document.getElementById(containerId.current);
        if (!el) return;
        el.innerHTML = "";
        /* eslint-disable no-new */
        new window.TradingView.widget({
          symbol,
          interval: "60",
          container_id: containerId.current,
          autosize: true,
          theme: "dark",
          style: "1", // candles
          timezone: "Etc/UTC",
          locale: "en",
          toolbar_bg: "#050505",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          hide_side_toolbar: true,
          allow_symbol_change: true,
          withdateranges: false,
          save_image: false,
          backgroundColor: "#0A0A0A",
          gridColor: "rgba(255,255,255,0.06)",
        });
      })
      .catch(() => setFailed(true));
    return () => { cancelled = true; };
  }, [symbol]);

  return (
    <div className="relative border border-white/10 rounded-xl bg-[#0A0A0A] overflow-hidden" data-testid="signal-chart">
      <div className="absolute -inset-8 bg-[#E2FF4A]/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#E2FF4A] animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">TECHIN · Live TradingView feed</span>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600">Candles · 1H</span>
      </div>
      <div className="relative h-[360px] w-full px-1 pb-1">
        {failed ? (
          <div className="w-full h-full grid place-items-center text-center px-6">
            <p className="text-sm text-zinc-500 font-mono">
              Live chart couldn't load here.<br />It renders fine on the deployed site.
            </p>
          </div>
        ) : (
          <div id={containerId.current} className="w-full h-full rounded-lg overflow-hidden" />
        )}
      </div>
    </div>
  );
}

