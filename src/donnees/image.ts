/** Côté le plus long d'un logo enregistré, en pixels : net à l'écran et dans le PDF, sans alourdir les données. */
export const LOGO_TAILLE_MAX = 700;

/**
 * Lit une image choisie par l'utilisateur (photo de l'iPad, PNG, JPEG, SVG…) et la réduit si besoin.
 * Renvoie une image PNG (transparence conservée) prête à être enregistrée.
 */
export async function reduireImage(fichier: File, tailleMax = LOGO_TAILLE_MAX): Promise<string> {
  const url = URL.createObjectURL(fichier);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const largeur = img.naturalWidth || tailleMax;
    const hauteur = img.naturalHeight || tailleMax;
    const echelle = Math.min(1, tailleMax / Math.max(largeur, hauteur));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(largeur * echelle));
    canvas.height = Math.max(1, Math.round(hauteur * echelle));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
