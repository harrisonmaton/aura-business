'use strict';
/* SALES COPY — un message par prospect, construit UNIQUEMENT à partir de
   champs vérifiés de sa fiche et de l'offre lue au catalogue.

   OBSERVATION → HYPOTHÈSE DE DOULEUR → VALEUR → APPEL À L'ACTION À FAIBLE FRICTION

   La douleur est posée comme une question, jamais affirmée : on ne sait pas
   ce que vit ce commerçant. Chaque message dit qui écrit et comment ne plus
   recevoir de message. Les champs utilisés sont listés : l'approbateur voit
   exactement sur quoi repose la personnalisation. */

const {UNKNOWN} = require('../hunter/prospects.js');

const ACTIVITES = {fast_food: 'restauration rapide', restaurant: 'restaurant', cafe: 'café', food_truck: 'food truck', bar: 'bar', ice_cream: 'glacier'};

function activiteLisible(industry){
  const m = String(industry || '').match(/amenity=([a-z_]+)/);
  return m ? (ACTIVITES[m[1]] || null) : null;
}

const SIGNATURE = '— Aura Business';
const RETRAIT = 'Si ce n\'est pas pour vous, dites-le simplement et je ne vous écrirai plus.';

const VARIANTES = {
  'A-observation-essai': {version: 'A-observation-essai@1', construire(ctx){
    return {
      observation: ctx.observation,
      douleur: 'Est-ce que publier régulièrement sur Instagram vous prend des soirées que vous n\'avez pas ?',
      valeur: `Je prépare pour des commerces comme le vôtre ${ctx.offre.visuels} visuels et ${ctx.offre.textes} légendes prêts à publier, à votre nom et à votre ton — ${ctx.offre.prix} €, livrés en ${ctx.offre.delai}.`,
      cta: ctx.garantie
        ? `Je peux vous préparer deux visuels d'essai pour ${ctx.company} : vous ne payez que s'ils vous plaisent. Je vous les envoie ?`
        : `Je vous montre un exemple fait pour ${ctx.company} ?`,
    };
  }},
  'B-question-temps': {version: 'B-question-temps@2', construire(ctx){
    return {
      observation: ctx.observation,
      douleur: 'Question simple : combien de temps passez-vous chaque semaine à préparer vos publications ?',
      valeur: `Je m'en occupe pour des commerces indépendants : ${ctx.offre.visuels} visuels et leurs textes, prêts à poster, ${ctx.offre.prix} € le pack, sans abonnement.`,
      cta: 'Si ça vous parle, je vous envoie un exemple — sinon, aucun souci.',
    };
  }},
};

function observationVerifiee(lead){
  const champs = ['company'];
  const o = (lead.observations || [])[0];
  if(o){ champs.push('observations[0] (' + o.source + ')'); return {texte: 'Bonjour, ' + (o.phrase || ('j\'ai remarqué ceci : ' + o.fait.replace(/\.$/, '') + '.')), champs}; }
  const act = activiteLisible(lead.industry);
  const ville = lead.location && lead.location.ville !== UNKNOWN ? lead.location.ville : null;
  if(act) champs.push('industry');
  if(ville) champs.push('location.ville');
  if(!act && !ville) return null;
  return {texte: `Bonjour, j'ai découvert ${lead.company}${act ? ', ' + act : ''}${ville ? ' à ' + ville : ''}.`, champs};
}

/* Rend null si le prospect ne fournit aucune observation vérifiable : un
   message sans observation réelle est du démarchage générique, on ne l'écrit
   pas. */
function rediger(lead, icp, experience, idVariante){
  const v = VARIANTES[idVariante];
  if(!v) throw new Error('variante inconnue : ' + idVariante);
  const obs = observationVerifiee(lead);
  if(!obs) return null;
  const garantie = !!(experience.offre && experience.offre.garantie);
  const parties = v.construire({observation: obs.texte, company: lead.company, offre: icp.offre, garantie});
  const texte = [parties.observation, parties.douleur, parties.valeur, parties.cta, RETRAIT, SIGNATURE].join('\n\n');
  return {templateVersion: v.version, variante: idVariante, parties, texte,
    champsUtilises: obs.champs.concat(['offre (src/catalog.json)'], garantie ? ['offre.garantie (hypothèse à valider)'] : []),
    contientRetrait: true};
}

module.exports = {VARIANTES, rediger, activiteLisible, RETRAIT, SIGNATURE};
