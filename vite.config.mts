import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const outDir = process.env.VITE_OUT_DIR || "dist";

function manualChunks(id: string) {
  if (id.includes("node_modules")) return "vendor";
  if (id.includes("/map/map_001.json")) return "map-template-map-001";
  if (id.includes("/map/map_monster_test.json")) return "map-template-monster-test";
  if (id.includes("/map/rest_area.json")) return "map-template-rest-area";
  if (id.includes("/webapp/frontendGameData") || id.includes("/webapp/frontendGemDropData") || id.includes("/webapp/frontendSkillLevelTables")) {
    return "frontend-data";
  }
  if (id.includes("/webapp/runtime/") || id.includes("/webapp/monsterSkillRuntime") || id.includes("/webapp/supremeBossSkillRuntime")) {
    return "battle-runtime";
  }
  if (id.includes("/webapp/features/disabled-skill-editor/")) return "skill-editor-tools";
  if (id.includes("/webapp/components/map-editor/")) return "map-editor-tools";
  if (id.includes("/webapp/components/sprite-test/")) return "sprite-test-tools";
}

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
        manualChunks
      }
    }
  }
});
