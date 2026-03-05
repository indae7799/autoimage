/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          DEFAULT: "#7A9E8A",
          dark: "#4E7A62",
          light: "#B8D4C2",
          bg: "#EEF5F0",
          pale: "#F5F9F6",
        },
        bark: "#2E3830",
        cream: "#FAFAF7",
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
