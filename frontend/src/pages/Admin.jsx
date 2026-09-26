import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutGrid, Film, Users, Receipt, Upload, Trash2, Pencil, Play, FileText, ArrowUp, ArrowDown,
  RefreshCw, Check, X, Search, ShieldCheck, Shield, Download, Info, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { api as serverApi, INR, fileSize, formatApiErrorDetail, IS_PREVIEW } from "@/lib/api";
import { demoApi, demoVideoSrc, resetDemo, DEMO_ADMIN } from "@/lib/demoApi";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import VideoModal from "@/components/VideoModal";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "content", label: "Videos & files", icon: Film },
  { id: "users", label: "Users & access", icon: Users },
  { id: "payments", label: "Payments", icon: Receipt },
];

// Without a backend, every admin call goes to the in-browser store instead.
const api = IS_PREVIEW ? demoApi : serverApi;
const videoSrc = IS_PREVIEW ? demoVideoSrc : undefined;

const errMsg = (e, fallback) => formatApiErrorDetail(e?.response?.data?.detail) || fallback;
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default function Admin() {
  const auth = useAuth();
  const user = IS_PREVIEW ? DEMO_ADMIN : auth.user;
  const { openAuth } = useModal();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get("/products").then(({ data }) => setProducts(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!IS_PREVIEW && user === false) {
      openAuth("login", () => navigate("/admin"));
      navigate("/");
    }
  }, [user, openAuth, navigate]);

  if (!user) {
    return <div className="min-h-screen grid place-items-center text-zinc-500 font-mono">Loading…</div>;
  }
  if (user.role !== "admin") {
    return (
      <main className="min-h-screen grid place-items-center px-6 text-center" data-testid="admin-forbidden">
        <div>
          <Shield size={32} className="mx-auto mb-4 text-zinc-600" />
          <h1 className="font-display font-bold text-2xl mb-2">Admin access required</h1>
          <p className="text-zinc-500">This area is only available to site administrators.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-32 pb-28 px-6 md:px-10" data-testid="admin-page">
      <div className="max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="label mb-4 !text-[#E2FF4A]">Admin panel</p>
          <h1 className="font-display font-black text-5xl md:text-7xl tracking-tighter mb-10">Control room.</h1>
        </motion.div>

        {IS_PREVIEW && <PreviewBanner />}

        <div className="flex gap-2 overflow-x-auto border-b border-white/10 mb-10 -mx-1 px-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-mono uppercase tracking-wider whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === t.id ? "border-[#E2FF4A] text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
              data-testid={`admin-tab-${t.id}`}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && <Overview products={products} goTo={setTab} />}
        {tab === "content" && <Content products={products} />}
        {tab === "users" && <UsersTab products={products} me={user} />}
        {tab === "payments" && <Payments />}
      </div>
    </main>
  );
}

function PreviewBanner() {
  const reset = async () => {
    if (!window.confirm("Clear all preview data (uploaded videos, edits, sample users) from this browser?")) return;
    await resetDemo();
    window.location.reload();
  };
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 border border-[#E2FF4A]/30 bg-[#E2FF4A]/5 rounded-xl p-5 mb-10" data-testid="admin-preview-banner">
      <Info size={20} className="text-[#E2FF4A] shrink-0" />
      <p className="text-sm text-zinc-300 flex-1">
        <span className="text-white font-medium">Preview mode.</span> The site's server isn't connected yet, so everything
        here (uploads, edits, access changes) is saved only in this browser. Buyers won't see it until the server
        is connected; then this panel switches to live mode automatically.
      </p>
      <button onClick={reset} className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white border border-white/15 hover:border-white/40 rounded-full px-4 py-2 transition-colors shrink-0">
        <RotateCcw size={13} /> Reset preview
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ OVERVIEW */
function Overview({ products, goTo }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => toast.error("Couldn't load stats"));
  }, []);
  if (!stats) return <p className="text-zinc-500 font-mono text-sm">Loading…</p>;

  const tiles = [
    { label: "Revenue", value: INR(stats.revenue), tab: "payments" },
    { label: "Paid orders", value: stats.paid_orders, tab: "payments" },
    { label: "Users", value: stats.users, tab: "users" },
    { label: "Videos", value: stats.videos, tab: "content" },
  ];
  return (
    <div className="space-y-10" data-testid="admin-overview">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <button key={t.label} onClick={() => goTo(t.tab)}
            className="text-left border border-white/10 rounded-xl p-6 bg-[#0A0A0A] hover:border-white/30 transition-colors">
            <p className="label mb-3">{t.label}</p>
            <p className="font-display font-black text-3xl md:text-4xl tracking-tight">{t.value}</p>
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="border border-white/10 rounded-xl p-6 bg-[#0A0A0A]">
            <h3 className="font-display font-bold text-lg mb-4">{p.name}</h3>
            <div className="flex gap-8 text-sm">
              <div><p className="label mb-1">Buyers</p><p className="font-display font-bold text-2xl">{stats.per_product[p.id]?.buyers ?? 0}</p></div>
              <div><p className="label mb-1">Files</p><p className="font-display font-bold text-2xl">{stats.per_product[p.id]?.assets ?? 0}</p></div>
              <div><p className="label mb-1">Price</p><p className="font-display font-bold text-2xl">{INR(p.amount)}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ CONTENT */
function Content({ products }) {
  const [pid, setPid] = useState(null);
  const active = pid || products[0]?.id;
  if (!active) return <p className="text-zinc-500 font-mono text-sm">Loading…</p>;
  return (
    <div data-testid="admin-content">
      <div className="flex flex-wrap gap-2 mb-8">
        {products.map((p) => (
          <button key={p.id} onClick={() => setPid(p.id)}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              active === p.id ? "bg-[#E2FF4A] text-black font-medium" : "border border-white/15 text-zinc-300 hover:border-white/40"
            }`}
            data-testid={`admin-product-${p.id}`}>
            {p.name}
          </button>
        ))}
      </div>
      <ProductContent key={active} product={products.find((p) => p.id === active)} products={products} />
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
      <div className="h-full bg-[#E2FF4A] transition-[width] duration-200" style={{ width: `${value}%` }} />
    </div>
  );
}

const onProgress = (set) => (e) => e.total && set(Math.round((e.loaded / e.total) * 100));

function ProductContent({ product, products }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/products/${product.id}/assets`);
      setAssets(data);
    } catch (e) {
      toast.error(errMsg(e, "Couldn't load content"));
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => { load(); }, [load]);

  const move = async (index, dir) => {
    const next = [...assets];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setAssets(next);
    try {
      const { data } = await api.post(`/admin/products/${product.id}/assets/reorder`, { asset_ids: next.map((a) => a.id) });
      setAssets(data);
    } catch (e) {
      toast.error(errMsg(e, "Reorder failed"));
      load();
    }
  };

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-8 items-start">
      <UploadForm product={product} onDone={load} />
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-xl">{assets.length} item{assets.length !== 1 && "s"} in {product.name}</h3>
          <button onClick={load} className="text-zinc-500 hover:text-white transition-colors" title="Refresh"><RefreshCw size={15} /></button>
        </div>
        {loading ? (
          <p className="text-zinc-500 font-mono text-sm">Loading…</p>
        ) : assets.length === 0 ? (
          <div className="border border-dashed border-white/15 rounded-xl p-10 text-center text-zinc-500 text-sm">
            No videos or files yet. Use the upload form to add the first one.
          </div>
        ) : (
          <div className="space-y-3">
            {assets.map((a, i) => (
              <AssetRow key={a.id} asset={a} index={i} total={assets.length} products={products}
                onMove={move} onPlay={setPlaying} onChanged={load} />
            ))}
          </div>
        )}
      </div>
      <VideoModal asset={playing} onClose={() => setPlaying(null)} resolveSrc={videoSrc} />
    </div>
  );
}

function UploadForm({ product, onDone }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const busy = progress !== null;

  const pick = (f) => {
    if (!f || busy) return;
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) return toast.error("Add a title and choose a file");
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description);
      fd.append("file", file);
      await api.post(`/admin/products/${product.id}/assets`, fd, { onUploadProgress: onProgress(setProgress) });
      toast.success(`Uploaded "${title.trim()}"`);
      setTitle(""); setDescription(""); setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onDone();
    } catch (err) {
      toast.error(errMsg(err, "Upload failed"));
    } finally {
      setProgress(null);
    }
  };

  return (
    <form onSubmit={submit} className="border border-white/10 rounded-xl p-6 bg-[#0A0A0A] space-y-4 lg:sticky lg:top-28" data-testid="admin-upload-form">
      <h3 className="font-display font-bold text-lg flex items-center gap-2"><Upload size={17} className="text-[#E2FF4A]" /> Upload new</h3>
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        className={`block border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          busy ? "opacity-50 pointer-events-none" : "cursor-pointer"
        } ${drag ? "border-[#E2FF4A] bg-[#E2FF4A]/5" : "border-white/15 hover:border-white/30"}`}>
        <input ref={inputRef} type="file" className="hidden" disabled={busy} accept="video/*,.pdf,.zip,.png,.jpg,.jpeg,.txt,.csv"
          onChange={(e) => pick(e.target.files[0])} data-testid="admin-file-input" />
        {file ? (
          <>
            <p className="text-sm text-white truncate">{file.name}</p>
            <p className="text-xs text-zinc-500 mt-1">{fileSize(file.size)} · click to change</p>
          </>
        ) : (
          <>
            <Film size={22} className="mx-auto mb-2 text-zinc-500" />
            <p className="text-sm text-zinc-300">Drop a video here or click to browse</p>
            <p className="text-xs text-zinc-600 mt-1">MP4 / WebM recommended · PDFs & ZIPs also work</p>
          </>
        )}
      </label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Lesson 1 — Reading candles)"
        className="w-full bg-transparent border-b-2 border-white/15 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#E2FF4A] transition-colors"
        data-testid="admin-title-input" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description (optional)"
        className="w-full bg-transparent border border-white/15 rounded-lg p-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#E2FF4A] transition-colors resize-y"
        data-testid="admin-description-input" />
      {busy && (
        <div className="space-y-1">
          <ProgressBar value={progress} />
          <p className="text-xs text-zinc-500 font-mono">{progress < 100 ? `Uploading… ${progress}%` : "Processing…"}</p>
        </div>
      )}
      <button type="submit" disabled={busy}
        className="w-full flex items-center justify-center gap-2 bg-[#E2FF4A] text-black text-sm font-medium py-3 rounded-full hover:bg-[#C8E631] transition-colors disabled:opacity-60"
        data-testid="admin-upload-btn">
        <Upload size={14} /> {busy ? "Uploading…" : `Upload to ${product.name}`}
      </button>
    </form>
  );
}

function AssetRow({ asset, index, total, products, onMove, onPlay, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(asset.title);
  const [description, setDescription] = useState(asset.description || "");
  const [packageId, setPackageId] = useState(asset.package_id);
  const [progress, setProgress] = useState(null);
  const replaceRef = useRef(null);

  const save = async () => {
    if (!title.trim()) return toast.error("Title can't be empty");
    try {
      await api.patch(`/admin/assets/${asset.id}`, { title: title.trim(), description, package_id: packageId });
      toast.success("Saved");
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(errMsg(e, "Save failed"));
    }
  };

  const cancel = () => {
    setTitle(asset.title); setDescription(asset.description || ""); setPackageId(asset.package_id);
    setEditing(false);
  };

  const replace = async (f) => {
    if (!f) return;
    if (!window.confirm(`Replace "${asset.original_filename}" with "${f.name}"? Buyers will see the new file immediately.`)) return;
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", f);
      await api.put(`/admin/assets/${asset.id}/file`, fd, { onUploadProgress: onProgress(setProgress) });
      toast.success("File replaced");
      onChanged();
    } catch (e) {
      toast.error(errMsg(e, "Replace failed"));
    } finally {
      setProgress(null);
      if (replaceRef.current) replaceRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${asset.title}" permanently? Buyers will lose access to it.`)) return;
    try {
      await api.delete(`/admin/assets/${asset.id}`);
      toast.success("Deleted");
      onChanged();
    } catch (e) {
      toast.error(errMsg(e, "Delete failed"));
    }
  };

  const download = async () => {
    try {
      const res = await api.get(`/assets/${asset.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = asset.original_filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  const iconBtn = "grid place-items-center w-8 h-8 rounded-md border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-colors disabled:opacity-30 disabled:pointer-events-none";

  return (
    <div className="border border-white/10 rounded-xl bg-[#0A0A0A] p-4" data-testid={`admin-asset-${asset.id}`}>
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-1 shrink-0">
          <button className={iconBtn} disabled={index === 0} onClick={() => onMove(index, -1)} title="Move up"><ArrowUp size={13} /></button>
          <button className={iconBtn} disabled={index === total - 1} onClick={() => onMove(index, 1)} title="Move down"><ArrowDown size={13} /></button>
        </div>
        <button
          onClick={() => (asset.is_video ? onPlay(asset) : download())}
          className="shrink-0 grid place-items-center w-20 h-14 rounded-lg bg-white/5 border border-white/10 text-[#E2FF4A] hover:bg-white/10 transition-colors"
          title={asset.is_video ? "Preview video" : "Download file"}>
          {asset.is_video ? <Play size={18} className="fill-[#E2FF4A]" /> : <FileText size={18} />}
        </button>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent border-b-2 border-white/15 py-1.5 text-sm text-white outline-none focus:border-[#E2FF4A]"
                data-testid={`admin-edit-title-${asset.id}`} />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description"
                className="w-full bg-transparent border border-white/15 rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#E2FF4A] resize-y" />
              <label className="flex items-center gap-3 text-xs text-zinc-400">
                Product
                <select value={packageId} onChange={(e) => setPackageId(e.target.value)}
                  className="bg-[#111] border border-white/15 rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-[#E2FF4A]">
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <div className="flex gap-2">
                <button onClick={save} className="flex items-center gap-1.5 bg-[#E2FF4A] text-black text-xs font-medium px-4 py-2 rounded-full hover:bg-[#C8E631]" data-testid={`admin-save-${asset.id}`}>
                  <Check size={13} /> Save
                </button>
                <button onClick={cancel} className="flex items-center gap-1.5 border border-white/15 text-zinc-300 text-xs px-4 py-2 rounded-full hover:border-white/40">
                  <X size={13} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="font-medium text-white truncate"><span className="text-zinc-600 font-mono text-xs mr-2">{String(index + 1).padStart(2, "0")}</span>{asset.title}</p>
              {asset.description && <p className="text-sm text-zinc-500 mt-1 line-clamp-2 whitespace-pre-line">{asset.description}</p>}
              <p className="text-xs text-zinc-600 font-mono mt-2 truncate">
                {asset.original_filename} · {fileSize(asset.size)} · updated {fmtDate(asset.updated_at || asset.created_at)}
              </p>
            </>
          )}
          {progress !== null && (
            <div className="mt-3 space-y-1">
              <ProgressBar value={progress} />
              <p className="text-xs text-zinc-500 font-mono">{progress < 100 ? `Replacing… ${progress}%` : "Processing…"}</p>
            </div>
          )}
        </div>
        {!editing && (
          <div className="flex gap-1.5 shrink-0">
            <button className={iconBtn} onClick={() => setEditing(true)} title="Edit details" data-testid={`admin-edit-${asset.id}`}><Pencil size={13} /></button>
            <button className={iconBtn} onClick={() => replaceRef.current?.click()} disabled={progress !== null} title="Replace file" data-testid={`admin-replace-${asset.id}`}><RefreshCw size={13} /></button>
            <button className={iconBtn} onClick={download} title="Download"><Download size={13} /></button>
            <button className={`${iconBtn} hover:!text-red-400 hover:!border-red-400/40`} onClick={remove} title="Delete" data-testid={`admin-delete-${asset.id}`}><Trash2 size={13} /></button>
            <input ref={replaceRef} type="file" className="hidden" onChange={(e) => replace(e.target.files[0])} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ USERS */
function UsersTab({ products, me }) {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query) => {
    try {
      const { data } = await api.get("/admin/users", { params: { q: query } });
      setUsers(data);
    } catch (e) {
      toast.error(errMsg(e, "Couldn't load users"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  const update = async (u, changes, msg) => {
    try {
      const { data } = await api.patch(`/admin/users/${u.id}`, changes);
      setUsers((list) => list.map((x) => (x.id === u.id ? data : x)));
      toast.success(msg);
    } catch (e) {
      toast.error(errMsg(e, "Update failed"));
    }
  };

  const toggleProduct = (u, pid) => {
    const has = u.purchases.includes(pid);
    const name = products.find((p) => p.id === pid)?.name || pid;
    update(u, { purchases: has ? u.purchases.filter((x) => x !== pid) : [...u.purchases, pid] },
      has ? `Revoked ${name} from ${u.email}` : `Granted ${name} to ${u.email}`);
  };

  const toggleAdmin = (u) => {
    const makeAdmin = u.role !== "admin";
    if (!window.confirm(makeAdmin ? `Give ${u.email} full admin access?` : `Remove admin access from ${u.email}?`)) return;
    update(u, { role: makeAdmin ? "admin" : "user" }, makeAdmin ? "Admin access granted" : "Admin access removed");
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}? This can't be undone.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      setUsers((list) => list.filter((x) => x.id !== u.id));
      toast.success("User deleted");
    } catch (e) {
      toast.error(errMsg(e, "Delete failed"));
    }
  };

  return (
    <div data-testid="admin-users">
      <div className="flex items-center gap-3 border-b-2 border-white/15 focus-within:border-[#E2FF4A] transition-colors mb-6 max-w-md">
        <Search size={15} className="text-zinc-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email"
          className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none"
          data-testid="admin-user-search" />
      </div>
      <p className="text-xs text-zinc-500 mb-4">Click a product to grant or revoke access. Granting works like a purchase: the user sees it in their library right away.</p>
      {loading ? (
        <p className="text-zinc-500 font-mono text-sm">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-zinc-500 text-sm">No users found.</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="border border-white/10 rounded-xl bg-[#0A0A0A] p-4 flex flex-col md:flex-row md:items-center gap-4" data-testid={`admin-user-${u.id}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {u.name}
                  {u.role === "admin" && <span className="ml-2 text-[#E2FF4A] font-mono text-[10px] uppercase tracking-wider">Admin</span>}
                  {u.id === me.id && <span className="ml-2 text-zinc-500 font-mono text-[10px] uppercase tracking-wider">You</span>}
                </p>
                <p className="text-sm text-zinc-500 truncate">{u.email} · joined {fmtDate(u.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {products.map((p) => {
                  const has = u.purchases.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => toggleProduct(u, p.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        has ? "bg-[#E2FF4A]/10 border-[#E2FF4A]/50 text-[#E2FF4A]" : "border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/30"
                      }`}
                      data-testid={`admin-grant-${u.id}-${p.id}`}>
                      {has ? "✓ " : "+ "}{p.name}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => toggleAdmin(u)} disabled={u.id === me.id}
                  className={`grid place-items-center w-8 h-8 rounded-md border transition-colors disabled:opacity-30 disabled:pointer-events-none ${
                    u.role === "admin" ? "border-[#E2FF4A]/50 text-[#E2FF4A]" : "border-white/10 text-zinc-400 hover:text-white hover:border-white/30"
                  }`}
                  title={u.role === "admin" ? "Remove admin access" : "Make admin"}
                  data-testid={`admin-role-${u.id}`}>
                  <ShieldCheck size={14} />
                </button>
                <button onClick={() => remove(u)} disabled={u.id === me.id}
                  className="grid place-items-center w-8 h-8 rounded-md border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-400/40 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  title="Delete user" data-testid={`admin-delete-user-${u.id}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ PAYMENTS */
function Payments() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.get("/admin/payments").then(({ data }) => setRows(data)).catch((e) => {
      toast.error(errMsg(e, "Couldn't load payments"));
      setRows([]);
    });
  }, []);
  if (!rows) return <p className="text-zinc-500 font-mono text-sm">Loading…</p>;
  if (rows.length === 0) return <p className="text-zinc-500 text-sm">No payments yet.</p>;

  const badge = (s) =>
    s === "paid" ? "bg-[#E2FF4A]/10 text-[#E2FF4A]" : s === "pending" ? "bg-white/5 text-zinc-400" : "bg-red-500/10 text-red-400";

  return (
    <div className="border border-white/10 rounded-xl bg-[#0A0A0A] overflow-x-auto" data-testid="admin-payments">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="text-left border-b border-white/10">
            {["Date", "Customer", "Product", "Amount", "Status", "Order ID"].map((h) => (
              <th key={h} className="label px-4 py-3 font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.order_id} className="border-b border-white/5 last:border-0">
              <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
              <td className="px-4 py-3"><p className="text-white">{r.user_name || "—"}</p><p className="text-xs text-zinc-500">{r.user_email || r.user_id}</p></td>
              <td className="px-4 py-3 text-zinc-300">{r.product_name}</td>
              <td className="px-4 py-3 text-white font-medium">{INR(r.amount)}</td>
              <td className="px-4 py-3"><span className={`text-xs font-mono uppercase px-2 py-1 rounded ${badge(r.payment_status)}`}>{r.payment_status}</span></td>
              <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{r.order_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
