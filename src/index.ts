/**
 * Main entry point of the library.
 *
 * We unify all the exports here. This way, the user can import everything from
 * the library with a single import statement: both the Publicodes rules, the
 * wrapper functions, and the types.
 */

export type { Questions, RuleName, Situation } from "../publicodes-build"
export type { AideRuleNames, Localisation } from "./data"
export { aidesWithLocalisation } from "./data"

export { AidesVeloEngine } from "./lib/AidesVeloEngine"
export type { Aide } from "./lib/AidesVeloEngine"
export { slugify } from "./lib/utils"
