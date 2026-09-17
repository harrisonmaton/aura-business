const { chromium } = require('playwright');
const CAT=JSON.parse(require('fs').readFileSync(__dirname+'/../src/catalog.json','utf8'));
const CREA=JSON.parse(require('fs').readFileSync(__dirname+'/../src/creations/MANIFESTE.json','utf8'));
const V='file://'+__dirname+'/../preview/vitrine.html', O='file://'+__dirname+'/../preview/back-office.html';
const R=[]; const ck=(n,c,x)=>R.push((c?'PASS ':'ÉCHEC')+' — '+n+(x!==undefined?'  ['+x+']':''));
/* Une erreur de navigation avalée transforme un fichier manquant en timeout
   de clic 30 s plus tard, illisible. Elle doit tuer la recette tout de suite. */
const aller = async (page, url) => {
  const r = await page.goto(url, {timeout:20000});
  if(r && !r.ok() && r.status() !== 0) throw new Error('navigation ' + r.status() + ' sur ' + url);
  return r;
};
(async()=>{
/* Cette recette vérifie la COUCHE HTML : composition à plat, prix, commande,
   clavier, mobile. Le showroom 3D se superpose à elle et capte les clics quand
   il tourne ; il a sa propre recette (tests/showroom.js), qui vérifie aussi
   que son absence ne retire rien. On démarre donc sans WebGL, pour mesurer le
   repli — c'est ce que verra tout visiteur sans carte graphique. */
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
   args:['--disable-gpu','--disable-webgl']}); const errs=[];
 const c=await b.newContext({viewport:{width:1440,height:900},locale:'fr-FR'});
 await c.route('**://ig.me/**',r=>r.abort());
 const p=await c.newPage();
 p.on('pageerror',e=>errs.push('JS: '+e.message));
 /* Plus d'exemption pour fonts.googleapis : les polices sont auto-hébergées.
    Si quelqu'un réintroduit un appel tiers, la recette doit le voir. */
 p.on('console',m=>{if(m.type()==='error'&&!/ERR_TUNNEL/.test(m.text()))errs.push('CONSOLE: '+m.text());});
 const tiers=[];
 p.on('request',r=>{const u=r.url();if(!/^(file:|data:|blob:)/.test(u))tiers.push(u);});
 await aller(p, V); await p.waitForTimeout(1200);

 /* hero.webp est retiré : l'image d'accueil est une composition du dépôt,
    dont la provenance est documentée dans le manifeste. */
 /* Deux formes acceptées, une seule exigence : l'image vient du dépôt et son
    script de fabrication est nommé. Composition en ligne (créations) ou
    fichier construit (scènes) — dans les deux cas l'adresse doit être
    relative, donc servie avec la page, jamais chargée d'un tiers. */
 ck('image d\'accueil : composition du dépôt, pas hero.webp', await p.evaluate(()=>{
   const c=document.getElementById('cinema-image');
   if(!c || !c.dataset.provenance) return false;
   if(!/^scripts\/build-[a-z]+\.js$/.test(c.dataset.provenance)) return false;
   if(c.querySelector('svg')) return true;
   const img=c.querySelector('img');
   const src=img && img.getAttribute('src');
   return !!src && !/^(https?:)?\/\//.test(src) && /^scenes\//.test(src);
 }));
 /* Ce qui compte n'est pas la mention du nom dans un commentaire d'historique,
    mais qu'aucun élément ni aucune règle CSS ne charge encore ce fichier. */
 ck('aucun chargement résiduel de hero.webp', await p.evaluate(()=>{
   const attr=[...document.querySelectorAll('[src],[href],[data-src]')]
     .some(e=>/hero\.webp/.test(e.getAttribute('src')||e.getAttribute('href')||e.getAttribute('data-src')||''));
   const css=[...document.querySelectorAll('*')]
     .some(e=>/hero\.webp/.test(getComputedStyle(e).backgroundImage||''));
   return !attr && !css;
 }));
 /* Les quatre collections sont toujours présentées, mais plus sous la même
    forme : celle qui a ses fichiers devient une fiche produit, les autres
    restent des lignes d'annonce. Le total, lui, ne bouge pas. */
 const presentation = await p.evaluate(()=>({
   fiches: document.querySelectorAll('.collection-fiche').length,
   annonces: document.querySelectorAll('.ready-row.is-soon').length
 }));
 ck('contenu complet rendu',
    await p.locator('.menu-row').count()===3
    && presentation.fiches + presentation.annonces === 4
    && await p.locator('.qa-item').count()===5,
    presentation.fiches + ' fiche(s) livrable(s) · ' + presentation.annonces + ' annonce(s)');
 ck('lien d\'évitement présent (a11y)', await p.locator('.skip-link').count()===1);
 /* Une couverture n'est pas un pack livré. Tant qu'une collection n'a aucun
    fichier, elle n'a droit à aucune vignette : une belle image posée là se lit
    comme un produit prêt. Le contrôle vérifie donc les DEUX sens — vignette
    réellement peinte pour ce qui est livrable, aucune vignette pour le reste.
    L'angle mort de la recette précédente était l'inverse : elle exigeait quatre
    vignettes, y compris pour des collections vides. */
 /* Une couverture n'est pas un pack livré. Une collection livrable montre ses
    VRAIS fichiers — un aperçu par visuel promis, réellement peint ; une
    collection sans fichier ne montre aucune image du tout. */
 const livrablesCat = CAT.ready.filter(r=>r.assets>0);
 const vignettes = await p.evaluate(()=>{
   const peint = e=>{ const s=e.querySelector('svg'); return !!s && s.getBoundingClientRect().width>60; };
   return {
     fiches: [...document.querySelectorAll('.collection-fiche')].map(f=>({
       vues: [...f.querySelectorAll('.col-vue')].length,
       peintes: [...f.querySelectorAll('.col-vue')].filter(peint).length,
       commande: !!f.querySelector('[data-ready]')
     })),
     imagesChezSoon: document.querySelectorAll('.ready-row.is-soon svg, .ready-row.is-soon img').length
   };
 });
 ck('Déjà prêt : la collection livrable montre ses vrais fichiers',
    vignettes.fiches.length === livrablesCat.length
    && vignettes.fiches.every((f,i)=>f.peintes === f.vues
         && f.vues === livrablesCat[i].visuals && f.commande),
    JSON.stringify(vignettes.fiches) + ' attendu ' + livrablesCat.map(r=>r.visuals));
 ck('Déjà prêt : aucune image pour une collection sans fichier',
    vignettes.imagesChezSoon === 0, vignettes.imagesChezSoon + ' image(s)');
 /* Le contenu annoncé doit venir du catalogue, pas d'une saisie décorative. */
 ck('Déjà prêt : le contenu annoncé vient du catalogue', await p.evaluate(()=>{
   const l = [...document.querySelectorAll('.ready-row.is-soon .rt span')].map(e=>e.textContent.trim());
   return l.length>0 && l.every(x=>/\d+\s*\S+\s*·\s*\d+/.test(x));
 }), (await p.textContent('.ready-row.is-soon .rt span')||'').trim());
 /* Photographies importées : le fichier doit être réellement chargé et peint,
    pas simplement déclaré. Une balise <image> pointant vers un fichier absent
    donne un cadre vide qu'on pourrait prendre pour une création. */
 const CHEMIN_PHOTOS = require('path').join(__dirname,'..','src','creations','photos');
 const photosDeclarees = (CREA.photos||[]).filter(x=>x.present);
 ck('photographies déclarées présentes sur disque',
    photosDeclarees.every(x=>require('fs').existsSync(
      require('path').join(CHEMIN_PHOTOS, x.fichier.split('/').pop()))),
    photosDeclarees.length + ' photo(s)');
 ck('photographies réellement peintes dans la page', await p.evaluate(()=>{
   const imgs=[...document.querySelectorAll('svg image')];
   if(!imgs.length) return true;           /* aucune photo déclarée : rien à vérifier */
   return imgs.every(i=>{ const r=i.getBoundingClientRect(); return r.width>20 && r.height>20; });
 }), (await p.locator('svg image').count()) + ' balise(s) <image>');

 /* La page ne doit dépendre d'aucun tiers : polices comprises, elle doit
    s'afficher entière hors ligne. */
 ck('aucune requête vers un tiers', tiers.length===0, tiers.length?tiers.join(' '):'0');
 ck('polices auto-hébergées réellement chargées', await p.evaluate(async()=>{
   await document.fonts.ready;
   const f=[...document.fonts].filter(x=>x.status==='loaded').map(x=>x.family);
   return f.includes('Archivo') && f.includes('Bodoni Moda');
 }));
 /* Assets manquants : une collection sans fichier livrable ne doit être ni
    commandable, ni annoncée en livraison immédiate. Sinon le site encaisse
    pour un fichier qui n'existe pas. */
 const sansFichier = CAT.ready.filter(r=>!(r.assets>0)).map(r=>r.id);
 const etatReady = Object.assign({sansFichier}, await p.evaluate(()=>({
   commandables: [...document.querySelectorAll('[data-ready]')].map(e=>Number(e.getAttribute('data-ready'))),
   boutonsCommande : [...document.querySelectorAll('#ready [data-ready]')]
                       .filter(e=>e.tagName==='BUTTON' && !e.disabled).length,
   boutonsChezSoon : document.querySelectorAll('.ready-row.is-soon button, .ready-row.is-soon [data-ready]').length,
   texte       : document.getElementById('ready').textContent,
   etatHint    : document.getElementById('ready-hint').getAttribute('data-state'),
   etatLede    : document.getElementById('ready-lede').getAttribute('data-state')
 })));
 ck('collection sans fichier : aucun chemin de commande',
    etatReady.sansFichier.every(id=>!etatReady.commandables.includes(id)),
    'sans fichier ['+etatReady.sansFichier+'] commandables ['+etatReady.commandables+']');
 /* Le chemin d'achat est un bouton, et il n'en existe qu'autant que de
    collections réellement livrables. Une ligne d'annonce n'en porte aucun. */
 ck('collection sans fichier : pas de bouton cliquable',
    etatReady.boutonsCommande === CAT.ready.length - etatReady.sansFichier.length
    && etatReady.boutonsChezSoon === 0,
    etatReady.boutonsCommande + ' bouton(s) de commande · ' + etatReady.boutonsChezSoon + ' chez les non livrables');
 /* Deux angles : l'état déclaré de la section, et l'absence de la formule
    commerciale. Le premier tient quelle que soit la langue ou la rédaction. */
 const attendu = etatReady.sansFichier.length===CAT.ready.length ? 'soon' : 'available';
 ck('section annoncée dans l\'état correspondant au catalogue',
    etatReady.etatHint===attendu && etatReady.etatLede===attendu,
    etatReady.etatHint+'/'+etatReady.etatLede+' attendu '+attendu);
 ck('aucune promesse de livraison immédiate sans fichier',
    attendu==='available' ||
    !/livraison directe|entrega directa|consegna diretta|direct delivery|fichier part|file ships|archivo sale|file parte/i.test(etatReady.texte));
 ck('état « en préparation » affiché au visiteur',
    (await p.locator('.ready-row.is-soon').count())===etatReady.sansFichier.length);
 /* ── Par secteur ──────────────────────────────────────────────────────────
    La bande la plus tentante à mal écrire du site : montrer cinq belles
    images de commerces et laisser croire que ce sont des clients. Aucun
    commerce n'a encore été livré. Ces contrôles ne vérifient pas seulement
    qu'un avertissement existe — ils vérifient qu'il est VISIBLE, et qu'aucune
    formulation de preuve sociale n'apparaît dans la bande. */
 const secteurs = await p.evaluate(()=>{
   const b=document.getElementById('secteurs');
   if(!b || b.hidden) return {absente:true};
   const cartes=[...b.querySelectorAll('.secteur')];
   const note=b.querySelector('.secteurs-note');
   const etiquette=b.querySelector('.band-head .label');
   const visible=e=>{const r=e.getBoundingClientRect();
     return r.width>0 && r.height>0 && getComputedStyle(e).visibility!=='hidden'
            && parseFloat(getComputedStyle(e).opacity)>0;};
   return {
     cartes: cartes.length,
     adossees: cartes.filter(c=>{
       const i=c.querySelector('img');
       return i && /^scenes\//.test(i.getAttribute('src')||'');
     }).length,
     noteVisible: !!(note && note.textContent.trim() && visible(note)),
     etiquette: etiquette ? etiquette.textContent.trim() : '',
     texte: b.textContent
   };
 });
 ck('par secteur : cinq études, chacune adossée à une scène du dépôt',
    !secteurs.absente && secteurs.cartes===5 && secteurs.adossees===5,
    secteurs.absente ? 'bande absente' : secteurs.adossees+'/'+secteurs.cartes+' adossée(s)');
 ck('par secteur : l\'avertissement « aucun client réel » est affiché, pas seulement présent',
    !secteurs.absente && secteurs.noteVisible
    && /aucun client réel|no real client|ningún cliente real|nessun cliente reale/i.test(secteurs.etiquette),
    secteurs.etiquette || '(aucune étiquette)');
 /* Un chiffre de clients, une note sur cinq, un témoignage : autant de preuves
    qu'on ne peut pas produire. Aucun ne doit apparaître ici. */
 ck('par secteur : aucune preuve sociale inventée',
    !secteurs.absente &&
    !/\b\d+\s*(clients?|commerces?|businesses|avis|reviews|reseñas|recensioni)\b/i.test(secteurs.texte) &&
    !/témoignage|testimonial|testimonio|testimonianza|★|⭐|\b\d[,.]\d\s*\/\s*5\b/i.test(secteurs.texte));

 /* La mention légale affirmait que tous les visuels étaient générés. C'est vrai
    des compositions SVG, pas de hero.webp dont la provenance n'est pas établie. */
 ck('mention légale : aucune affirmation sur l\'origine de l\'image d\'accueil',
    await p.evaluate(()=>{
      const l=document.querySelector('.legal').textContent;
      return !/compositions générées, pas des photographies/i.test(l)
          && !/illustrations d.ambiance du site sont générées/i.test(l);
    }));
 /* ── Galerie de créations ─────────────────────────────────────────────
    Le site doit montrer le travail livré, et chaque démonstration doit
    ramener au pack correspondant sans jamais se faire passer pour un
    client réel. */
 /* V6 : le hero montre l'ensemble d'un pack — publication, story, deux pages
    de carrousel et la légende — au lieu d'une vignette par série. Chaque pièce
    doit être réellement visible : une story cachée derrière la publication ne
    montre rien de ce que le client reçoit. */
 const scene = await p.evaluate(()=>{
   /* Mesure ce que l'oeil reçoit, pas ce que le CSS déclare : on interroge le
      compositeur point par point. elementFromPoint tient compte du z-index, des
      transformations 3D et de tout ce qui passe devant. Une pièce dont la boîte
      est grande mais qui est entièrement masquée ressort ici à 0 %. */
   const r = el => {
     const b = el.getBoundingClientRect();
     let vus=0, total=0;
     for(let i=1;i<10;i++) for(let j=1;j<10;j++){
       const x=b.left+b.width*i/10, y=b.top+b.height*j/10;
       if(x<0||y<0||x>innerWidth||y>innerHeight) continue;
       total++;
       const cible=document.elementFromPoint(x,y);
       if(cible && (cible===el || el.contains(cible))) vus++;
     }
     return {w:Math.round(b.width), h:Math.round(b.height), x:Math.round(b.left), y:Math.round(b.top),
             visible: total ? Math.round(vus*100/total) : 0};
   };
   const q = s => [...document.querySelectorAll(s)].map(r);
   return {post:q('.p-post'), story:q('.p-story'), car:q('.p-car1, .p-car2'), leg:q('.pack-legende')};
 });
 /* La légende était un feuillet posé DANS la scène : le détecteur Impeccable a
    mesuré qu'elle recouvrait à 100 % la mention « concept de démonstration » de
    la story et 67 % de son étiquette. Elle est devenue un cartel hors scène :
    les quatre visuels dans la scène, le texte livré à côté. */
 ck('hero V6 : les cinq pièces du pack sont présentes',
    scene.post.length===1 && scene.story.length===1 && scene.car.length===2 && scene.leg.length===1,
    `post ${scene.post.length} story ${scene.story.length} carrousel ${scene.car.length} légende ${scene.leg.length}`);
 /* Le cartel doit porter un texte réellement livré, pas un libellé décoratif. */
 ck('hero V6 : la légende livrée est citée en clair',
    await p.evaluate(()=>{
      const q=document.querySelector('.pack-legende q');
      return !!q && q.textContent.trim().length > 20;
    }), (await p.textContent('.pack-legende q')||'').trim().slice(0,52));
 ck('hero V6 : aucune pièce n\'est réduite à rien',
    [].concat(scene.post,scene.story,scene.car,scene.leg).every(b=>b.w>60 && b.h>60),
    JSON.stringify([].concat(scene.post,scene.story,scene.car).map(b=>b.w+'x'+b.h)));
 /* Les pièces se recouvrent : c'est une pile en perspective, pas une grille.
    Le défaut à interdire n'est donc pas le recouvrement mais l'occultation —
    une story posée derrière la publication ne montre rien de ce que le client
    achète. On exige que chaque pièce garde au moins un tiers de sa surface
    réellement atteignable au clic. */
 ck('hero V6 : aucune pièce n\'est masquée par une autre',
    [].concat(scene.post, scene.story, scene.car, scene.leg).every(b=>b.visible>=50),
    JSON.stringify([].concat(scene.post,scene.story,scene.car,scene.leg).map(b=>b.visible+'%')));
 /* Le contenu annoncé vient du catalogue, pas d'une saisie décorative. */
 ck('hero V6 : le contenu du pack est écrit en clair', await p.evaluate(()=>{
   const t = (document.getElementById('pack-compte')||{}).textContent || '';
   return /\d+\s*visuels/.test(t) && /\d+\s*textes/.test(t) && /délai/.test(t);
 }), (await p.textContent('#pack-compte')||'').replace(/\s+/g,' ').trim());
 /* Le prix fait partie de ce qu'on vient voir : il doit être lisible sans
    défiler. Mesuré avant correction : le bas du prix tombait à 960 px sur un
    écran de 900. */
 const premierEcran = await p.evaluate(()=>({
   prixBas: Math.round(document.getElementById('pack-prix').getBoundingClientRect().bottom),
   hauteur: innerHeight,
   montant: (document.querySelector('#pack-prix .montant')||{}).textContent||'',
   commande: !!document.querySelector('#pack-prix [data-order]')
 }));
 ck('hero V6 : le prix du pack est visible sans défiler',
    premierEcran.prixBas <= premierEcran.hauteur && /\d/.test(premierEcran.montant)
    && premierEcran.commande,
    premierEcran.montant.trim() + ' — bas ' + premierEcran.prixBas + ' / écran ' + premierEcran.hauteur);
 /* Le bandeau de prix collant recouvrait le montant affiché dans le hero. */
 ck('hero V6 : le bandeau collant ne recouvre pas le prix du hero',
    await p.evaluate(()=>{
      const k=document.getElementById('kiosk'), b=document.querySelector('#pack-prix .montant');
      if(!k||!b) return false;
      const a=k.getBoundingClientRect(), c=b.getBoundingClientRect();
      const couvre = a.left<c.right && c.left<a.right && a.top<c.bottom && c.top<a.bottom;
      return !couvre;
    }));
 /* Le logotype décoratif et la ligne d'édition ont été supprimés : ils
    occupaient 480 px avant le premier produit sur téléphone. Le contrôle qui
    surveillait leur collision n'a plus d'objet ; celui-ci garde ce qui compte
    à la place — le commerçant doit voir une création dans le premier écran,
    sans défiler. */
 ck('hero : plus de logotype décoratif avant le contenu',
    await p.evaluate(()=>!document.querySelector('.hero-masthead') && !document.querySelector('.hero-edition')));
 ck('hero : la promesse annoncée est bien celle affichée',
    await p.evaluate(()=>{
      const h = document.querySelector('#manifesto .statement');
      return !!h && /impossible à ignorer/i.test(h.textContent);
    }), (await p.textContent('#manifesto .statement')||'').replace(/\s+/g,' ').trim());
 /* Défaut réel trouvé par la mesure d'occultation : une pièce posée en retrait
    (translateZ négatif) passe DERRIÈRE le plan de la scène, et .stage captait
    tous les clics. Les pièces étaient visibles mais mortes. */
 for(const piece of ['.p-story','.p-car1','.p-car2']){
   const atteint = await p.evaluate(sel=>{
     const e=document.querySelector(sel), b=e.getBoundingClientRect();
     const c=document.elementFromPoint(b.left+b.width/2, b.top+b.height/2);
     return !!(c && (c===e || e.contains(c)));
   }, piece);
   ck('hero V6 : ' + piece + ' reçoit réellement le clic', atteint);
 }
 /* La série restaurant doit montrer la PHOTO, pas seulement du texte sur un
    dégradé : c'est le reproche principal de la version précédente. Chaque
    pièce de la série qui déclare une photo doit réellement la peindre. */
 const photosHero = await p.evaluate(()=>{
   const imgs = [...document.querySelectorAll('#hero-stage image')];
   /* Mesurer une taille absolue serait faux : sur la pièce « carte » la bande
      photographique fait 264 px sur 1080, donc une trentaine de pixels une
      fois la pièce réduite dans la scène. Ce qui compte est qu'elle occupe une
      vraie surface et que le fichier soit celui qu'on croit. */
   return {
     nb: imgs.length,
     peintes: imgs.filter(i=>{ const r=i.getBoundingClientRect(); return r.width*r.height > 800; }).length,
     sources: [...new Set(imgs.map(i=>(i.getAttribute('href')||'').split('/').pop()))],
     aires: imgs.map(i=>{ const r=i.getBoundingClientRect(); return Math.round(r.width*r.height); })
   };
 });
 ck('série restaurant : la photographie est réellement peinte dans le hero',
    photosHero.nb >= 3 && photosHero.peintes === photosHero.nb
    && photosHero.sources.every(x=>/\.(webp|jpg|jpeg|png)$/i.test(x)),
    photosHero.peintes + '/' + photosHero.nb + ' · ' + photosHero.sources.join(', ')
    + ' · aires ' + photosHero.aires.join('/'));

 /* Les cartels du hero doivent nommer le VRAI rôle de chaque pièce. « Page 2 »
    posé sur une carte de restaurant était faux. */
 const cartels = await p.evaluate(()=>[...document.querySelectorAll('.stage .role')].map(e=>e.textContent.trim()));
 ck('hero : chaque cartel nomme le rôle réel de la pièce',
    cartels.length === 4 && cartels.every(c=>c.length>2) && !cartels.some(c=>/^Page \d/i.test(c)),
    cartels.join(' · '));

 /* Le site ne prend aucun paiement : il doit le dire là où on s'apprête à
    payer, et ne pas présenter un fichier figé comme personnalisable. */
 const honnete = await p.evaluate(()=>{
   const z = document.getElementById('honnete');
   if(!z) return {absent:true};
   const t = z.textContent;
   return {
     etapes: z.querySelectorAll('.flux li').length,
     lignes: z.querySelectorAll('.adapt tr').length,
     non: z.querySelectorAll('.adapt .non').length,
     ditSansPaiement: /n.encaisse rien|no payment|no cobra|non incassa/i.test(t),
     versBrief: !!z.querySelector('[data-order]')
   };
 });
 ck('offre : le parcours réel de commande est écrit en clair',
    !honnete.absent && honnete.etapes === 4 && honnete.ditSansPaiement,
    honnete.etapes + ' étape(s), mention « le site n\'encaisse rien » : ' + honnete.ditSansPaiement);
 ck('offre : un fichier figé n\'est pas présenté comme personnalisable',
    !honnete.absent && honnete.lignes === 4 && honnete.non >= 2 && honnete.versBrief,
    honnete.non + ' « non » sur ' + honnete.lignes + ' lignes, renvoi vers le sur-brief : ' + honnete.versBrief);

 /* Aucun texte public ne doit promettre une livraison automatique. */
 /* `textContent` embarquait le code du script — donc le dictionnaire des
    quatre langues — et rougissait sur une chaîne jamais affichée. On lit le
    texte RENDU, et on le fait dans les quatre langues : une promesse fausse
    cachée en espagnol est une promesse fausse. */
 const promesses = {};
 for(const lg of ['fr','en','es','it']){
   await p.evaluate(x=>{ const b=document.querySelector('.langset button[data-lang="'+x+'"]')
     || [...document.querySelectorAll('.langset button')].find(e=>e.textContent.trim().toLowerCase()===x);
     if(b) b.click(); }, lg);
   await p.waitForTimeout(350);
   promesses[lg] = await p.evaluate(()=>{
     const t = document.body.innerText;
     const m = t.match(/livraison directe|le fichier part|direct delivery|the file ships|entrega directa|consegna diretta|el archivo sale|il file parte/i);
     return m ? m[0] : null;
   });
 }
 await p.evaluate(()=>{ const b=[...document.querySelectorAll('.langset button')]
   .find(e=>e.textContent.trim().toLowerCase()==='fr'); if(b) b.click(); });
 await p.waitForTimeout(350);
 ck('offre : aucune promesse de livraison automatique, dans aucune des quatre langues',
    Object.values(promesses).every(v=>v===null),
    Object.entries(promesses).filter(([,v])=>v).map(([k,v])=>k+':'+v).join(' ') || 'fr/en/es/it propres');

 ck('galerie : les pièces de la série active sont rendues',
    await p.locator('.piece').count() === CREA.series[0].pieces.length);
 ck('galerie : chaque série est étiquetée concept de démonstration',
    (await p.locator('.demo-tag').count()) === 1
    && /démonstration/i.test(await p.textContent('.demo-tag')));
 ck('galerie : aucune enseigne présentée comme cliente réelle',
    await p.evaluate(()=>!/nos clients|ils nous font confiance|témoignage/i.test(
      document.getElementById('creations').textContent)));
 /* Changer d'onglet doit reconstruire la scène du hero sur la même série :
    les deux vues lisent le même état, sinon elles divergent en silence. */
 await p.click('[data-serie-onglet="1"]'); await p.waitForTimeout(700);
 ck('galerie : onglet et hero partagent le même état',
    (await p.textContent('#hero-enseigne')||'').includes(CREA.series[1].enseigne)
    && (await p.textContent('#serie-enseigne')).trim() === CREA.series[1].enseigne,
    (await p.textContent('#hero-enseigne')||'').trim());
 /* Le bouton d'offre doit pointer le pack déclaré dans le manifeste. */
 ck('galerie : la démonstration mène au bon pack',
    await p.getAttribute('#serie-pack','data-order') === String(CREA.series[1].packSuggere));
 // clavier
 await p.focus('.p-post');
 await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700);
 ck('galerie : parcours au clavier',
    (await p.textContent('#hero-enseigne')||'').includes(CREA.series[2].enseigne),
    (await p.textContent('#hero-enseigne')||'').trim());
 /* ── Les trois interactions demandées, vérifiées par leur EFFET mesuré ──
    Une transformation déclarée en CSS ne prouve rien : on lit l'échelle
    réellement appliquée à chaque pièce. */
 const echelles = async () => p.evaluate(()=>{
   const pl = document.getElementById('serie-planche');
   return {
     choix: pl.getAttribute('data-choix'),
     actif: [...pl.querySelectorAll('.piece')].findIndex(x=>x.getAttribute('aria-current')==='true'),
     ech: [...pl.querySelectorAll('.piece')].map(x=>{
       const m = getComputedStyle(x).transform;
       return m === 'none' ? 1 : Math.round(+(m.match(/matrix\(([\d.]+)/)||[0,1])[1] * 100) / 100;
     })
   };
 });
 await p.evaluate(()=>document.getElementById('creations').scrollIntoView({block:'start'}));
 await p.waitForTimeout(700);
 const avantChoix = await echelles();
 await p.click('.piece[data-piece="2"]'); await p.waitForTimeout(600);
 const apresChoix = await echelles();
 ck('interaction A : la pièce choisie avance, ses voisines reculent',
    apresChoix.actif === 2 && apresChoix.ech[2] > 1
    && apresChoix.ech.filter((v,i)=>i!==2).every(v=>v < 1)
    && avantChoix.actif === 0,
    'échelles ' + apresChoix.ech.join('/') + ' — active ' + apresChoix.actif);

 /* Un deuxième appui sur la pièce déjà choisie ouvre le détail : au doigt, le
    premier appui ne doit pas déclencher une fenêtre pleine page. */
 await p.click('.piece[data-piece="2"]'); await p.waitForTimeout(700);
 ck('interaction B : le détail s\'ouvre sur la pièce choisie',
    await p.evaluate(()=>document.getElementById('loupe').open));
 await p.keyboard.press('Escape'); await p.waitForTimeout(450);

 /* Le déploiement anime l'entrée des pièces, puis LIBÈRE la planche : sans
    cela, l'état final de l'animation neutralise la sélection. */
 await p.click('#deploier'); await p.waitForTimeout(250);
 const pendant = await p.evaluate(()=>document.getElementById('serie-planche').classList.contains('deploie'));
 await p.waitForTimeout(1300);
 const apres = await p.evaluate(()=>document.getElementById('serie-planche').classList.contains('deploie'));
 await p.focus('.piece[data-piece="0"]'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
 const apresClavier = await echelles();
 ck('interaction C : le pack se déploie, puis la sélection fonctionne encore',
    pendant && !apres && apresClavier.actif === 1 && apresClavier.ech[1] > 1,
    'pendant ' + pendant + ' · après ' + apres + ' · échelles ' + apresClavier.ech.join('/'));

 /* Rien ne doit dépendre du survol : tout se pilote au clavier. */
 ck('interactions : la sélection se pilote au clavier',
    apresClavier.actif === 1 && apresClavier.choix === '1', 'choix ' + apresClavier.choix);

 /* La barre des quatre packs ne doit plus recouvrir le bas du téléphone. */
 /* Aperçu. Le geste a changé : le premier appui CHOISIT la pièce, le second
    l'ouvre. Au doigt, un appui unique ne doit pas jeter une fenêtre pleine
    page à la figure de quelqu'un qui voulait seulement regarder. */
 const ouvreur = '.piece[data-piece="0"]';
 await p.click(ouvreur); await p.waitForTimeout(400);
 ck('aperçu : un seul appui choisit sans ouvrir',
    await p.evaluate(()=>!document.getElementById('loupe').open
      && document.querySelector('.piece[data-piece="0"]').getAttribute('aria-current') === 'true'));
 await p.click(ouvreur); await p.waitForTimeout(500);
 ck('aperçu : ouverture en grand', await p.evaluate(()=>document.getElementById('loupe').open));
 await p.click('#loupe-story'); await p.waitForTimeout(400);
 ck('aperçu : bascule publication / story',
    await p.getAttribute('#loupe-story','aria-pressed') === 'true'
    && await p.evaluate(()=>/1920/.test(document.querySelector('#loupe-vue svg').getAttribute('viewBox'))));
 await p.keyboard.press('Escape'); await p.waitForTimeout(450);
 ck('aperçu : Échap ferme et rend le focus au déclencheur',
    !(await p.evaluate(()=>document.getElementById('loupe').open))
    && await p.evaluate(()=>document.activeElement.classList.contains('piece')));
 /* Depuis l'aperçu, l'offre doit ouvrir la feuille de commande du bon pack. */
 await p.click(ouvreur); await p.waitForTimeout(400);
 await p.click('#loupe-offre'); await p.waitForTimeout(600);
 ck('aperçu : le bouton d\'offre ouvre la commande du pack annoncé',
    await p.isVisible('#sheet') && !(await p.evaluate(()=>document.getElementById('loupe').open)));
 await p.click('#sheet-close'); await p.waitForTimeout(350);
 await p.click('[data-serie-onglet="0"]'); await p.waitForTimeout(450);

 // commande
 await p.click('#kiosk button[data-order="2"]'); await p.waitForTimeout(400);
 ck('feuille de commande ouverte', await p.isVisible('#sheet'));
 await p.click('#to-2'); await p.click('#to-3'); await p.waitForTimeout(250);
 ck('brief vide bloqué', await p.evaluate(()=>!document.getElementById('form-error').hidden));
 await p.fill('#f-ig','compte invalide !!'); await p.fill('#f-sell','pizzeria'); await p.fill('#f-audience','le quartier');
 await p.click('#to-3'); await p.waitForTimeout(200);
 ck('identifiant Instagram invalide refusé', await p.evaluate(()=>!document.getElementById('form-error').hidden));
 await p.fill('#f-ig','@bellanapoli'); await p.click('.chip[data-extra="express"]');
 ck('total 90+25', (await p.locator('#sheet-total').textContent()).trim()==='115€');
 await p.click('#to-3'); await p.waitForTimeout(300);
 ck('retour arrière possible', await p.locator('#back-to-2').count()===1);
 await p.click('#send-btn'); await p.waitForTimeout(400);
 ck('remise = dialogue explicite, pas de redirection silencieuse', await p.evaluate(()=>document.getElementById('handoff').open));
 ck('message complet dans le dialogue', (await p.evaluate(()=>document.getElementById('handoff-message').value)).includes('115€'));
 await p.click('#handoff-close'); await p.waitForTimeout(200);
 await p.click('#sheet-close'); await p.waitForTimeout(300);
 // club
 await p.locator('#club').scrollIntoViewIfNeeded();
 await p.fill('#member-name','Vega'); await p.click('#create-pass'); await p.waitForTimeout(400);
 ck('carte de club créée', await p.isVisible('#pass'));
 ck('code cryptographique', /^AURA-[0-9A-F]{16}$/.test(await p.evaluate(()=>document.getElementById('pass-code').textContent)));
 // XSS
 await p.click('#kiosk button[data-order="1"]'); await p.waitForTimeout(300);
 await p.click('#to-2'); await p.fill('#f-sell','"><img src=x onerror=window.__x=1>'); await p.waitForTimeout(500);
 ck('aucune injection depuis le champ client', await p.evaluate(()=>window.__x!==1));
 await p.keyboard.press('Escape'); await p.waitForTimeout(200);
 ck('desktop : aucun débordement', await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=1);

 // mobile
 const m=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const mp=await m.newPage(); mp.on('pageerror',e=>errs.push('MOBILE: '+e.message));
 await aller(mp, V); await mp.waitForTimeout(1100);
 ck('mobile : aucun débordement', await mp.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=1);
 /* Le test ci-dessus peut passer alors que la page déborde, parce que html,body ont overflow-x:clip.
    Celui-ci neutralise le clip d'abord : c'est le seul qui voit un vrai débordement.
    Sur un contexte isMobile, un débordement élargit aussi le viewport de mise en page,
    ce qui étire les éléments position:fixed — d'où la vérification de innerWidth. */
 /* Page jetable : le style injecté ne doit pas fuir dans les contrôles suivants. */
 const nuCtx = await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const nuPage = await nuCtx.newPage();
 await nuPage.goto(V); await nuPage.waitForTimeout(900);
 const nu = await nuPage.evaluate(()=>{
   const s=document.createElement('style');
   s.textContent='html,body{overflow-x:visible !important}';
   document.head.appendChild(s);
   return {sw:document.documentElement.scrollWidth, iw:window.innerWidth};
 });
 await nuCtx.close();
 ck('mobile : aucun débordement RÉEL (clip neutralisé, 390 px)', nu.sw<=391 && nu.iw<=391);
 /* Les règles mobiles visaient encore les anciennes vitrines : les pièces du
    pack, posées en absolu, retombaient à 2 × 2 px dans une grille sans contenu
    en flux. Le pack était invisible sur téléphone. */
 const packMobile = await mp.evaluate(()=>
   [...document.querySelectorAll('.p-post,.p-story,.p-car1,.p-car2')]
     .map(e=>{ const b=e.getBoundingClientRect();
       return {c:e.className.replace('piece3d ',''), w:Math.round(b.width), h:Math.round(b.height)}; }));
 ck('mobile : les quatre visuels du pack sont dépliés à taille réelle',
    packMobile.length===4 && packMobile.every(x=>x.w>=120 && x.h>=80),
    JSON.stringify(packMobile.map(x=>x.c+' '+x.w+'x'+x.h)));
 ck('mobile : le prix et le bouton de commande du pack sont présents',
    await mp.evaluate(()=>{
      const m=document.querySelector('#pack-prix .montant');
      return !!(m && /\d/.test(m.textContent) && document.querySelector('#pack-prix [data-order]'));
    }));
 /* Le dock remplace la barre des quatre packs : trois destinations, et il se
    range dès qu'une feuille de commande s'ouvre — mesuré, l'ancienne barre
    occupait les 70 derniers pixels de chaque écran. */
 const dock = await mp.evaluate(()=>{
   const d = document.getElementById('dock'), k = document.getElementById('kiosk');
   const b = d ? d.getBoundingClientRect() : null;
   return {existe:!!d, liens:d?d.querySelectorAll('a').length:0,
           visible: !!b && b.top < innerHeight && getComputedStyle(d).opacity !== '0',
           hauteurTactile: d ? Math.round(d.querySelector('a').getBoundingClientRect().height) : 0,
           barrePacks: k ? getComputedStyle(k).display : 'absente'};
 });
 ck('mobile : la barre des quatre packs a disparu',
    dock.barrePacks === 'none', 'display du kiosque : ' + dock.barrePacks);
 ck('mobile : un dock de navigation la remplace, avec des cibles de 44 px au moins',
    dock.existe && dock.liens === 3 && dock.visible && dock.hauteurTactile >= 44,
    dock.liens + ' destination(s), cible ' + dock.hauteurTactile + ' px');
 await mp.evaluate(()=>document.querySelector('#carte [data-order]').click());
 await mp.waitForTimeout(600);
 ck('mobile : le dock se range quand la feuille de commande s\'ouvre',
    await mp.evaluate(()=>{
      const d = document.getElementById('dock');
      return d.classList.contains('range') || d.getBoundingClientRect().top >= innerHeight;
    }));
 await mp.evaluate(()=>{ const b=document.querySelector('.sheet-close'); if(b) b.click(); });
 await mp.waitForTimeout(400);

 await mp.click('#mobile-menu-btn'); await mp.waitForTimeout(300);
 ck('mobile : menu ouvrable et langues accessibles', await mp.evaluate(()=>document.getElementById('main-nav').classList.contains('mobile-open') && document.querySelectorAll('#main-nav .langset button').length===4));
 await mp.click('#main-nav a[href="#club"]'); await mp.waitForTimeout(500);
 ck('mobile : navigation ferme le menu et navigue', await mp.evaluate(()=>!document.getElementById('main-nav').classList.contains('mobile-open')));

 // mouvement réduit
 const rm=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const rp=await rm.newPage(); await aller(rp, V); await rp.waitForTimeout(900);
 ck('mouvement réduit : tout le contenu visible', await rp.evaluate(()=>[...document.querySelectorAll('.reveal')].every(e=>getComputedStyle(e).opacity==='1')));

 // back-office
 const o=await b.newContext({viewport:{width:1280,height:900}});
 const op=await o.newPage(); op.on('pageerror',e=>errs.push('OFFICE: '+e.message));
 await aller(op, O); await op.waitForTimeout(500);
 await op.click('.tabs button[data-tab="orders"]');
 const cases=[
  ["AURA — READY-2 Night · 80€\nDéjà prêt — livraison directe.\nTotal : 80€", 'ready','2','80','Déjà prêt (format actuel)'],
  ["AURA — n°2 Night · 80€\nDéjà prêt — livraison directe. Je prends ce pack.", 'ready','2','80','Déjà prêt (ancien format en circulation)'],
  ["Bonjour, je souhaite le n°2 Signature à 90€.\nTotal : 90€\n\nJe vends : pizzeria\nMon Instagram : @bellanapoli\nRecommandé par : AURA-4021",'brief','2','90','Pack sur brief'],
  ["Bonjour, je souhaite le n°4 Maison à 250€.\nTotal : 250€\nJe vends : garage",'brief','4','250','Pack n°4']
 ];
 for(const [msg,k,pk,tt,label] of cases){
   await op.fill('#paste',msg); await op.click('#parse-btn'); await op.waitForTimeout(250);
   const got=[await op.inputValue('#o-kind'),await op.inputValue('#o-pack'),await op.inputValue('#o-total')];
   ck('registre lit : '+label, got[0]===k&&got[1]===pk&&got[2]===tt, got.join('/'));
   await op.click('#save-order'); await op.waitForTimeout(250);
 }
 await op.click('.tabs button[data-tab="board"]'); await op.waitForTimeout(300);
 const connecte = (await op.textContent('#db-state')).includes('connect');
 if(connecte) ck('aucune commande perdue (4 enregistrées)', await op.evaluate(()=>document.querySelectorAll('#recent .order').length)===4);
 else {
   /* Sans registre distant, le back-office écrit dans le stockage local. Ce
      n'était pas le cas avant : hors d'un artifact Claude, les commandes
      étaient simplement perdues sans que rien ne le signale. */
   const mode = (await op.textContent('#db-state')).trim();
   ck('mode de stockage annoncé explicitement', /local|hors ligne/i.test(mode), mode);
   const persiste = await op.evaluate(()=>{
     try{
       const avant = JSON.parse(localStorage.getItem('aura.commandes.v1') || '[]').length;
       return {dispo:true, lignes:avant};
     }catch(e){ return {dispo:false, lignes:0}; }
   });
   ck('registre local : les commandes enregistrées y sont réellement écrites',
      persiste.dispo && persiste.lignes === 4, persiste.lignes + ' ligne(s)');
   await op.reload(); await op.waitForTimeout(700);
   ck('registre local : les commandes survivent à un rechargement',
      await op.evaluate(()=>JSON.parse(localStorage.getItem('aura.commandes.v1')||'[]').length) === 4);
 }
 await op.screenshot({path:'v3_office.png'});
 ck('back-office : aucun débordement', await op.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=1);
 /* Le défaut commercial doit être visible par l'exploitant, pas seulement
    masqué côté public. */
 await op.click('.tabs button[data-tab="board"]'); await op.waitForTimeout(250);
 const etatOffice = Object.assign({sansFichier:sansFichier.length}, await op.evaluate(()=>({
   pastilles: document.querySelectorAll('#assets-state .pill.assets-missing').length,
   alerte   : document.getElementById('assets-card').classList.contains('alert'),
   note     : document.getElementById('assets-note').textContent
 })));
 ck('back-office : collections sans fichier signalées assets_missing',
    etatOffice.pastilles===etatOffice.sansFichier,
    etatOffice.pastilles+'/'+etatOffice.sansFichier);
 ck('back-office : alerte visible et nommant les collections',
    etatOffice.sansFichier===0 || (etatOffice.alerte && /Street|Night|Heat|House/.test(etatOffice.note)));

 console.log(R.join('\n'));
 const f=R.filter(x=>x.startsWith('ÉCHEC')).length;
 const na = R.filter(x=>x.startsWith('N/A')).length;
 const pass = R.length - f - na;
 console.log(`\n${R.length-na} contrôles exécutés — ${pass} PASS, ${f} ÉCHEC` + (na?`  ·  ${na} N/A (non exécuté, ne compte pas comme réussi)`:''));
 console.log('ERREURS JS : '+(errs.length?JSON.stringify(errs,null,1):'aucune'));
 await b.close();
 /* EXIT_ON_FAIL : un test rouge doit faire échouer le processus, sinon une CI passe au vert sur un défaut */
 /* Une erreur JS ou console critique doit faire échouer la recette, pas
    seulement s'afficher en bas du journal : sinon une page cassée passe au vert. */
 if(errs.length) R.push('ÉCHEC — '+errs.length+' erreur(s) JS/console pendant la recette');
 const failed=R.filter(x=>/^(ÉCHEC|FAIL)/.test(x)).length;
 process.exit(failed>0?1:0);
})();
