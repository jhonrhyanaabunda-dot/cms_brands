import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Per-dealership OG image. Renders the dealership name + city/state on a
 * gradient using the tenant's primary color. Falls back to A3 green for
 * dealerships without a custom color.
 */
export default async function OgImage({ params }: { params: { slug: string } }) {
  const d = await prisma.dealership.findUnique({ where: { slug: params.slug } });
  const primary = d?.primaryColor || "#1DB954";
  const name = d?.name ?? "A3 CMS";
  const location = [d?.city, d?.state].filter(Boolean).join(", ");
  const brand = d?.brand?.replace(/_/g, " ") ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: `linear-gradient(135deg, ${primary}, #0B0D0F)`,
          color: "#ffffff",
          fontFamily: "-apple-system, system-ui, sans-serif",
        }}
      >
        {brand && (
          <div
            style={{
              fontSize: 24,
              letterSpacing: 6,
              textTransform: "uppercase",
              fontWeight: 700,
              opacity: 0.85,
            }}
          >
            {brand}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 900,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            {name}
          </div>
          {location && (
            <div style={{ fontSize: 32, opacity: 0.8 }}>{location}</div>
          )}
        </div>
        <div
          style={{
            fontSize: 20,
            letterSpacing: 6,
            opacity: 0.6,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Powered by A3 CMS
        </div>
      </div>
    ),
    { ...size },
  );
}
