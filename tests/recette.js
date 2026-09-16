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
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const errs=[];
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
 ck('image d\'accueil : composition du dépôt, pas hero.webp', await p.evaluate(()=>{
   const c=document.getElementById('cinema-image');
   return !!(c && c.querySelector('svg') && c.dataset.provenance);
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
 ck('contenu complet rendu', await p.locator('.menu-row').count()===3 && await p.locator('.ready-row').count()===4 && await p.locator('.qa-item').count()===5);
 ck('lien d\'évitement présent (a11y)', await p.locator('.skip-link').count()===1);
 /* Angle mort de la recette précédente : l'externalisation de l'image avait vidé
    le fond des 4 miniatures sans qu'aucune assertion ne rougisse. Elles montrent
    désormais la couverture du pack, en SVG inline : on vérifie le contenu réel. */
 ck('miniatures Déjà prêt : couverture du pack réellement rendue', await p.evaluate(()=>{
   const els=[...document.querySelectorAll('.ready-thumb')];
   return els.length===4 && els.every(e=>{
     const svg=e.querySelector('svg');
     return svg && svg.getBoundingClientRect().width > 40;
   });
 }));
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
   boutons     : [...document.querySelectorAll('.ready-row')].filter(e=>e.tagName==='BUTTON').length,
   texte       : document.getElementById('ready').textContent,
   etatHint    : document.getElementById('ready-hint').getAttribute('data-state'),
   etatLede    : document.getElementById('ready-lede').getAttribute('data-state')
 })));
 ck('collection sans fichier : aucun chemin de commande',
    etatReady.sansFichier.every(id=>!etatReady.commandables.includes(id)),
    'sans fichier ['+etatReady.sansFichier+'] commandables ['+etatReady.commandables+']');
 ck('collection sans fichier : pas de bouton cliquable',
    etatReady.boutons===CAT.ready.length-etatReady.sansFichier.length, etatReady.boutons+' bouton(s)');
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
   return {post:q('.p-post'), story:q('.p-story'), car:q('.p-car1, .p-car2'), leg:q('.p-legende')};
 });
 ck('hero V6 : les cinq pièces du pack sont présentes',
    scene.post.length===1 && scene.story.length===1 && scene.car.length===2 && scene.leg.length===1,
    `post ${scene.post.length} story ${scene.story.length} carrousel ${scene.car.length} légende ${scene.leg.length}`);
 ck('hero V6 : aucune pièce n\'est réduite à rien',
    [].concat(scene.post,scene.story,scene.car,scene.leg).every(b=>b.w>60 && b.h>60),
    JSON.stringify([].concat(scene.post,scene.story,scene.car).map(b=>b.w+'x'+b.h)));
 /* Les pièces se recouvrent : c'est une pile en perspective, pas une grille.
    Le défaut à interdire n'est donc pas le recouvrement mais l'occultation —
    une story posée derrière la publication ne montre rien de ce que le client
    achète. On exige que chaque pièce garde au moins un tiers de sa surface
    réellement atteignable au clic. */
 ck('hero V6 : aucune pièce n\'est masquée par une autre',
    [].concat(scene.post, scene.story, scene.car, scene.leg).every(b=>b.visible>=33),
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
 /* Le titre de couverture chevauchait la ligne d'édition du haut de page. */
 ck('hero : le titre de couverture ne percute aucune ligne voisine',
    await p.evaluate(()=>{
      const m=document.querySelector('.hero-masthead'), e=document.querySelector('.hero-edition');
      const l=document.querySelector('#manifesto .label-brass');
      const a=m.getBoundingClientRect();
      return a.top >= e.getBoundingClientRect().bottom && a.bottom <= l.getBoundingClientRect().top;
    }));
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
 // aperçu
 const ouvreur = '.piece[data-piece="0"]';
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
   [...document.querySelectorAll('.p-post,.p-story,.p-car1,.p-car2,.p-legende')]
     .map(e=>{ const b=e.getBoundingClientRect();
       return {c:e.className.replace('piece3d ',''), w:Math.round(b.width), h:Math.round(b.height)}; }));
 ck('mobile : les cinq pièces du pack sont dépliées à taille réelle',
    packMobile.length===5 && packMobile.every(x=>x.w>=120 && x.h>=80),
    JSON.stringify(packMobile.map(x=>x.c+' '+x.w+'x'+x.h)));
 ck('mobile : le prix et le bouton de commande du pack sont présents',
    await mp.evaluate(()=>{
      const m=document.querySelector('#pack-prix .montant');
      return !!(m && /\d/.test(m.textContent) && document.querySelector('#pack-prix [data-order]'));
    }));
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
