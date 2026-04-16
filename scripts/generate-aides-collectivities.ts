/**
 * Associates for each aid the corresponding collectivity and enriches with metadata.
 */

import fs from "node:fs";
import { exit } from "process";
import Publicodes, { ASTNode, reduceAST, RuleNode } from "publicodes";

import epci from "@etalab/decoupage-administratif/data/epci.json" assert { type: "json" };
import communes from "../src/data/communes.json" assert { type: "json" };
import departements from "@etalab/decoupage-administratif/data/departements.json" assert { type: "json" };
import regions from "@etalab/decoupage-administratif/data/regions.json" assert { type: "json" };
import { getDataPath, getDistDataPath } from "./utils.js";

import rules, { RuleName } from "../publicodes-build/index.js";

type Commune = {
  code: string;
  nom: string;
  departement: string;
  region: string;
  population: number;
  zfe: boolean;
  epci: string;
  codesPostaux: string[];
};

type CollectivityKind =
  | "pays"
  | "région"
  | "département"
  | "epci"
  | "code insee";

type Collectivity = {
  kind: CollectivityKind;
  value: string;
  code?: string;
};

interface AssociatedAideCollectivity {
  collectivity: Collectivity;
  codeInsee?: string;
  region?: string;
  departement?: string;
  population?: number;
  country: string;
  maxAideAmountPerVeloKind?: Record<
    string,
    string | number | boolean | null | undefined
  >;
}

const engine = new Publicodes(rules);
const ruleNames = Object.keys(rules) as RuleName[];

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
    Set<{
      kind: CollectivityKind;
      value: string;
    }>
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

            if (!acc.has({ kind: localisationKind, value: nodeValue })) {
              acc.add({ kind: localisationKind, value: nodeValue });
            }
            return acc;
          }
        }
      }
    },
    new Set(),
    applicableSiNode,
  );

  if (localisationResult.size > 1) {
    console.warn(
      `Multiple localisations found in "applicable si" for rule ${rule.dottedName}, only the first one will be used.`,
    );
    console.log([...localisationResult]);
  }

  if (localisationResult.size === 0) {
    console.error(
      `No localisation found in "applicable si" for rule ${rule.dottedName}`,
    );
    exit(1);
  }

  // Should handle multiple localisations but in our current rule basis we only have one localisation per aide.
  const { kind, value } = [...localisationResult][0];

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

const getMaxAideAmountPerVeloKind = (rule: RuleNode, conditions = []) => {
  const isVeloKindReference = (node: ASTNode) =>
    node?.nodeKind === "reference" &&
    VELO_KIND_RULES.includes(node.dottedName ?? node.name);

  // TODO: check why there are isNodeWithVeloKindReference and hasVeloKindReference functions and if we can unify them
  const isNodeWithVeloKindReference = (node: ASTNode) => {
    if (!node || typeof node !== "object") return false;

    if (typeof node === "string") return isConditionStringWithVeloKind(node);

    if (typeof node.rawNode === "string")
      return isConditionStringWithVeloKind(node.rawNode);

    if (isVeloKindReference(node)) return true;

    if (Array.isArray(node)) return node.some(isNodeWithVeloKindReference);

    return Object.values(node).some(isNodeWithVeloKindReference);
  };

  const hasVeloKindReference = (node: ASTNode): boolean =>
    isNodeWithVeloKindReference(node) ||
    reduceAST(
      (acc, currentNode) => acc || isVeloKindReference(currentNode),
      false,
      node,
    );

  const booleanNode = (nodeValue: boolean): ASTNode => ({
    nodeKind: "constant",
    type: "boolean",
    nodeValue: nodeValue,
  });

  const isConditionStringWithVeloKind = (condition: string): boolean =>
    typeof condition === "string" &&
    VELO_KIND_RULES.some((veloRule) => condition.includes(veloRule));

  const lightenNode = (
    node: ASTNode | ASTNode[],
    inPlafond = false,
  ): ASTNode | ASTNode[] => {
    if (!node || typeof node !== "object") return node;

    if (Array.isArray(node))
      return node.map((child) => lightenNode(child, inPlafond)) as ASTNode[];

    let newNode = {
      ...node,
    } as ASTNode & Record<string, unknown>;

    const isPlafondMechanism = newNode.sourceMap?.mecanismName === "plafond";
    const isInPlafond = inPlafond || isPlafondMechanism;
    const shouldSkipReplacement = isInPlafond;

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

      if (isEt || isOu || isToutesCesConditions || isUneDeCesConditions) {
        if (!hasVelo) {
          return booleanNode(true);
        }

        const replacement = (node: ASTNode): ASTNode =>
          hasVeloKindReference(node)
            ? node
            : isOu || isUneDeCesConditions
            ? booleanNode(false)
            : booleanNode(true);

        newNode.explanation = newNode.explanation.map(replacement) as [
          ASTNode,
          ASTNode,
        ];

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

    if (!shouldSkipReplacement) {
      const conditionKeys: ReadonlyArray<{
        key: "toutes ces conditions" | "et" | "ou" | "une de ces conditions";
        fallback: boolean;
      }> = [
        { key: "toutes ces conditions", fallback: true },
        { key: "et", fallback: true },
        { key: "ou", fallback: false },
        { key: "une de ces conditions", fallback: false },
      ];

      for (const { key, fallback } of conditionKeys) {
        const conditions = newNode[key];
        if (Array.isArray(conditions)) {
          newNode[key] = conditions.map((condition) =>
            typeof condition === "string" &&
            isConditionStringWithVeloKind(condition)
              ? condition
              : booleanNode(fallback),
          );
        }
      }
    }

    for (const [key, value] of Object.entries(newNode)) {
      newNode[key] = lightenNode(value, isInPlafond);
    }

    return newNode;
  };

  // Traverse the AST. Filter the conditions to keep only those that concern the types of bikes (VELO_KIND_RULES). The other conditions are replaced by an always true condition.
  const lightenedAST = lightenNode(rule) as ASTNode;

  // Evaluate the rule with the lightened AST to get the amount of aid based on the type of bike only
  const maxAmountPerVeloKind: Record<
    string,
    string | number | boolean | null | undefined
  > = {};
  for (const veloKind of VELO_TYPE_POSSIBILITIES) {
    engine.setSituation({ "vélo . type": `'${veloKind}'` });
    const evaluation = engine.evaluate(lightenedAST);
    maxAmountPerVeloKind[veloKind] = evaluation.nodeValue;
  }
  console.log(rule.dottedName, maxAmountPerVeloKind);
  return maxAmountPerVeloKind;
};

const associateCollectivityMetadata = (
  rule: RuleNode,
): AssociatedAideCollectivity => {
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
