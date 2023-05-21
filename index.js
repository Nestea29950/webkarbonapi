import lighthouse from "lighthouse";
import chromeLauncher from "chrome-launcher";
import { co2 } from "@tgwf/co2";
import fetch, { Response } from "node-fetch";
import express, { response } from "express";
import cors from "cors";
import url from "node:url";

var app = express();

app.use(
  cors({
    origin: "*",
  })
)

// get consommation CO2

function co22(bytes) {
  let oneByte = new co2({ model: "1byte" });
  let emissions = oneByte.perByte(bytes);
  return emissions;
}

// ----------------------

// Calcul light house !

function lighthouseco2(urll, res) {
  
  (async () => {
    let audits = [];
    let runnerResult;
    let chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
    let options = {
      logLevel: "info",
      output: "html",
      onlyCategories: ["performance"],
      port: chrome.port,
    };
    async function runLighthouse() {
      runnerResult = await lighthouse(urll, options);
      await chrome.kill();
    }
    
    const timeout = setTimeout(() => {
      console.log('Lighthouse test took too long, cancelling...');
      process.exit(1); // Or any other action you want to take when the test is cancelled
    }, 60000); // 1 minute
    
    await runLighthouse()
      .then(() => clearTimeout(timeout))
      .catch((err) => {
        clearTimeout(timeout);
        console.error(err);
        process.exit(1);
      });
    // `.lhr` is the Lighthouse Result as a JS object

    // CO2 Calcul à partir de de la function co22 pour pas de doublons 
    let co2PerPageview = co22(runnerResult.lhr.audits["total-byte-weight"].numericValue);
    audits.push({"name": "carbon", "score": co2PerPageview, "Green": false})
    // ---------------------------------------------------------------

    // Parse url avec function node js 
    let myURL = url.parse(urll);
    let response = await fetch("https://api.thegreenwebfoundation.org/api/v3/greencheck/"+myURL.hostname).then(response => response.json());
    audits.push({"name": "greenhost", "score": response.green});
    // --------------------------------

    // Met tout les noms valeurs dans le tableau audits
    for (let i in runnerResult.lhr.audits) {
      audits.push({
        name: runnerResult.lhr.audits[i].id,
        score: runnerResult.lhr.audits[i].score,
        value: runnerResult.lhr.audits[i].displayValue,
        numericValue: runnerResult.lhr.audits[i].numericValue,
      });
    }

    let a = 0;
    while (
      a < runnerResult.lhr.audits["resource-summary"].details.items.length
    ) {
      audits.push({
        name: runnerResult.lhr.audits["resource-summary"].details.items[a][
          "label"
        ],
        score: null,
        value:
          runnerResult.lhr.audits["resource-summary"].details.items[a][
            "requestCount"
          ],
      });
      a++;
    }
    // ------------------------------------------------------------------------
    
    audits.push({
      name: "performances",
      score: runnerResult.lhr.categories.performance.score,
    });

    
    res.send({
      audits,
    });

  })();
}
// ----------------------------------

// Api Route pour renvoyer audits
// Créez une file d'attente pour stocker les requêtes en attente
const requestQueue = [];

app.get("/api", async function (req, res) {
  // Récupérez l'URL de la requête
  const url = req.query.url;

  // Ajoutez la requête à la file d'attente
  requestQueue.push({ url, res });

  // Vérifiez si la file d'attente est vide et si la requête est la première dans la file
  if (requestQueue.length === 1) {
    // Si c'est le cas, commencez le traitement
    processQueue();
  }
});

async function processQueue() {
  // Récupérez la première requête dans la file d'attente
  const { url, res } = requestQueue[0];

  // Effectuez le traitement de la requête
  await lighthouseco2(url, res);

  // Supprimez la première requête de la file d'attente
  requestQueue.shift();

  // Vérifiez s'il y a d'autres requêtes en attente dans la file
  if (requestQueue.length > 0) {
    // Si c'est le cas, traitez la prochaine requête
    processQueue();
  }
}


let port = process.env.PORT || 3000; // Besoin du port 3000 !

// -------------------------------

// Faire écouter le port pour lancer l'api

app.listen(port, () => {
  console.log("App running on port :" + port);
});

// ----------------------------------------
