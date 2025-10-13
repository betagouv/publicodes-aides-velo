import { AidesVeloEngine as AidesVeloEngineLegacy } from "@betagouv/aides-velo";
import { bench, run, summary } from "mitata";

import { PublicodesEngine } from "@publicodes/runtime";
import EngineJS from "./model.publicodes";
import rules from "./model.publicodes.json" assert { type: "json" };

const v2 = new PublicodesEngine(rules);
const v2JS = new EngineJS();
const v2WithCache = new PublicodesEngine(rules, { cache: true });
const v2JSWithCache = new EngineJS(true);
const legacy = new AidesVeloEngineLegacy().getEngine();

summary(() => {
  bench("evaluate (legacy)", () => {
    // @ts-ignore
    legacy
      .setSituation({
        "localisation . code insee": "'75056'",
        "revenu fiscal de référence par part": 5000,
        "vélo . type": "'mécanique simple'",
        "vélo . prix": 1000,
      })
      .evaluate("aides . montant");
  });

  bench("evaluate (v2)", () => {
    // @ts-ignore
    v2.evaluate("aides . montant", {
      "localisation . code insee": "75056",
      "revenu fiscal de référence par part": 5000,
      "vélo . type": "mécanique simple",
      "vélo . prix": 1000,
    });
  });

  bench("evaluate (v2 with cache)", () => {
    // @ts-ignore
    v2WithCache.evaluate("aides . montant", {
      "localisation . code insee": "75056",
      "revenu fiscal de référence par part": 5000,
      "vélo . type": "mécanique simple",
      "vélo . prix": 1000,
    });
  });

  bench("evaluate (v2 JS)", () => {
    // @ts-ignore
    v2JS.evaluate("aides . montant", {
      "localisation . code insee": "75056",
      "revenu fiscal de référence par part": 5000,
      "vélo . type": "mécanique simple",
      "vélo . prix": 1000,
    });
  });

  bench("evaluate (v2 JS with cache)", () => {
    // @ts-ignore
    v2JSWithCache.evaluate("aides . montant", {
      "localisation . code insee": "75056",
      "revenu fiscal de référence par part": 5000,
      "vélo . type": "mécanique simple",
      "vélo . prix": 1000,
    });
  });
});

await run({
  format: "mitata",
  throw: true,
});

console.time("evaluate v2 (JS)");
// @ts-ignore
const res2 = v2JS.evaluate("aides . montant", {
  "localisation . code insee": "75056",
  "revenu fiscal de référence par part": 5000,
  "vélo . type": "mécanique simple",
  "vélo . prix": 1000,
});
console.timeEnd("evaluate v2 (JS)");

console.log("montant =", res2.value);

console.time("evaluate v2");
// @ts-ignore
let res = v2.evaluate("aides . montant", {
  "localisation . code insee": "75056",
  "revenu fiscal de référence par part": 5000,
  "vélo . type": "mécanique simple",
  "vélo . prix": 1000,
});
console.timeEnd("evaluate v2");

console.log("montant =", res.value);

console.time("evaluate v1");
// @ts-ignore
const res3 = legacy
  .setSituation({
    "localisation . code insee": "'75056'",
    "revenu fiscal de référence par part": 5000,
    "vélo . type": "'mécanique simple'",
    "vélo . prix": 1000,
  })
  .evaluate("aides . montant");
console.timeEnd("evaluate v1");

console.log("montant =", res3.nodeValue);
