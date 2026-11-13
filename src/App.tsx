import { useEffect, useState } from 'react';
import { useDonnees } from './donnees/Donnees';
import { Clients } from './ecrans/Clients';
import { ListeDevis } from './ecrans/ListeDevis';
import { Parametres } from './ecrans/Parametres';

type Page = 'devis' | 'clients' | 'parametres';

const PAGES: { page: Page; libelle: string; icone: string }[] = [
  { page: 'devis', libelle: 'Devis', icone: '📄' },
  { page: 'clients', libelle: 'Clients', icone: '👥' },
  { page: 'parametres', libelle: 'Paramètres', icone: '⚙️' },
];

/** Page affichée, lue dans l'adresse (#/clients) pour que le bouton « retour » fonctionne. */
function pageDepuisAdresse(): Page {
  const p = window.location.hash.replace(/^#\/?/, '');
  return PAGES.some((x) => x.page === p) ? (p as Page) : 'devis';
}

export default function App() {
  const [page, setPage] = useState<Page>(pageDepuisAdresse);
  const { enregistrementOk } = useDonnees();

  useEffect(() => {
    const ecouter = () => setPage(pageDepuisAdresse());
    window.addEventListener('hashchange', ecouter);
    return () => window.removeEventListener('hashchange', ecouter);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

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
        {page === 'devis' && <ListeDevis />}
        {page === 'clients' && <Clients />}
        {page === 'parametres' && <Parametres />}
      </main>
    </div>
  );
}
