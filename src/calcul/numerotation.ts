/** Numérotation des devis : DEV-2026-001, incrément automatique, reprise à 001 chaque année. */

export function formatNumero(prefixe: string, annee: number, rang: number): string {
  return `${prefixe}-${annee}-${String(rang).padStart(3, '0')}`;
}

/** Rang d'un numéro pour une année donnée (null s'il ne correspond pas). */
export function rangNumero(numero: string, prefixe: string, annee: number): number | null {
  const m = new RegExp(`^${prefixe}-${annee}-(\\d+)$`).exec(numero);
  return m ? Number(m[1]) : null;
}

/**
 * Prochain numéro de l'année : après le plus grand entre le compteur enregistré
 * et les numéros déjà utilisés (un numéro n'est jamais réattribué).
 */
export function prochainNumero(
  prefixe: string,
  annee: number,
  dernierCompteur: number,
  numerosExistants: string[],
): { numero: string; rang: number } {
  let max = dernierCompteur;
  for (const n of numerosExistants) {
    const r = rangNumero(n, prefixe, annee);
    if (r !== null && r > max) max = r;
  }
  const rang = max + 1;
  return { numero: formatNumero(prefixe, annee, rang), rang };
}
