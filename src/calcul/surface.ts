import { arrondir } from './argent';

export const M2_PAR_HA = 10_000;

/** Nombre de modules × surface d'un module, arrondi au m² le plus proche. */
export function surfaceModules(nbModules: number, surfaceModule: number): number {
  return arrondir(nbModules * surfaceModule);
}

export function m2VersHa(m2: number): number {
  return Number((m2 / M2_PAR_HA).toFixed(6));
}

export function haVersM2(ha: number): number {
  return Number((ha * M2_PAR_HA).toFixed(6));
}
