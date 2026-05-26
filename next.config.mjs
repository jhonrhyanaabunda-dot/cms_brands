/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ship browser source maps in production so React errors point at real
  // file:line rather than minified shortcuts. Small bundle-size cost, big
  // diagnostic win for one-off Vercel-only failures.
  productionBrowserSourceMaps: true,
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  // Ensure the bundled demo SQLite + the Prisma engine ship with serverless
  // functions on Vercel. Without this Next won't trace the .db file.
  outputFileTracingIncludes: {
    "/**/*": [
      "./prisma/dev.db",
      "./prisma/schema.prisma",
      "./node_modules/.prisma/client/**",
      "./node_modules/@prisma/client/**",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
