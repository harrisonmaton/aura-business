'use strict';
/* Connecteurs — interfaces sans dépendance dure.

   JARVIS parle à des rôles (boîte mail, agenda, CRM, paiement…), jamais
   directement à un fournisseur. Chaque rôle déclare ses opérations et ce
   qui l'active. Tant qu'un rôle n'est pas branché, le module qui en a besoin
   bascule sur sa voie humaine (HUMAN CHECKPOINT) au lieu d'échouer.

   Les connecteurs MCP de la session Claude (Gmail, Calendar, Drive, Notion,
   Supabase…) ne sont pas appelables depuis un processus Node : ils seront
   branchés par un pont (worker lancé par l'agent) ou par des clés d'API
   dédiées. Aucun n'est branché aujourd'hui. */

const ROLES = {
  email:     {operations: ['envoyer', 'lireReponses'], active: 'OMEGA_EMAIL_CONNECTEUR (gmail | smtp)', repli: 'file d\'approbation + copier-coller des réponses'},
  agenda:    {operations: ['proposerCreneaux', 'creerRendezVous'], active: 'OMEGA_AGENDA_CONNECTEUR', repli: 'le propriétaire propose un créneau'},
  github:    {operations: ['ouvrirTicket', 'lireCI'], active: 'GITHUB_TOKEN', repli: 'journal local'},
  stockage:  {operations: ['deposerLivrable', 'partagerLien'], active: 'OMEGA_STOCKAGE_CONNECTEUR (drive | s3)', repli: 'livraison par message privé'},
  crm:       {operations: ['synchroniserProspect', 'synchroniserEtape'], active: 'OMEGA_CRM_CONNECTEUR (notion | hubspot)', repli: 'CRM local omega/etat/leads.json'},
  ecommerce: {operations: ['creerProduit', 'lireCommandes'], active: 'OMEGA_ECOMMERCE_CONNECTEUR', repli: 'CommerceProvider paiement-manuel'},
  paiements: {operations: ['creerLien', 'webhook'], active: 'STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET', repli: 'paiement manuel avec preuve'},
  analytique:{operations: ['compterVisites', 'compterClics'], active: 'OMEGA_ANALYTIQUE_CONNECTEUR (plausible | umami)', repli: 'références dans les messages pré-remplis'},
};

function statut(env = process.env){
  return Object.entries(ROLES).map(([role, r]) => {
    const vars = r.active.split(/\s*\+\s*/).map(v => v.split(' ')[0]);
    const branche = vars.every(v => env[v]);
    return {role, statut: branche ? 'CONFIGURED' : 'NOT_CONFIGURED', active: r.active, repli: r.repli, operations: r.operations};
  });
}

module.exports = {ROLES, statut};
