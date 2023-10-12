// worker.js
import { parentPort, workerData } from "worker_threads";
import lighthouse from "lighthouse";
import chromeLauncher from "chrome-launcher";
import { co2 } from "@tgwf/co2";
import fetch, { Response } from "node-fetch";
import url from "node:url";
let chrome;
// Fonction exécutée dans le thread

lighthouseco2(workerData);
function lighthouseco2(urll) {
  (async () => {
    let audits = [];
    let runnerResult;
    chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"], chromePath: '/usr/bin/google-chrome' });
    // /usr/bin/google-chrome
    //./chrome-win/chrome.exe
    //C:/Program Files/Google/Chrome/Application/chrome.exe

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
    console.log("lancement lighthouse");
    await runLighthouse();

    // CO2 Calcul à partir de de la function co22 pour pas de doublons
    let co2PerPageview = co22(
      runnerResult.lhr.audits["total-byte-weight"].numericValue
    );
    audits.push({ name: "carbon", score: co2PerPageview, Green: false });
    // ---------------------------------------------------------------

    // Parse url avec function node js
    let myURL = url.parse(urll);
    let response = await fetch(
      "https://api.thegreenwebfoundation.org/api/v3/greencheck/" +
        myURL.hostname
    ).then((response) => response.json());
    audits.push({ name: "greenhost", score: response.green });
    // --------------------------------

    // Met tout les noms valeurs dans le tableau audits
    if(runnerResult.lhr.audits.scoreDisplayMode != 'error'){
      audits.push('erreur');
      parentPort.postMessage(audits);
    }
    else{
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
  
      parentPort.postMessage(audits);
    }
    
  })();
}

function co22(bytes) {
  let oneByte = new co2({ model: "1byte" });
  let emissions = oneByte.perByte(bytes);
  return emissions;
}
