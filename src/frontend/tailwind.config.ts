import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        command: {
          navy: "#10233D",
          panel: "#F4F7FB",
          blue: "#2563EB",
          teal: "#0891B2",
          green: "#059669",
          amber: "#D97706",
          danger: "#DC2626"
        }
      },
      boxShadow: {
        card: "0 10px 28px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
} satisfies Config;

