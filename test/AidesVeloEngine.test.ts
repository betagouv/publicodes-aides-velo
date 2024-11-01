import {
  Aide,
  AideRuleNames,
  AidesVeloEngine,
  LocalisationHelper,
} from "../src";

describe("AidesVeloEngine", () => {
  describe("new AidesVeloEngine()", () => {
    it("should return an instance of AidesVeloEngine with corrects rules parsed", () => {
      const engine = new AidesVeloEngine();
      expect(engine).toBeInstanceOf(AidesVeloEngine);

      const parsedRules = engine.getEngine().getParsedRules();
      expect(parsedRules["aides"]).toBeDefined();
      expect(parsedRules["aides . bonus vélo"]).toBeDefined();
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
  });

  describe("computeAides()", () => {
    it("should return default aids in France with empty inputs", () => {
      const engine = globalTestEngine.shallowCopy();
      const aides = engine.computeAides();

      expect(aides).toHaveLength(2);
      expect(contain(aides, "aides . bonus vélo")).toBeTruthy();
      expect(contain(aides, "aides . prime à la conversion")).toBeTruthy();
    });

    describe("with specific inputs", () => {
      it("Ville de Montmorillon - vélo électrique", () => {
        const engine = globalTestEngine.shallowCopy();
        const commune = LocalisationHelper.getCommuneByName("Montmorillon");

        expect(commune).toBeDefined();
        const aides = engine
          .setInputs({
            "localisation . code insee": commune?.code,
            "localisation . epci": commune?.epci ?? undefined,
            "localisation . département": commune?.departement,
            "localisation . région": commune?.region,
            "localisation . pays": "France",
            "vélo . type": "électrique",
          })
          .computeAides();

        expect(aides).toHaveLength(4);
        expect(contain(aides, "aides . montmorillon")).toBeTruthy();
        expect(contain(aides, "aides . vienne gartempe")).toBeTruthy();
      });

      it("Angers - vélo électrique avec abonnement TER", async () => {
        const engine = globalTestEngine.shallowCopy();
        const commune = LocalisationHelper.getCommuneByName("Angers");
        expect(commune).toBeDefined();

        const aides = engine
          .setInputs({
            "localisation . code insee": commune?.code,
            "localisation . epci": commune?.epci ?? undefined,
            "localisation . département": commune?.departement,
            "localisation . région": commune?.region,
            "localisation . pays": "France",
            "vélo . type": "électrique",
          })
          .computeAides();

        expect(aides).toHaveLength(4);
        expect(contain(aides, "aides . bonus vélo")).toBeTruthy();
        expect(contain(aides, "aides . prime à la conversion")).toBeTruthy();
        expect(contain(aides, "aides . pays de la loire")).toBeTruthy();
        expect(contain(aides, "aides . angers")).toBeTruthy();
      });

      it("Angers - vélo électrique sans abonnement TER", async () => {
        const engine = globalTestEngine.shallowCopy();
        const commune = LocalisationHelper.getCommuneByName("Angers");
        expect(commune).toBeDefined();

        const aides = engine
          .setInputs({
            "localisation . code insee": commune?.code,
            "localisation . epci": commune?.epci ?? undefined,
            "localisation . département": commune?.departement,
            "localisation . région": commune?.region,
            "localisation . pays": "France",
            "vélo . type": "électrique",
            "aides . pays de la loire . abonné TER": false,
          })
          .computeAides();

        expect(aides).toHaveLength(3);
        expect(contain(aides, "aides . bonus vélo")).toBeTruthy();
        expect(contain(aides, "aides . prime à la conversion")).toBeTruthy();
        expect(contain(aides, "aides . angers")).toBeTruthy();
      });

      it("Toulouse - vélo adapté et en situation de handicap", async () => {
        const engine = globalTestEngine.shallowCopy();
        const commune = LocalisationHelper.getCommuneByName("Toulouse");
        expect(commune).toBeDefined();

        const aides = engine
          .setInputs({
            "localisation . code insee": commune?.code,
            "localisation . epci": commune?.epci ?? undefined,
            "localisation . département": commune?.departement,
            "localisation . région": commune?.region,
            "localisation . pays": "France",
            "vélo . type": "adapté",
            "demandeur . en situation de handicap": true,
          })
          .computeAides();

        expect(aides).toHaveLength(3);
        expect(
          contain(
            aides,
            "aides . bonus vélo",
            ({ description }) => description?.includes("adapté") ?? false,
          ),
        ).toBeTruthy();
        expect(contain(aides, "aides . occitanie vélo adapté")).toBeTruthy();
      });

      it("Montpellier - vélo adapté et en situation de handicap", async () => {
        const engine = globalTestEngine.shallowCopy();
        const commune = LocalisationHelper.getCommuneByName("Montpellier");
        expect(commune).toBeDefined();

        const aides = engine
          .setInputs({
            "localisation . code insee": commune?.code,
            "localisation . epci": commune?.epci ?? undefined,
            "localisation . département": commune?.departement,
            "localisation . région": commune?.region,
            "localisation . pays": "France",
            "vélo . type": "adapté",
            "demandeur . en situation de handicap": true,
          })
          .computeAides();

        expect(aides).toHaveLength(5);
        expect(
          contain(aides, "aides . bonus vélo", ({ description }) =>
            description?.includes("adapté"),
          ),
        ).toBeTruthy();
        expect(contain(aides, "aides . prime à la conversion")).toBeTruthy();
        expect(contain(aides, "aides . occitanie vélo adapté")).toBeTruthy();
        expect(
          contain(
            aides,
            "aides . département hérault vélo adapté",
            ({ description }) =>
              description?.includes("Chèque Hérault Handi-Vélo"),
          ),
        ).toBeTruthy();
        expect(contain(aides, "aides . montpellier vélo adapté")).toBeTruthy();
      });
    });
  });
});

function contain(
  aides: Aide[],
  id: AideRuleNames,
  fn?: (aide: Aide) => boolean | undefined,
): boolean {
  return aides.some((aide) => aide.id === id && (!fn || fn(aide) === true));
}
