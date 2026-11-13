import { useEffect, useRef, useState } from 'react';
import { champsManquants } from '../calcul/alertes';
import { formatEuros } from '../calcul/argent';
import { calculerDevis } from '../calcul/devis';
import { useDonnees } from '../donnees/Donnees';
import { enregistrerDevis } from '../donnees/stockage';
import { LIBELLES_STATUT } from '../modele/libelles';

/** Noms lisibles des valeurs provisoires qui apparaissent sur le PDF. */
const PROVISOIRES_IMPRIMES: Record<string, string> = {
  'entreprise.siege': 'adresse du siège',
  'entreprise.capital': 'capital social',
  'entreprise.rcs': 'ville du RCS',
  'entreprise.tva': 'numéro de TVA',
  'textes.conditionsPaiement': 'conditions de paiement',
  grilles: 'prix des grilles',
};

interface Pdf {
  url: string;
  blob: Blob;
  nom: string;
}

/** Dessine chaque page du PDF dans le conteneur (même rendu sur ordinateur et iPad). */
async function afficherPages(blob: Blob, conteneur: HTMLDivElement, annule: () => boolean) {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const canvases: HTMLCanvasElement[] = [];
  const largeur = conteneur.clientWidth || 800;
  const densite = Math.min(window.devicePixelRatio || 1, 2);
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: (largeur / base.width) * densite });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.className = 'page-pdf';
    canvas.setAttribute('aria-label', `Page ${i} sur ${pdf.numPages}`);
    await page.render({ canvas, viewport }).promise;
    canvases.push(canvas);
  }
  if (!annule()) conteneur.replaceChildren(...canvases);
}

export function Apercu({ id, naviguer }: { id: string; naviguer: (adresse: string) => void }) {
  const { etat, modifier } = useDonnees();
  const devis = etat.devis.find((d) => d.id === id);
  const client = etat.clients.find((c) => c.id === devis?.clientId) ?? null;
  const manquants = devis ? champsManquants(client, devis.site, devis.lignes) : [];
  const [pdf, setPdf] = useState<Pdf | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [affichageSimple, setAffichageSimple] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pages = useRef<HTMLDivElement>(null);

  // Le PDF est refait dès que le devis, le client ou les paramètres changent.
  const cle = devis && client && manquants.length === 0 ? JSON.stringify([devis, client, etat.parametres]) : null;

  useEffect(() => {
    if (!cle || !devis || !client) return;
    let annule = false;
    let url: string | null = null;
    (async () => {
      try {
        const { genererPdf, nomFichierPdf, preparerLogo } = await import('../pdf/genererDevis');
        const logo = await preparerLogo(etat.parametres.entreprise.logo);
        const blob = genererPdf({ devis, client, parametres: etat.parametres, logo }).output('blob');
        if (annule) return;
        url = URL.createObjectURL(blob);
        setPdf({ url, blob, nom: nomFichierPdf(devis, client) });
        setErreur(null);
        if (pages.current) {
          await afficherPages(blob, pages.current, () => annule).catch(() => setAffichageSimple(true));
        }
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      annule = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  if (!devis) {
    return (
      <div className="ecran">
        <p className="vide">Ce devis n'existe plus.</p>
        <a href="#/devis" className="bouton secondaire">
          ← Retour à la liste
        </a>
      </div>
    );
  }

  const retour = `#/devis/${devis.id}`;
  const provisoires = etat.parametres.provisoires.filter((p) => p in PROVISOIRES_IMPRIMES && (p !== 'textes.conditionsPaiement' || devis.conditionsPaiement === etat.parametres.textes.conditionsPaiement));
  const grille = etat.grilles.find((g) => g.id === devis.grilleId);
  const optionsProvisoires = devis.lignes.filter((l) => l.type === 'option' && !l.prixModifie && grille?.options.find((o) => o.id === l.optionId)?.provisoire);

  const peutPartager = (() => {
    if (!pdf || typeof navigator === 'undefined' || !navigator.canShare) return false;
    try {
      return navigator.canShare({ files: [new File([pdf.blob], pdf.nom, { type: 'application/pdf' })] });
    } catch {
      return false;
    }
  })();

  const partager = async () => {
    if (!pdf) return;
    try {
      await navigator.share({
        files: [new File([pdf.blob], pdf.nom, { type: 'application/pdf' })],
        title: `Devis ${devis.numero}`,
      });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setMessage("Le partage n'a pas abouti. Téléchargez le PDF puis envoyez-le.");
    }
  };

  const marquerEnvoye = () => {
    modifier((e) => {
      const d = e.devis.find((x) => x.id === id);
      return d ? enregistrerDevis(e, { ...d, statut: 'envoye' }) : e;
    });
    setMessage(`Le devis ${devis.numero} est marqué comme envoyé.`);
  };

  return (
    <div className="ecran ecran-apercu">
      <header className="ecran-entete ecran-entete-ligne">
        <div>
          <a href={retour} className="lien-retour">
            ← Retour au devis
          </a>
          <h1>
            Aperçu du devis {devis.numero} <span className={`statut statut-${devis.statut}`}>{LIBELLES_STATUT[devis.statut]}</span>
          </h1>
          {manquants.length === 0 && (
            <p className="aide">
              {client?.raisonSociale} · {formatEuros(calculerDevis(devis, etat.parametres).totaux.ttc)} TTC
            </p>
          )}
        </div>
      </header>

      {manquants.length > 0 ? (
        <div className="alerte alerte-erreur">
          <strong>Le PDF ne peut pas encore être généré. Il manque :</strong>
          <ul>
            {manquants.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <button type="button" className="bouton secondaire" onClick={() => naviguer(retour)}>
            Compléter le devis
          </button>
        </div>
      ) : (
        <>
          <div className="barre-apercu">
            {pdf ? (
              <a className="bouton principal" href={pdf.url} download={pdf.nom}>
                Télécharger le PDF
              </a>
            ) : (
              <button type="button" className="bouton principal" disabled>
                Préparation du PDF…
              </button>
            )}
            {peutPartager && (
              <button type="button" className="bouton secondaire" onClick={partager}>
                Partager…
              </button>
            )}
            {devis.statut === 'brouillon' ? (
              <button type="button" className="bouton secondaire" onClick={marquerEnvoye}>
                Marquer comme envoyé
              </button>
            ) : (
              <span className="aide">Statut : {LIBELLES_STATUT[devis.statut]}</span>
            )}
          </div>
          {pdf && <p className="aide nom-fichier">Fichier : {pdf.nom}</p>}
          {message && (
            <div className="alerte alerte-succes" role="status">
              {message}
            </div>
          )}
          {(provisoires.length > 0 || optionsProvisoires.length > 0) && (
            <div className="alerte alerte-attention">
              <strong>Valeurs provisoires sur ce devis :</strong>{' '}
              {[...provisoires.map((p) => PROVISOIRES_IMPRIMES[p]), ...optionsProvisoires.map((l) => `prix « ${l.designation} »`)].join(', ')}. À confirmer
              dans les Paramètres avant d'envoyer un vrai devis.
            </div>
          )}
          {erreur && <div className="alerte alerte-erreur">Le PDF n'a pas pu être généré : {erreur}</div>}
          <div className="pages-pdf" ref={pages} aria-label="Aperçu du PDF">
            {!pdf && !erreur && <p className="vide">Préparation de l'aperçu…</p>}
          </div>
          {affichageSimple && pdf && <iframe className="cadre-pdf" src={pdf.url} title={`Devis ${devis.numero}`} />}
        </>
      )}
    </div>
  );
}
