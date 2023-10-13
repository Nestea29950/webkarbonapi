import { Worker } from 'worker_threads';
import express from "express";
import cors from "cors";

var app = express();
app.use(cors());

const MAX_WORKERS = 2;
const apiQueue = []; // File d'attente pour les appels d'API en attente
let activeWorkers = 0; // Nombre de workers actuellement en cours d'exécution

app.get("/api", async function (req, res) {
  const url = req.query.url;

  const origin = req.get('Origin');

      if(origin == "https://www.webkarbon.bzh" || origin == "https://www.webkarbon.fr" && url != "https://api.webkarbon.fr" && url != "https://api.webkarbon.fr/"){

      if (activeWorkers < MAX_WORKERS) {

      createWorkerThread(url, res);

    } else {

      // Ajouter l'appel d'API à la file d'attente

      apiQueue.push({ url, res });

    }
      }
      else{

        res.send("erreur");

      }

});

// Création d'un worker thread
function createWorkerThread(url, res) {

  const worker = new Worker('./worker.js', { workerData: url });

  activeWorkers++;

  // Événement de réception de message du thread
  worker.on('message', audits => {
    console.log(audits);
    if(audits == false){
      res.send("erreur");
    }
    else{
      res.send({ audits });
    }
    

    if (apiQueue.length > 0) {

      // Récupérer le prochain appel d'API dans la file d'attente

      const nextApiCall = apiQueue.shift();
      
      createWorkerThread(nextApiCall.url, nextApiCall.res);

    } 
    
    else {

      activeWorkers--;

    }

  });
}

let port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("App running on port: " + port);
});
