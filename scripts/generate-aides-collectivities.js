/**
 * Associates for each aid the corresponding collectivity.
 */

import fs from "node:fs";
import Publicodes, { reduceAST } from "publicodes";
import { exit } from "process";

import epci from "@etalab/decoupage-administratif/data/epci.json" assert { type: "json" };
import { getDataPath } from "./utils.js";

import rules from "../publicodes-build/index.js";

const engine = new Publicodes(rules);
const ruleNames = Object.keys(rules);

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
  aidesRuleNames.map((ruleName) => {
    const rule = engine.getRule(ruleName);
    const collectivity = extractCollectivityFromAST(rule);
    if (!collectivity) {
      return [ruleName, undefined];
    }
    const country = getCountry(rule);

    return [ruleName, { collectivity, country }];
  })
);

fs.writeFileSync(getDataPath("aides-collectivities.json"), JSON.stringify(res));

/// Utils

function extractCollectivityFromAST(rule) {
  const collectityKinds = [
    "pays",
    "région",
    "département",
    "epci",
    "code insee",
  ];

  const localisations = reduceAST(
    (acc, node) => {
      if (node.nodeKind === "operation" && node.operationKind === "=") {
        for (let kind of collectityKinds) {
          if (node.explanation[0]?.dottedName === `localisation . ${kind}`) {
            const loc = {
              kind,
              value: node.explanation[1]?.nodeValue,
            };
            if (!acc.find((l) => l.kind === loc.kind && l.value == loc.value)) {
              acc.push(loc);
            }
            return acc;
          }
        }
      }
    },
    [],
    rule
  );

  if (localisations.length === 0) {
    console.warn(`No localisation found for ${rule.dottedName}`);
    return;
  }

  const normalizedLocalisations = localisations.map((loc) => {
    // In our rule basis we reference EPCI by their name but for iteroperability
    // with third-party systems it is more robust to expose their SIREN code.
    if (loc.kind === "epci") {
      const code = epci.find(({ nom }) => nom === loc.value)?.code;

      if (!code) {
        console.error(`Bad EPCI code: ${loc.value}`);
        exit(1);
      }

      return { ...loc, code };
    }

    return loc;
  });

  // FIXME: should handle multiple localisations
  return normalizedLocalisations[0];
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
