import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { creerLigne } from '../calcul/prestations';
import { GRILLE_GRANDES_CENTRALES } from '../modele/valeursDepart';
import { donneesCasA } from './casA';
import { detailLigne, genererPdf, mentionsLegales, nomFichierPdf, textePdf } from './genererDevis';

/** Texte de chaque page du PDF, lu comme le ferait un lecteur PDF. */
async function lirePages(doc: ReturnType<typeof genererPdf>): Promise<string[]> {
  const pdf = await getDocument({ data: new Uint8Array(doc.output('arraybuffer')), useSystemFonts: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const contenu = await (await pdf.getPage(i)).getTextContent();
    pages.push(
      contenu.items
        .map((x) => ('str' in x ? x.str : ''))
        .join(' ')
        .replace(/ /g, ' ')
        .replace(/\s+/g, ' '),
    );
  }
  return pages;
}

describe('PDF du devis – cas A', () => {
  it('une page, avec les montants, les mentions et le bon pour accord', async () => {
    const pages = await lirePages(genererPdf(donneesCasA()));
    expect(pages).toHaveLength(1);
    const p = pages[0];
    for (const attendu of [
      'DEVIS',
      'N° DEV-2026-001',
      "Date d'émission : 13/11/2026",
      "Valable jusqu'au : 13/12/2026",
      'SPV Les Cazes Énergie',
      '12400 Saint-Affrique',
      'Objet : Nettoyage des modules photovoltaïques – Centrale de Les Cazes (Aveyron)',
      'Installation : sol fixe',
      'Surface totale de modules : 52 763 m²',
      "Point d'eau sur site : à vérifier",
      'Désignation',
      'Prix unitaire HT',
      '52 763',
      '0,25 €',
      '13 190,75 €',
      'TVA 20 %',
      '2 638,15 €',
      'Total TTC',
      '15 828,90 €',
      '1 passage',
      'Inclus',
      'Non inclus',
      'indemnité forfaitaire de 40 €',
      "Devis reçu avant l'exécution des travaux. Bon pour accord",
      'Signature et cachet du client',
      'SIREN 910 204 262',
      '1/1',
    ]) {
      expect(p).toContain(attendu);
    }
  });

  it("n'imprime jamais les notes internes ni l'estimation", async () => {
    const [p] = await lirePages(genererPdf(donneesCasA()));
    expect(p).not.toContain('NOTE INTERNE SECRETE');
    expect(p).not.toMatch(/Estimation|Paniers|Robot L1/);
  });

  it('cas D : remise détaillée', async () => {
    const d = donneesCasA();
    d.devis.remise = { type: 'pourcent', valeur: 5 };
    const [p] = await lirePages(genererPdf(d));
    expect(p).toContain('Remise (5 %)');
    expect(p).toContain('-659,54 €');
    expect(p).toContain('Total HT net');
    expect(p).toContain('12 531,21 €');
    expect(p).toContain('15 037,45 €');
  });
});

describe('PDF sur plusieurs pages', () => {
  it('le tableau continue, l’en-tête de colonnes est répété, pages numérotées 1/2, 2/2', async () => {
    const d = donneesCasA();
    const site = d.devis.site;
    d.devis.lignes = Array.from({ length: 28 }, (_, i) => ({
      ...creerLigne(`l${i}`, 'nettoyage', GRILLE_GRANDES_CENTRALES, site),
      designation: `Nettoyage zone ${i + 1}`,
      quantite: 1000 + i,
    }));
    d.devis.notesClient = 'Intervention coordonnée avec l’exploitant.';
    const pages = await lirePages(genererPdf(d));
    expect(pages.length).toBeGreaterThanOrEqual(2);
    pages.forEach((p, i) => {
      expect(p).toContain(`${i + 1}/${pages.length}`);
      expect(p).toContain('SIREN 910 204 262');
    });
    expect(pages[1]).toContain('Prix unitaire HT');
    const tout = pages.join(' ');
    expect(tout).toContain('Nettoyage zone 28');
    expect(tout).toContain('Bon pour accord');
  });
});

describe('textes du PDF', () => {
  it('nom du fichier : DEV-2026-001_Client_Site.pdf', () => {
    const { devis, client } = donneesCasA();
    expect(nomFichierPdf(devis, client)).toBe('DEV-2026-001_SPV-Les-Cazes-Energie_Les-Cazes.pdf');
    expect(nomFichierPdf({ ...devis, site: { ...devis.site, nomCentrale: '' } }, null)).toBe('DEV-2026-001.pdf');
  });
  it('ligne de détail : méthode, modules, passages, minimum', () => {
    const { devis } = donneesCasA();
    expect(detailLigne(devis.lignes[0], false)).toBe('Nettoyage mécanisé par robot, eau déminéralisée · 40\u00a0277 modules de 1,31 m² · 1 passage');
    expect(detailLigne({ ...devis.lignes[0], detail: '', aideSurface: undefined, passages: 2 }, true)).toBe('2 passages · montant minimum appliqué');
    expect(detailLigne({ ...devis.lignes[0], type: 'old', detail: '', aideSurface: undefined }, false)).toBe('');
  });
  it('mentions légales du pied de page', () => {
    const { parametres } = donneesCasA();
    parametres.entreprise.capital = '1 000 €';
    expect(mentionsLegales(parametres)).toBe(
      'ACG NET SPE, SASU au capital de 1 000 €, siège [adresse à confirmer], Saint-Affrique, SIREN 910 204 262, RCS [ville à compléter], TVA [à compléter]',
    );
  });
  it('remplace les caractères que la police ne sait pas afficher', () => {
    expect(textePdf('−5 € ✎ œ « » –')).toBe('-5 € ? œ « » –');
  });
});
