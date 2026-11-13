import { describe, expect, it } from 'vitest';
import { verifierTranches } from '../calcul/grille';
import { GRILLE_PETITES_SURFACES } from '../modele/valeursDepart';
import {
  CLE_STOCKAGE,
  charger,
  dupliquerGrille,
  enregistrer,
  enregistrerClient,
  enregistrerGrille,
  etatInitial,
  lireTexte,
  normaliser,
  supprimerClient,
  supprimerGrille,
} from './stockage';

function faux(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size;
    },
  };
}

describe('lecture et écriture dans le navigateur', () => {
  it('premier lancement : valeurs de départ', () => {
    const e = charger(faux());
    expect(e.grilles.map((g) => g.id)).toEqual(['grandes-centrales', 'petites-surfaces']);
    expect(e.parametres.tauxTva).toBe(20);
    expect(e.clients).toEqual([]);
  });

  it('ce qui est enregistré est relu à l’identique', () => {
    const s = faux();
    let e = etatInitial();
    e = enregistrerClient(e, { id: 'c1', raisonSociale: 'SPV Soleil', adresseFacturation: '1 rue X\n12400 Saint-Affrique' });
    e = { ...e, parametres: { ...e.parametres, tauxTva: 10 } };
    expect(enregistrer(s, e)).toBe(true);
    expect(charger(s)).toEqual(e);
  });

  it('données abîmées ou illisibles : valeurs de départ, sans plantage', () => {
    expect(lireTexte('{pas du json')).toEqual(etatInitial());
    expect(normaliser(42)).toEqual(etatInitial());
    expect(charger({ getItem: () => { throw new Error('bloqué'); } })).toEqual(etatInitial());
  });

  it('un paramètre ajouté dans une nouvelle version reçoit sa valeur de départ, les autres sont gardés', () => {
    const ancien = etatInitial() as unknown as { parametres: Record<string, unknown> };
    delete ancien.parametres.seuilMinimumM2;
    (ancien.parametres.entreprise as Record<string, unknown>).capital = '1 000';
    const e = lireTexte(JSON.stringify(ancien));
    expect(e.parametres.seuilMinimumM2).toBe(100);
    expect(e.parametres.entreprise.capital).toBe('1 000');
  });

  it('échec d’écriture (stockage plein) signalé', () => {
    expect(enregistrer({ setItem: () => { throw new Error('plein'); } }, etatInitial())).toBe(false);
  });

  it('utilise une clé dédiée', () => {
    const s = faux();
    enregistrer(s, etatInitial());
    expect(s.getItem(CLE_STOCKAGE)).not.toBeNull();
  });
});

describe('clients', () => {
  it('ajoute, modifie, supprime', () => {
    let e = etatInitial();
    e = enregistrerClient(e, { id: 'c1', raisonSociale: 'A', adresseFacturation: '' });
    e = enregistrerClient(e, { id: 'c1', raisonSociale: 'B', adresseFacturation: '' });
    expect(e.clients).toHaveLength(1);
    expect(e.clients[0].raisonSociale).toBe('B');
    expect(supprimerClient(e, 'c1').clients).toEqual([]);
  });
});

describe('grilles', () => {
  it('duplique une grille sous un nouveau nom, sans lien avec l’originale', () => {
    const e0 = etatInitial();
    const copie = dupliquerGrille(e0.grilles[0], 'Client X');
    expect(copie.id).not.toBe(e0.grilles[0].id);
    copie.debroussaillageHa = 1;
    expect(e0.grilles[0].debroussaillageHa).toBe(95_000);
    expect(enregistrerGrille(e0, copie).grilles).toHaveLength(3);
  });

  it('supprimer la grille par défaut : la suivante prend le relais, les clients sont détachés', () => {
    let e = etatInitial();
    e = enregistrerClient(e, { id: 'c1', raisonSociale: 'A', adresseFacturation: '', grilleParDefautId: 'grandes-centrales' });
    e = supprimerGrille(e, 'grandes-centrales');
    expect(e.grilles.map((g) => g.id)).toEqual(['petites-surfaces']);
    expect(e.parametres.grilleParDefautId).toBe('petites-surfaces');
    expect(e.clients[0].grilleParDefautId).toBeUndefined();
  });

  it('la dernière grille ne peut pas être supprimée', () => {
    const e = supprimerGrille(supprimerGrille(etatInitial(), 'grandes-centrales'), 'petites-surfaces');
    expect(e.grilles).toHaveLength(1);
  });
});

describe('contrôle d’un barème par tranches', () => {
  const ok = GRILLE_PETITES_SURFACES.nettoyage.mode === 'parTranches' ? GRILLE_PETITES_SURFACES.nettoyage.tranches : [];
  it('le barème de septembre 2026 est cohérent', () => {
    expect(verifierTranches(ok)).toEqual([]);
  });
  it('détecte trou, chevauchement, prix nul, limite manquante', () => {
    expect(verifierTranches([{ min: 100, max: 600, prix: 90 }, { min: 700, max: null, prix: 80 }])[0]).toMatch(/601 à 699/);
    expect(verifierTranches([{ min: 100, max: 600, prix: 90 }, { min: 500, max: null, prix: 80 }])[0]).toMatch(/chevauchent/);
    expect(verifierTranches([{ min: 100, max: null, prix: 0 }])[0]).toMatch(/prix/);
    expect(verifierTranches([{ min: 100, max: 600, prix: 90 }])[0]).toMatch(/sans limite/);
    expect(verifierTranches([])).toHaveLength(1);
  });
});
