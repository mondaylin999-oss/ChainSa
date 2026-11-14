import type { Config } from "tailwindcss";

// Colour tokens copied from the Myanmar EarthLens demo build so the widget matches the site.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ocean: { 300: "#7cc7ff", 400: "#4aaeff", 500: "#2b8fe8", 600: "#1d6fc0" },
        leaf: { 300: "#8ae6b0", 400: "#4fd18b", 500: "#2fb070" },
        ember: { 400: "#ff8a4c", 500: "#f2672a" },
        abyss: { 900: "#0a1426", 950: "#050b18" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mm: ["var(--font-mm)", "sans-serif"],
      },
      keyframes: {
        pulsering: { "0%": { transform: "scale(.9)", opacity: ".7" }, "100%": { transform: "scale(1.6)", opacity: "0" } },
      },
      animation: { pulsering: "pulsering 1.8s ease-out infinite" },
    },
  },
  plugins: [],
};
export default config;
