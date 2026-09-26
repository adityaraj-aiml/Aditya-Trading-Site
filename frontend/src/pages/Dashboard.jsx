import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, GraduationCap, Lock, ArrowUpRight, Download, Play, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api, INR } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import VideoModal from "@/components/VideoModal";

const ICONS = { indicator_pro: TrendingUp, course_beginner: GraduationCap, course_pro: GraduationCap };

async function downloadAsset(asset) {
  const res = await api.get(`/assets/${asset.id}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = asset.original_filename || asset.title;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const { openAuth } = useModal();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [library, setLibrary] = useState([]);
  const [playing, setPlaying] = useState(null);

  const loadLibrary = useCallback(async () => {
    try {
      const { data } = await api.get("/my/library");
      setLibrary(data);
    } catch { /* not logged in */ }
  }, []);

  useEffect(() => {
    api.get("/products").then(({ data }) => setProducts(data)).catch(() => {});
    refresh();
    loadLibrary();
  }, [refresh, loadLibrary]);

  useEffect(() => {
    if (user === false) {
      openAuth("login", () => navigate("/dashboard"));
      navigate("/");
    }
  }, [user, openAuth, navigate]);

  if (!user || user === false) {
    return <div className="min-h-screen grid place-items-center text-zinc-500 font-mono">Loading…</div>;
  }

  const ownedIds = user.purchases || [];
  const locked = products.filter((p) => !ownedIds.includes(p.id));

  return (
    <main className="min-h-screen pt-32 pb-28 px-6 md:px-10">
      <div className="max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="label mb-4">Your desk</p>
          <h1 className="font-display font-black text-5xl md:text-7xl tracking-tighter mb-2">
            Hey, {user.name?.split(" ")[0]}.
          </h1>
          <p className="text-zinc-500">
            {ownedIds.length} product{ownedIds.length !== 1 && "s"} unlocked · {user.email}
            {user.role === "admin" && <span className="ml-2 text-[#E2FF4A] font-mono text-xs uppercase">· Admin</span>}
          </p>
        </motion.div>

        <section className="mt-16">
          <h2 className="font-display font-bold text-2xl mb-6">Your library</h2>
          {library.length === 0 ? (
            <div className="border border-white/10 rounded-xl p-10 bg-[#0A0A0A] text-center" data-testid="empty-library">
              <p className="text-zinc-400 mb-6">You haven't unlocked anything yet. Grab the indicator or a course to get started.</p>
              <Link to="/#pricing" className="inline-flex items-center gap-2 bg-[#E2FF4A] text-black font-medium px-6 py-3 rounded-full hover:bg-[#C8E631] transition-colors">
                Browse products <ArrowUpRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {library.map(({ product, assets }) => {
                const Icon = ICONS[product.id] || TrendingUp;
                return (
                  <div key={product.id} className="border border-[#E2FF4A]/30 rounded-xl p-7 bg-[#0A0A0A]" data-testid={`owned-${product.id}`}>
                    <div className="flex items-center justify-between mb-5">
                      <span className="grid place-items-center w-11 h-11 rounded-lg bg-[#E2FF4A] text-black"><Icon size={20} /></span>
                      <span className="label !text-[#E2FF4A]">Unlocked</span>
                    </div>
                    <h3 className="font-display font-bold text-xl mb-4">{product.name}</h3>
                    {assets.length === 0 ? (
                      <p className="text-sm text-zinc-500">Content is being prepared — check back soon.</p>
                    ) : (
                      <div className="space-y-2">
                        {assets.map((a) => (
                          <button key={a.id}
                            onClick={() => (a.is_video ? setPlaying(a) : downloadAsset(a).catch(() => toast.error("Download failed")))}
                            className="w-full flex items-center gap-3 border border-white/10 py-3 px-3 rounded-lg text-sm text-left hover:border-[#E2FF4A] hover:text-[#E2FF4A] transition-colors"
                            data-testid={`${a.is_video ? "play" : "download"}-${a.id}`}>
                            {a.is_video ? <Play size={15} className="shrink-0" /> : <Download size={15} className="shrink-0" />}
                            <span className="truncate flex-1">{a.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
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

        {user.role === "admin" && (
          <Link to="/admin" className="mt-24 flex items-center justify-between gap-6 border border-[#E2FF4A]/30 rounded-xl p-8 bg-[#0A0A0A] hover:border-[#E2FF4A] transition-colors" data-testid="admin-panel-link">
            <div>
              <p className="label mb-2 !text-[#E2FF4A]">Admin</p>
              <h2 className="font-display font-bold text-2xl">Open the admin panel</h2>
              <p className="text-sm text-zinc-500 mt-1">Upload and update videos, manage users and access, view payments.</p>
            </div>
            <ShieldCheck size={28} className="text-[#E2FF4A] shrink-0" />
          </Link>
        )}
      </div>
      <VideoModal asset={playing} onClose={() => setPlaying(null)} />
    </main>
  );
}
