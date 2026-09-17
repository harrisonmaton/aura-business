/* ════════════════════════════════════════════════════════════════════════
   COLLECTION « STREET » — la première offre réellement livrable.

   Ce script produit des FICHIERS, pas une couverture : quatre visuels
   1080×1080 en PNG, quatre légendes, un mode d'emploi, et l'archive que le
   client télécharge. Le nombre d'assets du catalogue est ensuite déduit de ce
   qui existe sur le disque — jamais saisi à la main.

   Rasterisation : Chromium (déjà présent pour la recette) rend le SVG et le
   capture. Aucun service payant, aucune génération facturée, aucun tiers.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const SORTIE = path.join(RACINE, 'src', 'collections', 'street');
const POLICES = path.join(RACINE, 'src', 'fonts');
/* Les aperçus de la vitrine ne sont pas des livrables : hors du dossier du
   produit, sinon le serveur les compterait comme des fichiers achetés. */
const VECTEURS = path.join(RACINE, 'src', 'apercus', 'street');

const C = {
  encre:'#0A0710', nuit:'#140B1C', ardoise:'#1D1426',
  papier:'#F6F2EA', craie:'#D6CEC2', laiton:'#D9B978', laitonHaut:'#F7E6BC',
  corail:'#FF6B4A', rose:'#FF2E88'
};
const SERIF = "Bodoni Moda, Didot, Georgia, serif";
const SANS  = "Archivo, Helvetica Neue, Arial, sans-serif";
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const W = 1080;

function defs(id, teinte){
  return `<defs>
    <linearGradient id="f-${id}" x1=".1" y1="0" x2=".85" y2="1">
      <stop offset="0" stop-color="${C.ardoise}"/>
      <stop offset=".55" stop-color="${C.nuit}"/>
      <stop offset="1" stop-color="${C.encre}"/>
    </linearGradient>
    <radialGradient id="h-${id}" cx="76%" cy="16%" r="72%">
      <stop offset="0" stop-color="${teinte}" stop-opacity=".52"/>
      <stop offset=".45" stop-color="${teinte}" stop-opacity=".14"/>
      <stop offset="1" stop-color="${teinte}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="b-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.laiton}" stop-opacity=".9"/>
      <stop offset="1" stop-color="${C.laitonHaut}" stop-opacity=".35"/>
    </linearGradient>
    <clipPath id="c-${id}"><rect x="0" y="0" width="${W}" height="${W}"/></clipPath>
    <linearGradient id="v-${id}" x1="0" y1=".62" x2=".62" y2="0">
      <stop offset="0" stop-color="${C.encre}" stop-opacity=".82"/>
      <stop offset=".52" stop-color="${C.encre}" stop-opacity=".3"/>
      <stop offset="1" stop-color="${C.encre}" stop-opacity="0"/>
    </linearGradient>
    <filter id="g-${id}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope=".045"/></feComponentTransfer>
    </filter>
  </defs>`;
}

/* Soleil levant art déco : arcs concentriques dans l'angle supérieur droit.
   Placé HORS du bloc de texte — la première version faisait passer des rayons
   au travers des titres, ce qui hachait la lecture. */
function soleil(cx, cy, n, r0, ecart, couleur){
  let d = '';
  for(let i=0;i<n;i++){
    const r = r0 + i*ecart;
    d += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${couleur}" stroke-width="${i%3===0?2:1}" opacity="${(0.30 - i*0.018).toFixed(3)}"/>`;
  }
  return d;
}

/* Rayons, cantonnés au quart supérieur droit. */
function rayons(cx, cy, r, n, couleur, op){
  let d = '';
  for(let i=0;i<n;i++){
    const a = Math.PI * (1.02 + 0.46 * i/(n-1));
    d += `<line x1="${cx}" y1="${cy}" x2="${(cx-Math.cos(a)*r).toFixed(1)}" y2="${(cy-Math.sin(a)*r).toFixed(1)}" stroke="${couleur}" stroke-width="1.4" opacity="${op}"/>`;
  }
  return d;
}

function filets(x, y, w, n, ecart, couleur, op){
  let d = '';
  for(let i=0;i<n;i++) d += `<rect x="${x}" y="${y+i*ecart}" width="${w - i*36}" height="2.5" fill="${couleur}" opacity="${op}"/>`;
  return d;
}

/* Un visuel. Le bloc de texte occupe le tiers bas-gauche, la lumière vient du
   haut-droit : l'oeil entre par la lumière et descend vers le message. */
function visuel({id, teinte, estampille, mot1, mot2, ligne, pied}){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}">
${defs(id, teinte)}
<rect width="${W}" height="${W}" fill="url(#f-${id})"/>
<g clip-path="url(#c-${id})">
  ${soleil(880, 150, 13, 120, 62, teinte)}
  ${rayons(880, 150, 620, 11, teinte, .14)}
  <circle cx="880" cy="150" r="104" fill="${teinte}" opacity=".16"/>
</g>
<rect width="${W}" height="${W}" fill="url(#h-${id})"/>
<rect x="0" y="0" width="${W}" height="${W}" fill="${C.encre}" opacity=".16"/>
<!-- Le motif passait derrière les titres et hachait la lecture : on l'éteint
     progressivement du côté du texte, sans le supprimer. -->
<rect x="0" y="0" width="${W}" height="${W}" fill="url(#v-${id})"/>
<rect x="58" y="58" width="${W-116}" height="${W-116}" fill="none" stroke="${C.laiton}" stroke-width="1.5" opacity=".5"/>

<text x="110" y="168" font-family="${SANS}" font-size="24" font-weight="600" letter-spacing="11" fill="${C.laitonHaut}">${esc(estampille)}</text>
<rect x="110" y="196" width="66" height="2.5" fill="${C.laitonHaut}" opacity=".85"/>

<text x="110" y="560" font-family="${SERIF}" font-size="158" fill="${C.papier}" letter-spacing="-3">${esc(mot1)}</text>
<text x="110" y="706" font-family="${SERIF}" font-size="112" font-style="italic" fill="${teinte}" letter-spacing="-1">${esc(mot2)}</text>
${filets(110, 762, 300, 3, 14, C.laiton, .6)}
<text x="110" y="880" font-family="${SANS}" font-size="33" fill="${C.papier}" opacity=".95">${esc(ligne)}</text>
<text x="110" y="936" font-family="${SANS}" font-size="25" fill="${C.craie}" opacity=".7">${esc(pied)}</text>

<rect x="${W-186}" y="${W-152}" width="76" height="2" fill="url(#b-${id})"/>
<text x="${W-110}" y="${W-102}" text-anchor="end" font-family="${SERIF}" font-size="30" fill="${C.laiton}" opacity=".85" letter-spacing="2">AURA</text>
<rect width="${W}" height="${W}" filter="url(#g-${id})" opacity=".5"/>
</svg>`;
}

/* ─── La collection ────────────────────────────────────────────────────────
   Quatre situations que tout commerce de quartier rencontre chaque semaine.
   Le texte est fixe : c'est une collection déjà composée, pas un sur-mesure. */
const PIECES = [
  {id:'street-1', fichier:'01-ouvert.png', teinte:C.laiton,
   estampille:'AUJOURD’HUI', mot1:'Ouvert', mot2:'jusqu’au bout',
   ligne:'On vous attend.', pied:'Passez quand vous voulez',
   legende:"Ouvert aujourd’hui. Rien de compliqué : on est là, vous passez, on s’occupe du reste.\n\nDites-nous en commentaire à quelle heure vous venez — on garde ce qu’il faut."},
  {id:'street-2', fichier:'02-nouveau.png', teinte:C.corail,
   estampille:'CETTE SEMAINE', mot1:'Nouveau', mot2:'à la carte',
   ligne:'Quelque chose qui n’y était pas la semaine dernière.', pied:'À découvrir sur place',
   legende:"Nouveau cette semaine. On l’a testé avant vous, et on le garde.\n\nVous êtes plutôt du genre à essayer tout de suite, ou à attendre que quelqu’un vous dise que c’est bien ?"},
  {id:'street-3', fichier:'03-merci.png', teinte:C.rose,
   estampille:'LE QUARTIER', mot1:'Merci', mot2:'d’être passés',
   ligne:'Sans vous, ce serait juste une adresse.', pied:'À très vite',
   legende:"Merci. Pas une formule : sans les gens qui poussent la porte, ce serait juste une adresse de plus.\n\nSi vous êtes venu cette semaine, cette publication est pour vous."},
  {id:'street-4', fichier:'04-ce-soir.png', teinte:C.laiton,
   estampille:'CE SOIR', mot1:'On garde', mot2:'la lumière',
   ligne:'Dernière heure pour passer.', pied:'Jusqu’à la fermeture',
   legende:"On garde la lumière allumée encore un moment.\n\nSi vous hésitez : c’est maintenant. Demain on recommence, mais ce soir c’est ce soir."}
];

/* ─── Rendu ────────────────────────────────────────────────────────────── */
function pageDeRendu(svg){
  const f = n => 'file://' + path.join(POLICES, n);
  return `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:'Archivo';font-weight:300 700;src:url(${f('archivo-latin.woff2')}) format('woff2');}
@font-face{font-family:'Archivo';font-weight:300 700;src:url(${f('archivo-latin-ext.woff2')}) format('woff2');unicode-range:U+0100-024F;}
@font-face{font-family:'Bodoni Moda';font-style:normal;font-weight:400 700;src:url(${f('bodoni-moda-latin.woff2')}) format('woff2');}
@font-face{font-family:'Bodoni Moda';font-style:italic;font-weight:400 700;src:url(${f('bodoni-moda-italic-latin.woff2')}) format('woff2');}
html,body{margin:0;padding:0;background:#0A0710}svg{display:block}
</style>${svg}`;
}

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  fs.mkdirSync(VECTEURS, { recursive: true });
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await nav.newPage({ viewport: { width: W, height: W }, deviceScaleFactor: 1 });

  const produits = [];
  /* `setContent` laisse la page sur about:blank, et Chromium refuse alors de
     charger une police en file:// : les PNG seraient sortis en Times. On écrit
     donc la page de rendu sur le disque et on y navigue. */
  const pageTmp = path.join(SORTIE, '.rendu.html');
  for (const p of PIECES) {
    const svg = visuel(p);
    fs.writeFileSync(pageTmp, pageDeRendu(svg));
    await page.goto('file://' + pageTmp, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(220);
    /* Contrôle à la source : si les polices de la maison ne sont pas chargées,
       le PNG sortirait en Times. On refuse de livrer ça. */
    const ok = await page.evaluate(() => {
      const f = [...document.fonts].filter(x => x.status === 'loaded').map(x => x.family);
      return f.includes('Archivo') && f.includes('Bodoni Moda');
    });
    if (!ok) throw new Error('polices non chargées pour ' + p.fichier + ' — livraison refusée');
    const cible = path.join(SORTIE, p.fichier);
    await page.screenshot({ path: cible, clip: { x: 0, y: 0, width: W, height: W } });
    /* Le même dessin sert deux fois : le PNG 1080 part chez le client, le SVG
       vectoriel reste dans la vitrine — net à toute taille, et 200 fois plus
       léger qu'un PNG d'aperçu. */
    fs.writeFileSync(path.join(VECTEURS, p.id + '.svg'), svg);
    const o = fs.statSync(cible).size;
    produits.push({ fichier: p.fichier, octets: o, apercu: 'vecteurs/' + p.id + '.svg' });
    console.log('  ' + p.fichier + '  ' + (o / 1024).toFixed(1) + ' Ko');
  }
  await nav.close();
  fs.unlinkSync(pageTmp);

  /* Une légende par visuel, dans un fichier qui porte le même numéro : le
     client n'a pas à chercher quel texte va avec quelle image, et l'inventaire
     compte un texte par visuel, comme le catalogue le promet. */
  const legendes = [];
  PIECES.forEach((p, i) => {
    const n = String(i + 1).padStart(2, '0');
    const nom = n + '-legende.txt';
    fs.writeFileSync(path.join(SORTIE, nom),
      'AURA BUSINESS — COLLECTION STREET\n'
      + 'Légende du visuel ' + n + '  (' + p.fichier + ')\n'
      + '─'.repeat(58) + '\n\n' + p.legende + '\n\n'
      + '─'.repeat(58) + '\n'
      + 'Ce texte vous appartient. Modifiez-le si vous préférez vos mots :\n'
      + 'le ton compte plus que la formulation exacte.\n');
    legendes.push(nom);
  });

  fs.writeFileSync(path.join(SORTIE, 'LISEZ-MOI.txt'),
`AURA BUSINESS — COLLECTION STREET
=================================

CE QUE VOUS AVEZ TÉLÉCHARGÉ

  01-ouvert.png     1080 × 1080   à publier n'importe quel jour d'ouverture
  02-nouveau.png    1080 × 1080   quand vous ajoutez quelque chose
  03-merci.png      1080 × 1080   après une bonne semaine
  04-ce-soir.png    1080 × 1080   en fin de journée, avant la fermeture

  01-legende.txt    le texte qui va avec le visuel 01
  02-legende.txt    le texte qui va avec le visuel 02
  03-legende.txt    le texte qui va avec le visuel 03
  04-legende.txt    le texte qui va avec le visuel 04

COMMENT S'EN SERVIR

  1. Ouvrez Instagram, appuyez sur +, choisissez le fichier.
  2. Ouvrez le fichier -legende.txt du même numéro, copiez, collez.
  3. Publiez.

  Les images font 1080 × 1080 : c'est le format carré d'Instagram.
  Aucune retouche n'est nécessaire.

CE QUE VOUS POUVEZ EN FAIRE

  Ces fichiers sont à vous. Publiez-les autant de fois que vous voulez,
  sur les comptes de votre commerce. Modifiez les textes si vous préférez
  vos propres mots.

  Vous ne pouvez pas les revendre ni les redistribuer comme collection.

CE QUE CETTE COLLECTION N'EST PAS

  Ce n'est pas du sur-mesure : les textes sur les images sont fixes et
  ne portent pas le nom de votre commerce. Si vous voulez des visuels
  à votre nom, avec votre activité et votre public, c'est un pack sur
  brief — à partir de 50 €.

PROVENANCE

  Ces quatre visuels sont des compositions produites par le code de
  scripts/build-collection.js. Aucune photographie, aucun élément sous
  licence tierce, aucune image générée par un service extérieur.
`);

  /* L'archive que le client reçoit. */
  const archive = path.join(RACINE, 'src', 'collections', 'street.zip');
  if (fs.existsSync(archive)) fs.unlinkSync(archive);
  const livrables = fs.readdirSync(SORTIE)
    .filter(f => fs.statSync(path.join(SORTIE, f)).isFile() && !f.startsWith('.'));
  execFileSync('zip', ['-q', '-j', archive].concat(
    livrables.map(f => path.join(SORTIE, f))), { cwd: RACINE });

  /* Le nombre d'assets vient du disque, pas d'une saisie. */
  const visuels = fs.readdirSync(SORTIE).filter(f => /\.png$/.test(f));
  if (visuels.length !== PIECES.length)
    throw new Error('visuels attendus ' + PIECES.length + ', trouvés ' + visuels.length);
  const inventaire = {
    collection: 'street',
    genere: new Date().toISOString().slice(0, 10),
    visuels: visuels.length,
    textes: legendes.length,
    fichiers: livrables.map(f => ({
      nom: f, octets: fs.statSync(path.join(SORTIE, f)).size
    })),
    archive: { nom: 'street.zip', octets: fs.statSync(archive).size },
    provenance: 'Compositions produites par scripts/build-collection.js. '
      + 'Aucune photographie, aucun élément tiers, aucune génération payante.'
  };
  fs.writeFileSync(path.join(RACINE, 'src', 'collections', 'street-INVENTAIRE.json'),
    JSON.stringify(inventaire, null, 1) + '\n');

  /* catalog.json reçoit le compte réel : la vente s'ouvre parce que les
     fichiers existent, pas parce qu'on a écrit un chiffre. */
  const chemin = path.join(RACINE, 'src', 'catalog.json');
  const cat = JSON.parse(fs.readFileSync(chemin, 'utf8'));
  const street = cat.ready.find(r => r.name === 'Street');
  const avant = street.assets;
  street.assets = visuels.length;
  fs.writeFileSync(chemin, JSON.stringify(cat, null, 2) + '\n');

  console.log('\ncollection street : ' + visuels.length + ' visuel(s), ' + PIECES.length + ' légende(s)');
  console.log('archive : street.zip (' + (inventaire.archive.octets / 1024).toFixed(1) + ' Ko)');
  console.log('catalog.json — Street assets : ' + avant + ' → ' + street.assets);
})().catch(e => { console.error('ÉCHEC :', e.message); process.exit(1); });
