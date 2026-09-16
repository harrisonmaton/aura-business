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

function posteTypo({id, teinte, sur, titre, sousTitre, bas, badge}){
  const W=1080,H=1080;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(sur)} — ${esc(titre)}">
${defs(id, teinte)}
<rect width="${W}" height="${H}" fill="url(#fond-${id})"/>
<rect width="${W}" height="${H}" fill="url(#halo-${id})"/>
${eventail(540, 1080, 900, 17, teinte, .13)}
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
<text x="540" y="880" text-anchor="middle" font-family="${SANS}" font-size="32" letter-spacing="4" fill="${C.craie}">${esc(bas)}</text>
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
<text x="540" y="1627" text-anchor="middle" font-family="${SANS}" font-size="36" font-weight="700" letter-spacing="4" fill="${C.encre}">${esc(action)}</text>
<text x="540" y="1790" text-anchor="middle" font-family="${SANS}" font-size="26" letter-spacing="6" fill="${C.craie}" opacity=".7">CONCEPT DE DÉMONSTRATION</text>
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
<text x="64" y="192" font-family="${SANS}" font-size="24" letter-spacing="6" fill="${teinte}">${esc(ligne)}</text>
${tuiles}
<rect x="64" y="1032" width="${W-128}" height="1.5" fill="${C.laiton}" opacity=".5"/>
<text x="64" y="1122" font-family="${SERIF}" font-size="80" fill="${C.laiton}">${esc(prix)}</text>
${grain(id,W,H)}
</svg>`;
}

/* ─── Contenu : trois commerces fictifs ────────────────────────────────── */

const SERIES = [
  { id:'trattoria', secteur:'Restaurant italien', enseigne:'Trattoria Mezzanotte',
    teinte:C.corail, second:C.laiton, pack:2,
    resume:'Trois publications, une story et les textes pour une trattoria de quartier.',
    pieces:[
      {k:'post', f:posteTypo,  n:'Les pâtes',    a:{sur:'FAIT MAISON', titre:'Cacio', sousTitre:'e pepe', bas:'Pâtes fraîches tous les matins.', badge:'CE SOIR'}},
      {k:'post', f:posteCarte, n:'La carte',     a:{sur:'LA CARTE', titre:'Ce soir', pied:'Service de 19 h à 23 h · sur place et à emporter',
          lignes:[['Antipasti della casa','9 €'],['Cacio e pepe','14 €'],['Ossobuco, polenta','19 €'],['Tiramisu maison','7 €']]}},
      {k:'post', f:posteBloc,  n:'Réserver',     a:{second:C.laiton, mot1:'Une', mot2:'table ?', sur:'RÉSERVATION', bas:'Message privé · réponse dans l’heure'}},
      {k:'story',f:story,      n:'Story · ce soir', a:{sur:'CE SOIR', titre:'Ouvert', sousTitre:'19 h – 23 h', bas:'Dernière commande à 22 h 30.', action:'RÉSERVER'}}
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

const COUVERTURES = [
  {id:'c-essentiel', nom:'Essentiel', prix:'50 €', teinte:C.rose,   second:C.violet, ligne:'SUR BRIEF · 24–48 H',
   vignettes:[['PUBLICATION','8 visuels','format 1:1'],['LÉGENDES','8 textes','prêts à coller'],['MESSAGES','4 réponses','clientèle']]},
  {id:'c-signature', nom:'Signature', prix:'90 €', teinte:C.laiton, second:C.corail, ligne:'SUR BRIEF · 48 H',
   vignettes:[['PUBLICATION','12 visuels','format 1:1'],['LÉGENDES','12 textes','prêts à coller'],['PROFIL','bio réécrite','+ 6 messages']]},
  {id:'c-atelier',   nom:'Atelier',   prix:'150 €',teinte:C.cyan,   second:C.violet, ligne:'SUR BRIEF · 48–72 H',
   vignettes:[['PUBLICATION','18 visuels','un mois'],['LÉGENDES','18 textes','prêts à coller'],['PROFIL','bio réécrite','+ 10 messages']]},
  {id:'c-maison',    nom:'Maison',    prix:'250 €',teinte:C.violet, second:C.rose,   ligne:'SUR BRIEF · 72 H',
   vignettes:[['PUBLICATION','24 visuels','un mois'],['STORIES','séquences','9:16'],['PROFIL','bio réécrite','+ 12 messages']]},
  {id:'c-street',    nom:'Street',    prix:'40 €', teinte:C.cyan,   second:C.rose,   ligne:'COLLECTION · EN PRÉPARATION',
   vignettes:[['PUBLICATION','4 visuels','format 1:1'],['LÉGENDES','4 textes','prêts à coller'],['USAGE','sans brief','à composer']]},
  {id:'c-night',     nom:'Night',     prix:'80 €', teinte:C.rose,   second:C.violet, ligne:'COLLECTION · EN PRÉPARATION',
   vignettes:[['PUBLICATION','8 visuels','format 1:1'],['LÉGENDES','8 textes','prêts à coller'],['USAGE','sans brief','à composer']]},
  {id:'c-heat',      nom:'Heat',      prix:'120 €',teinte:C.corail, second:C.laiton, ligne:'COLLECTION · EN PRÉPARATION',
   vignettes:[['PUBLICATION','12 visuels','format 1:1'],['LÉGENDES','12 textes','prêts à coller'],['USAGE','sans brief','à composer']]},
  {id:'c-house',     nom:'House',     prix:'200 €',teinte:C.laiton, second:C.cyan,   ligne:'COLLECTION · EN PRÉPARATION',
   vignettes:[['PUBLICATION','20 visuels','format 1:1'],['PROFIL','bio incluse','+ légendes'],['USAGE','sans brief','à composer']]}
];

/* ─── Écriture ─────────────────────────────────────────────────────────── */

fs.rmSync(SORTIE, {recursive:true, force:true});
fs.mkdirSync(SORTIE, {recursive:true});

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
    const svg = p.f(Object.assign({id, teinte:s.teinte}, p.a));
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
