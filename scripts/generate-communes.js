/**
 * Generate the `communes.json` by combining and filtering data from:
 *  - `@etalab/decoupage-administratif/data/communes.json`
 *  - `@etalab/decoupage-administratif/data/epci.json`
 *  - `../../data-fetch/zones-faibles-emissions/codes-insee.js`
 */
import fs from "fs";

import { getDataPath } from "./utils.js";
import { slugify } from "../src/lib/utils.ts";

import communesInZFE from "./data-fetch/zones-faibles-emissions/communeZFE.js";
import communes from "@etalab/decoupage-administratif/data/communes.json" assert { type: "json" };
import epci from "@etalab/decoupage-administratif/data/epci.json" assert { type: "json" };

// type Commune = {
//   code: string;
//   nom: string;
//   typeLiaison: number | null;
//   zone: "metro" | "dom" | "com";
//   arrondissement: string | null;
//   departement: string;
//   region: string;
//   type:
//     | "arrondissement-municipal"
//     | "commune-actuelle"
//     | "commune-deleguee"
//     | "commune-associee";
//   siren: string | null;
//   rangChefLieu: 0 | null;
//   codesPostaux: string[] | null;
//   population: number | null;
// };

const villesAvecArrondissements = {
  Paris: "75000",
  Marseille: "13000",
  Lyon: "69000",
};

const duplicateCommunesNames = communes
  .map(({ nom }) => slugify(nom))
  .sort()
  .filter((cur, i, arr) => cur === arr[i - 1]);

const communesInEpci = Object.fromEntries(
  epci.flatMap(({ nom, membres }) => membres.map(({ code }) => [code, nom])),
);

const extraData = [
  {
    nom: "Monaco",
    codePostal: "980000",
    code: "99138",
    codesPostaux: ["98000"],
    departement: "06",
    region: "84",
    population: 39244,
    pays: "monaco",
  },
  {
    nom: "Luxembourg",
    codePostal: "1111",
    code: "99137",
    codesPostaux: ["1111"],
    departement: "",
    region: "",
    population: 632275,
    pays: "luxembourg",
  },
];

const data = [
  ...communes
    .filter(
      (c) =>
        c.type === "commune-actuelle" &&
        c.codesPostaux &&
        c.population &&
        // NOTE: is this correct? Aids aren't eligible for the DROM?
        c.zone === "metro",
    )
    .map((c) => {
      if (villesAvecArrondissements[c.nom]) {
        c.codesPostaux?.push(villesAvecArrondissements[c.nom]);
      }

      const uniq = (l) => [...new Set(l)];
      const countTrailingZeros = (x) =>
        x.toString().match(/0+$/)?.[0].length ?? 0;

      return {
        code: c.code,
        nom: c.nom,
        departement: c.departement,
        region: c.region,
        population: c.population,
        zfe: communesInZFE.includes(c.code),
        ...(communesInEpci[c.code] ? { epci: communesInEpci[c.code] } : {}),
        codesPostaux: uniq(c.codesPostaux).sort(
          (a, b) => countTrailingZeros(b) - countTrailingZeros(a),
        ),
      };
    }),
  ...extraData,
].map((c) => ({
  ...c,
  slug:
    slugify(c.nom) +
    (duplicateCommunesNames.includes(slugify(c.nom))
      ? `-${c.departement ?? c.code.slice(0, 2)}`
      : ""),
}));

fs.writeFileSync(getDataPath("communes.json"), JSON.stringify(data));
