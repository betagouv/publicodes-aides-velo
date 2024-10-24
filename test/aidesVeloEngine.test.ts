import { AidesVeloEngine } from "../src";

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
      expect(aides[0].id).toEqual("aides . bonus vélo");
      expect(aides[1].id).toEqual("aides . prime à la conversion");
    });

    describe("with specific inputs", () => {
      it("Ville de Montmorillon - vélo électrique", () => {
        const engine = globalTestEngine.shallowCopy();
        const commune = AidesVeloEngine.getCommuneByName("Montmorillon");

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
        expect(
          aides.filter(
            ({ title }) =>
              title.toLowerCase().includes("montmorillon") ||
              // Communauté de communes Vienne et Gartempe à laquelle Montmorillon appartient
              title.toLowerCase().includes("vienne et gartempe"),
          ),
        ).toHaveLength(2);
      });
    });
  });
});
