import type {
  Centimes,
  Difficulte,
  Grille,
  Tranche,
  TypeInstallation,
  TypeLigne,
  Unite,
} from '../modele/types';

export const LIBELLES_INSTALLATION: Record<TypeInstallation, string> = {
  sol: 'sol fixe',
  trackers: 'trackers',
  ombriere: 'ombrière',
  toiture: 'toiture',
};

export const LIBELLES_DIFFICULTE: Record<Difficulte, string> = {
  facile: 'facile',
  moyenne: 'moyenne',
  difficile: 'difficile',
};

/**
 * Tranche applicable à une surface (barème dégressif) : la dernière tranche
 * dont le minimum est atteint. Sous le premier minimum, la première tranche.
 * Le prix de la tranche s'applique à toute la surface.
 */
export function trancheApplicable(tranches: Tranche[], surfaceM2: number): Tranche | null {
  if (tranches.length === 0) return null;
  const triees = [...tranches].sort((a, b) => a.min - b.min);
  let choisie = triees[0];
  for (const t of triees) {
    if (surfaceM2 >= t.min) choisie = t;
  }
  return choisie;
}

/** Prix du nettoyage au m² selon la grille. Null si le type d'installation manque. */
export function prixNettoyage(
  grille: Grille,
  typeInstallation: TypeInstallation | null,
  surfaceM2: number,
): Centimes | null {
  const tarif = grille.nettoyage;
  if (tarif.mode === 'parTranches') {
    return trancheApplicable(tarif.tranches, surfaceM2)?.prix ?? null;
  }
  if (!typeInstallation) return null;
  return tarif.prix[typeInstallation];
}

export interface ContextePrix {
  typeInstallation: TypeInstallation | null;
  /** Surface de la ligne en m² (pour le barème dégressif). */
  surfaceM2?: number;
  difficulte?: Difficulte;
  optionId?: string;
}

/**
 * Prix unitaire proposé par la grille pour un type de ligne.
 * Null quand la grille ne peut rien proposer (ligne libre, information manquante).
 */
export function prixPropose(grille: Grille, type: TypeLigne, ctx: ContextePrix): Centimes | null {
  switch (type) {
    case 'nettoyage':
      return prixNettoyage(grille, ctx.typeInstallation, ctx.surfaceM2 ?? 0);
    case 'debroussaillage':
      return grille.debroussaillageHa;
    case 'old':
      return grille.oldHa[ctx.difficulte ?? 'facile'];
    case 'elagage':
      return grille.elagage.prix;
    case 'option':
      return grille.options.find((o) => o.id === ctx.optionId)?.prix ?? null;
    case 'libre':
      return null;
  }
}

/** Désignation et unité proposées à l'ajout d'une ligne. */
export function ligneParDefaut(
  grille: Grille,
  type: TypeLigne,
  ctx: ContextePrix,
): { designation: string; unite: Unite } {
  switch (type) {
    case 'nettoyage': {
      const inst = ctx.typeInstallation ? ` – ${LIBELLES_INSTALLATION[ctx.typeInstallation]}` : '';
      return { designation: `Nettoyage des modules photovoltaïques${inst}`, unite: 'm2' };
    }
    case 'debroussaillage':
      return { designation: 'Débroussaillage intérieur de la centrale', unite: 'ha' };
    case 'old': {
      const diff = LIBELLES_DIFFICULTE[ctx.difficulte ?? 'facile'];
      return {
        designation: `Obligations légales de débroussaillement (OLD) – difficulté ${diff}`,
        unite: 'ha',
      };
    }
    case 'elagage':
      return { designation: 'Élagage', unite: grille.elagage.unite };
    case 'option': {
      const opt = grille.options.find((o) => o.id === ctx.optionId);
      return { designation: opt?.libelle ?? 'Option', unite: opt?.unite ?? 'forfait' };
    }
    case 'libre':
      return { designation: '', unite: 'unite' };
  }
}
