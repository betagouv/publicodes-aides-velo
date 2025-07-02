import { AidesVeloEngine } from "../src";

const now = new Date();
const engine = new AidesVeloEngine();
let outdated = 0;

engine.getAllAidesIn().forEach(({ title, id, endDate }) => {
  if (endDate && endDate <= now) {
    console.log(
      `L'aide "${title}" (${id}) n'est plus en vigueur, elle a pris fin le ${endDate.toLocaleDateString()}.`
    );
    outdated++;
  }
});

if (outdated === 0) {
  console.log("Toutes les aides sont en vigueur.");
} else {
  console.error(
    `Il y a ${outdated} aide${outdated > 1 ? "s" : ""} obsolète${
      outdated > 1 ? "s" : ""
    }. Veuillez les déplacer dans le fichier "./src/rules/historique/aides-desactivees.publicodes".`
  );
  process.exit(1);
}
