import { useState } from 'react';
import { formatEuros } from '../calcul/argent';
import { aujourdhui, formatDate } from '../calcul/dates';
import { calculerDevis } from '../calcul/devis';
import { filtrerDevis } from '../calcul/listeDevis';
import { useDonnees } from '../donnees/Donnees';
import { creerDevis, dupliquerDevis, supprimerDevis } from '../donnees/stockage';
import { LIBELLES_STATUT } from '../modele/libelles';
import type { Statut } from '../modele/types';

const STATUTS = Object.keys(LIBELLES_STATUT) as Statut[];

export function ListeDevis({ naviguer }: { naviguer: (adresse: string) => void }) {
  const { etat, modifier } = useDonnees();
  const [recherche, setRecherche] = useState('');
  const [statut, setStatut] = useState<Statut | ''>('');

  const liste = filtrerDevis(etat.devis, etat.clients, recherche, statut);
  const nomClient = (id: string | null) => etat.clients.find((c) => c.id === id)?.raisonSociale;

  const nouveau = () => {
    const r = creerDevis(etat, aujourdhui());
    modifier(() => r.etat);
    naviguer(`#/devis/${r.devis.id}`);
  };
  const dupliquer = (id: string) => {
    const r = dupliquerDevis(etat, id, aujourdhui());
    if (!r.devis) return;
    modifier(() => r.etat);
    naviguer(`#/devis/${r.devis.id}`);
  };
  const supprimer = (id: string, numero: string) => {
    if (window.confirm(`Supprimer le devis ${numero} ? Cette action est définitive.`)) modifier((e) => supprimerDevis(e, id));
  };

  return (
    <div className="ecran ecran-liste">
      <header className="ecran-entete ecran-entete-ligne">
        <h1>Devis</h1>
        <button type="button" className="bouton principal" onClick={nouveau}>
          + Nouveau devis
        </button>
      </header>

      {etat.devis.length > 0 && (
        <div className="filtres">
          <input
            type="search"
            className="recherche"
            placeholder="Rechercher par client ou par site…"
            aria-label="Rechercher un devis par client ou par site"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <div className="choix-segment filtres-statut" role="radiogroup" aria-label="Filtrer par statut">
            {(['', ...STATUTS] as (Statut | '')[]).map((s) => (
              <button key={s || 'tous'} type="button" role="radio" aria-checked={statut === s} className={statut === s ? 'actif' : ''} onClick={() => setStatut(s)}>
                {s ? LIBELLES_STATUT[s] : 'Tous'}
                <span className="compteur">{s ? etat.devis.filter((d) => d.statut === s).length : etat.devis.length}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {etat.devis.length === 0 ? (
        <div className="accueil-vide">
          <p>Aucun devis pour l'instant.</p>
          <p className="aide">Un devis se fait en trois temps : le client et le site, les prestations, puis l'aperçu du PDF.</p>
          <button type="button" className="bouton principal" onClick={nouveau}>
            + Créer le premier devis
          </button>
        </div>
      ) : liste.length === 0 ? (
        <p className="vide">Aucun devis ne correspond à cette recherche.</p>
      ) : (
        <div className="tableau-defilant">
          <table className="tableau tableau-devis">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Date</th>
                <th>Client</th>
                <th>Site</th>
                <th className="nombre">Montant HT</th>
                <th>Statut</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {liste.map((d) => (
                <tr key={d.id} className="ligne-cliquable" onClick={() => naviguer(`#/devis/${d.id}`)}>
                  <td>
                    <a href={`#/devis/${d.id}`} onClick={(e) => e.stopPropagation()}>
                      {d.numero}
                    </a>
                  </td>
                  <td>{formatDate(d.dateEmission)}</td>
                  <td>{nomClient(d.clientId) ?? <span className="aide">—</span>}</td>
                  <td>
                    {d.site.nomCentrale || <span className="aide">—</span>}
                    {d.site.commune && <div className="aide">{d.site.commune}</div>}
                  </td>
                  <td className="nombre">{formatEuros(calculerDevis(d, etat.parametres).totaux.totalHtNet)}</td>
                  <td>
                    <span className={`statut statut-${d.statut}`}>{LIBELLES_STATUT[d.statut]}</span>
                  </td>
                  <td className="actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="bouton-icone" aria-label={`Dupliquer le devis ${d.numero}`} title="Dupliquer" onClick={() => dupliquer(d.id)}>
                      ⧉
                    </button>
                    <button type="button" className="bouton-icone" aria-label={`Supprimer le devis ${d.numero}`} title="Supprimer" onClick={() => supprimer(d.id, d.numero)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
