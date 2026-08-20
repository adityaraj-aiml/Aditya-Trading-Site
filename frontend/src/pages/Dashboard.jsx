import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, GraduationCap, Lock, ArrowUpRight, Download, Upload, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { api, INR } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";

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
                          <button key={a.id} onClick={() => downloadAsset(a).catch(() => toast.error("Download failed"))}
                            className="w-full flex items-center gap-3 border border-white/10 py-3 px-3 rounded-lg text-sm text-left hover:border-[#E2FF4A] hover:text-[#E2FF4A] transition-colors"
                            data-testid={`download-${a.id}`}>
                            <Download size={15} className="shrink-0" />
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
          <AdminPanel products={products} onChange={loadLibrary} />
        )}
      </div>
    </main>
  );
}

function AdminPanel({ products }) {
  return (
    <section className="mt-24 border-t border-white/10 pt-14" data-testid="admin-panel">
      <p className="label mb-4">Admin · Content delivery</p>
      <h2 className="font-display font-bold text-2xl mb-8">Upload product files</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {products.map((p) => <AdminProductUploader key={p.id} product={p} />)}
      </div>
    </section>
  );
}

function AdminProductUploader({ product }) {
  const [assets, setAssets] = useState([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/products/${product.id}/assets`);
      setAssets(data);
    } catch { /* ignore */ }
  }, [product.id]);

  useEffect(() => { load(); }, [load]);

  const upload = async (e) => {
    e.preventDefault();
    if (!file || !title) return toast.error("Add a title and choose a file");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("file", file);
      await api.post(`/admin/products/${product.id}/assets`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("File uploaded");
      setTitle(""); setFile(null);
      e.target.reset();
      load();
    } catch {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    await api.delete(`/admin/assets/${id}`).catch(() => {});
    load();
  };

  return (
    <div className="border border-white/10 rounded-xl p-6 bg-[#0A0A0A]" data-testid={`admin-uploader-${product.id}`}>
      <h3 className="font-display font-bold text-lg mb-4">{product.name}</h3>
      <form onSubmit={upload} className="space-y-3 mb-5">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="File title (e.g. Indicator v1)"
          className="w-full bg-transparent border-b-2 border-white/15 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#E2FF4A] transition-colors"
          data-testid={`admin-title-${product.id}`} />
        <input type="file" onChange={(e) => setFile(e.target.files[0])}
          className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded-full file:border-0 file:bg-white/10 file:text-white file:text-xs hover:file:bg-white/20"
          data-testid={`admin-file-${product.id}`} />
        <button type="submit" disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-[#E2FF4A] text-black text-sm font-medium py-2.5 rounded-full hover:bg-[#C8E631] transition-colors disabled:opacity-60"
          data-testid={`admin-upload-btn-${product.id}`}>
          <Upload size={14} /> {busy ? "Uploading…" : "Upload"}
        </button>
      </form>
      <div className="space-y-2">
        {assets.length === 0 && <p className="text-xs text-zinc-400">No files yet.</p>}
        {assets.map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-xs text-zinc-400 border border-white/5 rounded-lg px-3 py-2">
            <FileText size={13} className="text-[#E2FF4A] shrink-0" />
            <span className="truncate flex-1">{a.title}</span>
            <button onClick={() => remove(a.id)} className="text-zinc-600 hover:text-red-400 transition-colors" data-testid={`admin-delete-${a.id}`}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
