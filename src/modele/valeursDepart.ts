import type { Grille, Parametres } from './types';

/** Débroussaillage, OLD, élagage et options : communs aux deux grilles de départ. */
const communs = {
  debroussaillageHa: 95_000,
  oldHa: { facile: 125_000, moyenne: 132_500, difficile: 140_000 },
  elagage: { prix: 0, unite: 'jour' as const, provisoire: true },
  options: [
    { id: 'deplacement', libelle: 'Déplacement', unite: 'forfait' as const, prix: 0, provisoire: true },
    { id: 'nacelle', libelle: 'Location de nacelle', unite: 'jour' as const, prix: 0, provisoire: true },
    { id: 'eau', libelle: "Fourniture d'eau", unite: 'forfait' as const, prix: 0, provisoire: true },
  ],
};

export const GRILLE_GRANDES_CENTRALES: Grille = {
  id: 'grandes-centrales',
  nom: 'Grandes centrales',
  nettoyage: {
    mode: 'parInstallation',
    prix: { sol: 25, trackers: 30, ombriere: 40, toiture: 60 },
  },
  ...structuredClone(communs),
};

export const GRILLE_PETITES_SURFACES: Grille = {
  id: 'petites-surfaces',
  nom: 'Petites surfaces (barème de septembre 2026)',
  nettoyage: {
    mode: 'parTranches',
    tranches: [
      { min: 100, max: 600, prix: 90 },
      { min: 601, max: 1500, prix: 85 },
      { min: 1501, max: null, prix: 80 },
    ],
  },
  ...structuredClone(communs),
};

export const GRILLES_DEPART: Grille[] = [GRILLE_GRANDES_CENTRALES, GRILLE_PETITES_SURFACES];

export const PARAMETRES_DEPART: Parametres = {
  entreprise: {
    nom: 'ACG NET SPE',
    forme: 'SASU',
    capital: '[à compléter]',
    siege: '[adresse à confirmer], Saint-Affrique',
    siren: '910 204 262',
    siret: '',
    rcs: '[ville à compléter]',
    tva: '[à compléter]',
    telephone: '',
    email: '',
    siteWeb: '',
  },
  tauxTva: 20,
  numerotation: { prefixe: 'DEV', compteurParAnnee: {} },
  validiteJours: 30,
  textes: {
    conditionsPaiement: '[À définir]',
    inclus: 'Rapport photo daté, matériel et personnel habilité.',
    nonInclus: "Accès au site, point d'eau.",
    penalites:
      "En cas de retard de paiement, pénalités au taux d'intérêt appliqué par la BCE à son opération de refinancement la plus récente majoré de 10 points, et indemnité forfaitaire de 40 € pour frais de recouvrement.",
  },
  rendements: {
    robots: { L1: 2000, F1: 1300 },
    heuresParJour: 7,
    haParJourDebroussaillage: null,
    joursParSemaine: 4,
    panierParPersonne: 3000,
    personnesParDefaut: 2,
  },
  montantMinimumNettoyage: 0,
  seuilMinimumM2: 100,
  grilleParDefautId: 'grandes-centrales',
  provisoires: [
    'entreprise.siege',
    'entreprise.capital',
    'entreprise.rcs',
    'entreprise.tva',
    'grilles',
    'textes.conditionsPaiement',
    'montantMinimumNettoyage',
    'rendements.heuresParJour',
    'rendements.haParJourDebroussaillage',
  ],
};
