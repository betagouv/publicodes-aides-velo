import Engine, { Rule } from "publicodes";
import { describe, expect, it, test } from "vitest";

import rules from "../publicodes-build";
import { AideRuleNames, RuleName } from "../src";
import { aidesAvecLocalisation, miniatures } from "../src/data";

describe("Aides Vélo", () => {
  const engine = new Engine(rules);
  const ruleNames = Object.keys(rules) as RuleName[];
  const ruleEntries = Object.entries(rules) as [RuleName, Rule][];

  describe("Généralités", () => {
    const rulesToIgnore: RuleName[] = [
      "aides . montant",
      "aides . état",
      "aides . région",
      "aides . département",
      "aides . commune",
      "aides . intercommunalité",
      "aides . forfait mobilités durables",
    ];

    it("devrait y avoir une entrée pour chaque aide dans le fichier 'aides-collectivities.json'", () => {
      // NOTE: should be generated at compile time
      const noNeedToAssociatesLoc: RuleName[] = [...rulesToIgnore];

      ruleNames.forEach((key: RuleName) => {
        if (
          key.startsWith("aides .") &&
          key.split(" . ").length === 2 &&
          !noNeedToAssociatesLoc.includes(key)
        ) {
          expect(
            aidesAvecLocalisation[key as AideRuleNames]
          ).not.toBeUndefined();
        }
      });
    });

    it.skip("'devrait y avoir une entrée pour chaque aide dans 'miniatures.json'", () => {
      // NOTE: should be generated at compile time
      // TODO: improve the generation script to manage missing cities
      ruleNames.forEach((key) => {
        if (
          key.startsWith("aides .") &&
          key.split(" . ").length === 2 &&
          !rulesToIgnore.includes(key)
        ) {
          if (!miniatures[key as AideRuleNames]) {
            console.log(key);
          }
          expect(miniatures[key as AideRuleNames]).not.toBeUndefined();
        }
      });
    });

    it("devrait y avoir un lien valide pour chaque aides", () => {
      ruleEntries.forEach(([key, rule]) => {
        if (
          key.startsWith("aides .") &&
          key.split(" . ").length === 2 &&
          !rulesToIgnore.includes(key)
        ) {
          if (!rule["lien"]) {
            console.log(key);
          }
          expect(rule["lien"]).toMatch(/^https?:\/\//);
        }
      });
    });
  });

  describe("Île-de-France Mobilités", () => {
    it("devrait être nulle pour un vélo mécanique si la personne a plus de 25 ans", () => {
      engine.setSituation({
        "localisation . région": "'11'",
        "vélo . type": "'mécanique simple'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . ile de france").nodeValue).toEqual(0);
    });

    it("devrait être non nulle pour un vélo mécanique est âgée de 15 à 25 ans", () => {
      engine.setSituation({
        "localisation . région": "'11'",
        "vélo . type": "'mécanique simple'",
        "vélo . prix": "1000€",
        "demandeur . âge": "20 an",
      });
      expect(engine.evaluate("aides . ile de france").nodeValue).toEqual(100);
    });
  });

  describe("Ville de Paris", () => {
    it("devrait fournir une aide pour les vélos mécaniques", () => {
      engine.setSituation({
        "localisation . code insee": "'75056'",
        "revenu fiscal de référence par part": "5000€/an",
        "vélo . type": "'mécanique simple'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . paris").nodeValue).toEqual(100);
    });
  });

  // NOTE: aide désactivée pour le moment
  // describe("Département Côte-d'Or", () => {
  //   it("plus de subvention pour les vélos assemblés ou produit localement", () => {
  //     const coteDorSituation = {
  //       "vélo . type": "'électrique'",
  //       "localisation . département": "'21'",
  //       "vélo . prix": "500€",
  //     };
  //
  //     engine.setSituation(coteDorSituation);
  //     expect(engine.evaluate("aides . cote d'or").nodeValue).toEqual(250);
  //
  //     engine.setSituation({
  //       ...coteDorSituation,
  //       // TODO: use generated types instead of the json
  //       // @ts-ignore
  //       "aides . cote d'or . vélo assemblé ou produit localement": "oui",
  //     });
  //     expect(engine.evaluate("aides . cote d'or").nodeValue).toEqual(350);
  //   });
  // });
  //
  describe("Région Occitanie", () => {
    it("ne devrait pas avoir de plafond pour l'Eco-chèque mobilité", () => {
      engine.setSituation({
        "localisation . région": "'76'",
        "revenu fiscal de référence par part": "8000€/an",
        "vélo . type": "'électrique'",
        "vélo . prix": "100€",
      });
      expect(engine.evaluate("aides . occitanie").nodeValue).toEqual(200);
    });

    it("devrait correctement prendre en compte les vélo adaptés pour les personnes en situation de handicap", () => {
      engine.setSituation({
        "localisation . région": "'76'",
        "revenu fiscal de référence par part": "8000€/an",
        "demandeur . en situation de handicap": "oui",
        "vélo . type": "'adapté'",
        "vélo . prix": "1000€",
      });

      const expectedAmount = 0.5 * 1000;
      expect(
        engine.evaluate("aides . occitanie vélo adapté").nodeValue
      ).toEqual(expectedAmount);

      engine.setSituation({
        "localisation . région": "'76'",
        "revenu fiscal de référence par part": "8000€/an",
        "demandeur . en situation de handicap": "oui",
        "vélo . type": "'adapté'",
        "vélo . prix": "25000€",
      });
      expect(
        engine.evaluate("aides . occitanie vélo adapté").nodeValue
      ).toEqual(1000);
    });

    it("devrait pas pouvoir obtenir un motant négatif pour un vélo adapté PMR", () => {
      engine.setSituation({
        "localisation . région": "'76'",
        "revenu fiscal de référence par part": "8000€/an",
        "demandeur . en situation de handicap": "oui",
        "vélo . type": "'adapté'",
        "vélo . prix": "100€",
        // TODO: use generated types instead of the json
        // @ts-ignore
        "aides . département": "400€",
      });
      expect(
        engine.evaluate("aides . occitanie vélo adapté").nodeValue
      ).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Toulouse Métropole", () => {
    it("devrait correctement arrondir la valeur", () => {
      engine.setSituation({
        "localisation . epci": "'Toulouse Métropole'",
        "revenu fiscal de référence par part": "8000€/an",
        "vélo . type": "'électrique'",
        "vélo . prix": "500€",
      });

      expect(engine.evaluate("aides . toulouse").nodeValue).toEqual(167);
    });

    it("devrait considérer la transformation en VAE de la même façon que l'achat d'une VAE", () => {
      engine.setSituation({
        "localisation . epci": "'Toulouse Métropole'",
        "revenu fiscal de référence par part": "8000€/an",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . toulouse").nodeValue).toEqual(250);

      engine.setSituation({
        "localisation . epci": "'Toulouse Métropole'",
        "revenu fiscal de référence par part": "8000€/an",
        "vélo . type": "'motorisation'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . toulouse").nodeValue).toEqual(250);

      engine.setSituation({
        "localisation . epci": "'Toulouse Métropole'",
        "revenu fiscal de référence par part": "20000€/an",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . toulouse").nodeValue).toEqual(200);

      engine.setSituation({
        "localisation . epci": "'Toulouse Métropole'",
        "revenu fiscal de référence par part": "20000€/an",
        "vélo . type": "'motorisation'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . toulouse").nodeValue).toEqual(200);
    });
  });

  describe("Nantes Métropole", () => {
    it("devrait correctement prendre en compte le revenu fiscale de référence en €/mois", () => {
      engine.setSituation({
        "localisation . epci": "'Nantes Métropole'",
        "revenu fiscal de référence par part": "700€/mois",
        "vélo . type": "'cargo'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . nantes").nodeValue).toEqual(500);

      engine.setSituation({
        "localisation . epci": "'Nantes Métropole'",
        "revenu fiscal de référence par part": "8400€/an",
        "vélo . type": "'cargo'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . nantes").nodeValue).toEqual(500);
    });
  });

  describe("Ville de Paris", () => {
    it("devrait correctement prendre en compte les vélo adaptés pour les personnes en situation de handicap", () => {
      engine.setSituation({
        "localisation . code insee": "'75056'",
        "revenu fiscal de référence par part": "5000€/an",
        "vélo . type": "'adapté'",
        // Pour faciliter le calcul du prix HT
        "vélo . prix": 1000 * 1.2,
      });

      expect(engine.evaluate("aides . paris").nodeValue).toEqual(500);

      engine.setSituation({
        "localisation . code insee": "'75056'",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'adapté'",
        "vélo . prix": "25000€",
      });
      expect(engine.evaluate("aides . paris").nodeValue).toEqual(1500);
    });
  });

  describe("Département Hérault", () => {
    it("devrait correctement prendre en compte les vélo adaptés pour les personnes en situation de handicap", () => {
      engine.setSituation({
        "localisation . département": "'34'",
        "revenu fiscal de référence par part": "10000€/an",
        "demandeur . en situation de handicap": "oui",
        "vélo . type": "'adapté'",
        "vélo . prix": "1000€",
      });

      expect(engine.evaluate("aides . département hérault").nodeValue).toEqual(
        null
      );
      expect(
        engine.evaluate("aides . département hérault vélo adapté").nodeValue
      ).toEqual(500);

      engine.setSituation({
        "localisation . département": "'34'",
        "revenu fiscal de référence par part": "10000€/an",
        "demandeur . en situation de handicap": "oui",
        "vélo . type": "'adapté'",
        "vélo . prix": "25000€",
      });
      expect(engine.evaluate("aides . département hérault").nodeValue).toEqual(
        null
      );
      expect(
        engine.evaluate("aides . département hérault vélo adapté").nodeValue
      ).toEqual(1000);
    });
  });

  describe("Montpellier Méditerranée Métropole", () => {
    it("devrait être élligible uniquement pour les vélo électrique d'occasion et les kits de motorisation", () => {
      engine.setSituation({
        "localisation . epci": "'Montpellier Méditerranée Métropole'",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
      });
      expect(
        engine.evaluate("aides . montpellier vae occasion").nodeValue
      ).toEqual(null);

      engine.setSituation({
        "localisation . epci": "'Montpellier Méditerranée Métropole'",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
      });
      expect(
        engine.evaluate("aides . montpellier vae occasion").nodeValue
      ).toEqual(200);

      engine.setSituation({
        "localisation . epci": "'Montpellier Méditerranée Métropole'",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'motorisation'",
        "vélo . prix": "1000€",
      });
      expect(
        engine.evaluate("aides . montpellier vae occasion").nodeValue
      ).toEqual(200);
    });

    it("ne devrait pas être cumulable avec l'aide vélo adapté", () => {
      engine.setSituation({
        "localisation . epci": "'Montpellier Méditerranée Métropole'",
        "localisation . département": "'34'",
        "revenu fiscal de référence par part": "10000€/an",
        "demandeur . en situation de handicap": "oui",
        "vélo . type": "'adapté'",
        "vélo . prix": "2000€",
      });

      expect(
        engine.evaluate("aides . montpellier vae occasion").nodeValue
      ).toEqual(null);
      expect(
        engine.evaluate("aides . département hérault vélo adapté").nodeValue
      ).toEqual(1000);
    });
  });

  describe('Perpignan Méditerrannée Métropole" ', () => {
    it("devrait être élligible pour les vélo d'occasion", () => {
      engine.setSituation({
        "localisation . epci": "'CU Perpignan Méditerranée Métropole'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
      });

      expect(engine.evaluate("aides . perpignan métropole").nodeValue).toEqual(
        250
      );
    });

    it("devrait être majorée pour les étudiant·es", () => {
      engine.setSituation({
        "localisation . epci": "'CU Perpignan Méditerranée Métropole'",
        "vélo . type": "'électrique'",
        "demandeur . statut": "'étudiant'",
        "vélo . prix": "1000€",
      });

      expect(engine.evaluate("aides . perpignan métropole").nodeValue).toEqual(
        350
      );
    });

    it("devrait correctement prendre en compte les vélo adaptés pour les personnes en situation de handicap", () => {
      engine.setSituation({
        "localisation . epci": "'CU Perpignan Méditerranée Métropole'",
        "vélo . type": "'adapté'",
        "demandeur . statut": "'étudiant'",
        "vélo . prix": "1000€",
      });

      expect(engine.evaluate("aides . perpignan métropole").nodeValue).toEqual(
        1000
      );
    });
  });

  describe("Communauté d’Agglomération Sophia Antipolis", () => {
    it("aides sans condition de revenu pour les vélos cargo ou adaptés", () => {
      engine.setSituation({
        "localisation . epci": "'CA de Sophia Antipolis'",
        "vélo . type": "'cargo'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "20000€/an",
      });
      expect(engine.evaluate("aides . sophia antipolis").nodeValue).toEqual(
        250
      );

      engine.setSituation({
        "localisation . epci": "'CA de Sophia Antipolis'",
        "vélo . type": "'adapté'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "20000€/an",
      });
      expect(engine.evaluate("aides . sophia antipolis").nodeValue).toEqual(
        250
      );
    });

    it("aides majorées pour les personnes en situation de handicap", () => {
      engine.setSituation({
        "localisation . epci": "'CA de Sophia Antipolis'",
        "vélo . type": "'électrique'",
        "vélo . prix": "2000€",
        "revenu fiscal de référence par part": "20000€/an",
        "demandeur . en situation de handicap": "oui",
      });
      expect(engine.evaluate("aides . sophia antipolis").nodeValue).toEqual(
        400
      );

      engine.setSituation({
        "localisation . epci": "'CA de Sophia Antipolis'",
        "vélo . type": "'adapté'",
        "vélo . prix": "10000€",
        "revenu fiscal de référence par part": "20000€/an",
        "demandeur . en situation de handicap": "oui",
      });
      expect(engine.evaluate("aides . sophia antipolis").nodeValue).toEqual(
        750
      );
    });

    it("aide nulle pour les vélos mécaniques simples avec un revenu fiscal de référence > 6358 €/an", () => {
      engine.setSituation({
        "localisation . epci": "'CA de Sophia Antipolis'",
        "vélo . type": "'mécanique simple'",
        "vélo . prix": "300€",
        "revenu fiscal de référence par part": "15000€/an",
      });
      expect(engine.evaluate("aides . sophia antipolis").nodeValue).toEqual(
        null
      );

      engine.setSituation({
        "localisation . epci": "'CA de Sophia Antipolis'",
        "vélo . type": "'pliant'",
        "vélo . prix": "300€",
        "revenu fiscal de référence par part": "15000€/an",
      });
      expect(engine.evaluate("aides . sophia antipolis").nodeValue).toEqual(
        null
      );
    });
  });

  describe("Communauté de communes Fier et Usses", () => {
    it("devrait être élligible pour les vélo d'occasion", () => {
      engine.setSituation({
        "localisation . epci": "'CC Fier et Usses'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
      });

      expect(engine.evaluate("aides . fier et usses").nodeValue).toEqual(400);
    });
  });

  describe("Pays de Cruseilles", () => {
    it("devrait être élligible pour les vélo d'occasion", () => {
      engine.setSituation({
        "localisation . epci": "'CC du Pays de Cruseilles'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
      });

      expect(engine.evaluate("aides . pays de cruseilles").nodeValue).toEqual(
        300
      );
    });
  });

  describe("Bourges Plus", () => {
    it("devrait être élligible pour les vélo d'occasion", () => {
      engine.setSituation({
        "localisation . epci": "'CA Bourges Plus'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
      });

      expect(engine.evaluate("aides . bourges").nodeValue).toEqual(200);
    });
  });

  describe("Métropole Grand Lyon", () => {
    it("devrait être élligible pour les vélo d'occasion uniquement pour les vélos mécaniques avec un revenu fiscal de référence <= 12 231 €/an", () => {
      engine.setSituation({
        "localisation . epci": "'Métropole de Lyon'",
        "vélo . type": "'mécanique simple'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "12231 €/an",
      });
      // Prix maximum de 150€
      expect(engine.evaluate("aides . lyon").nodeValue).toBeNull();

      engine.setSituation({
        "localisation . epci": "'Métropole de Lyon'",
        "vélo . type": "'pliant'",
        "vélo . état": "'occasion'",
        "vélo . prix": "100€",
        "revenu fiscal de référence par part": "12231€/an",
      });
      expect(engine.evaluate("aides . lyon").nodeValue).toEqual(50);

      engine.setSituation({
        "localisation . epci": "'Métropole de Lyon'",
        "vélo . type": "'pliant'",
        "vélo . état": "'occasion'",
        "vélo . prix": "100€",
        "revenu fiscal de référence par part": "30000€/an",
      });
      expect(engine.evaluate("aides . lyon").nodeValue).toBeNull();

      engine.setSituation({
        "localisation . epci": "'Métropole de Lyon'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "100€",
        "revenu fiscal de référence par part": "15000€/an",
      });
      expect(engine.evaluate("aides . lyon").nodeValue).toEqual(50);
    });

    it("devrait correctement prendre en compte les vélo adaptés pour les personnes en situation de handicap", () => {
      engine.setSituation({
        "localisation . epci": "'Métropole de Lyon'",
        "vélo . type": "'adapté'",
        "vélo . prix": "15000€",
        "revenu fiscal de référence par part": "10000€/an",
      });
      expect(engine.evaluate("aides . lyon").nodeValue).toEqual(1000);

      engine.setSituation({
        "localisation . epci": "'Métropole de Lyon'",
        "vélo . type": "'adapté'",
        "vélo . prix": "15000€",
        "revenu fiscal de référence par part": "20000€/an",
      });
      expect(engine.evaluate("aides . lyon").nodeValue).toEqual(200);
    });

    it("devrait correctement prendre en compte les vélo cargo", () => {
      // Cargo mécanique
      engine.setSituation({
        "localisation . epci": "'Métropole de Lyon'",
        "vélo . type": "'cargo'",
        "vélo . prix": "2000€",
        "revenu fiscal de référence par part": "10000€/an",
      });
      expect(engine.evaluate("aides . lyon").nodeValue).toEqual(700);

      engine.setSituation({
        "localisation . epci": "'Métropole de Lyon'",
        "vélo . type": "'cargo'",
        "vélo . prix": "2000€",
        "revenu fiscal de référence par part": "20000€/an",
      });
      expect(engine.evaluate("aides . lyon").nodeValue).toEqual(200);

      // Cargo électrique
      engine.setSituation({
        "localisation . epci": "'Métropole de Lyon'",
        "vélo . type": "'cargo électrique'",
        "vélo . prix": "15000€",
        "revenu fiscal de référence par part": "10000€/an",
      });
      expect(engine.evaluate("aides . lyon").nodeValue).toEqual(900);

      engine.setSituation({
        "localisation . epci": "'Métropole de Lyon'",
        "vélo . type": "'cargo électrique'",
        "vélo . prix": "15000€",
        "revenu fiscal de référence par part": "20000€/an",
      });
      expect(engine.evaluate("aides . lyon").nodeValue).toEqual(200);
    });
  });

  describe("Communauté de communes Saône Beaujolais", () => {
    it("devrait être élligible pour les vélo d'occasion", () => {
      engine.setSituation({
        "localisation . epci": "'CC Saône-Beaujolais'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
      });
      expect(engine.evaluate("aides . saône-beaujolais").nodeValue).toEqual(
        300
      );

      engine.setSituation({
        "localisation . epci": "'CC Saône-Beaujolais'",
        "vélo . type": "'pliant'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
      });
      expect(engine.evaluate("aides . saône-beaujolais").nodeValue).toEqual(
        200
      );
    });
  });

  describe("Communauté de communes du Pays Mornantais", () => {
    it("devrait correctement prendre en compte le plafond de l'Anah", () => {
      engine.setSituation({
        "localisation . epci": "'CC du Pays Mornantais (COPAMO)'",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
      });
      expect(engine.evaluate("aides . pays mornantais").nodeValue).toEqual(400);

      engine.setSituation({
        "localisation . epci": "'CC du Pays Mornantais (COPAMO)'",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "30000€/an",
      });
      expect(engine.evaluate("aides . pays mornantais").nodeValue).toEqual(250);
    });

    it("ne devrait pas être élligible pour les vélo d'occasion", () => {
      engine.setSituation({
        "localisation . epci": "'CC du Pays Mornantais (COPAMO)'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
      });

      expect(engine.evaluate("aides . pays mornantais").nodeValue).toEqual(
        null
      );
    });
  });

  describe("Quimperlé Communauté", () => {
    it("devrait pas être élligible pour les VAE d'occasion d'une valeur supérieure à 2000€", () => {
      engine.setSituation({
        "localisation . epci": "'CA Quimperlé Communauté'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "3000€",
        "revenu fiscal de référence par part": "10000€/an",
      });
      expect(engine.evaluate("aides . quimperlé").nodeValue).toEqual(null);
    });

    it("devrait être élligible pour les vélo cargo électrique d'occasion jusqu'à 5000€", () => {
      engine.setSituation({
        "localisation . epci": "'CA Quimperlé Communauté'",
        "vélo . type": "'cargo électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "3000€",
        "revenu fiscal de référence par part": "10000€/an",
      });
      expect(engine.evaluate("aides . quimperlé").nodeValue).toEqual(150);
    });

    it("devrait être élligible pour les VAE neuf jusqu'à 3000€", () => {
      engine.setSituation({
        "localisation . epci": "'CA Quimperlé Communauté'",
        "vélo . type": "'électrique'",
        "vélo . prix": "3000€",
        "revenu fiscal de référence par part": "10000€/an",
      });
      expect(engine.evaluate("aides . quimperlé").nodeValue).toEqual(150);
    });
  });

  describe("Ville de Caen", () => {
    it("devrait correctement prendre en compte les jeunes de moins de 25 ans pour les vélos d'occasion", () => {
      engine.setSituation({
        "localisation . code insee": "'14118'",
        "vélo . type": "'mécanique simple'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
        "demandeur . âge": "20 an",
        "revenu fiscal de référence par part": "10000€/an",
      });
      expect(engine.evaluate("aides . caen jeune").nodeValue).toEqual(50);
      expect(engine.evaluate("aides . caen").nodeValue).toEqual(null);

      engine.setSituation({
        "localisation . code insee": "'14118'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
        "demandeur . âge": "20 an",
        "revenu fiscal de référence par part": "10000€/an",
      });
      expect(engine.evaluate("aides . caen jeune").nodeValue).toEqual(null);
      expect(engine.evaluate("aides . caen").nodeValue).toEqual(null);
    });

    it("devrait être élligible pour les personnes en situation de handicap sans condition de revenu", () => {
      engine.setSituation({
        "localisation . code insee": "'14118'",
        "vélo . type": "'adapté'",
        "revenu fiscal de référence par part": "20000€/an",
        "demandeur . en situation de handicap": "oui",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . caen jeune").nodeValue).toEqual(null);
      expect(engine.evaluate("aides . caen").nodeValue).toEqual(null);
      expect(engine.evaluate("aides . caen vélo adapté").nodeValue).toEqual(
        300
      );

      // Pas nécessairement adapté
      engine.setSituation({
        "localisation . code insee": "'14118'",
        "vélo . type": "'motorisation'",
        "revenu fiscal de référence par part": "20000€/an",
        "demandeur . en situation de handicap": "oui",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . caen jeune").nodeValue).toEqual(null);
      expect(engine.evaluate("aides . caen").nodeValue).toEqual(null);
      expect(engine.evaluate("aides . caen vélo adapté").nodeValue).toEqual(
        300
      );
    });

    it("l'aide de Caen la mer ne devrait pas être élligible pour les personnes mineures", () => {
      engine.setSituation({
        "localisation . epci": "'CU Caen la Mer'",
        "revenu fiscal de référence par part": "10000€/an",
        "demandeur . âge": "16 an",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . caen la mer").nodeValue).toEqual(null);
    });
  });

  describe("Vienne et Gartempe Communauté de communes", () => {
    it("devrait être élligible pour les mineurs uniquement si iels possèdent un contrat", () => {
      engine.setSituation({
        "localisation . epci": "'CC Vienne et Gartempe'",
        "revenu fiscal de référence par part": "10000€/an",
        "demandeur . âge": "16 an",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . vienne gartempe").nodeValue).toEqual(0);

      engine.setSituation({
        "localisation . epci": "'CC Vienne et Gartempe'",
        "revenu fiscal de référence par part": "10000€/an",
        "demandeur . âge": "16 an",
        // TODO: use generated types instead of the json
        // @ts-ignore
        "aides . vienne gartempe . titulaire d'un contrat d'alternance ou de stage":
          "oui",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . vienne gartempe").nodeValue).toEqual(400);
    });
  });

  describe("Ville de Montval sur Loir", () => {
    it("devrait être élligible pour les vélo mécanique seulement pour les bénéficiaires du RSA", () => {
      engine.setSituation({
        "localisation . code insee": "'72071'",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'mécanique simple'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . montval sur loir").nodeValue).toEqual(0);

      engine.setSituation({
        "localisation . code insee": "'72071'",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'électrique'",
        "vélo . prix": "200€",
        "demandeur . bénéficiaire du RSA": "oui",
      });
      expect(engine.evaluate("aides . montval sur loir").nodeValue).toEqual(
        100
      );
    });
  });

  describe("Sète Agglopôle Méditerranée", () => {
    it("devrait correctement prendre en compte les différents bonus", () => {
      engine.setSituation({
        "localisation . epci": "'CA Sète Agglopôle Méditerranée'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'électrique'",
      });
      expect(engine.evaluate("aides . sète").nodeValue).toEqual(200);

      engine.setSituation({
        "localisation . epci": "'CA Sète Agglopôle Méditerranée'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
      });
      expect(engine.evaluate("aides . sète").nodeValue).toEqual(250);

      engine.setSituation({
        "localisation . epci": "'CA Sète Agglopôle Méditerranée'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        // TODO: use generated types instead of the json
        // @ts-ignore
        "aides . sète . acheté dans un commerce local": "oui",
      });
      expect(engine.evaluate("aides . sète").nodeValue).toEqual(300);
    });
  });

  describe("Grand Avignon", () => {
    it("le cumul de l'aide avec celles des communes ne devrait pas dépasser 200€", () => {
      engine.setSituation({
        "localisation . epci": "'CA du Grand Avignon (COGA)'",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        // TODO: use generated types instead of the json
        // @ts-ignore
        "aides . commune": 150,
      });
      expect(engine.evaluate("aides . grand avignon").nodeValue).toEqual(50);

      engine.setSituation({
        "localisation . epci": "'CA du Grand Avignon (COGA)'",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        // TODO: use generated types instead of the json
        // @ts-ignore
        "aides . commune": 250,
      });
      expect(engine.evaluate("aides . grand avignon").nodeValue).toEqual(0);

      engine.setSituation({
        "localisation . epci": "'CA du Grand Avignon (COGA)'",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
      });
      expect(engine.evaluate("aides . grand avignon").nodeValue).toEqual(100);
    });
  });

  describe.skip("Ville d'Avignon", () => {
    it("le montant minimum de subvention devrait être respectée", () => {
      engine.setSituation({
        "localisation . code insee": "'84007'",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . avignon").nodeValue).toEqual(50);

      engine.setSituation({
        "localisation . code insee": "'84007'",
        "vélo . type": "'électrique'",
        "vélo . prix": "10€",
      });
      expect(engine.evaluate("aides . avignon").nodeValue).toEqual(0);

      engine.setSituation({
        "localisation . code insee": "'84007'",
        "vélo . type": "'électrique'",
        "vélo . prix": "3000€",
      });
      expect(engine.evaluate("aides . avignon").nodeValue).toEqual(0);

      engine.setSituation({
        "localisation . code insee": "'84007'",
        "vélo . type": "'mécanique simple'",
        "vélo . état": "'occasion'",
        "vélo . prix": "200€",
      });
      expect(engine.evaluate("aides . avignon").nodeValue).toEqual(70);

      engine.setSituation({
        "localisation . code insee": "'84007'",
        "vélo . type": "'mécanique simple'",
        "vélo . état": "'occasion'",
        "vélo . prix": "10€",
      });
      expect(engine.evaluate("aides . avignon").nodeValue).toEqual(0);
    });
  });

  describe("Ville de La Motte Servolex", () => {
    it("devrait être élligible pour les vélo d'occasion uniquement pour les vélos électriques", () => {
      engine.setSituation({
        "localisation . code insee": "'73179'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
        "vélo . type": "'électrique'",
      });
      expect(engine.evaluate("aides . la motte servolex").nodeValue).toEqual(
        150
      );

      engine.setSituation({
        "localisation . code insee": "'73179'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
        "vélo . type": "'cargo électrique'",
      });
      expect(engine.evaluate("aides . la motte servolex").nodeValue).toEqual(
        null
      );

      engine.setSituation({
        "localisation . code insee": "'73179'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
        "vélo . type": "'mécanique simple'",
      });
      expect(engine.evaluate("aides . la motte servolex").nodeValue).toEqual(
        null
      );

      engine.setSituation({
        "localisation . code insee": "'73179'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
        "vélo . type": "'pliant'",
      });
      expect(engine.evaluate("aides . la motte servolex").nodeValue).toEqual(
        null
      );
    });
  });

  // NOTE: aide suspendue
  describe.skip("Grand Annecy Agglomération", () => {
    it("devrait prendre en compte un bonus de 400€ pour les PMR", () => {
      engine.setSituation({
        "localisation . epci": "'CA du Grand Annecy'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'électrique'",
      });
      expect(engine.evaluate("aides . annecy").nodeValue).toEqual(400);

      engine.setSituation({
        "localisation . epci": "'CA du Grand Annecy'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'électrique'",
        "demandeur . en situation de handicap": "oui",
      });
      expect(engine.evaluate("aides . annecy").nodeValue).toEqual(800);
    });

    it("devrait prendre en compte les vélos d'occasions", () => {
      engine.setSituation({
        "localisation . epci": "'CA du Grand Annecy'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'mécanique simple'",
      });
      expect(engine.evaluate("aides . annecy").nodeValue).toEqual(150);

      engine.setSituation({
        "localisation . epci": "'CA du Grand Annecy'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'mécanique simple'",
        "vélo . état": "'occasion'",
      });
      expect(engine.evaluate("aides . annecy").nodeValue).toEqual(70);

      engine.setSituation({
        "localisation . epci": "'CA du Grand Annecy'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
      });
      expect(engine.evaluate("aides . annecy").nodeValue).toEqual(400);
    });
  });

  describe("Communauté de communes Cluses Arve & Montagnes", () => {
    it("devrait correctement prendre en compte le bonus 'vélo d'occasion'", () => {
      engine.setSituation({
        "localisation . epci": "'CC Cluses-Arve et Montagnes'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'électrique'",
      });
      expect(
        engine.evaluate("aides . cluses arve et montagnes").nodeValue
      ).toEqual(300);

      engine.setSituation({
        "localisation . epci": "'CC Cluses-Arve et Montagnes'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
      });
      expect(
        engine.evaluate("aides . cluses arve et montagnes").nodeValue
      ).toEqual(400);
    });

    it("devrait correctement prendre en compte le bonus 'participation employeur'", () => {
      engine.setSituation({
        "localisation . epci": "'CC Cluses-Arve et Montagnes'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'électrique'",
      });
      expect(
        engine.evaluate("aides . cluses arve et montagnes").nodeValue
      ).toEqual(300);

      engine.setSituation({
        "localisation . epci": "'CC Cluses-Arve et Montagnes'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "10000€/an",
        "vélo . type": "'électrique'",
        "aides . cluses arve et montagnes . participation employeur": 500,
      });
      expect(
        engine.evaluate("aides . cluses arve et montagnes").nodeValue
      ).toEqual(700);
    });
  });

  describe("Anjou Bleu Communauté", () => {
    it("devrait correctement prendre en compte le revenu fiscal de référence maximal", () => {
      engine.setSituation({
        "localisation . epci": "'CC Anjou Bleu Communauté'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "16000€/an",
        "vélo . type": "'électrique'",
      });
      expect(engine.evaluate("aides . anjou bleu").nodeValue).not.toEqual(null);

      engine.setSituation({
        "localisation . epci": "'CC Anjou Bleu Communauté'",
        "vélo . prix": "1000€",
        "revenu fiscal de référence par part": "16000€/an",
        "revenu fiscal de référence par part . nombre de parts": 2,
        "vélo . type": "'électrique'",
      });
      expect(engine.evaluate("aides . anjou bleu").nodeValue).toEqual(null);
    });
  });

  describe("Communauté d'agglomération de Rochefort Océan", () => {
    it("devrait avoir le même montant que l'exemple du site", () => {
      engine.setSituation({
        "localisation . epci": "'CA Rochefort Océan'",
        "revenu fiscal de référence par part": "14200 €/an",
        "vélo . état": "'neuf'",
        "vélo . prix": "1000 €",
        "vélo . type": "'électrique'",
      });
      expect(engine.evaluate("aides . rochefort").nodeValue).toEqual(225);
    });

    it("devrait avoir le même plafond pour les cargo mécanique que pour les vélos électriques", () => {
      engine.setSituation({
        "localisation . epci": "'CA Rochefort Océan'",
        "revenu fiscal de référence par part": "14200 €/an",
        "vélo . état": "'neuf'",
        "vélo . prix": "1000 €",
        "vélo . type": "'cargo'",
      });
      expect(engine.evaluate("aides . rochefort").nodeValue).toEqual(225);
    });
  });

  describe("La Roche-sur-Yon Agglomération", () => {
    it("devrait être élligible pour les vélo d'occasion", () => {
      engine.setSituation({
        "localisation . epci": "'CA La Roche-sur-Yon - Agglomération'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . la roche sur yon").nodeValue).toEqual(50);
    });

    it("devrait être élligible uniquement pour les VAE en-dessous d'un certain prix", () => {
      engine.setSituation({
        "localisation . epci": "'CA La Roche-sur-Yon - Agglomération'",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . la roche sur yon").nodeValue).toEqual(
        100
      );

      engine.setSituation({
        "localisation . epci": "'CA La Roche-sur-Yon - Agglomération'",
        "vélo . type": "'électrique'",
        "vélo . prix": "2000€",
      });
      expect(engine.evaluate("aides . la roche sur yon").nodeValue).toEqual(
        null
      );

      engine.setSituation({
        "localisation . epci": "'CA La Roche-sur-Yon - Agglomération'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . la roche sur yon").nodeValue).toEqual(50);

      engine.setSituation({
        "localisation . epci": "'CA La Roche-sur-Yon - Agglomération'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1500€",
      });
      expect(engine.evaluate("aides . la roche sur yon").nodeValue).toEqual(
        null
      );
    });

    it("devrait être majoré pour les salariés d'une structure membres du PDIE", () => {
      engine.setSituation({
        "localisation . epci": "'CA La Roche-sur-Yon - Agglomération'",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
        "demandeur . statut": "'salarié'",
        "aides . la roche sur yon . salarié d'une structure membre du PDIE":
          "oui",
      });
      expect(engine.evaluate("aides . la roche sur yon").nodeValue).toEqual(
        200
      );
    });
  });

  describe("Ville de Denain", () => {
    it("devrait correspondre à la moitié du montant de celle du CAPH", () => {
      engine.setSituation({
        "localisation . epci": "'CA de la Porte du Hainaut'",
        "localisation . code insee": "'59172'",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . denain").nodeValue).toEqual(150);
      expect(engine.evaluate("aides . denain").nodeValue).toEqual(
        (engine.evaluate("aides . porte du hainaut").nodeValue as number) / 2
      );

      engine.setSituation({
        "localisation . epci": "'CA de la Porte du Hainaut'",
        "localisation . code insee": "'59172'",
        "vélo . type": "'cargo électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . denain").nodeValue).toEqual(100);
      expect(engine.evaluate("aides . denain").nodeValue).toEqual(
        (engine.evaluate("aides . porte du hainaut").nodeValue as number) / 2
      );
    });
  });

  describe("Communauté urbaine de Dunkerque", () => {
    it("devrait être bonifié pour les bénéficiaires du RSA et de l'ASS", () => {
      engine.setSituation({
        "localisation . epci": "'CU de Dunkerque'",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
      });
      expect(engine.evaluate("aides . dunkerque").nodeValue).toEqual(150);

      engine.setSituation({
        "localisation . epci": "'CU de Dunkerque'",
        "vélo . type": "'électrique'",
        "vélo . prix": "1000€",
        "demandeur . bénéficiaire de minima sociaux": "oui",
      });
      expect(engine.evaluate("aides . dunkerque").nodeValue).toEqual(250);
    });
  });

  describe("Ville d'Amboise", () => {
    it("devrait être de 200 € pour un QF > 1100 €/mois", () => {
      engine.setSituation({
        "localisation . code insee": "'37003'",
        "revenu fiscal de référence par part": "2000 €/mois",
        "vélo . type": "'électrique'",
        "vélo . prix": 1400,
      });
      expect(engine.evaluate("aides . amboise").nodeValue).toEqual(200);
    });

    it("devrait avoir un plafond de limite de 1200 € pour le prix du vélo", () => {
      engine.setSituation({
        "localisation . code insee": "'37003'",
        "revenu fiscal de référence par part": "400 €/mois",
        "vélo . type": "'électrique'",
        "vélo . prix": 2000,
      });
      expect(engine.evaluate("aides . amboise").nodeValue).toEqual(0.5 * 1200);

      engine.setSituation({
        "localisation . code insee": "'37003'",
        "revenu fiscal de référence par part": "1000 €/mois",
        "vélo . type": "'électrique'",
        "vélo . prix": 2000,
      });
      expect(engine.evaluate("aides . amboise").nodeValue).toEqual(0.3 * 1200);
    });

    it("devrait être de 200 € minimum", () => {
      engine.setSituation({
        "localisation . code insee": "'37003'",
        "revenu fiscal de référence par part": "400 €/mois",
        "vélo . type": "'électrique'",
        "vélo . prix": 200,
      });
      expect(engine.evaluate("aides . amboise").nodeValue).not.toBeLessThan(
        200
      );

      engine.setSituation({
        "localisation . code insee": "'37003'",
        "revenu fiscal de référence par part": "1000 €/mois",
        "vélo . type": "'électrique'",
        "vélo . prix": 200,
      });
      expect(engine.evaluate("aides . amboise").nodeValue).not.toBeLessThan(
        200
      );
    });

    it("devrait être élligible pour les vélo d'occasion", () => {
      engine.setSituation({
        "localisation . code insee": "'37003'",
        "revenu fiscal de référence par part": "400 €/mois",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": 2000,
      });
      expect(engine.evaluate("aides . amboise").nodeValue).toEqual(0.5 * 1200);
    });
  });

  // NOTE: L'aide est désactivée pour le moment
  // describe("Région Pays de la Loire", () => {
  //   it("devrait être élligible uniquement pour les abonné TER", () => {
  //     engine.setSituation({
  //       "localisation . région": "'52'",
  //       "vélo . type": "'électrique'",
  //       "vélo . prix": 1000,
  //     });
  //     expect(engine.evaluate("aides . pays de la loire").nodeValue).toEqual(
  //       200
  //     );
  //
  //     engine.setSituation({
  //       "localisation . région": "'52'",
  //       "vélo . type": "'électrique'",
  //       "vélo . prix": 1000,
  //       "aides . pays de la loire . abonné TER": "non",
  //     });
  //     expect(engine.evaluate("aides . pays de la loire").nodeValue).toBeNull();
  //   });
  // });

  describe("Département de l'Oise", () => {
    it("devrait pas être élligible pour les personnes ayant bénéficiées de l'aide à la conversion bioéthanol", () => {
      engine.setSituation({
        "localisation . département": "'60'",
        "vélo . type": "'électrique'",
        "vélo . prix": 1000,
      });
      expect(engine.evaluate("aides . oise").nodeValue).toEqual(300);

      engine.setSituation({
        "localisation . département": "'60'",
        "vélo . type": "'électrique'",
        "vélo . prix": 1000,
        "aides . oise . aide à la conversion bioéthanol": "oui",
      });
      expect(engine.evaluate("aides . oise").nodeValue).toEqual(0);
    });

    it("devrait être élligible pour les vélo d'occasion", () => {
      engine.setSituation({
        "localisation . département": "'60'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": 1000,
      });
      expect(engine.evaluate("aides . oise").nodeValue).toEqual(300);
    });
  });

  describe("Grand Angoulême", () => {
    it("devrait être élligible sans condition de revenu pour les étudiants et les apprantis", () => {
      engine.setSituation({
        "localisation . epci": "'CA du Grand Angoulême'",
        "vélo . type": "'électrique'",
        "vélo . prix": 1000,
        "revenu fiscal de référence par part": "5000 €/mois",
      });
      expect(engine.evaluate("aides . grand angouleme").nodeValue).toBeNull();

      engine.setSituation({
        "localisation . epci": "'CA du Grand Angoulême'",
        "vélo . type": "'électrique'",
        "vélo . prix": 1000,
        "revenu fiscal de référence par part": "5000 €/mois",
        "demandeur . statut": "'étudiant'",
      });
      expect(engine.evaluate("aides . grand angouleme").nodeValue).toEqual(400);

      engine.setSituation({
        "localisation . epci": "'CA du Grand Angoulême'",
        "vélo . type": "'électrique'",
        "vélo . prix": 1000,
        "revenu fiscal de référence par part": "5000 €/mois",
        "demandeur . statut": "'apprenti'",
      });
      expect(engine.evaluate("aides . grand angouleme").nodeValue).toEqual(400);
    });

    it("devrait être élligible pour les vélo d'occasion", () => {
      engine.setSituation({
        "localisation . epci": "'CA du Grand Angoulême'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": 1000,
        "revenu fiscal de référence par part": "200 €/mois",
      });
      expect(engine.evaluate("aides . grand angouleme").nodeValue).toEqual(400);
    });
  });

  describe("Les Portes du Luxembourg", () => {
    it("devrait être élligible pour les vélo d'occasion", () => {
      engine.setSituation({
        "localisation . epci": "'CC des Portes du Luxembourg'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": 1000,
      });
      expect(engine.evaluate("aides . portes du luxembourg").nodeValue).toEqual(
        200
      );
    });

    it("devrait être bonifiée pour les vélos conçus et assemblés en France", () => {
      engine.setSituation({
        "localisation . epci": "'CC des Portes du Luxembourg'",
        "vélo . type": "'électrique'",
        "vélo . prix": 1000,
        "aides . portes du luxembourg . assemblé en France": "oui",
      });
      expect(engine.evaluate("aides . portes du luxembourg").nodeValue).toEqual(
        300
      );
    });
  });

  describe("Brièvre Isère Communauté", () => {
    it("devrait pas être élligible pour pour un vélo cargo >5000€", () => {
      engine.setSituation({
        "localisation . epci": "'CC Bièvre Isère'",
        "vélo . type": "'cargo électrique'",
        "vélo . prix": 6000,
      });
      expect(engine.evaluate("aides . bièvre isère").nodeValue).toBeNull();

      engine.setSituation({
        "localisation . epci": "'CC Bièvre Isère'",
        "vélo . type": "'cargo'",
        "vélo . prix": 6000,
      });
      expect(engine.evaluate("aides . bièvre isère").nodeValue).toBeNull();

      engine.setSituation({
        "localisation . epci": "'CC Bièvre Isère'",
        "vélo . type": "'adapté'",
        "vélo . prix": 6000,
      });
      expect(engine.evaluate("aides . bièvre isère").nodeValue).toBeNull();
    });

    it("devrait pas être élligible pour pour un vélo non cargo >3000€", () => {
      engine.setSituation({
        "localisation . epci": "'CC Bièvre Isère'",
        "vélo . type": "'électrique'",
        "vélo . prix": 4000,
      });
      expect(engine.evaluate("aides . bièvre isère").nodeValue).toBeNull();

      engine.setSituation({
        "localisation . epci": "'CC Bièvre Isère'",
        "vélo . type": "'mécanique simple'",
        "vélo . prix": 4000,
      });
      expect(engine.evaluate("aides . bièvre isère").nodeValue).toBeNull();
    });

    it("devrait être élligible pour les vélo d'occasion", () => {
      engine.setSituation({
        "localisation . epci": "'CC Bièvre Isère'",
        "vélo . type": "'électrique'",
        "vélo . état": "'occasion'",
        "vélo . prix": 1000,
      });
      expect(engine.evaluate("aides . bièvre isère").nodeValue).toEqual(250);

      engine.setSituation({
        "localisation . epci": "'CC Bièvre Isère'",
        "vélo . type": "'adapté'",
        "vélo . état": "'occasion'",
        "vélo . prix": 4500,
      });
      expect(engine.evaluate("aides . bièvre isère").nodeValue).toEqual(100);
    });
  });

  describe("Villefranche Agglomération Beaujolais Saône", () => {
    it("devrait pas pouvoir avoir un montant négatif", () => {
      engine.setSituation({
        "localisation . epci": "'CA Villefranche Beaujolais Saône'",
        "vélo . type": "'électrique'",
        "vélo . prix": 200,
        "revenu fiscal de référence par part": "5000 €/mois",
      });
      expect(
        engine.evaluate("aides . villefranche beaujolais saône").nodeValue
      ).toBeGreaterThanOrEqual(0);

      engine.setSituation({
        "localisation . epci": "'CA Villefranche Beaujolais Saône'",
        "vélo . type": "'électrique'",
        "vélo . prix": 200,
        "revenu fiscal de référence par part": "5000 €/mois",
        "aides . département": 400,
      });
      expect(
        engine.evaluate("aides . villefranche beaujolais saône").nodeValue
      ).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Communauté de communes du Val de Drôme en Biovallée", () => {
    it("devrait avoir un plafond pour les vélos", () => {
      engine.setSituation({
        "localisation . epci": "'CC du Val de Drôme en Biovallée'",
        "vélo . prix": 200,
        "revenu fiscal de référence par part": "10000 €/an",
      });
      expect(engine.evaluate("aides . val de drôme").nodeValue).toEqual(
        200 * 0.4
      );
    });

    it("ne devrait pas avoir de plafond pour les kits de motorisation", () => {
      engine.setSituation({
        "localisation . epci": "'CC du Val de Drôme en Biovallée'",
        "vélo . type": "'motorisation'",
        "vélo . prix": 50,
        "revenu fiscal de référence par part": "10000 €/an",
      });
      expect(engine.evaluate("aides . val de drôme").nodeValue).toEqual(50);
    });
  });

  describe("Communauté Urbaine Creusot-Montceau", () => {
    const baseSituation = {
      "localisation . epci": "'CU Le Creusot Montceau-les-Mines'",
      "vélo . prix": 400,
      "revenu fiscal de référence par part": "2000 €/mois",
    };

    test("élève de moins de 14 ans", () => {
      engine.setSituation({
        ...baseSituation,
        "demandeur . âge": "13 an",
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(0);

      engine.setSituation({
        ...baseSituation,
        "demandeur . âge": "13 an",
        "demandeur . statut": "'étudiant'",
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(0);

      engine.setSituation({
        ...baseSituation,
        "demandeur . âge": "13 an",
        "demandeur . statut": "'étudiant'",
        "vélo . type": "'mécanique simple'",
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(
        100
      );
    });

    test("élève de plus de 14 ans ou étudiant:e en étude supérieure", () => {
      engine.setSituation({
        ...baseSituation,
        "demandeur . âge": "18 an",
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(0);

      engine.setSituation({
        ...baseSituation,
        "demandeur . âge": "18 an",
        "demandeur . statut": "'étudiant'",
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(
        200
      );

      engine.setSituation({
        ...baseSituation,
        "demandeur . âge": "18 an",
        "demandeur . statut": "'étudiant'",
        "vélo . type": "'mécanique simple'",
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(
        150
      );

      engine.setSituation({
        ...baseSituation,
        "demandeur . âge": "18 an",
        "demandeur . statut": "'étudiant'",
        "vélo . type": "'pliant'",
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(0);
    });

    test("actif:ve, retraité:e, ou en reconversion professionnelle", () => {
      engine.setSituation({
        ...baseSituation,
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(0);

      engine.setSituation({
        ...baseSituation,
        "demandeur . statut": "'salarié'",
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(
        200
      );

      engine.setSituation({
        ...baseSituation,
        "demandeur . statut": "'retraité'",
        "vélo . type": "'mécanique simple'",
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(
        150
      );

      engine.setSituation({
        ...baseSituation,
        "demandeur . statut": "'retraité'",
        "vélo . type": "'cargo'",
        "vélo . prix": 2500,
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(
        1000
      );

      engine.setSituation({
        ...baseSituation,
        "demandeur . statut": "'salarié'",
        "vélo . type": "'cargo électrique'",
        "vélo . prix": 2500,
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(
        1250
      );

      engine.setSituation({
        ...baseSituation,
        "demandeur . statut": "'reconversion'",
        "vélo . type": "'adapté'",
        "vélo . prix": 2500,
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(
        1250
      );

      engine.setSituation({
        ...baseSituation,
        "demandeur . statut": "'autre'",
        "vélo . type": "'adapté'",
        "vélo . prix": 2500,
      });
      expect(engine.evaluate("aides . creusot-montceau").nodeValue).toEqual(0);
    });
  });

  describe("Lorient Agglomération", () => {
    const baseSituation = {
      "localisation . epci": "'CA Lorient Agglomération'",
      "vélo . prix": 1000,
      "revenu fiscal de référence par part": "1000 €/mois",
    };

    test("par défaut", () => {
      engine.setSituation(baseSituation);
      expect(engine.evaluate("aides . lorient agglo").nodeValue).toEqual(230);
    });

    test("mécanique", () => {
      engine.setSituation({
        ...baseSituation,
        "vélo . type": "'mécanique simple'",
      });
      expect(engine.evaluate("aides . lorient agglo").nodeValue).toBeNull();
    });

    test("électrique simple ou pliant", () => {
      engine.setSituation({
        ...baseSituation,
        "aides . lorient agglo . abonnement Izilo Mobilités": "oui",
      });
      expect(engine.evaluate("aides . lorient agglo").nodeValue).toEqual(230);

      engine.setSituation({
        ...baseSituation,
        "aides . lorient agglo . abonnement Izilo Mobilités": "oui",
        "revenu fiscal de référence par part": "500 €/mois",
      });
      expect(engine.evaluate("aides . lorient agglo").nodeValue).toEqual(300);

      engine.setSituation({
        ...baseSituation,
        "vélo . type": "'pliant électrique'",
        "aides . lorient agglo . abonnement Izilo Mobilités": "oui",
        "demandeur . bénéficiaire de l'AAH": "oui",
      });
      expect(engine.evaluate("aides . lorient agglo").nodeValue).toEqual(300);
    });

    test("cargo ou adapté", () => {
      engine.setSituation({
        ...baseSituation,
        "aides . lorient agglo . abonnement Izilo Mobilités": "oui",
        "vélo . type": "'cargo électrique'",
      });
      expect(engine.evaluate("aides . lorient agglo").nodeValue).toEqual(300);

      engine.setSituation({
        ...baseSituation,
        "vélo . type": "'cargo électrique'",
        "aides . lorient agglo . abonnement Izilo Mobilités": "oui",
        "revenu fiscal de référence par part": "500 €/mois",
        "vélo . prix": 10000,
      });
      expect(engine.evaluate("aides . lorient agglo").nodeValue).toEqual(900);

      engine.setSituation({
        ...baseSituation,
        "vélo . type": "'adapté'",
        "aides . lorient agglo . abonnement Izilo Mobilités": "oui",
        "demandeur . bénéficiaire de l'AAH": "oui",
        "vélo . prix": 10000,
      });
      expect(engine.evaluate("aides . lorient agglo").nodeValue).toEqual(900);
    });
  });

  describe("Arc Sud Bretagne", () => {
    const baseSituation = {
      "localisation . epci": "'CC Arc Sud Bretagne'",
      "vélo . prix": 1000,
      "revenu fiscal de référence par part": "10000 €/an",
    };

    test("par défaut", () => {
      engine.setSituation(baseSituation);
      expect(engine.evaluate("aides . cc arc sud bretagne").nodeValue).toEqual(
        100
      );
    });

    test("cargo électrique", () => {
      engine.setSituation({
        ...baseSituation,
        "vélo . type": "'cargo électrique'",
      });
      expect(engine.evaluate("aides . cc arc sud bretagne").nodeValue).toEqual(
        200
      );
    });
  });

  describe("Val Parisis Agglo", () => {
    const baseSituation = {
      "localisation . epci": "'CA Val Parisis'",
      "vélo . prix": 1000,
    };

    test("par défaut", () => {
      engine.setSituation(baseSituation);
      expect(engine.evaluate("aides . cc val parisis").nodeValue).toEqual(100);
    });

    test("cargo électrique", () => {
      engine.setSituation({
        ...baseSituation,
        "vélo . type": "'cargo électrique'",
      });
      expect(engine.evaluate("aides . cc val parisis").nodeValue).toEqual(100);
    });

    test("ile de france > 50%", () => {
      engine.setSituation({
        ...baseSituation,
        "localisation . région": "'11'",
      });
      expect(engine.evaluate("aides . ile de france").nodeValue).toEqual(400);
      expect(engine.evaluate("aides . cc val parisis").nodeValue).toEqual(100);

      engine.setSituation({
        ...baseSituation,
        "localisation . région": "'11'",
        "vélo . prix": 150,
      });
      expect(engine.evaluate("aides . ile de france").nodeValue).toEqual(75);
      expect(engine.evaluate("aides . cc val parisis").nodeValue).toBeNull();
    });
  });

  describe("CC du Pays de Mormal", () => {
    test("vélo adapté uniquement pour les personnes en situation de handicap", () => {
      engine.setSituation({
        "localisation . epci": "'CC du Pays de Mormal'",
        "vélo . prix": 1000,
        "vélo . type": "'adapté'",
        "demandeur . en situation de handicap": "non",
      });
      expect(engine.evaluate("aides . pays de mormal").nodeValue).toBeNull();

      engine.setSituation({
        "localisation . epci": "'CC du Pays de Mormal'",
        "vélo . prix": 1000,
        "vélo . type": "'adapté'",
        "demandeur . en situation de handicap": "oui",
      });
      expect(engine.evaluate("aides . pays de mormal").nodeValue).toEqual(250);
    });
  });

  describe("CU Grand Poitiers", () => {
    test("le chèque VAE n'est pas cumulable avec l'aide vélo adapté", () => {
      engine.setSituation({
        "localisation . epci": "'CU du Grand Poitiers'",
        "vélo . prix": 1000,
        "vélo . type": "'adapté'",
      });
      expect(engine.evaluate("aides . grand poitiers").nodeValue).toBeNull();
      expect(
        engine.evaluate("aides . grand poitiers adapté").nodeValue
      ).toEqual(250);

      engine.setSituation({
        "localisation . epci": "'CU du Grand Poitiers'",
        "vélo . prix": 1000,
        "vélo . type": "'cargo électrique'",
        "revenu fiscal de référence par part": "20000 €/an",
      });
      expect(engine.evaluate("aides . grand poitiers").nodeValue).toEqual(250);
      expect(
        engine.evaluate("aides . grand poitiers adapté").nodeValue
      ).toBeNull();
    });
  });

  describe("Communauté de Communes du Bassin de Pompey", () => {
    test("devrait correctement calculer une aide pour la ville de Pompey", () => {
      engine.setSituation({
        "localisation . code insee": "'54430'",
        "localisation . epci": "'CC du Bassin de Pompey'",
        "vélo . prix": 1000,
        "vélo . type": "'électrique'",
        "revenu fiscal de référence par part . revenu de référence":
          "20000 €/an",
        "foyer . personnes": 2,
      });
      expect(engine.evaluate("aides . bassin-pompey").nodeValue).toEqual(300);
    });

    test("devrait correctement calculer le plafond pour un foyer de plus de 5 personnes", () => {
      engine.setSituation({
        "localisation . code insee": "'54430'",
        "localisation . epci": "'CC du Bassin de Pompey'",
        "vélo . prix": 1000,
        "vélo . type": "'électrique'",
        "revenu fiscal de référence par part . revenu de référence":
          "20000 €/an",
        "foyer . personnes": 7,
      });
      expect(
        engine.evaluate("aides . bassin-pompey . plafond de ressources")
          .nodeValue
      ).toEqual(44860 + 5668 * 2);
    });

    test("devrait correctement calculer l'aide si le nombre de personnes dans le foyer n'est pas renseigné", () => {
      engine.setSituation({
        "localisation . code insee": "'54430'",
        "localisation . epci": "'CC du Bassin de Pompey'",
        "vélo . prix": 1000,
        "vélo . type": "'électrique'",
        "revenu fiscal de référence par part . revenu de référence":
          "20000 €/an",
      });
      expect(engine.evaluate("aides . bassin-pompey").nodeValue).toEqual(100);
    });

    test("le plafond devrait pouvoir être accessible même sans revenu fiscal de référence", () => {
      engine.setSituation({
        "localisation . code insee": "'54430'",
        "localisation . epci": "'CC du Bassin de Pompey'",
        "vélo . prix": 1000,
        "vélo . type": "'électrique'",
      });
      expect(
        engine.evaluate("aides . bassin-pompey . plafond de ressources")
          .nodeValue
      ).toEqual(19074);
    });
  });

  describe("Métropole Toulon-Provence-Méditerranée", () => {
    test("devrait correctement prendre en compte le revenu fiscal de référence", () => {
      engine.setSituation({
        "localisation . epci": "'Métropole Toulon-Provence-Méditerranée'",
        "vélo . prix": 1000,
        "vélo . type": "'électrique'",
        "revenu fiscal de référence par part": "20000 €/an",
      });

      expect(engine.evaluate("aides . toulon").nodeValue).toEqual(100);
    });

    test("devrait être élligible pour les vélo d'occasion et adaptés", () => {
      engine.setSituation({
        "localisation . epci": "'Métropole Toulon-Provence-Méditerranée'",
        "vélo . prix": 10000,
        "vélo . type": "'adapté'",
        "vélo . état": "'occasion'",
        "revenu fiscal de référence par part": "15000 €/an",
      });

      expect(engine.evaluate("aides . toulon").nodeValue).toEqual(1000);
    });
  });

  describe("Région Centre-Val de Loire", () => {
    // NOTE: car tout le territoire de la région n'est pas couvert
    test("Région Centre-Val de loire nde devrait pas être élligible seule", () => {
      engine.setSituation({
        "localisation . région": "'24'",
        "demandeur . âge": 18,
        "vélo . prix": 700,
        "vélo . type": "'électrique'",
      });

      expect(engine.evaluate("aides . region centre").nodeValue).toBeNull();
    });

    test("CC du Perche devrait être élligible", () => {
      engine.setSituation({
        "localisation . région": "'24'",
        "localisation . epci": "'CC du Perche'",
        "demandeur . âge": 18,
        "vélo . prix": 700,
        "vélo . type": "'électrique'",
      });

      expect(engine.evaluate("aides . region centre").nodeValue).not.toBeNull();
    });

    test("Commune de Pigny ne devrait pas être élligible", () => {
      engine.setSituation({
        "localisation . région": "'24'",
        "localisation . epci": "'CC Terres du Haut Berry'",
        "localisation . code insee": "'18179'",
        "demandeur . âge": 18,
        "vélo . prix": 700,
        "vélo . type": "'électrique'",
      });

      expect(engine.evaluate("aides . region centre").nodeValue).toBeNull();
    });
  });

  describe("CA Grand Chambery", () => {
    test("électrique simple RFR > 15400 €/an", () => {
      engine.setSituation({
        "localisation . epci": "'CA du Grand Chambéry'",
        "vélo . type": "'électrique'",
        "vélo . prix": 1000,
        "revenu fiscal de référence par part": "20000 €/an",
      });

      expect(engine.evaluate("aides . grand chambéry").nodeValue).toBeNull();

      engine.setSituation(
        {
          "vélo . prix": 2000,
        },
        { keepPreviousSituation: true }
      );

      expect(engine.evaluate("aides . grand chambéry").nodeValue).toEqual(
        500 + 100
      );
    });

    test("non salarié entreprise partenaire", () => {
      engine.setSituation({
        "localisation . epci": "'CA du Grand Chambéry'",
        "vélo . type": "'cargo électrique'",
        "vélo . prix": 5000,
        "revenu fiscal de référence par part": "10000 €/an",
        "aides . grand chambéry . salarié d'une entreprise partenaire": "non",
      });

      expect(engine.evaluate("aides . grand chambéry").nodeValue).toEqual(1500);
    });
  });
});
