/**
 * Main entry point of the library.
 *
 * We unify all the exports here. This way, the user can import everything from
 * the library with a single import statement: both the Publicodes rules, the
 * wrapper functions, and the types.
 */

// TODO: est-ce que l'on ne souhaiterait pas pouvoir tout exposer ici ?
export * as rules from "./compiled-rules";

export * as data from "./data";
