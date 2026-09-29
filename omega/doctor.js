#!/usr/bin/env node
'use strict';
/* npm run omega:doctor — ce que cet environnement sait faire, vérifié.
   PASS / WARN / FAIL. Code 1 seulement si un FAIL : ce qui est optionnel et
   absent est un WARN, pas une panne. */

const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const D = require('./data/registre-pays.js');
const CX = require('./connecteurs/index.js');

async function diagnostic({fetch = globalThis.fetch} = {}){
  const L = [];
  const add = (statut, nom, detail) => L.push({statut, nom, detail});

  const maj = Number(process.versions.node.split('.')[0]);
  add(maj >= 22 ? 'PASS' : 'FAIL', 'node', process.version + (maj >= 22 ? '' : ' — 22 ou plus requis'));

  let ff = null;
  try { ff = execFileSync('ffmpeg', ['-version'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).split('\n')[0]; } catch(_){}
  add(ff ? 'PASS' : 'WARN', 'ffmpeg', ff || 'absent — tests/recette-media.js sera SKIPPED (FFMPEG_MISSING) hors CI, FAIL en CI');

  try {
    const E = require('./core/etat.js');
    const f = E.chemin('.doctor');
    fs.writeFileSync(f, 'ok'); fs.unlinkSync(f);
    add('PASS', 'état (base fichiers)', E.dossier());
  } catch(e){ add('FAIL', 'état (base fichiers)', e.message); }
  add(process.env.DATABASE_URL ? 'PASS' : 'WARN', 'base de données', process.env.DATABASE_URL ? 'DATABASE_URL présente (non utilisée par Ω pour l\'instant)' : 'aucune — l\'état vit en fichiers, suffisant pour un worker unique');

  const candidats = [];
  try { candidats.push(require('playwright').chromium.executablePath()); } catch(_){}
  candidats.push('/opt/pw-browsers/chromium');           // chemin utilisé par la recette
  const chromium = candidats.find(c => c && fs.existsSync(c));
  add(chromium ? 'PASS' : 'WARN', 'navigateur', chromium || 'Chromium introuvable — recette visuelle impossible');

  for(const s of await D.sante({fetch})) add(s.statut === 'PASS' || s.statut === 'LOCAL' ? 'PASS' : 'WARN', 'source ' + s.id, s.statut + ' — ' + s.detail);

  for(const v of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'OMEGA_KBO_DIR', 'OMEGA_EMAIL_CONNECTEUR'])
    add(process.env[v] ? 'PASS' : 'WARN', 'env ' + v, process.env[v] ? 'présente (valeur non affichée)' : 'absente');

  for(const c of CX.statut()) add(c.statut === 'CONFIGURED' ? 'PASS' : 'WARN', 'connecteur ' + c.role, c.statut + (c.statut === 'CONFIGURED' ? '' : ' — repli : ' + c.repli));

  const reg = path.join(__dirname, 'registre.json');
  try {
    const M = require('./moteur.js');
    const err = M.validerRegistre(JSON.parse(fs.readFileSync(reg, 'utf8')));
    add(err.length ? 'FAIL' : 'PASS', 'registre Ω', err.length ? err.join(' ; ') : 'valide');
  } catch(e){ add('FAIL', 'registre Ω', e.message); }
  return L;
}

if(require.main === module){
  diagnostic().then(L => {
    for(const l of L) console.log(l.statut.padEnd(5) + ' ' + l.nom.padEnd(34) + ' ' + l.detail);
    const n = s => L.filter(l => l.statut === s).length;
    console.log('\n' + n('PASS') + ' PASS · ' + n('WARN') + ' WARN · ' + n('FAIL') + ' FAIL');
    process.exit(n('FAIL') ? 1 : 0);
  });
}

module.exports = {diagnostic};
