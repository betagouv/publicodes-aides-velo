/**
 * Associates for each aid the corresponding collectivity and enriches with metadata.
 */

import fs from "node:fs";
import { exit } from "process";
import Publicodes, { ASTNode, reduceAST, RuleNode } from "publicodes";

import departements from "@etalab/decoupage-administratif/data/departements.json" with { type: "json" };
import epci from "@etalab/decoupage-administratif/data/epci.json" with { type: "json" };
import regions from "@etalab/decoupage-administratif/data/regions.json" with { type: "json" };
import communes from "../src/data/communes.json" with { type: "json" };
import { getDataPath } from "./utils.js";

import rules, { RuleName } from "../publicodes-build/index.js";
import {
  Collectivity,
  CollectivityKind,
  Localisation,
} from "../src/data/index.js";

type Commune = {
  code: string;
  nom: string;
  departement: string;
  region: string;
  population: number;
  zfe: boolean;
  epci: string;
  codesPostaux: string[];
  slug: string | undefined;
};

const engine = new Publicodes(rules);
const ruleNames = Object.keys(rules) as RuleName[];

const RULES_TO_SKIP = [
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
        !RULES_TO_SKIP.includes(ruleName)
      ) {
        console.warn(`No title for ${ruleName}`);
      }
      return false;
    }
    return true;
  }
  return false;
});

const communesSorted = (communes as Commune[]).sort(
  (a, b) => b.population - a.population,
);

const extractCollectivityFromAST = (rule: RuleNode): Collectivity => {
  const localisationKinds: CollectivityKind[] = [
    "pays",
    "région",
    "département",
    "epci",
    "code insee",
  ];

  const applicableSiNode = reduceAST<ASTNode | null>(
    (_, node) => {
      if (node.sourceMap?.mecanismName === "applicable si") {
        return node;
      }
    },
    null,
    rule,
  );

  if (!applicableSiNode) {
    console.error(`No "applicable si" node found for rule ${rule.dottedName}`);
    exit(1);
  }

  const localisationResult = reduceAST<
    { kind: CollectivityKind; value: string }[]
  >(
    (acc, node) => {
      if (node.nodeKind === "operation" && node.operationKind === "=") {
        for (let localisationKind of localisationKinds) {
          const currentNodeDottedName = (
            node.explanation[0] as ASTNode & { dottedName?: string }
          )?.dottedName;
          if (currentNodeDottedName === `localisation . ${localisationKind}`) {
            const nodeValue = (
              node.explanation[1] as ASTNode & { nodeValue: string }
            )?.nodeValue;

            if (
              !acc.some(
                ({ kind, value }) =>
                  kind === localisationKind && value === nodeValue,
              )
            ) {
              acc.push({ kind: localisationKind, value: nodeValue });
            }
            return acc;
          }
        }
      }
    },
    [],
    applicableSiNode,
  );

  if (localisationResult.length > 1) {
    console.warn(
      `Multiple localisations found in "applicable si" for rule ${rule.dottedName}, only the first one will be used.`,
    );
  }

  if (localisationResult.length === 0) {
    console.error(
      `No localisation found in "applicable si" for rule ${rule.dottedName}`,
    );
    exit(1);
  }

  // Should handle multiple localisations but in our current rule basis we only have one localisation per aide (see https://github.com/betagouv/publicodes-aides-velo/issues/25).
  const { kind, value } = localisationResult.sort((a, b) => {
    const order = ["pays", "région", "département", "epci", "code insee"];
    return order.indexOf(a.kind) - order.indexOf(b.kind);
  })[0];

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

const getCodeInseeForCollectivity = (
  collectivity: Collectivity,
): string | undefined => {
  const { kind, value } = collectivity;
  switch (kind) {
    case "région":
      return regions.find(({ code: c }) => c === value)?.chefLieu;
    case "département":
      return departements.find(({ code: c }) => c === value)?.chefLieu;
    // We use the most populated commune of the EPCI as the code insee for the EPCI.
    case "epci":
      return communesSorted.find(({ epci }) => epci === value)?.code;
    case "code insee":
      return value;
    default:
      return undefined;
  }
};

const getCommune = (codeInsee: string | undefined): Commune | undefined =>
  codeInsee ? communesSorted.find(({ code }) => code === codeInsee) : undefined;

// TODO: a bit fragile, we should sync this logic with
// `engine.evaluate('localisation . pays')
const getCountry = (rule: RuleNode) =>
  rule.dottedName === "aides . monaco"
    ? "monaco"
    : rule.dottedName === "aides . luxembourg"
      ? "luxembourg"
      : "france";

const associateCollectivityMetadata = (rule: RuleNode): Localisation => {
  const collectivity = extractCollectivityFromAST(rule);
  const codeInsee = getCodeInseeForCollectivity(collectivity);
  const commune = getCommune(codeInsee);
  const country = getCountry(rule);
  if (!commune || !codeInsee) {
    if (country === "france") {
      console.error(
        `No commune found for collectivity ${collectivity.kind} (code insee: ${codeInsee})`,
      );
      exit(1);
    }

    return {
      country,
      collectivity,
    };
  }

  return {
    collectivity,
    codeInsee,
    epci: commune.epci,
    region: commune.region,
    departement: commune.departement,
    country,
    population: commune.population,
    slug: commune.slug,
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
  JSON.stringify(res)
 )

console.log(`${aidesRuleNames.length} aids associated with their collectivity metadata have been generated`)
