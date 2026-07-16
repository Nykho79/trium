/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        void: "#03070d",
        graphite: "#0b1420",
        cyan: "#27d9f2",
        amber: "#ffb020",
        magenta: "#ff4f9a",
      },
    },
  },
  plugins: [],
};
