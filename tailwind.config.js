/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['Franklin Gothic Medium', 'Arial Narrow', 'Arial', 'sans-serif'],
      },
      colors: {
        newsred: '#C41E3A',
        newsgold: '#B8960C',
        newsdark: '#1a1a1a',
        newsgray: '#f5f5f5',
        newsborder: '#d0d0d0',
      },
    },
  },
  plugins: [],
};
