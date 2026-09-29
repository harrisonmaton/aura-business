#!/usr/bin/env node
'use strict';
/* omega — interface terminal du pipeline FIRST CUSTOMER.

     npm run omega:go                       JARVIS exécute ce qui peut l'être, puis affiche l'état
     node omega/omega.js etat               tableau FIRST CUSTOMER
     node omega/omega.js file               messages à approuver
     node omega/omega.js approuver <id> [--texte "..."]
     node omega/omega.js envoyer <id>       → lien d'envoi prêt (message direct)
     node omega/omega.js confirmer <id>     « c'est parti »
     node omega/omega.js reponse <lead> "texte de la réponse" [--intention positif]
     node omega/omega.js vente <lead> <montant> --preuve "virement du 02/10 réf. …"
     node omega/omega.js chrono-start --lead <lead> · chrono-stop <id>
     node omega/omega.js brief [--marquer]
     node omega/omega.js aide

   Toutes ces commandes appellent omega/commandes.js — la console web aussi. */

const C = require('./commandes.js');
const BR = require('./brief.js');
const M = require('./moteur.js');

const POSITIONNELS = {
  approuver: ['id'], ignorer: ['id'], envoyer: ['id'], confirmer: ['id'], reponse: ['lead', 'texte'], avancer: ['lead', 'etape'],
  proposition: ['lead'], vente: ['lead', 'montant'], importer: ['fichier'], 'chrono-pause': ['id'], 'chrono-reprendre': ['id'],
  'chrono-stop': ['id'], 'chrono-cout': ['id'], compte: ['id', 'etape'], 'tache-approuver': ['id'],
};

function analyser(argv){
  const [cmd = 'etat', ...reste] = argv;
  const a = {}, pos = [];
  for(let i = 0; i < reste.length; i++){
    if(reste[i].startsWith('--')){
      const k = reste[i].slice(2);
      if(reste[i + 1] !== undefined && !reste[i + 1].startsWith('--')){ a[k] = reste[++i]; } else a[k] = true;
    } else pos.push(reste[i]);
  }
  (POSITIONNELS[cmd] || []).forEach((k, i) => { if(pos[i] !== undefined) a[k] = pos[i]; });
  if(a.date) a.maintenant = new Date(a.date + 'T12:00:00Z').toISOString();
  return {cmd, a};
}

const pc = x => x == null ? 'UNKNOWN' : Math.round(x * 100) + ' %';

function afficherEtat(e){
  const f = e.entonnoir;
  const L = [];
  L.push('JARVIS Ω — FIRST CUSTOMER' + (e.mode === 'FIRST_CUSTOMER' ? ' (mode actif)' : ' (mode inactif : `omega activer`)') + ' · ' + e.offre.nom + ' ' + e.offre.prix + ' €');
  L.push('');
  L.push('TARGET ' + f.cible + ' · FOUND ' + f.prospectsTrouves + ' · QUALIFIED ' + f.qualifies + ' · PREPARED ' + f.messagesPrepares + ' · APPROVED ' + f.messagesApprouves +
    ' · CONTACTED ' + f.contactes + ' · REPLIES ' + f.reponses + ' · INTERESTED ' + f.interesses + ' · PROPOSALS ' + f.propositions + ' · WON ' + f.gagnes);
  L.push('DISTANCE TO FIRST CUSTOMER : ' + e.distance.etapesRestantes + '/' + e.distance.sur + ' étapes — prochaine : ' + e.distance.prochaine);
  L.push('P(first customer) : ' + (e.probabilite.valeur == null ? e.probabilite.libelle : pc(e.probabilite.valeur) + ' (' + e.probabilite.libelle + ')') + ' — ' + e.probabilite.base);
  L.push('');
  L.push('GOAL : premier client payant — ' + e.experience);
  for(const n of e.arbre){
    const icone = n.statut === 'FAIT' ? '✓' : n.statut === 'BLOQUE' ? '■' : '·';
    L.push('  ' + icone + ' [' + n.mode.padEnd(6) + '] ' + n.titre + (n.bloque ? '\n             BLOQUÉ : ' + n.bloque : '') + (n.raison && !n.fait ? '\n             pourquoi humain : ' + n.raison : ''));
  }
  L.push('');
  L.push('AUTONOMY RATIO : ' + pc(e.autonomie.ratio) + ' (' + e.autonomie.auto + ' AUTO · ' + e.autonomie.revue + ' REVIEW · ' + e.autonomie.humain + ' HUMAN) · temps humain restant estimé : ' + e.minutesHumainesRestantesEstimees + ' min');
  L.push('NEXT AUTO ACTION   : ' + (e.prochaineAuto ? e.prochaineAuto.titre + '  → `npm run omega:go`' : 'aucune disponible'));
  L.push('NEXT HUMAN CHECKPOINT : ' + (e.prochainHumain ? e.prochainHumain.titre + ' [' + e.prochainHumain.mode + ']' : '—'));
  if(e.hypothesesICP.length) L.push('Hypothèse ICP : ' + e.hypothesesICP.join(' ; '));
  L.push('');
  L.push('Recommandation du moteur (avec résultats réels) : ' + (Array.isArray(e.recommandation) ? e.recommandation.map(r => r.id ? r.id + ' [' + r.etatTest.statut + ', p ' + pc(r.p) + ']' : r).join(' · ') : '—'));
  for(const x of e.ecartees.filter(x => /KILL|VALIDÉE/.test(x.refus.join(' ')))) L.push('  ' + x.id + ' — ' + x.refus.join(' | '));
  return L.join('\n');
}

function afficherFile(msgs){
  if(!msgs.length) return 'File d\'approbation vide.';
  return msgs.map(m => [
    '── ' + m.id + ' · ' + m.statut + ' · ' + m.company + ' · ' + m.canal + ' → ' + m.destinataire + ' · score ' + m.score + ' · ' + m.templateVersion,
    'Pourquoi : ' + m.pourquoi,
    'Valeur attendue : ' + (m.valeurAttendue.euros == null ? m.valeurAttendue.base : m.valeurAttendue.euros + ' € (' + m.valeurAttendue.base + ')'),
    'Champs utilisés : ' + m.champsUtilises.join(', '),
    '', m.texte, '',
    m.statut === 'AWAITING_HUMAN_SEND' ? 'ENVOI : ouvrir ' + m.lien + ', coller, envoyer, puis `omega confirmer ' + m.id + '`'
      : 'SEND : omega approuver ' + m.id + ' && omega envoyer ' + m.id + '   ·   EDIT : --texte "…"   ·   SKIP : omega ignorer ' + m.id,
  ].join('\n')).join('\n\n');
}

async function principal(){
  const {cmd, a} = analyser(process.argv.slice(2));
  if(cmd === 'aide' || a.aide){
    for(const [k, c] of Object.entries(C.COMMANDES)) console.log(k.padEnd(18) + c.mode.padEnd(8) + c.aide);
    return;
  }
  if(cmd === 'go'){
    const r = await C.executer('executer', a);
    for(const f of r.faits) console.log('JARVIS EXECUTED — ' + f.action + ' : ' + JSON.stringify(f.resultat.sources ? {nouveaux: f.resultat.nouveaux, qualifies: f.resultat.qualifies, total: f.resultat.total, sources: f.resultat.sources.map(s => s.zone + ' ' + s.status + ' [' + (s.tentatives || []).map(t => t.source + ':' + t.status).join(', ') + ']')} : {prepares: f.resultat.prepares, ecartes: f.resultat.ecartes.length}));
    console.log('\n' + afficherEtat(r.etat));
    return;
  }
  const r = await C.executer(cmd, a);
  if(a.json){ console.log(JSON.stringify(r, null, 2)); return; }
  if(cmd === 'etat') console.log(afficherEtat(r));
  else if(cmd === 'file') console.log(afficherFile(r));
  else if(cmd === 'brief') console.log(BR.texte(r));
  else if(cmd === 'envoyer' && r.statut === 'AWAITING_HUMAN_SEND') console.log('Prêt. Ouvre ' + r.lien + ', colle le texte ci-dessous, envoie, puis confirme.\n\n' + r.texte);
  else if(cmd === 'recommander') console.log(r.valide ? r.top.map((x, i) => (i + 1) + '. ' + x.titre + ' [' + x.id + '] — ' + x.pourquoi.join(' · ')).join('\n') + '\nÉcartées : ' + r.ecartees.map(x => x.id + ' (' + x.refus[0] + ')').join(' · ') : 'REGISTRE INVALIDE : ' + r.erreurs.join(' ; '));
  else console.log(JSON.stringify(r, null, 2));
}

principal().catch(e => { console.error('✗ ' + e.message); process.exit(1); });

