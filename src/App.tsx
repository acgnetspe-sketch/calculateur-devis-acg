import { useEffect, useState } from 'react';
import { useDonnees } from './donnees/Donnees';
import { Clients } from './ecrans/Clients';
import { Apercu } from './ecrans/Apercu';
import { EcranDevis } from './ecrans/devis/EcranDevis';
import { ListeDevis } from './ecrans/ListeDevis';
import { Parametres } from './ecrans/Parametres';

type Page = 'devis' | 'clients' | 'parametres';

const PAGES: { page: Page; libelle: string; icone: string }[] = [
  { page: 'devis', libelle: 'Devis', icone: '📄' },
  { page: 'clients', libelle: 'Clients', icone: '👥' },
  { page: 'parametres', libelle: 'Paramètres', icone: '⚙️' },
];

interface Adresse {
  page: Page;
  /** Identifiant du devis ouvert (#/devis/<id>). */
  devisId?: string;
  /** Aperçu du PDF (#/devis/<id>/apercu). */
  apercu?: boolean;
}

/** Page affichée, lue dans l'adresse (#/clients, #/devis/<id>) pour que le bouton « retour » fonctionne. */
function lireAdresse(): Adresse {
  const [p, id, sous] = window.location.hash.replace(/^#\/?/, '').split('/');
  if (p === 'devis' && id) return { page: 'devis', devisId: decodeURIComponent(id), apercu: sous === 'apercu' };
  return { page: PAGES.some((x) => x.page === p) ? (p as Page) : 'devis' };
}

function naviguer(adresse: string) {
  window.location.hash = adresse;
}

export default function App() {
  const [adresse, setAdresse] = useState<Adresse>(lireAdresse);
  const page = adresse.page;
  const { enregistrementOk } = useDonnees();

  useEffect(() => {
    const ecouter = () => setAdresse(lireAdresse());
    window.addEventListener('hashchange', ecouter);
    return () => window.removeEventListener('hashchange', ecouter);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page, adresse.devisId, adresse.apercu]);

  return (
    <div className="app">
      <nav className="menu" aria-label="Menu principal">
        <a className="marque" href="#/devis">
          <span className="carre-jaune" aria-hidden="true" />
          <span>ACG NET SPE</span>
        </a>
        <ul>
          {PAGES.map((p) => (
            <li key={p.page}>
              <a href={`#/${p.page}`} className={page === p.page ? 'actif' : ''} aria-current={page === p.page ? 'page' : undefined}>
                <span className="menu-icone" aria-hidden="true">
                  {p.icone}
                </span>
                <span>{p.libelle}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {!enregistrementOk && (
        <div className="alerte alerte-erreur bandeau">
          Attention : les données n'ont pas pu être enregistrées sur cet appareil (stockage plein ou navigation privée).
        </div>
      )}
      <main className="contenu">
        {page === 'devis' && !adresse.devisId && <ListeDevis naviguer={naviguer} />}
        {page === 'devis' && adresse.devisId && !adresse.apercu && <EcranDevis key={adresse.devisId} id={adresse.devisId} naviguer={naviguer} />}
        {page === 'devis' && adresse.devisId && adresse.apercu && <Apercu key={adresse.devisId} id={adresse.devisId} naviguer={naviguer} />}
        {page === 'clients' && <Clients />}
        {page === 'parametres' && <Parametres />}
      </main>
    </div>
  );
}
