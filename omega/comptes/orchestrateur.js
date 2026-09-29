'use strict';
/* Orchestrateur d'ouverture de comptes.

   COMPTE NÉCESSAIRE → préparer les informations → (naviguer si permis)
   → remplir les champs non sensibles (si permis) → POINT DE CONTRÔLE HUMAIN
   si KYC, CAPTCHA, acceptation de conditions, confirmation d'identité ou
   paiement → reprise.

   Ce module ne crée aucun compte et n'automatise aucune inscription : il
   tient le plan, ce qui est prêt, et l'étape exacte où l'humain doit agir.
   Il n'existe aucun chemin pour contourner un KYC ou un CAPTCHA, ni pour
   ouvrir un compte au nom de quelqu'un d'autre. */

const E = require('../core/etat.js');

const CONTROLES = ['KYC', 'CAPTCHA', 'CONDITIONS', 'IDENTITE', 'PAIEMENT'];

const PLANS = {
  'kbo-opendata': {pourquoi: 'registre belge des entreprises en lecture locale (prospects BE)', porte: null, etapes: [
    {id: 'preparer', type: 'AUTO', titre: 'Préparer : adresse email de la maison, usage déclaré « prospection B2B locale »'},
    {id: 'inscription', type: 'HUMAN_CHECKPOINT', controle: 'CONDITIONS', titre: 'S\'inscrire au portail open data de la BCE et accepter les conditions'},
    {id: 'telecharger', type: 'HUMAN_CHECKPOINT', controle: 'IDENTITE', titre: 'Télécharger l\'extrait complet (connexion requise)'},
    {id: 'brancher', type: 'AUTO', titre: 'Décompresser, pointer OMEGA_KBO_DIR, lancer `omega chasser`'},
  ]},
  'hebergement': {pourquoi: 'rendre la landing et le webhook joignables', porte: 'hebergement', etapes: [
    {id: 'preparer', type: 'AUTO', titre: 'Préparer la landing (genesis) et la configuration de déploiement statique'},
    {id: 'compte', type: 'HUMAN_CHECKPOINT', controle: 'CONDITIONS', titre: 'Créer le compte d\'hébergement (ex. Cloudflare Pages ou Vercel, offre gratuite) et accepter les conditions'},
    {id: 'jeton', type: 'HUMAN_CHECKPOINT', controle: 'IDENTITE', titre: 'Générer un jeton de déploiement et le poser en variable d\'environnement (jamais dans le dépôt)'},
    {id: 'deployer', type: 'AUTO', titre: 'Déployer la landing, vérifier l\'URL publique'},
  ]},
  'stripe-sandbox': {pourquoi: 'encaissement en ligne', porte: 'stripe-sandbox', etapes: [
    {id: 'sandbox', type: 'HUMAN_CHECKPOINT', controle: 'KYC', titre: 'Ouvrir un sandbox depuis le tableau de bord Stripe (compte réel déjà existant)'},
    {id: 'cles', type: 'HUMAN_CHECKPOINT', controle: 'IDENTITE', titre: 'Poser STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET de test côté serveur'},
    {id: 'webhook', type: 'AUTO', titre: 'Brancher server/boutique.js sur la route webhook, test de bout en bout en mode test'},
  ]},
  'email-connecteur': {pourquoi: 'envoyer et lire les réponses sans copier-coller', porte: null, etapes: [
    {id: 'choisir', type: 'AUTO', titre: 'Proposer la boîte à utiliser (adresse de la maison, pas une adresse personnelle)'},
    {id: 'autoriser', type: 'HUMAN_CHECKPOINT', controle: 'IDENTITE', titre: 'Autoriser l\'accès (OAuth) à la boîte de la maison'},
    {id: 'brancher', type: 'AUTO', titre: 'Définir OMEGA_EMAIL_CONNECTEUR, envoyer un message de test à la maison elle-même'},
  ]},
};

function lire(){ return E.lire('comptes.json', {progression: {}}).progression; }

function etat(){
  const prog = lire();
  return Object.entries(PLANS).map(([id, p]) => {
    const faites = new Set(prog[id] || []);
    const suivante = p.etapes.find(e => !faites.has(e.id)) || null;
    return {id, pourquoi: p.pourquoi, porte: p.porte, fait: faites.size, total: p.etapes.length,
      suivante, attendHumain: !!(suivante && suivante.type === 'HUMAN_CHECKPOINT'), termine: !suivante};
  });
}

/* Marquer une étape faite. Une étape de contrôle humain ne peut être marquée
   que par l'humain (par: 'humain'), jamais par un worker. */
function marquer(compte, etape, {par} = {}){
  const plan = PLANS[compte];
  if(!plan) throw new Error('compte inconnu : ' + compte);
  const e = plan.etapes.find(x => x.id === etape);
  if(!e) throw new Error('étape inconnue : ' + etape);
  if(e.type === 'HUMAN_CHECKPOINT' && par !== 'humain') throw new Error('étape ' + e.controle + ' : seul un humain peut la valider');
  const idx = plan.etapes.indexOf(e);
  const prog = lire();
  const faites = new Set(prog[compte] || []);
  const manquante = plan.etapes.slice(0, idx).find(x => !faites.has(x.id));
  if(manquante) throw new Error('étape précédente non faite : ' + manquante.id);
  E.modifier('comptes.json', {progression: {}}, x => { x.progression[compte] = [...new Set((x.progression[compte] || []).concat(etape))]; });
  return etat().find(x => x.id === compte);
}

module.exports = {PLANS, CONTROLES, etat, marquer};
