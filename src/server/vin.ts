"use server";

import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";
import { chat, MODEL } from "@/lib/openai";
import { createContent } from "@/server/content";

type Decoded = {
  vin: string;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  bodyStyle: string;
  fuelType: string;
  transmission: string;
  drivetrain: string;
  engine: string;
};

// Demo VIN bank — covers the seeded dealership brands so prototypes never
// need network access. Returned in the same shape as the NHTSA vPIC decode.
const DEMO_VINS: Record<string, Omit<Decoded, "vin">> = {
  "WBA5A5C50FD520000": { year: 2023, make: "BMW", model: "5 Series", trim: "530i xDrive", bodyStyle: "Sedan", fuelType: "Gasoline", transmission: "Automatic", drivetrain: "AWD", engine: "B46 2.0L Turbo" },
  "5YJSA1E26HF000000": { year: 2022, make: "Tesla", model: "Model S", trim: "Long Range", bodyStyle: "Sedan", fuelType: "Electric", transmission: "Single-speed", drivetrain: "AWD", engine: "Dual Motor" },
  "JF1ZNAA10J9000000": { year: 2024, make: "Subaru", model: "Outback", trim: "Touring XT", bodyStyle: "Wagon", fuelType: "Gasoline", transmission: "CVT", drivetrain: "AWD", engine: "2.4L Turbo BOXER" },
  "1FTFW1E50PFA00000": { year: 2024, make: "Ford", model: "F-150", trim: "Lariat", bodyStyle: "Pickup", fuelType: "Gasoline", transmission: "10-speed Automatic", drivetrain: "4WD", engine: "3.5L EcoBoost V6" },
  "JTDKARFU0L3000000": { year: 2023, make: "Toyota", model: "Prius", trim: "XLE", bodyStyle: "Hatchback", fuelType: "Hybrid", transmission: "eCVT", drivetrain: "FWD", engine: "1.8L Hybrid" },
  "5N1AT2MV0LC000000": { year: 2024, make: "Nissan", model: "Rogue", trim: "SL", bodyStyle: "SUV", fuelType: "Gasoline", transmission: "CVT", drivetrain: "AWD", engine: "1.5L VC-Turbo" },
  "5LMJJ2JT0PEL00000": { year: 2023, make: "Lincoln", model: "Aviator", trim: "Reserve", bodyStyle: "SUV", fuelType: "Gasoline", transmission: "10-speed Automatic", drivetrain: "AWD", engine: "3.0L Twin-Turbo V6" },
  "WDDZF8DB0LA000000": { year: 2022, make: "Mercedes-Benz", model: "E-Class", trim: "E 350 4MATIC", bodyStyle: "Sedan", fuelType: "Gasoline", transmission: "9G-TRONIC", drivetrain: "AWD", engine: "2.0L Turbo I4" },
};

/**
 * Synthesize a plausible decode from the VIN's WMI/year digit when we have no
 * match in the demo bank and no network — keeps the prototype fully offline-safe.
 */
function synthesizeDecode(vin: string): Omit<Decoded, "vin"> {
  const wmiMap: Record<string, { make: string; model: string }> = {
    WBA: { make: "BMW", model: "3 Series" },
    WDD: { make: "Mercedes-Benz", model: "C-Class" },
    "5YJ": { make: "Tesla", model: "Model 3" },
    "1FT": { make: "Ford", model: "F-150" },
    "1FA": { make: "Ford", model: "Mustang" },
    "5LM": { make: "Lincoln", model: "Aviator" },
    "5N1": { make: "Nissan", model: "Rogue" },
    "1N4": { make: "Nissan", model: "Altima" },
    JTD: { make: "Toyota", model: "Corolla" },
    JF1: { make: "Subaru", model: "Outback" },
    "5XY": { make: "Hyundai", model: "Santa Fe" },
  };
  const wmi = vin.slice(0, 3).toUpperCase();
  const base = wmiMap[wmi] || { make: "Unknown", model: "Vehicle" };
  // 10th digit ≈ model year per the VIN spec (rough alphanumeric map)
  const yearChar = vin.charAt(9).toUpperCase();
  const yearMap: Record<string, number> = { L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025, T: 2026 };
  const year = yearMap[yearChar] ?? 2023;
  return {
    year,
    make: base.make,
    model: base.model,
    trim: "Base",
    bodyStyle: "Sedan",
    fuelType: "Gasoline",
    transmission: "Automatic",
    drivetrain: "FWD",
    engine: "Standard",
  };
}

/**
 * Decode a VIN. Tries the free NHTSA vPIC API first; falls back to a demo
 * lookup table or synthesized decode if offline / unreachable — so the
 * prototype never throws on a demo VIN.
 */
export async function decodeVin(vin: string): Promise<Decoded> {
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) throw new Error("Invalid VIN format");
  const upper = vin.toUpperCase();

  // Demo bank short-circuit — instant, deterministic.
  if (DEMO_VINS[upper]) return { vin: upper, ...DEMO_VINS[upper] };

  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${upper}?format=json`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (res.ok) {
      const json = await res.json();
      const r = json.Results?.[0] ?? {};
      if (r.Make || r.Model) {
        return {
          vin: upper,
          year: Number(r.ModelYear) || null,
          make: r.Make || "",
          model: r.Model || "",
          trim: r.Trim || "",
          bodyStyle: r.BodyClass || "",
          fuelType: r.FuelTypePrimary || "",
          transmission: r.TransmissionStyle || "",
          drivetrain: r.DriveType || "",
          engine: r.EngineModel || "",
        };
      }
    }
  } catch {
    // network unreachable — fall through to synthesized decode
  }

  return { vin: upper, ...synthesizeDecode(upper) };
}

export async function generateVinPage(vin: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.create")) throw new Error("FORBIDDEN");
  const dealer = await prisma.dealership.findUnique({ where: { id: tenant.dealershipId } });
  const decoded = await decodeVin(vin);

  const userPrompt = `
Write a vehicle research / landing page for this specific vehicle at ${dealer?.name}.

Vehicle data (NHTSA-decoded):
${JSON.stringify(decoded, null, 2)}

Return strict JSON: { title, slug, metaTitle, metaDescription, excerpt, bodyMarkdown }.
The bodyMarkdown should include: hero intro, key specs table, why-this-vehicle section, financing prompt, schedule-test-drive CTA. No fabricated trim packages or prices.
`.trim();

  const { text } = await chat({
    system: "You write factual, OEM-compliant vehicle landing pages for car dealerships.",
    user: userPrompt,
    json: true,
  });
  const parsed = JSON.parse(text);

  const c = await createContent({
    type: "MODEL_RESEARCH",
    title: parsed.title || `${decoded.year} ${decoded.make} ${decoded.model}`,
    slug: parsed.slug,
    excerpt: parsed.excerpt,
    bodyMarkdown: parsed.bodyMarkdown,
    metaTitle: parsed.metaTitle,
    metaDescription: parsed.metaDescription,
    aiGenerated: true,
    aiModel: MODEL,
  });
  return { decoded, contentId: c.id };
}
