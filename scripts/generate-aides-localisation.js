/**
 * Associates for each aid the corresponding localisation.
 */

import fs from "node:fs";
import Publicodes, { reduceAST } from "publicodes";

import epci from "@etalab/decoupage-administratif/data/epci.json" assert { type: "json" };
import departements from "@etalab/decoupage-administratif/data/departements.json" assert { type: "json" };
import regions from "@etalab/decoupage-administratif/data/regions.json" assert { type: "json" };
import { getDataPath } from "./utils.js";

import rules from "../publicodes-build";
import communes from "../src/data/communes.json";

const engine = new Publicodes(rules);
const ruleNames = Object.keys(rules);
const communesSorted = communes.sort((a, b) => b.population - a.population);

const aidesRuleNames = ruleNames.filter((ruleName) => {
  if (ruleName.startsWith("aides .")) {
    if (!engine.getRule(ruleName).rawNode.titre) {
      if (ruleName.split(" . ").length === 2) {
        console.warn(`No title for ${ruleName}`);
      }
      return false;
    }
    return true;
  }
  return false;
});

const res = Object.fromEntries(
  aidesRuleNames.map((ruleName) => [
    ruleName,
    associateCollectivityMetadata(engine.getRule(ruleName)),
  ]),
);

fs.writeFileSync(getDataPath("aides-collectivities.json"), JSON.stringify(res));

/// Utils

function associateCollectivityMetadata(rule) {
  const collectivity = extractCollectivityFromAST(rule);
  if (!collectivity) {
    return;
  }
  const codeInsee = getInseeCodeForCollectivity(collectivity);
  const { slug, departement, population } = getCommune(codeInsee) ?? {};
  const country = getCountry(rule);

  return {
    collectivity,
    codeInsee,
    departement,
    population,
    slug,
    country,
  };
}

function extractCollectivityFromAST(rule) {
  const collectityKinds = [
    "pays",
    "région",
    "département",
    "epci",
    "code insee",
  ];

  const localisation = reduceAST(
    (acc, node) => {
      if (acc) {
        return acc;
      }
      if (node.nodeKind === "operation" && node.operationKind === "=") {
        for (let kind of collectityKinds) {
          if (node.explanation[0]?.dottedName === `localisation . ${kind}`) {
            return {
              kind,
              value: node.explanation[1]?.nodeValue,
            };
          }
        }
      }
    },
    null,
    rule,
  );

  if (!localisation) {
    console.warn(`No localisation found for ${rule.dottedName}`);
    return;
  }

  // In our rule basis we reference EPCI by their name but for iteroperability
  // with third-party systems it is more robust to expose their SIREN code.
  if (localisation.kind === "epci") {
    const code = epci.find(({ nom }) => nom === localisation.value)?.code;

    if (!code) {
      console.warn(`Bad EPCI code for ${localisation.value}`);
    }

    return { ...localisation, code };
  }
  return localisation;
}

function getInseeCodeForCollectivity({ kind, value }) {
  switch (kind) {
    case "région":
      return regions.find(({ code }) => code === value)?.chefLieu;
    case "département":
      return departements.find(({ code }) => code === value)?.chefLieu;
    case "epci":
      return communesSorted.find(({ epci }) => epci === value)?.code;
    case "code insee":
      return value;
  }
}

function getCommune(codeInsee) {
  if (!codeInsee) {
    return;
  }
  return communesSorted.find(({ code }) => code === codeInsee);
}

// TODO: a bit fragile, we should sync this logic with
// `engine.evaluate('localisation . pays')
function getCountry(rule) {
  return rule.dottedName === "aides . monaco"
    ? "monaco"
    : rule.dottedName === "aides . luxembourg"
      ? "luxembourg"
      : "france";
}
