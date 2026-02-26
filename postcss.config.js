import tailwindcssMotion from "tailwindcss-motion";

export default {
  plugins: {
    "@tailwindcss/postcss": {
      plugins: [tailwindcssMotion],
    },
  },
};
