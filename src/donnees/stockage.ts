import type { Client, Devis, Grille, Parametres } from '../modele/types';
import { prochainNumero } from '../calcul/numerotation';
import { GRILLES_DEPART, PARAMETRES_DEPART } from '../modele/valeursDepart';

/** Toutes les données de l'application, enregistrées dans le navigateur. */
export interface Etat {
  version: 1;
  parametres: Parametres;
  grilles: Grille[];
  clients: Client[];
  devis: Devis[];
  /** Date (ISO) du dernier export de la sauvegarde. */
  derniereSauvegarde?: string;
}

export const CLE_STOCKAGE = 'acg-net-spe-devis';

export function etatInitial(): Etat {
  return {
    version: 1,
    parametres: structuredClone(PARAMETRES_DEPART),
    grilles: structuredClone(GRILLES_DEPART),
    clients: [],
    devis: [],
  };
}

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Complète des données enregistrées avec les valeurs de départ :
 * un paramètre ajouté dans une nouvelle version de l'application reçoit sa valeur de départ,
 * les valeurs déjà enregistrées sont conservées.
 */
export function completer<T>(depart: T, enregistre: unknown): T {
  if (enregistre === undefined) return structuredClone(depart);
  if (estObjet(depart) && estObjet(enregistre)) {
    const resultat: Record<string, unknown> = { ...enregistre };
    for (const [cle, valeur] of Object.entries(depart)) {
      resultat[cle] = completer(valeur, enregistre[cle]);
    }
    return resultat as T;
  }
  return enregistre as T;
}

/** Remet en forme des données lues (navigateur ou fichier) ; données illisibles → valeurs de départ. */
export function normaliser(brut: unknown): Etat {
  const initial = etatInitial();
  if (!estObjet(brut)) return initial;
  const grilles = Array.isArray(brut.grilles) && brut.grilles.length > 0 ? (brut.grilles as Grille[]) : initial.grilles;
  const parametres = completer(initial.parametres, brut.parametres);
  if (!grilles.some((g) => g.id === parametres.grilleParDefautId)) {
    parametres.grilleParDefautId = grilles[0].id;
  }
  return {
    version: 1,
    parametres,
    grilles,
    clients: Array.isArray(brut.clients) ? (brut.clients as Client[]) : [],
    devis: Array.isArray(brut.devis) ? (brut.devis as Devis[]) : [],
    ...(typeof brut.derniereSauvegarde === 'string' ? { derniereSauvegarde: brut.derniereSauvegarde } : {}),
  };
}

export function lireTexte(texte: string | null): Etat {
  if (!texte) return etatInitial();
  try {
    return normaliser(JSON.parse(texte));
  } catch {
    return etatInitial();
  }
}

/** Lecture depuis le stockage du navigateur (ou valeurs de départ). */
export function charger(stockage: Pick<Storage, 'getItem'> | undefined): Etat {
  try {
    return lireTexte(stockage?.getItem(CLE_STOCKAGE) ?? null);
  } catch {
    return etatInitial();
  }
}

/** Écriture dans le stockage du navigateur ; renvoie false si elle échoue (espace plein…). */
export function enregistrer(stockage: Pick<Storage, 'setItem'> | undefined, etat: Etat): boolean {
  try {
    stockage?.setItem(CLE_STOCKAGE, JSON.stringify(etat));
    return true;
  } catch {
    return false;
  }
}

/** Identifiant unique pour un client, une grille, un devis. */
export function nouvelId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ---------- Opérations sur les données (pures) ----------

export function enregistrerClient(etat: Etat, client: Client): Etat {
  const existe = etat.clients.some((c) => c.id === client.id);
  return {
    ...etat,
    clients: existe ? etat.clients.map((c) => (c.id === client.id ? client : c)) : [...etat.clients, client],
  };
}

export function supprimerClient(etat: Etat, id: string): Etat {
  return { ...etat, clients: etat.clients.filter((c) => c.id !== id) };
}

export function enregistrerGrille(etat: Etat, grille: Grille): Etat {
  const existe = etat.grilles.some((g) => g.id === grille.id);
  return {
    ...etat,
    grilles: existe ? etat.grilles.map((g) => (g.id === grille.id ? grille : g)) : [...etat.grilles, grille],
  };
}

/**
 * Supprime une grille (jamais la dernière). Les clients qui l'avaient par défaut n'ont plus de grille
 * par défaut ; si c'était la grille par défaut de l'application, la première grille restante la remplace.
 * Les devis existants gardent leurs prix déjà saisis.
 */
export function supprimerGrille(etat: Etat, id: string): Etat {
  if (etat.grilles.length <= 1) return etat;
  const grilles = etat.grilles.filter((g) => g.id !== id);
  const parametres =
    etat.parametres.grilleParDefautId === id ? { ...etat.parametres, grilleParDefautId: grilles[0].id } : etat.parametres;
  const clients = etat.clients.map((c) => (c.grilleParDefautId === id ? { ...c, grilleParDefautId: undefined } : c));
  return { ...etat, grilles, parametres, clients };
}

/** Copie d'une grille, sous un nouveau nom. */
export function dupliquerGrille(grille: Grille, nom: string): Grille {
  return { ...structuredClone(grille), id: nouvelId(), nom };
}

// ---------- Devis ----------

/**
 * Crée un devis brouillon avec le prochain numéro de l'année.
 * Le compteur est avancé tout de suite : un numéro n'est jamais redonné, même si le devis est supprimé.
 */
export function creerDevis(etat: Etat, dateIso: string, clientId: string | null = null): { etat: Etat; devis: Devis } {
  const p = etat.parametres;
  const an = Number(dateIso.slice(0, 4));
  const { numero, rang } = prochainNumero(
    p.numerotation.prefixe,
    an,
    p.numerotation.compteurParAnnee[an] ?? 0,
    etat.devis.map((d) => d.numero),
  );
  const client = etat.clients.find((c) => c.id === clientId);
  const grilleId =
    client?.grilleParDefautId && etat.grilles.some((g) => g.id === client.grilleParDefautId) ? client.grilleParDefautId : p.grilleParDefautId;
  const maintenant = new Date().toISOString();
  const devis: Devis = {
    id: nouvelId(),
    numero,
    statut: 'brouillon',
    dateEmission: dateIso,
    validiteJours: p.validiteJours,
    clientId: client ? client.id : null,
    site: { nomCentrale: '', commune: '', departement: '', typeInstallation: null },
    grilleId,
    lignes: [],
    remise: { type: 'pourcent', valeur: 0 },
    conditionsPaiement: p.textes.conditionsPaiement,
    periodeIntervention: '',
    notesClient: '',
    notesInternes: '',
    estimation: { robot: 'L1', personnes: p.rendements.personnesParDefaut },
    creeLe: maintenant,
    modifieLe: maintenant,
  };
  return {
    devis,
    etat: {
      ...etat,
      devis: [...etat.devis, devis],
      parametres: {
        ...p,
        numerotation: { ...p.numerotation, compteurParAnnee: { ...p.numerotation.compteurParAnnee, [an]: rang } },
      },
    },
  };
}

/** Copie d'un devis : nouveau numéro, date du jour, statut brouillon ; client, site et lignes repris. */
export function dupliquerDevis(etat: Etat, id: string, dateIso: string): { etat: Etat; devis: Devis | null } {
  const source = etat.devis.find((d) => d.id === id);
  if (!source) return { etat, devis: null };
  const cree = creerDevis(etat, dateIso, source.clientId);
  const copie: Devis = {
    ...structuredClone(source),
    id: cree.devis.id,
    numero: cree.devis.numero,
    statut: 'brouillon',
    dateEmission: dateIso,
    creeLe: cree.devis.creeLe,
    modifieLe: cree.devis.modifieLe,
    lignes: source.lignes.map((l) => ({ ...structuredClone(l), id: nouvelId() })),
  };
  return { devis: copie, etat: { ...cree.etat, devis: cree.etat.devis.map((d) => (d.id === copie.id ? copie : d)) } };
}

export function enregistrerDevis(etat: Etat, devis: Devis): Etat {
  const d = { ...devis, modifieLe: new Date().toISOString() };
  return { ...etat, devis: etat.devis.map((x) => (x.id === d.id ? d : x)) };
}

export function supprimerDevis(etat: Etat, id: string): Etat {
  return { ...etat, devis: etat.devis.filter((d) => d.id !== id) };
}
