import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";

export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await requireTenant();
  const c = await prisma.content.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
  if (!c) notFound();
  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="mb-4 text-xs text-amber-500 border border-amber-500/50 bg-amber-500/10 rounded px-3 py-2 inline-block">
        Preview · status: {c.status.toLowerCase()}
      </div>
      <h1 className="text-4xl font-semibold">{c.title}</h1>
      {c.excerpt && <p className="text-lg text-muted-foreground mt-2">{c.excerpt}</p>}
      <div
        className="mt-6 text-sm leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_a]:text-brand-500 [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: simpleMd(c.bodyMarkdown ?? "") }}
      />
    </main>
  );
}

function simpleMd(s: string) {
  return s
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/^(?!<)/gm, "<p>");
}
