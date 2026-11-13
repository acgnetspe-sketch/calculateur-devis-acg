/** Dates manipulées au format AAAA-MM-JJ, sans fuseau horaire. */

function lire(iso: string): Date {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j));
}

function ecrire(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** « 2026-11-13 » → « 13/11/2026 ». */
export function formatDate(iso: string): string {
  const [a, m, j] = iso.split('-');
  return `${j}/${m}/${a}`;
}

/** Date du jour (heure locale) au format AAAA-MM-JJ. */
export function aujourdhui(maintenant: Date = new Date()): string {
  const a = maintenant.getFullYear();
  const m = String(maintenant.getMonth() + 1).padStart(2, '0');
  const j = String(maintenant.getDate()).padStart(2, '0');
  return `${a}-${m}-${j}`;
}

export function ajouterJours(iso: string, jours: number): string {
  const d = lire(iso);
  d.setUTCDate(d.getUTCDate() + jours);
  return ecrire(d);
}

/** Date de fin de validité d'un devis. */
export function finValidite(dateEmission: string, validiteJours: number): string {
  return ajouterJours(dateEmission, validiteJours);
}

export function annee(iso: string): number {
  return Number(iso.slice(0, 4));
}
