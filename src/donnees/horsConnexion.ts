import { useEffect, useState } from 'react';

/** Vrai quand l'utilisateur a touché « Mettre à jour » : seul cas où la page se recharge. */
let miseAJourDemandee = false;

/**
 * Installe le service worker (version construite seulement) et signale quand une nouvelle
 * version de l'application est prête. Demande aussi au navigateur de ne pas effacer les données.
 */
export function useHorsConnexion(): { nouvelleVersion: boolean; mettreAJour: () => void; enLigne: boolean } {
  const [enAttente, setEnAttente] = useState<ServiceWorker | null>(null);
  const [enLigne, setEnLigne] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine);
    window.addEventListener('online', maj);
    window.addEventListener('offline', maj);
    return () => {
      window.removeEventListener('online', maj);
      window.removeEventListener('offline', maj);
    };
  }, []);

  useEffect(() => {
    navigator.storage?.persist?.().catch(() => undefined);
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let rechargement = false;
    const recharger = () => {
      // À la toute première installation, le service worker prend la main sans recharger la page.
      if (rechargement || !miseAJourDemandee) return;
      rechargement = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', recharger);
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        const surveiller = (sw: ServiceWorker | null) => {
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            // Une version déjà installée existe : la nouvelle attend l'accord de l'utilisateur.
            if (sw.state === 'installed' && navigator.serviceWorker.controller) setEnAttente(sw);
          });
        };
        if (reg.waiting && navigator.serviceWorker.controller) setEnAttente(reg.waiting);
        surveiller(reg.installing);
        reg.addEventListener('updatefound', () => surveiller(reg.installing));
        // Vérifie les mises à jour à chaque retour sur l'application.
        const verifier = () => document.visibilityState === 'visible' && reg.update().catch(() => undefined);
        document.addEventListener('visibilitychange', verifier);
      })
      .catch(() => undefined);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', recharger);
  }, []);

  return {
    nouvelleVersion: enAttente !== null,
    mettreAJour: () => {
      miseAJourDemandee = true;
      enAttente?.postMessage('mettre-a-jour');
    },
    enLigne,
  };
}
