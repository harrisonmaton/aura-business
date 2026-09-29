'use strict';
/* CountryProviderRegistry — quelle source interroger, dans quel ordre, pour
   quel pays. Europe d'abord : BE, FR, ES déclarés explicitement, le reste de
   l'UE retombe sur les sources paneuropéennes.

   Repli : PRIMAIRE → SECONDAIRE → AUTRE SOURCE AUTORISÉE → CACHE → UNKNOWN.
   Jamais UNKNOWN → donnée inventée. */

const crypto = require('crypto');
const {resultat} = require('./contrat.js');
const {TOUS} = require('./fournisseurs.js');
const E = require('../core/etat.js');

const parId = Object.fromEntries(TOUS.map(f => [f.id, f]));

/* Ordre par pays et par capacité. L'import sourcé passe en premier pour les
   prospects : ce qu'un humain a vérifié vaut mieux qu'une carte collaborative. */
const ORDRE = {
  BE: {businessRegistry: ['be-kbo-opendata', 'osm-overpass', 'import-source'], maps: ['osm-overpass', 'google-places', 'import-source'],
       leads: ['import-source', 'osm-overpass', 'be-kbo-opendata'], statistics: ['be-statbel', 'eurostat', 'worldbank'], search: ['search-api'], reviews: ['google-places'], tourism: ['be-statbel', 'eurostat']},
  FR: {businessRegistry: ['fr-recherche-entreprises', 'osm-overpass', 'import-source'], maps: ['osm-overpass', 'google-places', 'import-source'],
       leads: ['import-source', 'osm-overpass', 'fr-recherche-entreprises'], statistics: ['eurostat', 'worldbank'], search: ['search-api'], reviews: ['google-places'], tourism: ['eurostat']},
  ES: {businessRegistry: ['es-registro-mercantil', 'osm-overpass', 'import-source'], maps: ['osm-overpass', 'google-places', 'import-source'],
       leads: ['import-source', 'osm-overpass'], statistics: ['es-ine', 'eurostat', 'worldbank'], search: ['search-api'], reviews: ['google-places'], tourism: ['es-ine', 'eurostat']},
  EU: {businessRegistry: ['osm-overpass', 'import-source'], maps: ['osm-overpass', 'import-source'], leads: ['import-source', 'osm-overpass'],
       statistics: ['eurostat', 'worldbank'], search: ['search-api'], reviews: ['google-places'], tourism: ['eurostat']},
};

function fournisseurs(pays, capacite){
  const table = ORDRE[pays] || ORDRE.EU;
  return (table[capacite] || []).map(id => parId[id]).filter(Boolean);
}

function cleCache(pays, capacite, requete){
  return 'cache/' + pays + '-' + capacite + '-' + crypto.createHash('sha256').update(JSON.stringify(requete)).digest('hex').slice(0, 16) + '.json';
}

async function interroger(pays, capacite, requete = {}, options = {}){
  const tentatives = [];
  const req = Object.assign({pays}, requete);
  for(const f of fournisseurs(pays, capacite)){
    let r;
    try { r = await f.interroger(req, options); }
    catch(e){ r = resultat({status: 'ERROR', source: f.id, jurisdiction: pays, error: 'exception : ' + e.message, timestamp: options.maintenant}); }
    tentatives.push({source: f.id, status: r.status, error: r.error});
    if(r.status === 'OK'){
      E.ecrire(cleCache(pays, capacite, requete), r);
      return Object.assign(r, {tentatives});
    }
  }
  const cache = E.lire(cleCache(pays, capacite, requete), null);
  if(cache){
    const r = resultat({status: 'CACHE', source: cache.source, jurisdiction: cache.jurisdiction, data: cache.data, confidence: cache.confidence * 0.8, timestamp: cache.timestamp});
    return Object.assign(r, {tentatives});
  }
  return Object.assign(resultat({status: 'UNKNOWN', source: 'failover:' + pays + '/' + capacite, jurisdiction: pays,
    error: 'aucune source n\'a répondu, rien en cache', timestamp: options.maintenant}), {tentatives});
}

/* Santé réseau source par source : « internet marche » n'est pas un booléen. */
async function sante({fetch = globalThis.fetch, delai = 8000} = {}){
  const out = [];
  for(const f of TOUS){
    if(!f.hote){ out.push({id: f.id, statut: f.implementation === 'interface seulement' ? 'NOT_CONFIGURED' : 'LOCAL', detail: f.auth}); continue; }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), delai);
    try {
      const rep = await fetch('https://' + f.hote + '/', {method: 'HEAD', signal: ctrl.signal});
      out.push({id: f.id, statut: rep.status === 403 || rep.status === 407 ? 'BLOCKED' : 'PASS', detail: 'HTTP ' + rep.status + ' ' + f.hote});
    } catch(e){
      out.push({id: f.id, statut: 'BLOCKED', detail: f.hote + ' — ' + ((e.cause && e.cause.code) || e.name || e.message)});
    } finally { clearTimeout(t); }
  }
  return out;
}

function matrice(){
  const lignes = [];
  for(const [pays, table] of Object.entries(ORDRE))
    for(const [cap, ids] of Object.entries(table))
      ids.forEach((id, rang) => { const f = parId[id]; lignes.push({pays, capacite: cap, rang: rang + 1, id, auth: f.auth, cout: f.cout, limite: f.limite, licence: f.licence, implementation: f.implementation}); });
  return lignes;
}

module.exports = {ORDRE, fournisseurs, interroger, sante, matrice, parId};
