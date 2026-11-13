import type { Centimes, Remise } from '../modele/types';
import { pourcentage } from './argent';

export interface Totaux {
  totalHt: Centimes;
  remise: Centimes;
  totalHtNet: Centimes;
  tva: Centimes;
  ttc: Centimes;
}

/** Montant de la remise, arrondi au centime et jamais supérieur au total HT. */
export function montantRemise(totalHt: Centimes, remise: Remise): Centimes {
  const brut = remise.type === 'pourcent' ? pourcentage(totalHt, remise.valeur) : Math.round(remise.valeur);
  return Math.min(Math.max(brut, 0), Math.max(totalHt, 0));
}

/**
 * Totaux du devis à partir des totaux de lignes (déjà arrondis au centime) :
 * HT = somme des lignes ; HT net = HT − remise ; TVA = taux × HT net arrondi ; TTC = HT net + TVA.
 */
export function calculerTotaux(
  totauxLignes: Centimes[],
  remise: Remise,
  tauxTva: number,
): Totaux {
  const totalHt = totauxLignes.reduce((s, t) => s + t, 0);
  const r = montantRemise(totalHt, remise);
  const totalHtNet = totalHt - r;
  const tva = pourcentage(totalHtNet, tauxTva);
  return { totalHt, remise: r, totalHtNet, tva, ttc: totalHtNet + tva };
}
