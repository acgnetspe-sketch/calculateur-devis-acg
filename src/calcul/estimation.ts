import type { Centimes, LignePrestation, Rendements, Robot } from '../modele/types';
import { arrondir, arrondirSup } from './argent';
import { m2VersHa } from './surface';

/** Surfaces de travail d'un devis, passages compris. */
export function surfacesTravail(lignes: LignePrestation[]): {
  nettoyageM2: number;
  debroussaillageHa: number;
} {
  let nettoyageM2 = 0;
  let debroussaillageHa = 0;
  for (const l of lignes) {
    const passages = l.passages > 0 ? l.passages : 1;
    if (l.type === 'nettoyage') {
      if (l.unite === 'm2') nettoyageM2 += l.quantite * passages;
      else if (l.unite === 'ha') nettoyageM2 += l.quantite * 10_000 * passages;
    } else if (l.type === 'debroussaillage' || l.type === 'old') {
      if (l.unite === 'ha') debroussaillageHa += l.quantite * passages;
      else if (l.unite === 'm2') debroussaillageHa += m2VersHa(l.quantite) * passages;
    }
  }
  return { nettoyageM2, debroussaillageHa };
}

export interface EntreeEstimation {
  nettoyageM2: number;
  debroussaillageHa: number;
  totalHt: Centimes;
  robot: Robot;
  personnes: number;
  rendements: Rendements;
}

export interface Estimation {
  heuresNettoyage: number;
  joursNettoyage: number;
  /** Null si le rendement du débroussaillage n'est pas défini. */
  joursDebroussaillage: number | null;
  joursTotal: number;
  semaines: number;
  paniers: Centimes;
  /** Total HT ÷ jours, null s'il n'y a aucun jour. */
  prixMoyenParJour: Centimes | null;
  /** Vrai s'il y a du débroussaillage mais pas de rendement pour le chiffrer. */
  rendementDebroussaillageManquant: boolean;
}

/** Estimation interne (jamais imprimée) : durée, paniers, prix moyen par jour. */
export function estimer(e: EntreeEstimation): Estimation {
  const r = e.rendements;
  const rendementRobot = r.robots[e.robot];

  const heuresNettoyage = e.nettoyageM2 > 0 && rendementRobot > 0 ? e.nettoyageM2 / rendementRobot : 0;
  const joursNettoyage = heuresNettoyage > 0 && r.heuresParJour > 0 ? arrondirSup(heuresNettoyage / r.heuresParJour) : 0;

  let joursDebroussaillage: number | null = 0;
  let rendementDebroussaillageManquant = false;
  if (e.debroussaillageHa > 0) {
    if (r.haParJourDebroussaillage && r.haParJourDebroussaillage > 0) {
      joursDebroussaillage = arrondirSup(e.debroussaillageHa / r.haParJourDebroussaillage);
    } else {
      joursDebroussaillage = null;
      rendementDebroussaillageManquant = true;
    }
  }

  const joursTotal = joursNettoyage + (joursDebroussaillage ?? 0);
  const semaines = joursTotal > 0 && r.joursParSemaine > 0 ? arrondirSup(joursTotal / r.joursParSemaine) : 0;
  const paniers = joursTotal * e.personnes * r.panierParPersonne;
  const prixMoyenParJour = joursTotal > 0 ? arrondir(e.totalHt / joursTotal) : null;

  return {
    heuresNettoyage,
    joursNettoyage,
    joursDebroussaillage,
    joursTotal,
    semaines,
    paniers,
    prixMoyenParJour,
    rendementDebroussaillageManquant,
  };
}
