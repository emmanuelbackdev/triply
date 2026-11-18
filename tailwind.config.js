/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // Nativewind's web runtime throws "Cannot manually set color scheme" with the
  // default "media" strategy. "class" still follows the system scheme on native.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#3D6CEC",
        night: "#08131F",
        link: "#96BEF5",
      },
    },
  },
  plugins: [],
}
