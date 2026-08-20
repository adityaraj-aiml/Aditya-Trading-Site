import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, GraduationCap, Lock, ArrowUpRight, Download } from "lucide-react";
import { api, INR } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";

const META = {
  indicator_pro: { icon: TrendingUp, note: "Access your download link & setup guide below." },
  course_beginner: { icon: GraduationCap, note: "Start watching your lessons any time." },
  course_pro: { icon: GraduationCap, note: "Your full masterclass is unlocked." },
};

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const { openAuth } = useModal();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get("/products").then(({ data }) => setProducts(data)).catch(() => {});
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (user === false) {
      openAuth("login", () => navigate("/dashboard"));
      navigate("/");
    }
  }, [user, openAuth, navigate]);

  if (!user || user === false) {
    return <div className="min-h-screen grid place-items-center text-zinc-500 font-mono">Loading…</div>;
  }

  const owned = products.filter((p) => (user.purchases || []).includes(p.id));
  const locked = products.filter((p) => !(user.purchases || []).includes(p.id));

  return (
    <main className="min-h-screen pt-32 pb-28 px-6 md:px-10">
      <div className="max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="label mb-4">Your desk</p>
          <h1 className="font-display font-black text-5xl md:text-7xl tracking-tighter mb-2">
            Hey, {user.name?.split(" ")[0]}.
          </h1>
          <p className="text-zinc-500">{owned.length} product{owned.length !== 1 && "s"} unlocked · {user.email}</p>
        </motion.div>

        <section className="mt-16">
          <h2 className="font-display font-bold text-2xl mb-6">Your library</h2>
          {owned.length === 0 ? (
            <div className="border border-white/10 rounded-xl p-10 bg-[#0A0A0A] text-center" data-testid="empty-library">
              <p className="text-zinc-400 mb-6">You haven't unlocked anything yet. Grab the indicator or a course to get started.</p>
              <Link to="/#pricing" className="inline-flex items-center gap-2 bg-[#E2FF4A] text-black font-medium px-6 py-3 rounded-full hover:bg-[#C8E631] transition-colors">
                Browse products <ArrowUpRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {owned.map((p) => {
                const Icon = META[p.id]?.icon || TrendingUp;
                return (
                  <div key={p.id} className="border border-[#E2FF4A]/30 rounded-xl p-7 bg-[#0A0A0A] hover:-translate-y-1 transition-transform duration-300" data-testid={`owned-${p.id}`}>
                    <div className="flex items-center justify-between mb-5">
                      <span className="grid place-items-center w-11 h-11 rounded-lg bg-[#E2FF4A] text-black"><Icon size={20} /></span>
                      <span className="label !text-[#E2FF4A]">Unlocked</span>
                    </div>
                    <h3 className="font-display font-bold text-xl mb-2">{p.name}</h3>
                    <p className="text-sm text-zinc-500 mb-6">{META[p.id]?.note}</p>
                    <button className="w-full flex items-center justify-center gap-2 border border-white/15 py-3 rounded-full text-sm hover:border-[#E2FF4A] hover:text-[#E2FF4A] transition-colors" data-testid={`access-${p.id}`}>
                      <Download size={15} /> {p.type === "indicator" ? "Access indicator" : "Watch lessons"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {locked.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display font-bold text-2xl mb-6">Complete your setup</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locked.map((p) => (
                <Link key={p.id} to="/#pricing" className="group border border-white/10 rounded-xl p-7 bg-[#0A0A0A] hover:border-white/30 transition-colors" data-testid={`locked-${p.id}`}>
                  <div className="flex items-center justify-between mb-5">
                    <span className="grid place-items-center w-11 h-11 rounded-lg border border-white/10 text-zinc-500"><Lock size={18} /></span>
                    <span className="font-display font-bold">{INR(p.amount)}</span>
                  </div>
                  <h3 className="font-display font-bold text-xl mb-2 text-zinc-300 group-hover:text-white transition-colors">{p.name}</h3>
                  <p className="text-sm text-zinc-500">{p.tagline}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
