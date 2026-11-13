/**
 * Modèle de données du calculateur de devis.
 * Tous les montants sont en centimes entiers (0,25 € = 25).
 */

export type Centimes = number;

export type TypeInstallation = 'sol' | 'trackers' | 'ombriere' | 'toiture';
export type TypeLigne = 'nettoyage' | 'debroussaillage' | 'old' | 'elagage' | 'option' | 'libre';
export type Unite = 'm2' | 'ha' | 'forfait' | 'jour' | 'km' | 'unite';
export type Difficulte = 'facile' | 'moyenne' | 'difficile';
export type Statut = 'brouillon' | 'envoye' | 'accepte' | 'refuse';
export type PointEau = 'oui' | 'non' | 'a_verifier';
export type Robot = 'L1' | 'F1';

/** Tranche d'un barème dégressif, bornes en m² (max = null : sans limite). */
export interface Tranche {
  min: number;
  max: number | null;
  prix: Centimes;
}

export interface OptionGrille {
  id: string;
  libelle: string;
  unite: Unite;
  prix: Centimes;
  /** Prix pas encore confirmé (section 7 du cahier des charges). */
  provisoire: boolean;
}

export type TarifNettoyage =
  | { mode: 'parInstallation'; prix: Record<TypeInstallation, Centimes> }
  | { mode: 'parTranches'; tranches: Tranche[] };

export interface Grille {
  id: string;
  nom: string;
  nettoyage: TarifNettoyage;
  debroussaillageHa: Centimes;
  oldHa: Record<Difficulte, Centimes>;
  elagage: { prix: Centimes; unite: Unite; provisoire: boolean };
  options: OptionGrille[];
}

export interface Client {
  id: string;
  raisonSociale: string;
  contactNom?: string;
  contactFonction?: string;
  adresseFacturation: string;
  email?: string;
  telephone?: string;
  siret?: string;
  grilleParDefautId?: string;
}

export interface Site {
  nomCentrale: string;
  commune: string;
  departement: string;
  typeInstallation: TypeInstallation | null;
  acces?: string;
  pointEau?: PointEau;
  hauteurToiture?: number;
  inclinaison?: number;
  encrassement?: number;
}

export interface LignePrestation {
  id: string;
  type: TypeLigne;
  designation: string;
  /** Ligne grise sous la désignation dans le PDF (méthode, matériel, passages). */
  detail: string;
  quantite: number;
  unite: Unite;
  passages: number;
  difficulte?: Difficulte;
  optionId?: string;
  aideSurface?: { nbModules: number; surfaceModule: number };
  prixUnitaire: Centimes;
  /** Vrai si le prix a été changé à la main (icône + bouton « revenir à la grille »). */
  prixModifie: boolean;
}

export interface Remise {
  type: 'pourcent' | 'montant';
  /** Pourcentage (ex. 5) ou montant en centimes. */
  valeur: number;
}

export interface Devis {
  id: string;
  numero: string;
  statut: Statut;
  /** Date au format AAAA-MM-JJ (affichée JJ/MM/AAAA). */
  dateEmission: string;
  validiteJours: number;
  clientId: string | null;
  site: Site;
  grilleId: string;
  lignes: LignePrestation[];
  remise: Remise;
  conditionsPaiement: string;
  periodeIntervention: string;
  notesClient: string;
  notesInternes: string;
  estimation: { robot: Robot; personnes: number };
  creeLe: string;
  modifieLe: string;
}

export interface Rendements {
  /** m² nettoyés par heure, par robot. */
  robots: Record<Robot, number>;
  heuresParJour: number;
  /** ha débroussaillés par jour ; null tant que la valeur n'est pas définie. */
  haParJourDebroussaillage: number | null;
  joursParSemaine: number;
  panierParPersonne: Centimes;
  personnesParDefaut: number;
}

export interface Entreprise {
  nom: string;
  forme: string;
  capital: string;
  siege: string;
  siren: string;
  siret: string;
  rcs: string;
  tva: string;
  telephone: string;
  email: string;
  siteWeb: string;
  logo?: string;
}

export interface Parametres {
  entreprise: Entreprise;
  tauxTva: number;
  numerotation: { prefixe: string; compteurParAnnee: Record<number, number> };
  validiteJours: number;
  textes: {
    conditionsPaiement: string;
    inclus: string;
    nonInclus: string;
    penalites: string;
  };
  rendements: Rendements;
  /** Montant minimum d'une ligne de nettoyage de moins de 100 m² (0 = pas de minimum). */
  montantMinimumNettoyage: Centimes;
  seuilMinimumM2: number;
  grilleParDefautId: string;
  /** Noms des paramètres dont la valeur est provisoire (à confirmer). */
  provisoires: string[];
}
