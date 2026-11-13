import type { Client, LignePrestation, Site } from '../modele/types';

export const HAUTEUR_MAX_SANS_NACELLE = 15;
export const INCLINAISON_MAX_TRACKERS = 26;

/** Alertes d'information sur le site (n'empêchent pas le PDF). */
export function alertesSite(site: Site): string[] {
  const alertes: string[] = [];
  if (site.hauteurToiture !== undefined && site.hauteurToiture > HAUTEUR_MAX_SANS_NACELLE) {
    alertes.push('Nacelle de 20 m nécessaire (hauteur de toiture supérieure à 15 m)');
  }
  if (
    site.typeInstallation === 'trackers' &&
    site.inclinaison !== undefined &&
    site.inclinaison > INCLINAISON_MAX_TRACKERS
  ) {
    alertes.push('Inclinaison supérieure à 26° sur trackers : à valider');
  }
  return alertes;
}

const vide = (t: string | undefined | null) => !t || t.trim() === '';

/** SIRET valide : 14 chiffres (espaces tolérés). Un SIRET vide est accepté. */
export function siretValide(siret: string | undefined): boolean {
  if (vide(siret)) return true;
  return /^\d{14}$/.test(siret!.replace(/\s/g, ''));
}

/** Liste des champs obligatoires manquants : tant qu'elle n'est pas vide, le PDF est bloqué. */
export function champsManquants(
  client: Client | null,
  site: Site,
  lignes: LignePrestation[],
): string[] {
  const manquants: string[] = [];
  if (!client) {
    manquants.push('Client');
  } else {
    if (vide(client.raisonSociale)) manquants.push('Raison sociale du client');
    if (vide(client.adresseFacturation)) manquants.push('Adresse de facturation du client');
    if (!siretValide(client.siret)) manquants.push('SIRET du client (14 chiffres)');
  }
  if (vide(site.nomCentrale)) manquants.push('Nom de la centrale');
  if (vide(site.commune)) manquants.push('Commune du site');
  if (vide(site.departement)) manquants.push('Département du site');
  if (!site.typeInstallation) manquants.push("Type d'installation");
  if (lignes.length === 0) manquants.push('Au moins une prestation');
  return manquants;
}
