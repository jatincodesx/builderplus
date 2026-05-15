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
        background: "#FAFAFA",
        foreground: "#111827",
        primary: {
          DEFAULT: "#0B63CE",
          foreground: "#FFFFFF"
        },
        border: "#E5E7EB"
      },
      boxShadow: {
        glass: "0 8px 40px rgba(0, 0, 0, 0.06)",
        glow: "0 0 24px rgba(11, 99, 206, 0.18)",
        card: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.04)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "\"Segoe UI\"", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
