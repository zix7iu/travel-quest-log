import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "strawberry-milk": "#FFF5F7",
        lavender: {
          100: "#F5F0FF",
          200: "#E8DEFF",
          300: "#D4C5F9",
          400: "#B8A0E8",
          500: "#9B7EDE",
        },
        "pink-quest": "#FF69B4",
        "pink-bright": "#FF85C1",
        "coral-remove": "#FF7F7F",
      },
      fontFamily: {
        pixel: ["var(--font-press-start-2p)", "monospace"],
      },
      boxShadow: {
        pixel: "4px 4px 0 0 rgba(0,0,0,0.2)",
        "pixel-sm": "2px 2px 0 0 rgba(0,0,0,0.2)",
        "pixel-lg": "6px 6px 0 0 rgba(0,0,0,0.2)",
        "pixel-window": "inset 0 2px 12px rgba(255, 105, 180, 0.15)",
      },
      borderWidth: {
        pixel: "4px",
      },
    },
  },
  plugins: [],
};
export default config;
