import { describe, expect, it } from 'vitest';
import { creerDevis, enregistrerClient, etatInitial } from './stockage';
import { creerSauvegarde, lireSauvegarde, nomFichierSauvegarde } from './sauvegarde';

function etatRempli() {
  let e = enregistrerClient(etatInitial(), { id: 'c1', raisonSociale: 'SPV Soleil', adresseFacturation: '1 rue X' });
  e = creerDevis(e, '2026-11-13', 'c1').etat;
  return { ...e, parametres: { ...e.parametres, tauxTva: 10 }, derniereSauvegarde: '2026-10-01T00:00:00.000Z' };
}

describe('sauvegarde', () => {
  it('export puis import : toutes les données reviennent à l’identique', () => {
    const e = etatRempli();
    const r = lireSauvegarde(creerSauvegarde(e, new Date('2026-11-13T10:00:00Z')));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { derniereSauvegarde: _d, ...attendu } = e;
    void _d;
    expect(r.etat).toEqual(attendu);
    expect(r.resume).toEqual({ exporteLe: '2026-11-13T10:00:00.000Z', clients: 1, devis: 1, grilles: 2 });
  });

  it('fichier lisible, avec le nom de l’application', () => {
    const texte = creerSauvegarde(etatRempli());
    expect(JSON.parse(texte).application).toBe('calculateur-devis-acg');
    expect(texte).toContain('\n  "version": 1');
  });

  it('nom du fichier daté', () => {
    expect(nomFichierSauvegarde(new Date(2026, 10, 13))).toBe('sauvegarde-devis-acg-2026-11-13.json');
  });

  it('refuse les fichiers qui ne sont pas des sauvegardes', () => {
    expect(lireSauvegarde('pas du json')).toMatchObject({ ok: false, erreur: expect.stringMatching(/JSON/) });
    expect(lireSauvegarde('{"a":1}')).toMatchObject({ ok: false, erreur: expect.stringMatching(/pas une sauvegarde/) });
    expect(lireSauvegarde('null')).toMatchObject({ ok: false });
  });

  it('refuse une sauvegarde abîmée ou plus récente', () => {
    expect(lireSauvegarde(JSON.stringify({ application: 'calculateur-devis-acg', version: 1, donnees: { devis: [] } }))).toMatchObject({
      ok: false,
      erreur: expect.stringMatching(/incomplète/),
    });
    expect(lireSauvegarde(JSON.stringify({ application: 'calculateur-devis-acg', version: 2, donnees: {} }))).toMatchObject({
      ok: false,
      erreur: expect.stringMatching(/plus récente/),
    });
  });

  it('complète une ancienne sauvegarde avec les nouveaux paramètres', () => {
    const f = JSON.parse(creerSauvegarde(etatRempli()));
    delete f.donnees.parametres.seuilMinimumM2;
    const r = lireSauvegarde(JSON.stringify(f));
    expect(r.ok && r.etat.parametres.seuilMinimumM2).toBe(100);
    expect(r.ok && r.etat.parametres.tauxTva).toBe(10);
  });
});
