/**
 * Associates for each aid the corresponding collectivity and enriches with metadata.
 */

import fs from "node:fs";
import { exit } from "process";
import Publicodes, { reduceAST } from "publicodes";

import epci from "@etalab/decoupage-administratif/data/epci.json" assert { type: "json" };
import communes from "../src/data/communes.json" assert { type: "json" };
import departements from "@etalab/decoupage-administratif/data/departements.json" assert { type: "json" };
import regions from "@etalab/decoupage-administratif/data/regions.json" assert { type: "json" };
import { getDataPath, getDistDataPath } from "./utils.js";

import rules from "../publicodes-build/index.js";

const engine = new Publicodes(rules);
const ruleNames = Object.keys(rules);

const rules_to_skip = [
  "aides . commune",
  "aides . intercommunalité",
  "aides . département",
  "aides . région",
  "aides . état",
  "aides . montant",
  "aides . forfait mobilités durables",
];

const aidesRuleNames = ruleNames.filter((ruleName) => {
  if (ruleName.startsWith("aides .")) {
    if (!engine.getRule(ruleName).rawNode.titre) {
      if (
        ruleName.split(" . ").length === 2 &&
        !rules_to_skip.includes(ruleName)
      ) {
        console.warn(`No title for ${ruleName}`);
      }
      return false;
    }
    return true;
  }
  return false;
});

const communesSorted = communes.sort((a, b) => b.population - a.population);

const extractCollectivityFromAST = (rule) => {
  const localisationKinds = [
    "pays",
    "région",
    "département",
    "epci",
    "code insee",
  ];

  const applicableSiNode = reduceAST(
    (_, node) => {
      if (node.sourceMap?.mecanismName === "applicable si") {
        return node;
      }
    },
    null,
    rule,
  );

  const { kind, value } = reduceAST(
    (acc, node) => {
      if (acc) return acc;
      if (node.sourceMap?.mecanismName === "non applicable si") {
        return acc;
      }
      if (node.nodeKind === "operation" && node.operationKind === "=") {
        for (let localisationKind of localisationKinds) {
          if (
            node.explanation[0]?.dottedName ===
            `localisation . ${localisationKind}`
          ) {
            return {
              kind: localisationKind,
              value: node.explanation[1]?.nodeValue,
            };
          }
        }
      }
    },
    null,
    applicableSiNode ?? rule,
  );

  // In our rule basis we reference EPCI by their name but for interoperability
  // with third-party systems it is more robust to expose their SIREN code.
  if (kind === "epci") {
    const code = epci.find(({ nom }) => nom === value)?.code;

    if (!code) {
      console.error(`Bad EPCI code: ${value}`);
      exit(1);
    }

    return { kind, value, code };
  }

  return { kind, value };
};

const getCodeInseeForCollectivity = (collectivity) => {
  const { kind, value, code } = collectivity;
  switch (kind) {
    case "région":
      return regions.find(({ code: c }) => c === value)?.chefLieu;
    case "département":
      return departements.find(({ code: c }) => c === value)?.chefLieu;
    case "epci":
      // value est le nom de l'EPCI, chercher une commune dans cet EPCI par le nom
      return communesSorted.find(({ epci }) => epci === value)?.code;
    case "code insee":
      return value;
    default:
      return undefined;
  }
};

const getCommune = (codeInsee) =>
  codeInsee && communesSorted.find(({ code }) => code === codeInsee);

const getCountry = (rule) =>
  rule.dottedName === "aides . monaco"
    ? "monaco"
    : rule.dottedName === "aides . luxembourg"
    ? "luxembourg"
    : "france";

const associateCollectivityMetadata = (rule) => {
  const collectivity = extractCollectivityFromAST(rule);
  const codeInsee = getCodeInseeForCollectivity(collectivity);
  const commune = getCommune(codeInsee);
  const country = getCountry(rule);

  return {
    collectivity,
    codeInsee,
    region: commune?.region,
    departement: commune?.departement,
    population: commune?.population,
    country,
  };
};

const res = Object.fromEntries(
  aidesRuleNames.map((ruleName) => [
    ruleName,
    associateCollectivityMetadata(engine.getRule(ruleName)),
  ]),
);

fs.writeFileSync(
  getDataPath("aides-collectivities.json"),
  JSON.stringify(res, null, 2),
);

fs.writeFileSync(
  getDistDataPath("aides-collectivities.json"),
  JSON.stringify(res, null, 2),
);

console.log(`${aidesRuleNames.length} aides écrites.`);
