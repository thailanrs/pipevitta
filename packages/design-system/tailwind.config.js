module.exports = {
  darkMode: "class",
  content: [
    "./apps/**/*.{js,ts,jsx,tsx,mdx,html}",
    "./packages/**/*.{js,ts,jsx,tsx,mdx,html}"
  ],
  theme: {
    extend: {
      colors: {
        "surface-container-lowest": "#ffffff",
        primary: "#005ab4",
        outline: "#717785",
        "secondary-fixed-dim": "#aec7f7",
        tertiary: "#964400",
        "surface-bright": "#f9f9ff",
        "primary-container": "#0a73e0",
        "surface-container": "#ebedf7",
        "tertiary-fixed-dim": "#ffb68c",
        "surface-variant": "#e0e2eb",
        "on-background": "#181c22",
        "on-error-container": "#93000a",
        "surface-dim": "#d7dae3",
        "surface-container-high": "#e6e8f1",
        secondary: "#465f88",
        "on-tertiary-fixed-variant": "#763400",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "outline-variant": "#c1c6d5",
        "surface-container-highest": "#e0e2eb",
        surface: "#f9f9ff",
        "tertiary-container": "#bd5700",
        "on-secondary-container": "#3f5881",
        "on-tertiary-fixed": "#321200",
        error: "#ba1a1a",
        "on-primary-fixed-variant": "#00458d",
        "inverse-primary": "#aac7ff",
        "on-secondary-fixed-variant": "#2d476f",
        "surface-tint": "#005db8",
        "on-tertiary": "#ffffff",
        "secondary-container": "#b6d0ff",
        "on-primary": "#ffffff",
        "on-surface": "#181c22",
        "secondary-fixed": "#d6e3ff",
        "inverse-surface": "#2d3037",
        "inverse-on-surface": "#eef0fa",
        "primary-fixed": "#d6e3ff",
        "on-surface-variant": "#414753",
        "tertiary-fixed": "#ffdbc9",
        "on-secondary": "#ffffff",
        "on-primary-fixed": "#001b3e",
        background: "#f9f9ff",
        "surface-container-low": "#f1f3fc",
        "on-primary-container": "#fefcff",
        "on-tertiary-container": "#fffbff",
        "primary-fixed-dim": "#aac7ff",
        "on-secondary-fixed": "#001b3d"
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px"
      },
      fontFamily: {
        headline: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
        display: ["Inter", "sans-serif"]
      }
    }
  }
};
