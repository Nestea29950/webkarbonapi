// worker.js
import { parentPort, workerData } from "worker_threads";
import lighthouse from "lighthouse";
import * as chromeLauncher from 'chrome-launcher';
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
    chrome = await chromeLauncher.launch({ 
      chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"], 
      chromePath: '/usr/bin/google-chrome' 
    });
    console.log("Chrome lancé sur le port :", chrome.port);

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

    const timeout = setTimeout(() => {
      audits = false;
      parentPort.postMessage(audits);
      console.log("Le site prends trop de temps");
      chrome.kill();
      process.exit(0);  // Or any other action you want to take when the test is cancelled
    }, 60000); // 1 minute

    await runLighthouse()
      .then(() => clearTimeout(timeout))
      .catch((err) => {
        clearTimeout(timeout);
        console.log("Erreur je sais pas trop")
        audits = false;
        parentPort.postMessage(audits);
        chrome.kill();
        process.exit(0); 
      });
    // `.lhr` is the Lighthouse Result as a JS object

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
    if (runnerResult.lhr.audits["resource-summary"].details && runnerResult.lhr.audits["resource-summary"].details.items) {
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
      chrome.kill();
      process.exit(0); 
    }
    else{
      console.log("Probleme url");
      audits = false;
  
      parentPort.postMessage(audits);
      chrome.kill();
      process.exit(0); 
    }
    
    
  })();
}

function co22(bytes) {
  let oneByte = new co2({ model: "1byte" });
  let emissions = oneByte.perByte(bytes);
  return emissions;
}
