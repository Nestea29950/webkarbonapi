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

  if ((origin === "https://www.webkarbon.bzh" || origin === "https://www.webkarbon.fr") && url !== "https://api.webkarbon.fr" && url !== "https://api.webkarbon.fr/") {
    if (activeWorkers < MAX_WORKERS) {
      createWorkerThread(url, res);
    } else {
      // Ajouter l'appel d'API à la file d'attente
      apiQueue.push({ url, res });
      console.log("Demande mise en file d'attente :", url);
    }
  } else {
    res.send("erreur");
  }
});

// Création d'un worker thread
function createWorkerThread(url, res) {
  const worker = new Worker('./worker.js', { workerData: url });
  console.log("Nouveau worker créé pour :", url);

  activeWorkers++;

  // Événement de réception de message du thread
  worker.on('message', audits => {
    console.log("Réponse reçue pour :", url);
    if (audits === false) {
      res.status(400).send("Problème url");
    } else {
      res.send({ audits });
    }

    if (apiQueue.length > 0) {
      // Récupérer le prochain appel d'API dans la file d'attente
      const nextApiCall = apiQueue.shift();
      console.log("Traitement de la demande en file d'attente pour :", nextApiCall.url);
      createWorkerThread(nextApiCall.url, nextApiCall.res);
    } else {
      activeWorkers--;
      console.log("Worker terminé pour :", url);

      // S'il n'y a plus de travailleurs actifs, cela peut être un bon moment pour rediriger
      // les demandes de la file d'attente vers de nouveaux workers, le cas échéant.
      if (activeWorkers === 0 && apiQueue.length > 0) {
        const nextApiCall = apiQueue.shift();
        console.log("Traitement de la demande en file d'attente pour :", nextApiCall.url);
        createWorkerThread(nextApiCall.url, nextApiCall.res);
      }
    }
  });
}

let port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("App running on port: " + port);
});
