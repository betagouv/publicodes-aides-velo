import { env } from "bun";
import { AidesVeloEngine } from "../src";
const engine = new AidesVeloEngine();

// Extrait la liste des liens référencés dans la base de règles
const links = engine.getAllAidesIn().map(({ title, url }) => ({
  title: title ?? null,
  url: url ?? null,
}));

// Certains sites référencés ont des problèmes de certificats, mais ce n'est pas
// ce que nous cherchons à détecter ici.
env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Création d'une queue permettant de paralléliser la vérification des liens
const queue = [...links];
const detectedErrors: Array<{ status: string; url: string; title: string }> =
  [];
const simultaneousItems = 5;

async function processNextQueueItem() {
  if (queue.length !== 0) {
    await fetchAndReport(queue.shift()!);
    await processNextQueueItem();
  }
}

async function fetchAndReport({ title, url }) {
  let status = await getHTTPStatus(url);

  // Retries in case of timeout
  let remainingRetries = 3;
  while (status === 499 && remainingRetries > 0) {
    remainingRetries--;
    await sleep(20_000);
    status = await getHTTPStatus(url);
  }

  report({ status, url, title });
}

async function getHTTPStatus(url: string) {
  const maxTime = 15_000;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), maxTime);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36",
      },
    });
    return res.status;
  } catch (err) {
    return 499;
  }
}

async function report({ status, url, title }) {
  console.log(status === 200 ? "✅" : "❌", status, url);

  if (status === 404 || status >= 500) {
    detectedErrors.push({ status, url, title });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  await Promise.allSettled(
    Array.from({ length: simultaneousItems }).map(processNextQueueItem)
  );

  if (detectedErrors.length > 0) {
    // Formattage spécifique pour récupérer le résultat avec l'action Github
    if (env.CI) {
      const message = detectedErrors
        .map(
          ({ status, title, url }) => `- [ ] \`${status}\` [${title}](${url})`
        )
        .join("\n");

      const format = (msg: string) =>
        msg
          .trim()
          .split("\n")
          .map((line: string) => line.trim())
          .join("<br />");
      console.log(`::set-output name=comment::${format(message)}`);
    } else if (detectedErrors) {
      console.log(
        "Liens invalides :" + detectedErrors.map(({ url }) => `\n- ${url}`)
      );
    }

    console.log("Terminé");
  }
})();
