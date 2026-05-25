import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* ─── Brand panel ────────────────────────────────────── */}
      <div className="relative hidden lg:flex flex-col justify-between p-14 bg-charcoal-800 text-white overflow-hidden">
        {/* dotted backdrop */}
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />
        {/* emerald glow */}
        <div className="absolute -top-32 -left-32 h-[460px] w-[460px] rounded-full bg-brand-500/30 blur-[140px]" />
        <div className="absolute -bottom-40 -right-32 h-[380px] w-[380px] rounded-full bg-brand-700/30 blur-[140px]" />

        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-500 text-charcoal-500 text-sm font-black">A3</span>
            <span className="text-xl">A3 CMS</span>
          </Link>
        </div>

        <div className="relative space-y-6 max-w-md">
          <Badge variant="brand">AI-powered dealership platform</Badge>
          <h1 className="font-black tracking-display text-4xl md:text-5xl leading-[1.05]">
            The operating system for <span className="gradient-text">dealership marketing.</span>
          </h1>
          <p className="text-white/70 text-base leading-relaxed">
            Build sites, ship SEO pages, manage GBP, and reply to reviews — powered by AI, built for automotive groups.
          </p>
          <div className="flex items-center gap-6 pt-4 border-t border-white/10">
            <div>
              <div className="text-2xl font-black text-brand-400">47%</div>
              <div className="text-[10px] uppercase tracking-label text-white/50">Avg lift</div>
            </div>
            <div>
              <div className="text-2xl font-black text-brand-400">12k+</div>
              <div className="text-[10px] uppercase tracking-label text-white/50">Pages shipped</div>
            </div>
            <div>
              <div className="text-2xl font-black text-brand-400">98</div>
              <div className="text-[10px] uppercase tracking-label text-white/50">PageSpeed</div>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} A3 Brands</p>
      </div>

      {/* ─── Form panel ─────────────────────────────────────── */}
      <div className="flex items-center justify-center p-8 lg:p-14">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
