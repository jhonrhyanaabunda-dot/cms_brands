import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // A3 brand palette — emerald-driven.
        // Keep `brand-*` tokens so existing `bg-brand-500`, `text-brand-500`,
        // etc. classes throughout the app pick up the new colors automatically.
        brand: {
          50:  "#E8FBEE",
          100: "#C9F5D6",
          200: "#94EAAE",
          300: "#5EE085",
          400: "#37D366",
          500: "#1DB954", // A3 Emerald (canonical)
          600: "#16A046",
          700: "#0F8437",
          800: "#0B6929",
          900: "#08501F",
        },
        // A3 dark scale — charcoal + navy
        charcoal: {
          DEFAULT: "#2C3038",
          50: "#F0F1F3",
          100: "#E5E7EB",
          200: "#C8CCD3",
          300: "#8A919C",
          400: "#5A6170",
          500: "#2C3038",
          600: "#1A1D24",
          700: "#111214",
          800: "#0B0D0F",
          900: "#050510",
        },
      },
      borderRadius: {
        // A3 scale: 0 (sections) · 4 (badges) · 8 (inputs) · 16 (cards) · 50px (CTA pills)
        none: "0px",
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "var(--radius)", // 16px default
        xl: "20px",
        "2xl": "24px",
        pill: "9999px",
      },
      boxShadow: {
        // A3 elevation tokens
        subtle: "rgba(0,0,0,0.08) 0px 4px 16px 0px",
        raised: "rgba(0,0,0,0.12) 0px 8px 24px 0px",
        elevated: "rgba(0,0,0,0.3) 0px 4px 30px 0px",
        floating: "rgba(29,185,84,0.30) 0px 4px 24px 0px",
        "floating-sm": "rgba(29,185,84,0.20) 0px 2px 8px 0px",
        "floating-lg": "rgba(29,185,84,0.40) 0px 6px 28px 0px",
        deep: "rgba(0,0,0,0.12) 0px 30px 80px 0px, rgba(0,0,0,0.06) 0px 8px 24px 0px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["var(--font-sans)", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontWeight: {
        // Allow the heaviest weight Sora ships
        black: "900",
      },
      letterSpacing: {
        tightest: "-0.02em",
        display: "0.02em",  // A3 H1
        h2: "0.015em",      // A3 H2
        label: "0.05em",    // A3 small-caps badges
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "rgba(29,185,84,0.30) 0px 4px 24px 0px" },
          "50%":      { boxShadow: "rgba(29,185,84,0.45) 0px 6px 32px 0px" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.5s infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
