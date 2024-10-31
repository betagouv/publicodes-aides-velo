import Engine, {
  formatValue,
  Situation as PublicodesSituation,
} from "publicodes";
import {
  AideRuleNames,
  Commune,
  data,
  Localisation,
  Questions,
  RuleName,
  rules,
} from "..";
import { Situation } from "../../publicodes-build";
import { slugify } from "./utils";

/**
 * Represents an aid with its metadata.
 */
export type Aide = {
  /** The rule name of the aid (see {@link AideRuleNames}). */
  id: AideRuleNames;
  /** The title of the aid (as defined in the Publicodes rules). */
  title: string;
  /** The description of the aid (with resolved placeholders). */
  description: string | undefined;
  /** The URL of the aid (as defined in the Publicodes rules). */
  url: string;
  /** The collectivity that provides the aid. */
  collectivity: {
    kind: "pays" | "région" | "département" | "epci" | "code insee";
    value: string;
    code?: string;
  };
  /** The amount of the aid in euros. */
  amount: number;
  /** The miniature URL of the collectivity providing the aid. */
  logo?: string;
};

const aidesAvecLocalisationEntries = Object.entries(
  data.aidesAvecLocalisation,
) as readonly [AideRuleNames, Localisation][];

/**
 * A wrapper around the {@link Engine} class to compute the available aids for the
 * given inputs (which are a subset of the Publicodes situation corresponding to
 * the rules that are questions).
 *
 * @note This class is stateful and should be used to compute the aids for a
 * single situation. If you want to compute the aids for multiple situations,
 * you should create a new instance of this class for each situation. You
 * can use {@link shallowCopy} to create a new instance with the same rules and
 * inputs.
 */
export class AidesVeloEngine {
  private inputs: Questions = {};
  private engine: Engine<RuleName>;

  /**
   * Create a new instance of the engine with a initialized set of rules.
   *
   * @param empty If `true`, the engine will be created with an empty set of
   * rules. Otherwise, it will be created with the default set of rules.
   */
  constructor(empty = false) {
    this.inputs = {};
    this.engine = empty ? new Engine<RuleName>() : new Engine<RuleName>(rules);
  }

  /**
   * Set the inputs of the engine. This will update the Publicodes situation
   * with the given inputs.
   *
   * @param inputs The inputs to set (corresponding to the rules that are
   * questions).
   *
   * @note The format of the inputs are in the JS format, not the Publicodes
   * format. For example, boolean values are represented as `true` or `false`
   * instead of `oui` or `non` and the values are not wrapped in single quotes.
   */
  public setInputs(inputs: Questions): this {
    this.inputs = inputs;
    this.engine.setSituation(
      formatInputs(inputs) as PublicodesSituation<RuleName>,
    );
    return this;
  }

  /**
   * Filter the available aids by the given country.
   *
   * @param country The country to filter the aids by. The default is `france`.
   * @returns The list of available aids with their metadata (see {@link
   * Aide}).
   *
   * @note No computation is done here. This is just a filter on the available
   * aids.
   */
  public getAllAidesIn(
    country: Localisation["country"] = "france",
  ): Omit<Aide, "amount">[] {
    return aidesAvecLocalisationEntries
      .filter(([, { country: aideCountry }]) => aideCountry === country)
      .map(([ruleName]) => {
        const rule = this.engine.getRule(ruleName);
        // PERF: could simplify this by simply extracting the collectivity from
        // the AST instead of the data object. And removing Luxembourg and
        // Monaco to avoid needing to import the whole
        // aides-collectivities.json file?
        const collectivity = data.aidesAvecLocalisation[ruleName].collectivity;

        return {
          id: ruleName,
          title: rule.title,
          description: rule.rawNode.description,
          url: (rule.rawNode as any).lien,
          collectivity,
          logo: data.miniatures[ruleName],
        };
      });
  }

  /**
   * Compute all the available aids for the current inputs (see {@link setInputs}).
   *
   * @returns The list of available aids with their metadata (see {@link Aide}).
   */
  public computeAides(): Aide[] {
    return this.getAllAidesIn(
      (this.inputs["localisation . pays"]?.toLowerCase() ??
        "france") as Localisation["country"],
    ).flatMap((metadata) => {
      const ruleName = metadata.id;
      const { nodeValue } = this.engine.evaluate({
        valeur: metadata.id,
        unité: "€",
      });

      if (typeof nodeValue === "number" && nodeValue > 0) {
        return [
          {
            ...metadata,
            description: this.formatDescription({
              ruleName,
              veloCat: this.engine.evaluate("vélo . type")
                .nodeValue as Questions["vélo . type"],
              ville: "votre ville",
            }),
            amount: nodeValue,
          },
        ];
      } else {
        return [];
      }
    });
  }

  /**
   * Create a shallow copy of the engine with the same rules and inputs. This
   * is useful to compute the aids for multiple situations.
   *
   * @returns A new instance of the engine with the same rules and inputs.
   */
  public shallowCopy() {
    const newEngine = new AidesVeloEngine(true);
    newEngine.inputs = { ...this.inputs };
    newEngine.engine = this.engine.shallowCopy();
    return newEngine;
  }

  /**
   * Return a shallow copy of the wrapped Publicodes engine. This is useful to
   * get the current state of the engine (rules and inputs) without modifying
   * it.
   */
  getEngine(): Engine {
    return this.engine.shallowCopy();
  }

  /**
   * Format the description of an aid by replacing the placeholders with the
   * evaluated values.
   *
   * @param ruleName The name of the rule to format.
   * @param engine The Publicodes engine used to evaluate the rule.
   * @param veloCat The category of the bike.
   * @param ville The name of the city.
   *
   * @returns The formatted description.
   */
  public formatDescription({
    ruleName,
    veloCat,
    ville,
  }: {
    ruleName: RuleName;
    veloCat: Questions["vélo . type"];
    ville: string;
  }) {
    const { rawNode } = this.engine.getRule(ruleName);
    const description = rawNode?.description ?? "";
    const plafondRuleName = `${ruleName} . $plafond`;
    const plafondIsDefined = Object.keys(this.engine.getParsedRules()).includes(
      plafondRuleName,
    );
    const plafond = plafondIsDefined && this.engine.evaluate(plafondRuleName);
    return (
      description
        .replace(
          /\$vélo/g,
          veloCat === "motorisation"
            ? "kit de motorisation"
            : `vélo ${veloCat}`,
        )
        .replace(
          /\$plafond/,
          // TODO: improve Publicodes typing
          // @ts-ignore
          formatValue(plafond?.nodeValue, { displayedUnit: "€" }),
        )
        // NOTE: doesn't seem to be used
        .replace(/\$ville/, ville)
    );
  }

  /**
   * Get the commune by its name.
   *
   * @param name The name of the commune (e.g. "Paris").
   * @returns The commune if found, `undefined` otherwise.
   *
   * @note This would probably be extracted to a separate package to avoid
   * importing the whole 'data.communes' JSON object (which is quite large).
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
   * @note This would probably be extracted to a separate package to avoid
   * importing the whole 'data.communes' JSON object (which is quite large).
   */
  static getCommuneByInseeCode(inseeCode: string): Commune | undefined {
    return data.communes.find(({ code }) => code === inseeCode);
  }
}

function formatInputs(inputs: Questions): Partial<Situation> {
  const entries = Object.entries(inputs);

  const transformedEntries = entries.map(([key, val]) => {
    let transformedVal: string | number | boolean | null;

    if (typeof val === "boolean") {
      transformedVal = val ? "oui" : "non";
    } else if (key === "localisation . epci") {
      transformedVal = val ? `'${epciSirenToName[val] || val}'` : null;
    } else if (typeof val === "string") {
      transformedVal = `'${val}'`;
    } else {
      transformedVal = val;
    }

    return [key, transformedVal];
  });

  const transformedInput = Object.fromEntries(transformedEntries);

  return transformedInput;
}

const epciSirenToName = Object.fromEntries(
  aidesAvecLocalisationEntries.flatMap(([, { collectivity }]) => {
    if (collectivity.kind !== "epci") {
      return [];
    }
    return [[(collectivity as any).code, collectivity.value]];
  }),
);
