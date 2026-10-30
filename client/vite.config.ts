import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: "Offline POS",
        short_name: "POS",
        description: "Point of sale that works without internet",
        start_url: "/",
        display: "standalone",
        background_color: "#f5f5f5",
        theme_color: "#000000",
      },
    }),
  ],
  test: {
    environment: "node",
    setupFiles: ["fake-indexeddb/auto"],
  },
});
