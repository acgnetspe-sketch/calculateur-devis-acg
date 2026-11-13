import type { Client, Devis, Parametres } from '../modele/types';
import { PARAMETRES_DEPART } from '../modele/valeursDepart';

/** Cas A du cahier des charges, prêt à mettre en PDF (sert aux tests). */
export function donneesCasA(): { devis: Devis; client: Client; parametres: Parametres } {
  const client: Client = {
    id: 'c1',
    raisonSociale: 'SPV Les Cazes Énergie',
    contactNom: 'Marie Durand',
    contactFonction: "Responsable d'exploitation",
    adresseFacturation: '12 avenue de la Gare\n12400 Saint-Affrique',
  };
  const devis: Devis = {
    id: 'd1',
    numero: 'DEV-2026-001',
    statut: 'brouillon',
    dateEmission: '2026-11-13',
    validiteJours: 30,
    clientId: 'c1',
    site: { nomCentrale: 'Les Cazes', commune: 'Saint-Affrique', departement: 'Aveyron', typeInstallation: 'sol', pointEau: 'a_verifier', acces: 'Piste carrossable, portail à code' },
    grilleId: 'grandes-centrales',
    lignes: [
      {
        id: 'l1',
        type: 'nettoyage',
        designation: 'Nettoyage des modules photovoltaïques – sol fixe',
        detail: 'Nettoyage mécanisé par robot, eau déminéralisée',
        quantite: 52_763,
        unite: 'm2',
        passages: 1,
        aideSurface: { nbModules: 40_277, surfaceModule: 1.31 },
        prixUnitaire: 25,
        prixModifie: false,
      },
    ],
    remise: { type: 'pourcent', valeur: 0 },
    conditionsPaiement: PARAMETRES_DEPART.textes.conditionsPaiement,
    periodeIntervention: 'mars – avril 2027',
    notesClient: '',
    notesInternes: 'NOTE INTERNE SECRETE',
    estimation: { robot: 'L1', personnes: 2 },
    creeLe: '2026-11-13T09:00:00Z',
    modifieLe: '2026-11-13T09:00:00Z',
  };
  return { devis, client, parametres: structuredClone(PARAMETRES_DEPART) };
}
