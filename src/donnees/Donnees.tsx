import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { charger, enregistrer, type Etat } from './stockage';

interface ContexteDonnees {
  etat: Etat;
  /** Applique une modification ; elle est enregistrée aussitôt dans le navigateur. */
  modifier: (operation: (etat: Etat) => Etat) => void;
  /** Faux si le dernier enregistrement a échoué. */
  enregistrementOk: boolean;
}

const Contexte = createContext<ContexteDonnees | null>(null);

function stockageNavigateur(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function FournisseurDonnees({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<Etat>(() => charger(stockageNavigateur()));
  const [enregistrementOk, setEnregistrementOk] = useState(true);

  useEffect(() => {
    setEnregistrementOk(enregistrer(stockageNavigateur(), etat));
  }, [etat]);

  const modifier = useCallback((operation: (e: Etat) => Etat) => setEtat((e) => operation(e)), []);

  return <Contexte.Provider value={{ etat, modifier, enregistrementOk }}>{children}</Contexte.Provider>;
}

export function useDonnees(): ContexteDonnees {
  const c = useContext(Contexte);
  if (!c) throw new Error('useDonnees doit être utilisé dans FournisseurDonnees');
  return c;
}
