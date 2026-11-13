import { useId, useState, type ReactNode } from 'react';
import { formatEuros, formatNombre, lireMontant, lireNombre } from '../calcul/argent';
import type { Centimes } from '../modele/types';

interface Commun {
  label: string;
  aide?: ReactNode;
  erreur?: string | null;
  requis?: boolean;
  /** Affiche le badge « Valeur provisoire » avec un bouton « Confirmer ». */
  provisoire?: boolean;
  onConfirmer?: () => void;
  className?: string;
}

export function BadgeProvisoire({ onConfirmer }: { onConfirmer?: () => void }) {
  return (
    <span className="badge-provisoire">
      Valeur provisoire
      {onConfirmer && (
        <button type="button" className="lien" onClick={onConfirmer}>
          Confirmer
        </button>
      )}
    </span>
  );
}

function Cadre({ label, aide, erreur, requis, provisoire, onConfirmer, className, id, children }: Commun & { id: string; children: ReactNode }) {
  return (
    <div className={`champ ${provisoire ? 'champ-provisoire' : ''} ${erreur ? 'champ-erreur' : ''} ${className ?? ''}`}>
      <div className="champ-entete">
        <label htmlFor={id}>
          {label}
          {requis && <span className="requis" aria-label="obligatoire"> *</span>}
        </label>
        {provisoire && <BadgeProvisoire onConfirmer={onConfirmer} />}
      </div>
      {children}
      {erreur && <div className="message-erreur">{erreur}</div>}
      {aide && !erreur && <div className="aide">{aide}</div>}
    </div>
  );
}

export function ChampTexte(
  props: Commun & {
    valeur: string;
    onChange: (v: string) => void;
    type?: 'text' | 'email' | 'tel' | 'url';
    placeholder?: string;
    multiligne?: boolean;
    lignes?: number;
  },
) {
  const id = useId();
  const { valeur, onChange, type = 'text', placeholder, multiligne, lignes = 3 } = props;
  return (
    <Cadre {...props} id={id}>
      {multiligne ? (
        <textarea id={id} value={valeur} rows={lignes} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type={type} value={valeur} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Cadre>
  );
}

/**
 * Saisie d'un nombre à la française (virgule, espaces). La valeur est transmise
 * dès qu'elle est lisible ; elle est remise en forme quand on quitte le champ.
 */
function SaisieNombre({
  id,
  valeur,
  onChange,
  afficher,
  lire,
  suffixe,
  placeholder,
}: {
  id: string;
  valeur: number | null;
  onChange: (v: number | null) => void;
  afficher: (v: number) => string;
  lire: (t: string) => number | null;
  suffixe?: string;
  placeholder?: string;
}) {
  // Pendant la saisie, le texte tapé est gardé tel quel ; sinon la valeur est affichée mise en forme.
  const [saisie, setSaisie] = useState<string | null>(null);
  const texte = saisie ?? (valeur === null ? '' : afficher(valeur));

  return (
    <div className="saisie-nombre">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={texte}
        placeholder={placeholder}
        onFocus={() => setSaisie(texte)}
        onChange={(e) => {
          setSaisie(e.target.value);
          const t = e.target.value.trim();
          if (t === '') onChange(null);
          else {
            const n = lire(t);
            if (n !== null) onChange(n);
          }
        }}
        onBlur={() => setSaisie(null)}
      />
      {suffixe && <span className="suffixe">{suffixe}</span>}
    </div>
  );
}

export function ChampNombre(
  props: Commun & {
    valeur: number | null;
    onChange: (v: number | null) => void;
    suffixe?: string;
    decimales?: number;
    entier?: boolean;
    placeholder?: string;
  },
) {
  const id = useId();
  const { valeur, onChange, suffixe, decimales = 4, entier, placeholder } = props;
  const lire = (t: string) => {
    const n = lireNombre(t);
    if (n === null || n < 0) return null;
    return entier ? Math.round(n) : n;
  };
  return (
    <Cadre {...props} id={id}>
      <SaisieNombre
        id={id}
        valeur={valeur}
        onChange={onChange}
        afficher={(v) => formatNombre(v, entier ? 0 : decimales)}
        lire={lire}
        suffixe={suffixe}
        placeholder={placeholder}
      />
    </Cadre>
  );
}

const sansSymbole = (c: number) => formatEuros(c).replace(/ €$/, '');

/** Saisie d'un montant en euros, transmis en centimes. */
export function ChampMontant(
  props: Commun & {
    valeur: Centimes | null;
    onChange: (v: Centimes | null) => void;
    suffixe?: string;
    placeholder?: string;
  },
) {
  const id = useId();
  const { valeur, onChange, suffixe = '€ HT', placeholder } = props;
  return (
    <Cadre {...props} id={id}>
      <SaisieNombre
        id={id}
        valeur={valeur}
        onChange={onChange}
        afficher={sansSymbole}
        lire={(t) => {
          const c = lireMontant(t);
          return c === null || c < 0 ? null : c;
        }}
        suffixe={suffixe}
        placeholder={placeholder}
      />
    </Cadre>
  );
}

export function ChampListe<T extends string>(
  props: Commun & {
    valeur: T | '';
    onChange: (v: T | '') => void;
    options: { valeur: T; libelle: string }[];
    videLibelle?: string;
  },
) {
  const id = useId();
  const { valeur, onChange, options, videLibelle } = props;
  return (
    <Cadre {...props} id={id}>
      <select id={id} value={valeur} onChange={(e) => onChange(e.target.value as T | '')}>
        {videLibelle !== undefined && <option value="">{videLibelle}</option>}
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    </Cadre>
  );
}

/** Section d'écran avec titre, repliable. */
export function Section({
  titre,
  children,
  ouverte = true,
  droite,
  id,
}: {
  titre: string;
  children: ReactNode;
  ouverte?: boolean;
  droite?: ReactNode;
  id?: string;
}) {
  return (
    <details className="section" open={ouverte} id={id}>
      <summary>
        <span className="section-titre">{titre}</span>
        {droite && <span className="section-droite">{droite}</span>}
      </summary>
      <div className="section-contenu">{children}</div>
    </details>
  );
}
