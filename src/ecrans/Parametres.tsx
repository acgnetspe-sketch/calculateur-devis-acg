import { useState } from 'react';
import { annee, aujourdhui } from '../calcul/dates';
import { formatEuros } from '../calcul/argent';
import { prochainNumero } from '../calcul/numerotation';
import { BadgeProvisoire, ChampListe, ChampMontant, ChampNombre, ChampTexte, Section } from '../composants/Champs';
import { useDonnees } from '../donnees/Donnees';
import { dupliquerGrille, enregistrerGrille, supprimerGrille } from '../donnees/stockage';
import type { Entreprise, Parametres as TParametres } from '../modele/types';
import { EditeurGrille } from './EditeurGrille';
import { Sauvegarde } from './Sauvegarde';

const TAILLE_MAX_LOGO = 300 * 1024;

const CHAMPS_ENTREPRISE: { cle: keyof Entreprise; label: string; type?: 'email' | 'tel' | 'url'; aide?: string }[] = [
  { cle: 'nom', label: 'Dénomination' },
  { cle: 'forme', label: 'Forme juridique' },
  { cle: 'capital', label: 'Capital social (€)' },
  { cle: 'siege', label: 'Adresse du siège' },
  { cle: 'siren', label: 'SIREN' },
  { cle: 'siret', label: 'SIRET' },
  { cle: 'rcs', label: 'Ville du RCS' },
  { cle: 'tva', label: 'N° de TVA intracommunautaire' },
  { cle: 'telephone', label: 'Téléphone', type: 'tel' },
  { cle: 'email', label: 'E-mail', type: 'email' },
  { cle: 'siteWeb', label: 'Site web', type: 'url' },
];

export function Parametres() {
  const { etat, modifier } = useDonnees();
  const p = etat.parametres;
  const [grilleId, setGrilleId] = useState(p.grilleParDefautId);
  const grille = etat.grilles.find((g) => g.id === grilleId) ?? etat.grilles[0];
  const [erreurLogo, setErreurLogo] = useState<string | null>(null);

  const estProvisoire = (cle: string) => p.provisoires.includes(cle);
  /** Modifie les paramètres ; une valeur modifiée n'est plus « provisoire ». */
  const maj = (cle: string | null, f: (p: TParametres) => TParametres) =>
    modifier((e) => {
      const np = f(e.parametres);
      return { ...e, parametres: cle ? { ...np, provisoires: np.provisoires.filter((k) => k !== cle) } : np };
    });
  const confirmer = (cle: string) => maj(cle, (x) => x);

  const anneeCourante = annee(aujourdhui());
  const compteur = p.numerotation.compteurParAnnee[anneeCourante] ?? 0;
  const prochain = prochainNumero(p.numerotation.prefixe, anneeCourante, compteur, etat.devis.map((d) => d.numero)).numero;
  const nbProvisoires = p.provisoires.length + etat.grilles.reduce((n, g) => n + g.options.filter((o) => o.provisoire).length + (g.elagage.provisoire ? 1 : 0), 0);

  const lireLogo = (fichier: File | undefined) => {
    setErreurLogo(null);
    if (!fichier) return;
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(fichier.type)) {
      setErreurLogo('Format accepté : PNG, JPEG ou SVG.');
      return;
    }
    if (fichier.size > TAILLE_MAX_LOGO) {
      setErreurLogo('Fichier trop lourd : 300 Ko au maximum.');
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => maj(null, (x) => ({ ...x, entreprise: { ...x.entreprise, logo: String(lecteur.result) } }));
    lecteur.readAsDataURL(fichier);
  };

  return (
    <div className="ecran ecran-parametres">
      <header className="ecran-entete">
        <h1>Paramètres</h1>
        <p className="aide">Chaque modification est enregistrée automatiquement sur cet appareil.</p>
      </header>

      {nbProvisoires > 0 && (
        <div className="alerte alerte-attention">
          <strong>{nbProvisoires} valeur{nbProvisoires > 1 ? 's' : ''} provisoire{nbProvisoires > 1 ? 's' : ''}</strong> à confirmer avant
          d'envoyer un vrai devis (questions de la section 7 du cahier des charges). Elles sont signalées en jaune ci-dessous.
        </div>
      )}

      <Section titre="Entreprise et mentions légales">
        <div className="grille-champs">
          {CHAMPS_ENTREPRISE.map((c) => (
            <ChampTexte
              key={c.cle}
              label={c.label}
              type={c.type}
              valeur={String(p.entreprise[c.cle] ?? '')}
              provisoire={estProvisoire(`entreprise.${c.cle}`)}
              onConfirmer={() => confirmer(`entreprise.${c.cle}`)}
              onChange={(v) => maj(`entreprise.${c.cle}`, (x) => ({ ...x, entreprise: { ...x.entreprise, [c.cle]: v } }))}
            />
          ))}
        </div>
        <div className="champ">
          <div className="champ-entete">
            <span className="label">Logo (PNG, JPEG ou SVG, 300 Ko au maximum)</span>
          </div>
          <div className="logo-zone">
            {p.entreprise.logo ? (
              <img src={p.entreprise.logo} alt="Logo de l'entreprise" className="logo-apercu" />
            ) : (
              <div className="logo-defaut" aria-label="Logo par défaut">
                <span className="carre-jaune" /> ACG NET SPE
              </div>
            )}
            <label className="bouton secondaire">
              {p.entreprise.logo ? 'Changer le logo…' : 'Choisir un fichier…'}
              <input
                id="logo"
                type="file"
                className="masque"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={(e) => {
                  lireLogo(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
            {p.entreprise.logo && (
              <button type="button" className="bouton secondaire" onClick={() => maj(null, (x) => ({ ...x, entreprise: { ...x.entreprise, logo: undefined } }))}>
                Retirer le logo
              </button>
            )}
          </div>
          {erreurLogo ? <div className="message-erreur">{erreurLogo}</div> : <div className="aide">Sans logo, le PDF affiche le carré jaune et « ACG NET SPE ».</div>}
        </div>
      </Section>

      <Section titre="TVA, numérotation et validité">
        <div className="grille-champs">
          <ChampNombre label="Taux de TVA" suffixe="%" valeur={p.tauxTva} onChange={(v) => maj(null, (x) => ({ ...x, tauxTva: v ?? 0 }))} />
          <ChampNombre
            label="Durée de validité des devis"
            suffixe="jours"
            entier
            valeur={p.validiteJours}
            onChange={(v) => maj(null, (x) => ({ ...x, validiteJours: v ?? 30 }))}
          />
          <ChampTexte
            label="Préfixe des numéros"
            valeur={p.numerotation.prefixe}
            onChange={(v) => maj(null, (x) => ({ ...x, numerotation: { ...x.numerotation, prefixe: v.trim().toUpperCase() || 'DEV' } }))}
          />
          <ChampNombre
            label={`Dernier numéro utilisé en ${anneeCourante}`}
            entier
            valeur={compteur}
            aide={
              <>
                Prochain devis : <strong>{prochain}</strong>. À changer seulement si des devis ont déjà été faits hors de l'application.
              </>
            }
            onChange={(v) =>
              maj(null, (x) => ({
                ...x,
                numerotation: { ...x.numerotation, compteurParAnnee: { ...x.numerotation.compteurParAnnee, [anneeCourante]: v ?? 0 } },
              }))
            }
          />
        </div>
      </Section>

      <Section titre="Textes par défaut des devis">
        <ChampTexte
          label="Conditions de paiement"
          multiligne
          lignes={2}
          valeur={p.textes.conditionsPaiement}
          provisoire={estProvisoire('textes.conditionsPaiement')}
          onConfirmer={() => confirmer('textes.conditionsPaiement')}
          aide="Ex. : « 30 jours à réception de facture, sans acompte »."
          onChange={(v) => maj('textes.conditionsPaiement', (x) => ({ ...x, textes: { ...x.textes, conditionsPaiement: v } }))}
        />
        <ChampTexte label="Inclus" multiligne lignes={2} valeur={p.textes.inclus} onChange={(v) => maj(null, (x) => ({ ...x, textes: { ...x.textes, inclus: v } }))} />
        <ChampTexte label="Non inclus" multiligne lignes={2} valeur={p.textes.nonInclus} onChange={(v) => maj(null, (x) => ({ ...x, textes: { ...x.textes, nonInclus: v } }))} />
        <ChampTexte
          label="Pénalités de retard"
          multiligne
          lignes={3}
          valeur={p.textes.penalites}
          onChange={(v) => maj(null, (x) => ({ ...x, textes: { ...x.textes, penalites: v } }))}
        />
      </Section>

      <Section titre="Grilles tarifaires" droite={estProvisoire('grilles') ? <BadgeProvisoire /> : undefined}>
        {estProvisoire('grilles') && (
          <div className="alerte alerte-attention">
            Les prix de départ sont les repères 2025-2027, à confirmer (question 3).{' '}
            <button type="button" className="lien" onClick={() => confirmer('grilles')}>
              Confirmer les grilles
            </button>
          </div>
        )}
        <div className="barre-outils">
          <ChampListe
            label="Grille à modifier"
            valeur={grille.id}
            options={etat.grilles.map((g) => ({ valeur: g.id, libelle: g.nom || '(sans nom)' }))}
            onChange={(v) => v && setGrilleId(v)}
          />
          <div className="boutons">
            <button
              type="button"
              className="bouton secondaire"
              onClick={() => {
                const copie = dupliquerGrille(grille, `${grille.nom} (copie)`);
                modifier((e) => enregistrerGrille(e, copie));
                setGrilleId(copie.id);
              }}
            >
              Dupliquer en nouvelle grille
            </button>
            <button
              type="button"
              className="bouton danger"
              disabled={etat.grilles.length <= 1}
              title={etat.grilles.length <= 1 ? 'Il faut garder au moins une grille' : undefined}
              onClick={() => {
                if (window.confirm(`Supprimer la grille « ${grille.nom} » ? Les devis déjà faits gardent leurs prix.`)) {
                  modifier((e) => supprimerGrille(e, grille.id));
                  setGrilleId(etat.grilles.find((g) => g.id !== grille.id)!.id);
                }
              }}
            >
              Supprimer cette grille
            </button>
          </div>
        </div>
        <ChampListe
          label="Grille par défaut des nouveaux devis"
          aide="Utilisée quand le client n'a pas de grille par défaut."
          valeur={p.grilleParDefautId}
          options={etat.grilles.map((g) => ({ valeur: g.id, libelle: g.nom || '(sans nom)' }))}
          onChange={(v) => v && maj(null, (x) => ({ ...x, grilleParDefautId: v }))}
        />
        <EditeurGrille key={grille.id} grille={grille} onChange={(g) => modifier((e) => enregistrerGrille(e, g))} />
      </Section>

      <Section titre="Petits chantiers">
        <div className="grille-champs">
          <ChampMontant
            label="Montant minimum d'une ligne de nettoyage"
            valeur={p.montantMinimumNettoyage}
            provisoire={estProvisoire('montantMinimumNettoyage')}
            onConfirmer={() => confirmer('montantMinimumNettoyage')}
            aide={p.montantMinimumNettoyage === 0 ? 'À 0 €, aucun minimum ne s’applique (question 6).' : undefined}
            onChange={(v) => maj('montantMinimumNettoyage', (x) => ({ ...x, montantMinimumNettoyage: v ?? 0 }))}
          />
          <ChampNombre
            label="S'applique en dessous de"
            suffixe="m²"
            entier
            valeur={p.seuilMinimumM2}
            onChange={(v) => maj(null, (x) => ({ ...x, seuilMinimumM2: v ?? 100 }))}
          />
        </div>
      </Section>

      <Section titre="Rendements et estimation interne">
        <p className="aide">Ces valeurs servent seulement à l'estimation affichée à l'écran ; elles ne sont jamais imprimées.</p>
        <div className="grille-champs">
          <ChampNombre
            label="Rendement du robot L1"
            suffixe="m²/h"
            entier
            valeur={p.rendements.robots.L1}
            onChange={(v) => maj(null, (x) => ({ ...x, rendements: { ...x.rendements, robots: { ...x.rendements.robots, L1: v ?? 0 } } }))}
          />
          <ChampNombre
            label="Rendement du robot F1"
            suffixe="m²/h"
            entier
            valeur={p.rendements.robots.F1}
            aide="Repère : 1 000 à 1 600 m²/h."
            onChange={(v) => maj(null, (x) => ({ ...x, rendements: { ...x.rendements, robots: { ...x.rendements.robots, F1: v ?? 0 } } }))}
          />
          <ChampNombre
            label="Heures productives par jour"
            suffixe="h"
            valeur={p.rendements.heuresParJour}
            provisoire={estProvisoire('rendements.heuresParJour')}
            onConfirmer={() => confirmer('rendements.heuresParJour')}
            onChange={(v) => maj('rendements.heuresParJour', (x) => ({ ...x, rendements: { ...x.rendements, heuresParJour: v ?? 0 } }))}
          />
          <ChampNombre
            label="Rendement du débroussaillage"
            suffixe="ha/jour"
            valeur={p.rendements.haParJourDebroussaillage}
            placeholder="à définir"
            provisoire={estProvisoire('rendements.haParJourDebroussaillage')}
            onConfirmer={() => confirmer('rendements.haParJourDebroussaillage')}
            aide="Laisser vide tant qu'il n'est pas connu : l'estimation l'indiquera (question 9)."
            onChange={(v) => maj('rendements.haParJourDebroussaillage', (x) => ({ ...x, rendements: { ...x.rendements, haParJourDebroussaillage: v } }))}
          />
          <ChampNombre
            label="Jours travaillés par semaine"
            suffixe="jours"
            entier
            valeur={p.rendements.joursParSemaine}
            onChange={(v) => maj(null, (x) => ({ ...x, rendements: { ...x.rendements, joursParSemaine: v ?? 4 } }))}
          />
          <ChampMontant
            label="Panier par personne et par jour"
            suffixe="€"
            valeur={p.rendements.panierParPersonne}
            aide={`Actuellement ${formatEuros(p.rendements.panierParPersonne)}.`}
            onChange={(v) => maj(null, (x) => ({ ...x, rendements: { ...x.rendements, panierParPersonne: v ?? 0 } }))}
          />
          <ChampNombre
            label="Personnes par chantier (par défaut)"
            entier
            valeur={p.rendements.personnesParDefaut}
            onChange={(v) => maj(null, (x) => ({ ...x, rendements: { ...x.rendements, personnesParDefaut: v ?? 2 } }))}
          />
        </div>
      </Section>

      <Section titre="Sauvegarde" id="sauvegarde">
        <Sauvegarde />
      </Section>
    </div>
  );
}
