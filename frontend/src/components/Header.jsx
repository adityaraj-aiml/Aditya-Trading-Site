import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LineChart, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";

const NAV = [
  { label: "Indicator", id: "indicator" },
  { label: "Courses", id: "courses" },
  { label: "Method", id: "method" },
  { label: "Pricing", id: "pricing" },
  { label: "FAQ", id: "faq" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const { openAuth } = useModal();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goSection = (id) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 300);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? "glass border-b border-white/10" : "bg-transparent"
      }`}
      data-testid="site-header"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-[72px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group" data-testid="brand-logo">
          <span className="grid place-items-center w-9 h-9 rounded-md bg-[#E2FF4A] text-black">
            <LineChart size={18} strokeWidth={2.5} />
          </span>
          <span className="font-display font-extrabold text-lg tracking-tight leading-none">
            Techin<span className="text-[#E2FF4A]">.</span>
            <span className="block text-[9px] font-mono tracking-[0.3em] text-zinc-500 uppercase">
              by Raj
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => goSection(n.id)}
              className="text-sm text-zinc-400 hover:text-white transition-colors duration-200 font-mono uppercase tracking-wider"
              data-testid={`nav-${n.id}`}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user && user !== false ? (
            <>
              <Link
                to="/dashboard"
                className="hidden sm:flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors"
                data-testid="header-dashboard-link"
              >
                <LayoutDashboard size={16} /> {user.name?.split(" ")[0]}
              </Link>
              <button
                onClick={() => logout()}
                className="grid place-items-center w-9 h-9 rounded-full border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
                data-testid="logout-btn"
                title="Log out"
              >
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuth("login")}
                className="hidden sm:block text-sm text-zinc-300 hover:text-white transition-colors font-mono uppercase tracking-wider"
                data-testid="header-login-btn"
              >
                Log in
              </button>
              <button
                onClick={() => openAuth("register")}
                className="text-sm font-medium bg-[#E2FF4A] text-black px-5 py-2.5 rounded-full hover:bg-[#C8E631] hover:scale-[0.98] transition-transform duration-200"
                data-testid="header-signup-btn"
              >
                Get access
              </button>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
