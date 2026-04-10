import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f0ff",
          100: "#ede0ff",
          200: "#dcc4ff",
          300: "#c39eff",
          400: "#a570ff",
          500: "#8b3dff",
          600: "#7824f0",
          700: "#651bc8",
          800: "#5419a1",
          900: "#451883"
        }
      },
      fontFamily: {
        sans: ["Lato", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
