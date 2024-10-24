/**
 * Main entry point of the library.
 *
 * We unify all the exports here. This way, the user can import everything from
 * the library with a single import statement: both the Publicodes rules, the
 * wrapper functions, and the types.
 */

import Publicodes, { formatValue } from "publicodes";
import { AideRuleNames, Localisation } from "./data";

// Export the compiled rules and the types.

import compiledRules, { Questions, RuleName } from "../build";
export type { Questions, RuleName } from "../build";
/**
 * Publicodes rules compiled in a single JSON object.
 */
export const rules = compiledRules;

// Export generated data

import * as data from "./data";
import Engine from "publicodes";
export * as data from "./data";
export type { AideRuleNames, Commune, Localisation } from "./data";

// Export the main functions

export type Aide = {
  id: string;
  title: string;
  description: string | undefined;
  url: string;
  collectivity: {
    kind: "pays" | "région" | "département" | "epci" | "code insee";
    value: string;
    code?: string;
  };
  /**
   * Le montant de l'aide est calculé seulement si le type de vélo a été
   * précisé en entrée.
   */
  amount?: number;
};

const aidesAvecLocalisationEntries = Object.entries(
  data.aidesAvecLocalisation,
) as readonly [AideRuleNames, Localisation][];

// NOTE: don't we need to abstract the instanciation with an injected engine or interface?
const engine = new Publicodes(rules);

/**
 *  Retourne la liste des aides disponibles pour une situation donnée
 */
export default function aidesVelo(inputs: Questions = {}): Array<Aide> {
  engine.setSituation(formatInput(inputs));

  return aidesAvecLocalisationEntries
    .filter(
      ([, { country: aideCountry }]) =>
        !inputs["localisation . pays"] ||
        aideCountry === inputs["localisation . pays"].toLowerCase(),
    )
    .flatMap(([ruleName]) => {
      const rule = engine.getRule(ruleName);
      const collectivity = data.aidesAvecLocalisation[ruleName].collectivity;

      const metaData = {
        id: ruleName,
        title: rule.title,
        description: rule.rawNode.description,
        url: (rule.rawNode as any).lien,
        collectivity,
      };

      if (!inputs["vélo . type"]) {
        return [metaData];
      }
      const { nodeValue } = engine.evaluate({ valeur: ruleName, unité: "€" });
      if (typeof nodeValue === "number" && nodeValue > 0) {
        return [
          {
            ...metaData,
            description: formatDescription({
              ruleName,
              engine,
              veloCat: inputs["vélo . type"],
              ville: "votre ville",
            }),
            amount: nodeValue,
          },
        ];
      } else {
        return [];
      }
    });
}

const formatInput = (input: Questions) =>
  Object.fromEntries(
    Object.entries(input)
      .map(([key, val]) => {
        return val
          ? [
              key,
              typeof val === "boolean"
                ? val
                  ? "oui"
                  : "non"
                : key === "localisation . epci"
                  ? `'${epciSirenToName[val]}'`
                  : typeof val === "string"
                    ? `'${val}'`
                    : val,
            ]
          : null;
      })
      .filter(Boolean) as [string, string][],
  );

const epciSirenToName = Object.fromEntries(
  aidesAvecLocalisationEntries.flatMap(([, { collectivity }]) => {
    if (collectivity.kind !== "epci") {
      return [];
    }
    return [[(collectivity as any).code, collectivity.value]];
  }),
);

/**
 * Format the description of an aid by replacing the placeholders with the
 * evaluated values.
 *
 * @param ruleName The name of the rule to format.
 * @param engine The Publicodes engine used to evaluate the rule.
 * @param veloCat The category of the bike.
 * @param ville The name of the city.
 *
 * @returns The formatted description.
 */
export function formatDescription({
  ruleName,
  engine,
  veloCat,
  ville,
}: {
  ruleName: RuleName;
  engine: Engine;
  veloCat: Questions["vélo . type"];
  ville: string;
}) {
  const { rawNode } = engine.getRule(ruleName);
  const description = rawNode?.description ?? "";
  const plafondRuleName = `${ruleName} . $plafond`;
  const plafondIsDefined = Object.keys(engine.getParsedRules()).includes(
    plafondRuleName,
  );
  const plafond = plafondIsDefined && engine.evaluate(plafondRuleName);
  return (
    description
      .replace(
        /\$vélo/g,
        veloCat === "motorisation" ? "kit de motorisation" : `vélo ${veloCat}`,
      )
      .replace(
        /\$plafond/,
        // TODO: improve Publicodes typing
        // @ts-ignore
        formatValue(plafond?.nodeValue, { displayedUnit: "€" }),
      )
      // NOTE: doesn't seem to be used
      .replace(/\$ville/, ville)
  );
}
