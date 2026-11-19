import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// Builds the React dashboard into frontend/dashboard/, which Express serves
// as /dashboard/expense.html (the URL the login page already redirects to).
export default defineConfig({
  root: here("."),
  base: "./",
  plugins: [react()],
  build: {
    outDir: here("../frontend/dashboard"),
    emptyOutDir: true,
    rollupOptions: { input: here("expense.html") },
  },
});
