import { normaliser, type Etat } from './stockage';

export const APPLICATION = 'calculateur-devis-acg';

/** Contenu du fichier de sauvegarde (JSON lisible). */
export interface FichierSauvegarde {
  application: typeof APPLICATION;
  version: 1;
  exporteLe: string;
  donnees: Etat;
}

export function creerSauvegarde(etat: Etat, maintenant: Date = new Date()): string {
  const { derniereSauvegarde: _ignore, ...donnees } = etat;
  void _ignore;
  const fichier: FichierSauvegarde = { application: APPLICATION, version: 1, exporteLe: maintenant.toISOString(), donnees: donnees as Etat };
  return JSON.stringify(fichier, null, 2);
}

/** Nom du fichier : sauvegarde-devis-acg-2026-11-13.json */
export function nomFichierSauvegarde(maintenant: Date = new Date()): string {
  const j = (n: number) => String(n).padStart(2, '0');
  return `sauvegarde-devis-acg-${maintenant.getFullYear()}-${j(maintenant.getMonth() + 1)}-${j(maintenant.getDate())}.json`;
}

export interface ResumeSauvegarde {
  exporteLe: string | null;
  clients: number;
  devis: number;
  grilles: number;
}

export type LectureSauvegarde = { ok: true; etat: Etat; resume: ResumeSauvegarde } | { ok: false; erreur: string };

/** Lit un fichier de sauvegarde et vérifie qu'il vient bien de cette application. */
export function lireSauvegarde(texte: string): LectureSauvegarde {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return { ok: false, erreur: "Ce fichier n'est pas une sauvegarde lisible (format JSON attendu)." };
  }
  if (typeof brut !== 'object' || brut === null) return { ok: false, erreur: "Ce fichier n'est pas une sauvegarde du calculateur." };
  const f = brut as Partial<FichierSauvegarde>;
  if (f.application !== APPLICATION || typeof f.donnees !== 'object' || f.donnees === null) {
    return { ok: false, erreur: "Ce fichier n'est pas une sauvegarde du calculateur de devis ACG NET SPE." };
  }
  if (typeof f.version !== 'number' || f.version > 1) {
    return { ok: false, erreur: "Cette sauvegarde vient d'une version plus récente de l'application. Mettez l'application à jour puis réessayez." };
  }
  const d = f.donnees as unknown as Record<string, unknown>;
  if (!Array.isArray(d.devis) || !Array.isArray(d.clients) || !Array.isArray(d.grilles) || typeof d.parametres !== 'object') {
    return { ok: false, erreur: 'Cette sauvegarde est incomplète ou abîmée.' };
  }
  const etat = normaliser(f.donnees);
  return {
    ok: true,
    etat,
    resume: {
      exporteLe: typeof f.exporteLe === 'string' ? f.exporteLe : null,
      clients: etat.clients.length,
      devis: etat.devis.length,
      grilles: etat.grilles.length,
    },
  };
}
