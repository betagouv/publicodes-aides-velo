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

```typescript
import { Engine } from "publicodes";
import rules from "@betagouv/aides-velo";

const engine = new Engine(rules);

console.log(engine.evaluate("salaire net").nodeValue);
// 1957.5

engine.setSituation({ "salaire brut": 4000 });
console.log(engine.evaluate("salaire net").nodeValue);
// 3120
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
