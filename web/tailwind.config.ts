import type { Config } from "tailwindcss";

// Brand tokens (docs/brand): dark, strict, dense. Use these names, not raw hex, in components.
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#070B14",
        surface: { DEFAULT: "#0E1626", 2: "#131D31" },
        line: "#2A3448",
        silver: { 1: "#F3F6FB", 2: "#B7C1D1", 3: "#6D7787" },
        accent: { from: "#6FE6FF", to: "#1F7DFF", DEFAULT: "#4FB3FF" },
        warn: "#FFB04A",
        crit: "#FF5A4A",
        ok: "#3DDC97",
      },
      fontFamily: {
        sans: ["Inter Variable", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono Variable", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      backgroundImage: {
        "accent-grad": "linear-gradient(90deg, #6FE6FF 0%, #1F7DFF 100%)",
      },
      maxWidth: { page: "1200px" },
    },
  },
  plugins: [],
};

export default config;
