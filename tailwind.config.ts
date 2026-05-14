import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#050B18",
        foreground: "#F8FAFC",
        primary: {
          DEFAULT: "#0B63CE",
          foreground: "#FFFFFF"
        },
        border: "rgba(255,255,255,0.12)"
      },
      boxShadow: {
        glass: "0 24px 80px rgba(0, 0, 0, 0.45)",
        glow: "0 0 40px rgba(11, 99, 206, 0.35)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
