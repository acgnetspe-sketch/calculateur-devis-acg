/*
 * Service worker du calculateur de devis ACG NET SPE.
 * Il garde une copie de tous les fichiers de l'application sur l'appareil :
 * une fois ouverte une première fois avec du réseau, l'application fonctionne hors connexion.
 * Ce fichier est un modèle : la liste des fichiers et la version sont ajoutées à la construction (npm run build).
 */
const VERSION = '__VERSION__';
const FICHIERS = __FICHIERS__;
const CACHE = `devis-acg-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['./', ...FICHIERS])),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c.startsWith('devis-acg-') && c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

// L'application demande d'installer la nouvelle version quand l'utilisateur touche « Mettre à jour ».
self.addEventListener('message', (event) => {
  if (event.data === 'mettre-a-jour') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  if (requete.method !== 'GET' || new URL(requete.url).origin !== self.location.origin) return;

  // Ouverture d'une page : toujours l'application gardée sur l'appareil.
  if (requete.mode === 'navigate') {
    event.respondWith(
      caches
        .match('./index.html', { ignoreVary: true })
        .then((r) => r || caches.match('./', { ignoreVary: true }))
        .then((r) => r || fetch(requete)),
    );
    return;
  }

  // Autres fichiers : copie de l'appareil d'abord, sinon réseau (et copie gardée pour la prochaine fois).
  event.respondWith(
    caches.match(requete, { ignoreSearch: true, ignoreVary: true }).then(
      (enCache) =>
        enCache ||
        fetch(requete).then((reponse) => {
          if (reponse.ok) {
            const copie = reponse.clone();
            caches.open(CACHE).then((cache) => cache.put(requete, copie));
          }
          return reponse;
        }),
    ),
  );
});
