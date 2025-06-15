/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        red: "#00ff00",
        hierarchy: {
          s: "var(--hierarchy-s)",
          0: "var(--hierarchy-0)",
          1: "var(--hierarchy-1)",
          2: "var(--hierarchy-2)",
          3: "var(--hierarchy-3)",
        },
        panel: "var(--panel-color)",
        rose: {
          base: "var(--base)",
          surface: "var(--surface)",
          overlay: "var(--overlay)",
          muted: "var(--muted)",
          subtle: "var(--subtle)",
          text: "var(--text)",
          love: "var(--love)",
          gold: "var(--gold)",
          rose: "var(--rose)",
          pine: "var(--pine)",
          foam: "var(--foam)",
          iris: "var(--iris)",
        },
      },
      animation: {
        "spin-once": "spin 0.5s ease-in-out",
      },
    },
  },
  plugins: [],
};
