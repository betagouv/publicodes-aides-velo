import { rules } from "..";
import Engine, { formatValue } from "publicodes";

// TODO: To we really need this feature? Could we automatically infer descriptions from the formulas?
const defaultDescription = "";
export function formatDescription({
  ruleName,
  engine,
  veloCat,
  ville,
}: {
  ruleName: rules.RuleName;
  engine: Engine;
  veloCat: string;
  ville: string;
}) {
  const { rawNode } = engine.getRule(ruleName);
  const description = rawNode?.description ?? defaultDescription;
  const plafondRuleName = `${ruleName} . $plafond`;
  const plafondIsDefined = Object.keys(engine.getParsedRules()).includes(
    plafondRuleName,
  );
  const plafond = plafondIsDefined && engine.evaluate(plafondRuleName);
  return description
    .replace(
      /\$vélo/g,
      veloCat === "motorisation" ? "kit de motorisation" : `vélo ${veloCat}`,
    )
    .replace(
      /\$plafond/,
      formatValue(plafond?.nodeValue, { displayedUnit: "€" }),
    )
    .replace(/\$ville/, ville?.nom);
}
