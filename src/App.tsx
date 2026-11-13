import { formatEuros, formatNombre } from './calcul/argent';
import { calculerDevis } from './calcul/devis';
import { surfaceModules } from './calcul/surface';
import { PARAMETRES_DEPART } from './modele/valeursDepart';

/** Page provisoire (étape 1) : vérifie le cas A dans le navigateur. Les écrans arrivent à l'étape 2. */
export default function App() {
  const surface = surfaceModules(40_277, 1.31);
  const { totaux } = calculerDevis(
    {
      lignes: [
        { id: 'a', type: 'nettoyage', designation: '', detail: '', quantite: surface, unite: 'm2', passages: 1, prixUnitaire: 25, prixModifie: false },
      ],
      remise: { type: 'pourcent', valeur: 0 },
      estimation: { robot: 'L1', personnes: 2 },
    },
    PARAMETRES_DEPART,
  );
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, color: '#0B1E2D' }}>
      <h1>Calculateur de devis ACG NET SPE</h1>
      <p>En construction : le moteur de calcul est prêt, les écrans arrivent à l’étape 2.</p>
      <h2>Vérification – cas A</h2>
      <ul>
        <li>Surface : {formatNombre(surface)} m²</li>
        <li>Total HT : {formatEuros(totaux.totalHt)}</li>
        <li>TVA : {formatEuros(totaux.tva)}</li>
        <li>TTC : {formatEuros(totaux.ttc)}</li>
      </ul>
    </main>
  );
}
