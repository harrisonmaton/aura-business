'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   SHOWROOM 3D — ce qui doit être vrai, et ce qui doit rester vrai sans lui.

   Le mandat interdit d'appeler « 3D interactive » trois panneaux inclinés.
   Ces contrôles vérifient donc la SCÈNE (un contexte WebGL, de la géométrie,
   des objets réellement construits) et, symétriquement, que son absence ne
   retire rien : prix, créations et commande doivent rester accessibles sans
   WebGL, en mouvement réduit et sur téléphone.
   ══════════════════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright');
const path = require('path');
const V = 'file://' + path.join(__dirname, '..', 'preview', 'vitrine.html');

const R = [];
const ck = (n, c, x) => R.push((c ? 'PASS ' : 'ÉCHEC') + ' — ' + n + (x !== undefined ? '  [' + x + ']' : ''));

/* Le commerce doit tenir debout tout seul : ces vérifications sont faites dans
   chaque configuration, avec ou sans scène. */
async function commerceIntact(page) {
  return page.evaluate(() => {
    const prix = [...document.querySelectorAll('#carte .menu-row .rp b, .col-prix, #pack-prix .montant')]
      .filter(e => e.getBoundingClientRect().width > 0 && /\d/.test(e.textContent));
    const commandes = [...document.querySelectorAll('[data-order], [data-ready]')]
      .filter(e => e.getBoundingClientRect().width > 0);
    const creations = [...document.querySelectorAll('.piece svg, .col-vue svg')]
      .filter(e => e.getBoundingClientRect().width > 40);
    return { prix: prix.length, commandes: commandes.length, creations: creations.length };
  });
}

(async () => {
  /* ── 1. Avec WebGL : la scène doit exister pour de vrai ────────────────── */
  const avecGL = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']
  });
  const p1 = await avecGL.newPage({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  const erreurs = [];
  p1.on('pageerror', e => erreurs.push('JS: ' + e.message));
  await p1.goto(V, { waitUntil: 'load' });
  await p1.waitForTimeout(7000);

  const scene = await p1.evaluate(() => {
    const hote = document.getElementById('showroom');
    const c = hote ? hote.querySelector('canvas') : null;
    const gl = c ? (c.getContext('webgl2') || c.getContext('webgl')) : null;
    return {
      etat: hote ? hote.getAttribute('data-showroom') : null,
      canvas: !!c,
      largeur: c ? c.width : 0,
      hauteur: c ? c.height : 0,
      contexteWebgl: !!gl,
      objets: (window.AuraShowroom && window.AuraShowroom.nombreObjets)
        ? window.AuraShowroom.nombreObjets() : 0,
      moteur: typeof THREE !== 'undefined' ? (THREE.REVISION || 'inconnu') : null
    };
  });
  ck('showroom : une vraie scène WebGL est construite',
     scene.etat === 'actif' && scene.canvas && scene.contexteWebgl
     && scene.largeur > 300 && scene.hauteur > 200,
     'canvas ' + scene.largeur + '×' + scene.hauteur + ' · contexte ' + scene.contexteWebgl
     + ' · three r' + scene.moteur);
  ck('showroom : les quatre créations de la série y sont posées',
     scene.objets === 4, scene.objets + ' objet(s)');

  /* La scène montre les VRAIS fichiers : une texture noire trahirait une photo
     non résolue — c'est arrivé, le panneau principal sortait vide. */
  /* `readPixels` sur le contexte vivant rend du noir : sans
     preserveDrawingBuffer, le tampon est vidé dès la présentation de l'image.
     C'est une limite de la mesure, pas du rendu. On analyse donc l'image
     RÉELLEMENT présentée — la capture du canvas — en la relisant dans un
     canvas 2D, qui lui donne accès aux pixels. */
  const capture = await p1.locator('#showroom canvas').screenshot();
  const pixels = await p1.evaluate(async (b64) => {
    const img = new Image();
    await new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; img.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let somme = 0, clairs = 0; const teintes = new Set();
    for (let i = 0; i < d.length; i += 4) {
      const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
      somme += v; if (v > 110) clairs++;
      teintes.add((d[i] >> 5) + ',' + (d[i + 1] >> 5) + ',' + (d[i + 2] >> 5));
    }
    return { moyenne: Math.round(somme / (d.length / 4)),
             clairs: Math.round(clairs / (d.length / 4) * 100), teintes: teintes.size };
  }, capture.toString('base64'));
  ck('showroom : le rendu présenté est un vrai studio éclairé, pas un cadre noir',
     !!pixels && pixels.moyenne > 45 && pixels.teintes > 40 && pixels.clairs > 15,
     pixels ? 'luminance ' + pixels.moyenne + ' · ' + pixels.teintes + ' teintes · '
              + pixels.clairs + '% de pixels clairs' : 'illisible');

  /* Une interaction réelle : cliquer un objet avance la pièce choisie. */
  const avant = await p1.evaluate(() => window.AuraShowroom.choix());
  await p1.evaluate(() => window.AuraShowroom.choisir(1));
  await p1.waitForTimeout(700);
  const apres = await p1.evaluate(() => window.AuraShowroom.choix());
  ck('showroom : la sélection d\'un objet est un état réel',
     avant === -1 && apres === 1, 'avant ' + avant + ' · après ' + apres);

  const c1 = await commerceIntact(p1);
  ck('showroom actif : prix, créations et commande restent accessibles',
     c1.prix > 0 && c1.commandes > 0 && c1.creations > 0,
     c1.prix + ' prix · ' + c1.commandes + ' commande(s) · ' + c1.creations + ' création(s)');
  ck('showroom : aucune erreur JS', erreurs.length === 0, erreurs.join(' | ') || 'aucune');
  await avecGL.close();

  /* ── 2. Sans WebGL : rien ne doit manquer ──────────────────────────────── */
  const sansGL = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium', args: ['--disable-gpu', '--disable-webgl']
  });
  const p2 = await sansGL.newPage({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  const erreurs2 = [];
  p2.on('pageerror', e => erreurs2.push(e.message));
  await p2.goto(V, { waitUntil: 'load' });
  await p2.waitForTimeout(5000);
  const repli = await p2.evaluate(() => {
    const hote = document.getElementById('showroom');
    const stage = document.getElementById('hero-stage');
    return {
      etat: hote ? hote.getAttribute('data-showroom') : null,
      pieces: stage ? stage.querySelectorAll('.piece3d').length : 0,
      stageVisible: stage ? getComputedStyle(stage).opacity !== '0' : false,
      message: (document.getElementById('showroom-etat') || {}).textContent || ''
    };
  });
  const c2 = await commerceIntact(p2);
  ck('sans WebGL : la composition à plat prend le relais',
     repli.etat !== 'actif' && repli.pieces === 4 && repli.stageVisible,
     repli.pieces + ' pièce(s) HTML · état « ' + repli.etat + ' »');
  ck('sans WebGL : prix, créations et commande restent accessibles',
     c2.prix > 0 && c2.commandes > 0 && c2.creations > 0,
     c2.prix + ' prix · ' + c2.commandes + ' commande(s) · ' + c2.creations + ' création(s)');
  ck('sans WebGL : le visiteur est informé qu\'il voit la vue à plat',
     /plat|flat|plana|piatta/i.test(repli.message), repli.message.trim() || '(aucun message)');
  ck('sans WebGL : aucune erreur JS', erreurs2.length === 0, erreurs2.join(' | ') || 'aucune');
  await sansGL.close();

  /* ── 3. Mouvement réduit : on ne démarre pas la scène ──────────────────── */
  const rm = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']
  });
  const ctx = await rm.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', locale: 'fr-FR' });
  const p3 = await ctx.newPage();
  await p3.goto(V, { waitUntil: 'load' });
  await p3.waitForTimeout(5000);
  const r3 = await p3.evaluate(() => ({
    canvas: !!document.querySelector('#showroom canvas'),
    raison: window.AuraShowroom ? window.AuraShowroom.raisonRefus() : 'moteur absent',
    pieces: document.querySelectorAll('#hero-stage .piece3d').length
  }));
  const c3 = await commerceIntact(p3);
  ck('mouvement réduit : la scène ne démarre pas',
     !r3.canvas && r3.raison === 'mouvement_reduit', 'raison : ' + r3.raison);
  ck('mouvement réduit : le contenu reste entier',
     r3.pieces === 4 && c3.prix > 0 && c3.commandes > 0,
     r3.pieces + ' pièce(s) · ' + c3.prix + ' prix');
  await rm.close();

  R.forEach(l => console.log(l));
  const e = R.filter(l => l.startsWith('ÉCHEC')).length;
  console.log('\n' + R.length + ' contrôles showroom — ' + (R.length - e) + ' PASS, ' + e + ' ÉCHEC');
  process.exit(e ? 1 : 0);
})().catch(e => { console.error('SHOWROOM INTERROMPU :', e.message); process.exit(2); });
