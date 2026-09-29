'use strict';
/* Bus d'événements monétaires. Journal append-only (evenements.jsonl) : c'est
   la mémoire de ce qui s'est réellement passé, et la source du brief du matin.
   Les modules s'abonnent aux types qui les concernent ; un abonné qui plante
   n'empêche ni l'écriture de l'événement ni les autres abonnés. */

const E = require('./etat.js');

const TYPES = [
  'LEAD_FOUND', 'LEAD_QUALIFIED', 'MESSAGE_PREPARED', 'MESSAGE_APPROVED', 'MESSAGE_SKIPPED',
  'MESSAGE_SENT', 'REPLY_RECEIVED', 'STAGE_CHANGED', 'SALE_CREATED', 'PAYMENT_CONFIRMED',
  'FULFILLMENT_STARTED', 'FULFILLMENT_COMPLETED', 'REFUND',
  'TASK_DONE', 'TASK_FAILED', 'TASK_BLOCKED', 'APPROVAL_NEEDED', 'DATA_BLOCKED', 'DO_NOT_CONTACT',
];

const abonnes = new Map();

function abonner(type, fn){
  if(!abonnes.has(type)) abonnes.set(type, []);
  abonnes.get(type).push(fn);
  return () => abonnes.set(type, abonnes.get(type).filter(f => f !== fn));
}

function emettre(type, donnees = {}, {maintenant} = {}){
  if(!TYPES.includes(type)) throw new Error('type d\'événement inconnu : ' + type);
  const ev = {id: E.identifiant('ev'), type, ts: maintenant || new Date().toISOString(), donnees};
  E.ajouterLigne('evenements.jsonl', ev);
  for(const fn of abonnes.get(type) || []){
    try { fn(ev); } catch(e){ E.ajouterLigne('erreurs.jsonl', {ts: ev.ts, abonne: type, erreur: e.message}); }
  }
  return ev;
}

function lire({depuis, types} = {}){
  return E.lireLignes('evenements.jsonl')
    .filter(e => (!depuis || e.ts > depuis) && (!types || types.includes(e.type)));
}

module.exports = {TYPES, abonner, emettre, lire};
