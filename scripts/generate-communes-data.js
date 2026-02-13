/**
 * Script to generate a static json file with communes data enriched with EPCI.
 * This is used by other scripts to map collectivities to communes.
 * The slug field is not included here - that's handled by the client.
 */

import fs from "node:fs";

import communes from "@etalab/decoupage-administratif/data/communes.json" assert { type: "json" };
import epci from "@etalab/decoupage-administratif/data/epci.json" assert { type: "json" };
import { getDataPath, getDistDataPath } from "./utils";

// Create a map of communes to their EPCI
const communesInEpci = Object.fromEntries(
  epci.flatMap(({ nom, membres }) => membres.map(({ code }) => [code, nom])),
);

// Extra data for Monaco and Luxembourg
const extraData = [
  {
    code: "99138",
    nom: "Monaco",
    departement: "06",
    region: "84",
    population: 39244,
    zfe: false,
    codesPostaux: ["98000"],
  },
  {
    code: "99137",
    nom: "Luxembourg",
    departement: "",
    region: "",
    population: 632275,
    zfe: false,
    codesPostaux: ["1111"],
  },
];

// Transform communes data
const data = [
  ...communes
    .filter(
      (c) => c.type === "commune-actuelle" && c.codesPostaux && c.population,
    )
    .map((c) => {
      const uniq = (l) => [...new Set(l)];
      const countTrailingZeros = (x) =>
        x.toString().match(/0+$/)?.[0].length ?? 0;

      return {
        code: c.code,
        nom: c.nom,
        departement: c.departement,
        region: c.region,
        population: c.population,
        zfe: false,
        ...(communesInEpci[c.code] ? { epci: communesInEpci[c.code] } : {}),
        codesPostaux: uniq(c.codesPostaux).sort(
          (a, b) => countTrailingZeros(b) - countTrailingZeros(a),
        ),
      };
    }),
  ...extraData,
];

fs.writeFileSync(getDataPath("communes.json"), JSON.stringify(data, null, 2));

fs.writeFileSync(
  getDistDataPath("communes.json"),
  JSON.stringify(data, null, 2),
);

console.log(`${data.length} communes traitées.`);
