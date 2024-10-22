import Engine, { serializeEvaluation, serializeUnit } from "publicodes";
import rules from "../build";

describe("Salaire net", () => {
  test("salaire brut par défaut", () => {
    const engine = new Engine(rules);
    const result = engine.evaluate("salaire net");

    expect(result.nodeValue).toBe(1957.5);
    expect(serializeEvaluation(result)).toBe("1957.5€/mois");
  });

  test.each([
    [1957.5, 2500],
    [2740.5, 3500],
    [0, 0],
  ])("%f €/mois, avec salaire brut = %f €/mois", (salaireNet, salaireBrut) => {
    const engine = new Engine(rules);
    engine.setSituation({ "salaire brut": salaireBrut });
    const result = engine.evaluate("salaire net");

    expect(result.nodeValue).toBe(salaireNet);
    expect(serializeUnit(result.unit)).toBe("€/mois");
  });
});
