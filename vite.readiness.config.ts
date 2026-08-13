import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "standalone/readiness"),
  base: "./",
  publicDir: path.resolve(__dirname, "public"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "output/netlify/sidequests-readiness"),
    emptyOutDir: true,
  },
});
