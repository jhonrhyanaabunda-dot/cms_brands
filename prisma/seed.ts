import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

const BRAND_COLOR = {
  BMW: "#1c69d4",
  MERCEDES_BENZ: "#00adef",
  SUBARU: "#003da5",
  NISSAN: "#c3002f",
  FORD: "#003478",
  LINCOLN: "#324158",
  TOYOTA: "#eb0a1e",
  HONDA: "#cc0000",
} as const;

async function main() {
  console.log("🌱 Seeding A3 CMS demo data…");

  const passwordHash = await bcrypt.hash("password123", 10);

  // Users
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@a3brands.com" },
    update: {},
    create: { email: "admin@a3brands.com", name: "A3 Super Admin", isSuperAdmin: true, passwordHash },
  });
  const seoMgr = await prisma.user.upsert({
    where: { email: "seo@a3brands.com" },
    update: {},
    create: { email: "seo@a3brands.com", name: "Maya SEO", passwordHash },
  });
  const contentMgr = await prisma.user.upsert({
    where: { email: "content@a3brands.com" },
    update: {},
    create: { email: "content@a3brands.com", name: "Jordan Writer", passwordHash },
  });
  const dealerClient = await prisma.user.upsert({
    where: { email: "gm@bmwofsouthatlanta.com" },
    update: {},
    create: { email: "gm@bmwofsouthatlanta.com", name: "Riley (GM)", passwordHash },
  });

  // Real A3 Brands rooftops (cities/phones are best-effort; edit in /dashboard/settings).
  const dealerships = [
    {
      slug: "bmw-of-south-atlanta",
      name: "BMW of South Atlanta",
      brand: "BMW",
      city: "Union City", state: "GA", zip: "30291",
      phone: "(770) 692-0001",
      email: "hello@bmwofsouthatlanta.com",
      domain: "www.bmwofsouthatlanta.com",
    },
    {
      slug: "subaru-of-las-vegas",
      name: "Subaru of Las Vegas",
      brand: "SUBARU",
      city: "Las Vegas", state: "NV", zip: "89118",
      phone: "(702) 495-2100",
      email: "hello@subaruoflasvegas.com",
      domain: "www.subaruoflasvegas.com",
    },
    {
      slug: "findlay-subaru-prescott",
      name: "Findlay Subaru Prescott",
      brand: "SUBARU",
      city: "Prescott", state: "AZ", zip: "86301",
      phone: "(928) 277-3500",
      email: "hello@findlaysubaruprescott.com",
      domain: "www.findlaysubaruprescott.com",
    },
    {
      slug: "big-nissan-i90",
      name: "Big Nissan I-90",
      brand: "NISSAN",
      city: "Elyria", state: "OH", zip: "44035",
      phone: "(440) 365-7700",
      email: "hello@bignissani90.com",
      domain: "www.bignissani90.com",
    },
    {
      slug: "parks-lincoln",
      name: "Parks Lincoln",
      brand: "LINCOLN",
      city: "Wesley Chapel", state: "FL", zip: "33544",
      phone: "(813) 778-8888",
      email: "hello@parkslincoln.com",
      domain: "www.parkslincoln.com",
    },
  ];

  for (const d of dealerships) {
    const dealership = await prisma.dealership.upsert({
      where: { slug: d.slug },
      update: {},
      create: { ...d, primaryColor: BRAND_COLOR[d.brand as keyof typeof BRAND_COLOR] ?? "#1DB954", gscSiteUrl: `https://${d.slug}.com`, ga4PropertyId: `properties/${100000 + Math.floor(Math.random()*99999)}`, gbpAccountId: `accounts/${nanoid(8)}` },
    });

    // Memberships
    await prisma.membership.upsert({
      where: { userId_dealershipId: { userId: superAdmin.id, dealershipId: dealership.id } },
      update: {},
      create: { userId: superAdmin.id, dealershipId: dealership.id, role: "SUPER_ADMIN" },
    });
    await prisma.membership.upsert({
      where: { userId_dealershipId: { userId: seoMgr.id, dealershipId: dealership.id } },
      update: {},
      create: { userId: seoMgr.id, dealershipId: dealership.id, role: "SEO_MANAGER" },
    });
    await prisma.membership.upsert({
      where: { userId_dealershipId: { userId: contentMgr.id, dealershipId: dealership.id } },
      update: {},
      create: { userId: contentMgr.id, dealershipId: dealership.id, role: "CONTENT_MANAGER" },
    });
    if (d.slug === "bmw-of-south-atlanta") {
      await prisma.membership.upsert({
        where: { userId_dealershipId: { userId: dealerClient.id, dealershipId: dealership.id } },
        update: {},
        create: { userId: dealerClient.id, dealershipId: dealership.id, role: "DEALER_CLIENT" },
      });
    }

    const brandLabel = (d.brand ?? "BMW").replace("_", "-");

    // Sample content (createMany is OK on sqlite for simple fields; we use create for unique slug control)
    await prisma.content.create({ data: {
      dealershipId: dealership.id, authorId: contentMgr.id,
      type: "BLOG", title: `Why Service at ${dealership.name}`, slug: `why-service-${dealership.slug}`,
      excerpt: "Certified service, OEM parts, and faster turnaround — here's why our service center beats the alternatives.",
      bodyMarkdown: BLOG_BODY(dealership.name),
      metaTitle: `Service at ${dealership.name} — Certified Technicians`,
      metaDescription: `Schedule certified service at ${dealership.name} in ${d.city}. OEM parts, loaner vehicles, and transparent pricing.`,
      keywords: JSON.stringify(["service", "dealer service", "certified technicians", d.city.toLowerCase()]),
      status: "PUBLISHED", publishedAt: new Date(), aiGenerated: true, aiModel: "gpt-4o-mini", seoScore: 86,
    }});

    await prisma.content.create({ data: {
      dealershipId: dealership.id, authorId: seoMgr.id,
      type: "CITY_PAGE", title: `${brandLabel} Lease Offers in ${d.city}`, slug: `lease-offers-${d.city.toLowerCase()}`,
      excerpt: `Current lease offers at ${dealership.name} for ${d.city} drivers.`,
      bodyMarkdown: CITY_BODY(dealership.name, d.city, brandLabel),
      metaTitle: `${brandLabel} Lease Offers in ${d.city} — ${dealership.name}`,
      metaDescription: `See current ${brandLabel} lease offers at ${dealership.name} in ${d.city}, ${d.state}.`,
      status: "PUBLISHED", publishedAt: new Date(),
      targetCity: d.city, targetState: d.state, targetKeyword: `${brandLabel} lease offers ${d.city}`,
      seoScore: 78,
    }});

    await prisma.content.create({ data: {
      dealershipId: dealership.id, authorId: contentMgr.id,
      type: "GBP_POST", title: "End-of-month service special", slug: `gbp-${nanoid(6)}`,
      bodyMarkdown: `🔧 End-of-month service deal at ${dealership.name}! Oil change + multi-point inspection for less. Schedule today — slots fill fast.`,
      status: "PUBLISHED", publishedAt: new Date(), aiGenerated: true,
    }});

    await prisma.content.create({ data: {
      dealershipId: dealership.id, authorId: seoMgr.id,
      type: "LANDING_PAGE", title: "New & Pre-Owned Inventory", slug: "inventory",
      excerpt: "Browse our latest inventory of new and certified pre-owned vehicles.",
      bodyMarkdown: "## Our inventory\n\nNew, used, and certified pre-owned vehicles updated daily.",
      status: "DRAFT",
    }});

    await prisma.content.create({ data: {
      dealershipId: dealership.id, authorId: seoMgr.id,
      type: "SERVICE_PAGE", title: "Schedule Service Online", slug: "service",
      bodyMarkdown: "## Service made simple\n\nUse our online scheduler to book your next appointment in under 60 seconds.",
      status: "IN_REVIEW",
    }});

    // Home page (PageNode) with starter blocks
    const homeBlocks = [
      { id: nanoid(8), type: "hero", props: {
        eyebrow: "Welcome to", headline: dealership.name,
        subheadline: `${brandLabel} sales, service, and financing in ${d.city}.`,
        ctaLabel: "Shop inventory", ctaHref: "/inventory", align: "center",
      }},
      { id: nanoid(8), type: "stats", props: { items: [
        { label: "Vehicles sold", value: "12,400+" },
        { label: "5-star reviews", value: "2,800+" },
        { label: "Years in business", value: "47" },
      ]}},
      { id: nanoid(8), type: "inventory", props: { headline: "Featured inventory", brand: d.brand, limit: 6 } },
      { id: nanoid(8), type: "service", props: { headline: "Service menu", services: [
        { name: "Oil change", description: "Multi-point inspection included." },
        { name: "Brake service", description: "Pads, rotors, and inspection." },
        { name: "Tire rotation", description: "Free with most service visits." },
      ]}},
      { id: nanoid(8), type: "testimonials", props: { headline: "What customers say", items: [
        { quote: `Best ${brandLabel} buying experience I've had.`, author: "Sarah M.", rating: 5 },
        { quote: "Service team is honest and fast.", author: "James L.", rating: 5 },
      ]}},
      { id: nanoid(8), type: "cta", props: { headline: "Ready to schedule service?", ctaLabel: "Book online", ctaHref: "/service" } },
    ];
    await prisma.pageNode.upsert({
      where: { dealershipId_path: { dealershipId: dealership.id, path: "/" } },
      update: {},
      create: {
        dealershipId: dealership.id, path: "/", title: `${dealership.name} — Home`, published: true,
        blocks: JSON.stringify(homeBlocks),
      },
    });

    // Sample offers + inventory
    await prisma.offer.create({ data: {
      dealershipId: dealership.id, headline: `${brandLabel} 3-Series Lease`, subheadline: "From $499/mo",
      monthlyPayment: 499, apr: 4.9, termMonths: 36, oemBrand: d.brand, model: "3 Series",
      disclaimer: "Closed-end lease, 7,500 miles/year. With approved credit.",
    }});
    await prisma.offer.create({ data: {
      dealershipId: dealership.id, headline: `${brandLabel} Service Special`, subheadline: "$59.95 oil change + inspection",
      disclaimer: "Most makes. Plus tax & disposal.",
    }});

    for (let i = 0; i < 6; i++) {
      await prisma.inventoryItem.create({ data: {
        dealershipId: dealership.id,
        vin: `WBA${(Math.floor(Math.random() * 1e13)).toString().padStart(14, "0")}`.slice(0, 17),
        year: 2024, make: brandLabel, model: `Model ${i + 1}`, trim: "Premium",
        mileage: 50 + i * 100, price: 38000 + i * 5000, stockNumber: `A${1000 + i}`,
        status: "AVAILABLE",
      }});
    }

    await prisma.activity.create({
      data: { dealershipId: dealership.id, userId: contentMgr.id, action: `Welcome to ${dealership.name} workspace` },
    });
  }

  console.log("✅ Seed complete.");
  console.log("");
  console.log("Demo users:");
  console.log("  admin@a3brands.com   / password123 (Super Admin — sees all dealerships)");
  console.log("  seo@a3brands.com     / password123 (SEO Manager)");
  console.log("  content@a3brands.com / password123 (Content Manager)");
  console.log("  gm@bmwofsouthatlanta.com / password123 (Dealer Client — BMW of South Atlanta only)");
}

const BLOG_BODY = (name: string) => `## Why service at ${name}?

When it comes to keeping your vehicle running safely and reliably, the dealership service experience makes a real difference. Our factory-trained technicians know your specific model inside and out.

## What's included

- Multi-point inspection performed by certified technicians
- OEM parts and fluids
- Loaner vehicles for major service
- Transparent pricing

## Schedule today

Use our [online scheduler](/service) and we'll handle the rest.

## Frequently asked

**Do I need to use a dealer for service?**
Using OEM-certified service helps preserve warranty coverage and ensures the technicians know your exact vehicle.

**How often should I service my car?**
Most modern vehicles using synthetic oil need an oil change every 5,000–7,500 miles.

**Can I get a loaner?**
Loaner vehicles are available for major service appointments — call ahead to confirm availability.
`;

const CITY_BODY = (name: string, city: string, brand: string) => `## ${brand} lease offers near ${city}

${name} proudly serves ${city} drivers with the latest ${brand} lease offers. Our finance team is built to make the process simple.

## Why lease at ${name}?

- Direct OEM lease incentives
- Loyalty programs for returning customers
- Express financing in under an hour

## See current offers

Check our [current offers page](/offers) for live ${brand} lease specials updated weekly.

## Common questions

**How does leasing work?**
Leasing is essentially a long-term rental of a new vehicle, with a fixed monthly payment based on the vehicle's depreciation over the lease term.

**What if I drive too many miles?**
Standard leases include 10,000–12,000 miles/year, with options for higher tiers if needed.

**Can I buy out my lease?**
Yes — most leases include a purchase option at lease-end based on the residual value.
`;

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
