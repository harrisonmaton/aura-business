'use strict';
/* Chronomètre de production intégré — remplace la fiche papier.

   start → (pause/reprise)* → stop. Le logiciel horodate ; l'humain n'a qu'un
   geste par transition. Les coûts IA et API s'ajoutent au fil de l'eau (un
   connecteur pourra les pousser automatiquement ; en attendant, saisis).

   COÛT RÉEL = minutes humaines × valeur horaire + IA + API + externe.
   La valeur horaire n'est jamais inventée : si elle n'est pas déclarée, on
   rend le SEUIL — la valeur horaire au-delà de laquelle la vente perd de
   l'argent. */

const E = require('../core/etat.js');
const B = require('../core/evenements.js');

function lire(){ return E.lire('chronos.json', {sessions: []}).sessions; }

function demarrer({commande, lead, opportunite, produit, prix}, {maintenant = new Date().toISOString()} = {}){
  if(!opportunite) throw new Error('chronomètre sans opportunité');
  const s = E.modifier('chronos.json', {sessions: []}, x => {
    if(x.sessions.some(s => s.statut !== 'TERMINE' && s.commande && s.commande === commande)) throw new Error('un chronomètre tourne déjà pour ' + commande);
    const s = {id: E.identifiant('chrono'), commande: commande || null, lead: lead || null, opportunite, produit: produit || null, prix: prix ?? null,
      statut: 'EN_COURS', segments: [{debut: maintenant, fin: null}], coutIA: 0, coutAPI: 0, coutExterne: 0, tokens: 0, notes: []};
    x.sessions.push(s);
    return s;
  });
  B.emettre('FULFILLMENT_STARTED', {chrono: s.id, commande: s.commande, lead: s.lead, opportunite}, {maintenant});
  return s;
}

function surSession(id, fn){
  return E.modifier('chronos.json', {sessions: []}, x => {
    const s = x.sessions.find(y => y.id === id);
    if(!s) throw new Error('chronomètre inconnu : ' + id);
    return fn(s);
  });
}

function pause(id, {maintenant = new Date().toISOString()} = {}){
  return surSession(id, s => {
    if(s.statut !== 'EN_COURS') throw new Error('pas en cours');
    s.segments[s.segments.length - 1].fin = maintenant; s.statut = 'EN_PAUSE'; return s;
  });
}
function reprendre(id, {maintenant = new Date().toISOString()} = {}){
  return surSession(id, s => {
    if(s.statut !== 'EN_PAUSE') throw new Error('pas en pause');
    s.segments.push({debut: maintenant, fin: null}); s.statut = 'EN_COURS'; return s;
  });
}

function ajouterCout(id, {ia = 0, api = 0, externe = 0, tokens = 0, note} = {}){
  return surSession(id, s => {
    s.coutIA += ia; s.coutAPI += api; s.coutExterne += externe; s.tokens += tokens;
    if(note) s.notes.push(note);
    return s;
  });
}

function minutes(s){
  return s.segments.reduce((t, g) => t + (g.fin ? (Date.parse(g.fin) - Date.parse(g.debut)) / 60000 : 0), 0);
}

function arreter(id, {maintenant = new Date().toISOString()} = {}){
  const s = surSession(id, s => {
    if(s.statut === 'TERMINE') throw new Error('déjà terminé');
    const d = s.segments[s.segments.length - 1];
    if(!d.fin) d.fin = maintenant;
    s.statut = 'TERMINE'; s.termineLe = maintenant; s.minutesHumaines = Math.round(minutes(s) * 10) / 10;
    return s;
  });
  B.emettre('FULFILLMENT_COMPLETED', {chrono: s.id, commande: s.commande, lead: s.lead, opportunite: s.opportunite, minutes: s.minutesHumaines, coutIA: s.coutIA, coutAPI: s.coutAPI}, {maintenant});
  return s;
}

/* Coût réel et seuil horaire d'une production terminée. */
function coutReel(s, {tauxHoraire = null} = {}){
  const heures = (s.minutesHumaines ?? minutes(s)) / 60;
  const autres = s.coutIA + s.coutAPI + s.coutExterne;
  const seuil = s.prix != null && heures > 0 ? (s.prix - autres) / heures : null;
  return {
    heuresHumaines: Math.round(heures * 100) / 100, coutIA: s.coutIA, coutAPI: s.coutAPI, coutExterne: s.coutExterne,
    coutTotal: tauxHoraire == null ? null : Math.round((heures * tauxHoraire + autres) * 100) / 100,
    margeNette: tauxHoraire == null || s.prix == null ? null : Math.round((s.prix - heures * tauxHoraire - autres) * 100) / 100,
    seuilHoraire: seuil == null ? null : Math.round(seuil * 100) / 100,
    phrase: seuil == null ? 'prix inconnu : seuil non calculable'
      : seuil <= 0 ? 'perdant même si l\'heure du propriétaire ne vaut rien'
      : 'reste positive tant que l\'heure du propriétaire vaut moins de ' + Math.round(seuil) + ' €',
  };
}

/* Mesures agrégées par opportunité, pour le moteur. */
function mesures(opportunite){
  const t = lire().filter(s => s.statut === 'TERMINE' && s.opportunite === opportunite);
  if(!t.length) return null;
  const h = t.reduce((a, s) => a + s.minutesHumaines, 0) / 60 / t.length;
  const autres = t.reduce((a, s) => a + s.coutIA + s.coutAPI + s.coutExterne, 0) / t.length;
  return {heuresParVenteMesurees: h, coutsVariablesMesures: autres, ventesMesurees: t.length};
}

module.exports = {lire, demarrer, pause, reprendre, ajouterCout, arreter, coutReel, mesures, minutes};
