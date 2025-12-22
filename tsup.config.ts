import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/cli/index.ts", "src/index.ts"],
  format: ["cjs", "esm"],
  splitting: false,
  sourcemap: true,
  treeshake: true,
  clean: true,
  dts: true,

  outExtension({ format }) {
    if (format === "esm") {
      return { js: ".mjs" };
    }
    return { js: ".cjs" }
  }
});