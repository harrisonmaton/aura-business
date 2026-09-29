'use strict';
/* Contrat commun à toutes les sources de données.

   Tout adaptateur rend exactement :
     {status, source, timestamp, jurisdiction, data, confidence, error}

   status :
     OK              lu à la source, maintenant
     CACHE           lu plus tôt, resservi — timestamp = date de la lecture d'origine
     BLOCKED         la source existe mais n'a pas pu être jointe (réseau, 403, quota)
     NOT_CONFIGURED  il manque une clé, un fichier ou une autorisation humaine
     ERROR           la source a répondu quelque chose d'inexploitable
     UNKNOWN         aucune source n'a répondu et rien n'est en cache

   Règle absolue : status ≠ OK/CACHE ⇒ data = null. Il n'existe aucun chemin
   de code qui fabrique une donnée de repli. */

const STATUTS = ['OK', 'CACHE', 'BLOCKED', 'NOT_CONFIGURED', 'ERROR', 'UNKNOWN'];

function resultat({status, source, jurisdiction, data = null, confidence = 0, error = null, timestamp}){
  if(!STATUTS.includes(status)) throw new Error('statut de donnée inconnu : ' + status);
  const lisible = status === 'OK' || status === 'CACHE';
  if(!lisible && data !== null) throw new Error('donnée fournie avec un statut ' + status + ' — refusé');
  if(lisible && data === null) throw new Error('statut ' + status + ' sans donnée');
  if(!source) throw new Error('résultat sans source');
  return {
    status, source, jurisdiction: jurisdiction || 'UNKNOWN',
    timestamp: timestamp || new Date().toISOString(),
    data: lisible ? data : null,
    confidence: lisible ? Math.max(0, Math.min(1, confidence)) : 0,
    error: lisible ? null : (error || status),
  };
}

/* Traduit un échec de fetch en statut honnête. */
function echecReseau(e){
  const code = (e && e.cause && e.cause.code) || (e && e.code) || (e && e.message) || 'inconnu';
  return 'réseau : ' + code;
}

async function lireJSON(url, {fetch = globalThis.fetch, headers = {}, methode = 'GET', corps} = {}){
  let rep;
  try { rep = await fetch(url, {method: methode, headers: Object.assign({accept: 'application/json', 'user-agent': 'omega-jarvis/0.2 (+aura-business)'}, headers), body: corps}); }
  catch(e){ return {bloque: echecReseau(e)}; }
  if(rep.status === 401 || rep.status === 403 || rep.status === 407 || rep.status === 429) return {bloque: 'HTTP ' + rep.status};
  if(!rep.ok) return {erreur: 'HTTP ' + rep.status};
  try { return {json: await rep.json()}; }
  catch(e){ return {erreur: 'réponse non JSON'}; }
}

module.exports = {STATUTS, resultat, lireJSON, echecReseau};
