/* Techin By Raj — default site content.
   This seeds localStorage the first time the site (or admin panel) loads.
   Edit through admin.html rather than here, once you're using the admin panel. */

var TECHIN_DEFAULT_DATA = {
  tvSymbol: "NSE:NIFTY",
  courses: [
    {
      id: "foundations",
      badge: "Beginner",
      title: "Price Action Foundations",
      description: "For traders starting from zero who want to read candles, structure, and support/resistance without indicator clutter.",
      pace: "6 weeks · self-paced",
      videos: [
        { title: "Reading Raw Candles", duration: "14:20" },
        { title: "Market Structure: HH/HL, LH/LL", duration: "18:05" },
        { title: "Mapping Support & Resistance", duration: "21:40" },
        { title: "Building Your Trade Journal", duration: "09:55" }
      ]
    },
    {
      id: "momentum",
      badge: "Intermediate",
      title: "Momentum & Indicator Mastery",
      description: "Combine price action with the Techin indicator suite for entries, exits, and trend confirmation.",
      pace: "8 weeks · cohort-based",
      videos: [
        { title: "RSI, MACD & Supertrend Deep-Dive", duration: "26:10" },
        { title: "Installing & Tuning Techin Indicators", duration: "12:45" },
        { title: "Entry / Exit Checklists", duration: "15:30" },
        { title: "Live Chart Review — Session 1", duration: "38:00" }
      ]
    },
    {
      id: "options",
      badge: "Advanced",
      title: "Options & Risk Management",
      description: "Position sizing, hedging, and options strategy built directly on top of the price-action system.",
      pace: "6 weeks · cohort-based",
      videos: [
        { title: "Risk:Reward & Position Sizing Calculators", duration: "19:15" },
        { title: "Options Basics for Directional Trades", duration: "24:50" },
        { title: "Drawdown Recovery Planning", duration: "11:05" }
      ]
    }
  ],
  indicators: [
    {
      id: "trend-compass",
      title: "Trend Compass",
      description: "Multi-timeframe trend bias with clean visual zones, so you trade with the dominant move, not against it.",
      tags: ["MTF alignment", "Non-repainting", "Alert-ready"],
      platform: "TradingView"
    },
    {
      id: "momentum-scanner",
      title: "Momentum Shift Scanner",
      description: "Flags early momentum shifts before price confirms on the higher timeframe, so you're rarely the last one in.",
      tags: ["Divergence detection", "Custom sensitivity", "Any asset class"],
      platform: "TradingView"
    },
    {
      id: "smart-sr",
      title: "Smart Support/Resistance",
      description: "Auto-plots dynamic S/R zones from volume and price clusters, so you stop hand-drawing lines every session.",
      tags: ["Auto-redraw", "Zone strength score", "Clean, no clutter"],
      platform: "TradingView"
    }
  ]
};
