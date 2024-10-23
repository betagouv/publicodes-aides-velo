import path from "path";
import fs from "fs";

/**
 * Slugify a string.
 *
 * Source: https://byby.dev/js-slugify-string
 */
export function slugify(str) {
  return str
    .normalize("NFKD") // split accented characters into their base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, "") // remove all the accents, which happen to be all in the \u03xx UNICODE block.
    .trim() // trim leading or trailing whitespace
    .replace("œ", "oe") // Remove invalid chars
    .toLowerCase() // convert to lowercase
    .replace(/[^a-z0-9 -]/g, "") // remove non-alphanumeric characters
    .replace(/\s+/g, "-") // replace spaces with hyphens
    .replace(/-+/g, "-"); // remove consecutive hyphens
}

/**
 * Get the path to the data directory and create the directory if it doesn't exist.
 */
export function getDataPath(filename) {
  const dataPath = new URL("../src/data", import.meta.url).pathname;

  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath);
  }

  return path.resolve(dataPath, filename);
}
