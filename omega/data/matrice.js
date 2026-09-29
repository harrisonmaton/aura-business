#!/usr/bin/env node
'use strict';
/* Génère docs/OMEGA_DATA_MATRIX.md depuis le registre des sources — la
   matrice ne peut pas diverger du code. L'accès réel est mesuré au moment de
   la génération (santé source par source) et daté. */

const fs = require('fs');
const path = require('path');
const D = require('./registre-pays.js');

(async () => {
  const sante = Object.fromEntries((await D.sante()).map(s => [s.id, s]));
  const quand = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const L = [
    '# OMEGA — matrice des données',
    '',
    'Générée par `node omega/data/matrice.js` le ' + quand + '. **Accès réel = mesuré à cet instant, depuis cette machine** : une autre machine (Mac, serveur) aura une autre colonne. Relancer après tout changement de réseau.',
    '',
    'Ordre = ordre de repli : rang 1 interrogé d\'abord, puis 2, 3…, puis le cache, puis UNKNOWN. Jamais une donnée inventée.',
    '',
    '| Pays | Donnée | Rang | Source | Accès réel | Authentification | Coût | Limite | Licence | Implémentation |',
    '|---|---|---:|---|---|---|---|---|---|---|',
  ];
  for(const l of D.matrice()){
    const s = sante[l.id];
    L.push(`| ${l.pays} | ${l.capacite} | ${l.rang} | \`${l.id}\` | ${s ? s.statut : '—'} | ${l.auth} | ${l.cout} | ${l.limite} | ${l.licence} | ${l.implementation} |`);
  }
  L.push('', '## Lecture', '',
    '- **PASS** : l\'hôte répond. **BLOCKED** : refusé par le réseau (proxy, pare-feu) ou injoignable. **LOCAL** : lecture de fichiers, pas de réseau. **NOT_CONFIGURED** : il manque une clé, un compte ou un adaptateur.',
    '- `import-source` accepte des prospects collectés à la main ou par un agent de recherche, **à condition** que chaque fiche porte une URL source et une date de collecte.',
    '- Aucune source ne fournit de personnes : les adaptateurs retirent nom de gérant, fonction, email ou téléphone personnels.');
  const f = path.join(__dirname, '..', '..', 'docs', 'OMEGA_DATA_MATRIX.md');
  fs.mkdirSync(path.dirname(f), {recursive: true});
  fs.writeFileSync(f, L.join('\n') + '\n');
  console.log('écrit : ' + path.relative(process.cwd(), f));
})();
