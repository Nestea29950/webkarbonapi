const { Worker, isMainThread, threadId } = require('worker_threads');

if (isMainThread) {
  // Fonction pour déterminer le nombre de threads possibles
  function calculateThreadCount() {
    // Récupérer le nombre de CPU disponibles
    const cpuCount = require('os').cpus().length;
    
    // Par défaut, on peut utiliser tous les cœurs disponibles
    let threadCount = cpuCount;

    // Réduire le nombre de threads si nécessaire
    if (cpuCount > 2) {
      threadCount = cpuCount - 1;
    }

    return threadCount;
  }

  // Obtenir le nombre de threads possibles
  const numThreads = calculateThreadCount();
  console.log(`Nombre de threads possibles : ${numThreads}`);

  // Lancer des workers
  for (let i = 0; i < numThreads; i++) {
    new Worker(__filename);
  }
} else {
  // Ce code sera exécuté dans chaque worker
  console.log(`Worker ${threadId} démarré.`);
}
