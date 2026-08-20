import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RotateCcw, ArrowUpRight } from "lucide-react";

export default function PaymentCancel() {
  return (
    <main className="min-h-screen grid place-items-center px-6 pt-24 pb-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="max-w-md w-full text-center border border-white/10 bg-[#0A0A0A] rounded-xl p-10" data-testid="payment-cancel-page">
        <RotateCcw size={48} className="text-zinc-500 mx-auto mb-6" />
        <h1 className="font-display font-black text-3xl tracking-tight mb-3">Checkout cancelled.</h1>
        <p className="text-zinc-400 mb-8">No charge was made. Whenever you're ready, your products are right where you left them.</p>
        <Link to="/#pricing" className="inline-flex items-center gap-2 bg-[#E2FF4A] text-black font-medium px-7 py-3.5 rounded-full hover:bg-[#C8E631] transition-colors" data-testid="back-to-pricing-btn">
          Back to pricing <ArrowUpRight size={16} />
        </Link>
      </motion.div>
    </main>
  );
}
