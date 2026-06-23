import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(() => {
  const env = loadEnv("frontend", "../../", "");

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_APP_NAME": JSON.stringify(env.VITE_APP_NAME),
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(env.VITE_API_BASE_URL)
    },
    server: {
      port: Number(env.FRONTEND_PORT ?? 5173)
    }
  };
});
