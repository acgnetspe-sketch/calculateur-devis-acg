import { useState } from 'react';
import { formatDate } from '../calcul/dates';
import { useDonnees } from '../donnees/Donnees';
import { creerSauvegarde, lireSauvegarde, nomFichierSauvegarde, type LectureSauvegarde } from '../donnees/sauvegarde';

const dateHeure = (iso: string) => {
  const d = new Date(iso);
  return `${formatDate(iso.slice(0, 10))} à ${String(d.getHours()).padStart(2, '0')} h ${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Export et import du fichier de sauvegarde (section de l'écran Paramètres). */
export function Sauvegarde() {
  const { etat, modifier } = useDonnees();
  const [lecture, setLecture] = useState<LectureSauvegarde | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const noter = () => modifier((e) => ({ ...e, derniereSauvegarde: new Date().toISOString() }));

  const exporter = async () => {
    setMessage(null);
    const texte = creerSauvegarde(etat);
    const nom = nomFichierSauvegarde();
    const fichier = new File([texte], nom, { type: 'application/json' });
    // Sur iPad : feuille de partage (Enregistrer dans Fichiers, AirDrop, Mail…).
    if (navigator.canShare?.({ files: [fichier] })) {
      try {
        await navigator.share({ files: [fichier], title: 'Sauvegarde des devis ACG NET SPE' });
        noter();
        setMessage('Sauvegarde partagée. Gardez ce fichier en lieu sûr (Fichiers, iCloud Drive, e-mail…).');
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(fichier);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nom;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    noter();
    setMessage(`Sauvegarde téléchargée : ${nom}.`);
  };

  const choisirFichier = async (fichier: File | undefined) => {
    setMessage(null);
    if (!fichier) return;
    setLecture(lireSauvegarde(await fichier.text()));
  };

  const importer = () => {
    if (!lecture?.ok) return;
    modifier(() => ({ ...lecture.etat, derniereSauvegarde: etat.derniereSauvegarde }));
    setLecture(null);
    setMessage(`Sauvegarde importée : ${lecture.resume.clients} client(s), ${lecture.resume.devis} devis.`);
  };

  return (
    <div className="sauvegarde">
      <p className="aide">
        Les données sont enregistrées seulement sur cet appareil. Exportez régulièrement une sauvegarde : elle permet de tout retrouver après
        un changement d'iPad ou d'ordinateur, ou de passer les données de Safari à l'application installée.
      </p>
      <p>
        Contenu actuel : <strong>{etat.clients.length}</strong> client(s), <strong>{etat.devis.length}</strong> devis, <strong>{etat.grilles.length}</strong>{' '}
        grille(s).
        <br />
        Dernière sauvegarde : <strong>{etat.derniereSauvegarde ? dateHeure(etat.derniereSauvegarde) : 'jamais'}</strong>
      </p>
      <div className="boutons">
        <button type="button" className="bouton principal" onClick={exporter}>
          Exporter la sauvegarde
        </button>
        <label className="bouton secondaire">
          Importer une sauvegarde…
          <input
            type="file"
            className="masque"
            accept="application/json,.json"
            onChange={(e) => {
              choisirFichier(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {lecture && !lecture.ok && <div className="alerte alerte-erreur sauvegarde-retour">{lecture.erreur}</div>}
      {lecture?.ok && (
        <div className="alerte alerte-attention sauvegarde-retour">
          <p>
            <strong>Sauvegarde{lecture.resume.exporteLe ? ` du ${dateHeure(lecture.resume.exporteLe)}` : ''}</strong> : {lecture.resume.clients} client(s),{' '}
            {lecture.resume.devis} devis, {lecture.resume.grilles} grille(s).
          </p>
          <p>
            L'import <strong>remplace toutes les données actuelles</strong> de cet appareil (clients, devis, grilles, paramètres). Pensez à exporter
            d'abord si vous voulez les garder.
          </p>
          <div className="boutons">
            <button type="button" className="bouton danger" onClick={importer}>
              Remplacer par cette sauvegarde
            </button>
            <button type="button" className="bouton secondaire" onClick={() => setLecture(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}
      {message && (
        <div className="alerte alerte-succes sauvegarde-retour" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
