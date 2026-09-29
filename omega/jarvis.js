#!/usr/bin/env node
'use strict';
/* JARVIS Ω — interface en ligne de commande.

     npm run omega                       la réponse : trois actions au plus
     npm run omega -- --war-room <id>    le dossier complet d'une opportunité
     npm run omega -- --consigner        garde la décision dans omega/decisions.jsonl
     npm run omega -- --rejouer [n]      recalcule une décision consignée (dernière par défaut)
     npm run omega -- --signal <secteur> <code postal>   lit un signal public
     npm run omega -- --json             sortie machine
     npm run omega -- --date AAAA-MM-JJ  décide « comme ce jour-là »

   Code de sortie : 0 si une réponse a été produite, 1 si le registre est
   invalide ou si un rejeu ne redonne pas la décision d'origine. */

const fs = require('fs');
const path = require('path');
const M = require('./moteur.js');
const S = require('./signaux.js');
const {chargerCatalogue} = require('../server/boutique.js');

const ICI = __dirname;
const REGISTRE = process.env.OMEGA_REGISTRE || path.join(ICI, 'registre.json');
const DECISIONS = process.env.OMEGA_DECISIONS || path.join(ICI, 'decisions.jsonl');

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };

const date = opt('--date');
const maintenant = typeof date === 'string' ? new Date(date + 'T12:00:00Z').toISOString() : new Date().toISOString();

/* Par défaut, le registre est enrichi des résultats réels (messages envoyés,
   réponses, paiements, minutes mesurées) : c'est ce qui fait qu'un résultat
   change la recommandation suivante. --brut : le registre versionné seul. */
function lireRegistre(){
  const reg = JSON.parse(fs.readFileSync(REGISTRE, 'utf8'));
  if(args.includes('--brut') || M.validerRegistre(reg).length) return reg;
  return require('./pipeline.js').registreEnrichi(reg);
}
const L = [];
const out = s => L.push(s === undefined ? '' : s);
const fin = code => { console.log(L.join('\n')); process.exit(code); };

async function principal(){
  if(opt('--signal')){
    const secteur = opt('--signal'), cp = args[args.indexOf('--signal') + 2];
    const naf = S.NAF[secteur] || secteur;
    const r = await S.compterEtablissements({naf, codePostal: cp});
    if(args.includes('--json')){ console.log(JSON.stringify(r, null, 2)); process.exit(r.statut === 'ok' ? 0 : 1); }
    out('SIGNAL — ' + secteur + ' · ' + cp);
    if(r.statut === 'ok') out('  ' + r.preuve.fait + '\n  source : ' + r.preuve.source);
    else out('  ' + r.statut.toUpperCase() + ' — ' + r.motif + '\n  Aucun chiffre n\'est affiché à la place : un signal non lu n\'existe pas.');
    return fin(r.statut === 'ok' ? 0 : 1);
  }

  const catalogue = chargerCatalogue();

  if(opt('--rejouer')){
    if(!fs.existsSync(DECISIONS)){ out('Aucune décision consignée (' + path.relative(process.cwd(), DECISIONS) + ').'); return fin(1); }
    const lignes = fs.readFileSync(DECISIONS, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
    const n = opt('--rejouer') === true ? lignes.length : Number(opt('--rejouer'));
    const e = lignes[n - 1];
    if(!e){ out('Décision n°' + n + ' introuvable (' + lignes.length + ' consignées).'); return fin(1); }
    const r = M.rejouer(e, catalogue);
    out('REJEU — décision n°' + n + ' du ' + e.date.slice(0, 10) + ' (' + e.mode + ')');
    out('  empreinte du registre d\'alors : ' + e.empreinte + (r.empreinteIntacte ? ' — intacte' : ' — ALTÉRÉE'));
    out('  choix d\'alors     : ' + (r.choixAlors.join(', ') || 'aucun'));
    out('  choix recalculé   : ' + (r.choixRecalcule.join(', ') || 'aucun'));
    out('  ' + (r.identique ? 'Identique : le moteur redonne la même décision avec ce qu\'on savait alors.'
                            : 'DIVERGENT : le moteur ou le catalogue a changé depuis. Relire avant de juger la décision.'));
    out();
    out('Ce qu\'on savait alors :');
    for(const o of e.registre.opportunites) for(const p of o.preuves) out('  · [' + o.id + '] ' + p.fait + '  (' + p.source + ', ' + p.date + ')');
    const res = e.registre.resultats || [];
    out('  résultats connus alors : ' + (res.length ? res.length : 'aucun'));
    return fin(r.identique ? 0 : 1);
  }

  const reg = lireRegistre();
  const reco = M.recommander(reg, {catalogue, maintenant});

  if(!reco.valide){
    out('REGISTRE INVALIDE — aucune recommandation produite.');
    for(const e of reco.erreurs) out('  ✗ ' + e);
    return fin(1);
  }

  if(args.includes('--json')){ console.log(JSON.stringify(reco, null, 2)); process.exit(0); }

  const wr = opt('--war-room');
  if(wr) return warRoom(reco, reg, wr);

  out('JARVIS Ω — ' + reco.question);
  out((reco.mode === 'DEMO' ? '⚠ DEMO — ' : '') + 'phase ' + reco.phase.nom + ' (objectif : ' + reco.phase.objectif + ')'
      + ' · revenu vérifié 30 j : ' + M.euros(reco.revenusVerifies30j)
      + ' · plafond par test : ' + M.euros(reco.plafondCash)
      + (reco.urgence ? ' · MODE URGENCE' : ''));
  out('registre ' + reco.empreinte + ' · ' + reco.date.slice(0, 10) + ' · classement : ' + reco.classement);
  out();

  if(reco.top.length === 0) out('Aucune action admise aujourd\'hui. Voir les opportunités écartées ci-dessous.');
  reco.top.forEach((x, i) => {
    out((i + 1) + '. ' + x.titre + '   [' + x.id + ']');
    out('   → ' + x.prochainTest.action);
    out('   succès : ' + x.prochainTest.succes);
    out('   arrêt  : ' + x.prochainTest.arret);
    out('   pourquoi :');
    for(const l of x.pourquoi) out('     · ' + l);
    out('   contre   : ' + x.contreArgument);
    out('   inconnu  : ' + x.incertitudes.join(' ; '));
    out();
  });

  if(reco.ecartees.length){
    out('Écartées (' + reco.ecartees.length + ') :');
    for(const x of reco.ecartees) out('  ✗ ' + x.id + ' — ' + x.refus.join(' | '));
    out();
  }

  const portes = Object.entries(reg.portes).filter(([, p]) => p.statut !== 'franchie');
  if(portes.length){
    out('Ce qui attend un humain (JARVIS prépare, ne franchit pas) :');
    for(const [id, p] of portes) out('  ' + (p.statut === 'a_franchir' ? '■' : '?') + ' ' + p.libelle + ' — ' + p.humain + '  [' + id + ', ' + p.source + ']');
    out();
  }

  const hyp = [...new Set(reco.hypothesesGlobales.concat(...reco.top.map(x => x.hypotheses)))];
  if(hyp.length){
    out('Hypothèses utilisées faute de mesure — chacune peut renverser le classement :');
    for(const h of hyp) out('  ~ ' + h);
    out();
  }
  out('Probabilités non calibrées : aucun résultat de test n\'a encore été enregistré.');

  if(args.includes('--consigner')){
    fs.appendFileSync(DECISIONS, JSON.stringify(M.consigner(reco, reg)) + '\n');
    out('Décision consignée dans ' + path.relative(process.cwd(), DECISIONS) + '.');
  }
  fin(0);
}

function warRoom(reco, reg, id){
  const x = reco.top.concat(reco.enAttente, reco.ecartees).find(y => y.id === id);
  const o = reg.opportunites.find(y => y.id === id);
  if(!x || !o){ out('Opportunité inconnue : ' + id); return fin(1); }
  const rang = reco.top.findIndex(y => y.id === id);
  out('WAR ROOM — ' + o.titre + '   [' + id + ']');
  out(rang >= 0 ? 'Recommandée, rang ' + (rang + 1) : 'Non recommandée aujourd\'hui');
  out();
  out('RÉALITÉ');
  out('  preuve la plus forte : ' + M.libelleNiveau(x.niveau));
  out();
  out('PREUVES');
  for(const p of o.preuves) out('  · [' + p.nature + '] ' + p.fait + '\n    ' + p.source + ' — ' + p.date);
  out();
  out('ÉCONOMIE');
  if(x.economie && !x.economie.erreur){
    const e = x.economie;
    out('  prix ' + M.euros(e.prix) + ' · marge hors temps ' + M.euros(e.margeHorsTemps) + ' · ' + e.heuresParVente + ' h de production par vente · ' + e.ventes + ' ventes/mois si succès');
    out('  seuil : ' + (x.seuilHoraire > 0 ? 'rentable tant que ton heure vaut moins de ' + M.euros(x.seuilHoraire) : 'perdant même si ton heure ne vaut rien'));
    if(e.tauxH != null) out('  à ' + e.tauxH + ' €/h déclarés : profit mensuel ' + M.euros(e.profitMensuel) + ' · valeur attendue du test ' + M.euros(x.ve));
  } else out('  ' + x.refus.join(' | '));
  out();
  out('RISQUES');
  out('  contre-argument : ' + o.contreArgument);
  for(const i of o.incertitudes) out('  inconnu : ' + i);
  for(const r of x.refus || []) out('  bloquant : ' + r);
  for(const h of x.hypotheses || []) out('  hypothèse : ' + h);
  out();
  out('STRATÉGIE');
  out('  type de test : ' + o.prochainTest.type + ' · probabilité retenue ' + (x.p != null ? M.pct(x.p) : '—') + ' (déclarée ' + M.pct(o.prochainTest.pEstimee) + ')');
  out();
  out('EXÉCUTION');
  out('  ' + o.prochainTest.action);
  out('  ' + o.prochainTest.coutCash + ' € · ' + o.prochainTest.heures + ' h · ' + o.prochainTest.dureeJours + ' jours');
  out('  succès : ' + o.prochainTest.succes);
  out('  arrêt  : ' + o.prochainTest.arret);
  fin(0);
}

principal().catch(e => { console.error(e); process.exit(1); });
