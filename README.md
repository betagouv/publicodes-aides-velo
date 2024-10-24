# @betagouv/aides-velo

Modèle Publicodes pour le calcul des aides vélo en France.

> Ce modèle est basé sur celui de [Mes Aides Vélo](https://mesaidesvelo.fr/),
> mais a été rapatrié dans l'organisation Beta.gouv pour faciliter sa
> maintenance et son évolution.

## Installation

```sh
yarn install @betagouv/aides-velo publicodes
```

## Usage

A noter que par soucis de praticité, ce paquet expose en plus des règles
Publicodes, une classe `AidesVeloEngine` qui encapsule un moteur Publicodes afin de
faciliter l'utilisation des règles.

En exposant notamment la méthode `computeAides` qui permet de calculer et
récupérer la liste de toutes les aides élligibles pour une situation donnée.

### Avec la classe `AidesVeloEngine`

```typescript
import { AidesVeloEngine } from "@betagouv/aides-velo";

const engine = new AidesVeloEngine();

engine.setInputs({
  "localisation . epci": "CA du Grand Angoulême",
  "vélo . type": "électrique",
  "vélo . état": "occasion",
  "vélo . prix": 1000,
  "revenu fiscal de référence": 2000,
});

console.log(engine.computeAides());
// TODO
```

### Avec les règles Publicodes

Il est également possible d'utiliser les règles Publicodes directement.

```typescript
import Engine, { formatValue } from "publicodes";
import { rules } from "@betagouv/aides-velo";

const engine = new Engine(rules);

engine.setSituation({
  "localisation . epci": "'CA du Grand Angoulême'",
  "vélo . type": "'électrique'",
  "vélo . état": "'occasion'",
  "vélo . prix": 1000,
  "revenu fiscal de référence": 2000,
});

const result = engine.evaluate("aides . grand angouleme");

console.log(result.nodeValue);
// 400

console.log(formatValue(result));
// 400 €
```

## Development

```sh
// Install the dependencies and run postinstall scripts
yarn install

// Compile the Publicodes rules
yarn run compile:rules

// Run the tests
yarn run test

// Compile the whole package (rules + wrapper function)
yarn run compile

// Run the documentation server
yarn run doc
```
