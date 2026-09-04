/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      "colors": {
              "tertiary": "#3d3c39",
              "on-tertiary-container": "#c9c7c2",
              "background": "#fff8f5",
              "outline-variant": "#c0c8c9",
              "on-secondary": "#ffffff",
              "on-surface-variant": "#404849",
              "on-primary-container": "#a2d0d8",
              "surface-bright": "#fff8f5",
              "surface-container-high": "#efe6e2",
              "surface-container": "#f5ece8",
              "primary-container": "#2d5a61",
              "surface-dim": "#e1d8d4",
              "error": "#ba1a1a",
              "on-error": "#ffffff",
              "inverse-on-surface": "#f8efea",
              "primary": "#114349",
              "on-primary-fixed-variant": "#1f4d54",
              "on-primary-fixed": "#001f24",
              "inverse-surface": "#34302d",
              "primary-fixed-dim": "#a1ced6",
              "on-tertiary": "#ffffff",
              "secondary": "#5e5e5d",
              "surface-container-low": "#fbf2ed",
              "on-secondary-container": "#626361",
              "surface-container-lowest": "#ffffff",
              "error-container": "#ffdad6",
              "on-surface": "#1f1b18",
              "surface-tint": "#39656c",
              "secondary-container": "#e0dfde",
              "on-secondary-fixed-variant": "#464746",
              "on-primary": "#ffffff",
              "tertiary-fixed": "#e5e2dd",
              "surface-variant": "#eae1dc",
              "on-background": "#1f1b18",
              "tertiary-fixed-dim": "#c9c6c1",
              "surface": "#fff8f5",
              "on-error-container": "#93000a",
              "tertiary-container": "#54534f",
              "on-tertiary-fixed-variant": "#474743",
              "on-tertiary-fixed": "#1c1c19",
              "primary-fixed": "#bcebf3",
              "inverse-primary": "#a1ced6",
              "secondary-fixed-dim": "#c7c6c5",
              "outline": "#71787a",
              "on-secondary-fixed": "#1a1c1b",
              "surface-container-highest": "#eae1dc",
              "secondary-fixed": "#e3e2e0"
      },
      "borderRadius": {
              "DEFAULT": "0.25rem",
              "lg": "0.5rem",
              "xl": "0.75rem",
              "full": "9999px"
      },
      "spacing": {
              "lg": "24px",
              "xs": "4px",
              "gutter": "24px",
              "xl": "48px",
              "margin-mobile": "20px",
              "md": "16px",
              "xxl": "80px",
              "sm": "8px",
              "margin-desktop": "120px",
              "unit": "4px"
      },
      "maxWidth": {
        "xs": "20rem",
        "sm": "24rem",
        "md": "28rem",
        "lg": "32rem",
        "xl": "36rem",
        "2xl": "42rem",
        "3xl": "48rem",
        "4xl": "56rem",
        "5xl": "64rem",
        "6xl": "72rem",
        "7xl": "80rem"
      },
      "fontFamily": {
              "body-lg": ["Hanken Grotesk", "sans-serif"],
              "headline-lg": ["EB Garamond", "serif"],
              "caption": ["Hanken Grotesk", "sans-serif"],
              "body-md": ["Hanken Grotesk", "sans-serif"],
              "label-md": ["Hanken Grotesk", "sans-serif"],
              "headline-md": ["EB Garamond", "serif"],
              "headline-lg-mobile": ["EB Garamond", "serif"],
              "display": ["EB Garamond", "serif"]
      },
      "fontSize": {
        "display": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "500" }],
        "headline-lg": ["32px", { lineHeight: "1.2", fontWeight: "500" }],
        "headline-lg-mobile": ["28px", { lineHeight: "1.2", fontWeight: "500" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "500" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "1.0", letterSpacing: "0.05em", fontWeight: "500" }],
        "caption": ["12px", { lineHeight: "1.4", fontWeight: "400" }]
      },
      "keyframes": {
        "slide-in": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" }
        }
      }
    }
  },
  plugins: [],
}
