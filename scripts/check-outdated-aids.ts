import { env } from "bun";
import { AidesVeloEngine } from "../src";

const nextWeek = new Date();
nextWeek.setDate(nextWeek.getDate() + 7);
const engine = new AidesVeloEngine();

const outdated = engine.getAllAidesIn().filter((aide) => {
  // NOTE: nous voulons anticiper les aides qui vont expirer dans la semaine
  // pour être proactif·ve.
  return aide.endDate && aide.endDate <= nextWeek;
});

if (outdated.length === 0) {
  console.log("Toutes les aides sont en vigueur.");
} else {
  if (env.CI) {
    const message = outdated
      .map(
        ({ title, endDate }) =>
          `- [ ] ${title} : clôturée le ${endDate!.toLocaleDateString("FR-fr")}`
      )
      .join("<br />");
    console.log(
      `::set-output name=comment::<br />### Liste des aides obsolètes<br />${message}`
    );
  } else {
    outdated.forEach(({ id, title, endDate }) => {
      console.error(
        `L'aide "${title}" (${id}) n'est plus en vigueur, elle a pris fin le ${endDate!.toLocaleDateString(
          "FR-fr"
        )}.`
      );
    });
    console.error(
      `Il y a ${outdated.length} aide${
        outdated.length > 1 ? "s" : ""
      } obsolète${
        outdated.length > 1 ? "s" : ""
      }. Veuillez les déplacer dans le fichier "./src/rules/historique/aides-desactivees.publicodes".`
    );
  }
}
