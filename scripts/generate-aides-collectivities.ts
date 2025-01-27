/**
 * Associates for each aid the corresponding collectivity.
 */

import fs from "node:fs";
import Publicodes from "publicodes";
import {
  extractLocalisationFromAST,
  Localisation as DecoupageAdministratifLocalisation,
} from "@betagouv/publicodes-decoupage-administratif";
import { getDataPath } from "./utils.js";

import rules, { RuleName } from "../publicodes-build/index.js";
import { Localisation } from "../src/data";

const engine = new Publicodes(rules);
const ruleNames = Object.keys(rules);

const AIDES_ETAT_FR: RuleName[] = [
  "aides . bonus vélo",
  "aides . prime à la conversion",
  "aides . prime à la conversion . surprime ZFE",
];

const aidesRuleNames = ruleNames.filter((ruleName) => {
  if (ruleName.startsWith("aides .")) {
    if (!engine.getRule(ruleName as RuleName).rawNode.titre) {
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
    const rule = engine.getRule(ruleName as RuleName);
    // TODO: should be handle more generically in the future.
    if (ruleName === "aides . monaco") {
      return [
        ruleName,
        {
          collectivity: { kind: "pays", value: "Monaco" },
          country: "monaco",
        },
      ];
    }
    if (ruleName === "aides . luxembourg") {
      return [
        ruleName,
        {
          collectivity: { kind: "pays", value: "Luxembourg" },
          country: "luxembourg",
        },
      ];
    }
    if (AIDES_ETAT_FR.includes(ruleName as RuleName)) {
      return [
        ruleName,
        {
          collectivity: { kind: "pays", value: "France" },
          country: "france",
        },
      ];
    }

    // TODO: handle multiple localisations
    const localisations = extractLocalisationFromAST(rule, "localisation");
    if (localisations.length === 0) {
      console.warn(`No localisation for ${ruleName}`);
      return [ruleName, undefined];
    }

    return [
      ruleName,
      {
        collectivity: {
          kind: toKind(localisations[0].type),
          value: localisations[0].valeur,
          code: localisations[0].code,
        },
        country: "france",
      },
    ];
  })
);

fs.writeFileSync(getDataPath("aides-collectivities.json"), JSON.stringify(res));

/// Utils

function toKind(
  type: DecoupageAdministratifLocalisation["type"]
): Localisation["collectivity"]["kind"] {
  switch (type) {
    case "commune":
      return "code insee";
    case "epci":
      return "epci";
    case "département":
      return "département";
    case "région":
      return "région";
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}
