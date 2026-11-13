/**
 * Cas de test obligatoires de la section 4 du cahier des charges (A, B, C, D)
 * et exemple d'estimation de la section 5.
 */
import { describe, expect, it } from 'vitest';
import type { LignePrestation } from '../modele/types';
import { GRILLE_GRANDES_CENTRALES, GRILLE_PETITES_SURFACES, PARAMETRES_DEPART } from '../modele/valeursDepart';
import { formatEuros } from './argent';
import { calculerDevis } from './devis';
import { prixPropose } from './grille';
import { surfaceModules } from './surface';

function ligne(p: Partial<LignePrestation> & Pick<LignePrestation, 'type' | 'quantite' | 'unite' | 'prixUnitaire'>): LignePrestation {
  return { id: Math.random().toString(36), designation: '', detail: '', passages: 1, prixModifie: false, ...p };
}

const sansRemise = { type: 'pourcent' as const, valeur: 0 };
const estimationL1 = { robot: 'L1' as const, personnes: 2 };

function ligneCasA(): LignePrestation {
  const surface = surfaceModules(40_277, 1.31);
  const prix = prixPropose(GRILLE_GRANDES_CENTRALES, 'nettoyage', { typeInstallation: 'sol', surfaceM2: surface })!;
  return ligne({ type: 'nettoyage', quantite: surface, unite: 'm2', prixUnitaire: prix });
}

describe('Cas A – centrale au sol', () => {
  it('surface 52 763 m², HT 13 190,75 €, TVA 2 638,15 €, TTC 15 828,90 €', () => {
    const l = ligneCasA();
    expect(l.quantite).toBe(52_763);
    expect(l.prixUnitaire).toBe(25);
    const { totaux } = calculerDevis({ lignes: [l], remise: sansRemise, estimation: estimationL1 }, PARAMETRES_DEPART);
    expect(totaux.totalHt).toBe(1_319_075);
    expect(totaux.tva).toBe(263_815);
    expect(totaux.ttc).toBe(1_582_890);
    expect(formatEuros(totaux.ttc)).toBe('15 828,90 €');
  });

  it('estimation avec le robot L1 : 26,4 h, 4 jours, 1 semaine, paniers 240 €, 3 297,69 € HT par jour', () => {
    const { estimation } = calculerDevis(
      { lignes: [ligneCasA()], remise: sansRemise, estimation: estimationL1 },
      PARAMETRES_DEPART,
    );
    expect(estimation.heuresNettoyage).toBeCloseTo(26.38, 2);
    expect(Number(estimation.heuresNettoyage.toFixed(1))).toBe(26.4);
    expect(estimation.joursNettoyage).toBe(4);
    expect(estimation.joursTotal).toBe(4);
    expect(estimation.semaines).toBe(1);
    expect(estimation.paniers).toBe(24_000);
    expect(estimation.prixMoyenParJour).toBe(329_769);
  });
});

describe('Cas B – petite toiture', () => {
  it('1 210 m² → tranche 601-1 500 à 0,85 € ; HT 1 028,50 € ; TVA 205,70 € ; TTC 1 234,20 €', () => {
    const prix = prixPropose(GRILLE_PETITES_SURFACES, 'nettoyage', { typeInstallation: 'toiture', surfaceM2: 1210 })!;
    expect(prix).toBe(85);
    const l = ligne({ type: 'nettoyage', quantite: 1210, unite: 'm2', prixUnitaire: prix });
    const { totaux } = calculerDevis({ lignes: [l], remise: sansRemise, estimation: estimationL1 }, PARAMETRES_DEPART);
    expect(totaux.totalHt).toBe(102_850);
    expect(totaux.tva).toBe(20_570);
    expect(totaux.ttc).toBe(123_420);
  });
});

describe('Cas C – débroussaillage', () => {
  it('intérieur 12,5 ha + OLD 6 ha facile → 11 875 € + 7 500 € ; HT 19 375 € ; TVA 3 875 € ; TTC 23 250 €', () => {
    const g = GRILLE_GRANDES_CENTRALES;
    const interieur = ligne({
      type: 'debroussaillage',
      quantite: 12.5,
      unite: 'ha',
      prixUnitaire: prixPropose(g, 'debroussaillage', { typeInstallation: 'sol' })!,
    });
    const old = ligne({
      type: 'old',
      quantite: 6,
      unite: 'ha',
      difficulte: 'facile',
      prixUnitaire: prixPropose(g, 'old', { typeInstallation: 'sol', difficulte: 'facile' })!,
    });
    const r = calculerDevis({ lignes: [interieur, old], remise: sansRemise, estimation: estimationL1 }, PARAMETRES_DEPART);
    expect(r.lignes.map((l) => l.total)).toEqual([1_187_500, 750_000]);
    expect(r.totaux.totalHt).toBe(1_937_500);
    expect(r.totaux.tva).toBe(387_500);
    expect(r.totaux.ttc).toBe(2_325_000);
  });
});

describe('Cas D – remise', () => {
  it('cas A avec 5 % → remise 659,54 € ; HT net 12 531,21 € ; TVA 2 506,24 € ; TTC 15 037,45 €', () => {
    const { totaux } = calculerDevis(
      { lignes: [ligneCasA()], remise: { type: 'pourcent', valeur: 5 }, estimation: estimationL1 },
      PARAMETRES_DEPART,
    );
    expect(totaux.totalHt).toBe(1_319_075);
    expect(totaux.remise).toBe(65_954);
    expect(totaux.totalHtNet).toBe(1_253_121);
    expect(totaux.tva).toBe(250_624);
    expect(totaux.ttc).toBe(1_503_745);
  });
});
