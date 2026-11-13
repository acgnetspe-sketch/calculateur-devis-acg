import type { Centimes, LignePrestation } from '../modele/types';
import { arrondir } from './argent';
import { haVersM2 } from './surface';

export interface ReglesMinimum {
  /** Montant minimum d'une ligne de nettoyage sous le seuil (0 = aucun). */
  montantMinimumNettoyage: Centimes;
  /** Seuil en m² sous lequel le minimum s'applique (100 m²). */
  seuilMinimumM2: number;
}

export interface ResultatLigne {
  total: Centimes;
  /** Vrai si le montant minimum a remplacé le calcul. */
  minimumApplique: boolean;
}

/** Surface d'une ligne en m² (convertit les ha), null si l'unité n'est pas une surface. */
export function surfaceLigneM2(ligne: Pick<LignePrestation, 'quantite' | 'unite'>): number | null {
  if (ligne.unite === 'm2') return ligne.quantite;
  if (ligne.unite === 'ha') return haVersM2(ligne.quantite);
  return null;
}

/**
 * Total d'une ligne = quantité × prix unitaire × passages, arrondi au centime.
 * Pour un nettoyage de moins de 100 m², le montant minimum s'applique s'il est défini.
 */
export function totalLigne(
  ligne: Pick<LignePrestation, 'type' | 'quantite' | 'unite' | 'passages' | 'prixUnitaire'>,
  regles?: ReglesMinimum,
): ResultatLigne {
  const passages = ligne.passages > 0 ? ligne.passages : 1;
  const brut = arrondir(ligne.quantite * ligne.prixUnitaire * passages);

  const surface = surfaceLigneM2(ligne);
  if (
    regles &&
    regles.montantMinimumNettoyage > 0 &&
    ligne.type === 'nettoyage' &&
    surface !== null &&
    surface > 0 &&
    surface < regles.seuilMinimumM2 &&
    brut < regles.montantMinimumNettoyage
  ) {
    return { total: regles.montantMinimumNettoyage, minimumApplique: true };
  }
  return { total: brut, minimumApplique: false };
}
