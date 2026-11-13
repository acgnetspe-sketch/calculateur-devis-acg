import type { Difficulte, Grille, LignePrestation, Site, TypeInstallation, TypeLigne } from '../modele/types';
import { ligneParDefaut, prixPropose, type ContextePrix } from './grille';
import { surfaceLigneM2 } from './ligne';

export const LIBELLES_TYPE_LIGNE: Record<TypeLigne, string> = {
  nettoyage: 'Nettoyage',
  debroussaillage: 'Débroussaillage intérieur',
  old: 'OLD',
  elagage: 'Élagage',
  option: 'Option',
  libre: 'Ligne libre',
};

function contexte(ligne: Pick<LignePrestation, 'quantite' | 'unite' | 'difficulte' | 'optionId'>, site: Site): ContextePrix {
  return {
    typeInstallation: site.typeInstallation,
    surfaceM2: surfaceLigneM2(ligne) ?? 0,
    difficulte: ligne.difficulte,
    optionId: ligne.optionId,
  };
}

/** Prix que la grille propose pour cette ligne (null si elle ne peut rien proposer). */
export function prixGrillePourLigne(ligne: LignePrestation, grille: Grille, site: Site) {
  return prixPropose(grille, ligne.type, contexte(ligne, site));
}

/** Nouvelle ligne pré-remplie depuis la grille. */
export function creerLigne(
  id: string,
  type: TypeLigne,
  grille: Grille,
  site: Site,
  choix: { optionId?: string; difficulte?: Difficulte } = {},
): LignePrestation {
  const base = {
    quantite: 0,
    difficulte: type === 'old' ? (choix.difficulte ?? 'facile') : undefined,
    optionId: type === 'option' ? choix.optionId : undefined,
  };
  const { designation, unite } = ligneParDefaut(grille, type, { ...contexte({ ...base, unite: 'm2' }, site) });
  const ligne: LignePrestation = {
    id,
    type,
    designation,
    detail: '',
    quantite: type === 'option' || type === 'libre' ? 1 : 0,
    unite,
    passages: 1,
    difficulte: base.difficulte,
    optionId: base.optionId,
    prixUnitaire: 0,
    prixModifie: false,
  };
  return { ...ligne, prixUnitaire: prixGrillePourLigne(ligne, grille, site) ?? 0 };
}

const INSTALLATIONS: (TypeInstallation | null)[] = [null, 'sol', 'trackers', 'ombriere', 'toiture'];
const DIFFICULTES: Difficulte[] = ['facile', 'moyenne', 'difficile'];

/** Toutes les désignations que l'application a pu proposer pour ce type de ligne. */
function designationsAutomatiques(ligne: LignePrestation, grilles: Grille[]): Set<string> {
  const s = new Set<string>();
  for (const g of grilles)
    for (const typeInstallation of INSTALLATIONS)
      for (const difficulte of DIFFICULTES)
        s.add(ligneParDefaut(g, ligne.type, { typeInstallation, difficulte, optionId: ligne.optionId }).designation);
  return s;
}

/**
 * Remet à jour les lignes après un changement (grille, type d'installation, quantité, difficulté) :
 * - le prix suit la grille, sauf s'il a été modifié à la main (règle 7) ;
 * - la désignation suit aussi, sauf si elle a été réécrite à la main.
 */
export function rafraichirLignes(lignes: LignePrestation[], grille: Grille, site: Site, grillesConnues: Grille[] = [grille]): LignePrestation[] {
  return lignes.map((l) => {
    let maj = l;
    if (l.type !== 'libre' && designationsAutomatiques(l, [grille, ...grillesConnues]).has(l.designation)) {
      const designation = ligneParDefaut(grille, l.type, contexte(l, site)).designation;
      if (designation !== l.designation) maj = { ...maj, designation };
    }
    if (!l.prixModifie) {
      const prix = prixGrillePourLigne(l, grille, site);
      if (prix !== null && prix !== l.prixUnitaire) maj = { ...maj, prixUnitaire: prix };
    }
    return maj;
  });
}

/** Règle 7 : bouton « revenir au prix de la grille ». */
export function revenirPrixGrille(ligne: LignePrestation, grille: Grille, site: Site): LignePrestation {
  const prix = prixGrillePourLigne(ligne, grille, site);
  return { ...ligne, prixUnitaire: prix ?? ligne.prixUnitaire, prixModifie: false };
}

/** Objet du devis, adapté selon les lignes. */
export function objetDevis(lignes: LignePrestation[], site: Site): string {
  const types = new Set(lignes.map((l) => l.type));
  const nettoyage = types.has('nettoyage');
  const debrou = types.has('debroussaillage') || types.has('old') || types.has('elagage');
  let prestation = 'Prestations';
  if (nettoyage && debrou) prestation = 'Nettoyage des modules photovoltaïques et débroussaillage';
  else if (nettoyage) prestation = 'Nettoyage des modules photovoltaïques';
  else if (debrou) prestation = 'Débroussaillage';
  const centrale = site.nomCentrale.trim() ? ` – Centrale de ${site.nomCentrale.trim()}` : '';
  const dep = site.departement.trim() ? ` (${site.departement.trim()})` : '';
  return `${prestation}${centrale}${centrale ? dep : ''}`;
}

/** Surface totale des lignes de nettoyage, en m² (affichée dans la zone Site du PDF). */
export function surfaceTotaleNettoyage(lignes: LignePrestation[]): number {
  return lignes.filter((l) => l.type === 'nettoyage').reduce((s, l) => s + (surfaceLigneM2(l) ?? 0), 0);
}
