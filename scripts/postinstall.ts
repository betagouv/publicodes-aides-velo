import generateCommunesData from "./generate-communes";
import generateAidesLocalisationData from "./generate-aides-localisation";
import generateMiniaturesData from "./data-fetch/miniatures/extract-miniatures";

generateCommunesData();
generateAidesLocalisationData();
generateMiniaturesData();
