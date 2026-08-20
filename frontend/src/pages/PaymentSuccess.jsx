import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowUpRight, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const MAX_POLLS = 8;

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { refresh } = useAuth();
  const [state, setState] = useState("checking"); // checking | paid | timeout | error
  const polls = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      return;
    }
    let active = true;
    const poll = async () => {
      if (!active) return;
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          await refresh();
          if (active) setState("paid");
          return;
        }
        if (["expired", "failed"].includes(data.payment_status)) {
          if (active) setState("error");
          return;
        }
      } catch {
        if (active) setState("error");
        return;
      }
      polls.current += 1;
      if (polls.current >= MAX_POLLS) {
        if (active) setState("timeout");
        return;
      }
      setTimeout(poll, 2000);
    };
    poll();
    return () => { active = false; };
  }, [sessionId, refresh]);

  return (
    <main className="min-h-screen grid place-items-center px-6 pt-24 pb-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="max-w-md w-full text-center border border-white/10 bg-[#0A0A0A] rounded-xl p-10" data-testid="payment-success-page">
        {state === "checking" && (
          <>
            <Loader2 size={48} className="text-[#E2FF4A] mx-auto mb-6 animate-spin" />
            <h1 className="font-display font-extrabold text-2xl mb-2">Confirming payment…</h1>
            <p className="text-zinc-500 text-sm">Hang tight, this only takes a moment.</p>
          </>
        )}
        {state === "paid" && (
          <>
            <CheckCircle2 size={56} className="text-[#E2FF4A] mx-auto mb-6" />
            <h1 className="font-display font-black text-3xl tracking-tight mb-3">You're in.</h1>
            <p className="text-zinc-400 mb-8">Your purchase is unlocked. Head to your dashboard to access it right away.</p>
            <Link to="/dashboard" className="inline-flex items-center gap-2 bg-[#E2FF4A] text-black font-medium px-7 py-3.5 rounded-full hover:bg-[#C8E631] transition-colors" data-testid="go-dashboard-btn">
              Go to dashboard <ArrowUpRight size={16} />
            </Link>
          </>
        )}
        {(state === "timeout" || state === "error") && (
          <>
            <XCircle size={52} className="text-zinc-500 mx-auto mb-6" />
            <h1 className="font-display font-extrabold text-2xl mb-3">
              {state === "timeout" ? "Still processing" : "Something went wrong"}
            </h1>
            <p className="text-zinc-500 mb-8 text-sm">
              {state === "timeout"
                ? "Your payment is taking a little longer. Check your dashboard in a minute — it'll appear once confirmed."
                : "We couldn't confirm this payment. If you were charged, it will unlock shortly."}
            </p>
            <Link to="/dashboard" className="inline-flex items-center gap-2 border border-white/20 px-7 py-3.5 rounded-full hover:border-white/50 transition-colors">
              Go to dashboard <ArrowUpRight size={16} />
            </Link>
          </>
        )}
      </motion.div>
    </main>
  );
}
