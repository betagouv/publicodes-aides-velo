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

  const { kind, value } =
    reduceAST(
      (acc, node) => {
        if (acc) return acc;
        if (!node) return acc;
        if (node.sourceMap?.mecanismName === "non applicable si") {
          // skip non applicable si nodes
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
      applicableSiNode,
    ) || {};

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

// const SHOULD_NOT_IMPACT_DEFAULT_APPLICABILITY = [
//   "localisation . région",
//   "demandeur . en situation de handicap",
//   "demandeur . âge . majeur",
//   "revenu fiscal de référence par part",
//   "vélo . état . neuf",
// ];

const VELO_TYPE_POSSIBILITIES = [
  "mécanique simple",
  "électrique",
  "cargo",
  "cargo électrique",
  "pliant",
  "pliant électrique",
  "motorisation",
  "adapté",
];

const VELO_KIND_RULES = [
  "vélo . type",
  "vélo . mécanique",
  "vélo . mécanique simple",
  "vélo . électrique",
  "vélo . électrique simple",
  "vélo . électrique ou mécanique",
  "vélo . cargo",
  "vélo . cargo mécanique",
  "vélo . cargo électrique",
  "vélo . pliant",
  "vélo . pliant mécanique",
  "vélo . pliant électrique",
  "vélo . motorisation",
  "vélo . adapté",
];

const getMaxAideAmountPerVeloKind = (rule, conditions = []) => {
  const isVeloKindReference = (node) =>
    node?.nodeKind === "reference" &&
    VELO_KIND_RULES.includes(node.dottedName ?? node.name);

  const nodeHasVeloKind = (value) => {
    if (!value) return false;
    if (Array.isArray(value)) return value.some(nodeHasVeloKind);
    if (typeof value === "string") return conditionStringHasVeloKind(value);
    if (typeof value !== "object") return false;
    if (isVeloKindReference(value)) return true;
    if (typeof value.rawNode === "string") {
      return conditionStringHasVeloKind(value.rawNode);
    }
    return Object.values(value).some(nodeHasVeloKind);
  };

  const hasVeloKindReference = (node) =>
    nodeHasVeloKind(node) ||
    reduceAST(
      (acc, currentNode) => acc || isVeloKindReference(currentNode),
      false,
      node,
    );

  const replaceWithTrue = (node) => ({
    nodeKind: "constant",
    type: "boolean",
    nodeValue: true,
  });

  const conditionStringHasVeloKind = (value) =>
    typeof value === "string" &&
    VELO_KIND_RULES.some((veloRule) => value.includes(veloRule));

  let plafondDepth = 0;

  const lightenNode = (node) => {
    if (!node || typeof node !== "object") return node;
    if (Array.isArray(node)) return node.map(lightenNode);

    let newNode = { ...node };

    // Détecter si on entre dans un mécanisme "plafond"
    const isPlafondMechanism = newNode.sourceMap?.mecanismName === "plafond";
    const shouldSkipReplacement = plafondDepth > 0;

    if (isPlafondMechanism) plafondDepth++;

    try {
      if (
        newNode.nodeKind === "operation" &&
        Array.isArray(newNode.explanation) &&
        !shouldSkipReplacement
      ) {
        const hasVelo = hasVeloKindReference(newNode);
        const isEt = newNode.operationKind === "et";
        const isOu = newNode.operationKind === "ou";
        const isToutesCesConditions =
          newNode.sourceMap?.mecanismName === "toutes ces conditions";
        const isUneDeCesConditions =
          newNode.sourceMap?.mecanismName === "une de ces conditions";

        if (
          (isEt || isOu || isToutesCesConditions || isUneDeCesConditions) &&
          !hasVelo
        ) {
          return replaceWithTrue(newNode);
        }

        if (isEt || isOu || isToutesCesConditions || isUneDeCesConditions) {
          const replacement = (node) =>
            hasVeloKindReference(node)
              ? node
              : isOu || isUneDeCesConditions
              ? {
                  nodeKind: "constant",
                  type: "boolean",
                  nodeValue: false,
                }
              : replaceWithTrue(node);

          newNode.explanation = newNode.explanation.map(replacement);

          if (Array.isArray(newNode.sourceMap?.args?.valeur)) {
            newNode = {
              ...newNode,
              sourceMap: {
                ...newNode.sourceMap,
                args: {
                  ...newNode.sourceMap.args,
                  valeur: newNode.sourceMap.args.valeur.map(replacement),
                },
              },
            };
          }
        }
      }

      if (
        Array.isArray(newNode["toutes ces conditions"]) &&
        !shouldSkipReplacement
      ) {
        newNode["toutes ces conditions"] = newNode["toutes ces conditions"].map(
          (condition) =>
            conditionStringHasVeloKind(condition)
              ? condition
              : { nodeKind: "constant", type: "boolean", nodeValue: true },
        );
      }

      if (Array.isArray(newNode.et) && !shouldSkipReplacement) {
        newNode.et = newNode.et.map((condition) =>
          conditionStringHasVeloKind(condition)
            ? condition
            : { nodeKind: "constant", type: "boolean", nodeValue: true },
        );
      }

      if (Array.isArray(newNode.ou) && !shouldSkipReplacement) {
        newNode.ou = newNode.ou.map((condition) =>
          conditionStringHasVeloKind(condition)
            ? condition
            : { nodeKind: "constant", type: "boolean", nodeValue: false },
        );
      }

      if (
        Array.isArray(newNode["une de ces conditions"]) &&
        !shouldSkipReplacement
      ) {
        newNode["une de ces conditions"] = newNode["une de ces conditions"].map(
          (condition) =>
            conditionStringHasVeloKind(condition)
              ? condition
              : { nodeKind: "constant", type: "boolean", nodeValue: false },
        );
      }

      for (const [key, value] of Object.entries(newNode)) {
        newNode[key] = lightenNode(value);
      }

      return newNode;
    } finally {
      if (isPlafondMechanism) plafondDepth--;
    }
  };

  // Parcourir l'AST. Filtrer les conditions pour garder seulement celles qui
  // concernent les types de vélo (VELO_KIND_RULES). Les autres conditions
  // sont remplacées par une condition toujours vraie.
  const lightenedAST = lightenNode(rule);

  // Evaluate la règle avec l'AST allégé pour obtenir le montant de l'aide en fonction du type de vélo uniquement
  const maxAmountPerVeloKind = {};
  for (const veloKind of VELO_TYPE_POSSIBILITIES) {
    engine.setSituation({ "vélo . type": `'${veloKind}'` });
    const evaluation = engine.evaluate(lightenedAST);
    maxAmountPerVeloKind[veloKind] = evaluation.nodeValue;
  }
  console.log(rule.dottedName, maxAmountPerVeloKind);
  return maxAmountPerVeloKind;
};

const getCodeInseeForCollectivity = (collectivity) => {
  const { kind, value } = collectivity;
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

// TODO: a bit fragile, we should sync this logic with
// `engine.evaluate('localisation . pays')
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
  const maxAideAmountPerVeloKind = getMaxAideAmountPerVeloKind(rule);

  return {
    collectivity,
    codeInsee,
    region: commune?.region,
    departement: commune?.departement,
    population: commune?.population,
    country,
    maxAideAmountPerVeloKind,
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
