import fs from "fs"
import path from "path"

/**
 * Get the path to the data directory and create the directory if it doesn't exist.
 */
export function getDataPath(filename) {
  const dataPath = new URL("../src/data", import.meta.url).pathname

  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath)
  }

  return path.resolve(dataPath, filename)
}
