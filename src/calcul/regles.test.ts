import { describe, expect, it } from 'vitest';
import type { LignePrestation, Site } from '../modele/types';
import { GRILLE_GRANDES_CENTRALES, GRILLE_PETITES_SURFACES, PARAMETRES_DEPART } from '../modele/valeursDepart';
import { alertesSite, champsManquants, siretValide } from './alertes';
import { ajouterJours, aujourdhui, finValidite, formatDate } from './dates';
import { estimer } from './estimation';
import { ligneParDefaut, prixPropose, trancheApplicable } from './grille';
import { totalLigne } from './ligne';
import { prochainNumero } from './numerotation';
import { haVersM2, m2VersHa, surfaceModules } from './surface';
import { calculerTotaux, montantRemise } from './totaux';

const tarif = GRILLE_PETITES_SURFACES.nettoyage;
const tranches = tarif.mode === 'parTranches' ? tarif.tranches : [];

describe('surface', () => {
  it('modules × surface, arrondi au m²', () => {
    expect(surfaceModules(40_277, 1.31)).toBe(52_763);
    expect(surfaceModules(10, 1.95)).toBe(20); // 19,5 → 20
  });
  it('convertit m² ↔ ha', () => {
    expect(m2VersHa(52_763)).toBe(5.2763);
    expect(haVersM2(12.5)).toBe(125_000);
  });
});

describe('barème dégressif (règle 1)', () => {
  it.each([
    [50, 90],
    [100, 90],
    [600, 90],
    [600.5, 90],
    [601, 85],
    [1210, 85],
    [1500, 85],
    [1501, 80],
    [100_000, 80],
  ])('%d m² → %d centimes/m²', (surface, prix) => {
    expect(trancheApplicable(tranches, surface)?.prix).toBe(prix);
  });
  it("le prix de la tranche s'applique à toute la surface", () => {
    expect(totalLigne({ type: 'nettoyage', quantite: 1210, unite: 'm2', passages: 1, prixUnitaire: 85 }).total).toBe(102_850);
  });
});

describe('prix proposé par la grille', () => {
  const g = GRILLE_GRANDES_CENTRALES;
  it('nettoyage selon le type d’installation', () => {
    expect(prixPropose(g, 'nettoyage', { typeInstallation: 'sol' })).toBe(25);
    expect(prixPropose(g, 'nettoyage', { typeInstallation: 'trackers' })).toBe(30);
    expect(prixPropose(g, 'nettoyage', { typeInstallation: 'ombriere' })).toBe(40);
    expect(prixPropose(g, 'nettoyage', { typeInstallation: 'toiture' })).toBe(60);
    expect(prixPropose(g, 'nettoyage', { typeInstallation: null })).toBeNull();
  });
  it('OLD selon la difficulté', () => {
    expect(prixPropose(g, 'old', { typeInstallation: null, difficulte: 'facile' })).toBe(125_000);
    expect(prixPropose(g, 'old', { typeInstallation: null, difficulte: 'moyenne' })).toBe(132_500);
    expect(prixPropose(g, 'old', { typeInstallation: null, difficulte: 'difficile' })).toBe(140_000);
  });
  it('options, ligne libre', () => {
    expect(prixPropose(g, 'option', { typeInstallation: null, optionId: 'nacelle' })).toBe(0);
    expect(prixPropose(g, 'option', { typeInstallation: null, optionId: 'inconnue' })).toBeNull();
    expect(prixPropose(g, 'libre', { typeInstallation: null })).toBeNull();
  });
  it('désignation proposée', () => {
    expect(ligneParDefaut(g, 'nettoyage', { typeInstallation: 'sol' })).toEqual({
      designation: 'Nettoyage des modules photovoltaïques – sol fixe',
      unite: 'm2',
    });
    expect(ligneParDefaut(g, 'old', { typeInstallation: null, difficulte: 'moyenne' }).unite).toBe('ha');
  });
});

describe('total de ligne (règles 2 et 3)', () => {
  const base = { type: 'nettoyage' as const, unite: 'm2' as const, prixUnitaire: 90 };
  it('multiplie par le nombre de passages', () => {
    expect(totalLigne({ ...base, quantite: 1000, passages: 2 }).total).toBe(180_000);
  });
  it('arrondit au centime', () => {
    expect(totalLigne({ ...base, quantite: 10.5, passages: 1, prixUnitaire: 25 }).total).toBe(263); // 262,5
  });
  it('un nombre de passages à 0 compte pour 1', () => {
    expect(totalLigne({ ...base, quantite: 100, passages: 0 }).total).toBe(9000);
  });
  const regles = { montantMinimumNettoyage: 15_000, seuilMinimumM2: 100 };
  it('applique le minimum sous 100 m²', () => {
    expect(totalLigne({ ...base, quantite: 50, passages: 1 }, regles)).toEqual({ total: 15_000, minimumApplique: true });
  });
  it("n'applique pas le minimum à 100 m² ou plus, ni s'il vaut 0", () => {
    expect(totalLigne({ ...base, quantite: 100, passages: 1 }, regles).minimumApplique).toBe(false);
    expect(totalLigne({ ...base, quantite: 50, passages: 1 }, { ...regles, montantMinimumNettoyage: 0 }).total).toBe(4500);
  });
  it("n'applique pas le minimum hors nettoyage", () => {
    expect(totalLigne({ ...base, type: 'option', quantite: 50, passages: 1 }, regles).minimumApplique).toBe(false);
  });
});

describe('totaux (règles 4 à 6)', () => {
  it('somme des lignes arrondies, TVA et TTC', () => {
    expect(calculerTotaux([100, 263], { type: 'pourcent', valeur: 0 }, 20)).toEqual({
      totalHt: 363,
      remise: 0,
      totalHtNet: 363,
      tva: 73, // 72,6
      ttc: 436,
    });
  });
  it('remise en montant', () => {
    const t = calculerTotaux([100_000], { type: 'montant', valeur: 5_000 }, 20);
    expect(t.totalHtNet).toBe(95_000);
    expect(t.tva).toBe(19_000);
    expect(t.ttc).toBe(114_000);
  });
  it('la remise ne dépasse jamais le total et n’est jamais négative', () => {
    expect(montantRemise(1000, { type: 'montant', valeur: 5000 })).toBe(1000);
    expect(montantRemise(1000, { type: 'pourcent', valeur: -10 })).toBe(0);
  });
  it('taux de TVA modifiable', () => {
    expect(calculerTotaux([100_000], { type: 'pourcent', valeur: 0 }, 10).tva).toBe(10_000);
  });
  it('devis vide', () => {
    expect(calculerTotaux([], { type: 'pourcent', valeur: 5 }, 20).ttc).toBe(0);
  });
});

describe('estimation interne', () => {
  const r = PARAMETRES_DEPART.rendements;
  it('robot F1', () => {
    const e = estimer({ nettoyageM2: 52_763, debroussaillageHa: 0, totalHt: 1_319_075, robot: 'F1', personnes: 2, rendements: r });
    expect(e.heuresNettoyage).toBeCloseTo(40.59, 2);
    expect(e.joursNettoyage).toBe(6);
    expect(e.semaines).toBe(2);
    expect(e.paniers).toBe(36_000);
  });
  it('un nombre exact de jours ne passe pas au jour suivant', () => {
    const e = estimer({ nettoyageM2: 14_000, debroussaillageHa: 0, totalHt: 0, robot: 'L1', personnes: 2, rendements: r });
    expect(e.joursNettoyage).toBe(1);
  });
  it('débroussaillage sans rendement défini : signalé, pas inventé', () => {
    const e = estimer({ nettoyageM2: 0, debroussaillageHa: 18.5, totalHt: 1_937_500, robot: 'L1', personnes: 2, rendements: r });
    expect(e.joursDebroussaillage).toBeNull();
    expect(e.rendementDebroussaillageManquant).toBe(true);
    expect(e.prixMoyenParJour).toBeNull();
  });
  it('débroussaillage avec rendement', () => {
    const e = estimer({
      nettoyageM2: 0,
      debroussaillageHa: 18.5,
      totalHt: 1_937_500,
      robot: 'L1',
      personnes: 3,
      rendements: { ...r, haParJourDebroussaillage: 2 },
    });
    expect(e.joursDebroussaillage).toBe(10);
    expect(e.semaines).toBe(3);
    expect(e.paniers).toBe(90_000);
    expect(e.prixMoyenParJour).toBe(193_750);
  });
});

describe('alertes et champs obligatoires', () => {
  const site: Site = { nomCentrale: 'Les Cazes', commune: 'Saint-Affrique', departement: 'Aveyron', typeInstallation: 'sol' };
  it('nacelle au-delà de 15 m', () => {
    expect(alertesSite({ ...site, hauteurToiture: 15 })).toEqual([]);
    expect(alertesSite({ ...site, hauteurToiture: 16 })).toHaveLength(1);
  });
  it('inclinaison au-delà de 26° sur trackers seulement', () => {
    expect(alertesSite({ ...site, typeInstallation: 'trackers', inclinaison: 30 })).toHaveLength(1);
    expect(alertesSite({ ...site, typeInstallation: 'sol', inclinaison: 30 })).toEqual([]);
  });
  it('SIRET : 14 chiffres', () => {
    expect(siretValide('910 204 262 00011')).toBe(true);
    expect(siretValide('123')).toBe(false);
    expect(siretValide('')).toBe(true);
  });
  it('liste les champs manquants qui bloquent le PDF', () => {
    const ligne = {} as LignePrestation;
    expect(champsManquants(null, { ...site, typeInstallation: null }, [])).toEqual([
      'Client',
      "Type d'installation",
      'Au moins une prestation',
    ]);
    const client = { id: '1', raisonSociale: 'SPV Soleil', adresseFacturation: '1 rue X' };
    expect(champsManquants(client, site, [ligne])).toEqual([]);
  });
});

describe('numérotation', () => {
  it('premier devis de l’année', () => {
    expect(prochainNumero('DEV', 2026, 0, []).numero).toBe('DEV-2026-001');
  });
  it('incrémente sans réattribuer un numéro', () => {
    expect(prochainNumero('DEV', 2026, 0, ['DEV-2026-001', 'DEV-2026-007']).numero).toBe('DEV-2026-008');
    expect(prochainNumero('DEV', 2026, 12, ['DEV-2026-003']).numero).toBe('DEV-2026-013');
  });
  it('repart à 001 chaque année', () => {
    expect(prochainNumero('DEV', 2027, 0, ['DEV-2026-042']).numero).toBe('DEV-2027-001');
  });
});

describe('dates', () => {
  it('format JJ/MM/AAAA', () => {
    expect(formatDate('2026-11-13')).toBe('13/11/2026');
    expect(aujourdhui(new Date(2026, 10, 13))).toBe('2026-11-13');
  });
  it('fin de validité à 30 jours, changements de mois et d’année', () => {
    expect(finValidite('2026-11-13', 30)).toBe('2026-12-13');
    expect(ajouterJours('2026-12-15', 30)).toBe('2027-01-14');
    expect(ajouterJours('2028-02-28', 1)).toBe('2028-02-29');
  });
});
