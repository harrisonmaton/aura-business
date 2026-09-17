/* Audit visuel déterministe — moteur Impeccable (Apache 2.0, voir outils/).
   61 règles, aucun LLM, aucune clé d'API, aucun appel réseau : le bundle est
   injecté dans la page locale et rend son verdict depuis le navigateur.

   Ce fichier n'est pas un rapport ponctuel, c'est un garde-fou : le nombre de
   défauts par type est comparé à une référence versionnée. Un défaut qui
   revient fait sortir la commande en code 1, comme un test. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const BUNDLE = fs.readFileSync(path.join(RACINE, 'outils/impeccable/detect-antipatterns-browser.js'), 'utf8');
const REFERENCE = path.join(RACINE, 'outils/reference-visuelle.json');
const PAGES = [
  ['vitrine', 'preview/vitrine.html'],
  ['back-office', 'preview/back-office.html']
];
const ECRANS = [
  ['320', 320, 800], ['390', 390, 844], ['768', 768, 1024], ['1440', 1440, 900]
];

async function scanner(nav, fichier, l, h) {
  const p = await nav.newPage({ viewport: { width: l, height: h }, locale: 'fr-FR' });
  await p.goto('file://' + path.join(RACINE, fichier), { waitUntil: 'load' });
  await p.waitForTimeout(2000);
  /* Le débordement se mesure AVANT d'injecter le détecteur : son calque de
     visualisation déborde lui-même (mesuré : 468 px sur un écran de 390), et
     l'attribuer à la page serait un faux défaut. On neutralise overflow-x
     le temps de la mesure, sinon le clip cache le vrai débordement, puis on
     retire la neutralisation pour ne pas fausser l'analyse qui suit. */
  const debord = await p.evaluate(() => {
    const s = document.createElement('style');
    s.textContent = 'html,body{overflow-x:visible !important}';
    document.head.appendChild(s);
    const r = { sw: document.documentElement.scrollWidth, iw: window.innerWidth };
    s.remove();
    return r;
  });
  await p.addScriptTag({ content: BUNDLE });
  await p.waitForTimeout(900);
  const brut = await p.evaluate(async () => {
    if (typeof window.impeccableScan !== 'function') return null;
    try { return await window.impeccableScan(); } catch (e) { return null; }
  });
  await p.close();
  if (brut === null) throw new Error('le moteur Impeccable ne s\'est pas chargé');
  const compte = {};
  brut.forEach(e => (e.findings || []).forEach(f => { compte[f.type] = (compte[f.type] || 0) + 1; }));
  const details = {};
  brut.forEach(e => (e.findings || []).forEach(f => {
    (details[f.type] = details[f.type] || []);
    if (f.detail && details[f.type].length < 6) details[f.type].push(f.detail);
  }));
  return { compte, details, debord };
}

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const resultat = {};
  for (const [nomPage, fichier] of PAGES) {
    for (const [nomEcran, l, h] of ECRANS) {
      const cle = nomPage + '@' + nomEcran;
      resultat[cle] = await scanner(nav, fichier, l, h);
    }
  }
  await nav.close();

  const ref = fs.existsSync(REFERENCE) ? JSON.parse(fs.readFileSync(REFERENCE, 'utf8')) : null;
  let echecs = 0, total = 0;

  for (const cle of Object.keys(resultat)) {
    const r = resultat[cle];
    const n = Object.values(r.compte).reduce((a, b) => a + b, 0);
    total += n;
    console.log('\n──────── ' + cle + ' — ' + n + ' défaut(s) ────────');
    Object.entries(r.compte).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
      const attendu = ref && ref[cle] ? (ref[cle][t] || 0) : null;
      const verdict = attendu === null ? '' :
        c > attendu ? '  ← RÉGRESSION (référence ' + attendu + ')' :
        c < attendu ? '  ← amélioré (référence ' + attendu + ')' : '';
      if (attendu !== null && c > attendu) echecs++;
      console.log('  ' + String(c).padStart(3) + ' × ' + t + verdict);
      (r.details[t] || []).slice(0, 2).forEach(d => console.log('        · ' + String(d).slice(0, 120)));
    });
    /* Le débordement n'est jamais toléré, quelle que soit la référence. */
    if (r.debord.sw > r.debord.iw + 1) {
      console.log('  ÉCHEC — débordement horizontal réel : ' + r.debord.sw + ' px pour ' + r.debord.iw + ' px d\'écran');
      echecs++;
    }
    if (ref && ref[cle]) {
      Object.keys(ref[cle]).forEach(t => {
        if (!r.compte[t]) console.log('  ✓ ' + t + ' : éliminé (référence ' + ref[cle][t] + ')');
      });
    }
  }

  console.log('\n═══ ' + total + ' défaut(s) sur ' + Object.keys(resultat).length + ' vues ═══');
  if (process.argv.includes('--figer')) {
    const fige = {};
    /* Les clés commençant par « _ » sont des notes écrites à la main : elles
       disent POURQUOI un défaut est accepté. Sans elles, figer une référence
       revient à faire disparaître un défaut sans jamais l'avoir jugé, et
       personne ne sait six mois plus tard si c'était un choix ou un oubli.
       Elles survivent donc au gel, qui ne réécrit que les comptes. */
    if (ref) Object.keys(ref).forEach(k => { if (k[0] === '_') fige[k] = ref[k]; });
    Object.keys(resultat).forEach(k => { fige[k] = resultat[k].compte; });
    fs.writeFileSync(REFERENCE, JSON.stringify(fige, null, 1) + '\n');
    console.log('Référence écrite dans ' + path.relative(RACINE, REFERENCE) + '.');
    console.log('Toute entrée nouvelle doit être justifiée dans _justifications.');
    process.exit(0);
  }
  if (!ref) { console.log('Aucune référence : lancer `npm run audit:figer` pour en créer une.'); process.exit(0); }
  console.log(echecs ? echecs + ' régression(s) — sortie 1' : 'Aucune régression.');
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error('AUDIT INTERROMPU :', e.message); process.exit(2); });
