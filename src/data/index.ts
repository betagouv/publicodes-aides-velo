import collectivities from "./aides-collectivities.json" with { type: "json" }
import rawMiniatures from "./miniatures.json" with { type: "json" }

export type CollectivityKind =
  | "pays"
  | "région"
  | "département"
  | "epci"
  | "code insee"

export type Collectivity = {
  kind: CollectivityKind
  value: string
  code?: string
}

/**
 * Full localisation of a commune, departement, region, or EPCI.
 *
 * @note This is useful to fill the `localisation` namespace in the Publicodes
 * situation before evaluating the rules.
 *
 * @param country The country of the collectivity. It can be "france", "monaco", or "luxembourg". We need this information to fill the `localisation . pays` variable in the Publicodes situation.
 */
export type Localisation =
  | {
      country: "france"
      collectivity: Collectivity
      codeInsee: string
      epci: string
      departement: string
      region: string
      population: number
      slug: string | undefined
    }
  | {
      country: "monaco" | "luxembourg"
      collectivity: Collectivity
    }

/**
 * All rule name that are considered to be aids and have a corresponding
 * localisation in {@link aidesWithLocalisation}.
 */
export type AideRuleNames = keyof typeof collectivities

/**
 * The collection of all rules considered to be aids with their associated
 * localisation.
 *
 * @note This is useful to fill the Publicodes situation with the right
 * localisation even when the user has only provided the city name or postal
 * code.
 */
export const aidesWithLocalisation = collectivities as Record<
  AideRuleNames,
  Localisation
>

/**
 * Associates each rule name with the URL of the miniature of the corresponding
 * collectivity. They target the
 * `github.com/betagouv/aides-jeunes/public/img/institution` directory.
 */
export const miniatures = rawMiniatures as Record<AideRuleNames, string>
