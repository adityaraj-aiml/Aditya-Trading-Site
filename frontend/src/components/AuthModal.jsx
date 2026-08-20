import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import { formatApiErrorDetail } from "@/lib/api";

export default function AuthModal() {
  const { authOpen, setAuthOpen, authMode, setAuthMode, afterAuth, setAfterAuth } = useModal();
  const { login, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = authMode === "login";

  useEffect(() => {
    if (authOpen) {
      setError("");
      setPassword("");
    }
  }, [authOpen, authMode]);

  const close = () => {
    setAuthOpen(false);
    setAfterAuth(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isLogin) await login(email, password);
      else await register(name, email, password);
      toast.success(isLogin ? "Welcome back." : "Account created.");
      const cb = afterAuth;
      close();
      if (cb) setTimeout(cb, 100);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {authOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="auth-modal"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={close} />
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 p-8 md:p-10"
          >
            <button
              onClick={close}
              className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors"
              data-testid="auth-close-btn"
            >
              <X size={20} />
            </button>

            <p className="label mb-3">{isLogin ? "Member access" : "Join the desk"}</p>
            <h2 className="font-display font-extrabold text-3xl tracking-tight mb-8">
              {isLogin ? "Log in." : "Create account."}
            </h2>

            <form onSubmit={submit} className="space-y-5">
              {!isLogin && (
                <Field label="Full name" testid="auth-name-input" value={name}
                  onChange={setName} type="text" placeholder="Raj Sharma" required />
              )}
              <Field label="Email" testid="auth-email-input" value={email}
                onChange={setEmail} type="email" placeholder="you@email.com" required />
              <Field label="Password" testid="auth-password-input" value={password}
                onChange={setPassword} type="password" placeholder="••••••••" required />

              {error && (
                <p className="text-sm text-red-400 font-mono" data-testid="auth-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E2FF4A] text-black font-medium py-3.5 rounded-full hover:bg-[#C8E631] hover:scale-[0.99] transition-transform duration-200 disabled:opacity-60"
                data-testid="auth-submit-btn"
              >
                {loading ? "Please wait…" : isLogin ? "Log in" : "Create account"}
              </button>
            </form>

            <p className="text-sm text-zinc-500 mt-6 text-center">
              {isLogin ? "New to Techin? " : "Already a member? "}
              <button
                onClick={() => setAuthMode(isLogin ? "register" : "login")}
                className="text-[#E2FF4A] hover:underline"
                data-testid="auth-toggle-mode"
              >
                {isLogin ? "Create an account" : "Log in"}
              </button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, testid, value, onChange, type, placeholder, required }) {
  return (
    <label className="block">
      <span className="label block mb-2 !text-zinc-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        data-testid={testid}
        className="w-full bg-transparent border-b-2 border-white/15 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:border-[#E2FF4A] transition-colors"
      />
    </label>
  );
}
