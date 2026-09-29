'use strict';
/* File de tâches durable (etat/taches.json, écritures atomiques sous verrou).

   PENDING → RUNNING → DONE
                     → PENDING (nouvel essai, attente exponentielle)
                     → FAILED  (essais épuisés — visible, jamais effacé)
                     → BLOCKED (impossible en l'état : source bloquée, porte humaine)
   PENDING → NEEDS_APPROVAL (pare-feu de coût ou règle de nuit) → PENDING

   Une tâche RUNNING dont le bail a expiré (worker tué, machine éteinte) est
   reprise au démarrage suivant. Aucune tâche ne disparaît sans état final. */

const E = require('../core/etat.js');
const B = require('../core/evenements.js');

const FICHIER = 'taches.json';
const DEFAUT = {taches: []};
const BAIL_MS = 10 * 60 * 1000;
const PLAFONDS_DEFAUT = {tache: 1, venture: 2, global: 3};   // € par jour — IA + API

function plafonds(){ return Object.assign({}, PLAFONDS_DEFAUT, E.lire('plafonds.json', {})); }
function lire(){ return E.lire(FICHIER, DEFAUT).taches; }

function ajouter({venture = 'omega', type, priorite = 5, valeurAttendue = null, maxCost, scheduledAt, cle, parametres = {}, nuit = false, maxRetries = 4}, {maintenant = new Date().toISOString()} = {}){
  if(!type) throw new Error('tâche sans type');
  if(typeof maxCost !== 'number' || !(maxCost >= 0)) throw new Error('maxCost obligatoire : une tâche sans plafond de coût n\'entre pas dans la file');
  return E.modifier(FICHIER, DEFAUT, f => {
    if(cle){
      const existe = f.taches.find(t => t.cle === cle);
      if(existe) return existe;
    }
    const t = {id: E.identifiant('t'), cle: cle || null, venture, type, priorite, valeurAttendue, maxCost, parametres, nuit,
      createdAt: maintenant, scheduledAt: scheduledAt || maintenant, status: 'PENDING', retries: 0, maxRetries,
      historique: [{ts: maintenant, status: 'PENDING'}]};
    f.taches.push(t);
    return t;
  });
}

function depensesDuJour(jour){
  return E.lire('depenses.json', {jours: {}}).jours[jour] || {global: 0, ventures: {}};
}

function enregistrerDepense(venture, montant, jour){
  E.modifier('depenses.json', {jours: {}}, d => {
    const j = d.jours[jour] = d.jours[jour] || {global: 0, ventures: {}};
    j.global += montant; j.ventures[venture] = (j.ventures[venture] || 0) + montant;
  });
}

/* Prend la prochaine tâche exécutable. `autorise(t)` vient des règles de
   nuit : une tâche refusée passe en NEEDS_APPROVAL, elle ne s'exécute pas. */
function prendre(worker, {maintenant = new Date().toISOString(), autorise = () => ({ok: true})} = {}){
  const approbations = [];
  const t = E.modifier(FICHIER, DEFAUT, f => {
    const now = Date.parse(maintenant);
    for(const x of f.taches) if(x.status === 'RUNNING' && Date.parse(x.leaseUntil) < now){
      x.status = 'PENDING'; x.retries++; x.historique.push({ts: maintenant, status: 'PENDING', motif: 'bail expiré — worker ' + x.worker + ' disparu, reprise'});
      if(x.retries > x.maxRetries){ x.status = 'FAILED'; x.historique.push({ts: maintenant, status: 'FAILED', motif: 'essais épuisés après reprises'}); }
    }
    const pret = f.taches.filter(x => x.status === 'PENDING' && Date.parse(x.scheduledAt) <= now)
      .sort((a, b) => b.priorite - a.priorite || ((b.valeurAttendue ?? 0) / Math.max(b.maxCost, 0.01)) - ((a.valeurAttendue ?? 0) / Math.max(a.maxCost, 0.01)) || a.createdAt.localeCompare(b.createdAt));
    const jour = maintenant.slice(0, 10);
    const dep = depensesDuJour(jour);
    const pl = plafonds();
    for(const x of pret){
      const regle = autorise(x);
      const motifs = [];
      if(!regle.ok) motifs.push(regle.motif);
      if(!x.approuve){
        if(x.maxCost > pl.tache) motifs.push('maxCost ' + x.maxCost + ' € > plafond par tâche ' + pl.tache + ' €');
        if((dep.ventures[x.venture] || 0) + x.maxCost > pl.venture) motifs.push('plafond quotidien de l\'activité ' + x.venture + ' (' + pl.venture + ' €) atteint');
        if(dep.global + x.maxCost > pl.global) motifs.push('plafond quotidien global (' + pl.global + ' €) atteint');
      }
      if(motifs.length){
        x.status = 'NEEDS_APPROVAL'; x.historique.push({ts: maintenant, status: 'NEEDS_APPROVAL', motif: motifs.join(' ; ')});
        approbations.push({tache: x.id, type: x.type, motif: motifs.join(' ; ')});
        continue;
      }
      x.status = 'RUNNING'; x.worker = worker; x.startedAt = maintenant;
      x.leaseUntil = new Date(now + BAIL_MS).toISOString();
      x.historique.push({ts: maintenant, status: 'RUNNING', worker});
      return JSON.parse(JSON.stringify(x));
    }
    return null;
  });
  for(const a of approbations) B.emettre('APPROVAL_NEEDED', a, {maintenant});
  return t;
}

function terminer(id, {resultat = null, cout = 0, maintenant = new Date().toISOString()} = {}){
  const t = E.modifier(FICHIER, DEFAUT, f => {
    const x = f.taches.find(y => y.id === id);
    if(!x) throw new Error('tâche inconnue : ' + id);
    x.status = 'DONE'; x.finishedAt = maintenant; x.resultat = resultat; x.cout = cout; x.leaseUntil = null;
    x.dureeMs = Date.parse(maintenant) - Date.parse(x.startedAt);
    x.historique.push({ts: maintenant, status: 'DONE', cout});
    return x;
  });
  if(cout > 0) enregistrerDepense(t.venture, cout, maintenant.slice(0, 10));
  B.emettre('TASK_DONE', {tache: id, type: t.type, cout}, {maintenant});
  return t;
}

function echouer(id, erreur, {bloque = false, cout = 0, maintenant = new Date().toISOString(), baseMs = 60000} = {}){
  const t = E.modifier(FICHIER, DEFAUT, f => {
    const x = f.taches.find(y => y.id === id);
    if(!x) throw new Error('tâche inconnue : ' + id);
    x.lastError = String(erreur); x.leaseUntil = null; x.cout = (x.cout || 0) + cout;
    if(bloque){ x.status = 'BLOCKED'; x.historique.push({ts: maintenant, status: 'BLOCKED', motif: x.lastError}); return x; }
    x.retries++;
    if(x.retries > x.maxRetries){ x.status = 'FAILED'; x.historique.push({ts: maintenant, status: 'FAILED', motif: x.lastError}); return x; }
    const attente = baseMs * Math.pow(2, x.retries - 1);
    x.status = 'PENDING'; x.scheduledAt = new Date(Date.parse(maintenant) + attente).toISOString();
    x.historique.push({ts: maintenant, status: 'PENDING', motif: 'essai ' + x.retries + '/' + x.maxRetries + ' dans ' + Math.round(attente / 1000) + ' s : ' + x.lastError});
    return x;
  });
  if(cout > 0) enregistrerDepense(t.venture, cout, maintenant.slice(0, 10));
  if(t.status === 'BLOCKED') B.emettre('TASK_BLOCKED', {tache: id, type: t.type, motif: t.lastError}, {maintenant});
  if(t.status === 'FAILED') B.emettre('TASK_FAILED', {tache: id, type: t.type, motif: t.lastError}, {maintenant});
  return t;
}

function approuver(id, {maintenant = new Date().toISOString()} = {}){
  return E.modifier(FICHIER, DEFAUT, f => {
    const x = f.taches.find(y => y.id === id);
    if(!x || x.status !== 'NEEDS_APPROVAL') throw new Error('rien à approuver pour ' + id);
    x.status = 'PENDING'; x.approuve = true; x.historique.push({ts: maintenant, status: 'PENDING', motif: 'approuvé par le propriétaire'});
    return x;
  });
}

module.exports = {lire, ajouter, prendre, terminer, echouer, approuver, plafonds, depensesDuJour, BAIL_MS};
