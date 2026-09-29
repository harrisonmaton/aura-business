'use strict';
/* JARVIS Ω — moteur de décision. Tranche verticale n°1 :
   « Où est mon meilleur prochain euro ? »

   Ce module ne sait rien faire de spectaculaire, et c'est voulu. Il prend un
   registre de faits sourcés (omega/registre.json), le catalogue (source unique
   des prix) et les ressources déclarées du propriétaire, et il répond par trois
   actions au plus — chacune avec sa preuve, son contre-argument, ce qu'on
   ignore et le test qui réduira l'incertitude.

   Sans dépendance, sans réseau, sans horloge implicite : même registre, même
   date, même réponse. C'est la condition pour pouvoir rejouer une décision
   plus tard et voir ce qu'on savait AU MOMENT où elle a été prise.

   Ce que ce moteur ne prétend pas :
   — ses probabilités ne sont PAS calibrées. Aucun test passé n'a encore de
     résultat enregistré ; les plafonds ci-dessous sont des garde-fous contre
     l'optimisme, pas des mesures. Le journal de décisions servira à les
     calibrer quand des résultats existeront ;
   — une estimation reste une estimation : chaque chiffre non mesuré est
     remonté dans « hypothèses » de la recommandation qui l'utilise. */

const crypto = require('crypto');

/* ── 1. Hiérarchie de preuve ──────────────────────────────────────────────
   HYPOTHÈSE < DONNÉE PUBLIQUE < RÉPONSE DU PROSPECT < RENDEZ-VOUS
   < INTENTION SIGNÉE < ACOMPTE < ACHAT < RACHAT (< RECOMMANDATION).

   Les deux premiers niveaux ne sont PAS des preuves client : une donnée
   publique (nombre d'établissements, tendance) dit qu'un marché existe, pas
   que quelqu'un paiera. Ils valent un peu plus qu'une hypothèse, pas plus. */

const HYPOTHESE = -2;          // seulement des faits internes et des estimations
const DONNEE_PUBLIQUE = -1;    // au moins une preuve de nature « marche »
const ECHELLE = [
  'réponse du prospect', // 0
  'rendez-vous',         // 1
  'intention signée',    // 2
  'acompte',             // 3
  'achat',               // 4
  'rachat',              // 5
  'recommandation',      // 6
];
const AUCUNE_PREUVE = DONNEE_PUBLIQUE;
function libelleNiveau(n){
  return n === HYPOTHESE ? 'hypothèse (aucune preuve client)' : n === DONNEE_PUBLIQUE ? 'donnée publique (aucune preuve client)' : ECHELLE[n] + ' (niveau ' + n + '/6)';
}

/* Probabilité maximale qu'on accepte d'attribuer au succès du prochain test,
   selon la meilleure preuve obtenue. Une hypothèse ne peut pas se déclarer
   probable à plus de 20 %, quel que soit l'enthousiasme de celui qui la
   saisit. Non calibré — voir l'en-tête. */
const PLAFOND_P = {'-2': 0.2, '-1': 0.25, 0: 0.3, 1: 0.35, 2: 0.45, 3: 0.6, 4: 0.7, 5: 0.8, 6: 0.85};

/* ── 2. Phases et portes ──────────────────────────────────────────────────── */

const PHASES = [
  {nom: 'PREUVE',           jusqua: 100,      objectif: 'le premier euro'},
  {nom: 'RÉPÉTABILITÉ',     jusqua: 1000,     objectif: 'le même euro, plusieurs fois'},
  {nom: 'SYSTÉMATISATION',  jusqua: 10000,    objectif: 'le même euro, sans le propriétaire'},
  {nom: 'DISTRIBUTION',     jusqua: 100000,   objectif: 'plus de canaux, plus de levier'},
  {nom: 'ALLOCATION',       jusqua: Infinity, objectif: 'placer le profit'},
];

function phase(revenusMensuels){
  return PHASES.find(p => revenusMensuels < p.jusqua);
}

/* Ce qu'un type de test exige avant d'être admis. Le cœur du protocole
   « premier euro » : on ne construit pas avant un acompte, on ne scale pas
   avant un rachat. Un test de validation, lui, est toujours admis. */
const PORTES = {
  valider:    {niveau: -Infinity, motif: null},
  construire: {niveau: 3, motif: 'construire avant un acompte : aucune preuve que quelqu\'un paiera ce qui sera construit'},
  scaler:     {niveau: 5, motif: 'accélérer avant un rachat : la répétabilité n\'est pas prouvée'},
};

const DEFAUTS = {
  horizonMois: 6,           // horizon sur lequel un succès est valorisé
  ratioRisqueMax: 0.05,     // part de la trésorerie qu'un test peut engager
  runwayUrgenceMois: 2,     // en dessous : mode urgence
};

/* ── 3. Validation du registre ────────────────────────────────────────────
   Un registre qui ne passe pas ici ne produit aucune recommandation. Mieux
   vaut pas de réponse qu'une réponse fondée sur une ligne sans source. */

function validerRegistre(reg){
  const e = [];
  const demoAutorise = reg.mode === 'DEMO';
  if(!reg || !Array.isArray(reg.opportunites)) return ['registre sans liste d\'opportunités'];
  if(!reg.ressources || typeof reg.ressources !== 'object') e.push('ressources absentes');

  const ids = new Set();
  const portes = reg.portes || {};
  for(const o of reg.opportunites){
    const q = 'opportunité ' + (o.id || '?');
    if(!o.id) e.push(q + ' : identifiant absent');
    if(ids.has(o.id)) e.push(q + ' : identifiant en double');
    ids.add(o.id);
    if(!o.titre) e.push(q + ' : titre absent');
    if(!Array.isArray(o.preuves) || o.preuves.length === 0) e.push(q + ' : aucune preuve — rien ne soutient cette idée');
    for(const p of o.preuves || []){
      if(!p.source) e.push(q + ' : preuve sans source — « ' + (p.fait || '?').slice(0, 50) + ' »');
      if(!p.date) e.push(q + ' : preuve sans date');
      if(!['fait', 'marche', 'client'].includes(p.nature)) e.push(q + ' : nature de preuve inconnue (' + p.nature + ')');
      if(p.nature === 'client' && !(Number.isInteger(p.niveau) && p.niveau >= 0 && p.niveau < ECHELLE.length))
        e.push(q + ' : preuve client sans niveau sur l\'échelle');
      if(p.demo && !demoAutorise) e.push(q + ' : donnée DEMO dans un registre réel');
    }
    if(!o.contreArgument) e.push(q + ' : pas de contre-argument — pourquoi aurait-on tort ?');
    if(!Array.isArray(o.incertitudes) || o.incertitudes.length === 0) e.push(q + ' : aucune incertitude déclarée');
    const t = o.prochainTest;
    if(!t) e.push(q + ' : pas de prochain test');
    for(const [nomT, tt] of [['test', t], ['suite', t && t.suite]].filter(x => x[1])){
      const t = tt; const qo = q;
      { const q = qo + (nomT === 'suite' ? ' (suite)' : '');
      if(t.mesure && !(t.mesure.contacts > 0 && t.mesure.ventes > 0)) e.push(q + ' : mesure du test invalide (contacts et ventes > 0)');
      if(!t.action) e.push(q + ' : test sans action');
      if(!PORTES[t.type]) e.push(q + ' : type de test inconnu (' + t.type + ')');
      if(!(t.coutCash >= 0)) e.push(q + ' : coût cash du test non déclaré');
      if(!(t.heures >= 0)) e.push(q + ' : heures du test non déclarées');
      if(!(t.dureeJours > 0)) e.push(q + ' : durée du test non déclarée');
      if(!t.succes) e.push(q + ' : critère de succès absent');
      if(!t.arret) e.push(q + ' : critère d\'arrêt absent — un test qu\'on ne peut pas perdre ne teste rien');
      if(!(t.pEstimee > 0 && t.pEstimee <= 1)) e.push(q + ' : probabilité estimée hors ]0,1]');
    } }
    for(const g of o.portes || []) if(!portes[g]) e.push(q + ' : porte inconnue « ' + g + ' »');
    if(!o.economie) e.push(q + ' : économie absente');
  }
  for(const r of reg.resultats || []){
    if(!ids.has(r.opportunite)) e.push('résultat rattaché à une opportunité inconnue : ' + r.opportunite);
    if(!r.source) e.push('résultat sans source (' + r.opportunite + ')');
    if(!['DIRECT', 'ASSISTE', 'INCONNU'].includes(r.attribution)) e.push('résultat sans attribution DIRECT / ASSISTE / INCONNU');
    if(r.demo && !demoAutorise) e.push('résultat DEMO dans un registre réel');
  }
  return e;
}

/* ── 4. Mesures ───────────────────────────────────────────────────────────── */

function niveauPreuve(o, reg){
  let n = o.preuves.some(p => p.nature === 'marche') ? DONNEE_PUBLIQUE : HYPOTHESE;
  for(const p of o.preuves) if(p.nature === 'client') n = Math.max(n, p.niveau);
  for(const r of reg.resultats || []) if(r.opportunite === o.id && Number.isInteger(r.niveau)) n = Math.max(n, r.niveau);
  return n;
}

const JOUR = 86400000;

/* Revenu vérifié sur les 30 derniers jours. Seul compte un résultat sourcé.
   L'attribution ne change pas le revenu, elle change ce qu'on en conclut sur
   JARVIS : un résultat INCONNU n'est jamais porté à son crédit. */
function revenusVerifies(reg, maintenant){
  const t = Date.parse(maintenant);
  return (reg.resultats || [])
    .filter(r => r.montant && r.source && t - Date.parse(r.date) <= 30 * JOUR && Date.parse(r.date) <= t)
    .reduce((s, r) => s + r.montant, 0);
}

/* Prix : jamais recopié dans le registre. Il est lu dans le catalogue, qui
   reste la source unique — un prix divergent ne peut pas exister ici. */
function prixDe(ref, catalogue){
  if(!ref) return null;
  const liste = ref.genre === 'ready' ? catalogue.ready : catalogue.brief;
  const p = (liste || []).find(x => x.id === ref.id);
  return p ? {prix: p.price, nom: p.name} : null;
}

/* Économie unitaire, sans valeur horaire : le temps du propriétaire est
   gardé à part (heuresParVente) pour pouvoir calculer le seuil où l'action
   cesse d'être rentable, plutôt que d'inventer ce que vaut son heure. */
function economie(o, catalogue, hypotheses, obs){
  const eco = Object.assign({}, o.economie, {estimations: Object.assign({}, o.economie.estimations)});
  if(obs && obs.heuresParVenteMesurees > 0){
    eco.heuresParVente = obs.heuresParVenteMesurees;
    delete eco.estimations.heuresParVente;
    hypotheses.add(o.id + ' — temps de production MESURÉ : ' + arrondi(obs.heuresParVenteMesurees) + ' h par vente (' + obs.ventesMesurees + ' mesure(s))');
  }
  if(obs && obs.coutsVariablesMesures != null){
    eco.coutsVariables = obs.coutsVariablesMesures;
    delete eco.estimations.coutsVariables;
  }
  const ref = prixDe(eco.prix, catalogue);
  if(eco.prix && !ref) return {erreur: 'prix introuvable au catalogue (' + JSON.stringify(eco.prix) + ')'};
  const prix = ref ? ref.prix : eco.prixMensuel;
  if(!(prix >= 0)) return {erreur: 'aucun prix ni au catalogue ni déclaré'};
  for(const [cle, h] of Object.entries(eco.estimations || {})) hypotheses.add(o.id + ' — ' + cle + ' : ' + h);
  return {
    prix, produit: ref && ref.nom,
    margeHorsTemps: prix - (eco.coutsVariables || 0),
    heuresParVente: eco.heuresParVente || 0,
    ventes: eco.ventesMoisSiSucces || 0,
  };
}

/* ── 4 bis. Suivi d'un test en cours ───────────────────────────────────────
   mesure : {contacts: N, ventes: v} — le test réussit à v ventes, échoue si N
   prospects ont été contactés sans les atteindre. Sans mesure chiffrée, un
   test n'est jamais déclaré réussi ou échoué automatiquement. */

function etatTest(t, suivi){
  const contactes = (suivi && suivi.contactes) || 0, ventes = (suivi && suivi.ventes) || 0;
  const detail = contactes + ' contacté(s), ' + ventes + ' vente(s)' + (t.mesure ? ' sur ' + t.mesure.contacts + ' / objectif ' + t.mesure.ventes : '');
  if(!t.mesure) return {statut: contactes ? 'EN_COURS' : 'A_LANCER', contactes, ventes, detail};
  if(ventes >= t.mesure.ventes) return {statut: 'REUSSI', contactes, ventes, detail};
  if(contactes >= t.mesure.contacts) return {statut: 'ECHOUE', contactes, ventes, detail};
  return {statut: contactes ? 'EN_COURS' : 'A_LANCER', contactes, ventes, detail};
}

/* Taux de conversion par contact r ~ Beta(a, b). A priori : le taux m qui
   rendrait le test réussi avec la probabilité déclarée, pesant autant qu'un
   test complet (k = N). P(au moins une vente dans les R contacts restants)
   = 1 − E[(1−r)^R] = 1 − B(a, b+R) / B(a, b). Pour un objectif de plusieurs
   ventes, approximation prudente : chaque vente manquante doit être obtenue
   indépendamment sur une part égale des contacts restants. */
function probabiliteMiseAJour(t, suivi){
  const N = t.mesure ? t.mesure.contacts : 20;
  const objectif = t.mesure ? t.mesure.ventes : 1;
  const c = suivi.contactes || 0, v = suivi.ventes || 0;
  const m = 1 - Math.pow(1 - t.pEstimee, 1 / (N * objectif));
  const a = m * N + v, b = (1 - m) * N + Math.max(c - v, 0);
  const manque = Math.max(objectif - v, 0);
  if(manque === 0) return 1;
  const R = Math.max(N - c, 0);
  if(R === 0) return 0;
  const part = R / manque;
  const unique = 1 - Math.exp(lbeta(a, b + part) - lbeta(a, b));
  return Math.pow(unique, manque);
}

function lgamma(x){
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if(x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1; let s = c[0];
  for(let i = 1; i < g + 2; i++) s += c[i] / (x + i);
  const t = x + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
}
function lbeta(a, b){ return lgamma(a) + lgamma(b) - lgamma(a + b); }

/* ── 5. Évaluation d'une opportunité ──────────────────────────────────────── */

function contexte(reg, maintenant){
  const res = reg.ressources;
  const hyp = new Set();
  const revenus = revenusVerifies(reg, maintenant);
  let plafondCash, urgence = false;
  if(res.tresorerie == null){
    plafondCash = 0;
    hyp.add('trésorerie non déclarée — seuls les tests à 0 € sont admis');
  } else {
    plafondCash = res.tresorerie * (res.ratioRisqueMax ?? DEFAUTS.ratioRisqueMax);
    if(res.depensesMensuelles > 0){
      const runway = res.tresorerie / Math.max(res.depensesMensuelles - revenus, 1e-9);
      if(res.depensesMensuelles > revenus && runway < DEFAUTS.runwayUrgenceMois) urgence = true;
    }
  }
  const tauxHoraire = res.tauxHoraire ?? null;
  if(tauxHoraire == null) hyp.add('valeur de ton heure non déclarée — classement par seuil de rentabilité horaire, aucune valeur inventée');
  if(res.heuresParSemaine == null) hyp.add('heures disponibles par semaine non déclarées — aucune limite de temps appliquée');
  return {revenus, phase: phase(revenus), plafondCash, urgence, hyp, tauxHoraire};
}

function evaluer(o, reg, catalogue, ctx){
  const hyp = new Set();
  const refus = [];
  const niveau = niveauPreuve(o, reg);
  const res = reg.ressources;
  const obs = (reg.observations || {})[o.id] || null;

  /* Le test en cours dépend des résultats : réussi, on passe à sa suite ;
     critère d'arrêt atteint, l'opportunité est tuée — pas « réessayée ». */
  const etat = etatTest(o.prochainTest, obs);
  let t = o.prochainTest, etape = 1;
  if(etat.statut === 'REUSSI'){
    if(!o.prochainTest.suite)
      return {id: o.id, titre: o.titre, niveau, executable: false, etatTest: etat,
        refus: ['VALIDÉE — test réussi (' + etat.detail + ') ; aucune suite définie : écrire le test de répétabilité'], hypotheses: []};
    t = o.prochainTest.suite; etape = 2;
  }
  const etatCourant = etape === 2 ? etatTest(t, obs && obs.suite) : etat;
  if(etatCourant.statut === 'ECHOUE')
    return {id: o.id, titre: o.titre, niveau, executable: false, etatTest: etatCourant,
      refus: ['KILL — critère d\'arrêt atteint (' + etatCourant.detail + ') : ' + t.arret], hypotheses: []};

  /* Portes humaines : identité, compte, contrat, avis juridique. JARVIS
     prépare, le propriétaire franchit. Une porte « a_franchir » bloque ;
     une porte « inconnue » ne bloque pas mais remonte comme incertitude. */
  const portesBloquantes = [], portesInconnues = [];
  for(const g of o.portes || []){
    const p = reg.portes[g];
    if(p.statut === 'a_franchir') portesBloquantes.push(g);
    else if(p.statut === 'inconnue') portesInconnues.push(g);
  }
  if(portesBloquantes.length) refus.push('porte humaine à franchir : ' + portesBloquantes.map(g => reg.portes[g].libelle).join(' ; '));

  const porte = PORTES[t.type];
  if(niveau < porte.niveau) refus.push('PORTE ' + t.type.toUpperCase() + ' — ' + porte.motif + ' (preuve actuelle : ' + libelleNiveau(niveau) + ')');

  if(t.coutCash > ctx.plafondCash)
    refus.push('risque : ' + t.coutCash + ' € engagés, plafond admis ' + Math.floor(ctx.plafondCash) + ' €');
  if(res.heuresParSemaine != null && t.heures / Math.max(t.dureeJours / 7, 1) > res.heuresParSemaine)
    refus.push('temps : le test demande plus d\'heures par semaine que le propriétaire n\'en a');
  if(ctx.urgence && (t.coutCash > 0 || (o.economie.delaiPremierEuroJours || Infinity) > 30))
    refus.push('mode urgence — seuls les tests gratuits qui rapportent sous 30 jours sont admis');

  const eco = economie(o, catalogue, hyp, obs);
  if(eco.erreur) return {id: o.id, titre: o.titre, niveau, executable: false, refus: [eco.erreur], hypotheses: [...hyp]};

  /* Probabilité : l'estimation déclarée tant qu'on n'a rien mesuré ; dès que
     des prospects ont été contactés, une mise à jour bayésienne sur le taux
     de conversion observé. Dans les deux cas, plafonnée par la preuve. */
  const plafond = PLAFOND_P[niveau];
  const suiviCourant = etape === 2 ? (obs && obs.suite) : obs;
  const pBrute = etatCourant.contactes > 0 ? probabiliteMiseAJour(t, suiviCourant) : t.pEstimee;
  const p = Math.min(pBrute, plafond);
  if(etatCourant.contactes > 0)
    hyp.add(o.id + ' — probabilité recalculée sur ' + etatCourant.contactes + ' contact(s) et ' + etatCourant.ventes + ' vente(s) : ' + pct(pBrute));
  if(pBrute > plafond)
    hyp.add(o.id + ' — probabilité ' + pct(pBrute) + ' ramenée à ' + pct(plafond) + ' : la preuve actuelle ne soutient pas davantage');

  /* Valeur attendue du test en fonction de ce que vaut une heure (τ) :
       VE(τ) = p · H · a · ventes · (marge − heuresParVente · τ) − cash − heures · τ
     linéaire en τ, donc VE(τ) = A − B·τ. Le seuil τ* = A / B est l'heure la
     plus chère à laquelle l'action reste rentable. Il ne dépend d'aucune
     valeur horaire inventée : c'est lui qui classe tant que le propriétaire
     n'a pas déclaré la sienne. */
  const delai = o.economie.delaiPremierEuroJours ?? t.dureeJours;
  const actualisation = 1 / (1 + delai / 180);           // un euro dans six mois vaut moins qu'un euro demain
  const k = p * (res.horizonMois ?? DEFAUTS.horizonMois) * actualisation * eco.ventes;
  const A = k * eco.margeHorsTemps - t.coutCash;
  const B = k * eco.heuresParVente + t.heures;
  const seuilHoraire = B > 0 ? A / B : (A > 0 ? Infinity : -Infinity);
  const tauxH = ctx.tauxHoraire;                          // null = non déclaré
  const tau = tauxH ?? 0;
  const ve = A - B * tau;
  const coutTotal = t.coutCash + t.heures * tau;
  const vpe = ve / Math.max(coutTotal, 1);
  const profitMensuel = eco.ventes * (eco.margeHorsTemps - eco.heuresParVente * tau);

  const pourquoi = [];
  pourquoi.push('preuve la plus forte : ' + libelleNiveau(niveau));
  if(etatCourant.contactes > 0) pourquoi.push('test en cours' + (etape === 2 ? ' (étape 2)' : '') + ' : ' + etatCourant.detail);
  pourquoi.push('coût du test : ' + t.coutCash + ' € + ' + t.heures + ' h');
  pourquoi.push('si le test réussit : ' + eco.ventes + ' ventes/mois × ' + euros(eco.margeHorsTemps) + ' hors temps' + (eco.heuresParVente ? ', ' + eco.heuresParVente + ' h de production chacune' : '') + (eco.produit ? ' (' + eco.produit + ', ' + eco.prix + ' € au catalogue)' : ''));
  pourquoi.push('probabilité retenue : ' + pct(p));
  pourquoi.push(seuilHoraire === Infinity ? 'rentable quel que soit le prix de ton heure'
    : seuilHoraire <= 0 ? 'perdant même si ton heure ne vaut rien'
    : 'rentable tant que ton heure vaut moins de ' + euros(seuilHoraire));
  if(tauxH != null) pourquoi.push('à ' + tauxH + ' €/h déclarés : valeur attendue ' + euros(ve));
  for(const g of portesInconnues) hyp.add('porte non confirmée : ' + reg.portes[g].libelle);

  return {
    id: o.id, titre: o.titre, niveau, executable: refus.length === 0, refus,
    p, seuilHoraire, coutTotal, ve, vpe, veParHeure: ve / Math.max(t.heures, 0.5),
    economie: Object.assign({}, eco, {profitMensuel, tauxH}), pourquoi, hypotheses: [...hyp],
    preuves: o.preuves, contreArgument: o.contreArgument, incertitudes: o.incertitudes,
    prochainTest: t, etape, etatTest: etatCourant, portesInconnues,
  };
}

/* ── 6. La question ───────────────────────────────────────────────────────── */

function recommander(reg, {catalogue, maintenant, limite = 3} = {}){
  if(!maintenant) throw new Error('date de décision obligatoire : une décision sans date ne se rejoue pas');
  const erreurs = validerRegistre(reg);
  if(erreurs.length) return {question: QUESTION, valide: false, erreurs};

  const ctx = contexte(reg, maintenant);
  const evals = reg.opportunites.map(o => evaluer(o, reg, catalogue, ctx));
  /* Sans valeur horaire déclarée, on classe par seuil : l'action qui reste
     rentable à l'heure la plus chère est le meilleur usage du temps. Avec une
     valeur déclarée, on classe par valeur attendue par euro engagé. */
  const parSeuil = ctx.tauxHoraire == null;
  const admise = x => x.executable && (parSeuil ? x.seuilHoraire > 0 : x.ve > 0);
  const retenues = evals.filter(admise)
    .sort((a, b) => (parSeuil ? b.seuilHoraire - a.seuilHoraire : b.vpe - a.vpe) || b.ve - a.ve || a.id.localeCompare(b.id));
  const negatives = evals.filter(x => x.executable && !admise(x));

  return {
    question: QUESTION,
    valide: true,
    date: maintenant,
    mode: reg.mode === 'DEMO' ? 'DEMO' : 'REEL',
    empreinte: empreinte(reg),
    phase: ctx.phase,
    revenusVerifies30j: ctx.revenus,
    urgence: ctx.urgence,
    plafondCash: ctx.plafondCash,
    hypothesesGlobales: [...ctx.hyp],
    classement: parSeuil ? 'seuil de rentabilité horaire' : 'valeur attendue par euro engagé',
    top: retenues.slice(0, limite),
    enAttente: retenues.slice(limite),
    ecartees: evals.filter(x => !x.executable).concat(negatives.map(x => Object.assign({}, x, {refus: [parSeuil ? 'perdant même si ton heure ne vaut rien' : 'valeur attendue négative : ' + euros(x.ve)]}))),
  };
}

const QUESTION = 'Où est mon meilleur prochain euro ?';

/* ── 7. Journal et rejeu ──────────────────────────────────────────────────
   Une décision consignée garde une copie des preuves disponibles à l'instant
   où elle a été prise. Quand le résultat arrivera, on relira CE registre-là,
   pas celui d'aujourd'hui — c'est la seule protection contre le biais de
   rétrospection (« c'était évident »). */

function empreinte(reg){
  const pertinent = {ressources: reg.ressources, portes: reg.portes, opportunites: reg.opportunites, resultats: reg.resultats || []};
  if(reg.observations) pertinent.observations = reg.observations;
  return 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(pertinent)).digest('hex').slice(0, 16);
}

function consigner(reco, reg){
  if(!reco.valide) throw new Error('une recommandation invalide ne se consigne pas');
  return {
    date: reco.date,
    mode: reco.mode,
    empreinte: reco.empreinte,
    classement: reco.classement,
    choix: reco.top.map(x => ({id: x.id, seuilHoraire: arrondi(x.seuilHoraire), ve: arrondi(x.ve), p: x.p})),
    ecartees: reco.ecartees.map(x => ({id: x.id, refus: x.refus})),
    registre: JSON.parse(JSON.stringify(Object.assign({ressources: reg.ressources, portes: reg.portes, opportunites: reg.opportunites, resultats: reg.resultats || []}, reg.observations ? {observations: reg.observations} : {}))),
  };
}

/* Rejouer, c'est recalculer avec le registre d'alors et le catalogue d'alors
   si on l'a — et vérifier que le calcul redonne le même choix. S'il ne le
   redonne pas, c'est le moteur qui a changé, et il faut le savoir. */
function rejouer(entree, catalogue){
  const reg = Object.assign({mode: entree.mode === 'DEMO' ? 'DEMO' : undefined}, entree.registre);
  const reco = recommander(reg, {catalogue, maintenant: entree.date});
  const alors = entree.choix.map(x => x.id).join(',');
  const maintenantIds = reco.top.map(x => x.id).join(',');
  return {
    identique: alors === maintenantIds && reco.empreinte === entree.empreinte,
    empreinteIntacte: reco.empreinte === entree.empreinte,
    choixAlors: entree.choix.map(x => x.id),
    choixRecalcule: reco.top.map(x => x.id),
    reco,
  };
}

/* ── Utilitaires ──────────────────────────────────────────────────────────── */

function arrondi(x){ return Math.round(x * 100) / 100; }
function pct(x){ return Math.round(x * 100) + ' %'; }
function euros(x){ return (x < 0 ? '−' : '') + Math.round(Math.abs(x)).toLocaleString('fr-FR') + ' €'; }

module.exports = {
  ECHELLE, PLAFOND_P, HYPOTHESE, DONNEE_PUBLIQUE, libelleNiveau, etatTest, probabiliteMiseAJour, PHASES, PORTES, DEFAUTS, QUESTION,
  validerRegistre, niveauPreuve, revenusVerifies, phase, prixDe,
  recommander, empreinte, consigner, rejouer, euros, pct,
};
