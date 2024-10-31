import { data } from "..";
import { Commune } from "../data";
import { slugify } from "./utils";

/**
 * Helper functions to work with localisation data.
 *
 * @note This is probably a temporary solution until we extract the
 * localisation data to a separate package.
 *
 * @experimental
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
    return data.communes.find(({ slug }) => slug === slugify(name));
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
    return data.communes.find(({ code }) => code === inseeCode);
  }
}
