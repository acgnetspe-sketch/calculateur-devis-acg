import { useState } from 'react';
import { alertesSite, champsManquants } from '../../calcul/alertes';
import { aujourdhui, finValidite, formatDate } from '../../calcul/dates';
import { calculerDevis } from '../../calcul/devis';
import { LIBELLES_INSTALLATION } from '../../calcul/grille';
import { creerLigne, objetDevis, prixGrillePourLigne, rafraichirLignes, revenirPrixGrille } from '../../calcul/prestations';
import { ChampListe, ChampMontant, ChampNombre, ChampTexte, Section } from '../../composants/Champs';
import { useDonnees } from '../../donnees/Donnees';
import { dupliquerDevis, enregistrerClient, enregistrerDevis, nouvelId, supprimerDevis, type Etat } from '../../donnees/stockage';
import { LIBELLES_STATUT } from '../../modele/libelles';
import type { Client, Devis, LignePrestation, PointEau, Statut, TypeInstallation, TypeLigne } from '../../modele/types';
import { EditeurLigne } from './EditeurLigne';
import { Recapitulatif } from './Recapitulatif';

const INSTALLATIONS = (Object.keys(LIBELLES_INSTALLATION) as TypeInstallation[]).map((t) => ({
  valeur: t,
  libelle: LIBELLES_INSTALLATION[t].charAt(0).toUpperCase() + LIBELLES_INSTALLATION[t].slice(1),
}));
const POINTS_EAU: { valeur: PointEau; libelle: string }[] = [
  { valeur: 'oui', libelle: 'Oui' },
  { valeur: 'non', libelle: 'Non' },
  { valeur: 'a_verifier', libelle: 'À vérifier' },
];
const STATUTS = (Object.keys(LIBELLES_STATUT) as Statut[]).map((s) => ({ valeur: s, libelle: LIBELLES_STATUT[s] }));
const CATALOGUE: { type: TypeLigne; libelle: string }[] = [
  { type: 'nettoyage', libelle: 'Nettoyage' },
  { type: 'debroussaillage', libelle: 'Débroussaillage intérieur' },
  { type: 'old', libelle: 'OLD' },
  { type: 'elagage', libelle: 'Élagage' },
  { type: 'libre', libelle: 'Ligne libre' },
];

const ACompleter = () => <span className="pastille-a-completer">à compléter</span>;

export function EcranDevis({ id, naviguer }: { id: string; naviguer: (adresse: string) => void }) {
  const { etat, modifier } = useDonnees();
  const devis = etat.devis.find((d) => d.id === id);
  const [nouveauClient, setNouveauClient] = useState<Client | null>(null);

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

  const grille = etat.grilles.find((g) => g.id === devis.grilleId) ?? etat.grilles[0];
  const client = etat.clients.find((c) => c.id === devis.clientId) ?? null;
  const resultat = calculerDevis(devis, etat.parametres);
  const manquants = champsManquants(client, devis.site, devis.lignes);
  const alertes = alertesSite(devis.site);
  const verrouille = devis.statut !== 'brouillon';

  /** Modifie le devis, puis remet à jour les prix et désignations qui suivent la grille. */
  const maj = (f: (d: Devis, e: Etat) => Devis) =>
    modifier((e) => {
      const actuel = e.devis.find((d) => d.id === id);
      if (!actuel) return e;
      const d = f(actuel, e);
      const g = e.grilles.find((x) => x.id === d.grilleId) ?? e.grilles[0];
      return enregistrerDevis(e, { ...d, lignes: rafraichirLignes(d.lignes, g, d.site, e.grilles) });
    });
  const majSite = (modif: Partial<Devis['site']>) => maj((d) => ({ ...d, site: { ...d.site, ...modif } }));
  const majLignes = (f: (l: LignePrestation[]) => LignePrestation[]) => maj((d) => ({ ...d, lignes: f(d.lignes) }));

  const choisirClient = (clientId: string | null, e: Etat, d: Devis): Devis => {
    const c = e.clients.find((x) => x.id === clientId);
    const grilleClient = c?.grilleParDefautId && e.grilles.some((g) => g.id === c.grilleParDefautId) ? c.grilleParDefautId : null;
    return { ...d, clientId, grilleId: grilleClient ?? d.grilleId };
  };

  const ajouterLigne = (type: TypeLigne, optionId?: string) =>
    maj((d, e) => {
      const g = e.grilles.find((x) => x.id === d.grilleId) ?? e.grilles[0];
      return { ...d, lignes: [...d.lignes, creerLigne(nouvelId(), type, g, d.site, { optionId })] };
    });

  const deplacer = (index: number, sens: -1 | 1) =>
    majLignes((l) => {
      const copie = [...l];
      [copie[index], copie[index + sens]] = [copie[index + sens], copie[index]];
      return copie;
    });

  const clientsTries = [...etat.clients].sort((a, b) => a.raisonSociale.localeCompare(b.raisonSociale, 'fr'));

  return (
    <div className="ecran ecran-devis">
      <header className="ecran-entete ecran-entete-ligne">
        <div>
          <a href="#/devis" className="lien-retour">
            ← Liste des devis
          </a>
          <h1>
            Devis {devis.numero} <span className={`statut statut-${devis.statut}`}>{LIBELLES_STATUT[devis.statut]}</span>
          </h1>
          <p className="aide">{objetDevis(devis.lignes, devis.site)}</p>
        </div>
        <div className="boutons">
          <button
            type="button"
            className="bouton secondaire"
            onClick={() => {
              const r = dupliquerDevis(etat, id, aujourdhui());
              if (!r.devis) return;
              modifier(() => r.etat);
              naviguer(`#/devis/${r.devis.id}`);
            }}
          >
            Dupliquer
          </button>
          <button
            type="button"
            className="bouton danger"
            onClick={() => {
              if (window.confirm(`Supprimer le devis ${devis.numero} ? Cette action est définitive.`)) {
                modifier((e) => supprimerDevis(e, id));
                naviguer('#/devis');
              }
            }}
          >
            Supprimer
          </button>
        </div>
      </header>

      {verrouille && (
        <div className="alerte alerte-attention">
          Ce devis est « {LIBELLES_STATUT[devis.statut]} ». Les modifications restent possibles, mais le client a peut-être déjà la version
          précédente : pensez à le dupliquer pour faire une nouvelle version.
        </div>
      )}

      <div className="mise-en-page-devis">
        <div className="colonne-blocs">
          {/* ---------- 1. Client ---------- */}
          <Section titre="1. Client" droite={!client || !client.adresseFacturation.trim() ? <ACompleter /> : undefined}>
            {nouveauClient ? (
              <div className="nouveau-client">
                <ChampTexte label="Raison sociale" requis valeur={nouveauClient.raisonSociale} onChange={(v) => setNouveauClient({ ...nouveauClient, raisonSociale: v })} />
                <ChampTexte
                  label="Adresse de facturation"
                  requis
                  multiligne
                  valeur={nouveauClient.adresseFacturation}
                  onChange={(v) => setNouveauClient({ ...nouveauClient, adresseFacturation: v })}
                />
                <div className="grille-champs">
                  <ChampTexte label="Contact – nom" valeur={nouveauClient.contactNom ?? ''} onChange={(v) => setNouveauClient({ ...nouveauClient, contactNom: v || undefined })} />
                  <ChampTexte label="E-mail" type="email" valeur={nouveauClient.email ?? ''} onChange={(v) => setNouveauClient({ ...nouveauClient, email: v || undefined })} />
                </div>
                <p className="aide">Les autres informations (SIRET, téléphone, grille par défaut) se complètent dans l'écran Clients.</p>
                <div className="boutons">
                  <button
                    type="button"
                    className="bouton principal"
                    disabled={!nouveauClient.raisonSociale.trim()}
                    onClick={() => {
                      const c = { ...nouveauClient, raisonSociale: nouveauClient.raisonSociale.trim() };
                      modifier((e) => enregistrerClient(e, c));
                      maj((d, e) => choisirClient(c.id, e, d));
                      setNouveauClient(null);
                    }}
                  >
                    Ajouter au carnet et choisir
                  </button>
                  <button type="button" className="bouton secondaire" onClick={() => setNouveauClient(null)}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="barre-outils">
                  <ChampListe
                    label="Client"
                    requis
                    valeur={devis.clientId ?? ''}
                    videLibelle={etat.clients.length ? '— Choisir dans le carnet —' : '— Carnet vide —'}
                    options={clientsTries.map((c) => ({ valeur: c.id, libelle: c.raisonSociale }))}
                    onChange={(v) => maj((d, e) => choisirClient(v || null, e, d))}
                  />
                  <div className="boutons">
                    <button
                      type="button"
                      className="bouton secondaire"
                      onClick={() => setNouveauClient({ id: nouvelId(), raisonSociale: '', adresseFacturation: '' })}
                    >
                      + Nouveau client
                    </button>
                  </div>
                </div>
                {client && (
                  <div className="fiche-resume">
                    <strong>{client.raisonSociale}</strong>
                    {client.contactNom && (
                      <div>
                        {client.contactNom}
                        {client.contactFonction ? ` – ${client.contactFonction}` : ''}
                      </div>
                    )}
                    {client.adresseFacturation ? (
                      <div className="adresse">{client.adresseFacturation}</div>
                    ) : (
                      <div className="pastille-attention">Adresse de facturation manquante</div>
                    )}
                    {(client.email || client.telephone) && <div className="aide">{[client.email, client.telephone].filter(Boolean).join(' · ')}</div>}
                    <a href="#/clients" className="lien">
                      Modifier dans le carnet de clients
                    </a>
                  </div>
                )}
              </>
            )}
          </Section>

          {/* ---------- 2. Site ---------- */}
          <Section
            titre="2. Site"
            droite={!devis.site.nomCentrale.trim() || !devis.site.commune.trim() || !devis.site.departement.trim() || !devis.site.typeInstallation ? <ACompleter /> : undefined}
          >
            <div className="grille-champs">
              <ChampTexte label="Nom de la centrale" requis valeur={devis.site.nomCentrale} onChange={(v) => majSite({ nomCentrale: v })} />
              <ChampTexte label="Commune" requis valeur={devis.site.commune} onChange={(v) => majSite({ commune: v })} />
              <ChampTexte label="Département" requis valeur={devis.site.departement} placeholder="Ex. : Aveyron" onChange={(v) => majSite({ departement: v })} />
              <ChampListe
                label="Type d'installation"
                requis
                valeur={devis.site.typeInstallation ?? ''}
                videLibelle="— Choisir —"
                options={INSTALLATIONS}
                aide="Détermine le prix du nettoyage (grille Grandes centrales)."
                onChange={(v) => majSite({ typeInstallation: v || null })}
              />
              <ChampListe
                label="Point d'eau sur site"
                valeur={devis.site.pointEau ?? ''}
                videLibelle="— Non renseigné —"
                options={POINTS_EAU}
                onChange={(v) => majSite({ pointEau: v || undefined })}
              />
              <ChampNombre
                label="Niveau d'encrassement (1 à 10)"
                entier
                valeur={devis.site.encrassement ?? null}
                aide="Pour information, sans effet sur le prix."
                onChange={(v) => majSite({ encrassement: v === null ? undefined : Math.min(10, Math.max(1, v)) })}
              />
              <ChampNombre label="Hauteur de toiture" suffixe="m" valeur={devis.site.hauteurToiture ?? null} onChange={(v) => majSite({ hauteurToiture: v ?? undefined })} />
              <ChampNombre label="Inclinaison" suffixe="°" valeur={devis.site.inclinaison ?? null} onChange={(v) => majSite({ inclinaison: v ?? undefined })} />
            </div>
            <ChampTexte
              label="Accès"
              multiligne
              lignes={2}
              valeur={devis.site.acces ?? ''}
              placeholder="Ex. : portail avec code, piste carrossable, clés à récupérer…"
              onChange={(v) => majSite({ acces: v || undefined })}
            />
            {alertes.map((a) => (
              <div key={a} className="alerte alerte-attention">
                ⚠ {a}
              </div>
            ))}
          </Section>

          {/* ---------- 3. Prestations ---------- */}
          <Section titre="3. Prestations" droite={devis.lignes.length === 0 ? <ACompleter /> : <span className="aide">{devis.lignes.length} ligne{devis.lignes.length > 1 ? 's' : ''}</span>}>
            <ChampListe
              label="Grille tarifaire"
              valeur={devis.grilleId}
              options={etat.grilles.map((g) => ({ valeur: g.id, libelle: g.nom }))}
              aide="Changer de grille met à jour les prix qui n'ont pas été modifiés à la main."
              onChange={(v) => v && maj((d) => ({ ...d, grilleId: v }))}
            />

            {devis.lignes.map((l, i) => (
              <EditeurLigne
                key={l.id}
                ligne={l}
                numero={i + 1}
                resultat={resultat.lignes[i]}
                prixGrille={prixGrillePourLigne(l, grille, devis.site)}
                premier={i === 0}
                dernier={i === devis.lignes.length - 1}
                onChange={(modif) => majLignes((ls) => ls.map((x) => (x.id === l.id ? { ...x, ...modif } : x)))}
                onRevenirGrille={() => maj((d, e) => {
                  const g = e.grilles.find((x) => x.id === d.grilleId) ?? e.grilles[0];
                  return { ...d, lignes: d.lignes.map((x) => (x.id === l.id ? revenirPrixGrille(x, g, d.site) : x)) };
                })}
                onMonter={() => deplacer(i, -1)}
                onDescendre={() => deplacer(i, 1)}
                onDupliquer={() => majLignes((ls) => [...ls.slice(0, i + 1), { ...structuredClone(l), id: nouvelId() }, ...ls.slice(i + 1)])}
                onSupprimer={() => {
                  if (window.confirm(`Supprimer la ligne ${i + 1}${l.designation ? ` « ${l.designation} »` : ''} ?`)) {
                    majLignes((ls) => ls.filter((x) => x.id !== l.id));
                  }
                }}
              />
            ))}

            <div className="catalogue">
              <span className="aide">Ajouter une ligne :</span>
              <div className="boutons">
                {CATALOGUE.map((c) => (
                  <button key={c.type} type="button" className="bouton secondaire" onClick={() => ajouterLigne(c.type)}>
                    + {c.libelle}
                  </button>
                ))}
                {grille.options.length > 0 && (
                  <select
                    className="bouton secondaire select-option"
                    aria-label="Ajouter une option"
                    value=""
                    onChange={(e) => e.target.value && ajouterLigne('option', e.target.value)}
                  >
                    <option value="">+ Option…</option>
                    {grille.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.libelle}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </Section>

          {/* ---------- 4. Conditions ---------- */}
          <Section titre="4. Conditions">
            <div className="grille-champs">
              <div className="champ">
                <div className="champ-entete">
                  <label htmlFor="date-emission">Date d'émission</label>
                </div>
                <input
                  id="date-emission"
                  type="date"
                  className="saisie-date"
                  value={devis.dateEmission}
                  onChange={(e) => e.target.value && maj((d) => ({ ...d, dateEmission: e.target.value }))}
                />
                <div className="aide">{formatDate(devis.dateEmission)}</div>
              </div>
              <ChampNombre
                label="Durée de validité"
                suffixe="jours"
                entier
                valeur={devis.validiteJours}
                aide={`Valable jusqu'au ${formatDate(finValidite(devis.dateEmission, devis.validiteJours))}`}
                onChange={(v) => maj((d) => ({ ...d, validiteJours: v ?? 0 }))}
              />
              <ChampListe label="Statut" valeur={devis.statut} options={STATUTS} onChange={(v) => v && maj((d) => ({ ...d, statut: v }))} />
              <ChampTexte
                label="Période d'intervention prévue"
                valeur={devis.periodeIntervention}
                placeholder="Ex. : mars – avril 2027"
                onChange={(v) => maj((d) => ({ ...d, periodeIntervention: v }))}
              />
            </div>
            <ChampTexte
              label="Conditions de paiement"
              multiligne
              lignes={2}
              valeur={devis.conditionsPaiement}
              provisoire={etat.parametres.provisoires.includes('textes.conditionsPaiement') && devis.conditionsPaiement === etat.parametres.textes.conditionsPaiement}
              onChange={(v) => maj((d) => ({ ...d, conditionsPaiement: v }))}
            />

            <div className="remise">
              <div className="champ">
                <div className="champ-entete">
                  <span className="label">Remise</span>
                </div>
                <div className="choix-segment" role="radiogroup" aria-label="Type de remise">
                  {(['pourcent', 'montant'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={devis.remise.type === t}
                      className={devis.remise.type === t ? 'actif' : ''}
                      onClick={() => maj((d) => ({ ...d, remise: { type: t, valeur: 0 } }))}
                    >
                      {t === 'pourcent' ? 'En %' : 'En €'}
                    </button>
                  ))}
                </div>
              </div>
              {devis.remise.type === 'pourcent' ? (
                <ChampNombre
                  label="Taux de remise"
                  suffixe="%"
                  valeur={devis.remise.valeur}
                  onChange={(v) => maj((d) => ({ ...d, remise: { type: 'pourcent', valeur: Math.min(100, v ?? 0) } }))}
                />
              ) : (
                <ChampMontant label="Montant de la remise" valeur={devis.remise.valeur} onChange={(v) => maj((d) => ({ ...d, remise: { type: 'montant', valeur: v ?? 0 } }))} />
              )}
            </div>

            <ChampTexte
              label="Notes pour le client (imprimées)"
              multiligne
              valeur={devis.notesClient}
              onChange={(v) => maj((d) => ({ ...d, notesClient: v }))}
            />
            <ChampTexte
              label="Notes internes (jamais imprimées)"
              multiligne
              className="note-interne"
              valeur={devis.notesInternes}
              onChange={(v) => maj((d) => ({ ...d, notesInternes: v }))}
            />
          </Section>
        </div>

        <Recapitulatif
          devis={devis}
          resultat={resultat}
          tauxTva={etat.parametres.tauxTva}
          rendements={etat.parametres.rendements.robots}
          manquants={manquants}
          alertes={alertes}
          onEstimation={(estimation) => maj((d) => ({ ...d, estimation }))}
          onApercu={() => naviguer(`#/devis/${id}/apercu`)}
        />
      </div>
    </div>
  );
}
