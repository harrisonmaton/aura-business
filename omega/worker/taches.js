'use strict';
/* Catalogue des tâches que le worker sait exécuter, et règles de nuit.

   Chaque tâche a une CLASSE. La nuit, seules les classes sans effet externe
   irréversible s'exécutent seules. Envoyer, dépenser, signer, s'identifier,
   transférer : jamais sans point de contrôle, de jour comme de nuit. */

const PC = require('../premier-client.js');
const H = require('../hunter/hunter.js');
const F = require('../outreach/file.js');
const CRM = require('../crm/crm.js');
const M = require('../moteur.js');
const E = require('../core/etat.js');
const D = require('../data/registre-pays.js');
const A = require('../agents.js');

const CLASSES_NUIT = ['READ', 'RESEARCH', 'ANALYZE', 'GENERATE', 'TEST', 'PREPARE'];
const CLASSES_CONTROLE = ['SEND', 'SPEND', 'CONTRACT', 'KYC', 'TRANSFER', 'PUBLISH'];

class Bloque extends Error { constructor(m){ super(m); this.bloque = true; } }

const TACHES = {
  'sante.reseau': {classe: 'READ', agent: 'sentinelle', premierClient: true, async executer(){
    const s = await D.sante();
    E.ecrire('sante.json', {ts: new Date().toISOString(), sources: s});
    return {pass: s.filter(x => x.statut === 'PASS').length, bloquees: s.filter(x => x.statut === 'BLOCKED').map(x => x.id)};
  }},
  'premier-client.chasser': {classe: 'RESEARCH', agent: 'hunter', premierClient: true, async executer(p, ctx){
    const c = PC.contexte();
    const r = await H.chasser(c.experience, c.catalogue, {maintenant: ctx.maintenant});
    const lu = r.rapports.some(x => x.status === 'OK' || x.status === 'CACHE');
    if(!lu) throw new Bloque('aucune source de prospects joignable : ' + r.rapports.map(x => x.zone + ' ' + x.status + ' (' + (x.tentatives || []).map(t => t.source + ':' + t.status).join(', ') + ')').join(' ; '));
    return {nouveaux: r.nouveaux, qualifies: r.qualifies, total: r.total};
  }},
  'premier-client.preparer': {classe: 'PREPARE', agent: 'redacteur', premierClient: true, async executer(p, ctx){
    const c = PC.contexte();
    const r = F.preparer(H.lireLeads(), c.profil, c.experience, {maintenant: ctx.maintenant, max: p.max || 20});
    return {prepares: r.prepares.length, ecartes: r.ecartes.length};
  }},
  'moteur.decider': {classe: 'ANALYZE', agent: 'strategie', premierClient: true, async executer(p, ctx){
    const c = PC.contexte();
    const reco = M.recommander(c.reg, {catalogue: c.catalogue, maintenant: ctx.maintenant});
    if(!reco.valide) throw new Bloque('registre invalide : ' + reco.erreurs.join(' ; '));
    E.ajouterLigne('decisions.jsonl', M.consigner(reco, c.reg));
    return {top: reco.top.map(x => x.id), ecartees: reco.ecartees.length};
  }},
  'experience.analyser': {classe: 'ANALYZE', agent: 'analyste', premierClient: true, async executer(){
    const a = CRM.apprendre({});
    E.ecrire('apprentissage.json', {ts: new Date().toISOString(), groupes: a});
    return {groupes: Object.keys(a).length, contactes: a.total ? a.total.contactes : 0};
  }},
  'agents.evaluer': {classe: 'ANALYZE', agent: 'analyste', premierClient: true, async executer(){
    const ev = A.evaluer();
    E.ecrire('agents.json', {ts: new Date().toISOString(), agents: ev});
    return {agents: ev.length, aRetirer: ev.filter(x => x.recommandation === 'DISABLE').map(x => x.agent)};
  }},
  'data.rafraichir': {classe: 'RESEARCH', agent: 'hunter', premierClient: false, async executer(p, ctx){
    return TACHES['premier-client.chasser'].executer(p, ctx);
  }},
  'capital.revue': {classe: 'ANALYZE', agent: 'strategie', premierClient: false, async executer(){
    const rev = CRM.lireRevenus().reduce((s, r) => s + r.montant, 0);
    return {sansObjet: rev <= 0, motif: rev <= 0 ? 'une activité, 0 € de revenu : aucune allocation à arbitrer' : 'revenus : ' + rev + ' € — revue à construire quand deux activités produisent'};
  }},
  'frontier.scan': {classe: 'RESEARCH', agent: 'frontier', premierClient: false, async executer(){
    throw new Bloque('aucune source de benchmark branchée : un classement recopié de mémoire n\'est pas une mesure');
  }},
};

/* Règle appliquée par le worker avant chaque tâche. */
function autorise(t, {maintenant = new Date().toISOString(), heureDebutNuit = 22, heureFinNuit = 7, mode} = {}){
  const def = TACHES[t.type];
  if(!def) return {ok: false, motif: 'type de tâche inconnu : ' + t.type};
  if(CLASSES_CONTROLE.includes(def.classe)) return {ok: false, motif: 'classe ' + def.classe + ' : point de contrôle humain obligatoire'};
  const h = new Date(maintenant).getUTCHours();
  const nuit = heureDebutNuit > heureFinNuit ? (h >= heureDebutNuit || h < heureFinNuit) : (h >= heureDebutNuit && h < heureFinNuit);
  if(nuit && !CLASSES_NUIT.includes(def.classe)) return {ok: false, motif: 'nuit : classe ' + def.classe + ' non autorisée sans contrôle'};
  if(mode === 'FIRST_CUSTOMER' && !def.premierClient) return {ok: false, motif: 'mode FIRST CUSTOMER : tâche secondaire suspendue'};
  return {ok: true};
}

module.exports = {TACHES, CLASSES_NUIT, CLASSES_CONTROLE, Bloque, autorise};
