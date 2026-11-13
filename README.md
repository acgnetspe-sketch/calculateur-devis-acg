# Calculateur de devis ACG NET SPE

Application web qui chiffre un nettoyage ou un débroussaillage de centrale photovoltaïque et produit un devis PDF.
Fonctionne sur ordinateur et sur iPad, sans compte ni serveur : les données restent sur l'appareil.
Le cahier des charges complet est dans [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md).

## Sur l'ordinateur

Il faut [Node.js](https://nodejs.org) (version 20 ou plus récente).

```bash
npm install        # une seule fois, installe les outils
npm run dev        # lance l'application : ouvrir l'adresse affichée (http://localhost:5173)
npm test           # vérifie tous les calculs (dont les cas A, B, C et D du cahier des charges)
npm run build      # prépare la version à mettre en ligne, dans le dossier dist/
npm run preview    # essaie cette version, avec le fonctionnement hors connexion
```

## Sur l'iPad

Pour être installée et marcher hors connexion, l'application doit être en ligne sur une adresse sécurisée (https).
Deux solutions gratuites :

- **Netlify Drop** : lancer `npm run build`, puis glisser le dossier `dist/` sur <https://app.netlify.com/drop>.
- **GitHub Pages** : publier le contenu du dossier `dist/` (voir la documentation de GitHub Pages).

Puis, sur l'iPad :

1. Ouvrir l'adresse dans **Safari**.
2. Toucher le bouton **Partager**, puis **Sur l'écran d'accueil**.
3. Ouvrir l'application depuis son icône « Devis ACG » : elle s'affiche en plein écran et fonctionne sans réseau.

Bon à savoir :

- L'application installée et Safari ont **chacun leurs données**. Pour passer de l'un à l'autre, ou d'un appareil
  à un autre : Paramètres → Sauvegarde → **Exporter**, puis **Importer** de l'autre côté.
- Exporter une sauvegarde régulièrement (Fichiers, iCloud Drive ou e-mail) évite de tout perdre si l'iPad est
  changé ou réinitialisé.
- Après une mise en ligne d'une nouvelle version, un bandeau « Mettre à jour » apparaît dans l'application.

## Organisation du code

| Dossier | Contenu |
|---|---|
| `src/calcul/` | Tous les calculs (fonctions pures, montants en centimes) et leurs tests |
| `src/modele/` | Types de données et valeurs de départ (grilles, paramètres provisoires) |
| `src/donnees/` | Enregistrement dans le navigateur, sauvegarde, fonctionnement hors connexion |
| `src/ecrans/` | Écrans : liste des devis, devis, aperçu, clients, paramètres |
| `src/pdf/` | Fabrication du PDF (jsPDF et jspdf-autotable) |
| `hors-connexion/` | Service worker qui garde l'application sur l'appareil |
