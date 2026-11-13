import { describe, expect, it } from 'vitest';
import type { Site } from '../modele/types';
import { GRILLE_GRANDES_CENTRALES as GC, GRILLE_PETITES_SURFACES as PS } from '../modele/valeursDepart';
import { creerDevis, dupliquerDevis, enregistrerClient, enregistrerDevis, etatInitial, supprimerDevis } from '../donnees/stockage';
import { filtrerDevis } from './listeDevis';
import { creerLigne, objetDevis, rafraichirLignes, revenirPrixGrille, surfaceTotaleNettoyage } from './prestations';

const site: Site = { nomCentrale: 'Les Cazes', commune: 'Saint-Affrique', departement: 'Aveyron', typeInstallation: 'sol' };

describe('création de lignes depuis le catalogue', () => {
  it('nettoyage : unité m², prix selon le type d’installation', () => {
    const l = creerLigne('1', 'nettoyage', GC, site);
    expect(l).toMatchObject({ unite: 'm2', prixUnitaire: 25, passages: 1, prixModifie: false });
    expect(l.designation).toBe('Nettoyage des modules photovoltaïques – sol fixe');
  });
  it('OLD : difficulté facile par défaut, prix à l’hectare', () => {
    expect(creerLigne('1', 'old', GC, site)).toMatchObject({ unite: 'ha', prixUnitaire: 125_000, difficulte: 'facile' });
    expect(creerLigne('1', 'old', GC, site, { difficulte: 'difficile' }).prixUnitaire).toBe(140_000);
  });
  it('option : reprend libellé, unité et prix de la grille, quantité 1', () => {
    expect(creerLigne('1', 'option', GC, site, { optionId: 'nacelle' })).toMatchObject({
      designation: 'Location de nacelle',
      unite: 'jour',
      quantite: 1,
      prixUnitaire: 0,
    });
  });
  it('ligne libre : vide', () => {
    expect(creerLigne('1', 'libre', GC, site)).toMatchObject({ designation: '', prixUnitaire: 0, quantite: 1 });
  });
});

describe('mise à jour des prix et désignations', () => {
  it('le prix suit le type d’installation', () => {
    const l = creerLigne('1', 'nettoyage', GC, site);
    const [maj] = rafraichirLignes([l], GC, { ...site, typeInstallation: 'toiture' });
    expect(maj.prixUnitaire).toBe(60);
    expect(maj.designation).toBe('Nettoyage des modules photovoltaïques – toiture');
  });
  it('barème dégressif : le prix suit la quantité', () => {
    const l = { ...creerLigne('1', 'nettoyage', PS, site), quantite: 1210 };
    expect(rafraichirLignes([l], PS, site)[0].prixUnitaire).toBe(85);
    expect(rafraichirLignes([{ ...l, quantite: 2000 }], PS, site)[0].prixUnitaire).toBe(80);
  });
  it('changer de grille met à jour les prix non modifiés', () => {
    const l = { ...creerLigne('1', 'nettoyage', GC, site), quantite: 500 };
    expect(rafraichirLignes([l], PS, site, [GC, PS])[0].prixUnitaire).toBe(90);
  });
  it('un prix modifié à la main est conservé (règle 7) et peut revenir à la grille', () => {
    const l = { ...creerLigne('1', 'nettoyage', GC, site), prixUnitaire: 27, prixModifie: true };
    const [maj] = rafraichirLignes([l], GC, { ...site, typeInstallation: 'toiture' });
    expect(maj.prixUnitaire).toBe(27);
    expect(revenirPrixGrille(maj, GC, { ...site, typeInstallation: 'toiture' })).toMatchObject({ prixUnitaire: 60, prixModifie: false });
  });
  it('une désignation réécrite à la main est conservée', () => {
    const l = { ...creerLigne('1', 'nettoyage', GC, site), designation: 'Lavage spécial' };
    expect(rafraichirLignes([l], GC, { ...site, typeInstallation: 'toiture' })[0].designation).toBe('Lavage spécial');
  });
  it('OLD : changer la difficulté change le prix et la désignation', () => {
    const l = { ...creerLigne('1', 'old', GC, site), difficulte: 'moyenne' as const };
    const [maj] = rafraichirLignes([l], GC, site);
    expect(maj.prixUnitaire).toBe(132_500);
    expect(maj.designation).toMatch(/difficulté moyenne/);
  });
});

describe('objet et surface du devis', () => {
  it('objet adapté selon les lignes', () => {
    const n = creerLigne('1', 'nettoyage', GC, site);
    const d = creerLigne('2', 'debroussaillage', GC, site);
    expect(objetDevis([n], site)).toBe('Nettoyage des modules photovoltaïques – Centrale de Les Cazes (Aveyron)');
    expect(objetDevis([d], site)).toBe('Débroussaillage – Centrale de Les Cazes (Aveyron)');
    expect(objetDevis([n, d], site)).toMatch(/^Nettoyage des modules photovoltaïques et débroussaillage/);
  });
  it('surface totale de nettoyage', () => {
    const a = { ...creerLigne('1', 'nettoyage', GC, site), quantite: 1000 };
    const b = { ...creerLigne('2', 'nettoyage', GC, site), quantite: 0.5, unite: 'ha' as const };
    expect(surfaceTotaleNettoyage([a, b, creerLigne('3', 'old', GC, site)])).toBe(6000);
  });
});

describe('devis : création, duplication, suppression, numérotation', () => {
  it('numéros successifs et compteur avancé', () => {
    let e = etatInitial();
    const r1 = creerDevis(e, '2026-11-13');
    e = r1.etat;
    const r2 = creerDevis(e, '2026-11-14');
    expect(r1.devis.numero).toBe('DEV-2026-001');
    expect(r2.devis.numero).toBe('DEV-2026-002');
    expect(r2.etat.parametres.numerotation.compteurParAnnee[2026]).toBe(2);
  });
  it('un numéro supprimé n’est jamais redonné', () => {
    const r1 = creerDevis(etatInitial(), '2026-11-13');
    const e = supprimerDevis(r1.etat, r1.devis.id);
    expect(creerDevis(e, '2026-11-13').devis.numero).toBe('DEV-2026-002');
  });
  it('nouvelle année : repart à 001', () => {
    const r1 = creerDevis(etatInitial(), '2026-12-31');
    expect(creerDevis(r1.etat, '2027-01-02').devis.numero).toBe('DEV-2027-001');
  });
  it('valeurs par défaut issues des paramètres et de la grille du client', () => {
    let e = enregistrerClient(etatInitial(), { id: 'c1', raisonSociale: 'A', adresseFacturation: 'x', grilleParDefautId: 'petites-surfaces' });
    e = { ...e, parametres: { ...e.parametres, validiteJours: 45 } };
    const { devis } = creerDevis(e, '2026-11-13', 'c1');
    expect(devis).toMatchObject({ grilleId: 'petites-surfaces', validiteJours: 45, statut: 'brouillon', clientId: 'c1' });
    expect(creerDevis(e, '2026-11-13').devis.grilleId).toBe('grandes-centrales');
  });
  it('dupliquer : nouveau numéro, date du jour, brouillon, lignes copiées', () => {
    let { etat: e, devis } = creerDevis(etatInitial(), '2026-10-01');
    devis = { ...devis, statut: 'accepte', site, lignes: [creerLigne('l1', 'nettoyage', GC, site)] };
    e = enregistrerDevis(e, devis);
    const r = dupliquerDevis(e, devis.id, '2026-11-13');
    expect(r.devis).toMatchObject({ numero: 'DEV-2026-002', statut: 'brouillon', dateEmission: '2026-11-13', site });
    expect(r.devis!.lignes[0].id).not.toBe('l1');
    expect(r.etat.devis).toHaveLength(2);
  });
});

describe('liste des devis', () => {
  it('recherche par client ou site, filtre par statut, plus récents d’abord', () => {
    let e = enregistrerClient(etatInitial(), { id: 'c1', raisonSociale: 'Énergie Causses', adresseFacturation: 'x' });
    const a = creerDevis(e, '2026-11-01', 'c1');
    e = a.etat;
    const b = creerDevis(e, '2026-11-10');
    e = enregistrerDevis(b.etat, { ...b.devis, site: { ...site, nomCentrale: 'Les Cazes' }, statut: 'envoye' });
    expect(filtrerDevis(e.devis, e.clients, '', '').map((d) => d.numero)).toEqual(['DEV-2026-002', 'DEV-2026-001']);
    expect(filtrerDevis(e.devis, e.clients, 'energie', '').map((d) => d.numero)).toEqual(['DEV-2026-001']);
    expect(filtrerDevis(e.devis, e.clients, 'cazes', '').map((d) => d.numero)).toEqual(['DEV-2026-002']);
    expect(filtrerDevis(e.devis, e.clients, '', 'envoye').map((d) => d.numero)).toEqual(['DEV-2026-002']);
  });
});
