'use strict';
/* La boucle qui ferme le mandat : ce qui arrive réellement (messages envoyés,
   réponses, paiements, minutes de production mesurées) redevient une entrée
   du moteur de décision. Le registre versionné ne change pas ; on lui ajoute,
   au moment de décider, les observations et résultats tirés de l'état. */

const fs = require('fs');
const path = require('path');
const M = require('./moteur.js');
const E = require('./core/etat.js');
const F = require('./outreach/file.js');
const CRM = require('./crm/crm.js');
const K = require('./fulfillment/chrono.js');

const REGISTRE = () => process.env.OMEGA_REGISTRE || path.join(__dirname, 'registre.json');
function lireRegistre(){ return JSON.parse(fs.readFileSync(REGISTRE(), 'utf8')); }

function observations(opp, reg){
  const o = reg.opportunites.find(x => x.id === opp);
  const envoyes = F.lireFile().filter(m => m.opportunite === opp && m.statut === 'SENT').sort((a, b) => a.envoyeLe.localeCompare(b.envoyeLe));
  const leads = CRM.lireLeads();
  const achats = CRM.lireRevenus().filter(r => r.opportunite === opp && r.type === 'achat').sort((a, b) => a.enregistreLe.localeCompare(b.enregistreLe));
  const reponses = envoyes.filter(m => ((leads[m.lead] || {}).conversation || []).some(c => c.type === 'reponse')).length;
  const obs = {contactes: envoyes.length, reponses, ventes: new Set(achats.map(a => a.client)).size};
  const k = K.mesures(opp);
  if(k) Object.assign(obs, k);
  /* Test réussi → la suite compte à partir de la vente qui l'a fait réussir. */
  const objectif = o && o.prochainTest.mesure && o.prochainTest.mesure.ventes;
  if(objectif && obs.ventes >= objectif){
    const clients = [...new Set(achats.map(a => a.client))];
    const pivot = achats.find(a => a.client === clients[objectif - 1]).enregistreLe;
    obs.suite = {
      contactes: envoyes.filter(m => m.envoyeLe > pivot).length,
      ventes: new Set(achats.filter(a => a.enregistreLe > pivot).map(a => a.client)).size,
    };
  }
  return obs;
}

/* Résultats sur l'échelle de preuve, chacun avec sa source dans l'état. */
function resultats(reg){
  const out = [];
  const leads = CRM.lireLeads();
  const ids = new Set(reg.opportunites.map(o => o.id));
  for(const l of Object.values(leads)){
    if(!ids.has(l.opportunite)) continue;
    for(const c of l.conversation || []){
      if(c.type === 'reponse' && c.intention === 'positif')
        out.push({opportunite: l.opportunite, date: c.ts.slice(0, 10), niveau: 0, montant: 0, source: 'omega/etat leads.json ' + l.id + ' réponse ' + c.ts, attribution: 'ASSISTE'});
      if(c.type === 'etape' && c.a === 'QUALIFIED')
        out.push({opportunite: l.opportunite, date: c.ts.slice(0, 10), niveau: 1, montant: 0, source: 'omega/etat leads.json ' + l.id + ' rendez-vous ' + c.ts, attribution: 'ASSISTE'});
    }
  }
  const achatsParClient = {};
  for(const r of CRM.lireRevenus().filter(r => ids.has(r.opportunite)).sort((a, b) => a.enregistreLe.localeCompare(b.enregistreLe))){
    let niveau = null;
    if(r.type === 'acompte') niveau = 3;
    if(r.type === 'achat'){ achatsParClient[r.client] = (achatsParClient[r.client] || 0) + 1; niveau = achatsParClient[r.client] > 1 && r.client !== 'hors-pipeline' ? 5 : 4; }
    out.push(Object.assign({opportunite: r.opportunite, date: r.date, montant: r.montant, source: 'revenus.jsonl ' + r.id + ' — preuve : ' + r.preuve, attribution: r.attribution}, niveau != null ? {niveau} : {}));
  }
  return out;
}

function registreEnrichi(reg = lireRegistre()){
  const r = JSON.parse(JSON.stringify(reg));
  r.resultats = (r.resultats || []).concat(resultats(reg));
  r.observations = Object.fromEntries(reg.opportunites.map(o => [o.id, observations(o.id, reg)]));
  return r;
}

module.exports = {lireRegistre, registreEnrichi, observations, resultats};
