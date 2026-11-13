import type { Devis, Parametres } from '../modele/types';
import { estimer, surfacesTravail, type Estimation } from './estimation';
import { totalLigne, type ResultatLigne } from './ligne';
import { calculerTotaux, type Totaux } from './totaux';

export interface ResultatDevis {
  lignes: (ResultatLigne & { id: string })[];
  totaux: Totaux;
  estimation: Estimation;
}

/** Calcul complet d'un devis : lignes, totaux, estimation interne. */
export function calculerDevis(
  devis: Pick<Devis, 'lignes' | 'remise' | 'estimation'>,
  parametres: Pick<Parametres, 'tauxTva' | 'rendements' | 'montantMinimumNettoyage' | 'seuilMinimumM2'>,
): ResultatDevis {
  const regles = {
    montantMinimumNettoyage: parametres.montantMinimumNettoyage,
    seuilMinimumM2: parametres.seuilMinimumM2,
  };
  const lignes = devis.lignes.map((l) => ({ id: l.id, ...totalLigne(l, regles) }));
  const totaux = calculerTotaux(
    lignes.map((l) => l.total),
    devis.remise,
    parametres.tauxTva,
  );
  const surfaces = surfacesTravail(devis.lignes);
  const estimation = estimer({
    ...surfaces,
    totalHt: totaux.totalHt,
    robot: devis.estimation.robot,
    personnes: devis.estimation.personnes,
    rendements: parametres.rendements,
  });
  return { lignes, totaux, estimation };
}
