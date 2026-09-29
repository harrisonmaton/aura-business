'use strict';
/* Recette de JARVIS Ω — tranche « Où est mon meilleur prochain euro ? ».

   Chaque contrôle correspond à une façon dont un moteur de décision ment ou
   ruine son propriétaire : recommander sans preuve, laisser passer une donnée
   de démonstration, construire avant qu'on paie, engager plus que ce qu'on a,
   franchir une porte humaine à sa place, gonfler une probabilité, attribuer
   un revenu qu'on ne sait pas attribuer, ou ne plus pouvoir rejouer une
   décision passée.

   Aucun appel réseau : le collecteur de signaux reçoit un faux fetch. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
const M = require('../omega/moteur.js');
const S = require('../omega/signaux.js');
const {chargerCatalogue} = require('../server/boutique.js');

const R = [];
const enAttente = [];
const ck = (nom, fn) => {
  try {
    const r = fn();
    if(r && typeof r.then === 'function'){
      enAttente.push(r.then(() => R.push('PASS  — ' + nom), e => R.push('ÉCHEC — ' + nom + '\n        ' + (e && e.message))));
      return;
    }
    R.push('PASS  — ' + nom);
  }
  catch(e){ R.push('ÉCHEC — ' + nom + '\n        ' + (e && e.message)); }
};

const RACINE = path.join(__dirname, '..');
const REEL = JSON.parse(fs.readFileSync(path.join(RACINE, 'omega', 'registre.json'), 'utf8'));
const CAT = chargerCatalogue();
const DATE = '2026-09-29T12:00:00.000Z';
const copie = x => JSON.parse(JSON.stringify(x));
const reco = (reg, extra = {}) => M.recommander(reg, Object.assign({catalogue: CAT, maintenant: DATE}, extra));

/* Un registre minimal, entièrement sous contrôle du test. */
function opp(id, surcharge = {}){
  const o = {
    id, titre: 'Opportunité ' + id,
    preuves: [{nature: 'fait', date: '2026-09-01', source: 'test', fait: 'fait de test'}],
    contreArgument: 'pourrait être faux',
    incertitudes: ['tout'],
    portes: [],
    economie: {prix: {genre: 'brief', id: 2}, heuresParVente: 1, coutsVariables: 0, ventesMoisSiSucces: 2, delaiPremierEuroJours: 14},
    prochainTest: {type: 'valider', action: 'tester', coutCash: 0, heures: 2, dureeJours: 7, pEstimee: 0.2, succes: 'un achat', arret: 'aucun achat'},
  };
  for(const [k, v] of Object.entries(surcharge)){
    if(v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) o[k] = Object.assign({}, o[k], v);
    else o[k] = v;
  }
  return o;
}
function registre(opps, ressources = {}, extra = {}){
  return Object.assign({
    ressources: Object.assign({tresorerie: null, depensesMensuelles: null, heuresParSemaine: null, tauxHoraire: null, horizonMois: 6}, ressources),
    portes: {'humaine': {libelle: 'porte humaine de test', statut: 'a_franchir', source: 'test', humain: 'le propriétaire'}},
    opportunites: opps,
    resultats: [],
  }, extra);
}

/* ── 1. Le registre réel ──────────────────────────────────────────────────── */

ck('le registre réel est valide et ne contient aucune donnée DEMO', () => {
  assert.deepStrictEqual(M.validerRegistre(REEL), []);
  assert.notStrictEqual(REEL.mode, 'DEMO');
  assert.ok(!JSON.stringify(REEL).includes('"demo":true'));
});

ck('le registre réel ne recopie aucun prix : il le lit au catalogue', () => {
  for(const o of REEL.opportunites){
    assert.ok(!('prix' in o.economie) || typeof o.economie.prix === 'object', o.id + ' : prix recopié en dur');
    if(o.economie.prix) assert.ok(M.prixDe(o.economie.prix, CAT), o.id + ' : référence de prix absente du catalogue');
    if('prixMensuel' in o.economie) assert.ok(o.economie.estimations && o.economie.estimations.prixMensuel, o.id + ' : prix mensuel non déclaré comme estimation');
  }
});

ck('réponse réelle : au plus trois actions, toutes admises, aucune au-dessus du plafond', () => {
  const r = reco(REEL);
  assert.ok(r.valide);
  assert.ok(r.top.length >= 1 && r.top.length <= 3, 'top de ' + r.top.length);
  for(const x of r.top){
    assert.ok(x.executable);
    assert.ok(x.prochainTest.coutCash <= r.plafondCash, x.id + ' dépasse le plafond');
    assert.ok(x.preuves.length && x.contreArgument && x.incertitudes.length, x.id + ' : dossier incomplet');
  }
});

ck('réponse réelle : trésorerie inconnue → plafond 0 € et l\'hypothèse est dite', () => {
  const r = reco(REEL);
  assert.strictEqual(REEL.ressources.tresorerie, null);
  assert.strictEqual(r.plafondCash, 0);
  assert.ok(r.hypothesesGlobales.some(h => h.includes('trésorerie non déclarée')));
});

ck('réponse réelle : aucun chantier de construction recommandé sans acompte', () => {
  const r = reco(REEL);
  assert.ok(!r.top.some(x => x.prochainTest.type === 'construire'));
  const c = r.ecartees.find(x => x.id === 'aura-food-construire');
  assert.ok(c && c.refus.some(m => m.startsWith('PORTE CONSTRUIRE')));
});

ck('même registre, même date → même réponse, même empreinte', () => {
  const a = reco(REEL), b = reco(copie(REEL));
  assert.strictEqual(a.empreinte, b.empreinte);
  assert.deepStrictEqual(a.top.map(x => [x.id, x.seuilHoraire]), b.top.map(x => [x.id, x.seuilHoraire]));
});

ck('une décision sans date est refusée', () => {
  assert.throws(() => M.recommander(REEL, {catalogue: CAT}), /date/);
});

/* ── 2. Pas de recommandation sans preuve ─────────────────────────────────── */

ck('preuve sans source → registre invalide, aucune recommandation', () => {
  const reg = registre([opp('a', {preuves: [{nature: 'fait', date: '2026-09-01', fait: 'rumeur'}]})]);
  const r = reco(reg);
  assert.strictEqual(r.valide, false);
  assert.ok(r.erreurs.some(e => e.includes('sans source')));
  assert.ok(!r.top);
});

ck('opportunité sans contre-argument ni critère d\'arrêt → invalide', () => {
  const r = reco(registre([opp('a', {contreArgument: '', prochainTest: {arret: ''}})]));
  assert.strictEqual(r.valide, false);
  assert.ok(r.erreurs.some(e => e.includes('contre-argument')));
  assert.ok(r.erreurs.some(e => e.includes('critère d\'arrêt')));
});

ck('NO MOCK ECONOMY : donnée DEMO refusée dans un registre réel, marquée DEMO sinon', () => {
  const o = opp('a', {preuves: [{nature: 'client', niveau: 4, date: '2026-09-01', source: 'démo', fait: 'achat fictif', demo: true}]});
  assert.strictEqual(reco(registre([o])).valide, false);
  const r = reco(registre([copie(o)], {}, {mode: 'DEMO'}));
  assert.ok(r.valide);
  assert.strictEqual(r.mode, 'DEMO');
});

ck('prix absent du catalogue → écartée, jamais un prix inventé', () => {
  const r = reco(registre([opp('a', {economie: {prix: {genre: 'brief', id: 99}}})]));
  assert.strictEqual(r.top.length, 0);
  assert.ok(r.ecartees[0].refus[0].includes('introuvable au catalogue'));
});

ck('le prix suit le catalogue : le changer change le calcul', () => {
  const reg = registre([opp('a')]);
  const cher = copie(CAT); cher.brief.find(b => b.id === 2).price *= 2;
  const a = reco(reg).top[0], b = reco(reg, {catalogue: cher}).top[0];
  assert.ok(b.seuilHoraire > a.seuilHoraire);
});

/* ── 3. Portes : premier euro, construction, scale ────────────────────────── */

ck('PORTE CONSTRUIRE : refusée sans acompte, admise avec un acompte sourcé', () => {
  const o = opp('a', {prochainTest: {type: 'construire'}});
  assert.strictEqual(reco(registre([o])).top.length, 0);
  const reg = registre([copie(o)], {}, {resultats: [{opportunite: 'a', date: '2026-09-20', niveau: 3, montant: 50, source: 'virement du 20/09', attribution: 'DIRECT'}]});
  assert.strictEqual(reco(reg).top.length, 1);
});

ck('PORTE SCALER : un achat ne suffit pas, il faut un rachat', () => {
  const achat = [{opportunite: 'a', date: '2026-09-20', niveau: 4, montant: 90, source: 'facture 1', attribution: 'DIRECT'}];
  const o = opp('a', {prochainTest: {type: 'scaler'}});
  assert.strictEqual(reco(registre([o], {}, {resultats: achat})).top.length, 0);
  const rachat = achat.concat([{opportunite: 'a', date: '2026-09-25', niveau: 5, montant: 90, source: 'facture 2', attribution: 'DIRECT'}]);
  assert.strictEqual(reco(registre([copie(o)], {}, {resultats: rachat})).top.length, 1);
});

ck('porte humaine « a_franchir » bloque ; franchie, elle libère', () => {
  const o = opp('a', {portes: ['humaine']});
  const reg = registre([o]);
  assert.strictEqual(reco(reg).top.length, 0);
  assert.ok(reco(reg).ecartees[0].refus[0].includes('porte humaine'));
  reg.portes.humaine.statut = 'franchie';
  assert.strictEqual(reco(reg).top.length, 1);
});

ck('porte « inconnue » ne bloque pas mais remonte en hypothèse', () => {
  const reg = registre([opp('a', {portes: ['humaine']})]);
  reg.portes.humaine.statut = 'inconnue';
  const x = reco(reg).top[0];
  assert.ok(x && x.hypotheses.some(h => h.includes('porte non confirmée')));
});

/* ── 4. Survie ────────────────────────────────────────────────────────────── */

ck('risque de ruine : un test au-delà de 5 % de la trésorerie est refusé', () => {
  const o = opp('a', {prochainTest: {coutCash: 60}});
  assert.strictEqual(reco(registre([o], {tresorerie: 1000})).top.length, 0);
  assert.strictEqual(reco(registre([copie(o)], {tresorerie: 2000})).top.length, 1);
});

ck('mode urgence : runway < 2 mois → seuls les tests gratuits et rapides passent', () => {
  const payant = opp('payant', {prochainTest: {coutCash: 5}});
  const lent = opp('lent', {economie: {delaiPremierEuroJours: 90}});
  const bon = opp('bon');
  const r = reco(registre([payant, lent, bon], {tresorerie: 1000, depensesMensuelles: 800}));
  assert.ok(r.urgence);
  assert.deepStrictEqual(r.top.map(x => x.id), ['bon']);
  const calme = reco(registre([copie(payant), copie(lent), copie(bon)], {tresorerie: 10000, depensesMensuelles: 800}));
  assert.ok(!calme.urgence);
});

ck('temps : un test qui dépasse les heures disponibles est refusé', () => {
  const o = opp('a', {prochainTest: {heures: 30, dureeJours: 7}});
  assert.strictEqual(reco(registre([o], {heuresParSemaine: 10})).top.length, 0);
  assert.strictEqual(reco(registre([copie(o)], {heuresParSemaine: 40})).top.length, 1);
});

/* ── 5. Honnêteté du calcul ───────────────────────────────────────────────── */

ck('une probabilité sans preuve client est plafonnée à 25 %, et on le dit', () => {
  const x = reco(registre([opp('a', {prochainTest: {pEstimee: 0.9}})])).top[0];
  assert.strictEqual(x.p, M.PLAFOND_P[-1]);
  assert.ok(x.hypotheses.some(h => h.includes('ramenée à 25 %')));
});

ck('seuil horaire : τ* = A / B, vérifié à la main', () => {
  /* Signature 90 €, 0 € variable, 1 h/vente, 2 ventes, p 0,2, H 6, délai 14 j,
     test 0 € + 2 h. k = 0,2·6·(1/(1+14/180))·2 ; A = 90k ; B = k + 2. */
  const k = 0.2 * 6 * (1 / (1 + 14 / 180)) * 2;
  const attendu = (90 * k) / (k + 2);
  const x = reco(registre([opp('a')])).top[0];
  assert.ok(Math.abs(x.seuilHoraire - attendu) < 1e-9, x.seuilHoraire + ' ≠ ' + attendu);
  assert.ok(Math.abs(attendu - 47.41) < 0.01);
});

ck('sans valeur horaire déclarée, aucune n\'est inventée ; déclarée, elle filtre', () => {
  const reg = registre([opp('a'), opp('b', {economie: {heuresParVente: 10}})]);
  const r = reco(reg);
  assert.strictEqual(r.classement, 'seuil de rentabilité horaire');
  assert.ok(r.hypothesesGlobales.some(h => h.includes('valeur de ton heure non déclarée')));
  assert.ok(!JSON.stringify(r.top.map(x => x.pourquoi)).includes('25 €/h'));
  reg.ressources.tauxHoraire = 20;         // b : 90 € − 10 h × 20 € < 0 → perdant
  const d = reco(reg);
  assert.strictEqual(d.classement, 'valeur attendue par euro engagé');
  assert.deepStrictEqual(d.top.map(x => x.id), ['a']);
  assert.ok(d.ecartees.some(x => x.id === 'b' && x.refus[0].includes('valeur attendue négative')));
});

/* ── 6. Résultats et attribution ──────────────────────────────────────────── */

ck('un résultat sans attribution DIRECT / ASSISTE / INCONNU est refusé', () => {
  const reg = registre([opp('a')], {}, {resultats: [{opportunite: 'a', date: '2026-09-20', montant: 90, source: 'facture', attribution: 'JARVIS'}]});
  assert.strictEqual(reco(reg).valide, false);
});

ck('revenu vérifié : sourcé, dans les 30 jours, jamais dans le futur ; la phase suit', () => {
  const res = [
    {opportunite: 'a', date: '2026-09-20', montant: 150, source: 'facture 1', attribution: 'INCONNU'},
    {opportunite: 'a', date: '2026-07-01', montant: 900, source: 'facture ancienne', attribution: 'DIRECT'},
    {opportunite: 'a', date: '2026-10-15', montant: 900, source: 'facture future', attribution: 'DIRECT'},
  ];
  const r = reco(registre([opp('a')], {}, {resultats: res}));
  assert.strictEqual(r.revenusVerifies30j, 150);
  assert.strictEqual(r.phase.nom, 'RÉPÉTABILITÉ');
  assert.strictEqual(M.phase(0).nom, 'PREUVE');
  assert.strictEqual(M.phase(10000).nom, 'DISTRIBUTION');
});

/* ── 7. Journal et rejeu ──────────────────────────────────────────────────── */

ck('rejeu : une décision consignée se recalcule à l\'identique', () => {
  const e = M.consigner(reco(REEL), REEL);
  const r = M.rejouer(JSON.parse(JSON.stringify(e)), CAT);
  assert.ok(r.identique, r.choixAlors + ' / ' + r.choixRecalcule);
});

ck('rejeu : une preuve ajoutée après coup est détectée', () => {
  const e = M.consigner(reco(REEL), REEL);
  e.registre.opportunites[0].preuves.push({nature: 'fait', date: '2026-10-01', source: 'après coup', fait: 'on savait'});
  const r = M.rejouer(e, CAT);
  assert.strictEqual(r.empreinteIntacte, false);
  assert.strictEqual(r.identique, false);
});

/* ── 8. Signaux publics : un signal non lu n'existe pas ───────────────────── */

const fauxFetch = rep => async () => rep;

ck('signal lu → preuve de nature « marché », hors échelle de preuve', async () => {
  const r = await S.compterEtablissements({naf: '56.10C', codePostal: '75011'},
    {fetch: fauxFetch({ok: true, status: 200, json: async () => ({total_results: 412})}), maintenant: DATE});
  assert.strictEqual(r.statut, 'ok');
  assert.strictEqual(r.preuve.nature, 'marche');
  assert.strictEqual(r.preuve.valeur, 412);
  assert.ok(r.preuve.source.startsWith(S.SOURCE));
  assert.ok(!('niveau' in r.preuve));
});

ck('réseau refusé, HTTP 403, format changé → « bloque », aucun chiffre', async () => {
  const cas = [
    async () => { const e = new Error('fetch failed'); e.cause = {code: 'ECONNREFUSED'}; throw e; },
    fauxFetch({ok: false, status: 403}),
    fauxFetch({ok: true, status: 200, json: async () => ({resultats: []})}),
    fauxFetch({ok: true, status: 200, json: async () => { throw new SyntaxError('html'); }}),
  ];
  for(const f of cas){
    const r = await S.compterEtablissements({naf: '56.10C', codePostal: '75011'}, {fetch: f, maintenant: DATE});
    assert.strictEqual(r.statut, 'bloque');
    assert.ok(!('preuve' in r) && !('valeur' in r));
  }
});

ck('paramètres invalides → refus sans appel réseau', async () => {
  let appels = 0;
  const f = async () => { appels++; return {ok: true}; };
  assert.strictEqual((await S.compterEtablissements({naf: 'resto', codePostal: '75011'}, {fetch: f})).statut, 'refuse');
  assert.strictEqual((await S.compterEtablissements({naf: '56.10C', codePostal: '1000'}, {fetch: f})).statut, 'refuse');
  assert.strictEqual(appels, 0);
});

/* ── 9. Interface ─────────────────────────────────────────────────────────── */

ck('CLI : répond sur le registre réel (code 0), refuse un registre invalide (code 1)', () => {
  const cli = path.join(RACINE, 'omega', 'jarvis.js');
  const sortie = execFileSync(process.execPath, [cli, '--date', '2026-09-29'], {encoding: 'utf8'});
  assert.ok(sortie.includes(M.QUESTION));
  assert.ok(sortie.includes('Ce qui attend un humain'));
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'omega-')), 'registre.json');
  const casse = copie(REEL); delete casse.opportunites[0].preuves[0].source;
  fs.writeFileSync(f, JSON.stringify(casse));
  let code = 0, texte = '';
  try { execFileSync(process.execPath, [cli, '--date', '2026-09-29'], {encoding: 'utf8', env: Object.assign({}, process.env, {OMEGA_REGISTRE: f})}); }
  catch(e){ code = e.status; texte = e.stdout; }
  assert.strictEqual(code, 1);
  assert.ok(texte.includes('REGISTRE INVALIDE'));
});

ck('CLI : consigner puis rejouer, dans un journal temporaire', () => {
  const cli = path.join(RACINE, 'omega', 'jarvis.js');
  const j = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'omega-')), 'decisions.jsonl');
  const env = Object.assign({}, process.env, {OMEGA_DECISIONS: j});
  execFileSync(process.execPath, [cli, '--date', '2026-09-29', '--consigner'], {encoding: 'utf8', env});
  const sortie = execFileSync(process.execPath, [cli, '--rejouer'], {encoding: 'utf8', env});
  assert.ok(sortie.includes('Identique'));
});

/* ── Bilan ─────────────────────────────────────────────────────────────────── */

Promise.all(enAttente).then(() => {
  console.log(R.join('\n'));
  const echecs = R.filter(x => x.startsWith('ÉCHEC')).length;
  console.log(`\n${R.length} contrôles JARVIS Ω — ${R.length - echecs} PASS, ${echecs} ÉCHEC`);
  console.log('portée : moteur de décision hors ligne — aucune probabilité n\'est encore calibrée par un résultat réel');
  process.exit(echecs > 0 ? 1 : 0);
});
