'use strict';
/* Mémoire commerciale : conversations, étapes, revenus, apprentissage.

   Étapes : NEW → CONTACTED → REPLIED → INTERESTED → QUALIFIED → PROPOSAL → WON
            (LOST depuis n'importe où)

   REVENUE TRUTH : un revenu est un paiement enregistré avec montant, devise,
   date, activité, client, source et PREUVE. Une prévision, un pipeline, une
   proposition acceptée ne sont pas des revenus et n'ont aucun chemin pour
   entrer dans revenus.jsonl. */

const E = require('../core/etat.js');
const B = require('../core/evenements.js');
const F = require('../outreach/file.js');

const ETAPES = ['NEW', 'CONTACTED', 'REPLIED', 'INTERESTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
const RANG = Object.fromEntries(ETAPES.map((e, i) => [e, i]));

/* Classification par règles, volontairement simple et lisible. Elle se
   trompera ; c'est pourquoi l'humain peut la corriger (option intention) et
   pourquoi la confiance est affichée. Un modèle de langue pourra la
   remplacer le jour où il fera mieux sur des réponses réelles étiquetées. */
const MOTIFS = {
  retrait: /\b(stop|désinscri|desinscri|ne (plus )?m'?(é|e)cri|arr(ê|e)tez|unsubscribe|laissez[- ]moi)\b/i,
  negatif: /(\bnon merci|pas int(é|e)ress|pas besoin|pas pour (moi|nous)|on a d(é|e)j(à|a)|d(é|e)j(à|a) quelqu|^\s*non\b)/i,
  positif: /\b(oui|int(é|e)ress|volontiers|pourquoi pas|d'accord|ok\b|go\b|envoyez|montrez|avec plaisir|je veux bien|ça m'int)/i,
  question: /\?|combien|c'est quoi|comment (ça|ca) marche|quel (prix|délai|delai)/i,
};
const OBJECTIONS = {
  prix: /\b(cher|prix|budget|trop|co(û|u)te|tarif)\b/i,
  confiance: /\b(qui (ê|e)tes|arnaque|exemple|r(é|e)f(é|e)rence|preuve|portfolio)\b/i,
  timing: /\b(plus tard|pas maintenant|rentr(é|e)e|mois prochain|occup(é|e)|rappelez)\b/i,
  besoin: /\b(pas besoin|je (le )?fais moi|on g(è|e)re|pas utile)\b/i,
  concurrence: /\b(d(é|e)j(à|a) quelqu|agence|mon neveu|stagiaire|community manager)\b/i,
};

function classer(texte){
  let intention = 'neutre', confiance = 0.4;
  if(MOTIFS.retrait.test(texte)){ intention = 'retrait'; confiance = 0.9; }
  else if(MOTIFS.negatif.test(texte)){ intention = 'negatif'; confiance = 0.7; }
  else if(MOTIFS.positif.test(texte)){ intention = 'positif'; confiance = 0.6; }
  else if(MOTIFS.question.test(texte)){ intention = 'question'; confiance = 0.5; }
  const objections = Object.entries(OBJECTIONS).filter(([, r]) => r.test(texte)).map(([k]) => k);
  return {intention, objections, confiance, methode: 'règles'};
}

const PROCHAINE = {
  positif: 'envoyer deux visuels d\'essai ou un exemple, puis la proposition',
  question: 'répondre à la question avec le prix et le contenu exacts du catalogue',
  neutre: 'relire la réponse — classification incertaine',
  negatif: 'clore poliment, ne pas relancer',
  retrait: 'aucune : ajouté à la liste ne-pas-contacter',
};

function lireLeads(){ return E.lire('leads.json', {leads: {}}).leads; }

function surLead(id, fn){
  return E.modifier('leads.json', {leads: {}}, x => {
    const l = x.leads[id];
    if(!l) throw new Error('prospect inconnu : ' + id);
    l.conversation = l.conversation || [];
    return fn(l);
  });
}

function changerEtape(l, etape, maintenant, motif){
  if(!ETAPES.includes(etape)) throw new Error('étape inconnue : ' + etape);
  if(l.status === etape) return false;
  if(l.status === 'WON' && etape !== 'LOST') return false;
  const avant = l.status;
  l.status = etape;
  l.conversation.push({ts: maintenant, type: 'etape', de: avant, a: etape, motif: motif || null});
  B.emettre('STAGE_CHANGED', {lead: l.id, de: avant, a: etape, opportunite: l.opportunite}, {maintenant});
  return true;
}

function enregistrerReponse(leadId, texte, {maintenant = new Date().toISOString(), intention, canal} = {}){
  if(!texte || !texte.trim()) throw new Error('réponse vide');
  const c = classer(texte);
  if(intention){ c.intention = intention; c.confiance = 1; c.methode = 'humain'; }
  let cle;
  const r = surLead(leadId, l => {
    cle = l.cle;
    l.conversation.push({ts: maintenant, type: 'reponse', canal: canal || null, texte, intention: c.intention, objections: c.objections, confiance: c.confiance, methode: c.methode, prochaineEtape: PROCHAINE[c.intention]});
    if(RANG[l.status] < RANG.REPLIED) changerEtape(l, 'REPLIED', maintenant);
    if(c.intention === 'positif' && RANG[l.status] < RANG.INTERESTED) changerEtape(l, 'INTERESTED', maintenant);
    if(c.intention === 'negatif' || c.intention === 'retrait') changerEtape(l, 'LOST', maintenant, c.intention);
    return {lead: l.id, etape: l.status, classification: c, prochaineEtape: PROCHAINE[c.intention]};
  });
  E.modifier('outreach.json', {messages: []}, f => {
    const m = f.messages.filter(x => x.lead === leadId && x.statut === 'SENT').pop();
    if(m) m.reponse = {ts: maintenant, intention: c.intention, objections: c.objections};
  });
  B.emettre('REPLY_RECEIVED', {lead: leadId, intention: c.intention, objections: c.objections}, {maintenant});
  if(c.intention === 'retrait') F.nePasContacter(cle, 'demande de retrait du prospect', {maintenant});
  return r;
}

function avancer(leadId, etape, {maintenant = new Date().toISOString(), motif} = {}){
  if(etape === 'WON') throw new Error('WON ne se déclare pas : il découle d\'un paiement enregistré avec preuve');
  return surLead(leadId, l => { changerEtape(l, etape, maintenant, motif); return {lead: l.id, etape: l.status}; });
}

/* ── Revenus ──────────────────────────────────────────────────────────────── */

const ATTRIBUTIONS = ['DIRECT', 'ASSISTE', 'INCONNU'];

function enregistrerPaiement({lead, montant, devise = 'EUR', date, venture, opportunite, source, preuve, attribution, type = 'achat'}, {maintenant = new Date().toISOString()} = {}){
  if(!(montant > 0)) throw new Error('montant invalide');
  if(!preuve) throw new Error('paiement sans preuve refusé (référence de virement, reçu, capture de transaction)');
  if(!source) throw new Error('paiement sans source refusé');
  if(!ATTRIBUTIONS.includes(attribution)) throw new Error('attribution obligatoire : DIRECT, ASSISTE ou INCONNU');
  if(!['achat', 'acompte'].includes(type)) throw new Error('type de paiement inconnu : ' + type);
  const leads = lireLeads();
  const l = lead ? leads[lead] : null;
  if(lead && !l) throw new Error('prospect inconnu : ' + lead);
  const rev = {id: E.identifiant('rev'), type, montant, devise, date: date || maintenant.slice(0, 10), venture: venture || (l && l.venture),
    opportunite: opportunite || (l && l.opportunite), client: lead || 'hors-pipeline', source, preuve, attribution, enregistreLe: maintenant};
  if(!rev.venture || !rev.opportunite) throw new Error('paiement non rattaché à une activité et une opportunité');
  E.ajouterLigne('revenus.jsonl', rev);
  B.emettre('SALE_CREATED', {revenu: rev.id, lead: rev.client, montant, opportunite: rev.opportunite}, {maintenant});
  B.emettre('PAYMENT_CONFIRMED', {revenu: rev.id, lead: rev.client, montant, devise, type, attribution, opportunite: rev.opportunite}, {maintenant});
  if(l) surLead(lead, x => {
    x.conversation.push({ts: maintenant, type: 'paiement', montant, devise, preuve, revenu: rev.id});
    if(type === 'achat') changerEtape(x, 'WON', maintenant, 'paiement ' + rev.id);
    else if(RANG[x.status] < RANG.PROPOSAL) changerEtape(x, 'PROPOSAL', maintenant, 'acompte ' + rev.id);
  });
  return rev;
}

function rembourser(revenuId, {montant, motif, preuve}, {maintenant = new Date().toISOString()} = {}){
  const rev = lireRevenus().find(r => r.id === revenuId);
  if(!rev) throw new Error('revenu inconnu : ' + revenuId);
  if(!preuve) throw new Error('remboursement sans preuve refusé');
  const r = Object.assign({}, rev, {id: E.identifiant('rev'), type: 'remboursement', montant: -Math.abs(montant ?? rev.montant), rembourse: revenuId, motif, preuve, enregistreLe: maintenant});
  E.ajouterLigne('revenus.jsonl', r);
  B.emettre('REFUND', {revenu: revenuId, montant: r.montant}, {maintenant});
  return r;
}

function lireRevenus(){ return E.lireLignes('revenus.jsonl'); }

/* ── Apprentissage commercial ─────────────────────────────────────────────
   Optimiser le taux de réponse fabrique des messages aguicheurs qui ne
   vendent pas. La métrique de décision est le PROFIT PAR PROSPECT CONTACTÉ :
   revenu − coût mesuré de production, divisé par les prospects contactés. */

function apprendre({coutProductionParVente = null} = {}){
  const messages = F.lireFile().filter(m => m.statut === 'SENT');
  const leads = lireLeads();
  const revenus = lireRevenus();
  const groupes = {};
  const ajouter = (cle, m) => {
    const g = groupes[cle] = groupes[cle] || {contactes: 0, reponses: 0, positives: 0, rendezVous: 0, propositions: 0, ventes: 0, revenu: 0};
    const l = leads[m.lead] || {};
    const conv = l.conversation || [];
    g.contactes++;
    if(conv.some(c => c.type === 'reponse')) g.reponses++;
    if(conv.some(c => c.type === 'reponse' && c.intention === 'positif')) g.positives++;
    if(RANG[l.status] >= RANG.QUALIFIED && l.status !== 'LOST') g.rendezVous++;
    if(RANG[l.status] >= RANG.PROPOSAL && l.status !== 'LOST') g.propositions++;
    const r = revenus.filter(x => x.client === m.lead).reduce((s, x) => s + x.montant, 0);
    if(revenus.some(x => x.client === m.lead && x.type === 'achat')) g.ventes++;
    g.revenu += r;
  };
  for(const m of messages){
    ajouter('variante:' + m.templateVersion, m);
    ajouter('segment:' + ((leads[m.lead] || {}).industry || 'UNKNOWN'), m);
    ajouter('total', m);
  }
  for(const g of Object.values(groupes)){
    g.tauxReponse = g.contactes ? g.reponses / g.contactes : null;
    g.tauxVente = g.contactes ? g.ventes / g.contactes : null;
    g.profitParProspect = coutProductionParVente == null ? null : (g.revenu - g.ventes * coutProductionParVente) / g.contactes;
    g.revenuParProspect = g.contactes ? g.revenu / g.contactes : null;
    g.echantillon = g.contactes < 10 ? 'trop petit pour conclure (< 10)' : 'exploitable avec prudence';
  }
  return groupes;
}

module.exports = {ETAPES, classer, enregistrerReponse, avancer, enregistrerPaiement, rembourser, lireRevenus, lireLeads, apprendre, PROCHAINE};
