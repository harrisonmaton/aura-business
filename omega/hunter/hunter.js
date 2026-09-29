'use strict';
/* Chasse : ICP → sources (avec repli) → fiches prospect → score → registre.
   Écrit dans etat/leads.json, émet LEAD_FOUND et LEAD_QUALIFIED. Un prospect
   déjà connu n'est jamais dupliqué ; sa fiche est rafraîchie, son statut
   commercial conservé. */

const E = require('../core/etat.js');
const B = require('../core/evenements.js');
const D = require('../data/registre-pays.js');
const P = require('./prospects.js');

function lireLeads(){ return E.lire('leads.json', {leads: {}}).leads; }

async function chasser(experience, catalogue, {maintenant = new Date().toISOString(), fetch, capacite = 'leads'} = {}){
  const profil = P.icp(experience, catalogue);
  const rapports = [];
  const bruts = [];
  for(const zone of profil.zones){
    const r = await D.interroger(profil.pays, capacite, {zone, types: ['fast_food', 'restaurant', 'cafe', 'ice_cream', 'bar']}, {fetch, maintenant});
    rapports.push({zone, status: r.status, source: r.source, tentatives: r.tentatives, error: r.error});
    if(r.status !== 'OK' && r.status !== 'CACHE'){
      B.emettre('DATA_BLOCKED', {zone, capacite, tentatives: r.tentatives}, {maintenant});
      continue;
    }
    const liste = Array.isArray(r.data) ? r.data : r.data.etablissements;
    for(const e of liste) bruts.push({e, source: r.source, collecteLe: e.collecteLe || r.timestamp.slice(0, 10), confiance: e.confianceSource ?? r.confidence});
  }

  const trouves = [], qualifies = [];
  E.modifier('leads.json', {leads: {}}, etat => {
    for(const {e, source, collecteLe, confiance} of bruts){
      const p = P.versProspect(e, {source, collecteLe, confianceSource: confiance, venture: experience.venture, opportunite: experience.opportunite});
      const s = P.scorer(p, profil, {maintenant});
      Object.assign(p, {score: s.score, scoreDetail: s.detail, fitReason: s.fitReason, possiblePain: s.possiblePain, confidence: s.confidence, qualifie: s.qualifie, perime: s.perime, experience: experience.id});
      const ancien = etat.leads[p.id];
      if(ancien){ p.status = ancien.status; p.premiereVue = ancien.premiereVue; }
      else { p.premiereVue = maintenant; trouves.push(p); }
      etat.leads[p.id] = p;
      if(p.qualifie && (!ancien || !ancien.qualifie)) qualifies.push(p);
    }
  });
  for(const p of trouves) B.emettre('LEAD_FOUND', {lead: p.id, company: p.company, source: p.source.id}, {maintenant});
  for(const p of qualifies) B.emettre('LEAD_QUALIFIED', {lead: p.id, company: p.company, score: p.score}, {maintenant});
  return {profil, rapports, nouveaux: trouves.length, qualifies: qualifies.length, total: Object.keys(lireLeads()).length};
}

module.exports = {chasser, lireLeads};
