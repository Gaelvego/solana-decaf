import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        aquamarine: "#5DF1B3",
        "pale-azure": "#7DD2FD",
        "prussian-blue": "#002940",
      },
    },
  },
  plugins: [],
} satisfies Config;
