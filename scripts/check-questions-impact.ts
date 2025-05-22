/**
 * This script checks the importance of each questions according the number of
 * aids impacted and the number of people of the population impacted.
 */

import rules, { RuleName } from "../publicodes-build";
import Engine, { reduceAST } from "publicodes";
import communes from "@etalab/decoupage-administratif/data/communes.json";

const engine = new Engine(rules);
const parsedRulesEntries = Object.entries(engine.getParsedRules());

const questionsProxies: RuleName[] = [
  "vélo . adapté",
  "vélo . mécanique simple",
  "vélo . électrique simple",
  "vélo . électrique",
  "vélo . mécanique",
  "vélo . électrique ou mécanique",
  "vélo . cargo",
  "vélo . cargo électrique",
  "vélo . cargo mécanique",
  "vélo . pliant mécanique",
  "vélo . pliant",
  "vélo . pliant électrique",
  "vélo . motorisation",
  "vélo . état . neuf",
  "vélo . état . occasion",
  "demandeur . âge . majeur",
  "demandeur . âge . mineur",
  "demandeur . âge . de 15 à 25 ans",
  "demandeur . âge . de 18 à 25 ans",
  "revenu fiscal de référence par part",
];

const questionsInJagis = [
  "vélo . type",
  "vélo . adapté",
  "vélo . mécanique simple",
  "vélo . électrique simple",
  "vélo . électrique",
  "vélo . mécanique",
  "vélo . électrique ou mécanique",
  "vélo . cargo",
  "vélo . cargo électrique",
  "vélo . cargo mécanique",
  "vélo . pliant mécanique",
  "vélo . pliant",
  "vélo . pliant électrique",
  "vélo . motorisation",
  "vélo . état . neuf",
  "vélo . état . occasion",
  "localisation . code insee",
  "localisation . epci",
  "localisation . région",
  "localisation . département",
  "vélo . prix",
  "foyer . personnes",
  "revenu fiscal de référence par part . revenu de référence",
  "revenu fiscal de référence par part . nombre de parts",
  "revenu fiscal de référence par part",
  "vélo . état",
  "demandeur . en situation de handicap",
];

const questions = parsedRulesEntries.filter(
  ([name, rule]) =>
    (rule.rawNode.question && !name.startsWith("localisation")) ||
    questionsProxies.includes(name as RuleName)
);

const rulesUsingQuestion = {};

const nbTotalAides = parsedRulesEntries.filter(
  ([name, _]) => name.startsWith("aides") && name.split(" . ").length === 2
).length;

questions.forEach(([questionName, _]) => {
  // console.log(questionName);
  for (const [ruleName, rule] of parsedRulesEntries) {
    if (ruleName === questionName || !ruleName.startsWith("aides")) continue;
    const ref = reduceAST(
      // @ts-ignore
      (_, node) => {
        if (node.nodeKind === "reference" && node.dottedName === questionName) {
          return node;
        }
      },
      undefined,
      rule
    );
    if (ref) {
      // console.log("found", ref.rawNode, "in", ruleName);
      if (!rulesUsingQuestion[questionName]) {
        rulesUsingQuestion[questionName] = [];
      }
      rulesUsingQuestion[questionName].push(ruleName);
    }
  }
});

let missingAidsInJagis = new Set<string>();

console.log("## Résumé de l'impact des questions sur les aides\n");
console.log(
  `| Question | Nombre d'aides impactées (total ${nbTotalAides}) | Dans J'agis |`
);
console.log(
  `| -------- | ---------------------------------------------- | ----------- |`
);
questions.forEach(([questionName, _]) => {
  const impactedAids = rulesUsingQuestion[questionName];
  const inJagis = questionsInJagis.includes(questionName);
  if (!inJagis) {
    impactedAids?.forEach((aide) => {
      missingAidsInJagis.add(aide);
    });
  }
  console.log(
    `| \`${questionName}\` | ${impactedAids?.length ?? 0} | ${
      questionsInJagis.includes(questionName) ? "✅" : "❌"
    } |`
  );
});

console.log(
  `\nAu total, **${missingAidsInJagis.size}** aides sur **${nbTotalAides}** sont impactées par des questions qui ne sont pas dans J'agis.`
);
