import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Yellow Dollar Brand Colors
        yellow: {
          DEFAULT: "#F6C232",
          50: "#FFFBF0",
          100: "#FFF4D1",
          200: "#FFE8A3",
          300: "#FFDB75",
          400: "#FFCF47",
          500: "#F6C232", // Primary brand color
          600: "#E6B22E",
          700: "#D6A22A",
          800: "#C69226",
          900: "#B68222",
        },
        gray: {
          50: "#F9F9F9",
          100: "#F5F5F5", // Light Gray
          200: "#E0E0E0", // Medium Gray
          300: "#CCCCCC",
          400: "#999999",
          500: "#666666",
          600: "#4D4D4D",
          700: "#333333",
          800: "#212121", // Dark Gray
          900: "#171717", // Black
        },
        risk: "#FF3B30", // Red for risk/alert
        safe: "#00C853", // Green for safe/success
      },
      fontFamily: {
        sans: ["Archivo", "Satoshi", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", "Arial", "Noto Sans", "sans-serif"],
      },
      fontSize: {
        'display': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],
        'title': ['2rem', { lineHeight: '1.2', fontWeight: '600' }],
        'subtitle': ['1.25rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
      },
      spacing: {
        '4': '4px',
        '8': '8px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
        '48': '48px',
      },
      borderRadius: {
        lg: "12px",
        xl: "12px",
        "2xl": "12px",
      },
      boxShadow: {
        // No shadows as per design system
        'none': 'none',
      },
      lineClamp: {
        '1': '1',
        '2': '2',
        '3': '3',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config; 