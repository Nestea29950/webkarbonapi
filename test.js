import { Worker } from 'worker_threads';
import express, { response } from "express";
import cors from "cors";
// Fonction exécutée dans le thread
var app = express();

app.use(
  cors({
    origin: "*",
  })
)

app.get("/api", async function (req, res) {
  const url = req.query.url;
  createWorkerThreads(url,res)
  
})

// Création des threads
function createWorkerThreads(url,res) {
  const worker1 = new Worker('./worker.js', { workerData: url }); 

  // Événement de réception de message du thread
  worker1.on('message', message => {
    res.send(message)
  });
  
}

let port = process.env.PORT || 3000; // Besoin du port 3000 !
// -------------------------------

// Faire écouter le port pour lancer l'api

app.listen(port, () => {
  console.log("App running on port :" + port);
});