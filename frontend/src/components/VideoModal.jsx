import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { streamUrl } from "@/lib/api";

// resolveSrc: optional async (assetId) => url, for sources that aren't the backend stream (preview mode).
export default function VideoModal({ asset, onClose, resolveSrc }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!asset) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asset, onClose]);

  useEffect(() => {
    if (!asset) return setSrc(null);
    if (!resolveSrc) return setSrc(streamUrl(asset.id));
    let url, cancelled = false;
    resolveSrc(asset.id).then((u) => {
      url = u;
      if (!cancelled) setSrc(u);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [asset, resolveSrc]);

  return (
    <AnimatePresence>
      {asset && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm grid place-items-center p-4 md:p-10"
          onClick={onClose}
          data-testid="video-modal"
        >
          <motion.div
            initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
            className="w-full max-w-5xl bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <h3 className="font-display font-bold truncate pr-4">{asset.title}</h3>
              <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors" data-testid="video-modal-close">
                <X size={18} />
              </button>
            </div>
            {src ? (
              <video
                key={src}
                src={src}
                controls
                autoPlay
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                className="w-full max-h-[75vh] bg-black"
              />
            ) : (
              <div className="aspect-video grid place-items-center text-zinc-500 font-mono text-sm bg-black">Loading…</div>
            )}
            {asset.description && <p className="px-5 py-4 text-sm text-zinc-400 whitespace-pre-line">{asset.description}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
