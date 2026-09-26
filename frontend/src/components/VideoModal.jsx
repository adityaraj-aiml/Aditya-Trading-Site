import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { streamUrl } from "@/lib/api";

export default function VideoModal({ asset, onClose }) {
  useEffect(() => {
    if (!asset) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asset, onClose]);

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
            <video
              key={asset.id}
              src={streamUrl(asset.id)}
              controls
              autoPlay
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              className="w-full max-h-[75vh] bg-black"
            />
            {asset.description && <p className="px-5 py-4 text-sm text-zinc-400 whitespace-pre-line">{asset.description}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
