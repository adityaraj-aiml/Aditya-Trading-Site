import { useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, ReferenceDot,
} from "recharts";
import { motion } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";

// Deterministic-ish random walk generator for a believable price series
function makePoint(prev) {
  const drift = (Math.random() - 0.48) * 2.2;
  return Math.max(20, Math.min(180, prev + drift));
}

const SIZE = 48;

export default function SignalChart() {
  const [data, setData] = useState(() => {
    let p = 100;
    return Array.from({ length: SIZE }, (_, i) => {
      p = makePoint(p);
      return { i, price: +p.toFixed(2) };
    });
  });
  const [signal, setSignal] = useState(null); // {i, price, type}
  const idx = useRef(SIZE);

  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => {
        const last = prev[prev.length - 1].price;
        const next = { i: idx.current++, price: +makePoint(last).toFixed(2) };
        const arr = [...prev.slice(1), next];
        // occasionally fire a signal at the newest point
        if (Math.random() > 0.72) {
          const type = next.price > last ? "buy" : "sell";
          setSignal({ i: next.i, price: next.price, type });
        }
        return arr;
      });
    }, 900);
    return () => clearInterval(id);
  }, []);

  const last = data[data.length - 1]?.price ?? 0;
  const first = data[0]?.price ?? 0;
  const up = last >= first;
  const change = (((last - first) / first) * 100).toFixed(2);

  return (
    <div className="relative border border-white/10 rounded-xl bg-[#0A0A0A] overflow-hidden" data-testid="signal-chart">
      <div className="absolute -inset-8 bg-[#E2FF4A]/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative flex items-center justify-between px-6 pt-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#E2FF4A] animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">TECHIN · Live feed</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-extrabold text-xl">{last.toFixed(2)}</span>
          <span className={`font-mono text-xs ${up ? "text-[#34C759]" : "text-[#FF3B30]"}`}>
            {up ? "▲" : "▼"} {Math.abs(change)}%
          </span>
        </div>
      </div>

      <div className="relative h-[300px] px-1 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 12 }}>
            <defs>
              <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E2FF4A" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#E2FF4A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" hide />
            <YAxis domain={["dataMin - 8", "dataMax + 8"]} hide />
            <Area type="monotone" dataKey="price" stroke="none" fill="url(#fill)" isAnimationActive={false} />
            <Line type="monotone" dataKey="price" stroke="#E2FF4A" strokeWidth={2} dot={false} isAnimationActive={false} />
            {signal && (
              <ReferenceDot
                x={signal.i} y={signal.price} r={5}
                fill={signal.type === "buy" ? "#34C759" : "#FF3B30"}
                stroke="#050505" strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {signal && (
        <motion.div
          key={`${signal.i}-${signal.type}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`absolute bottom-4 left-6 flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-xs uppercase tracking-wider ${
            signal.type === "buy"
              ? "border-[#34C759]/40 text-[#34C759] bg-[#34C759]/10"
              : "border-[#FF3B30]/40 text-[#FF3B30] bg-[#FF3B30]/10"
          }`}
          data-testid="signal-badge"
        >
          {signal.type === "buy" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          {signal.type} signal @ {signal.price.toFixed(2)}
        </motion.div>
      )}
    </div>
  );
}
