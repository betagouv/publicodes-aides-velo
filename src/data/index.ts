import collectivities from "./aides-collectivities.json" assert { type: "json" };
import rawMiniatures from "./miniatures.json" assert { type: "json" };

/**
 * Full localisation of a commune, departement, region, or EPCI.
 *
 * @note This is useful to fill the `localisation` namespace in the Publicodes
 * situation before evaluating the rules.
 */
export type Localisation = {
  /** The collectivity scale and value */
  collectivity: {
    kind: "pays" | "région" | "département" | "epci" | "code insee";
    value: string;
    code?: string;
  };
  country: "france" | "monaco" | "luxembourg";
};

/**
 * All rule name that are considered to be aids and have a corresponding
 * localisation in {@link aidesAvecLocalisation}.
 */
export type AideRuleNames = keyof typeof collectivities;

/**
 * The collection of all rules considered to be aids with their associated
 * localisation.
 *
 * @note This is useful to fill the Publicodes situation with the right
 * localisation even when the user has only provided the city name or postal
 * code.
 */
export const aidesAvecLocalisation = collectivities as Record<
  AideRuleNames,
  Localisation
>;

/**
 * Associates each rule name with the URL of the miniature of the corresponding
 * collectivity. They target the
 * `github.com/betagouv/aides-jeunes/public/img/institution` directory.
 */
export const miniatures = rawMiniatures as Record<AideRuleNames, string>;
