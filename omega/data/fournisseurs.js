'use strict';
/* Adaptateurs de sources. Chacun déclare ce qu'il sait faire, où, à quel
   prix, sous quelle licence, et ce qu'il lui manque. Un adaptateur ne connaît
   que sa source : l'ordre de repli est décidé par registre-pays.js.

   Capacités : businessRegistry · maps · statistics · search · reviews ·
               tourism · market · leads (import de prospects sourcés).

   Tous rendent des ÉTABLISSEMENTS (niveau entreprise), jamais des personnes :
   ni nom de gérant, ni fonction, ni téléphone portable personnel. */

const fs = require('fs');
const path = require('path');
const {resultat, lireJSON} = require('./contrat.js');
const E = require('../core/etat.js');

const vide = v => (v == null || v === '' ? null : String(v).trim());

/* ── Carte : OpenStreetMap via Overpass — toute l'UE ──────────────────────── */

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const overpass = {
  id: 'osm-overpass', capacites: ['maps', 'businessRegistry'], pays: ['EU'],
  auth: 'aucune', cout: '0 €', limite: 'usage raisonnable (~10 000 requêtes/jour, pas de charge lourde)',
  licence: 'ODbL — attribution « © OpenStreetMap contributors », base dérivée sous ODbL',
  hote: 'overpass-api.de', implementation: 'implémenté, testé sur fixture',
  /* requete : {zone: 'Bruxelles', pays: 'BE', types: ['fast_food','restaurant','cafe'], limite} */
  async interroger(requete, {fetch, maintenant} = {}){
    const types = (requete.types || ['fast_food', 'restaurant', 'cafe']).filter(t => /^[a-z_]+$/.test(t));
    const zone = String(requete.zone || '').replace(/["\\]/g, '');
    if(!zone) return resultat({status: 'ERROR', source: this.id, jurisdiction: requete.pays, error: 'zone absente'});
    const q = `[out:json][timeout:25];area["name"="${zone}"]["boundary"="administrative"]->.a;(` +
      types.map(t => `nwr["amenity"="${t}"]["name"](area.a);`).join('') + `);out center tags ${Math.min(requete.limite || 200, 500)};`;
    const r = await lireJSON(OVERPASS, {fetch, methode: 'POST', corps: 'data=' + encodeURIComponent(q), headers: {'content-type': 'application/x-www-form-urlencoded'}});
    if(r.bloque) return resultat({status: 'BLOCKED', source: this.id, jurisdiction: requete.pays, error: r.bloque, timestamp: maintenant});
    if(r.erreur || !Array.isArray(r.json && r.json.elements)) return resultat({status: 'ERROR', source: this.id, jurisdiction: requete.pays, error: r.erreur || 'elements absent', timestamp: maintenant});
    const etab = r.json.elements.map(el => {
      const t = el.tags || {};
      return {
        nom: vide(t.name), pays: requete.pays || null,
        ville: vide(t['addr:city']) || zone, codePostal: vide(t['addr:postcode']),
        adresse: [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ') || null,
        activite: 'amenity=' + t.amenity + (t.cuisine ? ' · cuisine=' + t.cuisine : ''),
        siteWeb: vide(t.website || t['contact:website']),
        instagram: vide(t['contact:instagram'] || t.instagram),
        facebook: vide(t['contact:facebook'] || t.facebook),
        emailPublic: vide(t.email || t['contact:email']),
        telephonePublic: vide(t.phone || t['contact:phone']),
        identifiantSource: el.type + '/' + el.id,
        sourceUrl: 'https://www.openstreetmap.org/' + el.type + '/' + el.id,
      };
    }).filter(x => x.nom);
    return resultat({status: 'OK', source: this.id, jurisdiction: requete.pays, data: etab, confidence: 0.6, timestamp: maintenant});
  },
};

/* ── Registre FR : API Recherche d'entreprises (SIRENE) ───────────────────── */

const SIRENE = 'https://recherche-entreprises.api.gouv.fr/search';
const sirene = {
  id: 'fr-recherche-entreprises', capacites: ['businessRegistry'], pays: ['FR'],
  auth: 'aucune', cout: '0 €', limite: '7 requêtes/s', licence: 'Licence Ouverte 2.0 (Etalab)',
  hote: 'recherche-entreprises.api.gouv.fr', implementation: 'implémenté, testé sur fixture',
  async interroger(requete, {fetch, maintenant} = {}){
    if(!/^\d{2}\.\d{2}[A-Z]$/.test(requete.naf || '') || !/^\d{5}$/.test(requete.codePostal || ''))
      return resultat({status: 'ERROR', source: this.id, jurisdiction: 'FR', error: 'naf ou code postal invalide', timestamp: maintenant});
    const url = SIRENE + '?' + new URLSearchParams({activite_principale: requete.naf, code_postal: requete.codePostal, etat_administratif: 'A', per_page: String(Math.min(requete.limite || 25, 25))});
    const r = await lireJSON(url, {fetch});
    if(r.bloque) return resultat({status: 'BLOCKED', source: this.id, jurisdiction: 'FR', error: r.bloque, timestamp: maintenant});
    if(r.erreur || !Array.isArray(r.json && r.json.results)) return resultat({status: 'ERROR', source: this.id, jurisdiction: 'FR', error: r.erreur || 'results absent', timestamp: maintenant});
    const etab = r.json.results.map(x => ({
      nom: vide(x.nom_complet), pays: 'FR',
      ville: vide(x.siege && x.siege.libelle_commune), codePostal: vide(x.siege && x.siege.code_postal),
      adresse: vide(x.siege && x.siege.adresse), activite: 'NAF ' + requete.naf,
      siteWeb: null, instagram: null, facebook: null, emailPublic: null, telephonePublic: null,
      identifiantSource: 'SIREN ' + x.siren, sourceUrl: 'https://annuaire-entreprises.data.gouv.fr/entreprise/' + x.siren,
    })).filter(x => x.nom);
    return resultat({status: 'OK', source: this.id, jurisdiction: 'FR', data: {total: r.json.total_results, etablissements: etab}, confidence: 0.9, timestamp: maintenant});
  },
};

/* ── Registre BE : Banque-Carrefour des Entreprises, données ouvertes ─────
   Pas d'API ouverte : la BCE publie un extrait complet en CSV, téléchargeable
   après inscription gratuite (porte humaine). Une fois l'extrait décompressé
   et OMEGA_KBO_DIR pointé dessus, cet adaptateur le lit localement.
   Colonnes attendues d'après la documentation de l'extrait (à confirmer au
   premier import réel) : activity.csv, address.csv, denomination.csv,
   contact.csv, clés EntityNumber. */

function lireCSV(fichier){
  const lignes = fs.readFileSync(fichier, 'utf8').split(/\r?\n/).filter(Boolean);
  const decouper = l => { const out = []; let cur = '', q = false;
    for(const c of l){ if(c === '"'){ q = !q; } else if(c === ',' && !q){ out.push(cur); cur = ''; } else cur += c; }
    out.push(cur); return out; };
  const tete = decouper(lignes[0]);
  return lignes.slice(1).map(l => { const v = decouper(l); const o = {}; tete.forEach((k, i) => { o[k] = v[i]; }); return o; });
}

const kbo = {
  id: 'be-kbo-opendata', capacites: ['businessRegistry'], pays: ['BE'],
  auth: 'inscription gratuite au portail open data BCE (humain)', cout: '0 €', limite: 'extrait mensuel, lecture locale',
  licence: 'licence open data BCE — conditions à relire à l\'inscription', hote: 'kbopub.economie.fgov.be',
  implementation: 'lecteur local implémenté, testé sur fixture ; extrait réel jamais lu',
  async interroger(requete, {maintenant} = {}){
    const dir = process.env.OMEGA_KBO_DIR;
    if(!dir || !fs.existsSync(path.join(dir, 'activity.csv')))
      return resultat({status: 'NOT_CONFIGURED', source: this.id, jurisdiction: 'BE', error: 'OMEGA_KBO_DIR absent : télécharger l\'extrait open data de la BCE (inscription humaine)', timestamp: maintenant});
    try {
      const prefixes = (requete.nace || ['5610', '5630']).map(String);
      const actifs = new Set(lireCSV(path.join(dir, 'activity.csv'))
        .filter(a => prefixes.some(p => String(a.NaceCode || '').replace('.', '').startsWith(p))).map(a => a.EntityNumber));
      const adresses = new Map(lireCSV(path.join(dir, 'address.csv')).filter(a => actifs.has(a.EntityNumber) && !a.DateStrikingOff).map(a => [a.EntityNumber, a]));
      const noms = new Map();
      for(const d of lireCSV(path.join(dir, 'denomination.csv'))) if(actifs.has(d.EntityNumber) && !noms.has(d.EntityNumber)) noms.set(d.EntityNumber, d.Denomination);
      const contacts = new Map();
      if(fs.existsSync(path.join(dir, 'contact.csv')))
        for(const c of lireCSV(path.join(dir, 'contact.csv'))) if(actifs.has(c.EntityNumber)){
          const k = contacts.get(c.EntityNumber) || {}; k[c.ContactType] = c.Value; contacts.set(c.EntityNumber, k); }
      const cp = requete.codesPostaux ? new Set(requete.codesPostaux.map(String)) : null;
      const etab = [...actifs].filter(n => adresses.has(n) && noms.has(n) && (!cp || cp.has(adresses.get(n).Zipcode))).map(n => {
        const a = adresses.get(n), k = contacts.get(n) || {};
        return {nom: noms.get(n), pays: 'BE', ville: vide(a.MunicipalityFR || a.MunicipalityNL), codePostal: vide(a.Zipcode),
          adresse: [a.StreetFR || a.StreetNL, a.HouseNumber].filter(Boolean).join(' ') || null, activite: 'NACE ' + prefixes.join('/'),
          siteWeb: vide(k.WEB), instagram: null, facebook: null, emailPublic: vide(k.EMAIL), telephonePublic: vide(k.TEL),
          identifiantSource: 'BCE ' + n, sourceUrl: 'https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=' + String(n).replace(/\D/g, '')};
      });
      return resultat({status: 'OK', source: this.id, jurisdiction: 'BE', data: {total: etab.length, etablissements: etab}, confidence: 0.85, timestamp: maintenant});
    } catch(e){
      return resultat({status: 'ERROR', source: this.id, jurisdiction: 'BE', error: 'extrait illisible : ' + e.message, timestamp: maintenant});
    }
  },
};

/* ── Statistiques : Eurostat et Banque mondiale ───────────────────────────── */

const eurostat = {
  id: 'eurostat', capacites: ['statistics'], pays: ['EU'], auth: 'aucune', cout: '0 €', limite: 'non documentée, usage raisonnable',
  licence: 'réutilisation autorisée avec mention de la source (politique Eurostat)', hote: 'ec.europa.eu', implementation: 'implémenté, testé sur fixture',
  /* requete : {jeu: 'sts_trtu_m', filtres: {geo: 'BE', ...}} */
  async interroger(requete, {fetch, maintenant} = {}){
    if(!/^[a-z0-9_]+$/i.test(requete.jeu || '')) return resultat({status: 'ERROR', source: this.id, jurisdiction: 'EU', error: 'jeu invalide', timestamp: maintenant});
    const url = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/' + requete.jeu + '?' + new URLSearchParams(Object.assign({format: 'JSON', lang: 'fr'}, requete.filtres || {}));
    const r = await lireJSON(url, {fetch});
    if(r.bloque) return resultat({status: 'BLOCKED', source: this.id, jurisdiction: (requete.filtres || {}).geo || 'EU', error: r.bloque, timestamp: maintenant});
    if(r.erreur || !r.json || !r.json.value) return resultat({status: 'ERROR', source: this.id, jurisdiction: 'EU', error: r.erreur || 'value absent', timestamp: maintenant});
    return resultat({status: 'OK', source: this.id, jurisdiction: (requete.filtres || {}).geo || 'EU', data: {libelle: r.json.label, mis_a_jour: r.json.updated, valeurs: r.json.value, url}, confidence: 0.95, timestamp: maintenant});
  },
};

const banqueMondiale = {
  id: 'worldbank', capacites: ['statistics'], pays: ['EU'], auth: 'aucune', cout: '0 €', limite: 'non documentée',
  licence: 'CC BY 4.0', hote: 'api.worldbank.org', implementation: 'implémenté, testé sur fixture',
  async interroger(requete, {fetch, maintenant} = {}){
    const pays = String(requete.pays || '').toUpperCase();
    if(!/^[A-Z]{2}$/.test(pays) || !/^[A-Z0-9.]+$/i.test(requete.indicateur || '')) return resultat({status: 'ERROR', source: this.id, jurisdiction: pays, error: 'paramètres invalides', timestamp: maintenant});
    const url = `https://api.worldbank.org/v2/country/${pays}/indicator/${requete.indicateur}?format=json&per_page=10`;
    const r = await lireJSON(url, {fetch});
    if(r.bloque) return resultat({status: 'BLOCKED', source: this.id, jurisdiction: pays, error: r.bloque, timestamp: maintenant});
    const lignes = Array.isArray(r.json) && Array.isArray(r.json[1]) ? r.json[1].filter(x => x.value != null) : null;
    if(r.erreur || !lignes) return resultat({status: 'ERROR', source: this.id, jurisdiction: pays, error: r.erreur || 'format inattendu', timestamp: maintenant});
    return resultat({status: 'OK', source: this.id, jurisdiction: pays, data: lignes.map(x => ({annee: x.date, valeur: x.value})), confidence: 0.9, timestamp: maintenant});
  },
};

/* ── Import de prospects sourcés ──────────────────────────────────────────
   Pour tout ce qu'aucune API ouverte ne donne : un humain ou un agent de
   recherche dépose etat/imports/<nom>.json. Chaque fiche DOIT porter une
   source (URL) et une date de collecte, sinon elle est rejetée — un import
   n'est pas une porte dérobée pour des données inventées. */

const importManuel = {
  id: 'import-source', capacites: ['leads', 'businessRegistry', 'maps'], pays: ['EU'], auth: 'aucune', cout: '0 €', limite: '—',
  licence: 'dépend de chaque source citée', hote: null, implementation: 'implémenté, testé',
  async interroger(requete, {maintenant} = {}){
    const dir = E.chemin('imports');
    if(!fs.existsSync(dir)) return resultat({status: 'NOT_CONFIGURED', source: this.id, jurisdiction: requete.pays, error: 'aucun import déposé dans etat/imports/', timestamp: maintenant});
    const etab = [], rejets = [];
    for(const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()){
      const lot = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for(const x of lot.etablissements || []){
        if(!x.nom || !x.sourceUrl || !x.collecteLe){ rejets.push({fichier: f, nom: x.nom || '?', motif: 'nom, sourceUrl ou collecteLe absent'}); continue; }
        if(requete.pays && x.pays && x.pays !== requete.pays) continue;
        if(requete.zone && x.ville && x.ville.toLowerCase() !== String(requete.zone).toLowerCase()) continue;
        etab.push(Object.assign({pays: null, ville: null, codePostal: null, adresse: null, activite: null, siteWeb: null, instagram: null,
          facebook: null, emailPublic: null, telephonePublic: null, identifiantSource: null}, x, {lot: f, confianceSource: lot.confiance ?? x.confiance ?? 0.4}));
      }
    }
    if(etab.length === 0) return resultat({status: 'NOT_CONFIGURED', source: this.id, jurisdiction: requete.pays, error: 'aucune fiche valide dans les imports (' + rejets.length + ' rejetée(s))', timestamp: maintenant});
    return resultat({status: 'OK', source: this.id, jurisdiction: requete.pays, data: {etablissements: etab, rejets}, confidence: Math.min(...etab.map(x => x.confianceSource)), timestamp: maintenant});
  },
};

/* ── Déclarés, non branchés ───────────────────────────────────────────────
   Présents pour que la matrice soit complète et que le repli sache qu'ils
   existent. Ils rendent NOT_CONFIGURED avec ce qu'il manque. */

function nonBranche(id, capacites, pays, manque, extra = {}){
  return Object.assign({id, capacites, pays, auth: manque, cout: 'à déterminer', limite: '—', licence: 'à vérifier', hote: null, implementation: 'interface seulement',
    async interroger(requete, {maintenant} = {}){
      return resultat({status: 'NOT_CONFIGURED', source: id, jurisdiction: requete.pays || pays[0], error: manque, timestamp: maintenant});
    }}, extra);
}

const TOUS = [
  importManuel, overpass, sirene, kbo, eurostat, banqueMondiale,
  nonBranche('search-api', ['search'], ['EU'], 'clé d\'API de recherche (ex. Brave Search) — OMEGA_SEARCH_KEY', {cout: 'offre gratuite limitée puis payant'}),
  nonBranche('google-places', ['maps', 'reviews'], ['EU'], 'clé Google Maps Platform + compte de facturation (porte humaine)', {cout: 'payant au-delà du crédit gratuit', licence: 'CGU Google Maps : stockage limité'}),
  nonBranche('es-registro-mercantil', ['businessRegistry'], ['ES'], 'pas d\'API ouverte ; données payantes (Registradores)', {cout: 'payant'}),
  nonBranche('es-ine', ['statistics'], ['ES'], 'adaptateur à écrire (API INE ouverte, servicios.ine.es)', {cout: '0 €', licence: 'réutilisation autorisée avec citation'}),
  nonBranche('be-statbel', ['statistics', 'tourism'], ['BE'], 'adaptateur à écrire (jeux ouverts Statbel)', {cout: '0 €'}),
];

module.exports = {TOUS, lireCSV, OVERPASS, SIRENE};
