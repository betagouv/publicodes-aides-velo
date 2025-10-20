# `@betagouv/aides-velo`

![NPM Version](https://img.shields.io/npm/v/%40betagouv%2Faides-velo) [![jsDocs.io](https://img.shields.io/badge/jsDocs.io-reference-blue)](https://www.jsdocs.io/package/@betagouv/aides-velo)

Modèle [Publicodes](https://publi.codes) pour le calcul des aides vélo en
France.

> [!NOTE]
> Ce modèle est la continuité de celui de [Mes Aides
> Vélo](https://mesaidesvelo.fr/) rédigé par Maxime Quandalle. Il a été
> rapatrié dans l'organisation @betagouv pour faciliter sa maintenance et son
> évolution.

L'état de la couverture des aides par région est disponible dans `./couverture/`.

## Installation

```sh
npm install @betagouv/aides-velo
```

## Utilisation

Par soucis de praticité, ce paquet expose en plus des règles Publicodes
(accessible depuis
[`./src/rules`](https://github.com/betagouv/publicodes-aides-velo/tree/main/src/rules)),
une classe
[`AidesVeloEngine`](https://www.jsdocs.io/package/@betagouv/aides-velo#AidesVeloEngine)
qui encapsule un moteur [Publicodes](https://publi.codes) afin de faciliter
l'utilisation des règles.

En exposant notamment la méthode
[`computeAides`](https://www.jsdocs.io/package/@betagouv/aides-velo#AidesVeloEngine.computeAides)
qui permet de calculer et récupérer la liste de toutes les aides éligibles
pour une situation donnée, ainsi que la méthode
[`setInputs`](https://www.jsdocs.io/package/@betagouv/aides-velo#AidesVeloEngine.setInputs)
qui permet de définir les valeurs des questions du modèle de manière au format
JS et _type-safe_ (voir le type
[`Questions`](https://www.jsdocs.io/package/@betagouv/aides-velo#Questions)).

> [!NOTE]
> To see the full API documentation, please refer to
> [jsDocs.io](https://www.jsdocs.io/package/@betagouv/aides-velo).

### Avec la classe `AidesVeloEngine`

```typescript
import { AidesVeloEngine } from "@betagouv/aides-velo";

// Initialisation du moteur
const engine = new AidesVeloEngine();

// Définition de la situation
engine.setInputs({
  "localisation . code insee": "33119", // Code INSEE de la commune, permet de récupérer les aides communales
  "localisation . epci": "Bordeaux Métropole", // Permet de récupérer les aides intercommunales
  "localisation . département": "33", // Permet de récupérer les aides départementales
  "localisation . région": "75", // Permet de récupérer les aides régionales
  "localisation . pays": "France", // Permet de récupérer les aides nationales
  "vélo . type": "électrique",
  "vélo . état": "neuf",
  "vélo . prix": 1000,
  "revenu fiscal de référence par part . revenu de référence": 20000,
  "revenu fiscal de référence par part . nombre de parts": 2,
});

// Calcul des aides
engine
  .computeAides()
  .forEach(({ title, amount }) => console.log(`Aide ${title} : ${amount}€`));

// Aide Bordeaux Métropole : 200€
// Aide Ville de Bègles : 200€
```

> [!TIP]
> Pour récupérer les informations de localisation (code INSEE, EPCI, etc...)
> nécessaires pour le calcul des aides, il est possible d'utiliser le paquet
> [`@etalab/decoupage-administratif`](https://github.com/datagouv/decoupage-administratif).

### Avec les règles Publicodes

Il est également possible d'utiliser les règles Publicodes directement avec
`@betagouv/aides-velo/rules`.

```typescript
import Engine, { formatValue } from "publicodes";
import rules from "@betagouv/aides-velo/rules";

const engine = new Engine(rules);

// Permet de définir les valeurs de chaques règles et pas seulement celles qui
// correspondent à des questions.
engine.setSituation({
  "localisation . epci": "'CA du Grand Angoulême'",
  "vélo . type": "'électrique'",
  "vélo . état": "'occasion'",
  "vélo . prix": 1000,
  "revenu fiscal de référence par part": 2000,
});

const result = engine.evaluate("aides . grand angouleme");

console.log(result.nodeValue);
// 400

console.log(formatValue(result));
// 400 €
```

## Développement

```sh
// Install the dependencies and run postinstall scripts
npm install

// Compile the Publicodes rules
npm run compile:rules

// Run the tests
npm run test

// Compile the whole package (rules + wrapper function)
npm run compile

// Run the documentation server
npm run doc
```

## Modification des aides

Si vous avez repéré une erreur ou souhaitez ajouter une aide, vous pouvez
simplement ouvrir [une
issue](https://github.com/betagouv/publicodes-aides-velo/issues) ou si vous le
souhaitez, ouvrir une _pull request_ avec les modifications nécessaires.

Toutes les aides sont définie dans le fichier
[`src/rules/aides.publicodes`](./src/rules/aides.publicodes) et peuvent être
modifiées (resp. supprimées/ajoutées) directement dans ce fichier.

Pour simplifier la relecture des aides, veuillez renseigner une date de
dernière mise à jour, et si vous avez l'information, la date de fin de validité
de l'aide :

```yaml
aides . saint-roustan:
  # ...
  dernière mise à jour: 10/02/2025 # DD/MM/YYYY
  date de fin: 31/12/2025 # DD/MM/YYYY
```

Une fois les modifications effectuées, assurez vous de ne pas avoir introduit
d'erreurs dans les règles avec la commande `npm run compile`.

> [!NOTE]
> Si une aide n'est plus d'actualité et doit être supprimée, il est préférable
> d'en garder la trace. Pour cela, il suffit de la déplacer dans le fichier
> [`./src/rules/historique/aides-desactivees.publicodes`](./src/rules/historique/aides-desactivees.publicodes).

Si la modélisation de l'aide implique un certain degré de complexité, il est
probablement souhaitable de rajouter des tests unitaires dans le fichier
[`test/rules.test.ts`](./test/rules.test.ts).

Une fois toutes les modifications effectuées et les tests passés, vous pouvez
ajouter vos modifications dans le changelog grâce à la commande `npx changeset` en
sélectionnant `patch` puis en ajoutant la description adéquate :

```
Ajout - [Titre de l'aide]

Modification - [Titre de l'aide] - [Description de la modification]

Suppression - [Titre de l'aide]
```

> [!TIP]
> Exécuter cette commande permettra d'automatiser la génération du changelog
> lors de la publication de la prochaine version et ainsi garder une trace des
> modifications apportées.

Enfin, _commitez_ vos modifications et ouvrez une _pull request_.
