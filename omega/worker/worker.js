#!/usr/bin/env node
'use strict';
/* OMEGA WORKER — tourne sur un Mac ou un serveur, sans interface.

     node omega/worker/worker.js --once      planifie, vide la file, s'arrête
     node omega/worker/worker.js --boucle    tourne en continu (tick toutes les 60 s)

   Auto-réparation : exception → nouvel essai avec attente exponentielle ;
   source indisponible → BLOCKED avec le motif ; tâche trop longue → coupée
   au délai et retentée ; worker tué → bail expiré, tâche reprise par le
   suivant. Rien ne se perd sans laisser d'état final. */

const os = require('os');
const Q = require('./file-taches.js');
const P = require('./planificateur.js');
const {TACHES, autorise} = require('./taches.js');
const E = require('../core/etat.js');

const ID = os.hostname() + ':' + process.pid;
const DELAI_MS = 5 * 60 * 1000;

async function executer(t, {maintenant = new Date().toISOString(), delaiMs = DELAI_MS} = {}){
  const def = TACHES[t.type];
  let minuteur;
  try {
    const r = await Promise.race([
      def.executer(t.parametres || {}, {maintenant}),
      new Promise((_, rej) => { minuteur = setTimeout(() => rej(new Error('délai dépassé (' + delaiMs + ' ms)')), delaiMs); }),
    ]);
    Q.terminer(t.id, {resultat: r, cout: (r && r.cout) || 0, maintenant});
    return {id: t.id, type: t.type, statut: 'DONE', resultat: r};
  } catch(e){
    const x = Q.echouer(t.id, e.message, {bloque: !!e.bloque, maintenant});
    return {id: t.id, type: t.type, statut: x.status, erreur: e.message};
  } finally { clearTimeout(minuteur); }
}

async function vider({maintenant, max = 50, delaiMs} = {}){
  const mode = E.lire('mode.json', {mode: 'STANDARD'}).mode;
  const faits = [];
  for(let i = 0; i < max; i++){
    const now = maintenant || new Date().toISOString();
    const t = Q.prendre(ID, {maintenant: now, autorise: x => autorise(x, {maintenant: now, mode})});
    if(!t) break;
    faits.push(await executer(t, {maintenant: now, delaiMs}));
  }
  return faits;
}

async function une({maintenant} = {}){
  const planifies = P.tick({maintenant});
  const faits = await vider({maintenant});
  E.ajouterLigne('worker.jsonl', {ts: new Date().toISOString(), worker: ID, planifies, faits: faits.map(f => ({type: f.type, statut: f.statut, erreur: f.erreur}))});
  return {planifies, faits};
}

if(require.main === module){
  const boucle = process.argv.includes('--boucle');
  (async () => {
    do {
      try {
        const r = await une();
        console.log(new Date().toISOString(), 'planifiés :', r.planifies.join(', ') || '—', '| exécutés :', r.faits.map(f => f.type + '=' + f.statut).join(', ') || '—');
      } catch(e){ console.error('cycle en échec, reprise au suivant :', e.message); }
      if(boucle) await new Promise(r => setTimeout(r, 60000));
    } while(boucle);
  })();
}

module.exports = {executer, vider, une, ID};
