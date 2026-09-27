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
        brand: {
          DEFAULT: "#9945FF",
          dark: "#7B2FBE",
          light: "#C77DFF",
        },
        surface: {
          DEFAULT: "#0F0F1A",
          card: "#1A1A2E",
          border: "#2A2A4A",
        },
      },
    },
  },
  plugins: [],
};

export default config;
