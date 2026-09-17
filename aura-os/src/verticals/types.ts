/* Contrat d'un vertical. Le cœur ne connaît que ce type : il ne sait pas ce
   qu'est un camion de glace, un salon de coiffure ou un garage. */

export type TypeChamp =
  | 'texte' | 'tel' | 'url' | 'nombre' | 'image' | 'couleur' | 'choix' | 'horaires';

export type IdEcran = 'business' | 'brand' | 'products' | 'customers' | 'review';

export interface Champ {
  cle: string;
  libelle: string;
  type: TypeChamp;
  requis: boolean;
  ecran: IdEcran;
  options?: string[];
}

export interface Ecran {
  id: IdEcran;
  titre: string;
  sous: string;
}

export type ActionPublique = 'menu' | 'booking' | 'whatsapp' | 'avis';
export type TypeQR = 'page' | 'menu' | 'booking' | 'avis' | 'whatsapp';

export interface Vertical {
  id: string;
  nom: string;
  champs: Champ[];
  ecrans: Ecran[];
  actionsPubliques: ActionPublique[];
  qr: TypeQR[];
  mots: Record<string, string>;
  typesEvenement: string[];
}

/* Registre. Un seul vertical est opérationnel — c'est délibéré : le mandat
   interdit de préparer les interfaces des autres. Le registre existe pour que
   l'ajout du deuxième soit une ligne, pas une refonte. */
export const VERTICALS: Record<string, () => Promise<Vertical>> = {
  food: () => import('./food/index.js').then(m => m.food)
};

export async function chargerVertical(id: string): Promise<Vertical> {
  const charge = VERTICALS[id];
  if (!charge) throw new Error(`vertical inconnu : ${id}`);
  return charge();
}
