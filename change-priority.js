import fs from "fs";
import yaml, { isMap, Scalar, YAMLMap } from "yaml";

const aides = yaml.parseDocument(
  fs.readFileSync("./src/rules/aides.publicodes", "utf8"),
  { keepSourceTokens: true }
);

let priority = {
  région: 0,
  département: 0,
  intercommunalité: 0,
  commune: 0,
};

yaml.visit(aides, {
  Map(_, map) {
    if (isMap(map)) {
      const remplaceItem = map.items.find(
        (item) => item.key.value === "remplace"
      );
      if (remplaceItem) {
        const remplaceItemValueStr = remplaceItem.value.toString();
        if (remplaceItemValueStr in priority) {
          const remplaceValue = new YAMLMap();
          priority[remplaceItemValueStr]++;
          remplaceValue.add({
            key: new Scalar("référence à"),
            value: remplaceItem.value,
          });
          remplaceValue.add({
            key: new Scalar("priorité"),
            value: priority[remplaceItem.value]++,
          });
          // Add the new key-value pair
          map.set(remplaceItem.key, remplaceValue);
        }
      }
    }
  },
});

// const aidesUpdated = Object.fromEntries(
//   Object.entries(aides).map(([name, rule]) => {
//     const remplace = rule["remplace"];
//     if (remplace) {
//       priority[remplace]++;
//       return [
//         name,
//         {
//           ...rule,
//           remplace: { "référence à": remplace, priorité: priority[remplace] },
//         },
//       ];
//     }
//     return [name, rule];
//   })
// );
//
fs.writeFileSync(
  "./src/rules/aides.publicodes",
  yaml.stringify(aides, { keepSourceTokens: true }),
  "utf8"
);
