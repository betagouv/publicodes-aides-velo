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
Publicodes, une fonction wrapper `aidesVelo` qui permet de récupérer la liste
des aides élligibles pour une situation donnée.

### Avec la fonction `aidesVelo`

TODO

### Avec les règles Publicodes

```typescript
import { Engine } from "publicodes";
import { rules } from "@betagouv/aides-velo";

const engine = new Engine(rules);

engine.setSituation({
  "localisation . epci": "'CA du Grand Angoulême'",
  "vélo . type": "'électrique'",
  "vélo . état": "'occasion'",
  "vélo . prix": 1000,
  "revenu fiscal de référence": "200 €/mois",
});

const result = engine.evaluate("aides . grand angouleme");

console.log(result.nodeValue);
// 400

console.log(formatValue(result));
// 400 €
```

## Development

```sh
// Install the dependencies
yarn install

// Compile the Publicodes rules
yarn run compile

// Run the tests
yarn run test

// Run the documentation server
yarn run doc
```
