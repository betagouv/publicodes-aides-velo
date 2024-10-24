import rawCommunes from "./communes.json" assert { type: "json" };
import collectivities from "./aides-collectivities.json" assert { type: "json" };
import rawMiniatures from "./miniatures.json" assert { type: "json" };

/**
 * A commune in France with its population, region, departement, EPCI, and
 * postal codes.
 *
 * @param code The INSEE code
 * @param nom The name
 * @param departement The departement code (e.g. "75" for Paris)
 * @param region The region code (e.g. "11" for Île-de-France)
 * @param population The size of the population
 * @param zfe Whether the commune is in a low-emission zone
 * @param epci The EPCI name (e.g. "Métropole du Grand Paris")
 * @param codesPostaux The postal codes (e.g. ["75001", "75002"])
 * @param slug The slugified name (e.g. "paris")
 *
 * @note This is filtered and transformed data from the
 * `@etalab/decoupage-administratif` package so please refer to
 * https://unpkg.com/@etalab/decoupage-administratif@4.0.0/data/communes.json
 * if you have a doubt about the format of the data.
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
