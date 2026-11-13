import { formatEuros, formatNombre } from '../../calcul/argent';
import { LIBELLES_UNITE } from '../../calcul/grille';
import type { ResultatLigne } from '../../calcul/ligne';
import { LIBELLES_TYPE_LIGNE } from '../../calcul/prestations';
import { haVersM2, m2VersHa, surfaceModules } from '../../calcul/surface';
import { ChampListe, ChampMontant, ChampNombre, ChampTexte } from '../../composants/Champs';
import type { Centimes, Difficulte, LignePrestation, Unite } from '../../modele/types';

const UNITES = (Object.keys(LIBELLES_UNITE) as Unite[]).map((u) => ({ valeur: u, libelle: LIBELLES_UNITE[u] }));
const DIFFICULTES: { valeur: Difficulte; libelle: string }[] = [
  { valeur: 'facile', libelle: 'Facile' },
  { valeur: 'moyenne', libelle: 'Moyenne' },
  { valeur: 'difficile', libelle: 'Difficile' },
];

/** Unité imposée par la grille (le prix y est exprimé) : non modifiable. */
const uniteFixe = (l: LignePrestation) => l.type === 'nettoyage' || l.type === 'debroussaillage' || l.type === 'old';

export function EditeurLigne({
  ligne,
  numero,
  resultat,
  prixGrille,
  premier,
  dernier,
  onChange,
  onRevenirGrille,
  onMonter,
  onDescendre,
  onDupliquer,
  onSupprimer,
}: {
  ligne: LignePrestation;
  numero: number;
  resultat?: ResultatLigne;
  prixGrille: Centimes | null;
  premier: boolean;
  dernier: boolean;
  onChange: (modif: Partial<LignePrestation>) => void;
  onRevenirGrille: () => void;
  onMonter: () => void;
  onDescendre: () => void;
  onDupliquer: () => void;
  onSupprimer: () => void;
}) {
  const aide = ligne.aideSurface;
  const prixDifferent = prixGrille !== null && ligne.prixModifie && ligne.prixUnitaire !== prixGrille;

  return (
    <article className="carte-ligne" aria-label={`Ligne ${numero}`}>
      <header className="carte-ligne-entete">
        <span className={`etiquette-type type-${ligne.type}`}>
          {numero}. {LIBELLES_TYPE_LIGNE[ligne.type]}
        </span>
        <div className="boutons-ligne">
          <button type="button" className="bouton-icone" aria-label="Monter la ligne" disabled={premier} onClick={onMonter}>
            ↑
          </button>
          <button type="button" className="bouton-icone" aria-label="Descendre la ligne" disabled={dernier} onClick={onDescendre}>
            ↓
          </button>
          <button type="button" className="bouton-icone" aria-label="Dupliquer la ligne" onClick={onDupliquer}>
            ⧉
          </button>
          <button type="button" className="bouton-icone" aria-label="Supprimer la ligne" onClick={onSupprimer}>
            ✕
          </button>
        </div>
      </header>

      <ChampTexte label="Désignation" valeur={ligne.designation} onChange={(designation) => onChange({ designation })} />
      <ChampTexte
        label="Détail (ligne grise sous la désignation)"
        valeur={ligne.detail}
        placeholder="Méthode, matériel… (le nombre de passages est ajouté automatiquement)"
        onChange={(detail) => onChange({ detail })}
      />

      {ligne.type === 'nettoyage' && (
        <div className="aide-surface">
          <label className="case">
            <input
              type="checkbox"
              checked={aide !== undefined}
              onChange={(e) => onChange({ aideSurface: e.target.checked ? { nbModules: 0, surfaceModule: 0 } : undefined })}
            />
            Calculer la surface depuis le nombre de modules
          </label>
          {aide && (
            <div className="grille-champs">
              <ChampNombre
                label="Nombre de modules"
                entier
                valeur={aide.nbModules || null}
                onChange={(v) => {
                  const a = { ...aide, nbModules: v ?? 0 };
                  onChange({ aideSurface: a, quantite: surfaceModules(a.nbModules, a.surfaceModule) });
                }}
              />
              <ChampNombre
                label="Surface d'un module"
                suffixe="m²"
                valeur={aide.surfaceModule || null}
                onChange={(v) => {
                  const a = { ...aide, surfaceModule: v ?? 0 };
                  onChange({ aideSurface: a, quantite: surfaceModules(a.nbModules, a.surfaceModule) });
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="grille-champs grille-ligne">
        <ChampNombre
          label="Quantité"
          suffixe={uniteFixe(ligne) ? LIBELLES_UNITE[ligne.unite] : undefined}
          valeur={ligne.quantite}
          aide={
            aide && ligne.quantite > 0
              ? `${formatNombre(aide.nbModules, 0)} modules × ${formatNombre(aide.surfaceModule, 4)} m², arrondi au m²`
              : undefined
          }
          onChange={(v) => onChange({ quantite: v ?? 0, aideSurface: undefined })}
        />
        {ligne.unite === 'm2' && (ligne.type === 'nettoyage' || ligne.type === 'debroussaillage' || ligne.type === 'old') && (
          <ChampNombre label="soit en hectares" suffixe="ha" valeur={m2VersHa(ligne.quantite)} onChange={(v) => onChange({ quantite: haVersM2(v ?? 0), aideSurface: undefined })} />
        )}
        {ligne.unite === 'ha' && (
          <ChampNombre label="soit en m²" suffixe="m²" entier valeur={haVersM2(ligne.quantite)} onChange={(v) => onChange({ quantite: m2VersHa(v ?? 0) })} />
        )}
        {!uniteFixe(ligne) && (
          <ChampListe label="Unité" valeur={ligne.unite} options={UNITES} onChange={(u) => u && onChange({ unite: u })} />
        )}
        {ligne.type === 'old' && (
          <ChampListe label="Difficulté" valeur={ligne.difficulte ?? 'facile'} options={DIFFICULTES} onChange={(d) => d && onChange({ difficulte: d })} />
        )}
        <ChampNombre
          label="Nombre de passages"
          entier
          valeur={ligne.passages}
          onChange={(v) => onChange({ passages: v && v > 0 ? v : 1 })}
        />
      </div>

      <div className="ligne-prix">
        <ChampMontant
          label={`Prix unitaire HT${ligne.unite !== 'unite' && ligne.unite !== 'forfait' ? ` (par ${LIBELLES_UNITE[ligne.unite]})` : ''}`}
          suffixe="€"
          valeur={ligne.prixUnitaire}
          className={prixDifferent ? 'prix-modifie' : ''}
          aide={
            prixDifferent ? (
              <span>
                <span aria-hidden="true">✎ </span>Modifié à la main (grille : {formatEuros(prixGrille!)}).{' '}
                <button type="button" className="lien" onClick={onRevenirGrille}>
                  Revenir au prix de la grille
                </button>
              </span>
            ) : prixGrille !== null ? (
              'Prix de la grille'
            ) : undefined
          }
          onChange={(v) => {
            const prix = v ?? 0;
            onChange({ prixUnitaire: prix, prixModifie: prixGrille === null ? false : prix !== prixGrille });
          }}
        />
        <div className="total-ligne">
          <span className="aide">Total HT de la ligne</span>
          <strong>{formatEuros(resultat?.total ?? 0)}</strong>
          {resultat?.minimumApplique && <span className="aide">Montant minimum appliqué</span>}
        </div>
      </div>
    </article>
  );
}
