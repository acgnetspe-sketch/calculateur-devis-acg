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

export const LIBELLES_UNITE: Record<Unite, string> = {
  m2: 'm²',
  ha: 'ha',
  forfait: 'forfait',
  jour: 'jour',
  km: 'km',
  unite: 'unité',
};

/**
 * Contrôle d'un barème par tranches : renvoie la liste des problèmes
 * (vide si le barème est cohérent). Les surfaces sont en m² entiers :
 * après une tranche « jusqu'à 600 », la suivante doit commencer à 601.
 */
export function verifierTranches(tranches: Tranche[]): string[] {
  const problemes: string[] = [];
  if (tranches.length === 0) return ['Le barème doit contenir au moins une tranche.'];
  const triees = [...tranches].sort((a, b) => a.min - b.min);
  triees.forEach((t, i) => {
    const n = i + 1;
    if (t.min < 0) problemes.push(`Tranche ${n} : le minimum ne peut pas être négatif.`);
    if (t.max !== null && t.max < t.min) problemes.push(`Tranche ${n} : le maximum est plus petit que le minimum.`);
    if (t.prix <= 0) problemes.push(`Tranche ${n} : le prix doit être supérieur à 0.`);
    const suivante = triees[i + 1];
    if (suivante) {
      if (t.max === null) {
        problemes.push(`Tranche ${n} : seule la dernière tranche peut être sans limite.`);
      } else if (suivante.min <= t.max) {
        problemes.push(`Tranches ${n} et ${n + 1} : elles se chevauchent.`);
      } else if (suivante.min > t.max + 1) {
        problemes.push(`Tranches ${n} et ${n + 1} : les surfaces de ${t.max + 1} à ${suivante.min - 1} m² ne sont couvertes par aucune tranche.`);
      }
    }
  });
  const derniere = triees[triees.length - 1];
  if (derniere.max !== null) problemes.push(`Dernière tranche : au-delà de ${derniere.max} m², le prix de cette tranche s'applique (laisser le maximum vide pour « sans limite »).`);
  return problemes;
}
