import { describe, it, expect } from "vitest";
import { siteThemeVars } from "@/lib/site-theme";

describe("siteThemeVars", () => {
  it("returns CSS variables for the dealership's primary color", () => {
    const vars = siteThemeVars({ primaryColor: "#1DB954", brand: "BMW" }) as any;
    expect(vars["--site-primary"]).toBe("#1DB954");
    expect(vars["--site-on-primary"]).toBeDefined();
    expect(vars["--site-primary-dark"]).toBeDefined();
  });

  it("falls back to the A3 green when no color is set", () => {
    const vars = siteThemeVars({ primaryColor: null, brand: null }) as any;
    expect(vars["--site-primary"]).toBe("#1DB954");
  });

  it("picks dark text on a light primary color", () => {
    const vars = siteThemeVars({ primaryColor: "#FFFFFF", brand: null }) as any;
    expect(vars["--site-on-primary"]).toBe("#0B0D0F");
  });

  it("picks white text on a dark primary color", () => {
    const vars = siteThemeVars({ primaryColor: "#0B0D0F", brand: null }) as any;
    expect(vars["--site-on-primary"]).toBe("#ffffff");
  });

  it("produces a darker shade for hover states", () => {
    const vars = siteThemeVars({ primaryColor: "#888888", brand: null }) as any;
    // Quick sanity check: the dark variant is a different hex than the original.
    expect(vars["--site-primary-dark"]).not.toBe("#888888");
  });
});
