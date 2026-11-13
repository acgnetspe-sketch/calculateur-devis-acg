import { LIBELLES_INSTALLATION, LIBELLES_UNITE, verifierTranches } from '../calcul/grille';
import { ChampListe, ChampMontant, ChampNombre, ChampTexte } from '../composants/Champs';
import { nouvelId } from '../donnees/stockage';
import type { Difficulte, Grille, OptionGrille, TarifNettoyage, TypeInstallation, Unite } from '../modele/types';

const UNITES = (Object.keys(LIBELLES_UNITE) as Unite[]).map((u) => ({ valeur: u, libelle: LIBELLES_UNITE[u] }));
const INSTALLATIONS = Object.keys(LIBELLES_INSTALLATION) as TypeInstallation[];
const DIFFICULTES: { cle: Difficulte; libelle: string }[] = [
  { cle: 'facile', libelle: 'OLD – difficulté facile' },
  { cle: 'moyenne', libelle: 'OLD – difficulté moyenne' },
  { cle: 'difficile', libelle: 'OLD – difficulté difficile' },
];

const premiereMaj = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Barème vide de chaque mode, pour passer de l'un à l'autre. */
function tarifParDefaut(mode: TarifNettoyage['mode']): TarifNettoyage {
  return mode === 'parInstallation'
    ? { mode, prix: { sol: 25, trackers: 30, ombriere: 40, toiture: 60 } }
    : {
        mode,
        tranches: [
          { min: 100, max: 600, prix: 90 },
          { min: 601, max: 1500, prix: 85 },
          { min: 1501, max: null, prix: 80 },
        ],
      };
}

export function EditeurGrille({ grille, onChange }: { grille: Grille; onChange: (g: Grille) => void }) {
  const tarif = grille.nettoyage;
  const problemes = tarif.mode === 'parTranches' ? verifierTranches(tarif.tranches) : [];

  const majOption = (id: string, modif: Partial<OptionGrille>) =>
    onChange({ ...grille, options: grille.options.map((o) => (o.id === id ? { ...o, ...modif } : o)) });

  return (
    <div className="editeur-grille">
      <ChampTexte label="Nom de la grille" requis valeur={grille.nom} onChange={(nom) => onChange({ ...grille, nom })} />

      <h4>Nettoyage des modules</h4>
      <div className="choix-segment" role="radiogroup" aria-label="Mode de calcul du nettoyage">
        <button
          type="button"
          role="radio"
          aria-checked={tarif.mode === 'parInstallation'}
          className={tarif.mode === 'parInstallation' ? 'actif' : ''}
          onClick={() => tarif.mode !== 'parInstallation' && onChange({ ...grille, nettoyage: tarifParDefaut('parInstallation') })}
        >
          Prix selon le type d'installation
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={tarif.mode === 'parTranches'}
          className={tarif.mode === 'parTranches' ? 'actif' : ''}
          onClick={() => tarif.mode !== 'parTranches' && onChange({ ...grille, nettoyage: tarifParDefaut('parTranches') })}
        >
          Barème dégressif par surface
        </button>
      </div>

      {tarif.mode === 'parInstallation' ? (
        <div className="grille-champs">
          {INSTALLATIONS.map((inst) => (
            <ChampMontant
              key={inst}
              label={premiereMaj(LIBELLES_INSTALLATION[inst])}
              suffixe="€ HT / m²"
              valeur={tarif.prix[inst]}
              onChange={(v) => onChange({ ...grille, nettoyage: { ...tarif, prix: { ...tarif.prix, [inst]: v ?? 0 } } })}
            />
          ))}
        </div>
      ) : (
        <>
          <p className="aide">
            La tranche est choisie selon la surface totale de la ligne, et son prix s'applique à toute la surface. Le type
            d'installation n'intervient pas.
          </p>
          <table className="tableau tableau-tranches">
            <thead>
              <tr>
                <th>De (m²)</th>
                <th>À (m²)</th>
                <th>Prix € HT / m²</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {tarif.tranches.map((t, i) => {
                const maj = (modif: Partial<typeof t>) =>
                  onChange({
                    ...grille,
                    nettoyage: { ...tarif, tranches: tarif.tranches.map((x, j) => (j === i ? { ...x, ...modif } : x)) },
                  });
                return (
                  <tr key={i}>
                    <td>
                      <ChampNombre label={`Tranche ${i + 1}, de`} className="sans-label" entier valeur={t.min} onChange={(v) => maj({ min: v ?? 0 })} />
                    </td>
                    <td>
                      <ChampNombre
                        label={`Tranche ${i + 1}, à`}
                        className="sans-label"
                        entier
                        valeur={t.max}
                        placeholder="sans limite"
                        onChange={(v) => maj({ max: v })}
                      />
                    </td>
                    <td>
                      <ChampMontant label={`Tranche ${i + 1}, prix`} className="sans-label" suffixe="€" valeur={t.prix} onChange={(v) => maj({ prix: v ?? 0 })} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="bouton-icone"
                        aria-label={`Supprimer la tranche ${i + 1}`}
                        disabled={tarif.tranches.length <= 1}
                        onClick={() => onChange({ ...grille, nettoyage: { ...tarif, tranches: tarif.tranches.filter((_, j) => j !== i) } })}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="bouton secondaire"
            onClick={() => {
              const derniere = tarif.tranches[tarif.tranches.length - 1];
              const min = derniere?.max != null ? derniere.max + 1 : (derniere?.min ?? 0) + 1000;
              const tranches = tarif.tranches.map((t, j) => (j === tarif.tranches.length - 1 && t.max === null ? { ...t, max: min - 1 } : t));
              onChange({ ...grille, nettoyage: { ...tarif, tranches: [...tranches, { min, max: null, prix: derniere?.prix ?? 0 }] } });
            }}
          >
            + Ajouter une tranche
          </button>
          {problemes.length > 0 && (
            <ul className="alerte alerte-attention">
              {problemes.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </>
      )}

      <h4>Débroussaillage</h4>
      <div className="grille-champs">
        <ChampMontant
          label="Débroussaillage intérieur"
          suffixe="€ HT / ha"
          valeur={grille.debroussaillageHa}
          onChange={(v) => onChange({ ...grille, debroussaillageHa: v ?? 0 })}
        />
        {DIFFICULTES.map((d) => (
          <ChampMontant
            key={d.cle}
            label={d.libelle}
            suffixe="€ HT / ha"
            valeur={grille.oldHa[d.cle]}
            onChange={(v) => onChange({ ...grille, oldHa: { ...grille.oldHa, [d.cle]: v ?? 0 } })}
          />
        ))}
      </div>

      <h4>Élagage</h4>
      <div className="grille-champs">
        <ChampMontant
          label="Prix de l'élagage"
          suffixe="€ HT"
          valeur={grille.elagage.prix}
          provisoire={grille.elagage.provisoire}
          onConfirmer={() => onChange({ ...grille, elagage: { ...grille.elagage, provisoire: false } })}
          onChange={(v) => onChange({ ...grille, elagage: { ...grille.elagage, prix: v ?? 0, provisoire: false } })}
        />
        <ChampListe
          label="Unité"
          valeur={grille.elagage.unite}
          options={UNITES}
          onChange={(u) => u && onChange({ ...grille, elagage: { ...grille.elagage, unite: u } })}
        />
      </div>

      <h4>Options (déplacement, nacelle, eau…)</h4>
      <p className="aide">Un prix à 0 € reste modifiable dans chaque devis.</p>
      <div className="liste-options">
        {grille.options.map((o) => (
          <div className="ligne-option" key={o.id}>
            <ChampTexte label="Libellé" valeur={o.libelle} onChange={(libelle) => majOption(o.id, { libelle })} />
            <ChampListe label="Unité" valeur={o.unite} options={UNITES} onChange={(u) => u && majOption(o.id, { unite: u })} />
            <ChampMontant
              label="Prix"
              suffixe="€ HT"
              valeur={o.prix}
              provisoire={o.provisoire}
              onConfirmer={() => majOption(o.id, { provisoire: false })}
              onChange={(v) => majOption(o.id, { prix: v ?? 0, provisoire: false })}
            />
            <button
              type="button"
              className="bouton-icone"
              aria-label={`Supprimer l'option ${o.libelle}`}
              onClick={() => {
                if (window.confirm(`Supprimer l'option « ${o.libelle} » de cette grille ?`)) {
                  onChange({ ...grille, options: grille.options.filter((x) => x.id !== o.id) });
                }
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="bouton secondaire"
        onClick={() =>
          onChange({
            ...grille,
            options: [...grille.options, { id: nouvelId(), libelle: 'Nouvelle option', unite: 'forfait', prix: 0, provisoire: true }],
          })
        }
      >
        + Ajouter une option
      </button>
    </div>
  );
}
