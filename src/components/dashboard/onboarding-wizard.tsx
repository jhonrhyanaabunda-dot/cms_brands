"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowRight, ArrowLeft, Check, Sparkles, Palette, Plug, FileText } from "lucide-react";
import { completeOnboarding, skipOnboarding } from "@/server/onboarding";
import { cn } from "@/lib/utils";

type WizardData = {
  name: string;
  brand: string;
  primaryColor: string;
  logoUrl: string;
  gscSiteUrl: string;
  ga4PropertyId: string;
  gbpAccountId: string;
  generate: {
    welcomeBlog: boolean;
    financingPage: boolean;
    servicePage: boolean;
    cityPage: boolean;
    aboutBlog: boolean;
  };
};

const STEPS = [
  { id: 1, label: "Brand",       icon: Sparkles, desc: "Tell us who you are" },
  { id: 2, label: "Look",        icon: Palette,  desc: "Color + logo" },
  { id: 3, label: "Integrations",icon: Plug,     desc: "Connect Google" },
  { id: 4, label: "Starter content", icon: FileText, desc: "Generate your first pages" },
] as const;

export function OnboardingWizard({
  initial,
}: {
  initial: {
    name: string;
    brand: string | null;
    primaryColor: string | null;
    logoUrl: string | null;
    gscSiteUrl: string | null;
    ga4PropertyId: string | null;
    gbpAccountId: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    name: initial.name,
    brand: initial.brand ?? "",
    primaryColor: initial.primaryColor ?? "#1DB954",
    logoUrl: initial.logoUrl ?? "",
    gscSiteUrl: initial.gscSiteUrl ?? "",
    ga4PropertyId: initial.ga4PropertyId ?? "",
    gbpAccountId: initial.gbpAccountId ?? "",
    generate: {
      welcomeBlog: true,
      financingPage: true,
      servicePage: true,
      cityPage: false,
      aboutBlog: false,
    },
  });
  const [pending, start] = useTransition();

  function set<K extends keyof WizardData>(k: K, val: WizardData[K]) {
    setData((c) => ({ ...c, [k]: val }));
  }
  function toggleGen(k: keyof WizardData["generate"]) {
    setData((c) => ({ ...c, generate: { ...c.generate, [k]: !c.generate[k] } }));
  }

  function next() { setStep((s) => Math.min(4, s + 1)); }
  function back() { setStep((s) => Math.max(1, s - 1)); }

  function finish() {
    start(async () => {
      const t = toast.loading("Setting up your workspace…");
      try {
        const r = await completeOnboarding(data);
        toast.success(`All set · ${r.generated} starter page${r.generated === 1 ? "" : "s"} generated`, { id: t });
        setOpen(false);
        router.refresh();
      } catch (e: any) { toast.error(e?.message ?? "Failed", { id: t }); }
    });
  }
  function skip() {
    start(async () => {
      try { await skipOnboarding(); setOpen(false); router.refresh(); }
      catch (e: any) { toast.error(e?.message ?? "Failed"); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={() => { /* not dismissable via overlay click */ }}>
      <DialogContent hideClose className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome to {data.name}</DialogTitle>
          <DialogDescription>2-minute setup — you can change everything later in Settings.</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 pb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex-1 flex items-center gap-2 min-w-0">
                <div className={cn(
                  "h-8 w-8 rounded-full grid place-items-center shrink-0 transition-colors",
                  done ? "bg-brand-500 text-charcoal-500" :
                  active ? "bg-brand-500/15 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500" :
                  "bg-muted text-muted-foreground"
                )}>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <div className={cn("text-xs font-medium truncate", active ? "" : "text-muted-foreground")}>{s.label}</div>
                </div>
                {i < STEPS.length - 1 && <div className={cn("flex-1 h-px", step > s.id ? "bg-brand-500" : "bg-border")} />}
              </div>
            );
          })}
        </div>

        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Tell us about your dealership</h3>
              <Field label="Dealership name"><Input value={data.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="OEM brand"><Input value={data.brand} onChange={(e) => set("brand", e.target.value.toUpperCase())} placeholder="BMW / TOYOTA / NISSAN / …" /></Field>
              <p className="text-xs text-muted-foreground">We use this to tune AI-generated content and OEM compliance language.</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Make it yours</h3>
              <Field label="Primary brand color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={data.primaryColor}
                    onChange={(e) => set("primaryColor", e.target.value)}
                    className="h-9 w-12 rounded border bg-transparent p-0.5 cursor-pointer"
                  />
                  <Input value={data.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="font-mono" />
                </div>
              </Field>
              <Field label="Logo URL (optional)">
                <Input value={data.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…/logo.png" />
              </Field>
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Live preview</div>
                <div
                  className="rounded-md p-4 flex items-center justify-between"
                  style={{ background: `linear-gradient(135deg, ${data.primaryColor}, #0B0D0F)` }}
                >
                  <div className="text-white font-bold">{data.name}</div>
                  <span
                    className="text-xs font-semibold rounded-full px-3 py-1.5"
                    style={{ backgroundColor: data.primaryColor, color: getOnColor(data.primaryColor) }}
                  >
                    Shop now
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Connect your Google properties</h3>
              <p className="text-xs text-muted-foreground">All optional — fill in what you have, skip the rest. OAuth keys themselves live in env vars; these IDs just identify which property to query.</p>
              <Field label="Google Search Console site URL"><Input value={data.gscSiteUrl} onChange={(e) => set("gscSiteUrl", e.target.value)} placeholder="https://www.example.com/" /></Field>
              <Field label="Google Analytics 4 property ID"><Input value={data.ga4PropertyId} onChange={(e) => set("ga4PropertyId", e.target.value)} placeholder="123456789" /></Field>
              <Field label="Google Business Profile account ID"><Input value={data.gbpAccountId} onChange={(e) => set("gbpAccountId", e.target.value)} /></Field>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Generate your first pages</h3>
              <p className="text-xs text-muted-foreground">Pick which starter pages to AI-generate now. Each becomes a draft in your content library — you can edit, publish, or delete them after the wizard.</p>
              <div className="space-y-2">
                <GenRow label="Welcome blog" desc="Intro post for your dealership" checked={data.generate.welcomeBlog} onChange={() => toggleGen("welcomeBlog")} />
                <GenRow label="Financing overview" desc="Helps drivers understand your finance options" checked={data.generate.financingPage} onChange={() => toggleGen("financingPage")} />
                <GenRow label="Service explainer" desc="What sets your service department apart" checked={data.generate.servicePage} onChange={() => toggleGen("servicePage")} />
                <GenRow label="Local SEO city page" desc="Ranks you for searches in your city" checked={data.generate.cityPage} onChange={() => toggleGen("cityPage")} />
                <GenRow label="About us deep-dive" desc="The story behind your dealership" checked={data.generate.aboutBlog} onChange={() => toggleGen("aboutBlog")} />
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Each takes a few seconds. They land in <code className="font-mono">/dashboard/content</code> as drafts.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <Button variant="ghost" onClick={skip} disabled={pending} className="text-muted-foreground">Skip for now</Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={back} disabled={pending}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            )}
            {step < 4 ? (
              <Button variant="gradient" onClick={next} disabled={pending || (step === 1 && !data.name)}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="gradient" onClick={finish} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Finish setup
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function GenRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={cn(
      "flex items-center justify-between gap-3 rounded-md border p-3 cursor-pointer transition-colors",
      checked ? "border-brand-500 bg-brand-500/5" : "hover:border-brand-500/40"
    )}>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Pick black/white text for a hex bg — same logic as lib/site-theme. */
function getOnColor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#0B0D0F";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#0B0D0F" : "#ffffff";
}
