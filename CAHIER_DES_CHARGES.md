# Calculateur de devis ACG NET SPE – Cahier des charges

13 nov. 2026 · Christophe

Une application web qui chiffre un nettoyage ou un débroussaillage en quelques minutes, applique les grilles tarifaires de l'entreprise et sort un devis PDF prêt à envoyer. Elle fonctionne sur ordinateur et sur iPad, sans compte ni serveur.

## 1. Technique et fonctionnement

Une seule page web, sans serveur : toutes les données restent sur l'appareil. C'est le plus simple à construire, à faire évoluer et à utiliser sur iPad.

| Choix | Valeur retenue | Pourquoi |
|---|---|---|
| Technologie | Vite, React et TypeScript | Standard, bien maîtrisé par Claude Code |
| Calculs | Fonctions pures, testées avec Vitest | Un prix faux sur un devis coûte cher : chaque règle est vérifiée automatiquement |
| PDF | Généré dans le navigateur (jsPDF et jspdf-autotable) | Pas de serveur ; fonctionne hors connexion |
| Données | Stockage du navigateur, avec export et import d'un fichier de sauvegarde JSON | Rien à installer ; la sauvegarde évite de tout perdre en changeant d'appareil |
| iPad | Application web installable (« Sur l'écran d'accueil »), utilisable hors connexion | Ouverte comme une app, même sans réseau sur chantier |
| Langue et formats | Français ; montants au format 1 234,56 € ; dates au format 13/11/2026 | Usage interne et clients français |

Plus tard, si besoin : mise en ligne gratuite (Netlify ou GitHub Pages), puis synchronisation entre appareils.

## 2. Écrans

Cinq écrans, accessibles par un menu en haut (ou en bas sur iPad). Un devis se fait dans l'ordre 1 → 2 → 3.

1. **Liste des devis (accueil).** Tableau des devis : numéro, date, client, site, montant HT, statut (Brouillon, Envoyé, Accepté, Refusé). Recherche par client ou par site, filtre par statut. Boutons : Nouveau devis, Dupliquer, Supprimer (avec confirmation).
2. **Devis (création et modification).** Un seul écran en quatre blocs repliables :
   1. Client : choix dans le carnet ou saisie d'un nouveau client.
   2. Site : nom de la centrale, localisation, type d'installation, accès, point d'eau.
   3. Prestations : lignes ajoutées depuis un catalogue (nettoyage, débroussaillage intérieur, OLD, élagage, options, ligne libre). Le prix unitaire se remplit seul depuis la grille choisie et reste modifiable.
   4. Conditions : validité, paiement, période d'intervention, notes.

   À droite (en bas sur iPad), un récapitulatif toujours visible : total HT, remise, TVA, TTC, et l'estimation interne (durée, paniers), jamais imprimée.
3. **Aperçu PDF.** Le devis tel qu'il sera envoyé. Boutons : Télécharger le PDF, Partager (feuille de partage de l'iPad), Marquer comme envoyé.
4. **Clients.** Carnet d'adresses : raison sociale, contact, coordonnées, grille tarifaire par défaut, et liste de ses devis.
5. **Paramètres.** Informations de l'entreprise et mentions légales, grilles tarifaires (modifiables), TVA, numérotation, textes par défaut, rendements du matériel, export et import de la sauvegarde.

## 3. Champs

Les champs marqués « oui » bloquent la génération du PDF tant qu'ils sont vides.

### Client

| Champ | Type | Obligatoire | Remarque |
|---|---|---|---|
| Raison sociale | Texte | oui | Ex. : société de projet de la centrale |
| Contact (nom, fonction) | Texte | non | |
| Adresse de facturation | Texte multiligne | oui | |
| E-mail, téléphone | Texte | non | |
| SIRET | Texte (14 chiffres) | non | Contrôle du format |
| Grille tarifaire par défaut | Liste | non | Pré-remplit les prix du devis |

### Site

| Champ | Type | Obligatoire | Remarque |
|---|---|---|---|
| Nom de la centrale | Texte | oui | Repris dans l'objet du devis |
| Commune et département | Texte | oui | |
| Type d'installation | Liste : sol fixe, trackers, ombrière, toiture | oui | Détermine le prix de nettoyage |
| Point d'eau sur site | Oui, non, à vérifier | non | Affiché dans les conditions |
| Hauteur de toiture (m) | Nombre | non | Au-delà de 15 m : alerte « nacelle de 20 m nécessaire » |
| Inclinaison (°) | Nombre | non | Au-delà de 26° sur trackers : alerte « à valider » |
| Niveau d'encrassement | 1 à 10 | non | Information, pas de calcul |

### Ligne de prestation

| Champ | Type | Remarque |
|---|---|---|
| Type de ligne | Nettoyage, débroussaillage intérieur, OLD, élagage, option, ligne libre | Définit l'unité et le prix proposé |
| Désignation | Texte | Pré-remplie, modifiable |
| Quantité | Nombre | m², ha, forfait, jour ou unité |
| Aide au calcul de surface | Nombre de modules × surface d'un module (m²) | Résultat arrondi au m² le plus proche |
| Conversion | m² ↔ ha | 1 ha = 10 000 m² |
| Nombre de passages | Entier, 1 par défaut | Multiplie la ligne |
| Difficulté (OLD) | Facile, moyenne, difficile | Choisit le prix dans la fourchette |
| Prix unitaire HT | Montant | Proposé par la grille, modifiable ; icône si modifié à la main |

### Conditions du devis

| Champ | Valeur par défaut |
|---|---|
| Numéro | DEV-2026-001, incrément automatique par année |
| Date d'émission | Aujourd'hui |
| Durée de validité | 30 jours |
| Conditions de paiement | À définir (question 7) |
| Période d'intervention prévue | Texte libre, ex. « mars – avril 2027 » |
| Remise | % ou montant, 0 par défaut |
| Notes pour le client | Texte libre, imprimé |
| Notes internes | Texte libre, jamais imprimé |

## 4. Calculs

Chaque devis utilise une grille tarifaire, modifiable dans les paramètres. Les prix ci-dessous sont les repères de l'entreprise pour 2025-2027 : ce sont les valeurs de départ, à confirmer (question 3).

### Grilles tarifaires de départ

| Grille | Prestation | Unité | Prix HT |
|---|---|---|---|
| Grandes centrales | Nettoyage, sol fixe | m² | 0,25 € (repère 0,25 à 0,35 €) |
| Grandes centrales | Nettoyage, trackers | m² | 0,30 € |
| Grandes centrales | Nettoyage, ombrières | m² | 0,40 € |
| Grandes centrales | Nettoyage, toiture | m² | 0,60 € |
| Petites surfaces (barème de septembre 2026) | Nettoyage, de 100 à 600 m² | m² | 0,90 € |
| Petites surfaces | Nettoyage, de 601 à 1 500 m² | m² | 0,85 € |
| Petites surfaces | Nettoyage, plus de 1 500 m² | m² | 0,80 € |
| Toutes | Débroussaillage intérieur | ha | 950 € |
| Toutes | OLD, difficulté facile, moyenne, difficile | ha | 1 250 €, 1 325 €, 1 400 € |

L'utilisateur peut créer d'autres grilles, par exemple une grille propre à un client ou à une campagne.

### Règles

1. Barème dégressif : la tranche est choisie selon la surface totale de la ligne, et son prix s'applique à toute la surface. 1 210 m² donnent donc 1 210 × 0,85 €.
2. Moins de 100 m² : un montant minimum s'applique (valeur à définir, question 6).
3. Total d'une ligne = quantité × prix unitaire × nombre de passages, arrondi au centime (arrondi commercial).
4. Total HT = somme des lignes arrondies.
5. Remise : en % ou en montant, appliquée sur le total HT ; elle donne le total HT net.
6. TVA = 20 % du total HT net, arrondie au centime. TTC = HT net + TVA. Le taux se modifie dans les paramètres.
7. Prix modifié à la main : il est conservé et signalé par une icône. Un bouton permet de revenir au prix de la grille.
8. Déplacement, nacelle, eau : ce sont des lignes d'option (forfait, jour ou km), dont les prix sont à définir (questions 5 et 8).

### Exemples chiffrés (cas de test obligatoires)

| Cas | Saisie | Résultat attendu |
|---|---|---|
| A. Centrale au sol | 40 277 modules × 1,31 m², grille Grandes centrales, sol fixe, 1 passage | Surface 52 763 m² ; HT 13 190,75 € ; TVA 2 638,15 € ; TTC 15 828,90 € |
| B. Petite toiture | 1 210 m², grille Petites surfaces | Tranche 601-1 500, soit 0,85 € ; HT 1 028,50 € ; TVA 205,70 € ; TTC 1 234,20 € |
| C. Débroussaillage | Intérieur 12,5 ha + OLD 6 ha, difficulté facile | 11 875,00 € + 7 500,00 € ; HT 19 375,00 € ; TVA 3 875,00 € ; TTC 23 250,00 € |
| D. Remise | Cas A avec une remise de 5 % | Remise 659,54 € ; HT net 12 531,21 € ; TVA 2 506,24 € ; TTC 15 037,45 € |

## 5. Estimation interne

Un encadré visible seulement à l'écran, jamais sur le PDF, aide à vérifier que le prix tient la route.

| Donnée | Calcul | Paramètre de départ |
|---|---|---|
| Heures de nettoyage | Surface ÷ rendement du robot choisi | L1 : 2 000 m²/h ; F1 : 1 300 m²/h (repère 1 000 à 1 600) |
| Jours de nettoyage | Heures ÷ heures productives par jour, arrondi au jour supérieur | 7 h par jour, à confirmer (question 9) |
| Jours de débroussaillage | Surface en ha ÷ rendement en ha par jour | Rendement à définir (question 9) |
| Semaines | Jours ÷ 4 (semaine du lundi au jeudi) | 4 jours par semaine |
| Paniers | Jours × nombre de personnes × 30 € | 2 personnes par défaut |
| Prix moyen | Total HT ÷ jours | Pour comparer les devis entre eux |

Exemple, cas A avec le robot L1 : 26,4 h, soit 4 jours et 1 semaine ; paniers 4 × 2 × 30 = 240 € ; 3 297,69 € HT par jour.

## 6. Format du PDF

A4 portrait, marges de 15 mm, même charte que les books et les guides : bleu nuit #0B1E2D, jaune #FFC629, fond clair #F6F5F1, police Inter (Helvetica si Inter n'est pas intégrée). Une page en général ; le tableau continue sur la page suivante si nécessaire, avec l'en-tête de colonnes répété.

| Zone (de haut en bas) | Contenu |
|---|---|
| En-tête | À gauche : carré jaune et « ACG NET SPE », ou le logo. À droite : « DEVIS » en gros, numéro, date d'émission, date de fin de validité |
| Émetteur et client | À gauche, l'entreprise : adresse, téléphone, e-mail, site, SIRET, numéro de TVA. À droite, encadré, le client : raison sociale, contact, adresse |
| Objet | « Nettoyage des modules photovoltaïques – Centrale de [site] ([département]) », adapté selon les lignes |
| Site | Type d'installation, surface totale, accès, point d'eau |
| Tableau des prestations | Colonnes Désignation, Quantité, Unité, Prix unitaire HT, Total HT ; en-tête bleu nuit, lignes alternées ; sous chaque désignation, une ligne grise de détail (méthode, matériel, nombre de passages) |
| Totaux, alignés à droite | Total HT, remise, total HT net, TVA 20 %, total TTC (en gras, sur fond jaune) |
| Inclus et non inclus | Inclus : rapport photo daté, matériel et personnel habilité. Non inclus : texte paramétrable (ex. accès, point d'eau) |
| Conditions | Validité, conditions de paiement, période d'intervention, pénalités de retard et indemnité forfaitaire de 40 € pour frais de recouvrement |
| Bon pour accord | Encadré : « Devis reçu avant l'exécution des travaux. Bon pour accord », date, nom, signature et cachet du client |
| Pied de page | ACG NET SPE, SASU au capital de [à compléter] €, siège [adresse à confirmer], SIREN 910 204 262, RCS [ville à compléter], TVA [à compléter] ; numéro de page « 1/2 » |

Les mentions de société (dénomination, forme juridique et capital, siège, SIREN et RCS, numéro de TVA) sont celles exigées sur les factures et les documents commerciaux ; les reprendre sur le devis évite de le refaire une fois signé. Le fichier s'appelle `DEV-2026-001_Client_Site.pdf`.

## 7. Questions à trancher avec Christophe

L'application peut être construite sans ces réponses : chacune correspond à un paramètre modifiable plus tard. Elles sont nécessaires avant d'envoyer un vrai devis.

- [ ] 1. Adresse officielle du siège : 197 chemin de Péret ou route de Lissortes, à Saint-Affrique ?
- [ ] 2. Capital social, ville du RCS et numéro de TVA intracommunautaire
- [ ] 3. Grilles de départ : prix du sol (0,25 € ou plus), et prix « OLD moyenne » de 1 325 €, proposé à mi-chemin de la fourchette
- [ ] 4. Choix entre la grille Grandes centrales et la grille Petites surfaces : à la main, ou automatique sous un seuil de surface ?
- [ ] 5. Déplacement : forfait, prix au km depuis Saint-Affrique, ou inclus dans le prix au m² ?
- [ ] 6. Montant minimum d'un devis de nettoyage (moins de 100 m²)
- [ ] 7. Conditions de paiement (à réception, 30 jours, 45 jours fin de mois ?) et acompte éventuel
- [ ] 8. Nacelle et fourniture d'eau : incluses ou facturées en option, et à quel prix ?
- [ ] 9. Heures productives par jour et rendement du débroussaillage en ha par jour
- [ ] 10. Logo officiel en fichier (PNG ou SVG), sinon le mot-symbole des books

## 8. Méthode de travail avec Claude Code

Contraintes :
- Vite + React + TypeScript, sans serveur ni compte. Données dans le navigateur (localStorage), avec export et import d'une sauvegarde JSON.
- Interface entièrement en français, montants au format 1 234,56 €, dates au format JJ/MM/AAAA.
- Utilisable sur iPad : mise en page tactile, application installable et utilisable hors connexion.
- Tous les calculs dans des fonctions pures (dossier `src/calcul/`), indépendantes de l'interface et couvertes par des tests Vitest. Les exemples A, B, C et D de la section 4 doivent être des tests qui passent.
- Montants calculés en centimes entiers pour éviter les erreurs d'arrondi.
- PDF généré dans le navigateur avec jsPDF et jspdf-autotable, conforme à la section 6.
- Chaque valeur « à définir » de la section 7 devient un paramètre modifiable dans l'écran Paramètres, avec une valeur provisoire clairement signalée.

Étapes :
1. Plan (arborescence, modèle de données, découpage), validé avant d'écrire du code.
2. Moteur de calcul et ses tests.
3. Écran Paramètres (entreprise, grilles, TVA, numérotation, rendements) et écran Clients.
4. Écran Devis avec le récapitulatif et l'estimation interne, puis la liste des devis.
5. PDF selon la section 6 et écran Aperçu, testé avec le cas A.
6. Application installable et utilisable hors connexion sur iPad, export et import de la sauvegarde.

Après chaque étape : tester dans le navigateur, décrire ce qui ne va pas, puis faire un commit.

## Sources

- Tarifs, rendements du matériel, paniers et organisation : repères internes d'ACG NET SPE pour 2025-2027, à confirmer (section 7).
- Service-Public.fr – Documents commerciaux d'une société : mentions de société, pénalités de retard et indemnité forfaitaire de 40 €.
