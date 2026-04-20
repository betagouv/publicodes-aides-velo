import { defineConfig } from "tsdown"

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./publicodes-build/index.js",
    "./publicodes-build/index.d.ts",
    "./src/data/index.ts",
  ],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  cjsDefault: true,
  treeshake: true,
  deps: {
    onlyBundle: ["publicodes"],
  },
})
