'use strict';
/* FIRST CUSTOMER — le mode qui ignore tout le reste.

   Il transforme « vendre Signature » en arbre d'actions exécutables :
   chaque nœud dit s'il est AUTO (JARVIS le fait), REVIEW (JARVIS le fait,
   l'humain valide), ou HUMAN (seul un humain peut : envoyer depuis son
   compte, encaisser, produire). `executerSuivante` exécute la première action
   AUTO disponible — la sortie n'est pas un conseil, c'est un travail fait. */

const E = require('./core/etat.js');
const M = require('./moteur.js');
const P = require('./hunter/prospects.js');
const H = require('./hunter/hunter.js');
const F = require('./outreach/file.js');
const CRM = require('./crm/crm.js');
const K = require('./fulfillment/chrono.js');
const PL = require('./pipeline.js');
const {chargerCatalogue} = require('../server/boutique.js');

function mode(){ return E.lire('mode.json', {mode: 'STANDARD', experience: null}); }
function activer(experienceDossier, {maintenant = new Date().toISOString()} = {}){
  return E.ecrire('mode.json', {mode: 'FIRST_CUSTOMER', experience: experienceDossier, depuis: maintenant});
}
function desactiver(){ return E.ecrire('mode.json', {mode: 'STANDARD', experience: null}); }

function entonnoir(experience){
  const leads = Object.values(CRM.lireLeads()).filter(l => l.experience === experience.id);
  const msgs = F.lireFile().filter(m => m.experience === experience.id);
  const au = e => leads.filter(l => CRM.ETAPES.indexOf(l.status) >= CRM.ETAPES.indexOf(e) && l.status !== 'LOST').length;
  return {
    cible: (experience.limites || {}).cibleProspects || 20,
    prospectsTrouves: leads.length,
    qualifies: leads.filter(l => l.qualifie).length,
    messagesPrepares: msgs.filter(m => m.statut === 'PREPARED').length,
    messagesApprouves: msgs.filter(m => m.statut === 'APPROVED').length,
    enAttenteEnvoiHumain: msgs.filter(m => m.statut === 'AWAITING_HUMAN_SEND').length,
    contactes: msgs.filter(m => m.statut === 'SENT').length,
    reponses: leads.filter(l => (l.conversation || []).some(c => c.type === 'reponse')).length,
    interesses: au('INTERESTED'),
    propositions: au('PROPOSAL'),
    gagnes: leads.filter(l => l.status === 'WON').length,
    perdus: leads.filter(l => l.status === 'LOST').length,
  };
}

/* P(premier client) : uniquement à partir de ce qui a été observé. En
   dessous de 5 prospects contactés, aucun chiffre : UNKNOWN. */
function probabilitePremierClient(experience, reg){
  const f = entonnoir(experience);
  if(f.gagnes > 0) return {valeur: 1, libelle: 'ATTEINT', base: f.gagnes + ' client(s) payant(s)'};
  if(f.contactes < 5) return {valeur: null, libelle: 'UNKNOWN / LOW CONFIDENCE', base: f.contactes + ' prospect(s) contacté(s) — moins de 5, aucune estimation honnête possible'};
  const o = reg.opportunites.find(x => x.id === experience.opportunite);
  const obs = (reg.observations || {})[o.id] || {contactes: f.contactes, ventes: 0};
  const p = M.probabiliteMiseAJour(o.prochainTest, obs);
  return {valeur: Math.round(p * 100) / 100, libelle: f.contactes < 15 ? 'FAIBLE CONFIANCE' : 'CONFIANCE MODÉRÉE',
    base: 'mise à jour bayésienne sur ' + f.contactes + ' contacts, ' + obs.ventes + ' vente(s), prior = estimation déclarée ' + Math.round(o.prochainTest.pEstimee * 100) + ' %'};
}

function distance(f){
  const etapes = [
    ['prospects', f.qualifies >= f.cible, 'trouver ' + Math.max(f.cible - f.qualifies, 0) + ' prospect(s) qualifié(s) de plus'],
    ['messages', f.messagesPrepares + f.messagesApprouves + f.enAttenteEnvoiHumain + f.contactes >= Math.min(f.qualifies, f.cible) && f.qualifies > 0, 'préparer les messages'],
    ['envoi', f.contactes > 0, 'envoyer les premiers messages'],
    ['réponse', f.reponses > 0, 'obtenir une première réponse'],
    ['intérêt', f.interesses > 0, 'obtenir un premier intérêt'],
    ['proposition', f.propositions > 0, 'faire une première proposition'],
    ['paiement', f.gagnes > 0, 'encaisser le premier paiement'],
  ];
  const reste = etapes.filter(e => !e[1]);
  return {etapesRestantes: reste.length, sur: etapes.length, prochaine: reste.length ? reste[0][2] : 'premier client obtenu', detail: etapes.map(e => ({etape: e[0], faite: e[1]}))};
}

/* Arbre d'actions. `minutesHumaines` : estimation du temps humain restant
   pour le nœud, déclarée comme telle — remplacée par la mesure dès qu'elle
   existe (chronomètre). */
function arbre(experience, {sante} = {}){
  const f = entonnoir(experience);
  const donneesOuvertes = sante ? sante.some(s => s.id === 'osm-overpass' && s.statut === 'PASS') : null;
  const nœuds = [
    {id: 'chasser', titre: 'Trouver ' + f.cible + ' prospects correspondant à l\'ICP', mode: 'AUTO', commande: 'chasser',
      fait: f.qualifies >= f.cible, bloque: f.qualifies < f.cible && donneesOuvertes === false ? 'sources ouvertes bloquées par le réseau — importer des prospects sourcés (etat/imports/) ou ouvrir overpass-api.de' : null, minutesHumaines: 0},
    {id: 'preparer', titre: 'Préparer un message conforme pour chaque prospect qualifié', mode: 'AUTO', commande: 'preparer',
      fait: f.qualifies > 0 && f.messagesPrepares + f.messagesApprouves + f.enAttenteEnvoiHumain + f.contactes >= Math.min(f.qualifies, f.cible), minutesHumaines: 0},
    {id: 'approuver', titre: 'Approuver, modifier ou ignorer chaque message', mode: 'REVIEW', commande: 'file',
      fait: f.messagesPrepares === 0 && f.messagesApprouves + f.enAttenteEnvoiHumain + f.contactes > 0, minutesHumaines: f.messagesPrepares * 0.5},
    {id: 'envoyer', titre: 'Envoyer depuis le compte Instagram de la maison (lien prêt, texte prêt)', mode: 'HUMAN', raison: 'aucune API d\'envoi autorisée pour un message direct depuis un compte personnel',
      commande: 'envoyer', fait: f.contactes > 0 && f.messagesApprouves === 0 && f.enAttenteEnvoiHumain === 0, minutesHumaines: (f.messagesApprouves + f.enAttenteEnvoiHumain) * 1},
    {id: 'reponses', titre: 'Classer chaque réponse et proposer l\'étape suivante', mode: 'REVIEW', raison: 'la boîte de réception n\'est pas connectée : coller la réponse, JARVIS classe',
      commande: 'reponse', fait: f.reponses > 0 && f.reponses >= f.contactes, minutesHumaines: Math.max(f.contactes - f.reponses, 0) * 0.3},
    {id: 'proposition', titre: 'Rédiger la proposition (offre, prix, délai, garantie)', mode: 'REVIEW', commande: 'genesis', fait: f.propositions > 0, minutesHumaines: 3},
    {id: 'paiement', titre: 'Encaisser et enregistrer le paiement avec sa preuve', mode: 'HUMAN', raison: 'paiement et KYC : porte humaine', commande: 'vente', fait: f.gagnes > 0, minutesHumaines: 5},
    {id: 'production', titre: 'Produire le pack, chronomètre lancé et arrêté par JARVIS', mode: 'HUMAN', raison: 'production créative par le propriétaire (assistée)', commande: 'chrono', fait: K.lire().some(s => s.statut === 'TERMINE' && s.opportunite === experience.opportunite), minutesHumaines: null},
  ];
  for(const n of nœuds) n.statut = n.fait ? 'FAIT' : n.bloque ? 'BLOQUE' : 'A_FAIRE';
  return nœuds;
}

function ratioAutonomie(nœuds){
  const auto = nœuds.filter(n => n.mode === 'AUTO').length;
  return {ratio: Math.round(auto / nœuds.length * 100) / 100, auto, revue: nœuds.filter(n => n.mode === 'REVIEW').length, humain: nœuds.filter(n => n.mode === 'HUMAN').length, total: nœuds.length};
}

function contexte(){
  const m = mode();
  const dossier = m.experience || 'experiments/signature-first-customer';
  const experience = P.chargerExperience(dossier);
  const catalogue = chargerCatalogue();
  const reg = PL.registreEnrichi();
  return {mode: m, dossier, experience, catalogue, reg, profil: P.icp(experience, catalogue)};
}

function etat({maintenant = new Date().toISOString(), sante} = {}){
  const c = contexte();
  const f = entonnoir(c.experience);
  const nœuds = arbre(c.experience, {sante});
  const reco = M.recommander(c.reg, {catalogue: c.catalogue, maintenant});
  const apprentissage = CRM.apprendre({});
  const minutes = nœuds.filter(n => !n.fait && n.minutesHumaines != null).reduce((a, n) => a + n.minutesHumaines, 0);
  return {
    mode: c.mode.mode, experience: c.experience.id, offre: c.profil.offre, hypothesesICP: c.profil.hypotheses,
    entonnoir: f, distance: distance(f), probabilite: probabilitePremierClient(c.experience, c.reg),
    arbre: nœuds, autonomie: ratioAutonomie(nœuds), minutesHumainesRestantesEstimees: Math.round(minutes),
    prochaineAuto: nœuds.find(n => !n.fait && n.mode === 'AUTO' && !n.bloque) || null,
    prochainHumain: nœuds.find(n => !n.fait && n.mode !== 'AUTO') || null,
    recommandation: reco.valide ? reco.top.map(x => ({id: x.id, seuilHoraire: x.seuilHoraire, etatTest: x.etatTest, p: x.p})) : reco.erreurs,
    ecartees: reco.valide ? reco.ecartees.map(x => ({id: x.id, refus: x.refus})) : [],
    apprentissage,
  };
}

/* Exécute ce qui peut l'être, dans l'ordre de l'arbre, sans rien envoyer. */
async function executerSuivante({maintenant = new Date().toISOString(), fetch, maxMessages} = {}){
  const c = contexte();
  const faits = [];
  const f = entonnoir(c.experience);
  if(f.qualifies < f.cible){
    const r = await H.chasser(c.experience, c.catalogue, {maintenant, fetch});
    faits.push({action: 'chasser', resultat: {nouveaux: r.nouveaux, qualifies: r.qualifies, total: r.total, sources: r.rapports}});
  }
  const leads = H.lireLeads();
  const app = CRM.apprendre({}).total;
  const taux = app && app.contactes >= 10 ? app.tauxVente : null;
  const p = F.preparer(leads, c.profil, c.experience, {maintenant, max: maxMessages ?? ((c.experience.limites || {}).cibleProspects || 20), tauxConversion: taux});
  faits.push({action: 'preparer', resultat: {prepares: p.prepares.length, ecartes: p.ecartes}});
  return {faits, etat: etat({maintenant})};
}

module.exports = {mode, activer, desactiver, entonnoir, probabilitePremierClient, distance, arbre, ratioAutonomie, etat, executerSuivante, contexte};
