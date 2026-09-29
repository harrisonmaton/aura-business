'use strict';
/* NIGHT SHIFT — ce qui tourne sans qu'on le demande.

   HOURLY  : santé des sources, file vérifiée par le worker lui-même
   NIGHTLY : analyse de l'expérience, recherche de prospects, préparation
             des messages, évaluation des agents, décision consignée
   WEEKLY  : revue du capital, veille frontier

   En mode FIRST CUSTOMER, les tâches secondaires ne sont pas planifiées. */

const Q = require('./file-taches.js');
const {TACHES} = require('./taches.js');
const E = require('../core/etat.js');

const JOBS = [
  {id: 'sante', frequence: 'HOURLY', type: 'sante.reseau', priorite: 3, maxCost: 0},
  {id: 'analyse', frequence: 'NIGHTLY', type: 'experience.analyser', priorite: 6, maxCost: 0},
  {id: 'chasse', frequence: 'NIGHTLY', type: 'premier-client.chasser', priorite: 9, maxCost: 0.05},
  {id: 'preparation', frequence: 'NIGHTLY', type: 'premier-client.preparer', priorite: 8, maxCost: 0.05, apres: 'chasse'},
  {id: 'agents', frequence: 'NIGHTLY', type: 'agents.evaluer', priorite: 4, maxCost: 0},
  {id: 'decision', frequence: 'NIGHTLY', type: 'moteur.decider', priorite: 7, maxCost: 0},
  {id: 'rafraichir', frequence: 'NIGHTLY', type: 'data.rafraichir', priorite: 2, maxCost: 0.05},
  {id: 'capital', frequence: 'WEEKLY', type: 'capital.revue', priorite: 2, maxCost: 0},
  {id: 'frontier', frequence: 'WEEKLY', type: 'frontier.scan', priorite: 1, maxCost: 0.2},
];

function periode(j, d){
  const iso = d.toISOString();
  if(j.frequence === 'HOURLY') return iso.slice(0, 13);
  if(j.frequence === 'NIGHTLY') return iso.slice(0, 10);
  const lundi = new Date(d); lundi.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return 'S' + lundi.toISOString().slice(0, 10);
}

/* Met en file les jobs dus. Idempotent : la clé contient la période. */
function tick({maintenant = new Date().toISOString(), heureNuit = 2} = {}){
  const d = new Date(maintenant);
  const mode = E.lire('mode.json', {mode: 'STANDARD'}).mode;
  const ajoutes = [];
  for(const j of JOBS){
    if(mode === 'FIRST_CUSTOMER' && !TACHES[j.type].premierClient) continue;
    if(j.frequence !== 'HOURLY' && d.getUTCHours() < heureNuit) continue;
    const cle = j.id + ':' + periode(j, d);
    const avant = Q.lire().length;
    const t = Q.ajouter({type: j.type, priorite: j.priorite, maxCost: j.maxCost, cle, nuit: j.frequence !== 'HOURLY', venture: 'aura'}, {maintenant});
    if(Q.lire().length > avant) ajoutes.push(t.type);
  }
  return ajoutes;
}

module.exports = {JOBS, tick};
