'use strict';
/* Évaluation des agents à partir de ce qu'ils ont réellement fait dans la
   file de tâches. La contribution économique n'est comptée que si elle se
   rattache à un revenu enregistré (le prospect trouvé par le hunter a payé) ;
   sinon elle vaut UNKNOWN, pas zéro et pas « probablement beaucoup ». */

const T = require('./worker/file-taches.js');
const E = require('./core/etat.js');

const SEUIL_COUT_MOYEN = 0.05;   // € par tâche au-delà duquel un agent sans contribution est examiné
const MIN_TACHES = 10;

function evaluer(){
  const {TACHES} = require('./worker/taches.js');
  const taches = T.lire().filter(t => ['DONE', 'FAILED', 'BLOCKED'].includes(t.status));
  const revenus = E.lireLignes('revenus.jsonl');
  const leads = E.lire('leads.json', {leads: {}}).leads;
  const parAgent = {};
  for(const t of taches){
    const def = TACHES[t.type];
    const agent = def ? def.agent : 'inconnu';
    const a = parAgent[agent] = parAgent[agent] || {agent, taches: 0, reussies: 0, cout: 0, dureeMs: 0, types: new Set()};
    a.taches++; a.types.add(t.type); a.cout += t.cout || 0;
    if(t.status === 'DONE'){ a.reussies++; a.dureeMs += t.dureeMs || 0; }
  }
  /* Seule attribution défendable aujourd'hui : un revenu dont le client est
     un prospect trouvé par le hunter est ASSISTÉ par le hunter. */
  const revHunter = revenus.filter(r => r.montant > 0 && leads[r.client]).reduce((s, r) => s + r.montant, 0);
  return Object.values(parAgent).map(a => {
    const contribution = a.agent === 'hunter' ? (revHunter > 0 ? {euros: revHunter, attribution: 'ASSISTE'} : {euros: null, attribution: 'UNKNOWN'}) : {euros: null, attribution: 'UNKNOWN'};
    const coutMoyen = a.taches ? a.cout / a.taches : 0;
    let recommandation = 'KEEP', motif = 'coût négligeable ou échantillon trop petit';
    if(a.taches >= MIN_TACHES && a.reussies / a.taches < 0.5){ recommandation = 'REVIEW'; motif = 'taux de réussite ' + Math.round(a.reussies / a.taches * 100) + ' %'; }
    if(a.taches >= MIN_TACHES && coutMoyen > SEUIL_COUT_MOYEN && !contribution.euros){ recommandation = 'DISABLE'; motif = 'coûte ' + coutMoyen.toFixed(3) + ' €/tâche sans contribution rattachée à un revenu'; }
    return {agent: a.agent, tasksCompleted: a.reussies, taches: a.taches, successRate: a.taches ? Math.round(a.reussies / a.taches * 100) / 100 : null,
      averageCost: Math.round(coutMoyen * 1000) / 1000, averageLatencyMs: a.reussies ? Math.round(a.dureeMs / a.reussies) : null,
      economicContribution: contribution, valeurParCalcul: contribution.euros && a.cout ? Math.round(contribution.euros / a.cout) : 'UNKNOWN',
      types: [...a.types], recommandation, motif};
  });
}

module.exports = {evaluer, SEUIL_COUT_MOYEN, MIN_TACHES};
