import rawCommunes from "./communes.json" assert { type: "json" };
import collectivities from "./aides-collectivities.json" assert { type: "json" };
import rawMiniatures from "./miniatures.json" assert { type: "json" };

/**
 * A commune in France with its population, region, departement, EPCI, and
 * postal codes.
 *
 * @note This is filtered and transformed data from the
 * `@etalab/decoupage-administratif` package.
 */
export type Commune = {
  code: string;
  nom: string;
  departement: string;
  region: string;
  population: number;
  zfe: boolean;
  epci: string | null;
  codesPostaux: string[];
  slug: string;
};

/**
 * Full localisation of a commune, departement, region, or EPCI.
 *
 * @note This is useful to fill the `localisation` namespace in the Publicodes
 * situation before evaluating the rules.
 */
export type Localisation = {
  collectivity: {
    kind: "pays" | "région" | "département" | "epci" | "code insee";
    value: string;
    code?: string;
  };
  country: "france" | "monaco" | "luxembourg";
  codeInsee?: string;
  departement?: string;
  slug: string;
  population: number;
};

/**
 * The list of all communes in France with their population, region, departement,
 * and EPCI.
 */
export const communes = rawCommunes as Commune[];

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

export const miniatures = rawMiniatures as Record<AideRuleNames, string>;
