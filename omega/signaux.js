'use strict';
/* JARVIS Ω — collecte de signaux publics.

   Un signal de marché n'est PAS une preuve de demande : compter les
   restaurants d'un code postal dit combien de clients possibles existent, pas
   combien paieront. Le moteur le range en nature « marche », hors de l'échelle
   de preuve.

   Règle de ce module : un signal qu'on n'a pas pu lire n'existe pas. En cas de
   réseau refusé, de réponse inattendue ou de format changé, on rend
   {statut:'bloque'} avec le motif exact — jamais un chiffre de repli, jamais
   une estimation déguisée.

   Source branchée : l'API publique « Recherche d'entreprises »
   (recherche-entreprises.api.gouv.fr), sans clé, données SIRENE. Elle couvre
   la France ; l'exploitation d'Aura est belge (BRIEF §8), dont le registre
   (BCE/KBO) n'a pas d'équivalent interrogeable sans compte — c'est une limite
   déclarée, pas oubliée. */

const SOURCE = 'https://recherche-entreprises.api.gouv.fr/search';

/* NAF utiles au cœur de cible d'Aura (commerces food). */
const NAF = {
  'restauration-traditionnelle': '56.10A',
  'restauration-rapide': '56.10C',
  'debits-de-boissons': '56.30Z',
};

async function compterEtablissements({naf, codePostal}, {fetch = globalThis.fetch, maintenant} = {}){
  if(!/^\d{2}\.\d{2}[A-Z]$/.test(naf || '')) return {statut: 'refuse', motif: 'code NAF invalide : ' + naf};
  if(!/^\d{5}$/.test(codePostal || '')) return {statut: 'refuse', motif: 'code postal invalide : ' + codePostal};
  const url = SOURCE + '?' + new URLSearchParams({
    activite_principale: naf, code_postal: codePostal, etat_administratif: 'A', per_page: '1',
  });
  const lu = maintenant || new Date().toISOString();
  let rep;
  try { rep = await fetch(url, {headers: {accept: 'application/json'}}); }
  catch(e){ return {statut: 'bloque', motif: 'réseau : ' + ((e.cause && e.cause.code) || e.message), url, lu}; }
  if(!rep.ok) return {statut: 'bloque', motif: 'HTTP ' + rep.status, url, lu};
  let corps;
  try { corps = await rep.json(); }
  catch(e){ return {statut: 'bloque', motif: 'réponse non JSON', url, lu}; }
  if(!Number.isInteger(corps && corps.total_results))
    return {statut: 'bloque', motif: 'format inattendu : total_results absent', url, lu};
  return {
    statut: 'ok',
    preuve: {
      nature: 'marche',
      date: lu.slice(0, 10),
      source: url,
      fait: corps.total_results + ' unités légales actives (NAF ' + naf + ') au code postal ' + codePostal + ' — base SIRENE. Nombre de clients possibles, pas de clients intéressés.',
      valeur: corps.total_results,
    },
  };
}

module.exports = {SOURCE, NAF, compterEtablissements};
