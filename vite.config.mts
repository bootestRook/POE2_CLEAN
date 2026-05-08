import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const outDir = process.env.VITE_OUT_DIR || "dist";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    hmr: {
      host: "127.0.0.1"
    },
    watch: {
      ignored: [
        "**/dist/**",
        "**/dist-webapp/**",
        "**/dist-map-editor/**",
        "**/reports/**",
        "**/.vite/**"
      ]
    }
  },
  build: {
    outDir,
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) return "vendor";
        }
      }
    }
  }
});
