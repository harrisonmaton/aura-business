'use strict';
/* CommerceProvider — une seule interface pour vendre, quel que soit le
   moyen : boutique numérique, prestation, e-commerce. Aucune plateforme
   n'est implémentée « pour plus tard » : deux fournisseurs, dont un réel.

   Interface :
     id, types[]          ('service' | 'numerique' | 'physique')
     statut()             → {statut: 'PRET' | 'NOT_CONFIGURED', manque}
     creerLienPaiement(c) → {statut, lien?, instructions?}
     confirmer(c, preuve) → revenu enregistré (CRM) ou refus */

const CRM = require('../crm/crm.js');

const manuel = {
  id: 'paiement-manuel', types: ['service', 'numerique'],
  statut: () => ({statut: 'PRET', manque: null}),
  /* Le moyen de paiement (virement, lien de la banque, Payconiq…) est une
     décision et un compte du propriétaire : JARVIS ne l'invente pas. */
  creerLienPaiement(c){
    return {statut: 'HUMAN_CHECKPOINT', raison: 'paiement', instructions: 'La maison envoie ses coordonnées de paiement au client pour ' + c.montant + ' € (' + c.produit + '), puis enregistre le paiement avec sa preuve.'};
  },
  confirmer(c, preuve, {attribution = 'ASSISTE', maintenant} = {}){
    return CRM.enregistrerPaiement({lead: c.lead, montant: c.montant, venture: c.venture, opportunite: c.opportunite, source: 'paiement-manuel', preuve, attribution, type: c.type || 'achat'}, {maintenant});
  },
};

/* Stripe : le noyau (server/boutique.js) sait déjà vérifier une signature
   de webhook et accorder un accès. Il manque le sandbox et un hébergement. */
const stripe = {
  id: 'stripe', types: ['numerique', 'service'],
  statut: () => process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET
    ? {statut: 'PRET', manque: null}
    : {statut: 'NOT_CONFIGURED', manque: 'sandbox Stripe + hébergement public pour le webhook (portes « stripe-sandbox » et « hebergement »)'},
  creerLienPaiement(){ return {statut: 'NOT_CONFIGURED', raison: this.statut().manque}; },
  confirmer(){ throw new Error('Stripe non configuré : un paiement se confirme par webhook signé, pas à la main'); },
};

const FOURNISSEURS = {manuel, stripe};
function choisir(type = 'service'){
  return Object.values(FOURNISSEURS).find(f => f.types.includes(type) && f.statut().statut === 'PRET') || null;
}

module.exports = {FOURNISSEURS, choisir};
