import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Bind to both IPv4 + IPv6 so `localhost` doesn't hit another app.
    host: true,
    port: 5173,
    strictPort: true,
  },

  // Polyfill Node.js globals for web3 dependencies
  define: {
    global: 'globalThis',
    'process.env': {},
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
