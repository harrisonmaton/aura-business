/* Génère les créations de démonstration et les couvertures de packs.

   Aucune image n'est importée : chaque composition est écrite ici en SVG et
   rendue déterministe. La provenance de tout élément graphique du site est
   donc ce fichier, ce qui règle par construction la question des droits.

   Les compositions sont ensuite injectées dans src/vitrine.html entre les
   marqueurs CREATIONS, parce qu'un SVG chargé via <img> n'hérite pas des
   polices de la page : en ligne, il les hérite.

   Commerces fictifs. Aucun client réel, aucun témoignage, aucun résultat. */

const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const SORTIE = path.join(RACINE, 'src', 'creations');

const C = {
  encre:'#0A0710', nuit:'#120A18', ardoise:'#1B1320',
  papier:'#F4F1EA', craie:'#CFC7BC',
  rose:'#FF2E88', cyan:'#57E9FF', laiton:'#D9B978', corail:'#FF6B4A',
  violet:'#7B3BFF', vert:'#4ADE9B'
};

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const SERIF = "Bodoni Moda, Didot, Georgia, serif";
const SANS  = "Archivo, Helvetica Neue, Arial, sans-serif";

/* Grain et halo réutilisés : déclarés une fois par composition. */
function defs(id, teinte){
  return `<defs>
    <radialGradient id="halo-${id}" cx="50%" cy="28%" r="78%">
      <stop offset="0" stop-color="${teinte}" stop-opacity=".40"/>
      <stop offset="1" stop-color="${teinte}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fond-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.nuit}"/><stop offset="1" stop-color="${C.encre}"/>
    </linearGradient>
    <filter id="grain-${id}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope=".055"/></feComponentTransfer>
    </filter>
  </defs>`;
}
const grain = (id,w,h) => `<rect width="${w}" height="${h}" filter="url(#grain-${id})" opacity=".55"/>`;

/* Trame art déco : rayons fins depuis le bas, comme un éventail de marquise. */
function eventail(cx, cy, r, n, couleur, opacite){
  let d = '';
  for(let i=0;i<n;i++){
    const a = Math.PI * (0.08 + 0.84 * i/(n-1));
    d += `<line x1="${cx}" y1="${cy}" x2="${(cx - Math.cos(a)*r).toFixed(1)}" y2="${(cy - Math.sin(a)*r).toFixed(1)}"
      stroke="${couleur}" stroke-width="1" opacity="${opacite}"/>`;
  }
  return d;
}

/* Filets horizontaux façon façade streamline. */
function filets(x, y, w, n, ecart, couleur, opacite){
  let d = '';
  for(let i=0;i<n;i++) d += `<rect x="${x}" y="${y + i*ecart}" width="${w}" height="1.5" fill="${couleur}" opacity="${opacite}"/>`;
  return d;
}

/* ─── Publications 1:1 ─────────────────────────────────────────────────── */

function posteTypo({id, teinte, sur, titre, sousTitre, bas, badge, photo}){
  const W=1080,H=1080;
  /* Quand une photographie est disponible, elle devient le fond et le texte
     se pose dessus. Le texte n'est jamais généré dans l'image : il reste en
     SVG, donc lisible, traduisible et modifiable sans regénérer la photo.
     Le voile sombre garantit le contraste quelle que soit la photo. */
  const fond = photo
    ? `<image href="${photo}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
       <rect width="${W}" height="${H}" fill="#0A0710" opacity=".34"/>
       <rect width="${W}" height="${H}" fill="url(#voile-${id})"/>`
    : `<rect width="${W}" height="${H}" fill="url(#fond-${id})"/>
       <rect width="${W}" height="${H}" fill="url(#halo-${id})"/>
       ${eventail(540, 1080, 900, 17, teinte, .13)}`;
  const voile = photo
    ? `<linearGradient id="voile-${id}" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="#0A0710" stop-opacity=".82"/>
         <stop offset=".45" stop-color="#0A0710" stop-opacity=".18"/>
         <stop offset="1" stop-color="#0A0710" stop-opacity=".88"/>
       </linearGradient>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(sur)} — ${esc(titre)}">
${defs(id, teinte)}
<defs>${voile}</defs>
${fond}
<rect x="64" y="64" width="${W-128}" height="${H-128}" fill="none" stroke="${C.laiton}" stroke-width="1.5" opacity=".42"/>
<rect x="78" y="78" width="${W-156}" height="${H-156}" fill="none" stroke="${C.laiton}" stroke-width="1" opacity=".18"/>
<text x="112" y="182" font-family="${SANS}" font-size="26" font-weight="600" letter-spacing="9" fill="${teinte}">${esc(sur)}</text>
<text x="112" y="430" font-family="${SERIF}" font-size="150" fill="${C.papier}">${esc(titre)}</text>
<text x="112" y="530" font-family="${SERIF}" font-size="88" font-style="italic" fill="${teinte}">${esc(sousTitre)}</text>
${filets(112, 600, 300, 3, 14, C.laiton, .5)}
<text x="112" y="740" font-family="${SANS}" font-size="34" fill="${C.craie}">${esc(bas)}</text>
<rect x="112" y="880" width="${28 + badge.length*20}" height="58" fill="${teinte}"/>
<text x="126" y="919" font-family="${SANS}" font-size="26" font-weight="700" letter-spacing="3" fill="${C.encre}">${esc(badge)}</text>
${grain(id,W,H)}
</svg>`;
}

function posteCarte({id, teinte, sur, titre, lignes, pied}){
  const W=1080,H=1080;
  const items = lignes.map((l,i)=>{
    const y = 430 + i*104;
    return `<text x="120" y="${y}" font-family="${SERIF}" font-size="52" fill="${C.papier}">${esc(l[0])}</text>
      <text x="960" y="${y}" text-anchor="end" font-family="${SANS}" font-size="44" fill="${teinte}">${esc(l[1])}</text>
      <line x1="120" y1="${y+26}" x2="960" y2="${y+26}" stroke="${C.laiton}" stroke-width="1" opacity=".22" stroke-dasharray="3 7"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(titre)}">
${defs(id, teinte)}
<rect width="${W}" height="${H}" fill="url(#fond-${id})"/>
<rect width="${W}" height="${H}" fill="url(#halo-${id})"/>
<rect x="56" y="56" width="${W-112}" height="${H-112}" fill="${C.ardoise}" opacity=".55"/>
<rect x="56" y="56" width="${W-112}" height="${H-112}" fill="none" stroke="${C.laiton}" stroke-width="1.5" opacity=".45"/>
<text x="120" y="190" font-family="${SANS}" font-size="24" font-weight="600" letter-spacing="10" fill="${teinte}">${esc(sur)}</text>
<text x="120" y="310" font-family="${SERIF}" font-size="104" fill="${C.papier}">${esc(titre)}</text>
${items}
<text x="120" y="940" font-family="${SANS}" font-size="28" fill="${C.craie}" opacity=".85">${esc(pied)}</text>
${grain(id,W,H)}
</svg>`;
}

function posteBloc({id, teinte, second, mot1, mot2, sur, bas}){
  const W=1080,H=1080;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(mot1)} ${esc(mot2)}">
${defs(id, teinte)}
<rect width="${W}" height="${H}" fill="url(#fond-${id})"/>
<rect x="0" y="0" width="${W}" height="${H}" fill="url(#halo-${id})"/>
<circle cx="820" cy="270" r="230" fill="${second}" opacity=".30"/>
<circle cx="300" cy="810" r="180" fill="${teinte}" opacity=".22"/>
${filets(0, 520, W, 2, 22, C.laiton, .28)}
<text x="540" y="200" text-anchor="middle" font-family="${SANS}" font-size="26" font-weight="600" letter-spacing="12" fill="${C.craie}">${esc(sur)}</text>
<text x="540" y="470" text-anchor="middle" font-family="${SERIF}" font-size="185" fill="${C.papier}">${esc(mot1)}</text>
<text x="540" y="660" text-anchor="middle" font-family="${SERIF}" font-size="185" font-style="italic" fill="${teinte}">${esc(mot2)}</text>
<text x="540" y="880" text-anchor="middle" font-family="${SANS}" font-size="32" fill="${C.craie}">${esc(bas)}</text>
${grain(id,W,H)}
</svg>`;
}

/* ─── Story 9:16 ───────────────────────────────────────────────────────── */

function story({id, teinte, sur, titre, sousTitre, bas, action}){
  const W=1080,H=1920;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Story — ${esc(titre)}">
${defs(id, teinte)}
<rect width="${W}" height="${H}" fill="url(#fond-${id})"/>
<rect width="${W}" height="${H}" fill="url(#halo-${id})"/>
${eventail(540, 1920, 1500, 21, teinte, .11)}
<rect x="60" y="60" width="${W-120}" height="${H-120}" fill="none" stroke="${C.laiton}" stroke-width="1.5" opacity=".4"/>
<g opacity=".9"><rect x="110" y="150" width="${W-220}" height="4" rx="2" fill="${C.papier}" opacity=".25"/>
<rect x="110" y="150" width="300" height="4" rx="2" fill="${C.papier}"/></g>
<text x="110" y="300" font-family="${SANS}" font-size="30" font-weight="600" letter-spacing="10" fill="${teinte}">${esc(sur)}</text>
<text x="110" y="700" font-family="${SERIF}" font-size="190" fill="${C.papier}">${esc(titre)}</text>
<text x="110" y="850" font-family="${SERIF}" font-size="104" font-style="italic" fill="${teinte}">${esc(sousTitre)}</text>
${filets(110, 950, 340, 3, 16, C.laiton, .5)}
<text x="110" y="1120" font-family="${SANS}" font-size="40" fill="${C.craie}">${esc(bas)}</text>
<rect x="110" y="1560" width="${W-220}" height="104" rx="52" fill="${C.papier}"/>
<text x="540" y="1627" text-anchor="middle" font-family="${SANS}" font-size="36" font-weight="700" letter-spacing="2" fill="${C.encre}">${esc(action)}</text>
<text x="540" y="1790" text-anchor="middle" font-family="${SANS}" font-size="26" letter-spacing="3" fill="${C.craie}" opacity=".7">CONCEPT DE DÉMONSTRATION</text>
${grain(id,W,H)}
</svg>`;
}

/* ─── Couverture de pack : montre du contenu, pas un nom sur une ambiance ─ */

function couverture({id, nom, prix, teinte, second, vignettes, ligne}){
  const W=900,H=1200, TW=346, TH=250;
  /* Trois vignettes en escalier. Les zones de texte ne se croisent jamais :
     une couverture doit montrer le contenu du pack, pas l'empiler. */
  const pos = [[64,252,-1.6],[452,404,1.8],[128,690,-1.1]];
  const tuiles = vignettes.slice(0,3).map((v,i)=>{
    const [x,y,rot] = pos[i], accent = i===1 ? second : teinte;
    return `<g transform="translate(${x} ${y}) rotate(${rot} ${TW/2} ${TH/2})">
      <rect width="${TW}" height="${TH}" fill="${C.ardoise}"/>
      <rect width="${TW}" height="${TH}" fill="${accent}" opacity=".13"/>
      <rect width="${TW}" height="${TH}" fill="none" stroke="${C.laiton}" stroke-width="1.5" opacity=".55"/>
      <text x="26" y="52" font-family="${SANS}" font-size="18" font-weight="600" letter-spacing="5" fill="${accent}">${esc(v[0])}</text>
      <text x="26" y="140" font-family="${SERIF}" font-size="58" fill="${C.papier}">${esc(v[1])}</text>
      <text x="26" y="188" font-family="${SANS}" font-size="22" fill="${C.craie}" opacity=".8">${esc(v[2])}</text>
      ${filets(26, 212, 110, 2, 10, C.laiton, .45)}
    </g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Couverture ${esc(nom)} — ${esc(prix)}">
${defs(id, teinte)}
<rect width="${W}" height="${H}" fill="url(#fond-${id})"/>
<rect width="${W}" height="${H}" fill="url(#halo-${id})" opacity=".45"/>
${eventail(450, 1200, 820, 15, teinte, .1)}
<text x="64" y="132" font-family="${SERIF}" font-size="92" fill="${C.papier}">${esc(nom)}</text>
<text x="64" y="192" font-family="${SANS}" font-size="24" letter-spacing="1" fill="${teinte}">${esc(ligne)}</text>
${tuiles}
<rect x="64" y="1032" width="${W-128}" height="1.5" fill="${C.laiton}" opacity=".5"/>
<text x="64" y="1122" font-family="${SERIF}" font-size="80" fill="${C.laiton}">${esc(prix)}</text>
${grain(id,W,H)}
</svg>`;
}

/* ─── Image d'accueil ──────────────────────────────────────────────────────
   Remplace hero.webp, dont la provenance n'a jamais pu être établie : ni le
   fichier ni sa version d'origine ne portaient la moindre métadonnée, et rien
   ne permettait d'affirmer qu'il était libre d'usage commercial. Celle-ci est
   écrite ici, donc sa provenance est ce fichier.
   Ocean Drive après minuit : façade streamline moderne, marquise néon,
   palmiers en ombres, horizon de ville, chaussée mouillée. ──────────────── */
/* ─── Scènes du protocole ──────────────────────────────────────────────────
   La section « protocole » n'était que trois colonnes de texte sur du noir :
   200 px de vide au-dessus, 250 en dessous, aucune image. Chaque étape reçoit
   sa scène, dans la langue de la maison — nuit, laiton, filets streamline.
   Format 4:3, dessinées ici, aucune source extérieure. */

/* 1 — La carte : on choisit un numéro, le prix est écrit. */
function etapeCarte(){
  const W=1200,H=900,id='et1',t=C.laiton;
  const lignes=[['01','Essentiel','50'],['02','Signature','90'],['03','Atelier','150'],['04','Maison','250']];
  let rows='';
  lignes.forEach((l,i)=>{
    const y=392+i*118, actif=i===1;
    if(actif) rows+=`<rect x="150" y="${y-72}" width="900" height="104" fill="${t}" opacity=".13"/>`;
    rows+=`<text x="178" y="${y}" font-family="${SERIF}" font-size="46" fill="${actif?t:C.craie}" opacity="${actif?1:.62}">${l[0]}</text>`
        + `<text x="286" y="${y}" font-family="${SERIF}" font-size="52" fill="${actif?C.papier:C.craie}" opacity="${actif?1:.72}">${l[1]}</text>`
        + `<text x="1022" y="${y}" text-anchor="end" font-family="${SERIF}" font-size="52" fill="${actif?t:C.craie}" opacity="${actif?1:.62}">${l[2]} €</text>`
        + `<rect x="150" y="${y+30}" width="900" height="1" fill="${C.laiton}" opacity=".22"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="La carte des packs, un numéro et un prix par ligne" preserveAspectRatio="xMidYMid slice">
${defs(id,t)}
<rect width="${W}" height="${H}" fill="url(#fond-${id})"/>
<rect width="${W}" height="${H}" fill="url(#halo-${id})" opacity=".5"/>
${eventail(600,940,760,17,t,.07)}
<rect x="96" y="80" width="${W-192}" height="${H-160}" fill="none" stroke="${t}" stroke-width="1.5" opacity=".38"/>
<text x="150" y="212" font-family="${SANS}" font-size="24" font-weight="600" letter-spacing="9" fill="${t}">LA CARTE</text>
<text x="150" y="312" font-family="${SERIF}" font-size="84" fill="${C.papier}">Un numéro.</text>
${rows}
${filets(150,838,340,3,14,t,.45)}
<text x="1050" y="866" text-anchor="end" font-family="${SANS}" font-size="26" fill="${C.craie}" opacity=".72">Prix affiché · rien à négocier</text>
${grain(id,W,H)}
</svg>`;
}

/* 2 — Le brief : trois lignes, dans une messagerie. */
function etapeBrief(){
  const W=1200,H=900,id='et2',t=C.corail;
  const bulles=[['Je vends','des pâtes fraîches, le soir'],['Je parle à','mon quartier'],['Mon compte','@trattoria.mezzanotte']];
  let b='';
  bulles.forEach((x,i)=>{
    const y=300+i*168;
    b+=`<rect x="150" y="${y}" width="${760-i*40}" height="124" rx="6" fill="${C.ardoise}" stroke="${t}" stroke-width="1" stroke-opacity=".34"/>`
     + `<text x="188" y="${y+50}" font-family="${SANS}" font-size="24" font-weight="600" letter-spacing="5" fill="${t}" opacity=".9">${esc(x[0].toUpperCase())}</text>`
     + `<text x="188" y="${y+98}" font-family="${SERIF}" font-size="44" fill="${C.papier}">${esc(x[1])}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Trois lignes de brief envoyées en message" preserveAspectRatio="xMidYMid slice">
${defs(id,t)}
<rect width="${W}" height="${H}" fill="url(#fond-${id})"/>
<rect width="${W}" height="${H}" fill="url(#halo-${id})" opacity=".42"/>
${eventail(980,960,620,13,t,.06)}
<text x="150" y="196" font-family="${SANS}" font-size="24" font-weight="600" letter-spacing="9" fill="${t}">VOTRE BRIEF</text>
${b}
<circle cx="1010" cy="806" r="46" fill="${t}" opacity=".92"/>
<path d="M990 806 h38 M1014 792 l14 14 -14 14" stroke="${C.encre}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<text x="940" y="816" text-anchor="end" font-family="${SANS}" font-size="26" fill="${C.craie}" opacity=".72">Trois lignes suffisent</text>
${grain(id,W,H)}
</svg>`;
}

/* 3 — La publication : la grille du compte, un fichier posé dedans. */
function etapePublie(){
  const W=1200,H=900,id='et3',t=C.laiton;
  let g='';
  for(let r=0;r<3;r++) for(let c=0;c<3;c++){
    const x=634+c*152, y=244+r*152, neuf=(r===0&&c===1);
    g+=`<rect x="${x}" y="${y}" width="136" height="136" fill="${neuf?t:C.ardoise}" opacity="${neuf?.92:.7}"/>`;
    if(!neuf) g+=`<rect x="${x+26}" y="${y+86}" width="84" height="6" fill="${C.craie}" opacity=".24"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Le fichier publié dans la grille du compte" preserveAspectRatio="xMidYMid slice">
${defs(id,t)}
<rect width="${W}" height="${H}" fill="url(#fond-${id})"/>
<rect width="${W}" height="${H}" fill="url(#halo-${id})" opacity=".46"/>
${eventail(260,930,680,15,t,.07)}
<text x="130" y="196" font-family="${SANS}" font-size="24" font-weight="600" letter-spacing="9" fill="${t}">EN LIGNE</text>
<text x="130" y="330" font-family="${SERIF}" font-size="92" fill="${C.papier}">48</text>
<text x="130" y="404" font-family="${SERIF}" font-size="52" font-style="italic" fill="${t}">heures</text>
${filets(130,470,300,3,16,t,.5)}
<text x="130" y="600" font-family="${SANS}" font-size="26" fill="${C.craie}" opacity=".78">Vous collez.</text>
<text x="130" y="646" font-family="${SANS}" font-size="26" fill="${C.craie}" opacity=".78">Vous publiez.</text>
<rect x="598" y="184" width="544" height="580" fill="none" stroke="${t}" stroke-width="1.5" opacity="
.34"/>
${g}
${grain(id,W,H)}
</svg>`;
}

function accueil(){
  const W=1672, H=941, id='accueil';
  const sol = 660;                                   /* ligne de chaussée */
  /* Palmier géométrique : tronc incurvé et palmes en éventail. */
  const palmier = (x, y, h, ech, op) => {
    let d = `<path d="M${x} ${y} q${-8*ech} ${-h*0.5} ${4*ech} ${-h}" stroke="#05040A" stroke-width="${5*ech}" fill="none" opacity="${op}"/>`;
    for(let i=0;i<9;i++){
      const a = -Math.PI*0.06 - (Math.PI*0.88) * i/8;
      const lx = x + 4*ech + Math.cos(a)*78*ech, ly = y - h + Math.sin(a)*52*ech;
      d += `<path d="M${x+4*ech} ${y-h} Q${(x+4*ech+lx)/2} ${(y-h+ly)/2 - 26*ech} ${lx} ${ly}"
        stroke="#05040A" stroke-width="${3.4*ech}" fill="none" opacity="${op}"/>`;
    }
    return d;
  };
  /* Fenêtre éclairée de la façade. */
  const fen = (x,y,w,h,o) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#F2C98A" opacity="${o}"/>`;
  let fenetres = '';
  for(let e=0;e<4;e++) for(let c=0;c<7;c++){
    const o = 0.14 + ((e*7+c)%5)*0.11;
    fenetres += fen(1012 + c*62, 250 + e*86, 40, 54, o.toFixed(2));
  }
  let refl = '';
  for(let i=0;i<26;i++){
    const x = 40 + i*64, w = 10 + (i%4)*16;
    refl += `<rect x="${x}" y="${sol + 18 + (i%5)*22}" width="${w}" height="2.5"
      fill="${i%3===0?C.rose:(i%3===1?C.cyan:C.laiton)}" opacity="${(0.05+(i%4)*0.035).toFixed(3)}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
    role="img" aria-label="Composition Ocean Drive après minuit : façade art déco, néons, palmiers">
<defs>
  <linearGradient id="ciel-${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0A0714"/><stop offset=".46" stop-color="#1A1030"/>
    <stop offset=".72" stop-color="#3A1740"/><stop offset="1" stop-color="#6B2440"/>
  </linearGradient>
  <linearGradient id="sol-${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#150D22"/><stop offset="1" stop-color="#07050E"/>
  </linearGradient>
  <radialGradient id="lune-${id}" cx="20%" cy="18%" r="34%">
    <stop offset="0" stop-color="${C.cyan}" stop-opacity=".22"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="neon-${id}" cx="62%" cy="34%" r="46%">
    <stop offset="0" stop-color="${C.rose}" stop-opacity=".34"/><stop offset="1" stop-color="${C.rose}" stop-opacity="0"/>
  </radialGradient>
  <filter id="flou-${id}"><feGaussianBlur stdDeviation="16"/></filter>
  <filter id="grain-${id}"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope=".05"/></feComponentTransfer></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#ciel-${id})"/>
<rect width="${W}" height="${H}" fill="url(#lune-${id})"/>
<rect width="${W}" height="${H}" fill="url(#neon-${id})"/>

<!-- horizon de ville -->
<g opacity=".5">${Array.from({length:34},(_,i)=>{
  const x=i*52, h=16+((i*37)%46);
  return `<rect x="${x}" y="${sol-h-6}" width="34" height="${h}" fill="#0C0818"/>`;
}).join('')}</g>
<rect x="0" y="${sol-8}" width="${W}" height="3" fill="${C.cyan}" opacity=".13"/>

<!-- façade streamline : volume principal et rotonde -->
<path d="M980 ${sol} L980 190 Q980 132 1046 132 L1560 132 Q1620 132 1620 190 L1620 ${sol} Z" fill="#141020"/>
<path d="M980 ${sol} L980 190 Q980 132 1046 132 L1140 132 L1140 ${sol} Z" fill="#191426"/>
${fenetres}
<!-- marquise néon : trois arcs -->
<path d="M968 208 Q968 120 1058 120 L1566 120" stroke="${C.rose}" stroke-width="7" fill="none" opacity=".85" filter="url(#flou-${id})"/>
<path d="M968 208 Q968 120 1058 120 L1566 120" stroke="#FFC7DF" stroke-width="2.4" fill="none" opacity=".95"/>
<path d="M974 236 Q974 150 1060 150 L1566 150" stroke="${C.cyan}" stroke-width="5" fill="none" opacity=".5" filter="url(#flou-${id})"/>
<path d="M974 236 Q974 150 1060 150 L1566 150" stroke="#BFF3FF" stroke-width="1.6" fill="none" opacity=".8"/>
<path d="M980 470 L1620 470" stroke="${C.laiton}" stroke-width="3" opacity=".62"/>
<path d="M980 486 L1620 486" stroke="${C.laiton}" stroke-width="1.4" opacity=".34"/>
<!-- auvent du rez-de-chaussée -->
<path d="M962 500 L1620 500 L1620 520 L962 520 Z" fill="#1E1730"/>
<path d="M962 520 L1620 520" stroke="${C.laiton}" stroke-width="2" opacity=".5"/>
<g opacity=".9">${Array.from({length:9},(_,i)=>fen(1008+i*66, 540, 44, 96, (0.2+(i%4)*0.13).toFixed(2))).join('')}</g>
<!-- colonnes -->
${Array.from({length:8},(_,i)=>`<rect x="${992+i*78}" y="520" width="9" height="${sol-520}" fill="#0B0814" opacity=".85"/>`).join('')}

<!-- chaussée mouillée -->
<rect x="0" y="${sol}" width="${W}" height="${H-sol}" fill="url(#sol-${id})"/>
${refl}
<!-- reflet vertical de la marquise -->
<path d="M1100 ${sol} L1092 ${H}" stroke="${C.rose}" stroke-width="16" opacity=".1" filter="url(#flou-${id})"/>
<path d="M1300 ${sol} L1312 ${H}" stroke="${C.cyan}" stroke-width="12" opacity=".07" filter="url(#flou-${id})"/>

<!-- palmiers -->
${palmier(232, sol+8, 300, 1.25, .96)}
${palmier(430, sol+2, 238, 1.0, .9)}
${palmier(806, sol+6, 272, 1.12, .93)}
${palmier(1592, sol+10, 320, 1.3, .96)}

<!-- lampadaires art déco -->
${[120, 560, 900].map(x=>`<g opacity=".8">
  <rect x="${x}" y="${sol-176}" width="4" height="176" fill="#0B0814"/>
  <circle cx="${x+2}" cy="${sol-182}" r="9" fill="${C.laiton}" opacity=".8"/>
  <circle cx="${x+2}" cy="${sol-182}" r="24" fill="${C.laiton}" opacity=".14" filter="url(#flou-${id})"/>
</g>`).join('')}

<rect width="${W}" height="${H}" filter="url(#grain-${id})" opacity=".6"/>
</svg>`;
}

/* ─── Contenu : trois commerces fictifs ────────────────────────────────── */


/* ══════════════════════════════════════════════════════════════════════════
   SÉRIE RESTAURANT — Trattoria Mezzanotte (enseigne fictive)

   Reproche mesuré sur la version précédente : les compositions étaient
   principalement typographiques. La photographie servait de fond sous un voile,
   et le sujet réel — le plat, la carte, les horaires — passait derrière du
   texte décoratif.

   Ici le sujet est le sujet. Le plat occupe le cadre. La carte se lit comme
   une carte. La réservation donne une heure et un moyen de joindre.

   La marque qui signe est celle du RESTAURANT, pas Aura : ces créations sont
   destinées à être publiées par le commerce. Aura est le studio qui les
   présente, et n'apparaît que dans la vitrine, autour de l'image.

   Palette propre à l'enseigne — terre cuite et crème — volontairement
   distincte du laiton de nuit d'Aura.
   ══════════════════════════════════════════════════════════════════════════ */
const RESTO = {
  terre:'#B5472A', terreFonce:'#7A2E18', creme:'#F4EADB', cremeOmbre:'#E4D5BF',
  olive:'#5E6247', encre:'#231A15', nuit:'#140E0A'
};

/* Signature de l'enseigne : son nom, filets au-dessus et au-dessous. */
function enseigneResto(x, y, couleur, taille, ancrage){
  const l = taille * 7.2;
  return `<g>
    <rect x="${ancrage === 'middle' ? x - l/2 : x}" y="${y - taille - 16}" width="${l}" height="1.6" fill="${couleur}" opacity=".7"/>
    <text x="${x}" y="${y}" ${ancrage === 'middle' ? 'text-anchor="middle"' : ''} font-family="${SERIF}" font-size="${taille}" letter-spacing="${(taille*0.14).toFixed(1)}" fill="${couleur}">TRATTORIA</text>
    <text x="${x}" y="${y + taille*0.95}" ${ancrage === 'middle' ? 'text-anchor="middle"' : ''} font-family="${SERIF}" font-size="${taille*0.86}" font-style="italic" letter-spacing="${(taille*0.06).toFixed(1)}" fill="${couleur}">Mezzanotte</text>
    <rect x="${ancrage === 'middle' ? x - l/2 : x}" y="${y + taille*1.35}" width="${l}" height="1.6" fill="${couleur}" opacity=".7"/>
  </g>`;
}

/* Mention obligatoire : l'enseigne et les informations sont inventées. */
function mentionFictive(x, y, couleur, ancrage){
  return `<text x="${x}" y="${y}" ${ancrage ? 'text-anchor="' + ancrage + '"' : ''} font-family="${SANS}" font-size="17" letter-spacing="0.5" fill="${couleur}" opacity=".62">ENSEIGNE FICTIVE · CONCEPT DE DÉMONSTRATION</text>`;
}

/* 1 — LE PLAT. La photographie occupe le cadre ; le texte se retire en bas,
   sur une bande pleine, pour ne rien recouvrir du sujet. */
function restoPlat({id, photo}){
  const W=1080,H=1080, bande=272;
  if(!photo) return null;                    /* pas de photo, pas de publication */
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Assiette de cacio e pepe, publication de la Trattoria Mezzanotte">
<defs><linearGradient id="pl-${id}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${RESTO.nuit}" stop-opacity="0"/>
  <stop offset="1" stop-color="${RESTO.nuit}" stop-opacity=".55"/>
</linearGradient></defs>
<rect width="${W}" height="${H}" fill="${RESTO.nuit}"/>
<image href="${photo}" x="0" y="0" width="${W}" height="${H - bande}" preserveAspectRatio="xMidYMid slice"/>
<rect x="0" y="${H - bande - 180}" width="${W}" height="180" fill="url(#pl-${id})"/>
<rect x="0" y="${H - bande}" width="${W}" height="${bande}" fill="${RESTO.creme}"/>
<rect x="0" y="${H - bande}" width="${W}" height="5" fill="${RESTO.terre}"/>
<text x="64" y="${H - bande + 88}" font-family="${SERIF}" font-size="74" fill="${RESTO.encre}">Cacio e pepe</text>
<text x="64" y="${H - bande + 136}" font-family="${SANS}" font-size="27" fill="${RESTO.olive}">Pecorino, poivre noir, pâtes fraîches du matin.</text>
<text x="${W-64}" y="${H - bande + 88}" text-anchor="end" font-family="${SERIF}" font-size="66" fill="${RESTO.terre}">14 €</text>
${enseigneResto(64, H - 62, RESTO.terreFonce, 21)}
${mentionFictive(W-64, H-34, RESTO.encre, 'end')}
</svg>`;
}

/* 2 — LA CARTE. Fond clair : après quatre sections sombres, la carte respire
   et se lit comme une vraie carte. Le plat revient en bandeau, en rappel. */
function restoCarte({id, photo}){
  const W=1080,H=1080, bandeau=264;
  const plats = [
    ['Antipasti della casa', 'Charcuterie, olives, focaccia', '9 €'],
    ['Cacio e pepe',         'Pâtes fraîches, pecorino romano', '14 €'],
    ['Ossobuco, polenta',    'Mijoté trois heures',             '19 €'],
    ['Tiramisu maison',      'Mascarpone, café ristretto',      '7 €']
  ];
  let lignes = '';
  plats.forEach((x, i) => {
    const y = bandeau + 180 + i*126;
    lignes += `<text x="64" y="${y}" font-family="${SERIF}" font-size="46" fill="${RESTO.encre}">${esc(x[0])}</text>`
            + `<text x="64" y="${y+36}" font-family="${SANS}" font-size="24" fill="${RESTO.olive}">${esc(x[1])}</text>`
            + `<text x="${W-64}" y="${y}" text-anchor="end" font-family="${SERIF}" font-size="46" fill="${RESTO.terre}">${esc(x[2])}</text>`
            + `<rect x="64" y="${y+58}" width="${W-128}" height="1" fill="${RESTO.cremeOmbre}"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="La carte du soir de la Trattoria Mezzanotte, quatre plats et leurs prix">
<rect width="${W}" height="${H}" fill="${RESTO.creme}"/>
${photo ? `<image href="${photo}" x="0" y="0" width="${W}" height="${bandeau}" preserveAspectRatio="xMidYMid slice"/>` : ''}
<rect x="0" y="${bandeau-5}" width="${W}" height="5" fill="${RESTO.terre}"/>
<text x="64" y="${bandeau + 96}" font-family="${SANS}" font-size="23" font-weight="600" letter-spacing="9" fill="${RESTO.terre}">LA CARTE DU SOIR</text>
${lignes}
<text x="64" y="${H - 136}" font-family="${SANS}" font-size="26" fill="${RESTO.encre}">Service de 19 h à 23 h · sur place et à emporter</text>
${enseigneResto(64, H - 64, RESTO.terreFonce, 21)}
${mentionFictive(W-64, H-34, RESTO.encre, 'end')}
</svg>`;
}

/* 3 — LA RÉSERVATION. L'information utile est le sujet : le jour, l'heure, le
   moyen de joindre. Photo à gauche, panneau d'information à droite. */
function restoReservation({id, photo}){
  const W=1080,H=1080, colonne=440;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Réservation à la Trattoria Mezzanotte, horaires et contact">
<rect width="${W}" height="${H}" fill="${RESTO.terre}"/>
${photo ? `<image href="${photo}" x="0" y="0" width="${colonne}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`
        : `<rect width="${colonne}" height="${H}" fill="${RESTO.terreFonce}"/>`}
<rect x="${colonne}" y="0" width="6" height="${H}" fill="${RESTO.creme}" opacity=".9"/>
<text x="${colonne+64}" y="128" font-family="${SANS}" font-size="23" font-weight="600" letter-spacing="9" fill="${RESTO.creme}" opacity=".85">RÉSERVATION</text>
<text x="${colonne+64}" y="266" font-family="${SERIF}" font-size="96" fill="${RESTO.creme}">Ce soir</text>
<text x="${colonne+64}" y="360" font-family="${SERIF}" font-size="62" font-style="italic" fill="${RESTO.cremeOmbre}">il reste</text>
<text x="${colonne+64}" y="516" font-family="${SERIF}" font-size="132" fill="${RESTO.creme}">4</text>
<text x="${colonne+190}" y="516" font-family="${SERIF}" font-size="62" font-style="italic" fill="${RESTO.cremeOmbre}">tables</text>
<rect x="${colonne+64}" y="574" width="180" height="2" fill="${RESTO.creme}" opacity=".6"/>
<text x="${colonne+64}" y="650" font-family="${SANS}" font-size="30" fill="${RESTO.creme}">Service 19 h à 23 h</text>
<text x="${colonne+64}" y="700" font-family="${SANS}" font-size="30" fill="${RESTO.creme}">Dernière commande 22 h 30</text>
<rect x="${colonne+64}" y="752" width="${W - colonne - 128}" height="104" fill="${RESTO.creme}"/>
<text x="${colonne + 64 + (W-colonne-128)/2}" y="818" text-anchor="middle" font-family="${SANS}" font-size="30" font-weight="700" letter-spacing="3" fill="${RESTO.terreFonce}">01 23 45 67 89</text>
<text x="${colonne+64}" y="912" font-family="${SANS}" font-size="25" fill="${RESTO.cremeOmbre}">Ou un message privé : réponse dans l’heure.</text>
${enseigneResto(colonne+64, H - 90, RESTO.creme, 21)}
${mentionFictive(colonne+64, H-34, RESTO.creme, null)}
</svg>`;
}

/* 4 — LA STORY 9:16. Photo en haut, information en bas : le pouce reste sur
   la moitié basse, c'est là que l'heure et le bouton doivent être. */
function restoStory({id, photo}){
  const W=1080,H=1920, hautPhoto=1060;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Story de la Trattoria Mezzanotte, ouvert ce soir">
<defs><linearGradient id="st-${id}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${RESTO.terreFonce}" stop-opacity="0"/>
  <stop offset="1" stop-color="${RESTO.terreFonce}" stop-opacity=".9"/>
</linearGradient></defs>
<rect width="${W}" height="${H}" fill="${RESTO.terreFonce}"/>
${photo ? `<image href="${photo}" x="0" y="0" width="${W}" height="${hautPhoto}" preserveAspectRatio="xMidYMid slice"/>` : ''}
<rect x="0" y="${hautPhoto-260}" width="${W}" height="260" fill="url(#st-${id})"/>
${enseigneResto(W/2, 148, RESTO.creme, 30, 'middle')}
<text x="${W/2}" y="${hautPhoto + 130}" text-anchor="middle" font-family="${SANS}" font-size="26" font-weight="600" letter-spacing="11" fill="${RESTO.cremeOmbre}">CE SOIR</text>
<text x="${W/2}" y="${hautPhoto + 300}" text-anchor="middle" font-family="${SERIF}" font-size="150" fill="${RESTO.creme}">Ouvert</text>
<text x="${W/2}" y="${hautPhoto + 410}" text-anchor="middle" font-family="${SERIF}" font-size="88" font-style="italic" fill="${RESTO.cremeOmbre}">19 h à 23 h</text>
<rect x="${W/2-110}" y="${hautPhoto + 466}" width="220" height="2" fill="${RESTO.creme}" opacity=".55"/>
<text x="${W/2}" y="${hautPhoto + 556}" text-anchor="middle" font-family="${SANS}" font-size="30" fill="${RESTO.creme}">Dernière commande à 22 h 30.</text>
<rect x="150" y="${hautPhoto + 640}" width="${W-300}" height="118" rx="59" fill="${RESTO.creme}"/>
<text x="${W/2}" y="${hautPhoto + 716}" text-anchor="middle" font-family="${SANS}" font-size="34" font-weight="700" letter-spacing="3" fill="${RESTO.terreFonce}">RÉSERVER</text>
${mentionFictive(W/2, H-58, RESTO.creme, 'middle')}
</svg>`;
}


const SERIES = [
  { id:'trattoria', secteur:'Restaurant italien', enseigne:'Trattoria Mezzanotte',
    teinte:C.corail, second:C.laiton, pack:2,
    resume:'Trois publications, une story et les textes pour une trattoria de quartier.',
    pieces:[
      {k:'post', f:restoPlat,        n:'Le plat',    photo:'trattoria-pates.webp', a:{}},
      {k:'post', f:restoCarte,       n:'La carte',   photo:'trattoria-pates.webp', a:{}},
      {k:'post', f:restoReservation, n:'Réserver',   photo:'trattoria-pates.webp', a:{}},
      {k:'story',f:restoStory,       n:'Story · ce soir', photo:'trattoria-pates.webp', a:{}}
    ],
    textes:['Cacio e pepe, trois ingrédients et zéro raccourci. Ce soir au menu.',
            'La carte du soir est en ligne. Antipasti, pâtes fraîches, ossobuco.',
            'Il reste des tables pour ce soir. Un message suffit.']},

  { id:'salon', secteur:'Salon de coiffure', enseigne:'Salon Néon',
    teinte:C.rose, second:C.violet, pack:3,
    resume:'Trois publications, une story et les textes pour un salon de coiffure.',
    pieces:[
      {k:'post', f:posteBloc,  n:'La coupe',     a:{second:C.violet, mot1:'Coupe', mot2:'nette.', sur:'NOUVELLE SAISON', bas:'Sur rendez-vous · du mardi au samedi'}},
      {k:'post', f:posteCarte, n:'Les tarifs',   a:{sur:'PRESTATIONS', titre:'Tarifs', pied:'Diagnostic offert avant chaque première visite',
          lignes:[['Coupe femme','38 €'],['Coupe homme','26 €'],['Couleur, racines','52 €'],['Balayage','89 €']]}},
      {k:'post', f:posteTypo,  n:'Rendez-vous',  a:{sur:'AGENDA', titre:'Jeudi', sousTitre:'11 h 30', bas:'Une place s’est libérée cette semaine.', badge:'LIBRE'}},
      {k:'story',f:story,      n:'Story · agenda', a:{sur:'CETTE SEMAINE', titre:'Deux', sousTitre:'places', bas:'Jeudi 11 h 30 et samedi 16 h.', action:'RÉSERVER'}}
    ],
    textes:['Deux places se sont libérées cette semaine. Jeudi 11 h 30, samedi 16 h.',
            'Les tarifs du salon, au clair. Diagnostic offert à la première visite.',
            'Nouvelle saison, coupe nette. Sur rendez-vous du mardi au samedi.']},

  { id:'boutique', secteur:'Boutique indépendante', enseigne:'Atelier Corail',
    teinte:C.cyan, second:C.rose, pack:4,
    resume:'Trois publications, une story et les textes pour une boutique indépendante.',
    pieces:[
      {k:'post', f:posteTypo,  n:'La collection', a:{sur:'NOUVELLE COLLECTION', titre:'Lin', sousTitre:'lavé', bas:'Douze pièces, une seule saison.', badge:'ARRIVÉ'}},
      {k:'post', f:posteBloc,  n:'Le détail',     a:{second:C.rose, mot1:'Le', mot2:'détail.', sur:'FABRICATION', bas:'Coutures apparentes, boutons de corozo'}},
      {k:'post', f:posteCarte, n:'La sélection',  a:{sur:'EN BOUTIQUE', titre:'Sélection', pied:'Boutique ouverte du mercredi au samedi, 11 h – 19 h',
          lignes:[['Chemise lin lavé','78 €'],['Pantalon droit','92 €'],['Veste non doublée','145 €'],['Foulard imprimé','34 €']]}},
      {k:'story',f:story,      n:'Story · arrivage', a:{sur:'ARRIVAGE', titre:'Douze', sousTitre:'pièces', bas:'En boutique dès mercredi.', action:'VOIR'}}
    ],
    textes:['Douze pièces en lin lavé, une seule saison. En boutique dès mercredi.',
            'Coutures apparentes, boutons de corozo. Le détail fait la pièce.',
            'La sélection de la semaine est en boutique, du mercredi au samedi.']}
];

/* Les couvertures se déduisent du catalogue au lieu de le recopier. Un prix ou
   un délai réécrit ici aurait fini par contredire la page sans que personne
   ne le voie : un visuel ment plus discrètement qu'une ligne de texte. */
const CATALOGUE = JSON.parse(fs.readFileSync(path.join(RACINE,'src','catalog.json'),'utf8'));
const TEINTES = {
  Essentiel:[C.rose,C.violet], Signature:[C.laiton,C.corail],
  Atelier:[C.cyan,C.violet],   Maison:[C.violet,C.rose],
  Street:[C.cyan,C.rose],      Night:[C.rose,C.violet],
  Heat:[C.corail,C.laiton],    House:[C.laiton,C.cyan]
};
const slug = n => 'c-' + n.toLowerCase();

const COUVERTURES = [].concat(
  CATALOGUE.brief.map(p => {
    const [teinte, second] = TEINTES[p.name];
    const vignettes = [
      ['PUBLICATION', p.visuals + ' visuels', 'format 1:1'],
      ['LÉGENDES',    p.texts + ' textes',    'prêts à coller'],
      p.bio ? ['PROFIL', 'bio réécrite', '+ ' + p.messages + ' messages']
            : ['MESSAGES', p.messages + ' réponses', 'clientèle']
    ];
    return {id:slug(p.name), nom:p.name, prix:p.price + ' €', teinte, second,
            ligne:'SUR BRIEF · ' + p.delay.toUpperCase(), vignettes};
  }),
  CATALOGUE.ready.map(r => {
    const [teinte, second] = TEINTES[r.name];
    const dispo = r.assets > 0;
    /* Une collection sans fichier ne doit pas annoncer son contenu comme
       livrable : la couverture dit ce qui est prévu, pas ce qui existe. */
    const vignettes = dispo
      ? [['PUBLICATION', r.visuals + ' visuels', 'format 1:1'],
         ['LÉGENDES',    r.texts + ' textes',    'prêts à coller'],
         r.bio ? ['PROFIL','bio incluse','+ légendes'] : ['USAGE','sans brief','prêt à publier']]
      : [['PRÉVU', r.visuals + ' visuels', 'non composés'],
         ['PRÉVU', r.texts + ' textes',    'non composés'],
         ['STATUT', 'en préparation',      'aucun fichier livrable']];
    return {id:slug(r.name), nom:r.name, prix:r.price + ' €', teinte, second,
            ligne:'COLLECTION · ' + (dispo ? 'DISPONIBLE' : 'EN PRÉPARATION'), vignettes};
  })
);

/* ─── Photographies importées ──────────────────────────────────────────────
   Certaines pièces sont de vraies photographies produites hors du dépôt puis
   déposées dans src/creations/photos/. Elles ne sont jamais écrites ni
   supprimées par ce script : il se contente de les recenser, de vérifier
   qu'elles existent et d'enregistrer leur empreinte.

   Une pièce déclarée ici mais dont le fichier est absent ne devient pas un
   emplacement vide présenté comme une création : la composition SVG reste
   affichée et le manifeste note la photo comme attendue. */
const PHOTOS = path.join(SORTIE, 'photos');
fs.mkdirSync(PHOTOS, {recursive:true});

const PHOTOS_ATTENDUES = [
  {piece:'trattoria-1', fichier:'trattoria-pates.webp', sujet:"Bol de cacio e pepe, lumière naturelle, ardoise sombre",
   format:'1:1', largeur:1080, hauteur:1080,
   source:'ElevenLabs · bytedance-seedream-5-pro', licence:"Générée pour ce projet, aucun élément tiers"}
];

function photosPresentes(){
  const crypto = require('crypto');
  return PHOTOS_ATTENDUES.map(p => {
    const chemin = path.join(PHOTOS, p.fichier);
    if(!fs.existsSync(chemin)) return Object.assign({}, p, {present:false});
    const buf = fs.readFileSync(chemin);
    return Object.assign({}, p, {
      present:true, octets:buf.length,
      sha256:crypto.createHash('sha256').update(buf).digest('hex')
    });
  });
}

/* ─── Écriture ─────────────────────────────────────────────────────────── */

/* Ce script ne supprime que les fichiers qu'il a lui-même écrits, recensés
   dans le manifeste précédent. Un rmSync du dossier entier détruisait tout
   asset déposé à la main — une exportation Canva, un fichier de collection —
   à la première régénération, sans avertissement. */
fs.mkdirSync(SORTIE, {recursive:true});
const CHEMIN_MANIFESTE = path.join(SORTIE, 'MANIFESTE.json');
if(fs.existsSync(CHEMIN_MANIFESTE)){
  const ancien = JSON.parse(fs.readFileSync(CHEMIN_MANIFESTE,'utf8'));
  const siens = []
    .concat((ancien.series||[]).flatMap(s => (s.pieces||[]).map(p => p.fichier)))
    .concat((ancien.couvertures||[]).map(c => c.fichier))
    .map(f => path.basename(f));
  let retires = 0;
  for(const f of siens){
    const p = path.join(SORTIE, f);
    if(fs.existsSync(p)){ fs.unlinkSync(p); retires++; }
  }
  const restants = fs.readdirSync(SORTIE).filter(f => f !== 'MANIFESTE.json');
  if(restants.length) console.log(`  ${restants.length} fichier(s) non générés par ce script, conservés : ${restants.join(', ')}`);
}

const manifeste = {
  _provenance: "Toutes ces compositions sont produites par scripts/build-creations.js. "
    + "Aucune image extérieure, aucune photographie, aucun élément sous licence tierce. "
    + "Les commerces cités sont fictifs : aucun client réel, aucun témoignage, aucun résultat annoncé.",
  genere: new Date().toISOString().slice(0,10),
  series: [], couvertures: []
};
const inline = {};

for(const s of SERIES){
  const pieces = [];
  s.pieces.forEach((p,i)=>{
    const id = s.id + '-' + (i+1);
    /* La photo n'est utilisée que si le fichier est réellement là. Sinon la
       composition SVG reste affichée : jamais d'emplacement vide présenté
       comme une création. */
    const dispo = p.photo && fs.existsSync(path.join(PHOTOS, p.photo));
    const svg = p.f(Object.assign({id, teinte:s.teinte,
      photo: dispo ? 'creations/photos/' + p.photo : null}, p.a));
    fs.writeFileSync(path.join(SORTIE, id + '.svg'), svg);
    inline[id] = svg;
    pieces.push({fichier:`creations/${id}.svg`, nom:p.n, format:p.k==='story'?'9:16':'1:1', type:p.k});
  });
  manifeste.series.push({id:s.id, secteur:s.secteur, enseigne:s.enseigne, fictif:true,
                         resume:s.resume, packSuggere:s.pack, pieces, textes:s.textes});
}
for(const c of COUVERTURES){
  const svg = couverture(c);
  fs.writeFileSync(path.join(SORTIE, c.id + '.svg'), svg);
  inline[c.id] = svg;
  manifeste.couvertures.push({fichier:`creations/${c.id}.svg`, nom:c.nom, prix:c.prix});
}

/* Scènes du protocole : une image par étape. */
const ETAPES = [['etape-1', etapeCarte], ['etape-2', etapeBrief], ['etape-3', etapePublie]];
manifeste.etapes = [];
for(const [id, f] of ETAPES){
  const svg = f();
  fs.writeFileSync(path.join(SORTIE, id + '.svg'), svg);
  inline[id] = svg;
  manifeste.etapes.push({fichier:`creations/${id}.svg`, role:'Scène du protocole'});
}

/* Collections réellement livrables : leurs visuels rejoignent la carte des
   compositions pour que la vitrine puisse les montrer. Ils sont écrits par
   scripts/build-collection.js ; s'ils ne sont pas là, il n'y a rien à montrer
   et rien n'est inventé. */
const DOSSIER_APERCUS = path.join(RACINE, 'src', 'apercus');
manifeste.collections = [];
if(fs.existsSync(DOSSIER_APERCUS)){
  for(const nom of fs.readdirSync(DOSSIER_APERCUS)){
    const vect = path.join(DOSSIER_APERCUS, nom);
    if(!fs.statSync(vect).isDirectory()) continue;
    const pieces = fs.readdirSync(vect).filter(f => f.endsWith('.svg')).sort();
    for(const f of pieces) inline[f.replace(/\.svg$/,'')] = fs.readFileSync(path.join(vect,f),'utf8');
    manifeste.collections.push({collection:nom, pieces:pieces.map(f=>f.replace(/\.svg$/,''))});
  }
}

/* Image d'accueil : remplace hero.webp, de provenance inconnue. */
const svgAccueil = accueil();
fs.writeFileSync(path.join(SORTIE, 'accueil.svg'), svgAccueil);
inline['accueil'] = svgAccueil;
manifeste.accueil = {
  fichier:'creations/accueil.svg', role:"Image d'ambiance de la page d'accueil",
  remplace:'hero.webp',
  raison:"La provenance et la licence de hero.webp n'ont jamais pu être établies : "
       + "ni le fichier ni sa version d'origine avant recompression ne portaient de "
       + "métadonnée, et aucun document du dépôt n'indiquait son origine.",
  provenance:'Composition écrite dans scripts/build-creations.js — aucune photographie, aucun élément tiers.'
};

/* Photographies : recensées, jamais écrites ni supprimées par ce script. */
const photos = photosPresentes();
manifeste.photos = photos.map(p => ({
  piece:p.piece, fichier:`creations/photos/${p.fichier}`, sujet:p.sujet,
  format:p.format, dimensions:`${p.largeur}×${p.hauteur}`,
  source:p.source, licence:p.licence,
  present:p.present, octets:p.octets || 0, sha256:p.sha256 || null
}));
const manquantes = photos.filter(p => !p.present);
if(manquantes.length){
  manifeste._photos_attendues = manquantes.length + " photographie(s) déclarée(s) mais absente(s) du dépôt : "
    + "la composition SVG reste affichée à leur place. Aucun emplacement vide n'est présenté comme une création.";
}

fs.writeFileSync(path.join(SORTIE, 'MANIFESTE.json'), JSON.stringify(manifeste, null, 2));

/* Injection en ligne dans la vitrine : un SVG en <img> n'hérite pas des
   polices de la page, en ligne il les hérite. */
const cible = path.join(RACINE, 'src', 'vitrine.html');
let html = fs.readFileSync(cible, 'utf8');
const DEB = '<!--CREATIONS:DEBUT-->', FIN = '<!--CREATIONS:FIN-->';
const bloc = DEB + '\n<script>var CREATIONS = '
  + JSON.stringify(inline)
  + ';\nvar SERIES_DEMO = ' + JSON.stringify(manifeste.series.map(s=>({
      id:s.id, secteur:s.secteur, enseigne:s.enseigne, resume:s.resume,
      packSuggere:s.packSuggere, pieces:s.pieces, textes:s.textes})))
  + ';\nvar COLLECTIONS = ' + JSON.stringify(manifeste.collections)
  + ';</script>\n' + FIN;

/* Le bloc doit précéder le script principal : celui-ci lit SERIES_DEMO dès
   l'initialisation. Injecté en fin de fichier, il arriverait trop tard et la
   galerie resterait vide, sans lever d'erreur. */
if(html.includes(DEB)){
  html = html.replace(new RegExp(DEB + '[\\s\\S]*?' + FIN), bloc);
} else {
  const i = html.indexOf('<script>');
  if(i < 0) throw new Error('aucun <script> trouvé dans src/vitrine.html');
  html = html.slice(0, i) + bloc + '\n' + html.slice(i);
}
fs.writeFileSync(cible, html);

const total = Object.values(inline).reduce((n,s)=>n+Buffer.byteLength(s),0);
console.log(`créations : ${Object.keys(inline).length} compositions, ${(total/1024).toFixed(1)} Ko`);
console.log(`  ${manifeste.series.length} séries de démonstration (${manifeste.series[0].pieces.length} pièces chacune)`);
console.log(`  ${manifeste.couvertures.length} couvertures de packs`);
console.log(`  manifeste : src/creations/MANIFESTE.json`);
