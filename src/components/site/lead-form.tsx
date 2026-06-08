"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { submitLead } from "@/server/leads";

type Kind = "contact" | "testdrive" | "finance";

/**
 * Public-site lead form, shared by the contact / test-drive / finance
 * blocks. The block decides which extra fields to show; this component
 * handles submit + validation + success state.
 */
export function LeadForm({
  dealershipId,
  kind,
  ctaLabel = "Submit",
  showVehicle = false,
}: {
  dealershipId: string;
  kind: Kind;
  ctaLabel?: string;
  showVehicle?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleInterest, setVehicleInterest] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        await submitLead({
          dealershipId,
          kind,
          name,
          email,
          phone: phone || undefined,
          vehicleInterest: showVehicle && vehicleInterest ? vehicleInterest : undefined,
          message: message || undefined,
          source: typeof window !== "undefined" ? window.location.pathname : undefined,
        });
        setSent(true);
        toast.success("Got it — we'll be in touch shortly.");
      } catch (e: any) {
        toast.error(e?.message ?? "Submit failed");
      }
    });
  }

  if (sent) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center space-y-3">
        <div
          className="mx-auto h-12 w-12 rounded-full grid place-items-center"
          style={{ backgroundColor: "var(--site-primary)", color: "var(--site-on-primary)" }}
        >
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="font-semibold text-lg">Thanks, {name.split(" ")[0] || "we got it"}!</div>
        <p className="text-sm text-muted-foreground">A team member will reach out by phone or email shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-card p-6 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} className="form-input" />
        </Field>
        <Field label="Email">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" />
        </Field>
      </div>
      <Field label="Phone (optional)">
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" placeholder="(555) 555-5555" />
      </Field>
      {showVehicle && (
        <Field label={kind === "testdrive" ? "Vehicle of interest" : "Vehicle interest (optional)"}>
          <input
            required={kind === "testdrive"}
            value={vehicleInterest}
            onChange={(e) => setVehicleInterest(e.target.value)}
            className="form-input"
            placeholder="e.g. 2026 BMW 330i"
          />
        </Field>
      )}
      <Field label={kind === "finance" ? "Anything we should know? (employment, target payment, etc.)" : "Message"}>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="form-input"
          placeholder={kind === "testdrive" ? "Best time to come in, trade-in details, etc." : ""}
        />
      </Field>
      <p className="text-[10px] text-muted-foreground">
        By submitting you agree to be contacted by phone, email, or text. Standard rates may apply. Soft credit pulls do not impact your score.
      </p>
      <button
        type="submit"
        disabled={pending || !name || !email}
        className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 w-full sm:w-auto text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        style={{ backgroundColor: "var(--site-primary)", color: "var(--site-on-primary)" }}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {ctaLabel}
      </button>
      <style>{`
        .form-input {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border-radius: 8px;
          border: 1px solid hsl(var(--border));
          background: transparent;
          color: inherit;
          font-size: 14px;
          outline: none;
        }
        .form-input:focus { border-color: var(--site-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--site-primary) 25%, transparent); }
        textarea.form-input { min-height: 96px; padding: 10px 12px; line-height: 1.4; }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
