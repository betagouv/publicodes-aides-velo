import { LocalisationHelper } from "../src/lib/LocalisationHelper";

describe("LocalisationHelper", () => {
  describe("getCommuneByName()", () => {
    it("should managed to find a commune by its name even if not slugified", () => {
      expect(LocalisationHelper.getCommuneByName("Paris")?.nom).toEqual(
        "Paris"
      );
      expect(LocalisationHelper.getCommuneByName("paris")?.nom).toEqual(
        "Paris"
      );
      expect(
        LocalisationHelper.getCommuneByName("SENNECEY LES DIJON")?.nom
      ).toEqual("Sennecey-lès-Dijon");
    });
  });

  describe("getCommuneByInseeCode()", () => {
    it("should managed to find a commune by its INSEE code", () => {
      expect(LocalisationHelper.getCommuneByInseeCode("75056")?.nom).toEqual(
        "Paris"
      );
      expect(LocalisationHelper.getCommuneByInseeCode("21605")?.nom).toEqual(
        "Sennecey-lès-Dijon"
      );
    });
  });
});
