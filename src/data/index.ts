import rawCommunes from "./communes.json" assert { type: "json" };
import collectivities from "./aides-collectivities.json" assert { type: "json" };
import rawMiniatures from "./miniatures.json" assert { type: "json" };

/**
 * A commune in France with its population, region, departement, EPCI, and
 * postal codes.
 *
 * @note This is filtered and transformed data from the
 * `@etalab/decoupage-administratif` package so please refer to
 * https://unpkg.com/@etalab/decoupage-administratif@4.0.0/data/communes.json
 * if you have a doubt about the format of the data.
 */
export type Commune = {
  /** The INSEE code */
  code: string;
  /** The name (as defined in `@etalab/decoupage-administratif`) */
  nom: string;
  /** The departement code (e.g. "75" for Paris) */
  departement: string;
  /** The region code (e.g. "11" for Île-de-France) */
  region: string;
  /** The size of the population */
  population: number;
  /** Whether the commune is in a low-emission zone */
  zfe: boolean;
  /** The EPCI name (e.g. "Métropole du Grand Paris") */
  epci?: string;
  /** The postal codes (e.g. ["75001", "75002"]) */
  codesPostaux: string[];
  /** The slugified name (e.g. "le-chatelet-sur-sormonne") */
  slug: string;
};

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
  codeInsee?: string;
  /** The departement code (e.g. "75" for Paris) */
  departement?: string;
  /** The slugified name (e.g. "le-chatelet-sur-sormonne") */
  slug: string;
  /** The size of the population */
  population: number;
};

/**
 * The list of all communes in France with their population, region,
 * departement, and EPCI.
 *
 * @note This will probably be extracted to a separate package to avoid
 * importing the whole `communes.json` file (which is quite large) or simply
 * rely directly on the `@etalab/decoupage-administratif` package.
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

/**
 * The list of all miniatures file name corresponding to the collectivities
 * providing the aids.
 *
 * TODO: host the images on a CDN and provide the full URL instead of the
 * filename.
 */
export const miniatures = rawMiniatures as Record<AideRuleNames, string>;
