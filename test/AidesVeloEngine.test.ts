import { describe, expect, it } from "vitest";
import { Aide, AideRuleNames, AidesVeloEngine } from "../src";
import { Localisation } from "../src/data";

describe("AidesVeloEngine", () => {
  describe("new AidesVeloEngine()", () => {
    it("should return an instance of AidesVeloEngine with corrects rules parsed", () => {
      const engine = new AidesVeloEngine();
      expect(engine).toBeInstanceOf(AidesVeloEngine);

      const parsedRules = engine.getEngine().getParsedRules();
      expect(parsedRules["aides"]).toBeDefined();
      expect(parsedRules["vélo"]).toBeDefined();
    });
  });

  const globalTestEngine = new AidesVeloEngine();

  describe("setInputs()", () => {
    it("should correctly set the engine's situation", () => {
      const engine = globalTestEngine.shallowCopy();
      engine.setInputs({ "vélo . type": "pliant" });

      const situation = engine.getEngine().getSituation();
      expect(situation["vélo . type"]).toEqual("'pliant'");
    });

    it("should correctly handle undefined values", () => {
      const engine = globalTestEngine.shallowCopy();
      engine.setInputs({ "vélo . type": undefined });

      const situation = engine.getEngine().getSituation();
      expect(situation["vélo . type"]).toBeUndefined();
    });
  });

  describe("getOptions()", () => {
    it("should return the correct options 'vélo . type'", () => {
      const engine = globalTestEngine.shallowCopy();
      const options = engine.getOptions("vélo . type");

      expect(options).toEqual([
        "mécanique simple",
        "électrique",
        "cargo",
        "cargo électrique",
        "pliant",
        "pliant électrique",
        "motorisation",
        "adapté",
      ]);
    });

    it("should return the correct options 'vélo . état'", () => {
      const engine = globalTestEngine.shallowCopy();
      const options = engine.getOptions("vélo . état");

      expect(options).toEqual(["neuf", "occasion"]);
    });

    it("should return the correct options 'demandeur . statut'", () => {
      const engine = globalTestEngine.shallowCopy();
      const options = engine.getOptions("demandeur . statut");

      expect(options).toEqual([
        "étudiant",
        "apprenti",
        "demandeur d'emploi",
        "salarié",
        "retraité",
        "reconversion",
        "autre",
      ]);
    });
  });

  describe("getAllAidesIn()", () => {
    it("should return all aids in France by default", () => {
      const engine = globalTestEngine.shallowCopy();
      const allAides = engine.getAllAidesIn();

      expect(allAides).not.toHaveLength(0);
      allAides.forEach((aide) => {
        expect(aide.id).toBeDefined();
        expect(aide.title).toBeDefined();
        expect(aide.url).toBeDefined();
        expect(aide.collectivity).toBeDefined();

        if (aide.collectivity.kind === "pays") {
          expect(aide.collectivity.value).toMatch("France");
        }

        // Doit correctement prendre en compte les exclusions et
        // les différentes échelles.
        if (aide.id === "aides . region centre") {
          expect(aide.collectivity).toEqual({
            kind: "région",
            value: "24",
          });
        }
      });
    });

    /**
     * NOTE: for now, we verify that all aids have a description although it is not
     * required in the {@link Aide} type. This is because we want to force the
     * user to check if the description is defined before using it allowing us
     * to remove the constraint in the future if needed without breaking the API.
     */
    it("should have a description", function () {
      const engine = globalTestEngine.shallowCopy();
      const countries: Array<Localisation["country"]> = [
        "france",
        "monaco",
        "luxembourg",
      ];

      countries.forEach((country) => {
        const allAides = engine.getAllAidesIn(country);
        allAides.forEach((aide) => {
          expect(aide.description).toBeDefined();
          expect(
            typeof aide.description,
            `Description should be a string for benefit: ${aide.title} (${country})`
          ).toBe("string");
          expect(
            aide.description?.length,
            `Description cannot be empty for benefit: ${aide.title} (${country})`
          ).toBeGreaterThan(0);
          const innerText = aide.description
            ?.replace(/<\/?[^>]+>/gi, "")
            .replace(/\s\s+/g, " ")
            .trim();
          expect(
            innerText?.length,
            `Description must be at least 10 characters for benefit: ${aide.title} (${country})`
          ).toBeGreaterThanOrEqual(10);
          if (innerText?.length! > 420) {
            console.warn(
              `Description text length (${innerText?.length}) exceeds maximum allowed length of 420 characters for benefit: ${aide.title} (${country})`
            );
          }
        });
      });
    });

    it("should return all aids in Luxembourg if specified", () => {
      const engine = globalTestEngine.shallowCopy();
      const allAides = engine.getAllAidesIn("luxembourg");

      expect(allAides).toHaveLength(1);
      allAides.forEach((aide) => {
        expect(aide.id).toBeDefined();
        expect(aide.title).toBeDefined();
        expect(aide.url).toBeDefined();
        expect(aide.collectivity).toBeDefined();

        if (aide.collectivity.kind === "pays") {
          expect(aide.collectivity.value).toMatch("Luxembourg");
        }
      });
    });

    it("should return all aids in Monaco if specified", () => {
      const engine = globalTestEngine.shallowCopy();
      const allAides = engine.getAllAidesIn("monaco");

      expect(allAides).toHaveLength(1);
      allAides.forEach((aide) => {
        expect(aide.id).toBeDefined();
        expect(aide.title).toBeDefined();
        expect(aide.url).toBeDefined();
        expect(aide.collectivity).toBeDefined();

        if (aide.collectivity.kind === "pays") {
          expect(aide.collectivity.value).toMatch("Monaco");
        }
      });
    });

    it("should correctly parse dates", () => {
      const engine = globalTestEngine.shallowCopy();
      const allAides = engine.getAllAidesIn("france");

      allAides.forEach((aide) => {
        if (aide.id === "aides . entzheim") {
          expect(aide.lastUpdate).toEqual(new Date(2025, 3, 10));
          expect(aide.endDate).toEqual(new Date(2025, 11, 31));
          return;
        }
      });
    });
  });

  describe("computeAides()", () => {
    it("should return default aids in France with empty inputs", () => {
      const engine = globalTestEngine.shallowCopy();
      const aides = engine.computeAides();

      expect(aides).toHaveLength(0);
    });

    it("should correctly manage multiple localisations", () => {
      const engine = globalTestEngine.shallowCopy();
      let aides = engine
        .setInputs({
          "localisation . epci": "CC Orne Lorraine Confluences",
          "localisation . pays": "France",
          "vélo . prix": 1000,
        })
        .computeAides();

      expect(aides).toHaveLength(1);
      expect(aides[0].id).toEqual("aides . st2b");
      expect(aides[0].amount).toEqual(300);
      expect(aides[0].collectivity).toEqual({
        kind: "epci",
        value: "CC Orne Lorraine Confluences",
        code: "200070845",
      });

      aides = engine
        .setInputs({
          "localisation . epci": "CC Coeur du Pays Haut",
          "localisation . pays": "France",
          "vélo . prix": 1000,
        })
        .computeAides();

      expect(aides).toHaveLength(1);
      expect(aides[0].id).toEqual("aides . st2b");
      expect(aides[0].amount).toEqual(300);
      // FIXME: should manage multiple localisations (see generate-aides-collectivities.ts)
      // expect(aides[2].collectivity).toEqual({
      //   kind: "epci",
      //   value: "CC Coeur du Pays Haut",
      //   code: "200070845",
      // });
    });

    describe("with specific inputs", () => {
      it("Ville de Montmorillon - vélo électrique", () => {
        const engine = globalTestEngine.shallowCopy();
        const aides = engine
          .setInputs({
            "localisation . code insee": "86165",
            "localisation . epci": "CC Vienne et Gartempe",
            "localisation . département": "86",
            "localisation . région": "75",
            "localisation . pays": "France",
            "vélo . type": "électrique",
          })
          .computeAides();

        expect(aides).toHaveLength(2);
        expect(contain(aides, "aides . montmorillon")).toBeTruthy();
        expect(contain(aides, "aides . vienne gartempe")).toBeTruthy();
      });

      it("Angers - vélo électrique sans abonnement TER", async () => {
        const engine = globalTestEngine.shallowCopy();

        const aides = engine
          .setInputs({
            "localisation . code insee": "49007",
            "localisation . epci": "CU Angers Loire Métropole",
            "localisation . département": "49",
            "localisation . région": "52",
            "localisation . pays": "France",
            "vélo . type": "électrique",
          })
          .computeAides();

        expect(aides).toHaveLength(1);
        expect(contain(aides, "aides . angers")).toBeTruthy();
      });

      it("Toulouse - vélo adapté et en situation de handicap", async () => {
        const engine = globalTestEngine.shallowCopy();
        const aides = engine
          .setInputs({
            "localisation . code insee": "31555",
            "localisation . epci": "Toulouse Métropole",
            "localisation . département": "31",
            "localisation . région": "76",
            "localisation . pays": "France",
            "vélo . type": "adapté",
            "demandeur . en situation de handicap": true,
          })
          .computeAides();

        expect(aides).toHaveLength(1);
        expect(contain(aides, "aides . occitanie vélo adapté")).toBeTruthy();
      });

      it("Montpellier - vélo adapté et en situation de handicap", async () => {
        const engine = globalTestEngine.shallowCopy();
        const aides = engine
          .setInputs({
            "localisation . code insee": "34172",
            "localisation . epci": "Montpellier Méditerranée Métropole",
            "localisation . département": "34",
            "localisation . région": "76",
            "localisation . pays": "France",
            "vélo . type": "adapté",
            "demandeur . en situation de handicap": true,
          })
          .computeAides();

        expect(aides).toHaveLength(3);
        expect(contain(aides, "aides . occitanie vélo adapté")).toBeTruthy();
        expect(
          contain(
            aides,
            "aides . département hérault vélo adapté",
            ({ description }) =>
              description?.includes("Chèque Hérault Handi-Vélo")
          )
        ).toBeTruthy();
        expect(contain(aides, "aides . montpellier vélo adapté")).toBeTruthy();
      });

      it("CA du Centre Littoral - vélo électrique", async () => {
        const engine = globalTestEngine.shallowCopy();
        const aides = engine
          .setInputs({
            "localisation . epci": "CA du Centre Littoral",
            "localisation . pays": "France",
            "vélo . type": "électrique",
          })
          .computeAides();

        expect(aides).toHaveLength(1);
        expect(contain(aides, "aides . cacl")).toBeTruthy();
      });

      describe("Région Centre-Val de Loire", () => {
        it("Nogent-le-Rotrou devrait être élligible", () => {
          const engine = globalTestEngine.shallowCopy();
          const aides = engine
            .setInputs({
              "localisation . région": "24",
              "localisation . epci": "CC du Perche",
              "localisation . code insee": "28280",
              "demandeur . âge": 18,
              "vélo . prix": 700,
              "vélo . type": "électrique",
            })
            .computeAides();

          expect(aides).toHaveLength(1);
          expect(contain(aides, "aides . region centre")).toBeTruthy();
        });

        it("Commune de Pigny ne devrait pas être élligible", () => {
          const engine = globalTestEngine.shallowCopy();
          const aides = engine
            .setInputs({
              "localisation . région": "24",
              "localisation . epci": "CC Terres du Haut Berry",
              "localisation . code insee": "18179",
              "demandeur . âge": 18,
              "vélo . prix": 700,
              "vélo . type": "électrique",
            })
            .computeAides();

          expect(aides).toHaveLength(0);
        });
      });
    });
  });
});

function contain(
  aides: Aide[],
  id: AideRuleNames,
  fn?: (aide: Aide) => boolean | undefined
): boolean {
  return aides.some((aide) => aide.id === id && (!fn || fn(aide) === true));
}
