import type { Client, Devis, Statut } from '../modele/types';

/** Texte sans accents ni majuscules, pour la recherche. */
export function normaliserRecherche(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filtre les devis par client ou site (nom de centrale, commune, département) et par statut,
 * du plus récent au plus ancien numéro.
 */
export function filtrerDevis(devis: Devis[], clients: Client[], recherche: string, statut: Statut | ''): Devis[] {
  const r = normaliserRecherche(recherche);
  const nomClient = new Map(clients.map((c) => [c.id, c.raisonSociale]));
  return devis
    .filter((d) => !statut || d.statut === statut)
    .filter((d) => {
      if (!r) return true;
      const texte = [d.clientId ? nomClient.get(d.clientId) : '', d.site.nomCentrale, d.site.commune, d.site.departement, d.numero].join(' ');
      return normaliserRecherche(texte).includes(r);
    })
    .sort((a, b) => b.dateEmission.localeCompare(a.dateEmission) || b.numero.localeCompare(a.numero, 'fr', { numeric: true }));
}
