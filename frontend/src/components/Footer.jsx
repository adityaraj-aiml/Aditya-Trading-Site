import { Instagram, Youtube, Send } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="relative bg-[#050505] border-t border-white/10 pt-20 pb-10 px-6 md:px-10" data-testid="site-footer">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-12 gap-12 pb-16">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5 mb-5">
              <LogoMark size={36} />
              <span className="font-display font-extrabold text-lg tracking-tight">
                Techin <span className="text-[#E2FF4A]">By Raj</span>
              </span>
            </div>
            <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
              Precision trading tools and education, built by a trader for traders.
              The signature indicator and the courses that teach you to use it.
            </p>
          </div>

          <div className="md:col-span-3 md:col-start-8">
            <p className="label mb-5">Explore</p>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li><a href="#indicator" className="hover:text-white transition-colors">The Indicator</a></li>
              <li><a href="#courses" className="hover:text-white transition-colors">Courses</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="label mb-5">Follow</p>
            <div className="flex gap-3">
              {[Instagram, Youtube, Send].map((Icon, i) => (
                <a key={i} href="#" className="grid place-items-center w-10 h-10 rounded-full border border-white/10 text-zinc-400 hover:text-black hover:bg-[#E2FF4A] hover:border-[#E2FF4A] transition-colors"
                  data-testid={`footer-social-${i}`}>
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between gap-4 text-xs text-zinc-600 font-mono uppercase tracking-wider">
          <p>© {new Date().getFullYear()} Techin By Raj. All rights reserved.</p>
          <p>Trading involves risk. Not financial advice.</p>
        </div>
      </div>
    </footer>
  );
}
