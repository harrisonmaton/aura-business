/* ═══════════════════════════════════════════════════════════════════════════
   Vertical « food »

   Un vertical est de la CONFIGURATION, pas du code métier. Il décrit ce que le
   commerce déclare, ce que sa page publique propose et ce que son tableau de
   bord met en avant. Le cœur ne sait pas ce qu'est un camion de glace : il sait
   lire ce fichier.

   C'est la condition pour qu'ajouter « beauté » ou « automobile » plus tard
   soit une extension et non un second produit. Toute logique qui ne
   s'exprimerait pas ici finirait par contaminer le cœur — c'est exactement ce
   qu'on cherche à éviter.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Vertical } from '../types';

export const food: Vertical = {
  id: 'food',
  nom: 'Food & food truck',

  /* Ce que le commerce peut décrire de lui-même. `requis` n'est vrai que pour
     ce sans quoi la page publique n'a aucun sens : tout le reste se complète
     plus tard depuis les réglages. Chaque champ obligatoire de plus est un
     commerçant qui abandonne l'inscription. */
  champs: [
    { cle: 'nom',         libelle: 'Nom du commerce',   type: 'texte',    requis: true,  ecran: 'business' },
    { cle: 'description', libelle: 'En une phrase',     type: 'texte',    requis: false, ecran: 'business' },
    { cle: 'ville',       libelle: 'Ville',             type: 'texte',    requis: true,  ecran: 'business' },
    { cle: 'telephone',   libelle: 'Téléphone',         type: 'tel',      requis: false, ecran: 'business' },
    { cle: 'whatsapp',    libelle: 'WhatsApp',          type: 'tel',      requis: false, ecran: 'customers' },
    { cle: 'instagram',   libelle: 'Instagram',         type: 'texte',    requis: false, ecran: 'business' },
    { cle: 'logo_url',    libelle: 'Logo',              type: 'image',    requis: false, ecran: 'brand' },
    { cle: 'couleur',     libelle: 'Couleur dominante', type: 'couleur',  requis: false, ecran: 'brand' },
    { cle: 'style',       libelle: 'Style',             type: 'choix',    requis: false, ecran: 'brand',
      options: ['gourmand', 'artisanal', 'rétro', 'tropical', 'minimal', 'premium'] },
    { cle: 'horaires',    libelle: 'Horaires',          type: 'horaires', requis: false, ecran: 'customers' },
    { cle: 'zone_km',     libelle: 'Déplacement max',   type: 'nombre',   requis: false, ecran: 'customers' },
    { cle: 'avis_url',    libelle: 'Lien avis Google',  type: 'url',      requis: false, ecran: 'customers' }
  ],

  /* Les cinq écrans validés. La divulgation progressive se joue à l'intérieur
     de chacun : on montre l'essentiel, le reste est repliable. */
  ecrans: [
    { id: 'business',  titre: 'Votre commerce',  sous: 'Le strict nécessaire pour exister en ligne.' },
    { id: 'brand',     titre: 'Votre identité',  sous: 'Logo, couleur, ambiance. Tout est facultatif.' },
    { id: 'products',  titre: 'Votre carte',     sous: 'Ce que vous vendez, et à quel prix.' },
    { id: 'customers', titre: 'Vos clients',     sous: 'Comment ils vous joignent et vous réservent.' },
    { id: 'review',    titre: 'Aperçu',          sous: 'Un dernier coup d’œil, puis on publie.' }
  ],

  /* Les appels à l'action de la page publique, dans l'ordre d'importance pour
     quelqu'un debout devant un camion, téléphone en main. */
  actionsPubliques: ['menu', 'booking', 'whatsapp', 'avis'],

  /* Les QR imprimables du pilote. */
  qr: ['page', 'menu', 'booking', 'avis', 'whatsapp'],

  /* Le vocabulaire du métier. Ailleurs on dirait « prestation » ou « véhicule ». */
  mots: {
    produit: 'produit',
    produits: 'produits',
    categorie: 'catégorie',
    demande: 'demande',
    demandes: 'demandes',
    evenement: 'événement',
    reserver: 'Réserver le camion'
  },

  /* Types d'événements proposés dans le formulaire de réservation. */
  typesEvenement: [
    'Anniversaire', 'Mariage', 'Entreprise', 'École',
    'Festival', 'Association', 'Autre'
  ]
};

export default food;
