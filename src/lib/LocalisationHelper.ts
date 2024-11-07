import _communes from "../data/communes.json" assert { type: "json" };
import { slugify } from "./utils";

const communes = _communes as Commune[];

/**
 * A commune in France with its population, region, departement, EPCI, and
 * postal codes.
 *
 * @note This is filtered and transformed data from the
 * `@etalab/decoupage-administratif` package so please refer to
 * https://unpkg.com/@etalab/decoupage-administratif@4.0.0/data/communes.json
 * if you have a doubt about the format of the data.
 */
type Commune = {
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
 * Helper functions to work with localisation data used for testing purpose.
 *
 * @note This is probably a temporary solution until we extract the
 * localisation data to a separate package.
 *
 * @note This should probably be moved to the test folder.
 */
export class LocalisationHelper {
  /**
   * Get the commune by its name.
   *
   * @param name The name of the commune (e.g. "Paris").
   * @returns The commune if found, `undefined` otherwise.
   *
   * @note This is a temporary solution until we extract the localisation data
   * to a separate package.
   *
   * @experimental
   */
  static getCommuneByName(name: string): Commune | undefined {
    return communes.find(({ slug }) => slug === slugify(name));
  }

  /**
   * Get the commune by its INSEE code.
   *
   * @param inseeCode The INSEE code of the commune (e.g. "75056").
   * @returns The commune if found, `undefined` otherwise.
   *
   * @note The INSEE code is not the same as the postal code. It's a unique
   * identifier for each commune in France in contrast to the postal code which
   * can be shared by multiple communes.
   *
   * @note This is a temporary solution until we extract the localisation data
   * to a separate package.
   *
   * @experimental
   */
  static getCommuneByInseeCode(inseeCode: string): Commune | undefined {
    return communes.find(({ code }) => code === inseeCode);
  }
}
