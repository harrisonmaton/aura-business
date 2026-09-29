'use strict';
/* OUTREACH — file d'approbation et envoi.

   PREPARED → (EDIT) → APPROVED → SENT            (canal automatisé)
                                → AWAITING_HUMAN_SEND → SENT   (message direct manuel)
            → SKIPPED
   Tout envoi échoué garde son message : FAILED, avec le motif.

   Garde-fous appliqués à la préparation ET à nouveau à l'envoi (une liste
   « ne pas contacter » peut avoir changé entre-temps) :
   — ne-pas-contacter / désinscription : refus définitif, sans exception ;
   — dédoublonnage : un seul message actif par prospect et par activité, pas
     de relance avant `recontactApresJours` ;
   — plafond quotidien par canal ;
   — règles par juridiction (voir REGLES) ;
   — aucun message sans observation vérifiable (copie.js rend null). */

const E = require('../core/etat.js');
const B = require('../core/evenements.js');
const C = require('./copie.js');
const {UNKNOWN} = require('../hunter/prospects.js');

/* Règles internes PRUDENTES, pas un avis juridique. Base : prospection B2B
   vers une adresse générique d'entreprise, expéditeur identifié, retrait en
   une phrase. Tout pays non listé : email refusé, seul le message manuel
   reste possible. */
const REGLES = {
  BE: {email: {autorise: true, adresseGeneriqueSeulement: true}, instagram_dm: {autorise: true, envoiHumainSeulement: true}},
  FR: {email: {autorise: true, adresseGeneriqueSeulement: true}, instagram_dm: {autorise: true, envoiHumainSeulement: true}},
  ES: {email: {autorise: true, adresseGeneriqueSeulement: true}, instagram_dm: {autorise: true, envoiHumainSeulement: true}},
  DEFAUT: {email: {autorise: false}, instagram_dm: {autorise: true, envoiHumainSeulement: true}},
};

/* ── Fournisseurs d'envoi ─────────────────────────────────────────────────
   Interface : {id, configure() → bool, envoyer(message) → {statut, ...}}.
   Le message direct Instagram n'a pas d'API d'envoi autorisée pour un compte
   personnel : JARVIS prépare le lien et le texte, l'humain appuie sur envoyer
   et confirme d'un geste. L'email attend un connecteur (voir connecteurs/). */

const FOURNISSEURS = {
  instagram_dm: {
    id: 'instagram-dm-manuel', configure: () => true,
    async envoyer(m){ return {statut: 'AWAITING_HUMAN_SEND', lien: 'https://ig.me/m/' + m.destinataire, texte: m.texte}; },
  },
  email: {
    id: 'email', configure: () => !!process.env.OMEGA_EMAIL_CONNECTEUR,
    async envoyer(m, {transport} = {}){
      if(!transport) return {statut: 'NOT_CONFIGURED', motif: 'aucun connecteur email (Gmail ou SMTP) branché'};
      const r = await transport({a: m.destinataire, sujet: m.sujet, texte: m.texte});
      return r && r.ok ? {statut: 'SENT', idExterne: r.id || null} : {statut: 'FAILED', motif: (r && r.erreur) || 'échec transport'};
    },
  },
};

function lireFile(){ return E.lire('outreach.json', {messages: []}).messages; }
function lireNPC(){ return E.lire('ne-pas-contacter.json', {cles: {}}).cles; }

function nePasContacter(cle, motif, {maintenant = new Date().toISOString()} = {}){
  E.modifier('ne-pas-contacter.json', {cles: {}}, x => { x.cles[cle] = {motif, depuis: maintenant}; });
  E.modifier('outreach.json', {messages: []}, f => {
    for(const m of f.messages) if(m.cle === cle && ['PREPARED', 'APPROVED', 'AWAITING_HUMAN_SEND'].includes(m.statut)){
      m.statut = 'SKIPPED'; m.historique.push({ts: maintenant, statut: 'SKIPPED', motif: 'ne pas contacter : ' + motif});
    }
  });
  B.emettre('DO_NOT_CONTACT', {cle, motif}, {maintenant});
}

function canalPour(lead){
  if(lead.publicContactData.instagram !== UNKNOWN) return {canal: 'instagram_dm', destinataire: lead.publicContactData.instagram};
  if(lead.publicContactData.email !== UNKNOWN) return {canal: 'email', destinataire: lead.publicContactData.email};
  return null;
}

/* Contrôles communs. Rend la liste des motifs de refus (vide = autorisé). */
function controler(lead, canal, messages, experience, {maintenant, pourEnvoi = false, idMessage} = {}){
  const refus = [];
  const npc = lireNPC();
  if(npc[lead.cle]) refus.push('ne pas contacter : ' + npc[lead.cle].motif);
  const regles = (REGLES[lead.location.pays] || REGLES.DEFAUT)[canal.canal];
  if(!regles || !regles.autorise) refus.push('canal ' + canal.canal + ' non autorisé pour la juridiction ' + lead.location.pays);
  const limites = experience.limites || {};
  const delai = (limites.recontactApresJours ?? 90) * 86400000;
  const autres = messages.filter(m => m.cle === lead.cle && m.venture === experience.venture && m.id !== idMessage);
  if(autres.some(m => ['PREPARED', 'APPROVED', 'AWAITING_HUMAN_SEND'].includes(m.statut))) refus.push('un message est déjà en attente pour ce prospect');
  const dernier = autres.filter(m => m.statut === 'SENT').map(m => Date.parse(m.envoyeLe)).sort().pop();
  if(dernier && Date.parse(maintenant) - dernier < delai) refus.push('déjà contacté il y a moins de ' + (limites.recontactApresJours ?? 90) + ' jours');
  if(pourEnvoi){
    const jour = maintenant.slice(0, 10);
    const envoyesAujourdhui = messages.filter(m => m.canal === canal.canal && (m.statut === 'SENT' || m.statut === 'AWAITING_HUMAN_SEND') && (m.envoyeLe || m.remisLe || '').slice(0, 10) === jour && m.id !== idMessage).length;
    if(envoyesAujourdhui >= (limites.messagesParJour ?? 10)) refus.push('plafond quotidien atteint (' + (limites.messagesParJour ?? 10) + ' sur ' + canal.canal + ')');
  }
  return refus;
}

/* Prépare les messages des prospects qualifiés encore NEW. Alternance des
   variantes par prospect (déterministe) pour pouvoir comparer. */
function preparer(leads, icp, experience, {maintenant = new Date().toISOString(), max = Infinity, tauxConversion} = {}){
  const prepares = [], ecartes = [];
  E.modifier('outreach.json', {messages: []}, f => {
    const candidats = Object.values(leads).filter(l => l.qualifie && l.status === 'NEW' && l.venture === experience.venture)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    for(const lead of candidats){
      if(prepares.length >= max) break;
      const canal = canalPour(lead);
      if(!canal){ ecartes.push({lead: lead.id, motif: 'aucun canal public'}); continue; }
      const refus = controler(lead, canal, f.messages, experience, {maintenant});
      if(refus.length){ ecartes.push({lead: lead.id, motif: refus.join(' ; ')}); continue; }
      const variantes = experience.variantes;
      const idVar = variantes[parseInt(lead.id.slice(-4), 16) % variantes.length];
      const redac = C.rediger(lead, icp, experience, idVar);
      if(!redac){ ecartes.push({lead: lead.id, motif: 'aucune observation vérifiable — pas de message générique'}); continue; }
      if(canal.canal === 'email' && lead.publicContactData.email === UNKNOWN){ ecartes.push({lead: lead.id, motif: 'email non générique'}); continue; }
      const m = {
        id: E.identifiant('msg'), lead: lead.id, cle: lead.cle, company: lead.company, venture: experience.venture,
        experience: experience.id, opportunite: experience.opportunite, canal: canal.canal, destinataire: canal.destinataire,
        sujet: canal.canal === 'email' ? lead.company + ' — vos publications Instagram' : null,
        templateVersion: redac.templateVersion, variante: redac.variante, parties: redac.parties, texte: redac.texte,
        champsUtilises: redac.champsUtilises, pourquoi: lead.fitReason, score: lead.score, confiance: lead.confidence,
        valeurAttendue: tauxConversion != null ? {euros: Math.round(tauxConversion * icp.offre.prix * 100) / 100, base: 'taux de conversion ' + (tauxConversion * 100).toFixed(1) + ' % × ' + icp.offre.prix + ' € — estimation'} : {euros: null, base: 'UNKNOWN — aucun taux mesuré'},
        statut: 'PREPARED', creeLe: maintenant, historique: [{ts: maintenant, statut: 'PREPARED'}], reponse: null, conversion: null,
      };
      f.messages.push(m);
      prepares.push(m);
    }
  });
  for(const m of prepares) B.emettre('MESSAGE_PREPARED', {message: m.id, lead: m.lead, variante: m.variante}, {maintenant});
  return {prepares, ecartes};
}

function changer(id, fn){
  return E.modifier('outreach.json', {messages: []}, f => {
    const m = f.messages.find(x => x.id === id);
    if(!m) throw new Error('message inconnu : ' + id);
    return fn(m, f.messages);
  });
}

function approuver(id, {texte, maintenant = new Date().toISOString()} = {}){
  const m = changer(id, m => {
    if(!['PREPARED', 'APPROVED'].includes(m.statut)) throw new Error('message ' + m.statut + ' : non approuvable');
    if(texte != null){
      if(!texte.includes(C.RETRAIT) && !/ne (vous )?(é|e)crirai plus|désinscri|stop/i.test(texte)) throw new Error('texte modifié sans phrase de retrait — refusé');
      m.texte = texte; m.edite = true; m.templateVersion = m.templateVersion.replace(/(@\d+)(\+edit)?$/, '$1+edit');
    }
    m.statut = 'APPROVED'; m.approuveLe = maintenant; m.historique.push({ts: maintenant, statut: 'APPROVED', edite: texte != null});
    return m;
  });
  B.emettre('MESSAGE_APPROVED', {message: id, edite: texte != null}, {maintenant});
  return m;
}

function ignorer(id, motif = 'ignoré par le propriétaire', {maintenant = new Date().toISOString()} = {}){
  const m = changer(id, m => { m.statut = 'SKIPPED'; m.historique.push({ts: maintenant, statut: 'SKIPPED', motif}); return m; });
  B.emettre('MESSAGE_SKIPPED', {message: id, motif}, {maintenant});
  return m;
}

/* Envoi : seuls les messages APPROUVÉS partent. Jamais d'envoi sans
   approbation, même si un connecteur est branché — sauf autorisation
   explicite d'envoi automatique dans l'expérience (non accordée ici). */
async function envoyer(id, {leads, experience, maintenant = new Date().toISOString(), transport} = {}){
  const f = lireFile();
  const m = f.find(x => x.id === id);
  if(!m) throw new Error('message inconnu : ' + id);
  if(m.statut !== 'APPROVED') return {statut: 'REFUSE', motif: 'seul un message approuvé peut partir (statut : ' + m.statut + ')'};
  const lead = leads[m.lead];
  const refus = controler(lead, {canal: m.canal}, f, experience, {maintenant, pourEnvoi: true, idMessage: m.id});
  if(refus.length) return {statut: 'REFUSE', motif: refus.join(' ; ')};
  const fournisseur = FOURNISSEURS[m.canal];
  const r = await fournisseur.envoyer(m, {transport});
  changer(id, x => {
    x.historique.push({ts: maintenant, statut: r.statut, motif: r.motif});
    if(r.statut === 'SENT'){ x.statut = 'SENT'; x.envoyeLe = maintenant; }
    else if(r.statut === 'AWAITING_HUMAN_SEND'){ x.statut = 'AWAITING_HUMAN_SEND'; x.remisLe = maintenant; x.lien = r.lien; }
    else if(r.statut === 'FAILED'){ x.statut = 'FAILED'; x.echec = r.motif; }
  });
  if(r.statut === 'SENT') apresEnvoi(m, maintenant);
  return r;
}

/* Le seul geste humain du message direct : « c'est parti ». */
function confirmerEnvoi(id, {maintenant = new Date().toISOString()} = {}){
  const m = changer(id, m => {
    if(m.statut !== 'AWAITING_HUMAN_SEND') throw new Error('rien à confirmer (statut : ' + m.statut + ')');
    m.statut = 'SENT'; m.envoyeLe = maintenant; m.historique.push({ts: maintenant, statut: 'SENT', par: 'humain'});
    return m;
  });
  apresEnvoi(m, maintenant);
  return m;
}

function apresEnvoi(m, maintenant){
  E.modifier('leads.json', {leads: {}}, x => { const l = x.leads[m.lead]; if(l && l.status === 'NEW') l.status = 'CONTACTED'; });
  B.emettre('MESSAGE_SENT', {message: m.id, lead: m.lead, canal: m.canal, variante: m.variante, templateVersion: m.templateVersion, opportunite: m.opportunite}, {maintenant});
}

module.exports = {REGLES, FOURNISSEURS, lireFile, lireNPC, nePasContacter, preparer, approuver, ignorer, envoyer, confirmerEnvoi, canalPour};
