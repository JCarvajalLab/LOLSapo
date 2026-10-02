import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { pluginCsp } from "./scripts/csp.mjs";

// base "./" deja rutas relativas, para que funcione igual en GitHub Pages.
export default defineConfig({
  base: "./",
  // pluginCsp agrega la Content Security Policy solo en el build.
  plugins: [react(), tailwindcss(), pluginCsp()],
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.js"],
    css: false,
  },
});
