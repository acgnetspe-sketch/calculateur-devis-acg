import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { FournisseurDonnees } from './donnees/Donnees';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FournisseurDonnees>
      <App />
    </FournisseurDonnees>
  </StrictMode>,
);
