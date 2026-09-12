import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        mobile: '480px',
        mid: '900px',
      },
      colors: {
        primaryBlue: '#007CBF',
        blue: {
          25: '#F2F8FC',
          50: '#E6F2F9',
          100: '#CCE5F2',
          200: '#99CBE5',
          300: '#66B0D9',
          400: '#3396CC',
          500: '#007CBF',
          600: '#006399',
          700: '#004A73',
          800: '#00324C',
        },
        grey: {
          25: '#F5F7F8',
          50: '#EBEFF2',
          100: '#E0E7EB',
          200: '#CCD8DE',
          300: '#B3C4CD',
          400: '#99AAB3',
          500: '#8095A0',
          600: '#6B818C',
          700: '#526B79',
          800: '#2D4C5D',
          900: '#17303E',
          950: '#0C181F',
        },
        neutral: {
          primary: '#17303E',
          secondary: '#526B79',
          standard: '#526B79',
          tertiary: '#8095A0',
        },
        success: '#16a34a',
        error: '#ef4444',
      },
      boxShadow: {
        card: '0px 0px 40px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'slide-in': 'slide-in 0.2s ease-out',
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
