import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

declare const process: { env: Record<string, string | undefined> };

function getBasePath(): string {
  const explicitBase = process.env.VITE_BASE_PATH;
  if (explicitBase) {
    return explicitBase.endsWith("/") ? explicitBase : `${explicitBase}/`;
  }

  const repository = process.env.GITHUB_REPOSITORY?.split("/").pop();
  return repository ? `/${repository}/` : "/";
}

export default defineConfig({
  base: getBasePath(),
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: false
  }
});
