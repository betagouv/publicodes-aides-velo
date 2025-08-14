import communes from "@etalab/decoupage-administratif/data/communes.json";
import departements from "@etalab/decoupage-administratif/data/departements.json";
import epci from "@etalab/decoupage-administratif/data/epci.json";
import regions from "@etalab/decoupage-administratif/data/regions.json";
import * as fs from "fs";
import { Aide, AidesVeloEngine } from "../src";
import path from "path";

/**
 * Ce script génère un fichier permettant de suivre la couverture des aides
 * pour chaque région, département, EPCI et commune.
 *
 * Pour chaque région, département, EPCI et commune, il faut pouvoir indiquer
 * trois choses :
 * - Est-ce que l'entité a été déjà relue ?
 * - Existe-t-il une aide pour cette entité ?
 * - Si oui, est-elle déjà listée dans ce modèle ?
 */

const OUTPUT_FILE = "couverture";
const engine = new AidesVeloEngine();
const aides = engine.getAllAidesIn();


const writeFileSync = (file: string, content: string) => {
  fs.writeFileSync(file, content, { encoding: "utf-8", flag: "a" });
};

const encode = (str: string) => str.replaceAll(" ", "_").replaceAll("'", "-")

for (const region of regions) {
  const file_path = path.join(OUTPUT_FILE, `${region.code}_${encode(region.nom)}.md`)
  console.log("Processing:", file_path)
  fs.writeFileSync(file_path,`# Couverture des aides en ${region.nom} (${region.code})\n\n`)
  const exist = aides.some(
    (aide: Omit<Aide, "amount">) =>
      aide.collectivity.kind === "région" &&
      (aide.collectivity.code === region.code || aide.collectivity.value === region.code)
  );

  writeFileSync(file_path,
    `
| Echelle | Nom | Code | Possède une aide | Modélisée | Relue |
| ------- | --- | ---- | ---------------- | --------- | ----- |
`
  );

  writeFileSync(file_path,
    `| Région | ${region.nom} | ${region.code} | ${exist ? "✅" : "❔"} | ${
      exist ? "✅" : "❌"
    } | ❌ |\n`
  );

  const departementsInRegion = departements.filter(
    (d) => d.region === region.code
  );

  for (const departement of departementsInRegion) {
    const exist = aides.some(
      (aide: Omit<Aide, "amount">) =>
        aide.collectivity.kind === "département" &&
        (aide.collectivity.code === departement.code ||
          aide.collectivity.value === departement.code)
    );

    writeFileSync(file_path,
      `| Département | ${departement.nom} | ${departement.code} | ${
        exist ? "✅" : "❔"
      } | ${exist ? "✅" : "❌"} | ❌ |\n`
    );

    const communesInDepartement =
      //@ts-ignore
      communes.filter((c) => c.departement === departement.code);

    for (const epciItem of epci.filter((e) => {
      return e.membres.find((m) =>
        communesInDepartement.some((c) => c.code === m.code)
      );
    })) {
      const exist = aides.some(
        (aide: Omit<Aide, "amount">) =>
          aide.collectivity.kind === "epci" &&
          (aide.collectivity.code === epciItem.code
            || aide.collectivity.value === epciItem.code)
      );

      writeFileSync(file_path,
        `| ${epciItem.type} | ${epciItem.nom} | ${epciItem.code} | ${
          exist ? "✅" : "❔"
        } | ${exist ? "✅" : "❌"} | ❌ |\n`
      );

      // for (const commune of communesInDepartement) {
      //   const exist = aides.some(
      //     (aide: Omit<Aide, "amount">) =>
      //       aide.collectivity.kind === "code insee" &&
      //       aide.collectivity.code === commune.code
      //   );
      //
      //   writeFileSync(file_path,
      //     `| Commune | ${commune.nom} | ${commune.code} | ${
      //       exist ? "✅" : "❌"
      //     } | ${exist ? "✅" : "❌"} | ❌ |\n`
      //   );
      // }
    }
  }
}
