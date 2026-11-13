import { jsPDF } from 'jspdf';
import { autoTable, type CellHookData } from 'jspdf-autotable';
import { formatEuros, formatNombre } from '../calcul/argent';
import { finValidite, formatDate } from '../calcul/dates';
import { calculerDevis } from '../calcul/devis';
import { LIBELLES_INSTALLATION, LIBELLES_UNITE } from '../calcul/grille';
import { objetDevis, surfaceTotaleNettoyage } from '../calcul/prestations';
import type { Client, Devis, LignePrestation, Parametres, PointEau } from '../modele/types';

/** Logo déjà converti en PNG (voir preparerLogo), avec ses dimensions en pixels. */
export interface LogoPdf {
  dataUrl: string;
  largeur: number;
  hauteur: number;
}

export interface DonneesPdf {
  devis: Devis;
  client: Client;
  parametres: Parametres;
  logo?: LogoPdf | null;
}

// Charte : bleu nuit, jaune, fond clair.
const BLEU: [number, number, number] = [11, 30, 45];
const JAUNE: [number, number, number] = [255, 198, 41];
const FOND: [number, number, number] = [246, 245, 241];
const GRIS: [number, number, number] = [95, 107, 117];
const GRIS_TRAIT: [number, number, number] = [217, 214, 204];

const LARGEUR_PAGE = 210;
const HAUTEUR_PAGE = 297;
const MARGE = 15;
const LARGEUR_UTILE = LARGEUR_PAGE - 2 * MARGE;
/** Espace réservé en bas de page pour le pied de page (plus haut avec le logo). */
const BAS = 24;
const BAS_AVEC_LOGO = 31;
/** Taille maximale du logo en bas de page, en mm. */
const LOGO_HAUTEUR_MAX = 18;
const LOGO_LARGEUR_MAX = 30;

const LIBELLES_POINT_EAU: Record<PointEau, string> = { oui: 'oui', non: 'non', a_verifier: 'à vérifier' };

/** Caractères gérés par la police Helvetica intégrée (Windows-1252). */
const HORS_LATIN1_ACCEPTES = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

/** Remplace les caractères que la police intégrée ne sait pas afficher. */
export function textePdf(t: string): string {
  return t
    .replace(/−/g, '-')
    .replace(/[  ]/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\r/g, '')
    .split('')
    .map((c) => (c.charCodeAt(0) <= 0xff || HORS_LATIN1_ACCEPTES.has(c) ? c : '?'))
    .join('');
}

const sansAccents = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
const partieNom = (t: string) =>
  sansAccents(t)
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

/** Nom du fichier : DEV-2026-001_Client_Site.pdf */
export function nomFichierPdf(devis: Devis, client: Client | null): string {
  const morceaux = [devis.numero, partieNom(client?.raisonSociale ?? ''), partieNom(devis.site.nomCentrale)].filter(Boolean);
  return `${morceaux.join('_')}.pdf`;
}

/** Ligne grise sous la désignation : détail saisi, calcul de surface, passages. */
export function detailLigne(l: LignePrestation, minimumApplique: boolean): string {
  const morceaux: string[] = [];
  if (l.detail.trim()) morceaux.push(l.detail.trim());
  if (l.type === 'nettoyage' && l.aideSurface && l.aideSurface.nbModules > 0) {
    morceaux.push(`${formatNombre(l.aideSurface.nbModules, 0)} modules de ${formatNombre(l.aideSurface.surfaceModule, 4)} m²`);
  }
  if (l.type === 'nettoyage' || l.passages > 1) morceaux.push(`${l.passages} passage${l.passages > 1 ? 's' : ''}`);
  if (minimumApplique) morceaux.push('montant minimum appliqué');
  return morceaux.join(' · ');
}

/** Lignes de mentions légales du pied de page. */
export function mentionsLegales(p: Parametres): string {
  const e = p.entreprise;
  const capital = e.capital.trim() ? ` au capital de ${e.capital.replace(/\s*€\s*$/, '')} €` : '';
  return [
    `${e.nom}, ${e.forme}${capital}`,
    e.siege.trim() && `siège ${e.siege.trim().replace(/\n+/g, ', ')}`,
    e.siren.trim() && `SIREN ${e.siren}`,
    e.rcs.trim() && `RCS ${e.rcs}`,
    e.tva.trim() && `TVA ${e.tva}`,
  ]
    .filter(Boolean)
    .join(', ');
}

/** Fabrique le PDF du devis (A4 portrait, marges de 15 mm). */
export function genererPdf({ devis, client, parametres, logo }: DonneesPdf): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const ent = parametres.entreprise;
  const bas = logo ? BAS_AVEC_LOGO : BAS;
  const resultat = calculerDevis(devis, parametres);
  const t = resultat.totaux;
  doc.setProperties({ title: `Devis ${devis.numero}`, author: ent.nom, subject: objetDevis(devis.lignes, devis.site), creator: 'Calculateur de devis ACG NET SPE' });
  doc.setLineHeightFactor(1.2);

  const k = doc.internal.scaleFactor;
  const hauteurLigne = (taille: number) => (taille * 1.2) / k;
  const police = (taille: number, style: 'normal' | 'bold' = 'normal', couleur: [number, number, number] = BLEU) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(taille);
    doc.setTextColor(...couleur);
  };
  const couper = (texte: string, largeur: number): string[] => doc.splitTextToSize(textePdf(texte), largeur) as string[];
  const ecrire = (lignes: string[] | string, x: number, y: number, options: Parameters<jsPDF['text']>[3] = {}) =>
    doc.text(Array.isArray(lignes) ? lignes : textePdf(lignes), x, y, { baseline: 'top', ...options });

  let y = MARGE;
  /** Passe à la page suivante si le bloc ne tient pas. */
  const place = (hauteur: number) => {
    if (y + hauteur > HAUTEUR_PAGE - bas) {
      doc.addPage();
      y = MARGE;
    }
  };

  // ---------- En-tête (le logo, s'il existe, est en bas de chaque page) ----------
  doc.setFillColor(...JAUNE);
  doc.rect(MARGE, y + 1, 8, 8, 'F');
  police(17, 'bold');
  ecrire(ent.nom || 'ACG NET SPE', MARGE + 11, y + 1.2);
  police(26, 'bold');
  ecrire('DEVIS', LARGEUR_PAGE - MARGE, y - 1, { align: 'right' });
  police(9.5);
  const infosDevis = [
    `N° ${devis.numero}`,
    `Date d'émission : ${formatDate(devis.dateEmission)}`,
    `Valable jusqu'au : ${formatDate(finValidite(devis.dateEmission, devis.validiteJours))}`,
  ];
  infosDevis.forEach((ligne, i) => {
    police(9.5, i === 0 ? 'bold' : 'normal');
    ecrire(ligne, LARGEUR_PAGE - MARGE, y + 11 + i * hauteurLigne(9.5), { align: 'right' });
  });
  y += 11 + 3 * hauteurLigne(9.5) + 3;
  doc.setFillColor(...JAUNE);
  doc.rect(MARGE, y, LARGEUR_UTILE, 0.8, 'F');
  y += 6;

  // ---------- Émetteur (gauche) et client (droite, encadré) ----------
  const largeurBloc = 84;
  const xClient = LARGEUR_PAGE - MARGE - largeurBloc;
  const lignesEmetteur = [
    ...ent.siege.split('\n'),
    ent.telephone && `Tél. ${ent.telephone}`,
    ent.email,
    ent.siteWeb,
    ent.siret ? `SIRET ${ent.siret}` : ent.siren ? `SIREN ${ent.siren}` : '',
    ent.tva && `N° TVA ${ent.tva}`,
  ].filter((l): l is string => Boolean(l && l.trim()));
  let yEmetteur = y;
  police(10.5, 'bold');
  ecrire(ent.nom, MARGE, yEmetteur);
  yEmetteur += hauteurLigne(10.5) + 0.5;
  police(9, 'normal', [40, 52, 62]);
  for (const l of lignesEmetteur) {
    const c = couper(l, largeurBloc);
    ecrire(c, MARGE, yEmetteur);
    yEmetteur += c.length * hauteurLigne(9);
  }

  const contact = [client.contactNom, client.contactFonction].filter(Boolean).join(' – ');
  police(10.5, 'bold');
  const nomClient = couper(client.raisonSociale, largeurBloc - 10);
  police(9.5);
  const adresseClient = client.adresseFacturation.split('\n').flatMap((l) => couper(l, largeurBloc - 10));
  const contactClient = contact ? couper(contact, largeurBloc - 10) : [];
  const hauteurClient = 5 + hauteurLigne(7) + 1.5 + nomClient.length * hauteurLigne(10.5) + (contactClient.length + adresseClient.length) * hauteurLigne(9.5) + 5;
  doc.setFillColor(...FOND);
  doc.setDrawColor(...BLEU);
  doc.setLineWidth(0.3);
  doc.roundedRect(xClient, y - 2, largeurBloc, hauteurClient, 1.5, 1.5, 'FD');
  let yClient = y + 3;
  police(7, 'bold', GRIS);
  ecrire('CLIENT', xClient + 5, yClient);
  yClient += hauteurLigne(7) + 1.5;
  police(10.5, 'bold');
  ecrire(nomClient, xClient + 5, yClient);
  yClient += nomClient.length * hauteurLigne(10.5);
  police(9.5);
  for (const l of [...contactClient, ...adresseClient]) {
    ecrire(l, xClient + 5, yClient);
    yClient += hauteurLigne(9.5);
  }
  y = Math.max(yEmetteur, y - 2 + hauteurClient) + 7;

  // ---------- Objet ----------
  police(10.5, 'bold');
  const objet = couper(`Objet : ${objetDevis(devis.lignes, devis.site)}`, LARGEUR_UTILE);
  ecrire(objet, MARGE, y);
  y += objet.length * hauteurLigne(10.5) + 1.5;

  // ---------- Site ----------
  const s = devis.site;
  const surface = surfaceTotaleNettoyage(devis.lignes);
  const lieu = [s.nomCentrale, s.commune].filter((x) => x.trim()).join(', ') + (s.departement.trim() ? ` (${s.departement.trim()})` : '');
  const infosSite = [
    `Site : ${lieu}`,
    s.typeInstallation && `Installation : ${LIBELLES_INSTALLATION[s.typeInstallation]}`,
    surface > 0 && `Surface totale de modules : ${formatNombre(surface, 0)} m²`,
    s.pointEau && `Point d'eau sur site : ${LIBELLES_POINT_EAU[s.pointEau]}`,
  ].filter(Boolean) as string[];
  police(9, 'normal', [40, 52, 62]);
  const lignesSite = couper(infosSite.join('  ·  '), LARGEUR_UTILE);
  if (s.acces?.trim()) lignesSite.push(...couper(`Accès : ${s.acces.trim().replace(/\n+/g, ' ')}`, LARGEUR_UTILE));
  ecrire(lignesSite, MARGE, y);
  y += lignesSite.length * hauteurLigne(9) + 4;

  // ---------- Tableau des prestations ----------
  const textes = devis.lignes.map((l, i) => ({
    designation: textePdf(l.designation || '—'),
    detail: textePdf(detailLigne(l, resultat.lignes[i]?.minimumApplique ?? false)),
  }));
  const corps = devis.lignes.map((l, i) => [
    textes[i].detail ? `${textes[i].designation}\n${textes[i].detail}` : textes[i].designation,
    textePdf(formatNombre(l.quantite, 4)),
    textePdf(LIBELLES_UNITE[l.unite]),
    textePdf(formatEuros(l.prixUnitaire)),
    textePdf(formatEuros(resultat.lignes[i]?.total ?? 0)),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Quantité', 'Unité', 'Prix unitaire HT', 'Total HT']],
    body: corps,
    theme: 'plain',
    margin: { left: MARGE, right: MARGE, top: MARGE, bottom: bas },
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: { font: 'helvetica', fontSize: 9, textColor: BLEU, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, valign: 'top' },
    headStyles: { fillColor: BLEU, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: FOND },
    columnStyles: {
      // La désignation est mesurée en gras pour que la hauteur prévue suffise.
      0: { fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: 24 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 29 },
      4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
    },
    didParseCell: (d: CellHookData) => {
      if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = d.column.index === 2 ? 'center' : 'right';
      d.cell.styles.lineColor = GRIS_TRAIT;
      if (d.section === 'body') d.cell.styles.lineWidth = { bottom: 0.2, top: 0, left: 0, right: 0 };
    },
    // La désignation (gras) et sa ligne de détail (grise) sont dessinées à la main.
    willDrawCell: (d: CellHookData) => {
      if (d.section === 'body' && d.column.index === 0) d.cell.text = [];
    },
    didDrawCell: (d: CellHookData) => {
      if (d.section !== 'body' || d.column.index !== 0) return;
      const info = textes[d.row.index];
      const largeur = d.cell.width - 5;
      let yy = d.cell.y + 2.2;
      police(9, 'bold');
      const des = doc.splitTextToSize(info.designation, largeur) as string[];
      doc.text(des, d.cell.x + 2.5, yy, { baseline: 'top' });
      yy += des.length * hauteurLigne(9);
      if (info.detail) {
        police(8, 'normal', GRIS);
        doc.text(doc.splitTextToSize(info.detail, largeur) as string[], d.cell.x + 2.5, yy + 0.3, { baseline: 'top' });
      }
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // ---------- Totaux ----------
  const lignesTotaux: [string, string][] = [['Total HT', formatEuros(t.totalHt)]];
  if (t.remise > 0) {
    const taux = devis.remise.type === 'pourcent' ? ` (${formatNombre(devis.remise.valeur)} %)` : '';
    lignesTotaux.push([`Remise${taux}`, `-${formatEuros(t.remise)}`], ['Total HT net', formatEuros(t.totalHtNet)]);
  }
  lignesTotaux.push([`TVA ${formatNombre(parametres.tauxTva)} %`, formatEuros(t.tva)]);
  const pas = 5.6;
  place(lignesTotaux.length * pas + 11);
  const xTotaux = LARGEUR_PAGE - MARGE - 80;
  police(9.5);
  for (const [libelle, valeur] of lignesTotaux) {
    ecrire(libelle, xTotaux + 3, y);
    ecrire(valeur, LARGEUR_PAGE - MARGE - 3, y, { align: 'right' });
    y += pas;
  }
  doc.setFillColor(...JAUNE);
  doc.rect(xTotaux, y - 1, 80, 9, 'F');
  police(11.5, 'bold');
  ecrire('Total TTC', xTotaux + 3, y + 1.2);
  ecrire(formatEuros(t.ttc), LARGEUR_PAGE - MARGE - 3, y + 1.2, { align: 'right' });
  y += 9 + 7;

  // ---------- Inclus et non inclus ----------
  const demi = (LARGEUR_UTILE - 8) / 2;
  police(9);
  const inclus = couper(parametres.textes.inclus, demi);
  const nonInclus = couper(parametres.textes.nonInclus, demi);
  const hInclus = hauteurLigne(9.5) + 1 + Math.max(inclus.length, nonInclus.length) * hauteurLigne(9);
  place(hInclus + 4);
  police(9.5, 'bold');
  ecrire('Inclus', MARGE, y);
  ecrire('Non inclus', MARGE + demi + 8, y);
  police(9, 'normal', [40, 52, 62]);
  ecrire(inclus, MARGE, y + hauteurLigne(9.5) + 1);
  ecrire(nonInclus, MARGE + demi + 8, y + hauteurLigne(9.5) + 1);
  y += hInclus + 5;

  // ---------- Conditions ----------
  const conditions = [
    `Validité : ${devis.validiteJours} jours, jusqu'au ${formatDate(finValidite(devis.dateEmission, devis.validiteJours))}.`,
    devis.conditionsPaiement.trim() && `Conditions de paiement : ${devis.conditionsPaiement.trim()}`,
    devis.periodeIntervention.trim() && `Période d'intervention prévue : ${devis.periodeIntervention.trim()}`,
    parametres.textes.penalites.trim(),
  ].filter(Boolean) as string[];
  police(8.5);
  const RETRAIT = 4;
  const blocs = conditions.map((c) => couper(c, LARGEUR_UTILE - RETRAIT - 1));
  place(hauteurLigne(9.5) + 1 + Math.min(blocs.reduce((n, b) => n + b.length, 0), 6) * hauteurLigne(8.5));
  police(9.5, 'bold');
  ecrire('Conditions', MARGE, y);
  y += hauteurLigne(9.5) + 1;
  police(8.5, 'normal', [40, 52, 62]);
  for (const b of blocs) {
    place(b.length * hauteurLigne(8.5));
    ecrire('•', MARGE + 0.5, y);
    ecrire(b, MARGE + RETRAIT, y);
    y += b.length * hauteurLigne(8.5) + 0.6;
  }

  // ---------- Notes pour le client ----------
  if (devis.notesClient.trim()) {
    y += 3;
    police(8.5);
    const notes = devis.notesClient.trim().split('\n').flatMap((l) => couper(l, LARGEUR_UTILE));
    place(hauteurLigne(9.5) + 1 + Math.min(notes.length, 4) * hauteurLigne(8.5));
    police(9.5, 'bold');
    ecrire('Notes', MARGE, y);
    y += hauteurLigne(9.5) + 1;
    police(8.5, 'normal', [40, 52, 62]);
    for (const l of notes) {
      place(hauteurLigne(8.5));
      ecrire(l, MARGE, y);
      y += hauteurLigne(8.5);
    }
  }

  // ---------- Bon pour accord ----------
  const hAccord = 34;
  y += 5;
  place(hAccord);
  doc.setDrawColor(...BLEU);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGE, y, LARGEUR_UTILE, hAccord, 1.5, 1.5, 'S');
  police(9.5, 'bold');
  ecrire('Devis reçu avant l\'exécution des travaux. Bon pour accord', MARGE + 5, y + 4);
  police(9, 'normal', [40, 52, 62]);
  const yChamps = y + 13;
  ecrire('Date :', MARGE + 5, yChamps);
  ecrire('Nom :', MARGE + 5, yChamps + 9);
  doc.setDrawColor(...GRIS_TRAIT);
  doc.setLineWidth(0.3);
  doc.line(MARGE + 17, yChamps + 3.6, MARGE + 75, yChamps + 3.6);
  doc.line(MARGE + 17, yChamps + 12.6, MARGE + 75, yChamps + 12.6);
  ecrire('Signature et cachet du client :', MARGE + 92, yChamps);
  y += hAccord;

  // ---------- Pied de page (toutes les pages) ----------
  const total = doc.getNumberOfPages();
  const mentions = textePdf(mentionsLegales(parametres));
  const tailleLogo = logo
    ? (() => {
        const ratio = Math.min(LOGO_LARGEUR_MAX / logo.largeur, LOGO_HAUTEUR_MAX / logo.hauteur);
        return { l: logo.largeur * ratio, h: logo.hauteur * ratio };
      })()
    : null;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const basPied = HAUTEUR_PAGE - 7;
    const yTrait = tailleLogo ? basPied - LOGO_HAUTEUR_MAX - 2.5 : HAUTEUR_PAGE - 18;
    doc.setDrawColor(...GRIS_TRAIT);
    doc.setLineWidth(0.3);
    doc.line(MARGE, yTrait, LARGEUR_PAGE - MARGE, yTrait);
    let xTexte = MARGE;
    let yTexte = yTrait + 3;
    if (logo && tailleLogo) {
      // Logo en bas à gauche, centré dans la hauteur du pied de page.
      const yLogo = yTrait + 1.5 + (LOGO_HAUTEUR_MAX - tailleLogo.h) / 2;
      doc.addImage(logo.dataUrl, 'PNG', MARGE, yLogo, tailleLogo.l, tailleLogo.h, 'logo', 'FAST');
      xTexte = MARGE + tailleLogo.l + 5;
      yTexte = yTrait + 1.5 + LOGO_HAUTEUR_MAX / 2 - 3;
    }
    police(7.5, 'normal', GRIS);
    const lignes = doc.splitTextToSize(mentions, LARGEUR_PAGE - MARGE - xTexte - 12) as string[];
    doc.text(lignes, xTexte, yTexte, { baseline: 'top' });
    doc.text(`${i}/${total}`, LARGEUR_PAGE - MARGE, yTexte, { baseline: 'top', align: 'right' });
  }
  doc.setPage(total);
  return doc;
}

/**
 * Prépare le logo pour le PDF : un SVG, PNG ou JPEG est converti en PNG
 * (jsPDF ne lit pas le SVG). Fonctionne dans le navigateur seulement.
 */
export async function preparerLogo(dataUrl: string | undefined): Promise<LogoPdf | null> {
  if (!dataUrl || typeof document === 'undefined') return null;
  try {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const largeur = img.naturalWidth || 600;
    const hauteur = img.naturalHeight || 200;
    const echelle = Math.max(1, 600 / largeur);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(largeur * echelle);
    canvas.height = Math.round(hauteur * echelle);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL('image/png'), largeur: canvas.width, hauteur: canvas.height };
  } catch {
    return null;
  }
}
