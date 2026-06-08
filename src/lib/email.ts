// Email notifications via Resend. Works in three modes:
//
//   1. `RESEND_API_KEY` set + `RESEND_FROM` set → real send via Resend's REST API
//   2. No keys but `NEXT_PUBLIC_APP_URL` set     → logs the payload to the console
//      (the app stays useful for demos without any external setup)
//   3. Errors never propagate to the caller — leads should still save even if
//      the inbox is misconfigured.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM    = process.env.RESEND_FROM || "noreply@a3cms.demo";

export const emailEnabled = !!RESEND_API_KEY;

type SendInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail({ to, subject, html, replyTo }: SendInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  // Demo mode — log + return ok so we can verify the flow without a key.
  if (!RESEND_API_KEY) {
    console.log("[email:demo]", { to, subject, replyTo, htmlPreview: html.slice(0, 200) });
    return { ok: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const error = await res.text();
      console.error("[email] Resend error:", res.status, error);
      return { ok: false, error: `${res.status}: ${error.slice(0, 200)}` };
    }
    const json = await res.json();
    return { ok: true, id: json.id };
  } catch (e: any) {
    console.error("[email] send failed:", e);
    return { ok: false, error: e?.message ?? "send failed" };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Templates — keep them inline for now; switch to React Email or a proper
// templating system once we have more than ~5 templates.
// ─────────────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = {
  contact:   "Contact form",
  testdrive: "Test-drive request",
  finance:   "Finance pre-qualification",
};

export function leadNotificationHtml(input: {
  dealerName: string;
  appUrl: string;
  lead: {
    id: string;
    kind: string;
    name: string;
    email: string;
    phone: string | null;
    vehicleInterest: string | null;
    message: string | null;
    source: string | null;
  };
}): { subject: string; html: string } {
  const { dealerName, appUrl, lead } = input;
  const kindLabel = KIND_LABEL[lead.kind] ?? lead.kind;
  const dashboardUrl = `${appUrl}/dashboard/leads`;
  return {
    subject: `New ${kindLabel.toLowerCase()} from ${lead.name}`,
    html: `
      <div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0B0D0F;">
        <div style="background:#1DB954;color:#0B0D0F;padding:18px 24px;border-radius:8px 8px 0 0;">
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;">New lead · ${dealerName}</div>
          <div style="font-size:22px;font-weight:900;margin-top:6px;">${escapeHtml(lead.name)} · ${kindLabel}</div>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#666;width:140px;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a></td></tr>
            ${lead.phone           ? `<tr><td style="padding:6px 0;color:#666;">Phone</td><td style="padding:6px 0;"><a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a></td></tr>` : ""}
            ${lead.vehicleInterest ? `<tr><td style="padding:6px 0;color:#666;">Vehicle</td><td style="padding:6px 0;">${escapeHtml(lead.vehicleInterest)}</td></tr>` : ""}
            ${lead.message         ? `<tr><td style="padding:6px 0;color:#666;vertical-align:top;">Message</td><td style="padding:6px 0;white-space:pre-wrap;">${escapeHtml(lead.message)}</td></tr>` : ""}
            ${lead.source          ? `<tr><td style="padding:6px 0;color:#666;">Source</td><td style="padding:6px 0;font-family:monospace;font-size:12px;">${escapeHtml(lead.source)}</td></tr>` : ""}
          </table>
          <div style="margin-top:24px;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#1DB954;color:#0B0D0F;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;">Open in dashboard</a>
          </div>
        </div>
      </div>`,
  };
}

export function reviewEscalationHtml(input: {
  dealerName: string;
  appUrl: string;
  review: { id: string; authorName: string; rating: number; body: string };
}): { subject: string; html: string } {
  const { dealerName, appUrl, review } = input;
  const dashboardUrl = `${appUrl}/dashboard/reviews`;
  return {
    subject: `[Escalation] ${review.rating}★ review from ${review.authorName}`,
    html: `
      <div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0B0D0F;">
        <div style="background:#ef4444;color:#ffffff;padding:18px 24px;border-radius:8px 8px 0 0;">
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;">Review escalation · ${dealerName}</div>
          <div style="font-size:22px;font-weight:900;margin-top:6px;">${review.rating}★ from ${escapeHtml(review.authorName)}</div>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 14px;font-size:14px;line-height:1.5;background:#fef2f2;border-left:3px solid #ef4444;padding:12px 14px;">${escapeHtml(review.body)}</p>
          <p style="margin:0;font-size:13px;color:#666;">Reply quickly — a fast, public response from your team can often turn a low-star review into a recovered customer.</p>
          <div style="margin-top:18px;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#0B0D0F;color:#ffffff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;">Open review center</a>
          </div>
        </div>
      </div>`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
