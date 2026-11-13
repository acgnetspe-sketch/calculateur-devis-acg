import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Fabrique sw.js au moment de la construction : la liste de tous les fichiers de l'application
 * (y compris ceux du PDF, chargés seulement à l'aperçu) et une version qui change à chaque modification.
 */
export function serviceWorker(): Plugin {
  return {
    name: 'acg-service-worker',
    apply: 'build',
    // Après Vite, pour que index.html fasse partie de la liste.
    enforce: 'post',
    generateBundle(_options, bundle) {
      const publics = readdirSync('public').filter((f) => !f.startsWith('.'));
      const construits = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const fichiers = [...new Set([...construits, ...publics])].sort().map((f) => `./${f}`);
      const empreinte = createHash('sha256');
      for (const f of Object.values(bundle)) {
        empreinte.update(f.fileName);
        empreinte.update(f.type === 'chunk' ? f.code : typeof f.source === 'string' ? f.source : Buffer.from(f.source));
      }
      for (const f of publics) empreinte.update(readFileSync(join('public', f)));
      const modele = readFileSync(join('hors-connexion', 'sw-modele.js'), 'utf8');
      empreinte.update(modele);
      const version = empreinte.digest('hex').slice(0, 12);
      const code = modele
        .replace('__VERSION__', version)
        .replace('__FICHIERS__', JSON.stringify(fichiers, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: code });
    },
  };
}
