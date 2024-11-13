import { defineConfig } from "tsup";

export default defineConfig((options) => {
  return {
    entry: [
      "./src/index.ts",
      "./publicodes-build/index.js",
      "./src/data/index.ts",
    ],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    cjsInterop: true,
    splitting: true,
    treeshake: true,
    minify: options.watch ? false : "terser",
  };
});
