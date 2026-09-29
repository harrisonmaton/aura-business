'use strict';
/* Le cœur exposé comme une liste de commandes nommées.

   Terminal, console web et — plus tard — voix appellent la MÊME fonction
   avec les mêmes arguments. Aucune logique métier dans les interfaces :
   « Jarvis, prépare les messages » et le bouton « préparer » finissent ici.

   Chaque commande déclare son MODE :
     AUTO     JARVIS l'exécute seul
     REVIEW   JARVIS l'exécute sur décision humaine (approuver, modifier…)
     HUMAN    enregistre un acte que seul un humain a pu faire (envoi manuel,
              paiement reçu, étape de compte) */

const fs = require('fs');
const path = require('path');
const E = require('./core/etat.js');
const M = require('./moteur.js');
const PL = require('./pipeline.js');
const PC = require('./premier-client.js');
const H = require('./hunter/hunter.js');
const F = require('./outreach/file.js');
const CRM = require('./crm/crm.js');
const K = require('./fulfillment/chrono.js');
const G = require('./genesis/genesis.js');
const CO = require('./comptes/orchestrateur.js');
const Q = require('./worker/file-taches.js');
const W = require('./worker/worker.js');
const BR = require('./brief.js');
const A = require('./agents.js');
const DOC = require('./doctor.js');
const CX = require('./connecteurs/index.js');
const {chargerCatalogue} = require('../server/boutique.js');

const maintenant = a => a.maintenant || new Date().toISOString();

const COMMANDES = {
  etat:          {mode: 'AUTO', aide: 'tableau First Customer complet', fn: a => PC.etat({maintenant: maintenant(a), sante: (E.lire('sante.json', {sources: null})).sources})},
  recommander:   {mode: 'AUTO', aide: 'meilleur prochain euro, avec les résultats réels', fn: a => M.recommander(PL.registreEnrichi(), {catalogue: chargerCatalogue(), maintenant: maintenant(a)})},
  activer:       {mode: 'REVIEW', aide: 'active le mode FIRST CUSTOMER', fn: a => PC.activer(a.experience || 'experiments/signature-first-customer', {maintenant: maintenant(a)})},
  executer:      {mode: 'AUTO', aide: 'exécute les prochaines actions AUTO (chasse, préparation) — n\'envoie rien', fn: a => PC.executerSuivante({maintenant: maintenant(a), maxMessages: a.max})},
  chasser:       {mode: 'AUTO', aide: 'cherche des prospects selon l\'ICP', fn: async a => { const c = PC.contexte(); return H.chasser(c.experience, c.catalogue, {maintenant: maintenant(a)}); }},
  importer:      {mode: 'REVIEW', aide: 'dépose un fichier de prospects sourcés dans etat/imports', fn: a => importer(a.fichier)},
  preparer:      {mode: 'AUTO', aide: 'prépare les messages des prospects qualifiés', fn: a => { const c = PC.contexte(); return F.preparer(H.lireLeads(), c.profil, c.experience, {maintenant: maintenant(a), max: a.max}); }},
  file:          {mode: 'AUTO', aide: 'file d\'approbation', fn: () => F.lireFile().filter(m => ['PREPARED', 'APPROVED', 'AWAITING_HUMAN_SEND'].includes(m.statut))},
  approuver:     {mode: 'REVIEW', aide: 'approuve un message (texte modifié optionnel)', fn: a => F.approuver(a.id, {texte: a.texte, maintenant: maintenant(a)})},
  ignorer:       {mode: 'REVIEW', aide: 'ignore un message', fn: a => F.ignorer(a.id, a.motif, {maintenant: maintenant(a)})},
  envoyer:       {mode: 'REVIEW', aide: 'envoie un message approuvé (ou prépare le lien d\'envoi manuel)', fn: a => { const c = PC.contexte(); return F.envoyer(a.id, {leads: H.lireLeads(), experience: c.experience, maintenant: maintenant(a)}); }},
  confirmer:     {mode: 'HUMAN', aide: 'confirme qu\'un message direct est parti', fn: a => F.confirmerEnvoi(a.id, {maintenant: maintenant(a)})},
  reponse:       {mode: 'HUMAN', aide: 'enregistre la réponse d\'un prospect (classée automatiquement)', fn: a => CRM.enregistrerReponse(a.lead, a.texte, {maintenant: maintenant(a), intention: a.intention})},
  avancer:       {mode: 'HUMAN', aide: 'change l\'étape d\'un prospect (QUALIFIED, PROPOSAL, LOST)', fn: a => CRM.avancer(a.lead, a.etape, {maintenant: maintenant(a), motif: a.motif})},
  proposition:   {mode: 'REVIEW', aide: 'rédige la proposition d\'un prospect intéressé', fn: a => { const c = PC.contexte(); return G.proposition(H.lireLeads()[a.lead], c.experience, c.profil); }},
  vente:         {mode: 'HUMAN', aide: 'enregistre un paiement reçu, avec sa preuve', fn: a => CRM.enregistrerPaiement({lead: a.lead, montant: Number(a.montant), preuve: a.preuve, source: a.source || 'déclaration du propriétaire', attribution: a.attribution || 'ASSISTE', type: a.type || 'achat', opportunite: a.opportunite, venture: a.venture}, {maintenant: maintenant(a)})},
  'chrono-start':{mode: 'AUTO', aide: 'démarre le chronomètre de production', fn: a => { const c = PC.contexte(); return K.demarrer({lead: a.lead, commande: a.commande, opportunite: a.opportunite || c.experience.opportunite, produit: c.profil.offre.nom, prix: c.profil.offre.prix}, {maintenant: maintenant(a)}); }},
  'chrono-pause':{mode: 'AUTO', aide: 'met en pause', fn: a => K.pause(a.id, {maintenant: maintenant(a)})},
  'chrono-reprendre': {mode: 'AUTO', aide: 'reprend', fn: a => K.reprendre(a.id, {maintenant: maintenant(a)})},
  'chrono-cout': {mode: 'AUTO', aide: 'ajoute un coût IA/API/externe', fn: a => K.ajouterCout(a.id, {ia: Number(a.ia || 0), api: Number(a.api || 0), externe: Number(a.externe || 0), tokens: Number(a.tokens || 0)})},
  'chrono-stop': {mode: 'AUTO', aide: 'arrête et calcule le coût réel', fn: a => { const s = K.arreter(a.id, {maintenant: maintenant(a)}); return Object.assign({session: s}, K.coutReel(s, {tauxHoraire: JSON.parse(fs.readFileSync(path.join(__dirname, 'registre.json'), 'utf8')).ressources.tauxHoraire})); }},
  genesis:       {mode: 'AUTO', aide: 'génère offre, landing, pipeline, critères, messages', fn: a => { const r = G.genesisLite(a.experience || 'experiments/signature-first-customer', chargerCatalogue(), {maintenant: maintenant(a)}); return {dossier: r.dossier, decisionsDues: r.decisionsDues}; }},
  comptes:       {mode: 'AUTO', aide: 'plans d\'ouverture de comptes', fn: () => CO.etat()},
  compte:        {mode: 'HUMAN', aide: 'marque une étape de compte faite par l\'humain', fn: a => CO.marquer(a.id, a.etape, {par: 'humain'})},
  taches:        {mode: 'AUTO', aide: 'file de tâches', fn: () => Q.lire()},
  'tache-approuver': {mode: 'REVIEW', aide: 'autorise une tâche retenue par le pare-feu', fn: a => Q.approuver(a.id, {maintenant: maintenant(a)})},
  worker:        {mode: 'AUTO', aide: 'un cycle du worker (planifie et exécute)', fn: a => W.une({maintenant: a.maintenant})},
  brief:         {mode: 'AUTO', aide: 'WHILE YOU SLEPT', fn: a => BR.brief({maintenant: maintenant(a), marquer: !!a.marquer})},
  agents:        {mode: 'AUTO', aide: 'évaluation des agents', fn: () => A.evaluer()},
  apprentissage: {mode: 'AUTO', aide: 'résultats par variante et segment', fn: () => CRM.apprendre({})},
  argent:        {mode: 'AUTO', aide: 'revenus enregistrés et coûts', fn: () => argent()},
  connecteurs:   {mode: 'AUTO', aide: 'état des connecteurs', fn: () => CX.statut()},
  doctor:        {mode: 'AUTO', aide: 'santé de l\'environnement', fn: () => DOC.diagnostic()},
};

function argent(){
  const rev = CRM.lireRevenus();
  const dep = E.lire('depenses.json', {jours: {}}).jours;
  const coutIA = Object.values(dep).reduce((s, j) => s + j.global, 0) + K.lire().reduce((s, x) => s + x.coutIA + x.coutAPI, 0);
  const revenu = rev.reduce((s, r) => s + r.montant, 0);
  const minutes = K.lire().filter(s => s.statut === 'TERMINE').reduce((s, x) => s + x.minutesHumaines, 0);
  return {
    revenuEnregistre: revenu, paiements: rev.length, parAttribution: Object.fromEntries(['DIRECT', 'ASSISTE', 'INCONNU'].map(a => [a, rev.filter(r => r.attribution === a).reduce((s, r) => s + r.montant, 0)])),
    coutsIAetAPI: Math.round(coutIA * 100) / 100,
    valeurParCalcul: coutIA > 0 && revenu > 0 ? Math.round(revenu / coutIA) : 'UNKNOWN',
    heuresHumainesMesurees: Math.round(minutes / 6) / 10,
    profitNetParHeureHumaine: minutes > 0 && revenu > 0 ? Math.round((revenu - coutIA) / (minutes / 60) * 100) / 100 : 'UNKNOWN',
    rappel: 'prévision ≠ revenu ; pipeline ≠ revenu. Seuls les paiements enregistrés avec preuve figurent ici.',
  };
}

function importer(fichier){
  if(!fichier) throw new Error('fichier obligatoire');
  const lot = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  const {CHAMPS_PERSONNELS} = require('./hunter/prospects.js');
  const refus = [];
  for(const x of lot.etablissements || []){
    if(!x.nom || !x.sourceUrl || !x.collecteLe) refus.push((x.nom || '?') + ' : nom, sourceUrl et collecteLe obligatoires');
    for(const k of CHAMPS_PERSONNELS) if(x[k] != null) refus.push(x.nom + ' : champ personnel « ' + k + ' » interdit');
  }
  if(refus.length) throw new Error('import refusé — ' + refus.join(' ; '));
  const dest = path.join('imports', path.basename(fichier));
  E.ecrire(dest, lot);
  return {importe: (lot.etablissements || []).length, vers: E.chemin(dest)};
}

async function executer(nom, args = {}){
  const c = COMMANDES[nom];
  if(!c) throw new Error('commande inconnue : ' + nom + '. Commandes : ' + Object.keys(COMMANDES).join(', '));
  return c.fn(args);
}

module.exports = {COMMANDES, executer, argent};
