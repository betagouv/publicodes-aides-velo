/**
 * Main entry point of the library.
 *
 * We unify all the exports here. This way, the user can import everything from
 * the library with a single import statement: both the Publicodes rules, the
 * wrapper functions, and the types.
 */

// Export the compiled rules and the types.

import compiledRules from "../publicodes-build";
export type { Questions, RuleName } from "../publicodes-build";
/**
 * Publicodes rules compiled in a single JSON object.
 */
export const rules = compiledRules;

// Export generated data

export * as data from "./data";
export type { AideRuleNames, Commune, Localisation } from "./data";

// Export the utils functions.

export { slugify } from "./lib/utils";

// Export the AidesVeloEngine class and the Aide type.

export { AidesVeloEngine } from "./lib/AidesVeloEngine";
export type { Aide } from "./lib/AidesVeloEngine";
