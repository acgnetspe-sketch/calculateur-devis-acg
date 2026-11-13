import type { Centimes } from '../modele/types';

const ESPACE_INSECABLE = ' ';

/**
 * Arrondi commercial au nombre entier le plus proche (0,5 → au-dessus).
 * Le passage par 6 décimales efface les petites erreurs des nombres à virgule
 * (ex. 1,005 stocké 1,00499999…).
 */
export function arrondir(valeur: number): number {
  const signe = valeur < 0 ? -1 : 1;
  const propre = Number(Math.abs(valeur).toFixed(6));
  return signe * Math.floor(propre + 0.5);
}

/** Arrondi à l'entier supérieur, insensible aux petites erreurs de virgule. */
export function arrondirSup(valeur: number): number {
  return Math.ceil(Number(valeur.toFixed(6)));
}

/** Pourcentage d'un montant, arrondi au centime. */
export function pourcentage(montant: Centimes, taux: number): Centimes {
  return arrondir((montant * taux) / 100);
}

/** Convertit des euros (nombre) en centimes. */
export function eurosEnCentimes(euros: number): Centimes {
  return arrondir(euros * 100);
}

function grouperMilliers(entier: string): string {
  return entier.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_INSECABLE);
}

/** Format « 1 234,56 € » (espaces insécables). */
export function formatEuros(montant: Centimes): string {
  const negatif = montant < 0;
  const abs = Math.abs(Math.round(montant));
  const euros = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, '0');
  return `${negatif ? '-' : ''}${grouperMilliers(String(euros))},${cents}${ESPACE_INSECABLE}€`;
}

/** Format d'un nombre à la française : « 52 763 », « 12,5 ». */
export function formatNombre(valeur: number, decimalesMax = 2): string {
  const negatif = valeur < 0;
  const [entier, decimales] = Math.abs(valeur).toFixed(decimalesMax).split('.');
  const dec = (decimales ?? '').replace(/0+$/, '');
  return `${negatif ? '-' : ''}${grouperMilliers(entier)}${dec ? ',' + dec : ''}`;
}

/**
 * Lit un nombre saisi à la française (« 1 234,56 », « 0.25 »).
 * Renvoie null si la saisie n'est pas un nombre.
 */
export function lireNombre(saisie: string): number | null {
  const propre = saisie.replace(/[\s  €]/g, '').replace(',', '.');
  if (propre === '' || !/^-?\d*\.?\d+$/.test(propre)) return null;
  return Number(propre);
}

/** Lit un montant saisi en euros et le renvoie en centimes. */
export function lireMontant(saisie: string): Centimes | null {
  const n = lireNombre(saisie);
  return n === null ? null : eurosEnCentimes(n);
}
