import fs from "fs";

const data = fs.readFileSync(
  new URL("./ZFE-M_liste.txt", import.meta.url).pathname,
  "utf-8",
);

const codesInsee = data
  .split("\n")
  .map((line) => line.match(/(\d{5})/)?.[1])
  .filter(Boolean);

export default codesInsee;
