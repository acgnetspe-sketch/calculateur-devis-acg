import { useMemo, useState } from 'react';
import { siretValide } from '../calcul/alertes';
import { formatEuros } from '../calcul/argent';
import { formatDate } from '../calcul/dates';
import { calculerDevis } from '../calcul/devis';
import { ChampListe, ChampTexte } from '../composants/Champs';
import { useDonnees } from '../donnees/Donnees';
import { enregistrerClient, nouvelId, supprimerClient } from '../donnees/stockage';
import { LIBELLES_STATUT } from '../modele/libelles';
import type { Client } from '../modele/types';

const clientVide = (): Client => ({ id: nouvelId(), raisonSociale: '', adresseFacturation: '' });

const normaliserTexte = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function Clients() {
  const { etat, modifier } = useDonnees();
  const [recherche, setRecherche] = useState('');
  const [brouillon, setBrouillon] = useState<Client | null>(null);
  const [tentative, setTentative] = useState(false);

  const clientsTries = useMemo(() => {
    const r = normaliserTexte(recherche.trim());
    return [...etat.clients]
      .filter((c) => !r || normaliserTexte(`${c.raisonSociale} ${c.contactNom ?? ''} ${c.adresseFacturation}`).includes(r))
      .sort((a, b) => a.raisonSociale.localeCompare(b.raisonSociale, 'fr'));
  }, [etat.clients, recherche]);

  const nouveau = brouillon !== null && !etat.clients.some((c) => c.id === brouillon.id);
  const original = brouillon && etat.clients.find((c) => c.id === brouillon.id);
  const modifie =
    brouillon !== null &&
    (nouveau
      ? Object.entries(brouillon).some(([cle, v]) => cle !== 'id' && typeof v === 'string' && v.trim() !== '')
      : JSON.stringify(original) !== JSON.stringify(brouillon));

  const ouvrir = (c: Client | null) => {
    if (modifie && !window.confirm('Les modifications de ce client ne sont pas enregistrées. Les abandonner ?')) return;
    setBrouillon(c ? structuredClone(c) : clientVide());
    setTentative(false);
  };

  const erreurs = brouillon
    ? {
        raisonSociale: brouillon.raisonSociale.trim() === '' ? 'La raison sociale est obligatoire.' : null,
        adresse: brouillon.adresseFacturation.trim() === '' ? 'Obligatoire pour générer le PDF du devis.' : null,
        siret: siretValide(brouillon.siret) ? null : 'Le SIRET doit comporter 14 chiffres.',
        email: brouillon.email && !/^\S+@\S+\.\S+$/.test(brouillon.email.trim()) ? 'Adresse e-mail incomplète.' : null,
      }
    : null;

  const enregistrer = () => {
    if (!brouillon || !erreurs) return;
    setTentative(true);
    if (erreurs.raisonSociale || erreurs.siret) return;
    const propre: Client = {
      ...brouillon,
      raisonSociale: brouillon.raisonSociale.trim(),
      siret: brouillon.siret ? brouillon.siret.replace(/\s/g, '') : undefined,
    };
    modifier((e) => enregistrerClient(e, propre));
    setBrouillon(propre);
    setTentative(false);
  };

  const devisDuClient = brouillon ? etat.devis.filter((d) => d.clientId === brouillon.id) : [];

  const supprimer = () => {
    if (!brouillon) return;
    const n = devisDuClient.length;
    const message =
      n > 0
        ? `Supprimer « ${brouillon.raisonSociale} » ? ${n} devis ${n > 1 ? 'resteront' : 'restera'} enregistré${n > 1 ? 's' : ''} mais sans client.`
        : `Supprimer « ${brouillon.raisonSociale} » du carnet ?`;
    if (!window.confirm(message)) return;
    modifier((e) => ({ ...supprimerClient(e, brouillon.id), devis: e.devis.map((d) => (d.clientId === brouillon.id ? { ...d, clientId: null } : d)) }));
    setBrouillon(null);
  };

  const maj = (modif: Partial<Client>) => setBrouillon((b) => (b ? { ...b, ...modif } : b));
  const vide = (v: string) => (v === '' ? undefined : v);

  return (
    <div className="ecran ecran-clients">
      <header className="ecran-entete ecran-entete-ligne">
        <h1>Clients</h1>
        <button type="button" className="bouton principal" onClick={() => ouvrir(null)}>
          + Nouveau client
        </button>
      </header>

      <div className={`deux-colonnes ${brouillon ? 'avec-fiche' : ''}`}>
        <section className="colonne-liste" aria-label="Carnet d'adresses">
          <input
            type="search"
            className="recherche"
            placeholder="Rechercher un client, un contact, une ville…"
            aria-label="Rechercher un client"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          {etat.clients.length === 0 ? (
            <p className="vide">Aucun client pour l'instant. Touchez « Nouveau client » pour commencer.</p>
          ) : clientsTries.length === 0 ? (
            <p className="vide">Aucun client ne correspond à « {recherche} ».</p>
          ) : (
            <ul className="liste-clients">
              {clientsTries.map((c) => {
                const nbDevis = etat.devis.filter((d) => d.clientId === c.id).length;
                return (
                  <li key={c.id}>
                    <button type="button" className={`carte-client ${brouillon?.id === c.id ? 'selectionne' : ''}`} onClick={() => ouvrir(c)}>
                      <span className="carte-titre">{c.raisonSociale}</span>
                      <span className="carte-detail">
                        {[c.contactNom, c.adresseFacturation.split('\n').pop()].filter(Boolean).join(' · ') || '—'}
                      </span>
                      <span className="carte-detail">
                        {nbDevis} devis{!c.adresseFacturation.trim() && <span className="pastille-attention"> adresse manquante</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {brouillon && erreurs && (
          <section className="colonne-fiche" aria-label="Fiche client">
            <h2>{nouveau ? 'Nouveau client' : original?.raisonSociale || 'Client'}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enregistrer();
              }}
            >
              <ChampTexte
                label="Raison sociale"
                requis
                valeur={brouillon.raisonSociale}
                placeholder="Ex. : société de projet de la centrale"
                erreur={tentative ? erreurs.raisonSociale : null}
                onChange={(v) => maj({ raisonSociale: v })}
              />
              <div className="grille-champs">
                <ChampTexte label="Contact – nom" valeur={brouillon.contactNom ?? ''} onChange={(v) => maj({ contactNom: vide(v) })} />
                <ChampTexte label="Contact – fonction" valeur={brouillon.contactFonction ?? ''} onChange={(v) => maj({ contactFonction: vide(v) })} />
              </div>
              <ChampTexte
                label="Adresse de facturation"
                requis
                multiligne
                lignes={3}
                valeur={brouillon.adresseFacturation}
                erreur={erreurs.adresse && (tentative || !nouveau) ? erreurs.adresse : null}
                onChange={(v) => maj({ adresseFacturation: v })}
              />
              <div className="grille-champs">
                <ChampTexte label="E-mail" type="email" valeur={brouillon.email ?? ''} erreur={erreurs.email} onChange={(v) => maj({ email: vide(v) })} />
                <ChampTexte label="Téléphone" type="tel" valeur={brouillon.telephone ?? ''} onChange={(v) => maj({ telephone: vide(v) })} />
                <ChampTexte
                  label="SIRET"
                  valeur={brouillon.siret ?? ''}
                  placeholder="14 chiffres"
                  erreur={(brouillon.siret ?? '').length > 0 || tentative ? erreurs.siret : null}
                  onChange={(v) => maj({ siret: vide(v) })}
                />
                <ChampListe
                  label="Grille tarifaire par défaut"
                  valeur={brouillon.grilleParDefautId ?? ''}
                  videLibelle="Grille par défaut de l'application"
                  options={etat.grilles.map((g) => ({ valeur: g.id, libelle: g.nom }))}
                  aide="Pré-remplit les prix de ses devis."
                  onChange={(v) => maj({ grilleParDefautId: v || undefined })}
                />
              </div>

              <div className="boutons boutons-fiche">
                <button type="submit" className="bouton principal" disabled={!modifie}>
                  {nouveau ? 'Ajouter le client' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  className="bouton secondaire"
                  onClick={() => {
                    if (modifie && !window.confirm('Abandonner les modifications ?')) return;
                    setBrouillon(nouveau || !modifie ? null : structuredClone(original!));
                    setTentative(false);
                  }}
                >
                  {nouveau ? 'Annuler' : modifie ? 'Annuler les modifications' : 'Fermer'}
                </button>
                {!nouveau && (
                  <button type="button" className="bouton danger" onClick={supprimer}>
                    Supprimer
                  </button>
                )}
              </div>
              {!modifie && !nouveau && <p className="aide">Fiche enregistrée.</p>}
            </form>

            {!nouveau && (
              <div className="devis-du-client">
                <h3>Ses devis</h3>
                {devisDuClient.length === 0 ? (
                  <p className="vide">Aucun devis pour ce client.</p>
                ) : (
                  <table className="tableau">
                    <thead>
                      <tr>
                        <th>Numéro</th>
                        <th>Date</th>
                        <th>Site</th>
                        <th className="nombre">Montant HT</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devisDuClient.map((d) => (
                        <tr key={d.id}>
                          <td>{d.numero}</td>
                          <td>{formatDate(d.dateEmission)}</td>
                          <td>{d.site.nomCentrale}</td>
                          <td className="nombre">{formatEuros(calculerDevis(d, etat.parametres).totaux.totalHt)}</td>
                          <td>{LIBELLES_STATUT[d.statut]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
