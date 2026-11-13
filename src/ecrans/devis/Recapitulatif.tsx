import { useState } from 'react';
import { formatEuros, formatNombre } from '../../calcul/argent';
import type { ResultatDevis } from '../../calcul/devis';
import { surfacesTravail } from '../../calcul/estimation';
import { ChampListe, ChampNombre } from '../../composants/Champs';
import type { Devis, Robot } from '../../modele/types';

const ROBOTS: { valeur: Robot; libelle: string }[] = [
  { valeur: 'L1', libelle: 'Robot L1' },
  { valeur: 'F1', libelle: 'Robot F1' },
];

const pluriel = (n: number, mot: string) => `${formatNombre(n, 0)} ${mot}${n > 1 ? 's' : ''}`;

export function Recapitulatif({
  devis,
  resultat,
  tauxTva,
  rendements,
  manquants,
  alertes,
  onEstimation,
  onApercu,
}: {
  devis: Devis;
  resultat: ResultatDevis;
  tauxTva: number;
  rendements: { L1: number; F1: number };
  manquants: string[];
  alertes: string[];
  onEstimation: (e: Devis['estimation']) => void;
  onApercu: () => void;
}) {
  const [deplie, setDeplie] = useState(false);
  const t = resultat.totaux;
  const e = resultat.estimation;
  const surfaces = surfacesTravail(devis.lignes);

  return (
    <aside className={`recap ${deplie ? 'deplie' : ''}`} aria-label="Récapitulatif">
      <button type="button" className="recap-barre" aria-expanded={deplie} onClick={() => setDeplie(!deplie)}>
        <span>
          HT <strong>{formatEuros(t.totalHtNet)}</strong>
        </span>
        <span>
          TTC <strong>{formatEuros(t.ttc)}</strong>
        </span>
        <span className="recap-fleche" aria-hidden="true">
          {deplie ? '▼' : '▲'}
        </span>
        <span className="masque">{deplie ? 'Masquer le détail' : 'Afficher le détail'}</span>
      </button>

      <div className="recap-contenu">
        <h2>Récapitulatif</h2>
        <dl className="totaux">
          <dt>Total HT</dt>
          <dd>{formatEuros(t.totalHt)}</dd>
          {t.remise > 0 && (
            <>
              <dt>Remise{devis.remise.type === 'pourcent' ? ` (${formatNombre(devis.remise.valeur)} %)` : ''}</dt>
              <dd>−{formatEuros(t.remise)}</dd>
              <dt>Total HT net</dt>
              <dd>{formatEuros(t.totalHtNet)}</dd>
            </>
          )}
          <dt>TVA {formatNombre(tauxTva)} %</dt>
          <dd>{formatEuros(t.tva)}</dd>
          <dt className="ttc">Total TTC</dt>
          <dd className="ttc">{formatEuros(t.ttc)}</dd>
        </dl>

        {manquants.length > 0 ? (
          <div className="alerte alerte-erreur">
            <strong>Pour générer le PDF, il manque :</strong>
            <ul>
              {manquants.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {alertes.map((a) => (
          <div key={a} className="alerte alerte-attention">
            ⚠ {a}
          </div>
        ))}

        <button type="button" className="bouton principal pleine-largeur" disabled={manquants.length > 0} onClick={onApercu}>
          Aperçu du PDF
        </button>

        <section className="estimation" aria-label="Estimation interne">
          <h3>
            Estimation interne <span className="etiquette-interne">jamais imprimée</span>
          </h3>
          <div className="grille-champs estimation-choix">
            <ChampListe
              label="Matériel"
              valeur={devis.estimation.robot}
              options={ROBOTS.map((r) => ({ ...r, libelle: `${r.valeur} · ${formatNombre(rendements[r.valeur], 0)} m²/h` }))}
              onChange={(robot) => robot && onEstimation({ ...devis.estimation, robot })}
            />
            <ChampNombre
              label="Personnes"
              entier
              valeur={devis.estimation.personnes}
              onChange={(v) => onEstimation({ ...devis.estimation, personnes: v ?? 0 })}
            />
          </div>
          <dl className="totaux estimation-valeurs">
            {surfaces.nettoyageM2 > 0 && (
              <>
                <dt>Nettoyage ({formatNombre(surfaces.nettoyageM2, 0)} m²)</dt>
                <dd>
                  {formatNombre(e.heuresNettoyage, 1)} h · {pluriel(e.joursNettoyage, 'jour')}
                </dd>
              </>
            )}
            {surfaces.debroussaillageHa > 0 && (
              <>
                <dt>Débroussaillage ({formatNombre(surfaces.debroussaillageHa)} ha)</dt>
                <dd>{e.joursDebroussaillage === null ? 'rendement à définir' : pluriel(e.joursDebroussaillage, 'jour')}</dd>
              </>
            )}
            <dt>Durée totale</dt>
            <dd>
              {pluriel(e.joursTotal, 'jour')} · {pluriel(e.semaines, 'semaine')}
            </dd>
            <dt>Paniers</dt>
            <dd>{formatEuros(e.paniers)}</dd>
            <dt>Prix moyen par jour</dt>
            <dd>{e.prixMoyenParJour === null ? '—' : `${formatEuros(e.prixMoyenParJour)} HT`}</dd>
          </dl>
          {e.rendementDebroussaillageManquant && (
            <p className="aide">Le rendement du débroussaillage (ha/jour) n'est pas défini dans les Paramètres : ses jours ne sont pas comptés.</p>
          )}
        </section>
      </div>
    </aside>
  );
}
