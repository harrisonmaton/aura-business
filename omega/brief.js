'use strict';
/* WHILE YOU SLEPT — le brief du matin, tiré du journal d'événements et de la
   file de tâches depuis le dernier brief. Chaque chiffre est un compte
   d'événements réels ; les revenus viennent de revenus.jsonl et de lui seul. */

const E = require('./core/etat.js');
const B = require('./core/evenements.js');
const Q = require('./worker/file-taches.js');
const F = require('./outreach/file.js');
const CRM = require('./crm/crm.js');
const CO = require('./comptes/orchestrateur.js');

function brief({maintenant = new Date().toISOString(), marquer = false} = {}){
  const dernier = E.lire('brief.json', {dernier: null}).dernier;
  const depuis = dernier || '1970-01-01T00:00:00.000Z';
  const ev = B.lire({depuis}).filter(e => e.ts <= maintenant);
  const n = t => ev.filter(e => e.type === t).length;
  const taches = Q.lire().filter(t => (t.finishedAt || t.historique[t.historique.length - 1].ts) > depuis);
  const revenus = CRM.lireRevenus().filter(r => r.enregistreLe > depuis && r.enregistreLe <= maintenant);
  const couts = taches.reduce((s, t) => s + (t.cout || 0), 0);
  const erreurs = taches.filter(t => ['FAILED', 'BLOCKED'].includes(t.status)).map(t => ({type: t.type, statut: t.status, motif: t.lastError}));
  const approbations = [
    ...F.lireFile().filter(m => m.statut === 'PREPARED').map(m => ({quoi: 'message', id: m.id, company: m.company})),
    ...F.lireFile().filter(m => m.statut === 'AWAITING_HUMAN_SEND').map(m => ({quoi: 'envoi manuel', id: m.id, company: m.company, lien: m.lien})),
    ...Q.lire().filter(t => t.status === 'NEEDS_APPROVAL').map(t => ({quoi: 'tâche', id: t.id, type: t.type, motif: t.historique[t.historique.length - 1].motif})),
    ...CO.etat().filter(c => c.attendHumain).map(c => ({quoi: 'compte', id: c.id, etape: c.suivante.titre, controle: c.suivante.controle})),
  ];
  const b = {
    titre: 'WHILE YOU SLEPT', depuis: dernier, jusqua: maintenant,
    agentsExecutes: [...new Set(taches.map(t => t.type))],
    tachesTerminees: taches.filter(t => t.status === 'DONE').length,
    nouvellesOpportunites: 0,
    prospectsTrouves: n('LEAD_FOUND'), prospectsQualifies: n('LEAD_QUALIFIED'),
    messagesPrepares: n('MESSAGE_PREPARED'), messagesEnvoyes: n('MESSAGE_SENT'),
    reponses: n('REPLY_RECEIVED'), ventes: n('PAYMENT_CONFIRMED'),
    revenu: revenus.reduce((s, r) => s + r.montant, 0), couts: Math.round(couts * 100) / 100,
    erreurs, sourcesBloquees: ev.filter(e => e.type === 'DATA_BLOCKED').length,
    approbations,
  };
  if(marquer) E.ecrire('brief.json', {dernier: maintenant});
  return b;
}

function texte(b){
  const L = [];
  L.push(b.titre + (b.depuis ? ' — depuis ' + b.depuis.slice(0, 16).replace('T', ' ') : ' — premier brief'));
  L.push('');
  L.push('Agents          ' + (b.agentsExecutes.join(', ') || 'aucun'));
  L.push('Tâches          ' + b.tachesTerminees + ' terminée(s), ' + b.erreurs.length + ' en échec ou bloquée(s)');
  L.push('Prospects       ' + b.prospectsTrouves + ' trouvé(s), ' + b.prospectsQualifies + ' qualifié(s)');
  L.push('Messages        ' + b.messagesPrepares + ' préparé(s), ' + b.messagesEnvoyes + ' envoyé(s)');
  L.push('Réponses        ' + b.reponses);
  L.push('Ventes          ' + b.ventes + ' — revenu enregistré ' + b.revenu + ' €');
  L.push('Coûts IA/API    ' + b.couts + ' €');
  for(const e of b.erreurs) L.push('  ✗ ' + e.type + ' ' + e.statut + ' — ' + e.motif);
  L.push('');
  L.push('À toi (' + b.approbations.length + ') :');
  for(const a of b.approbations.slice(0, 12)) L.push('  · ' + a.quoi + ' — ' + (a.company || a.type || a.id) + (a.etape ? ' : ' + a.etape : '') + (a.motif ? ' (' + a.motif + ')' : ''));
  if(b.approbations.length > 12) L.push('  … et ' + (b.approbations.length - 12) + ' de plus');
  return L.join('\n');
}

module.exports = {brief, texte};
