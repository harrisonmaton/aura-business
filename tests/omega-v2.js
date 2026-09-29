'use strict';
/* Recette de JARVIS Ω V2 — pipeline FIRST CUSTOMER.

   Chaque contrôle correspond à une façon dont un pipeline commercial
   automatisé ment, spamme ou perd une tâche : donnée inventée quand la source
   est bloquée, personne fictive, message générique, envoi sans approbation,
   relance d'un prospect qui a dit stop, revenu déclaré sans preuve, tâche
   perdue au crash, dépense sans plafond, recommandation qui ignore les
   résultats réels.

   État isolé dans un dossier temporaire, réseau remplacé par de faux fetch. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');

const RACINE = path.join(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-v2-'));
process.env.OMEGA_ETAT = path.join(TMP, 'etat');
delete process.env.OMEGA_KBO_DIR;

const E = require('../omega/core/etat.js');
const BUS = require('../omega/core/evenements.js');
const {resultat} = require('../omega/data/contrat.js');
const D = require('../omega/data/registre-pays.js');
const FO = require('../omega/data/fournisseurs.js');
const P = require('../omega/hunter/prospects.js');
const H = require('../omega/hunter/hunter.js');
const CP = require('../omega/outreach/copie.js');
const F = require('../omega/outreach/file.js');
const CRM = require('../omega/crm/crm.js');
const K = require('../omega/fulfillment/chrono.js');
const PL = require('../omega/pipeline.js');
const PC = require('../omega/premier-client.js');
const M = require('../omega/moteur.js');
const G = require('../omega/genesis/genesis.js');
const CO = require('../omega/comptes/orchestrateur.js');
const COM = require('../omega/commerce/fournisseur.js');
const Q = require('../omega/worker/file-taches.js');
const T = require('../omega/worker/taches.js');
const W = require('../omega/worker/worker.js');
const PLN = require('../omega/worker/planificateur.js');
const BR = require('../omega/brief.js');
const AG = require('../omega/agents.js');
const DOC = require('../omega/doctor.js');
const {chargerCatalogue} = require('../server/boutique.js');

const CAT = chargerCatalogue();
const EXP = P.chargerExperience('experiments/signature-first-customer');
const ICP = P.icp(EXP, CAT);
const J = '2026-09-29T';
let h = 0;
const t = () => J + String(8 + Math.floor(h / 60)).padStart(2, '0') + ':' + String(h++ % 60).padStart(2, '0') + ':00.000Z';

function remettreAZero(){ fs.rmSync(process.env.OMEGA_ETAT, {recursive: true, force: true}); }

const R = [];
const tests = [];
const ck = (nom, fn) => tests.push([nom, fn]);

/* Faux Overpass : trois établissements réels dans leur forme, fictifs dans
   leur contenu — ils ne quittent jamais ce test. */
function fauxOverpass(elements){
  return async (url) => {
    if(!String(url).includes('overpass')) return {ok: false, status: 403};
    return {ok: true, status: 200, json: async () => ({elements})};
  };
}
const ELEMENTS = [
  {type: 'node', id: 1, tags: {name: 'Friterie Test', amenity: 'fast_food', 'addr:city': 'Bruxelles', 'addr:postcode': '1000', 'contact:instagram': 'https://instagram.com/friterie_test/', website: 'https://friterie.test'}},
  {type: 'node', id: 2, tags: {name: 'Quick Test', amenity: 'fast_food', 'addr:city': 'Bruxelles', 'contact:instagram': 'quick_test'}},
  {type: 'node', id: 3, tags: {name: 'Café Sans Contact', amenity: 'cafe', 'addr:city': 'Bruxelles'}},
  {type: 'way', id: 4, tags: {name: 'Bistro Mail', amenity: 'restaurant', 'addr:city': 'Bruxelles', email: 'jean.dupont@bistro.test', phone: '+32 2 000 00 00'}},
  {type: 'node', id: 5, tags: {name: 'Snack Info', amenity: 'fast_food', 'addr:city': 'Bruxelles', email: 'info@snack.test'}},
];

/* ── 1. Données : jamais de repli inventé ─────────────────────────────────── */

ck('contrat : une donnée avec un statut non lisible est refusée', () => {
  assert.throws(() => resultat({status: 'BLOCKED', source: 'x', data: [1]}), /refusé/);
  assert.throws(() => resultat({status: 'OK', source: 'x'}), /sans donnée/);
  const r = resultat({status: 'UNKNOWN', source: 'x'});
  assert.strictEqual(r.data, null); assert.strictEqual(r.confidence, 0);
});

ck('repli : primaire bloquée, secondaire lue — la réponse dit laquelle et pourquoi', async () => {
  remettreAZero();
  const r = await D.interroger('BE', 'maps', {zone: 'Bruxelles'}, {fetch: fauxOverpass(ELEMENTS), maintenant: J + '08:00:00Z'});
  assert.strictEqual(r.status, 'OK');
  assert.strictEqual(r.source, 'osm-overpass');
  assert.strictEqual(r.jurisdiction, 'BE');
  assert.ok(r.data.length === 5 && r.data[0].instagram);
});

ck('repli : tout bloqué → CACHE avec la date d\'origine, puis UNKNOWN sans cache', async () => {
  const bloque = async () => ({ok: false, status: 403});
  const c = await D.interroger('BE', 'maps', {zone: 'Bruxelles'}, {fetch: bloque});
  assert.strictEqual(c.status, 'CACHE');
  assert.strictEqual(c.timestamp, J + '08:00:00Z');
  assert.ok(c.tentatives.every(x => x.status !== 'OK'));
  const u = await D.interroger('BE', 'maps', {zone: 'Liège'}, {fetch: bloque});
  assert.strictEqual(u.status, 'UNKNOWN');
  assert.strictEqual(u.data, null);
});

ck('réseau refusé (exception) → BLOCKED, jamais un chiffre', async () => {
  const f = async () => { const e = new Error('fetch failed'); e.cause = {code: 'ECONNREFUSED'}; throw e; };
  for(const fo of [FO.TOUS.find(x => x.id === 'osm-overpass'), FO.TOUS.find(x => x.id === 'eurostat'), FO.TOUS.find(x => x.id === 'worldbank')]){
    const r = await fo.interroger({zone: 'Bruxelles', pays: 'BE', jeu: 'sts_trtu_m', indicateur: 'NY.GDP.MKTP.CD'}, {fetch: f});
    assert.strictEqual(r.status, 'BLOCKED', fo.id);
    assert.strictEqual(r.data, null);
  }
});

ck('Europe d\'abord : BE, FR, ES ont leurs sources ; un autre pays UE retombe sur l\'UE', () => {
  assert.deepStrictEqual(D.fournisseurs('BE', 'businessRegistry').map(f => f.id)[0], 'be-kbo-opendata');
  assert.deepStrictEqual(D.fournisseurs('FR', 'businessRegistry').map(f => f.id)[0], 'fr-recherche-entreprises');
  assert.strictEqual(D.fournisseurs('ES', 'businessRegistry')[0].id, 'es-registro-mercantil');
  assert.deepStrictEqual(D.fournisseurs('PL', 'maps').map(f => f.id), D.fournisseurs('EU', 'maps').map(f => f.id));
  const m = D.matrice();
  assert.ok(m.every(l => l.licence && l.implementation && l.auth));
});

ck('BCE : sans extrait → NOT_CONFIGURED ; avec un extrait au format open data → établissements', async () => {
  const kbo = FO.TOUS.find(x => x.id === 'be-kbo-opendata');
  assert.strictEqual((await kbo.interroger({pays: 'BE'})).status, 'NOT_CONFIGURED');
  const dir = path.join(TMP, 'kbo'); fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'activity.csv'), 'EntityNumber,ActivityGroup,NaceVersion,NaceCode,Classification\n"0123.456.789","001","2008","56101","MAIN"\n"0999.999.999","001","2008","47110","MAIN"\n');
  fs.writeFileSync(path.join(dir, 'address.csv'), 'EntityNumber,TypeOfAddress,CountryNL,CountryFR,Zipcode,MunicipalityNL,MunicipalityFR,StreetNL,StreetFR,HouseNumber,Box,ExtraAddressInfo,DateStrikingOff\n"0123.456.789","REGO","","","1000","Brussel","Bruxelles","","Rue Test","1","","",""\n');
  fs.writeFileSync(path.join(dir, 'denomination.csv'), 'EntityNumber,Language,TypeOfDenomination,Denomination\n"0123.456.789","2","001","Brasserie Test"\n');
  process.env.OMEGA_KBO_DIR = dir;
  try {
    const r = await kbo.interroger({pays: 'BE', codesPostaux: ['1000']});
    assert.strictEqual(r.status, 'OK');
    assert.strictEqual(r.data.etablissements.length, 1);
    assert.strictEqual(r.data.etablissements[0].nom, 'Brasserie Test');
    assert.strictEqual(r.data.etablissements[0].emailPublic, null);
  } finally { delete process.env.OMEGA_KBO_DIR; }
});

ck('import : une fiche sans source ni date de collecte est rejetée', async () => {
  remettreAZero();
  E.ecrire('imports/lot.json', {confiance: 0.4, etablissements: [
    {nom: 'Avec Source', pays: 'BE', ville: 'Bruxelles', instagram: 'avec_source', activite: 'amenity=fast_food', sourceUrl: 'https://exemple.test/a', collecteLe: '2026-09-29'},
    {nom: 'Sans Source', pays: 'BE', ville: 'Bruxelles', instagram: 'sans_source'},
  ]});
  const r = await FO.TOUS.find(x => x.id === 'import-source').interroger({pays: 'BE', zone: 'Bruxelles'});
  assert.strictEqual(r.status, 'OK');
  assert.deepStrictEqual(r.data.etablissements.map(x => x.nom), ['Avec Source']);
  assert.strictEqual(r.data.rejets.length, 1);
});

/* ── 2. Prospects : entreprises réelles, rien d'inventé ───────────────────── */

ck('fiche : champs personnels retirés, email nominatif refusé, inconnu = UNKNOWN', () => {
  const p = P.versProspect({nom: 'Bistro', prenom: 'Jean', fonction: 'gérant', emailPublic: 'jean.dupont@bistro.test', ville: 'Bruxelles'}, {source: 'test', collecteLe: '2026-09-29'});
  assert.ok(!('prenom' in p) && !('fonction' in p));
  assert.ok(p.champsRetires.includes('prenom') && p.champsRetires.includes('fonction'));
  assert.strictEqual(p.publicContactData.email, P.UNKNOWN);
  assert.strictEqual(p.website, P.UNKNOWN);
  assert.strictEqual(p.publicContactData.instagram, P.UNKNOWN);
  assert.strictEqual(P.emailProfessionnel('info@snack.test'), 'info@snack.test');
  assert.strictEqual(P.emailProfessionnel('contact.pro@snack.test'), 'contact.pro@snack.test');
});

ck('score : chaîne exclue, commerce sans canal non qualifié, indépendant Instagram qualifié', () => {
  const s = e => P.scorer(P.versProspect(e, {source: 't', collecteLe: '2026-09-29', confianceSource: 0.6}), ICP, {maintenant: J + '09:00:00Z'});
  const bon = s({nom: 'Friterie', activite: 'amenity=fast_food', ville: 'Bruxelles', pays: 'BE', instagram: 'friterie'});
  const chaine = s({nom: 'Quick Midi', activite: 'amenity=fast_food', ville: 'Bruxelles', pays: 'BE', instagram: 'quick'});
  const muet = s({nom: 'Café', activite: 'amenity=cafe', ville: 'Bruxelles', pays: 'BE'});
  assert.ok(bon.qualifie && bon.score >= 50, 'bon ' + bon.score);
  assert.ok(!chaine.qualifie && chaine.detail.companyFit === 0);
  assert.ok(!muet.qualifie && muet.detail.contactability === 0);
  assert.ok(bon.score <= 100 && bon.confidence > 0 && bon.confidence <= 1);
});

ck('chasse : dédoublonnage par handle, événements LEAD_FOUND / LEAD_QUALIFIED', async () => {
  remettreAZero();
  const r = await H.chasser(EXP, CAT, {maintenant: t(), fetch: fauxOverpass(ELEMENTS.concat([{type: 'node', id: 9, tags: {name: 'Friterie Test bis', amenity: 'fast_food', 'addr:city': 'Bruxelles', 'contact:instagram': '@Friterie_Test'}}]))});
  const leads = Object.values(H.lireLeads());
  assert.strictEqual(leads.filter(l => l.publicContactData.instagram === 'friterie_test').length, 1);
  assert.strictEqual(r.total, 5);
  assert.ok(BUS.lire({types: ['LEAD_FOUND']}).length === 5);
  assert.ok(BUS.lire({types: ['LEAD_QUALIFIED']}).length >= 1);
  const again = await H.chasser(EXP, CAT, {maintenant: t(), fetch: fauxOverpass(ELEMENTS)});
  assert.strictEqual(again.nouveaux, 0);
});

ck('chasse avec toutes les sources bloquées : 0 prospect, DATA_BLOCKED, rien inventé', async () => {
  remettreAZero();
  const r = await H.chasser(EXP, CAT, {maintenant: t(), fetch: async () => ({ok: false, status: 403})});
  assert.strictEqual(r.total, 0);
  assert.ok(['UNKNOWN', 'CACHE'].includes(r.rapports[0].status));
  assert.strictEqual(BUS.lire({types: ['DATA_BLOCKED']}).length, 1);
});

/* ── 3. Messages ──────────────────────────────────────────────────────────── */

ck('copie : observation vérifiée → douleur en question → valeur du catalogue → CTA + retrait', () => {
  const lead = P.versProspect({nom: 'Friterie', activite: 'amenity=fast_food', ville: 'Bruxelles', instagram: 'f'}, {source: 't', collecteLe: '2026-09-29'});
  const m = CP.rediger(lead, ICP, EXP, 'A-observation-essai');
  const sig = CAT.brief.find(b => b.id === 2);
  assert.ok(m.texte.includes('Friterie') && m.texte.includes('Bruxelles') && m.texte.includes('restauration rapide'));
  assert.ok(m.texte.includes(sig.price + ' €') && m.texte.includes(String(sig.visuals)));
  assert.ok(m.parties.douleur.includes('?'));
  assert.ok(m.texte.includes(CP.RETRAIT) && m.texte.includes(CP.SIGNATURE));
  assert.ok(m.champsUtilises.includes('industry') && m.champsUtilises.includes('location.ville'));
  for(const v of Object.keys(CP.VARIANTES)){
    const x = CP.rediger(lead, ICP, EXP, v);
    assert.ok(!/le mois|par mois|mensuel|abonnement(?! )/i.test(x.texte.replace(/sans abonnement/g, '')), v + ' laisse croire à un abonnement');
  }
  const vide = P.versProspect({nom: 'X'}, {source: 't', collecteLe: '2026-09-29'});
  assert.strictEqual(CP.rediger(vide, ICP, EXP, 'B-question-temps'), null);
});

async function pipelinePret(){
  remettreAZero();
  await H.chasser(EXP, CAT, {maintenant: t(), fetch: fauxOverpass(ELEMENTS)});
  return F.preparer(H.lireLeads(), ICP, EXP, {maintenant: t()});
}

ck('file : préparé, jamais envoyé sans approbation ; message direct = lien prêt + confirmation humaine', async () => {
  const p = await pipelinePret();
  assert.ok(p.prepares.length >= 2, 'préparés ' + p.prepares.length);
  const bistro = Object.values(H.lireLeads()).find(l => l.company === 'Bistro Mail');
  assert.ok(!bistro.qualifie && !p.prepares.some(m => m.lead === bistro.id), 'téléphone seul : ni qualifié ni message');
  const ig = p.prepares.find(m => m.canal === 'instagram_dm');
  const r0 = await F.envoyer(ig.id, {leads: H.lireLeads(), experience: EXP, maintenant: t()});
  assert.strictEqual(r0.statut, 'REFUSE');
  F.approuver(ig.id, {maintenant: t()});
  const r = await F.envoyer(ig.id, {leads: H.lireLeads(), experience: EXP, maintenant: t()});
  assert.strictEqual(r.statut, 'AWAITING_HUMAN_SEND');
  assert.ok(r.lien.startsWith('https://ig.me/m/'));
  assert.strictEqual(H.lireLeads()[ig.lead].status, 'NEW');
  F.confirmerEnvoi(ig.id, {maintenant: t()});
  assert.strictEqual(H.lireLeads()[ig.lead].status, 'CONTACTED');
  assert.strictEqual(BUS.lire({types: ['MESSAGE_SENT']}).length, 1);
});

ck('email : adresse nominative jamais utilisée ; sans connecteur → NOT_CONFIGURED, message conservé', async () => {
  const p = await pipelinePret();
  const leads = H.lireLeads();
  const bistro = Object.values(leads).find(l => l.company === 'Bistro Mail');
  assert.strictEqual(bistro.publicContactData.email, P.UNKNOWN);
  const mail = p.prepares.find(m => m.canal === 'email');
  assert.ok(mail && mail.destinataire === 'info@snack.test');
  F.approuver(mail.id, {maintenant: t()});
  const r = await F.envoyer(mail.id, {leads, experience: EXP, maintenant: t()});
  assert.strictEqual(r.statut, 'NOT_CONFIGURED');
  assert.strictEqual(F.lireFile().find(m => m.id === mail.id).statut, 'APPROVED');
});

ck('ne-pas-contacter : retire les messages en attente et bloque toute préparation future', async () => {
  const p = await pipelinePret();
  const m = p.prepares[0];
  F.nePasContacter(m.cle, 'test', {maintenant: t()});
  assert.strictEqual(F.lireFile().find(x => x.id === m.id).statut, 'SKIPPED');
  E.modifier('leads.json', {leads: {}}, x => { x.leads[m.lead].status = 'NEW'; });
  const r = F.preparer(H.lireLeads(), ICP, EXP, {maintenant: t()});
  assert.ok(r.ecartes.some(e => e.lead === m.lead && /ne pas contacter/.test(e.motif)));
});

ck('plafond quotidien et dédoublonnage appliqués à l\'envoi', async () => {
  const p = await pipelinePret();
  const exp1 = Object.assign({}, EXP, {limites: Object.assign({}, EXP.limites, {messagesParJour: 1})});
  const igs = p.prepares.filter(m => m.canal === 'instagram_dm');
  for(const m of p.prepares) F.approuver(m.id, {maintenant: t()});
  const a = await F.envoyer(igs[0].id, {leads: H.lireLeads(), experience: exp1, maintenant: t()});
  assert.strictEqual(a.statut, 'AWAITING_HUMAN_SEND');
  if(igs[1]){
    const b = await F.envoyer(igs[1].id, {leads: H.lireLeads(), experience: exp1, maintenant: t()});
    assert.strictEqual(b.statut, 'REFUSE'); assert.ok(/plafond quotidien/.test(b.motif));
  }
  const d = F.preparer(Object.assign({}, H.lireLeads()), ICP, EXP, {maintenant: t()});
  assert.strictEqual(d.prepares.length, 0);
});

ck('édition sans phrase de retrait refusée ; juridiction inconnue : email interdit', async () => {
  const p = await pipelinePret();
  assert.throws(() => F.approuver(p.prepares[0].id, {texte: 'Bonjour, achetez.'}), /retrait/);
  const lead = P.versProspect({nom: 'Diner', pays: 'US', ville: 'Austin', activite: 'amenity=restaurant', emailPublic: 'info@diner.test'}, {source: 't', collecteLe: '2026-09-29'});
  lead.qualifie = true; lead.venture = 'aura'; lead.score = 60;
  const r = F.preparer({[lead.id]: lead}, ICP, EXP, {maintenant: t()});
  assert.strictEqual(r.prepares.length, 0);
  assert.ok(/juridiction US/.test(r.ecartes[0].motif));
});

/* ── 4. Conversations et revenus ──────────────────────────────────────────── */

async function contacte(n = 1){
  const p = await pipelinePret();
  const ids = [];
  for(const m of p.prepares.filter(x => x.canal === 'instagram_dm').slice(0, n)){
    F.approuver(m.id, {maintenant: t()});
    await F.envoyer(m.id, {leads: H.lireLeads(), experience: EXP, maintenant: t()});
    F.confirmerEnvoi(m.id, {maintenant: t()});
    ids.push(m.lead);
  }
  return ids;
}

ck('réponse « STOP » → LOST + ne-pas-contacter ; réponse positive → INTERESTED', async () => {
  const [a] = await contacte(1);
  const r = CRM.enregistrerReponse(a, 'Oui, ça m\'intéresse, c\'est combien ?', {maintenant: t()});
  assert.strictEqual(r.etape, 'INTERESTED');
  assert.strictEqual(r.classification.intention, 'positif');
  const s = CRM.enregistrerReponse(a, 'Finalement stop, ne m\'écrivez plus', {maintenant: t()});
  assert.strictEqual(s.etape, 'LOST');
  assert.ok(F.lireNPC()[H.lireLeads()[a].cle]);
});

ck('REVENUE TRUTH : WON ne se déclare pas ; paiement sans preuve refusé ; avec preuve → WON', async () => {
  const [a] = await contacte(1);
  assert.throws(() => CRM.avancer(a, 'WON'), /paiement/);
  assert.throws(() => CRM.enregistrerPaiement({lead: a, montant: 90, source: 's', attribution: 'ASSISTE'}), /preuve/);
  assert.throws(() => CRM.enregistrerPaiement({lead: a, montant: 90, source: 's', preuve: 'p'}), /attribution/);
  CRM.avancer(a, 'PROPOSAL', {maintenant: t()});
  assert.strictEqual(CRM.lireRevenus().length, 0, 'une proposition n\'est pas un revenu');
  const rev = CRM.enregistrerPaiement({lead: a, montant: 90, source: 'virement', preuve: 'réf. TEST-1', attribution: 'ASSISTE'}, {maintenant: t()});
  assert.strictEqual(H.lireLeads()[a].status, 'WON');
  assert.strictEqual(rev.devise, 'EUR');
  assert.strictEqual(BUS.lire({types: ['PAYMENT_CONFIRMED']}).length, 1);
});

/* ── 5. La boucle : un résultat réel change la recommandation ─────────────── */

ck('STOP CONDITION : une vente enregistrée fait passer le test à sa suite et relève la preuve', async () => {
  remettreAZero();
  const avant = M.recommander(PL.registreEnrichi(), {catalogue: CAT, maintenant: J + '12:00:00Z'});
  const sAvant = avant.top.find(x => x.id === 'signature-en-direct');
  assert.strictEqual(sAvant.etape, 1);
  const [a] = await contacte(1);
  CRM.enregistrerPaiement({lead: a, montant: 90, source: 'virement', preuve: 'réf. TEST-2', attribution: 'ASSISTE'}, {maintenant: t()});
  const apres = M.recommander(PL.registreEnrichi(), {catalogue: CAT, maintenant: J + '12:00:00Z'});
  const s = apres.top.concat(apres.ecartees).find(x => x.id === 'signature-en-direct');
  assert.strictEqual(s.niveau, 4, 'achat');
  assert.strictEqual(s.etape, 2, 'passage au test de répétabilité');
  assert.ok(/Répétabilité/.test(s.prochainTest.action));
  assert.strictEqual(apres.revenusVerifies30j, 90);
  assert.notStrictEqual(apres.empreinte, avant.empreinte);
});

ck('STOP CONDITION : 20 contacts sans vente → KILL, l\'opportunité sort du classement', async () => {
  remettreAZero();
  const lot = {confiance: 0.5, etablissements: Array.from({length: 20}, (_, i) => ({nom: 'Commerce ' + i, pays: 'BE', ville: 'Bruxelles', activite: 'amenity=fast_food', instagram: 'commerce_' + i, sourceUrl: 'https://exemple.test/' + i, collecteLe: '2026-09-29'}))};
  E.ecrire('imports/vingt.json', lot);
  await H.chasser(EXP, CAT, {maintenant: t(), fetch: async () => ({ok: false, status: 403})});
  const exp = Object.assign({}, EXP, {limites: Object.assign({}, EXP.limites, {messagesParJour: 100})});
  const p = F.preparer(H.lireLeads(), ICP, exp, {maintenant: t()});
  assert.strictEqual(p.prepares.length, 20);
  const mi = M.recommander(PL.registreEnrichi(), {catalogue: CAT, maintenant: J + '12:00:00Z'});
  for(const [i, m] of p.prepares.entries()){
    F.approuver(m.id, {maintenant: t()});
    await F.envoyer(m.id, {leads: H.lireLeads(), experience: exp, maintenant: t()});
    F.confirmerEnvoi(m.id, {maintenant: t()});
    if(i === 9){
      const x = M.recommander(PL.registreEnrichi(), {catalogue: CAT, maintenant: J + '12:00:00Z'}).top.find(y => y.id === 'signature-en-direct');
      const y = mi.top.find(z => z.id === 'signature-en-direct');
      assert.ok(x.p < y.p, 'la probabilité baisse avec 10 contacts sans vente : ' + x.p + ' < ' + y.p);
    }
  }
  const r = M.recommander(PL.registreEnrichi(), {catalogue: CAT, maintenant: J + '12:00:00Z'});
  assert.ok(!r.top.some(x => x.id === 'signature-en-direct'));
  const k = r.ecartees.find(x => x.id === 'signature-en-direct');
  assert.ok(k && /^KILL/.test(k.refus[0]), JSON.stringify(k && k.refus));
  const e = PC.etat({maintenant: J + '12:00:00Z'});
  assert.strictEqual(e.entonnoir.contactes, 20);
  assert.ok(typeof e.probabilite.valeur === 'number' && e.probabilite.valeur < 0.05);
});

ck('chronomètre : minutes mesurées remplacent l\'estimation et déplacent le seuil horaire', () => {
  remettreAZero();
  const avant = M.recommander(PL.registreEnrichi(), {catalogue: CAT, maintenant: J + '12:00:00Z'}).top.find(x => x.id === 'signature-en-direct');
  const s = K.demarrer({opportunite: 'signature-en-direct', prix: 90, produit: 'Signature'}, {maintenant: J + '09:00:00.000Z'});
  K.pause(s.id, {maintenant: J + '09:40:00.000Z'});
  K.reprendre(s.id, {maintenant: J + '10:00:00.000Z'});
  K.ajouterCout(s.id, {ia: 0.8, api: 0.2});
  const fin = K.arreter(s.id, {maintenant: J + '10:50:00.000Z'});
  assert.strictEqual(fin.minutesHumaines, 90, 'la pause ne compte pas');
  const c = K.coutReel(fin);
  assert.strictEqual(c.coutTotal, null, 'aucune valeur horaire inventée');
  assert.strictEqual(c.seuilHoraire, Math.round((90 - 1) / 1.5 * 100) / 100);
  assert.strictEqual(K.coutReel(fin, {tauxHoraire: 20}).margeNette, 90 - 30 - 1);
  const apres = M.recommander(PL.registreEnrichi(), {catalogue: CAT, maintenant: J + '12:00:00Z'}).top.find(x => x.id === 'signature-en-direct');
  assert.ok(apres.seuilHoraire > avant.seuilHoraire, apres.seuilHoraire + ' > ' + avant.seuilHoraire);
  assert.ok(apres.hypotheses.some(x => /MESURÉ : 1.5 h/.test(x)));
  assert.strictEqual(BUS.lire({types: ['FULFILLMENT_COMPLETED']}).length, 1);
});

ck('P(premier client) : UNKNOWN sous 5 contacts ; arbre d\'actions AUTO / REVIEW / HUMAN', async () => {
  await contacte(1);
  const e = PC.etat({maintenant: J + '12:00:00Z', sante: [{id: 'osm-overpass', statut: 'BLOCKED'}]});
  assert.strictEqual(e.probabilite.valeur, null);
  assert.strictEqual(e.probabilite.libelle, 'UNKNOWN / LOW CONFIDENCE');
  assert.ok(e.arbre.every(n => ['AUTO', 'REVIEW', 'HUMAN'].includes(n.mode)));
  assert.ok(e.arbre.filter(n => n.mode === 'HUMAN').every(n => n.raison));
  assert.ok(e.autonomie.ratio > 0 && e.autonomie.ratio < 1);
  assert.ok(e.distance.etapesRestantes > 0);
  const p = F.preparer(H.lireLeads(), ICP, EXP, {maintenant: t()});
  const e2 = PC.etat({maintenant: J + '12:00:00Z'});
  if(e2.entonnoir.messagesPrepares > 0){
    assert.strictEqual(e2.arbre.find(n => n.id === 'preparer').statut, 'FAIT', 'messages préparés : le nœud est fait');
    assert.notStrictEqual(e2.prochaineAuto && e2.prochaineAuto.id, 'preparer');
  }
  assert.ok(p);
});

/* ── 6. Genesis, commerce, comptes ────────────────────────────────────────── */

ck('genesis : landing en 7 blocs, prix du catalogue, aucune fausse preuve, décisions dues listées', () => {
  remettreAZero();
  const r = G.genesisLite('experiments/signature-first-customer', CAT);
  const html = fs.readFileSync(path.join(r.dossier, 'landing.html'), 'utf8');
  for(const s of ['Le problème', 'La preuve', 'L\'offre', 'Le prix', 'Questions']) assert.ok(html.includes(s), s);
  assert.ok(html.includes(CAT.brief.find(b => b.id === 2).price + ' €'));
  assert.ok(!/témoignage|ils nous font confiance|clients satisfaits|★/i.test(html));
  assert.ok(html.includes('aucun client à citer'));
  assert.ok(!/révisions? incluses?/i.test(html), 'réponse non décidée écrite à la place du propriétaire');
  assert.ok(r.decisionsDues.some(d => /révisions/.test(d.question)));
  assert.ok(fs.existsSync(path.join(r.dossier, 'genesis.json')));
});

ck('commerce : Stripe non configuré le dit ; paiement manuel exige une preuve', () => {
  assert.strictEqual(COM.FOURNISSEURS.stripe.statut().statut, 'NOT_CONFIGURED');
  assert.strictEqual(COM.choisir('service').id, 'paiement-manuel');
  assert.strictEqual(COM.FOURNISSEURS.manuel.creerLienPaiement({montant: 90, produit: 'Signature'}).statut, 'HUMAN_CHECKPOINT');
  assert.throws(() => COM.FOURNISSEURS.manuel.confirmer({montant: 90, venture: 'aura', opportunite: 'signature-en-direct'}, ''), /preuve/);
});

ck('comptes : une étape KYC / conditions / identité ne se valide que par un humain, dans l\'ordre', () => {
  remettreAZero();
  assert.throws(() => CO.marquer('hebergement', 'compte'), /précédente|humain/);
  CO.marquer('hebergement', 'preparer');
  assert.throws(() => CO.marquer('hebergement', 'compte'), /seul un humain/);
  const e = CO.marquer('hebergement', 'compte', {par: 'humain'});
  assert.strictEqual(e.suivante.id, 'jeton');
  assert.ok(CO.etat().find(c => c.id === 'stripe-sandbox').attendHumain);
});

/* ── 7. Worker, file, nuit, coûts ─────────────────────────────────────────── */

ck('pare-feu de coût : au-delà du plafond → NEEDS_APPROVAL, exécutable après approbation', () => {
  remettreAZero();
  const x = Q.ajouter({type: 'agents.evaluer', maxCost: 5}, {maintenant: J + '10:00:00.000Z'});
  assert.strictEqual(Q.prendre('w', {maintenant: J + '10:00:01.000Z'}), null);
  assert.strictEqual(Q.lire()[0].status, 'NEEDS_APPROVAL');
  Q.approuver(x.id);
  assert.strictEqual(Q.prendre('w', {maintenant: J + '10:00:02.000Z'}).id, x.id);
  assert.throws(() => Q.ajouter({type: 'x', maxCost: undefined}), /maxCost/);
  Q.terminer(x.id, {cout: 2.5, maintenant: J + '10:00:03.000Z'});
  Q.ajouter({type: 'agents.evaluer', maxCost: 0.6}, {maintenant: J + '10:00:04.000Z'});
  assert.strictEqual(Q.prendre('w', {maintenant: J + '10:00:05.000Z'}), null, 'plafond global du jour');
});

ck('auto-réparation : essais avec attente exponentielle, puis FAILED ; BLOCKED ; bail expiré repris', () => {
  remettreAZero();
  const a = Q.ajouter({type: 'agents.evaluer', maxCost: 0, maxRetries: 2}, {maintenant: J + '10:00:00.000Z'});
  Q.prendre('w', {maintenant: J + '10:00:00.000Z'});
  let s = Q.echouer(a.id, 'timeout', {maintenant: J + '10:00:00.000Z'});
  assert.strictEqual(s.status, 'PENDING'); assert.strictEqual(s.scheduledAt, J + '10:01:00.000Z');
  Q.prendre('w', {maintenant: J + '10:01:00.000Z'});
  s = Q.echouer(a.id, 'timeout', {maintenant: J + '10:01:00.000Z'});
  assert.strictEqual(s.scheduledAt, J + '10:03:00.000Z');
  Q.prendre('w', {maintenant: J + '10:03:00.000Z'});
  s = Q.echouer(a.id, 'timeout', {maintenant: J + '10:03:00.000Z'});
  assert.strictEqual(s.status, 'FAILED');
  const b = Q.ajouter({type: 'agents.evaluer', maxCost: 0}, {maintenant: J + '10:00:00.000Z'});
  Q.prendre('w', {maintenant: J + '10:05:00.000Z'});
  assert.strictEqual(Q.echouer(b.id, 'source bloquée', {bloque: true}).status, 'BLOCKED');
  const c = Q.ajouter({type: 'agents.evaluer', maxCost: 0}, {maintenant: J + '10:00:00.000Z'});
  Q.prendre('mort', {maintenant: J + '10:06:00.000Z'});
  const repris = Q.prendre('vivant', {maintenant: J + '10:30:00.000Z'});
  assert.strictEqual(repris.id, c.id); assert.strictEqual(repris.worker, 'vivant'); assert.strictEqual(repris.retries, 1);
  assert.ok(Q.lire().every(x => ['DONE', 'FAILED', 'BLOCKED', 'RUNNING', 'PENDING', 'NEEDS_APPROVAL'].includes(x.status)));
});

ck('nuit : lecture et préparation oui ; envoi, dépense, contrat jamais sans contrôle', () => {
  T.TACHES['test.envoi'] = {classe: 'SEND', agent: 'test', premierClient: true, executer: async () => ({})};
  T.TACHES['test.publication'] = {classe: 'PUBLISH', agent: 'test', premierClient: true, executer: async () => ({})};
  const nuit = J.replace('T', 'T') + '03:00:00.000Z';
  assert.ok(T.autorise({type: 'premier-client.preparer'}, {maintenant: nuit}).ok);
  assert.ok(!T.autorise({type: 'test.envoi'}, {maintenant: J + '14:00:00.000Z'}).ok);
  assert.ok(!T.autorise({type: 'test.publication'}, {maintenant: nuit}).ok);
  assert.ok(!T.autorise({type: 'frontier.scan'}, {maintenant: J + '14:00:00.000Z', mode: 'FIRST_CUSTOMER'}).ok);
  assert.ok(!T.autorise({type: 'inconnue'}, {}).ok);
});

ck('worker : exécute, bloque proprement, ne perd rien ; planificateur idempotent et sobre en mode FIRST CUSTOMER', async () => {
  remettreAZero();
  T.TACHES['test.ok'] = {classe: 'ANALYZE', agent: 'testeur', premierClient: true, executer: async () => ({fait: true})};
  T.TACHES['test.bloque'] = {classe: 'READ', agent: 'testeur', premierClient: true, executer: async () => { throw new T.Bloque('source fermée'); }};
  T.TACHES['test.lent'] = {classe: 'READ', agent: 'testeur', premierClient: true, executer: () => new Promise(r => setTimeout(r, 500))};
  for(const type of ['test.ok', 'test.bloque', 'test.lent']) Q.ajouter({type, maxCost: 0}, {maintenant: J + '14:00:00.000Z'});
  const faits = await W.vider({maintenant: J + '14:00:00.000Z', delaiMs: 100});
  const st = Object.fromEntries(faits.map(f => [f.type, f.statut]));
  assert.deepStrictEqual(st, {'test.ok': 'DONE', 'test.bloque': 'BLOCKED', 'test.lent': 'PENDING'});
  PC.activer('experiments/signature-first-customer');
  const a = PLN.tick({maintenant: J + '03:00:00.000Z'});
  const b = PLN.tick({maintenant: J + '03:30:00.000Z'});
  assert.ok(a.includes('premier-client.chasser') && a.includes('premier-client.preparer'));
  assert.ok(!a.includes('frontier.scan') && !a.includes('capital.revue'), 'tâches secondaires suspendues');
  assert.deepStrictEqual(b, []);
});

ck('agents : coûteux sans contribution → DISABLE ; sinon KEEP', () => {
  remettreAZero();
  T.TACHES['test.cher'] = {classe: 'ANALYZE', agent: 'gouffre', premierClient: true, executer: async () => ({})};
  for(let i = 0; i < 10; i++){
    const x = Q.ajouter({type: 'test.cher', maxCost: 0.1}, {maintenant: J + '10:00:00.000Z'});
    Q.prendre('w', {maintenant: J + '10:00:00.000Z'});
    Q.terminer(x.id, {cout: 0.1, maintenant: J + '10:00:01.000Z'});
  }
  const ev = AG.evaluer().find(a => a.agent === 'gouffre');
  assert.strictEqual(ev.recommandation, 'DISABLE');
  assert.strictEqual(ev.economicContribution.attribution, 'UNKNOWN');
  assert.strictEqual(ev.successRate, 1);
});

ck('brief du matin : compte ce qui s\'est passé et liste ce qui attend un humain', async () => {
  await contacte(1);
  const b = BR.brief({maintenant: J + '23:59:00.000Z', marquer: true});
  assert.ok(b.prospectsTrouves >= 1 && b.messagesEnvoyes === 1 && b.ventes === 0 && b.revenu === 0);
  assert.ok(b.approbations.some(a => a.quoi === 'message'));
  assert.ok(b.approbations.some(a => a.quoi === 'compte'));
  assert.ok(BR.texte(b).startsWith('WHILE YOU SLEPT'));
  assert.strictEqual(BR.brief({maintenant: J + '23:59:30.000Z'}).messagesEnvoyes, 0, 'le brief suivant repart du dernier');
});

/* ── 8. Interfaces ────────────────────────────────────────────────────────── */

ck('doctor : PASS / WARN / FAIL, chaque source testée séparément', async () => {
  const L = await DOC.diagnostic({fetch: async u => ({status: String(u).includes('overpass') ? 200 : 403})});
  assert.ok(L.every(l => ['PASS', 'WARN', 'FAIL'].includes(l.statut)));
  assert.strictEqual(L.find(l => l.nom === 'source osm-overpass').statut, 'PASS');
  assert.strictEqual(L.find(l => l.nom === 'source eurostat').statut, 'WARN');
  assert.ok(L.find(l => l.nom === 'ffmpeg'));
});

ck('CLI et console appellent le même cœur ; la console refuse une action sans jeton', async () => {
  remettreAZero();
  const env = Object.assign({}, process.env);
  const out = execFileSync(process.execPath, [path.join(RACINE, 'omega', 'omega.js'), 'etat'], {encoding: 'utf8', env});
  assert.ok(out.includes('DISTANCE TO FIRST CUSTOMER') && out.includes('AUTONOMY RATIO'));
  const {serveur, JETON} = require('../omega/console/serveur.js');
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  const port = serveur.address().port;
  try {
    const g = await fetch('http://127.0.0.1:' + port + '/api/etat');
    assert.strictEqual(g.status, 200);
    const p = await fetch('http://127.0.0.1:' + port + '/api/executer', {method: 'POST', body: '{}'});
    assert.strictEqual(p.status, 403);
    const ok = await fetch('http://127.0.0.1:' + port + '/api/activer', {method: 'POST', headers: {'x-omega-jeton': JETON}, body: '{}'});
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(PC.mode().mode, 'FIRST_CUSTOMER');
  } finally { serveur.close(); }
});

ck('le dépôt public ne versionne ni l\'état ni les prospects', () => {
  const gi = fs.readFileSync(path.join(RACINE, '.gitignore'), 'utf8');
  assert.ok(/^omega\/etat\/$/m.test(gi));
  const exp = fs.readFileSync(path.join(RACINE, 'experiments', 'signature-first-customer', 'experience.json'), 'utf8');
  assert.ok(!/instagram\.com\/|@[a-z0-9_.]{3,}/i.test(exp.replace(/"_comment"[^\n]*/, '')), 'aucun prospect dans l\'expérience versionnée');
});

/* ── Exécution séquentielle et bilan ──────────────────────────────────────── */

(async () => {
  for(const [nom, fn] of tests){
    try { await fn(); R.push('PASS  — ' + nom); }
    catch(e){ R.push('ÉCHEC — ' + nom + '\n        ' + (e && e.message)); }
  }
  console.log(R.join('\n'));
  const echecs = R.filter(x => x.startsWith('ÉCHEC')).length;
  console.log(`\n${R.length} contrôles JARVIS Ω V2 — ${R.length - echecs} PASS, ${echecs} ÉCHEC`);
  console.log('portée : pipeline complet sur état temporaire et réseau simulé — aucun prospect réel, aucun envoi réel');
  fs.rmSync(TMP, {recursive: true, force: true});
  process.exit(echecs > 0 ? 1 : 0);
})();
