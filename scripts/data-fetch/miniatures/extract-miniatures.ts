import fs from "node:fs";
import { join } from "node:path";
import { URL } from "node:url";
import sharp from "sharp";
import { getDataPath } from "../../utils";

import { data } from "../../../src";

const currentPath = new URL("./", import.meta.url).pathname;
const repoPath = join(currentPath, "aides-jeunes/");
const rootPath = join(currentPath, "../../../");
const metadataDirectory = join(repoPath, "data/institutions/");

if (!fs.existsSync(metadataDirectory)) {
  console.warn("Impossible de télécharger les miniatures");
  console.log("Essayez de télécharger le sous-module aides-jeunes :");
  console.log("git submodule update --init --recursive --depth 1");
  process.exit();
}

const imagesFromAidesJeunes = getImageFromAidesJeunes(metadataDirectory);

const miniatureDirectory = join(rootPath, "static/miniatures/");
if (fs.existsSync(miniatureDirectory)) {
  fs.rmSync(miniatureDirectory, { recursive: true });
}
fs.mkdirSync(miniatureDirectory, { recursive: true });

const thumbnailsManifest = Object.entries(data.aidesAvecLocalisation).reduce(
  (acc, [id, aide]) => {
    const aideId = `${aide.collectivity.kind} - ${aide.collectivity.code ?? aide.collectivity.value}`;

    const img = imagesFromAidesJeunes[aideId];

    if (!img) {
      console.warn(`No image found for (${id}): ${aideId}`);
      return acc;
    }

    const imgName = img.imgSrc.split("/").at(-1).split(".")[0] + ".webp";
    generateThumbnail(miniatureDirectory, repoPath, img.imgSrc, imgName);

    return { ...acc, [id]: imgName };
  },
  {},
);

fs.writeFileSync(
  getDataPath("miniatures.json"),
  JSON.stringify(thumbnailsManifest),
);

/// Utils

function getImageFromAidesJeunes(metadataDirectory: string) {
  const fieldsToRetrieve = ["imgSrc", "type", "code_siren", "code_insee"];
  const entries = fs.readdirSync(metadataDirectory).map((file) => {
    const filePath = join(metadataDirectory, file);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const data = Object.fromEntries(
      fileContent
        .split("\n")
        .map((line) => line.split(":").map((field) => field.trim()))
        .filter(([key]) => fieldsToRetrieve.includes(key)),
    );

    return [imgKey(data), data];
  });

  return Object.fromEntries([
    ...entries,
    ["pays - France", { imgSrc: "img/institutions/logo_etat_francais.png" }],
  ]);
}

async function generateThumbnail(
  miniatureDirectory: string,
  repoPath: string,
  imgSrc: string,
  imgName: string,
) {
  const imgPath = join(repoPath, "public/", imgSrc);
  const img = sharp(imgPath);

  img.resize({ fit: "inside", height: 170, width: 120 });
  await img.webp().toFile(join(miniatureDirectory, imgName));
}

// Map aides-jeunes identifiers with mesaidesvélo types.
function imgKey({ type, code_siren, code_insee }): string | undefined {
  const toInt = (str: string) => str.replace(/[^\d]/g, "");

  if (type === "commune") {
    return `code insee - ${toInt(code_insee)}`;
  } else if (type === "epci") {
    return `epci - ${toInt(code_siren)}`;
  } else if (type === "departement") {
    return `département - ${toInt(code_insee)}`;
  } else if (type === "region") {
    return `région - ${toInt(code_insee)}`;
  } else if (type === "national") {
    return `pays - France`;
  }
}
