// Block schema for the visual page builder.
// Each block is a discriminated union; renderers live in components/blocks.
import { nanoid } from "nanoid";

export type BlockType =
  | "hero"
  | "cta"
  | "inventory"
  | "financing"
  | "service"
  | "faq"
  | "richText"
  | "offers"
  | "testimonials"
  | "stats"
  | "imageGrid"
  | "embed";

export type Block =
  | { id: string; type: "hero"; props: { eyebrow?: string; headline: string; subheadline?: string; ctaLabel?: string; ctaHref?: string; imageUrl?: string; align?: "left" | "center" } }
  | { id: string; type: "cta"; props: { headline: string; subheadline?: string; ctaLabel: string; ctaHref: string; variant?: "default" | "split" | "stacked" } }
  | { id: string; type: "inventory"; props: { headline: string; subheadline?: string; brand?: string; bodyStyle?: string; limit?: number } }
  | { id: string; type: "financing"; props: { headline: string; bullets: string[]; ctaLabel?: string; ctaHref?: string } }
  | { id: string; type: "service"; props: { headline: string; services: { name: string; description: string }[] } }
  | { id: string; type: "faq"; props: { headline: string; items: { q: string; a: string }[] } }
  | { id: string; type: "richText"; props: { markdown: string } }
  | { id: string; type: "offers"; props: { headline: string; limit?: number } }
  | { id: string; type: "testimonials"; props: { headline: string; items: { quote: string; author: string; rating?: number }[] } }
  | { id: string; type: "stats"; props: { items: { label: string; value: string }[] } }
  | { id: string; type: "imageGrid"; props: { images: { url: string; alt?: string }[] } }
  | { id: string; type: "embed"; props: { html: string } };

export type BlockCategory = "Hero" | "Conversion" | "Automotive" | "Content" | "Social proof" | "Media";

export const BLOCK_LIBRARY: { type: BlockType; label: string; description: string; emoji: string; category: BlockCategory; keywords?: string; defaults: () => Block }[] = [
  { type: "hero", label: "Hero", description: "Banner with headline + CTA", emoji: "✨", category: "Hero", keywords: "banner top headline",
    defaults: () => ({ id: nanoid(8), type: "hero", props: { eyebrow: "Featured", headline: "Find your next vehicle today", subheadline: "Browse our latest inventory and exclusive offers.", ctaLabel: "Shop now", ctaHref: "/inventory", align: "center" } }) },
  { type: "cta", label: "CTA", description: "Conversion call-to-action", emoji: "🎯", category: "Conversion", keywords: "button action convert",
    defaults: () => ({ id: nanoid(8), type: "cta", props: { headline: "Ready to schedule service?", ctaLabel: "Book online", ctaHref: "/service" } }) },
  { type: "inventory", label: "Inventory grid", description: "Live inventory feed", emoji: "🚗", category: "Automotive", keywords: "cars vehicles vdp",
    defaults: () => ({ id: nanoid(8), type: "inventory", props: { headline: "Featured inventory", limit: 6 } }) },
  { type: "financing", label: "Financing", description: "Finance value props", emoji: "💳", category: "Conversion", keywords: "credit loan apply",
    defaults: () => ({ id: nanoid(8), type: "financing", props: { headline: "Financing made simple", bullets: ["Apply in 60 seconds", "All credit considered", "Lock in today's rates"], ctaLabel: "Apply now", ctaHref: "/finance" } }) },
  { type: "service", label: "Service menu", description: "Service offerings", emoji: "🔧", category: "Automotive", keywords: "repair maintenance shop",
    defaults: () => ({ id: nanoid(8), type: "service", props: { headline: "Service menu", services: [
      { name: "Oil change", description: "Multi-point inspection included" },
      { name: "Brake service", description: "Pads, rotors, and inspection" },
      { name: "Tire rotation", description: "Free with any service" },
    ] } }) },
  { type: "faq", label: "FAQ", description: "Schema-ready Q&A", emoji: "❓", category: "Content", keywords: "questions answers schema",
    defaults: () => ({ id: nanoid(8), type: "faq", props: { headline: "Frequently asked questions", items: [
      { q: "Do you offer financing?", a: "Yes — apply online in under a minute." },
      { q: "Is your service center certified?", a: "All technicians are factory-trained and certified." },
    ] } }) },
  { type: "richText", label: "Rich text", description: "Markdown block", emoji: "📝", category: "Content", keywords: "markdown copy paragraph",
    defaults: () => ({ id: nanoid(8), type: "richText", props: { markdown: "## Section heading\n\nWrite your copy here. Supports **bold**, *italics*, and [links](/)." } }) },
  { type: "offers", label: "Offers", description: "Active lease/finance offers", emoji: "🏷️", category: "Automotive", keywords: "lease finance specials",
    defaults: () => ({ id: nanoid(8), type: "offers", props: { headline: "Current offers", limit: 4 } }) },
  { type: "testimonials", label: "Testimonials", description: "Social proof block", emoji: "⭐", category: "Social proof", keywords: "reviews quotes customers",
    defaults: () => ({ id: nanoid(8), type: "testimonials", props: { headline: "What our customers say", items: [
      { quote: "Best dealership experience I've ever had.", author: "Sarah M.", rating: 5 },
      { quote: "Service team is top-tier.", author: "James L.", rating: 5 },
    ] } }) },
  { type: "stats", label: "Stats", description: "Trust indicators", emoji: "📊", category: "Social proof", keywords: "numbers metrics counter",
    defaults: () => ({ id: nanoid(8), type: "stats", props: { items: [
      { label: "Vehicles sold", value: "12,000+" },
      { label: "5-star reviews", value: "2,400+" },
      { label: "Years in business", value: "45" },
    ] } }) },
  { type: "imageGrid", label: "Image grid", description: "Photo gallery", emoji: "🖼️", category: "Media", keywords: "photos gallery images",
    defaults: () => ({ id: nanoid(8), type: "imageGrid", props: { images: [] } }) },
  { type: "embed", label: "Embed", description: "Custom HTML / iframe", emoji: "🔗", category: "Media", keywords: "iframe video script",
    defaults: () => ({ id: nanoid(8), type: "embed", props: { html: "<!-- paste an embed code here -->" } }) },
];

export function duplicateBlock(b: Block): Block {
  // Deep-clone props + new id. Preserves discriminated-union type.
  return { ...b, id: nanoid(8), props: JSON.parse(JSON.stringify((b as any).props)) } as Block;
}

export function newBlock(type: BlockType): Block {
  const def = BLOCK_LIBRARY.find((b) => b.type === type);
  if (!def) throw new Error("Unknown block type");
  return def.defaults();
}
