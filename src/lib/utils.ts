import { ASTNode, reduceAST } from "publicodes";

/**
 * Slugify a string by removing accents, converting to lowercase, and replacing
 * spaces with hyphens.
 *
 * @note It's used to generate the slugified name of the communes.
 *
 * Source: https://byby.dev/js-slugify-string
 */
export function slugify(str: string): string {
  return str
    .normalize("NFKD") // split accented characters into their base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, "") // remove all the accents, which happen to be all in the \u03xx UNICODE block.
    .trim() // trim leading or trailing whitespace
    .replace("œ", "oe") // Remove invalid chars
    .toLowerCase() // convert to lowercase
    .replace(/[^a-z0-9 -]/g, "") // remove non-alphanumeric characters
    .replace(/\s+/g, "-") // replace spaces with hyphens
    .replace(/-+/g, "-"); // remove consecutive hyphens
}

/**
 * Extract all the possibilities from a rule.
 *
 * @param rule The rule to extract the possibilities from.
 * @returns The list of possibilities or undefined if the rule doesn't have any.
 *
 * @note this should probably be moved to the publicodes package.
 */
export function extractOptions<T>(rule: ASTNode): T[] | undefined {
  return reduceAST<T[] | undefined>(
    (_, node) => {
      if (node.nodeKind === "une possibilité") {
        return node.explanation
          .map((e) => {
            if (e.nodeKind === "reference") {
              return e.name;
            }
          })
          .filter(Boolean) as T[];
      }
    },
    undefined,
    rule,
  );
}
